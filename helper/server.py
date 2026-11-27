"""Social Music Beat - servidor auxiliar.
Serve a interface, guarda a biblioteca de músicas, faz a ponte com o motor ACE-Step
e separa voz e instrumental (Demucs, na CPU, para não disputar a placa de vídeo)."""
import json
import math
import os
import re
import threading
import time
import uuid
from pathlib import Path
from urllib.parse import urlsplit

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles

BASE = Path(__file__).parent
DATA = BASE / "musicas"
DATA.mkdir(exist_ok=True)
LIB_FILE = DATA / "biblioteca.json"
WEB = BASE / "web"
ACE = os.environ.get("ACE_URL", "http://127.0.0.1:8001").rstrip("/")

MAX_MODEL_UPLOAD_BODY = 30 * 1024**3 + 1024 * 1024
LOCAL_ORIGINS = {b"http://localhost:8002", b"http://127.0.0.1:8002"}
LOCAL_HOSTS = {b"localhost:8002", b"127.0.0.1:8002"}
UNSAFE_METHODS = {b"POST", b"PUT", b"PATCH", b"DELETE"}


class LocalRequestSecurityMiddleware:
    """Reject cross-origin state changes and cap model-import request bodies."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope.get("type") != "http":
            await self.app(scope, receive, send)
            return

        path = scope.get("path", "")
        method = scope.get("method", "GET").upper().encode("ascii", "ignore")
        headers = dict(scope.get("headers", []))
        is_local_api = path.startswith(("/api/", "/ace/"))

        if is_local_api and method in UNSAFE_METHODS:
            host = headers.get(b"host", b"").lower()
            origin = headers.get(b"origin", b"")
            fetch_site = headers.get(b"sec-fetch-site", b"").lower()
            if host not in LOCAL_HOSTS or origin not in LOCAL_ORIGINS:
                await self._reject(send, 403, "Requisição bloqueada: origem local não confirmada.")
                return
            if fetch_site and fetch_site not in (b"same-origin", b"none"):
                await self._reject(send, 403, "Requisição de outra origem não permitida.")
                return
        elif is_local_api:
            host = headers.get(b"host", b"").lower()
            origin = headers.get(b"origin")
            if host not in LOCAL_HOSTS or (origin is not None and origin not in LOCAL_ORIGINS):
                await self._reject(send, 403, "Acesso permitido somente pela interface local.")
                return

        if path != "/api/ai/models/import" or method != b"POST":
            await self.app(scope, receive, send)
            return

        raw_length = headers.get(b"content-length")
        if raw_length:
            try:
                if int(raw_length) > MAX_MODEL_UPLOAD_BODY:
                    await self._reject(send, 413, "O envio excede o limite de 30 GB para modelos GGUF.")
                    return
            except ValueError:
                await self._reject(send, 400, "Cabeçalho Content-Length inválido.")
                return

        received = 0
        oversized = False
        response_messages = []

        async def limited_receive():
            nonlocal received, oversized
            message = await receive()
            if message.get("type") == "http.request" and not oversized:
                received += len(message.get("body", b""))
                if received > MAX_MODEL_UPLOAD_BODY:
                    oversized = True
                    return {"type": "http.request", "body": b"", "more_body": False}
            return message

        async def capture_send(message):
            response_messages.append(message)

        try:
            await self.app(scope, limited_receive, capture_send)
        except Exception:
            if not oversized:
                raise

        if oversized:
            await self._reject(send, 413, "O envio excede o limite de 30 GB para modelos GGUF.")
            return
        for message in response_messages:
            await send(message)

    @staticmethod
    async def _reject(send, status, detail):
        body = json.dumps({"detail": detail}, ensure_ascii=False).encode("utf-8")
        await send({"type": "http.response.start", "status": status,
                    "headers": [(b"content-type", b"application/json; charset=utf-8"),
                                (b"content-length", str(len(body)).encode("ascii"))]})
        await send({"type": "http.response.body", "body": body})


app = FastAPI()
app.add_middleware(LocalRequestSecurityMiddleware)


_STALE_STAGING_SECONDS = 24 * 60 * 60
_SEPARATION_STAGING_RE = re.compile(
    r"\.\d+_[0-9a-f]{6}_(?:voz|instrumental)\.[0-9a-f]{32}\.tmp\.wav"
)
_LIBRARY_STAGING_RE = re.compile(r"\.biblioteca\.json\.[0-9a-f]{32}\.tmp")
_JOBS_STAGING_RE = re.compile(r"\.separation_jobs\.json\.[0-9a-f]{32}\.tmp")
_AUDIO_STAGING_RE = re.compile(r"\.\d+_[0-9a-f]{6,32}\.[A-Za-z0-9]+\.[0-9a-f]{32}\.tmp")
_AUDIO_FINAL_RE = re.compile(r"\d+_[0-9a-f]{6,32}\.(?:wav|flac|mp3)")
_DELETE_STAGING_RE = re.compile(r"\.(?P<name>.+)\.[0-9a-f]{32}\.deleting")
_SEPARATION_BACKUP_RE = re.compile(r"\.(?P<name>.+)\.[0-9a-f]{32}\.backup")


def cleanup_stale_staging_files(now=None):
    """Remove only this app's abandoned staging files after a full day."""
    now = time.time() if now is None else now
    removed = []
    try:
        candidates = list(DATA.iterdir())
    except OSError:
        return []
    for path in candidates:
        if not (_SEPARATION_STAGING_RE.fullmatch(path.name)
                or _LIBRARY_STAGING_RE.fullmatch(path.name)
                or _JOBS_STAGING_RE.fullmatch(path.name)
                or _AUDIO_STAGING_RE.fullmatch(path.name)):
            continue
        try:
            if not path.is_file() or now - path.stat().st_mtime <= _STALE_STAGING_SECONDS:
                continue
            path.unlink()
            removed.append(path.name)
        except OSError:
            # Startup recovery is best-effort; one locked file must not stop the app.
            continue
    return removed


def cleanup_orphaned_audio_files(now=None):
    """Remove abandoned generated audio only after 24h and with trusted metadata."""
    removed = []
    # Keep the library lock for the complete check-and-delete transaction. A
    # concurrent upsert must not register a file after the reference snapshot
    # but before its unlink.
    with _lib_lock:
        if not LIB_FILE.is_file():
            return []
        try:
            referenced = {
                Path(str(item.get("file", ""))).name.casefold()
                for item in read_lib() if item.get("file")
            }
        except (OSError, RuntimeError):
            # Missing or corrupt metadata must never be interpreted as an empty library.
            return []

        now = time.time() if now is None else now
        try:
            candidates = list(DATA.iterdir())
        except OSError:
            return []
        for path in candidates:
            if not _AUDIO_FINAL_RE.fullmatch(path.name) or path.name.casefold() in referenced:
                continue
            try:
                if not path.is_file() or now - path.stat().st_mtime <= _STALE_STAGING_SECONDS:
                    continue
                path.unlink()
                removed.append(path.name)
            except OSError:
                continue
    return removed


def recover_separation_backups():
    """Restore previous separation outputs left behind by an interrupted pair commit."""
    recovered = []
    try:
        candidates = list(DATA.iterdir())
    except OSError:
        return []
    for backup in candidates:
        match = _SEPARATION_BACKUP_RE.fullmatch(backup.name)
        if not match:
            continue
        final = DATA / match.group("name")
        try:
            if not backup.is_file():
                continue
            if final.exists():
                # A file may have been recreated at the same path after a crash.
                # Matching names do not prove that the contents are duplicates.
                recovered.append(("preserved_conflict", backup.name))
            else:
                os.replace(backup, final)
                recovered.append(("restored", final.name))
        except OSError:
            # Preserve the backup for another startup attempt.
            continue
    return recovered


@app.on_event("startup")
def recover_stale_staging_files():
    recover_staged_deletions()
    recover_separation_backups()
    cleanup_stale_staging_files()
    cleanup_orphaned_audio_files()


@app.on_event("startup")
def recover_interrupted_separation_jobs():
    recover_separation_jobs()

from legenda import router as legenda_router  # noqa: E402

app.include_router(legenda_router)

from ia_local import router as ai_router  # noqa: E402

app.include_router(ai_router)

from ai_providers import router as providers_router  # noqa: E402

app.include_router(providers_router)
_lib_lock = threading.Lock()


# ---------------------------------------------------------------- biblioteca
def read_lib():
    """Read library metadata; fail closed on corruption to avoid overwriting it."""
    if not LIB_FILE.exists():
        return []
    try:
        items = json.loads(LIB_FILE.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise RuntimeError("A biblioteca está ilegível ou corrompida; o arquivo original foi preservado.") from exc
    if not isinstance(items, list):
        raise RuntimeError("Formato inválido da biblioteca; o arquivo original foi preservado.")
    if any(not isinstance(item, dict) for item in items):
        raise RuntimeError("A biblioteca contém entradas inválidas; o arquivo original foi preservado.")
    return items


def recover_staged_deletions():
    """Restore staged audio still referenced by the library; discard committed deletions."""
    # A missing metadata file is not proof that deletion committed. Preserve audio.
    if not LIB_FILE.is_file():
        return []
    try:
        with _lib_lock:
            referenced = {
                Path(str(item.get("file", ""))).name.casefold()
                for item in read_lib() if item.get("file")
            }
    except (OSError, RuntimeError):
        # If metadata cannot be trusted, preserve every staged audio file.
        return []

    recovered = []
    try:
        candidates = list(DATA.iterdir())
    except OSError:
        return []
    for staged in candidates:
        match = _DELETE_STAGING_RE.fullmatch(staged.name)
        if not match:
            continue
        original = DATA / match.group("name")
        try:
            if not staged.is_file():
                continue
            if original.name.casefold() in referenced:
                if not original.exists():
                    os.replace(staged, original)
                    recovered.append(("restored", original.name))
                else:
                    # The original path may have been recreated by another
                    # process after the interrupted deletion. Matching names
                    # alone do not prove the staged audio is a duplicate.
                    # Preserve the staged copy rather than risk data loss.
                    recovered.append(("preserved_conflict", staged.name))
            else:
                staged.unlink()
                recovered.append(("discarded", staged.name))
        except OSError:
            # Keep the staged file for a later startup retry.
            continue
    return recovered


def write_lib(items):
    """Persist the library atomically to avoid truncated JSON on interrupted writes."""
    temp_path = LIB_FILE.with_name(f".{LIB_FILE.name}.{uuid.uuid4().hex}.tmp")
    try:
        temp_path.write_text(json.dumps(items, ensure_ascii=False, indent=1), encoding="utf-8")
        os.replace(temp_path, LIB_FILE)
    finally:
        # A committed replace must not be reported as failed because cleanup
        # of an already-removed staging path was denied by the OS.
        try:
            temp_path.unlink(missing_ok=True)
        except OSError:
            pass


@app.get("/api/library")
def get_library():
    return read_lib()


@app.post("/api/library")
def upsert_track(item: dict):
    track_id = item.get("id")
    if not isinstance(track_id, str) or not track_id.strip():
        raise HTTPException(400, "O id da faixa precisa ser um texto válido.")
    with _lib_lock:
        items = [t for t in read_lib() if t.get("id") != item["id"]]
        items.insert(0, item)
        write_lib(items)
    return {"ok": True}


@app.post("/api/library/batch")
def upsert_tracks_batch(payload: dict):
    """Persist a group of tracks in one atomic library metadata update."""
    items = payload.get("items")
    if not isinstance(items, list) or not items:
        raise HTTPException(400, "Lista de faixas inválida.")
    if any(not isinstance(item, dict) or not isinstance(item.get("id"), str) or not item.get("id").strip() for item in items):
        raise HTTPException(400, "Todas as faixas precisam de um id válido.")
    ids = [item["id"] for item in items]
    if len(ids) != len(set(ids)):
        raise HTTPException(400, "IDs de faixas duplicados.")
    with _lib_lock:
        existing = read_lib()
        replace_ids = set(ids)
        merged = [t for t in existing if t.get("id") not in replace_ids]
        merged = list(items) + merged
        write_lib(merged)
    return {"ok": True}


@app.delete("/api/library/{tid}")
def delete_track(tid: str):
    with _lib_lock:
        items = read_lib()
        gone = [t for t in items if t.get("id") == tid]
        if not gone:
            return {"ok": True}

        # Library metadata may be old, malformed, or manually edited. Only
        # generated audio filenames are eligible for deletion; never let a
        # track entry target library/job metadata or an arbitrary DATA file.
        for track in gone:
            raw_name = track.get("file")
            if raw_name in (None, ""):
                continue
            if (not isinstance(raw_name, str)
                    or Path(raw_name).name != raw_name
                    or not _AUDIO_FINAL_RE.fullmatch(raw_name)):
                raise HTTPException(
                    400,
                    "A faixa contém um nome de arquivo inválido; nenhum arquivo foi excluído."
                )

        # Do not remove audio that is still referenced by another library entry.
        remaining = [t for t in items if t.get("id") != tid]
        # A source file must remain available until its background separation
        # finishes. Check under the registry lock while holding _lib_lock;
        # /api/separate uses the same lock order when registering a job.
        active_sources = set()
        with _jobs_registry_lock:
            active_sources = {
                Path(str(info.get("source_file", ""))).name.casefold()
                for info in jobs.values()
                if info.get("status") == "running" and info.get("source_file")
            }
        requested_sources = {
            Path(str(track.get("file", ""))).name.casefold()
            for track in gone if track.get("file")
        }
        busy_sources = requested_sources & active_sources
        if busy_sources:
            raise HTTPException(
                409,
                "Não é possível excluir esta faixa enquanto a separação de áudio estiver em andamento."
            )
        # Case-fold names for cross-platform safety: Windows treats filenames
        # case-insensitively, so differently-cased metadata may still share one file.
        retained_names = {Path(str(t.get("file", ""))).name.casefold() for t in remaining if t.get("file")}
        # Stage unique files only. If metadata persistence fails, restore staged
        # files so the client can reload and keep the track instead of losing it.
        staged_files = []
        staged_names = set()
        try:
            for track in gone:
                name = Path(str(track.get("file", ""))).name
                if not name or name.casefold() in retained_names or name.casefold() in staged_names:
                    continue
                staged_names.add(name.casefold())
                audio_path = DATA / name
                if audio_path.is_file():
                    staged_path = DATA / f".{name}.{uuid.uuid4().hex}.deleting"
                    os.replace(audio_path, staged_path)
                    staged_files.append((audio_path, staged_path))
        except OSError as exc:
            restore_errors = []
            for original, staged in reversed(staged_files):
                try:
                    os.replace(staged, original)
                except OSError as restore_exc:
                    restore_errors.append(f"{staged.name} (restauração: {restore_exc})")
            detail = f"Não foi possível preparar a exclusão do áudio: {exc}"
            if restore_errors:
                detail += "; arquivos temporários preservados: " + ", ".join(restore_errors)
            raise HTTPException(500, detail) from exc

        try:
            write_lib(remaining)
        except Exception as exc:
            restore_errors = []
            for original, staged in reversed(staged_files):
                try:
                    os.replace(staged, original)
                except OSError as restore_exc:
                    restore_errors.append(f"{staged.name} (restauração: {restore_exc})")
            detail = "Não foi possível atualizar a biblioteca; a exclusão foi cancelada."
            if restore_errors:
                detail += " Falha ao restaurar arquivo: " + "; ".join(restore_errors)
            raise HTTPException(500, detail) from exc

        # Metadata is committed; leftover staged files are harmless if the OS
        # refuses cleanup, and must not turn a completed deletion into a failure.
        for _, staged in staged_files:
            try:
                staged.unlink(missing_ok=True)
            except OSError:
                pass
    return {"ok": True}


# ---------------------------------------------------------------- ACE-Step
@app.get("/api/status")
async def status():
    try:
        async with httpx.AsyncClient(timeout=2.0) as c:
            r = await c.get(f"{ACE}/health")
        return {"ace_online": r.status_code == 200}
    except Exception:
        return {"ace_online": False}


@app.api_route("/ace/{path:path}", methods=["GET", "POST"])
async def ace_proxy(path: str, request: Request):
    """Repassa as chamadas da interface para o ACE-Step (evita problemas de CORS)."""
    headers = {}
    if request.headers.get("content-type"):
        headers["content-type"] = request.headers["content-type"]
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(900.0, connect=5.0)) as c:
            r = await c.request(
                request.method, f"{ACE}/{path}",
                params=dict(request.query_params), content=await request.body(), headers=headers,
            )
    except httpx.ConnectError:
        raise HTTPException(503, "O motor de música (ACE-Step) não está ligado. Abra o iniciar.bat e espere carregar.")
    return Response(r.content, status_code=r.status_code, media_type=r.headers.get("content-type"))


def sniff_ext(data: bytes) -> str:
    if data[:4] == b"RIFF":
        return "wav"
    if data[:4] == b"fLaC":
        return "flac"
    if data[:3] == b"ID3" or data[:2] in (b"\xff\xfb", b"\xff\xf3", b"\xff\xf2"):
        return "mp3"
    return "wav"


@app.post("/api/audio/cleanup")
def cleanup_unregistered_audio(payload: dict):
    """Remove an audio file only when it is not referenced by the library."""
    name = Path(str(payload.get("file", ""))).name
    # This endpoint is only for rolling back files created by /api/save.
    # Never allow cleanup to unlink library metadata, job state, separation
    # outputs, backups, or arbitrary files inside DATA.
    if not _AUDIO_FINAL_RE.fullmatch(name):
        raise HTTPException(400, "Nome de áudio temporário inválido.")
    target = DATA / name
    with _lib_lock:
        # Match the same case-insensitive filename semantics used by deletion.
        # This prevents cleanup from bypassing a registered reference on Windows
        # or when metadata casing differs from the physical filename.
        requested_name = name.casefold()
        if any(
            Path(str(item.get("file", ""))).name.casefold() == requested_name
            for item in read_lib() if item.get("file")
        ):
            raise HTTPException(409, "O áudio está registrado na biblioteca e não pode ser removido.")
        if target.is_file():
            try:
                target.unlink()
            except OSError as exc:
                raise HTTPException(500, "Não foi possível limpar o áudio temporário.") from exc
    return {"ok": True}


def _persist_audio_content(content: bytes, extension: str) -> str:
    """Write downloaded audio to a temporary file and atomically publish it."""
    # Keep published names within the formats accepted by the library and
    # cleanup endpoints; never let an unexpected extension create an orphan
    # file that the app cannot safely recognize later.
    safe_ext = extension.casefold() if isinstance(extension, str) else "wav"
    if safe_ext not in {"wav", "flac", "mp3"}:
        safe_ext = "wav"
    name = f"{int(time.time())}_{uuid.uuid4().hex[:12]}.{safe_ext}"
    target = DATA / name
    staged = DATA / f".{name}.{uuid.uuid4().hex}.tmp"
    try:
        staged.write_bytes(content)
        os.replace(staged, target)
    except OSError as exc:
        try:
            staged.unlink(missing_ok=True)
        except OSError:
            pass
        raise HTTPException(500, "Não foi possível salvar o áudio localmente.") from exc
    return f"/musicas/{name}"


@app.post("/api/save")
async def save_audio(payload: dict):
    """Baixa o áudio gerado pelo ACE-Step e guarda na pasta musicas."""
    src = str(payload.get("url", ""))
    try:
        parsed = urlsplit(src)
    except ValueError:
        raise HTTPException(400, "Endereço de áudio inválido.")
    if parsed.path != "/v1/audio":
        raise HTTPException(400, "Endereço de áudio inválido.")
    endpoint = f"{ACE}/v1/audio"
    if parsed.query:
        endpoint = f"{endpoint}?{parsed.query}"
    async with httpx.AsyncClient(timeout=300.0) as c:
        r = await c.get(endpoint)
    if r.status_code != 200:
        raise HTTPException(502, "Não consegui baixar o áudio gerado.")
    return {"file": _persist_audio_content(r.content, sniff_ext(r.content))}


# ---------------------------------------------------------------- separação (Demucs)
jobs = {}
_jobs_registry_lock = threading.Lock()
_JOBS_TTL_SECONDS = 60 * 60
_JOBS_MAX_COMPLETED = 200
_JOBS_FILE_NAME = ".separation_jobs.json"


def _persist_jobs_locked():
    """Atomically persist job state; caller must hold the registry lock."""
    target = DATA / _JOBS_FILE_NAME
    staged = DATA / f".{_JOBS_FILE_NAME}.{uuid.uuid4().hex}.tmp"
    try:
        staged.write_text(json.dumps(jobs, ensure_ascii=False), encoding="utf-8")
        os.replace(staged, target)
        return True
    except OSError:
        # Keep the in-memory task usable even if the disk is temporarily unavailable.
        return False
    finally:
        try:
            staged.unlink(missing_ok=True)
        except OSError:
            pass


def _is_finite_timestamp(value):
    """Accept finite numeric timestamps, excluding booleans and oversized integers."""
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return False
    try:
        return math.isfinite(value)
    except (OverflowError, TypeError, ValueError):
        return False


def recover_separation_jobs():
    """Restore completed jobs and mark work interrupted by a previous process."""
    target = DATA / _JOBS_FILE_NAME
    if not target.is_file():
        return
    try:
        stored = json.loads(target.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError):
        # Preserve a damaged task file rather than silently replacing it.
        return
    if not isinstance(stored, dict):
        return
    now = time.time()
    restored = {}
    for jid, info in stored.items():
        if (not isinstance(jid, str) or len(jid) != 32
                or any(ch not in "0123456789abcdef" for ch in jid)
                or not isinstance(info, dict)):
            continue
        status = info.get("status")
        if status not in ("running", "done", "error"):
            continue
        task = dict(info)
        created_at = task.get("created_at")
        if not _is_finite_timestamp(created_at):
            task["created_at"] = now
        if status == "running":
            task.update(
                status="error",
                msg="A separação foi interrompida porque o Social Music Beat foi fechado ou reiniciado. Inicie a separação novamente.",
                finished_at=now,
            )
        else:
            finished_at = task.get("finished_at")
            if not _is_finite_timestamp(finished_at):
                task["finished_at"] = now
        if status == "done":
            result = task.get("result")
            # Completed results must be the paired filenames generated by this
            # app, not arbitrary paths that may have been injected into persisted
            # task metadata. Validate URL shape, filename shape, and stem pairing.
            valid_result = isinstance(result, dict)
            if valid_result:
                names = {}
                for key in ("voz", "instrumental"):
                    value = result.get(key)
                    if (not isinstance(value, str)
                            or not value.startswith("/musicas/")
                            or value.count("/") != 2
                            or "?" in value or "#" in value):
                        valid_result = False
                        break
                    name = value.removeprefix("/musicas/")
                    expected_suffix = f"_{key}.wav"
                    if (not re.fullmatch(r"\d+_[0-9a-f]{6}" + re.escape(expected_suffix), name)
                            or not (DATA / name).is_file()):
                        valid_result = False
                        break
                    names[key] = name
                if valid_result:
                    valid_result = names["voz"].removesuffix("_voz.wav") == names["instrumental"].removesuffix("_instrumental.wav")
            if not valid_result:
                task.update(
                    status="error",
                    msg="A tarefa terminou, mas os arquivos de resultado não estão disponíveis. Execute a separação novamente.",
                    finished_at=now,
                )
        restored[jid] = task
    with _jobs_registry_lock:
        jobs.clear()
        jobs.update(restored)
        _prune_jobs_locked(now)
        _persist_jobs_locked()


def _prune_jobs_locked(now):
    finished = []
    for jid, info in list(jobs.items()):
        timestamp = info.get("finished_at")
        if timestamp is None:
            continue
        if not _is_finite_timestamp(timestamp):
            # Invalid persisted/runtime metadata must not break startup or polling.
            info["finished_at"] = now
            timestamp = now
        finished.append((jid, info))
        if now - timestamp > _JOBS_TTL_SECONDS:
            jobs.pop(jid, None)
    finished = sorted(
        ((jid, info) for jid, info in jobs.items() if info.get("finished_at")),
        key=lambda pair: pair[1]["finished_at"],
    )
    for jid, _ in finished[:-_JOBS_MAX_COMPLETED]:
        jobs.pop(jid, None)


def _prune_jobs(now=None):
    """Bound the persisted and in-memory job registry while preserving active work."""
    now = time.time() if now is None else now
    with _jobs_registry_lock:
        _prune_jobs_locked(now)
        _persist_jobs_locked()


_dm = None
_dm_lock = threading.Lock()


def load_demucs():
    global _dm
    with _dm_lock:
        if _dm is None:
            from demucs.pretrained import get_model
            model = get_model("htdemucs")
            model.eval()
            _dm = model
    return _dm


def _commit_separation_outputs(staged_paths, final_paths):
    """Promote both stems, preserving any prior output if the pair fails."""
    promoted = []
    backups = []
    try:
        # Move old outputs aside first, so a failed second promotion cannot
        # destroy the previous vocal/instrumental files.
        for final in final_paths:
            if final.exists():
                backup = final.with_name(f".{final.name}.{uuid.uuid4().hex}.backup")
                os.replace(final, backup)
                backups.append((final, backup))
        for staged, final in zip(staged_paths, final_paths):
            os.replace(staged, final)
            promoted.append(final)
    except OSError as commit_error:
        # Best-effort rollback; leave backup files in place if restoration fails.
        rollback_errors = []
        for final in reversed(promoted):
            try:
                final.unlink(missing_ok=True)
            except OSError as rollback_error:
                rollback_errors.append(f"removing {final.name}: {rollback_error}")
        for final, backup in reversed(backups):
            try:
                os.replace(backup, final)
            except OSError as rollback_error:
                rollback_errors.append(f"restoring {final.name}: {rollback_error}; backup retained at {backup.name}")
        if rollback_errors:
            raise RuntimeError(
                f"Separation commit failed ({commit_error}); rollback incomplete: "
                + "; ".join(rollback_errors)
            ) from commit_error
        raise
    else:
        # Pair committed. Backup cleanup failure is non-fatal.
        for _, backup in backups:
            try:
                backup.unlink(missing_ok=True)
            except OSError:
                pass
    finally:
        for staged in staged_paths:
            try:
                staged.unlink(missing_ok=True)
            except OSError:
                pass


def _stage_separation_outputs(stem, outputs, samplerate, write_audio):
    """Stage both stems and remove partial files if either write fails."""
    staged_paths, final_paths, result = [], [], {}
    try:
        for tag, tensor in outputs:
            fname = f"{stem}_{tag}.wav"
            final_path = DATA / fname
            staged_path = DATA / f".{stem}_{tag}.{uuid.uuid4().hex}.tmp.wav"
            # Track the path before writing because the writer may create a
            # partial file and then raise.
            staged_paths.append(staged_path)
            write_audio(staged_path, tensor, samplerate)
            final_paths.append(final_path)
            result[tag] = f"/musicas/{fname}"
        return staged_paths, final_paths, result
    except Exception:
        for staged in staged_paths:
            try:
                staged.unlink(missing_ok=True)
            except OSError:
                pass
        raise


def separate_file(src: Path, stem: str):
    """Separa em voz e instrumental. Receita igual à do próprio Demucs."""
    import soundfile as sf
    import torch
    import torchaudio
    from demucs.apply import apply_model

    model = load_demucs()
    data, sr = sf.read(str(src), always_2d=True, dtype="float32")
    wav = torch.from_numpy(data.T.copy())
    if wav.shape[0] == 1:
        wav = wav.repeat(2, 1)
    elif wav.shape[0] > 2:
        wav = wav[:2]
    if sr != model.samplerate:
        wav = torchaudio.functional.resample(wav, sr, model.samplerate)
    ref = wav.mean(0)
    wav = (wav - ref.mean()) / (ref.std() + 1e-8)
    with torch.no_grad():
        sources = apply_model(model, wav[None], device="cpu", split=True, overlap=0.25, progress=False)[0]
    sources = sources * (ref.std() + 1e-8) + ref.mean()
    vi = model.sources.index("vocals")
    vocals = sources[vi]
    inst = sum(sources[i] for i in range(len(model.sources)) if i != vi)
    def write_stem(path, tensor, samplerate):
        audio = tensor.clamp(-1, 1).T.contiguous().numpy()
        sf.write(str(path), audio, samplerate, subtype="PCM_16")

    staged_paths, final_paths, out = _stage_separation_outputs(
        stem,
        (("voz", vocals), ("instrumental", inst)),
        model.samplerate,
        write_stem,
    )
    _commit_separation_outputs(staged_paths, final_paths)
    return out


_separation_job_lock = threading.Lock()


def _update_job(jid, **changes):
    with _jobs_registry_lock:
        if jid in jobs:
            jobs[jid].update(changes)
            _persist_jobs_locked()


def run_separation(jid: str, src: Path):
    try:
        # Demucs/model inference is serialized to prevent concurrent model use.
        _update_job(jid, msg="Na fila...")
        with _separation_job_lock:
            _update_job(jid, msg="Carregando o separador (na primeira vez baixa um arquivo pequeno)...")
            stem = f"{int(time.time())}_{uuid.uuid4().hex[:6]}"
            _update_job(jid, msg="Separando voz e instrumental. Pode levar alguns minutos...")
            result = separate_file(src, stem)
            _update_job(jid, status="done", result=result, finished_at=time.time())
    except Exception as e:  # mostra o erro de forma simples na interface
        _update_job(jid, status="error", msg=f"{type(e).__name__}: {e}"[:400], finished_at=time.time())


@app.post("/api/separate")
def separate(payload: dict):
    raw_name = payload.get("file", "")
    if not isinstance(raw_name, str) or not raw_name:
        raise HTTPException(400, "Nome de arquivo de áudio inválido.")
    name = Path(raw_name).name
    # Separation accepts only known audio types. Never allow metadata, registry,
    # backup, or arbitrary data files to be passed to the audio-processing worker.
    if Path(name).suffix.casefold() not in {".wav", ".flac", ".mp3"}:
        raise HTTPException(400, "Formato de áudio não suportado para separação.")
    src = DATA / name
    if not src.is_file():
        raise HTTPException(404, "Arquivo de áudio não encontrado.")
    _prune_jobs()
    jid = uuid.uuid4().hex
    # Serialize job registration with library deletion so a source cannot be
    # removed between the existence check and the job becoming visible.
    with _lib_lock:
        if not src.is_file():
            raise HTTPException(404, "Arquivo não encontrado.")
        with _jobs_registry_lock:
            jobs[jid] = {
                "status": "running",
                "msg": "Na fila...",
                "created_at": time.time(),
                "source_file": name,
            }
            _persist_jobs_locked()
    try:
        worker = threading.Thread(target=run_separation, args=(jid, src), daemon=True)
        worker.start()
    except Exception as exc:
        # Do not leave a phantom running job: it would block source deletion
        # indefinitely and keep the UI polling a worker that never started.
        _update_job(
            jid,
            status="error",
            msg=f"Não foi possível iniciar a separação: {type(exc).__name__}: {exc}"[:400],
            finished_at=time.time(),
        )
    return {"job": jid}


@app.get("/api/jobs/{jid}")
def job_status(jid: str):
    _prune_jobs()
    with _jobs_registry_lock:
        if jid not in jobs:
            raise HTTPException(404, "Tarefa não encontrada.")
        return dict(jobs[jid])


# ---------------------------------------------------------------- arquivos e interface
app.mount("/musicas", StaticFiles(directory=str(DATA)), name="musicas")
if WEB.is_dir():
    app.mount("/", StaticFiles(directory=str(WEB), html=True), name="web")

if __name__ == "__main__":
    import uvicorn

    print("Social Music Beat: abra http://localhost:8002 no navegador")
    uvicorn.run(app, host="127.0.0.1", port=8002)

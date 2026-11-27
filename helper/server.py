"""Social Music Beat - servidor auxiliar.
Serve a interface, guarda a biblioteca de músicas, faz a ponte com o motor ACE-Step
e separa voz e instrumental (Demucs, na CPU, para não disputar a placa de vídeo)."""
import json
import os
import threading
import time
import uuid
from pathlib import Path

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

from legenda import router as legenda_router  # noqa: E402

app.include_router(legenda_router)

from ia_local import router as ai_router  # noqa: E402

app.include_router(ai_router)

from ai_providers import router as providers_router  # noqa: E402

app.include_router(providers_router)
_lib_lock = threading.Lock()


# ---------------------------------------------------------------- biblioteca
def read_lib():
    try:
        return json.loads(LIB_FILE.read_text(encoding="utf-8"))
    except Exception:
        return []


def write_lib(items):
    """Persist the library atomically to avoid truncated JSON on interrupted writes."""
    temp_path = LIB_FILE.with_name(f".{LIB_FILE.name}.{uuid.uuid4().hex}.tmp")
    try:
        temp_path.write_text(json.dumps(items, ensure_ascii=False, indent=1), encoding="utf-8")
        os.replace(temp_path, LIB_FILE)
    finally:
        temp_path.unlink(missing_ok=True)


@app.get("/api/library")
def get_library():
    return read_lib()


@app.post("/api/library")
def upsert_track(item: dict):
    if not item.get("id"):
        raise HTTPException(400, "Faltou o id da faixa.")
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
    if any(not isinstance(item, dict) or not item.get("id") for item in items):
        raise HTTPException(400, "Todas as faixas precisam de um id.")
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

        # Stage the audio file first. If metadata persistence fails, restore it
        # so the client can reload and keep the track instead of losing it.
        staged_files = []
        for track in gone:
            name = Path(str(track.get("file", ""))).name
            audio_path = DATA / name if name else None
            if audio_path and audio_path.is_file():
                staged_path = DATA / f".{name}.{uuid.uuid4().hex}.deleting"
                try:
                    os.replace(audio_path, staged_path)
                    staged_files.append((audio_path, staged_path))
                except OSError as exc:
                    raise HTTPException(500, f"Não foi possível preparar a exclusão do áudio: {exc}") from exc

        try:
            write_lib([t for t in items if t.get("id") != tid])
        except Exception as exc:
            restore_errors = []
            for original, staged in reversed(staged_files):
                try:
                    os.replace(staged, original)
                except OSError as restore_exc:
                    restore_errors.append(str(restore_exc))
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
    if not name or name in (".", ".."):
        raise HTTPException(400, "Nome de arquivo inválido.")
    target = DATA / name
    with _lib_lock:
        if any(Path(str(item.get("file", ""))).name == name for item in read_lib()):
            raise HTTPException(409, "O áudio está registrado na biblioteca e não pode ser removido.")
        if target.is_file():
            try:
                target.unlink()
            except OSError as exc:
                raise HTTPException(500, "Não foi possível limpar o áudio temporário.") from exc
    return {"ok": True}


def _persist_audio_content(content: bytes, extension: str) -> str:
    """Write downloaded audio to a temporary file and atomically publish it."""
    safe_ext = extension if extension and extension.isalnum() else "wav"
    name = f"{int(time.time())}_{uuid.uuid4().hex[:6]}.{safe_ext}"
    target = DATA / name
    staged = DATA / f".{name}.{uuid.uuid4().hex}.tmp"
    try:
        staged.write_bytes(content)
        os.replace(staged, target)
    except OSError as exc:
        staged.unlink(missing_ok=True)
        raise HTTPException(500, "Não foi possível salvar o áudio localmente.") from exc
    return f"/musicas/{name}"


@app.post("/api/save")
async def save_audio(payload: dict):
    """Baixa o áudio gerado pelo ACE-Step e guarda na pasta musicas."""
    src = str(payload.get("url", ""))
    i = src.find("/v1/audio")
    if i < 0:
        raise HTTPException(400, "Endereço de áudio inválido.")
    async with httpx.AsyncClient(timeout=300.0) as c:
        r = await c.get(f"{ACE}{src[i:]}")
    if r.status_code != 200:
        raise HTTPException(502, "Não consegui baixar o áudio gerado.")
    return {"file": _persist_audio_content(r.content, sniff_ext(r.content))}


# ---------------------------------------------------------------- separação (Demucs)
jobs = {}
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
    """Promote both staged stems together; roll back promoted files on failure."""
    promoted = []
    try:
        for staged, final in zip(staged_paths, final_paths):
            os.replace(staged, final)
            promoted.append(final)
    except OSError:
        for final in promoted:
            final.unlink(missing_ok=True)
        raise
    finally:
        for staged in staged_paths:
            staged.unlink(missing_ok=True)


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
    out = {}
    staged_paths, final_paths = [], []
    for tag, tensor in (("voz", vocals), ("instrumental", inst)):
        fname = f"{stem}_{tag}.wav"
        final_path = DATA / fname
        staged_path = DATA / f".{stem}_{tag}.{uuid.uuid4().hex}.tmp.wav"
        sf.write(str(staged_path), tensor.clamp(-1, 1).T.contiguous().numpy(), model.samplerate, subtype="PCM_16")
        staged_paths.append(staged_path)
        final_paths.append(final_path)
        out[tag] = f"/musicas/{fname}"
    _commit_separation_outputs(staged_paths, final_paths)
    return out


def run_separation(jid: str, src: Path):
    try:
        jobs[jid]["msg"] = "Carregando o separador (na primeira vez baixa um arquivo pequeno)..."
        stem = f"{int(time.time())}_{uuid.uuid4().hex[:6]}"
        jobs[jid]["msg"] = "Separando voz e instrumental. Pode levar alguns minutos..."
        jobs[jid].update(status="done", result=separate_file(src, stem))
    except Exception as e:  # mostra o erro de forma simples na interface
        jobs[jid].update(status="error", msg=f"{type(e).__name__}: {e}"[:400])


@app.post("/api/separate")
def separate(payload: dict):
    name = Path(str(payload.get("file", ""))).name
    src = DATA / name
    if not name or not src.is_file():
        raise HTTPException(404, "Arquivo não encontrado.")
    jid = uuid.uuid4().hex[:8]
    jobs[jid] = {"status": "running", "msg": "Na fila..."}
    threading.Thread(target=run_separation, args=(jid, src), daemon=True).start()
    return {"job": jid}


@app.get("/api/jobs/{jid}")
def job_status(jid: str):
    if jid not in jobs:
        raise HTTPException(404, "Tarefa não encontrada.")
    return jobs[jid]


# ---------------------------------------------------------------- arquivos e interface
app.mount("/musicas", StaticFiles(directory=str(DATA)), name="musicas")
if WEB.is_dir():
    app.mount("/", StaticFiles(directory=str(WEB), html=True), name="web")

if __name__ == "__main__":
    import uvicorn

    print("Social Music Beat: abra http://localhost:8002 no navegador")
    uvicorn.run(app, host="127.0.0.1", port=8002)

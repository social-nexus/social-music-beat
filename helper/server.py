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

app = FastAPI()

from legenda import router as legenda_router  # noqa: E402

app.include_router(legenda_router)

from ia_local import router as ai_router  # noqa: E402

app.include_router(ai_router)
_lib_lock = threading.Lock()


# ---------------------------------------------------------------- biblioteca
def read_lib():
    try:
        return json.loads(LIB_FILE.read_text(encoding="utf-8"))
    except Exception:
        return []


def write_lib(items):
    LIB_FILE.write_text(json.dumps(items, ensure_ascii=False, indent=1), encoding="utf-8")


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


@app.delete("/api/library/{tid}")
def delete_track(tid: str):
    with _lib_lock:
        items = read_lib()
        gone = [t for t in items if t.get("id") == tid]
        write_lib([t for t in items if t.get("id") != tid])
    for t in gone:
        name = Path(str(t.get("file", ""))).name
        if name and (DATA / name).is_file():
            (DATA / name).unlink()
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
    name = f"{int(time.time())}_{uuid.uuid4().hex[:6]}.{sniff_ext(r.content)}"
    (DATA / name).write_bytes(r.content)
    return {"file": f"/musicas/{name}"}


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
    for tag, tensor in (("voz", vocals), ("instrumental", inst)):
        fname = f"{stem}_{tag}.wav"
        sf.write(str(DATA / fname), tensor.clamp(-1, 1).T.contiguous().numpy(), model.samplerate, subtype="PCM_16")
        out[tag] = f"/musicas/{fname}"
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

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle, Download, FileText, HelpCircle, Loader2, Mic, Music, Pause, Play, Scissors, Sparkles, Trash2, X,
} from "lucide-react";

// ------------------------------------------------------------------ constantes
const TURBO = "acestep-v15-turbo"; // criar músicas (rápido, melhor qualidade)
const BASE_MODEL = "acestep-v15-base"; // criar a banda para a sua voz (tarefa "complete")

const STYLES = [
  { label: "Pop", v: "pop, upbeat, catchy" },
  { label: "Sertanejo", v: "sertanejo, brazilian country, acoustic guitar, viola" },
  { label: "Rock", v: "rock, electric guitars, driving drums" },
  { label: "MPB", v: "MPB, brazilian acoustic, nylon guitar, soft percussion" },
  { label: "Gospel", v: "gospel, worship, piano, uplifting" },
  { label: "Funk", v: "funk carioca, heavy bass, brazilian funk beat" },
  { label: "Samba / Pagode", v: "samba, pagode, cavaquinho, percussion" },
  { label: "Forró", v: "forró, accordion, zabumba, triangle" },
  { label: "Eletrônica", v: "electronic dance, synth, four-on-the-floor" },
  { label: "Lo-fi", v: "lo-fi hip hop, chill, mellow" },
  { label: "Balada", v: "ballad, piano, strings, emotional" },
  { label: "Reggae", v: "reggae, offbeat guitar, relaxed" },
];

const KEYS = ["", "C Major", "G Major", "D Major", "A Major", "E Major", "F Major", "A minor", "E minor", "D minor", "B minor", "F# minor", "C minor"];

const INSTRUMENTS = [
  { id: "drums", label: "Bateria" },
  { id: "bass", label: "Baixo" },
  { id: "guitar", label: "Violão / Guitarra" },
  { id: "keyboard", label: "Teclado / Piano" },
  { id: "strings", label: "Cordas" },
  { id: "percussion", label: "Percussão" },
  { id: "synth", label: "Sintetizador" },
  { id: "brass", label: "Metais" },
  { id: "woodwinds", label: "Sopros" },
];

const KIND = { song: "Música", instrumental: "Instrumental", voz: "Voz guia", banda: "Banda para a sua voz" };
const KIND_COLOR = {
  song: "from-pink-500 to-orange-400",
  instrumental: "from-sky-500 to-indigo-500",
  voz: "from-emerald-500 to-teal-400",
  banda: "from-fuchsia-500 to-violet-500",
};

// ------------------------------------------------------------------ utilidades
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

async function http(url, opts) {
  const r = await fetch(url, opts);
  const text = await r.text();
  let data = null;
  try { data = JSON.parse(text); } catch { /* resposta não é JSON */ }
  if (!r.ok) throw new Error((data && (data.detail || data.error)) || text.slice(0, 300) || `Erro ${r.status}`);
  return data;
}
const jsonPost = (url, body) =>
  http(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

// Envia uma tarefa ao ACE-Step. Com arquivo: tudo vai dentro de "param_obj" (aceita listas).
async function submitTask(params, file) {
  let res;
  if (file) {
    const fd = new FormData();
    fd.append("param_obj", JSON.stringify(params));
    fd.append("src_audio", file, "voz.wav");
    res = await http("/ace/release_task", { method: "POST", body: fd });
  } else {
    res = await jsonPost("/ace/release_task", params);
  }
  const id = res?.data?.task_id;
  if (!id) throw new Error(res?.error || "Não consegui iniciar a criação.");
  return id;
}

async function waitResult(id) {
  for (;;) {
    await sleep(2000);
    const res = await jsonPost("/ace/query_result", { task_id_list: [id] });
    const item = res?.data?.[0];
    if (!item) continue;
    if (item.status === 1) return JSON.parse(item.result);
    if (item.status === 2) throw new Error("A criação falhou. Olhe a janela preta do ACE-Step para ver o motivo.");
  }
}

function encodeWav(pcm, rate) {
  const buf = new ArrayBuffer(44 + pcm.length * 2);
  const v = new DataView(buf);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, "RIFF"); v.setUint32(4, 36 + pcm.length * 2, true); w(8, "WAVE"); w(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  w(36, "data"); v.setUint32(40, pcm.length * 2, true);
  new Int16Array(buf, 44).set(pcm);
  return new Blob([buf], { type: "audio/wav" });
}

// Converte qualquer áudio (mp3, wav, m4a...) para WAV mono 44,1 kHz
async function toWavBlob(file, maxSec = 600) {
  const ctx = new AudioContext();
  const decoded = await ctx.decodeAudioData(await file.arrayBuffer());
  ctx.close();
  const seconds = Math.min(decoded.duration, maxSec);
  const rate = 44100;
  const off = new OfflineAudioContext(1, Math.ceil(seconds * rate), rate);
  const node = off.createBufferSource();
  node.buffer = decoded;
  node.connect(off.destination);
  node.start();
  const rendered = await off.startRendering();
  const f32 = rendered.getChannelData(0);
  const pcm = new Int16Array(f32.length);
  for (let i = 0; i < f32.length; i++) {
    const s = Math.max(-1, Math.min(1, f32[i]));
    pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return { blob: encodeWav(pcm, rate), seconds };
}

// ------------------------------------------------------------------ componentes pequenos
function Seg({ value, onChange, options }) {
  return (
    <div className="inline-flex rounded-xl bg-zinc-900 p-1 border border-white/5">
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${value === o.v ? "bg-white text-black" : "text-zinc-400 hover:text-white"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const inputCls = "w-full rounded-xl bg-zinc-900/70 border border-white/10 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-pink-500/60";

function VoiceModal({ track, onClose, onGo }) {
  const [file, setFile] = useState(null);
  const [picked, setPicked] = useState(["drums", "bass", "guitar", "keyboard"]);
  const [style, setStyle] = useState(track.style || "");
  const [bpm, setBpm] = useState(track.bpm || "");
  const [key, setKey] = useState(track.key || "");
  const [autoSep, setAutoSep] = useState(true);
  const inputRef = useRef(null);
  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-[#14141a] border border-white/10 p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">Cantar por cima</h2>
            <p className="text-xs text-zinc-400 mt-1">
              Você cantou em cima do instrumental de “{track.title}”? Envie só a sua voz (sem a música de fundo) e o
              programa cria uma banda nova que acompanha o seu jeito de cantar.
            </p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X size={20} /></button>
        </div>

        <button
          onClick={() => inputRef.current.click()}
          className="w-full rounded-xl border border-dashed border-white/20 py-4 text-sm text-zinc-300 hover:border-pink-500/60"
        >
          {file ? `✔ ${file.name}` : "1. Escolher o arquivo com a minha voz (WAV ou MP3, mínimo 10 segundos)"}
        </button>
        <input ref={inputRef} type="file" accept="audio/*" className="hidden" onChange={(e) => setFile(e.target.files[0] || null)} />

        <div>
          <p className="text-xs font-semibold text-zinc-300 mb-2">2. Quais instrumentos a banda deve ter?</p>
          <div className="flex flex-wrap gap-2">
            {INSTRUMENTS.map((i) => (
              <button
                key={i.id}
                onClick={() => toggle(i.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${picked.includes(i.id) ? "bg-pink-500 border-pink-500 text-white" : "border-white/15 text-zinc-300 hover:border-white/40"}`}
              >
                {i.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-zinc-300 mb-2">3. Estilo (já vem o da música original)</p>
          <textarea rows={2} className={inputCls} value={style} onChange={(e) => setStyle(e.target.value)} />
          <div className="grid grid-cols-2 gap-3 mt-3">
            <input className={inputCls} type="number" placeholder="BPM (opcional)" value={bpm} onChange={(e) => setBpm(e.target.value)} />
            <select className={inputCls} value={key} onChange={(e) => setKey(e.target.value)}>
              {KEYS.map((k) => <option key={k} value={k}>{k || "Tom: automático"}</option>)}
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
          <input type="checkbox" checked={autoSep} onChange={(e) => setAutoSep(e.target.checked)} />
          Depois, separar também só a banda (sem a voz). Demora alguns minutos a mais.
        </label>

        <button
          disabled={!file || picked.length === 0}
          onClick={() => onGo({ file, instruments: picked, style, bpm, key, autoSep })}
          className="w-full rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 py-3 font-bold text-white disabled:opacity-40"
        >
          Criar a banda para a minha voz
        </button>
        <p className="text-[11px] text-zinc-500">
          Na primeira vez o motor carrega um modelo diferente, o que pode levar alguns minutos. Não feche as janelas pretas.
        </p>
      </div>
    </div>
  );
}

// Legenda (SRT e LRC) de uma música: usa a voz separada e a letra salva, ou uma gravação sua
function LegendaModal({ track, tracks, onClose }) {
  const voz = track.kind === "voz" ? track : tracks.find((x) => x.kind === "voz" && x.parent === track.id);
  const fonte = voz || track;
  const [letra, setLetra] = useState(track.lyrics || "");
  const [modo, setModo] = useState("rapido");
  const [modelo, setModelo] = useState("base");
  const [maxc, setMaxc] = useState(36);
  const [outro, setOutro] = useState(null);
  const [whisper, setWhisper] = useState(false);
  const [msg, setMsg] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [res, setRes] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => { http("/api/legenda/status").then((s) => setWhisper(!!s.whisper)).catch(() => {}); }, []);

  const gerar = async () => {
    setRes(null);
    setMsg("");
    if (!letra.trim()) { setMsg("A letra está vazia."); return; }
    if (modo === "whisper" && !whisper) { setMsg("O Whisper não está instalado. Rode o instalar.bat de novo (ele instala o Whisper) e abra o programa outra vez."); return; }
    setOcupado(true);
    try {
      let jid;
      if (outro) {
        const { blob } = await toWavBlob(outro);
        const fd = new FormData();
        fd.append("audio", blob, "audio.wav");
        fd.append("roteiro", letra);
        fd.append("modo", modo);
        fd.append("max_chars", String(maxc));
        fd.append("modelo", modelo);
        jid = (await http("/api/legenda/gerar", { method: "POST", body: fd })).job;
      } else {
        jid = (await jsonPost("/api/legenda/da-biblioteca", { file: fonte.file, roteiro: letra, modo, max_chars: Number(maxc), modelo })).job;
      }
      for (;;) {
        await sleep(1200);
        const s = await http(`/api/legenda/job/${jid}`);
        setMsg(s.msg || "Trabalhando...");
        if (s.status === "erro") throw new Error(s.msg);
        if (s.status === "pronto") { setRes(s); setMsg(""); break; }
      }
    } catch (e) {
      setMsg(String(e.message || e).slice(0, 300));
    }
    setOcupado(false);
  };

  const baixar = (conteudo, ext) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([conteudo], { type: "text/plain;charset=utf-8" }));
    a.download = `${track.title}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-2xl bg-[#14141a] border border-white/10 p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">Legenda da música</h2>
            <p className="text-xs text-zinc-400 mt-1">Gera o arquivo .srt (vídeo) e o .lrc (letra sincronizada) de “{track.title}”.</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X size={20} /></button>
        </div>

        <div className="rounded-xl border border-white/10 p-3 text-xs text-zinc-300">
          <div className="font-semibold text-white mb-1">Áudio usado</div>
          {outro ? `Seu arquivo: ${outro.name}` : `${fonte.title}${voz ? " (voz separada, melhor resultado)" : " (música inteira)"}`}
          {!outro && !voz && (
            <div className="mt-1 text-amber-300">Sem a voz separada o resultado costuma ser pior. Feche esta janela e use “Separar voz e instrumental” antes.</div>
          )}
          <div className="mt-2">
            <button onClick={() => inputRef.current.click()} className="underline text-pink-300">Usar a minha gravação cantando</button>
            {outro && <button onClick={() => setOutro(null)} className="ml-3 underline text-zinc-400">voltar ao áudio da música</button>}
            <input ref={inputRef} type="file" accept="audio/*" className="hidden" onChange={(e) => setOutro(e.target.files[0] || null)} />
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-zinc-300 mb-2">Letra (uma linha cantada por linha; as marcações [Verse] são ignoradas)</p>
          <textarea rows={7} className={inputCls} value={letra} onChange={(e) => setLetra(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <select className={inputCls} value={modo} onChange={(e) => setModo(e.target.value)}>
            <option value="rapido">Rápido: usa as pausas do canto</option>
            <option value="whisper">Preciso: Whisper ouve a voz</option>
          </select>
          <label className="flex items-center gap-2 text-zinc-300">
            Caracteres por legenda
            <input type="number" min={15} max={120} value={maxc} onChange={(e) => setMaxc(e.target.value)} className="w-16 rounded-lg bg-zinc-900 border border-white/10 px-2 py-1.5" />
          </label>
          {modo === "whisper" && (
            <select className={inputCls} value={modelo} onChange={(e) => setModelo(e.target.value)}>
              <option value="base">Whisper base (cerca de 150 MB)</option>
              <option value="small">Whisper small (cerca de 480 MB)</option>
            </select>
          )}
        </div>
        <p className="text-[11px] text-zinc-500">
          Rápido funciona melhor quando o cantor respira ou pausa entre as linhas. Cantar é mais difícil de alinhar do que falar, então confira o resultado.
          {modo === "whisper" && (whisper ? " Whisper instalado." : " Whisper ainda não instalado: rode o instalar.bat de novo.")}
        </p>

        <button
          onClick={gerar}
          disabled={ocupado}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 py-3 font-bold text-white disabled:opacity-50"
        >
          {ocupado ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />} {ocupado ? "Trabalhando..." : "Gerar legenda"}
        </button>
        {msg && <div className={`rounded-lg border p-3 text-xs break-words ${ocupado ? "border-white/10 text-zinc-300" : "border-red-500/30 bg-red-500/10 text-red-200"}`}>{msg}</div>}

        {res && (
          <div className="space-y-3">
            <div className="text-xs text-zinc-400">
              {res.info.legendas} linhas • modo {res.info.modo === "whisper" ? "preciso" : "rápido"} •{" "}
              {res.info.modo === "whisper" ? `${Math.round(res.info.confianca * 100)}% das palavras casaram` : `qualidade do encaixe ${Math.round(res.info.confianca * 100)}%`}
            </div>
            {res.avisos.map((a, i) => <div key={i} className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-200">{a}</div>)}
            <textarea readOnly rows={8} className={`${inputCls} font-mono text-xs`} value={res.srt} />
            <div className="flex flex-wrap gap-2">
              <button onClick={() => baixar(res.srt, "srt")} className="rounded-lg bg-white px-4 py-2 text-xs font-bold text-black">Baixar .srt</button>
              <button onClick={() => baixar(res.lrc, "lrc")} className="rounded-lg border border-white/20 px-4 py-2 text-xs font-bold">Baixar .lrc</button>
              <button onClick={() => navigator.clipboard.writeText(res.srt).catch(() => {})} className="rounded-lg border border-white/20 px-4 py-2 text-xs font-bold">Copiar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


function CompositorPanel({ onUseLyrics }) {
  const [catalog, setCatalog] = useState({ runtimes: [], models: [], installed_models: [] });
  const [status, setStatus] = useState({});
  const [runtime, setRuntime] = useState("");
  const [model, setModel] = useState("qwen3-4b-q4km");
  const [gpuLayers, setGpuLayers] = useState(0);
  const [theme, setTheme] = useState("");
  const [genre, setGenre] = useState("MPB");
  const [mood, setMood] = useState("emocionante e acolhedor");
  const [voice, setVoice] = useState("indiferente");
  const [duration, setDuration] = useState(120);
  const [language, setLanguage] = useState("português do Brasil");
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const [c, s] = await Promise.all([http("/api/ai/catalog"), http("/api/ai/status")]);
    setCatalog(c);
    setStatus(s);
    const compatible = c.runtimes.filter((r) => r.compatible);
    setRuntime((old) => old && compatible.some((r) => r.id === old) ? old : (compatible.find((r) => r.installed)?.id || compatible.find((r) => r.backend === "cpu")?.id || compatible[0]?.id || ""));
    if (!model && c.models.length) setModel(c.models[0].id);
  }, [model]);

  useEffect(() => { refresh().catch((e) => setError(e.message)); }, [refresh]);

  const waitJob = async (id, doneMessage) => {
    for (;;) {
      const j = await http("/api/ai/jobs/" + id);
      setMessage(j.message || "Processando…");
      if (j.status === "done") { setMessage(doneMessage); return; }
      if (j.status === "error") throw new Error(j.message || "A operação falhou.");
      await sleep(1200);
    }
  };

  const installRuntime = async () => {
    setBusy(true); setError(""); setMessage("Preparando o motor local…");
    try {
      const r = await jsonPost("/api/ai/runtime/install", { variant: runtime });
      if (r.job_id) await waitJob(r.job_id, "Motor instalado e verificado.");
      await refresh();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const downloadModel = async () => {
    setBusy(true); setError(""); setMessage("Preparando o download do modelo…");
    try {
      const r = await jsonPost("/api/ai/models/download", { model_id: model });
      if (r.job_id) await waitJob(r.job_id, "Modelo instalado e verificado.");
      await refresh();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const activate = async () => {
    setBusy(true); setError(""); setMessage("Carregando o modelo na memória…");
    try {
      await jsonPost("/api/ai/models/activate", { model_id: model, variant: runtime, gpu_layers: Number(gpuLayers) });
      await refresh();
      setMessage("Modelo ativo. Você já pode compor.");
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const generate = async () => {
    setBusy(true); setError(""); setMessage("Compondo a letra localmente…"); setResult("");
    try {
      const r = await jsonPost("/api/ai/generate-lyrics", { theme, genre, mood, voice, duration, language });
      setResult(r.lyrics);
      setMessage("Letra criada com " + r.model + ".");
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const importModel = async (file) => {
    if (!file) return;
    setBusy(true); setError(""); setMessage("Importando arquivo GGUF…");
    try {
      const fd = new FormData(); fd.append("file", file);
      await http("/api/ai/models/import", { method: "POST", body: fd });
      await refresh();
      setMessage("Modelo importado. Confirme a licença e selecione-o para ativar.");
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const compatibleRuntimes = catalog.runtimes.filter((r) => r.compatible);
  const selectedRuntime = catalog.runtimes.find((r) => r.id === runtime);
  const selectedModel = catalog.models.find((m) => m.id === model);
  const installedSelected = catalog.installed_models.some((m) => m.id === model);
  const runtimeInstalled = !!selectedRuntime?.installed;

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 lg:p-6">
      <div>
        <h1 className="text-2xl font-black">Compositor de letras com IA local</h1>
        <p className="mt-1 text-sm text-zinc-400">Crie letras no seu computador. Nenhum texto precisa ser enviado para serviços externos.</p>
      </div>

      {(error || message) && (
        <div className={error ? "rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200" : "rounded-xl border border-sky-500/20 bg-sky-500/5 p-3 text-sm text-sky-200"}>
          {error || message}
        </div>
      )}

      <section className="rounded-2xl border border-white/5 bg-[#111116] p-5 space-y-4">
        <h2 className="font-bold">1. Motor de IA</h2>
        {compatibleRuntimes.length ? (
          <>
            <label className="block text-xs font-semibold text-zinc-300">Pacote compatível com este computador</label>
            <select className={inputCls} value={runtime} onChange={(e) => setRuntime(e.target.value)}>
              {compatibleRuntimes.map((r) => <option key={r.id} value={r.id}>{r.label} {r.installed ? "— instalado" : "— " + (r.size_bytes / 1024 / 1024).toFixed(0) + " MB"}</option>)}
            </select>
            <div className="flex flex-wrap items-center gap-3">
              <button disabled={busy || !runtime || runtimeInstalled} onClick={installRuntime} className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-black disabled:opacity-40">
                {runtimeInstalled ? "Motor instalado" : "Baixar e instalar motor"}
              </button>
              {runtimeInstalled && <span className="text-xs text-emerald-300">SHA-256 verificado</span>}
            </div>
            {selectedRuntime?.backend !== "cpu" && (
              <label className="block max-w-xs text-xs text-zinc-300">
                Camadas na GPU (0 = CPU)
                <input type="number" min="0" max="200" value={gpuLayers} onChange={(e) => setGpuLayers(e.target.value)} className={inputCls + " mt-1"} />
              </label>
            )}
            <p className="text-xs text-zinc-500">O pacote CPU é o caminho mais compatível. CUDA/Vulkan/Metal dependem dos drivers e do hardware. A aceleração pode exigir ajustes de memória.</p>
          </>
        ) : <p className="text-sm text-amber-200">Não encontrei um pacote pronto para este sistema/arquitetura. A ferramenta continua funcionando sem o compositor.</p>}
      </section>

      <section className="rounded-2xl border border-white/5 bg-[#111116] p-5 space-y-4">
        <h2 className="font-bold">2. Modelo de linguagem</h2>
        <label className="block text-xs font-semibold text-zinc-300">Modelo do catálogo</label>
        <select className={inputCls} value={model} onChange={(e) => setModel(e.target.value)}>
          {catalog.models.map((m) => <option key={m.id} value={m.id}>{m.name} {m.installed ? "— instalado" : "— aprox. " + m.approx_size_gb + " GB"}</option>)}
          {catalog.installed_models.filter((m) => !catalog.models.some((c) => c.id === m.id)).map((m) => <option key={m.id} value={m.id}>{m.name} — importado</option>)}
        </select>
        {selectedModel && <div className="rounded-xl bg-white/[0.03] p-3 text-xs text-zinc-400">
          <p>{selectedModel.description}</p>
          <p className="mt-2">Licença: <b className="text-zinc-200">{selectedModel.license}</b> · <a className="underline" href={selectedModel.license_url} target="_blank" rel="noreferrer">ver licença</a> · <a className="underline" href={selectedModel.model_url} target="_blank" rel="noreferrer">origem oficial</a></p>
        </div>}
        <div className="flex flex-wrap gap-2">
          <button disabled={busy || installedSelected || !selectedModel} onClick={downloadModel} className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-bold disabled:opacity-40">{installedSelected ? "Modelo instalado" : "Baixar modelo"}</button>
          <label className="cursor-pointer rounded-xl border border-white/15 px-4 py-2.5 text-sm font-bold hover:bg-white/5">
            Importar GGUF
            <input type="file" accept=".gguf" className="hidden" disabled={busy} onChange={(e) => { importModel(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
          <button disabled={busy || !runtimeInstalled || !installedSelected} onClick={activate} className="rounded-xl bg-pink-500 px-4 py-2.5 text-sm font-black text-white disabled:opacity-40">Ativar modelo</button>
          {status.runtime_running && <button disabled={busy} onClick={async () => { setBusy(true); try { await http("/api/ai/runtime/stop", { method: "POST" }); await refresh(); setMessage("Motor encerrado."); } catch (e) { setError(e.message); } finally { setBusy(false); } }} className="rounded-xl border border-white/15 px-4 py-2.5 text-sm">Desligar IA</button>}
        </div>
        <p className="text-xs text-zinc-500">Você também pode importar outros GGUF, inclusive versões Gemma obtidas após aceitar os termos oficiais. A licença de arquivos importados não é verificada automaticamente.</p>
      </section>

      <section className="rounded-2xl border border-white/5 bg-[#111116] p-5 space-y-4">
        <h2 className="font-bold">3. Compor uma música</h2>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-zinc-300">Tema ou história</label>
          <textarea rows={3} className={inputCls} value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="Ex.: um pai ensinando o filho a pescar e lembrando da própria infância" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-zinc-300">Gênero musical<input className={inputCls + " mt-1"} value={genre} onChange={(e) => setGenre(e.target.value)} /></label>
          <label className="text-xs font-semibold text-zinc-300">Clima / sentimento<input className={inputCls + " mt-1"} value={mood} onChange={(e) => setMood(e.target.value)} /></label>
          <label className="text-xs font-semibold text-zinc-300">Voz<select className={inputCls + " mt-1"} value={voice} onChange={(e) => setVoice(e.target.value)}><option>indiferente</option><option>masculina</option><option>feminina</option><option>dueto</option></select></label>
          <label className="text-xs font-semibold text-zinc-300">Idioma<select className={inputCls + " mt-1"} value={language} onChange={(e) => setLanguage(e.target.value)}><option>português do Brasil</option><option>inglês</option><option>espanhol</option></select></label>
          <label className="text-xs font-semibold text-zinc-300">Duração aproximada<select className={inputCls + " mt-1"} value={duration} onChange={(e) => setDuration(Number(e.target.value))}><option value={60}>1 minuto</option><option value={90}>1 minuto e meio</option><option value={120}>2 minutos</option><option value={150}>2 minutos e meio</option><option value={180}>3 minutos</option><option value={240}>4 minutos</option><option value={300}>5 minutos</option></select></label>
        </div>
        <button disabled={busy || !status.runtime_running || !status.active_model || !theme.trim()} onClick={generate} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 py-3.5 font-black text-white disabled:opacity-40">
          {busy ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />} Gerar letra localmente
        </button>
        {result && <div className="space-y-3">
          <label className="block text-xs font-semibold text-zinc-300">Letra gerada — você pode editar antes de usar</label>
          <textarea rows={18} className={inputCls} value={result} onChange={(e) => setResult(e.target.value)} />
          <button onClick={() => onUseLyrics(result)} className="w-full rounded-xl bg-white px-4 py-3 font-black text-black">Usar esta letra na criação musical</button>
        </div>}
      </section>
    </div>
  );
}

// ------------------------------------------------------------------ aplicativo
export default function App() {
  const [tab, setTab] = useState("criar");
  const [tracks, setTracks] = useState([]);
  const [online, setOnline] = useState(false);
  const [job, setJob] = useState(null);
  const [, setTick] = useState(0);
  const [err, setErr] = useState("");
  const [player, setPlayer] = useState(null);
  const [voiceFor, setVoiceFor] = useState(null);
  const [legendaFor, setLegendaFor] = useState(null);

  const [form, setForm] = useState({
    title: "", lyrics: "", style: "", instrumentalOnly: false, voiceKind: "auto",
    duration: 120, versions: 1, bpm: "", key: "", lang: "pt",
  });
  const [showAdv, setShowAdv] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    http("/api/library").then(setTracks).catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    const ping = () => http("/api/status").then((s) => alive && setOnline(!!s.ace_online)).catch(() => alive && setOnline(false));
    ping();
    const t = setInterval(ping, 4000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  useEffect(() => {
    if (!job) return undefined;
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [job]);

  const addTrack = useCallback(async (t) => {
    setTracks((prev) => [t, ...prev]);
    await jsonPost("/api/library", t).catch(() => {});
  }, []);

  const runJob = async (title, fn) => {
    setErr("");
    setJob({ title, phase: "Começando...", startedAt: Date.now() });
    const phase = (p) => setJob((j) => (j ? { ...j, phase: p } : j));
    try { await fn(phase); } catch (e) { setErr(String(e.message || e)); } finally { setJob(null); }
  };

  // Salva o que o motor gerou e cria as faixas na biblioteca
  const saveItems = async (items, make) => {
    let n = 0;
    for (const it of items) {
      if (!it.file) continue;
      n += 1;
      const { file } = await jsonPost("/api/save", { url: it.file });
      await addTrack({ id: uid(), file, createdAt: Date.now(), ...make(it, n, items.length) });
    }
    if (!n) throw new Error("O motor não devolveu nenhum áudio.");
  };

  const separateInto = async (t, titles, phase) => {
    const { job: jid } = await jsonPost("/api/separate", { file: t.file });
    for (;;) {
      await sleep(2000);
      const s = await http(`/api/jobs/${jid}`);
      phase(s.msg || "Separando...");
      if (s.status === "error") throw new Error(s.msg);
      if (s.status === "done") {
        const base = { createdAt: Date.now(), parent: t.id, style: t.style, lyrics: t.lyrics, bpm: t.bpm, key: t.key };
        await addTrack({ ...base, id: uid(), kind: "voz", title: titles.voz, file: s.result.voz });
        await addTrack({ ...base, id: uid(), kind: "instrumental", title: titles.instrumental, file: s.result.instrumental });
        return;
      }
    }
  };

  // -------- 1) criar a música
  const createSong = () => {
    const title = form.title.trim() || "Minha música";
    return runJob(title, async (phase) => {
      if (!form.instrumentalOnly && !form.lyrics.trim()) throw new Error("Escreva a letra (ou escolha “Só instrumental”).");
      if (!form.style.trim()) throw new Error("Descreva o estilo da música. Dá para clicar nos botões de estilo.");
      const voice = form.instrumentalOnly ? "" : form.voiceKind === "female" ? "female vocals" : form.voiceKind === "male" ? "male vocals" : "";
      const caption = [form.style.trim(), voice].filter(Boolean).join(", ");
      const params = {
        prompt: caption,
        lyrics: form.instrumentalOnly ? "[Instrumental]" : form.lyrics.trim(),
        task_type: "text2music",
        model: TURBO,
        thinking: false,
        use_cot_caption: false,
        use_cot_language: false,
        vocal_language: form.lang,
        audio_format: "wav",
        audio_duration: Number(form.duration),
        batch_size: Number(form.versions),
        inference_steps: 8,
        use_random_seed: true,
      };
      if (form.bpm) params.bpm = Number(form.bpm);
      if (form.key) params.key_scale = form.key;
      phase("Enviando para o motor de música...");
      const id = await submitTask(params);
      phase("Criando a música... (na primeira vez demora mais)");
      const items = await waitResult(id);
      phase("Guardando...");
      await saveItems(items, (it, n, total) => {
        const m = it.metas || {};
        return {
          kind: form.instrumentalOnly ? "instrumental" : "song",
          title: total > 1 ? `${title} (${n})` : title,
          lyrics: form.instrumentalOnly ? "" : form.lyrics.trim(),
          style: caption,
          bpm: m.bpm ?? null,
          key: m.keyscale || "",
          duration: m.duration ?? null,
        };
      });
    });
  };

  // -------- 2) separar voz e instrumental
  const separateTrack = (t) =>
    runJob(`Separando: ${t.title}`, (phase) =>
      separateInto(t, {
        voz: `${t.title} (voz)`,
        instrumental: t.kind === "banda" ? `${t.title} (só a banda)` : `${t.title} (instrumental)`,
      }, phase));

  // -------- 3) cantar por cima: criar a banda para a voz do usuário
  const singOver = (parent, o) => {
    setVoiceFor(null);
    return runJob(`Banda para: ${parent.title}`, async (phase) => {
      phase("Preparando a sua voz...");
      const { blob, seconds } = await toWavBlob(o.file);
      if (seconds < 10) throw new Error("O áudio da sua voz precisa ter pelo menos 10 segundos.");
      const params = {
        prompt: o.style.trim() || parent.style || "band accompaniment",
        lyrics: parent.lyrics || "",
        task_type: "complete",
        track_classes: o.instruments,
        model: BASE_MODEL,
        thinking: false,
        use_cot_caption: false,
        use_cot_language: false,
        vocal_language: form.lang,
        audio_format: "wav",
        audio_duration: Math.round(seconds),
        batch_size: 1,
        inference_steps: 32,
        guidance_scale: 7.0,
        shift: 3.0,
        use_random_seed: true,
      };
      if (o.bpm) params.bpm = Number(o.bpm);
      if (o.key) params.key_scale = o.key;
      phase("Enviando... (na primeira vez o motor troca de modelo: pode levar alguns minutos)");
      const id = await submitTask(params, blob);
      phase("Criando a banda para a sua voz...");
      const items = await waitResult(id);
      phase("Guardando...");
      await saveItems(items, () => {
        return { kind: "banda", title: `${parent.title} - com a minha voz`, lyrics: parent.lyrics, style: params.prompt, bpm: params.bpm ?? parent.bpm, key: params.key_scale || parent.key, parent: parent.id };
      });
      if (o.autoSep) {
        // pega a faixa recém-criada (a mais nova da biblioteca)
        const fresh = await http("/api/library");
        const t = fresh.find((x) => x.kind === "banda" && x.parent === parent.id);
        if (t) await separateInto(t, { voz: `${t.title} (voz)`, instrumental: `${parent.title} - só a banda` }, phase);
      }
    });
  };

  const removeTrack = async (t) => {
    if (!window.confirm(`Excluir “${t.title}”? Isso apaga o arquivo.`)) return;
    setTracks((prev) => prev.filter((x) => x.id !== t.id));
    if (player?.id === t.id) setPlayer(null);
    await http(`/api/library/${t.id}`, { method: "DELETE" }).catch(() => {});
  };

  const busy = !!job;
  const elapsed = job ? Math.floor((Date.now() - job.startedAt) / 1000) : 0;

  return (
    <div className="min-h-screen bg-[#0c0c10] text-zinc-100 flex">
      {/* barra lateral */}
      <aside className="hidden md:flex w-56 shrink-0 flex-col gap-1 border-r border-white/5 p-4">
        <div className="mb-6 px-2">
          <img src="./logo.png" alt="Social Music Beat" className="w-full h-auto select-none" draggable="false" />
        </div>
        {[
          { id: "criar", label: "Criar", icon: <Sparkles size={16} /> },
          { id: "compositor", label: "Compositor IA", icon: <Music size={16} /> },
          { id: "ajuda", label: "Como usar", icon: <HelpCircle size={16} /> },
        ].map((n) => (
          <button
            key={n.id}
            onClick={() => setTab(n.id)}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold ${tab === n.id ? "bg-white/10 text-white" : "text-zinc-400 hover:bg-white/5"}`}
          >
            {n.icon} {n.label}
          </button>
        ))}
      </aside>

      <main className="flex-1 min-w-0 pb-32">
        {!online && (
          <div className="m-4 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <div>O motor de música (ACE-Step) ainda está ligando ou foi fechado. Na primeira vez pode levar alguns minutos. Mantenha a janela “ACE-Step” aberta.</div>
          </div>
        )}
        {err && (
          <div className="m-4 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <div className="flex-1 break-words">{err}</div>
            <button onClick={() => setErr("")}><X size={16} /></button>
          </div>
        )}

        {tab === "ajuda" ? (
          <div className="max-w-2xl p-6 space-y-4 text-sm text-zinc-300 leading-relaxed">
            <h1 className="text-2xl font-black text-white">Como usar, em 4 passos</h1>
            <p><b className="text-white">1. Criar.</b> Cole a letra, escolha o estilo e clique em Criar. Você recebe a música cantada (com uma voz guia).</p>
            <p><b className="text-white">2. Separar.</b> Na música criada, clique em “Separar voz e instrumental”. Você recebe dois arquivos: só a voz guia e só o instrumental.</p>
            <p><b className="text-white">3. Cantar.</b> Baixe o instrumental, ouça a voz guia para aprender a melodia e grave a sua voz (só a voz, de fone de ouvido).</p>
            <p><b className="text-white">4. Ajustar a banda.</b> Clique em “Cantar por cima”, envie a sua gravação e escolha os instrumentos. O programa cria uma banda nova que acompanha o seu jeito de cantar.</p>
            <p className="text-zinc-500">Mantenha abertas as duas janelas pretas enquanto usa. Para fechar tudo, feche as janelas pretas.</p>
          </div>
        ) : tab === "compositor" ? (
          <CompositorPanel onUseLyrics={(lyrics) => { setForm((f) => ({ ...f, lyrics, instrumentalOnly: false })); setTab("criar"); }} />
        ) : (
          <div className="grid gap-6 p-4 lg:p-6 lg:grid-cols-[430px_1fr]">
            {/* ---------------- formulário ---------------- */}
            <section className="rounded-2xl border border-white/5 bg-[#111116] p-5 space-y-5 h-fit">
              <div className="flex items-center justify-between">
                <h1 className="text-lg font-black">Criar música</h1>
                <Seg
                  value={form.instrumentalOnly ? "inst" : "voz"}
                  onChange={(v) => set("instrumentalOnly", v === "inst")}
                  options={[{ v: "voz", label: "Com voz" }, { v: "inst", label: "Só instrumental" }]}
                />
              </div>

              {!form.instrumentalOnly && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-zinc-300">Letra</label>
                  <textarea
                    rows={10}
                    className={inputCls}
                    placeholder={"[Verse 1]\nEscreva a sua letra aqui...\n\n[Chorus]\nO refrão vai aqui..."}
                    value={form.lyrics}
                    onChange={(e) => set("lyrics", e.target.value)}
                  />
                  <p className="mt-1 text-[11px] text-zinc-500">Dica: marque as partes com [Verse 1], [Chorus], [Bridge] (em inglês). Ajuda o modelo.</p>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-300">Estilo</label>
                <textarea
                  rows={3}
                  className={inputCls}
                  placeholder="Ex.: pop animado, violão, bateria leve (clique nos botões abaixo para preencher)"
                  value={form.style}
                  onChange={(e) => set("style", e.target.value)}
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {STYLES.map((s) => (
                    <button
                      key={s.label}
                      onClick={() => set("style", form.style.trim() ? `${form.style.trim().replace(/,$/, "")}, ${s.v}` : s.v)}
                      className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-semibold text-zinc-300 hover:border-pink-500/60 hover:text-white"
                    >
                      + {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {!form.instrumentalOnly && (
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-zinc-300">Voz:</span>
                  <Seg
                    value={form.voiceKind}
                    onChange={(v) => set("voiceKind", v)}
                    options={[{ v: "auto", label: "Automática" }, { v: "female", label: "Feminina" }, { v: "male", label: "Masculina" }]}
                  />
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-300">Título (opcional)</label>
                <input className={inputCls} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Minha música" />
              </div>

              <button onClick={() => setShowAdv((s) => !s)} className="text-xs font-semibold text-zinc-400 hover:text-white">
                {showAdv ? "▾" : "▸"} Opções avançadas
              </button>
              {showAdv && (
                <div className="space-y-4 rounded-xl border border-white/5 p-4">
                  <div>
                    <div className="flex justify-between text-xs text-zinc-300">
                      <span>Duração</span><span>{mmss(form.duration)}</span>
                    </div>
                    <input type="range" min={30} max={240} step={10} value={form.duration} onChange={(e) => set("duration", Number(e.target.value))} className="w-full" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input className={inputCls} type="number" placeholder="BPM (automático)" value={form.bpm} onChange={(e) => set("bpm", e.target.value)} />
                    <select className={inputCls} value={form.key} onChange={(e) => set("key", e.target.value)}>
                      {KEYS.map((k) => <option key={k} value={k}>{k || "Tom: automático"}</option>)}
                    </select>
                    <select className={inputCls} value={form.lang} onChange={(e) => set("lang", e.target.value)}>
                      <option value="pt">Letra em português</option>
                      <option value="en">Letra em inglês</option>
                      <option value="es">Letra em espanhol</option>
                    </select>
                    <select className={inputCls} value={form.versions} onChange={(e) => set("versions", Number(e.target.value))}>
                      <option value={1}>1 versão</option>
                      <option value={2}>2 versões (usa mais memória)</option>
                    </select>
                  </div>
                </div>
              )}

              <button
                onClick={createSong}
                disabled={busy || !online}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 py-3.5 text-base font-black text-white shadow-lg shadow-pink-500/20 disabled:opacity-40"
              >
                {busy ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />} Criar
              </button>
            </section>

            {/* ---------------- lista de músicas ---------------- */}
            <section className="min-w-0 space-y-3">
              <h2 className="text-sm font-black uppercase tracking-widest text-zinc-400">Minhas músicas ({tracks.length})</h2>

              {job && (
                <div className="flex items-center gap-4 rounded-2xl border border-pink-500/30 bg-pink-500/5 p-4">
                  <Loader2 className="animate-spin text-pink-400" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold">{job.title}</div>
                    <div className="text-xs text-zinc-400">{job.phase}</div>
                  </div>
                  <div className="font-mono text-sm text-pink-300">{mmss(elapsed)}</div>
                </div>
              )}

              {tracks.length === 0 && !job && (
                <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-zinc-500">
                  <Music className="mx-auto mb-3" />
                  Suas músicas aparecem aqui. Preencha a letra e o estilo e clique em Criar.
                </div>
              )}

              {tracks.map((t) => {
                const playing = player?.id === t.id;
                return (
                  <div key={t.id} className={`flex flex-wrap items-center gap-4 rounded-2xl border p-3 ${playing ? "border-pink-500/40 bg-white/5" : "border-white/5 bg-[#111116]"}`}>
                    <button
                      onClick={() => setPlayer({ id: t.id, title: t.title, url: t.file })}
                      className={`relative flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${KIND_COLOR[t.kind] || KIND_COLOR.song}`}
                      title="Ouvir"
                    >
                      {playing ? <Pause className="text-white" /> : <Play className="text-white" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-bold">{t.title}</div>
                      <div className="truncate text-xs text-zinc-400">
                        {KIND[t.kind] || "Faixa"}{t.bpm ? ` • ${Math.round(t.bpm)} BPM` : ""}{t.key ? ` • ${t.key}` : ""}
                      </div>
                      {t.style && <div className="truncate text-[11px] text-zinc-600">{t.style}</div>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={t.file}
                        download={`${t.title}.${String(t.file).split(".").pop()}`}
                        className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/10"
                      >
                        <Download size={14} /> Baixar
                      </a>
                      {(t.kind === "song" || t.kind === "banda") && (
                        <button disabled={busy} onClick={() => separateTrack(t)} className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/10 disabled:opacity-40">
                          <Scissors size={14} /> Separar voz e instrumental
                        </button>
                      )}
                      {(t.kind === "song" || t.kind === "banda" || t.kind === "voz") && t.lyrics && (
                        <button onClick={() => setLegendaFor(t)} className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/10">
                          <FileText size={14} /> Legenda
                        </button>
                      )}
                      {(t.kind === "song" || t.kind === "instrumental") && (
                        <button disabled={busy || !online} onClick={() => setVoiceFor(t)} className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-black hover:bg-zinc-200 disabled:opacity-40">
                          <Mic size={14} /> Cantar por cima
                        </button>
                      )}
                      <button onClick={() => removeTrack(t)} className="rounded-lg p-2 text-zinc-500 hover:text-red-400" title="Excluir">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </section>
          </div>
        )}
      </main>

      {/* player fixo, como no Suno */}
      <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#101015]/95 px-4 py-3 backdrop-blur">
        {player ? (
          <div className="mx-auto flex max-w-5xl items-center gap-4">
            <div className="hidden w-48 truncate text-sm font-bold sm:block">{player.title}</div>
            <audio key={player.url} src={player.url} controls autoPlay className="h-10 w-full" />
          </div>
        ) : (
          <div className="text-center text-xs text-zinc-500">Clique em ▶ numa música para ouvir</div>
        )}
      </footer>

      {legendaFor && <LegendaModal track={legendaFor} tracks={tracks} onClose={() => setLegendaFor(null)} />}
      {voiceFor && <VoiceModal track={voiceFor} onClose={() => setVoiceFor(null)} onGo={(o) => singOver(voiceFor, o)} />}
    </div>
  );
}

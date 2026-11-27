import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, translatePhase } from "./i18n";
import {
  AlertTriangle, Download, FileText, HelpCircle, Loader2, Mic, Music, Pause, Play, Scissors, Sparkles, Trash2, X,
} from "lucide-react";

// ------------------------------------------------------------------ constantes
const TURBO = "acestep-v15-turbo"; // criar músicas (rápido, melhor qualidade)
const BASE_MODEL = "acestep-v15-base"; // criar a banda para a sua voz (tarefa "complete")

const STYLES = [
  // Infantil: energia, balanço e instrumentação explícitos para evitar pop lento genérico.
  { category: "Infantil", label: "Pop infantil dançante", v: "upbeat Brazilian children's dance pop, 132 BPM, bouncy bass, lively drums, bright keyboards, handclaps, playful percussion, joyful theatrical vocals, catchy sing-along chorus" },
  { category: "Infantil", label: "Festa infantil", v: "high-energy children's party music, 138 BPM, punchy dance beat, bouncing bass, bright brass and synth accents, claps, group shouts, playful call-and-response vocals" },
  { category: "Infantil", label: "Marchinha divertida", v: "cheerful Brazilian children's march, 120 BPM, bouncy marching snare, brass section, tuba-like bass, tambourine, playful group vocals, humorous parade atmosphere" },
  { category: "Infantil", label: "Cantiga moderna", v: "modern Brazilian nursery rhyme, 112 BPM, light bouncing rhythm, ukulele, acoustic guitar, glockenspiel, hand percussion, warm playful vocals, simple memorable melody" },
  { category: "Infantil", label: "Desenho animado", v: "playful cartoon soundtrack, 130 BPM, quirky pizzicato strings, bassoon, xylophone, bouncy drums, comic musical accents, expressive character vocals" },
  { category: "Infantil", label: "Pop rock infantil", v: "upbeat children's pop rock, 126 BPM, bright electric guitars, energetic live drums, melodic bass, handclaps, joyful youthful vocals, big catchy chorus" },
  { category: "Infantil", label: "Ukulele alegre", v: "cheerful acoustic children's folk pop, 116 BPM, strummed ukulele, acoustic bass, shaker, tambourine, finger snaps, sweet playful vocals, sunny sing-along melody" },
  { category: "Infantil", label: "Ska infantil", v: "bouncy children's ska pop, 140 BPM, upbeat offbeat guitar skanks, walking bass, lively drums, playful brass stabs, energetic cheerful vocals" },

  // Pop e rock.
  { category: "Pop e Rock", label: "Pop dançante", v: "upbeat contemporary dance pop, 122 BPM, four-on-the-floor kick, punchy snare, groovy bass, bright synthesizers, rhythmic guitars, energetic confident vocals, explosive catchy chorus" },
  { category: "Pop e Rock", label: "Pop rock animado", v: "energetic pop rock, 124 BPM, driving live drums, crunchy electric rhythm guitars, melodic bass guitar, bright hooks, expressive adult lead vocals, powerful sing-along chorus" },
  { category: "Pop e Rock", label: "Pop acústico", v: "upbeat acoustic pop, 108 BPM, strummed steel-string guitar, organic percussion, warm bass, piano accents, lively natural vocals, uplifting melodic chorus" },
  { category: "Pop e Rock", label: "Rock clássico", v: "classic upbeat rock and roll, 128 BPM, electric guitar riffs, live drum kit, walking electric bass, piano accents, energetic raw lead vocals, strong backbeat" },
  { category: "Pop e Rock", label: "Indie pop", v: "bright indie pop, 116 BPM, jangly guitars, melodic bass, crisp drums, shimmering keyboards, layered harmonies, buoyant modern groove" },
  { category: "Pop e Rock", label: "Punk pop", v: "fast melodic pop punk, 164 BPM, distorted power-chord guitars, fast live drums, driving bass, youthful energetic vocals, anthemic shout-along chorus" },
  { category: "Pop e Rock", label: "Hard rock", v: "energetic hard rock, 132 BPM, heavy distorted guitar riffs, powerful acoustic drums, thick bass guitar, strong gritty vocals, dramatic guitar breaks" },

  // Ritmos brasileiros.
  { category: "Brasil", label: "Samba", v: "joyful Brazilian samba, 102 BPM, syncopated surdo, pandeiro, tamborim, cavaquinho, agogo bell, lively bass, swinging expressive vocals" },
  { category: "Brasil", label: "Pagode", v: "upbeat Brazilian pagode, 100 BPM, tantan, pandeiro, repique de mao, cavaquinho, banjo, warm bass, rhythmic group backing vocals, relaxed swinging groove" },
  { category: "Brasil", label: "Samba-enredo", v: "high-energy Brazilian samba-enredo, 146 BPM, powerful bateria percussion, surdo, caixa, tamborim, cuica, brass accents, massed joyful chorus, carnival parade drive" },
  { category: "Brasil", label: "Forró pé de serra", v: "lively traditional Brazilian forro, 132 BPM, accordion lead, zabumba groove, triangle pulse, acoustic bass, playful dance rhythm, warm regional vocals" },
  { category: "Brasil", label: "Forró eletrônico", v: "upbeat modern Brazilian forro, 138 BPM, accordion hooks, electronic drums, strong bass, synth textures, bright rhythmic guitar, energetic romantic vocals" },
  { category: "Brasil", label: "Piseiro", v: "energetic Brazilian piseiro, 150 BPM, punchy electronic kick, syncopated bass, bright keyboard riffs, claps, repetitive dance groove, catchy direct vocals" },
  { category: "Brasil", label: "Sertanejo universitário", v: "upbeat Brazilian sertanejo universitario, 126 BPM, driving acoustic guitar strums, sertanejo rhythm guitar, punchy drums, bass, bright accordion touches, energetic duo vocals" },
  { category: "Brasil", label: "Sertanejo raiz", v: "traditional Brazilian sertanejo raiz, 96 BPM, viola caipira, acoustic guitar, accordion, organic percussion, warm storytelling vocals, countryside feel" },
  { category: "Brasil", label: "Axé", v: "high-energy Brazilian axe music, 138 BPM, swinging bloco percussion, surdo, timbau, electric guitar, bass, brass accents, exuberant vocals, carnival dance groove" },
  { category: "Brasil", label: "MPB animada", v: "upbeat Brazilian MPB, 112 BPM, nylon-string guitar, piano, melodic bass, Brazilian percussion, tasteful strings, expressive sophisticated vocals, flowing groove" },
  { category: "Brasil", label: "Bossa nova", v: "Brazilian bossa nova, 92 BPM, soft syncopated nylon guitar, brushed drums, upright bass, gentle piano, intimate understated vocals, relaxed elegant sway" },
  { category: "Brasil", label: "Funk carioca", v: "upbeat Brazilian funk carioca, 130 BPM, hard tamborzao beat, deep sub bass, syncopated percussion, sharp synth stabs, rhythmic vocal delivery, high-energy baile groove" },

  // Urbano e grooves.
  { category: "Urbano", label: "Hip-hop", v: "groovy hip hop, 92 BPM, punchy boom bap drums, deep bass, sampled soul keys, rhythmic rap vocals, confident laid-back flow" },
  { category: "Urbano", label: "Trap", v: "modern melodic trap, 140 BPM half-time feel, deep 808 bass, crisp hi-hat rolls, punchy kick and snare, atmospheric synths, melodic rap vocals" },
  { category: "Urbano", label: "R&B", v: "smooth contemporary R&B, 88 BPM, deep rounded bass, laid-back syncopated drums, electric piano, warm synth pads, soulful expressive vocals, rich harmonies" },
  { category: "Urbano", label: "Soul", v: "uplifting classic soul, 110 BPM, live drums, warm bass, Hammond organ, rhythmic guitar, brass section, powerful soulful vocals, rich backing harmonies" },
  { category: "Urbano", label: "Reggae", v: "positive roots reggae, 76 BPM, relaxed one-drop drums, deep melodic bass, offbeat skank guitar, organ bubbles, warm laid-back vocals" },
  { category: "Urbano", label: "Ska", v: "upbeat ska, 148 BPM, fast offbeat guitar and piano, walking bass, lively drums, bright brass section, energetic vocals, danceable bounce" },

  // Romântico e emocional (com variação real de andamento).
  { category: "Romântico", label: "Balada pop", v: "emotional pop ballad, 76 BPM, expressive piano, warm strings, gentle drums building into a powerful chorus, intimate adult lead vocals" },
  { category: "Romântico", label: "Balada rock", v: "dramatic rock ballad, 78 BPM, piano intro, sustained electric guitars, live drums building gradually, melodic bass, emotional powerful vocals, soaring chorus" },
  { category: "Romântico", label: "Romântico acústico", v: "intimate acoustic love song, 84 BPM, fingerpicked acoustic guitar, soft piano, subtle strings, warm bass, tender close-miked vocals" },
  { category: "Romântico", label: "Bolero", v: "classic Latin bolero, 72 BPM, nylon guitar, soft strings, gentle Latin percussion, warm bass, expressive romantic crooning vocals" },
  { category: "Romântico", label: "Bachata", v: "romantic Dominican bachata, 126 BPM, bright requinto guitar, syncopated bachata rhythm guitar, bongos, guira, melodic bass, expressive vocals" },

  // Dança e festa.
  { category: "Dança", label: "Disco", v: "joyful disco dance music, 120 BPM, four-on-the-floor drums, funky octave bass, rhythmic strings, wah guitar, bright brass, joyful vocals, uplifting dancefloor energy" },
  { category: "Dança", label: "Funk / groove", v: "upbeat funk groove, 108 BPM, syncopated electric bass, tight live drums, wah guitar, clavinet, brass stabs, soulful rhythmic vocals" },
  { category: "Dança", label: "House", v: "uplifting house music, 124 BPM, steady four-on-the-floor kick, deep pulsing bass, bright piano chords, crisp claps, uplifting synths, energetic dance groove" },
  { category: "Dança", label: "EDM festival", v: "energetic festival EDM, 128 BPM, powerful electronic kick, sidechain synth bass, bright supersaw leads, risers, big melodic drop, euphoric vocals" },
  { category: "Dança", label: "Salsa", v: "energetic salsa, 184 BPM, piano montuno, congas, timbales, cowbell, tumbao bass, bright brass section, lively call-and-response vocals" },
  { category: "Dança", label: "Cumbia", v: "joyful Latin cumbia, 96 BPM, syncopated percussion, guiro, congas, melodic bass, bright accordion or keyboard hooks, festive vocals" },
  { category: "Dança", label: "Merengue", v: "fast joyful merengue, 128 BPM, tambora, guira, lively bass, bright accordion and brass, energetic dance vocals" },

  // Internacional e tradicional.
  { category: "Internacional", label: "Country", v: "upbeat modern country, 116 BPM, acoustic guitar, banjo, fiddle, pedal steel accents, steady drums, warm bass, lively storytelling vocals" },
  { category: "Internacional", label: "Blues", v: "upbeat blues shuffle, 112 BPM, electric blues guitar, walking bass, shuffle drums, piano fills, expressive gritty vocals" },
  { category: "Internacional", label: "Jazz swing", v: "joyful swing jazz, 150 BPM, walking upright bass, swinging brushed drums, piano, saxophone, trumpet, playful melodic vocals" },
  { category: "Internacional", label: "Flamenco pop", v: "energetic flamenco pop, 118 BPM, Spanish nylon guitar, palmas handclaps, cajon, melodic bass, passionate vocals, rhythmic guitar flourishes" },
  { category: "Internacional", label: "Afrobeat", v: "upbeat contemporary afrobeat, 108 BPM, syncopated polyrhythmic percussion, deep bass, bright guitar patterns, warm keyboards, melodic rhythmic vocals" },

  // Instrumental e trilhas.
  { category: "Instrumental", label: "Orquestral épico", v: "cinematic orchestral instrumental, 100 BPM, sweeping strings, bold brass, deep timpani, dynamic percussion, dramatic melodic development, no vocals" },
  { category: "Instrumental", label: "Piano emocional", v: "emotional solo piano instrumental, 72 BPM, expressive piano melody, delicate dynamics, intimate cinematic atmosphere, no vocals" },
  { category: "Instrumental", label: "Lo-fi chill", v: "laid-back lo-fi hip hop instrumental, 82 BPM, dusty drums, mellow electric piano, warm bass, vinyl texture, relaxed groove, no vocals" },
  { category: "Instrumental", label: "Synthwave", v: "retro synthwave instrumental, 105 BPM, analog synthesizers, pulsing arpeggios, gated drums, deep synth bass, nostalgic cinematic atmosphere, no vocals" },
  { category: "Instrumental", label: "Trilha de aventura", v: "playful adventure soundtrack, 124 BPM, orchestral pizzicato strings, bright woodwinds, rhythmic percussion, brass flourishes, uplifting energetic theme, no vocals" },
];

const STYLE_CATEGORIES = ["Infantil", "Pop e Rock", "Brasil", "Urbano", "Romântico", "Dança", "Internacional", "Instrumental"];

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
  const { t } = useLocale();
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
  const [captionStartedAt, setCaptionStartedAt] = useState(0);
  const [captionTick, setCaptionTick] = useState(0);
  const [res, setRes] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => { http("/api/legenda/status").then((s) => setWhisper(!!s.whisper)).catch(() => {}); }, []);
  useEffect(() => { if (!ocupado) return undefined; const timer = window.setInterval(() => setCaptionTick((n) => n + 1), 1000); return () => window.clearInterval(timer); }, [ocupado]);

  const gerar = async () => {
    setRes(null);
    setMsg("");
    if (!letra.trim()) { setMsg("A letra está vazia."); return; }
    if (modo === "whisper" && !whisper) { setMsg("O Whisper não está instalado. Rode o instalar.bat de novo (ele instala o Whisper) e abra o programa outra vez."); return; }
    setCaptionStartedAt(Date.now());
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
        {ocupado && captionStartedAt > 0 && <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-2 text-xs text-sky-200">{t("elapsed")}: <span className="font-mono">{mmss(Math.floor((Date.now() - captionStartedAt) / 1000))}</span></div>}
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


// Analisa uma amostra curta no próprio navegador. O áudio bruto não é enviado à IA.
async function analyzeMelodyReference(file) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) throw new Error("Este navegador não oferece análise de áudio compatível.");
  const context = new AudioCtx();
  try {
    const buffer = await context.decodeAudioData(await file.arrayBuffer());
    const rate = buffer.sampleRate;
    const seconds = Math.min(buffer.duration, 30);
    const length = Math.floor(seconds * rate);
    const channels = Math.min(buffer.numberOfChannels, 2);
    const mono = new Float32Array(length);
    for (let ch = 0; ch < channels; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < length; i++) mono[i] += (data[i] || 0) / channels;
    }

    // Envelope de energia em janelas de 20 ms: útil para estimar pulsação, não é um metrônomo.
    const windowSize = Math.max(1, Math.floor(rate * 0.02));
    const envelope = [];
    for (let i = 0; i + windowSize <= mono.length; i += windowSize) {
      let sum = 0;
      for (let j = 0; j < windowSize; j++) sum += mono[i + j] * mono[i + j];
      envelope.push(Math.sqrt(sum / windowSize));
    }
    const onset = envelope.map((v, i) => Math.max(0, v - (envelope[i - 1] || 0)));
    const envRate = 50;
    let bestTempo = null, bestScore = 0;
    for (let lag = 17; lag <= 50; lag++) {
      let score = 0, normA = 0, normB = 0;
      for (let i = lag; i < onset.length; i++) {
        score += onset[i] * onset[i - lag];
        normA += onset[i] * onset[i];
        normB += onset[i - lag] * onset[i - lag];
      }
      const normalized = score / (Math.sqrt(normA * normB) + 1e-9);
      if (normalized > bestScore) { bestScore = normalized; bestTempo = Math.round(60 * envRate / lag); }
    }

    // Estimativa grosseira de contorno de altura; funciona melhor com voz cantarolada ou instrumento solo.
    const decimation = Math.max(1, Math.floor(rate / 11025));
    const pitchRate = rate / decimation;
    const frameSize = 4096;
    const hop = Math.floor(pitchRate * 0.45);
    const pitches = [];
    for (let start = 0; start + frameSize * decimation < length; start += hop * decimation) {
      const frame = new Float32Array(frameSize);
      let mean = 0;
      for (let j = 0; j < frameSize; j++) {
        frame[j] = mono[start + j * decimation] || 0;
        mean += frame[j];
      }
      mean /= frameSize;
      let energy = 0;
      for (let j = 0; j < frameSize; j++) { frame[j] -= mean; energy += frame[j] * frame[j]; }
      if (energy / frameSize < 0.000015) continue;
      const minLag = Math.max(2, Math.floor(pitchRate / 700));
      const maxLag = Math.min(Math.floor(pitchRate / 70), Math.floor(frameSize / 2));
      let bestLag = 0, best = 0;
      for (let lag = minLag; lag <= maxLag; lag++) {
        let corr = 0, a = 0, b = 0;
        for (let j = 0; j < frameSize - lag; j++) {
          const x = frame[j], y = frame[j + lag];
          corr += x * y; a += x * x; b += y * y;
        }
        const normalized = corr / (Math.sqrt(a * b) + 1e-9);
        if (normalized > best) { best = normalized; bestLag = lag; }
      }
      if (bestLag && best > 0.28) pitches.push(69 + 12 * Math.log2((pitchRate / bestLag) / 440));
    }
    const median = (values) => {
      const sorted = [...values].sort((a, b) => a - b);
      return sorted.length ? sorted[Math.floor(sorted.length / 2)] : null;
    };
    let contour = "não foi possível estimar com confiança";
    let range = "";
    if (pitches.length >= 4) {
      const center = median(pitches);
      const steps = pitches.map((p) => p - center);
      const groups = steps.map((v) => v < -2 ? "grave" : v > 2 ? "agudo" : "médio");
      const compact = [];
      for (const group of groups) if (compact[compact.length - 1] !== group) compact.push(group);
      contour = compact.slice(0, 12).join(" → ");
      range = `variação aproximada de ${Math.round(Math.max(...pitches) - Math.min(...pitches))} semitons`;
    }
    const avg = envelope.reduce((a, b) => a + b, 0) / Math.max(1, envelope.length);
    const variance = envelope.reduce((a, b) => a + (b - avg) ** 2, 0) / Math.max(1, envelope.length);
    const dynamics = Math.sqrt(variance) > avg * 0.55 ? "dinâmica variada, com mudanças de intensidade" : "dinâmica relativamente constante";
    // Segmentação aproximada por energia: identifica blocos cantados e pausas entre frases.
    const activeThreshold = Math.max(0.006, avg * 0.32);
    const active = envelope.map((v) => v > activeThreshold);
    const phraseDurations = [];
    let phraseStart = -1, lastActive = -1;
    for (let i = 0; i < active.length; i++) {
      if (active[i]) { if (phraseStart < 0) phraseStart = i; lastActive = i; }
      else if (phraseStart >= 0 && i - lastActive >= 18) {
        const d = (lastActive - phraseStart + 1) * 0.02;
        if (d >= 0.18) phraseDurations.push(d);
        phraseStart = -1; lastActive = -1;
      }
    }
    if (phraseStart >= 0) { const d = (lastActive - phraseStart + 1) * 0.02; if (d >= 0.18) phraseDurations.push(d); }
    const phraseText = phraseDurations.length
      ? "frases vocais aproximadas: " + phraseDurations.length + ", duração média " + (phraseDurations.reduce((a,b)=>a+b,0)/phraseDurations.length).toFixed(1) + " s, pausas detectadas: " + Math.max(0, phraseDurations.length - 1)
      : "não foi possível separar frases e pausas com confiança";
    const tempoText = bestTempo && bestScore > 0.12 ? `pulso estimado em torno de ${bestTempo} BPM (estimativa automática)` : "pulso não identificado com confiança";
    const summary = [
      `Duração analisada: ${seconds.toFixed(1)} segundos.`,
      tempoText + ".",
      phraseText + ".",
      `Dinâmica: ${dynamics}.`,
      `Contorno de altura aproximado: ${contour}.`,
      range ? `Tessitura estimada: ${range}.` : "",
      "Todas as medidas são aproximadas; use como orientação de fraseado, não como transcrição exata de notas."
    ].filter(Boolean).join(" ");
    return { summary, seconds, tempo: bestTempo && bestScore > 0.12 ? bestTempo : null, contour };
  } finally {
    await context.close().catch(() => {});
  }
}

function CompositorPanel({ onUseLyrics }) {
  const { t } = useLocale();
  const [catalog, setCatalog] = useState({ runtimes: [], models: [], installed_models: [] });
  const [status, setStatus] = useState({});
  const [providerConfig, setProviderConfig] = useState({ providers: [], secure_storage_available: false });
  const [provider, setProvider] = useState("local");
  const [providerModel, setProviderModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [providerBusy, setProviderBusy] = useState(false);
  const [providerStartedAt, setProviderStartedAt] = useState(0);
  const [runtime, setRuntime] = useState("");
  const [model, setModel] = useState("qwen3-4b-q4km");
  const [gemmaAccepted, setGemmaAccepted] = useState(false);
  const [gpuLayers, setGpuLayers] = useState(0);
  const [compositionMode, setCompositionMode] = useState("full");
  const [sourceLyrics, setSourceLyrics] = useState("");
  const [melodyFile, setMelodyFile] = useState(null);
  const [melodyAnalysis, setMelodyAnalysis] = useState(null);
  const [melodyRole, setMelodyRole] = useState("missing");
  const [melodyWords, setMelodyWords] = useState("");
  const [melodyBusy, setMelodyBusy] = useState(false);
  const [melodyStartedAt, setMelodyStartedAt] = useState(0);
  const [transcriptionBusy, setTranscriptionBusy] = useState(false);
  const [transcriptionStartedAt, setTranscriptionStartedAt] = useState(0);
  const [transcriptionModel, setTranscriptionModel] = useState("small");
  const [transcriptionMessage, setTranscriptionMessage] = useState("");
  const [recording, setRecording] = useState(false);
  const melodyInputRef = useRef(null);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  const [theme, setTheme] = useState("");
  const [genre, setGenre] = useState("MPB");
  const [mood, setMood] = useState("emocionante e acolhedor");
  const [voice, setVoice] = useState("indiferente");
  const [duration, setDuration] = useState(120);
  const [language, setLanguage] = useState("português do Brasil");
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);
  const [busySince, setBusySince] = useState(0);
  const [timerTick, setTimerTick] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { if (!busy && !melodyBusy && !transcriptionBusy && !providerBusy) return undefined; const timer = window.setInterval(() => setTimerTick((n) => n + 1), 1000); return () => window.clearInterval(timer); }, [busy, melodyBusy, transcriptionBusy, providerBusy]);

  useEffect(() => () => {
    if (recordingTimerRef.current) window.clearTimeout(recordingTimerRef.current);
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.onstop = null;
      recorderRef.current.stop();
    }
    if (streamRef.current) streamRef.current.getTracks().forEach((track) => track.stop());
  }, []);

  const refresh = useCallback(async () => {
    const [c, s, p] = await Promise.all([http("/api/ai/catalog"), http("/api/ai/status"), http("/api/ai/providers/config")]);
    setCatalog(c);
    setStatus(s);
    setProviderConfig(p);
    setProvider((old) => old === "local" ? p.selected_provider : old);
    setProviderModel((old) => old || p.selected_model || p.providers.find((x) => x.id === p.selected_provider)?.models?.[0] || "");
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

  const saveProviderKey = async () => {
    if (!provider || provider === "local" || !apiKey.trim()) { setError("Escolha um provedor e informe a chave de API."); return; }
    setProviderStartedAt(Date.now()); setProviderBusy(true); setError(""); setMessage("Salvando a chave no cofre seguro do sistema…");
    try {
      await jsonPost("/api/ai/providers/key", { provider, api_key: apiKey.trim() });
      setApiKey(""); await refresh(); setMessage("Chave salva no cofre de credenciais do sistema.");
    } catch (e) { setError(e.message); }
    finally { setProviderBusy(false); }
  };
  const saveProviderChoice = async () => {
    setProviderBusy(true); setError("");
    try {
      await http("/api/ai/providers/config", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider, model: providerModel }) });
      await refresh(); setMessage(provider === "local" ? "IA local selecionada." : "Provedor e modelo selecionados.");
    } catch (e) { setError(e.message); }
    finally { setProviderBusy(false); }
  };
  const testProvider = async () => {
    setProviderBusy(true); setError(""); setMessage("Testando conexão com o provedor…");
    try {
      const r = await jsonPost("/api/ai/providers/test", { provider, model: providerModel });
      setMessage("Conexão funcionando: " + r.message);
    } catch (e) { setError(e.message); }
    finally { setProviderBusy(false); }
  };
  const removeProviderKey = async () => {
    if (!window.confirm("Remover a chave salva deste provedor?")) return;
    setProviderBusy(true); setError("");
    try { await http("/api/ai/providers/key/" + provider, { method: "DELETE" }); await refresh(); setMessage("Chave removida do cofre de credenciais."); }
    catch (e) { setError(e.message); }
    finally { setProviderBusy(false); }
  };

  const installRuntime = async () => {
    setBusySince(Date.now()); setBusy(true); setError(""); setMessage("Preparando o motor local…");
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
      const r = await jsonPost("/api/ai/models/download", { model_id: model, accept_license: gemmaAccepted });
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

  const loadMelodyReference = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("audio/")) { setError("Escolha um arquivo de áudio."); return; }
    if (file.size > 25 * 1024 * 1024) { setError("O arquivo deve ter no máximo 25 MB."); return; }
    setMelodyStartedAt(Date.now()); setMelodyBusy(true); setError(""); setMessage("Analisando a referência musical no navegador…");
    try {
      const analysis = await analyzeMelodyReference(file);
      setMelodyFile(file);
      setMelodyAnalysis(analysis);
      setMessage("Referência analisada. Somente o resumo musical será enviado ao modelo local.");
    } catch (e) {
      setMelodyFile(null); setMelodyAnalysis(null);
      setError("Não consegui analisar este áudio. Tente WAV, MP3 ou M4A em outro navegador. " + e.message);
    } finally { setMelodyBusy(false); }
  };

  const startMelodyRecording = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error("Gravação não suportada neste navegador.");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      recordedChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => { if (event.data?.size) recordedChunksRef.current.push(event.data); };
      recorder.onstop = () => {
        const type = recorder.mimeType || "audio/webm";
        const file = new File(recordedChunksRef.current, "melodia-gravada.webm", { type });
        if (recordingTimerRef.current) window.clearTimeout(recordingTimerRef.current);
        recordingTimerRef.current = null;
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setRecording(false);
        if (file.size) loadMelodyReference(file);
      };
      recorder.start();
      recordingTimerRef.current = window.setTimeout(() => {
        if (recorderRef.current && recorderRef.current.state === "recording") recorderRef.current.stop();
      }, 30000);
      setRecording(true); setError(""); setMessage("Gravando… cante a ideia musical e depois pressione Parar.");
    } catch (e) {
      if (streamRef.current) streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null; setRecording(false);
      setError(e.message || "Não foi possível acessar o microfone.");
    }
  };

  const stopMelodyRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
  };

  const transcribeMelodyReference = async () => {
    if (!melodyFile) { setError("Grave ou importe uma referência de áudio primeiro."); return; }
    setTranscriptionStartedAt(Date.now()); setTranscriptionBusy(true); setTranscriptionMessage("Preparando o áudio para o Whisper…"); setError("");
    try {
      const { blob } = await toWavBlob(melodyFile, 30);
      const fd = new FormData();
      fd.append("audio", blob, "referencia.wav");
      fd.append("modelo", transcriptionModel);
      const whisperLanguage = language.startsWith("inglês") ? "en" : language.startsWith("espanhol") ? "es" : "pt";
      fd.append("idioma", whisperLanguage);
      const started = await http("/api/legenda/transcrever", { method: "POST", body: fd });
      if (!started.job) throw new Error("O Whisper não iniciou a transcrição.");
      for (;;) {
        await sleep(1200);
        const job = await http("/api/legenda/transcrever/" + started.job);
        setTranscriptionMessage(job.msg || "Ouvindo sua gravação…");
        if (job.status === "erro") throw new Error(job.msg || "Não foi possível transcrever o áudio.");
        if (job.status === "pronto") {
          if (!job.transcript?.trim()) throw new Error("O Whisper não identificou palavras. Se você apenas cantarolou, pode deixar o campo de palavras vazio.");
          setMelodyWords(job.transcript.trim());
          setTranscriptionMessage("Letra reconhecida. Revise o texto antes de compor.");
          return;
        }
      }
    } catch (e) {
      setError("Não consegui transcrever a gravação: " + String(e.message || e).slice(0, 260));
      setTranscriptionMessage("");
    } finally { setTranscriptionBusy(false); }
  };

  const clearMelodyReference = () => {
    setMelodyFile(null); setMelodyAnalysis(null);
    if (melodyInputRef.current) melodyInputRef.current.value = "";
  };

  const generate = async () => {
    if (compositionMode !== "full" && !sourceLyrics.trim()) { setError("Cole sua composição antes de continuar ou criar o refrão."); return; }
    if (compositionMode === "full" && !theme.trim()) { setError("Informe o tema ou a história da música."); return; }
    setBusy(true); setError(""); setMessage(provider === "local" ? "Compondo a letra localmente…" : "Enviando solicitação ao provedor escolhido…"); setResult("");
    try {
      const r = await jsonPost("/api/ai/generate-lyrics", { mode: compositionMode, provider, provider_model: providerModel, source_lyrics: sourceLyrics, theme, genre, mood, voice, duration, language, melody_reference: melodyAnalysis?.summary || "", melody_role: melodyRole, melody_words: melodyWords });
      setResult(r.lyrics);
      const labels = { full: "Música completa criada", continue: "Composição continuada", chorus: "Refrão criado" };
      setMessage((labels[compositionMode] || "Composição concluída") + " com " + r.model + ".");
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
        <h1 className="text-2xl font-black">{t("composerTitle")}</h1>
        <p className="mt-1 text-sm text-zinc-400">{t("composerIntro")}</p>
      </div>

      {busy && busySince > 0 && <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 px-3 py-2 text-xs text-sky-200">{t("operationElapsed")}: <span className="font-mono">{mmss(Math.floor((Date.now() - busySince) / 1000))}</span></div>}

      {providerBusy && providerStartedAt > 0 && <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 px-3 py-2 text-xs text-violet-200">{t("providerElapsed")}: <span className="font-mono">{mmss(Math.floor((Date.now() - providerStartedAt) / 1000))}</span></div>}

      {(error || message) && (
        <div className={error ? "rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200" : "rounded-xl border border-sky-500/20 bg-sky-500/5 p-3 text-sm text-sky-200"}>
          {error || message}
          {busy && busySince > 0 && <div className="mt-2 font-mono text-xs opacity-80">{t("elapsed")}: {mmss(Math.floor((Date.now() - busySince) / 1000))}</div>}
        </div>
      )}

      <section className="rounded-2xl border border-white/5 bg-[#111116] p-5 space-y-4">
        <div><h2 className="font-bold">{t("aiModeTitle")}</h2><p className="mt-1 text-xs text-zinc-400">{t("aiModeHelp")}</p></div>
        <label className="block text-xs font-semibold text-zinc-300">{t("aiModeLabel")}
          <select className={inputCls + " mt-1"} value={provider} onChange={(e) => { setProvider(e.target.value); const p = providerConfig.providers.find((x) => x.id === e.target.value); setProviderModel(p?.models?.[0] || ""); }}>
            <option value="local">Local — Gemma / Qwen</option>
            {providerConfig.providers.map((p) => <option key={p.id} value={p.id}>{p.name} {p.configured ? "— chave cadastrada" : "— configurar chave"}</option>)}
          </select>
        </label>
        {provider !== "local" && <>
          <label className="block text-xs font-semibold text-zinc-300">Modelo (ID do provedor)
            <input className={inputCls + " mt-1"} value={providerModel} onChange={(e) => setProviderModel(e.target.value)} list="provider-model-options" placeholder="Informe o identificador do modelo"/>
            <datalist id="provider-model-options">{(providerConfig.providers.find((p) => p.id === provider)?.models || []).map((m) => <option key={m} value={m}/>)}</datalist>
          </label>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-3">
            <p className="text-xs text-zinc-300">{providerConfig.providers.find((p) => p.id === provider)?.configured ? "Uma chave já está cadastrada para este provedor." : "Cadastre sua chave de API para habilitar este provedor."}</p>
            <input type="password" autoComplete="new-password" className={inputCls} value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Cole sua chave de API aqui"/>
            <div className="flex flex-wrap gap-2">
              <button disabled={providerBusy || !apiKey.trim() || !providerConfig.secure_storage_available} onClick={saveProviderKey} className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-black disabled:opacity-40">Salvar chave com segurança</button>
              <button disabled={providerBusy || !providerConfig.providers.find((p) => p.id === provider)?.configured} onClick={removeProviderKey} className="rounded-lg border border-white/15 px-3 py-2 text-xs">Remover chave</button>
            </div>
            {!providerConfig.secure_storage_available && <p className="text-xs text-amber-200">O cofre seguro de credenciais do sistema não está disponível. A chave não será salva em arquivo de texto.</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <button disabled={providerBusy || !providerModel} onClick={saveProviderChoice} className="rounded-lg bg-pink-500 px-3 py-2 text-xs font-bold text-white">Usar este provedor</button>
            <button disabled={providerBusy || !providerConfig.providers.find((p) => p.id === provider)?.configured || !providerModel} onClick={testProvider} className="rounded-lg border border-white/15 px-3 py-2 text-xs">Testar conexão</button>
          </div>
          <p className="text-[11px] text-zinc-500">A chave é guardada no cofre de credenciais do Windows/macOS/Linux, não no código, no GitHub ou no arquivo de configurações. Confira limites, créditos e preços com o provedor.</p>
        </>}
      </section>

      <section className="rounded-2xl border border-white/5 bg-[#111116] p-5 space-y-4">
        <h2 className="font-bold">{t("localEngineTitle")}</h2>
        {compatibleRuntimes.length ? (
          <>
            <label className="block text-xs font-semibold text-zinc-300">{t("localEngineHelp")}</label>
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
        <h2 className="font-bold">{t("localModelTitle")}</h2>
        <label className="block text-xs font-semibold text-zinc-300">{t("modelCatalog")}</label>
        <select className={inputCls} value={model} onChange={(e) => setModel(e.target.value)}>
          {catalog.models.map((m) => <option key={m.id} value={m.id}>{m.name} {m.installed ? "— instalado" : "— aprox. " + m.approx_size_gb + " GB"}</option>)}
          {catalog.installed_models.filter((m) => !catalog.models.some((c) => c.id === m.id)).map((m) => <option key={m.id} value={m.id}>{m.name} — importado</option>)}
        </select>
        {selectedModel && <div className="rounded-xl bg-white/[0.03] p-3 text-xs text-zinc-400">
          <p>{selectedModel.description}</p>
          <p className="mt-2">Licença: <b className="text-zinc-200">{selectedModel.license}</b> · <a className="underline" href={selectedModel.license_url} target="_blank" rel="noreferrer">ver licença</a> · <a className="underline" href={selectedModel.model_url} target="_blank" rel="noreferrer">origem oficial</a></p>
        </div>}
        {selectedModel?.requires_license_acceptance && (
          <label className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-100">
            <input type="checkbox" checked={gemmaAccepted} onChange={(e) => setGemmaAccepted(e.target.checked)} className="mt-0.5" />
            <span>Li e aceito os <a className="underline font-bold" href={selectedModel.license_url} target="_blank" rel="noreferrer">Gemma Terms of Use</a>. Entendo que o Gemma possui condições próprias de uso.</span>
          </label>
        )}
        <div className="flex flex-wrap gap-2">
          <button disabled={busy || installedSelected || !selectedModel || (selectedModel.requires_license_acceptance && !gemmaAccepted)} onClick={downloadModel} className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-bold disabled:opacity-40">{installedSelected ? "Modelo instalado" : "Baixar modelo"}</button>
          <label className="cursor-pointer rounded-xl border border-white/15 px-4 py-2.5 text-sm font-bold hover:bg-white/5">
            Importar GGUF
            <input type="file" accept=".gguf" className="hidden" disabled={busy} onChange={(e) => { importModel(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
          <button disabled={busy || !runtimeInstalled || !installedSelected} onClick={activate} className="rounded-xl bg-pink-500 px-4 py-2.5 text-sm font-black text-white disabled:opacity-40">Ativar modelo</button>
          {status.runtime_running && <button disabled={busy} onClick={async () => { setBusy(true); try { await http("/api/ai/runtime/stop", { method: "POST" }); await refresh(); setMessage("Motor encerrado."); } catch (e) { setError(e.message); } finally { setBusy(false); } }} className="rounded-xl border border-white/15 px-4 py-2.5 text-sm">Desligar IA</button>}
        </div>
        <p className="text-xs text-zinc-500">Você também pode importar outros GGUF. A licença de arquivos importados não é verificada automaticamente.</p>
      </section>

      <section className="rounded-2xl border border-white/5 bg-[#111116] p-5 space-y-4">
        <div><h2 className="font-bold">{t("composerStepTitle")}</h2><p className="mt-1 text-xs text-zinc-400">{t("composerStepHelp")}</p></div>
        <div className="grid gap-2 sm:grid-cols-3">
          {[{id:"full",title:t("modeFull"),desc:t("modeFullDesc")},{id:"continue",title:t("modeContinue"),desc:t("modeContinueDesc")},{id:"chorus",title:t("modeChorus"),desc:t("modeChorusDesc")}].map((item)=>(
            <button key={item.id} type="button" onClick={()=>{setCompositionMode(item.id);setResult("");setError("");}}
              className={`rounded-xl border p-3 text-left transition ${compositionMode===item.id?"border-pink-500 bg-pink-500/10":"border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"}`}>
              <span className="block text-sm font-bold text-white">{item.title}</span><span className="mt-1 block text-[11px] leading-relaxed text-zinc-400">{item.desc}</span>
            </button>
          ))}
        </div>
        {compositionMode!=="full"&&<div>
          <label className="mb-1.5 block text-xs font-semibold text-zinc-300">{compositionMode==="continue"?t("modeContinueLabel"):t("modeChorusLabel")}</label>
          <textarea rows={9} className={inputCls} value={sourceLyrics} onChange={(e)=>setSourceLyrics(e.target.value)} placeholder={"Cole aqui sua letra. Você pode incluir marcações como [Verse 1] e [Bridge]."}/>
          <p className="mt-1 text-[11px] text-zinc-500">{compositionMode==="continue"?"A IA deve preservar seus versos e completar as partes que faltam, sem reescrever sua identidade.":"A IA analisará o tema, a mensagem e o sentimento da letra para criar apenas o refrão."}</p>
        </div>}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
          <div>
            <p className="text-sm font-bold text-white">{t("melodyRefTitle")}</p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">Cante sua ideia, mesmo com palavras incompletas, sílabas inventadas ou apenas cantarolando. A ferramenta estima fraseado e movimento melódico para ajudar a encaixar a letra.</p>
          </div>
          <label className="block text-xs font-semibold text-zinc-300">O trecho gravado representa:
            <select className={inputCls + " mt-1"} value={melodyRole} onChange={(e) => setMelodyRole(e.target.value)}>
              <option value="missing">{t("melodyMissing")}</option>
              <option value="existing">{t("melodyExisting")}</option>
            </select>
          </label>
          <label className="block text-xs font-semibold text-zinc-300">{t("melodyWords")}
            <textarea rows={3} className={inputCls + " mt-1"} value={melodyWords} onChange={(e) => setMelodyWords(e.target.value)} placeholder="A letra reconhecida aparecerá aqui. Você também pode corrigir ou escrever manualmente."/>
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-[11px] text-zinc-400">Modelo Whisper
              <select className={inputCls + " mt-1"} value={transcriptionModel} onChange={(e) => setTranscriptionModel(e.target.value)} disabled={transcriptionBusy}>
                <option value="base">Base — mais leve</option>
                <option value="small">Small — maior precisão</option>
              </select>
            </label>
            <button type="button" disabled={!melodyFile || melodyBusy || transcriptionBusy || recording} onClick={transcribeMelodyReference} className="self-end rounded-lg bg-pink-500/15 border border-pink-500/40 px-3 py-2 text-xs font-semibold text-pink-100 disabled:opacity-40">
              {transcriptionBusy ? <><Loader2 size={14} className="inline animate-spin mr-1"/> {t("transcribing")} <span className="font-mono">{mmss(Math.floor((Date.now() - transcriptionStartedAt) / 1000))}</span></> : "Transcrever letra do áudio"}
            </button>
          </div>
          {transcriptionMessage && <p className="text-[11px] text-sky-200">{transcriptionMessage}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={melodyBusy || recording} onClick={() => melodyInputRef.current?.click()} className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-zinc-200 disabled:opacity-40">Importar áudio</button>
            {!recording ? (
              <button type="button" disabled={melodyBusy} onClick={startMelodyRecording} className="inline-flex items-center gap-2 rounded-lg border border-pink-500/40 px-3 py-2 text-xs font-semibold text-pink-200 disabled:opacity-40"><Mic size={14}/> Gravar melodia</button>
            ) : (
              <button type="button" onClick={stopMelodyRecording} className="inline-flex items-center gap-2 rounded-lg bg-red-500/15 px-3 py-2 text-xs font-semibold text-red-200"><Pause size={14}/> Parar gravação</button>
            )}
            {melodyFile && <button type="button" onClick={clearMelodyReference} className="rounded-lg border border-white/15 px-3 py-2 text-xs text-zinc-300">Remover referência</button>}
            <input ref={melodyInputRef} type="file" accept="audio/*" className="hidden" onChange={(e)=>loadMelodyReference(e.target.files?.[0])}/>
          </div>
          {melodyBusy && <div className="flex items-center gap-2 text-xs text-zinc-300"><Loader2 size={14} className="animate-spin"/> {t("analyzingMelody")} <span className="font-mono">{mmss(Math.floor((Date.now() - melodyStartedAt) / 1000))}</span></div>}
          {melodyAnalysis && <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
            <p className="text-xs font-semibold text-emerald-200">Referência pronta: {melodyFile?.name || "gravação"}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-zinc-300">{melodyAnalysis.summary}</p>
          </div>}
          <p className="text-[11px] text-zinc-500">Privacidade: a análise melódica continua no navegador. Se você solicitar a transcrição, o áudio será processado somente pelo Whisper instalado neste computador (CPU), sem serviço externo, e será apagado após o processamento. O Whisper pode errar palavras cantadas ou não reconhecer sílabas inventadas; revise a letra. A transcrição não cria legendas nem timestamps.</p>
        </div>
        <div><label className="mb-1.5 block text-xs font-semibold text-zinc-300">{compositionMode==="full"?"Tema ou história":"Orientação adicional (opcional)"}</label>
          <textarea rows={2} className={inputCls} value={theme} onChange={(e)=>setTheme(e.target.value)} placeholder={compositionMode==="full"?"Ex.: um pai ensinando o filho a pescar e lembrando da própria infância":"Ex.: deixe o refrão mais emocionante, simples e fácil de memorizar"}/>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-zinc-300">{t("genre")}<input className={inputCls+" mt-1"} value={genre} onChange={(e)=>setGenre(e.target.value)}/></label>
          <label className="text-xs font-semibold text-zinc-300">{t("mood")}<input className={inputCls+" mt-1"} value={mood} onChange={(e)=>setMood(e.target.value)}/></label>
          <label className="text-xs font-semibold text-zinc-300">Voz<select className={inputCls+" mt-1"} value={voice} onChange={(e)=>setVoice(e.target.value)}><option>indiferente</option><option>masculina</option><option>feminina</option><option>dueto</option></select></label>
          <label className="text-xs font-semibold text-zinc-300">Idioma<select className={inputCls+" mt-1"} value={language} onChange={(e)=>setLanguage(e.target.value)}><option>português do Brasil</option><option>inglês</option><option>espanhol</option></select></label>
          {compositionMode!=="chorus"&&<label className="text-xs font-semibold text-zinc-300">{t("approximateDuration")}<select className={inputCls+" mt-1"} value={duration} onChange={(e)=>setDuration(Number(e.target.value))}><option value={60}>1 minuto</option><option value={90}>1 minuto e meio</option><option value={120}>2 minutos</option><option value={150}>2 minutos e meio</option><option value={180}>3 minutos</option><option value={240}>4 minutos</option><option value={300}>5 minutos</option></select></label>}
        </div>
        <button disabled={busy||(provider==="local"&&(!status.runtime_running||!status.active_model))||(provider!=="local"&&(!providerModel||!providerConfig.providers.find((p)=>p.id===provider)?.configured))||(compositionMode==="full"?!theme.trim():!sourceLyrics.trim())} onClick={generate} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 py-3.5 font-black text-white disabled:opacity-40">
          {busy?<Loader2 size={18} className="animate-spin"/>:<Sparkles size={18}/>}
          {compositionMode==="full"?"Criar música completa":compositionMode==="continue"?"Continuar minha composição":"Criar somente o refrão"}
        </button>
        {result&&<div className="space-y-3"><label className="block text-xs font-semibold text-zinc-300">{compositionMode==="chorus"?"Refrão gerado — você pode editar":"Resultado — você pode editar antes de usar"}</label>
          <textarea rows={18} className={inputCls} value={result} onChange={(e)=>setResult(e.target.value)}/>
          <button onClick={()=>onUseLyrics(result)} className="w-full rounded-xl bg-white px-4 py-3 font-black text-black">{t("useLyrics")}</button>
        </div>}
      </section>
    </div>
  );
}

// ------------------------------------------------------------------ aplicativo
export default function App() {
  const { lang, setLang, t } = useLocale();
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
  const [styleCategory, setStyleCategory] = useState("Infantil");
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
    setJob({ title, phase: "Começando...", startedAt: Date.now(), phaseStartedAt: Date.now() });
    const phase = (p) => setJob((j) => (j ? (j.phase === p ? j : { ...j, phase: p, phaseStartedAt: Date.now() }) : j));
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
  const phaseElapsed = job ? Math.floor((Date.now() - (job.phaseStartedAt || job.startedAt)) / 1000) : 0;

  return (
    <div className="min-h-screen bg-[#0c0c10] text-zinc-100 flex">
      {/* barra lateral */}
      <aside className="hidden md:flex w-56 shrink-0 flex-col gap-1 border-r border-white/5 p-4">
        <div className="mb-6 px-2">
          <img src="./logo.png" alt="Social Music Beat" className="w-full h-auto select-none" draggable="false" />
        </div>
        {[
          { id: "criar", label: t("create"), icon: <Sparkles size={16} /> },
          { id: "compositor", label: t("composer"), icon: <Music size={16} /> },
          { id: "ajuda", label: t("help"), icon: <HelpCircle size={16} /> },
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
        <div className="flex justify-end px-4 pt-3"><label className="flex items-center gap-2 text-xs text-zinc-400"><span>{t("language")}</span><select aria-label={t("language")} value={lang} onChange={(e) => setLang(e.target.value)} className="rounded-lg border border-white/10 bg-[#17171b] px-2 py-1.5 text-zinc-200"><option value="pt-BR">🇧🇷 Português (Brasil)</option><option value="en">🇺🇸 English</option><option value="es">🇪🇸 Español</option></select></label></div>
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
            <h1 className="text-2xl font-black text-white">{t("helpTitle")}</h1>
            <p><b className="text-white">1.</b> {t("help1")}</p>
            <p><b className="text-white">2.</b> {t("help2")}</p>
            <p><b className="text-white">3.</b> {t("help3")}</p>
            <p><b className="text-white">4.</b> {t("help4")}</p>
            <p className="text-zinc-500">{t("helpWindows")}</p>
          </div>
        ) : tab === "compositor" ? (
          <CompositorPanel onUseLyrics={(output) => {
            const title = output.match(/^TÍTULO:\s*(.+)$/im)?.[1]?.trim() || "";
            const style = output.match(/^ESTILO:\s*(.+)$/im)?.[1]?.trim() || "";
            const blocks = output.split(/\nLETRA:\s*\n?/i);
            const lyrics = blocks[1]?.split(/\nESTILO INSTRUMENTAL\s*:/i)[0]?.trim() || output;
            const duration = Number(output.match(/Duração em segundos:\s*(\d+)/i)?.[1] || 0);
            setForm((f) => ({
              ...f,
              lyrics,
              title: title || f.title,
              style: style || f.style,
              duration: duration >= 30 && duration <= 240 ? duration : f.duration,
              instrumentalOnly: false
            }));
            setTab("criar");
          }} />
        ) : (
          <div className="grid gap-6 p-4 lg:p-6 lg:grid-cols-[430px_1fr]">
            {/* ---------------- formulário ---------------- */}
            <section className="rounded-2xl border border-white/5 bg-[#111116] p-5 space-y-5 h-fit">
              <div className="flex items-center justify-between">
                <h1 className="text-lg font-black">{t("createSong")}</h1>
                <Seg
                  value={form.instrumentalOnly ? "inst" : "voz"}
                  onChange={(v) => set("instrumentalOnly", v === "inst")}
                  options={[{ v: "voz", label: t("withVoice") }, { v: "inst", label: t("instrumentalOnly") }]}
                />
              </div>

              {!form.instrumentalOnly && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-zinc-300">{t("lyrics")}</label>
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
                <label className="mb-1.5 block text-xs font-semibold text-zinc-300">{t("style")}</label>
                <textarea
                  rows={3}
                  className={inputCls}
                  placeholder="Ex.: pop animado, violão, bateria leve (clique nos botões abaixo para preencher)"
                  value={form.style}
                  onChange={(e) => set("style", e.target.value)}
                />
                <div className="mt-2">
                  <p className="mb-2 text-[11px] text-zinc-400">Escolha uma categoria para ver ritmos diferentes. Os estilos já descrevem andamento, instrumentos e energia — não apenas o sentimento.</p>
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {STYLE_CATEGORIES.map((category) => (
                      <button
                        key={category}
                        onClick={() => setStyleCategory(category)}
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${styleCategory === category ? "border-pink-500 bg-pink-500/15 text-pink-200" : "border-white/10 text-zinc-400 hover:border-white/30 hover:text-white"}`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {STYLES.filter((s) => s.category === styleCategory).map((s) => (
                      <button
                        key={s.label}
                        title={s.v}
                        onClick={() => set("style", form.style.trim() ? `${form.style.trim().replace(/,$/, "")}, ${s.v}` : s.v)}
                        className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-semibold text-zinc-300 hover:border-pink-500/60 hover:text-white"
                      >
                        + {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {!form.instrumentalOnly && (
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-zinc-300">{t("voice")}:</span>
                  <Seg
                    value={form.voiceKind}
                    onChange={(v) => set("voiceKind", v)}
                    options={[{ v: "auto", label: t("automatic") }, { v: "female", label: t("female") }, { v: "male", label: t("male") }]}
                  />
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-300">{t("titleOptional")}</label>
                <input className={inputCls} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Minha música" />
              </div>

              <button onClick={() => setShowAdv((s) => !s)} className="text-xs font-semibold text-zinc-400 hover:text-white">
                {showAdv ? "▾" : "▸"} {t("advanced")}
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
              <h2 className="text-sm font-black uppercase tracking-widest text-zinc-400">{t("mySongs")} ({tracks.length})</h2>

              {job && (
                <div className="flex items-center gap-4 rounded-2xl border border-pink-500/30 bg-pink-500/5 p-4">
                  <Loader2 className="animate-spin text-pink-400" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold">{job.title}</div>
                    <div className="text-xs text-zinc-400">{t("stage")}: {translatePhase(job.phase, lang)}</div><div className="mt-1 text-[11px] text-zinc-500">{t("stageElapsed")}: <span className="font-mono">{mmss(phaseElapsed)}</span></div>
                  </div>
                  <div className="text-right"><div className="text-[10px] text-zinc-500">{t("totalElapsed")}</div><div className="font-mono text-sm text-pink-300">{mmss(elapsed)}</div></div>
                </div>
              )}

              {tracks.length === 0 && !job && (
                <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-zinc-500">
                  <Music className="mx-auto mb-3" />
                  {t("noTracks")}
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

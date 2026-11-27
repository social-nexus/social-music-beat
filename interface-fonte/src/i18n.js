import { useState } from "react";

const TEXT = {
  "pt-BR": {
    language: "Idioma", stage: "Etapa", stageElapsed: "Tempo desta etapa", totalElapsed: "Tempo total",
    create: "Criar", createSong: "Criar música", lyrics: "Letra", style: "Estilo", titleOptional: "Título (opcional)",
    voice: "Voz", automatic: "Automática", female: "Feminina", male: "Masculina", advanced: "Opções avançadas",
    withVoice: "Com voz", instrumentalOnly: "Só instrumental", mySongs: "Minhas músicas",
    help: "Como usar", composer: "Compositor IA", chooseLanguage: "Idioma da música",
    noTracks: "Suas músicas aparecem aqui. Preencha a letra e o estilo e clique em Criar.",
    engineOffline: "O motor de música (ACE-Step) ainda está ligando ou foi fechado. Na primeira vez pode levar alguns minutos. Mantenha a janela “ACE-step” aberta.",
    songGenerating: "Gerando música", separating: "Separando áudio", vocalSeparation: "Separando voz e instrumental",
    preparingVoice: "Preparando sua voz", wait: "Processando…", error: "Erro",
    lyricsPortuguese: "Letra em português", lyricsEnglish: "Letra em inglês", lyricsSpanish: "Letra em espanhol",
    languagePT: "Português (Brasil)", languageEN: "Inglês", languageES: "Espanhol",
    "Começando...": "Começando...", "Preparando a sua voz...": "Preparando a sua voz...",
    "Separando...": "Separando...", "Guardando...": "Guardando..."
  },
  en: {
    language: "Language", stage: "Stage", stageElapsed: "Stage time", totalElapsed: "Total elapsed",
    create: "Generate", createSong: "Create song", lyrics: "Lyrics", style: "Style", titleOptional: "Title (optional)",
    voice: "Voice", automatic: "Automatic", female: "Female", male: "Male", advanced: "Advanced options",
    withVoice: "With vocals", instrumentalOnly: "Instrumental only", mySongs: "My songs",
    help: "How to use", composer: "AI Composer", chooseLanguage: "Song language",
    noTracks: "Your songs will appear here. Enter lyrics and style, then click Generate.",
    engineOffline: "The music engine (ACE-Step) is starting or has been closed. The first startup may take a few minutes. Keep the ACE-Step window open.",
    songGenerating: "Generating song", separating: "Separating audio", vocalSeparation: "Separating vocals and instrumental",
    preparingVoice: "Preparing your voice", wait: "Processing…", error: "Error",
    lyricsPortuguese: "Lyrics in Portuguese", lyricsEnglish: "Lyrics in English", lyricsSpanish: "Lyrics in Spanish",
    languagePT: "Brazilian Portuguese", languageEN: "English", languageES: "Spanish",
    "Começando...": "Starting...", "Preparando a sua voz...": "Preparing your voice...",
    "Separando...": "Separating...", "Guardando...": "Saving..."
  },
  es: {
    language: "Idioma", stage: "Etapa", stageElapsed: "Tiempo de esta etapa", totalElapsed: "Tiempo total",
    create: "Generar", createSong: "Crear canción", lyrics: "Letra", style: "Estilo", titleOptional: "Título (opcional)",
    voice: "Voz", automatic: "Automática", female: "Femenina", male: "Masculina", advanced: "Opciones avanzadas",
    withVoice: "Con voz", instrumentalOnly: "Solo instrumental", mySongs: "Mis canciones",
    help: "Cómo usar", composer: "Compositor IA", chooseLanguage: "Idioma de la canción",
    noTracks: "Tus canciones aparecerán aquí. Escribe la letra y el estilo y pulsa Generar.",
    engineOffline: "El motor de música (ACE-Step) está iniciándose o se cerró. La primera vez puede tardar unos minutos. Mantén abierta la ventana de ACE-Step.",
    songGenerating: "Generando canción", separating: "Separando audio", vocalSeparation: "Separando voz e instrumental",
    preparingVoice: "Preparando tu voz", wait: "Procesando…", error: "Error",
    lyricsPortuguese: "Letra en portugués", lyricsEnglish: "Letra en inglés", lyricsSpanish: "Letra en español",
    languagePT: "Portugués de Brasil", languageEN: "Inglés", languageES: "Español",
    "Começando...": "Iniciando...", "Preparando a sua voz...": "Preparando tu voz...",
    "Separando...": "Separando...", "Guardando...": "Guardando..."
  }
};

export function useLocale() {
  const [lang, setLanguage] = useState(() => {
    try { return localStorage.getItem("social-music-beat-language") || "pt-BR"; }
    catch { return "pt-BR"; }
  });
  const setLang = (value) => {
    const safe = TEXT[value] ? value : "pt-BR";
    setLanguage(safe);
    try { localStorage.setItem("social-music-beat-language", safe); } catch { /* storage unavailable */ }
  };
  const t = (key) => TEXT[lang]?.[key] || TEXT["pt-BR"][key] || key;
  return { lang, setLang, t };
}

export function translatePhase(phase, lang = "pt-BR") {
  if (lang === "pt-BR") return phase;
  const map = {
    en: [["Começando", "Starting"], ["Preparando a sua voz", "Preparing your voice"], ["Enviando", "Submitting"], ["Criando a banda para a sua voz", "Creating accompaniment for your voice"], ["Guardando", "Saving"], ["Separando", "Separating"], ["Criando", "Generating"], ["Preparando", "Preparing"]],
    es: [["Começando", "Iniciando"], ["Preparando a sua voz", "Preparando tu voz"], ["Enviando", "Enviando"], ["Criando a banda para a sua voz", "Creando acompañamiento para tu voz"], ["Guardando", "Guardando"], ["Separando", "Separando"], ["Criando", "Generando"], ["Preparando", "Preparando"]]
  };
  for (const [from, to] of map[lang] || []) if (phase.includes(from)) return phase.replace(from, to);
  return phase;
}

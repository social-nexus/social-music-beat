import { useState } from "react";

const TEXT = {
  "pt-BR": {
    language: "Idioma", elapsed: "Tempo decorrido", analyzingMelody: "Analisando áudio localmente…", transcribing: "Transcrevendo…",aiModeTitle: "1. Escolha como a IA vai funcionar", aiModeHelp: "A opção local é gratuita. APIs externas usam sua própria conta e podem gerar cobranças pelo provedor.", aiModeLabel: "Modo de IA", localEngineTitle: "2. Motor de IA local (opcional)", localEngineHelp: "Pacote compatível com este computador", localModelTitle: "3. Modelo local (Gemma / Qwen)", modelCatalog: "Modelo do catálogo", composerStepTitle: "4. Assistente de composição", composerStepHelp: "Escolha o que deseja fazer. A composição será processada pelo modo de IA selecionado acima.", melodyRefTitle: "Minha voz como referência (opcional)", melodyMissing: "A melodia da parte que ainda falta criar", melodyExisting: "Uma parte da letra que já escrevi/cantei", melodyWords: "Palavras que cantei (opcional)", genre: "Gênero musical", mood: "Clima / sentimento", approximateDuration: "Duração aproximada", useLyrics: "Usar esta letra na criação musical", composerTitle: "Compositor de letras com IA", composerIntro: "Use Gemma/Qwen no computador ou conecte sua própria API. Ao escolher um provedor externo, os dados da composição serão enviados a esse serviço.", operationElapsed: "Operação em andamento · Tempo decorrido", helpTitle: "Como usar, em 4 passos", help1: "Criar. Cole a letra, escolha o estilo e clique em Criar. Você recebe a música cantada (com uma voz guia).", help2: "Separar. Na música criada, clique em “Separar voz e instrumental”. Você recebe dois arquivos: só a voz guia e só o instrumental.", help3: "Cantar. Baixe o instrumental, ouça a voz guia para aprender a melodia e grave a sua voz (só a voz, de fone de ouvido).", help4: "Ajustar a banda. Clique em “Cantar por cima”, envie sua gravação e escolha os instrumentos. O programa cria uma banda que acompanha seu jeito de cantar.", helpWindows: "Mantenha abertas as duas janelas pretas enquanto usa. Para fechar tudo, feche as janelas pretas.", stage: "Etapa", stageElapsed: "Tempo desta etapa", totalElapsed: "Tempo total",
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
    language: "Language", elapsed: "Elapsed time", analyzingMelody: "Analyzing audio locally…", transcribing: "Transcribing…",aiModeTitle: "1. Choose how AI will work", aiModeHelp: "Local AI is free. External APIs use your own account and may charge according to the provider.", aiModeLabel: "AI mode", localEngineTitle: "2. Local AI engine (optional)", localEngineHelp: "Package compatible with this computer", localModelTitle: "3. Local model (Gemma / Qwen)", modelCatalog: "Catalog model", composerStepTitle: "4. Composition assistant", composerStepHelp: "Choose what you want to do. The composition will use the AI mode selected above.", melodyRefTitle: "My voice as a reference (optional)", melodyMissing: "Melody for the part still to be created", melodyExisting: "A part of lyrics I have already written/sung", melodyWords: "Words I sang (optional)", genre: "Music genre", mood: "Mood / feeling", approximateDuration: "Approximate duration", useLyrics: "Use these lyrics in music creation", composerTitle: "AI lyrics composer", composerIntro: "Use Gemma/Qwen locally or connect your own API. When you choose an external provider, composition data is sent to that service.", operationElapsed: "Operation in progress · Elapsed time", helpTitle: "How to use, in 4 steps", help1: "Create. Paste lyrics, choose a style and click Generate. You will get a song with guide vocals.", help2: "Separate. On a generated song, choose “Separate vocals and instrumental”. You get two files: guide vocals and instrumental only.", help3: "Sing. Download the instrumental, listen to the guide melody, then record your own voice (voice only, using headphones).", help4: "Build the band. Choose “Sing over”, upload your recording and select instruments. The app creates accompaniment following your singing.", helpWindows: "Keep both black windows open while using the app. To close everything, close the black windows.", stage: "Stage", stageElapsed: "Stage time", totalElapsed: "Total elapsed",
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
    language: "Idioma", elapsed: "Tiempo transcurrido", analyzingMelody: "Analizando audio localmente…", transcribing: "Transcribiendo…",aiModeTitle: "1. Elige cómo funcionará la IA", aiModeHelp: "La IA local es gratuita. Las APIs externas usan tu propia cuenta y pueden generar cargos del proveedor.", aiModeLabel: "Modo de IA", localEngineTitle: "2. Motor de IA local (opcional)", localEngineHelp: "Paquete compatible con este equipo", localModelTitle: "3. Modelo local (Gemma / Qwen)", modelCatalog: "Modelo del catálogo", composerStepTitle: "4. Asistente de composición", composerStepHelp: "Elige qué deseas hacer. La composición usará el modo de IA seleccionado arriba.", melodyRefTitle: "Mi voz como referencia (opcional)", melodyMissing: "La melodía de la parte que aún falta crear", melodyExisting: "Una parte de la letra que ya escribí/canté", melodyWords: "Palabras que canté (opcional)", genre: "Género musical", mood: "Ambiente / sentimiento", approximateDuration: "Duración aproximada", useLyrics: "Usar esta letra para crear la música", composerTitle: "Compositor de letras con IA", composerIntro: "Usa Gemma/Qwen localmente o conecta tu propia API. Al elegir un proveedor externo, los datos de composición se envían a ese servicio.", operationElapsed: "Operación en curso · Tiempo transcurrido", helpTitle: "Cómo usar, en 4 pasos", help1: "Crear. Pega la letra, elige el estilo y pulsa Generar. Recibirás la canción con voz guía.", help2: "Separar. En una canción generada, selecciona “Separar voz e instrumental”. Obtendrás dos archivos: voz guía e instrumental.", help3: "Cantar. Descarga el instrumental, escucha la melodía guía y graba tu voz (solo voz, con auriculares).", help4: "Crear acompañamiento. Selecciona “Cantar encima”, sube tu grabación y elige instrumentos. La app crea una banda que acompaña tu interpretación.", helpWindows: "Mantén abiertas las dos ventanas negras mientras usas la app. Para cerrar todo, cierra las ventanas negras.", stage: "Etapa", stageElapsed: "Tiempo de esta etapa", totalElapsed: "Tiempo total",
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

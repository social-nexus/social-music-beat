import React, { useCallback, useEffect, useRef, useState } from "react";
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

const UI_TEXT = {
  pt: { language: "Idioma", create: "Criar", composer: "Compositor IA", help: "Como usar", onlineWait: "O motor de música (ACE-Step) ainda está ligando ou foi fechado. Na primeira vez pode levar alguns minutos. Mantenha a janela “ACE-Step” aberta.", createMusic: "Criar música", library: "Minhas músicas", emptyLibrary: "Suas músicas aparecem aqui. Preencha a letra e o estilo e clique em Criar.", elapsed: "Tempo decorrido", processing: "Processando", helpTitle: "Como usar, em 4 passos", lyricsLanguage: "Idioma da música", lyricsPt: "Letra em português", lyricsEn: "Letra em inglês", lyricsEs: "Letra em espanhol", operationDone: "Operação concluída", operationInterrupted: "Operação interrompida", singOver: "Cantar por cima", singDesc: "Você cantou em cima do instrumental de", singDesc2: "Envie só a sua voz (sem a música de fundo) e o programa cria uma banda nova que acompanha o seu jeito de cantar.", chooseVoice: "1. Escolher o arquivo com a minha voz (WAV ou MP3, mínimo 10 segundos)", instrumentChoices: "2. Quais instrumentos a banda deve ter?", styleOriginal: "3. Estilo (já vem o da música original)", autoBand: "Depois, separar também só a banda (sem a voz). Demora alguns minutos a mais.", createBand: "Criar a banda para a minha voz", firstModel: "Na primeira vez o motor carrega um modelo diferente, o que pode levar alguns minutos. Não feche as janelas pretas.", autoKey: "Tom: automático", lyricsCaption: "Legenda da música", captionDesc: "Gera o arquivo .srt (vídeo) e o .lrc (letra sincronizada) de", audioUsed: "Áudio usado", useRecording: "Usar a minha gravação cantando", backToTrack: "voltar ao áudio da música", lyricsLines: "Letra (uma linha cantada por linha; as marcações [Verse] são ignoradas)", fastMode: "Rápido: usa as pausas do canto", whisperMode: "Preciso: Whisper ouve a voz", charsCaption: "Caracteres por legenda", whisperBase: "Whisper base (cerca de 150 MB)", whisperSmall: "Whisper small (cerca de 480 MB)", captionTip: "Rápido funciona melhor quando o cantor respira ou pausa entre as linhas. Cantar é mais difícil de alinhar do que falar, então confira o resultado.", working: "Trabalhando...", makeCaption: "Gerar legenda", downloadSrt: "Baixar .srt", downloadLrc: "Baixar .lrc", copy: "Copiar", voice: "Voz", style: "Estilo", titleOptional: "Título (opcional)", advanced: "Opções avançadas", duration: "Duração", voiceAuto: "Automática", voiceFemale: "Feminina", voiceMale: "Masculina", lyrics: "Letra", lyricsHint: "Dica: marque as partes com [Verse 1], [Chorus], [Bridge] (em inglês). Ajuda o modelo.", styleHint: "Escolha uma categoria para ver ritmos diferentes. Os estilos já descrevem andamento, instrumentos e energia — não apenas o sentimento.", instrumentalOnly: "Só instrumental", withVoice: "Com voz", download: "Baixar", separate: "Separar voz e instrumental", delete: "Excluir", listen: "Ouvir", playHint: "Clique em ▶ numa música para ouvir", license: "Licença:", viewLicense: "ver licença", officialSource: "origem oficial", modelInstalled: "Modelo instalado", downloadModel: "Baixar modelo", importGguf: "Importar GGUF", activateModel: "Ativar modelo", stopAI: "Desligar IA", apiSave: "Salvar chave com segurança", apiRemove: "Remover chave", apiUse: "Usar este provedor", apiTest: "Testar conexão", apiKeyPlaceholder: "Cole sua chave de API aqui", providerModelPlaceholder: "Informe o identificador do modelo", helpCreate: "Cole a letra, escolha o estilo e clique em Criar. Você recebe a música cantada (com uma voz guia).", helpSeparate: "Na música criada, clique em “Separar voz e instrumental”. Você recebe dois arquivos: só a voz guia e só o instrumental.", helpSing: "Baixe o instrumental, ouça a voz guia para aprender a melodia e grave a sua voz (só a voz, de fone de ouvido).", helpBand: "Clique em “Cantar por cima”, envie a sua gravação e escolha os instrumentos. O programa cria uma banda nova que acompanha o seu jeito de cantar.", helpKeep: "Mantenha abertas as duas janelas pretas enquanto usa. Para fechar tudo, feche as janelas pretas.", create: "Criar música", withVoice: "Com voz", instrumentalOnly: "Só instrumental", lyrics: "Letra", lyricsHint: "Dica: marque as partes com [Verse 1], [Chorus], [Bridge] (em inglês). Ajuda o modelo.", style: "Estilo", stylePlaceholder: "Ex.: pop animado, violão, bateria leve (clique nos botões abaixo para preencher)", styleHint: "Escolha uma categoria para ver ritmos diferentes. Os estilos já descrevem andamento, instrumentos e energia — não apenas o sentimento.", voice: "Voz:", voiceAuto: "Automática", voiceFemale: "Feminina", voiceMale: "Masculina", titleOptional: "Título (opcional)", mySong: "Minha música", advanced: "Opções avançadas", duration: "Duração", bpmAuto: "BPM (automático)", versions1: "1 versão", versions2: "2 versões (usa mais memória)", createButton: "Criar", instrumentalLabel: "Só instrumental", oneVersion: "1 versão", twoVersions: "2 versões (usa mais memória)", styleCategoryHint: "Escolha uma categoria para ver ritmos diferentes.", deleteConfirm: "Excluir", helpStep1: "Criar.", helpStep2: "Separar.", helpStep3: "Cantar.", helpStep4: "Ajustar a banda.", composerTitle: "Compositor de letras com IA", composerIntro: "Use Gemma/Qwen no computador ou conecte sua própria API. Ao escolher um provedor externo, os dados da composição serão enviados a esse serviço.", aiStep1: "1. Escolha como a IA vai funcionar", aiStep1Desc: "A opção local é gratuita. APIs externas usam sua própria conta e podem gerar cobranças pelo provedor.", aiMode: "Modo de IA", localGemma: "Local — Gemma / Qwen", keySaved: "chave cadastrada", keySetup: "configurar chave", providerModel: "Modelo (ID do provedor)", apiKeyAlready: "Uma chave já está cadastrada para este provedor.", apiKeyNeeded: "Cadastre sua chave de API para habilitar este provedor.", saveSecure: "Salvar chave com segurança", removeKey: "Remover chave", secureUnavailable: "O cofre seguro de credenciais do sistema não está disponível. A chave não será salva em arquivo de texto.", useProvider: "Usar este provedor", testConnection: "Testar conexão", secureKeyNote: "A chave é guardada no cofre de credenciais do Windows/macOS/Linux, não no código, no GitHub ou no arquivo de configurações. Confira limites, créditos e preços com o provedor.", localEngine: "2. Motor de IA local (opcional)", compatiblePackage: "Pacote compatível com este computador", installed: "instalado", installRuntime: "Baixar e instalar motor", runtimeInstalled: "Motor instalado", shaVerified: "SHA-256 verificado", gpuLayers: "Camadas na GPU (0 = CPU)", cpuNote: "O pacote CPU é o caminho mais compatível. CUDA/Vulkan/Metal dependem dos drivers e do hardware. A aceleração pode exigir ajustes de memória.", noRuntime: "Não encontrei um pacote pronto para este sistema/arquitetura. A ferramenta continua funcionando sem o compositor.", localModel: "3. Modelo local (Gemma / Qwen)", modelCatalog: "Modelo do catálogo", imported: "importado", license: "Licença:", viewLicense: "ver licença", officialSource: "origem oficial", acceptGemma: "Li e aceito os Gemma Terms of Use. Entendo que o Gemma possui condições próprias de uso.", modelInstalled: "Modelo instalado", downloadModel: "Baixar modelo", importGguf: "Importar GGUF", activateModel: "Ativar modelo", stopAI: "Desligar IA", importNote: "Você também pode importar outros GGUF. A licença de arquivos importados não é verificada automaticamente.", assistant: "4. Assistente de composição", assistantDesc: "Escolha o que deseja fazer. A composição será processada pelo modo de IA selecionado acima.", fullSong: "Música completa", fullSongDesc: "Começar uma letra do zero.", continueSong: "Continuar composição", continueSongDesc: "Preservar sua letra e desenvolver o restante.", chorusOnly: "Criar somente refrão", chorusDesc: "Escrever um refrão para sua composição.", yourLyricsKeep: "Sua composição (a IA manterá o que você já escreveu)", yourLyricsChorus: "Sua composição (base para criar o refrão)", pasteLyrics: "Cole aqui sua letra. Você pode incluir marcações como [Verse 1] e [Bridge].", preserveLyrics: "A IA deve preservar seus versos e completar as partes que faltam, sem reescrever sua identidade.", createChorusDesc: "A IA analisará o tema, a mensagem e o sentimento da letra para criar apenas o refrão.", voiceReference: "Minha voz como referência (opcional)", voiceReferenceDesc: "Cante sua ideia, mesmo com palavras incompletas, sílabas inventadas ou apenas cantarolando. A ferramenta estima fraseado e movimento melódico para ajudar a encaixar a letra.", recordingRepresents: "O trecho gravado representa:", missingMelody: "A melodia da parte que ainda falta criar", existingMelody: "Uma parte da letra que já escrevi/cantei", sungWords: "Palavras que cantei (opcional)", recognizedWords: "A letra reconhecida aparecerá aqui. Você também pode corrigir ou escrever manualmente.", whisperModel: "Modelo Whisper", baseLight: "Base — mais leve", smallAccurate: "Small — maior precisão", transcribe: "Transcrever letra do áudio", transcribing: "Transcrevendo…", importAudio: "Importar áudio", recordMelody: "Gravar melodia", stopRecording: "Parar gravação", removeReference: "Remover referência", analyzingLocal: "Analisando áudio localmente…", referenceReady: "Referência pronta:", privacyNote: "Privacidade: a análise melódica continua no navegador. Se você solicitar a transcrição, o áudio será processado somente pelo Whisper instalado neste computador (CPU), sem serviço externo, e será apagado após o processamento. O Whisper pode errar palavras cantadas ou não reconhecer sílabas inventadas; revise a letra. A transcrição não cria legendas nem timestamps.", theme: "Tema ou história", extraGuidance: "Orientação adicional (opcional)", themePlaceholder: "Ex.: um pai ensinando o filho a pescar e lembrando da própria infância", guidancePlaceholder: "Ex.: deixe o refrão mais emocionante, simples e fácil de memorizar", genre: "Gênero musical", mood: "Clima / sentimento", voiceChoice: "Voz", voiceNeutral: "indiferente", voiceMasculine: "masculina", voiceFeminine: "feminina", duet: "dueto", approxDuration: "Duração aproximada", oneMinute: "1 minuto", oneHalf: "1 minuto e meio", twoMinutes: "2 minutos", twoHalf: "2 minutos e meio", threeMinutes: "3 minutos", fourMinutes: "4 minutos", fiveMinutes: "5 minutos", fullCreate: "Criar música completa", continueCreate: "Continuar minha composição", chorusCreate: "Criar somente o refrão", chorusResult: "Refrão gerado — você pode editar", resultEdit: "Resultado — você pode editar antes de usar", useLyrics: "Usar esta letra na criação musical", songLanguage: "Idioma da música" },
  en: { language: "Language", create: "Create", composer: "AI Composer", help: "How to use", onlineWait: "The music engine (ACE-Step) is starting or has been closed. The first startup may take a few minutes. Keep the “ACE-Step” window open.", createMusic: "Create music", library: "My music", emptyLibrary: "Your music will appear here. Enter lyrics and a style, then click Create.", elapsed: "Elapsed time", processing: "Processing", helpTitle: "How to use, in 4 steps", lyricsLanguage: "Music language", lyricsPt: "Lyrics in Portuguese", lyricsEn: "Lyrics in English", lyricsEs: "Lyrics in Spanish", operationDone: "Operation completed", operationInterrupted: "Operation interrupted", singOver: "Sing over", singDesc: "Did you sing over the instrumental of", singDesc2: "Upload only your voice (without the backing music) and the program will create a new band that follows your singing.", chooseVoice: "1. Choose the file with my voice (WAV or MP3, at least 10 seconds)", instrumentChoices: "2. Which instruments should the band have?", styleOriginal: "3. Style (pre-filled from the original song)", autoBand: "Afterwards, also separate the band only (without vocals). This takes a few extra minutes.", createBand: "Create the band for my voice", firstModel: "The engine loads a different model the first time, which may take a few minutes. Do not close the black windows.", autoKey: "Key: automatic", lyricsCaption: "Song subtitles", captionDesc: "Generates the .srt (video) and .lrc (synchronized lyrics) files for", audioUsed: "Audio used", useRecording: "Use my singing recording", backToTrack: "return to song audio", lyricsLines: "Lyrics (one sung line per row; [Verse] markers are ignored)", fastMode: "Fast: uses pauses in the singing", whisperMode: "Accurate: Whisper listens to the voice", charsCaption: "Characters per subtitle", whisperBase: "Whisper base (about 150 MB)", whisperSmall: "Whisper small (about 480 MB)", captionTip: "Fast mode works best when the singer breathes or pauses between lines. Singing is harder to align than speech, so review the result.", working: "Working...", makeCaption: "Generate subtitles", downloadSrt: "Download .srt", downloadLrc: "Download .lrc", copy: "Copy", voice: "Voice", style: "Style", titleOptional: "Title (optional)", advanced: "Advanced options", duration: "Duration", voiceAuto: "Automatic", voiceFemale: "Female", voiceMale: "Male", lyrics: "Lyrics", lyricsHint: "Tip: mark sections with [Verse 1], [Chorus], [Bridge] (in English). This helps the model.", styleHint: "Choose a category to explore different rhythms. Styles describe tempo, instruments, and energy—not just mood.", instrumentalOnly: "Instrumental only", withVoice: "With vocals", download: "Download", separate: "Separate vocals and instrumental", delete: "Delete", listen: "Listen", playHint: "Click ▶ on a song to listen", license: "License:", viewLicense: "view license", officialSource: "official source", modelInstalled: "Model installed", downloadModel: "Download model", importGguf: "Import GGUF", activateModel: "Activate model", stopAI: "Stop AI", apiSave: "Save key securely", apiRemove: "Remove key", apiUse: "Use this provider", apiTest: "Test connection", apiKeyPlaceholder: "Paste your API key here", providerModelPlaceholder: "Enter the model identifier", helpCreate: "Enter your lyrics, choose a style, and click Create. You will receive a sung version with a guide vocal.", helpSeparate: "On the generated song, click “Separate vocals and instrumental”. You will receive two files: guide vocals only and instrumental only.", helpSing: "Download the instrumental, listen to the guide vocal to learn the melody, and record your own voice (voice only, using headphones).", helpBand: "Click “Sing over”, upload your recording, and choose the instruments. The program creates a new band that follows your singing.", helpKeep: "Keep both black windows open while using the app. To close everything, close the black windows.", create: "Create music", withVoice: "With vocals", instrumentalOnly: "Instrumental only", lyrics: "Lyrics", lyricsHint: "Tip: mark sections with [Verse 1], [Chorus], [Bridge] (in English). This helps the model.", style: "Style", stylePlaceholder: "E.g. upbeat pop, acoustic guitar, light drums (click the buttons below to fill in)", styleHint: "Choose a category to explore different rhythms. Styles describe tempo, instruments, and energy—not just mood.", voice: "Voice:", voiceAuto: "Automatic", voiceFemale: "Female", voiceMale: "Male", titleOptional: "Title (optional)", mySong: "My song", advanced: "Advanced options", duration: "Duration", bpmAuto: "BPM (automatic)", versions1: "1 version", versions2: "2 versions (uses more memory)", createButton: "Create", instrumentalLabel: "Instrumental only", oneVersion: "1 version", twoVersions: "2 versions (uses more memory)", styleCategoryHint: "Choose a category to explore different rhythms.", deleteConfirm: "Delete", helpStep1: "Create.", helpStep2: "Separate.", helpStep3: "Sing.", helpStep4: "Build the band.", composerTitle: "AI lyric composer", composerIntro: "Use Gemma/Qwen on your computer or connect your own API. When choosing an external provider, composition data will be sent to that service.", aiStep1: "1. Choose how the AI will work", aiStep1Desc: "The local option is free. External APIs use your own account and may charge fees.", aiMode: "AI mode", localGemma: "Local — Gemma / Qwen", keySaved: "key saved", keySetup: "set up key", providerModel: "Model (provider ID)", apiKeyAlready: "A key is already saved for this provider.", apiKeyNeeded: "Add your API key to enable this provider.", saveSecure: "Save key securely", removeKey: "Remove key", secureUnavailable: "The system's secure credential vault is unavailable. The key will not be saved in a text file.", useProvider: "Use this provider", testConnection: "Test connection", secureKeyNote: "The key is stored in the Windows/macOS/Linux credential vault, not in the code, GitHub, or settings file. Check limits, credits, and prices with your provider.", localEngine: "2. Local AI engine (optional)", compatiblePackage: "Package compatible with this computer", installed: "installed", installRuntime: "Download and install engine", runtimeInstalled: "Engine installed", shaVerified: "SHA-256 verified", gpuLayers: "GPU layers (0 = CPU)", cpuNote: "The CPU package is the most compatible option. CUDA/Vulkan/Metal depend on drivers and hardware. Acceleration may require memory tuning.", noRuntime: "No ready-to-use package was found for this system/architecture. The app still works without the composer.", localModel: "3. Local model (Gemma / Qwen)", modelCatalog: "Catalog model", imported: "imported", license: "License:", viewLicense: "view license", officialSource: "official source", acceptGemma: "I have read and accept the Gemma Terms of Use. I understand that Gemma has its own usage conditions.", modelInstalled: "Model installed", downloadModel: "Download model", importGguf: "Import GGUF", activateModel: "Activate model", stopAI: "Stop AI", importNote: "You can also import other GGUF files. Licenses for imported files are not verified automatically.", assistant: "4. Composition assistant", assistantDesc: "Choose what you want to do. Composition will be processed by the AI mode selected above.", fullSong: "Full song", fullSongDesc: "Start lyrics from scratch.", continueSong: "Continue composition", continueSongDesc: "Keep your lyrics and develop the rest.", chorusOnly: "Create chorus only", chorusDesc: "Write a chorus for your composition.", yourLyricsKeep: "Your composition (AI will keep what you have written)", yourLyricsChorus: "Your composition (basis for creating the chorus)", pasteLyrics: "Paste your lyrics here. You can include markers such as [Verse 1] and [Bridge].", preserveLyrics: "AI should preserve your verses and complete missing sections without rewriting your identity.", createChorusDesc: "AI will analyze the theme, message, and feeling of your lyrics to create only the chorus.", voiceReference: "My voice as a reference (optional)", voiceReferenceDesc: "Sing your idea, even with incomplete words, invented syllables, or humming. The tool estimates phrasing and melodic movement to help fit the lyrics.", recordingRepresents: "The recorded excerpt represents:", missingMelody: "The melody of the section that still needs to be created", existingMelody: "A section of lyrics I have already written/sung", sungWords: "Words I sang (optional)", recognizedWords: "Recognized lyrics will appear here. You can also correct them or type manually.", whisperModel: "Whisper model", baseLight: "Base — lighter", smallAccurate: "Small — more accurate", transcribe: "Transcribe lyrics from audio", transcribing: "Transcribing…", importAudio: "Import audio", recordMelody: "Record melody", stopRecording: "Stop recording", removeReference: "Remove reference", analyzingLocal: "Analyzing audio locally…", referenceReady: "Reference ready:", privacyNote: "Privacy: melody analysis stays in your browser. If you request transcription, audio is processed only by Whisper installed on this computer (CPU), with no external service, and is deleted after processing. Whisper may mishear sung words or fail to recognize invented syllables; review the lyrics. Transcription does not create subtitles or timestamps.", theme: "Theme or story", extraGuidance: "Additional guidance (optional)", themePlaceholder: "E.g. a father teaching his child to fish and remembering his own childhood", guidancePlaceholder: "E.g. make the chorus more emotional, simple, and easy to remember", genre: "Music genre", mood: "Mood / feeling", voiceChoice: "Voice", voiceNeutral: "neutral", voiceMasculine: "male", voiceFeminine: "female", duet: "duet", approxDuration: "Approximate duration", oneMinute: "1 minute", oneHalf: "1.5 minutes", twoMinutes: "2 minutes", twoHalf: "2.5 minutes", threeMinutes: "3 minutes", fourMinutes: "4 minutes", fiveMinutes: "5 minutes", fullCreate: "Create full song", continueCreate: "Continue my composition", chorusCreate: "Create chorus only", chorusResult: "Generated chorus — you can edit it", resultEdit: "Result — you can edit before using", useLyrics: "Use these lyrics to create music", songLanguage: "Song language" },
  es: { language: "Idioma", create: "Crear", composer: "Compositor IA", help: "Cómo usar", onlineWait: "El motor de música (ACE-Step) todavía se está iniciando o se ha cerrado. La primera vez puede tardar unos minutos. Mantén abierta la ventana “ACE-Step”.", createMusic: "Crear música", library: "Mi música", emptyLibrary: "Tus canciones aparecerán aquí. Escribe la letra y el estilo y haz clic en Crear.", elapsed: "Tiempo transcurrido", processing: "Procesando", helpTitle: "Cómo usar, en 4 pasos", lyricsLanguage: "Idioma de la música", lyricsPt: "Letra en portugués", lyricsEn: "Letra en inglés", lyricsEs: "Letra en español", operationDone: "Operación completada", operationInterrupted: "Operación interrumpida" }
};
const uiText = (language, key) => UI_TEXT[language]?.[key] || UI_TEXT.pt[key] || key;

async function http(url, opts) {
  const r = await fetch(url, opts);
  const text = await r.text();
  let data = null;
  try { data = JSON.parse(text); } catch { /* resposta não é JSON */ }
  if (!r.ok) throw new Error((data && (data.detail || data.error)) || text.slice(0, 300) || `Erro ${r.status}`);
  return data;
}
const jsonPost = (url, body) =>
  http(url, { method: "POST", headers: { "Content-Type": "application/json", singOver: "Cantar encima", singDesc: "¿Cantaste sobre el instrumental de", singDesc2: "Envía solo tu voz (sin la música de fondo) y el programa creará una nueva banda que seguirá tu forma de cantar.", chooseVoice: "1. Elegir el archivo con mi voz (WAV o MP3, mínimo 10 segundos)", instrumentChoices: "2. ¿Qué instrumentos debe tener la banda?", styleOriginal: "3. Estilo (ya viene el de la canción original)", autoBand: "Después, separar también solo la banda (sin la voz). Tarda unos minutos más.", createBand: "Crear la banda para mi voz", firstModel: "La primera vez, el motor carga un modelo diferente y puede tardar unos minutos. No cierres las ventanas negras.", autoKey: "Tonalidad: automática", lyricsCaption: "Subtítulos de la canción", captionDesc: "Genera los archivos .srt (vídeo) y .lrc (letra sincronizada) de", audioUsed: "Audio utilizado", useRecording: "Usar mi grabación cantando", backToTrack: "volver al audio de la canción", lyricsLines: "Letra (una línea cantada por línea; se ignoran las marcas [Verse])", fastMode: "Rápido: usa las pausas del canto", whisperMode: "Preciso: Whisper escucha la voz", charsCaption: "Caracteres por subtítulo", whisperBase: "Whisper base (aprox. 150 MB)", whisperSmall: "Whisper small (aprox. 480 MB)", captionTip: "El modo rápido funciona mejor cuando el cantante respira o hace pausas entre líneas. Cantar es más difícil de sincronizar que hablar, así que revisa el resultado.", working: "Trabajando...", makeCaption: "Generar subtítulos", downloadSrt: "Descargar .srt", downloadLrc: "Descargar .lrc", copy: "Copiar", voice: "Voz", style: "Estilo", titleOptional: "Título (opcional)", advanced: "Opciones avanzadas", duration: "Duración", voiceAuto: "Automática", voiceFemale: "Femenina", voiceMale: "Masculina", lyrics: "Letra", lyricsHint: "Consejo: marca las partes con [Verse 1], [Chorus], [Bridge] (en inglés). Ayuda al modelo.", styleHint: "Elige una categoría para ver diferentes ritmos. Los estilos describen tempo, instrumentos y energía, no solo el sentimiento.", instrumentalOnly: "Solo instrumental", withVoice: "Con voz", download: "Descargar", separate: "Separar voz e instrumental", delete: "Eliminar", listen: "Escuchar", playHint: "Haz clic en ▶ en una canción para escucharla", license: "Licencia:", viewLicense: "ver licencia", officialSource: "origen oficial", modelInstalled: "Modelo instalado", downloadModel: "Descargar modelo", importGguf: "Importar GGUF", activateModel: "Activar modelo", stopAI: "Apagar IA", apiSave: "Guardar clave de forma segura", apiRemove: "Eliminar clave", apiUse: "Usar este proveedor", apiTest: "Probar conexión", apiKeyPlaceholder: "Pega aquí tu clave de API", providerModelPlaceholder: "Introduce el identificador del modelo", helpCreate: "Introduce la letra, elige el estilo y haz clic en Crear. Recibirás la canción cantada con una voz guía.", helpSeparate: "En la canción creada, haz clic en “Separar voz e instrumental”. Recibirás dos archivos: solo la voz guía y solo el instrumental.", helpSing: "Descarga el instrumental, escucha la voz guía para aprender la melodía y graba tu voz (solo la voz, con auriculares).", helpBand: "Haz clic en “Cantar encima”, envía tu grabación y elige los instrumentos. El programa crea una nueva banda que sigue tu forma de cantar.", helpKeep: "Mantén abiertas las dos ventanas negras mientras usas el programa. Para cerrar todo, cierra las ventanas negras.", create: "Crear música", withVoice: "Con voz", instrumentalOnly: "Solo instrumental", lyrics: "Letra", lyricsHint: "Consejo: marca las partes con [Verse 1], [Chorus], [Bridge] (en inglés). Ayuda al modelo.", style: "Estilo", stylePlaceholder: "Ej.: pop animado, guitarra acústica, batería suave (haz clic en los botones para completar)", styleHint: "Elige una categoría para ver diferentes ritmos. Los estilos describen tempo, instrumentos y energía, no solo el sentimiento.", voice: "Voz:", voiceAuto: "Automática", voiceFemale: "Femenina", voiceMale: "Masculina", titleOptional: "Título (opcional)", mySong: "Mi canción", advanced: "Opciones avanzadas", duration: "Duración", bpmAuto: "BPM (automático)", versions1: "1 versión", versions2: "2 versiones (usa más memoria)", createButton: "Crear", instrumentalLabel: "Solo instrumental", oneVersion: "1 versión", twoVersions: "2 versiones (usa más memoria)", styleCategoryHint: "Elige una categoría para ver diferentes ritmos.", deleteConfirm: "Eliminar", helpStep1: "Crear.", helpStep2: "Separar.", helpStep3: "Cantar.", helpStep4: "Crear la banda.", composerTitle: "Compositor de letras con IA", composerIntro: "Usa Gemma/Qwen en tu ordenador o conecta tu propia API. Al elegir un proveedor externo, los datos de la composición se enviarán a ese servicio.", aiStep1: "1. Elige cómo funcionará la IA", aiStep1Desc: "La opción local es gratuita. Las API externas usan tu propia cuenta y pueden generar cargos.", aiMode: "Modo de IA", localGemma: "Local — Gemma / Qwen", keySaved: "clave guardada", keySetup: "configurar clave", providerModel: "Modelo (ID del proveedor)", apiKeyAlready: "Ya hay una clave guardada para este proveedor.", apiKeyNeeded: "Añade tu clave de API para habilitar este proveedor.", saveSecure: "Guardar clave de forma segura", removeKey: "Eliminar clave", secureUnavailable: "El almacén seguro de credenciales del sistema no está disponible. La clave no se guardará en un archivo de texto.", useProvider: "Usar este proveedor", testConnection: "Probar conexión", secureKeyNote: "La clave se guarda en el almacén de credenciales de Windows/macOS/Linux, no en el código, GitHub ni en el archivo de configuración. Consulta límites, créditos y precios con el proveedor.", localEngine: "2. Motor de IA local (opcional)", compatiblePackage: "Paquete compatible con este equipo", installed: "instalado", installRuntime: "Descargar e instalar motor", runtimeInstalled: "Motor instalado", shaVerified: "SHA-256 verificado", gpuLayers: "Capas de GPU (0 = CPU)", cpuNote: "El paquete CPU es la opción más compatible. CUDA/Vulkan/Metal dependen de los controladores y del hardware. La aceleración puede requerir ajustes de memoria.", noRuntime: "No se encontró un paquete listo para este sistema/arquitectura. La herramienta sigue funcionando sin el compositor.", localModel: "3. Modelo local (Gemma / Qwen)", modelCatalog: "Modelo del catálogo", imported: "importado", license: "Licencia:", viewLicense: "ver licencia", officialSource: "fuente oficial", acceptGemma: "He leído y acepto los Gemma Terms of Use. Entiendo que Gemma tiene sus propias condiciones de uso.", modelInstalled: "Modelo instalado", downloadModel: "Descargar modelo", importGguf: "Importar GGUF", activateModel: "Activar modelo", stopAI: "Apagar IA", importNote: "También puedes importar otros GGUF. Las licencias de los archivos importados no se verifican automáticamente.", assistant: "4. Asistente de composición", assistantDesc: "Elige qué quieres hacer. La composición se procesará con el modo de IA seleccionado arriba.", fullSong: "Canción completa", fullSongDesc: "Empezar una letra desde cero.", continueSong: "Continuar composición", continueSongDesc: "Conservar tu letra y desarrollar el resto.", chorusOnly: "Crear solo el estribillo", chorusDesc: "Escribir un estribillo para tu composición.", yourLyricsKeep: "Tu composición (la IA conservará lo que ya escribiste)", yourLyricsChorus: "Tu composición (base para crear el estribillo)", pasteLyrics: "Pega aquí tu letra. Puedes incluir marcas como [Verse 1] y [Bridge].", preserveLyrics: "La IA debe conservar tus versos y completar las partes que faltan sin reescribir tu identidad.", createChorusDesc: "La IA analizará el tema, el mensaje y el sentimiento de la letra para crear solo el estribillo.", voiceReference: "Mi voz como referencia (opcional)", voiceReferenceDesc: "Canta tu idea, incluso con palabras incompletas, sílabas inventadas o tarareando. La herramienta estima el fraseo y el movimiento melódico para ayudar a encajar la letra.", recordingRepresents: "El fragmento grabado representa:", missingMelody: "La melodía de la parte que todavía falta crear", existingMelody: "Una parte de la letra que ya escribí/canté", sungWords: "Palabras que canté (opcional)", recognizedWords: "La letra reconocida aparecerá aquí. También puedes corregirla o escribirla manualmente.", whisperModel: "Modelo Whisper", baseLight: "Base — más ligero", smallAccurate: "Small — más preciso", transcribe: "Transcribir letra del audio", transcribing: "Transcribiendo…", importAudio: "Importar audio", recordMelody: "Grabar melodía", stopRecording: "Detener grabación", removeReference: "Eliminar referencia", analyzingLocal: "Analizando audio localmente…", referenceReady: "Referencia lista:", privacyNote: "Privacidad: el análisis melódico permanece en el navegador. Si solicitas la transcripción, el audio se procesa únicamente con Whisper instalado en este equipo (CPU), sin servicios externos, y se elimina después del procesamiento. Whisper puede equivocarse con palabras cantadas o no reconocer sílabas inventadas; revisa la letra. La transcripción no crea subtítulos ni marcas de tiempo.", theme: "Tema o historia", extraGuidance: "Orientación adicional (opcional)", themePlaceholder: "Ej.: un padre que enseña a su hijo a pescar y recuerda su propia infancia", guidancePlaceholder: "Ej.: haz que el estribillo sea más emotivo, sencillo y fácil de recordar", genre: "Género musical", mood: "Ambiente / sentimiento", voiceChoice: "Voz", voiceNeutral: "indiferente", voiceMasculine: "masculina", voiceFeminine: "femenina", duet: "dúo", approxDuration: "Duración aproximada", oneMinute: "1 minuto", oneHalf: "1 minuto y medio", twoMinutes: "2 minutos", twoHalf: "2 minutos y medio", threeMinutes: "3 minutos", fourMinutes: "4 minutos", fiveMinutes: "5 minutos", fullCreate: "Crear canción completa", continueCreate: "Continuar mi composición", chorusCreate: "Crear solo el estribillo", chorusResult: "Estribillo generado — puedes editarlo", resultEdit: "Resultado — puedes editarlo antes de usarlo", useLyrics: "Usar esta letra para crear música", songLanguage: "Idioma de la canción" }, body: JSON.stringify(body) });

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

function VoiceModal({ track, onClose, onGo, language = "pt" }) {
  const tx = (key) => uiText(language, key);
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
            <h2 className="text-lg font-bold">{tx("singOver")}</h2>
            <p className="text-xs text-zinc-400 mt-1">
              {tx("singDesc")} “{track.title}”? {tx("singDesc2")}
            </p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X size={20} /></button>
        </div>

        <button
          onClick={() => inputRef.current.click()}
          className="w-full rounded-xl border border-dashed border-white/20 py-4 text-sm text-zinc-300 hover:border-pink-500/60"
        >
          {file ? `✔ ${file.name}` : tx("chooseVoice")}
        </button>
        <input ref={inputRef} type="file" accept="audio/*" className="hidden" onChange={(e) => setFile(e.target.files[0] || null)} />

        <div>
          <p className="text-xs font-semibold text-zinc-300 mb-2">{tx("instrumentChoices")}</p>
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
          <p className="text-xs font-semibold text-zinc-300 mb-2">{tx("styleOriginal")}</p>
          <textarea rows={2} className={inputCls} value={style} onChange={(e) => setStyle(e.target.value)} />
          <div className="grid grid-cols-2 gap-3 mt-3">
            <input className={inputCls} type="number" placeholder={language === "en" ? "BPM (optional)" : language === "es" ? "BPM (opcional)" : "BPM (opcional)"} value={bpm} onChange={(e) => setBpm(e.target.value)} />
            <select className={inputCls} value={key} onChange={(e) => setKey(e.target.value)}>
              {KEYS.map((k) => <option key={k} value={k}>{k || tx("autoKey")}</option>)}
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
          <input type="checkbox" checked={autoSep} onChange={(e) => setAutoSep(e.target.checked)} />
          {tx("autoBand")}
        </label>

        <button
          disabled={!file || picked.length === 0}
          onClick={() => onGo({ file, instruments: picked, style, bpm, key, autoSep })}
          className="w-full rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 py-3 font-bold text-white disabled:opacity-40"
        >
          {tx("createBand")}
        </button>
        <p className="text-[11px] text-zinc-500">
          {tx("firstModel")}
        </p>
      </div>
    </div>
  );
}

// Legenda (SRT e LRC) de uma música: usa a voz separada e a letra salva, ou uma gravação sua
function LegendaModal({ track, tracks, onClose, language = "pt" }) {
  const tx = (key) => uiText(language, key);
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
    if (!letra.trim()) { setMsg(language === "en" ? "The lyrics are empty." : language === "es" ? "La letra está vacía." : "A letra está vazia."); return; }
    if (modo === "whisper" && !whisper) { setMsg(language === "en" ? "Whisper is not installed. Run instalar.bat again and reopen the app." : language === "es" ? "Whisper no está instalado. Ejecuta instalar.bat otra vez y vuelve a abrir el programa." : "O Whisper não está instalado. Rode o instalar.bat de novo e abra o programa outra vez."); return; }
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
        setMsg(s.msg || tx("working"));
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
            <h2 className="text-lg font-bold">{tx("lyricsCaption")}</h2>
            <p className="text-xs text-zinc-400 mt-1">{tx("captionDesc")} “{track.title}”.</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X size={20} /></button>
        </div>

        <div className="rounded-xl border border-white/10 p-3 text-xs text-zinc-300">
          <div className="font-semibold text-white mb-1">{tx("audioUsed")}</div>
          {outro ? `${language === "en" ? "Your file" : language === "es" ? "Tu archivo" : "Seu arquivo"}: ${outro.name}` : `${fonte.title}${voz ? (language === "en" ? " (separated vocals, better result)" : language === "es" ? " (voz separada, mejor resultado)" : " (voz separada, melhor resultado)") : (language === "en" ? " (full song)" : language === "es" ? " (canción completa)" : " (música inteira)")}`}
          {!outro && !voz && (
            <div className="mt-1 text-amber-300">{language === "en" ? "Results are usually worse without separated vocals. Close this window and use “Separate vocals and instrumental” first." : language === "es" ? "El resultado suele ser peor sin la voz separada. Cierra esta ventana y usa primero “Separar voz e instrumental”." : "Sem a voz separada o resultado costuma ser pior. Feche esta janela e use “Separar voz e instrumental” antes."}</div>
          )}
          <div className="mt-2">
            <button onClick={() => inputRef.current.click()} className="underline text-pink-300">{tx("useRecording")}</button>
            {outro && <button onClick={() => setOutro(null)} className="ml-3 underline text-zinc-400">{tx("backToTrack")}</button>}
            <input ref={inputRef} type="file" accept="audio/*" className="hidden" onChange={(e) => setOutro(e.target.files[0] || null)} />
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-zinc-300 mb-2">{tx("lyricsLines")}</p>
          <textarea rows={7} className={inputCls} value={letra} onChange={(e) => setLetra(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <select className={inputCls} value={modo} onChange={(e) => setModo(e.target.value)}>
            <option value="rapido">{tx("fastMode")}</option>
            <option value="whisper">{tx("whisperMode")}</option>
          </select>
          <label className="flex items-center gap-2 text-zinc-300">
            {tx("charsCaption")}
            <input type="number" min={15} max={120} value={maxc} onChange={(e) => setMaxc(e.target.value)} className="w-16 rounded-lg bg-zinc-900 border border-white/10 px-2 py-1.5" />
          </label>
          {modo === "whisper" && (
            <select className={inputCls} value={modelo} onChange={(e) => setModelo(e.target.value)}>
              <option value="base">{tx("whisperBase")}</option>
              <option value="small">{tx("whisperSmall")}</option>
            </select>
          )}
        </div>
        <p className="text-[11px] text-zinc-500">
          {tx("captionTip")}
          {modo === "whisper" && (whisper ? (language === "en" ? " Whisper installed." : language === "es" ? " Whisper instalado." : " Whisper instalado.") : (language === "en" ? " Whisper is not installed yet: run instalar.bat again." : language === "es" ? " Whisper aún no está instalado: ejecuta instalar.bat otra vez." : " Whisper ainda não instalado: rode o instalar.bat de novo."))}
        </p>

        <button
          onClick={gerar}
          disabled={ocupado}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 py-3 font-bold text-white disabled:opacity-50"
        >
          {ocupado ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />} {ocupado ? tx("working") : tx("makeCaption")}
        </button>
        {msg && <div className={`rounded-lg border p-3 text-xs break-words ${ocupado ? "border-white/10 text-zinc-300" : "border-red-500/30 bg-red-500/10 text-red-200"}`}>{msg}</div>}

        {res && (
          <div className="space-y-3">
            <div className="text-xs text-zinc-400">
              {res.info.legendas} {language === "en" ? "lines" : language === "es" ? "líneas" : "linhas"} • {language === "en" ? "mode" : language === "es" ? "modo" : "modo"} {res.info.modo === "whisper" ? tx("whisperMode") : tx("fastMode")} •{" "}
              {res.info.modo === "whisper" ? `${Math.round(res.info.confianca * 100)}% ${language === "en" ? "of words matched" : language === "es" ? "de las palabras coincidieron" : "das palavras casaram"}` : `${language === "en" ? "alignment quality" : language === "es" ? "calidad de sincronización" : "qualidade do encaixe"} ${Math.round(res.info.confianca * 100)}%`}
            </div>
            {res.avisos.map((a, i) => <div key={i} className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-200">{a}</div>)}
            <textarea readOnly rows={8} className={`${inputCls} font-mono text-xs`} value={res.srt} />
            <div className="flex flex-wrap gap-2">
              <button onClick={() => baixar(res.srt, "srt")} className="rounded-lg bg-white px-4 py-2 text-xs font-bold text-black">{tx("downloadSrt")}</button>
              <button onClick={() => baixar(res.lrc, "lrc")} className="rounded-lg border border-white/20 px-4 py-2 text-xs font-bold">{tx("downloadLrc")}</button>
              <button onClick={() => navigator.clipboard.writeText(res.srt).catch(() => {})} className="rounded-lg border border-white/20 px-4 py-2 text-xs font-bold">{tx("copy")}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


// Analisa uma amostra curta no próprio navegador. O áudio bruto não é enviado à IA.
async function analyzeMelodyReference(file, language = "pt") {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) throw new Error(language === "en" ? "This browser does not support compatible audio analysis." : language === "es" ? "Este navegador no admite análisis de audio compatible." : "Este navegador não oferece análise de áudio compatível.");
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
    let contour = language === "en" ? "could not be estimated reliably" : language === "es" ? "no se pudo estimar con fiabilidad" : "não foi possível estimar com confiança";
    let range = "";
    if (pitches.length >= 4) {
      const center = median(pitches);
      const steps = pitches.map((p) => p - center);
      const groups = steps.map((v) => v < -2 ? (language === "en" ? "low" : language === "es" ? "grave" : "grave") : v > 2 ? (language === "en" ? "high" : language === "es" ? "agudo" : "agudo") : (language === "en" ? "mid" : language === "es" ? "medio" : "médio"));
      const compact = [];
      for (const group of groups) if (compact[compact.length - 1] !== group) compact.push(group);
      contour = compact.slice(0, 12).join(" → ");
      range = `${language === "en" ? "approximate range of" : language === "es" ? "rango aproximado de" : "variação aproximada de"} ${Math.round(Math.max(...pitches) - Math.min(...pitches))} ${language === "en" ? "semitones" : language === "es" ? "semitonos" : "semitons"}`;
    }
    const avg = envelope.reduce((a, b) => a + b, 0) / Math.max(1, envelope.length);
    const variance = envelope.reduce((a, b) => a + (b - avg) ** 2, 0) / Math.max(1, envelope.length);
    const dynamics = Math.sqrt(variance) > avg * 0.55 ? (language === "en" ? "varied dynamics, with changes in intensity" : language === "es" ? "dinámica variada, con cambios de intensidad" : "dinâmica variada, com mudanças de intensidade") : (language === "en" ? "relatively steady dynamics" : language === "es" ? "dinámica relativamente constante" : "dinâmica relativamente constante");
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
      ? (language === "en" ? "approximate vocal phrases: " : language === "es" ? "frases vocales aproximadas: " : "frases vocais aproximadas: ") + phraseDurations.length + (language === "en" ? ", average duration " : language === "es" ? ", duración media " : ", duração média ") + (phraseDurations.reduce((a,b)=>a+b,0)/phraseDurations.length).toFixed(1) + " s, " + (language === "en" ? "pauses detected: " : language === "es" ? "pausas detectadas: " : "pausas detectadas: ") + Math.max(0, phraseDurations.length - 1)
      : (language === "en" ? "could not separate phrases and pauses reliably" : language === "es" ? "no fue posible separar frases y pausas con fiabilidad" : "não foi possível separar frases e pausas com confiança");
    const tempoText = bestTempo && bestScore > 0.12 ? (language === "en" ? `estimated pulse around ${bestTempo} BPM (automatic estimate)` : language === "es" ? `pulso estimado alrededor de ${bestTempo} BPM (estimación automática)` : `pulso estimado em torno de ${bestTempo} BPM (estimativa automática)`) : (language === "en" ? "pulse not identified reliably" : language === "es" ? "pulso no identificado con fiabilidad" : "pulso não identificado com confiança");
    const summary = [
      `${language === "en" ? "Analyzed duration" : language === "es" ? "Duración analizada" : "Duração analisada"}: ${seconds.toFixed(1)} ${language === "en" ? "seconds" : language === "es" ? "segundos" : "segundos"}.`,
      tempoText + ".",
      phraseText + ".",
      `${language === "en" ? "Dynamics" : language === "es" ? "Dinámica" : "Dinâmica"}: ${dynamics}.`,
      `${language === "en" ? "Approximate pitch contour" : language === "es" ? "Contorno de altura aproximado" : "Contorno de altura aproximado"}: ${contour}.`,
      range ? `${language === "en" ? "Estimated range" : language === "es" ? "Tesitura estimada" : "Tessitura estimada"}: ${range}.` : "",
      language === "en" ? "All measurements are approximate; use them as phrasing guidance, not as an exact transcription of notes." : language === "es" ? "Todas las medidas son aproximadas; úsalas como orientación del fraseo, no como transcripción exacta de notas." : "Todas as medidas são aproximadas; use como orientação de fraseado, não como transcrição exata de notas."
    ].filter(Boolean).join(" ");
    return { summary, seconds, tempo: bestTempo && bestScore > 0.12 ? bestTempo : null, contour };
  } finally {
    await context.close().catch(() => {});
  }
}

function CompositorPanel({ onUseLyrics, uiLanguage = "pt" }) {
  const tx = (key) => uiText(uiLanguage, key);
  const panelLanguageLabel = tx("songLanguage");
  const [operationStartedAt, setOperationStartedAt] = useState(null);
  const [operationTick, setOperationTick] = useState(0);
  useEffect(() => {
    if (!operationStartedAt) return undefined;
    const timer = setInterval(() => setOperationTick((n) => n + 1), 1000);
    return () => clearInterval(timer);
  }, [operationStartedAt]);
  const operationElapsed = operationStartedAt ? Math.floor((Date.now() - operationStartedAt) / 1000) : 0;
  const [catalog, setCatalog] = useState({ runtimes: [], models: [], installed_models: [] });
  const [status, setStatus] = useState({});
  const [providerConfig, setProviderConfig] = useState({ providers: [], secure_storage_available: false });
  const [provider, setProvider] = useState("local");
  const [providerModel, setProviderModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [providerBusy, setProviderBusy] = useState(false);
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
  const [transcriptionBusy, setTranscriptionBusy] = useState(false);
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
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  // O mesmo relógio acompanha instalação, download, ativação, análise, transcrição e composição.
  useEffect(() => {
    const operationBusy = busy || providerBusy || melodyBusy || transcriptionBusy;
    if (operationBusy && !operationStartedAt) {
      setOperationStartedAt(Date.now());
      setOperationTick(0);
    } else if (!operationBusy && operationStartedAt) {
      setOperationStartedAt(null);
    }
  }, [busy, providerBusy, melodyBusy, transcriptionBusy, operationStartedAt]);

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
    setProviderBusy(true); setError(""); setMessage("Salvando a chave no cofre seguro do sistema…");
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
    setMelodyBusy(true); setError(""); setMessage("Analisando a referência musical no navegador…");
    try {
      const analysis = await analyzeMelodyReference(file, uiLanguage);
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
    setTranscriptionBusy(true); setTranscriptionMessage("Preparando o áudio para o Whisper…"); setError("");
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
    setBusy(true); setOperationStartedAt(Date.now()); setOperationTick(0); setError(""); setMessage(provider === "local" ? "Compondo a letra localmente…" : "Enviando solicitação ao provedor escolhido…"); setResult("");
    try {
      const r = await jsonPost("/api/ai/generate-lyrics", { mode: compositionMode, provider, provider_model: providerModel, source_lyrics: sourceLyrics, theme, genre, mood, voice, duration, language, melody_reference: melodyAnalysis?.summary || "", melody_role: melodyRole, melody_words: melodyWords });
      setResult(r.lyrics);
      const labels = { full: "Música completa criada", continue: "Composição continuada", chorus: "Refrão criado" };
      setMessage((labels[compositionMode] || "Composição concluída") + " com " + r.model + ".");
    } catch (e) { setError(e.message); }
    finally { setBusy(false); setOperationStartedAt(null); }
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
        <h1 className="text-2xl font-black">{tx("composerTitle")}</h1>
        <p className="mt-1 text-sm text-zinc-400">{tx("composerIntro")}</p>
      </div>

      {(error || message) && (
        <div className={error ? "rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200" : "rounded-xl border border-sky-500/20 bg-sky-500/5 p-3 text-sm text-sky-200"}>
          {error || message}
          {operationStartedAt && (
            <p className="mt-2 flex items-center gap-2 border-t border-white/10 pt-2 font-mono text-xs text-zinc-300">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-pink-400" />
              {uiLanguage === "en" ? "Elapsed time" : uiLanguage === "es" ? "Tiempo transcurrido" : "Tempo decorrido"}: {mmss(operationElapsed)}
            </p>
          )}
        </div>
      )}

      <section className="rounded-2xl border border-white/5 bg-[#111116] p-5 space-y-4">
        <div><h2 className="font-bold">{tx("aiStep1")}</h2><p className="mt-1 text-xs text-zinc-400">{tx("aiStep1Desc")}</p></div>
        <label className="block text-xs font-semibold text-zinc-300">{tx("aiMode")}
          <select className={inputCls + " mt-1"} value={provider} onChange={(e) => { setProvider(e.target.value); const p = providerConfig.providers.find((x) => x.id === e.target.value); setProviderModel(p?.models?.[0] || ""); }}>
            <option value="local">{tx("localGemma")}</option>
            {providerConfig.providers.map((p) => <option key={p.id} value={p.id}>{p.name} {p.configured ? `— ${tx("keySaved")}` : `— ${tx("keySetup")}`}</option>)}
          </select>
        </label>
        {provider !== "local" && <>
          <label className="block text-xs font-semibold text-zinc-300">{tx("providerModel")}
            <input className={inputCls + " mt-1"} value={providerModel} onChange={(e) => setProviderModel(e.target.value)} list="provider-model-options" placeholder={tx("providerModelPlaceholder")}/>
            <datalist id="provider-model-options">{(providerConfig.providers.find((p) => p.id === provider)?.models || []).map((m) => <option key={m} value={m}/>)}</datalist>
          </label>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-3">
            <p className="text-xs text-zinc-300">{providerConfig.providers.find((p) => p.id === provider)?.configured ? tx("apiKeyAlready") : tx("apiKeyNeeded")}</p>
            <input type="password" autoComplete="new-password" className={inputCls} value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={tx("apiKeyPlaceholder")}/>
            <div className="flex flex-wrap gap-2">
              <button disabled={providerBusy || !apiKey.trim() || !providerConfig.secure_storage_available} onClick={saveProviderKey} className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-black disabled:opacity-40">{tx("saveSecure")}</button>
              <button disabled={providerBusy || !providerConfig.providers.find((p) => p.id === provider)?.configured} onClick={removeProviderKey} className="rounded-lg border border-white/15 px-3 py-2 text-xs">{tx("removeKey")}</button>
            </div>
            {!providerConfig.secure_storage_available && <p className="text-xs text-amber-200">{tx("secureUnavailable")}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <button disabled={providerBusy || !providerModel} onClick={saveProviderChoice} className="rounded-lg bg-pink-500 px-3 py-2 text-xs font-bold text-white">{tx("useProvider")}</button>
            <button disabled={providerBusy || !providerConfig.providers.find((p) => p.id === provider)?.configured || !providerModel} onClick={testProvider} className="rounded-lg border border-white/15 px-3 py-2 text-xs">{tx("testConnection")}</button>
          </div>
          <p className="text-[11px] text-zinc-500">{tx("secureKeyNote")}</p>
        </>}
      </section>

      <section className="rounded-2xl border border-white/5 bg-[#111116] p-5 space-y-4">
        <h2 className="font-bold">{tx("localEngine")}</h2>
        {compatibleRuntimes.length ? (
          <>
            <label className="block text-xs font-semibold text-zinc-300">{tx("compatiblePackage")}</label>
            <select className={inputCls} value={runtime} onChange={(e) => setRuntime(e.target.value)}>
              {compatibleRuntimes.map((r) => <option key={r.id} value={r.id}>{r.label} {r.installed ? `— ${tx("installed")}` : `— ${(r.size_bytes / 1024 / 1024).toFixed(0)} MB`}</option>)
            </select>
            <div className="flex flex-wrap items-center gap-3">
              <button disabled={busy || !runtime || runtimeInstalled} onClick={installRuntime} className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-black disabled:opacity-40">
                {runtimeInstalled ? tx("runtimeInstalled") : tx("installRuntime")}
              </button>
              {runtimeInstalled && <span className="text-xs text-emerald-300">{tx("shaVerified")}</span>}
            </div>
            {selectedRuntime?.backend !== "cpu" && (
              <label className="block max-w-xs text-xs text-zinc-300">
                {tx("gpuLayers")}
                <input type="number" min="0" max="200" value={gpuLayers} onChange={(e) => setGpuLayers(e.target.value)} className={inputCls + " mt-1"} />
              </label>
            )}
            <p className="text-xs text-zinc-500">{tx("cpuNote")}</p>
          </>
        ) : <p className="text-sm text-amber-200">{tx("noRuntime")}</p>}
      </section>

      <section className="rounded-2xl border border-white/5 bg-[#111116] p-5 space-y-4">
        <h2 className="font-bold">{tx("localModel")}</h2>
        <label className="block text-xs font-semibold text-zinc-300">{tx("modelCatalog")}</label>
        <select className={inputCls} value={model} onChange={(e) => setModel(e.target.value)}>
          {catalog.models.map((m) => <option key={m.id} value={m.id}>{m.name} {m.installed ? `— ${tx("installed")}` : `— approx. ${m.approx_size_gb} GB`}</option>)}
          {catalog.installed_models.filter((m) => !catalog.models.some((c) => c.id === m.id)).map((m) => <option key={m.id} value={m.id}>{m.name} — {tx("imported")}</option>)}
        </select>
        {selectedModel && <div className="rounded-xl bg-white/[0.03] p-3 text-xs text-zinc-400">
          <p>{selectedModel.description}</p>
          <p className="mt-2">{tx("license")} <b className="text-zinc-200">{selectedModel.license}</b> · <a className="underline" href={selectedModel.license_url} target="_blank" rel="noreferrer">{tx("viewLicense")}</a> · <a className="underline" href={selectedModel.model_url} target="_blank" rel="noreferrer">{tx("officialSource")}</a></p>
        </div>}
        {selectedModel?.requires_license_acceptance && (
          <label className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-100">
            <input type="checkbox" checked={gemmaAccepted} onChange={(e) => setGemmaAccepted(e.target.checked)} className="mt-0.5" />
            <span>{tx("acceptGemma")}</span>
          </label>
        )}
        <div className="flex flex-wrap gap-2">
          <button disabled={busy || installedSelected || !selectedModel || (selectedModel.requires_license_acceptance && !gemmaAccepted)} onClick={downloadModel} className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-bold disabled:opacity-40">{installedSelected ? tx("modelInstalled") : tx("downloadModel")}</button>
          <label className="cursor-pointer rounded-xl border border-white/15 px-4 py-2.5 text-sm font-bold hover:bg-white/5">
            {tx("importGguf")}
            <input type="file" accept=".gguf" className="hidden" disabled={busy} onChange={(e) => { importModel(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
          <button disabled={busy || !runtimeInstalled || !installedSelected} onClick={activate} className="rounded-xl bg-pink-500 px-4 py-2.5 text-sm font-black text-white disabled:opacity-40">{tx("activateModel")}</button>
          {status.runtime_running && <button disabled={busy} onClick={async () => { setBusy(true); try { await http("/api/ai/runtime/stop", { method: "POST" }); await refresh(); setMessage(uiLanguage === "en" ? "Engine stopped." : uiLanguage === "es" ? "Motor detenido." : "Motor encerrado."); } catch (e) { setError(e.message); } finally { setBusy(false); } }} className="rounded-xl border border-white/15 px-4 py-2.5 text-sm">{tx("stopAI")}</button>}
        </div>
        <p className="text-xs text-zinc-500">{tx("importNote")}</p>
      </section>

      <section className="rounded-2xl border border-white/5 bg-[#111116] p-5 space-y-4">
        <div><h2 className="font-bold">{tx("assistant")}</h2><p className="mt-1 text-xs text-zinc-400">{tx("assistantDesc")}</p></div>
        <div className="grid gap-2 sm:grid-cols-3">
          {[{id:"full",title:tx("fullSong"),desc:tx("fullSongDesc")},{id:"continue",title:tx("continueSong"),desc:tx("continueSongDesc")},{id:"chorus",title:tx("chorusOnly"),desc:tx("chorusDesc")}].map((item)=>(
            <button key={item.id} type="button" onClick={()=>{setCompositionMode(item.id);setResult("");setError("");}}
              className={`rounded-xl border p-3 text-left transition ${compositionMode===item.id?"border-pink-500 bg-pink-500/10":"border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"}`}>
              <span className="block text-sm font-bold text-white">{item.title}</span><span className="mt-1 block text-[11px] leading-relaxed text-zinc-400">{item.desc}</span>
            </button>
          ))}
        </div>
        {compositionMode!=="full"&&<div>
          <label className="mb-1.5 block text-xs font-semibold text-zinc-300">{compositionMode==="continue" ? tx("yourLyricsKeep") : tx("yourLyricsChorus")}</label>
          <textarea rows={9} className={inputCls} value={sourceLyrics} onChange={(e)=>setSourceLyrics(e.target.value)} placeholder={tx("pasteLyrics")}/>
          <p className="mt-1 text-[11px] text-zinc-500">{compositionMode==="continue" ? tx("preserveLyrics") : tx("createChorusDesc")}</p>
        </div>}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
          <div>
            <p className="text-sm font-bold text-white">{tx("voiceReference")}</p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">{tx("voiceReferenceDesc")}</p>
          </div>
          <label className="block text-xs font-semibold text-zinc-300">{tx("recordingRepresents")}
            <select className={inputCls + " mt-1"} value={melodyRole} onChange={(e) => setMelodyRole(e.target.value)}>
              <option value="missing">{tx("missingMelody")}</option>
              <option value="existing">{tx("existingMelody")}</option>
            </select>
          </label>
          <label className="block text-xs font-semibold text-zinc-300">{tx("sungWords")}
            <textarea rows={3} className={inputCls + " mt-1"} value={melodyWords} onChange={(e) => setMelodyWords(e.target.value)} placeholder={tx("recognizedWords")}/>
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-[11px] text-zinc-400">{tx("whisperModel")}
              <select className={inputCls + " mt-1"} value={transcriptionModel} onChange={(e) => setTranscriptionModel(e.target.value)} disabled={transcriptionBusy}>
                <option value="base">{tx("baseLight")}</option>
                <option value="small">{tx("smallAccurate")}</option>
              </select>
            </label>
            <button type="button" disabled={!melodyFile || melodyBusy || transcriptionBusy || recording} onClick={transcribeMelodyReference} className="self-end rounded-lg bg-pink-500/15 border border-pink-500/40 px-3 py-2 text-xs font-semibold text-pink-100 disabled:opacity-40">
              {transcriptionBusy ? <><Loader2 size={14} className="inline animate-spin mr-1"/> {tx("transcribing")}</> : tx("transcribe")}
            </button>
          </div>
          {transcriptionMessage && <p className="text-[11px] text-sky-200">{transcriptionMessage}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={melodyBusy || recording} onClick={() => melodyInputRef.current?.click()} className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-zinc-200 disabled:opacity-40">{tx("importAudio")}</button>
            {!recording ? (
              <button type="button" disabled={melodyBusy} onClick={startMelodyRecording} className="inline-flex items-center gap-2 rounded-lg border border-pink-500/40 px-3 py-2 text-xs font-semibold text-pink-200 disabled:opacity-40"><Mic size={14}/> {tx("recordMelody")}</button>
            ) : (
              <button type="button" onClick={stopMelodyRecording} className="inline-flex items-center gap-2 rounded-lg bg-red-500/15 px-3 py-2 text-xs font-semibold text-red-200"><Pause size={14}/> {tx("stopRecording")}</button>
            )}
            {melodyFile && <button type="button" onClick={clearMelodyReference} className="rounded-lg border border-white/15 px-3 py-2 text-xs text-zinc-300">{tx("removeReference")}</button>}
            <input ref={melodyInputRef} type="file" accept="audio/*" className="hidden" onChange={(e)=>loadMelodyReference(e.target.files?.[0])}/>
          </div>
          {melodyBusy && <div className="flex items-center gap-2 text-xs text-zinc-300"><Loader2 size={14} className="animate-spin"/> {tx("analyzingLocal")}</div>}
          {melodyAnalysis && <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
            <p className="text-xs font-semibold text-emerald-200">{tx("referenceReady")} {melodyFile?.name || (uiLanguage === "en" ? "recording" : uiLanguage === "es" ? "grabación" : "gravação")}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-zinc-300">{melodyAnalysis.summary}</p>
          </div>}
          <p className="text-[11px] text-zinc-500">{tx("privacyNote")}</p>
        </div>
        <div><label className="mb-1.5 block text-xs font-semibold text-zinc-300">{compositionMode==="full" ? tx("theme") : tx("extraGuidance")}</label>
          <textarea rows={2} className={inputCls} value={theme} onChange={(e)=>setTheme(e.target.value)} placeholder={compositionMode==="full"?tx("themePlaceholder"):tx("guidancePlaceholder")}/>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-zinc-300">{tx("genre")}<input className={inputCls+" mt-1"} value={genre} onChange={(e)=>setGenre(e.target.value)}/></label>
          <label className="text-xs font-semibold text-zinc-300">{tx("mood")}<input className={inputCls+" mt-1"} value={mood} onChange={(e)=>setMood(e.target.value)}/></label>
          <label className="text-xs font-semibold text-zinc-300">{tx("voiceChoice")}<select className={inputCls+" mt-1"} value={voice} onChange={(e)=>setVoice(e.target.value)}><option>{tx("voiceNeutral")}</option><option>{tx("voiceMasculine")}</option><option>{tx("voiceFeminine")}</option><option>{tx("duet")}</option></select></label>
          <label className="text-xs font-semibold text-zinc-300">{panelLanguageLabel}<select className={inputCls+" mt-1"} value={language} onChange={(e)=>setLanguage(e.target.value)}><option value="português do Brasil">{uiLanguage==="en"?"Brazilian Portuguese":uiLanguage==="es"?"Portugués de Brasil":"Português do Brasil"}</option><option value="inglês">{uiLanguage==="en"?"English":uiLanguage==="es"?"Inglés":"Inglês"}</option><option value="espanhol">{uiLanguage==="en"?"Spanish":uiLanguage==="es"?"Español":"Espanhol"}</option></select></label>
          {compositionMode!=="chorus"&&<label className="text-xs font-semibold text-zinc-300">{tx("approxDuration")}<select className={inputCls+" mt-1"} value={duration} onChange={(e)=>setDuration(Number(e.target.value))}><option value={60}>{tx("oneMinute")}</option><option value={90}>{tx("oneHalf")}</option><option value={120}>{tx("twoMinutes")}</option><option value={150}>{tx("twoHalf")}</option><option value={180}>{tx("threeMinutes")}</option><option value={240}>{tx("fourMinutes")}</option><option value={300}>{tx("fiveMinutes")}</option></select></label>}
        </div>
        <button disabled={busy||(provider==="local"&&(!status.runtime_running||!status.active_model))||(provider!=="local"&&(!providerModel||!providerConfig.providers.find((p)=>p.id===provider)?.configured))||(compositionMode==="full"?!theme.trim():!sourceLyrics.trim())} onClick={generate} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 py-3.5 font-black text-white disabled:opacity-40">
          {busy?<Loader2 size={18} className="animate-spin"/>:<Sparkles size={18}/>}
          {compositionMode==="full" ? tx("fullCreate") : compositionMode==="continue" ? tx("continueCreate") : tx("chorusCreate")}
          {busy && <span className="ml-2 font-mono text-xs text-pink-100">{mmss(operationElapsed)}</span>}
        </button>
        {result&&<div className="space-y-3"><label className="block text-xs font-semibold text-zinc-300">{compositionMode==="chorus" ? tx("chorusResult") : tx("resultEdit")}</label>
          <textarea rows={18} className={inputCls} value={result} onChange={(e)=>setResult(e.target.value)}/>
          <button onClick={()=>onUseLyrics(result)} className="w-full rounded-xl bg-white px-4 py-3 font-black text-black">{tx("useLyrics")}</button>
        </div>}
      </section>
    </div>
  );
}

// ------------------------------------------------------------------ aplicativo
export default function App() {
  const [tab, setTab] = useState("criar");
  const [uiLanguage, setUiLanguage] = useState(() => {
    try { return localStorage.getItem("socialMusicBeat.language") || "pt"; } catch { return "pt"; }
  });
  const tx = (key) => uiText(uiLanguage, key);
  useEffect(() => {
    try { localStorage.setItem("socialMusicBeat.language", uiLanguage); } catch { /* armazenamento indisponível */ }
  }, [uiLanguage]);
  const [tracks, setTracks] = useState([]);
  const [online, setOnline] = useState(false);
  const [job, setJob] = useState(null);
  const [lastJob, setLastJob] = useState(null);
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
    const startedAt = Date.now();
    setLastJob(null);
    setJob({ title, phase: uiLanguage === "en" ? "Starting..." : uiLanguage === "es" ? "Iniciando..." : "Começando...", startedAt });
    const phase = (p) => setJob((j) => (j ? { ...j, phase: p } : j));
    let failed = false;
    try { await fn(phase); } catch (e) { failed = true; setErr(String(e.message || e)); }
    finally {
      setLastJob({ title, elapsed: Math.floor((Date.now() - startedAt) / 1000), failed });
      setJob(null);
    }
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
    if (!n) throw new Error(uiLanguage === "en" ? "The engine did not return any audio." : uiLanguage === "es" ? "El motor no devolvió ningún audio." : "O motor não devolveu nenhum áudio.");
  };

  const separateInto = async (t, titles, phase) => {
    const { job: jid } = await jsonPost("/api/separate", { file: t.file });
    for (;;) {
      await sleep(2000);
      const s = await http(`/api/jobs/${jid}`);
      phase(s.msg || "Separando...");
      if (s.status === "error") throw new Error(s.msg);
      if (s.status === "done") {
        const base = { createdAt: Date.now(), parent: t.id, style: t.style, lyrics: t.lyrics, bpm: t.bpm, key: t.key, language: t.language || form.lang };
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
      if (!form.instrumentalOnly && !form.lyrics.trim()) throw new Error(uiLanguage === "en" ? "Enter the lyrics (or choose “Instrumental only”)." : uiLanguage === "es" ? "Escribe la letra (o elige “Solo instrumental”)." : "Escreva a letra (ou escolha “Só instrumental”).");
      if (!form.style.trim()) throw new Error(uiLanguage === "en" ? "Describe the music style. You can also click the style buttons." : uiLanguage === "es" ? "Describe el estilo musical. También puedes usar los botones de estilos." : "Descreva o estilo da música. Dá para clicar nos botões de estilo.");
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
      phase(uiLanguage === "en" ? "Sending to the music engine..." : uiLanguage === "es" ? "Enviando al motor de música..." : "Enviando para o motor de música...");
      const id = await submitTask(params);
      phase(uiLanguage === "en" ? "Creating the song... (the first run takes longer)" : uiLanguage === "es" ? "Creando la canción... (la primera vez tarda más)" : "Criando a música... (na primeira vez demora mais)");
      const items = await waitResult(id);
      phase(uiLanguage === "en" ? "Saving..." : uiLanguage === "es" ? "Guardando..." : "Guardando...");
      await saveItems(items, (it, n, total) => {
        const m = it.metas || {};
        return {
          kind: form.instrumentalOnly ? "instrumental" : "song",
          title: total > 1 ? `${title} (${n})` : title,
          lyrics: form.instrumentalOnly ? "" : form.lyrics.trim(),
          language: form.lang,
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
      phase(uiLanguage === "en" ? "Preparing your voice..." : uiLanguage === "es" ? "Preparando tu voz..." : "Preparando a sua voz...");
      const { blob, seconds } = await toWavBlob(o.file);
      if (seconds < 10) throw new Error(uiLanguage === "en" ? "Your voice recording must be at least 10 seconds long." : uiLanguage === "es" ? "La grabación de tu voz debe durar al menos 10 segundos." : "O áudio da sua voz precisa ter pelo menos 10 segundos.");
      const params = {
        prompt: o.style.trim() || parent.style || "band accompaniment",
        lyrics: parent.lyrics || "",
        task_type: "complete",
        track_classes: o.instruments,
        model: BASE_MODEL,
        thinking: false,
        use_cot_caption: false,
        use_cot_language: false,
        vocal_language: parent.language || form.lang,
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
      phase(uiLanguage === "en" ? "Sending... (the engine switches models on first use and may take a few minutes)" : uiLanguage === "es" ? "Enviando... (la primera vez el motor cambia de modelo y puede tardar unos minutos)" : "Enviando... (na primeira vez o motor troca de modelo: pode levar alguns minutos)");
      const id = await submitTask(params, blob);
      phase(uiLanguage === "en" ? "Creating the band for your voice..." : uiLanguage === "es" ? "Creando la banda para tu voz..." : "Criando a banda para a sua voz...");
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
    if (!window.confirm(`${tx("deleteConfirm")} “${t.title}”? ${uiLanguage === "en" ? "This deletes the file." : uiLanguage === "es" ? "Esto elimina el archivo." : "Isso apaga o arquivo."}`)) return;
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
        <div className="mb-4 px-2">
          <img src="./logo.png" alt="Social Music Beat" className="w-full h-auto select-none" draggable="false" />
        </div>
        <label className="mb-3 block px-2 text-xs font-semibold text-zinc-400">
          {tx("language")}
          <select aria-label={tx("language")} value={uiLanguage} onChange={(e) => setUiLanguage(e.target.value)} className={inputCls + " mt-1"}>
            <option value="pt">🇧🇷 Português do Brasil</option>
            <option value="en">🇺🇸 English</option>
            <option value="es">🇪🇸 Español</option>
          </select>
        </label>
        {[
          { id: "criar", label: tx("create"), icon: <Sparkles size={16} /> },
          { id: "compositor", label: tx("composer"), icon: <Music size={16} /> },
          { id: "ajuda", label: tx("help"), icon: <HelpCircle size={16} /> },
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
        <div className="flex items-center justify-between gap-3 border-b border-white/5 px-4 py-3 md:hidden">
          <span className="text-xs font-semibold text-zinc-400">{tx("language")}</span>
          <select aria-label={tx("language")} value={uiLanguage} onChange={(e) => setUiLanguage(e.target.value)} className="max-w-[210px] rounded-lg border border-white/10 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-100">
            <option value="pt">🇧🇷 Português do Brasil</option>
            <option value="en">🇺🇸 English</option>
            <option value="es">🇪🇸 Español</option>
          </select>
        </div>
        {job && (
          <div role="status" aria-live="polite" className="mx-4 mt-4 flex items-center gap-4 rounded-2xl border border-pink-500/30 bg-pink-500/5 p-4">
            <Loader2 className="animate-spin text-pink-400" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-bold">{job.title}</div>
              <div className="text-xs text-zinc-400">{job.phase}</div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-500">{tx("elapsed")}</div>
            </div>
            <div className="font-mono text-lg text-pink-300">{mmss(elapsed)}</div>
          </div>
        )}
        {!job && lastJob && (
          <div role="status" className={`mx-4 mt-4 flex items-center justify-between gap-3 rounded-xl border p-3 text-sm ${lastJob.failed ? "border-red-500/20 bg-red-500/5 text-red-200" : "border-emerald-500/20 bg-emerald-500/5 text-emerald-200"}`}>
            <span className="min-w-0 truncate">{lastJob.failed ? tx("operationInterrupted") : tx("operationDone")} · {lastJob.title}</span>
            <span className="shrink-0 font-mono">{mmss(lastJob.elapsed)}</span>
          </div>
        )}
        {!online && (
          <div className="m-4 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <div>{tx("onlineWait")}</div>
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
            <h1 className="text-2xl font-black text-white">{tx("helpTitle")}</h1>
            <p><b className="text-white">1. {tx("helpStep1")}</b> {tx("helpCreate")}</p>
            <p><b className="text-white">2. {tx("helpStep2")}</b> {tx("helpSeparate")}</p>
            <p><b className="text-white">3. {tx("helpStep3")}</b> {tx("helpSing")}</p>
            <p><b className="text-white">4. {tx("helpStep4")}</b> {tx("helpBand")}</p>
            <p className="text-zinc-500">{tx("helpKeep")}</p>
          </div>
        ) : tab === "compositor" ? (
          <CompositorPanel uiLanguage={uiLanguage} onUseLyrics={(output) => {
            const title = output.match(/^(?:TÍTULO|TITLE):\s*(.+)$/im)?.[1]?.trim() || "";
            const style = output.match(/^(?:ESTILO|STYLE):\s*(.+)$/im)?.[1]?.trim() || "";
            const blocks = output.split(/\n(?:LETRA|LYRICS):\s*\n?/i);
            const lyrics = blocks[1]?.split(/\nESTILO INSTRUMENTAL\s*:/i)[0]?.trim() || output;
            const duration = Number(output.match(/Duração em segundos:\s*(\d+)/i)?.[1] || output.match(/Duration in seconds:\s*(\d+)/i)?.[1] || output.match(/Duración en segundos:\s*(\d+)/i)?.[1] || 0);
            setForm((f) => ({
              ...f,
              lyrics,
              title: title || f.title,
              style: style || f.style,
              duration: duration >= 30 && duration <= 240 ? duration : f.duration,
              instrumentalOnly: false,
              lang: /^TITLE:/im.test(output) ? "en" : /^CONFIGURACIÓN:/im.test(output) ? "es" : /^CONFIGURAÇÕES:/im.test(output) ? "pt" : f.lang
            }));
            setTab("criar");
          }} />
        ) : (
          <div className="grid gap-6 p-4 lg:p-6 lg:grid-cols-[430px_1fr]">
            {/* ---------------- formulário ---------------- */}
            <section className="rounded-2xl border border-white/5 bg-[#111116] p-5 space-y-5 h-fit">
              <div className="flex items-center justify-between">
                <h1 className="text-lg font-black">{tx("createMusic")}</h1>
                <Seg
                  value={form.instrumentalOnly ? "inst" : "voz"}
                  onChange={(v) => set("instrumentalOnly", v === "inst")}
                  options={[{ v: "voz", label: tx("withVoice") }, { v: "inst", label: tx("instrumentalOnly") }]}
                />
              </div>

              {!form.instrumentalOnly && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-zinc-300">{tx("lyrics")}</label>
                  <textarea
                    rows={10}
                    className={inputCls}
                    placeholder={uiLanguage === "en" ? "[Verse 1]\nWrite your lyrics here...\n\n[Chorus]\nYour chorus goes here..." : uiLanguage === "es" ? "[Verse 1]\nEscribe tu letra aquí...\n\n[Chorus]\nAquí va el estribillo..." : "[Verse 1]\nEscreva a sua letra aqui...\n\n[Chorus]\nO refrão vai aqui..."}
                    value={form.lyrics}
                    onChange={(e) => set("lyrics", e.target.value)}
                  />
                  <p className="mt-1 text-[11px] text-zinc-500">{tx("lyricsHint")}</p>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-300">{tx("style")}</label>
                <textarea
                  rows={3}
                  className={inputCls}
                  placeholder={tx("stylePlaceholder")}
                  value={form.style}
                  onChange={(e) => set("style", e.target.value)}
                />
                <div className="mt-2">
                  <p className="mb-2 text-[11px] text-zinc-400">{tx("styleHint")}</p>
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
                  <span className="text-xs font-semibold text-zinc-300">{tx("voice")}</span>
                  <Seg
                    value={form.voiceKind}
                    onChange={(v) => set("voiceKind", v)}
                    options={[{ v: "auto", label: tx("voiceAuto") }, { v: "female", label: tx("voiceFemale") }, { v: "male", label: tx("voiceMale") }]}
                  />
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-300">{tx("titleOptional")}</label>
                <input className={inputCls} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder={tx("mySong")} />
              </div>

              <button onClick={() => setShowAdv((s) => !s)} className="text-xs font-semibold text-zinc-400 hover:text-white">
                {showAdv ? "▾" : "▸"} {tx("advanced")}
              </button>
              {showAdv && (
                <div className="space-y-4 rounded-xl border border-white/5 p-4">
                  <div>
                    <div className="flex justify-between text-xs text-zinc-300">
                      <span>{tx("duration")}</span><span>{mmss(form.duration)}</span>
                    </div>
                    <input type="range" min={30} max={240} step={10} value={form.duration} onChange={(e) => set("duration", Number(e.target.value))} className="w-full" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input className={inputCls} type="number" placeholder={tx("bpmAuto")} value={form.bpm} onChange={(e) => set("bpm", e.target.value)} />
                    <select className={inputCls} value={form.key} onChange={(e) => set("key", e.target.value)}>
                      {KEYS.map((k) => <option key={k} value={k}>{k || tx("autoKey")}</option>)}
                    </select>
                    <label className="text-xs font-semibold text-zinc-300">{tx("lyricsLanguage")}
                      <select className={inputCls + " mt-1"} value={form.lang} onChange={(e) => set("lang", e.target.value)}>
                        <option value="pt">{tx("lyricsPt")}</option>
                        <option value="en">{tx("lyricsEn")}</option>
                        <option value="es">{tx("lyricsEs")}</option>
                      </select>
                    </label>
                    <select className={inputCls} value={form.versions} onChange={(e) => set("versions", Number(e.target.value))}>
                      <option value={1}>{tx("versions1")}</option>
                      <option value={2}>{tx("versions2")}</option>
                    </select>
                  </div>
                </div>
              )}

              <button
                onClick={createSong}
                disabled={busy || !online}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 py-3.5 text-base font-black text-white shadow-lg shadow-pink-500/20 disabled:opacity-40"
              >
                {busy ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />} {tx("createButton")}
              </button>
            </section>

            {/* ---------------- lista de músicas ---------------- */}
            <section className="min-w-0 space-y-3">
              <h2 className="text-sm font-black uppercase tracking-widest text-zinc-400">{tx("library")} ({tracks.length})</h2>

              {tracks.length === 0 && !job && (
                <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-zinc-500">
                  <Music className="mx-auto mb-3" />
                  {tx("emptyLibrary")}
                </div>
              )}

              {tracks.map((t) => {
                const playing = player?.id === t.id;
                return (
                  <div key={t.id} className={`flex flex-wrap items-center gap-4 rounded-2xl border p-3 ${playing ? "border-pink-500/40 bg-white/5" : "border-white/5 bg-[#111116]"}`}>
                    <button
                      onClick={() => setPlayer({ id: t.id, title: t.title, url: t.file })}
                      className={`relative flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${KIND_COLOR[t.kind] || KIND_COLOR.song}`}
                      title={tx("listen")}
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
                          <Scissors size={14} /> {tx("separate")}
                        </button>
                      )}
                      {(t.kind === "song" || t.kind === "banda" || t.kind === "voz") && t.lyrics && (
                        <button onClick={() => setLegendaFor(t)} className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/10">
                          <FileText size={14} /> {tx("lyricsCaption")}
                        </button>
                      )}
                      {(t.kind === "song" || t.kind === "instrumental") && (
                        <button disabled={busy || !online} onClick={() => setVoiceFor(t)} className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-black hover:bg-zinc-200 disabled:opacity-40">
                          <Mic size={14} /> {tx("singOver")}
                        </button>
                      )}
                      <button onClick={() => removeTrack(t)} className="rounded-lg p-2 text-zinc-500 hover:text-red-400" title={tx("delete")}>
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
          <div className="text-center text-xs text-zinc-500">{tx("playHint")}</div>
        )}
      </footer>

      {legendaFor && <LegendaModal track={legendaFor} tracks={tracks} onClose={() => setLegendaFor(null)} language={uiLanguage} />}
      {voiceFor && <VoiceModal track={voiceFor} onClose={() => setVoiceFor(null)} onGo={(o) => singOver(voiceFor, o)} language={uiLanguage} />}
    </div>
  );
}

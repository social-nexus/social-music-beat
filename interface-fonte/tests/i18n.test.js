import { readFileSync } from "node:fs";
import { UI_TEXT, localeCoverage, uiText } from "../src/i18n.js";

const requiredLocales = ["pt", "en", "es"];
const requiredKeys = ["errAudioPlayback"];
let failed = false;
const source = readFileSync(new URL("../src/i18n.js", import.meta.url), "utf8");

for (const locale of requiredLocales) {
  for (const key of requiredKeys) {
    if (!UI_TEXT[locale][key]) { failed = true; console.error(`Missing ${key} in ${locale}`); }
  }
  if (!UI_TEXT[locale]) {
    failed = true;
    console.error(`Missing required locale catalog: ${locale}`);
  }
}

function extractCatalogKeys(locale) {
  const next = locale === "pt" ? "en" : locale === "en" ? "es" : null;
  const startMarker = `  ${locale}: {`;
  const start = source.indexOf(startMarker);
  const endMarker = next ? `\n  ${next}: {` : "\n};";
  const end = source.indexOf(endMarker, start);
  if (start < 0 || end < 0) return null;
  const block = source.slice(start, end);
  return [...block.matchAll(/([A-Za-z_$][\w$]*):\s*(?:"[^"]*"|'[^']*')/g)].map((match) => match[1]);
}

const sourceKeys = Object.fromEntries(requiredLocales.map((locale) => [locale, extractCatalogKeys(locale)]));
for (const locale of requiredLocales) {
  const keys = sourceKeys[locale];
  if (!keys) {
    failed = true;
    console.error(`Could not parse source catalog: ${locale}`);
    continue;
  }
  const duplicates = keys.filter((key, index) => keys.indexOf(key) !== index);
  if (duplicates.length) {
    failed = true;
    console.error(`Locale ${locale} has duplicate source keys:`, [...new Set(duplicates)].join(", "));
  }
}

const coverage = localeCoverage();
const baseKeys = Object.keys(UI_TEXT.pt || {});
for (const locale of requiredLocales) {
  const report = coverage[locale];
  if (!report || report.missing.length || report.extra.length) {
    failed = true;
    console.error(`Locale ${locale} has inconsistent keys:`);
    if (report?.missing.length) console.error("  Missing:", report.missing.join(", "));
    if (report?.extra.length) console.error("  Extra:", report.extra.join(", "));
  } else {
    console.log(`Locale ${locale}: ${baseKeys.length} keys consistent`);
  }
}


const localizedAuditLabels = {
  pt: {"deleteFileConfirm":"Isso apaga o arquivo.","captionLines":"linhas","captionMode":"modo","wordsMatched":"das palavras casaram","alignmentQuality":"qualidade do encaixe","bandOnly":"só a banda"},
  en: {"deleteFileConfirm":"This deletes the file.","captionLines":"lines","captionMode":"mode","wordsMatched":"of words matched","alignmentQuality":"alignment quality","bandOnly":"band only"},
  es: {"deleteFileConfirm":"Esto elimina el archivo.","captionLines":"líneas","captionMode":"modo","wordsMatched":"de las palabras coincidieron","alignmentQuality":"calidad de sincronización","bandOnly":"solo banda"},
};
for (const locale of requiredLocales) {
  for (const [key, expected] of Object.entries(localizedAuditLabels[locale])) {
    if (uiText(locale, key) !== expected) {
      failed = true;
      console.error(`Locale ${locale}: expected ${key}="${expected}", got "${uiText(locale, key)}"`);
    }
  }
}


const localizedGenerationErrors = {
  pt: {"errTaskStart":"Não consegui iniciar a criação.","errAceFailure":"A criação falhou. Olhe a janela preta do ACE-Step para ver o motivo.","errNoAudio":"O motor não retornou nenhum áudio.","errLyricsRequiredCreate":"Escreva a letra (ou escolha “Só instrumental”).","errStyleRequiredCreate":"Descreva o estilo da música. Dá para clicar nos botões de estilo."},
  en: {"errTaskStart":"Could not start music generation.","errAceFailure":"Generation failed. Check the ACE-step console window for details.","errNoAudio":"The engine did not return any audio.","errLyricsRequiredCreate":"Enter the lyrics (or choose “Instrumental only”).","errStyleRequiredCreate":"Describe the music style. You can also click the style buttons."},
  es: {"errTaskStart":"No se pudo iniciar la creación de música.","errAceFailure":"La creación falló. Consulta la ventana de ACE-step para ver el motivo.","errNoAudio":"El motor no devolvió ningún audio.","errLyricsRequiredCreate":"Escribe la letra (o elige “Solo instrumental”).","errStyleRequiredCreate":"Describe el estilo musical. También puedes usar los botones de estilos."},
};
for (const locale of requiredLocales) {
  for (const [key, expected] of Object.entries(localizedGenerationErrors[locale])) {
    if (uiText(locale, key) !== expected) {
      failed = true;
      console.error(`Locale ${locale}: expected ${key}="${expected}", got "${uiText(locale, key)}"`);
    }
  }
}


const localizedCaptionSetup = {
  pt: {"captionLyricsEmpty":"A letra está vazia.","whisperUnavailable":"O Whisper não está instalado. Rode o instalar.bat de novo e abra o programa outra vez.","whisperInstalled":"Whisper instalado.","whisperInstallTip":"Whisper ainda não instalado: rode o instalar.bat de novo."},
  en: {"captionLyricsEmpty":"The lyrics are empty.","whisperUnavailable":"Whisper is not installed. Run instalar.bat again and reopen the app.","whisperInstalled":"Whisper installed.","whisperInstallTip":"Whisper is not installed yet: run instalar.bat again."},
  es: {"captionLyricsEmpty":"La letra está vacía.","whisperUnavailable":"Whisper no está instalado. Ejecuta instalar.bat otra vez y vuelve a abrir el programa.","whisperInstalled":"Whisper instalado.","whisperInstallTip":"Whisper aún no está instalado: ejecuta instalar.bat otra vez."},
};
for (const locale of requiredLocales) {
  for (const [key, expected] of Object.entries(localizedCaptionSetup[locale])) {
    if (uiText(locale, key) !== expected) {
      failed = true;
      console.error(`Locale ${locale}: expected ${key}="${expected}", got "${uiText(locale, key)}"`);
    }
  }
}


const localizedGenerationPhases = {
  pt: {"phaseStarting":"Começando...","phaseSendMusic":"Enviando para o motor de música...","phaseCreateMusic":"Criando a música... (na primeira vez demora mais)","phaseSaving":"Salvando...","phaseSepLoading":"Carregando o separador de áudio (na primeira vez pode baixar um arquivo pequeno)...","phaseSepWorking":"Separando voz e instrumental. Isso pode levar alguns minutos...","phaseSepQueued":"Na fila...","phaseSepFallback":"Separando voz e instrumental...","errLyricsRequiredCreate":"Escreva a letra (ou escolha “Só instrumental”).","errStyleRequiredCreate":"Descreva o estilo da música. Dá para clicar nos botões de estilo."},
  en: {"phaseStarting":"Starting...","phaseSendMusic":"Sending to the music engine...","phaseCreateMusic":"Creating the song... (the first run takes longer)","phaseSaving":"Saving...","phaseSepLoading":"Loading the audio separator (first use may download a small file)...","phaseSepWorking":"Separating vocals and instrumental. This may take a few minutes...","phaseSepQueued":"Queued...","phaseSepFallback":"Separating vocals and instrumental...","errLyricsRequiredCreate":"Enter the lyrics (or choose “Instrumental only”).","errStyleRequiredCreate":"Describe the music style. You can also click the style buttons."},
  es: {"phaseStarting":"Iniciando...","phaseSendMusic":"Enviando al motor de música...","phaseCreateMusic":"Creando la canción... (la primera vez tarda más)","phaseSaving":"Guardando...","phaseSepLoading":"Cargando el separador de audio (la primera vez puede descargar un archivo pequeño)...","phaseSepWorking":"Separando voz e instrumental. Puede tardar unos minutos...","phaseSepQueued":"En cola...","phaseSepFallback":"Separando voz e instrumental...","errLyricsRequiredCreate":"Escribe la letra (o elige “Solo instrumental”).","errStyleRequiredCreate":"Describe el estilo musical. También puedes usar los botones de estilos."},
};
for (const locale of requiredLocales) {
  for (const [key, expected] of Object.entries(localizedGenerationPhases[locale])) {
    if (uiText(locale, key) !== expected) {
      failed = true;
      console.error(`Locale ${locale}: expected ${key}="${expected}", got "${uiText(locale, key)}"`);
    }
  }
}


const localizedUnexpectedStatus = { pt: "A tarefa retornou um estado desconhecido. Verifique o servidor e tente novamente.", en: "The task returned an unknown status. Check the server and try again.", es: "La tarea devolvió un estado desconocido. Comprueba el servidor e inténtalo de nuevo." };
for (const locale of requiredLocales) {
  if (uiText(locale, "errUnexpectedJobStatus") !== localizedUnexpectedStatus[locale]) {
    failed = true;
    console.error(`Locale ${locale}: unexpected job-status message mismatch`);
  }
}


const localizedUnexpectedTaskStatus = { pt: "A operação retornou um estado inesperado. Verifique o servidor e tente novamente.", en: "The operation returned an unexpected status. Check the server and try again.", es: "La operación devolvió un estado inesperado. Comprueba el servidor e inténtalo de nuevo." };
for (const locale of requiredLocales) {
  if (uiText(locale, "errUnexpectedTaskStatus") !== localizedUnexpectedTaskStatus[locale]) {
    failed = true;
    console.error(`Locale ${locale}: unexpected-task-status message mismatch`);
  }
}

const localizedDeleteErrors = { pt: "Não foi possível confirmar a exclusão. A Biblioteca foi atualizada.", en: "Could not confirm deletion. The Library has been refreshed.", es: "No se pudo confirmar la eliminación. La Biblioteca se actualizó." };
for (const locale of requiredLocales) {
  if (uiText(locale, "errDeleteTrack") !== localizedDeleteErrors[locale]) {
    failed = true;
    console.error(`Locale ${locale}: delete-track error message mismatch`);
  }
}

// Verify the library actions that were recently audited remain localized.
const localizedLibraryLabels = {
  pt: { download: "Baixar", separate: "Separar voz e instrumental" },
  en: { download: "Download", separate: "Separate vocals and instrumental" },
  es: { download: "Descargar", separate: "Separar voz y pista instrumental" },
};
for (const locale of requiredLocales) {
  for (const [key, expected] of Object.entries(localizedLibraryLabels[locale])) {
    if (uiText(locale, key) !== expected) {
      failed = true;
      console.error(`Locale ${locale}: expected ${key}="${expected}", got "${uiText(locale, key)}"`);
    }
  }
}

if (uiText("pt", "language") !== UI_TEXT.pt.language) {
  failed = true;
  console.error("Portuguese lookup failed.");
}
if (uiText("unknown", "language") !== UI_TEXT.pt.language) {
  failed = true;
  console.error("Fallback to Portuguese failed.");
}
if (uiText("pt", "__missing_key__") !== "__missing_key__") {
  failed = true;
  console.error("Unknown-key fallback failed.");
}

if (failed) process.exit(1);
console.log("All required locales, unique source keys, key parity, and fallback checks passed.");

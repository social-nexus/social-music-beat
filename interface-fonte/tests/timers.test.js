import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const checks = [
  ["Whisper failure fallback uses selected UI locale", /if \(job\.status === "erro"\) throw new Error\(job\.msg \|\| tx\("errWhisperJobFailed"\)\)/],
  ["music task start error uses selected UI locale", /async function submitTask\(params, file, uiLanguage = "pt"\)[\s\S]*?uiText\(uiLanguage, "errTaskStart"\)/],
  ["AI job fallback errors and progress messages are localized", /setMessage\(j\.message \|\| tx\("working"\)\)[\s\S]*?tx\("errOperationFailed"\)/],
  ["timer uses mm:ss formatting", /const mmss = \(s\) => .*Math\.floor\(s \/ 60\).*Math\.floor\(s % 60\)/s],
  ["main operations use a 1-second elapsed tick", /setInterval\(\(\) => setTick\(\(n\) => n \+ 1\), 1000\)/],
  ["operation timer starts at runJob entry and supports recovery timestamp", /const startedAt = Number\.isFinite\(startedAtOverride\) \? startedAtOverride : Date\.now\(\);\s*setLastJob\(null\);\s*setJob\(\{ title, phase: tx\("phaseStarting"\), startedAt \}\)/],
  ["operation duration is saved on completion and clamped", /setLastJob\(\{ title, elapsed: Math\.max\(0, Math\.floor\(\(Date\.now\(\) - startedAt\) \/ 1000\)\), failed \}\)/],
  ["completed and interrupted operations are displayed", /lastJob\.failed \? tx\("operationInterrupted"\) : tx\("operationDone"\)/],
  ["caption generation timer ticks while running", /setInterval\(\(\) => setElapsedTick\(\(n\) => n \+ 1\), 1000\)/],
  ["caption operation records final elapsed time", /setLastElapsed\(Math\.floor\(\(Date\.now\(\) - operationStartedAt\) \/ 1000\)\)/],
  ["caption failures use localized generic error instead of backend-only text", /catch \(e\) \{\s*\/\/ Avoid leaking backend-only Portuguese details into the selected UI language\.\s*setMsg\(tx\("errOperationFailed"\)\)/],
  ["audio-analysis failures are localized", /catch \(e\) \{\s*setMelodyFile\(null\); setMelodyAnalysis\(null\);\s*setError\(tx\("errOperationFailed"\)\);/],
  ["microphone failures are localized", /catch \(e\) \{\s*if \(streamRef\.current\) streamRef\.current\.getTracks\(\)\.forEach\(\(track\) => track\.stop\(\)\);\s*streamRef\.current = null; setRecording\(false\);\s*setError\(tx\("errOperationFailed"\)\);/],
  ["Whisper transcription failures are localized", /catch \(e\) \{\s*setError\(tx\("errOperationFailed"\)\);\s*setTranscriptionMessage\(""/],
  ["separation jobs use elapsed time from their start and clamp", /const elapsed = job \? Math\.max\(0, Math\.floor\(\(Date\.now\(\) - job\.startedAt\) \/ 1000\)\) : 0/],
  ["separation operation title is localized in all three languages", /uiLanguage === "en" \? "Separating" : uiLanguage === "es" \? "Separando" : "Separando"/],
  ["separation recovery restores original start or safely restarts old records", /runJob\(pending\.titles\.voz,[\s\S]*pending\.operationStartedAt \?\? Date\.now\(\)\)/],
  ["separation recovery validates persisted shape, timestamps, and non-empty IDs", /const validRecovery = (?=[^;]*pending\.createdAt == null \|\| Number\.isFinite\(pending\.createdAt\))(?=[^;]*pending\.operationStartedAt == null \|\| Number\.isFinite\(pending\.operationStartedAt\))(?=[^;]*pending\.ids\.voz\.trim\(\))(?=[^;]*pending\.ids\.instrumental\.trim\(\))[^;]*;\s*if \(!validRecovery\) \{\s*try \{ localStorage\.removeItem\(SEPARATION_RECOVERY_KEY\); \} catch \{\}\s*return;\s*\}/],
  ["recovery record saves separation operation start timestamp", /operationStartedAt: Date\.now\(\)/],
  ["elapsed timer clamps future recovery timestamps", /Math\.max\(0, Math\.floor\(\(Date\.now\(\) - job\.startedAt\) \/ 1000\)\)/],
  ["sing-over operation title is localized in all three languages", /uiLanguage === "en" \? "Band for" : uiLanguage === "es" \? "Banda para" : "Banda para"/],
  ["sing-over progress phases include English and Spanish", /uiLanguage === "en" \? "Preparing your voice\.\.\." : uiLanguage === "es" \? "Preparando tu voz\.\.\." : "Preparando a sua voz\.\.\."/],
  ["melody recording keeps composer timer active", /const operationBusy = busy \|\| providerBusy \|\| melodyBusy \|\| transcriptionBusy \|\| recording/],
  ["composer elapsed timer updates when recording state changes", /operationBusy = busy[\s\S]*?}, \[busy, providerBusy, melodyBusy, transcriptionBusy, recording, operationStartedAt\]/],
  ["audio conversion always closes context and localizes decoding errors", /async function toWavBlob\(file, maxSec = 600, uiLanguage = "pt"\)[\s\S]*?finally \{[\s\S]*?await ctx\.close\(\)[\s\S]*?uiText\(uiLanguage, "errAudioConvert"\)/],
  ["caption conversion passes its UI language", /toWavBlob\(outro, 600, language\)/],
  ["melody reference conversion passes its UI language and duration cap", /toWavBlob\(melodyFile, 30, uiLanguage\)/],
  ["sing-over conversion passes its UI language", /toWavBlob\(o\.file, 600, uiLanguage\)/],
  ["unknown separation progress messages use the selected locale fallback", /const backendPhase = s\.msg \|\| ""[\s\S]*?const localizedPhase = backendPhase\.includes\("Carregando o separador"\)[\s\S]*?: tx\("phaseSepFallback"\);/],
  ["separation job failures are normalized to localized messages, including interruption detection in EN", /const backendError = \(s\.msg \|\| ""\)\.toLowerCase\(\)[\s\S]*?backendError\.includes\("interrupted"\)[\s\S]*?tx\("errUnexpectedJobStatus"\)/],
  ["ACE task errors use the selected interface language", /async function waitResult\(id, uiLanguage = "pt"\)[\s\S]*?uiText\(uiLanguage, "errAceFailure"\)[\s\S]*?uiText\(uiLanguage, "errUnexpectedTaskStatus"\)/],
  ["both ACE task polling call sites pass interface language", /waitResult\(id, uiLanguage\)[\s\S]*waitResult\(id, uiLanguage\)/],
  ["runtime installation errors use localized generic message", /const installRuntime[\s\S]*?catch \(e\) \{\s*\/\/ Runtime\/model operations return backend-localized details; keep the UI locale consistent\.\s*setError\(tx\("errOperationFailed"\)\);/],
  ["model download errors use localized generic message", /const downloadModel[\s\S]*?catch \(e\) \{\s*\/\/ Runtime\/model operations return backend-localized details; keep the UI locale consistent\.\s*setError\(tx\("errOperationFailed"\)\);/],
  ["model activation errors use localized generic message", /const activate[\s\S]*?catch \(e\) \{\s*\/\/ Runtime\/model operations return backend-localized details; keep the UI locale consistent\.\s*setError\(tx\("errOperationFailed"\)\);/],
  ["GGUF import errors use localized generic message", /const importModel[\s\S]*?catch \(e\) \{\s*\/\/ Runtime\/model operations return backend-localized details; keep the UI locale consistent\.\s*setError\(tx\("errOperationFailed"\)\);/],
  ["runtime stop action clears stale errors and shows localized progress and failure", /status\.runtime_running && <button[\s\S]*?setMessage\(tx\("msgStoppingEngine"\)\);[\s\S]*?setMessage\(tx\("msgEngineStopped"\)\);[\s\S]*?setError\(tx\("errOperationFailed"\)\);/],
  ["generic operation failures use selected locale rather than raw backend error", /try \{ await fn\(phase\); \} catch \(e\) \{ failed = true; setErr\(tx\("errOperationFailed"\)\); \}/],
  ["AI lyric composition failures use localized generic error", /const generate = async \(\) =>[\s\S]*?\/api\/ai\/generate-lyrics[\s\S]*?catch \(e\) \{\s*\/\/ Provider failures may contain backend-language details; show the selected UI locale\.\s*setError\(tx\("errOperationFailed"\)\);/],
,

  ["persisted interface language is restricted to supported locales", /const savedLanguage = localStorage\.getItem\("socialMusicBeat\.language"\);\s*return \["pt", "en", "es"\]\.includes\(savedLanguage\) \? savedLanguage : "pt";/],
];

let failed = false;
for (const [label, pattern] of checks) {
  if (!pattern.test(app)) {
    failed = true;
    console.error("FAIL:", label);
  } else {
    console.log("PASS:", label);
  }
}
if (failed) process.exit(1);

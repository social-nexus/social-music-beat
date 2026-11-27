import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const checks = [
  ["music task start error uses selected UI locale", /async function submitTask\(params, file, uiLanguage = "pt"\)[\s\S]*?uiText\(uiLanguage, "errTaskStart"\)/],
  ["AI job fallback errors and progress messages are localized", /setMessage\(j\.message \|\| tx\("working"\)\)[\s\S]*?tx\("errOperationFailed"\)/],
  ["timer uses mm:ss formatting", /const mmss = \(s\) => .*Math\.floor\(s \/ 60\).*Math\.floor\(s % 60\)/s],
  ["main operations use a 1-second elapsed tick", /setInterval\(\(\) => setTick\(\(n\) => n \+ 1\), 1000\)/],
  ["operation timer starts at runJob entry and supports recovery timestamp", /const startedAt = Number\.isFinite\(startedAtOverride\) \? startedAtOverride : Date\.now\(\);\s*setLastJob\(null\);\s*setJob\(\{ title, phase: tx\("phaseStarting"\), startedAt \}\)/],
  ["operation duration is saved on completion and clamped", /setLastJob\(\{ title, elapsed: Math\.max\(0, Math\.floor\(\(Date\.now\(\) - startedAt\) \/ 1000\)\), failed \}\)/],
  ["completed and interrupted operations are displayed", /lastJob\.failed \? tx\("operationInterrupted"\) : tx\("operationDone"\)/],
  ["caption generation timer ticks while running", /setInterval\(\(\) => setElapsedTick\(\(n\) => n \+ 1\), 1000\)/],
  ["caption operation records final elapsed time", /setLastElapsed\(Math\.floor\(\(Date\.now\(\) - operationStartedAt\) \/ 1000\)\)/],
  ["separation jobs use elapsed time from their start and clamp", /const elapsed = job \? Math\.max\(0, Math\.floor\(\(Date\.now\(\) - job\.startedAt\) \/ 1000\)\) : 0/],
  ["separation operation title is localized in all three languages", /uiLanguage === "en" \? "Separating" : uiLanguage === "es" \? "Separando" : "Separando"/],
  ["separation recovery restores original start or safely restarts old records", /runJob\(pending\.titles\.voz,[\s\S]*pending\.operationStartedAt \?\? Date\.now\(\)\)/],
  ["separation recovery validates persisted shape and clears invalid data", /const validRecovery = typeof pending\?\.jobId === "string"[\s\S]*?if \(!validRecovery\) \{\s*try \{ localStorage\.removeItem\(SEPARATION_RECOVERY_KEY\); \} catch \{\}\s*return;\s*\}/],
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
  ["ACE task errors use the selected interface language", /async function waitResult\(id, uiLanguage = "pt"\)[\s\S]*?uiText\(uiLanguage, "errAceFailure"\)[\s\S]*?uiText\(uiLanguage, "errUnexpectedTaskStatus"\)/],
  ["both ACE task polling call sites pass interface language", /waitResult\(id, uiLanguage\)[\s\S]*waitResult\(id, uiLanguage\)/],
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

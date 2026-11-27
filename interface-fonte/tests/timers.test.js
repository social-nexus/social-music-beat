import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const checks = [
  ["timer uses mm:ss formatting", /const mmss = \(s\) => .*Math\.floor\(s \/ 60\).*Math\.floor\(s % 60\)/s],
  ["main operations use a 1-second elapsed tick", /setInterval\(\(\) => setTick\(\(n\) => n \+ 1\), 1000\)/],
  ["operation timer starts at runJob entry", /const startedAt = Date\.now\(\);\s*setLastJob\(null\);\s*setJob\(\{ title, phase: tx\("phaseStarting"\), startedAt \}\)/],
  ["operation duration is saved on completion", /setLastJob\(\{ title, elapsed: Math\.floor\(\(Date\.now\(\) - startedAt\) \/ 1000\), failed \}\)/],
  ["completed and interrupted operations are displayed", /lastJob\.failed \? tx\("operationInterrupted"\) : tx\("operationDone"\)/],
  ["caption generation timer ticks while running", /setInterval\(\(\) => setElapsedTick\(\(n\) => n \+ 1\), 1000\)/],
  ["caption operation records final elapsed time", /setLastElapsed\(Math\.floor\(\(Date\.now\(\) - operationStartedAt\) \/ 1000\)\)/],
  ["separation jobs use elapsed time from their start", /const elapsed = job \? Math\.floor\(\(Date\.now\(\) - job\.startedAt\) \/ 1000\) : 0/],
  ["separation operation title is localized in all three languages", /uiLanguage === "en" \? "Separating" : uiLanguage === "es" \? "Separando" : "Separando"/],
  ["sing-over operation title is localized in all three languages", /uiLanguage === "en" \? "Band for" : uiLanguage === "es" \? "Banda para" : "Banda para"/],
  ["sing-over progress phases include English and Spanish", /uiLanguage === "en" \? "Preparing your voice\.\.\." : uiLanguage === "es" \? "Preparando tu voz\.\.\." : "Preparando a sua voz\.\.\."/],
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

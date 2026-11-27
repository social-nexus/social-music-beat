import { UI_TEXT, localeCoverage, uiText } from "../src/i18n.js";

const requiredLocales = ["pt", "en", "es"];
let failed = false;

for (const locale of requiredLocales) {
  if (!UI_TEXT[locale]) {
    failed = true;
    console.error(`Missing required locale catalog: ${locale}`);
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
console.log("All required locales, key parity, and fallback checks passed.");

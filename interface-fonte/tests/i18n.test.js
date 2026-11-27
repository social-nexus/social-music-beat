import { readFileSync } from "node:fs";
import { UI_TEXT, localeCoverage, uiText } from "../src/i18n.js";

const requiredLocales = ["pt", "en", "es"];
let failed = false;
const source = readFileSync(new URL("../src/i18n.js", import.meta.url), "utf8");

for (const locale of requiredLocales) {
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

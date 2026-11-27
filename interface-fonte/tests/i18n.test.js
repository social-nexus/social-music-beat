import { localeCoverage } from "../src/i18n.js";

const coverage = localeCoverage();
let failed = false;
for (const [locale, report] of Object.entries(coverage)) {
  if (report.missing.length || report.extra.length) {
    failed = true;
    console.error(`Locale ${locale} has inconsistent keys:`);
    if (report.missing.length) console.error("  Missing:", report.missing.join(", "));
    if (report.extra.length) console.error("  Extra:", report.extra.join(", "));
  } else {
    console.log(`Locale ${locale}: ${Object.keys(report).length >= 0 ? "keys consistent" : ""}`);
  }
}
if (failed) process.exit(1);
console.log("All locale catalogs have matching key sets.");

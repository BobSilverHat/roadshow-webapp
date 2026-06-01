import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = "client/public/locales";
const langs = ["en", "pt-BR"];
let failed = false;

const keysOf = (obj, prefix = "") =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? keysOf(v, `${prefix}${k}.`)
      : [`${prefix}${k}`]);

const nsFiles = readdirSync(join(root, "en")).filter((f) => f.endsWith(".json"));

for (const ns of nsFiles) {
  const sets = {};
  for (const lang of langs) {
    const p = join(root, lang, ns);
    if (!existsSync(p)) { console.error(`MISSING FILE: ${p}`); failed = true; sets[lang] = new Set(); continue; }
    sets[lang] = new Set(keysOf(JSON.parse(readFileSync(p, "utf8"))));
  }
  const en = sets["en"];
  for (const lang of langs.filter((l) => l !== "en")) {
    const missing = [...en].filter((k) => !sets[lang].has(k));
    const extra = [...sets[lang]].filter((k) => !en.has(k));
    if (missing.length) { console.error(`[${ns}] ${lang} MISSING: ${missing.join(", ")}`); failed = true; }
    if (extra.length) { console.error(`[${ns}] ${lang} EXTRA: ${extra.join(", ")}`); failed = true; }
  }
}
if (failed) { console.error("\nLocale parity check FAILED"); process.exit(1); }
console.log("Locale parity check passed.");

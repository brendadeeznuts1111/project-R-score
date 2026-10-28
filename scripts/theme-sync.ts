#!/usr/bin/env bun
// CLI: native Bun theme sync using scripts/theme/* modules.
// Usage: bun scripts/theme-sync.ts [--check] [--watch] [--json]

import { parseTheme } from "./theme/parse.ts";
import { normalize, hasCycle } from "./theme/normalize.ts";
import { validateParity, validateAliases, validateContrast } from "./theme/validate.ts";
import { emitCss } from "./theme/emit-css.ts";
import { emitTs } from "./theme/emit-ts.ts";
import { hashCss } from "./theme/hash.ts";
import { writeAtomic } from "./theme/write-atomic.ts";

const ROOT = new URL("..", import.meta.url).pathname;
const THEME_PATH = `${ROOT}public/portal/theme.jsonc`;
const CSS_OUT = `${ROOT}public/portal/theme.generated.css`;
const TS_OUT = `${ROOT}public/portal/theme.generated.ts`;
const CHECK = process.argv.includes("--check");
const JSON_OUT = process.argv.includes("--json");

async function run() {
  const theme = normalize(await parseTheme(THEME_PATH));
  if (hasCycle(theme)) throw new Error("cycle detected in theme");
  validateParity(theme);
  validateAliases(theme);
  validateContrast(theme);

  const css = emitCss(theme);
  const ts = emitTs(theme);
  const hash = hashCss(css);

  if (CHECK) {
    const existing = await Bun.file(CSS_OUT).text().catch(() => "");
    if (hashCss(existing) !== hash) {
      console.error("drift detected");
      process.exit(1);
    }
    console.log(JSON_OUT ? JSON.stringify({ ok: true, hash }) : "OK: no drift");
    return;
  }

  await writeAtomic(CSS_OUT, css);
  await writeAtomic(TS_OUT, ts);
  console.log(JSON_OUT ? JSON.stringify({ ok: true, hash, files: [CSS_OUT, TS_OUT] }) : `wrote ${CSS_OUT} (sha256 ${hash.slice(0, 12)})`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

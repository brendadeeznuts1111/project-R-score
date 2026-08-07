#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/guides/util/entrypoint — import.meta.main
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * Sync public/portal/theme.jsonc → theme-tokens.css (Bun jsonc loader).
 *
 * Usage:
 *   bun tools/sync-portal-theme.ts
 *   bun tools/sync-portal-theme.ts --check   # fail if generated CSS is stale
 *
 * @see https://bun.com/docs/bundler/loaders#jsonc
 * @see https://bun.com/docs/runtime/file-io — Bun.write
 */
import { isModuleEntrypoint } from '../lib/bun-executable.ts';
import { joinPath, resolvePath } from '../lib/path-bun.ts';
import { portalTheme, renderThemeTokensCss } from '../lib/portal/theme.ts';

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('portal:theme:sync', Bun.argv.slice(2))
  : Bun.argv.slice(2);
const ROOT = resolvePath(import.meta.dir, '..');
const OUT = joinPath(ROOT, 'public/portal/theme-tokens.css');
const check = argv.includes('--check');

async function main(): Promise<void> {
  const css = renderThemeTokensCss(portalTheme);

  if (check) {
    const existing = Bun.file(OUT);
    if (!(await existing.exists())) {
      console.error(`Missing ${OUT} — run bun run portal:theme:sync`);
      process.exit(1);
    }
    const prev = await existing.text();
    if (prev !== css) {
      console.error('theme-tokens.css is stale vs theme.jsonc');
      process.exit(1);
    }
    console.log(`OK ${OUT} matches theme.jsonc v${portalTheme.version}`);
    return;
  }

  await Bun.write(OUT, css);
  console.log(`Wrote ${OUT}`);
  console.log(`  theme: v${portalTheme.version} · schemes dark+light`);
  console.log('  loader: jsonc → CSS custom properties');
  console.log('  Import in style.css: @import "./theme-tokens.css";');
}

if (isModuleEntrypoint(import.meta)) {
  main().catch(e => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}

export { main as syncPortalTheme, OUT as THEME_TOKENS_CSS_PATH };

#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @updated Bun.CryptoHasher · changed v0.5.0 · 2023-01-18 · https://bun.com/blog/bun-v0.5.0
// @updated Bun.CryptoHasher · fixed v1.0.19 · 2023-12-22 · https://bun.com/blog/bun-v1.0.19
// @updated Bun.CryptoHasher · changed v1.0.21 · 2024-01-02 · https://bun.com/blog/bun-v1.0.21
// @updated Bun.CryptoHasher · fixed v1.1.11 · 2024-06-01 · https://bun.com/blog/bun-v1.1.11
// @updated Bun.CryptoHasher · fixed v1.1.32 · 2024-10-21 · https://bun.com/blog/bun-v1.1.32
// @updated Bun.CryptoHasher · fixed v1.1.35 · 2024-11-19 · https://bun.com/blog/bun-v1.1.35
// @verified Bun.CryptoHasher · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/hashing#bun-cryptohasher
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @updated Bun.file · fixed v0.2.2 · 2022-10-27 · https://bun.com/blog/bun-v0.2.2
// @updated Bun.file · changed v0.6.0 · 2023-05-16 · https://bun.com/blog/bun-v0.6.0
// @updated Bun.file · fixed v0.6.5 · 2023-05-29 · https://bun.com/blog/bun-v0.6.5
// @updated Bun.file · changed v0.6.12 · 2023-06-30 · https://bun.com/blog/bun-v0.6.12
// @updated Bun.file · fixed v1.0.1 · 2023-09-12 · https://bun.com/blog/bun-v1.0.1
// @updated Bun.file · fixed v1.0.2 · 2023-09-15 · https://bun.com/blog/bun-v1.0.2
// @updated Bun.file · changed v1.0.16 · 2023-12-10 · https://bun.com/blog/bun-v1.0.16
// @updated Bun.file · changed v1.0.21 · 2024-01-02 · https://bun.com/blog/bun-v1.0.21
// @updated Bun.file · fixed v1.0.21 · 2024-01-02 · https://bun.com/blog/bun-v1.0.21
// @updated Bun.file · fixed v1.0.23 · 2024-01-16 · https://bun.com/blog/bun-v1.0.23
// @updated Bun.file · fixed v1.0.24 · 2024-01-20 · https://bun.com/blog/bun-v1.0.24
// @updated Bun.file · fixed v1.0.25 · 2024-01-21 · https://bun.com/blog/bun-v1.0.25
// @updated Bun.file · fixed v1.0.26 · 2024-02-03 · https://bun.com/blog/bun-v1.0.26
// @updated Bun.file · fixed v1.0.27 · 2024-02-17 · https://bun.com/blog/bun-v1.0.27
// @updated Bun.file · fixed v1.0.28 · 2024-02-19 · https://bun.com/blog/bun-v1.0.28
// @updated Bun.file · changed v1.0.36 · 2024-03-29 · https://bun.com/blog/bun-v1.0.36
// @updated Bun.file · changed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.file · fixed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.file · fixed v1.1.6 · 2024-04-28 · https://bun.com/blog/bun-v1.1.6
// @updated Bun.file · changed v1.1.9 · 2024-05-22 · https://bun.com/blog/bun-v1.1.9
// @updated Bun.file · fixed v1.1.11 · 2024-06-01 · https://bun.com/blog/bun-v1.1.11
// @updated Bun.file · fixed v1.1.22 · 2024-08-07 · https://bun.com/blog/bun-v1.1.22
// @updated Bun.file · fixed v1.1.27 · 2024-09-07 · https://bun.com/blog/bun-v1.1.27
// @updated Bun.file · fixed v1.1.28 · 2024-09-18 · https://bun.com/blog/bun-v1.1.28
// @updated Bun.file · fixed v1.1.37 · 2024-11-26 · https://bun.com/blog/bun-v1.1.37
// @updated Bun.file · changed v1.1.39 · 2024-12-17 · https://bun.com/blog/bun-v1.1.39
// @updated Bun.file · changed v1.1.43 · 2025-01-08 · https://bun.com/blog/bun-v1.1.43
// @updated Bun.file · changed v1.2.0 · 2025-01-22 · https://bun.com/blog/bun-v1.2
// @updated Bun.file · fixed v1.2.2 · 2025-02-01 · https://bun.com/blog/bun-v1.2.2
// @updated Bun.file · changed v1.2.3 · 2025-02-22 · https://bun.com/blog/bun-v1.2.3
// @updated Bun.file · fixed v1.2.3 · 2025-02-22 · https://bun.com/blog/bun-v1.2.3
// @updated Bun.file · changed v1.2.19 · 2025-07-19 · https://bun.com/blog/bun-v1.2.19
// @updated Bun.file · fixed v1.2.19 · 2025-07-19 · https://bun.com/blog/bun-v1.2.19
// @updated Bun.file · fixed v1.2.20 · 2025-08-10 · https://bun.com/blog/bun-v1.2.20
// @updated Bun.file · changed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.file · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.file · fixed v1.3.6 · 2026-01-13 · https://bun.com/blog/bun-v1.3.6
// @updated Bun.file · fixed v1.3.10 · 2026-02-26 · https://bun.com/blog/bun-v1.3.10
// @updated Bun.file · fixed v1.3.11 · 2026-03-18 · https://bun.com/blog/bun-v1.3.11
// @updated Bun.file · fixed v1.3.12 · 2026-04-09 · https://bun.com/blog/bun-v1.3.12
// @updated Bun.file · changed v1.3.13 · 2026-04-20 · https://bun.com/blog/bun-v1.3.13
// @updated Bun.file · fixed v1.3.13 · 2026-04-20 · https://bun.com/blog/bun-v1.3.13
// @updated Bun.file · changed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @updated Bun.file · fixed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @verified Bun.file · Bun v1.4.0 · 2026-08-18 · https://bun.com/docs/runtime/file-io
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
import { portalTheme, renderBun14NamespaceCss, renderThemeTokensCss } from '../lib/portal/theme.ts';
import { PORTAL_STYLE_RAW_COLOR_MAX } from '../lib/portal/raw-color-policy.ts';

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('portal:theme:sync', Bun.argv.slice(2))
  : Bun.argv.slice(2);
const ROOT = resolvePath(import.meta.dir, '..');
const OUT = joinPath(ROOT, 'public/portal/theme-tokens.css');
const BUN14_OUT = joinPath(ROOT, 'public/portal/bun-1.4/bun-1.4-theme.css');
const MANIFEST_OUT = joinPath(ROOT, 'public/registry/portal-theme.json');
const check = argv.includes('--check');

function sha256Hex(value: string): string {
  return new Bun.CryptoHasher('sha256').update(value).digest('hex');
}

function renderPortalThemeManifest(css: string, bun14Css: string): string {
  return `${JSON.stringify(
    {
      schemaVersion: 1,
      theme: {
        version: portalTheme.version,
        colorSchemeDefault: portalTheme.colorSchemeDefault,
        identity: {
          venues: Object.keys(portalTheme.identity.venue).length,
          subsystems: Object.keys(portalTheme.identity.subsystem).length,
        },
      },
      source: {
        path: '/portal/theme.jsonc',
        resolvedSha256: sha256Hex(JSON.stringify(portalTheme)),
      },
      generated: [
        { path: '/portal/theme-tokens.css', sha256: sha256Hex(css) },
        { path: '/portal/bun-1.4/bun-1.4-theme.css', sha256: sha256Hex(bun14Css) },
      ],
      colorPolicy: {
        rawLiteralMaximum: PORTAL_STYLE_RAW_COLOR_MAX,
        consumerScopes: ['components', 'style.css', 'venues.css', 'bun-1.4'],
        verificationCommand: 'bun run validate:colors',
      },
    },
    null,
    2
  )}\n`;
}

async function main(): Promise<void> {
  const css = renderThemeTokensCss(portalTheme);
  const bun14Css = renderBun14NamespaceCss(portalTheme);
  const manifest = renderPortalThemeManifest(css, bun14Css);

  if (check) {
    for (const [path, expected] of [
      [OUT, css],
      [BUN14_OUT, bun14Css],
      [MANIFEST_OUT, manifest],
    ] as const) {
      const existing = Bun.file(path);
      if (!(await existing.exists())) {
        console.error(`Missing ${path} — run bun run portal:theme:sync`);
        process.exit(1);
      }
      if ((await existing.text()) !== expected) {
        console.error(`${path} is stale vs theme.jsonc`);
        process.exit(1);
      }
    }
    console.log(`OK shared + Bun 1.4 CSS match theme.jsonc v${portalTheme.version}`);
    return;
  }

  await Promise.all([
    Bun.write(OUT, css),
    Bun.write(BUN14_OUT, bun14Css),
    Bun.write(MANIFEST_OUT, manifest),
  ]);
  console.log(`Wrote ${OUT}`);
  console.log(`Wrote ${BUN14_OUT}`);
  console.log(`Wrote ${MANIFEST_OUT}`);
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

export {
  BUN14_OUT as BUN14_THEME_CSS_PATH,
  MANIFEST_OUT as PORTAL_THEME_MANIFEST_PATH,
  main as syncPortalTheme,
  OUT as THEME_TOKENS_CSS_PATH,
};

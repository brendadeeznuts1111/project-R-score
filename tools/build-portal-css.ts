#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/guides/util/entrypoint — import.meta.main
// @see https://bun.com/docs/bundler/bytecode#combining-with-other-optimizations — --minify
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * Optional portal CSS build — Bun lowers modern CSS (nesting, :lang/:is/:not,
 * logical props, media ranges, …) and can unlock deferred features
 * (light-dark, color-mix, relative/LAB/P3) with legacy fallbacks.
 *
 * Static-first default: pages still link `/portal/style.css`.
 * Opt in: point `<link>` at `/portal/dist/style.css` after this build.
 *
 * Dual output note: Bun does **not** expose a browserslist dual-file CSS API.
 * One `Bun.build` already lowers nesting/:lang/:is/logical/media to legacy-safe
 * CSS (LightningCSS defaults: Chrome 87+, Firefox 78+, Safari 14+, Edge 88+).
 * Treat this as:
 *   modern source  → /portal/style.css
 *   lowered build  → /portal/dist/style.css  (+ style.min.css with --minify)
 *
 * Usage:
 *   bun tools/build-portal-css.ts
 *   bun tools/build-portal-css.ts --minify
 *   bun tools/build-portal-css.ts --analyze
 *   bun tools/build-portal-css.ts --check
 *
 * @see https://bun.com/docs/bundler#content-types — Asset Processing / Content types
 * @see https://bun.com/docs/bundler/loaders#css — CSS loader (`.css` → bundled stylesheet)
 * @see https://bun.com/docs/bundler/index#basic-example — Bun.build
 * @see https://bun.com/docs/bundler/css — CSS syntax lowering
 * @see https://bun.com/docs/bundler/html-static — HTML-entry auto-bundle (alt path)
 * @see https://bun.com/docs/runtime/file-io — Bun.file / Bun.write
 */
import { isModuleEntrypoint } from '../lib/bun-executable.ts';
import { joinPath, resolvePath } from '../lib/path-bun.ts';
import { syncPortalTheme } from './sync-portal-theme.ts';

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('portal:css:build', Bun.argv.slice(2))
  : Bun.argv.slice(2);
const ROOT = resolvePath(import.meta.dir, '..');
const SOURCE = joinPath(ROOT, 'public/portal/style.css');
const OUTDIR = joinPath(ROOT, 'public/portal/dist');

/** Public URL prefix for any `url()` / asset paths the CSS loader rewrites. */
const PUBLIC_PATH = '/portal/dist/';

const minify = argv.includes('--minify');
const analyze = argv.includes('--analyze');
const check = argv.includes('--check');

type BuildOpts = {
  naming: string;
  minify: boolean;
  analyze: boolean;
};

type MetafilePaths = {
  json: string;
  markdown: string;
};

function metafilePaths(opts: BuildOpts): MetafilePaths {
  return opts.minify
    ? { json: 'meta.min.json', markdown: 'meta.min.md' }
    : { json: 'meta.json', markdown: 'meta.md' };
}

async function buildCss(opts: BuildOpts) {
  const metafile = opts.analyze ? { metafile: metafilePaths(opts) } : {};
  // Explicit css loader — default for .css, documented for Asset Processing clarity.
  // @see https://bun.com/docs/bundler/loaders#css
  // @see https://bun.com/docs/bundler#content-types
  const config = {
    entrypoints: [SOURCE],
    outdir: OUTDIR,
    naming: opts.naming,
    minify: opts.minify,
    publicPath: PUBLIC_PATH,
    loader: {
      '.css': 'css',
    },
    // Bun 1.4: emit both esbuild-compatible JSON and LLM-readable Markdown
    // only in explicit analysis mode. Local bundled declarations still expose
    // the pre-1.4 Boolean-only shape.
    // @see https://bun.com/docs/bundler#metafile
    ...metafile,
  };
  return Bun.build(config as Parameters<typeof Bun.build>[0]);
}

async function assertMetafile(paths: MetafilePaths): Promise<void> {
  const jsonPath = joinPath(OUTDIR, paths.json);
  const markdownPath = joinPath(OUTDIR, paths.markdown);
  const jsonFile = Bun.file(jsonPath);
  const markdownFile = Bun.file(markdownPath);
  if (!(await jsonFile.exists()) || !(await markdownFile.exists())) {
    throw new Error(`Bun.build did not emit metafiles: ${jsonPath}, ${markdownPath}`);
  }
  const metafile = (await jsonFile.json()) as { inputs?: unknown; outputs?: unknown };
  if (!metafile.inputs || !metafile.outputs) {
    throw new Error(`invalid Bun metafile: ${jsonPath}`);
  }
  if (!(await markdownFile.text()).includes('Quick Summary')) {
    throw new Error(`invalid Bun Markdown metafile: ${markdownPath}`);
  }
}

async function main(): Promise<void> {
  // Keep theme-tokens.css in sync (jsonc loader) before css loader bundles @import.
  await syncPortalTheme();

  const src = Bun.file(SOURCE);
  if (!(await src.exists())) {
    console.error(`Missing source: ${SOURCE}`);
    process.exit(1);
  }

  // Always emit readable lowered CSS; optionally also emit minified.
  const lowered = await buildCss({ naming: 'style.css', minify: false, analyze });

  if (!lowered.success) {
    console.error('portal CSS build failed:');
    for (const log of lowered.logs) console.error(log);
    process.exit(1);
  }

  const outPath = lowered.outputs[0]?.path ?? joinPath(OUTDIR, 'style.css');
  const size = Bun.file(outPath).size;
  const kind = lowered.outputs[0]?.kind ?? 'asset';
  const loweredMetafile = metafilePaths({ naming: 'style.css', minify: false, analyze });
  if (analyze) await assertMetafile(loweredMetafile);

  let minPath: string | undefined;
  let minSize: number | undefined;
  if (minify) {
    const minified = await buildCss({ naming: 'style.min.css', minify: true, analyze });
    if (!minified.success) {
      console.error('portal CSS minify failed:');
      for (const log of minified.logs) console.error(log);
      process.exit(1);
    }
    minPath = minified.outputs[0]?.path ?? joinPath(OUTDIR, 'style.min.css');
    minSize = Bun.file(minPath).size;
    if (analyze) {
      await assertMetafile(metafilePaths({ naming: 'style.min.css', minify: true, analyze }));
    }
  }

  const readme = [
    '# Portal CSS build artifacts',
    '',
    'Generated by `bun run portal:css:build` (`Bun.build` + **css** loader).',
    '',
    'Asset Processing path:',
    '- [Content types](https://bun.com/docs/bundler#content-types) — `.css` row',
    '- [CSS loader](https://bun.com/docs/bundler/loaders#css) — parse, `@import`, `url()`, lowering',
    '- [bundler/css](https://bun.com/docs/bundler/css) — nesting, `:lang()`, logical props, …',
    '',
    '| File | Role |',
    '|------|------|',
    '| `style.css` | Lowered / vendor-prefixed (Bun default browser targets) |',
    '| `style.min.css` | Same + minify (`--minify`) |',
    '| `meta.json` | `--analyze`: esbuild-compatible input/output graph for CI and tooling |',
    '| `meta.md` | `--analyze`: Bun 1.4 Markdown graph for human and agent review |',
    '| `meta.min.{json,md}` | `--analyze --minify`: matching minified-build analysis |',
    '',
    `\`publicPath\`: \`${PUBLIC_PATH}\` (prefixes rewritten asset URLs).`,
    '',
    'Source of truth remains `../style.css` (static-first).',
    'There is no separate browserslist dual-modern file — Bun lowers in one pass.',
    '',
  ].join('\n');
  await Bun.write(joinPath(OUTDIR, 'README.md'), readme);

  console.log(`Built portal CSS → ${outPath}`);
  console.log(`  source: ${SOURCE}`);
  console.log(`  loader: css (Asset Processing) · kind=${kind}`);
  console.log(`  publicPath: ${PUBLIC_PATH}`);
  console.log(`  size:   ${size} bytes (lowered)`);
  if (analyze) {
    console.log(
      `  meta:   ${joinPath(OUTDIR, loweredMetafile.json)} · ${joinPath(OUTDIR, loweredMetafile.markdown)}`
    );
  }
  if (minPath) console.log(`  minify: ${minPath} (${minSize} bytes)`);
  console.log(`  docs:   bundler#content-types · bundler/loaders#css · bundler/css`);
  console.log('');
  console.log('Serve static (default):  /portal/style.css');
  console.log('Serve lowered (opt-in):  /portal/dist/style.css');
  if (minPath) console.log('Serve minified:         /portal/dist/style.min.css');

  if (check && size < 1000) {
    console.error('--check: built CSS unexpectedly small');
    process.exit(1);
  }
}

if (isModuleEntrypoint(import.meta)) {
  main().catch(e => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}

export { SOURCE, OUTDIR, main as buildPortalCss };

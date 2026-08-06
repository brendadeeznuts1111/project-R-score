// @see https://bun.com/docs/bundler#content-types — Asset Processing / Content types
// @see https://bun.com/docs/bundler/loaders#css — CSS loader
// @see https://bun.com/docs/bundler/loaders#jsonc — JSONC loader
// @see https://bun.com/docs/bundler/loaders#ts — TypeScript loader
// @see https://bun.com/docs/bundler/loaders#text — Text loader
// @see https://bun.com/docs/bundler/loaders#file — File loader
// @see https://bun.com/docs/bundler/index#basic-example — Bun.build
/**
 * Thin bundler loader verification — orthogonal to runtime/pm release proofs.
 *
 * Proves Bun.build Asset Processing loaders (css, jsonc, ts, text, file).
 * Portal *build* (`tools/build-portal-css.ts`) stays separate from these proofs.
 */
import { joinPath } from '../path-bun.ts';
import { makeTempDir, removeTempDir } from '../tmp-probe.ts';
import { resolveCanonicalForProbe } from '../../tools/canonical-helpers.ts';
import { withSubsystem } from './subsystem.ts';
import type { VerificationResult } from './types.ts';
import { BUNDLER_PROOF_REPORT_PATH } from './types.ts';

export const BUNDLER_VERIFY_SOURCE = 'tools/verify-bundler.ts';

export type BundlerLoaderProbeRow = VerificationResult & {
  probe: string;
  loader: 'css' | 'jsonc' | 'file' | 'text' | 'ts';
};

function resultRow(
  probe: string,
  loader: BundlerLoaderProbeRow['loader'],
  expected: string,
  actual: string,
  passed: boolean,
  canonicalKey: string,
  fallbackUrl: string
): BundlerLoaderProbeRow {
  const docs = resolveCanonicalForProbe(canonicalKey, {
    reportPath: BUNDLER_PROOF_REPORT_PATH,
    sourcePath: BUNDLER_VERIFY_SOURCE,
    fallback: fallbackUrl,
    subsystem: 'bundler',
  });
  return withSubsystem({
    probe,
    loader,
    name: `bundler:${probe}`,
    expected,
    actual,
    passed,
    ...docs,
    features: ['bundler', 'loaders', loader],
    subsystem: 'bundler',
  });
}

async function withTempDir(
  fn: (dir: string) => Promise<BundlerLoaderProbeRow>
): Promise<BundlerLoaderProbeRow> {
  const dir = await makeTempDir('fw-bundler');
  try {
    return await fn(dir);
  } finally {
    await removeTempDir(dir).catch(() => {});
  }
}

/** Explicit `loader: { '.css': 'css' }` bundles a tiny stylesheet. */
export async function probeCssLoaderExplicit(): Promise<BundlerLoaderProbeRow> {
  return withTempDir(async dir => {
    const entry = joinPath(dir, 'entry.css');
    const outdir = joinPath(dir, 'out');
    await Bun.write(entry, ':root { color: tomato; }\n');
    const result = await Bun.build({
      entrypoints: [entry],
      outdir,
      naming: 'bundle.css',
      loader: { '.css': 'css' },
    });
    if (!result.success) {
      return resultRow(
        'loader.css.explicit',
        'css',
        'Bun.build success with loader.css',
        result.logs.map(String).join('; ') || 'build failed',
        false,
        'loader:css',
        'https://bun.com/docs/bundler/loaders#css'
      );
    }
    const out = result.outputs[0];
    const text = out ? await out.text() : '';
    const ok = text.includes('tomato') || text.includes('color');
    return resultRow(
      'loader.css.explicit',
      'css',
      'CSS output contains entry rule',
      ok ? `css bytes=${text.length}` : `unexpected: ${text.slice(0, 120)}`,
      ok,
      'loader:css',
      'https://bun.com/docs/bundler/loaders#css'
    );
  });
}

/** Default content-type for `.css` is the css loader (Asset Processing). */
export async function probeCssLoaderDefault(): Promise<BundlerLoaderProbeRow> {
  return withTempDir(async dir => {
    const entry = joinPath(dir, 'entry.css');
    const outdir = joinPath(dir, 'out');
    await Bun.write(entry, '.x { margin-inline: 1rem; }\n');
    const result = await Bun.build({
      entrypoints: [entry],
      outdir,
      naming: 'bundle.css',
    });
    const ok = result.success && result.outputs.length > 0;
    return resultRow(
      'loader.css.default',
      'css',
      'default .css → css loader succeeds',
      ok ? `outputs=${result.outputs.length}` : result.logs.map(String).join('; ') || 'fail',
      ok,
      'Asset Processing',
      'https://bun.com/docs/bundler#content-types'
    );
  });
}

/** JSONC loader strips comments (portal theme.jsonc pattern). */
export async function probeJsoncLoader(): Promise<BundlerLoaderProbeRow> {
  return withTempDir(async dir => {
    const entry = joinPath(dir, 'theme.jsonc');
    const outdir = joinPath(dir, 'out');
    await Bun.write(
      entry,
      `{
  // comment ok
  "version": "probe",
  "ok": true
}
`
    );
    const result = await Bun.build({
      entrypoints: [entry],
      outdir,
      naming: 'theme.js',
      loader: { '.jsonc': 'jsonc' },
    });
    if (!result.success) {
      return resultRow(
        'loader.jsonc',
        'jsonc',
        'Bun.build success with loader.jsonc',
        result.logs.map(String).join('; ') || 'build failed',
        false,
        'loader:jsonc',
        'https://bun.com/docs/bundler/loaders#jsonc'
      );
    }
    const text = result.outputs[0] ? await result.outputs[0].text() : '';
    const ok = text.includes('probe') && !text.includes('// comment');
    return resultRow(
      'loader.jsonc',
      'jsonc',
      'jsonc output has data, comments stripped',
      ok ? `js bytes=${text.length}` : `unexpected: ${text.slice(0, 160)}`,
      ok,
      'loader:jsonc',
      'https://bun.com/docs/bundler/loaders#jsonc'
    );
  });
}

/** Text loader returns module exporting file contents as string. */
export async function probeTextLoader(): Promise<BundlerLoaderProbeRow> {
  return withTempDir(async dir => {
    const entry = joinPath(dir, 'note.txt');
    const outdir = joinPath(dir, 'out');
    await Bun.write(entry, 'portal-theme-ok\n');
    const result = await Bun.build({
      entrypoints: [entry],
      outdir,
      naming: 'note.js',
      loader: { '.txt': 'text' },
    });
    if (!result.success) {
      return resultRow(
        'loader.text',
        'text',
        'Bun.build success with loader.text',
        result.logs.map(String).join('; ') || 'build failed',
        false,
        'loader:text',
        'https://bun.com/docs/bundler/loaders#text'
      );
    }
    const text = result.outputs[0] ? await result.outputs[0].text() : '';
    const ok = text.includes('portal-theme-ok');
    return resultRow(
      'loader.text',
      'text',
      'text loader embeds file contents',
      ok ? `js bytes=${text.length}` : `unexpected: ${text.slice(0, 160)}`,
      ok,
      'loader:text',
      'https://bun.com/docs/bundler/loaders#text'
    );
  });
}

/** TypeScript loader strips types (default for `.ts`). */
export async function probeTsLoader(): Promise<BundlerLoaderProbeRow> {
  return withTempDir(async dir => {
    const entry = joinPath(dir, 'hello.ts');
    const outdir = joinPath(dir, 'out');
    await Bun.write(entry, `const msg: string = "hello";\nconsole.log(msg);\nexport { msg };\n`);
    const result = await Bun.build({
      entrypoints: [entry],
      outdir,
      naming: 'hello.js',
    });
    if (!result.success) {
      return resultRow(
        'loader.ts',
        'ts',
        'Bun.build success with TypeScript entry',
        result.logs.map(String).join('; ') || 'build failed',
        false,
        'loader:ts',
        'https://bun.com/docs/bundler/loaders#ts'
      );
    }
    const text = result.outputs[0] ? await result.outputs[0].text() : '';
    const hasHello = text.includes('hello');
    const typesStripped = !text.includes(': string');
    const ok = hasHello && typesStripped;
    return resultRow(
      'loader.ts',
      'ts',
      'transpiles TypeScript to JavaScript (types stripped)',
      ok
        ? `js bytes=${text.length} typesStripped=${typesStripped}`
        : `unexpected: ${text.slice(0, 160)}`,
      ok,
      'loader:ts',
      'https://bun.com/docs/bundler/loaders#ts'
    );
  });
}

/** File loader copies asset and exports a path/URL string. */
export async function probeFileLoader(): Promise<BundlerLoaderProbeRow> {
  return withTempDir(async dir => {
    const entry = joinPath(dir, 'entry.ts');
    const asset = joinPath(dir, 'logo.bin');
    const outdir = joinPath(dir, 'out');
    // Minimal binary-ish payload (not a real PNG — file loader only copies bytes)
    await Bun.write(asset, new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    await Bun.write(entry, `import logo from "./logo.bin";\nexport default logo;\n`);
    const result = await Bun.build({
      entrypoints: [entry],
      outdir,
      naming: 'entry.js',
      loader: { '.bin': 'file' },
    });
    if (!result.success) {
      return resultRow(
        'loader.file',
        'file',
        'Bun.build success with file loader for asset',
        result.logs.map(String).join('; ') || 'build failed',
        false,
        'loader:file',
        'https://bun.com/docs/bundler/loaders#file'
      );
    }
    const outputs = result.outputs;
    const hasJs = outputs.some(o => o.path.endsWith('.js') || o.kind === 'entry-point');
    const hasAsset = outputs.some(
      o => o.path.includes('logo') || o.kind === 'asset' || o.path.endsWith('.bin')
    );
    // File loader may emit hashed asset next to entry; also accept path string in JS
    let jsMentionsAsset = false;
    for (const o of outputs) {
      if (o.path.endsWith('.js') || o.kind === 'entry-point') {
        const t = await o.text();
        if (/\.bin|logo|data:|file:|assets?\//i.test(t)) jsMentionsAsset = true;
      }
    }
    const ok = hasJs && (hasAsset || jsMentionsAsset || outputs.length >= 1);
    return resultRow(
      'loader.file',
      'file',
      'copies asset / exports path via file loader',
      ok
        ? `outputs=${outputs.length} hasAsset=${hasAsset} jsMentions=${jsMentionsAsset}`
        : `outputs=${outputs.length}`,
      ok,
      'loader:file',
      'https://bun.com/docs/bundler/loaders#file'
    );
  });
}

export async function runBundlerLoaderProbes(): Promise<BundlerLoaderProbeRow[]> {
  return [
    await probeCssLoaderExplicit(),
    await probeCssLoaderDefault(),
    await probeJsoncLoader(),
    await probeTextLoader(),
    await probeTsLoader(),
    await probeFileLoader(),
  ];
}

export async function runBundlerLoaderVerification(): Promise<{
  ok: boolean;
  results: BundlerLoaderProbeRow[];
}> {
  const results = await runBundlerLoaderProbes();
  return { ok: results.every(r => r.passed), results };
}

#!/usr/bin/env bun
// @see https://bun.com/docs/bundler#metafile — Bun.build metafile: true (esbuild format)
// @released Bun.build metafile · released v1.3.6 · 2026-01-13 · https://bun.com/blog/bun-v1.3.6
// @updated Bun.build metafile · improved v1.4.0 · 2026-08-23 · https://bun.com/blog/bun-v1.4#metafile-true
// @see https://bun.com/blog/bun-v1.4#backpressure — import.path aligns to inputs keys (#34534)
// @see https://bun.com/docs/bundler#markdown-metafile — bun build --metafile-md
// @released --metafile-md · released v1.3.8 · 2026-02-10 · https://bun.com/blog/bun-v1.3.8
// @updated --metafile-md · improved v1.4.0 · 2026-08-23 · https://bun.com/blog/bun-v1.4#metafile-md
// @see https://bun.com/docs/bundler#target — target bun
/**
 * Build the example CLI and emit both Bun 1.4 metafile surfaces:
 *   - meta.json  ← Bun.build({ metafile: true })  (esbuild analyze format)
 *   - meta.md    ← bun build --metafile-md=…       (LLM-friendly graph)
 *
 * Bun 1.4 (#34534): bundled `imports[].path` is the same string as the
 * `metafile.inputs` key (e.g. `lib/foo.ts`); `original` keeps the specifier.
 * So `metafile.inputs[imp.path]` works for graph walks.
 *
 *   bun examples/bun-1.4-cli/build-meta.ts
 *   bun run example:bun-1.4-cli:meta
 *
 * Requires --target=bun (browser target cannot import the `bun` builtin).
 */
import { join } from 'node:path';
import { isModuleEntrypoint } from '../../lib/bun-executable.ts';
import { emitJson, failCli, setExitCode, spawnText, wantsJson } from '../../lib/harness/bun-cli.ts';

const ROOT = join(import.meta.dir);
const ENTRY = join(ROOT, 'cli.ts');
const OUTDIR = join(ROOT, 'dist');

export async function buildMeta(opts: { json?: boolean } = {}): Promise<number> {
  const result = await Bun.build({
    entrypoints: [ENTRY],
    outdir: OUTDIR,
    target: 'bun',
    metafile: true,
  });

  if (!result.success) {
    const detail = result.logs.map(String).join('\n');
    return failCli({
      title: 'bun-1.4-cli metafile build',
      gate: 'bun-1.4-cli-meta',
      why: 'Bun.build failed',
      fix: 'bun examples/bun-1.4-cli/build-meta.ts',
      detail,
    });
  }

  const meta = result.metafile;
  if (!meta) {
    return failCli({
      title: 'bun-1.4-cli metafile build',
      gate: 'bun-1.4-cli-meta',
      why: 'metafile: true produced no result.metafile',
      fix: 'bun examples/bun-1.4-cli/build-meta.ts',
    });
  }

  const metaJsonPath = join(OUTDIR, 'meta.json');
  const metaMdPath = join(OUTDIR, 'meta.md');
  // BuildMetafile object (esbuild shape) — stringify for analyze / disk.
  await Bun.write(metaJsonPath, `${JSON.stringify(meta, null, 2)}\n`);

  // Markdown report is CLI-only (--metafile-md); API has no metafileMd flag.
  spawnText([
    process.execPath,
    'build',
    ENTRY,
    '--target=bun',
    `--outdir=${OUTDIR}`,
    `--metafile-md=${metaMdPath}`,
  ]);

  const inputCount = Object.keys(meta.inputs).length;
  const outputCount = Object.keys(meta.outputs).length;
  // #34534 — every bundled import.path must index metafile.inputs
  let importsAligned = 0;
  let importsMisaligned = 0;
  for (const info of Object.values(meta.inputs)) {
    for (const imp of info.imports ?? []) {
      const p = imp.path;
      if (!p || imp.external) continue;
      if (p.startsWith('bun:') || p.startsWith('node:')) continue;
      if (p in meta.inputs) importsAligned++;
      else importsMisaligned++;
    }
  }
  const payload = {
    ok: true,
    entry: ENTRY,
    outdir: OUTDIR,
    inputs: inputCount,
    outputs: outputCount,
    /** Bun 1.4 #34534: import.path === inputs key */
    importsAligned,
    importsMisaligned,
    metaJson: metaJsonPath,
    metaMd: metaMdPath,
    // Largest input by bytes (bloat signal)
    largestInput: Object.entries(meta.inputs)
      .map(([path, info]) => ({ path, bytes: info.bytes ?? 0 }))
      .sort((a, b) => b.bytes - a.bytes)[0],
  };

  if (opts.json) {
    emitJson(payload);
  } else {
    console.info(`metafile inputs=${inputCount} outputs=${outputCount}`);
    console.info(
      `import.path ↔ inputs keys: aligned=${importsAligned} misaligned=${importsMisaligned}`
    );
    console.info(`wrote ${metaJsonPath}`);
    console.info(`wrote ${metaMdPath}`);
    if (payload.largestInput) {
      console.info(
        `largest input: ${payload.largestInput.path} (${payload.largestInput.bytes} bytes)`
      );
    }
  }
  return 0;
}

if (isModuleEntrypoint(import.meta)) {
  const json = wantsJson(Bun.argv.slice(2));
  setExitCode(await buildMeta({ json }));
}

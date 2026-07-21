#!/usr/bin/env bun
// @see https://bun.com/docs/bundler/index#basic-example — Bun.build
// @see https://bun.com/docs/guides/runtime/build-time-constants
// @see https://bun.com/docs/guides/runtime/define-constant
// @see https://bun.com/docs/bundler — Bun.build define / features
// @see https://bun.com/docs/runtime/child-process — Bun.$
/**
 * Root build contract — inject AST build constants + one DEBUG DCE gate.
 *
 *   bun run build:defines           # prod: DEBUG=false, minify syntax
 *   bun run build:defines -- --debug
 *   bun run build:defines -- --compile
 *
 * Runtime config stays Bun.env. Do not put secrets in --define.
 */
import { joinPath } from '../lib/path-bun';
import { hasFlag } from './lib/cli-args';

const ROOT = joinPath(import.meta.dir, '..');
const ENTRY = joinPath(ROOT, 'tools/fw-build-info.ts');
const OUTDIR = joinPath(ROOT, 'dist');
const COMPILE_OUT = joinPath(OUTDIR, 'fw-build-info');

const debug = hasFlag('debug');
const wantCompile = hasFlag('compile');

async function gitText(cmd: string[]): Promise<string> {
  const proc = Bun.spawn(cmd, {
    cwd: ROOT,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [out, code] = await Promise.all([new Response(proc.stdout).text(), proc.exited]);
  if (code !== 0) return '';
  return out.trim();
}

const version =
  (await gitText(['git', 'describe', '--tags', '--always'])) ||
  (await gitText(['git', 'rev-parse', '--short', 'HEAD'])) ||
  '0.0.0-dev';
const commit = (await gitText(['git', 'rev-parse', 'HEAD'])) || 'unknown';
const buildTime = new Date().toISOString();

const define = {
  BUILD_VERSION: JSON.stringify(version),
  BUILD_TIME: JSON.stringify(buildTime),
  GIT_COMMIT: JSON.stringify(commit),
  DEBUG: debug ? 'true' : 'false',
} as const;

console.info(`build:defines · version=${version} debug=${debug} compile=${wantCompile}`);

if (wantCompile) {
  const args = [
    'build',
    '--compile',
    ENTRY,
    '--outfile',
    COMPILE_OUT,
    '--minify-syntax',
    `--define`,
    `BUILD_VERSION=${define.BUILD_VERSION}`,
    `--define`,
    `BUILD_TIME=${define.BUILD_TIME}`,
    `--define`,
    `GIT_COMMIT=${define.GIT_COMMIT}`,
    `--define`,
    `DEBUG=${define.DEBUG}`,
  ];
  if (debug) args.push('--feature=DEBUG');
  const proc = Bun.spawn(['bun', ...args], {
    cwd: ROOT,
    stdout: 'inherit',
    stderr: 'inherit',
  });
  const code = await proc.exited;
  if (code !== 0) process.exit(code ?? 1);
  console.info(`✅ compiled ${COMPILE_OUT}`);
  process.exit(0);
}

const result = await Bun.build({
  entrypoints: [ENTRY],
  outdir: OUTDIR,
  target: 'bun',
  minify: debug ? false : { syntax: true },
  define: { ...define },
  features: debug ? ['DEBUG'] : [],
});

if (!result.success) {
  console.error('❌ Bun.build failed');
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

console.info(`✅ bundled → ${OUTDIR}/ (${result.outputs.length} file(s))`);
console.info('   run: bun dist/fw-build-info.js --json');
console.info('   or:  bun run build:defines -- --compile && ./dist/fw-build-info --json');

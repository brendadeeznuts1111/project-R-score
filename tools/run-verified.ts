#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/shell#getting-started — Bun.$
// @see https://bun.com/docs/bundler/executables#code-signing-on-macos — --verify
// @see https://bun.com/docs/runtime/console#reading-from-stdin — Bun.stdin
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/runtime#bun-run-to-pipe-code-from-stdin — bun run -
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — stdin script hash
/**
 * Execute a TypeScript script piped on stdin; optionally verify SHA-256 first.
 *
 *   curl -sf http://127.0.0.1:3000/api/defaults/script | bun tools/run-verified.ts
 *   curl -sf http://127.0.0.1:3000/api/defaults/script | bun tools/run-verified.ts --verify-hash=<sha256>
 *   curl -sf http://127.0.0.1:3000/api/networking/script | bun tools/run-verified.ts -- --local-only --save
 *
 * Prefer `bun run -` when hash verification is not required.
 */
// @see https://bun.com/docs/runtime/utils#bun-which — Bun.which
import { verifyScriptSha256 } from '../lib/http/verification-scripts.ts';
import { joinPath } from '../lib/path-bun.ts';
import { resolveVerificationBunBinary } from '../lib/verification/resolve-bun-binary.ts';

const args = process.argv.slice(2);
const hashArg = args.find(a => a.startsWith('--verify-hash='));
const verifyHash = hashArg?.slice('--verify-hash='.length);
const dash = args.indexOf('--');
const forward =
  dash >= 0 ? args.slice(dash + 1) : args.filter(a => a !== '--' && !a.startsWith('--verify-hash'));

const script = await Bun.stdin.text();
if (!script.trim()) {
  console.error('run-verified: empty stdin — pipe a script first');
  console.error('  curl -sf http://127.0.0.1:3000/api/defaults/script | bun tools/run-verified.ts');
  process.exit(1);
}

if (verifyHash && !(await verifyScriptSha256(script, verifyHash))) {
  console.error('run-verified: script SHA-256 mismatch — refusing to execute');
  console.error(`  expected: ${verifyHash.trim().toLowerCase()}`);
  process.exit(1);
}

const tmpDir = Bun.env.TMPDIR || Bun.env.TMP || '/tmp';
const tmp = joinPath(tmpDir, `fw-verified-${Bun.hash(script).toString(16)}.ts`);

try {
  await Bun.write(tmp, script);
  const bunPath = resolveVerificationBunBinary().path;
  const proc = Bun.spawn([bunPath, tmp, ...forward], {
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
    cwd: process.cwd(),
  });
  process.exit(await proc.exited);
} finally {
  try {
    await Bun.$`rm -f ${tmp}`.quiet();
  } catch {
    /* ignore */
  }
}

#!/usr/bin/env bun
// @see https://bun.com/docs/project/benchmarking#markdown-output — --cpu-prof-md
// @released --cpu-prof-md · released v1.4.0 · 2026-08-20 · https://bun.com/blog/bun-v1.4#cpu-prof-md
// @see https://bun.com/reference/bun/argv — Bun.argv
// @updated Bun.argv · changed v0.6.10 · 2023-06-26 · https://bun.com/blog/bun-v0.6.10
// @verified Bun.argv · Bun v1.4.0 · 2026-08-25 · https://bun.com/reference/bun/argv
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @updated Bun.env · fixed v1.0.3 · 2023-09-22 · https://bun.com/blog/bun-v1.0.3
// @updated Bun.env · changed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.env · fixed v1.2.8 · 2025-03-31 · https://bun.com/blog/bun-v1.2.8
// @updated Bun.env · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @verified Bun.env · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/environment-variables
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
// @verified Bun.file · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/file-io
// @see https://bun.com/docs/runtime/utils#bun-revision — Bun.revision
// @updated Bun.revision · fixed v0.2.0 · 2022-10-13 · https://bun.com/blog/bun-v0.2.0
// @verified Bun.revision · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/utils#bun-revision
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @updated Bun.spawn · changed v0.2.0 · 2022-10-13 · https://bun.com/blog/bun-v0.2.0
// @updated Bun.spawn · changed v0.3.0 · 2022-12-07 · https://bun.com/blog/bun-v0.3.0
// @updated Bun.spawn · fixed v0.6.0 · 2023-05-16 · https://bun.com/blog/bun-v0.6.0
// @updated Bun.spawn · fixed v0.6.6 · 2023-05-31 · https://bun.com/blog/bun-v0.6.6
// @updated Bun.spawn · fixed v0.7.2 · 2023-08-03 · https://bun.com/blog/bun-v0.7.2
// @updated Bun.spawn · fixed v1.0.8 · 2023-11-02 · https://bun.com/blog/bun-v1.0.8
// @updated Bun.spawn · fixed v1.0.9 · 2023-11-05 · https://bun.com/blog/bun-v1.0.9
// @updated Bun.spawn · fixed v1.0.23 · 2024-01-16 · https://bun.com/blog/bun-v1.0.23
// @updated Bun.spawn · fixed v1.0.26 · 2024-02-03 · https://bun.com/blog/bun-v1.0.26
// @updated Bun.spawn · fixed v1.0.31 · 2024-03-14 · https://bun.com/blog/bun-v1.0.31
// @updated Bun.spawn · fixed v1.0.32 · 2024-03-17 · https://bun.com/blog/bun-v1.0.32
// @updated Bun.spawn · fixed v1.0.36 · 2024-03-29 · https://bun.com/blog/bun-v1.0.36
// @updated Bun.spawn · changed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.spawn · fixed v1.1.5 · 2024-04-26 · https://bun.com/blog/bun-v1.1.5
// @updated Bun.spawn · changed v1.1.8 · 2024-05-10 · https://bun.com/blog/bun-v1.1.8
// @updated Bun.spawn · fixed v1.1.8 · 2024-05-10 · https://bun.com/blog/bun-v1.1.8
// @updated Bun.spawn · fixed v1.1.30 · 2024-10-08 · https://bun.com/blog/bun-v1.1.30
// @updated Bun.spawn · changed v1.1.39 · 2024-12-17 · https://bun.com/blog/bun-v1.1.39
// @updated Bun.spawn · fixed v1.1.39 · 2024-12-17 · https://bun.com/blog/bun-v1.1.39
// @updated Bun.spawn · changed v1.2.0 · 2025-01-22 · https://bun.com/blog/bun-v1.2
// @updated Bun.spawn · fixed v1.2.1 · 2025-01-27 · https://bun.com/blog/bun-v1.2.1
// @updated Bun.spawn · changed v1.2.6 · 2025-03-25 · https://bun.com/blog/bun-v1.2.6
// @updated Bun.spawn · fixed v1.2.6 · 2025-03-25 · https://bun.com/blog/bun-v1.2.6
// @updated Bun.spawn · changed v1.2.9 · 2025-04-09 · https://bun.com/blog/bun-v1.2.9
// @updated Bun.spawn · fixed v1.2.16 · 2025-06-11 · https://bun.com/blog/bun-v1.2.16
// @updated Bun.spawn · fixed v1.2.17 · 2025-06-21 · https://bun.com/blog/bun-v1.2.17
// @updated Bun.spawn · changed v1.2.18 · 2025-07-03 · https://bun.com/blog/bun-v1.2.18
// @updated Bun.spawn · fixed v1.2.18 · 2025-07-03 · https://bun.com/blog/bun-v1.2.18
// @updated Bun.spawn · changed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.spawn · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.spawn · fixed v1.3.2 · 2025-11-08 · https://bun.com/blog/bun-v1.3.2
// @updated Bun.spawn · changed v1.3.3 · 2025-11-21 · https://bun.com/blog/bun-v1.3.3
// @updated Bun.spawn · fixed v1.3.3 · 2025-11-21 · https://bun.com/blog/bun-v1.3.3
// @updated Bun.spawn · changed v1.3.5 · 2025-12-17 · https://bun.com/blog/bun-v1.3.5
// @updated Bun.spawn · changed v1.3.6 · 2026-01-13 · https://bun.com/blog/bun-v1.3.6
// @updated Bun.spawn · fixed v1.3.10 · 2026-02-26 · https://bun.com/blog/bun-v1.3.10
// @updated Bun.spawn · fixed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @verified Bun.spawn · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/child-process
// @see https://bun.com/docs/runtime/console#reading-from-stdin — Bun.stdin
// @updated Bun.stdin · fixed v1.0.27 · 2024-02-17 · https://bun.com/blog/bun-v1.0.27
// @verified Bun.stdin · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/console#reading-from-stdin
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @updated Bun.version · fixed v0.2.0 · 2022-10-13 · https://bun.com/blog/bun-v0.2.0
// @verified Bun.version · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/utils#bun-version
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
/** Local, clean-tree receipt for the fast pre-push proof. */
import { ensureDir, writeJson } from './lib/fs-bun.ts';
import { resolveVerificationBunBinary } from '../lib/verification/resolve-bun-binary.ts';

const ROOT = `${import.meta.dir}/..`;
const RECEIPT_DIR = `${ROOT}/.cache/ci-receipts`;
const CONFIG_PATHS = [
  'package.json',
  'bunfig.toml',
  'scripts/ci-harness.ts',
  'scripts/bun-test-changed.ts',
  'scripts/bun-test-changed-staged.ts',
  'lib/harness/ci-test-groups.ts',
] as const;

export type PrePushReceipt = {
  schemaVersion: 1;
  tree: string;
  bunVersion: string;
  bunRevision: string;
  gateConfigHash: string;
  status: 'passed';
  finishedAt: string;
};

function git(args: string[]): { code: number; out: string } {
  const result = Bun.spawnSync(['git', ...args], { cwd: ROOT, stdout: 'pipe', stderr: 'pipe' });
  return { code: result.exitCode ?? 1, out: result.stdout.toString().trim() };
}

export function sha256(value: string): string {
  return new Bun.CryptoHasher('sha256').update(value).digest('hex');
}

export function receiptMatches(
  receipt: PrePushReceipt | undefined,
  expected: Omit<PrePushReceipt, 'status' | 'finishedAt'>
): boolean {
  return Boolean(
    receipt &&
    receipt.schemaVersion === 1 &&
    receipt.status === 'passed' &&
    receipt.tree === expected.tree &&
    receipt.bunVersion === expected.bunVersion &&
    receipt.bunRevision === expected.bunRevision &&
    receipt.gateConfigHash === expected.gateConfigHash
  );
}

async function configHash(): Promise<string> {
  const text = await Promise.all(
    CONFIG_PATHS.map(async path => `${path}\n${await Bun.file(`${ROOT}/${path}`).text()}`)
  );
  return sha256(text.join('\n---\n'));
}

function hasContentPush(lines: string): boolean {
  return lines.split('\n').some(line => {
    const [, localSha] = line.trim().split(/\s+/);
    return Boolean(localSha && localSha !== '0000000000000000000000000000000000000000');
  });
}

async function main(): Promise<number> {
  const stdin = await new Response(Bun.stdin.stream()).text();
  if (!hasContentPush(stdin)) {
    console.info('⏭️  ref-only push (no content) — skipping content gates');
    return 0;
  }
  if (git(['status', '--porcelain']).out) {
    console.error('pre-push receipt refused: worktree is dirty');
    return 1;
  }
  const tree = git(['rev-parse', 'HEAD^{tree}']);
  if (tree.code !== 0) return tree.code;
  const expected = {
    tree: tree.out,
    bunVersion: Bun.version,
    bunRevision: Bun.revision,
    gateConfigHash: await configHash(),
  };
  const receiptPath = `${RECEIPT_DIR}/${expected.tree}.json`;
  let receipt: PrePushReceipt | undefined;
  if (await Bun.file(receiptPath).exists())
    receipt = (await Bun.file(receiptPath).json()) as PrePushReceipt;
  if (receiptMatches(receipt, expected)) {
    console.info(`✓ pre-push receipt ${expected.tree.slice(0, 8)}`);
    return 0;
  }
  console.info('pre-push receipt missing or stale — running ci:harness:fast');
  const proof = Bun.spawn(['bun', 'run', 'ci:harness:fast'], {
    cwd: ROOT,
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
  });
  const code = (await proof.exited) ?? 1;
  if (code !== 0) return code;
  await ensureDir(RECEIPT_DIR);
  await writeJson(receiptPath, {
    schemaVersion: 1,
    ...expected,
    status: 'passed',
    finishedAt: new Date().toISOString(),
  });
  console.info(`✓ pre-push receipt written ${expected.tree.slice(0, 8)}`);
  return 0;
}

if (import.meta.main) {
  // Opt-in Bun 1.4 Markdown CPU profile for a slow pre-push diagnosis.
  if (Bun.env.PREPUSH_PROFILE === '1' && Bun.env.PREPUSH_PROFILE_CHILD !== '1') {
    const profileDir = `${ROOT}/reports`;
    const profileName = 'prepush-cpu.md';
    await ensureDir(profileDir);
    const child = Bun.spawn(
      [
        resolveVerificationBunBinary().path,
        '--cpu-prof-md',
        `--cpu-prof-dir=${profileDir}`,
        `--cpu-prof-name=${profileName}`,
        import.meta.path,
        ...Bun.argv.slice(2),
      ],
      {
        cwd: ROOT,
        env: { ...Bun.env, PREPUSH_PROFILE_CHILD: '1' },
        stdin: 'inherit',
        stdout: 'inherit',
        stderr: 'inherit',
      }
    );
    const code = (await child.exited) ?? 1;
    if (code === 0) console.info(`⏱  CPU profile → ${profileDir}/${profileName}`);
    process.exit(code);
  }
  process.exit(await main());
}

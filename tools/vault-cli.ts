#!/usr/bin/env bun
// @see https://bun.com/docs/bundler/executables — bun build --compile
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
/**
 * vault-cli — single entry for secret gap status / mint / export (compile-friendly).
 *
 * Dev:
 *   bun tools/vault-cli.ts status
 *   bun tools/vault-cli.ts mint-local
 *   bun tools/vault-cli.ts report
 *
 * Compile (standalone binary, no Bun install on target):
 *   bun run vault:cli:compile
 *   ./vault status
 *
 * Continuous validation:
 *   bun run test:secrets:watch
 */
import { bunSpawnArgs } from '../lib/bun-executable.ts';
import { inspect } from '../lib/console-depth.ts';
import { getGapList, getVaultGapReport, secretRatchetOk } from '../scripts/lib/vault-gap-status.ts';

const argv = Bun.argv.slice(2);
const cmd = argv[0] ?? 'status';

async function runStatus(): Promise<number> {
  // Delegate to full CLI for mint/wire; report uses shared status module
  const report = await getVaultGapReport();
  console.log(
    inspect(
      {
        passCli: report.passCli,
        localMinted: report.localMinted,
        mintable: report.mintable,
        human: report.human,
        items: report.items.map(i => ({
          key: i.envKey,
          flag: i.flag,
          title: i.title,
        })),
        gapList: getGapList(),
        ratchetOk: secretRatchetOk(report),
      },
      { depth: 6, colors: true }
    )
  );
  return secretRatchetOk(report) ? 0 : 1;
}

async function main(): Promise<void> {
  if (cmd === 'report' || cmd === 'status' || cmd === '--json') {
    if (cmd === '--json' || argv.includes('--json')) {
      console.log(JSON.stringify(await getVaultGapReport(), null, 2));
      process.exit(secretRatchetOk() ? 0 : 1);
    }
    process.exit(await runStatus());
  }

  // Forward mint-local / export / close / wire / mint to vault-gap-close
  const allowed = new Set(['mint-local', 'export-minted', 'mint', 'wire', 'close', 'status']);
  if (!allowed.has(cmd)) {
    console.error(`Usage: vault <status|report|mint-local|export-minted|mint|wire|close> [--json]`);
    process.exit(2);
  }

  const proc = Bun.spawn(bunSpawnArgs(['scripts/vault-gap-close.ts', cmd, ...argv.slice(1)]), {
    cwd: new URL('..', import.meta.url).pathname,
    stdout: 'inherit',
    stderr: 'inherit',
    stdin: 'inherit',
    env: { ...Bun.env },
  });
  process.exit((await proc.exited) ?? 1);
}

if (import.meta.main) {
  await main();
}

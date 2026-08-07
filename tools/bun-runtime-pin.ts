#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @see https://bun.com/docs/runtime/utils#bun-revision — Bun.revision
/** Network-free exact runtime/channel check for agents, hooks, and local operators. */
import { isModuleEntrypoint } from '../lib/bun-executable.ts';
import { cliOut, tones } from '../lib/console/index.ts';
import { checkBunPin } from '../lib/verification/bun-runtime-pin.ts';

export async function runBunRuntimePinCli(argv: string[] = Bun.argv.slice(2)): Promise<number> {
  const json = argv.includes('--json');
  const unknown = argv.filter(value => value !== '--json');
  if (unknown.length > 0) throw new Error(`Unknown Bun runtime pin option: ${unknown[0]}`);

  const result = await checkBunPin();
  if (json) {
    cliOut(result, { json: true });
  } else {
    const tag = result.ok ? tones.ok('PASS') : tones.fail('FAIL');
    console.info(`${tag} ${result.message}`);
  }
  return result.ok ? 0 : 1;
}

if (isModuleEntrypoint(import.meta)) {
  try {
    process.exitCode = await runBunRuntimePinCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  }
}

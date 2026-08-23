#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/markdown#ansi-terminal-output — Bun.markdown.ansi
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/blog/bun-v1.4 — Bun 1.4 CLI kit
/**
 * Minimal Bun 1.4 CLI — copy this shape for new harness tools.
 *
 *   bun examples/bun-1.4-cli/cli.ts --help
 *   bun examples/bun-1.4-cli/cli.ts --json
 *   bun examples/bun-1.4-cli/cli.ts --typo   # gate-fail UX
 *
 * Kernel: lib/harness/bun-cli.ts · fail UX: lib/harness/gate-fail.ts
 */

import { isModuleEntrypoint } from '../../lib/bun-executable.ts';
import { statusLine, tones } from '../../lib/console/index.ts';
import {
  emitJson,
  failCli,
  printMarkdownHelp,
  setExitCode,
  spawnText,
  wantsHelp,
  wantsJson,
} from '../../lib/harness/bun-cli.ts';

const ALLOWED = new Set(['help', 'json', 'ping']);

function guard(argv: readonly string[]): string[] {
  const unknown = argv
    .filter(a => a.startsWith('--') && a !== '--')
    .map(a => a.slice(2).split('=')[0] ?? '')
    .filter(name => name && !ALLOWED.has(name));
  if (unknown.length > 0) {
    throw new Error(`unknown flag(s): ${unknown.map(u => `--${u}`).join(', ')}`);
  }
  return [...argv];
}

function help(): void {
  printMarkdownHelp(`# bun-1.4-cli (example)

Deep-pattern skeleton for FactoryWager harness CLIs.

## Flags

| Flag | Meaning |
| --- | --- |
| \`--help\` | This help (\`Bun.markdown.ansi\`) |
| \`--json\` | Machine result |
| \`--ping\` | \`Bun.spawnSync\` echo via kit |

## Kernel

\`lib/harness/bun-cli.ts\` — help · fail · json · spawnText · setExitCode
`);
}

export async function run(argv: string[] = Bun.argv.slice(2)): Promise<number> {
  const args = guard(argv);
  if (wantsHelp(args) || args.length === 0) {
    help();
    return 0;
  }

  const json = wantsJson(args);
  const ping = args.includes('--ping');
  const bunVersion = spawnText([process.execPath, '--version']).stdout;

  if (ping) {
    const echo = spawnText([process.execPath, '-e', 'console.log("pong")']);
    const payload = { ok: true, bunVersion, echo: echo.stdout };
    if (json) {
      emitJson(payload);
    } else {
      console.info(statusLine('bun', bunVersion, 'ok'));
      console.info(statusLine('ping', echo.stdout, 'ok'));
    }
    return 0;
  }

  if (json) {
    emitJson({ ok: true, bunVersion, tip: 'pass --ping' });
    return 0;
  }

  console.info(tones.dim('Pass --ping or --help'));
  return 0;
}

if (isModuleEntrypoint(import.meta)) {
  try {
    setExitCode(await run());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setExitCode(
      failCli({
        title: 'bun-1.4-cli flags',
        gate: 'bun-1.4-cli-example',
        why: message,
        fix: 'bun examples/bun-1.4-cli/cli.ts --help',
      })
    );
  }
}

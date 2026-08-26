#!/usr/bin/env bun

import { resolve } from 'node:path';

import {
  agentInventoryIssues,
  calculateAgentInventoryRatchets,
  readAgentEntrypointInventory,
} from '../lib/agents/agent-inventory.ts';

async function main(): Promise<void> {
  if (Bun.argv.length !== 2) {
    process.stderr.write(
      `guard:agents:check accepts no arguments: ${Bun.argv.slice(2).join(' ')}\n`
    );
    process.exitCode = 2;
    return;
  }
  const root = resolve(import.meta.dir, '..');
  const issues = await agentInventoryIssues(root);
  if (issues.length > 0) {
    process.stderr.write(
      `${JSON.stringify({ issues, actual: calculateAgentInventoryRatchets(await readAgentEntrypointInventory(root)) }, null, 2)}\n`
    );
    process.exitCode = 1;
    return;
  }
  const tests = Bun.spawnSync({
    cmd: [
      process.execPath,
      'test',
      'tests/agent-capability-manifest.test.ts',
      'tests/agent-capability-inventory.test.ts',
    ],
    cwd: root,
    env: { ...process.env, BUN_OPTIONS: '' },
    stdout: 'inherit',
    stderr: 'inherit',
  });
  if (tests.exitCode !== 0) {
    process.exitCode = tests.exitCode;
    return;
  }
  process.stdout.write('guard:agents:check ok\n');
}

if (import.meta.main) await main();

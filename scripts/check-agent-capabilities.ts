#!/usr/bin/env bun

// @see https://bun.com/reference/bun/argv — Bun.argv
// @updated Bun.argv · changed v0.6.10 · 2023-06-26 · https://bun.com/blog/bun-v0.6.10
// @verified Bun.argv · Bun v1.4.0 · 2026-08-25 · https://bun.com/reference/bun/argv
import {
  agentInventoryIssues,
  calculateAgentInventoryRatchets,
  readAgentEntrypointInventory,
} from '../lib/agents/agent-inventory.ts';
import {
  agentConsumerInventoryIssues,
  readAgentExecutableEntrypoints,
  summarizeAgentConsumers,
} from '../lib/agents/agent-consumer-inventory.ts';
import { resolvePath } from '../lib/path-bun.ts';

async function main(): Promise<void> {
  if (Bun.argv.length !== 2) {
    process.stderr.write(
      `guard:agents:check accepts no arguments: ${Bun.argv.slice(2).join(' ')}\n`
    );
    process.exitCode = 2;
    return;
  }
  const root = resolvePath(import.meta.dir, '..');
  const issues = [
    ...(await agentInventoryIssues(root)),
    ...(await agentConsumerInventoryIssues(root)),
  ];
  if (issues.length > 0) {
    process.stderr.write(
      `${JSON.stringify({ issues, actual: calculateAgentInventoryRatchets(await readAgentEntrypointInventory(root)) }, null, 2)}\n`
    );
    process.exitCode = 1;
    return;
  }
  const summary = summarizeAgentConsumers(await readAgentExecutableEntrypoints(root));
  process.stdout.write(`guard:agents:check ok ${JSON.stringify(summary)}\n`);
}

if (import.meta.main) await main();

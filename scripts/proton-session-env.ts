#!/usr/bin/env bun
/**
 * Print shell exports for a Proton Pass agent session (safe: no token values).
 *
 * Usage (bash/zsh):
 *   eval "$(bun scripts/proton-session-env.ts factorywager)"
 *   source scripts/agent-env.sh factorywager   # still preferred for PAT load
 *
 * This script runs `session ensure` then prints:
 *   export PROTON_PASS_SESSION_DIR=…
 *   export PROTON_PASS_KEY_PROVIDER=fs
 *
 * Never prints PROTON_PASS_PERSONAL_ACCESS_TOKEN.
 *
 * @see packages/proton-pass
 * @see scripts/agent-env.sh
 */
// @see https://bun.com/reference/bun/argv — Bun.argv
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
import { agentConfigFor, ensureAgentSession, findPassCli } from '@factorywager/proton-pass';

async function main(): Promise<void> {
  const args = applyUnknownLongOptionGuardFor('proton-session-env', Bun.argv.slice(2));
  if (args.length === 0 || args[0] === '-h' || args[0] === '--help') {
    console.error('Usage: bun scripts/proton-session-env.ts <agent> [--json]');
    console.error('Agents: factorywager | kalshi | bet-ticker | cascade | partners | cloudflare');
    process.exit(args.length === 0 ? 1 : 0);
  }

  const agentName = args[0]!;
  const json = args.includes('--json');
  let agentCfg;
  try {
    agentCfg = agentConfigFor(agentName);
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(2);
  }

  const passCli = await findPassCli();
  if (!passCli) {
    console.error('pass-cli not on PATH');
    process.exit(1);
  }

  const result = await ensureAgentSession(passCli, agentCfg);
  if (json) {
    // Machine-readable, still no secrets
    console.log(
      JSON.stringify({
        ok: result.ok,
        mode: result.mode,
        sessionDir: result.sessionDir,
        detail: result.detail,
        keyProvider: 'fs',
      })
    );
    process.exit(result.ok ? 0 : 1);
  }

  if (!result.ok) {
    console.error(`# session ensure failed: ${result.detail}`);
    process.exit(1);
  }

  // Shell-eval safe (paths only)
  const dir = result.sessionDir.replace(/'/g, `'\\''`);
  console.log(`export PROTON_PASS_SESSION_DIR='${dir}'`);
  console.log(`export PROTON_PASS_KEY_PROVIDER='fs'`);
  console.log(`# agent=${agentName} mode=${result.mode}`);
}

if (import.meta.main) {
  await main();
}

// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @updated Bun.env · fixed v1.0.3 · 2023-09-22 · https://bun.com/blog/bun-v1.0.3
// @updated Bun.env · changed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.env · fixed v1.2.8 · 2025-03-31 · https://bun.com/blog/bun-v1.2.8
// @updated Bun.env · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @verified Bun.env · Bun v1.3.14 · 2026-08-06 · https://bun.com/docs/runtime/environment-variables
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
// @verified Bun.spawn · Bun v1.3.14 · 2026-08-06 · https://bun.com/docs/runtime/child-process
/**
 * Proton Pass CLI session helpers (monorepo host).
 *
 * Shared pure probe / parse / template helpers live in `@factorywager/proton-pass`.
 * This module owns FactoryWager vault matrix + monorepo temp-run paths.
 *
 * Grounded in official docs:
 *   https://protonpass.github.io/pass-cli/get-started/configuration/
 *   https://protonpass.github.io/pass-cli/commands/info/
 *   https://protonpass.github.io/pass-cli/commands/contents/run/
 *   https://protonpass.github.io/pass-cli/commands/contents/inject/
 *
 * Shell twin: scripts/lib/pass-session.sh
 * Package: packages/proton-pass (workspace:*)
 */
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write

import {
  templateToRunEnv,
  isPassSessionReady,
  parsePassInfoJson,
  vaultNamesFromListJson,
  probePassSession,
  findPassCli,
  ensureAgentSession,
  loadPatToken,
  FACTORYWAGER_AGENT_SESSION,
  type PassInfoJson,
  type PassSessionProbe,
  type AgentSessionConfig,
  type AgentSessionResult,
} from '@factorywager/proton-pass';

export {
  templateToRunEnv,
  isPassSessionReady,
  parsePassInfoJson,
  vaultNamesFromListJson,
  probePassSession,
  findPassCli,
  ensureAgentSession,
  loadPatToken,
  FACTORYWAGER_AGENT_SESSION,
  type PassInfoJson,
  type PassSessionProbe,
  type AgentSessionConfig,
  type AgentSessionResult,
};

/** Agent project → vaults that PAT is expected to open (viewer+). */
export const PASS_PAT_VAULT_MATRIX = {
  factorywager: {
    patEnv: 'PROTON_PASS_FACTORYWAGER_TOKEN',
    patName: 'factorywager-bot',
    vaults: ['factorywager'] as const,
    /** Personal SSH key is NOT visible to this PAT. */
    notes:
      'SSH keys duplicated under factorywager for agent load; Personal needs agent-work or interactive login',
  },
  'bet-ticker': {
    patEnv: 'PROTON_PASS_BET_TICKER_TOKEN',
    patName: 'bet-ticker-bot',
    vaults: ['bet-ticker'] as const,
    notes: '',
  },
  'cascade-mover': {
    patEnv: 'PROTON_PASS_CASCADE_TOKEN',
    patName: 'cascade-bot',
    vaults: ['cascade-mover'] as const,
    notes: '',
  },
  cloudflare: {
    patEnv: 'PROTON_PASS_CLOUDFLARE_TOKEN',
    patName: 'cloudflare-bot',
    vaults: ['cloudflare', 'factorywager'] as const,
    notes: 'CF-scoped; monorepo template still uses factorywager refs',
  },
  partners: {
    patEnv: 'PROTON_PASS_PARTNERS_TOKEN',
    patName: 'partners-bot',
    vaults: ['partners'] as const,
    notes: '',
  },
  'kalshi-bot': {
    patEnv: 'PROTON_PASS_KALSHI_BOT_TOKEN',
    patName: 'kalshi-bot',
    vaults: ['kalshi-bot'] as const,
    notes: '',
  },
} as const;

export type PassAgentProject = keyof typeof PASS_PAT_VAULT_MATRIX;

/**
 * Default SSH vault for a PAT session.
 * Each agent PAT is vault-scoped — do not collapse bet-ticker/cascade onto factorywager.
 * Monorepo operator scripts still default shell `pass_ssh_vault_default` → factorywager
 * (SSH keys duplicated there for factorywager-bot).
 */
export function defaultSshVaultForPat(patName: string | null | undefined): string {
  if (!patName || patName === 'N/A') return 'factorywager';
  const n = patName.toLowerCase();
  if (n.includes('factorywager')) return 'factorywager';
  if (n.includes('bet-ticker') || n.includes('betticker')) return 'bet-ticker';
  if (n.includes('cascade')) return 'cascade-mover';
  if (n.includes('kalshi')) return 'kalshi-bot';
  if (n.includes('partner')) return 'partners';
  if (n.includes('cloudflare')) return 'factorywager';
  // Interactive / Personal PAT names (e.g. agent-work)
  return 'Personal';
}

/** Expected vault names for a PAT display name (from PASS_PAT_VAULT_MATRIX). */
export function expectedVaultsForPatName(patName: string | null | undefined): readonly string[] {
  if (!patName) return [];
  const n = patName.toLowerCase();
  for (const row of Object.values(PASS_PAT_VAULT_MATRIX)) {
    if (row.patName.toLowerCase() === n || n.includes(row.patName.toLowerCase())) {
      return row.vaults;
    }
  }
  // Heuristic fallbacks when PAT title drifts from matrix patName
  if (n.includes('factorywager')) return PASS_PAT_VAULT_MATRIX.factorywager.vaults;
  if (n.includes('bet-ticker') || n.includes('betticker'))
    return PASS_PAT_VAULT_MATRIX['bet-ticker'].vaults;
  if (n.includes('cascade')) return PASS_PAT_VAULT_MATRIX['cascade-mover'].vaults;
  if (n.includes('kalshi')) return PASS_PAT_VAULT_MATRIX['kalshi-bot'].vaults;
  if (n.includes('partner')) return PASS_PAT_VAULT_MATRIX.partners.vaults;
  if (n.includes('cloudflare')) return PASS_PAT_VAULT_MATRIX.cloudflare.vaults;
  return [];
}

export type VaultMatrixCheck = {
  ok: boolean;
  expected: string[];
  visible: string[];
  missing: string[];
  unexpected: string[];
};

/** Compare live `vault list` names against expected vaults for this PAT. */
export function checkPatVaultMatrix(
  patName: string | null | undefined,
  visibleVaults: readonly string[]
): VaultMatrixCheck {
  const expected = [...expectedVaultsForPatName(patName)];
  const visible = [...visibleVaults].sort((a, b) => a.localeCompare(b));
  if (expected.length === 0) {
    return { ok: true, expected, visible, missing: [], unexpected: [] };
  }
  const vis = new Set(visible.map(v => v.toLowerCase()));
  const exp = new Set(expected.map(v => v.toLowerCase()));
  const missing = expected.filter(v => !vis.has(v.toLowerCase()));
  const unexpected = visible.filter(v => !exp.has(v.toLowerCase()));
  return {
    ok: missing.length === 0,
    expected,
    visible,
    missing,
    unexpected,
  };
}

/**
 * Write inject-style template text to a temp run env (bare pass://), mode 0600.
 * Caller must delete the path (Bun process.exit skips finally).
 */
export async function writeRunEnvTemp(
  templateText: string,
  opts?: { dir?: string; pid?: number }
): Promise<string> {
  const dir = opts?.dir ?? Bun.env.TMPDIR ?? '/tmp';
  const pid = opts?.pid ?? process.pid;
  const path = `${dir.replace(/\/$/, '')}/fw-pass-run-${pid}.env`;
  await Bun.write(path, templateToRunEnv(templateText));
  try {
    await Bun.spawn(['chmod', '600', path]).exited;
  } catch {
    /* ignore */
  }
  return path;
}

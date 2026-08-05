/**
 * Proton Pass CLI session helpers (TypeScript).
 *
 * Grounded in official docs:
 *   https://protonpass.github.io/pass-cli/get-started/configuration/
 *   https://protonpass.github.io/pass-cli/commands/info/
 *   https://protonpass.github.io/pass-cli/commands/contents/run/
 *   https://protonpass.github.io/pass-cli/commands/contents/inject/
 *
 * Shell twin: scripts/lib/pass-session.sh
 */
// @see https://bun.com/docs/runtime/utils#bun-which — Bun.which
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write

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

export type PassInfoJson = {
  release_track?: string;
  id?: string;
  personal_access_token_name?: string | null;
  session_has_lock?: boolean;
};

/** Strip `{{ pass://… }}` → bare `pass://…` for official `pass-cli run --env-file`. */
export function templateToRunEnv(text: string): string {
  return text.replace(/\{\{\s*(pass:\/\/[^}]+?)\s*\}\}/g, '$1');
}

export function isPassSessionReady(info: PassInfoJson | null | undefined): boolean {
  const name = info?.personal_access_token_name;
  return typeof name === 'string' && name.length > 0 && name !== 'N/A';
}

/** Parse `pass-cli info --output json` (no secrets). */
export function parsePassInfoJson(raw: string): PassInfoJson | null {
  try {
    const v = JSON.parse(raw) as unknown;
    if (!v || typeof v !== 'object') return null;
    return v as PassInfoJson;
  } catch {
    return null;
  }
}

/** Extract vault names from `pass-cli vault list --output json`. */
export function vaultNamesFromListJson(raw: string): string[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  const arr: unknown[] = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && Array.isArray((parsed as { vaults?: unknown }).vaults)
      ? ((parsed as { vaults: unknown[] }).vaults ?? [])
      : [];
  const names: string[] = [];
  for (const row of arr) {
    if (!row || typeof row !== 'object') continue;
    const r = row as { name?: unknown; title?: unknown };
    const n = typeof r.name === 'string' ? r.name : typeof r.title === 'string' ? r.title : null;
    if (n) names.push(n);
  }
  return names.sort((a, b) => a.localeCompare(b));
}

export type PassSessionProbe = {
  passCliPath: string | null;
  ready: boolean;
  patName: string | null;
  sessionHasLock: boolean | null;
  vaults: string[];
  infoError?: string;
};

/** Live probe via pass-cli (requires agent session in env). */
export async function probePassSession(opts?: { listVaults?: boolean }): Promise<PassSessionProbe> {
  const passCliPath = Bun.which('pass-cli');
  if (!passCliPath) {
    return {
      passCliPath: null,
      ready: false,
      patName: null,
      sessionHasLock: null,
      vaults: [],
      infoError: 'pass-cli not on PATH',
    };
  }

  const infoProc = Bun.spawn([passCliPath, 'info', '--output', 'json'], {
    stdout: 'pipe',
    stderr: 'pipe',
    env: Bun.env,
  });
  const infoOut = await Bun.readableStreamToText(infoProc.stdout);
  const infoCode = (await infoProc.exited) ?? 1;
  if (infoCode !== 0) {
    return {
      passCliPath,
      ready: false,
      patName: null,
      sessionHasLock: null,
      vaults: [],
      infoError: `pass-cli info exit ${infoCode}`,
    };
  }
  const info = parsePassInfoJson(infoOut);
  const ready = isPassSessionReady(info);
  const patName = ready ? (info!.personal_access_token_name as string) : null;
  const sessionHasLock = typeof info?.session_has_lock === 'boolean' ? info.session_has_lock : null;

  let vaults: string[] = [];
  if (opts?.listVaults && ready) {
    const vProc = Bun.spawn([passCliPath, 'vault', 'list', '--output', 'json'], {
      stdout: 'pipe',
      stderr: 'pipe',
      env: Bun.env,
    });
    const vOut = await Bun.readableStreamToText(vProc.stdout);
    const vCode = (await vProc.exited) ?? 1;
    if (vCode === 0) vaults = vaultNamesFromListJson(vOut);
  }

  return { passCliPath, ready, patName, sessionHasLock, vaults };
}

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

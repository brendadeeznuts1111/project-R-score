// @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options — Bun.inspect.table
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// @see https://bun.com/docs/runtime/utils#bun-which — Bun.which
/**
 * Classify GitHub Actions / check-run rows so billing-offline noise
 * (empty steps, missing runner, sub-5s failure) stays out of default
 * harness:status. Local `bun run ci:core` remains SSOT.
 */
export const OFFLINE_FAIL_MS = 5000;

export type ActionsCheckClass = 'known-offline' | 'real' | 'pass' | 'pending';

/** Wire-normalized signals for one check (gh pr checks or check-runs). */
export type ActionsCheckSignals = {
  name: string;
  /** GitHub conclusion when present (failure|success|…). */
  conclusion?: string | null;
  /** `gh pr checks` state (FAILURE|SUCCESS|PENDING|…). */
  state?: string | null;
  /** `gh pr checks` bucket (fail|pass|pending|skipping|cancel). */
  bucket?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  /** Precomputed duration; otherwise derived from timestamps. */
  durationMs?: number | null;
  /**
   * Step count when observed. `0` = empty steps (offline signal).
   * `undefined` = field unavailable from this source (do not treat as empty).
   */
  stepCount?: number;
  /**
   * Runner id when observed. `null` or `0` = missing runner (offline signal).
   * Omit when the source does not expose runner identity.
   */
  runnerId?: number | null;
  link?: string | null;
};

export type ClassifiedActionsCheck = {
  name: string;
  conclusion: string;
  class: ActionsCheckClass;
  ms: number | null;
  link: string;
  bucket: string;
};

export type ActionsCheckSummary = {
  knownOffline: number;
  real: number;
  pass: number;
  pending: number;
  total: number;
};

const ZERO_DATE_PREFIX = '0001-';

/** Parse ISO timestamps; ignore GitHub zero-dates (`0001-01-01…`). */
export function parseCheckIsoMs(iso: string | null | undefined): number | undefined {
  if (!iso || iso.startsWith(ZERO_DATE_PREFIX)) return undefined;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : undefined;
}

export function durationMsBetween(
  startedAt: string | null | undefined,
  completedAt: string | null | undefined
): number | null {
  const start = parseCheckIsoMs(startedAt);
  const end = parseCheckIsoMs(completedAt);
  if (start === undefined || end === undefined) return null;
  return Math.max(0, end - start);
}

type OutcomeKind =
  | 'failure'
  | 'success'
  | 'pending'
  | 'cancelled'
  | 'skipped'
  | 'neutral'
  | 'unknown';

function lower(raw: string | null | undefined): string {
  return (raw ?? '').trim().toLowerCase();
}

const PENDING = new Set([
  'pending',
  'queued',
  'in_progress',
  'waiting',
  'requested',
  'expected',
  'skipping',
]);
const SUCCESS = new Set(['success', 'neutral', 'pass']);
const FAILURE = new Set(['failure', 'fail', 'timed_out', 'action_required', 'startup_failure']);
const CANCELLED = new Set(['cancelled', 'canceled', 'cancel', 'stale']);
const SKIPPED = new Set(['skipped']);

function outcomeFromToken(token: string): OutcomeKind | null {
  if (!token) return null;
  if (PENDING.has(token)) return 'pending';
  if (SUCCESS.has(token)) return 'success';
  if (FAILURE.has(token)) return 'failure';
  if (CANCELLED.has(token)) return 'cancelled';
  if (SKIPPED.has(token)) return 'skipped';
  return null;
}

/** Collapse conclusion / state / bucket into one outcome kind. */
export function normalizeCheckOutcome(signals: ActionsCheckSignals): OutcomeKind {
  // Prefer bucket (gh pr checks), then conclusion (check-runs), then state/status.
  for (const token of [lower(signals.bucket), lower(signals.conclusion), lower(signals.state)]) {
    const kind = outcomeFromToken(token);
    if (kind) return kind;
  }
  return 'unknown';
}

function resolveDurationMs(signals: ActionsCheckSignals): number | null {
  if (typeof signals.durationMs === 'number' && Number.isFinite(signals.durationMs)) {
    return Math.max(0, signals.durationMs);
  }
  return durationMsBetween(signals.startedAt, signals.completedAt);
}

function isMissingRunner(signals: ActionsCheckSignals): boolean {
  if (!('runnerId' in signals)) return false;
  return signals.runnerId === null || signals.runnerId === 0;
}

function hasEmptySteps(signals: ActionsCheckSignals): boolean {
  return signals.stepCount === 0;
}

/**
 * Classify one check-run / `gh pr checks` row.
 *
 * known-offline: failure AND (empty steps OR durationMs &lt; 5000 OR missing runner).
 * Unavailable optional fields do not count as empty/missing.
 */
export function classifyActionsCheck(signals: ActionsCheckSignals): ActionsCheckClass {
  const outcome = normalizeCheckOutcome(signals);
  if (outcome === 'pending' || outcome === 'unknown') return 'pending';
  if (outcome === 'success' || outcome === 'cancelled' || outcome === 'skipped') {
    return 'pass';
  }

  const durationMs = resolveDurationMs(signals);
  const offline =
    hasEmptySteps(signals) ||
    (durationMs !== null && durationMs < OFFLINE_FAIL_MS) ||
    isMissingRunner(signals);

  return offline ? 'known-offline' : 'real';
}

export function toClassifiedActionsCheck(signals: ActionsCheckSignals): ClassifiedActionsCheck {
  const outcome = normalizeCheckOutcome(signals);
  const conclusion =
    lower(signals.conclusion) ||
    lower(signals.state) ||
    lower(signals.bucket) ||
    (outcome === 'pending' ? 'pending' : outcome);
  return {
    name: signals.name || '(unnamed)',
    conclusion,
    class: classifyActionsCheck(signals),
    ms: resolveDurationMs(signals),
    link: signals.link ?? '',
    bucket: signals.bucket ?? '',
  };
}

export function classifyActionsChecks(
  rows: readonly ActionsCheckSignals[]
): ClassifiedActionsCheck[] {
  return rows.map(toClassifiedActionsCheck);
}

export function summarizeActionsChecks(
  rows: readonly ClassifiedActionsCheck[]
): ActionsCheckSummary {
  const summary: ActionsCheckSummary = {
    knownOffline: 0,
    real: 0,
    pass: 0,
    pending: 0,
    total: rows.length,
  };
  for (const row of rows) {
    if (row.class === 'known-offline') summary.knownOffline += 1;
    else if (row.class === 'real') summary.real += 1;
    else if (row.class === 'pass') summary.pass += 1;
    else summary.pending += 1;
  }
  return summary;
}

export function actionsNoiseSummaryLine(knownOffline: number): string {
  return `GHA: ${knownOffline} checks ignored (runners offline / billing) — local ci:core is SSOT`;
}

/** Non-noise rows (pass | real | pending). */
export function nonNoiseActionsChecks(
  rows: readonly ClassifiedActionsCheck[]
): ClassifiedActionsCheck[] {
  return rows.filter(r => r.class !== 'known-offline');
}

/** Actionable non-noise: real failures + pending. */
export function actionableActionsChecks(
  rows: readonly ClassifiedActionsCheck[]
): ClassifiedActionsCheck[] {
  return rows.filter(r => r.class === 'real' || r.class === 'pending');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function parseOptionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/** Boundary: `gh pr checks --json` row → signals. */
export function parseGhPrCheckRow(raw: unknown): ActionsCheckSignals | null {
  if (!isRecord(raw)) return null;
  const name = parseOptionalString(raw.name);
  if (!name) return null;
  return {
    name,
    state: parseOptionalString(raw.state) ?? null,
    bucket: parseOptionalString(raw.bucket) ?? null,
    startedAt: parseOptionalString(raw.startedAt) ?? null,
    completedAt: parseOptionalString(raw.completedAt) ?? null,
    link: parseOptionalString(raw.link) ?? null,
    // gh pr checks has no conclusion / steps / runner — duration is the offline signal
  };
}

/** Boundary: GitHub check-runs API item → signals. */
export function parseGhCheckRunRow(raw: unknown): ActionsCheckSignals | null {
  if (!isRecord(raw)) return null;
  const name = parseOptionalString(raw.name);
  if (!name) return null;

  const signals: ActionsCheckSignals = {
    name,
    conclusion: parseOptionalString(raw.conclusion) ?? null,
    state: parseOptionalString(raw.status) ?? null,
    startedAt: parseOptionalString(raw.started_at) ?? null,
    completedAt: parseOptionalString(raw.completed_at) ?? null,
    link: parseOptionalString(raw.html_url) ?? parseOptionalString(raw.details_url) ?? null,
  };

  if (Array.isArray(raw.steps)) {
    signals.stepCount = raw.steps.length;
  } else if (raw.steps === null) {
    // List endpoint often returns steps:null — treat as empty when conclusion is failure
    // only via other signals; do not set stepCount.
  }

  if ('runner_id' in raw) {
    const rid = raw.runner_id;
    if (rid === null) signals.runnerId = null;
    else {
      const n = parseOptionalNumber(rid);
      if (n !== undefined) signals.runnerId = n;
      else signals.runnerId = null;
    }
  }

  return signals;
}

async function runGhJson(args: string[], cwd?: string): Promise<unknown | null> {
  const gh = Bun.which('gh');
  if (!gh) return null;
  try {
    const proc = Bun.spawn([gh, ...args], {
      cwd,
      stdout: 'pipe',
      stderr: 'pipe',
      env: Bun.env,
    });
    const stdout = await new Response(proc.stdout).text();
    await proc.exited;
    const trimmed = stdout.trim();
    if (!trimmed) return null;
    return JSON.parse(trimmed) as unknown;
  } catch {
    return null;
  }
}

async function resolveHeadSha(cwd: string): Promise<string | null> {
  const git = Bun.which('git');
  if (!git) return null;
  try {
    const proc = Bun.spawn([git, 'rev-parse', 'HEAD'], {
      cwd,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const stdout = (await new Response(proc.stdout).text()).trim();
    const code = await proc.exited;
    if (code !== 0 || !/^[0-9a-f]{7,40}$/i.test(stdout)) return null;
    return stdout;
  } catch {
    return null;
  }
}

/**
 * Prefer `gh pr checks` on a PR branch; else latest commit check-runs.
 * Returns null when gh is missing, not a PR / no checks, or network fails.
 */
export async function fetchActionsCheckSignals(
  cwd: string = process.cwd()
): Promise<ActionsCheckSignals[] | null> {
  const prRaw = await runGhJson(
    ['pr', 'checks', '--json', 'name,state,bucket,link,startedAt,completedAt,description,workflow'],
    cwd
  );
  if (Array.isArray(prRaw)) {
    const rows = prRaw.map(parseGhPrCheckRow).filter((r): r is ActionsCheckSignals => r !== null);
    if (rows.length > 0) return rows;
  }

  const sha = await resolveHeadSha(cwd);
  if (!sha) return null;

  const apiRaw = await runGhJson(
    ['api', `repos/{owner}/{repo}/commits/${sha}/check-runs`, '--jq', '.check_runs'],
    cwd
  );
  if (Array.isArray(apiRaw)) {
    const rows = apiRaw.map(parseGhCheckRunRow).filter((r): r is ActionsCheckSignals => r !== null);
    if (rows.length > 0) return rows;
  }

  return null;
}

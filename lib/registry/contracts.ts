// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
/**
 * Public artifact contracts — structural validators for the JSON artifacts
 * served by Cloudflare Pages from `public/registry/`.
 *
 * These are the *wire contracts* for the portal: if an artifact stops
 * validating, the portal breaks. Validators are pure (no I/O) so tests can
 * run them against both live artifacts and synthetic fixtures.
 */

export type ContractResult = { ok: boolean; errors: string[] };

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const isIsoDate = (v: unknown): v is string =>
  typeof v === 'string' && !Number.isNaN(Date.parse(v));

// eslint-disable-next-line harness/no-unknown-function-param
function check(name: string, value: unknown, rules: [string, boolean][]): ContractResult {
  const errors = rules.filter(([, ok]) => !ok).map(([msg]) => `${name}: ${msg}`);
  return { ok: errors.length === 0, errors };
}

// ── ops-summary.json ─────────────────────────────────────────────
/** Contract for `public/registry/ops-summary.json` (portal ops dashboard). */
// eslint-disable-next-line harness/no-unknown-function-param
export function validateOpsSummary(v: unknown): ContractResult {
  if (!isRecord(v)) return { ok: false, errors: ['ops-summary: not an object'] };
  const rules: [string, boolean][] = [
    ['source is snapshot|live', v.source === 'snapshot' || v.source === 'live'],
    ['generated is ISO date', isIsoDate(v.generated)],
    ['liquidity.total is number', isRecord(v.liquidity) && typeof v.liquidity.total === 'number'],
    ['experts is array', Array.isArray(v.experts)],
    [
      'tree counts are numbers',
      isRecord(v.tree) &&
        ['partners', 'agents', 'subAgents', 'downstreamLiquidity'].every(
          k => typeof (v.tree as Record<string, unknown>)[k] === 'number'
        ),
    ],
    ['plays is array', Array.isArray(v.plays)],
    ['rails is array', Array.isArray(v.rails)],
    [
      'phones counts are numbers',
      isRecord(v.phones) &&
        ['inventory', 'issued', 'returned'].every(
          k => typeof (v.phones as Record<string, unknown>)[k] === 'number'
        ),
    ],
    [
      'experiments shape',
      isRecord(v.experiments) &&
        isRecord(v.experiments.byStatus) &&
        typeof v.experiments.active === 'number' &&
        Array.isArray(v.experiments.recent),
    ],
    [
      'prediction.coverage has mae/rmse numbers',
      isRecord(v.prediction) &&
        isRecord(v.prediction.coverage) &&
        typeof (v.prediction.coverage as Record<string, unknown>).mae === 'number' &&
        typeof (v.prediction.coverage as Record<string, unknown>).rmse === 'number',
    ],
  ];
  return check('ops-summary', v, rules);
}

// ── dod-registry.json ────────────────────────────────────────────
const DOD_TYPES = new Set(['balance', 'slip', 'receipt', 'id', 'location', 'device']);
const DOD_STATUSES = new Set(['pending', 'verified', 'rejected', 'flagged']);

/** Contract for one `dod-registry.json` entry. `signature` required for new entries. */
// eslint-disable-next-line harness/no-unknown-function-param
export function validateDodRegistryEntry(v: unknown, index: number): ContractResult {
  const name = `dod-registry.entries[${index}]`;
  if (!isRecord(v)) return { ok: false, errors: [`${name}: not an object`] };
  const rules: [string, boolean][] = [
    ['id is non-empty string', typeof v.id === 'string' && v.id.length > 0],
    ['agentId is non-empty string', typeof v.agentId === 'string' && v.agentId.length > 0],
    ['type is a DOD kind', typeof v.type === 'string' && DOD_TYPES.has(v.type)],
    ['status is a DOD status', typeof v.status === 'string' && DOD_STATUSES.has(v.status)],
    [
      'tamperScore is 0-100',
      typeof v.tamperScore === 'number' && v.tamperScore >= 0 && v.tamperScore <= 100,
    ],
    ['submittedAt is ISO date', isIsoDate(v.submittedAt)],
    ['processedAt is ISO date', isIsoDate(v.processedAt)],
    ['processingMs is number', typeof v.processingMs === 'number'],
    [
      'signature, when present, is 64-char hex',
      v.signature === undefined ||
        (typeof v.signature === 'string' && /^[0-9a-f]{64}$/.test(v.signature)),
    ],
  ];
  return check(name, v, rules);
}

/** Contract for `public/registry/dod-registry.json`. */
// eslint-disable-next-line harness/no-unknown-function-param
export function validateDodRegistry(v: unknown): ContractResult {
  if (!isRecord(v)) return { ok: false, errors: ['dod-registry: not an object'] };
  if (!Array.isArray(v.entries))
    return { ok: false, errors: ['dod-registry: entries not an array'] };
  const errors: string[] = [];
  v.entries.forEach((entry, i) => {
    errors.push(...validateDodRegistryEntry(entry, i).errors);
  });
  return { ok: errors.length === 0, errors };
}

/** Validate a named artifact with its registered contract. */
// eslint-disable-next-line harness/no-unknown-function-param
export function validateArtifact(
  name: 'ops-summary' | 'dod-registry',
  value: unknown
): ContractResult {
  return name === 'ops-summary' ? validateOpsSummary(value) : validateDodRegistry(value);
}

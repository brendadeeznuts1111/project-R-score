// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Secret-safe environment checklist for ops / Cloudflare / registry.
 * Never prints secret values — only set | missing | placeholder + length.
 *
 *   bun tools/env-check.ts
 *   bun run env:check
 *
 * @see config/r2-env.ts CLOUDFLARE_ENV_KEYS
 */
import { CLOUDFLARE_DEFAULTS, CLOUDFLARE_ENV_KEYS } from '../config/r2-env.ts';

export type EnvCheckSeverity = 'required' | 'recommended' | 'optional';
export type EnvCheckStatus = 'set' | 'missing' | 'placeholder' | 'default';

export type EnvCheckRow = {
  key: string;
  group: string;
  severity: EnvCheckSeverity;
  status: EnvCheckStatus;
  /** Human note — never the secret. */
  detail: string;
  ok: boolean;
};

export type EnvCheckReport = {
  generated: string;
  summary: {
    total: number;
    ok: number;
    missing: number;
    placeholder: number;
    requiredMissing: number;
  };
  rows: EnvCheckRow[];
  /** Compact matrix for tables / dashboards. */
  table: Array<{
    Key: string;
    Group: string;
    Severity: string;
    Status: string;
    Detail: string;
  }>;
};

type Spec = {
  key: string;
  group: string;
  severity: EnvCheckSeverity;
  /** Alternate keys that satisfy this requirement. */
  anyOf?: string[];
  /** Built-in code default when unset (status: default, still ok for recommended). */
  hasCodeDefault?: boolean;
  secret?: boolean;
  note?: string;
};

const PLACEHOLDER_RE = /^(your_|replace_me|changeme|xxx|TODO|place.?holder)/i;

function raw(key: string): string {
  const v = Bun.env[key];
  if (v == null) return '';
  return v.trim();
}

function secretDetail(value: string): string {
  if (!value) return '—';
  if (PLACEHOLDER_RE.test(value)) return 'placeholder-looking value';
  const len = value.length;
  if (len <= 8) return `set (len ${len})`;
  return `set (len ${len}, ${value.slice(0, 3)}…${value.slice(-2)})`;
}

function plainDetail(value: string, hasDefault: boolean): string {
  if (!value) return hasDefault ? `unset · code default` : '—';
  if (value.length > 48) return `${value.slice(0, 40)}…`;
  return value;
}

/** Full checklist — identity, secrets, registry, ops. */
export const ENV_CHECK_SPECS: Spec[] = [
  // Cloudflare identity
  {
    key: 'CLOUDFLARE_ACCOUNT_ID',
    group: 'cloudflare',
    severity: 'required',
    anyOf: ['CLOUDFLARE_ACCOUNT_ID', 'R2_ACCOUNT_ID'],
    hasCodeDefault: true,
    note: `default ${CLOUDFLARE_DEFAULTS.accountId.slice(0, 8)}…`,
  },
  {
    key: 'CLOUDFLARE_ZONE_ID',
    group: 'cloudflare',
    severity: 'recommended',
    hasCodeDefault: true,
    note: CLOUDFLARE_DEFAULTS.zones.factoryWager.id.slice(0, 8) + '…',
  },
  {
    key: 'CLOUDFLARE_ZONE_NAME',
    group: 'cloudflare',
    severity: 'optional',
    hasCodeDefault: true,
    note: CLOUDFLARE_DEFAULTS.zones.factoryWager.name,
  },
  // Secrets
  {
    key: 'CLOUDFLARE_API_TOKEN',
    group: 'cloudflare',
    severity: 'required',
    secret: true,
    note: 'Pages / API (often ~/.reasonix/.env)',
  },
  {
    key: 'CLOUDFLARE_DNS_API_TOKEN',
    group: 'cloudflare',
    severity: 'recommended',
    secret: true,
    note: 'Zone.DNS Edit for score CNAME',
  },
  {
    key: 'R2_ACCESS_KEY_ID',
    group: 'r2',
    severity: 'required',
    secret: true,
  },
  {
    key: 'R2_SECRET_ACCESS_KEY',
    group: 'r2',
    severity: 'required',
    secret: true,
  },
  {
    key: 'R2_ENDPOINT',
    group: 'r2',
    severity: 'recommended',
    anyOf: ['R2_ENDPOINT', 'R2_S3_ENDPOINT'],
    hasCodeDefault: true,
    note: 'or derived from account id',
  },
  {
    key: 'R2_REGISTRY_BUCKET',
    group: 'r2',
    severity: 'recommended',
    anyOf: ['R2_REGISTRY_BUCKET', 'FACTORY_REGISTRY_BUCKET', 'R2_BUCKET', 'R2_BUCKET_NAME'],
    hasCodeDefault: true,
    note: CLOUDFLARE_DEFAULTS.registryBucket,
  },
  // Registry / publish
  {
    key: 'REGISTRY_URL',
    group: 'registry',
    severity: 'recommended',
    anyOf: ['REGISTRY_URL', 'FACTORY_REGISTRY_URL'],
    hasCodeDefault: true,
    note: `https://${CLOUDFLARE_DEFAULTS.registryHost} or score.factory-wager.com`,
  },
  {
    key: 'REGISTRY_PUBLIC_URL',
    group: 'registry',
    severity: 'optional',
  },
  {
    key: 'REGISTRY_SECRET',
    group: 'registry',
    severity: 'required',
    anyOf: ['REGISTRY_SECRET', 'FACTORY_WAGER_TOKEN'],
    secret: true,
    note: 'publish gate; without it POST versions → 503',
  },
  {
    key: 'API_KEY',
    group: 'registry',
    severity: 'optional',
    anyOf: ['API_KEY', 'REGISTRY_API_KEY'],
    secret: true,
    note: 'optional proof POST publish',
  },
  // Ops
  {
    key: 'OPS_DB_PATH',
    group: 'ops',
    severity: 'recommended',
    hasCodeDefault: true,
    note: 'data/operations.db',
  },
  // GitHub (Bun create auth · channel resolve / bun upgrade rate limits)
  {
    key: 'GITHUB_TOKEN',
    group: 'github',
    severity: 'optional',
    secret: true,
    anyOf: ['GITHUB_TOKEN', 'GITHUB_ACCESS_TOKEN', 'GH_TOKEN'],
    note: 'aliases: GITHUB_ACCESS_TOKEN · GH_TOKEN · or `gh auth login` (channels.ts gh-cli fallback)',
  },
  {
    key: 'TELEGRAM_BOT_TOKEN',
    group: 'ops',
    severity: 'optional',
    secret: true,
    note: 'outbox / alerts',
  },
  {
    key: 'TELEGRAM_OPS_CHAT_ID',
    group: 'ops',
    severity: 'optional',
    note: 'alert chat',
  },
  {
    key: 'PLAY_SIGNING_SECRET',
    group: 'ops',
    severity: 'recommended',
    secret: true,
    note: 'defaults to operations-dev-secret if unset',
    hasCodeDefault: true,
  },
  {
    key: 'PROVISION_ENCRYPTION_KEY',
    group: 'ops',
    severity: 'optional',
    secret: true,
  },
  {
    key: 'SNAPSHOT_PHASE',
    group: 'ops',
    severity: 'optional',
    hasCodeDefault: true,
    note: 'pre | post',
  },
  {
    key: 'BUN_CONSOLE_DEPTH',
    group: 'runtime',
    severity: 'optional',
    hasCodeDefault: true,
    note: 'wrapper default 4',
  },
  {
    key: 'SLACK_WEBHOOK_URL',
    group: 'alerts',
    severity: 'optional',
    secret: true,
  },
];

// Include r2-env lists so nothing drifts
for (const key of CLOUDFLARE_ENV_KEYS.secrets) {
  if (!ENV_CHECK_SPECS.some(s => s.key === key || s.anyOf?.includes(key))) {
    ENV_CHECK_SPECS.push({
      key,
      group: 'cloudflare',
      severity: 'required',
      secret: true,
    });
  }
}

function resolveValue(spec: Spec): { value: string; sourceKey: string } {
  const keys = spec.anyOf?.length ? spec.anyOf : [spec.key];
  for (const k of keys) {
    const v = raw(k);
    if (v) return { value: v, sourceKey: k };
  }
  return { value: '', sourceKey: spec.key };
}

export function checkEnv(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = Bun.env
): EnvCheckReport {
  // Temporarily not needed — we read Bun.env via raw(); keep param for tests
  void env;
  const rows: EnvCheckRow[] = [];

  for (const spec of ENV_CHECK_SPECS) {
    const { value, sourceKey } = resolveValue(spec);
    let status: EnvCheckStatus;
    let ok: boolean;
    let detail: string;

    if (!value) {
      if (spec.hasCodeDefault) {
        status = 'default';
        ok = spec.severity !== 'required' || Boolean(spec.hasCodeDefault);
        // required with code default: still ok for account id etc.
        ok = true;
        detail = plainDetail('', true) + (spec.note ? ` · ${spec.note}` : '');
      } else {
        status = 'missing';
        ok = spec.severity === 'optional';
        detail = spec.note || '—';
      }
    } else if (spec.secret && PLACEHOLDER_RE.test(value)) {
      status = 'placeholder';
      ok = false;
      detail = secretDetail(value) + (spec.note ? ` · ${spec.note}` : '');
    } else {
      status = 'set';
      ok = true;
      detail =
        (spec.secret ? secretDetail(value) : plainDetail(value, false)) +
        (sourceKey !== spec.key ? ` · via ${sourceKey}` : '') +
        (spec.note && !spec.secret ? ` · ${spec.note}` : '');
    }

    // required without value and only "default" from empty code default is ok for account;
    // required secrets without value are not ok
    if (spec.severity === 'required' && !value && !spec.hasCodeDefault) {
      ok = false;
      status = 'missing';
    }
    if (spec.severity === 'required' && !value && spec.secret) {
      ok = false;
      status = 'missing';
    }

    rows.push({
      key: spec.key,
      group: spec.group,
      severity: spec.severity,
      status,
      detail,
      ok,
    });
  }

  const requiredMissing = rows.filter(r => r.severity === 'required' && !r.ok).length;
  const missing = rows.filter(r => r.status === 'missing').length;
  const placeholder = rows.filter(r => r.status === 'placeholder').length;
  const okCount = rows.filter(r => r.ok).length;

  const table = rows.map(r => ({
    Key: r.key,
    Group: r.group,
    Severity: r.severity,
    Status: r.ok ? r.status : `✗ ${r.status}`,
    Detail: r.detail,
  }));

  return {
    generated: new Date().toISOString(),
    summary: {
      total: rows.length,
      ok: okCount,
      missing,
      placeholder,
      requiredMissing,
    },
    rows,
    table,
  };
}

/** Dashboard-friendly subset. */
export function envCheckForHealth(): {
  summary: EnvCheckReport['summary'];
  table: EnvCheckReport['table'];
  requiredMissingKeys: string[];
} {
  const report = checkEnv();
  return {
    summary: report.summary,
    table: report.table,
    requiredMissingKeys: report.rows
      .filter(r => r.severity === 'required' && !r.ok)
      .map(r => r.key),
  };
}

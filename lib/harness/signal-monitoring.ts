// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/webview#new-bun-webview-options — WebView
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Signal monitoring registry for spine tenants.
 *
 * A TenantRunbook documents the failure signal. A SignalMonitor declares
 * how that signal is actually probed and where a failure surfaces.
 *
 * @see ./maintenance.ts
 * @see ../../docs/harness/spine-tenants.md
 * @see ../../spine/tenants.ts
 */
import { MAINTENANCE_RUNBOOKS } from './maintenance';

export type SignalMonitorKind = 'spine-tick' | 'artifact' | 'external';

export type SignalMonitor = {
  /** Spine tenant id — must match spine/tenants.ts */
  tenant: string; // brand-ok — opaque spine tenant catalog key
  /** How the probe is driven */
  kind: SignalMonitorKind;
  /** Exact probe command (usually spine:schedule:once --tenant=…) */
  checkCommand: string;
  /** Where a failed probe is observed (daemon log, CI, pager, …) */
  alertChannel: string;
  /**
   * Optional last-observation artifact (repo-relative).
   * When present and the file exists, freshness is enforced.
   */
  lastCheckPath?: string;
  /** Max age of last observation when lastCheckPath is set (minutes). */
  maxAgeMinutes?: number;
  /**
   * When true, lastCheckPath is JSONL and the last line with
   * `tenant` matching this monitor wins (spine tick log).
   */
  lastCheckFilterByTenant?: boolean;
};

/**
 * SSOT — every SPINE_TENANTS id must appear here.
 * Spine daemon ticks are the primary monitors; artifacts back freshness.
 */
export const SIGNAL_MONITORS: readonly SignalMonitor[] = [
  {
    tenant: 'docs-integrity',
    kind: 'spine-tick',
    checkCommand: 'bun run spine:schedule:once -- --tenant=docs-integrity',
    alertChannel:
      'spine daemon stdout · non-zero exit / ❌ spine tenant · docs-integrity; also reports/doc-integrity.jsonl ok:false',
    lastCheckPath: 'reports/doc-integrity.jsonl',
    maxAgeMinutes: 48 * 60,
  },
  {
    tenant: 'install-verify',
    kind: 'spine-tick',
    checkCommand: 'bun run spine:schedule:once -- --tenant=install-verify',
    alertChannel:
      'spine daemon stdout · non-zero exit / ❌ spine tenant · install-verify; WebView #status ≠ verified',
    lastCheckPath: 'reports/spine-tenant-ticks.jsonl',
    maxAgeMinutes: 48 * 60,
    lastCheckFilterByTenant: true,
  },
  {
    tenant: 'registry-integrity',
    kind: 'spine-tick',
    checkCommand: 'bun run spine:schedule:once -- --tenant=registry-integrity',
    alertChannel:
      'spine daemon stdout · non-zero exit / ❌ spine tenant · registry-integrity; reports/registry-integrity.json failures>0',
    lastCheckPath: 'reports/registry-integrity.json',
    maxAgeMinutes: 48 * 60,
  },
  {
    tenant: 'ops-snapshot',
    kind: 'spine-tick',
    checkCommand: 'bun run spine:schedule:once -- --tenant=ops-snapshot',
    alertChannel:
      'spine daemon stdout · non-zero exit / ❌ spine tenant · ops-snapshot; stale public/registry/ops-summary.json',
    lastCheckPath: 'public/registry/ops-summary.json',
    maxAgeMinutes: 60,
  },
  {
    tenant: 'portal-snapshot',
    kind: 'spine-tick',
    checkCommand: 'bun run spine:schedule:once -- --tenant=portal-snapshot',
    alertChannel:
      'spine daemon stdout · non-zero exit / ❌ spine tenant · portal-snapshot; snapshot manifest missing or failed',
    lastCheckPath: 'reports/spine-tenant-ticks.jsonl',
    maxAgeMinutes: 12 * 60,
    lastCheckFilterByTenant: true,
  },
] as const;

export function monitorByTenant(tenant: string): SignalMonitor | undefined {
  // brand-ok — opaque spine tenant catalog key
  return SIGNAL_MONITORS.find(m => m.tenant === tenant);
}

/**
 * Fail closed: bijection between active spine tenants and SIGNAL_MONITORS.
 */
export function assertSignalMonitorTenantLinks(activeTenantIds: readonly string[]): string[] {
  const active = new Set(activeTenantIds);
  const catalog = new Set(SIGNAL_MONITORS.map(m => m.tenant));
  const missing: string[] = [];
  for (const id of active) {
    if (!catalog.has(id)) missing.push(`spine tenant "${id}" has no SignalMonitor`);
  }
  for (const id of catalog) {
    if (!active.has(id)) missing.push(`SignalMonitor "${id}" has no spine tenant`);
  }
  return missing;
}

/** Fail closed: monitor fields non-empty; spine-tick probes name the tenant. */
export function assertSignalMonitorFields(): string[] {
  const missing: string[] = [];
  for (const m of SIGNAL_MONITORS) {
    if (!m.checkCommand.trim()) missing.push(`${m.tenant}.checkCommand empty`);
    if (!m.alertChannel.trim()) missing.push(`${m.tenant}.alertChannel empty`);
    if (m.kind === 'spine-tick') {
      if (!m.checkCommand.includes('spine:schedule:once')) {
        missing.push(`${m.tenant}.checkCommand must invoke spine:schedule:once`);
      }
      if (!m.checkCommand.includes(`--tenant=${m.tenant}`)) {
        missing.push(`${m.tenant}.checkCommand must include --tenant=${m.tenant}`);
      }
    }
    if (m.lastCheckPath && (m.maxAgeMinutes === undefined || m.maxAgeMinutes <= 0)) {
      missing.push(`${m.tenant}.maxAgeMinutes required when lastCheckPath is set`);
    }
  }
  return missing;
}

/**
 * Fail closed: runbook.signal mentions the monitor probe (docs ↔ config).
 */
export function assertSignalMonitorAlignedWithRunbook(): string[] {
  const missing: string[] = [];
  for (const m of SIGNAL_MONITORS) {
    const runbook = MAINTENANCE_RUNBOOKS.find(r => r.tenant === m.tenant);
    if (!runbook) {
      missing.push(`SignalMonitor "${m.tenant}" has no TenantRunbook`);
      continue;
    }
    if (
      !runbook.signal.includes(m.checkCommand) &&
      !runbook.signal.includes(`--tenant=${m.tenant}`)
    ) {
      missing.push(`${m.tenant}: runbook.signal must mention checkCommand or --tenant=${m.tenant}`);
    }
  }
  return missing;
}

type TickRow = { ts?: string; checkedAt?: string; tenant?: string; ok?: boolean };

async function readLastObservationTs(root: string, m: SignalMonitor): Promise<string | undefined> {
  if (!m.lastCheckPath) return undefined;
  const abs = `${root}/${m.lastCheckPath}`;
  const file = Bun.file(abs);
  if (!(await file.exists())) return undefined;
  const text = (await file.text()).trim();
  if (!text) return undefined;
  const lines = text.split('\n').filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    let row: TickRow;
    try {
      row = JSON.parse(lines[i]!) as TickRow;
    } catch {
      continue;
    }
    if (m.lastCheckFilterByTenant && row.tenant !== m.tenant) continue;
    if (typeof row.ts === 'string' && row.ts.length > 0) return row.ts;
    if (typeof row.checkedAt === 'string' && row.checkedAt.length > 0) {
      return row.checkedAt;
    }
  }
  return undefined;
}

/**
 * Soft freshness: when lastCheckPath exists, last observation must be within maxAgeMinutes.
 * Missing artifact → no failure (daemon may not have run on this machine).
 * Set SIGNAL_MONITOR_FRESHNESS=strict to require the artifact.
 */
export async function assertSignalMonitorFreshness(root: string): Promise<string[]> {
  const strict = Bun.env.SIGNAL_MONITOR_FRESHNESS === 'strict';
  const failures: string[] = [];
  const now = Date.now();

  for (const m of SIGNAL_MONITORS) {
    if (!m.lastCheckPath || m.maxAgeMinutes === undefined) continue;
    const ts = await readLastObservationTs(root, m);
    if (!ts) {
      if (strict) {
        failures.push(
          `${m.tenant}: missing last-check artifact ${m.lastCheckPath} (SIGNAL_MONITOR_FRESHNESS=strict)`
        );
      }
      continue;
    }
    const at = Date.parse(ts);
    if (Number.isNaN(at)) {
      failures.push(`${m.tenant}: unparseable ts ${ts} in ${m.lastCheckPath}`);
      continue;
    }
    const ageMin = (now - at) / 60_000;
    if (ageMin > m.maxAgeMinutes) {
      failures.push(
        `${m.tenant}: last check ${ts} is ${Math.round(ageMin)}m old (max ${m.maxAgeMinutes}m) · ${m.lastCheckPath}`
      );
    }
  }
  return failures;
}

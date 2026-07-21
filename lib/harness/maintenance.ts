// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/bunfig#run-noorphans-dont-leave-orphan-processes-behind — noOrphans
/**
 * Continuous-maintenance runbooks for spine tenants.
 *
 * A ProofPath is a one-shot claim (true/false). A TenantRunbook is the
 * response loop when that claim is re-evaluated on a schedule.
 *
 * @see ../../docs/harness/spine-tenants.md
 * @see ../../docs/harness/tenants/
 * @see ../spine/tenants.ts
 */
import { CRITICAL_PROOF_PATHS } from './proof';

/** Default freshRerun wall-clock limit (ms). Override: HARNESS_FRESH_RERUN_TIMEOUT_MS. */
export const DEFAULT_FRESH_RERUN_TIMEOUT_MS = 120_000;

export function freshRerunTimeoutMs(): number {
  const raw = Bun.env.HARNESS_FRESH_RERUN_TIMEOUT_MS;
  if (raw === undefined || raw === '') return DEFAULT_FRESH_RERUN_TIMEOUT_MS;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_FRESH_RERUN_TIMEOUT_MS;
  return Math.floor(n);
}

/**
 * Programmatic retirement condition. Declared on active runbooks (schema only);
 * executed for tombstones when `retirementVerified: true`.
 */
export type RetirementCheck = {
  /** What is being verified (should align with `retirement` prose) */
  description: string;
  /** Shell-free argv command; exit 0 ⇒ condition met */
  command?: string;
  /** Also require this proof’s freshRerun to exit 0 */
  proofId?: string; // brand-ok — opaque proof-path catalog key
};

export type TenantRunbook = {
  /** Spine tenant id — must match spine/tenants.ts */
  tenant: string; // brand-ok — opaque spine tenant catalog key
  /** Observable symptom that the tenant is unhealthy */
  signal: string;
  /** Exact repair command (or first step) */
  intervention: string;
  /** ProofPath.id that proves the tenant’s work still holds */
  proofId: string; // brand-ok — opaque proof-path catalog key
  /** Condition under which this tenant/runbook may be removed */
  retirement: string;
  /**
   * Operator attestation that `retirement` is satisfied.
   * Active (`MAINTENANCE_RUNBOOKS`): must be `false`.
   * Tombstone (`RETIRED_TENANT_RUNBOOKS`): must be `true` before/with removal from spine.
   */
  retirementVerified: boolean;
  /**
   * How to verify `retirement` programmatically.
   * Active: schema-checked only. Tombstone: executed (must pass if present).
   */
  retirementCheck?: RetirementCheck;
  /** UTC crontab (reference; enforcement is spine/tenants.ts) */
  schedule?: string;
  /** Command that validates the runbook doc / catalog entry */
  freshRerun: string;
  /** Repo-relative markdown owner */
  docPath: string;
};

/**
 * SSOT catalog — every SPINE_TENANTS id must appear here.
 * Doc files under docs/harness/tenants/<tenant>.md must exist.
 * Active entries must keep `retirementVerified: false`.
 */
export const MAINTENANCE_RUNBOOKS: readonly TenantRunbook[] = [
  {
    tenant: 'docs-integrity',
    signal:
      '`bun run spine:schedule:once -- --tenant=docs-integrity` exits non-zero (integrity FAIL)',
    intervention: 'bun tools/bun-doc-refs.ts schedule --once',
    proofId: 'docs-integrity',
    retirement:
      'Remove when docs integrity is solely owned by a required CI / operate schedule that does not need the spine daemon',
    retirementVerified: false,
    retirementCheck: {
      // Shell pipelines are rejected by the ratchet; CI ownership is the argv-safe probe
      // (flip tenants.docs-integrity=true in lib/harness/ci-owned-tenants.json when CI owns it).
      description: 'Ensure docs-integrity is part of CI pre-deploy gate',
      command: 'bun scripts/retirement-check-ci-owner.ts --tenant=docs-integrity',
    },
    schedule: '0 6 * * *',
    freshRerun: 'bun run docs:tenant-docs-integrity',
    docPath: 'docs/harness/tenants/docs-integrity.md',
  },
  {
    tenant: 'install-verify',
    signal:
      '`bun run spine:schedule:once -- --tenant=install-verify` exits non-zero (journey smoke fail)',
    intervention: 'bun run test:install-verify',
    proofId: 'install-verify-journey',
    retirement:
      'Remove when install-verify journey proof is enforced by a pre-deploy / required CI gate on a schedule and spine is no longer the only periodic re-proof',
    retirementVerified: false,
    retirementCheck: {
      description: 'install-verify journey proof is owned by CI pre-deploy gate',
      // Tombstone execution re-runs this proof’s freshRerun; flip ci-owned-tenants when
      // CI (not spine) is the periodic owner before retiring.
      proofId: 'install-verify-journey',
    },
    schedule: '30 6 * * *',
    freshRerun: 'bun run docs:tenant-install-verify',
    docPath: 'docs/harness/tenants/install-verify.md',
  },
] as const;

/**
 * Tombstones for tenants removed from SPINE_TENANTS after operator attestation.
 * Move an active runbook here with `retirementVerified: true` in the same PR
 * that deletes the spine tenant (keeps multi-tenant ≥2 via another active tenant).
 */
export const RETIRED_TENANT_RUNBOOKS: readonly TenantRunbook[] = [];

export function runbookByTenant(tenant: string): TenantRunbook | undefined {
  // brand-ok — opaque spine tenant catalog key
  return MAINTENANCE_RUNBOOKS.find(r => r.tenant === tenant);
}

export function retiredRunbookByTenant(tenant: string): TenantRunbook | undefined {
  // brand-ok — opaque spine tenant catalog key
  return RETIRED_TENANT_RUNBOOKS.find(r => r.tenant === tenant);
}

/** Fail closed: every proofId must resolve in CRITICAL_PROOF_PATHS. */
export function assertRunbookProofLinks(): string[] {
  const ids = new Set(CRITICAL_PROOF_PATHS.map(p => p.id));
  const missing: string[] = [];
  for (const r of MAINTENANCE_RUNBOOKS) {
    if (!ids.has(r.proofId)) missing.push(`${r.tenant} → proofId ${r.proofId}`);
  }
  return missing;
}

/**
 * Fail closed: bijection between active spine tenant ids and runbook.tenant.
 * Pass `SPINE_TENANTS.map(t => t.id)` from the caller (keeps lib/ free of spine imports).
 */
export function assertRunbookTenantLinks(activeTenantIds: readonly string[]): string[] {
  const active = new Set(activeTenantIds);
  const catalog = new Set(MAINTENANCE_RUNBOOKS.map(r => r.tenant));
  const missing: string[] = [];
  for (const id of active) {
    if (!catalog.has(id)) missing.push(`spine tenant "${id}" has no TenantRunbook`);
  }
  for (const id of catalog) {
    if (!active.has(id)) missing.push(`TenantRunbook "${id}" has no spine tenant`);
  }
  return missing;
}

/**
 * Fail closed: retirement attestation.
 * - Active runbooks must keep `retirementVerified: false`.
 * - Retired tombstones must have `retirementVerified: true`, non-empty condition,
 *   and must not still be in SPINE_TENANTS or MAINTENANCE_RUNBOOKS.
 */
export function assertRetirementEnforcement(activeTenantIds: readonly string[]): string[] {
  const activeSpine = new Set(activeTenantIds);
  const activeCatalog = new Set(MAINTENANCE_RUNBOOKS.map(r => r.tenant));
  const retiredCatalog = new Set(RETIRED_TENANT_RUNBOOKS.map(r => r.tenant));
  const failures: string[] = [];

  for (const r of MAINTENANCE_RUNBOOKS) {
    if (r.retirementVerified) {
      failures.push(
        `${r.tenant}: active MAINTENANCE_RUNBOOKS entry must have retirementVerified: false ` +
          `(attest then move to RETIRED_TENANT_RUNBOOKS when removing from spine)`
      );
    }
  }

  for (const r of RETIRED_TENANT_RUNBOOKS) {
    if (!r.retirementVerified) {
      failures.push(
        `${r.tenant}: RETIRED_TENANT_RUNBOOKS entry must have retirementVerified: true`
      );
    }
    if (!r.retirement.trim()) {
      failures.push(`${r.tenant}: retired tombstone retirement condition empty`);
    }
    if (activeSpine.has(r.tenant)) {
      failures.push(
        `${r.tenant}: retired tombstone still listed in SPINE_TENANTS — remove spine entry first`
      );
    }
    if (activeCatalog.has(r.tenant)) {
      failures.push(
        `${r.tenant}: cannot be in both MAINTENANCE_RUNBOOKS and RETIRED_TENANT_RUNBOOKS`
      );
    }
  }

  for (const id of retiredCatalog) {
    if (activeCatalog.has(id)) {
      failures.push(`${id}: duplicate active + retired runbook`);
    }
  }

  return failures;
}

const SHELL_META_RE = /[|><;`]|\$\(|&&|\|\|/;

/** Fail closed: retirementCheck shape (active + retired). Does not execute probes. */
export function assertRetirementCheckShape(): string[] {
  const proofIds = new Set(CRITICAL_PROOF_PATHS.map(p => p.id));
  const failures: string[] = [];
  const all = [...MAINTENANCE_RUNBOOKS, ...RETIRED_TENANT_RUNBOOKS];

  for (const r of all) {
    const check = r.retirementCheck;
    if (!check) {
      if (r.retirementVerified) {
        // tombstone without check — warned at execute time; shape OK
        continue;
      }
      failures.push(`${r.tenant}: active runbook must declare retirementCheck`);
      continue;
    }
    if (!check.description.trim()) {
      failures.push(`${r.tenant}.retirementCheck.description empty`);
    }
    if (!check.command && !check.proofId) {
      failures.push(`${r.tenant}.retirementCheck needs command and/or proofId`);
    }
    if (check.command) {
      if (SHELL_META_RE.test(check.command)) {
        failures.push(`${r.tenant}.retirementCheck.command: shell metacharacters not allowed`);
      }
      const argv = argvFromCommand(check.command);
      if (argv[0] !== 'bun') {
        failures.push(`${r.tenant}.retirementCheck.command must start with bun`);
      }
    }
    if (check.proofId && !proofIds.has(check.proofId)) {
      failures.push(
        `${r.tenant}.retirementCheck.proofId "${check.proofId}" not in CRITICAL_PROOF_PATHS`
      );
    }
  }
  return failures;
}

export type RetirementConditionResult = {
  failures: string[];
  warnings: string[];
};

/**
 * Execute retirementCheck for tombstones only.
 * Missing check → warning (manual attestation still allowed).
 * Present check → command and/or proof freshRerun must exit 0.
 */
export async function assertRetirementConditionCheck(
  cwd: string
): Promise<RetirementConditionResult> {
  const failures: string[] = [];
  const warnings: string[] = [];
  const byId = new Map(CRITICAL_PROOF_PATHS.map(p => [p.id, p]));

  for (const r of RETIRED_TENANT_RUNBOOKS) {
    const check = r.retirementCheck;
    if (!check) {
      warnings.push(`${r.tenant}: tombstone has no retirementCheck — condition not auto-verified`);
      continue;
    }
    console.info(`▶ retirementCheck · ${r.tenant} · ${check.description}`);
    if (check.command) {
      const { code } = await runFreshRerunCommand(check.command, cwd);
      if (code !== 0) {
        failures.push(`${r.tenant}.retirementCheck.command \`${check.command}\` exit ${code}`);
      }
    }
    if (check.proofId) {
      const proof = byId.get(check.proofId);
      if (!proof) {
        failures.push(`${r.tenant}.retirementCheck.proofId missing: ${check.proofId}`);
        continue;
      }
      console.info(`▶ retirementCheck proof · ${check.proofId} · ${proof.freshRerun}`);
      const { code } = await runFreshRerunCommand(proof.freshRerun, cwd);
      if (code !== 0) {
        failures.push(
          `${r.tenant}.retirementCheck.proofId ${check.proofId} freshRerun exit ${code}`
        );
      }
    }
  }

  return { failures, warnings };
}

/** Fail closed: catalog signal / intervention / retirement are non-empty. */
export function assertRunbookFieldsNonEmpty(): string[] {
  const missing: string[] = [];
  for (const r of MAINTENANCE_RUNBOOKS) {
    if (!r.signal.trim()) missing.push(`${r.tenant}.signal empty`);
    if (!r.intervention.trim()) missing.push(`${r.tenant}.intervention empty`);
    if (!r.retirement.trim()) missing.push(`${r.tenant}.retirement empty`);
  }
  return missing;
}

/**
 * Fail closed: intervention text contains the linked proof’s freshRerun command.
 */
export function assertRunbookInterventionContainsProofFreshRerun(): string[] {
  const byId = new Map(CRITICAL_PROOF_PATHS.map(p => [p.id, p]));
  const missing: string[] = [];
  for (const r of MAINTENANCE_RUNBOOKS) {
    const proof = byId.get(r.proofId);
    if (!proof) {
      missing.push(`${r.tenant} → proofId ${r.proofId} missing`);
      continue;
    }
    if (!r.intervention.includes(proof.freshRerun)) {
      missing.push(
        `${r.tenant}.intervention must include proof "${r.proofId}" freshRerun \`${proof.freshRerun}\``
      );
    }
  }
  return missing;
}

/** Split a freshRerun / intervention command into argv (no shell). */
export function argvFromCommand(cmd: string): string[] {
  return cmd.trim().split(/\s+/).filter(Boolean);
}

/** Run a catalog command; inherit stdio so failures are diagnosable. */
export async function runFreshRerunCommand(
  cmd: string,
  cwd: string,
  opts?: { timeoutMs?: number }
): Promise<{ code: number; cmd: string; timedOut?: boolean }> {
  const argv = argvFromCommand(cmd);
  if (argv.length === 0) return { code: 1, cmd };
  const timeoutMs = opts?.timeoutMs ?? freshRerunTimeoutMs();
  const proc = Bun.spawn(argv, { cwd, stdout: 'inherit', stderr: 'inherit' });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = await new Promise<boolean>(resolve => {
    timer = setTimeout(() => {
      try {
        proc.kill();
      } catch {
        /* already exited */
      }
      resolve(true);
    }, timeoutMs);
    void proc.exited.then(() => {
      if (timer !== undefined) clearTimeout(timer);
      resolve(false);
    });
  });
  const code = timedOut ? 124 : ((await proc.exited) ?? 1);
  if (timedOut) {
    console.error(`❌ freshRerun timed out after ${timeoutMs}ms · ${cmd}`);
  }
  return { code, cmd, timedOut: timedOut || undefined };
}

/** Fail closed: each TenantRunbook.freshRerun exits 0. */
export async function assertRunbookFreshRerunsPass(cwd: string): Promise<string[]> {
  const failures: string[] = [];
  for (const r of MAINTENANCE_RUNBOOKS) {
    console.info(`▶ runbook freshRerun · ${r.tenant} · ${r.freshRerun}`);
    const { code } = await runFreshRerunCommand(r.freshRerun, cwd);
    if (code !== 0) {
      failures.push(`${r.tenant}.freshRerun \`${r.freshRerun}\` exit ${code}`);
    }
  }
  return failures;
}

/**
 * Fail closed: each linked proof’s freshRerun exits 0 (deduped by command string).
 */
export async function assertLinkedProofFreshRerunsPass(cwd: string): Promise<string[]> {
  const byId = new Map(CRITICAL_PROOF_PATHS.map(p => [p.id, p]));
  const seen = new Set<string>();
  const failures: string[] = [];
  for (const r of MAINTENANCE_RUNBOOKS) {
    const proof = byId.get(r.proofId);
    if (!proof) {
      failures.push(`${r.tenant} → proofId ${r.proofId} missing`);
      continue;
    }
    if (seen.has(proof.freshRerun)) continue;
    seen.add(proof.freshRerun);
    console.info(`▶ proof freshRerun · ${r.proofId} · ${proof.freshRerun}`);
    const { code } = await runFreshRerunCommand(proof.freshRerun, cwd);
    if (code !== 0) {
      failures.push(`proof ${r.proofId} freshRerun \`${proof.freshRerun}\` exit ${code}`);
    }
  }
  return failures;
}

// @see https://developers.cloudflare.com/cloudflare-one/access-controls/policies/
// @see https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file (policy file)
// @see https://bun.com/docs/runtime/networking/dns — Bun.dns.lookup
/**
 * portal-cli doctor — Infra group (Access + host inventory).
 *
 *   infra-access-policy     warn  · all — .cloudflare-access.yml static verify
 *   infra-ledger-access     fatal · all — ledger Access (live) or policy (offline)
 *   infra-portal-access     warn  · all — score + pages.dev /portal
 *   infra-terminal-host     warn  · all — terminal dangling 502 (live only)
 *   infra-reasonix-dns      info  · dev  — reasonix NXDOMAIN until provisioned (live)
 *
 * Offline: policy SSOT only (no fake green). Live: HTTPS + Bun.dns.
 */

import { joinPath } from '../../scripts/lib/fs-bun.ts';
import {
  LEDGER_ACCESS_DOMAIN,
  LEDGER_ACCESS_URL,
  PORTAL_ACCESS_CUSTOM_URL,
  PORTAL_ACCESS_DOMAIN,
  PORTAL_ACCESS_PAGES_URL,
  probeCloudflareAccess,
  probePortalAccess,
  probeReasonixDns,
  probeTerminalHost,
  type AccessProbeFetch,
} from '../../lib/verification/cloudflare-access-live.ts';
import { verifyCloudflareAccessPolicyText } from '../../lib/verification/cloudflare-access-policy.ts';
import type { PortalDoctorCheck } from './portal-cli-doctor.ts';

const ACCESS_DOCS = 'https://developers.cloudflare.com/cloudflare-one/access-controls/policies/';
const ACCESS_POLICY_PATH = '.cloudflare-access.yml';
const TUNNEL_DOCS = 'docs/harness/tenants/tunnel-inventory.md';

/** Display labels (AccessDomainId → string at the doctor message boundary). */
const LEDGER_DOMAIN = String(LEDGER_ACCESS_DOMAIN);
const PORTAL_DOMAIN = String(PORTAL_ACCESS_DOMAIN);

function withMeta(
  base: PortalDoctorCheck,
  meta: Partial<Omit<PortalDoctorCheck, 'id' | 'level' | 'ok' | 'message' | 'group'>>
): PortalDoctorCheck {
  return { ...base, ...meta };
}

export type RunInfraChecksOpts = {
  cwd?: string;
  fetch?: AccessProbeFetch;
  timeoutMs?: number;
  /** Skip live HTTPS/DNS — use policy file only (bake / CI fingerprint). */
  skipLive?: boolean;
};

export type PolicySurfacePresence = {
  loadOk: boolean;
  ledger: boolean;
  portal: boolean;
  policyOk: boolean;
  issues: string[];
};

/** Read .cloudflare-access.yml and report required surface presence. */
export async function loadAccessPolicySurfaces(
  cwd: string = process.cwd()
): Promise<PolicySurfacePresence> {
  const path = joinPath(cwd, ACCESS_POLICY_PATH);
  try {
    if (!(await Bun.file(path).exists())) {
      return {
        loadOk: false,
        ledger: false,
        portal: false,
        policyOk: false,
        issues: [`missing ${ACCESS_POLICY_PATH}`],
      };
    }
    const text = await Bun.file(path).text();
    const report = verifyCloudflareAccessPolicyText(text);
    return {
      loadOk: true,
      ledger: text.includes(LEDGER_DOMAIN),
      portal: text.includes(PORTAL_DOMAIN),
      policyOk: report.ok,
      issues: report.issues.map(i => `${i.code}: ${i.message}`),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      loadOk: false,
      ledger: false,
      portal: false,
      policyOk: false,
      issues: [msg],
    };
  }
}

function policyCheck(policy: PolicySurfacePresence): PortalDoctorCheck {
  return withMeta(
    {
      id: 'infra-access-policy',
      level: 'warn',
      group: 'infra',
      ok: policy.loadOk && policy.policyOk,
      message:
        policy.loadOk && policy.policyOk
          ? `${ACCESS_POLICY_PATH} valid · ledger=${policy.ledger ? 'yes' : 'no'} · portal=${policy.portal ? 'yes' : 'no'}`
          : policy.loadOk
            ? `policy issues: ${policy.issues.slice(0, 2).join('; ')}`
            : (policy.issues[0] ?? 'policy load failed'),
      source: ACCESS_DOCS,
    },
    {
      fixCommand:
        policy.loadOk && policy.policyOk
          ? undefined
          : `bun run cloudflare:access:verify · edit ${ACCESS_POLICY_PATH}`,
      impact: 'Scoped Access SSOT must stay valid before apply',
      autoFixable: false,
      timeToFix: policy.loadOk && policy.policyOk ? undefined : '10–30 min',
      envScope: 'all',
    }
  );
}

/**
 * Access + host inventory checks (group: infra).
 */
export async function runInfraChecks(opts: RunInfraChecksOpts = {}): Promise<PortalDoctorCheck[]> {
  const cwd = opts.cwd ?? process.cwd();
  const policy = await loadAccessPolicySurfaces(cwd);
  const checks: PortalDoctorCheck[] = [policyCheck(policy)];

  if (opts.skipLive) {
    checks.push(
      withMeta(
        {
          id: 'infra-ledger-access',
          level: 'fatal',
          group: 'infra',
          ok: policy.ledger,
          message: policy.ledger
            ? `ledger · policy has ${LEDGER_DOMAIN} (offline · no live probe)`
            : `ledger · missing from ${ACCESS_POLICY_PATH}`,
          source: ACCESS_DOCS,
        },
        {
          fixCommand: policy.ledger
            ? undefined
            : `Add self_hosted app for ${LEDGER_DOMAIN} in ${ACCESS_POLICY_PATH}`,
          impact: 'Policy SSOT must list ledger; --group infra (live) probes the edge',
          autoFixable: false,
          timeToFix: policy.ledger ? undefined : '15–45 min',
          envScope: 'all',
        }
      ),
      withMeta(
        {
          id: 'infra-portal-access',
          level: 'warn',
          group: 'infra',
          ok: policy.portal,
          message: policy.portal
            ? `portal · policy has ${PORTAL_DOMAIN} staged (offline · no live probe)`
            : `portal · missing from ${ACCESS_POLICY_PATH}`,
          source: ACCESS_DOCS,
        },
        {
          fixCommand: policy.portal
            ? undefined
            : `Add self_hosted app for ${PORTAL_DOMAIN} in ${ACCESS_POLICY_PATH}`,
          impact: 'Staged in policy only until Access apply + live probe green',
          autoFixable: false,
          timeToFix: policy.portal ? undefined : '15–45 min',
          envScope: 'all',
        }
      )
    );
    return checks;
  }

  // Live Access
  const ledger = await probeCloudflareAccess(LEDGER_ACCESS_URL, {
    fetch: opts.fetch,
    timeoutMs: opts.timeoutMs,
  });
  checks.push(
    withMeta(
      {
        id: 'infra-ledger-access',
        level: 'fatal',
        group: 'infra',
        ok: ledger.accessEnforced,
        message: ledger.accessEnforced
          ? `ledger · Access · ${ledger.evidence}`
          : `ledger · open · ${ledger.evidence}`,
        source: ACCESS_DOCS,
      },
      {
        fixCommand: ledger.accessEnforced
          ? undefined
          : `Apply ledger Access app · ${ACCESS_POLICY_PATH} · bun run cloudflare:access:verify`,
        impact: 'Ledger must not be reachable without Access login',
        autoFixable: false,
        timeToFix: ledger.accessEnforced ? undefined : '15–45 min',
        envScope: 'all',
      }
    )
  );

  const portal = await probePortalAccess({
    fetch: opts.fetch,
    timeoutMs: opts.timeoutMs,
  });
  const scoreBit = portal.custom.accessEnforced ? 'score Access' : 'score open';
  const pagesBit = portal.pages.accessEnforced ? 'pages.dev Access' : 'pages.dev open';
  checks.push(
    withMeta(
      {
        id: 'infra-portal-access',
        level: 'warn',
        group: 'infra',
        ok: portal.ok,
        message: portal.ok
          ? `portal · Access · ${scoreBit} · ${pagesBit}`
          : `portal · gap · ${scoreBit} · ${pagesBit}`,
        source: ACCESS_DOCS,
      },
      {
        fixCommand: portal.ok
          ? undefined
          : `Apply ${PORTAL_DOMAIN} + Pages Access (needs Access-scoped API token) · ${ACCESS_POLICY_PATH}`,
        impact: 'Portal remains public until score /portal and pages.dev both challenge',
        autoFixable: false,
        timeToFix: portal.ok ? undefined : '30–90 min',
        envScope: 'all',
      }
    )
  );

  // Host inventory
  const terminal = await probeTerminalHost({
    fetch: opts.fetch,
    timeoutMs: opts.timeoutMs,
  });
  // 502 dangling → fail warn; NXDOMAIN → pass (decommissioned)
  const terminalOk = !terminal.resolves || terminal.status !== 502;
  checks.push(
    withMeta(
      {
        id: 'infra-terminal-host',
        level: 'warn',
        group: 'infra',
        ok: terminalOk,
        message: `terminal · ${terminal.evidence}`,
        source: TUNNEL_DOCS,
      },
      {
        fixCommand: terminalOk
          ? undefined
          : 'Delete DNS for terminal.factory-wager.com or attach a real tunnel · tunnel-inventory.md',
        impact: 'Dangling 502 confuses operators; not Sports Terminal until provisioned',
        autoFixable: false,
        timeToFix: terminalOk ? undefined : '15–60 min',
        envScope: 'all',
      }
    )
  );

  const reasonix = await probeReasonixDns();
  checks.push(
    withMeta(
      {
        id: 'infra-reasonix-dns',
        level: 'info',
        group: 'infra',
        ok: true,
        message: `reasonix · ${reasonix.evidence}`,
        source: ACCESS_DOCS,
      },
      {
        fixCommand: reasonix.resolves
          ? 'Confirm reasonix tunnel + Access or remove DNS'
          : undefined,
        impact: 'Staged Access app; add DNS only when Reasonix is ready',
        autoFixable: false,
        envScope: 'dev',
      }
    )
  );

  return checks;
}

export { LEDGER_ACCESS_URL, PORTAL_ACCESS_CUSTOM_URL, PORTAL_ACCESS_PAGES_URL };

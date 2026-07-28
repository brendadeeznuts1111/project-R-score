// @see https://developers.cloudflare.com/cloudflare-one/access-controls/policies/
// @see https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file (policy file)
/**
 * portal-cli doctor — Infra group (Cloudflare Access).
 *
 *   infra-ledger-access  fatal · all — ledger behind Access (live) or app in policy (offline)
 *   infra-portal-access  warn  · all — score + pages.dev /portal Access (live) or staged app (offline)
 *
 * Offline mode never fakes green without policy evidence.
 * Live mode: unauthenticated HTTPS HEAD/GET probes.
 */

import { joinPath } from '../../scripts/lib/fs-bun.ts';
import {
  LEDGER_ACCESS_URL,
  PORTAL_ACCESS_CUSTOM_URL,
  PORTAL_ACCESS_PAGES_URL,
  probeCloudflareAccess,
  probePortalAccess,
  type AccessProbeFetch,
} from '../../lib/verification/cloudflare-access-live.ts';
import { verifyCloudflareAccessPolicyText } from '../../lib/verification/cloudflare-access-policy.ts';
import type { PortalDoctorCheck } from './portal-cli-doctor.ts';

const ACCESS_DOCS = 'https://developers.cloudflare.com/cloudflare-one/access-controls/policies/';
const ACCESS_POLICY_PATH = '.cloudflare-access.yml';

const LEDGER_DOMAIN = 'ledger.factory-wager.com';
const PORTAL_DOMAIN = 'score.factory-wager.com/portal';

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
  /** Skip live HTTPS probes — use policy file only (bake / CI fingerprint). */
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
    // Domain presence even if other policy issues exist
    const hasLedger = text.includes(LEDGER_DOMAIN);
    const hasPortal = text.includes(PORTAL_DOMAIN);
    return {
      loadOk: true,
      ledger: hasLedger,
      portal: hasPortal,
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

/**
 * Access enforcement checks (group: infra).
 */
export async function runInfraChecks(opts: RunInfraChecksOpts = {}): Promise<PortalDoctorCheck[]> {
  const cwd = opts.cwd ?? process.cwd();
  const policy = await loadAccessPolicySurfaces(cwd);
  const checks: PortalDoctorCheck[] = [];

  if (opts.skipLive) {
    // Offline: prove policy SSOT still claims the surfaces — never fake "Access enforced"
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
            : `Add self_hosted app for ${LEDGER_DOMAIN} in ${ACCESS_POLICY_PATH} · bun run cloudflare:access:verify`,
          impact: 'Policy SSOT must list ledger; use --live-access to probe the edge',
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
          impact:
            'Staged portal Access in policy only; live still public until apply + --live-access',
          autoFixable: false,
          timeToFix: policy.portal ? undefined : '15–45 min',
          envScope: 'all',
        }
      )
    );
    return checks;
  }

  // Live probes
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
          : `bun run cloudflare:access:verify · apply ledger app in ${ACCESS_POLICY_PATH}`,
        impact: 'Ledger tunnel origin must not be reachable without Cloudflare Access login',
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
          : `Promote /portal Access on score + pages.dev (${ACCESS_POLICY_PATH})`,
        impact:
          'Operator portal is public until custom-domain /portal and pages.dev Access are both live',
        autoFixable: false,
        timeToFix: portal.ok ? undefined : '30–90 min',
        envScope: 'all',
      }
    )
  );

  return checks;
}

export { LEDGER_ACCESS_URL, PORTAL_ACCESS_CUSTOM_URL, PORTAL_ACCESS_PAGES_URL };

// @see https://developers.cloudflare.com/cloudflare-one/access-controls/policies/
// @see https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file (policy file)
/**
 * portal-cli doctor — Infra group (live Cloudflare Access probes).
 *
 *   infra-ledger-access  fatal · all — ledger.factory-wager.com behind Access
 *   infra-portal-access  warn  · all — score + pages.dev /portal Access live
 *
 * Network required. Inject `fetch` in tests. Policy SSOT: .cloudflare-access.yml
 * (static) + live edge behavior (this module).
 */

import {
  LEDGER_ACCESS_URL,
  PORTAL_ACCESS_CUSTOM_URL,
  PORTAL_ACCESS_PAGES_URL,
  probeCloudflareAccess,
  probePortalAccess,
  type AccessProbeFetch,
} from '../../lib/verification/cloudflare-access-live.ts';
import type { PortalDoctorCheck } from './portal-cli-doctor.ts';

const ACCESS_DOCS = 'https://developers.cloudflare.com/cloudflare-one/access-controls/policies/';
const ACCESS_POLICY_PATH = '.cloudflare-access.yml';

function withMeta(
  base: PortalDoctorCheck,
  meta: Partial<Omit<PortalDoctorCheck, 'id' | 'level' | 'ok' | 'message' | 'group'>>
): PortalDoctorCheck {
  return { ...base, ...meta };
}

export type RunInfraChecksOpts = {
  fetch?: AccessProbeFetch;
  timeoutMs?: number;
  /** Skip live probes (offline unit tests that only need group shape). */
  skipLive?: boolean;
};

/**
 * Live Access enforcement checks (group: infra).
 */
export async function runInfraChecks(opts: RunInfraChecksOpts = {}): Promise<PortalDoctorCheck[]> {
  const checks: PortalDoctorCheck[] = [];

  if (opts.skipLive) {
    checks.push(
      withMeta(
        {
          id: 'infra-ledger-access',
          level: 'fatal',
          group: 'infra',
          ok: true,
          message: 'ledger Access probe skipped (offline)',
          source: ACCESS_DOCS,
        },
        { envScope: 'all', autoFixable: false }
      ),
      withMeta(
        {
          id: 'infra-portal-access',
          level: 'warn',
          group: 'infra',
          ok: true,
          message: 'portal Access probe skipped (offline)',
          source: ACCESS_DOCS,
        },
        { envScope: 'all', autoFixable: false }
      )
    );
    return checks;
  }

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
          ? `ledger.factory-wager.com Access enforced · ${ledger.evidence}`
          : `ledger.factory-wager.com NOT behind Access · ${ledger.evidence}`,
        source: ACCESS_DOCS,
      },
      {
        fixCommand: ledger.accessEnforced
          ? undefined
          : `Apply Access app for ledger (see ${ACCESS_POLICY_PATH}) · bun run cloudflare:access:verify · curl -sI ${LEDGER_ACCESS_URL} | head`,
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
  checks.push(
    withMeta(
      {
        id: 'infra-portal-access',
        level: 'warn',
        group: 'infra',
        ok: portal.ok,
        message: portal.message,
        source: ACCESS_DOCS,
      },
      {
        fixCommand: portal.ok
          ? undefined
          : `Promote staged Access for ${PORTAL_ACCESS_CUSTOM_URL} + Pages Access on project-r-score.pages.dev · ${ACCESS_POLICY_PATH}`,
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

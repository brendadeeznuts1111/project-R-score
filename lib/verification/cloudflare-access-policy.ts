/**
 * Static safety contract for `.cloudflare-access.yml`.
 *
 * This verifier intentionally owns repository policy, not Cloudflare's whole
 * API schema. Live IDs and provider state remain a plan-time concern.
 *
 * Required domains use AccessDomainId (surfaces brand) — host vs host/path stay
 * separated from HostId.
 *
 * @see https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/cloudflare/
 * @see https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/
 */
import { parse } from 'yaml';
import { asAccessDomainId, type AccessDomainId } from '../types/branded.ts';

type AccountMemberRule = {
  cloudflare_account_member?: {
    account_id?: string; // brand-ok — raw Cloudflare policy wire field; verifier rejects persistence
  };
  email_domain?: {
    domain?: string;
  };
  auth_method?: {
    auth_method?: string;
  };
};

type AccessPolicy = {
  name?: string;
  decision?: string;
  include?: AccountMemberRule[];
  require?: AccountMemberRule[];
  exclude?: AccountMemberRule[];
};

type AccessApp = {
  name?: string;
  domain?: string;
  type?: string;
  session_duration?: string;
  policies?: AccessPolicy[];
};

type AccessConfig = {
  scoped?: boolean;
  apps?: AccessApp[];
};

export type CloudflareAccessPolicyIssue = {
  code: string;
  path: string;
  message: string;
};

export type CloudflareAccessPolicyReport = {
  ok: boolean;
  appCount: number;
  issues: CloudflareAccessPolicyIssue[];
};

/** Operator surfaces that policy-as-code must manage (AccessDomainId, not HostId).
 *  reasonix removed 2026-07-28 — surface decommissioned (surfaces.toml: retired). */
const REQUIRED_DOMAINS: readonly AccessDomainId[] = [
  asAccessDomainId('ledger.factory-wager.com'),
  asAccessDomainId('score.factory-wager.com/portal'),
  asAccessDomainId('project-r-score.pages.dev/portal'),
];
const REQUIRED_DOMAIN_PATTERNS = ['*.project-r-score.pages.dev'] as const; // brand-ok — Cloudflare wildcard Access domain pattern, not a concrete AccessDomainId

function issue(
  issues: CloudflareAccessPolicyIssue[],
  code: string,
  path: string,
  message: string
): void {
  issues.push({ code, path, message });
}

function sessionHours(value: string | undefined): number | null {
  if (!value) return null;
  const match = /^(\d+)h$/.exec(value);
  return match ? Number(match[1]) : null;
}

function hasLegacyOtpRule(rules: AccountMemberRule[] | undefined): boolean {
  return Boolean(
    rules?.some(
      rule =>
        rule.email_domain !== undefined || rule.auth_method?.auth_method?.toLowerCase() === 'otp'
    )
  );
}

export function verifyCloudflareAccessPolicyText(text: string): CloudflareAccessPolicyReport {
  const issues: CloudflareAccessPolicyIssue[] = [];
  let config: AccessConfig;

  try {
    config = parse(text) as AccessConfig;
  } catch (error) {
    return {
      ok: false,
      appCount: 0,
      issues: [
        {
          code: 'invalid-yaml',
          path: '.cloudflare-access.yml',
          message: error instanceof Error ? error.message : String(error),
        },
      ],
    };
  }

  if (config.scoped !== true) {
    issue(
      issues,
      'unscoped-config',
      'scoped',
      'scoped must be true so an apply cannot delete unlisted live Access apps'
    );
  }

  const apps = Array.isArray(config.apps) ? config.apps : [];
  if (apps.length === 0) {
    issue(issues, 'missing-apps', 'apps', 'at least one managed Access app is required');
  }

  const names = new Set<string>();
  const domains = new Set<string>();

  apps.forEach((app, appIndex) => {
    const path = `apps[${appIndex}]`;
    const name = app.name?.trim();
    const domain = app.domain?.trim();

    if (!name) {
      issue(issues, 'missing-name', `${path}.name`, 'app name is required');
    } else if (names.has(name)) {
      issue(issues, 'duplicate-name', `${path}.name`, `duplicate app name: ${name}`);
    } else {
      names.add(name);
    }

    if (!domain) {
      issue(issues, 'missing-domain', `${path}.domain`, 'app domain is required');
    } else {
      if (domains.has(domain)) {
        issue(issues, 'duplicate-domain', `${path}.domain`, `duplicate app domain: ${domain}`);
      }
      domains.add(domain);
      // Allow factory-wager.com hosts/paths, plus Pages production hostname (pages.dev)
      // which custom-domain Access apps do not cover.
      const allowed =
        domain.endsWith('.factory-wager.com') ||
        domain.startsWith('score.factory-wager.com/') ||
        domain === 'factory-wager.com' ||
        domain.startsWith('project-r-score.pages.dev/') ||
        domain === '*.project-r-score.pages.dev' ||
        domain === 'project-r-score.pages.dev';
      if (!allowed) {
        issue(
          issues,
          'foreign-domain',
          `${path}.domain`,
          'managed operator apps must stay under factory-wager.com (or project-r-score.pages.dev for Pages)'
        );
      }
    }

    if (app.type !== 'self_hosted') {
      issue(issues, 'wrong-app-type', `${path}.type`, 'operator surfaces must be self_hosted');
    }

    const hours = sessionHours(app.session_duration);
    if (hours === null || hours > 8) {
      issue(
        issues,
        'session-duration',
        `${path}.session_duration`,
        'session duration must be an hour value no greater than 8h'
      );
    }

    const policies = Array.isArray(app.policies) ? app.policies : [];
    if (policies.length === 0) {
      issue(issues, 'missing-policies', `${path}.policies`, 'each app needs an allow policy');
    }

    policies.forEach((policy, policyIndex) => {
      const policyPath = `${path}.policies[${policyIndex}]`;
      if (policy.decision !== 'allow') {
        issue(
          issues,
          'non-allow-policy',
          `${policyPath}.decision`,
          'managed human SSO policies must use the allow decision'
        );
      }

      const include = Array.isArray(policy.include) ? policy.include : [];
      const accountMemberRules = include.filter(
        rule => rule.cloudflare_account_member !== undefined
      );
      if (accountMemberRules.length !== 1) {
        issue(
          issues,
          'account-member-selector',
          `${policyPath}.include`,
          'include exactly one cloudflare_account_member selector'
        );
      }
      if (
        accountMemberRules.some(rule => rule.cloudflare_account_member?.account_id !== undefined)
      ) {
        issue(
          issues,
          'embedded-account-id',
          `${policyPath}.include`,
          'omit account_id to select the current Cloudflare account without embedding identifiers'
        );
      }
      if (
        hasLegacyOtpRule(include) ||
        hasLegacyOtpRule(policy.require) ||
        hasLegacyOtpRule(policy.exclude)
      ) {
        issue(
          issues,
          'legacy-otp',
          policyPath,
          'email-domain OTP rules are not the managed Cloudflare SSO contract'
        );
      }
    });
  });

  for (const required of [...REQUIRED_DOMAINS, ...REQUIRED_DOMAIN_PATTERNS]) {
    if (!domains.has(String(required))) {
      issue(
        issues,
        'missing-required-domain',
        'apps',
        `required operator surface is not managed: ${required}`
      );
    }
  }

  return { ok: issues.length === 0, appCount: apps.length, issues };
}

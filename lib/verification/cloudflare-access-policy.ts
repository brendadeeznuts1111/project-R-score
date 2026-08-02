/**
 * Static safety contract for `.cloudflare-access.yml`.
 *
 * This verifier intentionally owns repository policy, not Cloudflare's whole
 * API schema. Live IDs and provider state remain a plan-time concern.
 *
 * Required domains use AccessDomainId (surfaces brand) — host vs host/path stay
 * separated from HostId.
 *
 * Human SSO contract (aligned live 2026-08-02): explicit `email:` allowlist
 * (Google / One-time PIN IdPs). Domain-wide `email_domain` OTP is rejected.
 *
 * @see https://developers.cloudflare.com/cloudflare-one/access-controls/policies/
 * @see https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/
 */
import { parse } from 'yaml';
import { asAccessDomainId, type AccessDomainId } from '../types/branded.ts';

type AccessIncludeRule = {
  email?: {
    email?: string;
  };
  email_domain?: {
    domain?: string;
  };
  auth_method?: {
    auth_method?: string;
  };
  cloudflare_account_member?: {
    account_id?: string; // brand-ok — raw Cloudflare policy wire field; verifier rejects persistence
  };
  everyone?: Record<string, never>;
  service_token?: {
    token_id?: string; // brand-ok — Access service token id wire field
  };
};

type AccessPolicy = {
  name?: string;
  decision?: string;
  include?: AccessIncludeRule[];
  require?: AccessIncludeRule[];
  exclude?: AccessIncludeRule[];
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

function hasLegacyOtpRule(rules: AccessIncludeRule[] | undefined): boolean {
  return Boolean(
    rules?.some(
      rule =>
        rule.email_domain !== undefined || rule.auth_method?.auth_method?.toLowerCase() === 'otp'
    )
  );
}

function emailFromRule(rule: AccessIncludeRule): string | null {
  const raw = rule.email?.email?.trim().toLowerCase();
  return raw && EMAIL_RE.test(raw) ? raw : null;
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
      if (domain === '*.project-r-score.pages.dev') {
        issue(
          issues,
          'pages-preview-owner',
          `${path}.domain`,
          'Pages preview protection is owned by the Pages project access-policy setting, not this Access app plan'
        );
      }
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
    if (hours === null || hours > 4) {
      issue(
        issues,
        'session-duration',
        `${path}.session_duration`,
        'session duration must be an hour value no greater than 4h'
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
      const emails = include.map(emailFromRule).filter((e): e is string => e != null);
      const accountMemberRules = include.filter(
        rule => rule.cloudflare_account_member !== undefined
      );

      if (emails.length === 0) {
        issue(
          issues,
          'email-allowlist',
          `${policyPath}.include`,
          'include at least one explicit email: { email } allowlist entry'
        );
      }
      if (new Set(emails).size !== emails.length) {
        issue(
          issues,
          'duplicate-email',
          `${policyPath}.include`,
          'email allowlist entries must be unique'
        );
      }
      if (include.some(rule => rule.everyone !== undefined)) {
        issue(
          issues,
          'everyone-include',
          `${policyPath}.include`,
          'managed human SSO policies must not use everyone: {}'
        );
      }
      if (accountMemberRules.length > 0) {
        issue(
          issues,
          'account-member-selector',
          `${policyPath}.include`,
          'managed SSO uses explicit email allowlist (not cloudflare_account_member) — align with live Access'
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

  for (const required of REQUIRED_DOMAINS) {
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

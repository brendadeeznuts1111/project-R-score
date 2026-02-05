/**
 * packages/@tools/cli/data/scopingMatrix.ts
 * DuoPlus Scoping Matrix v3.7
 */

export type Scope = "ENTERPRISE" | "DEVELOPMENT" | "LOCAL-SANDBOX" | "GLOBAL";

export interface ScopingRule {
  servingDomain: string | null;
  platform: "Windows" | "macOS" | "Linux" | "Any";
  detectedScope: Scope;
  storagePathPrefix: string;
  secretsBackend: string;
  serviceNameFormatExample: string;
  secretsFlag: string;
}

const SECRETS_FLAG = "CRED_PERSIST_ENTERPRISE";

export const SCOPING_MATRIX: ScopingRule[] = [
  {
    servingDomain: "apple.factory-wager.com",
    platform: "macOS",
    detectedScope: "ENTERPRISE",
    storagePathPrefix: "enterprise/data/",
    secretsBackend: "macOS Keychain",
    serviceNameFormatExample: "duoplus-ENTERPRISE-apple",
    secretsFlag: SECRETS_FLAG
  },
  {
    servingDomain: "apple.factory-wager.com",
    platform: "Linux",
    detectedScope: "ENTERPRISE",
    storagePathPrefix: "enterprise/accounts/",
    secretsBackend: "Secret Service (libsecret)",
    serviceNameFormatExample: "duoplus-ENTERPRISE-apple",
    secretsFlag: SECRETS_FLAG
  },
  {
    servingDomain: "apple.factory-wager.com",
    platform: "Windows",
    detectedScope: "ENTERPRISE",
    storagePathPrefix: "enterprise/windows/",
    secretsBackend: "Windows Credential Manager",
    serviceNameFormatExample: "duoplus-ENTERPRISE-apple",
    secretsFlag: SECRETS_FLAG
  },
  {
    servingDomain: "dev.apple.factory-wager.com",
    platform: "Linux",
    detectedScope: "DEVELOPMENT",
    storagePathPrefix: "development/accounts/",
    secretsBackend: "Secret Service",
    serviceNameFormatExample: "duoplus-DEVELOPMENT-apple",
    secretsFlag: SECRETS_FLAG
  },
  {
    servingDomain: "dev.apple.factory-wager.com",
    platform: "macOS",
    detectedScope: "DEVELOPMENT",
    storagePathPrefix: "development/test/",
    secretsBackend: "macOS Keychain",
    serviceNameFormatExample: "duoplus-DEVELOPMENT-apple",
    secretsFlag: SECRETS_FLAG
  },
  {
    servingDomain: "dev.apple.factory-wager.com",
    platform: "Windows",
    detectedScope: "DEVELOPMENT",
    storagePathPrefix: "development/windows/",
    secretsBackend: "Windows Credential Manager",
    serviceNameFormatExample: "duoplus-DEVELOPMENT-apple",
    secretsFlag: SECRETS_FLAG
  },
  {
    servingDomain: "localhost",
    platform: "macOS",
    detectedScope: "LOCAL-SANDBOX",
    storagePathPrefix: "local-sandbox/",
    secretsBackend: "macOS Keychain",
    serviceNameFormatExample: "duoplus-LOCAL-SANDBOX-default",
    secretsFlag: SECRETS_FLAG
  },
  {
    servingDomain: "localhost",
    platform: "Linux",
    detectedScope: "LOCAL-SANDBOX",
    storagePathPrefix: "local-sandbox/",
    secretsBackend: "Secret Service",
    serviceNameFormatExample: "duoplus-LOCAL-SANDBOX-default",
    secretsFlag: SECRETS_FLAG
  },
  {
    servingDomain: "localhost",
    platform: "Windows",
    detectedScope: "LOCAL-SANDBOX",
    storagePathPrefix: "local-sandbox/",
    secretsBackend: "Windows Credential Manager",
    serviceNameFormatExample: "duoplus-LOCAL-SANDBOX-default",
    secretsFlag: SECRETS_FLAG
  },
  {
    servingDomain: null,
    platform: "Any",
    detectedScope: "LOCAL-SANDBOX",
    storagePathPrefix: "local-sandbox/",
    secretsBackend: "Encrypted local storage",
    serviceNameFormatExample: "duoplus-LOCAL-SANDBOX-default",
    secretsFlag: SECRETS_FLAG
  },
  {
    servingDomain: "global.duoplus.com",
    platform: "Any",
    detectedScope: "GLOBAL",
    storagePathPrefix: "global/",
    secretsBackend: "Vault",
    serviceNameFormatExample: "duoplus-GLOBAL-default",
    secretsFlag: SECRETS_FLAG
  }
];

function normalizePlatform(platform: string): ScopingRule["platform"] {
  const lower = platform.toLowerCase();
  if (lower.includes("darwin") || lower.includes("macos")) return "macOS";
  if (lower.includes("linux")) return "Linux";
  if (lower.includes("win")) return "Windows";
  return "Any";
}

export function findScopingRules(
  servingDomain: string | undefined,
  platform: string
): ScopingRule[] {
  const normalizedPlatform = normalizePlatform(platform);

  return SCOPING_MATRIX.filter((rule) => {
    const domainMatch =
      rule.servingDomain === servingDomain ||
      (rule.servingDomain === null && servingDomain !== undefined);

    const platformMatch =
      rule.platform === normalizedPlatform || rule.platform === "Any";

    return domainMatch && platformMatch;
  });
}

export function getBestScopingRule(
  servingDomain: string | undefined,
  platform: string
): ScopingRule | undefined {
  const normalizedPlatform = normalizePlatform(platform);
  const rules = findScopingRules(servingDomain, normalizedPlatform);

  const scoreRule = (rule: ScopingRule): number => {
    let score = 0;
    if (rule.servingDomain !== null && rule.servingDomain === servingDomain) score += 4;
    if (rule.platform === normalizedPlatform) score += 2;
    if (rule.servingDomain === null) score += 1;
    return score;
  };

  return rules.sort((a, b) => scoreRule(b) - scoreRule(a))[0];
}

export function getMatrixStats(): {
  totalRules: number;
  scopeBreakdown: Record<string, number>;
  platformBreakdown: Record<string, number>;
} {
  const scopeBreakdown: Record<string, number> = {};
  const platformBreakdown: Record<string, number> = {};

  for (const rule of SCOPING_MATRIX) {
    scopeBreakdown[rule.detectedScope] = (scopeBreakdown[rule.detectedScope] || 0) + 1;
    platformBreakdown[rule.platform] = (platformBreakdown[rule.platform] || 0) + 1;
  }

  return {
    totalRules: SCOPING_MATRIX.length,
    scopeBreakdown,
    platformBreakdown
  };
}

export function exportMatrixAsJSON(): string {
  return JSON.stringify(
    {
      version: "3.7",
      timestamp: new Date().toISOString(),
      rules: SCOPING_MATRIX
    },
    null,
    2
  );
}

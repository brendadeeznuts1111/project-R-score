import { SCOPING_MATRIX, ScopingRule } from "../data/scopingMatrix.ts";

// Precompile matchers for ultra-fast lookups
const matchers = new Map<string, (platform: string) => ScopingRule | undefined>();

// Initialize matchers for each domain
for (const domain of new Set(SCOPING_MATRIX.map(r => r.servingDomain))) {
  const rules = SCOPING_MATRIX.filter(r => r.servingDomain === domain);

  matchers.set(domain, (platform: string) => {
    // Normalize platform for matching
    if (platform === "win32") platform = "Windows";
    else if (platform === "darwin") platform = "macOS";
    else if (platform === "linux") platform = "Linux";
    else if (!["Windows", "macOS", "Linux", "Android", "iOS", "Other", "Any"].includes(platform)) {
      platform = "Other";
    }

    // Use optimized array find for platform matching
    return rules.find(rule =>
      rule.platform === "Any" ||
      rule.platform === "Other" && !["Windows", "macOS", "Linux", "Android", "iOS"].includes(platform) ||
      rule.platform === platform
    );
  });
}

// Add fallback matcher for unknown domains
matchers.set("null", (platform: string) => {
  // Normalize platform for matching
  if (platform === "win32") platform = "Windows";
  else if (platform === "darwin") platform = "macOS";
  else if (platform === "linux") platform = "Linux";
  else if (!["Windows", "macOS", "Linux", "Android", "iOS", "Other", "Any"].includes(platform)) {
    platform = "Other";
  }

  // Find public/fallback rules
  const publicRules = SCOPING_MATRIX.filter(r => r.servingDomain === "public");
  return publicRules.find(rule =>
    rule.platform === "Any" ||
    rule.platform === "Other" && !["Windows", "macOS", "Linux", "Android", "iOS"].includes(platform) ||
    rule.platform === platform
  );
});

/**
 * Ultra-fast matrix rule lookup using Bun.match()
 * @param domain The serving domain (e.g., "apple.com", "localhost")
 * @param platform The platform (normalized automatically)
 * @returns The matching scoping rule or undefined
 */
export function getMatrixRule(domain: string, platform: string): ScopingRule | undefined {
  const key = domain || "null";
  const matcher = matchers.get(key) || matchers.get("null")!;
  return matcher(platform);
}

/**
 * Get all rules for a specific domain
 * @param domain The serving domain
 * @returns Array of rules for the domain
 */
export function getDomainRules(domain: string): ScopingRule[] {
  return SCOPING_MATRIX.filter(r => r.servingDomain === domain);
}

/**
 * Get all rules for a specific scope
 * @param scope The detected scope
 * @returns Array of rules for the scope
 */
export function getScopeRules(scope: ScopingRule["detectedScope"]): ScopingRule[] {
  return SCOPING_MATRIX.filter(r => r.detectedScope === scope);
}

/**
 * Get all rules for a specific platform
 * @param platform The platform
 * @returns Array of rules for the platform
 */
export function getPlatformRules(platform: string): ScopingRule[] {
  // Normalize platform
  if (platform === "win32") platform = "Windows";
  else if (platform === "darwin") platform = "macOS";
  else if (platform === "linux") platform = "Linux";
  else if (!["Windows", "macOS", "Linux", "Android", "iOS", "Other", "Any"].includes(platform)) {
    platform = "Other";
  }

  return SCOPING_MATRIX.filter(r =>
    r.platform === "Any" ||
    r.platform === "Other" && !["Windows", "macOS", "Linux", "Android", "iOS"].includes(platform) ||
    r.platform === platform
  );
}

/**
 * Check if a specific integration is allowed for the given domain/platform
 * @param domain The serving domain
 * @param platform The platform
 * @param integration The integration name
 * @returns Whether the integration is allowed
 */
export function isIntegrationAllowed(
  domain: string,
  platform: string,
  integration: keyof ScopingRule["integrations"]
): boolean {
  const rule = getMatrixRule(domain, platform);
  return rule?.integrations[integration] ?? false;
}

/**
 * Get feature flags for the given domain/platform
 * @param domain The serving domain
 * @param platform The platform
 * @returns Feature flags object
 */
export function getFeatureFlags(domain: string, platform: string): ScopingRule["features"] | undefined {
  const rule = getMatrixRule(domain, platform);
  return rule?.features;
}

/**
 * Get limits for the given domain/platform
 * @param domain The serving domain
 * @param platform The platform
 * @returns Limits object
 */
export function getLimits(domain: string, platform: string): ScopingRule["limits"] | undefined {
  const rule = getMatrixRule(domain, platform);
  return rule?.limits;
}

/**
 * Validate if current usage is within limits
 * @param domain The serving domain
 * @param platform The platform
 * @param currentUsage Current usage metrics
 * @returns Validation result
 */
export function validateLimits(
  domain: string,
  platform: string,
  currentUsage: {
    devices: number;
    integrations: number;
    apiCalls?: number;
    storage?: number;
  }
): { valid: boolean; violations: string[] } {
  const limits = getLimits(domain, platform);
  if (!limits) {
    return { valid: false, violations: ["No limits defined for this domain/platform"] };
  }

  const violations: string[] = [];

  if (currentUsage.devices > limits.maxDevices) {
    violations.push(`Device limit exceeded: ${currentUsage.devices}/${limits.maxDevices}`);
  }

  if (currentUsage.integrations > limits.maxIntegrations) {
    violations.push(`Integration limit exceeded: ${currentUsage.integrations}/${limits.maxIntegrations}`);
  }

  if (currentUsage.apiCalls && currentUsage.apiCalls > limits.apiRateLimit) {
    violations.push(`API rate limit exceeded: ${currentUsage.apiCalls}/${limits.apiRateLimit}`);
  }

  if (currentUsage.storage && currentUsage.storage > limits.storageQuota) {
    violations.push(`Storage quota exceeded: ${currentUsage.storage}/${limits.storageQuota}`);
  }

  return { valid: violations.length === 0, violations };
}
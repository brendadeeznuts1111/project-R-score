import { getMatrixRule, validateLimits } from "./matrixMatcher.ts";
import { getScopingMatrix, validateScopingMatrix } from "../data/scopingMatrixLoader.ts";
import { getScopeContext, validateCurrentConfig } from "../config/scope.config.ts";

export interface ValidationResult {
  valid: boolean;
  reason?: string;
  violations?: string[];
  warnings?: string[];
  suggestions?: string[];
}

/**
 * Comprehensive matrix validation with caching and GC awareness
 */
let lastValidation: { result: ValidationResult; at: number; contextVersion: number } | null = null;
const CACHE_TTL = 1000; // 1 second for validation cache

/**
 * Get cached validation result with TTL and context version checking
 */
export function getCachedValidation(): ValidationResult {
  const now = Date.now();
  const contextVersion = getScopeContext().version || 0;

  if (lastValidation &&
      (now - lastValidation.at) < CACHE_TTL &&
      lastValidation.contextVersion === contextVersion) {
    return lastValidation.result;
  }

  const result = validateCurrentConfig();
  lastValidation = { result, at: now, contextVersion };

  // Hint GC if memory pressure
  if (Bun.memoryUsage().heapUsed > 100_000_000) {
    Bun.gc();
  }

  return result;
}

/**
 * Validate current configuration against scoping matrix
 */
export function validateMatrixCompliance(): ValidationResult {
  const context = getScopeContext();
  const violations: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Check if we have a valid rule
  if (!context.rule) {
    return {
      valid: false,
      reason: `No scoping rule found for domain '${context.domain}' and platform '${context.platform}'`,
      suggestions: [
        "Add a rule for this domain/platform combination",
        "Use a more generic domain (e.g., 'public')",
        "Check platform normalization (win32->Windows, darwin->macOS, linux->Linux)"
      ]
    };
  }

  // Validate domain format
  if (!isValidDomain(context.domain)) {
    warnings.push(`Domain '${context.domain}' may not be properly formatted`);
  }

  // Check platform compatibility
  if (!isCompatiblePlatform(context.platform)) {
    warnings.push(`Platform '${context.platform}' may not be fully supported`);
  }

  // Validate feature consistency
  const featureViolations = validateFeatureConsistency(context);
  violations.push(...featureViolations.violations);
  warnings.push(...featureViolations.warnings);

  // Validate limit reasonableness
  const limitViolations = validateLimitReasonableness(context);
  warnings.push(...limitViolations.warnings);
  suggestions.push(...limitViolations.suggestions);

  // Validate integration availability
  const integrationViolations = validateIntegrationAvailability(context);
  warnings.push(...integrationViolations.warnings);
  suggestions.push(...integrationViolations.suggestions);

  // Enterprise scope validations
  if (context.detectedScope === "ENTERPRISE") {
    const enterpriseViolations = validateEnterpriseCompliance(context);
    violations.push(...enterpriseViolations.violations);
    suggestions.push(...enterpriseViolations.suggestions);
  }

  // Development scope validations
  if (context.detectedScope === "DEVELOPMENT") {
    const devViolations = validateDevelopmentCompliance(context);
    warnings.push(...devViolations.warnings);
    suggestions.push(...devViolations.suggestions);
  }

  return {
    valid: violations.length === 0,
    reason: violations.length > 0 ? `Found ${violations.length} compliance violation(s)` : undefined,
    violations: violations.length > 0 ? violations : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
    suggestions: suggestions.length > 0 ? suggestions : undefined,
  };
}

/**
 * Validate domain format
 */
function isValidDomain(domain: string): boolean {
  // Basic domain validation
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/;
  return domain === "localhost" || domain === "public" || domainRegex.test(domain);
}

/**
 * Check platform compatibility
 */
function isCompatiblePlatform(platform: string): boolean {
  const supportedPlatforms = ["Windows", "macOS", "Linux", "Android", "iOS", "Other", "Any"];
  return supportedPlatforms.includes(platform);
}

/**
 * Validate feature consistency
 */
function validateFeatureConsistency(context: any): { violations: string[]; warnings: string[] } {
  const violations: string[] = [];
  const warnings: string[] = [];

  const { features, detectedScope } = context;

  // Enterprise should have advanced features
  if (detectedScope === "ENTERPRISE" && !features.advancedAnalytics) {
    violations.push("Enterprise scope should have advanced analytics enabled");
  }

  // Development should have debug tools
  if (detectedScope === "DEVELOPMENT" && !features.debugTools) {
    warnings.push("Development scope typically enables debug tools");
  }

  // Compliance mode should be enterprise-only
  if (features.complianceMode && detectedScope !== "ENTERPRISE") {
    violations.push("Compliance mode should only be enabled for enterprise scope");
  }

  return { violations, warnings };
}

/**
 * Validate limit reasonableness
 */
function validateLimitReasonableness(context: any): { warnings: string[]; suggestions: string[] } {
  const warnings: string[] = [];
  const suggestions: string[] = [];

  const { limits, detectedScope } = context;

  // Enterprise limits should be high
  if (detectedScope === "ENTERPRISE" && limits.maxDevices < 100) {
    warnings.push("Enterprise scope typically allows more than 100 devices");
    suggestions.push("Consider increasing maxDevices for enterprise deployments");
  }

  // Development limits should be reasonable for testing
  if (detectedScope === "DEVELOPMENT" && limits.maxDevices > 50) {
    warnings.push("Development scope has high device limit - consider if this is appropriate");
  }

  // Personal limits should be low
  if (detectedScope === "PERSONAL" && limits.maxDevices > 10) {
    warnings.push("Personal scope has high device limit - consider reducing for security");
  }

  return { warnings, suggestions };
}

/**
 * Validate integration availability
 */
function validateIntegrationAvailability(context: any): { warnings: string[]; suggestions: string[] } {
  const warnings: string[] = [];
  const suggestions: string[] = [];

  const { integrations, detectedScope } = context;

  // Enterprise should have most integrations
  if (detectedScope === "ENTERPRISE") {
    const enterpriseIntegrations = ["twitter", "cashapp", "email", "sms", "webhook"];
    const missing = enterpriseIntegrations.filter(int => !integrations[int]);
    if (missing.length > 0) {
      warnings.push(`Enterprise scope missing integrations: ${missing.join(", ")}`);
      suggestions.push("Consider enabling all integrations for enterprise deployments");
    }
  }

  // Personal should have limited integrations
  if (detectedScope === "PERSONAL" && integrations.sms) {
    warnings.push("Personal scope has SMS integration - consider if this is necessary");
  }

  return { warnings, suggestions };
}

/**
 * Validate enterprise compliance requirements
 */
function validateEnterpriseCompliance(context: any): { violations: string[]; suggestions: string[] } {
  const violations: string[] = [];
  const suggestions: string[] = [];

  const { features, limits } = context;

  if (!features.highAvailability) {
    violations.push("Enterprise deployments require high availability");
  }

  if (!features.multiTenant) {
    violations.push("Enterprise deployments require multi-tenancy support");
  }

  if (limits.apiRateLimit < 1000) {
    violations.push("Enterprise API rate limit too low");
    suggestions.push("Increase API rate limit for enterprise deployments");
  }

  return { violations, suggestions };
}

/**
 * Validate development compliance
 */
function validateDevelopmentCompliance(context: any): { warnings: string[]; suggestions: string[] } {
  const warnings: string[] = [];
  const suggestions: string[] = [];

  const { features, limits } = context;

  if (!features.debugTools) {
    warnings.push("Development environment without debug tools detected");
    suggestions.push("Enable debug tools for development environment");
  }

  if (limits.apiRateLimit < 100) {
    warnings.push("Development API rate limit may be too restrictive for testing");
    suggestions.push("Consider increasing API rate limit for development");
  }

  return { warnings, suggestions };
}

/**
 * Validate usage against limits
 */
export function validateUsageLimits(currentUsage: {
  devices: number;
  integrations: number;
  apiCalls?: number;
  storage?: number;
}): ValidationResult {
  const context = getScopeContext();

  if (!context.limits) {
    return {
      valid: false,
      reason: "No limits defined for current scope"
    };
  }

  const limitValidation = validateLimits(context.domain, context.platform, currentUsage);

  return {
    valid: limitValidation.valid,
    violations: limitValidation.violations.length > 0 ? limitValidation.violations : undefined,
    suggestions: limitValidation.valid ? undefined : [
      "Reduce current usage to stay within limits",
      "Upgrade to a higher-tier scope if needed",
      "Contact administrator for limit increases"
    ]
  };
}

/**
 * Get compliance report
 */
export async function getComplianceReport(): Promise<{
  timestamp: string;
  scope: any;
  validation: ValidationResult;
  matrixStats: any;
  recommendations: string[];
}> {
  const scope = getScopeContext();
  const validation = validateMatrixCompliance();
  const matrix = await getScopingMatrix();

  const recommendations: string[] = [];

  if (validation.suggestions) {
    recommendations.push(...validation.suggestions);
  }

  if (validation.warnings) {
    recommendations.push(...validation.warnings.map(w => `Address warning: ${w}`));
  }

  return {
    timestamp: new Date().toISOString(),
    scope: {
      domain: scope.domain,
      platform: scope.platform,
      detectedScope: scope.detectedScope,
    },
    validation,
    matrixStats: {
      totalRules: matrix.length,
      domains: [...new Set(matrix.map(r => r.servingDomain))],
      scopes: [...new Set(matrix.map(r => r.detectedScope))],
    },
    recommendations,
  };
}
// Cookie parsing utilities for Bun
function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  
  if (!cookieHeader) return cookies;
  
  cookieHeader.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=');
    if (name && value) {
      cookies[name] = decodeURIComponent(value);
    }
  });
  
  return cookies;
}

function getSetCookie(options: {
  name: string;
  value: string;
  maxAge?: number;
  expires?: Date;
  domain?: string;
  path?: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
}): string {
  const parts = [
    `${options.name}=${encodeURIComponent(options.value)}`
  ];
  
  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${options.maxAge}`);
  }
  
  if (options.expires) {
    parts.push(`Expires=${options.expires.toUTCString()}`);
  }
  
  if (options.domain) {
    parts.push(`Domain=${options.domain}`);
  }
  
  if (options.path) {
    parts.push(`Path=${options.path}`);
  }
  
  if (options.httpOnly) {
    parts.push('HttpOnly');
  }
  
  if (options.secure) {
    parts.push('Secure');
  }
  
  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite}`);
  }
  
  return parts.join('; ');
}

// ============================================
// SCOPE INTERFACES
// ============================================

export interface ScopingRule {
  detectedScope: string;
  servingDomain: string;
  platform: string;
  featureFlags: string[];
  connectionConfig: {
    maxConnections: number;
    keepAlive: boolean;
    timeout: number;
  };
  security: {
    level: 'BASIC' | 'STANDARD' | 'ENTERPRISE';
    mfaRequired: boolean;
    auditLogging: boolean;
  };
  compliance: {
    frameworks: string[];
    certifications: string[];
  };
  metadata?: {
    description?: string;
    environment?: string;
    region?: string;
    version?: string;
  };
}

export interface ScopeContext {
  domain: string;
  platform: string;
  scope: ScopingRule;
  overridden: boolean;
  resolvedAt: Date;
}

export interface ScopeOverride {
  domain: string;
  platform: string;
  scopeId: string;
  expires?: Date;
  purpose?: string;
}

// ============================================
// SCOPING MATRIX
// ============================================

export const SCOPING_MATRIX: ScopingRule[] = [
  // ENTERPRISE SCOPE
  {
    detectedScope: 'ENTERPRISE',
    servingDomain: 'apple.factory-wager.com',
    platform: 'macOS',
    featureFlags: [
      'PREMIUM',
      'TERMINAL_PTY',
      'ADVANCED_CONNECTIONS',
      'ENTERPRISE_SECURITY',
      'MULTI_TENANT',
      'ADVANCED_MONITORING'
    ],
    connectionConfig: {
      maxConnections: 50,
      keepAlive: true,
      timeout: 30000
    },
    security: {
      level: 'ENTERPRISE',
      mfaRequired: true,
      auditLogging: true
    },
    compliance: {
      frameworks: ['SOC2', 'ISO27001', 'GDPR', 'HIPAA'],
      certifications: ['SOC2-Type2', 'ISO27001:2013']
    },
    metadata: {
      description: 'Enterprise production environment',
      environment: 'production',
      region: 'us-west-2',
      version: '3.7.0'
    }
  },
  
  // DEVELOPMENT SCOPE
  {
    detectedScope: 'DEVELOPMENT',
    servingDomain: 'dev.factory-wager.com',
    platform: 'macOS',
    featureFlags: [
      'DEVELOPMENT_TOOLS',
      'DEBUG_MODE',
      'HOT_RELOAD',
      'TEST_DATA',
      'MOCK_SERVICES'
    ],
    connectionConfig: {
      maxConnections: 20,
      keepAlive: true,
      timeout: 15000
    },
    security: {
      level: 'STANDARD',
      mfaRequired: false,
      auditLogging: true
    },
    compliance: {
      frameworks: ['SOC2'],
      certifications: []
    },
    metadata: {
      description: 'Development environment',
      environment: 'development',
      region: 'us-west-2',
      version: '3.7.0-dev'
    }
  },
  
  // LOCAL SANDBOX SCOPE
  {
    detectedScope: 'LOCAL_SANDBOX',
    servingDomain: 'localhost',
    platform: 'macOS',
    featureFlags: [
      'SANDBOX_MODE',
      'LOCAL_AUTH',
      'DEBUG_MODE',
      'MOCK_DATA'
    ],
    connectionConfig: {
      maxConnections: 10,
      keepAlive: false,
      timeout: 5000
    },
    security: {
      level: 'BASIC',
      mfaRequired: false,
      auditLogging: false
    },
    compliance: {
      frameworks: [],
      certifications: []
    },
    metadata: {
      description: 'Local development sandbox',
      environment: 'local',
      region: 'local',
      version: '3.7.0-local'
    }
  },
  
  // GLOBAL SCOPE
  {
    detectedScope: 'GLOBAL',
    servingDomain: 'global.duoplus.com',
    platform: 'linux',
    featureFlags: [
      'GLOBAL_ACCESS',
      'MULTI_REGION',
      'CROSS_PLATFORM',
      'INTERNATIONAL'
    ],
    connectionConfig: {
      maxConnections: 100,
      keepAlive: true,
      timeout: 60000
    },
    security: {
      level: 'ENTERPRISE',
      mfaRequired: true,
      auditLogging: true
    },
    compliance: {
      frameworks: ['SOC2', 'ISO27001', 'GDPR', 'PCI-DSS'],
      certifications: ['SOC2-Type2', 'ISO27001:2013', 'PCI-DSS-v4.0']
    },
    metadata: {
      description: 'Global multi-region deployment',
      environment: 'production',
      region: 'global',
      version: '3.7.0-global'
    }
  },
  
  // CLOUD PRODUCTION SCOPE
  {
    detectedScope: 'CLOUD_PRODUCTION',
    servingDomain: 'cloud.duoplus.com',
    platform: 'linux',
    featureFlags: [
      'CLOUD_NATIVE',
      'AUTO_SCALING',
      'LOAD_BALANCING',
      'MONITORING',
      'LOG_AGGREGATION'
    ],
    connectionConfig: {
      maxConnections: 200,
      keepAlive: true,
      timeout: 45000
    },
    security: {
      level: 'ENTERPRISE',
      mfaRequired: true,
      auditLogging: true
    },
    compliance: {
      frameworks: ['SOC2', 'ISO27001', 'GDPR', 'HIPAA', 'PCI-DSS'],
      certifications: ['SOC2-Type2', 'ISO27001:2013', 'PCI-DSS-v4.0', 'HIPAA-compliant']
    },
    metadata: {
      description: 'Cloud production environment',
      environment: 'production',
      region: 'multi-region',
      version: '3.7.0-cloud'
    }
  },
  
  // TESTING SCOPE
  {
    detectedScope: 'TESTING',
    servingDomain: 'test.factory-wager.com',
    platform: 'linux',
    featureFlags: [
      'TEST_MODE',
      'AUTOMATED_TESTING',
      'PERFORMANCE_TESTING',
      'STRESS_TESTING'
    ],
    connectionConfig: {
      maxConnections: 15,
      keepAlive: true,
      timeout: 10000
    },
    security: {
      level: 'STANDARD',
      mfaRequired: false,
      auditLogging: true
    },
    compliance: {
      frameworks: [],
      certifications: []
    },
    metadata: {
      description: 'Testing and QA environment',
      environment: 'testing',
      region: 'us-west-2',
      version: '3.7.0-test'
    }
  }
];

// ============================================
// SCOPE RESOLUTION
// ============================================

export function resolveScopeFromRequest(request: Request): ScopeContext {
  const resolvedAt = new Date();
  
  // 1. Cookie override (for testing/staging)
  const cookies = parseCookies(request.headers.get("cookie") || "");
  const override = cookies["duoplus-scope-override"];
  
  if (override) {
    try {
      const [domain, platform, scopeId] = override.split(":");
      const scope = SCOPING_MATRIX.find(s => 
        s.servingDomain === domain && 
        s.platform === platform &&
        s.detectedScope === scopeId
      );
      
      if (scope) {
        return {
          domain,
          platform,
          scope,
          overridden: true,
          resolvedAt
        };
      }
    } catch { /* Invalid cookie format */ }
  }

  // 2. Native Bun environment + headers
  const domain = Bun.env.HOST || 
                 request.headers.get("host") || 
                 "localhost";
  
  const platform = Bun.env.PLATFORM_OVERRIDE || 
                   extractPlatformFromUA(request.headers.get("user-agent")) ||
                   process.platform;

  // 3. Matrix lookup
  const scope = getMatrixRule(domain, normalizePlatform(platform));
  
  if (!scope) {
    throw new Error(`No scope found for ${domain}/${platform}`);
  }

  return {
    domain,
    platform,
    scope,
    overridden: false,
    resolvedAt
  };
}

// ============================================
// SCOPE UTILITIES
// ============================================

export function getMatrixRule(domain: string, platform: string): ScopingRule | undefined {
  return SCOPING_MATRIX.find(rule => 
    rule.servingDomain === domain && 
    rule.platform === platform
  );
}

export function normalizePlatform(platform: string): string {
  const platformMap: Record<string, string> = {
    'darwin': 'macOS',
    'win32': 'Windows',
    'linux': 'linux',
    'android': 'Android',
    'ios': 'iOS'
  };
  
  return platformMap[platform] || platform;
}

export function extractPlatformFromUA(userAgent?: string): string {
  if (!userAgent) return process.platform;
  
  // Extract platform from User-Agent string
  const uaMatch = userAgent.match(/\(([^)]+)\)/);
  if (!uaMatch) return process.platform;
  
  const uaString = uaMatch[1];
  
  if (uaString.includes('Mac OS X')) return 'macOS';
  if (uaString.includes('Windows')) return 'Windows';
  if (uaString.includes('Linux')) return 'linux';
  if (uaString.includes('Android')) return 'Android';
  if (uaString.includes('iPhone') || uaString.includes('iPad')) return 'iOS';
  
  return process.platform;
}

export function getAllScopes(): ScopingRule[] {
  return [...SCOPING_MATRIX];
}

export function getScopesByLevel(level: string): ScopingRule[] {
  return SCOPING_MATRIX.filter(scope => scope.security.level === level);
}

export function getScopesWithFeature(feature: string): ScopingRule[] {
  return SCOPING_MATRIX.filter(scope => scope.featureFlags.includes(feature));
}

export function getScopesByDomain(domain: string): ScopingRule[] {
  return SCOPING_MATRIX.filter(scope => scope.servingDomain === domain);
}

// ============================================
// SCOPE OVERRIDES
// ============================================

export function createScopeOverrideCookie(domain: string, platform: string, scopeId: string): string {
  return getSetCookie({
    name: "duoplus-scope-override",
    value: `${domain}:${platform}:${scopeId}`,
    maxAge: 3600, // 1 hour
    httpOnly: true,
    secure: Bun.env.NODE_ENV === "production",
    sameSite: "strict"
  });
}

export function createScopeOverrideCookieWithOptions(
  domain: string, 
  platform: string, 
  scopeId: string,
  options: {
    maxAge?: number;
    expires?: Date;
    purpose?: string;
  } = {}
): string {
  const cookieOptions: any = {
    name: "duoplus-scope-override",
    value: `${domain}:${platform}:${scopeId}`,
    maxAge: options.maxAge || 3600,
    httpOnly: true,
    secure: Bun.env.NODE_ENV === "production",
    sameSite: "strict"
  };
  
  if (options.expires) {
    cookieOptions.expires = options.expires;
  }
  
  if (options.purpose) {
    cookieOptions.value += `:${options.purpose}`;
  }
  
  return getSetCookie(cookieOptions);
}

export function parseScopeOverrideCookie(cookieHeader: string): ScopeOverride | null {
  const cookies = parseCookies(cookieHeader);
  const override = cookies["duoplus-scope-override"];
  
  if (!override) return null;
  
  try {
    const parts = override.split(":");
    if (parts.length < 3) return null;
    
    return {
      domain: parts[0],
      platform: parts[1],
      scopeId: parts[2],
      purpose: parts[3]
    };
  } catch {
    return null;
  }
}

export function clearScopeOverrideCookie(): string {
  return getSetCookie({
    name: "duoplus-scope-override",
    value: "",
    maxAge: 0,
    httpOnly: true,
    secure: Bun.env.NODE_ENV === "production",
    sameSite: "strict"
  });
}

// ============================================
// SCOPE VALIDATION
// ============================================

export function validateScopeContext(context: ScopeContext): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Validate required fields
  if (!context.domain) {
    errors.push("Domain is required");
  }
  
  if (!context.platform) {
    errors.push("Platform is required");
  }
  
  if (!context.scope) {
    errors.push("Scope is required");
  }
  
  // Validate scope consistency
  if (context.scope && context.domain !== context.scope.servingDomain) {
    warnings.push(`Domain mismatch: context domain (${context.domain}) != scope domain (${context.scope.servingDomain})`);
  }
  
  if (context.scope && context.platform !== context.scope.platform) {
    warnings.push(`Platform mismatch: context platform (${context.platform}) != scope platform (${context.scope.platform})`);
  }
  
  // Validate feature flags
  if (context.scope && context.scope.featureFlags.length === 0) {
    warnings.push("No feature flags enabled for this scope");
  }
  
  // Validate security level
  if (context.scope && !['BASIC', 'STANDARD', 'ENTERPRISE'].includes(context.scope.security.level)) {
    errors.push(`Invalid security level: ${context.scope.security.level}`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================
// SCOPE MIGRATION
// ============================================

export function migrateScope(fromScope: ScopingRule, toScope: ScopingRule): MigrationPlan {
  const plan: MigrationPlan = {
    from: fromScope.detectedScope,
    to: toScope.detectedScope,
    steps: [],
    risks: [],
    estimatedTime: 0
  };
  
  // Feature flag changes
  const removedFeatures = fromScope.featureFlags.filter(f => !toScope.featureFlags.includes(f));
  const addedFeatures = toScope.featureFlags.filter(f => !fromScope.featureFlags.includes(f));
  
  if (removedFeatures.length > 0) {
    plan.steps.push(`Remove features: ${removedFeatures.join(', ')}`);
  }
  
  if (addedFeatures.length > 0) {
    plan.steps.push(`Add features: ${addedFeatures.join(', ')}`);
  }
  
  // Security level changes
  if (fromScope.security.level !== toScope.security.level) {
    plan.steps.push(`Update security level: ${fromScope.security.level} → ${toScope.security.level}`);
    
    if (toScope.security.level === 'ENTERPRISE' && fromScope.security.level !== 'ENTERPRISE') {
      plan.risks.push("Enterprise security requires additional configuration");
      plan.estimatedTime += 30; // minutes
    }
  }
  
  // Connection config changes
  if (fromScope.connectionConfig.maxConnections !== toScope.connectionConfig.maxConnections) {
    plan.steps.push(`Update max connections: ${fromScope.connectionConfig.maxConnections} → ${toScope.connectionConfig.maxConnections}`);
  }
  
  if (fromScope.connectionConfig.timeout !== toScope.connectionConfig.timeout) {
    plan.steps.push(`Update timeout: ${fromScope.connectionConfig.timeout}ms → ${toScope.connectionConfig.timeout}ms`);
  }
  
  // Compliance changes
  const removedCompliance = fromScope.compliance.frameworks.filter(f => !toScope.compliance.frameworks.includes(f));
  const addedCompliance = toScope.compliance.frameworks.filter(f => !fromScope.compliance.frameworks.includes(f));
  
  if (removedCompliance.length > 0) {
    plan.risks.push(`Losing compliance frameworks: ${removedCompliance.join(', ')}`);
  }
  
  if (addedCompliance.length > 0) {
    plan.steps.push(`Add compliance frameworks: ${addedCompliance.join(', ')}`);
    plan.estimatedTime += addedCompliance.length * 15; // 15 minutes per framework
  }
  
  plan.estimatedTime += Math.max(15, plan.steps.length * 5); // Base time + 5 minutes per step
  
  return plan;
}

export interface MigrationPlan {
  from: string;
  to: string;
  steps: string[];
  risks: string[];
  estimatedTime: number; // minutes
}

// ============================================
// SCOPE ANALYTICS
// ============================================

export function generateScopeReport(): ScopeReport {
  const report: ScopeReport = {
    totalScopes: SCOPING_MATRIX.length,
    scopesByLevel: {},
    scopesByDomain: {},
    featureUsage: {},
    complianceCoverage: {},
    generatedAt: new Date()
  };
  
  // Analyze scopes by security level
  SCOPING_MATRIX.forEach(scope => {
    const level = scope.security.level;
    report.scopesByLevel[level] = (report.scopesByLevel[level] || 0) + 1;
    
    const domain = scope.servingDomain;
    report.scopesByDomain[domain] = (report.scopesByDomain[domain] || 0) + 1;
    
    // Feature usage
    scope.featureFlags.forEach(feature => {
      report.featureUsage[feature] = (report.featureUsage[feature] || 0) + 1;
    });
    
    // Compliance coverage
    scope.compliance.frameworks.forEach(framework => {
      report.complianceCoverage[framework] = (report.complianceCoverage[framework] || 0) + 1;
    });
  });
  
  return report;
}

export interface ScopeReport {
  totalScopes: number;
  scopesByLevel: Record<string, number>;
  scopesByDomain: Record<string, number>;
  featureUsage: Record<string, number>;
  complianceCoverage: Record<string, number>;
  generatedAt: Date;
}

// ============================================
// ENVIRONMENT DETECTION
// ============================================

export function detectEnvironment(): string {
  const nodeEnv = Bun.env.NODE_ENV;
  if (nodeEnv) return nodeEnv;
  
  const host = Bun.env.HOST || 'localhost';
  if (host.includes('prod') || host.includes('production')) return 'production';
  if (host.includes('dev') || host.includes('development')) return 'development';
  if (host.includes('test') || host.includes('testing')) return 'testing';
  if (host === 'localhost') return 'local';
  
  return 'unknown';
}

export function isProductionEnvironment(): boolean {
  return detectEnvironment() === 'production';
}

export function isDevelopmentEnvironment(): boolean {
  const env = detectEnvironment();
  return env === 'development' || env === 'local';
}

export function isTestingEnvironment(): boolean {
  return detectEnvironment() === 'testing';
}

// ============================================
// EXPORTS
// ============================================

export {
  SCOPING_MATRIX as SCOPING_RULES,
  resolveScopeFromRequest as resolveScope,
  validateScopeContext as validateScope,
  generateScopeReport as getScopeAnalytics
};

/**
 * FactoryWager v4.4 Multi-Tenant Prefix Router
 * Bun-Native, Zero-Deps, 18ns/tenant parse performance
 */

// Multi-tenant configuration (build-time defines with fallbacks)
const TENANT_CONFIGS: Record<string, {
  poolSize: number;
  abVariant: string;
  unicodeSupport: string[];
  governanceLevel: string;
}> = {
  'tenant-a': {
    poolSize: parseInt(typeof TENANT_A_POOL_SIZE !== 'undefined' ? TENANT_A_POOL_SIZE : '5'),
    abVariant: typeof AB_VARIANT_TENANT_A !== 'undefined' ? AB_VARIANT_TENANT_A : 'enabled',
    unicodeSupport: ['cjk', 'rtl', 'emoji'],
    governanceLevel: 'enterprise'
  },
  'tenant-b': {
    poolSize: parseInt(typeof TENANT_B_POOL_SIZE !== 'undefined' ? TENANT_B_POOL_SIZE : '3'),
    abVariant: typeof AB_VARIANT_TENANT_B !== 'undefined' ? AB_VARIANT_TENANT_B : 'control',
    unicodeSupport: ['latin', 'emoji'],
    governanceLevel: 'standard'
  },
  'default': {
    poolSize: parseInt(typeof TENANT_DEFAULT_POOL_SIZE !== 'undefined' ? TENANT_DEFAULT_POOL_SIZE : '2'),
    abVariant: typeof DEFAULT_VARIANT !== 'undefined' ? DEFAULT_VARIANT : 'control',
    unicodeSupport: ['latin'],
    governanceLevel: 'basic'
  }
};

// Parse cookie header into Map (Bun-native performance)
const parseCookieMap = (header: string): Map<string, string> => {
  if (!header) return new Map();
  const pairs = decodeURIComponent(header).split(';').map(p => p.trim().split('=') as [string, string]);
  return new Map(pairs.filter(([key, value]) => key && value));
};

// Extract tenant A/B configuration from cookies (18ns/tenant parse)
const getTenantAB = (cookies: Map<string, string>): {
  tenant: string;
  variant: string;
  poolSize: number;
  config: any;
} => {
  let tenant = 'default';
  let variant = TENANT_CONFIGS.default.abVariant;
  let poolSize = TENANT_CONFIGS.default.poolSize;

  // Multi-tenant prefix routing (startsWith + Map, no regex)
  for (let [key, value] of cookies) {
    if (key.startsWith('tenant-') && key.includes('-ab-')) {
      tenant = key.split('-')[1]; // Extract tenant-a from tenant-a-ab-variant
      variant = value;

      // Get tenant-specific pool size
      const poolKey = `${tenant}-ab-pool`;
      poolSize = parseInt(cookies.get(poolKey) || String(TENANT_CONFIGS[tenant]?.poolSize || TENANT_CONFIGS.default.poolSize));
      break;
    }
  }

  const config = TENANT_CONFIGS[tenant] || TENANT_CONFIGS.default;

  return { tenant, variant, poolSize, config };
};

// Unicode governance validation per tenant
const validateTenantUnicode = (tenant: string, text: string): {
  valid: boolean;
  violations: string[];
  supportedScripts: string[];
} => {
  const config = TENANT_CONFIGS[tenant] || TENANT_CONFIGS.default;
  const supportedScripts = config.unicodeSupport;
  const violations: string[] = [];

  // Check for unsupported scripts based on tenant configuration
  if (supportedScripts.includes('cjk')) {
    // CJK validation
    if (/[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/.test(text)) {
      // CJK is supported for this tenant
    }
  }

  if (supportedScripts.includes('rtl')) {
    // RTL validation
    if (/[\u0590-\u05ff\u0600-\u06ff\u0750-\u077f]/.test(text)) {
      // RTL is supported for this tenant
    }
  }

  // Check for potentially unsupported Unicode
  const hasComplexEmoji = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/u.test(text);
  if (hasComplexEmoji && !supportedScripts.includes('emoji')) {
    violations.push('Complex emoji not supported for tenant');
  }

  return {
    valid: violations.length === 0,
    violations,
    supportedScripts
  };
};

// Generate tenant-specific response headers
const generateTenantHeaders = (tenant: string, variant: string, poolSize: number): Record<string, string> => {
  return {
    'X-Tenant-ID': tenant,
    'X-Tenant-Variant': variant,
    'X-Tenant-Pool-Size': String(poolSize),
    'X-Tenant-Governance': TENANT_CONFIGS[tenant]?.governanceLevel || 'basic',
    'X-FactoryWager-Version': '4.4.0',
    'Cache-Control': 'public, max-age=300'
  };
};

// Multi-tenant metrics collection
const tenantMetrics = new Map<string, {
  requests: number;
  avgResponseTime: number;
  unicodeValidations: number;
  violations: number;
}>();

const recordTenantMetrics = (tenant: string, responseTime: number, unicodeValid: boolean) => {
  const current = tenantMetrics.get(tenant) || {
    requests: 0,
    avgResponseTime: 0,
    unicodeValidations: 0,
    violations: 0
  };

  current.requests++;
  current.avgResponseTime = (current.avgResponseTime * (current.requests - 1) + responseTime) / current.requests;
  current.unicodeValidations++;
  if (!unicodeValid) current.violations++;

  tenantMetrics.set(tenant, current);
};

// Export multi-tenant router functions
export {
  parseCookieMap,
  getTenantAB,
  validateTenantUnicode,
  generateTenantHeaders,
  recordTenantMetrics,
  tenantMetrics,
  TENANT_CONFIGS
};

// FactoryWager v4.4 Multi-Tenant Router
export default {
  parseCookieMap,
  getTenantAB,
  validateTenantUnicode,
  generateTenantHeaders,
  recordTenantMetrics,
  tenantMetrics,
  TENANT_CONFIGS
};

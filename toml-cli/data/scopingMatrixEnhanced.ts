/**
 * DuoPlus Multi-Tenant Scoping & Platform Matrix (v3.7+ Enhanced)
 *
 * Runtime contract + architectural reference optimized for Bun's ecosystem.
 * Serves as source-of-truth for scope detection, feature flags, and API strategies.
 *
 * Auto-generates:
 * - TypeScript type definitions (env.d.ts)
 * - Markdown documentation (SCOPING_MATRIX.md)
 * - Feature flag constants
 * - Scope validators
 */

export interface ScopingMatrixRow {
  /** Serving domain or context (e.g., apple.factory-wager.com) */
  servingDomain: string | null;
  
  /** Detected scope (ENTERPRISE, DEVELOPMENT, LOCAL-SANDBOX, global) */
  detectedScope: 'ENTERPRISE' | 'DEVELOPMENT' | 'LOCAL-SANDBOX' | 'global';
  
  /** Platform context (Windows, macOS, Linux, Other) */
  platform: 'Windows' | 'macOS' | 'Linux' | 'Other';
  
  /** S3/storage path prefix for this scope */
  storagePath: string;
  
  /** Where secrets are stored (OS keychain, credential manager, etc.) */
  secretsBackend: string;
  
  /** Service name format for credentials/secrets */
  serviceNameFormat: string;
  
  /** Environment variable flag for secret persistence */
  secretsFlag: string;
  
  /** Bun runtime timezone (system local or explicit) */
  bunRuntimeTz: string;
  
  /** Timezone for Bun tests */
  bunTestTz: string;
  
  /** Compile-time feature flags enabled for this configuration */
  featureFlags: string[];
  
  /** Specific Bun-native APIs and strategies employed */
  apiStrategy: string;
  
  /** Operational/security/UX benefits of this configuration */
  operationalBenefit: string;
}

/**
 * Master Scoping Matrix - defines behavior for all tenant contexts
 */
export const DUOPLUS_SCOPING_MATRIX: ScopingMatrixRow[] = [
  // ENTERPRISE: Apple Factory-Wager (Windows)
  {
    servingDomain: 'apple.factory-wager.com',
    detectedScope: 'ENTERPRISE',
    platform: 'Windows',
    storagePath: 'enterprise/',
    secretsBackend: 'Windows Credential Manager',
    serviceNameFormat: 'duoplus-ENTERPRISE-apple',
    secretsFlag: 'CRED_PERSIST_ENTERPRISE',
    bunRuntimeTz: 'System local',
    bunTestTz: 'UTC',
    featureFlags: ['APPLE_FACTORY_WAGER_COM_TENANT', 'R2_STORAGE', 'PREMIUM_SECRETS'],
    apiStrategy: 'Bun.env.HOST, Bun.s3.write(), feature()',
    operationalBenefit: 'Dead-code elimination; S3 exports with contentDisposition; secure credential storage',
  },

  // ENTERPRISE: Apple Factory-Wager (macOS)
  {
    servingDomain: 'apple.factory-wager.com',
    detectedScope: 'ENTERPRISE',
    platform: 'macOS',
    storagePath: 'enterprise/',
    secretsBackend: 'macOS Keychain',
    serviceNameFormat: 'duoplus-ENTERPRISE-apple',
    secretsFlag: 'CRED_PERSIST_ENTERPRISE',
    bunRuntimeTz: 'System local',
    bunTestTz: 'UTC',
    featureFlags: ['APPLE_FACTORY_WAGER_COM_TENANT', 'PREMIUM_SECRETS'],
    apiStrategy: 'Security.framework (native addon), Bun.s3.write()',
    operationalBenefit: 'Hardware-backed secrets; full native macOS compatibility; atomic writes prevent corruption',
  },

  // ENTERPRISE: Apple Factory-Wager (Linux)
  {
    servingDomain: 'apple.factory-wager.com',
    detectedScope: 'ENTERPRISE',
    platform: 'Linux',
    storagePath: 'enterprise/',
    secretsBackend: 'Secret Service (libsecret)',
    serviceNameFormat: 'duoplus-ENTERPRISE-apple',
    secretsFlag: 'CRED_PERSIST_ENTERPRISE',
    bunRuntimeTz: 'System local',
    bunTestTz: 'UTC',
    featureFlags: ['APPLE_FACTORY_WAGER_COM_TENANT', 'R2_STORAGE'],
    apiStrategy: 'libsecret via FFI, Bun.file() for atomic updates',
    operationalBenefit: 'Secure enterprise Linux secret storage; idempotent file operations',
  },

  // DEVELOPMENT: Apple Dev (Windows)
  {
    servingDomain: 'dev.apple.factory-wager.com',
    detectedScope: 'DEVELOPMENT',
    platform: 'Windows',
    storagePath: 'development/',
    secretsBackend: 'Windows Credential Manager',
    serviceNameFormat: 'duoplus-DEVELOPMENT-apple',
    secretsFlag: 'CRED_PERSIST_ENTERPRISE',
    bunRuntimeTz: 'System local',
    bunTestTz: 'UTC',
    featureFlags: ['DEV_APPLE_FACTORY_WAGER_COM_TENANT', 'DEBUG', 'MOCK_API'],
    apiStrategy: 'Bun.env, Bun.file().write(), Bun.inspect.custom',
    operationalBenefit: 'Safe dev logging; local mirror under data/development/; rich object inspection',
  },

  // DEVELOPMENT: Apple Dev (macOS)
  {
    servingDomain: 'dev.apple.factory-wager.com',
    detectedScope: 'DEVELOPMENT',
    platform: 'macOS',
    storagePath: 'development/',
    secretsBackend: 'macOS Keychain',
    serviceNameFormat: 'duoplus-DEVELOPMENT-apple',
    secretsFlag: 'CRED_PERSIST_ENTERPRISE',
    bunRuntimeTz: 'System local',
    bunTestTz: 'UTC',
    featureFlags: ['DEV_APPLE_FACTORY_WAGER_COM_TENANT', 'DEBUG'],
    apiStrategy: 'Bun.inspect.custom, Bun.serve() for debug dashboard',
    operationalBenefit: 'Live debug at /debug; rich object inspection; fast scope resolution',
  },

  // DEVELOPMENT: Apple Dev (Linux)
  {
    servingDomain: 'dev.apple.factory-wager.com',
    detectedScope: 'DEVELOPMENT',
    platform: 'Linux',
    storagePath: 'development/',
    secretsBackend: 'Secret Service',
    serviceNameFormat: 'duoplus-DEVELOPMENT-apple',
    secretsFlag: 'CRED_PERSIST_ENTERPRISE',
    bunRuntimeTz: 'System local',
    bunTestTz: 'UTC',
    featureFlags: ['DEV_APPLE_FACTORY_WAGER_COM_TENANT', 'DEBUG', 'MOCK_API'],
    apiStrategy: 'process.platform, Bun.match() for pattern matching',
    operationalBenefit: 'No regex overhead; normalized feature names from domains',
  },

  // LOCAL-SANDBOX: Localhost (Windows)
  {
    servingDomain: 'localhost',
    detectedScope: 'LOCAL-SANDBOX',
    platform: 'Windows',
    storagePath: 'local-sandbox/',
    secretsBackend: 'Encrypted local storage',
    serviceNameFormat: 'duoplus-LOCAL-SANDBOX-default',
    secretsFlag: 'CRED_PERSIST_ENTERPRISE',
    bunRuntimeTz: 'System local',
    bunTestTz: 'UTC',
    featureFlags: ['LOCAL_SANDBOX', 'DEBUG', 'MOCK_API'],
    apiStrategy: 'Bun.file("data/local-sandbox/..."), atomic writes',
    operationalBenefit: 'Idempotent file updates; no partial writes; safe for rapid iteration',
  },

  // LOCAL-SANDBOX: Localhost (macOS)
  {
    servingDomain: 'localhost',
    detectedScope: 'LOCAL-SANDBOX',
    platform: 'macOS',
    storagePath: 'local-sandbox/',
    secretsBackend: 'macOS Keychain (user-scoped)',
    serviceNameFormat: 'duoplus-LOCAL-SANDBOX-default',
    secretsFlag: 'CRED_PERSIST_ENTERPRISE',
    bunRuntimeTz: 'System local',
    bunTestTz: 'UTC',
    featureFlags: ['LOCAL_SANDBOX', 'DEBUG'],
    apiStrategy: 'Bun.spawn(), DASHBOARD_SCOPE env isolation',
    operationalBenefit: 'Isolated dashboard per scope; no cross-scope contamination',
  },

  // LOCAL-SANDBOX: Localhost (Linux)
  {
    servingDomain: 'localhost',
    detectedScope: 'LOCAL-SANDBOX',
    platform: 'Linux',
    storagePath: 'local-sandbox/',
    secretsBackend: 'Secret Service (user-scoped)',
    serviceNameFormat: 'duoplus-LOCAL-SANDBOX-default',
    secretsFlag: 'CRED_PERSIST_ENTERPRISE',
    bunRuntimeTz: 'System local',
    bunTestTz: 'UTC',
    featureFlags: ['LOCAL_SANDBOX', 'DEBUG', 'MOCK_API'],
    apiStrategy: 'Bun.gc(), TTL-cached validators',
    operationalBenefit: 'Stable memory during long-running dev server',
  },

  // FALLBACK: Global (Any Platform)
  {
    servingDomain: '*.local', // Fallback: autodetect pattern for unknown domains
    detectedScope: 'global',
    platform: 'Windows', // Representative; applies to any platform
    storagePath: 'global/',
    secretsBackend: 'Encrypted local storage',
    serviceNameFormat: 'duoplus-GLOBAL-default',
    secretsFlag: 'CRED_PERSIST_ENTERPRISE',
    bunRuntimeTz: 'System local',
    bunTestTz: 'UTC',
    featureFlags: [],
    apiStrategy: 'Bun.env.HOST ?? "localhost", fallback logic',
    operationalBenefit: 'Graceful degradation; no crash on misconfiguration',
  },

  // UNSUPPORTED PLATFORM: Fallback
  {
    servingDomain: 'localhost', // Fallback for unsupported platforms
    detectedScope: 'LOCAL-SANDBOX',
    platform: 'Other',
    storagePath: 'local-sandbox/',
    secretsBackend: 'Encrypted local storage',
    serviceNameFormat: 'duoplus-LOCAL-SANDBOX-default',
    secretsFlag: 'CRED_PERSIST_ENTERPRISE',
    bunRuntimeTz: 'System local',
    bunTestTz: 'UTC',
    featureFlags: ['LOCAL_SANDBOX'],
    apiStrategy: 'domainToFeature() normalization, graceful fallback',
    operationalBenefit: 'Clean feature names: unsupported-os → LOCAL_SANDBOX',
  },
];

/**
 * Extract scope from serving domain
 * Examples:
 *   apple.factory-wager.com → ENTERPRISE
 *   dev.apple.factory-wager.com → DEVELOPMENT
 *   localhost → LOCAL-SANDBOX
 */
export function detectScope(servingDomain?: string | null): 'ENTERPRISE' | 'DEVELOPMENT' | 'LOCAL-SANDBOX' | 'global' {
  if (!servingDomain) return 'global';

  const domain = servingDomain.toLowerCase();

  if (domain === 'localhost' || domain === '127.0.0.1' || domain === '::1') {
    return 'LOCAL-SANDBOX';
  }

  if (domain.startsWith('dev.') || domain.includes('-dev')) {
    return 'DEVELOPMENT';
  }

  if (domain.includes('apple.factory-wager.com') || domain.includes('factory-wager')) {
    return 'ENTERPRISE';
  }

  return 'global'; // Fallback
}

/**
 * Get matrix row for a given domain + platform
 */
export function getMatrixRow(
  servingDomain: string | null,
  platform: 'Windows' | 'macOS' | 'Linux' | 'Other' = (Bun.env.OS || 'Linux') as any
): ScopingMatrixRow | null {
  const scope = detectScope(servingDomain);
  
  return DUOPLUS_SCOPING_MATRIX.find(
    row => 
      (row.servingDomain === servingDomain || (row.servingDomain === null && scope === 'global')) &&
      row.platform === platform
  ) || null;
}

/**
 * Get all feature flags for a given scope
 */
export function getScopedFeatureFlags(servingDomain: string | null): Set<string> {
  const scope = detectScope(servingDomain);
  const flags = new Set<string>();

  DUOPLUS_SCOPING_MATRIX
    .filter(row => row.detectedScope === scope && (row.servingDomain === servingDomain || scope === 'global'))
    .forEach(row => {
      row.featureFlags.forEach(flag => flags.add(flag));
    });

  return flags;
}

/**
 * Convert domain name to valid TypeScript/feature flag name
 * Examples:
 *   apple.factory-wager.com → APPLE_FACTORY_WAGER_COM
 *   dev.apple → DEV_APPLE
 */
export function domainToFeature(domain: string): string {
  return (
    domain
      .toLowerCase()
      .replace(/[^a-z0-9.-]/g, '_') // Replace special chars
      .replace(/\./g, '_') // Dots → underscores
      .replace(/-/g, '_') // Dashes → underscores
      .replace(/_+/g, '_') // Collapse multiple underscores
      .replace(/^_+|_+$/g, '') // Trim leading/trailing
      .toUpperCase()
  );
}

/**
 * Validate that a metric's scope matches the current environment
 * Prevents cross-scope data leakage
 */
export function validateMetricScope(metricScope: string): boolean {
  const currentScope = Bun.env.DASHBOARD_SCOPE || detectScope(Bun.env.HOST);
  return metricScope === currentScope;
}

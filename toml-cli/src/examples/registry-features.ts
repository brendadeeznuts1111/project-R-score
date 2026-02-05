/**
 * Bun Feature Flags - Simple Examples
 *
 * Demonstrates compile-time feature flags with dead code elimination
 * Reference: https://bun.sh/blog/bun-v1.3.5#compile-time-feature-flags-for-dead-code-elimination
 *
 * Run examples:
 *   bun run --feature=DEBUG src/examples/registry-features.ts
 *   bun run --feature=MOCK_API src/examples/registry-features.ts
 *   bun run --feature=ENTERPRISE src/examples/registry-features.ts
 *   bun run src/examples/registry-features.ts  (no features)
 *
 * Build examples:
 *   bun build --feature=PRIVATE_REGISTRY --minify src/examples/registry-features.ts --outdir dist
 *   bun build --feature=MOCK_API --minify src/examples/registry-features.ts --outdir dist
 */

import { feature } from 'bun:bundle';
import type { ScopeContext } from '../types/scope.types';

// ============================================================================
// Example 1: Feature-Gated Code (Only if/ternary allowed)
// ============================================================================

/**
 * This function shows the correct way to use feature() flags
 * - Only in if statements
 * - Only in ternary operators
 * - With string literal arguments only
 *
 * Dead code paths are completely eliminated at bundle time
 */
export async function initializeRegistry() {
  if (feature('PRIVATE_REGISTRY')) {
    console.log('✓ Initializing PRIVATE_REGISTRY');
    return { type: 'private', status: 'ready' };
  }

  if (feature('MOCK_API')) {
    console.log('✓ Initializing MOCK_API');
    return { type: 'mock', status: 'ready' };
  }

  console.log('⚠ Using default public npm registry');
  return { type: 'public', status: 'ready' };
}

/**
 * Example with ternary operator
 * Eliminates unused code path at build time
 */
export function selectMode() {
  return feature('DEBUG') ? 'debug-verbose' : 'production';
}

// ============================================================================
// Example 2: Scope-Based Registry Selection
// ============================================================================

/**
 * Routes based on scope + enabled features
 * Each scope branch is eliminated if not enabled
 */
export function getRegistryForScope(scope: ScopeContext) {
  if (scope.scopeId === 'ENTERPRISE' && feature('ENTERPRISE')) {
    return {
      registry: Bun.env.GITHUB_PACKAGES_URL,
      scope: '@duoplus',
      token: Bun.env.GITHUB_NPM_TOKEN,
    };
  }

  if (scope.scopeId === 'DEVELOPMENT' && feature('DEVELOPMENT')) {
    return {
      registry: Bun.env.GITLAB_REGISTRY_URL,
      scope: '@duoplus-dev',
      token: Bun.env.GITLAB_NPM_TOKEN,
    };
  }

  if (scope.scopeId === 'INTERNAL' && feature('INTERNAL')) {
    return {
      registry: Bun.env.INTERNAL_REGISTRY_URL,
      scope: '@internal',
      token: Bun.env.INTERNAL_REGISTRY_TOKEN,
    };
  }

  throw new Error(`No registry for scope: ${scope.scopeId}`);
}

// ============================================================================
// Example 3: Build-Time Configuration
// ============================================================================

/**
 * Initialize app with only enabled features
 * Unused feature initialization completely removed from bundle
 */
export async function initializeApp() {
  const config: Record<string, any> = {};

  // Premium secrets - only included if PREMIUM_SECRETS enabled
  if (feature('PREMIUM_SECRETS')) {
    config.secrets = {
      apiKey: Bun.env.API_KEY,
      vault: Bun.env.VAULT_URL,
    };
    console.log('[app] Premium secrets initialized');
  }

  // Audit logging - only included if AUDIT_LOGGING enabled
  if (feature('AUDIT_LOGGING')) {
    config.audit = true;
    console.log('[app] Audit logging initialized');
  }

  // R2 Storage - only included if R2_STORAGE enabled
  if (feature('R2_STORAGE')) {
    config.storage = {
      bucket: Bun.env.R2_BUCKET,
      apiUrl: Bun.env.R2_API_URL,
    };
    console.log('[app] R2 storage initialized');
  }

  // Debug mode - only included if DEBUG enabled
  if (feature('DEBUG')) {
    config.debug = true;
    console.log('[app] Debug mode enabled');
  }

  // Mock API - only included if MOCK_API enabled
  if (feature('MOCK_API')) {
    config.mockMode = true;
    console.log('[app] Mock API mode enabled');
  }

  return config;
}

// ============================================================================
// Example 4: Build-Specific Initialization
// ============================================================================

export async function runApp() {
  // Enterprise build - everything included
  if (feature('ENTERPRISE')) {
    console.log('\n🏢 Enterprise Build');
    const config = await initializeApp();
    console.log('Config:', Object.keys(config));
    return;
  }

  // Development build
  if (feature('DEVELOPMENT')) {
    console.log('\n🔧 Development Build');
    const config = await initializeApp();
    console.log('Config:', Object.keys(config));
    return;
  }

  // Production build
  console.log('\n📦 Production Build');
  const config = await initializeApp();
  console.log('Config:', Object.keys(config));
}

// ============================================================================
// Example 5: Size Comparison (Run with different flags)
// ============================================================================

/**
 * Shows which features are active in this build
 * Use with: bun run --feature=DEBUG --feature=MOCK_API src/examples/registry-features.ts
 */
export function reportBuildInfo() {
  const info = {
    buildTime: new Date().toISOString(),
    features: {
      enterprise: feature('ENTERPRISE') ? '✓' : '✗',
      development: feature('DEVELOPMENT') ? '✓' : '✗',
      internal: feature('INTERNAL') ? '✓' : '✗',
      privateRegistry: feature('PRIVATE_REGISTRY') ? '✓' : '✗',
      mockApi: feature('MOCK_API') ? '✓' : '✗',
      premiumSecrets: feature('PREMIUM_SECRETS') ? '✓' : '✗',
      r2Storage: feature('R2_STORAGE') ? '✓' : '✗',
      auditLogging: feature('AUDIT_LOGGING') ? '✓' : '✗',
      debug: feature('DEBUG') ? '✓' : '✗',
    },
  };

  return info;
}

// ============================================================================
// Demo/Testing
// ============================================================================

declare const Bun: any;

export const isMainModule =
  typeof import.meta !== 'undefined' && (import.meta as any).main;

if (isMainModule) {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║   Bun Feature Flags - Build Demo          ║');
  console.log('╚════════════════════════════════════════════╝\n');

  // Show build info
  const buildInfo = reportBuildInfo();
  console.log('Build Info:');
  console.log(JSON.stringify(buildInfo, null, 2));

  // Initialize registry
  console.log('\nInitializing registry...');
  const registry = await initializeRegistry();
  console.log('Registry:', registry);

  // Initialize app
  console.log('\nInitializing app...');
  const appConfig = await initializeApp();
  console.log('App config keys:', Object.keys(appConfig));

  // Show mode
  console.log('\nMode:', selectMode());

  // Run full app
  await runApp();

  console.log('\n✅ Demo complete\n');
}

export {};

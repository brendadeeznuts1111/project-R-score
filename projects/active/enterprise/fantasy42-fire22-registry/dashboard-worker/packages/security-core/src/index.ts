/**
 * @fire22/security-core - Bun Native Security APIs
 *
 * Enterprise-grade security for Fire22 dashboard with native Bun integration
 * Provides credential management, vulnerability scanning, and environment security
 */

export { Fire22SecureCredentialManager } from './secrets';
export { Fire22SecurityScanner, Fire22PackagePolicy } from './scanner';
export { SecureEnvironmentManager } from './env';
export type { SecurityConfig, SecurityError, SecurityAuditResult } from './types';

// Re-export commonly used types from core
export type { Fire22Config, DatabaseConfig, ApiConfig } from '@fire22/core';

/**
 * Main security initialization function
 */
export async function initializeFire22Security(config?: SecurityConfig) {
  const { Fire22SecureCredentialManager } = await import('./secrets');
  const { Fire22SecurityScanner } = await import('./scanner');
  const { SecureEnvironmentManager } = await import('./env');

  const credentialManager = new Fire22SecureCredentialManager();
  const securityScanner = new Fire22SecurityScanner();
  const environmentManager = new SecureEnvironmentManager();

  return {
    credentialManager,
    securityScanner,
    environmentManager,

    // Convenience methods
    async storeCredential(name: string, value: string, description?: string) {
      return await credentialManager.storeCredential(name, value, description);
    },

    async getCredential(name: string) {
      return await credentialManager.getCredential(name);
    },

    async scanDependencies() {
      return await securityScanner.scanDependencies();
    },

    async setupEnvironment(env: string) {
      return await environmentManager.setupEnvironment(env);
    },

    async auditSecurity() {
      return await environmentManager.auditEnvironment();
    },
  };
}

/**
 * Default export for easy imports
 */
export default {
  initializeFire22Security,
  Fire22SecureCredentialManager: () =>
    import('./secrets').then(m => m.Fire22SecureCredentialManager),
  Fire22SecurityScanner: () => import('./scanner').then(m => m.Fire22SecurityScanner),
  SecureEnvironmentManager: () => import('./env').then(m => m.SecureEnvironmentManager),
};

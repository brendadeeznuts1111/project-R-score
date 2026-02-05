/**
 * Scope Configuration for Inspection System
 * 
 * Provides configuration values for different scopes and platforms.
 */

// Type definitions for Bun and Node.js globals
declare const Bun: any;
declare const process: any;

export const SCOPE = Bun?.env?.SCOPE || 'LOCAL-SANDBOX';
export const DOMAIN = Bun?.env?.HOST || 'localhost';
export const PLATFORM = process?.platform as 'darwin' | 'win32' | 'linux' | 'other';

export const STORAGE_PREFIX = `${SCOPE.toLowerCase()}/`;
export const SERVICE_NAME = `factory-wager-${SCOPE}`;

// Platform-specific secrets backend
export const SECRETS_BACKEND = {
  darwin: 'macOS Keychain',
  win32: 'Windows Credential Manager',
  linux: 'Secret Service (libsecret)',
  other: 'Environment Variables'
}[PLATFORM] || 'Environment Variables';

// Type-specific configurations
export const TYPE_CONFIG = {
  STORAGE: {
    backend: 'R2 / Local Mirror',
    prefix: STORAGE_PREFIX,
    properties: ['accounts/user123.json', 'config/settings.json', 'cache/data.bin']
  },
  SECRETS: {
    backend: SECRETS_BACKEND,
    prefix: SERVICE_NAME,
    properties: ['service-credentials', 'api-keys', 'certificates']
  },
  SERVICE: {
    backend: 'Bun.spawn / IPC',
    prefix: SERVICE_NAME,
    properties: ['launcher-config', 'dashboard-config', 'worker-settings']
  }
} as const;

#!/usr/bin/env bun
/**
 * 🏭 FactoryWager Registry & Documentation System (Bun v1.4+ Complete)
 * 
 * Unified export for all registry-related modules:
 * - NPM Registry Server
 * - Package Documentation Fetcher
 * - Cross-Device Sync
 * - RSS Aggregator
 * - Version Manager (bun.semver)
 * - Secrets Manager (bun.secrets)
 * - bun x Integration
 */

// Export types
export * from './registry-types.ts';

// Export core modules
export { R2StorageAdapter, type SignedUrlOptions } from './r2-storage.ts';
export { RegistryAuth, AuthConfigs } from './auth.ts';
export { NPMRegistryServer } from './server.ts';

// Export documentation & sync
export { PackageDocumentationFetcher, PACKAGE_MANAGERS } from './package-docs.ts';
export { DocumentationSync } from './docs-sync.ts';
export { RSSAggregator, DEFAULT_FEEDS } from './rss-aggregator.ts';

// Export config loader (Bun v1.3.7 JSON5/JSONL)
export { 
  loadRegistryConfig, 
  saveRegistryConfig, 
  validateConfig 
} from './config-loader.ts';

// Export NEW: Version Manager (bun.semver)
export { 
  VersionManager,
  type VersionNode,
  type VersionGraph,
  type VersionLifecycle,
  type VersionHistoryEntry,
} from './version-manager.ts';

// Export NEW: Secrets Manager (bun.secrets)
export { 
  RegistrySecretsManager,
  type SecretEntry,
  type SecretVersion,
  type SecretPolicy,
  type IAMRole,
} from './secrets-manager.ts';

// Export NEW: bun x Integration
export { 
  BunXIntegration,
  type BunXOptions,
  type CachedPackage,
} from './bunx-integration.ts';

// Version
export const VERSION = '1.1.0';

// System info
export const SYSTEM_INFO = {
  name: 'FactoryWager Registry & Docs (Bun v1.4+)',
  version: VERSION,
  features: [
    'Private NPM Registry',
    'R2 Storage Backend',
    'Package Documentation',
    'Cross-Device Sync',
    'RSS Aggregation',
    'CDN Distribution',
    'bun.semver Versioning',
    'bun.secrets Integration',
    'bun x Package Execution',
    'Visual Version Graphs',
    'JSON5/JSONL Config',
  ],
  packageManagers: ['npm', 'yarn', 'pnpm', 'bun'],
  bunApis: ['semver', 'secrets', 'wrapAnsi', 'JSON5', 'JSONL'],
};

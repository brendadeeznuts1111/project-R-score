/**
 * 🏭 FactoryWager Library Index
 *
 * The heart of all projects - centralized constants, types, utilities, theming, documentation, and security
 *
 * 📋 Development Standards: Locked in at `.custom-instructions.md`
 * 📖 Quick Reference: See `DEVELOPMENT-STANDARDS.md`
 *
 * @version 5.1
 * @author FactoryWager Team
 */

// Core infrastructure
export * from './core/core-types';
export * from './core/core-errors';
export * from './core/core-validation';
export * from './core/core-documentation';

// Theme and styling
export * from './theme/colors';
export * from './cli/terminal-color-256';

// Documentation
export * from './docs';

// Security (NEW v5.1) - Note: AuditEntry and VersionMetadata conflicts will be resolved by specific imports
export { VersionedSecretManager, SecurityUtils } from './security';
export type { VersionMetadata as SecurityVersionMetadata } from './security';
export type { AuditEntry as SecurityAuditEntry } from './security';

// Version tracking system
export * from './versioning/version-tracking';

// Constants and configuration
export * from './constants';
// export * from './config'; // Commented out - config module has import issues
export * from './utils';

// Re-export commonly used items
export { styled, log, FW_COLORS } from './theme/colors';
// export { FACTORYWAGER_CONFIG, PERFORMANCE_THRESHOLDS } from './config'; // Commented out - config module has import issues
export { Utils } from './utils';
export { DOC_PATTERNS, DocumentationUtils } from './docs';

export {
  VersionTracker,
} from './versioning/version-tracking';
export {
  PackageManager,
  type PackageInfo,
  type PackageDependencyGraph,
} from './package/package-manager';
export { R2Storage, type R2StorageConfig } from './r2/r2-storage-enhanced';
export {
  RSSManager,
  type RSSFeed,
  type RSSFeedItem,
  type FeedSubscription,
} from './rss/rss-manager';

// NEW: Bun Documentation Integration
export { 
  BunDocumentationIntegration,
  type BunDocumentationIndex,
  type DocumentationCategory,
  type DocumentationPage,
  type CodeExample,
  type BunMetricsExample
} from './bun-documentation-integration';

// NEW: Wiki Integration
export { 
  BunWikiIntegration,
  type WikiPage,
  type WikiCategory,
  type WikiConfig
} from './wiki/bun-wiki-integration';

// HTTP utilities with HSL health endpoints
export {
  createHealthEndpoint,
  createBunHealthEndpoint,
  type HealthCheck,
  type HealthCheckResult,
  type HealthStatus,
  type HealthEndpointConfig,
} from './http/health-endpoint';

// Profile session management
export {
  ProfileSessionUploader,
  resolveUploaderConfig,
  type ProfileType,
  type TerminalIdentity,
  type ProfileEntry,
  type SessionManifest,
  type ProfileUploaderConfig,
} from './profile';

/**
 * FactoryWager Library Info
 */
export const LIB_INFO = {
  name: 'FactoryWager',
  version: '5.1',
  description:
    'The heart of FactoryWager monorepo - centralized infrastructure with temporal security',
  author: 'FactoryWager Team',
  license: 'MIT',
  developmentStandards: 'https://example.com/development-standards',
  quickReference: 'https://example.com/quick-reference',
} as const;

/**
 * Quick access to most used exports
 */
export const FW = {
  // Theme
  colors: FW_COLORS,
  styled,
  log,

  // Utils
  utils: Utils,

  // Documentation
  docs: {
    patterns: DOC_PATTERNS,
    utils: DocumentationUtils,
  },

  // Security (v5.1)
  security: {
    versionedSecrets: VersionedSecretManager,
    utils: SecurityUtils,
  },

  // Version Tracking
  versionTracking: {
    tracker: VersionTracker,
  },

  // Package Management (NEW)
  package: {
    manager: PackageManager,
  },

  // R2 Storage Enhanced (NEW)
  r2: {
    storage: R2Storage,
  },

  // RSS Management (NEW)
  rss: {
    manager: RSSManager,
  },

  // Bun Documentation Integration (NEW)
  bunDocs: {
    integration: BunDocumentationIntegration,
  },

  // Wiki Integration (NEW)
  wiki: {
    integration: BunWikiIntegration,
  },

  // HTTP Health Endpoints (NEW)
  http: {
    createHealthEndpoint,
    createBunHealthEndpoint,
  },

  // Profile Session Management
  profile: {
    SessionUploader: ProfileSessionUploader,
    resolveConfig: resolveUploaderConfig,
  },

  // Development Standards Reference
  standards: {
    complete: '.custom-instructions.md',
    quick: 'DEVELOPMENT-STANDARDS.md',
  },
} as const;

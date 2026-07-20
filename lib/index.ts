/**
 * FactoryWager Library Index
 *
 * Shared harness: constants, types, utilities, theming, docs, security.
 *
 * Canonical monorepo docs (repo-relative):
 *   - Standards: `.custom-instructions.md` · quick: `docs/DEVELOPMENT-STANDARDS.md`
 *   - Agents: `AGENTS.md` · full: `docs/AGENTS.md` · install: `docs/UNIFIED.md`
 *   - Map: `STRUCTURE.md` · hub: `README.md`
 *   - Paths SSOT: `lib/docs/repo-docs.ts` (`CANONICAL_REPO_DOCS`)
 *
 * @version 5.1
 * @author FactoryWager Team
 */

import {
  CANONICAL_EXTERNAL,
  CANONICAL_HARNESS,
  CANONICAL_REMOTES,
  CANONICAL_REPO_DOCS,
  CANONICAL_TOOLS,
} from './docs/repo-docs';
import { DOC_PATTERNS, DocumentationUtils } from './docs';
import { createBunHealthEndpoint, createHealthEndpoint } from './http/health-endpoint';
import { BunDocumentationIntegration } from './bun-documentation-integration';
import { PackageManager } from './package/package-manager';
import { ProfileSessionUploader, resolveUploaderConfig } from './profile';
import { R2Storage } from './r2/r2-storage-enhanced';
import { RSSManager } from './rss/rss-manager';
import { VersionedSecretManager, SecurityUtils } from './security';
import { FW_COLORS, log, styled } from './theme/colors';
import { Utils } from './utils';
import { BunWikiIntegration } from './wiki/bun-wiki-integration';

// Core infrastructure
export * from './core/core-types';

// Theme and styling
export * from './theme/colors';

// Documentation
export * from './docs';
export {
  CANONICAL_REPO_DOCS,
  CANONICAL_HARNESS,
  CANONICAL_TOOLS,
  CANONICAL_DOC_ROLES,
  CANONICAL_REMOTES,
  CANONICAL_EXTERNAL,
} from './docs/repo-docs';

// Security — AuditEntry and VersionMetadata conflicts: use specific imports when needed
export { VersionedSecretManager, SecurityUtils } from './security';
export type { VersionMetadata as SecurityVersionMetadata } from './security';
export type { AuditEntry as SecurityAuditEntry } from './security';

// Constants and configuration
export * from './constants';
export * from './utils';

// Re-export commonly used items
export { styled, log, FW_COLORS } from './theme/colors';
export { Utils } from './utils';
export { DOC_PATTERNS, DocumentationUtils } from './docs';

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

// Bun Documentation Integration
export {
  BunDocumentationIntegration,
  type BunDocumentationIndex,
  type DocumentationCategory,
  type DocumentationPage,
  type CodeExample,
  type BunMetricsExample,
} from './bun-documentation-integration';

// Wiki Integration
export {
  BunWikiIntegration,
  type WikiPage,
  type WikiCategory,
  type WikiConfig,
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
 * FactoryWager Library Info — paths are repo-relative (see CANONICAL_REPO_DOCS).
 */
export const LIB_INFO = {
  name: 'FactoryWager',
  version: '5.1',
  description: 'Shared FactoryWager monorepo harness — brands, security, docs, scan, console-depth',
  author: 'FactoryWager Team',
  license: 'MIT',
  remotes: CANONICAL_REMOTES,
  docs: CANONICAL_REPO_DOCS,
  harness: CANONICAL_HARNESS,
  tools: CANONICAL_TOOLS,
  external: CANONICAL_EXTERNAL,
  /** @deprecated use `docs.standards` */
  developmentStandards: CANONICAL_REPO_DOCS.standards,
  /** @deprecated use `docs.standardsQuick` */
  quickReference: CANONICAL_REPO_DOCS.standardsQuick,
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
    canonical: CANONICAL_REPO_DOCS,
  },

  // Security (v5.1)
  security: {
    versionedSecrets: VersionedSecretManager,
    utils: SecurityUtils,
  },

  // Package Management
  package: {
    manager: PackageManager,
  },

  // R2 Storage Enhanced
  r2: {
    storage: R2Storage,
  },

  // RSS Management
  rss: {
    manager: RSSManager,
  },

  // Bun Documentation Integration
  bunDocs: {
    integration: BunDocumentationIntegration,
  },

  // Wiki Integration
  wiki: {
    integration: BunWikiIntegration,
  },

  // HTTP Health Endpoints
  http: {
    createHealthEndpoint,
    createBunHealthEndpoint,
  },

  // Profile Session Management
  profile: {
    SessionUploader: ProfileSessionUploader,
    resolveConfig: resolveUploaderConfig,
  },

  // Development standards + harness path map
  standards: CANONICAL_REPO_DOCS,
  harness: CANONICAL_HARNESS,
  tools: CANONICAL_TOOLS,
  external: CANONICAL_EXTERNAL,
} as const;

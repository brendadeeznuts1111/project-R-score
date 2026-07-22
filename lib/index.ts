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
import { PackageManager } from './package/package-manager';
import { R2Storage } from './r2/r2-storage-enhanced';
import { RSSManager } from './rss/rss-manager';
import { SecurityUtils } from './security';
import { FW_COLORS, log, styled } from './theme/colors';
import { Utils } from './utils';

// Core infrastructure
export * from './core/core-types';

// Theme and styling
export * from './theme/colors';

// Documentation path SSOT
export * from './docs';
export {
  CANONICAL_REPO_DOCS,
  CANONICAL_HARNESS,
  CANONICAL_TOOLS,
  CANONICAL_DOC_ROLES,
  CANONICAL_REMOTES,
  CANONICAL_EXTERNAL,
} from './docs/repo-docs';

// GitHub repository identity (owner/name/host/remote — not REPO_URL)
export {
  commitUrl,
  githubTokenPresence,
  htmlUrl,
  ownerName,
  parseGitRemoteUrl,
  parseOwnerName,
  resolveGitHubRepositoryRef,
  treeUrl,
  type GitHubRemoteSlot,
  type GitHubRepositoryRef,
  type GithubTokenPresence,
} from './github-repository-ref';

// Bun.Terminal (PTY) helpers
export {
  BUN_TERMINAL_OPTIONS_DOCS,
  BUN_TERMINAL_PTY_DOCS,
  DEFAULT_TERMINAL_COLS,
  DEFAULT_TERMINAL_NAME,
  DEFAULT_TERMINAL_ROWS,
  createCapturingTerminal,
  spawnWithTerminal,
  terminalOptions,
  type BunTerminal,
  type BunTerminalOptions,
  type CapturingTerminal,
  type CreateTerminalOptions,
  type SpawnWithTerminalOptions,
  type SpawnWithTerminalResult,
  type TerminalSize,
} from './terminal';

// Bun.Image metadata + TEST-003 screenshot remediation
export {
  BUN_IMAGE_DOCS,
  BUN_IMAGE_METADATA_DOCS,
  DEFAULT_IMAGE_DIGEST_ALGORITHM,
  DEFAULT_THUMB_MAX_HEIGHT,
  DEFAULT_THUMB_MAX_WIDTH,
  extractImageEvidenceMeta,
  imageEvidenceHeaders,
  imageMetaChecksPassed,
  resizeScreenshotPng,
  verifyImageEvidenceMeta,
  type ExtractImageMetaOptions,
  type ImageDigestAlgorithm,
  type ImageEvidenceMeta,
  type ImageMetaCheck,
  type ImageMetaExpectations,
  type ResizeScreenshotOptions,
} from './image-metadata';
export {
  TEST_003,
  buildScreenshotEvidenceRecord,
  remediateScreenshotCapture,
  runTest003,
  type BuildScreenshotEvidenceOptions,
  type ScreenshotEvidenceRecord,
  type Test003Remediation,
  type Test003Response,
} from './screenshot-remediation';

export { SecurityUtils } from './security';

// Constants and configuration
export * from './constants';
export * from './utils';

// Re-export commonly used items
export { styled, log, FW_COLORS } from './theme/colors';
export { Utils } from './utils';

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
  colors: FW_COLORS,
  styled,
  log,
  utils: Utils,
  docs: {
    canonical: CANONICAL_REPO_DOCS,
  },
  security: {
    utils: SecurityUtils,
  },
  package: {
    manager: PackageManager,
  },
  r2: {
    storage: R2Storage,
  },
  rss: {
    manager: RSSManager,
  },
  standards: CANONICAL_REPO_DOCS,
  harness: CANONICAL_HARNESS,
  tools: CANONICAL_TOOLS,
  external: CANONICAL_EXTERNAL,
} as const;

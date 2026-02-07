// lib/docs/documentation-index.ts — Documentation system entry point

import {
  DocumentationProvider,
  DocumentationCategory,
  DocumentationDomain,
  DocumentationFormat,
  ENTERPRISE_DOCUMENTATION_BASE_URLS,
  DOCUMENTATION_URL_MAPPINGS,
  DOMAIN_PREFERENCES,
  PROVIDER_METADATA,
  QUICK_REFERENCE_URLS,
  SIGNIFICANT_COMMITS,
} from './constants/domains';
import type {
  DocumentationURLType,
  DocumentationUserType,
  DocumentationURLConfig,
  DocumentationURLMapping,
  ProviderMetadata,
  BaseURLs,
  ProviderURLs,
} from './constants/domains';
import { ENTERPRISE_DOCUMENTATION_PATHS, IntelligentRouting } from './constants/categories';
import {
  ENTERPRISE_URL_FRAGMENTS,
  TEXT_FRAGMENT_SPEC,
  TEXT_FRAGMENT_PATTERNS,
  FRAGMENT_BUILDERS,
  FRAGMENT_PARSERS,
} from './constants/fragments';
import { EnterpriseDocumentationURLBuilder, docsURLBuilder } from './builders/url-builder';
import type {
  DocumentationURLOptions,
  TypedArrayURLOptions,
  EnterpriseAPIURLOptions,
  SyscallOptimizationURLOptions,
} from './builders/url-builder';
import { EnhancedDocumentationURLValidator } from './builders/validator';
import { EnterpriseDocumentationURLValidator as DocumentationURLValidatorNew } from './builders/validator-enhanced';
import type {
  DocumentationMetadata,
  ValidationOptions,
  ValidationResult,
  SecurityValidationResult,
} from './builders/validator-enhanced';
import {
  SyscallOptimizer,
  SyscallPlatform,
  SyscallOperation,
  PerformanceTier,
  PERFORMANCE_TIER_ORDER,
  ENTERPRISE_SYSCALL_CONSTANTS,
} from './constants/syscalls';
import { DocumentationAnalytics } from './services/analytics';
import type { AccessEvent, PopularURL, UsageMetrics } from './services/analytics';
import { DocumentationCache, documentationCache } from './services/cache';
import type { CacheEntry, CacheStats, CacheOptions } from './services/cache';
import * as LegacyCompat from './legacy-compat';

// Enhanced singleton instance with proper typing
export const docsURLBuilder = EnterpriseDocumentationURLBuilder.getInstance();

// Re-export all constants and types with enhanced naming
export {
  // Core types and enums
  DocumentationProvider,
  DocumentationCategory,
  DocumentationDomain,
  DocumentationFormat,
  DocumentationURLType,
  DocumentationUserType,
  DocumentationURLConfig,
  DocumentationURLMapping,
  ProviderMetadata,
  BaseURLs,
  ProviderURLs,

  // URL builder interfaces
  DocumentationURLOptions,
  TypedArrayURLOptions,
  EnterpriseAPIURLOptions,
  SyscallOptimizationURLOptions,

  // Validator interfaces
  DocumentationMetadata,
  ValidationOptions,
  ValidationResult,
  SecurityValidationResult,

  // Analytics interfaces
  AccessEvent,
  PopularURL,
  UsageMetrics,

  // Cache interfaces
  CacheEntry,
  CacheStats,
  CacheOptions,

  // Constants
  ENTERPRISE_DOCUMENTATION_BASE_URLS,
  DOCUMENTATION_URL_MAPPINGS,
  DOMAIN_PREFERENCES,
  PROVIDER_METADATA,
  QUICK_REFERENCE_URLS,
  ENTERPRISE_DOCUMENTATION_PATHS,
  ENTERPRISE_URL_FRAGMENTS,
  TEXT_FRAGMENT_SPEC,
  TEXT_FRAGMENT_PATTERNS,
  FRAGMENT_BUILDERS,
  FRAGMENT_PARSERS,
  SIGNIFICANT_COMMITS,

  // Syscall system
  SyscallOptimizer,
  SyscallPlatform,
  SyscallOperation,
  PerformanceTier,
  PERFORMANCE_TIER_ORDER,
  ENTERPRISE_SYSCALL_CONSTANTS,

  // Services
  DocumentationAnalytics,
  DocumentationCache,
  documentationCache,

  // Builders and validators
  EnterpriseDocumentationURLBuilder,
  EnhancedDocumentationURLValidator,
  DocumentationURLValidatorNew as DocumentationURLValidator,

  // Legacy compatibility
  LegacyCompat,
};

// Enhanced convenience functions with proper typing and error handling
export function getTypedArrayBaseURL(): string {
  return docsURLBuilder.buildTypedArrayURL({
    fragment: 'OVERVIEW',
    preferences: { includeTracking: true },
  });
}

export function getAllTypedArrayURLs(): Record<string, string> {
  return docsURLBuilder.getAllTypedArrayURLs();
}

export function getFetchAPIDocsURL(
  options?: Omit<DocumentationURLOptions, 'provider' | 'category' | 'path'>
): string {
  return docsURLBuilder.buildFetchAPIDocsURL(options || {});
}

export function getEnterpriseAPIURL(options: EnterpriseAPIURLOptions): string {
  return docsURLBuilder.buildEnterpriseAPIURL(options);
}

export function getSyscallOptimizationURL(options?: SyscallOptimizationURLOptions): string {
  return docsURLBuilder.buildSyscallOptimizationURL(options || {});
}

export function getOptimalSyscall(
  useCase: string,
  options?: {
    sourceType?: 'file' | 'socket' | 'pipe';
    destinationType?: 'file' | 'socket' | 'pipe';
    filesystem?: string;
  }
): SyscallOperation {
  return SyscallOptimizer.getOptimalSyscall(useCase, options);
}

export function getAllDocumentationURLs(): Record<string, string> {
  const builder = docsURLBuilder;

  return {
    // Core Bun documentation
    bunHome: 'https://bun.sh',
    bunDocs: 'https://bun.sh/docs',
    bunAPI: 'https://bun.sh/docs/api',
    bunRuntime: 'https://bun.sh/docs/runtime',

    // Typed array specific
    typedArrayBase: builder.buildTypedArrayURL({ fragment: 'OVERVIEW' }),
    typedArrayMethods: builder.buildTypedArrayURL({ fragment: 'METHODS' }),
    typedArrayConversion: builder.buildTypedArrayURL({ fragment: 'CONVERSION' }),

    // Fetch API
    fetchAPI: builder.buildFetchAPIDocsURL(),

    // Performance
    performanceGuide: 'https://bun.sh/docs/performance',
    syscallOptimization: builder.buildSyscallOptimizationURL(),

    // Security
    securityGuide: 'https://bun.sh/docs/security',

    // RSS Feeds
    bunRSS: 'https://bun.sh/rss.xml',
    bunBlog: 'https://bun.sh/blog',

    // Enterprise
    enterpriseAPI: builder.buildEnterpriseAPIURL('v1', '/endpoints'),
    internalWiki:
      ENTERPRISE_DOCUMENTATION_BASE_URLS[DocumentationProvider.INTERNAL_WIKI]?.BASE ||
      'https://wiki.internal.example.com',
  };
}

// Legacy convenience functions for backward compatibility
export function getBunReferenceURL(): string {
  return 'https://bun.com/reference';
}

export function getBunGuidesURL(): string {
  return 'https://bun.com/guides';
}

export function getBunRSSURL(): string {
  return 'https://bun.com/rss.xml';
}

export function getBunTechnicalRSSURL(): string {
  return 'https://bun.sh/rss.xml';
}

export function getBunReferenceWithTextFragment(): {
  nodeZlib: string;
  bunAPIReference: string;
} {
  const builder = docsURLBuilder;
  return {
    nodeZlib: builder.buildBunReferenceWithTextFragment('node:zlib'),
    bunAPIReference: builder.buildBunReferenceWithTextFragment('Bun API Reference'),
  };
}

export function getGitHubBunTypesCommitURL(commitHash: string = 'main'): string {
  return docsURLBuilder.buildBunTypesURL(commitHash);
}

export function getAllCriticalURLs(): Record<string, any> {
  const builder = docsURLBuilder;

  return {
    // Primary documentation portals
    referencePortal: {
      main: 'https://bun.com/reference',
      api: 'https://bun.com/reference/api',
      cli: 'https://bun.com/reference/cli',
      textFragments: builder.getCommonTextFragmentURLs(),
    },

    guidesPortal: {
      main: 'https://bun.com/guides',
      gettingStarted: 'https://bun.com/guides/getting-started',
      tutorials: 'https://bun.com/guides/tutorials',
      troubleshooting: 'https://bun.com/guides/troubleshooting',
    },

    // Technical documentation (bun.sh)
    technicalDocs: {
      main: 'https://bun.sh/docs',
      api: 'https://bun.sh/docs/api',
      runtime: 'https://bun.sh/docs/runtime',
      cli: 'https://bun.sh/docs/cli',
      benchmarks: 'https://bun.sh/docs/benchmarks',
    },

    // RSS feeds from both domains
    rssFeeds: {
      main: 'https://bun.com/rss.xml', // Main bun.com RSS
      technical: 'https://bun.sh/rss.xml', // Technical bun.sh RSS
      blog: 'https://bun.com/blog/rss.xml', // Blog RSS
      releases: 'https://bun.com/releases/rss.xml', // Release announcements
      security: 'https://bun.com/security/rss.xml', // Security updates
      community: 'https://bun.com/community/rss.xml', // Community updates
    },

    // GitHub resources
    github: {
      repository: 'https://github.com/oven-sh/bun',
      bunTypes: {
        latest: builder.buildBunTypesURL(),
        specificCommit: builder.getExampleCommitURL(),
        npm: 'https://www.npmjs.com/package/bun-types',
      },
      packages: builder.getGitHubPackageURLs ? builder.getGitHubPackageURLs('bun-types') : {},
    },

    // Quick reference URLs across domains
    quickReference: QUICK_REFERENCE_URLS,
  };
}

// TypeScript helper for the example commit
export const exampleCommit = {
  hash: 'main' as const,
  url: 'https://github.com/oven-sh/bun/tree/main/packages/bun-types' as const,
  shortHash: 'af76296' as const,
  date: '2023-08-15' as const, // Example date - would need actual commit date
  description: 'Example commit showing bun-types package structure',
} as const;

// Enhanced convenience functions with domain awareness
export const docs = {
  // Quick access to primary portals
  reference: getBunReferenceURL,
  guides: getBunGuidesURL,
  technical: () => 'https://bun.sh/docs',
  rss: getBunRSSURL,
  technicalRSS: getBunTechnicalRSSURL,

  // Text fragment URLs
  textFragments: getBunReferenceWithTextFragment,

  // Domain-specific access
  domains: {
    bunCom: (path?: string) => `https://bun.com${path ? `/${path.replace(/^\//, '')}` : ''}`,
    bunSh: (path?: string) => `https://bun.sh${path ? `/${path.replace(/^\//, '')}` : ''}`,
    github: (path?: string) =>
      `https://github.com/oven-sh/bun${path ? `/${path.replace(/^\//, '')}` : ''}`,
  },

  // GitHub integration
  github: {
    bunTypes: getGitHubBunTypesCommitURL,
    exampleCommit: exampleCommit.url,
    repository: 'https://github.com/oven-sh/bun',

    // Parse GitHub URLs
    parseURL: EnhancedDocumentationURLValidator.parseGitHubURL,

    // Extract commit hash
    extractCommitHash: EnhancedDocumentationURLValidator.extractCommitHash,

    // Check if URL is specific commit
    isSpecificCommit: EnhancedDocumentationURLValidator.isSpecificCommitURL,

    // Check if URL is bun-types
    isBunTypesURL: EnhancedDocumentationURLValidator.isBunTypesURL,
  },

  // Intelligent routing
  routing: {
    // Get best URL for a topic based on user type
    getBestURL: (
      topic: string,
      userType: 'developers' | 'beginners' | 'educators' | 'all_users' = 'developers'
    ) => {
      return docsURLBuilder.buildTopicURL(topic, userType);
    },

    // Get alternative URLs for a topic
    getAlternatives: (
      topic: string,
      userType: 'developers' | 'beginners' | 'educators' | 'all_users' = 'developers'
    ) => {
      return docsURLBuilder.getAlternativeURLs(topic, userType);
    },

    // Get all URLs for a topic
    getAllForTopic: (topic: string) => {
      return docsURLBuilder.getAllDocumentationForTopic(topic);
    },

    // Check if URL needs migration
    checkMigration: (url: string) => {
      return EnhancedDocumentationURLValidator.needsMigration(url);
    },
  },

  // Enhanced URL building methods
  buildTypedArray: docsURLBuilder.buildTypedArrayURL.bind(docsURLBuilder),
  buildEnterpriseAPI: docsURLBuilder.buildEnterpriseAPIURL.bind(docsURLBuilder),
  buildFetchAPI: docsURLBuilder.buildFetchAPIDocsURL.bind(docsURLBuilder),
  buildSyscallOptimization: docsURLBuilder.buildSyscallOptimizationURL.bind(docsURLBuilder),
  getAllTypedArrayURLs: docsURLBuilder.getAllTypedArrayURLs.bind(docsURLBuilder),
};

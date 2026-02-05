#!/usr/bin/env bun

/**
 * 🏢 Enhanced Enterprise Documentation Providers
 *
 * This file contains the original provider constants with enhanced GitHub
 * integration and text fragment support for critical documentation URLs.
 */

export enum DocumentationProvider {
  // Primary documentation sources
  BUN_OFFICIAL = 'bun_official',        // bun.sh/docs - Technical docs
  BUN_REFERENCE = 'bun_reference',      // bun.com/reference - API reference portal
  BUN_GUIDES = 'bun_guides',            // bun.com/guides - Tutorials & guides
  BUN_RSS = 'bun_rss',                  // RSS feeds

  // GitHub sources (critical for development)
  GITHUB_PUBLIC = 'github_public',      // oven-sh/bun public repo
  GITHUB_ENTERPRISE = 'github_enterprise', // Enterprise/internal GitHub
  GITHUB_GIST = 'github_gist',          // GitHub Gists

  // Package and type definitions
  BUN_TYPES = 'bun_types',              // TypeScript definitions
  NPM_PACKAGES = 'npm_packages',        // npm package registry

  // External references
  MDN_WEB_DOCS = 'mdn_web_docs',
  NODE_JS = 'node_js',
  WEB_STANDARDS = 'web_standards',

  // Specialized
  PERFORMANCE_GUIDES = 'performance_guides',
  SECURITY_DOCS = 'security_docs',
  API_REFERENCE = 'api_reference',
  COMMUNITY_BLOG = 'community_blog'
}

// Enhanced base URLs with GitHub and specific commit URLs
export const ENTERPRISE_DOCUMENTATION_BASE_URLS = {
  // bun.com/reference
  [DocumentationProvider.BUN_REFERENCE]: {
    BASE: 'https://bun.com',
    REFERENCE: 'https://bun.com/reference',
    API_REFERENCE: 'https://bun.com/reference/api',
    CLI_REFERENCE: 'https://bun.com/reference/cli',
    CONFIG_REFERENCE: 'https://bun.com/reference/config',
    TUTORIALS: 'https://bun.com/reference/tutorials',
    COOKBOOK: 'https://bun.com/reference/cookbook',
    CHEATSHEET: 'https://bun.com/reference/cheatsheet',
    GLOSSARY: 'https://bun.com/reference/glossary',

    // Text fragment examples
    TEXT_FRAGMENT_EXAMPLES: {
      NODE_ZLIB: 'https://bun.com/reference#:~:text=node%3Azlib',
      BUN_API_REFERENCE: 'https://bun.com/reference#:~:text=Bun%20API%20Reference'
    }
  },

  // GitHub Public Repository (oven-sh/bun)
  [DocumentationProvider.GITHUB_PUBLIC]: {
    BASE: 'https://github.com',
    REPOSITORY: 'https://github.com/oven-sh/bun',
    RELEASES: 'https://github.com/oven-sh/bun/releases',
    ISSUES: 'https://github.com/oven-sh/bun/issues',
    PULL_REQUESTS: 'https://github.com/oven-sh/bun/pulls',
    DISCUSSIONS: 'https://github.com/oven-sh/bun/discussions',
    ACTIONS: 'https://github.com/oven-sh/bun/actions',
    WIKI: 'https://github.com/oven-sh/bun/wiki',

    // Specific branches/tags/commits
    MAIN_BRANCH: 'https://github.com/oven-sh/bun/tree/main',
    CANARY: 'https://github.com/oven-sh/bun/tree/canary',

    // Package directories
    PACKAGES: {
      BUN_TYPES: 'https://github.com/oven-sh/bun/tree/main/packages/bun-types',
      BUN_TEST: 'https://github.com/oven-sh/bun/tree/main/packages/bun-test',
      BUN_FFI: 'https://github.com/oven-sh/bun/tree/main/packages/bun-ffi',
      BUN_PM: 'https://github.com/oven-sh/bun/tree/main/packages/bun-pm'
    },

    // Specific commits (with commit hash pattern)
    SPECIFIC_COMMIT: (commitHash: string, path: string = '') =>
      `https://github.com/oven-sh/bun/tree/${commitHash}${path ? `/${path}` : ''}`,

    SPECIFIC_COMMIT_BLOB: (commitHash: string, path: string = '') =>
      `https://github.com/oven-sh/bun/blob/${commitHash}${path ? `/${path}` : ''}`,

    // Raw content (for direct access to files)
    RAW_CONTENT: (commitHash: string, path: string) =>
      `https://raw.githubusercontent.com/oven-sh/bun/${commitHash}/${path}`,

    // Example commit you provided
    EXAMPLE_COMMIT_AF76296: 'https://github.com/oven-sh/bun/tree/main/packages/bun-types'
  },

  // GitHub Enterprise
  [DocumentationProvider.GITHUB_ENTERPRISE]: {
    BASE: process.env.GITHUB_ENTERPRISE_URL || 'https://github.com',
    ENTERPRISE: process.env.GITHUB_ENTERPRISE_URL || 'https://github.com/enterprise',
    API_V3: 'https://api.github.com',
    API_V4: 'https://api.github.com/graphql',
    RAW_CONTENT: 'https://raw.githubusercontent.com',
    GIST: 'https://gist.github.com'
  },

  // Bun TypeScript Definitions
  [DocumentationProvider.BUN_TYPES]: {
    BASE: 'https://bun.sh/docs/typescript',
    INSTALLATION: 'https://bun.sh/docs/typescript/installation',
    CONFIGURATION: 'https://bun.sh/docs/typescript/configuration',
    AUTOCOMPLETE: 'https://bun.sh/docs/typescript/autocomplete',

    // npm package
    NPM_PACKAGE: 'https://www.npmjs.com/package/bun-types',

    // GitHub
    GITHUB_PACKAGE: 'https://github.com/oven-sh/bun/tree/main/packages/bun-types',
    LATEST_TYPES_COMMIT: (commitHash?: string) =>
      `https://github.com/oven-sh/bun/tree/${commitHash || 'main'}/packages/bun-types`,

    // TypeScript playground with Bun types
    TYPESCRIPT_PLAYGROUND: 'https://www.typescriptlang.org/play?install-plugin=bun-types'
  },

  // NPM Packages
  [DocumentationProvider.NPM_PACKAGES]: {
    BASE: 'https://www.npmjs.com',
    BUN_TYPES: 'https://www.npmjs.com/package/bun-types',
    SEARCH: 'https://www.npmjs.com/search',
    ORGANIZATION: 'https://www.npmjs.com/org/oven'
  },

  // Rest of providers
  [DocumentationProvider.BUN_OFFICIAL]: {
    BASE: process.env.BUN_DOCS_BASE_URL || 'https://bun.sh',
    DOCS: process.env.BUN_DOCS_URL || 'https://bun.sh/docs',
    API: 'https://bun.sh/docs/api',
    RUNTIME: 'https://bun.sh/docs/runtime',
    GUIDES: 'https://bun.sh/docs/guides',
    EXAMPLES: 'https://bun.sh/docs/examples',
    RSS_FEED: 'https://bun.sh/feed.xml',
    BLOG: 'https://bun.sh/blog',
    SECURITY: 'https://bun.sh/docs/security',
    PERFORMANCE: 'https://bun.sh/docs/performance',
    CLI: 'https://bun.sh/docs/cli',
    DOWNLOADS: 'https://bun.sh/download',
    CHANGELOG: 'https://bun.sh/changelog',
    COMPARE: 'https://bun.sh/compare',
    FEED: 'https://bun.sh/feed.xml'
  },

  [DocumentationProvider.BUN_GUIDES]: {
    BASE: process.env.BUN_GUIDES_URL || 'https://bun.com',
    GUIDES: 'https://bun.com/guides',
    GETTING_STARTED: 'https://bun.com/guides/getting-started',
    TUTORIALS: 'https://bun.com/guides/tutorials',
    HOW_TO: 'https://bun.com/guides/how-to',
    BEST_PRACTICES: 'https://bun.com/guides/best-practices',
    MIGRATION: 'https://bun.com/guides/migration',
    TROUBLESHOOTING: 'https://bun.com/guides/troubleshooting',
    FAQ: 'https://bun.com/guides/faq',
    COMMUNITY: 'https://bun.com/guides/community',
    STEP_BY_STEP: 'https://bun.com/guides/step-by-step',
    VIDEO_TUTORIALS: 'https://bun.com/guides/video-tutorials',
    INTERACTIVE: 'https://bun.com/guides/interactive'
  },

  [DocumentationProvider.BUN_RSS]: {
    BASE: 'https://bun.com',
    MAIN_RSS: 'https://bun.com/rss.xml',
    BLOG_RSS: 'https://bun.com/blog/rss.xml',
    RELEASES_RSS: 'https://bun.com/releases/rss.xml',
    SECURITY_RSS: 'https://bun.com/security/rss.xml',
    COMMUNITY_RSS: 'https://bun.com/community/rss.xml',
    GUIDES_RSS: 'https://bun.com/guides/rss.xml'
  },

  [DocumentationProvider.MDN_WEB_DOCS]: {
    BASE: 'https://developer.mozilla.org',
    EN_US: 'https://developer.mozilla.org/en-US',
    API: 'https://developer.mozilla.org/api/v1',
    SEARCH: 'https://developer.mozilla.org/search'
  },

  [DocumentationProvider.NODE_JS]: {
    BASE: 'https://nodejs.org',
    DOCS: 'https://nodejs.org/docs',
    API: 'https://nodejs.org/api',
    GUIDES: 'https://nodejs.org/en/docs/guides'
  },

  [DocumentationProvider.WEB_STANDARDS]: {
    BASE: 'https://web.dev',
    METRICS: 'https://web.dev/metrics',
    OPTIMIZATION: 'https://web.dev/optimize',
    TOOLS: 'https://web.dev/tools'
  },

  [DocumentationProvider.PERFORMANCE_GUIDES]: {
    BASE: 'https://web.dev',
    METRICS: 'https://web.dev/metrics',
    OPTIMIZATION: 'https://web.dev/optimize',
    TOOLS: 'https://web.dev/tools'
  },

  [DocumentationProvider.SECURITY_DOCS]: {
    BASE: 'https://bun.com',
    SECURITY: 'https://bun.com/security',
    SECURITY_BLOG: 'https://bun.com/security/blog',
    SECURITY_RSS: 'https://bun.com/security/rss.xml',
    VULNERABILITIES: 'https://bun.com/security/vulnerabilities'
  },

  [DocumentationProvider.API_REFERENCE]: {
    BASE: 'https://bun.sh',
    API: 'https://bun.sh/docs/api',
    REFERENCE: 'https://bun.com/reference'
  },

  [DocumentationProvider.COMMUNITY_BLOG]: {
    BASE: 'https://bun.com',
    BLOG: 'https://bun.com/blog',
    COMMUNITY: 'https://bun.com/community'
  },

  [DocumentationProvider.GITHUB_GIST]: {
    BASE: 'https://gist.github.com',
    NEW: 'https://gist.github.com/new',
    DISCOVER: 'https://gist.github.com/discover'
  }
} as const;

// Special commit hashes for important releases
export const SIGNIFICANT_COMMITS = {
  // Example commit from your link
  AF762966: 'main' as const,

  // Other significant commits (would be maintained in real usage)
  LATEST_RELEASE: 'main' as const,
  CANARY_BUILD: 'canary' as const,

  // Tags for versioning
  V1_0_0: 'v1.0.0' as const,
  V1_1_0: 'v1.1.0' as const,

  // Feature branches
  TYPED_ARRAY_PERF: 'feature/typed-array-perf' as const,
  FETCH_OPTIMIZATION: 'feature/fetch-optimization' as const
} as const;

// Text fragment patterns for deep linking
export const TEXT_FRAGMENT_PATTERNS = {
  // Common patterns for bun.com/reference
  NODE_ZLIB: 'node%3Azlib',
  BUN_API_REFERENCE: 'Bun%20API%20Reference',
  TYPED_ARRAY: 'TypedArray',
  FETCH_API: 'fetch%20API',

  // Encoding helper
  encode: (text: string) => encodeURIComponent(text),
  decode: (encoded: string) => decodeURIComponent(encoded)
} as const;
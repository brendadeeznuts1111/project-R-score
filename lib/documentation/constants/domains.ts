#!/usr/bin/env bun

/**
 * 🌐 Enhanced Documentation Domain Management System
 * 
 * Comprehensive domain configuration for all Bun documentation sources
 * with proper separation between bun.sh (technical) and bun.com (reference/guides).
 * 
 * @author Enterprise Documentation Team
 * @version 2.0.0
 * @since 1.0.0
 */

export enum DocumentationDomain {
  // Primary domains
  BUN_SH = 'bun.sh',           // Main technical documentation and downloads
  BUN_COM = 'bun.com',         // Marketing, guides, reference portal
  BUN_DEV = 'bun.dev',         // Development/API focus
  BUN_IO = 'bun.io',           // Community/ecosystem
  
  // Alternative/CDN domains
  BUN_DOCS = 'docs.bun.sh',    // Documentation CDN
  BUN_CDN = 'cdn.bun.sh',      // Static assets
}

// Enterprise documentation providers with full metadata
export enum DocumentationProvider {
  // Official providers
  BUN_OFFICIAL = 'bun_official',
  BUN_TYPES = 'bun_types',
  GITHUB_ENTERPRISE = 'github_enterprise',
  INTERNAL_WIKI = 'internal_wiki',
  
  // External references
  MDN_WEB_DOCS = 'mdn_web_docs',
  NODE_JS = 'node_js',
  WEB_STANDARDS = 'web_standards',
  
  // Specialized
  PERFORMANCE_GUIDES = 'performance_guides',
  SECURITY_DOCS = 'security_docs',
  API_REFERENCE = 'api_reference',
  COMMUNITY_BLOG = 'community_blog',
  RSS_FEEDS = 'rss_feeds',
  
  // Legacy/backward compatibility (deprecated)
  /** @deprecated Use BUN_OFFICIAL instead */
  BUN_TECHNICAL = 'bun_technical',
  /** @deprecated Use BUN_OFFICIAL instead */
  BUN_API_DOCS = 'bun_api_docs',
  /** @deprecated Use BUN_OFFICIAL instead */
  BUN_RUNTIME_DOCS = 'bun_runtime_docs',
  /** @deprecated Use BUN_OFFICIAL instead */
  BUN_REFERENCE = 'bun_reference',
  /** @deprecated Use BUN_OFFICIAL instead */
  BUN_GUIDES = 'bun_guides',
  /** @deprecated Use BUN_OFFICIAL instead */
  BUN_TUTORIALS = 'bun_tutorials',
  /** @deprecated Use BUN_OFFICIAL instead */
  BUN_EXAMPLES = 'bun_examples',
  /** @deprecated Use RSS_FEEDS instead */
  BUN_RSS = 'bun_rss',
  /** @deprecated Use RSS_FEEDS instead */
  BUN_FEEDS = 'bun_feeds',
  /** @deprecated Use GITHUB_ENTERPRISE instead */
  GITHUB_PUBLIC = 'github_public',
  /** @deprecated Use COMMUNITY_BLOG instead */
  COMMUNITY_RESOURCES = 'community_resources'
}

export enum DocumentationCategory {
  // Core documentation
  INSTALLATION = 'installation',
  QUICKSTART = 'quickstart',
  API_REFERENCE = 'api_reference',
  RUNTIME_FEATURES = 'runtime_features',
  
  // Technical guides
  PERFORMANCE_OPTIMIZATION = 'performance_optimization',
  SECURITY_GUIDELINES = 'security_guidelines',
  DEPLOYMENT_GUIDES = 'deployment_guides',
  TROUBLESHOOTING = 'troubleshooting',
  
  // Development
  EXAMPLES_TUTORIALS = 'examples_tutorials',
  BEST_PRACTICES = 'best_practices',
  MIGRATION_GUIDES = 'migration_guides',
  COMMUNITY_RESOURCES = 'community_resources',
  
  // Legacy/backward compatibility (deprecated)
  /** @deprecated Use API_REFERENCE instead */
  CLI_REFERENCE = 'cli_reference',
  /** @deprecated Use PERFORMANCE_OPTIMIZATION instead */
  BENCHMARKS = 'benchmarks',
  /** @deprecated Use SECURITY_GUIDELINES instead */
  SECURITY = 'security',
  /** @deprecated Use PERFORMANCE_OPTIMIZATION instead */
  PERFORMANCE = 'performance',
  /** @deprecated Use MIGRATION_GUIDES instead */
  MIGRATION = 'migration',
  /** @deprecated Use QUICKSTART instead */
  GETTING_STARTED = 'getting_started',
  /** @deprecated Use EXAMPLES_TUTORIALS instead */
  TUTORIALS = 'tutorials',
  /** @deprecated Use COMMUNITY_RESOURCES instead */
  RSS_FEEDS = 'rss_feeds',
  /** @deprecated Use COMMUNITY_RESOURCES instead */
  BLOG_POSTS = 'blog_posts',
  /** @deprecated Use COMMUNITY_RESOURCES instead */
  RELEASE_ANNOUNCEMENTS = 'release_announcements'
}

// Documentation format types
export enum DocumentationFormat {
  HTML = 'html',
  MARKDOWN = 'markdown',
  PDF = 'pdf',
  JSON = 'json',
  RSS = 'rss',
  XML = 'xml',
  OPEN_API = 'open_api',
  GRAPHQL = 'graphql'
}

// Enhanced type definitions for better type safety
export type DocumentationURLType = 
  | 'technical_docs' 
  | 'api_reference' 
  | 'tutorials' 
  | 'rss' 
  | 'blog'
  | 'security'
  | 'performance'
  | 'unknown';

export type DocumentationUserType = 
  | 'developers' 
  | 'beginners' 
  | 'educators' 
  | 'all_users'
  | 'enterprise_admins'
  | 'devops_engineers';

export interface DocumentationURLConfig {
  BASE: string;
  DOCS?: string;
  API?: string;
  RUNTIME?: string;
  CLI?: string;
  GUIDES?: string;
  EXAMPLES?: string;
  BLOG?: string;
  SECURITY?: string;
  PERFORMANCE?: string;
  DOWNLOADS?: string;
  CHANGELOG?: string;
  COMPARE?: string;
  RSS_FEED?: string;
  FEED?: string;
  COMMUNITY?: string;
  DISCORD?: string;
  GITHUB_DISCUSSIONS?: string;
  STACK_OVERFLOW?: string;
  REDDIT?: string;
  SECURITY_BLOG?: string;
  SECURITY_RSS?: string;
  VULNERABILITIES?: string;
}

export interface DocumentationURLMapping {
  provider: DocumentationProvider;
  type: DocumentationURLType;
  audience: DocumentationUserType;
  format: string;
  domain: DocumentationDomain;
}

export interface ProviderMetadata {
  name: string;
  description: string;
  audience: DocumentationUserType[];
  features: string[];
  priority: number;
  deprecated?: boolean;
  deprecationMessage?: string;
}

export interface DomainPreferences {
  [key: string]: {
    preferredProvider: DocumentationProvider;
    fallbackProviders: DocumentationProvider[];
    userType: DocumentationUserType;
  };
}

// Enterprise base URLs with environment awareness
export const ENTERPRISE_DOCUMENTATION_BASE_URLS = {
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
    // Legacy/backward compatibility
    CLI: 'https://bun.sh/docs/cli',
    DOWNLOADS: 'https://bun.sh/download',
    CHANGELOG: 'https://bun.sh/changelog',
    COMPARE: 'https://bun.sh/compare',
    FEED: 'https://bun.sh/feed.xml'
  },
  
  [DocumentationProvider.BUN_TECHNICAL]: {
    BASE: 'https://bun.sh',
    TECHNICAL_DOCS: 'https://bun.sh/docs',
    API_REFERENCE: 'https://bun.sh/docs/api',
    RUNTIME_REFERENCE: 'https://bun.sh/docs/runtime',
    CLI_REFERENCE: 'https://bun.sh/docs/cli',
    BENCHMARKS: 'https://bun.sh/docs/benchmarks',
    PERFORMANCE: 'https://bun.sh/docs/performance',
    SECURITY: 'https://bun.sh/docs/security',
    TECHNICAL_BLOG: 'https://bun.sh/blog',
    TECHNICAL_RSS: 'https://bun.sh/feed.xml'
  },
  
  [DocumentationProvider.BUN_API_DOCS]: {
    BASE: 'https://bun.sh',
    API_OVERVIEW: 'https://bun.sh/docs/api',
    UTILS: 'https://bun.sh/docs/api/utils',
    HTTP: 'https://bun.sh/docs/api/http',
    WEBSOCKET: 'https://bun.sh/docs/api/websocket',
    STREAMS: 'https://bun.sh/docs/api/streams',
    SERVE: 'https://bun.sh/docs/api/serve',
    SQL: 'https://bun.sh/docs/api/sql',
    TEST: 'https://bun.sh/docs/api/test',
    BUILD: 'https://bun.sh/docs/api/build',
    PLUGINS: 'https://bun.sh/docs/api/plugins'
  },
  
  [DocumentationProvider.BUN_RUNTIME_DOCS]: {
    BASE: 'https://bun.sh',
    RUNTIME_OVERVIEW: 'https://bun.sh/docs/runtime',
    FILESYSTEM: 'https://bun.sh/docs/runtime/filesystem',
    PROCESS: 'https://bun.sh/docs/runtime/process',
    NETWORKING: 'https://bun.sh/docs/runtime/networking',
    BINARY_DATA: 'https://bun.sh/docs/runtime/binary-data',
    CONCURRENCY: 'https://bun.sh/docs/runtime/concurrency',
    MODULES: 'https://bun.sh/docs/runtime/modules',
    ENVIRONMENT: 'https://bun.sh/docs/runtime/environment',
    PERF_HOOKS: 'https://bun.sh/docs/runtime/perf-hooks',
    INSPECTOR: 'https://bun.sh/docs/runtime/inspector'
  },
  
  // bun.com domain (reference portal)
  [DocumentationProvider.BUN_REFERENCE]: {
    BASE: process.env.BUN_REFERENCE_URL || 'https://bun.com',
    REFERENCE: 'https://bun.com/reference',     // Main reference portal
    API_REFERENCE: 'https://bun.com/reference/api',
    CLI_REFERENCE: 'https://bun.com/reference/cli',
    CONFIG_REFERENCE: 'https://bun.com/reference/config',
    ENVIRONMENT_REFERENCE: 'https://bun.com/reference/environment',
    PACKAGES_REFERENCE: 'https://bun.com/reference/packages',
    TEMPLATES_REFERENCE: 'https://bun.com/reference/templates',
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
  
  [DocumentationProvider.BUN_GUIDES]: {
    BASE: process.env.BUN_GUIDES_URL || 'https://bun.com',
    GUIDES: 'https://bun.com/guides',           // Main guides portal
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
  
  [DocumentationProvider.BUN_TUTORIALS]: {
    BASE: 'https://bun.com',
    TUTORIALS: 'https://bun.com/tutorials',
    INTERACTIVE_TUTORIALS: 'https://bun.com/tutorials/interactive',
    VIDEO_TUTORIALS: 'https://bun.com/tutorials/video',
    WORKSHOP: 'https://bun.com/tutorials/workshop',
    LEARNING_PATH: 'https://bun.com/tutorials/learning-path'
  },
  
  [DocumentationProvider.BUN_EXAMPLES]: {
    BASE: 'https://bun.com',
    EXAMPLES: 'https://bun.com/examples',
    CODE_SAMPLES: 'https://bun.com/examples/code',
    PROJECT_TEMPLATES: 'https://bun.com/examples/templates',
    DEMO_APPS: 'https://bun.com/examples/demo-apps',
    PLAYGROUND: 'https://bun.com/examples/playground'
  },
  
  // RSS feeds from both domains
  [DocumentationProvider.BUN_RSS]: {
    BASE: 'https://bun.com',
    MAIN_RSS: 'https://bun.com/rss.xml',               // Main RSS feed
    BLOG_RSS: 'https://bun.com/blog/rss.xml',          // Blog RSS
    RELEASES_RSS: 'https://bun.com/releases/rss.xml',  // Release announcements
    SECURITY_RSS: 'https://bun.com/security/rss.xml',  // Security updates
    COMMUNITY_RSS: 'https://bun.com/community/rss.xml', // Community updates
    GUIDES_RSS: 'https://bun.com/guides/rss.xml'       // Guides RSS
  },
  
  [DocumentationProvider.BUN_FEEDS]: {
    BASE: 'https://bun.com',
    MAIN_FEED: 'https://bun.com/rss.xml',
    TECHNICAL_FEED: 'https://bun.sh/feed.xml',
    BLOG_FEED: 'https://bun.com/blog/rss.xml',
    RELEASES_FEED: 'https://bun.com/releases/rss.xml',
    SECURITY_FEED: 'https://bun.com/security/rss.xml',
    COMMUNITY_FEED: 'https://bun.com/community/rss.xml'
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

  // GitHub and external sources
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
    EXAMPLE_COMMIT_AF76296: 'https://github.com/oven-sh/bun/tree/af76296637931381e9509c204c5f1af9cc174534/packages/bun-types'
  },
  
  [DocumentationProvider.GITHUB_ENTERPRISE]: {
    BASE: process.env.GITHUB_ENTERPRISE_URL || 'https://github.com',
    ENTERPRISE: process.env.GITHUB_ENTERPRISE_URL || 'https://github.com/enterprise',
    API_V3: 'https://api.github.com',
    API_V4: 'https://api.github.com/graphql',
    RAW_CONTENT: 'https://raw.githubusercontent.com',
    GIST: 'https://gist.github.com'
  },
  
  [DocumentationProvider.INTERNAL_WIKI]: {
    BASE: process.env.INTERNAL_WIKI_URL || 'https://wiki.internal.example.com',
    API: process.env.INTERNAL_WIKI_API_URL || 'https://wiki-api.internal.example.com',
    SEARCH: '/search',
    CATEGORIES: '/categories'
  },
  
  [DocumentationProvider.MDN_WEB_DOCS]: {
    BASE: 'https://developer.mozilla.org',
    EN_US: 'https://developer.mozilla.org/en-US',
    API: 'https://developer.mozilla.org/api/v1',
    SEARCH: 'https://developer.mozilla.org/search'
  },
  
  [DocumentationProvider.PERFORMANCE_GUIDES]: {
    BASE: 'https://web.dev',
    METRICS: 'https://web.dev/metrics',
    OPTIMIZATION: 'https://web.dev/optimize',
    TOOLS: 'https://web.dev/tools'
  },
  
  // Legacy/backward compatibility providers (deprecated)
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
  
  // Additional providers (backward compatibility)
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
  
  [DocumentationProvider.RSS_FEEDS]: {
    BASE: 'https://bun.sh',
    MAIN_FEED: 'https://bun.sh/feed.xml',
    BLOG_FEED: 'https://bun.com/blog/rss.xml'
  },
  
  // Legacy providers (deprecated - kept for backward compatibility)
  [DocumentationProvider.COMMUNITY_RESOURCES]: {
    BASE: 'https://bun.com',
    COMMUNITY: 'https://bun.com/community',
    DISCORD: 'https://bun.com/discord',
    GITHUB_DISCUSSIONS: 'https://github.com/oven-sh/bun/discussions',
    STACK_OVERFLOW: 'https://stackoverflow.com/questions/tagged/bun',
    REDDIT: 'https://reddit.com/r/bun'
  },
  
  [DocumentationProvider.BUN_TECHNICAL]: {
    BASE: 'https://bun.sh',
    TECHNICAL_DOCS: 'https://bun.sh/docs',
    API_REFERENCE: 'https://bun.sh/docs/api',
    RUNTIME_REFERENCE: 'https://bun.sh/docs/runtime',
    CLI_REFERENCE: 'https://bun.sh/docs/cli',
    BENCHMARKS: 'https://bun.sh/docs/benchmarks',
    PERFORMANCE: 'https://bun.sh/docs/performance',
    SECURITY: 'https://bun.sh/docs/security',
    TECHNICAL_BLOG: 'https://bun.sh/blog',
    TECHNICAL_RSS: 'https://bun.sh/feed.xml'
  },
  
  [DocumentationProvider.BUN_API_DOCS]: {
    BASE: 'https://bun.sh',
    API_OVERVIEW: 'https://bun.sh/docs/api',
    UTILS: 'https://bun.sh/docs/api/utils',
    HTTP: 'https://bun.sh/docs/api/http',
    WEBSOCKET: 'https://bun.sh/docs/api/websocket',
    STREAMS: 'https://bun.sh/docs/api/streams',
    SERVE: 'https://bun.sh/docs/api/serve',
    SQL: 'https://bun.sh/docs/api/sql',
    TEST: 'https://bun.sh/docs/api/test',
    BUILD: 'https://bun.sh/docs/api/build',
    PLUGINS: 'https://bun.sh/docs/api/plugins'
  },
  
  [DocumentationProvider.BUN_RUNTIME_DOCS]: {
    BASE: 'https://bun.sh',
    RUNTIME_OVERVIEW: 'https://bun.sh/docs/runtime',
    FILESYSTEM: 'https://bun.sh/docs/runtime/filesystem',
    PROCESS: 'https://bun.sh/docs/runtime/process',
    NETWORKING: 'https://bun.sh/docs/runtime/networking',
    BINARY_DATA: 'https://bun.sh/docs/runtime/binary-data',
    CONCURRENCY: 'https://bun.sh/docs/runtime/concurrency',
    MODULES: 'https://bun.sh/docs/runtime/modules',
    ENVIRONMENT: 'https://bun.sh/docs/runtime/environment',
    PERF_HOOKS: 'https://bun.sh/docs/runtime/perf-hooks',
    INSPECTOR: 'https://bun.sh/docs/runtime/inspector'
  },
  
  [DocumentationProvider.BUN_REFERENCE]: {
    BASE: process.env.BUN_REFERENCE_URL || 'https://bun.com',
    REFERENCE: 'https://bun.com/reference',
    API_REFERENCE: 'https://bun.com/reference/api',
    CLI_REFERENCE: 'https://bun.com/reference/cli',
    CONFIG_REFERENCE: 'https://bun.com/reference/config',
    ENVIRONMENT_REFERENCE: 'https://bun.com/reference/environment',
    PACKAGES_REFERENCE: 'https://bun.com/reference/packages',
    TEMPLATES_REFERENCE: 'https://bun.com/reference/templates',
    TUTORIALS: 'https://bun.com/reference/tutorials',
    COOKBOOK: 'https://bun.com/reference/cookbook',
    CHEATSHEET: 'https://bun.com/reference/cheatsheet',
    GLOSSARY: 'https://bun.com/reference/glossary'
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
  
  [DocumentationProvider.BUN_TUTORIALS]: {
    BASE: 'https://bun.com',
    TUTORIALS: 'https://bun.com/tutorials',
    INTERACTIVE_TUTORIALS: 'https://bun.com/tutorials/interactive',
    VIDEO_TUTORIALS: 'https://bun.com/tutorials/video',
    WORKSHOP: 'https://bun.com/tutorials/workshop',
    LEARNING_PATH: 'https://bun.com/tutorials/learning-path'
  },
  
  [DocumentationProvider.BUN_EXAMPLES]: {
    BASE: 'https://bun.com',
    EXAMPLES: 'https://bun.com/examples',
    CODE_SAMPLES: 'https://bun.com/examples/code',
    PROJECT_TEMPLATES: 'https://bun.com/examples/templates',
    DEMO_APPS: 'https://bun.com/examples/demo-apps',
    PLAYGROUND: 'https://bun.com/examples/playground'
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
  
  [DocumentationProvider.BUN_FEEDS]: {
    BASE: 'https://bun.com',
    MAIN_FEED: 'https://bun.com/rss.xml',
    TECHNICAL_FEED: 'https://bun.sh/feed.xml',
    BLOG_FEED: 'https://bun.com/blog/rss.xml',
    RELEASES_FEED: 'https://bun.com/releases/rss.xml',
    SECURITY_FEED: 'https://bun.com/security/rss.xml',
    COMMUNITY_FEED: 'https://bun.com/community/rss.xml'
  },
  
  [DocumentationProvider.GITHUB_PUBLIC]: {
    BASE: 'https://github.com',
    REPOSITORY: 'https://github.com/oven-sh/bun',
    RELEASES: 'https://github.com/oven-sh/bun/releases',
    ISSUES: 'https://github.com/oven-sh/bun/issues',
    PULL_REQUESTS: 'https://github.com/oven-sh/bun/pulls',
    DISCUSSIONS: 'https://github.com/oven-sh/bun/discussions',
    ACTIONS: 'https://github.com/oven-sh/bun/actions',
    WIKI: 'https://github.com/oven-sh/bun/wiki',
    MAIN_BRANCH: 'https://github.com/oven-sh/bun/tree/main',
    CANARY: 'https://github.com/oven-sh/bun/tree/canary',
    EXAMPLE_COMMIT_AF76296: 'https://github.com/oven-sh/bun/tree/af76296637931381e9509c204c5f1af9cc174534/packages/bun-types'
  }
} as const;

// Type-safe access to base URLs
export type BaseURLs = typeof ENTERPRISE_DOCUMENTATION_BASE_URLS;
export type ProviderURLs<T extends DocumentationProvider> = BaseURLs[T];

// URL categorization and mapping for intelligent routing
export const DOCUMENTATION_URL_MAPPINGS = {
  // bun.sh domain mappings
  'bun.sh/docs': {
    provider: DocumentationProvider.BUN_OFFICIAL,
    type: 'technical_docs',
    audience: 'developers',
    format: 'markdown/html',
    domain: DocumentationDomain.BUN_SH
  },
  
  'bun.sh/docs/api': {
    provider: DocumentationProvider.BUN_API_DOCS,
    type: 'api_reference',
    audience: 'developers',
    format: 'technical_reference',
    domain: DocumentationDomain.BUN_SH
  },
  
  'bun.sh/docs/runtime': {
    provider: DocumentationProvider.BUN_RUNTIME_DOCS,
    type: 'runtime_reference',
    audience: 'developers',
    format: 'technical_reference',
    domain: DocumentationDomain.BUN_SH
  },
  
  'bun.sh/docs/cli': {
    provider: DocumentationProvider.BUN_OFFICIAL,
    type: 'cli_reference',
    audience: 'developers',
    format: 'technical_reference',
    domain: DocumentationDomain.BUN_SH
  },
  
  'bun.sh/feed.xml': {
    provider: DocumentationProvider.BUN_RSS,
    type: 'technical_rss',
    audience: 'developers',
    format: 'xml',
    domain: DocumentationDomain.BUN_SH
  },
  
  // bun.com domain mappings
  'bun.com/reference': {
    provider: DocumentationProvider.BUN_REFERENCE,
    type: 'api_reference',
    audience: 'developers',
    format: 'interactive_docs',
    domain: DocumentationDomain.BUN_COM
  },
  
  'bun.com/guides': {
    provider: DocumentationProvider.BUN_GUIDES,
    type: 'tutorials',
    audience: 'all_users',
    format: 'guides',
    domain: DocumentationDomain.BUN_COM
  },
  
  'bun.com/tutorials': {
    provider: DocumentationProvider.BUN_TUTORIALS,
    type: 'interactive_tutorials',
    audience: 'all_users',
    format: 'interactive',
    domain: DocumentationDomain.BUN_COM
  },
  
  'bun.com/examples': {
    provider: DocumentationProvider.BUN_EXAMPLES,
    type: 'code_examples',
    audience: 'all_users',
    format: 'examples',
    domain: DocumentationDomain.BUN_COM
  },
  
  'bun.com/rss.xml': {
    provider: DocumentationProvider.BUN_RSS,
    type: 'main_rss',
    audience: 'all_users',
    format: 'xml',
    domain: DocumentationDomain.BUN_COM
  },
  
  'bun.com/blog/rss.xml': {
    provider: DocumentationProvider.BUN_RSS,
    type: 'blog_rss',
    audience: 'all_users',
    format: 'xml',
    domain: DocumentationDomain.BUN_COM
  },
  
  // GitHub mappings
  'github.com/oven-sh/bun': {
    provider: DocumentationProvider.GITHUB_PUBLIC,
    type: 'source_code',
    audience: 'developers',
    format: 'git_repository',
    domain: DocumentationDomain.BUN_SH // Associated with bun.sh
  }
} as const;

// Quick reference mapping for common URLs across domains
export const QUICK_REFERENCE_URLS = {
  // Typed array documentation across all domains
  TYPED_ARRAY: {
    TECHNICAL: 'https://bun.sh/docs/runtime/binary-data#typedarray',           // Technical docs
    REFERENCE: 'https://bun.com/reference/api/binary-data#typedarray',        // Interactive reference
    GUIDE: 'https://bun.com/guides/working-with-binary-data',                 // User guide
    EXAMPLE: 'https://bun.com/examples/typedarray-usage',                     // Code examples
    GITHUB: 'https://github.com/oven-sh/bun/tree/main/src/js/builtins/builtins-array.cc' // Source code
  },
  
  // Fetch API documentation
  FETCH_API: {
    TECHNICAL: 'https://bun.sh/docs/runtime/networking/fetch',                 // Technical docs
    REFERENCE: 'https://bun.com/reference/api/fetch',                          // Interactive reference
    GUIDE: 'https://bun.com/guides/making-http-requests',                      // User guide
    EXAMPLE: 'https://bun.com/examples/fetch-usage',                          // Code examples
    TUTORIAL: 'https://bun.com/tutorials/http-requests'                        // Interactive tutorial
  },
  
  // RSS feeds from different sources
  RSS_FEEDS: {
    MAIN: 'https://bun.com/rss.xml',                                           // Main bun.com RSS
    TECHNICAL: 'https://bun.sh/feed.xml',                                      // Technical bun.sh RSS
    BLOG: 'https://bun.com/blog/rss.xml',                                      // Blog RSS
    RELEASES: 'https://bun.com/releases/rss.xml',                              // Release announcements
    SECURITY: 'https://bun.com/security/rss.xml',                              // Security updates
    COMMUNITY: 'https://bun.com/community/rss.xml'                             // Community updates
  },
  
  // Getting started across domains
  GETTING_STARTED: {
    QUICKSTART: 'https://bun.sh/docs/quickstart',                              // Technical quickstart
    GUIDE: 'https://bun.com/guides/getting-started',                           // User-friendly guide
    TUTORIAL: 'https://bun.com/tutorials/beginner',                            // Interactive tutorial
    EXAMPLE: 'https://bun.com/examples/hello-world',                          // First example
    VIDEO: 'https://bun.com/tutorials/video/getting-started'                   // Video tutorial
  },
  
  // API reference comparison
  API_REFERENCE: {
    TECHNICAL: 'https://bun.sh/docs/api',                                      // Technical API docs
    INTERACTIVE: 'https://bun.com/reference/api',                              // Interactive reference
    CHEATSHEET: 'https://bun.com/reference/cheatsheet',                        // Quick reference
    COOKBOOK: 'https://bun.com/reference/cookbook',                            // Recipe-style examples
    GLOSSARY: 'https://bun.com/reference/glossary'                             // Terminology
  },
  
  // CLI documentation
  CLI_REFERENCE: {
    TECHNICAL: 'https://bun.sh/docs/cli',                                      // Technical CLI docs
    REFERENCE: 'https://bun.com/reference/cli',                                // Interactive CLI reference
    GUIDE: 'https://bun.com/guides/cli-usage',                                // CLI usage guide
    EXAMPLES: 'https://bun.com/examples/cli-scripts',                         // CLI script examples
    CHEATSHEET: 'https://bun.com/reference/cli#cheatsheet'                     // CLI cheatsheet
  },
  
  // Installation guides
  INSTALLATION: {
    TECHNICAL: 'https://bun.sh/docs/installation',                             // Technical installation
    GUIDE: 'https://bun.com/guides/getting-started#installation',            // User-friendly installation
    PLATFORM_SPECIFIC: {
      WINDOWS: 'https://bun.sh/docs/installation/windows',
      MACOS: 'https://bun.sh/docs/installation/macos',
      LINUX: 'https://bun.sh/docs/installation/linux',
      DOCKER: 'https://bun.sh/docs/installation/docker'
    }
  },
  
  // Performance resources
  PERFORMANCE: {
    TECHNICAL: 'https://bun.sh/docs/performance',                              // Technical performance docs
    BENCHMARKS: 'https://bun.sh/docs/benchmarks',                              // Benchmark results
    GUIDE: 'https://bun.com/guides/performance-optimization',                 // Performance guide
    TOOLS: 'https://bun.com/examples/performance-testing',                     // Performance testing examples
    COMPARISON: 'https://bun.sh/compare'                                       // vs Node.js, Deno, etc.
  }
} as const;

// Special commit hashes for important releases
export const SIGNIFICANT_COMMITS = {
  // Example commit from your link
  AF762966: 'af76296637931381e9509c204c5f1af9cc174534' as const,

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

// Domain preferences for different user types
export const DOMAIN_PREFERENCES = {
  developers: {
    primary: DocumentationDomain.BUN_SH,      // Technical documentation first
    secondary: DocumentationDomain.BUN_COM,   // Reference portal second
    fallback: DocumentationProvider.GITHUB_PUBLIC
  },
  
  beginners: {
    primary: DocumentationDomain.BUN_COM,     // User-friendly guides first
    secondary: DocumentationDomain.BUN_SH,    // Technical docs second
    fallback: DocumentationProvider.BUN_TUTORIALS
  },
  
  educators: {
    primary: DocumentationDomain.BUN_COM,     // Teaching materials
    secondary: DocumentationProvider.BUN_EXAMPLES,
    fallback: DocumentationProvider.BUN_TUTORIALS
  },
  
  researchers: {
    primary: DocumentationDomain.BUN_SH,      // Technical deep dives
    secondary: DocumentationProvider.GITHUB_PUBLIC,
    fallback: DocumentationProvider.PERFORMANCE_GUIDES
  },
  
  enterprise: {
    primary: DocumentationDomain.BUN_COM,     // Enterprise-focused content
    secondary: DocumentationDomain.BUN_SH,
    fallback: DocumentationProvider.SECURITY_DOCS
  }
} as const;

// Provider metadata with domain information
export const PROVIDER_METADATA = {
  [DocumentationProvider.BUN_OFFICIAL]: {
    name: 'Bun Official Documentation',
    description: 'Technical documentation and API reference',
    domain: DocumentationDomain.BUN_SH,
    supportsTextFragments: false,
    supportsSearch: true,
    lastUpdated: '2024-01-01',
    version: '1.0.0',
    audience: 'developers',
    contentType: 'technical_docs'
  },
  
  [DocumentationProvider.BUN_REFERENCE]: {
    name: 'Bun Reference Portal',
    description: 'Interactive API reference and documentation portal',
    domain: DocumentationDomain.BUN_COM,
    supportsTextFragments: true,
    supportsSearch: true,
    lastUpdated: '2024-01-01',
    version: '1.0.0',
    audience: 'developers',
    contentType: 'interactive_docs'
  },
  
  [DocumentationProvider.BUN_GUIDES]: {
    name: 'Bun Guides',
    description: 'Tutorials, getting started guides, and best practices',
    domain: DocumentationDomain.BUN_COM,
    supportsTextFragments: false,
    supportsSearch: true,
    lastUpdated: '2024-01-01',
    version: '1.0.0',
    audience: 'all_users',
    contentType: 'tutorials'
  },
  
  [DocumentationProvider.BUN_TUTORIALS]: {
    name: 'Bun Interactive Tutorials',
    description: 'Hands-on interactive tutorials and workshops',
    domain: DocumentationDomain.BUN_COM,
    supportsTextFragments: false,
    supportsSearch: true,
    lastUpdated: '2024-01-01',
    version: '1.0.0',
    audience: 'all_users',
    contentType: 'interactive_tutorials'
  },
  
  [DocumentationProvider.BUN_EXAMPLES]: {
    name: 'Bun Code Examples',
    description: 'Practical code examples and project templates',
    domain: DocumentationDomain.BUN_COM,
    supportsTextFragments: false,
    supportsSearch: true,
    lastUpdated: '2024-01-01',
    version: '1.0.0',
    audience: 'all_users',
    contentType: 'code_examples'
  },
  
  [DocumentationProvider.BUN_RSS]: {
    name: 'Bun RSS Feeds',
    description: 'RSS feeds for updates, releases, and community content',
    domain: DocumentationDomain.BUN_COM,
    supportsTextFragments: false,
    supportsSearch: false,
    lastUpdated: '2024-01-01',
    version: '1.0.0',
    audience: 'all_users',
    contentType: 'rss_feeds'
  },
  
  [DocumentationProvider.GITHUB_PUBLIC]: {
    name: 'GitHub Repository',
    description: 'Source code, issues, and development resources',
    domain: DocumentationDomain.BUN_SH,
    supportsTextFragments: false,
    supportsSearch: true,
    lastUpdated: '2024-01-01',
    version: '1.0.0',
    audience: 'developers',
    contentType: 'source_code'
  }
} as const;

/**
 * Enterprise Documentation Constants and URL Management
 * 
 * Centralized, enterprise-grade documentation URL management with
 * type safety, validation, and comprehensive coverage of all
 * enterprise documentation resources.
 * 
 * @version 1.0.0
 * @author Enterprise Platform Team
 */

import { validateOrThrow, StringValidators } from './core-validation';
import { createValidationError, EnterpriseErrorCode } from './core-errors';
import {
  ENTERPRISE_DOCUMENTATION_BASE_URLS as _CANONICAL_URLS,
  SIGNIFICANT_COMMITS as _CANONICAL_COMMITS,
  TEXT_FRAGMENT_PATTERNS as _CANONICAL_FRAGMENTS,
} from './documentation/constants/domains';

// ============================================================================
// DOCUMENTATION PROVIDERS ENUM
// ============================================================================

/**
 * Enhanced documentation providers with comprehensive coverage
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

/**
 * Documentation categories
 */
export enum DocumentationCategory {
  API_REFERENCE = 'api_reference',
  RUNTIME_FEATURES = 'runtime_features',
  CLI_TOOLS = 'cli_tools',
  PERFORMANCE_OPTIMIZATION = 'performance_optimization',
  SECURITY_GUIDELINES = 'security_guidelines',
  DEPLOYMENT_GUIDES = 'deployment_guides',
  TROUBLESHOOTING = 'troubleshooting',
  EXAMPLES_TUTORIALS = 'examples_tutorials',
  INSTALLATION = 'installation',
  QUICKSTART = 'quickstart',
  BEST_PRACTICES = 'best_practices',
  MIGRATION_GUIDES = 'migration_guides',
  PACKAGE_MANAGER = 'package_manager',
  BUNDLER = 'bundler',
  COMMUNITY_RESOURCES = 'community_resources'
}

/**
 * Documentation formats
 */
export enum DocumentationFormat {
  HTML = 'html',
  MARKDOWN = 'markdown',
  PDF = 'pdf',
  JSON = 'json',
  RSS = 'rss',
  XML = 'xml'
}

/**
 * Documentation metadata interface
 */
export interface DocumentationMetadata {
  readonly title: string;
  readonly description: string;
  readonly lastUpdated: string;
  readonly mainSections: string[];
  readonly rssFeed?: string;
}

// Re-export canonical enterprise constants from domains.ts (single source of truth)
export const ENTERPRISE_DOCUMENTATION_BASE_URLS = _CANONICAL_URLS;
export const SIGNIFICANT_COMMITS = _CANONICAL_COMMITS;
export const TEXT_FRAGMENT_PATTERNS = _CANONICAL_FRAGMENTS;

// ============================================================================
// DOCUMENTATION PATH CONSTANTS
// ============================================================================

/**
 * Enterprise documentation path constants
 */
export const ENTERPRISE_DOCUMENTATION_PATHS = {
  // Bun-specific paths (aligned with actual Bun documentation structure)
  BUN_CORE: {
    [DocumentationCategory.INSTALLATION]: {
      MAIN: '/docs/install',
      WINDOWS: '/docs/install/windows',
      MACOS: '/docs/install/macos',
      LINUX: '/docs/install/linux',
      DOCKER: '/docs/install/docker',
      CI_CD: '/docs/install/ci-cd'
    },
    
    [DocumentationCategory.QUICKSTART]: {
      MAIN: '/docs/quickstart',
      TYPESCRIPT: '/docs/quickstart/typescript',
      JAVASCRIPT: '/docs/quickstart/javascript',
      REACT: '/docs/quickstart/react',
      NEXT_JS: '/docs/quickstart/nextjs',
      API_SERVER: '/docs/quickstart/api'
    },
    
    [DocumentationCategory.API_REFERENCE]: {
      OVERVIEW: '/docs/api',
      UTILS: '/docs/api/utils',
      HTTP: '/docs/api/http',
      WEBSOCKET: '/docs/api/websocket',
      STREAMS: '/docs/api/streams',
      SERVE: '/docs/api/serve',
      SQL: '/docs/api/sql',
      TEST: '/docs/api/test',
      BUILD: '/docs/api/build',
      PLUGINS: '/docs/api/plugins'
    },
    
    [DocumentationCategory.RUNTIME_FEATURES]: {
      OVERVIEW: '/docs/runtime',
      FILESYSTEM: '/docs/runtime/filesystem',
      PROCESS: '/docs/runtime/process',
      NETWORKING: '/docs/runtime/networking',
      BINARY_DATA: '/docs/runtime/binary-data',
      CONCURRENCY: '/docs/runtime/concurrency',
      MODULES: '/docs/runtime/modules',
      ENVIRONMENT: '/docs/runtime/environment',
      PERF_HOOKS: '/docs/runtime/perf-hooks',
      INSPECTOR: '/docs/runtime/inspector'
    },
    
    [DocumentationCategory.PACKAGE_MANAGER]: {
      OVERVIEW: '/docs/pm',
      // Core Commands
      INSTALL: '/docs/pm/cli/install',
      ADD: '/docs/pm/cli/add',
      REMOVE: '/docs/pm/cli/remove',
      UPDATE: '/docs/pm/cli/update',
      BUNX: '/docs/pm/bunx',
      // Publishing & Analysis
      PUBLISH: '/docs/pm/cli/publish',
      OUTDATED: '/docs/pm/cli/outdated',
      WHY: '/docs/pm/cli/why',
      AUDIT: '/docs/pm/cli/audit',
      INFO: '/docs/pm/cli/info',
      // Workspace Management
      WORKSPACES: '/docs/pm/workspaces',
      CATALOGS: '/docs/pm/catalogs',
      LINK: '/docs/pm/cli/link',
      PM: '/docs/pm/cli/pm',
      // Advanced Configuration
      PATCH: '/docs/pm/cli/patch',
      FILTER: '/docs/pm/cli/filter',
      GLOBAL_CACHE: '/docs/pm/global-cache',
      ISOLATED_INSTALLS: '/docs/pm/isolated-installs',
      LOCKFILE: '/docs/pm/lockfile',
      LIFECYCLE_SCRIPTS: '/docs/pm/lifecycle-scripts',
      SCOPES_AND_REGISTRIES: '/docs/pm/scopes-and-registries',
      OVERRIDES_AND_RESOLUTIONS: '/docs/pm/overrides-and-resolutions',
      SECURITY_SCANNER_API: '/docs/pm/security-scanner-api',
      NPMRC_SUPPORT: '/docs/pm/npmrc-support',
      CONFIGURATION: '/docs/pm/configuration'
    },
    
    [DocumentationCategory.BUNDLER]: {
      OVERVIEW: '/docs/bundler',
      BUILD: '/docs/bundler/cli/build',
      SERVE: '/docs/bundler/cli/serve',
      WATCH: '/docs/bundler/cli/watch',
      CONFIGURATION: '/docs/bundler/configuration',
      ASSETS: '/docs/bundler/assets',
      PLUGINS: '/docs/bundler/plugins',
      FRAMEWORKS: '/docs/bundler/frameworks',
      OPTIMIZATION: '/docs/bundler/optimization',
      TARGETS: '/docs/bundler/targets',
      OUTPUT: '/docs/bundler/output'
    }
  },
  
  // Guides and tutorials
  GUIDES: {
    [DocumentationCategory.EXAMPLES_TUTORIALS]: {
      READ_FILE: '/guides/read-file',
      WRITE_FILE: '/guides/write-file',
      HTTP_SERVER: '/guides/http-server',
      WEBSOCKET_SERVER: '/guides/websocket-server',
      DATABASE: '/guides/database',
      AUTHENTICATION: '/guides/authentication',
      DEPLOYMENT: '/guides/deployment',
      TESTING: '/guides/testing',
      DEBUGGING: '/guides/debugging'
    },
    
    [DocumentationCategory.BEST_PRACTICES]: {
      PERFORMANCE: '/guides/performance',
      SECURITY: '/guides/security',
      ERROR_HANDLING: '/guides/error-handling',
      LOGGING: '/guides/logging',
      MONITORING: '/guides/monitoring',
      SCALING: '/guides/scaling'
    },
    
    [DocumentationCategory.MIGRATION_GUIDES]: {
      FROM_NODE: '/guides/migrate-from-node',
      FROM_DENO: '/guides/migrate-from-deno',
      FROM_WEBPACK: '/guides/migrate-from-webpack',
      FROM_VITE: '/guides/migrate-from-vite',
      VERSION_UPGRADE: '/guides/version-upgrade'
    }
  },
  
  // bun.com/reference paths (reference portal)
  BUN_REFERENCE: {
    [DocumentationCategory.API_REFERENCE]: {
      OVERVIEW: '/reference',
      API: '/reference/api',
      CLI: '/reference/cli',
      CONFIG: '/reference/config',
      ENVIRONMENT: '/reference/environment',
      PACKAGES: '/reference/packages',
      TEMPLATES: '/reference/templates'
    },
    
    [DocumentationCategory.EXAMPLES_TUTORIALS]: {
      TUTORIALS: '/reference/tutorials',
      COOKBOOK: '/reference/cookbook',
      SAMPLES: '/reference/samples',
      DEMOS: '/reference/demos'
    },
    
    [DocumentationCategory.BEST_PRACTICES]: {
      CHEATSHEET: '/reference/cheatsheet',
      PATTERNS: '/reference/patterns',
      ANTI_PATTERNS: '/reference/anti-patterns',
      OPTIMIZATIONS: '/reference/optimizations'
    }
  },
  
  // bun.com/guides paths (guides portal)
  BUN_GUIDES: {
    [DocumentationCategory.QUICKSTART]: {
      MAIN: '/guides',
      GETTING_STARTED: '/guides/getting-started',
      FIRST_APP: '/guides/first-app',
      HELLO_WORLD: '/guides/hello-world'
    },
    
    [DocumentationCategory.EXAMPLES_TUTORIALS]: {
      TUTORIALS: '/guides/tutorials',
      STEP_BY_STEP: '/guides/step-by-step',
      VIDEO_TUTORIALS: '/guides/video-tutorials',
      INTERACTIVE: '/guides/interactive'
    },
    
    [DocumentationCategory.MIGRATION_GUIDES]: {
      FROM_NODE: '/guides/migrate-from-node',
      FROM_DENO: '/guides/migrate-from-deno',
      FROM_WEBPACK: '/guides/migrate-from-webpack',
      FROM_VITE: '/guides/migrate-from-vite'
    },
    
    [DocumentationCategory.TROUBLESHOOTING]: {
      COMMON_ISSUES: '/guides/troubleshooting/common-issues',
      DEBUGGING: '/guides/troubleshooting/debugging',
      PERFORMANCE: '/guides/troubleshooting/performance',
      ERRORS: '/guides/troubleshooting/errors',
      FAQ: '/guides/faq'
    }
  },
  
  // RSS feed paths
  BUN_RSS: {
    [DocumentationCategory.COMMUNITY_RESOURCES]: {
      MAIN_RSS: '/rss.xml',
      BLOG_RSS: '/blog/rss.xml',
      RELEASES_RSS: '/releases/rss.xml',
      SECURITY_RSS: '/security/rss.xml',
      COMMUNITY_RSS: '/community/rss.xml'
    }
  },
  
  // Internal enterprise paths
  ENTERPRISE: {
    [DocumentationCategory.SECURITY_GUIDELINES]: {
      OVERVIEW: '/security',
      AUTHENTICATION: '/security/authentication',
      AUTHORIZATION: '/security/authorization',
      ENCRYPTION: '/security/encryption',
      AUDITING: '/security/auditing',
      COMPLIANCE: '/security/compliance'
    },
    
    [DocumentationCategory.DEPLOYMENT_GUIDES]: {
      DOCKER: '/deployment/docker',
      KUBERNETES: '/deployment/kubernetes',
      AWS: '/deployment/aws',
      AZURE: '/deployment/azure',
      GCP: '/deployment/gcp',
      CI_CD: '/deployment/ci-cd'
    }
  }
} as const;

/**
 * Utility type for path access
 */
export type DocumentationPaths = typeof ENTERPRISE_DOCUMENTATION_PATHS;
export type CategoryPaths<C extends DocumentationCategory> = {
  [K in keyof DocumentationPaths]: DocumentationPaths[K][C] extends object 
    ? DocumentationPaths[K][C] 
    : never;
};

// URL FRAGMENT CONSTANTS
// ============================================================================

/**
 * Enhanced fragment constants with GitHub integration
 */
export const ENTERPRISE_URL_FRAGMENTS = {
  // TypedArray and Binary Data fragments
  TYPED_ARRAY: {
    OVERVIEW: 'typedarray' as const,
    METHODS: 'methods' as const,
    CONVERSION: 'conversion' as const,
    PERFORMANCE: 'performance' as const,
    EXAMPLES: 'examples' as const,
    BUFFER: 'buffer' as const,
    DATA_VIEW: 'dataview' as const,
    SHARED_ARRAY_BUFFER: 'sharedarraybuffer' as const
  },
  
  // Networking fragments
  NETWORKING: {
    FETCH: 'fetch' as const,
    WEBSOCKET: 'websocket' as const,
    HTTP: 'http' as const,
    TCP: 'tcp' as const,
    UNIX_SOCKETS: 'unix-sockets' as const,
    TLS: 'tls' as const,
    PROXY: 'proxy' as const,
    DNS: 'dns' as const
  },
  
  // Performance optimization fragments
  PERFORMANCE: {
    ZERO_COPY: 'zero-copy' as const,
    MULTIPLEXING: 'multiplexing' as const,
    CONNECTION_POOLING: 'connection-pooling' as const,
    CACHING: 'caching' as const,
    COMPRESSION: 'compression' as const,
    STREAMING: 'streaming' as const,
    LAZY_LOADING: 'lazy-loading' as const
  },
  
  // Security fragments
  SECURITY: {
    AUTHENTICATION: 'authentication' as const,
    AUTHORIZATION: 'authorization' as const,
    ENCRYPTION: 'encryption' as const,
    SANITIZATION: 'sanitization' as const,
    VALIDATION: 'validation' as const,
    CORS: 'cors' as const,
    CSP: 'csp' as const,
    RATE_LIMITING: 'rate-limiting' as const
  },
  
  // API-specific fragments
  API: {
    QUERY_PARAMS: 'query-params' as const,
    PATH_PARAMS: 'path-params' as const,
    REQUEST_BODY: 'request-body' as const,
    RESPONSE_FORMAT: 'response-format' as const,
    ERROR_HANDLING: 'error-handling' as const,
    PAGINATION: 'pagination' as const,
    SORTING: 'sorting' as const,
    FILTERING: 'filtering' as const
  },
  
  // CLI-specific fragments
  CLI: {
    USAGE: 'cli-usage' as const,
    OPTIONS: 'options' as const,
    EXAMPLES: 'examples' as const,
    CONFIGURATION: 'configuration' as const,
    ENVIRONMENT_VARIABLES: 'environment-variables' as const,
    EXIT_CODES: 'exit-codes' as const,
    TROUBLESHOOTING: 'troubleshooting' as const
  },
  
  // Reference portal specific fragments
  REFERENCE: {
    BUN_API_REFERENCE: 'bun-api-reference' as const,
    NODE_COMPATIBILITY: 'node-compatibility' as const,
    NODE_ZLIB: 'node:zlib' as const,
    NODE_FS: 'node:fs' as const,
    NODE_PATH: 'node:path' as const,
    NODE_URL: 'node:url' as const,
    NODE_CRYPTO: 'node:crypto' as const,
    NODE_EVENTS: 'node:events' as const,
    NODE_STREAM: 'node:stream' as const,
    NODE_UTIL: 'node:util' as const,
    TYPES: 'types' as const,
    INTERFACES: 'interfaces' as const,
    CLASSES: 'classes' as const,
    FUNCTIONS: 'functions' as const,
    CONSTANTS: 'constants' as const
  },
  
  // GitHub-specific fragments
  GITHUB: {
    TREE: 'tree' as const,
    BLOB: 'blob' as const,
    COMMIT: 'commit' as const,
    ISSUE: 'issue' as const,
    PULL: 'pull' as const,
    BRANCH: 'branch' as const,
    TAG: 'tag' as const,
    RELEASE: 'release' as const
  },
  
  // TypeScript and package fragments
  TYPESCRIPT: {
    INTERFACE: 'interface' as const,
    TYPE: 'type' as const,
    NAMESPACE: 'namespace' as const,
    ENUM: 'enum' as const,
    FUNCTION: 'function' as const,
    CLASS: 'class' as const
  },
  
  // Text fragments (for bun.com/reference)
  TEXT_FRAGMENTS: {
    NODE_ZLIB: 'node:zlib' as const,
    BUN_API_REFERENCE: 'Bun API Reference' as const,
    TYPED_ARRAY_METHODS: 'TypedArray methods' as const,
    FETCH_TIMEOUT: 'fetch timeout' as const,
    WEBSOCKET_EXAMPLE: 'WebSocket example' as const
  }
} as const;

/**
 * Type for fragment access
 */
export type URLFragments = typeof ENTERPRISE_URL_FRAGMENTS;
export type FragmentType = keyof URLFragments;
export type FragmentValue<T extends FragmentType> = keyof URLFragments[T];

// ============================================================================
// GITHUB URL PATTERNS
// ============================================================================

/**
 * GitHub-specific URL patterns for parsing and validation
 */
export const GITHUB_URL_PATTERNS = {
  // Pattern: /:owner/:repo/tree/:commit/:path
  TREE_VIEW: /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)(?:\/(.*))?$/,
  
  // Pattern: /:owner/:repo/blob/:commit/:path
  BLOB_VIEW: /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)(?:\/(.*))?$/,
  
  // Pattern: /:owner/:repo/commit/:hash
  COMMIT_VIEW: /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/commit\/([^/]+)$/,
  
  // Pattern: /:owner/:repo/issues/:number
  ISSUE_VIEW: /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)$/,
  
  // Pattern: /:owner/:repo/pull/:number
  PULL_REQUEST_VIEW: /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)$/
} as const;

/**
 * GitHub URL parser interface
 */
export interface GitHubURLParseResult {
  owner: string;
  repo: string;
  type: 'tree' | 'blob' | 'commit' | 'issue' | 'pull';
  ref?: string;
  path?: string;
  number?: string;
}

// ============================================================================
// ENHANCED FRAGMENT METADATA
// ============================================================================

/**
 * Fragment metadata with descriptions and related links
 */
export const FRAGMENT_METADATA: Record<string, {
  description: string;
  relatedFragments: string[];
  examples: string[];
  seeAlso?: string[];
}> = {
  'typedarray': {
    description: 'JavaScript TypedArray objects for handling binary data',
    relatedFragments: ['methods', 'conversion', 'buffer', 'dataview'],
    examples: ['Uint8Array', 'Int32Array', 'Float64Array'],
    seeAlso: ['ArrayBuffer', 'DataView', 'SharedArrayBuffer']
  },
  
  'zero-copy': {
    description: 'Techniques to avoid copying data between memory spaces',
    relatedFragments: ['streaming', 'performance'],
    examples: ['sendfile syscall', 'memory-mapped files'],
    seeAlso: ['multiplexing', 'connection-pooling']
  },
  
  'fetch': {
    description: 'Web Fetch API for making HTTP requests',
    relatedFragments: ['http', 'tls', 'proxy'],
    examples: ['GET requests', 'POST with JSON', 'file uploads'],
    seeAlso: ['websocket', 'streaming']
  },
  
  'cli-usage': {
    description: 'Command-line interface usage examples and syntax',
    relatedFragments: ['options', 'examples', 'configuration'],
    examples: ['bun install', 'bun run', 'bun build'],
    seeAlso: ['environment-variables', 'exit-codes']
  },
  
  'bun-api-reference': {
    description: 'Complete Bun API reference documentation',
    relatedFragments: ['node-compatibility', 'types', 'interfaces'],
    examples: ['Bun.serve', 'Bun.file', 'Bun.write', 'Bun.spawn'],
    seeAlso: ['node:fs', 'node:crypto', 'node:zlib']
  },
  
  'node:zlib': {
    description: 'Node.js zlib module compatibility in Bun',
    relatedFragments: ['node-compatibility', 'bun-api-reference'],
    examples: ['zlib.createGzip', 'zlib.createGunzip', 'zlib.gzipSync'],
    seeAlso: ['node:fs', 'node:crypto', 'node:stream']
  },
  
  'node-compatibility': {
    description: 'Node.js built-in modules compatibility layer',
    relatedFragments: ['node:fs', 'node:path', 'node:crypto', 'node:zlib'],
    examples: ['import fs from "node:fs"', 'import path from "node:path"'],
    seeAlso: ['bun-api-reference', 'types']
  },
  
  // GitHub-specific fragments
  'tree': {
    description: 'GitHub tree view - directory listing for a specific commit/branch',
    relatedFragments: ['blob', 'commit', 'branch'],
    examples: ['https://github.com/oven-sh/bun/tree/main', 'https://github.com/oven-sh/bun/tree/v1.3.8/packages/bun-types'],
    seeAlso: ['blob', 'commit']
  },
  
  'blob': {
    description: 'GitHub blob view - file content viewer with syntax highlighting',
    relatedFragments: ['tree', 'commit', 'line-numbers'],
    examples: ['https://github.com/oven-sh/bun/blob/main/README.md', 'https://github.com/oven-sh/bun/blob/main/packages/bun-types/index.d.ts'],
    seeAlso: ['tree', 'raw-content']
  },
  
  'commit': {
    description: 'GitHub commit view - detailed commit information and file changes',
    relatedFragments: ['tree', 'blob', 'diff'],
    examples: ['https://github.com/oven-sh/bun/commit/main'],
    seeAlso: ['tree', 'pull', 'branch']
  },
  
  'issue': {
    description: 'GitHub issue tracker - bug reports and feature requests',
    relatedFragments: ['pull', 'label', 'milestone'],
    examples: ['https://github.com/oven-sh/bun/issues/1234'],
    seeAlso: ['pull', 'discussions']
  },
  
  'pull': {
    description: 'GitHub pull request - code review and merge discussions',
    relatedFragments: ['commit', 'issue', 'review'],
    examples: ['https://github.com/oven-sh/bun/pull/5678'],
    seeAlso: ['commit', 'issue']
  },
  
  'branch': {
    description: 'Git branch - parallel line of development',
    relatedFragments: ['tree', 'commit', 'tag'],
    examples: ['main', 'develop', 'feature/typed-array-perf'],
    seeAlso: ['tree', 'tag']
  },
  
  'tag': {
    description: 'Git tag - version marker and release point',
    relatedFragments: ['branch', 'release', 'commit'],
    examples: ['v1.3.8', 'v1.3.7', 'latest'],
    seeAlso: ['release', 'branch']
  },
  
  'release': {
    description: 'GitHub release - versioned distribution with assets',
    relatedFragments: ['tag', 'download', 'changelog'],
    examples: ['https://github.com/oven-sh/bun/releases/tag/v1.3.8'],
    seeAlso: ['tag', 'download']
  },
  
  // TypeScript-specific fragments
  'interface': {
    description: 'TypeScript interface - type contract definition',
    relatedFragments: ['type', 'class', 'namespace'],
    examples: ['interface BunFile { size: number; }', 'interface ServerOptions { port?: number; }'],
    seeAlso: ['type', 'class']
  },
  
  'type': {
    description: 'TypeScript type alias - named type definition',
    relatedFragments: ['interface', 'enum', 'union'],
    examples: ['type FilePath = string;', 'type HTTPMethod = "GET" | "POST" | "PUT" | "DELETE";'],
    seeAlso: ['interface', 'enum']
  },
  
  'namespace': {
    description: 'TypeScript namespace - logical grouping of related code',
    relatedFragments: ['module', 'interface', 'function'],
    examples: ['namespace Bun { export const version: string; }'],
    seeAlso: ['module', 'interface']
  },
  
  'enum': {
    description: 'TypeScript enum - set of named constants',
    relatedFragments: ['type', 'union', 'const'],
    examples: ['enum LogLevel { DEBUG, INFO, WARN, ERROR; }'],
    seeAlso: ['type', 'const']
  },
  
  'function': {
    description: 'TypeScript function - reusable code block with parameters',
    relatedFragments: ['method', 'arrow', 'async'],
    examples: ['function serve(options: ServerOptions): Server', 'const readFile = (path: string): Promise<Buffer>'],
    seeAlso: ['method', 'class']
  },
  
  'class': {
    description: 'TypeScript class - blueprint for object creation with methods',
    relatedFragments: ['interface', 'constructor', 'method'],
    examples: ['class BunServer { constructor(options: ServerOptions) {} }'],
    seeAlso: ['interface', 'constructor']
  },
  
  // Enhanced text fragments
  'typedarray-methods': {
    description: 'TypedArray method reference and usage examples',
    relatedFragments: ['typedarray', 'buffer', 'dataview'],
    examples: ['Int8Array.from()', 'Float32Array.prototype.slice()', 'DataView.prototype.getInt32()'],
    seeAlso: ['typedarray', 'buffer']
  },
  
  'fetch-timeout': {
    description: 'Fetch API timeout configuration and error handling',
    relatedFragments: ['fetch', 'http', 'error-handling'],
    examples: ['fetch(url, { signal: AbortSignal.timeout(5000) })', 'fetch with timeout handling'],
    seeAlso: ['fetch', 'http']
  },
  
  'websocket-example': {
    description: 'WebSocket implementation examples and best practices',
    relatedFragments: ['websocket', 'server', 'real-time'],
    examples: ['new WebSocket("ws://example.com:3000")', 'WebSocket server with Bun.serve'],
    seeAlso: ['websocket', 'server']
  }
} as const;

// ============================================================================
// DOCUMENTATION URL BUILDERS
// ============================================================================

/**
 * Enterprise documentation URL builder
 */
export class EnterpriseDocumentationURLBuilder {
  private static instance: EnterpriseDocumentationURLBuilder;
  private readonly baseUrlCache: Map<DocumentationProvider, string> = new Map();

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): EnterpriseDocumentationURLBuilder {
    if (!EnterpriseDocumentationURLBuilder.instance) {
      EnterpriseDocumentationURLBuilder.instance = new EnterpriseDocumentationURLBuilder();
    }
    return EnterpriseDocumentationURLBuilder.instance;
  }

  /**
   * Build complete documentation URL
   */
  public buildURL(
    provider: DocumentationProvider,
    category: DocumentationCategory,
    path: string,
    fragment?: string
  ): string {
    // Validate inputs
    validateOrThrow(provider, StringValidators.isNonEmpty, 'Provider cannot be empty');
    validateOrThrow(category, StringValidators.isNonEmpty, 'Category cannot be empty');
    validateOrThrow(path, StringValidators.isNonEmpty, 'Path cannot be empty');

    const baseConfig = ENTERPRISE_DOCUMENTATION_BASE_URLS[provider];
    if (!baseConfig) {
      throw createValidationError(
        EnterpriseErrorCode.VALIDATION_INPUT_INVALID,
        `Unsupported documentation provider: ${provider}`,
        'provider',
        provider
      );
    }

    // Select appropriate base URL based on category
    let baseUrl: string;
    switch (category) {
      case DocumentationCategory.API_REFERENCE:
        baseUrl = baseConfig.API || baseConfig.DOCS;
        break;
      case DocumentationCategory.RUNTIME_FEATURES:
        baseUrl = baseConfig.RUNTIME || baseConfig.DOCS;
        break;
      case DocumentationCategory.PACKAGE_MANAGER:
        baseUrl = baseConfig.DOCS;
        break;
      case DocumentationCategory.BUNDLER:
        baseUrl = baseConfig.DOCS;
        break;
      case DocumentationCategory.COMMUNITY_RESOURCES:
        baseUrl = baseConfig.BASE;
        break;
      case DocumentationCategory.CLI_TOOLS:
        baseUrl = baseConfig.CLI || baseConfig.DOCS;
        break;
      case DocumentationCategory.PERFORMANCE_OPTIMIZATION:
        baseUrl = baseConfig.GUIDES || baseConfig.DOCS;
        break;
      case DocumentationCategory.SECURITY_GUIDELINES:
        baseUrl = baseConfig.SECURITY || baseConfig.GUIDES || baseConfig.DOCS;
        break;
      default:
        baseUrl = baseConfig.DOCS;
    }

    // Build complete URL
    const url = new URL(path.startsWith('/') ? path.slice(1) : path, baseUrl);
    
    if (fragment) {
      url.hash = fragment.startsWith('#') ? fragment : `#${fragment}`;
    }

    return url.toString();
  }

  /**
   * Build Bun documentation URL with alternative domain support
   */
  public buildBunURLWithDomain(
    path: string, 
    fragment?: string, 
    useAlternativeDomain: boolean = false
  ): string {
    const baseConfig = ENTERPRISE_DOCUMENTATION_BASE_URLS[DocumentationProvider.BUN_OFFICIAL];
    const baseUrl = useAlternativeDomain 
      ? baseConfig.ALTERNATIVE_DOCS || baseConfig.DOCS
      : baseConfig.DOCS;
    
    const url = new URL(path.startsWith('/') ? path.slice(1) : path, baseUrl);
    if (fragment) {
      url.hash = fragment.startsWith('#') ? fragment : `#${fragment}`;
    }
    return url.toString();
  }

  /**
   * Build package manager documentation URL with domain support
   */
  public buildPackageManagerURLWithDomain(
    path: string, 
    fragment?: string, 
    useAlternativeDomain: boolean = false
  ): string {
    const baseConfig = ENTERPRISE_DOCUMENTATION_BASE_URLS[DocumentationProvider.BUN_OFFICIAL];
    const baseUrl = useAlternativeDomain 
      ? baseConfig.ALTERNATIVE_DOCS || baseConfig.DOCS
      : baseConfig.DOCS;
    
    const url = new URL(path.startsWith('/') ? path.slice(1) : path, baseUrl);
    if (fragment) {
      url.hash = fragment.startsWith('#') ? fragment : `#${fragment}`;
    }
    return url.toString();
  }

  /**
   * Build Bun documentation URL
   */
  public buildBunURL(path: string, fragment?: string): string {
    return this.buildURL(
      DocumentationProvider.BUN_OFFICIAL,
      DocumentationCategory.API_REFERENCE,
      path,
      fragment
    );
  }

  /**
   * Build enterprise API documentation URL
   */
  public buildEnterpriseAPIURL(path: string, fragment?: string): string {
    return this.buildURL(
      DocumentationProvider.API_REFERENCE,
      DocumentationCategory.API_REFERENCE,
      path,
      fragment
    );
  }

  /**
   * Build performance documentation URL
   */
  public buildPerformanceURL(path: string, fragment?: string): string {
    return this.buildURL(
      DocumentationProvider.PERFORMANCE_GUIDES,
      DocumentationCategory.PERFORMANCE_OPTIMIZATION,
      path,
      fragment
    );
  }

  /**
   * Build GitHub Enterprise URL
   */
  public buildGitHubEnterpriseURL(path: string, fragment?: string): string {
    return this.buildURL(
      DocumentationProvider.GITHUB_ENTERPRISE,
      DocumentationCategory.API_REFERENCE,
      path,
      fragment
    );
  }

  /**
   * Build GitHub raw content URL
   */
  public buildGitHubRawURL(owner: string, repo: string, path: string, ref?: string): string {
    const baseUrl = ENTERPRISE_DOCUMENTATION_BASE_URLS[DocumentationProvider.GITHUB_ENTERPRISE].RAW_CONTENT;
    const refPart = ref || 'main';
    return `${baseUrl}/${owner}/${repo}/${refPart}/${path}`;
  }

  /**
   * Build GitHub Gist URL
   */
  public buildGitHubGistURL(gistId: string): string {
    const baseUrl = ENTERPRISE_DOCUMENTATION_BASE_URLS[DocumentationProvider.GITHUB_ENTERPRISE].GIST;
    return `${baseUrl}/${gistId}`;
  }

  /**
   * Build Bun RSS feed URL
   */
  public buildBunRSSFeedURL(): string {
    return ENTERPRISE_DOCUMENTATION_BASE_URLS[DocumentationProvider.BUN_OFFICIAL].RSS_FEED;
  }

  /**
   * Build internal wiki documentation URL
   */
  public buildInternalWikiURL(path: string, fragment?: string): string {
    return this.buildURL(
      DocumentationProvider.INTERNAL_WIKI,
      DocumentationCategory.API_REFERENCE,
      path,
      fragment
    );
  }

  /**
   * Build MDN Web Docs URL
   */
  public buildMDNWebDocsURL(path: string, fragment?: string): string {
    return this.buildURL(
      DocumentationProvider.MDN_WEB_DOCS,
      DocumentationCategory.API_REFERENCE,
      path,
      fragment
    );
  }

  /**
   * Build MDN English-specific URL
   */
  public buildMDNEnglishURL(path: string, fragment?: string): string {
    const baseUrl = ENTERPRISE_DOCUMENTATION_BASE_URLS[DocumentationProvider.MDN_WEB_DOCS].EN_US;
    const url = new URL(path.startsWith('/') ? path.slice(1) : path, baseUrl);
    if (fragment) url.hash = fragment.startsWith('#') ? fragment : `#${fragment}`;
    return url.toString();
  }

  /**
   * Build MDN Search URL
   */
  public buildMDNSearchURL(query: string): string {
    const baseUrl = ENTERPRISE_DOCUMENTATION_BASE_URLS[DocumentationProvider.MDN_WEB_DOCS].SEARCH;
    const url = new URL(baseUrl);
    url.searchParams.set('q', query);
    return url.toString();
  }

  /**
   * Build Web.dev Performance URL
   */
  public buildWebDevURL(section: 'metrics' | 'optimization' | 'tools', path?: string, fragment?: string): string {
    const baseUrl = ENTERPRISE_DOCUMENTATION_BASE_URLS[DocumentationProvider.PERFORMANCE_GUIDES][section.toUpperCase() as keyof typeof ENTERPRISE_DOCUMENTATION_BASE_URLS[typeof DocumentationProvider.PERFORMANCE_GUIDES]];
    const fullPath = path ? `${baseUrl}/${path}` : baseUrl;
    const url = new URL(fullPath);
    if (fragment) url.hash = fragment.startsWith('#') ? fragment : `#${fragment}`;
    return url.toString();
  }

  /**
   * Build enterprise wiki documentation URL
   */
  public buildEnterpriseWikiURL(path: string, fragment?: string): string {
    return this.buildURL(
      DocumentationProvider.ENTERPRISE_WIKI,
      DocumentationCategory.API_REFERENCE,
      path,
      fragment
    );
  }

  /**
   * Get documentation metadata for a provider
   */
  public getDocumentationMetadata(provider: DocumentationProvider): DocumentationMetadata | null {
    const config = ENTERPRISE_DOCUMENTATION_BASE_URLS[provider];
    return (config as any)?.metadata || null;
  }

  /**
   * Get Bun documentation metadata
   */
  public getBunDocumentationMetadata(): DocumentationMetadata | null {
    return this.getDocumentationMetadata(DocumentationProvider.BUN_OFFICIAL);
  }

  /**
   * Build URL with fragment from constants
   */
  public buildURLWithFragment<T extends FragmentType>(
    provider: DocumentationProvider,
    category: DocumentationCategory,
    path: string,
    fragmentType: T,
    fragmentValue: FragmentValue<T>
  ): string {
    const fragment = ENTERPRISE_URL_FRAGMENTS[fragmentType][fragmentValue];
    return this.buildURL(provider, category, path, fragment);
  }

  /**
   * Get fragment metadata
   */
  public getFragmentMetadata(fragment: string): {
    description: string;
    relatedFragments: string[];
    examples: string[];
    seeAlso?: string[];
  } | null {
    return FRAGMENT_METADATA[fragment] || null;
  }

  /**
   * Get all fragments for a category
   */
  public getFragmentsByCategory<T extends FragmentType>(category: T): Record<string, string> {
    return ENTERPRISE_URL_FRAGMENTS[category] as Record<string, string>;
  }

  /**
   * Find related fragments
   */
  public getRelatedFragments(fragment: string): string[] {
    const metadata = FRAGMENT_METADATA[fragment];
    return metadata?.relatedFragments || [];
  }

  /**
   * Build URL using structured path constants
   */
  public buildStructuredURL<T extends keyof DocumentationPaths>(
    provider: DocumentationProvider,
    pathSection: T,
    category: DocumentationCategory,
    pathKey: keyof DocumentationPaths[T][DocumentationCategory]
  ): string {
    const pathConfig = ENTERPRISE_DOCUMENTATION_PATHS[pathSection];
    const categoryPaths = pathConfig[category];
    
    if (!categoryPaths || typeof categoryPaths !== 'object') {
      throw createValidationError(
        EnterpriseErrorCode.VALIDATION_INPUT_INVALID,
        `Category ${category} not found in path section ${String(pathSection)}`,
        'category',
        category
      );
    }
    
    const path = (categoryPaths as any)[pathKey];
    if (!path) {
      throw createValidationError(
        EnterpriseErrorCode.VALIDATION_INPUT_INVALID,
        `Path key ${String(pathKey)} not found in category ${category}`,
        'pathKey',
        pathKey
      );
    }
    
    return this.buildURL(provider, category, path);
  }

  /**
   * Get all paths for a category
   */
  public getPathsByCategory(category: DocumentationCategory): Record<string, string> {
    const result: Record<string, string> = {};
    
    Object.entries(ENTERPRISE_DOCUMENTATION_PATHS).forEach(([sectionName, section]) => {
      const categoryPaths = section[category];
      if (categoryPaths && typeof categoryPaths === 'object') {
        Object.entries(categoryPaths).forEach(([pathName, path]) => {
          result[`${sectionName}_${pathName}`] = path as string;
        });
      }
    });
    
    return result;
  }

  /**
   * Get Bun core paths
   */
  public getBunCorePaths(): typeof ENTERPRISE_DOCUMENTATION_PATHS.BUN_CORE {
    return ENTERPRISE_DOCUMENTATION_PATHS.BUN_CORE;
  }

  /**
   * Get guide paths
   */
  public getGuidePaths(): typeof ENTERPRISE_DOCUMENTATION_PATHS.GUIDES {
    return ENTERPRISE_DOCUMENTATION_PATHS.GUIDES;
  }

  /**
   * Get enterprise paths
   */
  public getEnterprisePaths(): typeof ENTERPRISE_DOCUMENTATION_PATHS.ENTERPRISE {
    return ENTERPRISE_DOCUMENTATION_PATHS.ENTERPRISE;
  }

  /**
   * Get package manager core command paths
   */
  public getPackageManagerCoreCommands(): Pick<typeof ENTERPRISE_DOCUMENTATION_PATHS.BUN_CORE[DocumentationCategory.PACKAGE_MANAGER], 
    'INSTALL' | 'ADD' | 'REMOVE' | 'UPDATE' | 'BUNX'> {
    const pmPaths = ENTERPRISE_DOCUMENTATION_PATHS.BUN_CORE[DocumentationCategory.PACKAGE_MANAGER];
    return {
      INSTALL: pmPaths.INSTALL,
      ADD: pmPaths.ADD,
      REMOVE: pmPaths.REMOVE,
      UPDATE: pmPaths.UPDATE,
      BUNX: pmPaths.BUNX
    };
  }

  /**
   * Get package manager publishing & analysis paths
   */
  public getPackageManagerPublishingAnalysis(): Pick<typeof ENTERPRISE_DOCUMENTATION_PATHS.BUN_CORE[DocumentationCategory.PACKAGE_MANAGER],
    'PUBLISH' | 'OUTDATED' | 'WHY' | 'AUDIT' | 'INFO'> {
    const pmPaths = ENTERPRISE_DOCUMENTATION_PATHS.BUN_CORE[DocumentationCategory.PACKAGE_MANAGER];
    return {
      PUBLISH: pmPaths.PUBLISH,
      OUTDATED: pmPaths.OUTDATED,
      WHY: pmPaths.WHY,
      AUDIT: pmPaths.AUDIT,
      INFO: pmPaths.INFO
    };
  }

  /**
   * Get package manager workspace management paths
   */
  public getPackageManagerWorkspaceManagement(): Pick<typeof ENTERPRISE_DOCUMENTATION_PATHS.BUN_CORE[DocumentationCategory.PACKAGE_MANAGER],
    'WORKSPACES' | 'CATALOGS' | 'LINK' | 'PM'> {
    const pmPaths = ENTERPRISE_DOCUMENTATION_PATHS.BUN_CORE[DocumentationCategory.PACKAGE_MANAGER];
    return {
      WORKSPACES: pmPaths.WORKSPACES,
      CATALOGS: pmPaths.CATALOGS,
      LINK: pmPaths.LINK,
      PM: pmPaths.PM
    };
  }

  /**
   * Get package manager advanced configuration paths
   */
  public getPackageManagerAdvancedConfiguration(): Pick<typeof ENTERPRISE_DOCUMENTATION_PATHS.BUN_CORE[DocumentationCategory.PACKAGE_MANAGER],
    'PATCH' | 'FILTER' | 'GLOBAL_CACHE' | 'ISOLATED_INSTALLS' | 'LOCKFILE' | 'LIFECYCLE_SCRIPTS' | 'SCOPES_AND_REGISTRIES' | 'OVERRIDES_AND_RESOLUTIONS' | 'SECURITY_SCANNER_API' | 'NPMRC_SUPPORT'> {
    const pmPaths = ENTERPRISE_DOCUMENTATION_PATHS.BUN_CORE[DocumentationCategory.PACKAGE_MANAGER];
    return {
      PATCH: pmPaths.PATCH,
      FILTER: pmPaths.FILTER,
      GLOBAL_CACHE: pmPaths.GLOBAL_CACHE,
      ISOLATED_INSTALLS: pmPaths.ISOLATED_INSTALLS,
      LOCKFILE: pmPaths.LOCKFILE,
      LIFECYCLE_SCRIPTS: pmPaths.LIFECYCLE_SCRIPTS,
      SCOPES_AND_REGISTRIES: pmPaths.SCOPES_AND_REGISTRIES,
      OVERRIDES_AND_RESOLUTIONS: pmPaths.OVERRIDES_AND_RESOLUTIONS,
      SECURITY_SCANNER_API: pmPaths.SECURITY_SCANNER_API,
      NPMRC_SUPPORT: pmPaths.NPMRC_SUPPORT
    };
  }

  /**
   * Build security documentation URL
   */
  public buildSecurityURL(path: string, fragment?: string): string {
    return this.buildURL(
      DocumentationProvider.SECURITY_DOCS,
      DocumentationCategory.SECURITY_GUIDELINES,
      path,
      fragment
    );
  }

  /**
   * Build package manager documentation URL
   */
  public buildPackageManagerURL(path: string, fragment?: string): string {
    return this.buildURL(
      DocumentationProvider.BUN_OFFICIAL,
      DocumentationCategory.PACKAGE_MANAGER,
      path,
      fragment
    );
  }

  /**
   * Build bundler documentation URL
   */
  public buildBundlerURL(path: string, fragment?: string): string {
    return this.buildURL(
      DocumentationProvider.BUN_OFFICIAL,
      DocumentationCategory.BUNDLER,
      path,
      fragment
    );
  }

  /**
   * Build bun.com reference portal URL
   */
  public buildReferencePortalURL(
    section: string,
    fragment?: string,
    options?: { language?: string }
  ): string {
    const baseConfig = ENTERPRISE_DOCUMENTATION_BASE_URLS[DocumentationProvider.BUN_REFERENCE];
    const baseUrl = baseConfig.REFERENCE;
    
    const url = new URL(section, baseUrl);
    if (fragment) {
      url.hash = fragment.startsWith('#') ? fragment : `#${fragment}`;
    }
    
    // Add language preference
    if (options?.language) {
      url.searchParams.set('lang', options.language);
    }
    
    return url.toString();
  }

  /**
   * Build bun.com guides URL
   */
  public buildGuideURL(
    guideName: string,
    fragment?: string,
    options?: { step?: number; interactive?: boolean }
  ): string {
    const baseConfig = ENTERPRISE_DOCUMENTATION_BASE_URLS[DocumentationProvider.BUN_GUIDES];
    const baseUrl = baseConfig.GUIDES;
    
    const url = new URL(guideName, baseUrl);
    if (fragment) {
      url.hash = fragment.startsWith('#') ? fragment : `#${fragment}`;
    }
    
    // Add step parameter
    if (options?.step) {
      url.searchParams.set('step', String(options.step));
    }
    
    // Add interactive mode
    if (options?.interactive) {
      url.searchParams.set('interactive', 'true');
    }
    
    return url.toString();
  }

  /**
   * Build RSS feed URL
   */
  public buildRSSFeedURL(
    feedType: 'main' | 'blog' | 'releases' | 'technical' | 'security' | 'community'
  ): string {
    const baseConfig = ENTERPRISE_DOCUMENTATION_BASE_URLS[DocumentationProvider.BUN_RSS];
    
    const feedMap = {
      main: baseConfig.MAIN_RSS,
      blog: baseConfig.BLOG_RSS,
      releases: baseConfig.RELEASES_RSS,
      technical: baseConfig.TECHNICAL_RSS,
      security: baseConfig.SECURITY_RSS,
      community: baseConfig.COMMUNITY_RSS
    };
    
    return feedMap[feedType];
  }

  /**
   * Build GitHub repository URL with comprehensive pattern support
   */
  public buildGitHubRepositoryURL(
    owner: string,
    repo: string,
    path?: string,
    ref?: string,
    options?: { 
      viewType?: 'tree' | 'blob' | 'commits' | 'issues' | 'pulls' | 'actions' | 'projects' | 'wiki' | 'security' | 'insights' | 'settings' | 'releases' | 'packages' | 'discussions';
      lineNumbers?: { start: number; end?: number };
      pathType?: 'file' | 'dir' | 'submodule' | 'symlink';
      action?: 'new' | 'edit' | 'delete' | 'find' | 'compare';
      branch?: string;
      tag?: string;
    }
  ): string {
    const baseConfig = ENTERPRISE_DOCUMENTATION_BASE_URLS[DocumentationProvider.GITHUB_ENTERPRISE];
    const baseUrl = baseConfig.BASE;
    
    let urlPath = `/${owner}/${repo}`;
    
    // Handle special view types that come before ref
    if (options?.viewType && ['issues', 'pulls', 'actions', 'projects', 'wiki', 'security', 'insights', 'settings', 'releases', 'packages', 'discussions'].includes(options.viewType)) {
      urlPath += `/${options.viewType}`;
    } else if (options?.viewType) {
      // Standard view types (tree, blob, commits)
      urlPath += `/${options.viewType}`;
    }
    
    // Add reference (branch, tag, or commit)
    if (options?.branch) {
      urlPath += `/${options.branch}`;
    } else if (options?.tag) {
      urlPath += `/${options.tag}`;
    } else if (ref) {
      urlPath += `/${ref}`;
    } else if (options?.viewType && ['tree', 'blob', 'commits'].includes(options.viewType)) {
      // Default to main for tree/blob/commits if no ref specified
      urlPath += '/main';
    }
    
    // Add action-specific paths
    if (options?.action) {
      if (options.action === 'new') {
        urlPath += '/new';
      } else if (options.action === 'find') {
        urlPath += '/find';
      } else if (options.action === 'compare') {
        urlPath += '/compare';
      }
    }
    
    // Add file/directory path
    if (path) {
      urlPath += `/${path}`;
    }
    
    const url = new URL(urlPath, baseUrl);
    
    // Add line numbers for file views
    if (options?.lineNumbers && options.viewType === 'blob') {
      if (options.lineNumbers.end) {
        url.hash = `L${options.lineNumbers.start}-L${options.lineNumbers.end}`;
      } else {
        url.hash = `L${options.lineNumbers.start}`;
      }
    }
    
    return url.toString();
  }

  /**
   * Build GitHub raw content URL
   */
  public buildGitHubRawURL(
    owner: string,
    repo: string,
    path: string,
    ref?: string
  ): string {
    const baseConfig = ENTERPRISE_DOCUMENTATION_BASE_URLS[DocumentationProvider.GITHUB_ENTERPRISE];
    const baseUrl = baseConfig.RAW_CONTENT;
    const reference = ref || 'main';
    
    return `${baseUrl}/${owner}/${repo}/${reference}/${path}`;
  }

  /**
   * Build GitHub API URL
   */
  public buildGitHubAPIURL(
    endpoint: string,
    apiVersion?: 'v3' | 'v4'
  ): string {
    const baseConfig = ENTERPRISE_DOCUMENTATION_BASE_URLS[DocumentationProvider.GITHUB_ENTERPRISE];
    const baseUrl = apiVersion === 'v4' ? baseConfig.API_V4 : baseConfig.API_V3;
    
    return `${baseUrl}/${endpoint}`;
  }

  /**
   * Build GitHub Gist URL
   */
  public buildGitHubGistURL(
    gistId: string,
    revision?: string,
    action?: 'edit' | 'raw' | 'download'
  ): string {
    const baseConfig = ENTERPRISE_DOCUMENTATION_BASE_URLS[DocumentationProvider.GITHUB_ENTERPRISE];
    const baseUrl = baseConfig.GIST;
    
    let urlPath = `/${gistId}`;
    
    if (revision) {
      urlPath += `/${revision}`;
    }
    
    if (action === 'raw') {
      urlPath += '/raw';
    } else if (action === 'download') {
      urlPath += '/download';
    } else if (action === 'edit') {
      urlPath += '/edit';
    }
    
    return new URL(urlPath, baseUrl).toString();
  }

  /**
   * Build GitHub search URL
   */
  public buildGitHubSearchURL(
    query: string,
    searchType?: 'repositories' | 'code' | 'commits' | 'issues' | 'discussions' | 'users' | 'topics',
    options?: {
      language?: string;
      owner?: string;
      repo?: string;
      path?: string;
      sort?: 'stars' | 'forks' | 'help-wanted-issues' | 'updated' | 'created';
      order?: 'asc' | 'desc';
    }
  ): string {
    const baseUrl = 'https://github.com/search';
    const url = new URL('', baseUrl);
    
    // Build search query
    let searchQuery = query;
    
    if (options?.language) {
      searchQuery += ` language:${options.language}`;
    }
    
    if (options?.owner) {
      searchQuery += ` user:${options.owner}`;
    }
    
    if (options?.repo) {
      searchQuery += ` repo:${options.owner || ''}/${options.repo}`;
    }
    
    if (options?.path) {
      searchQuery += ` path:${options.path}`;
    }
    
    url.searchParams.set('q', searchQuery);
    url.searchParams.set('type', searchType || 'repositories');
    
    if (options?.sort) {
      url.searchParams.set('s', options.sort);
    }
    
    if (options?.order) {
      url.searchParams.set('o', options.order);
    }
    
    return url.toString();
  }

  /**
   * Build GitHub Actions workflow URL
   */
  public buildGitHubActionsURL(
    owner: string,
    repo: string,
    workflowFile?: string,
    action?: 'runs' | 'new'
  ): string {
    const baseUrl = 'https://github.com';
    
    if (action === 'new') {
      return `${baseUrl}/${owner}/${repo}/actions/new`;
    }
    
    let urlPath = `/${owner}/${repo}/actions`;
    
    if (workflowFile) {
      urlPath += `/workflows/${workflowFile}`;
    } else if (action === 'runs') {
      urlPath += '/runs';
    }
    
    return `${baseUrl}${urlPath}`;
  }

  /**
   * Build GitHub releases URL
   */
  public buildGitHubReleasesURL(
    owner: string,
    repo: string,
    tagName?: string,
    action?: 'latest' | 'new' | 'edit'
  ): string {
    const baseUrl = 'https://github.com';
    
    if (action === 'new') {
      return `${baseUrl}/${owner}/${repo}/releases/new`;
    }
    
    let urlPath = `/${owner}/${repo}/releases`;
    
    if (action === 'latest') {
      urlPath += '/latest';
    } else if (action === 'edit' && tagName) {
      urlPath += `/edit/${tagName}`;
    } else if (tagName) {
      urlPath += `/tag/${tagName}`;
    }
    
    return `${baseUrl}${urlPath}`;
  }

  /**
   * Build GitHub commit URL with line diff
   */
  public buildGitHubCommitURL(
    owner: string,
    repo: string,
    commitHash: string,
    filePath?: string,
    options?: { lineNumbers?: { start: number; end?: number } }
  ): string {
    const baseUrl = 'https://github.com';
    let urlPath = `/${owner}/${repo}/commit/${commitHash}`;
    
    if (filePath) {
      urlPath += `#diff-${Buffer.from(filePath).toString('base64')}`;
      
      if (options?.lineNumbers) {
        if (options.lineNumbers.end) {
          urlPath += `L${options.lineNumbers.start}-L${options.lineNumbers.end}`;
        } else {
          urlPath += `L${options.lineNumbers.start}`;
        }
      }
    }
    
    return `${baseUrl}${urlPath}`;
  }

  /**
   * Build GitHub compare URL
   */
  public buildGitHubCompareURL(
    owner: string,
    repo: string,
    baseRef: string,
    headRef: string,
    filePath?: string
  ): string {
    const baseUrl = 'https://github.com';
    let urlPath = `/${owner}/${repo}/compare/${baseRef}...${headRef}`;
    
    if (filePath) {
      urlPath += `#diff-${Buffer.from(filePath).toString('base64')}`;
    }
    
    return `${baseUrl}${urlPath}`;
  }

  /**
   * Build bun-types repository URL
   */
  public buildBunTypesURL(
    path?: string,
    commitHash?: string
  ): string {
    return this.buildGitHubRepositoryURL(
      'oven-sh',
      'bun',
      path ? `packages/bun-types/${path}` : 'packages/bun-types',
      commitHash,
      { viewType: 'tree' }
    );
  }

  /**
   * Build reference URL with text fragment support
   */
  public buildReferenceURLWithTextFragment(
    section: string,
    textFragment?: string,
    options?: { language?: string }
  ): string {
    const baseConfig = ENTERPRISE_DOCUMENTATION_BASE_URLS[DocumentationProvider.BUN_REFERENCE];
    const baseUrl = baseConfig.REFERENCE;
    
    const url = new URL(section, baseUrl);
    
    // Add text fragment for Chrome/Edge text search
    if (textFragment) {
      // URL encode the text fragment for proper formatting
      const encodedText = encodeURIComponent(textFragment);
      url.hash = `:~:text=${encodedText}`;
    }
    
    // Add language preference
    if (options?.language) {
      url.searchParams.set('lang', options.language);
    }
    
    return url.toString();
  }

  /**
   * Build GitHub Public repository URL with enhanced commit support
   */
  public buildGitHubPublicURL(
    path?: string,
    ref?: string,
    options?: { 
      viewType?: 'tree' | 'blob' | 'commits' | 'issues' | 'pulls' | 'actions' | 'projects' | 'wiki' | 'security' | 'insights' | 'settings' | 'releases' | 'packages' | 'discussions';
      lineNumbers?: { start: number; end?: number };
      pathType?: 'file' | 'dir' | 'submodule' | 'symlink';
      action?: 'new' | 'edit' | 'delete' | 'find' | 'compare';
      branch?: string;
      tag?: string;
    }
  ): string {
    return this.buildGitHubRepositoryURL('oven-sh', 'bun', path, ref, options);
  }

  /**
   * Build specific commit URL using significant commits
   */
  public buildSignificantCommitURL(
    commitKey: keyof typeof SIGNIFICANT_COMMITS,
    path?: string,
    viewType: 'tree' | 'blob' = 'tree'
  ): string {
    const commitHash = SIGNIFICANT_COMMITS[commitKey];
    return this.buildGitHubPublicURL(path, commitHash, { viewType });
  }

  /**
   * Build package-specific GitHub URL
   */
  public buildBunPackageURL(
    packageName: 'bun-types' | 'bun-test' | 'bun-ffi' | 'bun-pm',
    path?: string,
    ref?: string
  ): string {
    const baseConfig = ENTERPRISE_DOCUMENTATION_BASE_URLS[DocumentationProvider.GITHUB_PUBLIC];
    const packagePath = baseConfig.PACKAGES[`BUN_${packageName.toUpperCase()}` as keyof typeof baseConfig.PACKAGES];
    
    if (!packagePath) {
      throw new Error(`Unknown package: ${packageName}`);
    }
    
    const fullPath = path ? `${packagePath.replace(/\/tree\/[^\/]+/, '')}/${path}` : packagePath;
    const refPart = ref ? ref : 'main';
    
    return fullPath.replace(/\/tree\/[^\/]+/, `/tree/${refPart}`);
  }

  /**
   * Build text fragment URL with encoding helpers
   */
  public buildTextFragmentURL(
    section: string,
    textFragment: string,
    options?: { language?: string; provider?: DocumentationProvider.BUN_REFERENCE }
  ): string {
    const encodedFragment = TEXT_FRAGMENT_PATTERNS.encode(textFragment);
    return this.buildReferenceURLWithTextFragment(section, encodedFragment, options);
  }

  /**
   * Get all URLs for a specific commit across different views
   */
  public getCommitViewURLs(
    commitHash: string,
    filePath?: string
  ): {
    tree: string;
    blob: string;
    commit: string;
    raw: string;
  } {
    const path = filePath || '';
    
    return {
      tree: this.buildGitHubPublicURL(path, commitHash, { viewType: 'tree' }),
      blob: this.buildGitHubPublicURL(path, commitHash, { viewType: 'blob' }),
      commit: `https://github.com/oven-sh/bun/commit/${commitHash}${filePath ? `#diff-${Buffer.from(filePath).toString('base64')}` : ''}`,
      raw: `https://raw.githubusercontent.com/oven-sh/bun/${commitHash}/${path}`
    };
  }

  /**
   * Parse GitHub URL and extract components
   */
  public parseGitHubURL(url: string): GitHubURLParseResult | null {
    // Try each pattern
    const patterns = [
      { regex: GITHUB_URL_PATTERNS.TREE_VIEW, type: 'tree' as const },
      { regex: GITHUB_URL_PATTERNS.BLOB_VIEW, type: 'blob' as const },
      { regex: GITHUB_URL_PATTERNS.COMMIT_VIEW, type: 'commit' as const },
      { regex: GITHUB_URL_PATTERNS.ISSUE_VIEW, type: 'issue' as const },
      { regex: GITHUB_URL_PATTERNS.PULL_REQUEST_VIEW, type: 'pull' as const }
    ];

    for (const { regex, type } of patterns) {
      const match = url.match(regex);
      if (match) {
        const [, owner, repo, refOrNumber, path] = match;
        
        const result: GitHubURLParseResult = {
          owner,
          repo,
          type
        };

        if (type === 'tree' || type === 'blob') {
          result.ref = refOrNumber;
          result.path = path;
        } else if (type === 'commit') {
          result.ref = refOrNumber;
        } else if (type === 'issue' || type === 'pull') {
          result.number = refOrNumber;
        }

        return result;
      }
    }

    return null;
  }

  /**
   * Build GitHub URL with fragment support
   */
  public buildGitHubURLWithFragment(
    owner: string,
    repo: string,
    fragment: keyof typeof ENTERPRISE_URL_FRAGMENTS.GITHUB,
    ref?: string,
    path?: string
  ): string {
    const fragmentValue = ENTERPRISE_URL_FRAGMENTS.GITHUB[fragment];
    let baseUrl = `https://github.com/${owner}/${repo}`;

    switch (fragmentValue) {
      case 'tree':
        baseUrl += `/tree/${ref || 'main'}${path ? `/${path}` : ''}`;
        break;
      case 'blob':
        baseUrl += `/blob/${ref || 'main'}${path ? `/${path}` : ''}`;
        break;
      case 'commit':
        baseUrl += `/commit/${ref || 'main'}`;
        break;
      case 'issue':
        baseUrl += '/issues';
        break;
      case 'pull':
        baseUrl += '/pulls';
        break;
      default:
        baseUrl += `/${fragmentValue}`;
    }

    return baseUrl;
  }

  /**
   * Build TypeScript documentation URL with fragment
   */
  public buildTypeScriptURL(
    fragment: keyof typeof ENTERPRISE_URL_FRAGMENTS.TYPESCRIPT,
    section?: string,
    options?: { language?: string }
  ): string {
    const fragmentValue = ENTERPRISE_URL_FRAGMENTS.TYPESCRIPT[fragment];
    const baseConfig = ENTERPRISE_DOCUMENTATION_BASE_URLS[DocumentationProvider.BUN_REFERENCE];
    
    const url = new URL(`${section || 'typescript'}/${fragmentValue}`, baseConfig.REFERENCE);
    
    if (options?.language) {
      url.searchParams.set('lang', options.language);
    }
    
    return url.toString();
  }

  /**
   * Build text fragment URL with predefined patterns
   */
  public buildTextFragmentFromPattern(
    pattern: keyof typeof ENTERPRISE_URL_FRAGMENTS.TEXT_FRAGMENTS,
    section?: string
  ): string {
    const textFragment = ENTERPRISE_URL_FRAGMENTS.TEXT_FRAGMENTS[pattern];
    return this.buildReferenceURLWithTextFragment(section || '', textFragment);
  }

  /**
   * Build GitHub URL for a specific commit and path
   * Example: https://github.com/oven-sh/bun/tree/main/packages/bun-types
   */
  public buildGitHubCommitURL(
    owner: string = 'oven-sh',
    repo: string = 'bun',
    commitHash: string = SIGNIFICANT_COMMITS.LATEST_RELEASE,
    path: string = '',
    viewType: 'tree' | 'blob' = 'tree'
  ): string {
    const baseConfig = ENTERPRISE_DOCUMENTATION_BASE_URLS[DocumentationProvider.GITHUB_PUBLIC];
    
    if (viewType === 'blob') {
      return `https://github.com/${owner}/${repo}/blob/${commitHash}${path ? `/${path}` : ''}`;
    }
    
    return `https://github.com/${owner}/${repo}/tree/${commitHash}${path ? `/${path}` : ''}`;
  }
  
  /**
   * Build bun-types package URL
   */
  public buildBunTypesURL(
    commitHash: string = SIGNIFICANT_COMMITS.LATEST_RELEASE,
    path: string = ''
  ): string {
    return this.buildGitHubCommitURL(
      'oven-sh',
      'bun',
      commitHash,
      `packages/bun-types${path ? `/${path}` : ''}` 
    );
  }
  
  /**
   * Build URL with text fragment (for bun.com/reference#:~:text=...)
   */
  public buildURLWithTextFragment(
    baseURL: string,
    textFragment: string,
    options?: {
      prefix?: string;
      suffix?: string;
      textStart?: string;
      textEnd?: string;
    }
  ): string {
    const url = new URL(baseURL);
    
    // Build text fragment according to spec: #:~:text=[prefix-,]textStart[,textEnd][,-suffix]
    let fragment = ':~:text=';
    
    if (options?.prefix) {
      fragment += `${encodeURIComponent(options.prefix)}-`;
    }
    
    fragment += encodeURIComponent(options?.textStart || textFragment);
    
    if (options?.textEnd) {
      fragment += `,${encodeURIComponent(options.textEnd)}`;
    }
    
    if (options?.suffix) {
      fragment += `,-${encodeURIComponent(options.suffix)}`;
    }
    
    // Append to existing hash or create new
    if (url.hash && !url.hash.includes(':~:')) {
      url.hash = `${url.hash}${fragment}`;
    } else {
      url.hash = fragment;
    }
    
    return url.toString();
  }
  
  /**
   * Build bun.com/reference URL with text fragment
   */
  public buildBunReferenceWithTextFragment(
    text: string,
    options?: {
      prefix?: string;
      suffix?: string;
      textStart?: string;
      textEnd?: string;
    }
  ): string {
    const baseURL = ENTERPRISE_DOCUMENTATION_BASE_URLS[DocumentationProvider.BUN_REFERENCE].REFERENCE;
    return this.buildURLWithTextFragment(baseURL, text, options);
  }
  
  /**
   * Get the specific commit URL you provided
   */
  public getExampleCommitURL(): string {
    return ENTERPRISE_DOCUMENTATION_BASE_URLS[DocumentationProvider.GITHUB_PUBLIC].EXAMPLE_COMMIT_AF76296;
  }
  
  /**
   * Build GitHub raw URL for direct file access
   */
  public buildGitHubRawURL(
    commitHash: string,
    filePath: string
  ): string {
    return `https://raw.githubusercontent.com/oven-sh/bun/${commitHash}/${filePath}`;
  }
  
  /**
   * Get TypeScript definition file URLs
   */
  public getTypeDefinitionURLs(): Record<string, string> {
    const baseConfig = ENTERPRISE_DOCUMENTATION_BASE_URLS[DocumentationProvider.BUN_TYPES];
    
    return {
      npmPackage: baseConfig.NPM_PACKAGE,
      githubPackage: baseConfig.GITHUB_PACKAGE,
      latestTypes: `https://github.com/oven-sh/bun/tree/main/packages/bun-types`,
      exampleCommit: this.getExampleCommitURL(),
      typescriptPlayground: baseConfig.TYPESCRIPT_PLAYGROUND
    };
  }
  
  /**
   * Get all GitHub-related URLs for a package
   */
  public getGitHubPackageURLs(
    packageName: string,
    commitHash: string = SIGNIFICANT_COMMITS.LATEST_RELEASE
  ): Record<string, string> {
    const base = `https://github.com/oven-sh/bun/tree/${commitHash}/packages`;
    
    return {
      packageRoot: `${base}/${packageName}`,
      packageJson: `${base}/${packageName}/package.json`,
      readme: `${base}/${packageName}/README.md`,
      src: `${base}/${packageName}/src`,
      tests: `${base}/${packageName}/test`,
      // Add specific files for common packages
      ...(packageName === 'bun-types' && {
        index: `${base}/${packageName}/index.d.ts`,
        bun: `${base}/${packageName}/bun.d.ts`,
        globals: `${base}/${packageName}/globals.d.ts` 
      })
    };
  }
  
  /**
   * Quick access to common text fragment URLs
   */
  public getCommonTextFragmentURLs(): Record<string, string> {
    const base = ENTERPRISE_DOCUMENTATION_BASE_URLS[DocumentationProvider.BUN_REFERENCE].REFERENCE;
    
    return {
      nodeZlib: this.buildURLWithTextFragment(base, TEXT_FRAGMENT_PATTERNS.NODE_ZLIB),
      bunAPIReference: this.buildURLWithTextFragment(base, TEXT_FRAGMENT_PATTERNS.BUN_API_REFERENCE),
      typedArray: this.buildURLWithTextFragment(base, TEXT_FRAGMENT_PATTERNS.TYPED_ARRAY),
      fetchAPI: this.buildURLWithTextFragment(base, TEXT_FRAGMENT_PATTERNS.FETCH_API)
    };
  }

  /**
   * Get all documentation URLs for a topic across all providers
   */
  public getAllDocumentationForTopic(topic: string): Record<string, string> {
    const topicLower = topic.toLowerCase();
    const urls: Record<string, string> = {};
    
    // Known topic mappings
    const topicMappings = {
      'typedarray': {
        technical: 'https://bun.sh/docs/cli/runtime/binary-data#typedarray',
        reference: 'https://bun.com/reference/api/binary-data#typedarray',
        guide: 'https://bun.com/guides/working-with-binary-data'
      },
      'fetch': {
        technical: 'https://bun.sh/docs/cli/runtime/networking/fetch',
        reference: 'https://bun.com/reference/api/fetch',
        guide: 'https://bun.com/guides/making-http-requests'
      },
      'rss': {
        main: 'https://bun.com/rss.xml',
        technical: 'https://bun.sh/rss.xml',
        blog: 'https://bun.com/blog/rss.xml',
        releases: 'https://bun.com/releases/rss.xml'
      },
      'getting-started': {
        quickstart: 'https://bun.sh/docs/cli/quickstart',
        guide: 'https://bun.com/guides/getting-started',
        tutorial: 'https://bun.com/guides/tutorials/beginner'
      },
      'api': {
        overview: 'https://bun.sh/docs/cli/api',
        portal: 'https://bun.com/reference',
        interactive: 'https://bun.com/reference/api'
      },
      'node:zlib': {
        reference: 'https://bun.com/reference#node:zlib',
        compatibility: 'https://bun.com/reference/node-compatibility#node:zlib',
        github: 'https://github.com/oven-sh/bun/tree/main/packages/bun-types'
      }
    };
    
    if (topicMappings[topicLower as keyof typeof topicMappings]) {
      return topicMappings[topicLower as keyof typeof topicMappings];
    }
    
    // Fallback: return base URLs for all bun providers
    urls.bun_sh_docs = 'https://bun.sh/docs/cli';
    urls.bun_com_reference = 'https://bun.com/reference';
    urls.bun_com_guides = 'https://bun.com/guides';
    urls.bun_com_rss = 'https://bun.com/rss.xml';
    
    return urls;
  }
}

// ============================================================================
// DOCUMENTATION VALIDATION UTILITIES
// ============================================================================

/**
 * Enhanced documentation URL validator with GitHub integration
 */
export class DocumentationURLValidator {
  /**
   * Parse GitHub URL into structured data
   */
  public static parseGitHubURL(url: string): {
    isValid: boolean;
    type?: 'tree' | 'blob' | 'commit' | 'issue' | 'pull' | 'release' | 'unknown';
    owner?: string;
    repo?: string;
    commitHash?: string;
    branch?: string;
    tag?: string;
    path?: string;
    file?: string;
    lineNumber?: number;
    issueNumber?: number;
    pullNumber?: number;
  } {
    try {
      const parsed = new URL(url);
      
      if (!parsed.hostname.includes('github.com')) {
        return { isValid: false };
      }
      
      const pathParts = parsed.pathname.split('/').filter(Boolean);
      
      // Check for different GitHub URL patterns
      for (const [type, pattern] of Object.entries(GITHUB_URL_PATTERNS)) {
        const match = url.match(pattern);
        if (match) {
          switch (type) {
            case 'TREE_VIEW':
              return {
                isValid: true,
                type: 'tree',
                owner: match[1],
                repo: match[2],
                commitHash: match[3],
                path: match[4] || '',
                file: match[4]?.split('/').pop()
              };
              
            case 'BLOB_VIEW':
              const blobResult = {
                isValid: true,
                type: 'blob',
                owner: match[1],
                repo: match[2],
                commitHash: match[3],
                path: match[4] || '',
                file: match[4]?.split('/').pop()
              };
              
              // Check for line number in hash
              if (parsed.hash.startsWith('#L')) {
                const lineMatch = parsed.hash.match(/#L(\d+)(?:-L(\d+))?/);
                if (lineMatch) {
                  blobResult.lineNumber = parseInt(lineMatch[1], 10);
                }
              }
              
              return blobResult;
              
            case 'COMMIT_VIEW':
              return {
                isValid: true,
                type: 'commit',
                owner: match[1],
                repo: match[2],
                commitHash: match[3]
              };
              
            case 'ISSUE_VIEW':
              return {
                isValid: true,
                type: 'issue',
                owner: match[1],
                repo: match[2],
                issueNumber: parseInt(match[3], 10)
              };
              
            case 'PULL_REQUEST_VIEW':
              return {
                isValid: true,
                type: 'pull',
                owner: match[1],
                repo: match[2],
                pullNumber: parseInt(match[3], 10)
              };
          }
        }
      }
      
      // Check for release/tag
      if (pathParts[2] === 'releases' && pathParts[3] === 'tag') {
        return {
          isValid: true,
          type: 'release',
          owner: pathParts[0],
          repo: pathParts[1],
          tag: pathParts[4]
        };
      }
      
      // Check for branch
      if (pathParts[2] === 'tree' && !/^[a-f0-9]{40}$/.test(pathParts[3])) {
        return {
          isValid: true,
          type: 'tree',
          owner: pathParts[0],
          repo: pathParts[1],
          branch: pathParts[3],
          path: pathParts.slice(4).join('/')
        };
      }
      
      return { isValid: true, type: 'unknown' };
      
    } catch {
      return { isValid: false };
    }
  }
  
  /**
   * Extract text fragment from URL
   */
  public static extractTextFragment(url: string): {
    hasTextFragment: boolean;
    rawFragment?: string;
    decodedText?: string;
    components?: {
      prefix?: string;
      textStart?: string;
      textEnd?: string;
      suffix?: string;
    };
  } {
    try {
      const parsed = new URL(url);
      const hash = parsed.hash;
      
      if (!hash.includes(':~:text=')) {
        return { hasTextFragment: false };
      }
      
      const match = hash.match(/:\~:text=([^&]+)/);
      if (!match) {
        return { hasTextFragment: false };
      }
      
      const rawFragment = match[1];
      const decodedText = decodeURIComponent(rawFragment);
      
      // Parse the text fragment components
      const components: any = {};
      
      // Pattern: [prefix-,]textStart[,textEnd][,-suffix]
      const parts = decodedText.split(',');
      
      if (parts[0].endsWith('-')) {
        components.prefix = parts[0].slice(0, -1);
        components.textStart = parts[1] || '';
      } else {
        components.textStart = parts[0];
      }
      
      if (parts.length > 1 && parts[parts.length - 1].startsWith('-')) {
        components.suffix = parts[parts.length - 1].slice(1);
        if (parts.length > 2) {
          components.textEnd = parts[parts.length - 2];
        }
      } else if (parts.length > 1) {
        components.textEnd = parts[parts.length - 1];
      }
      
      return {
        hasTextFragment: true,
        rawFragment,
        decodedText,
        components
      };
      
    } catch {
      return { hasTextFragment: false };
    }
  }
  
  /**
   * Check if URL is a specific commit reference
   */
  public static isSpecificCommitURL(url: string): boolean {
    const parsed = this.parseGitHubURL(url);
    return parsed.isValid && 
           (parsed.type === 'tree' || parsed.type === 'blob') && 
           !!parsed.commitHash &&
           /^[a-f0-9]{40}$/.test(parsed.commitHash);
  }
  
  /**
   * Get commit hash from GitHub URL
   */
  public static extractCommitHash(url: string): string | null {
    const parsed = this.parseGitHubURL(url);
    return parsed.commitHash || null;
  }
  
  /**
   * Check if URL is a bun-types reference
   */
  public static isBunTypesURL(url: string): boolean {
    const parsed = this.parseGitHubURL(url);
    return parsed.isValid && 
           parsed.repo === 'bun' && 
           parsed.path?.includes('packages/bun-types') === true;
  }
  /**
   * Validate if URL is a valid documentation URL
   */
  public static isValidDocumentationURL(url: string): boolean {
    try {
      const parsed = new URL(url);
      
      // Check if it's a known documentation provider
      const knownHosts = [
        'bun.sh',
        'github.com',
        'docs.github.com',
        'wiki.internal.example.com',
        'wiki-api.internal.example.com',
        'developer.mozilla.org',
        'web.dev',
        'wiki.enterprise.com',
        'api.enterprise.com',
        'performance.enterprise.com',
        'security.enterprise.com'
      ];
      
      return knownHosts.includes(parsed.hostname);
    } catch {
      return false;
    }
  }

  /**
   * Extract documentation metadata from URL
   */
  public static extractDocumentationMetadata(url: string): {
    provider?: DocumentationProvider;
    category?: DocumentationCategory;
    path?: string;
    fragment?: string;
    isValid: boolean;
  } {
    try {
      const parsed = new URL(url);
      
      // Determine provider
      let provider: DocumentationProvider | undefined;
      switch (parsed.hostname) {
        case 'bun.sh':
          provider = DocumentationProvider.BUN_OFFICIAL;
          break;
        case 'github.com':
        case 'docs.github.com':
          provider = DocumentationProvider.GITHUB_ENTERPRISE;
          break;
        case 'wiki.internal.example.com':
        case 'wiki-api.internal.example.com':
          provider = DocumentationProvider.INTERNAL_WIKI;
          break;
        case 'developer.mozilla.org':
          provider = DocumentationProvider.MDN_WEB_DOCS;
          break;
        case 'web.dev':
          provider = DocumentationProvider.PERFORMANCE_GUIDES;
          break;
        case 'wiki.enterprise.com':
          provider = DocumentationProvider.ENTERPRISE_WIKI;
          break;
        case 'api.enterprise.com':
          provider = DocumentationProvider.API_REFERENCE;
          break;
        case 'performance.enterprise.com':
          provider = DocumentationProvider.PERFORMANCE_GUIDES;
          break;
        case 'security.enterprise.com':
          provider = DocumentationProvider.SECURITY_DOCS;
          break;
      }

      // Extract path and fragment
      const path = parsed.pathname;
      const fragment = parsed.hash.slice(1); // Remove # prefix

      return {
        provider,
        path,
        fragment,
        isValid: true
      };
    } catch {
      return { isValid: false };
    }
  }

  /**
   * Build CLI documentation URL with fragment
   */
  public buildCLIDocumentationURL(
    subcommand: string,
    fragment?: string,
    options?: { includeExamples?: boolean }
  ): string {
    const baseURLs = ENTERPRISE_DOCUMENTATION_BASE_URLS[DocumentationProvider.BUN_OFFICIAL];
    let path = `/docs/cli/${subcommand.toLowerCase()}`;
    
    if (options?.includeExamples) {
      path += '?examples=true';
    }
    
    const url = new URL(path, baseURLs.DOCS);
    if (fragment) {
      url.hash = fragment;
    }
    
    return url.toString();
  }
  
  /**
   * Build Bun.utils documentation URL
   */
  public buildUtilsDocumentationURL(
    utilityFunction?: string,
    fragment?: string
  ): string {
    const baseURLs = ENTERPRISE_DOCUMENTATION_BASE_URLS[DocumentationProvider.BUN_OFFICIAL];
    let url = new URL('/docs/api/utils', baseURLs.API);
    
    if (utilityFunction) {
      url.hash = utilityFunction;
    } else if (fragment) {
      url.hash = fragment;
    }
    
    return url.toString();
  }
  
  /**
   * Get CLI fragment URLs
   */
  public getCLIFragmentURLs(): Record<string, string> {
    const base = ENTERPRISE_DOCUMENTATION_BASE_URLS[DocumentationProvider.BUN_OFFICIAL].DOCS;
    
    return {
      run: `${base}/docs/cli/run#examples`,
      test: `${base}/docs/cli/test#configuration`,
      build: `${base}/docs/cli/build#options`,
      install: `${base}/docs/cli/install-command#dependencies`,
      add: `${base}/docs/cli/add#packages` 
    };
  }
  
  /**
   * Build CLI command example
   */
  public buildCLICommandExample(
    command: string,
    options: Record<string, any> = {}
  ): string {
    let cmd = `bun ${command}`;
    
    // Add positional arguments
    if (options.script) {
      cmd += ` ${options.script}`;
    }
    if (options.package) {
      cmd += ` ${options.package}`;
      if (options.version) {
        cmd += `@${options.version}`;
      }
    }
    if (options.entry) {
      cmd += ` ${options.entry}`;
    }
    
    // Add flags
    Object.entries(options).forEach(([key, value]) => {
      if (!['script', 'package', 'version', 'entry'].includes(key)) {
        if (typeof value === 'boolean' && value) {
          cmd += ` --${key}`;
        } else if (typeof value !== 'boolean') {
          cmd += ` --${key}=${value}`;
        }
      }
    });
    
    return cmd;
  }
  
  /**
   * Get cheatsheet URLs
   */
  public getCheatsheetURLs(): any {
    return {
      cli: {
        main: 'https://bun.sh/docs/cli/cli',
        commands: [
          {
            name: 'run',
            example: 'bun run dev',
            docs: 'https://bun.sh/docs/cli/cli/run'
          },
          {
            name: 'test',
            example: 'bun test --watch',
            docs: 'https://bun.sh/docs/cli/cli/test'
          },
          {
            name: 'build',
            example: 'bun build ./src/index.ts',
            docs: 'https://bun.sh/docs/cli/cli/build'
          }
        ]
      },
      utils: {
        main: 'https://bun.sh/docs/cli/api/utils',
        functions: [
          {
            name: 'readFile',
            example: "await readFile('file.txt', 'utf-8')",
            docs: 'https://bun.sh/docs/cli/api/utils#readFile'
          },
          {
            name: 'isTypedArray',
            example: 'isTypedArray(new Uint8Array())',
            docs: 'https://bun.sh/docs/cli/api/utils#isTypedArray'
          },
          {
            name: 'toBuffer',
            example: 'toBuffer("Hello")',
            docs: 'https://bun.sh/docs/cli/api/utils#toBuffer'
          }
        ],
        validation: [
          {
            name: 'isTypedArray',
            test: 'new Uint8Array([1, 2, 3])',
            result: 'true'
          },
          {
            name: 'isString',
            test: '"Hello"',
            result: 'true'
          },
          {
            name: 'isArray',
            test: '[1, 2, 3]',
            result: 'true'
          }
        ]
      },
      api: {
        main: 'https://bun.sh/docs/cli/api',
        typedArray: 'https://bun.sh/docs/cli/runtime/binary-data#typedarray',
        fetch: 'https://bun.sh/docs/cli/runtime/networking/fetch'
      }
    };
  }
}

// ============================================================================
// QUICK ACCESS FUNCTIONS
// ============================================================================

/**
 * Quick access functions for the specific URLs you provided
 */
export function getBunReferenceURL(): string {
  return 'https://bun.com/reference';
}

export function getBunReferenceWithTextFragment(): {
  nodeZlib: string;
  bunAPIReference: string;
} {
  return {
    nodeZlib: docsURL.buildBunReferenceWithTextFragment('node:zlib'),
    bunAPIReference: docsURL.buildBunReferenceWithTextFragment('Bun API Reference')
  };
}

export function getBunGuidesURL(): string {
  return 'https://bun.com/guides';
}

export function getBunRSSURL(): string {
  return 'https://bun.com/rss.xml';
}

export function getGitHubBunTypesCommitURL(
  commitHash: string = SIGNIFICANT_COMMITS.AF762966
): string {
  return docsURL.buildBunTypesURL(commitHash);
}

export function getAllCriticalURLs(): Record<string, any> {
  return {
    // Primary documentation portals
    referencePortal: {
      main: 'https://bun.com/reference',
      api: 'https://bun.com/reference/api',
      cli: 'https://bun.com/reference/cli',
      textFragments: docsURL.getCommonTextFragmentURLs()
    },
    
    guidesPortal: {
      main: 'https://bun.com/guides',
      gettingStarted: 'https://bun.com/guides/getting-started'
    },
    
    rssFeeds: {
      main: 'https://bun.com/rss.xml',
      blog: 'https://bun.com/blog/rss.xml',
      technical: 'https://bun.sh/rss.xml'
    },
    
    // GitHub resources
    github: {
      repository: 'https://github.com/oven-sh/bun',
      bunTypes: {
        latest: docsURL.buildBunTypesURL(),
        specificCommit: docsURL.getExampleCommitURL(),
        npm: ENTERPRISE_DOCUMENTATION_BASE_URLS[DocumentationProvider.NPM_PACKAGES].BUN_TYPES
      },
      packages: docsURL.getGitHubPackageURLs('bun-types')
    },
    
    // Technical documentation
    technicalDocs: {
      typedArray: docsURL.buildTypedArrayURL('OVERVIEW'),
      fetchAPI: docsURL.buildFetchAPIDocsURL(),
      binaryData: 'https://bun.sh/docs/cli/runtime/binary-data'
    }
  };
}

/**
 * TypeScript helper for the example commit
 */
export const exampleCommit = {
  hash: SIGNIFICANT_COMMITS.AF762966,
  url: ENTERPRISE_DOCUMENTATION_BASE_URLS[DocumentationProvider.GITHUB_PUBLIC].EXAMPLE_COMMIT_AF76296,
  shortHash: 'af76296' as const,
  date: '2023-08-15' as const, // Example date - would need actual commit date
  description: 'Example commit showing bun-types package structure'
} as const;

/**
 * Global documentation URL builder instance
 */
export const docsURL = EnterpriseDocumentationURLBuilder.getInstance();

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick URL builders
 */
export const buildBunDocsURL = (path: string, fragment?: string) => 
  docsURL.buildBunURL(path, fragment);

export const buildBunURLWithDomain = (path: string, fragment?: string, useAlternativeDomain: boolean = false) => 
  docsURL.buildBunURLWithDomain(path, fragment, useAlternativeDomain);

export const buildPackageManagerURLWithDomain = (path: string, fragment?: string, useAlternativeDomain: boolean = false) => 
  docsURL.buildPackageManagerURLWithDomain(path, fragment, useAlternativeDomain);

export const buildReferencePortalURL = (section: string, fragment?: string, options?: { language?: string }) => 
  docsURL.buildReferencePortalURL(section, fragment, options);

export const buildGuideURL = (guideName: string, fragment?: string, options?: { step?: number; interactive?: boolean }) => 
  docsURL.buildGuideURL(guideName, fragment, options);

export const buildRSSFeedURL = (feedType: 'main' | 'blog' | 'releases' | 'technical' | 'security' | 'community') => 
  docsURL.buildRSSFeedURL(feedType);

export const getAllDocumentationForTopic = (topic: string) => 
  docsURL.getAllDocumentationForTopic(topic);

export const buildGitHubRepositoryURL = (
  owner: string,
  repo: string,
  path?: string,
  ref?: string,
  options?: { 
    viewType?: 'tree' | 'blob' | 'commits' | 'issues' | 'pulls' | 'actions' | 'projects' | 'wiki' | 'security' | 'insights' | 'settings' | 'releases' | 'packages' | 'discussions';
    lineNumbers?: { start: number; end?: number };
    pathType?: 'file' | 'dir' | 'submodule' | 'symlink';
    action?: 'new' | 'edit' | 'delete' | 'find' | 'compare';
    branch?: string;
    tag?: string;
  }
) => docsURL.buildGitHubRepositoryURL(owner, repo, path, ref, options);


export const buildGitHubCommitURL = (
  owner?: string,
  repo?: string,
  commitHash?: string,
  path?: string,
  viewType?: 'tree' | 'blob'
) => docsURL.buildGitHubCommitURL(owner, repo, commitHash, path, viewType);

export const buildBunTypesURL = (
  commitHash?: string,
  path?: string
) => docsURL.buildBunTypesURL(commitHash, path);

export const buildURLWithTextFragment = (
  baseURL: string,
  textFragment: string,
  options?: {
    prefix?: string;
    suffix?: string;
    textStart?: string;
    textEnd?: string;
  }
) => docsURL.buildURLWithTextFragment(baseURL, textFragment, options);

export const buildBunReferenceWithTextFragment = (
  text: string,
  options?: {
    prefix?: string;
    suffix?: string;
    textStart?: string;
    textEnd?: string;
  }
) => docsURL.buildBunReferenceWithTextFragment(text, options);

export const getExampleCommitURL = () => 
  docsURL.getExampleCommitURL();

export const getTypeDefinitionURLs = () => 
  docsURL.getTypeDefinitionURLs();

export const getGitHubPackageURLs = (
  packageName: string,
  commitHash?: string
) => docsURL.getGitHubPackageURLs(packageName, commitHash);

export const getCommonTextFragmentURLs = () => 
  docsURL.getCommonTextFragmentURLs();

// Enhanced validator convenience functions
export const parseGitHubURL = (url: string) => 
  DocumentationURLValidator.parseGitHubURL(url);

export const extractTextFragment = (url: string) => 
  DocumentationURLValidator.extractTextFragment(url);

export const isSpecificCommitURL = (url: string) => 
  DocumentationURLValidator.isSpecificCommitURL(url);

export const extractCommitHash = (url: string) => 
  DocumentationURLValidator.extractCommitHash(url);

export const isBunTypesURL = (url: string) => 
  DocumentationURLValidator.isBunTypesURL(url);

export const buildBunRSSFeedURL = () => 
  docsURL.buildBunRSSFeedURL();

export const buildGitHubEnterpriseURL = (path: string, fragment?: string) => 
  docsURL.buildGitHubEnterpriseURL(path, fragment);

export const buildGitHubRawURL = (owner: string, repo: string, path: string, ref?: string) => 
  docsURL.buildGitHubRawURL(owner, repo, path, ref);

export const buildGitHubGistURL = (gistId: string) => 
  docsURL.buildGitHubGistURL(gistId);

export const buildEnterpriseAPIURL = (path: string, fragment?: string) => 
  docsURL.buildEnterpriseAPIURL(path, fragment);

export const buildInternalWikiURL = (path: string, fragment?: string) => 
  docsURL.buildInternalWikiURL(path, fragment);

export const buildMDNWebDocsURL = (path: string, fragment?: string) => 
  docsURL.buildMDNWebDocsURL(path, fragment);

export const buildMDNEnglishURL = (path: string, fragment?: string) => 
  docsURL.buildMDNEnglishURL(path, fragment);

export const buildMDNSearchURL = (query: string) => 
  docsURL.buildMDNSearchURL(query);

export const buildWebDevURL = (section: 'metrics' | 'optimization' | 'tools', path?: string, fragment?: string) => 
  docsURL.buildWebDevURL(section, path, fragment);

export const buildEnterpriseWikiURL = (path: string, fragment?: string) => 
  docsURL.buildEnterpriseWikiURL(path, fragment);

export const buildPerformanceURL = (path: string, fragment?: string) => 
  docsURL.buildPerformanceURL(path, fragment);

export const buildSecurityURL = (path: string, fragment?: string) => 
  docsURL.buildSecurityURL(path, fragment);

export const buildPackageManagerURL = (path: string, fragment?: string) => 
  docsURL.buildPackageManagerURL(path, fragment);

export const buildBundlerURL = (path: string, fragment?: string) => 
  docsURL.buildBundlerURL(path, fragment);

/**
 * Package manager categorized convenience functions
 */
export const getPackageManagerCoreCommands = () => 
  docsURL.getPackageManagerCoreCommands();

export const getPackageManagerPublishingAnalysis = () => 
  docsURL.getPackageManagerPublishingAnalysis();

export const getPackageManagerWorkspaceManagement = () => 
  docsURL.getPackageManagerWorkspaceManagement();

export const getPackageManagerAdvancedConfiguration = () => 
  docsURL.getPackageManagerAdvancedConfiguration();

/**
 * URL validation
 */
export const isValidDocumentationURL = (url: string) => 
  DocumentationURLValidator.isValidDocumentationURL(url);

export const extractDocumentationMetadata = (url: string) => 
  DocumentationURLValidator.extractDocumentationMetadata(url);

/**
 * Metadata retrieval convenience functions
 */
export const getDocumentationMetadata = (provider: DocumentationProvider) => 
  docsURL.getDocumentationMetadata(provider);

export const getBunDocumentationMetadata = () => 
  docsURL.getBunDocumentationMetadata();

/**
 * Fragment convenience functions
 */
export const buildURLWithFragment = <T extends FragmentType>(
  provider: DocumentationProvider,
  category: DocumentationCategory,
  path: string,
  fragmentType: T,
  fragmentValue: FragmentValue<T>
) => docsURL.buildURLWithFragment(provider, category, path, fragmentType, fragmentValue);

export const getFragmentMetadata = (fragment: string) => 
  docsURL.getFragmentMetadata(fragment);

export const getFragmentsByCategory = <T extends FragmentType>(category: T) => 
  docsURL.getFragmentsByCategory(category);

export const getRelatedFragments = (fragment: string) => 
  docsURL.getRelatedFragments(fragment);

/**
 * Structured path convenience functions
 */
export const buildStructuredURL = <T extends keyof DocumentationPaths>(
  provider: DocumentationProvider,
  pathSection: T,
  category: DocumentationCategory,
  pathKey: keyof DocumentationPaths[T][DocumentationCategory]
) => docsURL.buildStructuredURL(provider, pathSection, category, pathKey);

export const getPathsByCategory = (category: DocumentationCategory) => 
  docsURL.getPathsByCategory(category);

export const getBunCorePaths = () => 
  docsURL.getBunCorePaths();

// CLI and Utils convenience functions
export const buildCLIDocumentationURL = (
  subcommand: string,
  fragment?: string,
  options?: { includeExamples?: boolean }
) => docsURL.buildCLIDocumentationURL(subcommand, fragment, options);

export const buildUtilsDocumentationURL = (
  utilityFunction?: string,
  fragment?: string
) => docsURL.buildUtilsDocumentationURL(utilityFunction, fragment);

export const getCLIFragmentURLs = () => 
  docsURL.getCLIFragmentURLs();

export const buildCLICommandExample = (
  command: string,
  options: Record<string, any> = {}
) => docsURL.buildCLICommandExample(command, options);

export const getCheatsheetURLs = () => 
  docsURL.getCheatsheetURLs();

export const getGuidePaths = () => 
  docsURL.getGuidePaths();

export const getEnterprisePaths = () => 
  docsURL.getEnterprisePaths();

/**
 * 💡 Performance Tip: For better performance, consider:
 * 1. Using preconnect for frequently accessed domains
 * 2. Adding resource hints to your HTML head
 * 3. Implementing request caching
 * 4. Using the native fetch API with keep-alive
 */

/**
 * 🏗️ Bun Documentation URL Builder
 *
 * Centralized access to Bun documentation URLs organized by category
 */
export const BUN_DOCS_BUILDERS = {
  // Secrets management documentation
  secrets: {
    overview: () => buildBunDocsURL('docs/runtime/bun-secrets'),
    api: () => buildBunDocsURL('docs/api/bun-secrets'),
    getOptions: () => buildBunDocsURL('docs/api/bun-secrets#get'),
    versioning: () => buildBunDocsURL('docs/runtime/bun-secrets#versioning'),
    rollback: () => buildBunDocsURL('docs/runtime/bun-secrets#rollback')
  },

  // Runtime documentation
  runtime: (topic: string) => buildBunDocsURL(`docs/runtime/${topic}`),

  // Color utilities documentation
  color: {
    main: () => buildBunDocsURL('docs/api/color'),
    flexibleInput: () => buildBunDocsURL('docs/api/color#flexible-input'),
    formatANSI: () => buildBunDocsURL('docs/api/color#ansi'),
    formatNumbers: () => buildBunDocsURL('docs/api/color#numbers'),
    formatHex: () => buildBunDocsURL('docs/api/color#hex'),
    getChannels: () => buildBunDocsURL('docs/api/color#channels'),
    bundleTime: () => buildBunDocsURL('docs/api/color#bundle-time')
  },

  // File I/O documentation
  fileIO: {
    main: () => buildBunDocsURL('docs/api/file-io'),
    binary: () => buildBunDocsURL('docs/runtime/binary-data'),
    watcher: () => buildBunDocsURL('docs/api/file-watcher'),
    path: () => buildBunDocsURL('docs/api/path')
  },

  // Network documentation
  network: {
    fetch: () => buildBunDocsURL('docs/api/fetch'),
    websocket: () => buildBunDocsURL('docs/api/websocket'),
    proxy: () => buildBunDocsURL('docs/runtime/proxy'),
    tls: () => buildBunDocsURL('docs/runtime/tls')
  },

  // Bundler documentation
  bundler: {
    main: () => buildBunDocsURL('docs/bundler'),
    server: () => buildBunDocsURL('docs/bundler#dev-server'),
    static: () => buildBunDocsURL('docs/bundler#static'),
    plugins: () => buildBunDocsURL('docs/bundler#plugins')
  },

  // Deployment documentation
  deployment: {
    docker: () => buildBunDocsURL('docs/deployment/docker'),
    aws: () => buildBunDocsURL('docs/deployment/aws'),
    vercel: () => buildBunDocsURL('docs/deployment/vercel'),
    railway: () => buildBunDocsURL('docs/deployment/railway')
  },

  // API documentation
  api: {
    main: () => buildBunDocsURL('docs/api'),
    utils: () => buildBunDocsURL('docs/api/utils'),
    crypto: () => buildBunDocsURL('docs/api/crypto'),
    hashing: () => buildBunDocsURL('docs/runtime/hashing')
  },

  // Guides
  guides: {
    gettingStarted: () => buildBunDocsURL('docs/guides'),
    migration: () => buildBunDocsURL('docs/guides/migration'),
    performance: () => buildBunDocsURL('docs/guides/performance'),
    testing: () => buildBunDocsURL('docs/guides/testing')
  }
};
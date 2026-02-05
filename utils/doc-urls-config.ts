/**
 * Documentation URLs Configuration - Using Bun's Native Features
 * 
 * Leverages Bun.env for environment variables and native URLPattern
 * for validation and parsing of documentation URLs.
 * 
 * @see {@link https://bun.sh/docs/api/env} Bun environment variables
 * @see {@link https://bun.sh/docs/api/utils#urlpattern} URLPattern API
 */

// Base configuration using Bun's native environment variables
const DOC_CONFIG = {
  // Base URLs from environment or defaults
  BASE_URL: Bun.env.DOCS_BASE_URL || 'https://bun.sh/docs', // Fixed domain to bun.sh
  FEED_URL: Bun.env.RSS_FEED_URL || 'https://bun.sh/rss.xml',
  
  // Path constants
  PATHS: {
    TYPED_ARRAY: '/runtime/binary-data#typedarray',
    API: {
      STREAMS: '/api/streams',
      WEBSOCKET: '/api/websocket',
      SERVE: '/api/serve',
      FETCH: '/api/fetch',
      HTTP: '/api/http',
      UTILS: '/api/utils'
    } as const,
    GUIDES: {
      READ_FILE: '/guides/read-file',
      WRITE_FILE: '/guides/write-file',
      STREAMS: '/guides/streams',
      PERFORMANCE: '/guides/performance',
      DEPLOYMENT: '/guides/deployment'
    } as const,
    RUNTIME: {
      BINARY_DATA: '/runtime/binary-data',
      SHELL: '/runtime/shell',
      TRANSPILE: '/runtime/transpile'
    } as const,
    CLI: {
      BUNX: '/cli/bunx',
      PM: '/cli/pm',
      BUILD: '/cli/build'
    } as const
  } as const,
  
  // RSS feed configuration
  RSS: {
    UPDATE_INTERVAL: 60 * 60 * 1000, // 1 hour in milliseconds
    CACHE_FILE: '.cache/rss.json',
    MAX_ITEMS: 50
  } as const,
  
  // Cache configuration
  CACHE: {
    EXPIRY: 60 * 60 * 1000, // 1 hour
    DIR: '.cache',
    URLS_FILE: 'urls.json',
    RSS_FILE: 'rss.json'
  } as const,
  
  // Sitemap configuration
  SITEMAP: {
    FILE: 'public/sitemap.xml',
    CHANGEFREQ: {
      ALWAYS: 'always',
      HOURLY: 'hourly',
      DAILY: 'daily',
      WEEKLY: 'weekly',
      MONTHLY: 'monthly',
      YEARLY: 'yearly',
      NEVER: 'never'
    } as const
  } as const
} as const;

// URLPattern definitions for validation and parsing
export const URL_PATTERNS = {
  // General documentation pattern: /docs/:section/:subsection*
  DOCS: new URLPattern({
    protocol: 'https',
    hostname: 'bun.sh',
    pathname: '/docs/:section/:subsection*'
  }),
  
  // API pattern: /docs/api/:endpoint/:method*
  API: new URLPattern({
    protocol: 'https',
    hostname: 'bun.sh',
    pathname: '/docs/api/:endpoint/:method*'
  }),
  
  // Runtime pattern: /docs/runtime/:feature/:subfeature*
  RUNTIME: new URLPattern({
    protocol: 'https',
    hostname: 'bun.sh',
    pathname: '/docs/runtime/:feature/:subfeature*'
  }),
  
  // Guides pattern: /docs/guides/:guide/:section*
  GUIDES: new URLPattern({
    protocol: 'https',
    hostname: 'bun.sh',
    pathname: '/docs/guides/:guide/:section*'
  }),
  
  // CLI pattern: /docs/cli/:command/:subcommand*
  CLI: new URLPattern({
    protocol: 'https',
    hostname: 'bun.sh',
    pathname: '/docs/cli/:command/:subcommand*'
  }),
  
  // RSS pattern: /rss
  RSS: new URLPattern({
    protocol: 'https',
    hostname: 'bun.sh',
    pathname: '/rss'
  }),
  
  // Blog pattern: /blog
  BLOG: new URLPattern({
    protocol: 'https',
    hostname: 'bun.sh',
    pathname: '/blog'
  }),
  
  // Install pattern: /install
  INSTALL: new URLPattern({
    protocol: 'https',
    hostname: 'bun.sh',
    pathname: '/install'
  }),
  
  // GitHub pattern (for external references)
  GITHUB_ISSUE: new URLPattern({
    protocol: 'https',
    hostname: 'github.com',
    pathname: '/oven-sh/bun/issues/:id'
  }),
  
  GITHUB_PR: new URLPattern({
    protocol: 'https',
    hostname: 'github.com',
    pathname: '/oven-sh/bun/pull/:id'
  })
} as const;

// Export typed configuration
export type DocConfig = typeof DOC_CONFIG;
export type ApiEndpoint = keyof typeof DOC_CONFIG.PATHS.API;
export type GuideName = keyof typeof DOC_CONFIG.PATHS.GUIDES;
export type RuntimeFeature = keyof typeof DOC_CONFIG.PATHS.RUNTIME;
export type CliCommand = keyof typeof DOC_CONFIG.PATHS.CLI;
export type PatternName = keyof typeof URL_PATTERNS;

export const config = DOC_CONFIG;

/**
 * Validate and parse URL using URLPattern
 * Checks patterns in order of specificity (most specific first)
 */
export function validateAndParseUrl(url: string): {
  valid: boolean;
  pattern?: PatternName;
  groups?: Record<string, string>;
} {
  // Check most specific patterns first, then general ones
  // This prevents bypassing specific validation with general patterns
  const patternOrder: PatternName[] = [
    'GITHUB_PR',      // Most specific: GitHub pull requests
    'GITHUB_ISSUE',   // GitHub issues
    'API',            // API endpoints
    'RUNTIME',        // Runtime features  
    'GUIDES',         // Documentation guides
    'CLI',            // CLI commands
    'RSS',            // RSS feeds
    'BLOG',           // Blog posts
    'INSTALL',        // Installation pages
    'DOCS'            // General docs pattern (least specific)
  ];
  
  for (const patternName of patternOrder) {
    const pattern = URL_PATTERNS[patternName];
    const match = pattern.exec(url);
    if (match) {
      return {
        valid: true,
        pattern: patternName,
        groups: {
          ...match.pathname.groups,
          ...match.hash?.groups,
          ...match.search?.groups
        }
      };
    }
  }
  
  return { valid: false };
}

/**
 * Build URL with validation
 */
export function buildValidatedUrl(path: string, baseUrl?: string): string {
  const base = baseUrl || config.BASE_URL;
  const url = new URL(path, base);
  
  const validation = validateAndParseUrl(url.toString());
  if (!validation.valid) {
    console.warn(`⚠️ URL may not match known patterns: ${url.toString()}`);
  }
  
  return url.toString();
}

/**
 * Get environment-specific configuration
 */
export function getEnvConfig(): {
  baseUrl: string;
  feedUrl: string;
  cacheDir: string;
  isDevelopment: boolean;
  isProduction: boolean;
} {
  return {
    baseUrl: Bun.env.DOCS_BASE_URL || config.BASE_URL,
    feedUrl: Bun.env.RSS_FEED_URL || config.FEED_URL,
    cacheDir: Bun.env.CACHE_DIR || config.CACHE.DIR,
    isDevelopment: Bun.env.NODE_ENV === 'development',
    isProduction: Bun.env.NODE_ENV === 'production'
  };
}

/**
 * Check if running in Bun environment
 */
export function isBunEnvironment(): boolean {
  return typeof Bun !== 'undefined' && !!Bun.env;
}

/**
 * Get cache file path with environment override
 */
export function getCachePath(filename: string): string {
  const cacheDir = Bun.env.CACHE_DIR || config.CACHE.DIR;
  return `${cacheDir}/${filename}`;
}

/**
 * Initialize configuration with environment validation
 */
export function initializeConfig(): {
  config: DocConfig;
  env: ReturnType<typeof getEnvConfig>;
  patterns: typeof URL_PATTERNS;
  isBun: boolean;
} {
  const env = getEnvConfig();
  const isBun = isBunEnvironment();
  
  if (!isBun) {
    console.warn('⚠️ Not running in Bun environment, some features may be limited');
  }
  
  // Validate base URL
  try {
    new URL(env.baseUrl);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(`❌ Invalid base URL: ${env.baseUrl}`, errorMessage);
    throw new Error('Invalid base URL configuration');
  }
  
  return {
    config,
    env,
    patterns: URL_PATTERNS,
    isBun
  };
}

// Export default initialization
export default initializeConfig;

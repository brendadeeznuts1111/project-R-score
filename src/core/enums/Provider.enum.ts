// src/core/enums/Provider.enum.ts

// ============================================
// DOCUMENTATION PROVIDERS
// ============================================

export enum DocumentationProvider {
  // Official Bun sources
  BUN_OFFICIAL = 'bun_official',      // bun.sh
  BUN_COM = 'bun_com',                 // bun.com (future)
  BUN_GITHUB = 'bun_github',           // github.com/oven-sh/bun
  BUN_NPM = 'bun_npm',                 // npmjs.com/package/bun

  // Official partner sources
  VERCEL = 'vercel',
  NETLIFY = 'netlify',
  CLOUDFLARE = 'cloudflare',
  RAILWAY = 'railway',
  FLY_IO = 'fly_io',

  // Community sources
  DEV_TO = 'dev_to',
  MEDIUM = 'medium',
  HASHNODE = 'hashnode',
  REDDIT = 'reddit',
  DISCORD = 'discord',
  STACK_OVERFLOW = 'stack_overflow',

  // Package ecosystems
  NPM = 'npm',                         // All npm packages
  DENO_LAND = 'deno_land',
  JSR_IO = 'jsr_io',                   // JavaScript Registry

  // Other sources
  BLOG = 'blog',
  VIDEO = 'video',                     // YouTube, etc.
  COURSE = 'course',
  NEWSLETTER = 'newsletter',
}

// ============================================
// DOCUMENTATION CATEGORIES
// ============================================

export enum DocumentationCategory {
  // Core concepts
  GETTING_STARTED = 'getting_started',
  INTRODUCTION = 'introduction',
  COMPARISON = 'comparison',           // vs Node.js, Deno, etc.
  MIGRATION = 'migration',             // Migrating from other runtimes

  // Runtime features
  RUNTIME = 'runtime',
  BUILTINS = 'builtins',
  MODULES = 'modules',
  PACKAGE_MANAGER = 'package_manager',
  BUNDLER = 'bundler',
  TEST_RUNNER = 'test_runner',

  // APIs
  API = 'api',
  CLI = 'cli',
  CONFIGURATION = 'configuration',

  // Development
  DEVELOPMENT = 'development',
  DEBUGGING = 'debugging',
  TESTING = 'testing',
  PROFILING = 'profiling',
  OPTIMIZATION = 'optimization',
  SECURITY = 'security',

  // Performance
  PERFORMANCE = 'performance',
  BENCHMARKS = 'benchmarks',
  MONITORING = 'monitoring',
  METRICS = 'metrics',
  ANALYTICS = 'analytics',

  // Deployment
  DEPLOYMENT = 'deployment',
  CONTAINERS = 'containers',
  SERVERLESS = 'serverless',
  EDGE = 'edge',
  CI_CD = 'ci_cd',

  // Integrations
  INTEGRATIONS = 'integrations',
  FRAMEWORKS = 'frameworks',
  DATABASES = 'databases',
  AUTHENTICATION = 'authentication',
  CACHING = 'caching',

  // Guides & tutorials
  GUIDE = 'guide',
  TUTORIAL = 'tutorial',
  COOKBOOK = 'cookbook',
  RECIPES = 'recipes',
  EXAMPLES = 'examples',

  // Reference
  REFERENCE = 'reference',
  TYPES = 'types',
  INTERFACES = 'interfaces',
  CHANGELOG = 'changelog',
  UPGRADE_GUIDE = 'upgrade_guide',

  // Community
  COMMUNITY = 'community',
  SHOWCASE = 'showcase',
  CASE_STUDIES = 'case_studies',
  INTERVIEWS = 'interviews',

  // Troubleshooting
  TROUBLESHOOTING = 'troubleshooting',
  FAQ = 'faq',
  KNOWN_ISSUES = 'known_issues',
  WORKAROUNDS = 'workarounds',
}

// ============================================
// URL TYPES (Enhanced)
// ============================================

export enum UrlType {
  // Documentation
  DOCUMENTATION = 'documentation',
  API_REFERENCE = 'api_reference',
  GETTING_STARTED = 'getting_started',
  TUTORIAL = 'tutorial',
  GUIDE = 'guide',
  EXAMPLE = 'example',
  COOKBOOK = 'cookbook',

  // Code & Packages
  GITHUB_SOURCE = 'github_source',
  GITHUB_ISSUE = 'github_issue',
  GITHUB_PULL_REQUEST = 'github_pull_request',
  GITHUB_DISCUSSION = 'github_discussion',
  NPM_PACKAGE = 'npm_package',
  PACKAGE_JSON = 'package_json',
  TYPES_DEFINITIONS = 'types_definitions',

  // Media & Content
  BLOG_POST = 'blog_post',
  VIDEO_TUTORIAL = 'video_tutorial',
  PODCAST = 'podcast',
  NEWSLETTER = 'newsletter',
  CONFERENCE_TALK = 'conference_talk',

  // Social & Community
  DISCORD_THREAD = 'discord_thread',
  REDDIT_POST = 'reddit_post',
  TWITTER_THREAD = 'twitter_thread',
  DEV_TO_POST = 'dev_to_post',
  MEDIUM_ARTICLE = 'medium_article',
  STACK_OVERFLOW_QUESTION = 'stack_overflow_question',

  // Resources
  RSS_FEED = 'rss_feed',
  API_ENDPOINT = 'api_endpoint',
  GRAPHQL_ENDPOINT = 'graphql_endpoint',
  WEBHOOK = 'webhook',
  DOWNLOAD = 'download',

  // Tools
  PLAYGROUND = 'playground',
  SANDBOX = 'sandbox',
  REPL = 'repl',
  BENCHMARK = 'benchmark',
  DASHBOARD = 'dashboard',

  // External
  EXTERNAL_REFERENCE = 'external_reference',
  CROSS_LINK = 'cross_link',
  REDIRECT = 'redirect',
}

// ============================================
// CLI COMMAND TYPES (Enhanced)
// ============================================

export enum CliCommandType {
  // Project management
  INIT = 'init',
  CREATE = 'create',
  NEW = 'new',

  // Development
  RUN = 'run',
  DEV = 'dev',
  BUILD = 'build',
  COMPILE = 'compile',
  WATCH = 'watch',
  CHECK = 'check',

  // Testing
  TEST = 'test',
  COVERAGE = 'coverage',
  BENCH = 'bench',

  // Package management
  INSTALL = 'install',
  ADD = 'add',
  REMOVE = 'remove',
  UPDATE = 'update',
  UPGRADE = 'upgrade',
  LINK = 'link',
  UNLINK = 'unlink',

  // Dependency management
  AUDIT = 'audit',
  OUTDATED = 'outdated',
  LICENSES = 'licenses',

  // Tools
  LINT = 'lint',
  FORMAT = 'format',
  TYPE_CHECK = 'type_check',
  BUNDLE = 'bundle',
  MINIFY = 'minify',

  // Documentation
  DOCS = 'docs',
  DOCS_BUILD = 'docs_build',
  DOCS_SERVE = 'docs_serve',

  // Deployment
  DEPLOY = 'deploy',
  PUBLISH = 'publish',
  DEPLOY_PREVIEW = 'deploy_preview',

  // Debugging
  DEBUG = 'debug',
  INSPECT = 'inspect',
  TRACE = 'trace',
  PROFILE = 'profile',

  // Performance
  BENCHMARK = 'benchmark',
  STRESS_TEST = 'stress_test',
  LOAD_TEST = 'load_test',

  // Utilities
  CLEAN = 'clean',
  RESET = 'reset',
  INFO = 'info',
  VERSION = 'version',
  HELP = 'help',
}

// ============================================
// UTILITY FUNCTION CATEGORIES (Enhanced)
// ============================================

export enum UtilityFunctionCategory {
  // Core utilities
  CORE = 'core',
  PLATFORM = 'platform',
  ENVIRONMENT = 'environment',

  // File system
  FILE_SYSTEM = 'file_system',
  PATH = 'path',
  FS = 'fs',
  DIRECTORY = 'directory',
  GLOBBING = 'globbing',
  WATCHER = 'watcher',

  // Networking
  NETWORKING = 'networking',
  HTTP = 'http',
  WEBSOCKET = 'websocket',
  TCP = 'tcp',
  UDP = 'udp',
  DNS = 'dns',
  SSL_TLS = 'ssl_tls',

  // Data processing
  CONVERSION = 'conversion',
  SERIALIZATION = 'serialization',
  PARSING = 'parsing',
  VALIDATION = 'validation',
  FORMATTING = 'formatting',

  // Cryptography
  CRYPTOGRAPHY = 'cryptography',
  HASHING = 'hashing',
  ENCRYPTION = 'encryption',
  SIGNING = 'signing',
  RANDOM = 'random',

  // Process management
  PROCESS = 'process',
  CHILD_PROCESS = 'child_process',
  WORKER = 'worker',
  THREAD = 'thread',
  SIGNALS = 'signals',

  // Memory & performance
  MEMORY = 'memory',
  BUFFER = 'buffer',
  ARRAY_BUFFER = 'array_buffer',
  TYPED_ARRAYS = 'typed_arrays',

  // Date & time
  DATE_TIME = 'date_time',
  TIMERS = 'timers',
  SCHEDULING = 'scheduling',

  // Collections
  COLLECTIONS = 'collections',
  MAP = 'map',
  SET = 'set',
  WEAK_MAP = 'weak_map',
  WEAK_SET = 'weak_set',

  // Async & concurrency
  ASYNC = 'async',
  PROMISE = 'promise',
  ASYNC_ITERATOR = 'async_iterator',
  STREAMS = 'streams',

  // Internationalization
  I18N = 'i18n',
  LOCALE = 'locale',
  FORMATTING_INTL = 'formatting_intl',

  // Testing utilities
  TESTING_UTILS = 'testing_utils',
  ASSERTIONS = 'assertions',
  MOCKING = 'mocking',
  FIXTURES = 'fixtures',

  // Development utilities
  DEVELOPMENT_UTILS = 'development_utils',
  HOT_RELOAD = 'hot_reload',
  LIVE_RELOAD = 'live_reload',
  SOURCE_MAPS = 'source_maps',

  // Build utilities
  BUILD_UTILS = 'build_utils',
  BUNDLING = 'bundling',
  MINIFICATION = 'minification',
  TREE_SHAKING = 'tree_shaking',

  // Performance utilities
  PERFORMANCE_UTILS = 'performance_utils',
  PROFILING_UTILS = 'profiling_utils',
  BENCHMARKING = 'benchmarking',
  MONITORING = 'monitoring',

  // Error handling
  ERROR_HANDLING = 'error_handling',
  ERROR_TYPES = 'error_types',
  STACK_TRACES = 'stack_traces',
}

// ============================================
// PERFORMANCE & MONITORING ENUMS (NEW)
// ============================================

export enum PerformanceMetricType {
  // Timing metrics
  TTFB = 'ttfb',
  FCP = 'fcp',
  LCP = 'lcp',
  FID = 'fid',
  CLS = 'cls',
  INP = 'inp',

  // Resource metrics
  RESOURCE_SIZE = 'resource_size',
  TRANSFER_SIZE = 'transfer_size',
  COMPRESSION_RATIO = 'compression_ratio',
  CACHE_EFFICIENCY = 'cache_efficiency',

  // Network metrics
  DNS_TIME = 'dns_time',
  TCP_TIME = 'tcp_time',
  TLS_TIME = 'tls_time',
  REQUEST_TIME = 'request_time',
  RESPONSE_TIME = 'response_time',

  // Protocol metrics
  HTTP_VERSION = 'http_version',
  PROTOCOL = 'protocol',
  ALPN = 'alpn',

  // Server metrics
  REQUEST_RATE = 'request_rate',
  CONCURRENT_CONNECTIONS = 'concurrent_connections',
  MEMORY_USAGE = 'memory_usage',
  CPU_USAGE = 'cpu_usage',
}

export enum PerformanceAlertSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info',
}

export enum PerformanceAlertType {
  SLOW_TTFB = 'slow_ttfb',
  HIGH_LATENCY = 'high_latency',
  LARGE_TRANSFER = 'large_transfer',
  POOR_COMPRESSION = 'poor_compression',
  CACHE_MISS = 'cache_miss',
  PROTOCOL_ISSUE = 'protocol_issue',
  DNS_FAILURE = 'dns_failure',
  TLS_ERROR = 'tls_error',
  CONNECTION_ERROR = 'connection_error',
  SERVER_ERROR = 'server_error',
}

export enum ProtocolType {
  HTTP_1_0 = 'http_1_0',
  HTTP_1_1 = 'http_1_1',
  HTTP_2 = 'http_2',
  HTTP_3 = 'http_3',
  HTTPS = 'https',
  WS = 'ws',
  WSS = 'wss',
  GRPC = 'grpc',
  GRPCS = 'grpcs',
}

// ============================================
// SOCIAL MEDIA & SHARING ENUMS
// ============================================

export enum SocialMediaPlatform {
  TWITTER = 'twitter',
  DISCORD = 'discord',
  LINKEDIN = 'linkedin',
  MASTODON = 'mastodon',
  BLUESKY = 'bluesky',
  REDDIT = 'reddit',
  HACKER_NEWS = 'hacker_news',
  DEV_TO = 'dev_to',
  MEDIUM = 'medium',
  HASHNODE = 'hashnode',
  YOUTUBE = 'youtube',
  TWITCH = 'twitch',
  GITHUB = 'github',
  GITLAB = 'gitlab',
  SLACK = 'slack',
  TELEGRAM = 'telegram',
}

export enum SocialContentType {
  PERFORMANCE_REPORT = 'performance_report',
  ALERT = 'alert',
  UPDATE = 'update',
  TUTORIAL = 'tutorial',
  ANNOUNCEMENT = 'announcement',
  CASE_STUDY = 'case_study',
  BENCHMARK = 'benchmark',
  RELEASE = 'release',
  TIP = 'tip',
  POLL = 'poll',
  QUESTION = 'question',
}

export enum RSSFeedType {
  PERFORMANCE = 'performance',
  BLOG = 'blog',
  CHANGELOG = 'changelog',
  RELEASE_NOTES = 'release_notes',
  SECURITY_ADVISORIES = 'security_advisories',
  COMMUNITY_UPDATES = 'community_updates',
  TUTORIALS = 'tutorials',
  API_CHANGES = 'api_changes',
  DOC_UPDATES = 'doc_updates',
}

// ============================================
// DEPLOYMENT & INFRASTRUCTURE ENUMS
// ============================================

export enum DeploymentPlatform {
  VERCEL = 'vercel',
  NETLIFY = 'netlify',
  CLOUDFLARE = 'cloudflare',
  AWS = 'aws',
  GCP = 'gcp',
  AZURE = 'azure',
  DIGITAL_OCEAN = 'digital_ocean',
  HEROKU = 'heroku',
  RAILWAY = 'railway',
  FLY_IO = 'fly_io',
  RENDER = 'render',
  KUBERNETES = 'kubernetes',
  DOCKER = 'docker',
  LAMBDA = 'lambda',
  EDGE = 'edge',
}

export enum RuntimeEnvironment {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production',
  TEST = 'test',
  PREVIEW = 'preview',
  CANARY = 'canary',
}

// ============================================
// FRAMEWORK & INTEGRATION ENUMS
// ============================================

export enum FrameworkType {
  // Frontend frameworks
  REACT = 'react',
  VUE = 'vue',
  ANGULAR = 'angular',
  SVELTE = 'svelte',
  SOLID = 'solid',
  LIT = 'lit',

  // Fullstack frameworks
  NEXT_JS = 'next_js',
  NUXT = 'nuxt',
  SVELTEKIT = 'sveltekit',
  REMIX = 'remix',
  ASTRO = 'astro',

  // Backend frameworks
  EXPRESS = 'express',
  FASTIFY = 'fastify',
  HONO = 'hono',
  ELYSIA_JS = 'elysiajs',
  OAK = 'oak',

  // Meta-frameworks
  VITE = 'vite',
  TURBOPACK = 'turbopack',
  WEBPACK = 'webpack',
  ESBUILD = 'esbuild',
  SWC = 'swc',
}

export enum DatabaseType {
  RELATIONAL = 'relational',
  DOCUMENT = 'document',
  KEY_VALUE = 'key_value',
  GRAPH = 'graph',
  TIME_SERIES = 'time_series',
  VECTOR = 'vector',

  // Specific databases
  POSTGRESQL = 'postgresql',
  MYSQL = 'mysql',
  SQLITE = 'sqlite',
  MONGODB = 'mongodb',
  REDIS = 'redis',
  COUCHDB = 'couchdb',
  NEO4J = 'neo4j',
  INFLUXDB = 'influxdb',
}

// ============================================
// HELPER TYPES & INTERFACES
// ============================================

export interface DocumentationMetadata {
  provider: DocumentationProvider;
  category: DocumentationCategory;
  urlType: UrlType;
  title?: string;
  description?: string;
  keywords?: string[];
  lastUpdated?: Date;
  version?: string;
  tags?: string[];
  estimatedReadTime?: number; // in minutes
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

export interface PerformanceMetadata {
  protocol: ProtocolType;
  metrics: Record<PerformanceMetricType, number>;
  alerts: PerformanceAlertType[];
  severity: PerformanceAlertSeverity;
  recommendations: string[];
  timestamp: Date;
  environment: RuntimeEnvironment;
}

export interface SocialMetadata {
  platform: SocialMediaPlatform;
  contentType: SocialContentType;
  reach?: number;
  engagement?: number;
  tags?: string[];
  scheduledFor?: Date;
  publishedAt?: Date;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

export class EnumUtils {
  static getValues<T extends Record<string, string | number>>(enumObj: T): Array<T[keyof T]> {
    return Object.values(enumObj).filter(value => typeof value === 'string') as Array<T[keyof T]>;
  }

  static getKeys<T extends Record<string, string | number>>(enumObj: T): Array<keyof T> {
    return Object.keys(enumObj).filter(key => isNaN(Number(key))) as Array<keyof T>;
  }

  static getRandomValue<T extends Record<string, string | number>>(enumObj: T): T[keyof T] {
    const values = this.getValues(enumObj);
    return values[Math.floor(Math.random() * values.length)];
  }

  static isValidValue<T extends Record<string, string | number>>(
    enumObj: T,
    value: string | number,
  ): boolean {
    return this.getValues(enumObj).includes(value as T[keyof T]);
  }

  static getKeyFromValue<T extends Record<string, string | number>>(
    enumObj: T,
    value: string | number,
  ): keyof T | null {
    for (const [key, val] of Object.entries(enumObj)) {
      if (val === value) return key as keyof T;
    }
    return null;
  }
}

// ============================================
// MAPPING FUNCTIONS
// ============================================

export class DocumentationMapper {
  private static hostMatch(host: string, domain: string): boolean {
    return host === domain || host.endsWith('.' + domain);
  }

  static getProviderFromUrl(url: string): DocumentationProvider {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname;
      const pathname = parsed.pathname;

      if (this.hostMatch(host, 'bun.sh')) return DocumentationProvider.BUN_OFFICIAL;
      if (this.hostMatch(host, 'github.com') && pathname.startsWith('/oven-sh/bun')) return DocumentationProvider.BUN_GITHUB;
      if (this.hostMatch(host, 'npmjs.com') && pathname.startsWith('/package/bun')) return DocumentationProvider.BUN_NPM;
      if (this.hostMatch(host, 'vercel.com')) return DocumentationProvider.VERCEL;
      if (this.hostMatch(host, 'netlify.com')) return DocumentationProvider.NETLIFY;
      if (this.hostMatch(host, 'cloudflare.com')) return DocumentationProvider.CLOUDFLARE;
      if (this.hostMatch(host, 'railway.app')) return DocumentationProvider.RAILWAY;
      if (this.hostMatch(host, 'fly.io')) return DocumentationProvider.FLY_IO;
      if (this.hostMatch(host, 'dev.to')) return DocumentationProvider.DEV_TO;
      if (this.hostMatch(host, 'medium.com')) return DocumentationProvider.MEDIUM;
      if (this.hostMatch(host, 'hashnode.com')) return DocumentationProvider.HASHNODE;
      if (this.hostMatch(host, 'reddit.com')) return DocumentationProvider.REDDIT;
      if (this.hostMatch(host, 'discord.com')) return DocumentationProvider.DISCORD;
      if (this.hostMatch(host, 'stackoverflow.com')) return DocumentationProvider.STACK_OVERFLOW;
      if (this.hostMatch(host, 'youtube.com') || this.hostMatch(host, 'youtu.be')) return DocumentationProvider.VIDEO;
      if (this.hostMatch(host, 'npmjs.com')) return DocumentationProvider.NPM;
      if (this.hostMatch(host, 'deno.land')) return DocumentationProvider.DENO_LAND;
      if (this.hostMatch(host, 'jsr.io')) return DocumentationProvider.JSR_IO;
    } catch {
      // malformed URL
    }
    return DocumentationProvider.BLOG;
  }

  static getCategoryFromUrl(url: string): DocumentationCategory {
    try {
      const pathname = new URL(url).pathname.toLowerCase();

      if (pathname.includes('/getting-started')) return DocumentationCategory.GETTING_STARTED;
      if (pathname.includes('/docs/api')) return DocumentationCategory.API;
      if (pathname.includes('/docs/cli')) return DocumentationCategory.CLI;
      if (pathname.includes('/docs/runtime')) return DocumentationCategory.RUNTIME;
      if (pathname.includes('/docs/bundler')) return DocumentationCategory.BUNDLER;
      if (pathname.includes('/docs/test')) return DocumentationCategory.TEST_RUNNER;
      if (pathname.includes('/docs/package-manager')) return DocumentationCategory.PACKAGE_MANAGER;
      if (pathname.includes('/docs/install')) return DocumentationCategory.GETTING_STARTED;
      if (pathname.includes('/docs/performance')) return DocumentationCategory.PERFORMANCE;
      if (pathname.includes('/tutorial')) return DocumentationCategory.TUTORIAL;
      if (pathname.includes('/guide')) return DocumentationCategory.GUIDE;
      if (pathname.includes('/examples')) return DocumentationCategory.EXAMPLES;
      if (pathname.includes('/benchmarks')) return DocumentationCategory.BENCHMARKS;
      if (pathname.includes('/deployment')) return DocumentationCategory.DEPLOYMENT;
      if (pathname.includes('/integrations')) return DocumentationCategory.INTEGRATIONS;
      if (pathname.includes('/faq')) return DocumentationCategory.FAQ;
      if (pathname.includes('/changelog')) return DocumentationCategory.CHANGELOG;
    } catch {
      // malformed URL
    }
    return DocumentationCategory.REFERENCE;
  }

  static getUrlType(url: string): UrlType {
    try {
      const parsed = new URL(url);
      const pathname = parsed.pathname;
      const host = parsed.hostname;

      if (pathname.includes('/docs')) return UrlType.DOCUMENTATION;
      if (pathname.includes('/api/')) return UrlType.API_REFERENCE;
      if (pathname.includes('/issues/')) return UrlType.GITHUB_ISSUE;
      if (pathname.includes('/pull/')) return UrlType.GITHUB_PULL_REQUEST;
      if (pathname.includes('/discussions/')) return UrlType.GITHUB_DISCUSSION;
      if (pathname.includes('/package/')) return UrlType.NPM_PACKAGE;
      if (pathname.endsWith('.json')) return UrlType.PACKAGE_JSON;
      if (pathname.includes('/blog/')) return UrlType.BLOG_POST;
      if (pathname.includes('/watch')) return UrlType.VIDEO_TUTORIAL;
      if (pathname.includes('/rss') || pathname.includes('/feed')) return UrlType.RSS_FEED;

      // Hostname-based fallback
      if (this.hostMatch(host, 'github.com')) return UrlType.GITHUB_SOURCE;
      if (this.hostMatch(host, 'npmjs.com')) return UrlType.NPM_PACKAGE;
    } catch {
      // malformed URL
    }
    return UrlType.EXTERNAL_REFERENCE;
  }

  static getProtocolType(protocol: string): ProtocolType {
    const p = protocol.toLowerCase();

    if (p.includes('http/1.0')) return ProtocolType.HTTP_1_0;
    if (p.includes('http/1.1') || p === 'h1' || p === 'h1.1') return ProtocolType.HTTP_1_1;
    if (p.includes('http/2') || p === 'h2') return ProtocolType.HTTP_2;
    if (p.includes('http/3') || p === 'h3') return ProtocolType.HTTP_3;
    if (p.startsWith('https')) return ProtocolType.HTTPS;
    if (p === 'ws') return ProtocolType.WS;
    if (p === 'wss') return ProtocolType.WSS;
    if (p === 'grpc') return ProtocolType.GRPC;
    if (p === 'grpcs') return ProtocolType.GRPCS;

    return ProtocolType.HTTP_1_1;
  }
}

// ============================================
// TYPE GUARDS
// ============================================

export function isPerformanceAlertSeverity(value: unknown): value is PerformanceAlertSeverity {
  return Object.values(PerformanceAlertSeverity).includes(value as PerformanceAlertSeverity);
}

export function isDocumentationProvider(value: unknown): value is DocumentationProvider {
  return Object.values(DocumentationProvider).includes(value as DocumentationProvider);
}

export function isProtocolType(value: unknown): value is ProtocolType {
  return Object.values(ProtocolType).includes(value as ProtocolType);
}

// ============================================
// CONSTANTS & PRESETS
// ============================================

export const PERFORMANCE_THRESHOLDS = {
  TTFB: {
    excellent: 100,   // ms
    good: 200,
    needsImprovement: 500,
    poor: 1000,
  },
  COMPRESSION: {
    excellent: 0.8,   // ratio (80%)
    good: 0.6,
    needsImprovement: 0.4,
    poor: 0.2,
  },
  CACHE_HIT_RATIO: {
    excellent: 0.9,   // ratio (90%)
    good: 0.7,
    needsImprovement: 0.5,
    poor: 0.3,
  },
} as const;

export const SOCIAL_PLATFORM_CONFIGS: Record<SocialMediaPlatform, {
  maxLength: number;
  supportsImages: boolean;
  supportsVideo: boolean;
  supportsThreads: boolean;
}> = {
  [SocialMediaPlatform.TWITTER]: { maxLength: 280, supportsImages: true, supportsVideo: true, supportsThreads: true },
  [SocialMediaPlatform.DISCORD]: { maxLength: 2000, supportsImages: true, supportsVideo: true, supportsThreads: false },
  [SocialMediaPlatform.LINKEDIN]: { maxLength: 3000, supportsImages: true, supportsVideo: true, supportsThreads: true },
  [SocialMediaPlatform.MASTODON]: { maxLength: 500, supportsImages: true, supportsVideo: true, supportsThreads: true },
  [SocialMediaPlatform.BLUESKY]: { maxLength: 300, supportsImages: true, supportsVideo: true, supportsThreads: true },
  [SocialMediaPlatform.REDDIT]: { maxLength: 40000, supportsImages: true, supportsVideo: true, supportsThreads: true },
  [SocialMediaPlatform.HACKER_NEWS]: { maxLength: 2000, supportsImages: false, supportsVideo: false, supportsThreads: false },
  [SocialMediaPlatform.DEV_TO]: { maxLength: 100000, supportsImages: true, supportsVideo: true, supportsThreads: false },
  [SocialMediaPlatform.MEDIUM]: { maxLength: 100000, supportsImages: true, supportsVideo: true, supportsThreads: false },
  [SocialMediaPlatform.HASHNODE]: { maxLength: 100000, supportsImages: true, supportsVideo: true, supportsThreads: false },
  [SocialMediaPlatform.YOUTUBE]: { maxLength: 5000, supportsImages: true, supportsVideo: true, supportsThreads: true },
  [SocialMediaPlatform.TWITCH]: { maxLength: 500, supportsImages: true, supportsVideo: true, supportsThreads: false },
  [SocialMediaPlatform.GITHUB]: { maxLength: 65536, supportsImages: true, supportsVideo: false, supportsThreads: true },
  [SocialMediaPlatform.GITLAB]: { maxLength: 65536, supportsImages: true, supportsVideo: false, supportsThreads: true },
  [SocialMediaPlatform.SLACK]: { maxLength: 40000, supportsImages: true, supportsVideo: true, supportsThreads: true },
  [SocialMediaPlatform.TELEGRAM]: { maxLength: 4096, supportsImages: true, supportsVideo: true, supportsThreads: false },
};

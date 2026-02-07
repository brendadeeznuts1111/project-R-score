// lib/docs/constants/enums.ts — Canonical enum definitions (single source of truth)
//
// Merged superset from:
//   - lib/har-analyzer/domain-mapper.ts
//   - lib/docs/constants/domains.ts
//   - src/core/enums/Provider.enum.ts (dead code, absorbed here)
//   - lib/core/core-documentation.ts

// ─── Documentation Providers ─────────────────────────────────────────

export enum DocumentationProvider {
  // Official Bun sources
  BUN_OFFICIAL = 'bun_official',
  BUN_TYPES = 'bun_types',
  BUN_GITHUB = 'bun_github',
  BUN_NPM = 'bun_npm',

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
  NPM = 'npm',
  DENO_LAND = 'deno_land',
  JSR_IO = 'jsr_io',

  // External references
  MDN_WEB_DOCS = 'mdn_web_docs',
  NODE_JS = 'node_js',
  WEB_STANDARDS = 'web_standards',
  GITHUB_ENTERPRISE = 'github_enterprise',
  INTERNAL_WIKI = 'internal_wiki',

  // Specialized
  PERFORMANCE_GUIDES = 'performance_guides',
  SECURITY_DOCS = 'security_docs',
  API_REFERENCE = 'api_reference',
  COMMUNITY_BLOG = 'community_blog',
  RSS_FEEDS = 'rss_feeds',

  // Other
  BLOG = 'blog',
  VIDEO = 'video',
  COMMUNITY = 'community',
  GITHUB = 'github',

  // From Provider.enum.ts
  COURSE = 'course',
  NEWSLETTER = 'newsletter',

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
  COMMUNITY_RESOURCES = 'community_resources',
  /** @deprecated Use BUN_OFFICIAL instead */
  GITHUB_GIST = 'github_gist',
  /** @deprecated Use NPM instead */
  NPM_PACKAGES = 'npm_packages',
  /** @deprecated Use BUN_OFFICIAL instead */
  BUN_COM = 'bun_com',
}

// ─── Documentation Categories ────────────────────────────────────────

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

  // Shorthand aliases
  GUIDE = 'guide',
  API = 'api',
  RUNTIME = 'runtime',
  CLI = 'cli',
  UTILS = 'utils',
  WEBSITE = 'website',
  ASSET = 'asset',

  // Core (from domain-mapper.ts)
  GETTING_STARTED = 'getting_started',
  INTRODUCTION = 'introduction',
  COMPARISON = 'comparison',
  MIGRATION = 'migration',
  BUILTINS = 'builtins',
  MODULES = 'modules',
  PACKAGE_MANAGER = 'package_manager',
  BUNDLER = 'bundler',
  TEST_RUNNER = 'test_runner',
  CONFIGURATION = 'configuration',

  // Development (from domain-mapper.ts)
  DEVELOPMENT = 'development',
  DEBUGGING = 'debugging',
  TESTING = 'testing',
  PROFILING = 'profiling',
  OPTIMIZATION = 'optimization',
  SECURITY = 'security',

  // Performance (from domain-mapper.ts)
  PERFORMANCE = 'performance',
  BENCHMARKS = 'benchmarks',
  MONITORING = 'monitoring',
  METRICS = 'metrics',

  // Deployment (from domain-mapper.ts)
  DEPLOYMENT = 'deployment',
  CONTAINERS = 'containers',
  SERVERLESS = 'serverless',
  EDGE = 'edge',

  // Guides (from domain-mapper.ts)
  TUTORIAL = 'tutorial',
  COOKBOOK = 'cookbook',
  EXAMPLES = 'examples',

  // Reference (from domain-mapper.ts)
  REFERENCE = 'reference',
  TYPES = 'types',
  CHANGELOG = 'changelog',
  UPGRADE_GUIDE = 'upgrade_guide',

  // Community (from domain-mapper.ts)
  COMMUNITY = 'community',
  SHOWCASE = 'showcase',
  FAQ = 'faq',
  KNOWN_ISSUES = 'known_issues',

  // From Provider.enum.ts
  ANALYTICS = 'analytics',
  CI_CD = 'ci_cd',
  INTEGRATIONS = 'integrations',
  FRAMEWORKS = 'frameworks',
  DATABASES = 'databases',
  AUTHENTICATION = 'authentication',
  CACHING = 'caching',
  RECIPES = 'recipes',
  INTERFACES = 'interfaces',
  CASE_STUDIES = 'case_studies',
  INTERVIEWS = 'interviews',
  WORKAROUNDS = 'workarounds',

  // From core-documentation.ts
  CLI_TOOLS = 'cli_tools',

  // WebAssembly
  WEBASSEMBLY = 'webassembly',

  // Legacy/backward compatibility (deprecated)
  /** @deprecated Use API_REFERENCE instead */
  CLI_REFERENCE = 'cli_reference',
  /** @deprecated Use EXAMPLES_TUTORIALS instead */
  TUTORIALS = 'tutorials',
  /** @deprecated Use COMMUNITY_RESOURCES instead */
  RSS_FEEDS = 'rss_feeds',
  /** @deprecated Use COMMUNITY_RESOURCES instead */
  BLOG_POSTS = 'blog_posts',
  /** @deprecated Use COMMUNITY_RESOURCES instead */
  RELEASE_ANNOUNCEMENTS = 'release_announcements',
}

// ─── URL Types ───────────────────────────────────────────────────────

export enum UrlType {
  // Documentation
  DOCUMENTATION = 'documentation',
  API_REFERENCE = 'api_reference',
  TUTORIAL = 'tutorial',
  GUIDE = 'guide',
  EXAMPLE = 'example',

  // Code & packages
  GITHUB_SOURCE = 'github_source',
  GITHUB_ISSUE = 'github_issue',
  GITHUB_PULL_REQUEST = 'github_pull_request',
  GITHUB_DISCUSSION = 'github_discussion',
  NPM_PACKAGE = 'npm_package',

  // Media
  BLOG_POST = 'blog_post',
  VIDEO_TUTORIAL = 'video_tutorial',

  // Social
  STACK_OVERFLOW_QUESTION = 'stack_overflow_question',
  REDDIT_POST = 'reddit_post',
  DEV_TO_POST = 'dev_to_post',

  // Resources
  RSS_FEED = 'rss_feed',
  API_ENDPOINT = 'api_endpoint',
  DOWNLOAD = 'download',
  PLAYGROUND = 'playground',
  BENCHMARK = 'benchmark',

  // WebAssembly
  WASM_MODULE = 'wasm_module',

  // External
  EXTERNAL_REFERENCE = 'external_reference',

  // From domains.ts
  REPOSITORY = 'repository',
  PACKAGE = 'package',
  CDN = 'cdn',
  MARKETING = 'marketing',
  UNKNOWN = 'unknown',

  // From Provider.enum.ts
  GETTING_STARTED = 'getting_started',
  COOKBOOK = 'cookbook',
  PACKAGE_JSON = 'package_json',
  TYPES_DEFINITIONS = 'types_definitions',
  PODCAST = 'podcast',
  NEWSLETTER = 'newsletter',
  CONFERENCE_TALK = 'conference_talk',
  DISCORD_THREAD = 'discord_thread',
  TWITTER_THREAD = 'twitter_thread',
  MEDIUM_ARTICLE = 'medium_article',
  GRAPHQL_ENDPOINT = 'graphql_endpoint',
  WEBHOOK = 'webhook',
  SANDBOX = 'sandbox',
  REPL = 'repl',
  DASHBOARD = 'dashboard',
  CROSS_LINK = 'cross_link',
  REDIRECT = 'redirect',
}

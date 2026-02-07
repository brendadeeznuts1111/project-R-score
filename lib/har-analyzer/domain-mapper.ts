// lib/har-analyzer/domain-mapper.ts — Documentation-aware domain classification
// Maps URLs and HAR entries to provider, category, URL type, and domain type.

import type { DomainType, AssetGroup, TTFBGrade, SizeGrade } from "./types";

// ─── Documentation Providers ─────────────────────────────────────────

export enum DocumentationProvider {
  // Official Bun sources
  BUN_OFFICIAL = "bun_official",
  BUN_GITHUB = "bun_github",
  BUN_NPM = "bun_npm",

  // Official partner sources
  VERCEL = "vercel",
  NETLIFY = "netlify",
  CLOUDFLARE = "cloudflare",
  RAILWAY = "railway",
  FLY_IO = "fly_io",

  // Community sources
  DEV_TO = "dev_to",
  MEDIUM = "medium",
  HASHNODE = "hashnode",
  REDDIT = "reddit",
  DISCORD = "discord",
  STACK_OVERFLOW = "stack_overflow",

  // Package ecosystems
  NPM = "npm",
  DENO_LAND = "deno_land",
  JSR_IO = "jsr_io",

  // Other
  BLOG = "blog",
  VIDEO = "video",
  COMMUNITY = "community",
}

// ─── Documentation Categories ────────────────────────────────────────

export enum DocumentationCategory {
  // Core
  GETTING_STARTED = "getting_started",
  INTRODUCTION = "introduction",
  COMPARISON = "comparison",
  MIGRATION = "migration",

  // Runtime
  RUNTIME = "runtime",
  BUILTINS = "builtins",
  MODULES = "modules",
  PACKAGE_MANAGER = "package_manager",
  BUNDLER = "bundler",
  TEST_RUNNER = "test_runner",

  // APIs
  API = "api",
  CLI = "cli",
  CONFIGURATION = "configuration",

  // Development
  DEVELOPMENT = "development",
  DEBUGGING = "debugging",
  TESTING = "testing",
  PROFILING = "profiling",
  OPTIMIZATION = "optimization",
  SECURITY = "security",

  // Performance
  PERFORMANCE = "performance",
  BENCHMARKS = "benchmarks",
  MONITORING = "monitoring",
  METRICS = "metrics",

  // Deployment
  DEPLOYMENT = "deployment",
  CONTAINERS = "containers",
  SERVERLESS = "serverless",
  EDGE = "edge",

  // Guides
  GUIDE = "guide",
  TUTORIAL = "tutorial",
  COOKBOOK = "cookbook",
  EXAMPLES = "examples",

  // Reference
  REFERENCE = "reference",
  TYPES = "types",
  CHANGELOG = "changelog",
  UPGRADE_GUIDE = "upgrade_guide",

  // Community
  COMMUNITY = "community",
  SHOWCASE = "showcase",

  // Troubleshooting
  TROUBLESHOOTING = "troubleshooting",
  FAQ = "faq",
  KNOWN_ISSUES = "known_issues",
}

// ─── URL Types ───────────────────────────────────────────────────────

export enum UrlType {
  // Documentation
  DOCUMENTATION = "documentation",
  API_REFERENCE = "api_reference",
  TUTORIAL = "tutorial",
  GUIDE = "guide",
  EXAMPLE = "example",

  // Code & packages
  GITHUB_SOURCE = "github_source",
  GITHUB_ISSUE = "github_issue",
  GITHUB_PULL_REQUEST = "github_pull_request",
  GITHUB_DISCUSSION = "github_discussion",
  NPM_PACKAGE = "npm_package",

  // Media
  BLOG_POST = "blog_post",
  VIDEO_TUTORIAL = "video_tutorial",

  // Social
  STACK_OVERFLOW_QUESTION = "stack_overflow_question",
  REDDIT_POST = "reddit_post",
  DEV_TO_POST = "dev_to_post",

  // Resources
  RSS_FEED = "rss_feed",
  API_ENDPOINT = "api_endpoint",
  DOWNLOAD = "download",
  PLAYGROUND = "playground",
  BENCHMARK = "benchmark",

  // External
  EXTERNAL_REFERENCE = "external_reference",
}

// ─── Performance thresholds ──────────────────────────────────────────

export const PERFORMANCE_THRESHOLDS = {
  TTFB: {
    good: 200,
    needsImprovement: 500,
    poor: 1000,
  },
  SIZE: {
    small: 10_240,        // 10 KB
    medium: 102_400,      // 100 KB
    large: 512_000,       // 500 KB
    huge: 1_048_576,      // 1 MB
  },
  COMPRESSION: {
    good: 0.6,
    needsImprovement: 0.4,
    poor: 0.2,
  },
  CACHE_HIT_RATIO: {
    good: 0.7,
    needsImprovement: 0.5,
    poor: 0.3,
  },
} as const;

// ─── Known CDN hostnames ─────────────────────────────────────────────

const CDN_PATTERNS = [
  "cdn.", "static.", "assets.", "media.",
  "cloudfront.net", "akamaized.net", "fastly.net",
  "cloudflare.com", "cdnjs.cloudflare.com",
  "unpkg.com", "jsdelivr.net", "esm.sh",
  "googleapis.com", "gstatic.com",
  "fbcdn.net", "twimg.com",
];

const TRACKER_PATTERNS = [
  "google-analytics.com", "googletagmanager.com",
  "analytics.", "tracking.", "pixel.",
  "hotjar.com", "fullstory.com", "segment.com",
  "mixpanel.com", "amplitude.com",
  "facebook.net", "doubleclick.net",
  "sentry.io", "newrelic.com", "datadoghq.com",
];

// ─── Provider hostname map ───────────────────────────────────────────

const PROVIDER_MAP: [string, DocumentationProvider][] = [
  ["bun.sh", DocumentationProvider.BUN_OFFICIAL],
  ["github.com/oven-sh/bun", DocumentationProvider.BUN_GITHUB],
  ["npmjs.com/package/bun", DocumentationProvider.BUN_NPM],
  ["vercel.com", DocumentationProvider.VERCEL],
  ["netlify.com", DocumentationProvider.NETLIFY],
  ["cloudflare.com", DocumentationProvider.CLOUDFLARE],
  ["railway.app", DocumentationProvider.RAILWAY],
  ["fly.io", DocumentationProvider.FLY_IO],
  ["dev.to", DocumentationProvider.DEV_TO],
  ["medium.com", DocumentationProvider.MEDIUM],
  ["hashnode.com", DocumentationProvider.HASHNODE],
  ["reddit.com", DocumentationProvider.REDDIT],
  ["discord.com", DocumentationProvider.DISCORD],
  ["stackoverflow.com", DocumentationProvider.STACK_OVERFLOW],
  ["youtube.com", DocumentationProvider.VIDEO],
  ["youtu.be", DocumentationProvider.VIDEO],
  ["npmjs.com", DocumentationProvider.NPM],
  ["deno.land", DocumentationProvider.DENO_LAND],
  ["jsr.io", DocumentationProvider.JSR_IO],
];

// ─── Category pathname map ───────────────────────────────────────────

const CATEGORY_MAP: [string, DocumentationCategory][] = [
  ["/getting-started", DocumentationCategory.GETTING_STARTED],
  ["/docs/api", DocumentationCategory.API],
  ["/docs/cli", DocumentationCategory.CLI],
  ["/docs/runtime", DocumentationCategory.RUNTIME],
  ["/docs/bundler", DocumentationCategory.BUNDLER],
  ["/docs/test", DocumentationCategory.TEST_RUNNER],
  ["/docs/package-manager", DocumentationCategory.PACKAGE_MANAGER],
  ["/docs/install", DocumentationCategory.GETTING_STARTED],
  ["/docs/performance", DocumentationCategory.PERFORMANCE],
  ["/tutorial", DocumentationCategory.TUTORIAL],
  ["/guide", DocumentationCategory.GUIDE],
  ["/examples", DocumentationCategory.EXAMPLES],
  ["/benchmarks", DocumentationCategory.BENCHMARKS],
  ["/deployment", DocumentationCategory.DEPLOYMENT],
  ["/integrations", DocumentationCategory.GUIDE],
  ["/faq", DocumentationCategory.FAQ],
  ["/changelog", DocumentationCategory.CHANGELOG],
  ["/blog", DocumentationCategory.COMMUNITY],
];

// ─── URL type pathname map ───────────────────────────────────────────

const URL_TYPE_MAP: [string, UrlType][] = [
  ["/docs", UrlType.DOCUMENTATION],
  ["/api/", UrlType.API_REFERENCE],
  ["/issues/", UrlType.GITHUB_ISSUE],
  ["/pull/", UrlType.GITHUB_PULL_REQUEST],
  ["/discussions/", UrlType.GITHUB_DISCUSSION],
  ["/package/", UrlType.NPM_PACKAGE],
  ["/blog/", UrlType.BLOG_POST],
  ["/watch", UrlType.VIDEO_TUTORIAL],
  ["/questions/", UrlType.STACK_OVERFLOW_QUESTION],
  ["/rss", UrlType.RSS_FEED],
  ["/feed", UrlType.RSS_FEED],
];

// ─── Grading helpers ─────────────────────────────────────────────────

export function gradeTTFB(ms: number): TTFBGrade {
  if (ms <= PERFORMANCE_THRESHOLDS.TTFB.good) return "good";
  if (ms <= PERFORMANCE_THRESHOLDS.TTFB.needsImprovement) return "needs-improvement";
  return "poor";
}

export function gradeSize(bytes: number): SizeGrade {
  if (bytes <= PERFORMANCE_THRESHOLDS.SIZE.small) return "small";
  if (bytes <= PERFORMANCE_THRESHOLDS.SIZE.medium) return "medium";
  if (bytes <= PERFORMANCE_THRESHOLDS.SIZE.large) return "large";
  return "huge";
}

// ─── Domain classification ───────────────────────────────────────────

export function classifyDomain(entryHost: string, pageHost: string): DomainType {
  if (entryHost === pageHost) return "first-party";

  const lowerHost = entryHost.toLowerCase();
  if (TRACKER_PATTERNS.some((p) => lowerHost.includes(p))) return "tracker";
  if (CDN_PATTERNS.some((p) => lowerHost.includes(p))) return "cdn";

  return "third-party";
}

// ─── Asset group classification ──────────────────────────────────────

export function classifyAssetGroup(mimeType: string, isFirstRequest: boolean): AssetGroup {
  if (isFirstRequest) return "critical";

  const lower = mimeType.toLowerCase();
  if (lower.includes("text/html")) return "critical";
  if (lower.includes("text/css")) return "critical";

  // Render-blocking JS in <head>
  if (lower.includes("javascript")) return "important";

  // Fonts needed for first paint
  if (lower.includes("font/")) return "important";

  // Images, media, etc.
  if (lower.includes("image/")) return "async";
  if (lower.includes("video/") || lower.includes("audio/")) return "deferred";

  return "async";
}

// ─── DocumentationMapper ─────────────────────────────────────────────

export class DocumentationMapper {
  static getProvider(url: string): DocumentationProvider {
    try {
      const full = new URL(url).href;
      for (const [pattern, provider] of PROVIDER_MAP) {
        if (full.includes(pattern)) return provider;
      }
    } catch {
      // malformed URL
    }
    return DocumentationProvider.COMMUNITY;
  }

  static getCategory(url: string): DocumentationCategory {
    try {
      const pathname = new URL(url).pathname.toLowerCase();
      for (const [pattern, category] of CATEGORY_MAP) {
        if (pathname.includes(pattern)) return category;
      }
    } catch {
      // malformed URL
    }
    return DocumentationCategory.REFERENCE;
  }

  static getUrlType(url: string): UrlType {
    try {
      const pathname = new URL(url).pathname;
      for (const [pattern, urlType] of URL_TYPE_MAP) {
        if (pathname.includes(pattern)) return urlType;
      }
      // Hostname-based fallback
      const host = new URL(url).hostname;
      if (host.includes("github.com")) return UrlType.GITHUB_SOURCE;
      if (host.includes("npmjs.com")) return UrlType.NPM_PACKAGE;
    } catch {
      // malformed URL
    }
    return UrlType.EXTERNAL_REFERENCE;
  }

  static classify(url: string) {
    return {
      provider: this.getProvider(url),
      category: this.getCategory(url),
      urlType: this.getUrlType(url),
    };
  }
}

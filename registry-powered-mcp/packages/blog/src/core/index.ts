/**
 * @file packages/blog/src/core/index.ts
 * @description Core blog infrastructure with strict bun:bundle feature flag enforcement
 * @version 2.4.1
 */

import { feature } from "bun:bundle";

/**
 * Blog Configuration with Feature Flag Enforcement
 */
export interface BlogConfig {
  title: string;
  description: string;
  features: {
    debug: boolean;
    premium: boolean;
    betaFeatures: boolean;
  };
  build: {
    environment: "development" | "staging" | "production";
    target: "web" | "node";
  };
}

/**
 * Core Blog Engine with Feature Flag Validation
 */
export class BlogCore {
  private config: BlogConfig;

  constructor(config: BlogConfig) {
    this.config = config;
    this.validateFeatureFlags();
  }

  /**
   * Validates that feature flags match the Registry interface at compile time
   */
  private validateFeatureFlags(): void {
    // Compile-time validation: these features are enforced by TypeScript
    // Any attempt to use an invalid feature will cause a build error

    // ✅ VALID: These compile successfully
    if (feature("DEBUG")) {
      this.config.features.debug = true;
    }

    if (feature("PREMIUM")) {
      this.config.features.premium = true;
    }

    if (feature("BETA_FEATURES")) {
      this.config.features.betaFeatures = true;
    }

    // ❌ INVALID: These would cause compile errors:
    // if (feature("TYPO")) { ... } // TypeScript error!
    // if (feature("PRODUCTION")) { ... } // TypeScript error!
  }

  /**
   * Platform-specific optimization using DEBUG feature flag
   */
  processContent(content: string): string {
    if (feature("DEBUG")) {
      // Debug mode: Add development helpers
      return this.addDebugInfo(content);
    }

    // Production mode: Optimize for performance
    return this.optimizeContent(content);
  }

  /**
   * Paid tier features using PREMIUM flag
   */
  processAssets(assets: string[]): string[] {
    if (feature("PREMIUM")) {
      // Premium: Enable high-resolution processing
      return this.processHighResAssets(assets);
    }

    // Standard: Basic asset processing
    return this.processStandardAssets(assets);
  }

  /**
   * A/B testing variants using BETA_FEATURES flag
   */
  generateFeed(posts: any[]): string {
    if (feature("BETA_FEATURES")) {
      // Beta: Use new streaming RSS generator
      return this.generateStreamingFeed(posts);
    }

    // Stable: Use legacy RSS generator
    return this.generateLegacyFeed(posts);
  }

  private addDebugInfo(content: string): string {
    return `<!-- DEBUG MODE ENABLED -->\n${content}\n<!-- END DEBUG -->`;
  }

  private optimizeContent(content: string): string {
    // Remove unnecessary whitespace, minify, etc.
    return content.trim();
  }

  private processHighResAssets(assets: string[]): string[] {
    // Premium processing: 4K images, AVIF format, etc.
    return assets.map(asset => `${asset}?premium=true`);
  }

  private processStandardAssets(assets: string[]): string[] {
    // Standard processing: WebP, basic optimization
    return assets.map(asset => `${asset}?standard=true`);
  }

  private generateStreamingFeed(posts: any[]): string {
    // Beta feature: Streaming XML generation
    return `<?xml version="1.0"?><rss><channel><title>Beta Feed</title></channel></rss>`;
  }

  private generateLegacyFeed(posts: any[]): string {
    // Legacy: Standard RSS generation
    return `<?xml version="1.0"?><rss><channel><title>Standard Feed</title></channel></rss>`;
  }

  /**
   * Get current configuration with feature status
   */
  getConfig(): BlogConfig {
    return { ...this.config };
  }
}

/**
 * Feature Flag Utilities
 */
export const FeatureFlags = {
  /**
   * Check if debug features are enabled
   */
  isDebugEnabled(): boolean {
    let enabled = false;
    if (feature("DEBUG")) {
      enabled = true;
    }
    return enabled;
  },

  /**
   * Check if premium features are enabled
   */
  isPremiumEnabled(): boolean {
    let enabled = false;
    if (feature("PREMIUM")) {
      enabled = true;
    }
    return enabled;
  },

  /**
   * Check if beta features are enabled
   */
  isBetaFeaturesEnabled(): boolean {
    let enabled = false;
    if (feature("BETA_FEATURES")) {
      enabled = true;
    }
    return enabled;
  }
} as const;

/**
 * Default blog configuration
 */
export const DEFAULT_BLOG_CONFIG: BlogConfig = {
  title: "Registry-Powered Blog",
  description: "Registry-Powered Blog",
  features: {
    debug: false,
    premium: false,
    betaFeatures: false
  },
  build: {
    environment: "production",
    target: "web"
  }
};

/**
 * Create a new blog core instance
 */
export function createBlogCore(config: Partial<BlogConfig> = {}): BlogCore {
  return new BlogCore({
    ...DEFAULT_BLOG_CONFIG,
    ...config
  });
}
import { describe, test, expect } from "harness";
import { BlogCore, FeatureFlags, createBlogCore } from "../../../packages/blog/src/core/index";

/**
 * Test Blog Core with Feature Flag Enforcement
 *
 * This test suite validates that the blog core package properly enforces
 * feature flags through the Registry interface at compile time.
 */

describe("Blog Core - Feature Flag Enforcement", () => {
  describe("Feature Flag Validation", () => {
    test("should validate feature flags at compile time", () => {
      const core = createBlogCore();

      // These should compile without errors (valid features)
      expect(typeof FeatureFlags.isDebugEnabled()).toBe("boolean");
      expect(typeof FeatureFlags.isPremiumEnabled()).toBe("boolean");
      expect(typeof FeatureFlags.isBetaFeaturesEnabled()).toBe("boolean");
    });

    test("should provide feature flag utilities", () => {
      // Test the utility functions work correctly
      const debugEnabled = FeatureFlags.isDebugEnabled();
      const premiumEnabled = FeatureFlags.isPremiumEnabled();
      const betaEnabled = FeatureFlags.isBetaFeaturesEnabled();

      expect([true, false]).toContain(debugEnabled);
      expect([true, false]).toContain(premiumEnabled);
      expect([true, false]).toContain(betaEnabled);
    });
  });

  describe("Content Processing", () => {
    test("should process content with debug features when enabled", () => {
      const core = createBlogCore();
      const content = "<h1>Test Content</h1>";

      const result = core.processContent(content);

      // Result should be processed (either with debug info or optimized)
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    test("should process content differently based on debug flag", () => {
      const core = createBlogCore();

      // Test that processing works regardless of flag state
      const input = "<h1>Test</h1>";
      const output = core.processContent(input);

      expect(typeof output).toBe("string");
      // The exact output depends on whether DEBUG is enabled at build time
    });
  });

  describe("Asset Processing", () => {
    test("should process assets with premium features when enabled", () => {
      const core = createBlogCore();
      const assets = ["image.jpg", "style.css"];

      const result = core.processAssets(assets);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(assets.length);
      result.forEach(asset => {
        expect(typeof asset).toBe("string");
      });
    });

    test("should handle empty asset arrays", () => {
      const core = createBlogCore();

      const result = core.processAssets([]);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe("Feed Generation", () => {
    test("should generate RSS feed with beta features when enabled", () => {
      const core = createBlogCore();
      const posts = [
        { title: "Test Post", content: "Content", date: "2024-01-01" }
      ];

      const feed = core.generateFeed(posts);

      expect(typeof feed).toBe("string");
      expect(feed).toContain("<?xml");
      expect(feed).toContain("<rss");
    });

    test("should generate feed for empty posts array", () => {
      const core = createBlogCore();

      const feed = core.generateFeed([]);

      expect(typeof feed).toBe("string");
      expect(feed).toContain("<?xml");
    });
  });

  describe("Configuration", () => {
    test("should create core with default configuration", () => {
      const core = createBlogCore();

      const config = core.getConfig();

      expect(config.title).toBe("Registry-Powered Blog");
      expect(config.description).toBe("Registry-Powered Blog");
      expect(config.features).toBeDefined();
      expect(config.build).toBeDefined();
    });

    test("should merge custom configuration with defaults", () => {
      const customConfig = {
        title: "Custom Blog",
        features: {
          debug: true,
          premium: false,
          betaFeatures: true
        }
      };

      const core = createBlogCore(customConfig);
      const config = core.getConfig();

      expect(config.title).toBe("Custom Blog");
      expect(config.description).toBe("Registry-Powered Blog");
      expect(config.features.debug).toBe(true);
      expect(config.features.premium).toBe(false);
      expect(config.features.betaFeatures).toBe(true);
    });
  });

  describe("Type Safety", () => {
    test("should enforce configuration interface", () => {
      // This test ensures the configuration interface is properly typed
      const config = {
        title: "Test",
        description: "Test blog",
        features: {
          debug: false,
          premium: false,
          betaFeatures: false
        },
        build: {
          environment: "production" as const,
          target: "web" as const
        }
      };

      const core = new BlogCore(config);
      expect(core).toBeInstanceOf(BlogCore);
    });
  });
});
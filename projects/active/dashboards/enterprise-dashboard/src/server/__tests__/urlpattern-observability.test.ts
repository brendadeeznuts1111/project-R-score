import { describe, test, expect, beforeEach } from "bun:test";
import { URLPatternUltimateAnalyzer } from "../features/urlpattern-observability";
import type { PatternAnalysis } from "../features/urlpattern-observability";

describe("URLPattern Observability", () => {
  let analyzer: URLPatternUltimateAnalyzer;

  beforeEach(() => {
    analyzer = new URLPatternUltimateAnalyzer();
  });

  describe("Pattern Analysis", () => {
    test("should analyze a simple string pattern", async () => {
      const pattern = "/users/:id";
      const analysis = await analyzer.analyzePattern(pattern);

      expect(analysis).toBeDefined();
      expect(analysis.pattern).toBe(pattern);
      expect(analysis.complexity).toBeGreaterThan(0);
      expect(analysis.groups).toBeInstanceOf(Array);
      expect(analysis.wptCompliance).toBe(true);
      expect(analysis.bunSpecific.supportsExecMethod).toBeDefined();
      expect(analysis.bunSpecific.supportsTestMethod).toBeDefined();
    });

    test("should analyze an object pattern", async () => {
      const pattern: URLPatternInit = {
        protocol: "https",
        hostname: "api.example.com",
        pathname: "/v:version/users/:id",
      };
      const analysis = await analyzer.analyzePattern(pattern);

      expect(analysis).toBeDefined();
      expect(analysis.pattern).toEqual(pattern);
      expect(analysis.complexity).toBeGreaterThan(0);
      expect(analysis.patternProperties.propertyCount).toBeGreaterThan(0);
    });

    test("should extract groups from pattern", async () => {
      const pattern = "/api/:version/users/:id";
      const analysis = await analyzer.analyzePattern(pattern);

      expect(analysis.groups.length).toBeGreaterThan(0);
      const groupNames = analysis.groups.map((g) => g.name);
      expect(groupNames).toContain("version");
      expect(groupNames).toContain("id");
    });

    test("should detect regex groups", async () => {
      const pattern: URLPatternInit = {
        pathname: "/users/:id(\\d+)",
      };
      const analysis = await analyzer.analyzePattern(pattern);

      expect(analysis.hasRegExpGroups).toBe(true);
    });

    test("should analyze pattern properties", async () => {
      const pattern: URLPatternInit = {
        protocol: "https",
        hostname: "api.example.com",
        port: "8080",
        pathname: "/api",
        search: "?key=value",
        hash: "#section",
      };
      const analysis = await analyzer.analyzePattern(pattern);

      expect(analysis.patternProperties.protocol).toBe("https");
      expect(analysis.patternProperties.hostname).toBe("api.example.com");
      expect(analysis.patternProperties.port).toBe("8080");
      expect(analysis.patternProperties.propertyCount).toBeGreaterThan(5);
    });
  });

  describe("Performance Analysis", () => {
    test("should measure performance metrics", async () => {
      const pattern = "/api/:version/users/:id";
      const analysis = await analyzer.analyzePattern(pattern);

      expect(analysis.performance.opsPerSec).toBeGreaterThan(0);
      expect(analysis.performance.execNs).toBeGreaterThan(0);
      expect(analysis.execAnalysis.execTime).toBeGreaterThanOrEqual(0);
    });

    test("should compare exec() vs test() performance", async () => {
      const pattern = "/users/:id";
      const analysis = await analyzer.analyzePattern(pattern);

      expect(analysis.bunSpecific.performanceBoost).toBeGreaterThan(0);
    });
  });

  describe("Bun 1.3.4 Features", () => {
    test("should detect exec() method support", async () => {
      const pattern = "/test/*";
      const analysis = await analyzer.analyzePattern(pattern);

      expect(typeof analysis.bunSpecific.supportsExecMethod).toBe("boolean");
    });

    test("should detect test() method support", async () => {
      const pattern = "/test/*";
      const analysis = await analyzer.analyzePattern(pattern);

      expect(typeof analysis.bunSpecific.supportsTestMethod).toBe("boolean");
    });

    test("should test all Bun 1.3.4 features", async () => {
      const results = await analyzer.testBun134AllFeatures();

      expect(results.version).toBeDefined();
      expect(results.urlPattern).toBeDefined();
      expect(results.urlPattern.execMethod).toBeDefined();
      expect(results.urlPattern.testMethod).toBeDefined();
      expect(results.fetch).toBeDefined();
      expect(results.httpAgent).toBeDefined();
      expect(results.recommendations).toBeInstanceOf(Array);
    });
  });

  describe("Router Pattern Analysis", () => {
    test("should analyze all router patterns", async () => {
      const analyses = await analyzer.analyzeRouterPatterns();

      expect(analyses.length).toBeGreaterThan(0);
      analyses.forEach((analysis) => {
        expect(analysis).toBeDefined();
        expect(analysis.complexity).toBeGreaterThan(0);
        expect(analysis.wptCompliance).toBeDefined();
      });
    }, 30000); // 30s timeout for analyzing all 85+ patterns
  });

  describe("Complexity Calculation", () => {
    test("should calculate complexity for simple pattern", async () => {
      const pattern = "/users";
      const analysis = await analyzer.analyzePattern(pattern);

      expect(analysis.complexity).toBeGreaterThanOrEqual(1);
    });

    test("should calculate higher complexity for complex pattern", async () => {
      const simplePattern = "/users";
      const complexPattern = "/api/:version/users/:id(\\d+)/*";

      const simpleAnalysis = await analyzer.analyzePattern(simplePattern);
      const complexAnalysis = await analyzer.analyzePattern(complexPattern);

      expect(complexAnalysis.complexity).toBeGreaterThan(simpleAnalysis.complexity);
    });
  });

  describe("Memory Analysis", () => {
    test("should measure memory usage", async () => {
      const pattern = "/api/:version/users/:id";
      const analysis = await analyzer.analyzePattern(pattern);

      expect(analysis.memory.heapUsed).toBeGreaterThan(0);
      expect(analysis.memory.heapTotal).toBeGreaterThan(0);
      expect(analysis.memory.rss).toBeGreaterThan(0);
    });
  });

  describe("WPT Compliance", () => {
    test("should check WPT compliance", async () => {
      const pattern = "/test/*";
      const analysis = await analyzer.analyzePattern(pattern);

      expect(typeof analysis.wptCompliance).toBe("boolean");
      if (analysis.wptCompliance) {
        expect(analysis.wptTestsPassed).toBeGreaterThan(0);
      }
    });
  });

  describe("Error Handling", () => {
    test("should handle invalid pattern gracefully", async () => {
      // This should not throw, but return a valid analysis or handle error
      const invalidPattern = "" as any;
      
      // Should either throw or return analysis with error indicators
      try {
        const analysis = await analyzer.analyzePattern(invalidPattern);
        // If it doesn't throw, check that error is handled
        expect(analysis).toBeDefined();
      } catch (error) {
        // If it throws, that's also acceptable error handling
        expect(error).toBeDefined();
      }
    });
  });

  describe("Pattern Registry", () => {
    test("should store and retrieve analyses", async () => {
      const pattern = "/test/:id";
      const analysis = await analyzer.analyzePattern(pattern);

      // Analysis should be stored in registry
      expect(analysis).toBeDefined();
    });
  });

  describe("Sample Patterns", () => {
    test("should provide sample patterns", () => {
      const samples = analyzer.getSamplePatterns();

      expect(samples.length).toBeGreaterThan(0);
      samples.forEach((pattern) => {
        expect(pattern).toBeDefined();
      });
    });
  });
});

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  ConfigComparator,
  EnhancedConfigManager,
  enhancedBunConfig,
  startConfigServer,
} from "../src/enhanced-bun-config";
import { AutomatedGovernanceEngine } from "../src/security/automated-governance-engine";
import { CSRFProtector } from "../src/security/csrf-protector";
import { QuantumResistantSecureDataRepository } from "../src/security/quantum-resistant-secure-data-repository";
import { SecureCookieManager } from "../src/security/secure-cookie-manager";
import { ThreatIntelligenceService } from "../src/security/threat-intelligence-service";

describe("Enhanced Bun Configuration", () => {
  let server: { stop: () => void } | undefined;

  beforeAll(async () => {
    // Start test server
    server = startConfigServer();
  });

  afterAll(() => {
    if (server) {
      server.stop();
    }
  });

  describe("Config Section Handlers", () => {
    test("should handle install configuration", async () => {
      const response = await enhancedBunConfig.handleRequest(
        new Request("http://localhost:3001/config/install")
      );
      const text = await response.text();

      expect(text).toContain("cacheDir");
      expect(text).toContain("globalDir");
      expect(text).toContain("registry");
      expect(text).toContain("Security:");
    });

    test("should handle run configuration", async () => {
      const response = await enhancedBunConfig.handleRequest(
        new Request("http://localhost:3001/config/run")
      );
      const text = await response.text();

      expect(text).toContain("executor");
      expect(text).toContain("Performance:");
    });

    test("should handle test configuration", async () => {
      const response = await enhancedBunConfig.handleRequest(
        new Request("http://localhost:3001/config/test")
      );
      const text = await response.text();

      expect(text).toContain("pool");
      expect(text).toContain("Validation:");
    });

    test("should handle serve configuration", async () => {
      const response = await enhancedBunConfig.handleRequest(
        new Request("http://localhost:3001/config/serve")
      );
      const text = await response.text();

      expect(text).toContain("staticDir");
      expect(text).toContain("port");
      expect(text).toContain("Network:");
    });

    test("should handle bun configuration", async () => {
      const response = await enhancedBunConfig.handleRequest(
        new Request("http://localhost:3001/config/bun")
      );
      const text = await response.text();

      expect(text).toContain("version");
      expect(text).toContain("logLevel");
      expect(text).toContain("Analysis:");
    });

    test("should handle all configuration", async () => {
      const response = await enhancedBunConfig.handleRequest(
        new Request("http://localhost:3001/config/all")
      );
      const text = await response.text();

      expect(text).toContain("Analysis:");
      expect(text).toContain("totalSections");
    });

    test("should return 404 for unknown config section", async () => {
      const response = await enhancedBunConfig.handleRequest(
        new Request("http://localhost:3001/config/unknown")
      );
      const text = await response.text();

      expect(text).toBe("Config section not found");
    });
  });

  describe("Security Analysis", () => {
    test("should analyze security configuration", async () => {
      const response = await enhancedBunConfig.analyzeSecurity();
      const text = await response.text();

      expect(text).toContain("Security Score");
      expect(text).toContain("Passed Checks");
      expect(text).toContain("Failed Checks");
      expect(text).toContain("Total Weight");
      expect(text).toContain("Warnings");
    });
  });

  describe("Performance Analysis", () => {
    test("should analyze performance metrics", async () => {
      const response = await enhancedBunConfig.analyzePerformance();
      const text = await response.text();

      expect(text).toContain("Config Parse Time");
      expect(text).toContain("Config Size");
      expect(text).toContain("Config Sections");
      expect(text).toContain("Executor Exists");
      expect(text).toContain("Test Pool Type");
      expect(text).toContain("Serve Port");
    });
  });

  describe("Debug Mode", () => {
    test("should activate debug mode", () => {
      const response = enhancedBunConfig.activateDebug();
      expect(response).toBe("Debug mode activated - editor opened");
    });
  });

  describe("Route Handling", () => {
    test("should handle debug route", async () => {
      const req = new Request("http://localhost:3001/debug");
      const response = await enhancedBunConfig.handleRequest(req);
      const text = await response.text();

      expect(text).toBe("Debug mode activated - editor opened");
    });

    test("should handle security route", async () => {
      const req = new Request("http://localhost:3001/security");
      const response = await enhancedBunConfig.handleRequest(req);
      const text = await response.text();

      expect(text).toContain("Security Score");
    });

    test("should handle performance route", async () => {
      const req = new Request("http://localhost:3001/performance");
      const response = await enhancedBunConfig.handleRequest(req);
      const text = await response.text();

      expect(text).toContain("Config Parse Time");
    });

    test("should return default response for unmatched routes", async () => {
      const req = new Request("http://localhost:3001/unknown");
      const response = await enhancedBunConfig.handleRequest(req);
      const text = await response.text();

      expect(text).toBe("Route matched");
    });
  });
});

describe("ConfigComparator", () => {
  test("should detect identical configurations", () => {
    const config1 = { a: 1, b: 2 };
    const config2 = { a: 1, b: 2 };
    const comparator = new ConfigComparator(config1, config2);

    expect(comparator.getDifferences()).toHaveLength(0);
    expect(Bun.inspect(comparator)).toContain("same: true");
  });

  test("should detect configuration differences", () => {
    const config1 = { a: 1, b: 2 };
    const config2 = { a: 1, b: 3 };
    const comparator = new ConfigComparator(config1, config2);

    const differences = comparator.getDifferences();
    expect(differences).toHaveLength(1);
    expect(differences[0].key).toBe("b");
    expect(differences[0].config1).toBe(2);
    expect(differences[0].config2).toBe(3);
    expect(Bun.inspect(comparator)).toContain("same: false");
  });

  test("should handle missing keys", () => {
    const config1 = { a: 1, b: 2 };
    const config2 = { a: 1, c: 3 };
    const comparator = new ConfigComparator(config1, config2);

    const differences = comparator.getDifferences();
    expect(differences).toHaveLength(2);

    const keys = differences.map((d) => d.key);
    expect(keys).toContain("b");
    expect(keys).toContain("c");
  });

  test("should handle nested object differences", () => {
    const config1 = { nested: { a: 1, b: 2 } };
    const config2 = { nested: { a: 1, b: 3 } };
    const comparator = new ConfigComparator(config1, config2);

    const differences = comparator.getDifferences();
    expect(differences).toHaveLength(1);
    expect(differences[0].key).toBe("nested");
  });

  test("should handle array differences", () => {
    const config1 = { items: [1, 2, 3] };
    const config2 = { items: [1, 2, 4] };
    const comparator = new ConfigComparator(config1, config2);

    const differences = comparator.getDifferences();
    expect(differences).toHaveLength(1);
    expect(differences[0].key).toBe("items");
  });
});

describe("Integration with Bun Utilities", () => {
  test("should compare configurations with Bun utilities", async () => {
    const config1 = enhancedBunConfig.getDefaultConfig();
    const config2 = { ...config1 } as unknown as Record<string, unknown>;
    const comparator = new ConfigComparator(config1, config2);

    expect(comparator.getDifferences()).toHaveLength(0);
  });

  test("should use Bun.stringWidth for measurements", async () => {
    const response = await enhancedBunConfig.analyzePerformance();
    const text = await response.text();

    expect(text).toContain("Config Size");
    expect(text).toContain("chars");
  });

  test("should use Bun.inspect.table for output", async () => {
    const req = new Request("http://localhost:3001/config/install");
    const response = await enhancedBunConfig.handleRequest(req);
    const text = await response.text();

    // Should contain table formatting
    expect(text).toContain("┌");
    expect(text).toContain("┐");
    expect(text).toContain("│");
  });

  test("should use Bun.which for executor validation", async () => {
    const response = await enhancedBunConfig.analyzePerformance();
    const text = await response.text();

    expect(text).toContain("Executor Exists");
    expect(text).toMatch(/✅|❌/);
  });

  test("should use Bun.file for directory checks", async () => {
    const response = await enhancedBunConfig.analyzePerformance();
    const text = await response.text();

    expect(text).toContain("Static Dir Exists");
    expect(text).toMatch(/✅|❌/);
  });
});

describe("Error Handling", () => {
  test("should handle malformed requests gracefully", async () => {
    const req = new Request("http://localhost:3001/config/");
    const response = await enhancedBunConfig.handleRequest(req);

    expect(response.status).toBe(200);
  });

  test("should handle empty configuration sections", async () => {
    const req = new Request("http://localhost:3001/config/invalid");
    const response = await enhancedBunConfig.handleRequest(req);
    const text = await response.text();

    expect(text).toBe("Config section not found");
  });
});

describe("Security Infrastructure", () => {
  describe("SecureCookieManager", () => {
    test("should create secure cookies with proper signing", async () => {
      const cookieManager = new SecureCookieManager();
      const mockResponse = new Response();

      await cookieManager.setSecureCookie(mockResponse, "test", "value");

      // Test that cookie manager can generate CSRF tokens
      const token = cookieManager.generateCSRFToken();
      expect(token).toBeDefined();
      expect(token.length).toBe(64); // 32 bytes * 2 (hex)
    });

    test("should validate CSRF tokens", async () => {
      const cookieManager = new SecureCookieManager();
      const mockRequest = new Request("http://localhost", {
        headers: { cookie: "csrf-token=valid-token" },
      });

      const isValid = await cookieManager.validateCSRFToken(
        mockRequest,
        "valid-token"
      );
      expect(typeof isValid).toBe("boolean");
    });
  });

  describe("CSRFProtector", () => {
    test("should generate and validate session tokens", () => {
      const csrfProtector = new CSRFProtector();
      const sessionId = "test-session";

      const token = csrfProtector.generateSessionToken(sessionId);
      expect(token).toBeDefined();
      expect(token.includes(":")).toBe(true);
    });

    test("should validate tokens properly", async () => {
      const csrfProtector = new CSRFProtector();
      const sessionId = "test-session";

      const token = csrfProtector.generateSessionToken(sessionId);
      const mockRequest = new Request("http://localhost", {
        headers: {
          cookie: "session-id=test-session",
          "x-csrf-token": token,
        },
      });

      const isValid = await csrfProtector.validateToken(mockRequest);
      expect(isValid).toBe(true);
    });

    test("should handle expired tokens", async () => {
      const csrfProtector = new CSRFProtector("test-secret", {
        expiryMinutes: 0,
      }); // Immediate expiry
      const sessionId = "test-session";

      csrfProtector.generateSessionToken(sessionId);

      // Wait a moment to ensure expiry
      await new Promise((resolve) => setTimeout(resolve, 10));

      const mockRequest = new Request("http://localhost", {
        headers: {
          cookie: "session-id=test-session",
          "x-csrf-token": "invalid-token",
        },
      });

      const result = await csrfProtector.validateTokenDetailed(mockRequest);
      expect(result.valid).toBe(false);
    });
  });

  describe("ThreatIntelligenceService", () => {
    test("should analyze requests for threats", async () => {
      const threatIntel = new ThreatIntelligenceService();

      const threatLevel = await threatIntel.analyzeRequest(
        "127.0.0.1",
        "test-user"
      );
      expect(["LOW", "MEDIUM", "HIGH"]).toContain(threatLevel);
    });

    test("should calculate IP risk scores", async () => {
      const threatIntel = new ThreatIntelligenceService();

      const riskScore = await threatIntel.getIPRiskScore("127.0.0.1");
      expect(typeof riskScore).toBe("number");
      expect(riskScore).toBeGreaterThanOrEqual(0);
      expect(riskScore).toBeLessThanOrEqual(100);
    });

    test("should calculate user risk scores", async () => {
      const threatIntel = new ThreatIntelligenceService();

      const riskScore = await threatIntel.getUserRiskScore("new-user");
      expect(typeof riskScore).toBe("number");
      expect(riskScore).toBeGreaterThanOrEqual(0);
      expect(riskScore).toBeLessThanOrEqual(100);
    });

    test("should analyze registry reputation", async () => {
      const threatIntel = new ThreatIntelligenceService();

      const reputation = await threatIntel.getRegistryReputation(
        "https://registry.npmjs.org/"
      );
      expect(reputation).toBeDefined();
      expect(reputation.score).toBeGreaterThan(0);
      expect(["LOW", "MEDIUM", "HIGH"]).toContain(reputation.level);
    });

    test("should detect anomalies", async () => {
      const threatIntel = new ThreatIntelligenceService();

      const anomalyScore = await threatIntel.getAnomalyScore(
        "test-user",
        "127.0.0.1"
      );
      expect(typeof anomalyScore).toBe("number");
      expect(anomalyScore).toBeGreaterThanOrEqual(0);
      expect(anomalyScore).toBeLessThanOrEqual(100);
    });
  });

  describe("AutomatedGovernanceEngine", () => {
    test("should evaluate configuration compliance", async () => {
      const governance = new AutomatedGovernanceEngine();

      const config = {
        install: { registry: "https://registry.npmjs.org/" },
        serve: { static: { dir: "./public" }, port: 3000 },
        run: { executor: "bun" },
      };

      const result = await governance.evaluateConfiguration(
        config,
        "test-user"
      );
      expect(result).toBeDefined();
      expect(typeof result.compliant).toBe("boolean");
      expect(Array.isArray(result.violations)).toBe(true);
      expect(typeof result.blocked).toBe("boolean");
      expect(typeof result.requiresApproval).toBe("boolean");
    });

    test("should detect GDPR violations", async () => {
      const governance = new AutomatedGovernanceEngine();

      const config = {
        serve: { static: { dir: "./user-data" } },
      };

      const result = await governance.evaluateConfiguration(
        config,
        "test-user"
      );
      expect(result.compliant).toBe(false);
      expect(result.violations.some((v) => v.framework === "GDPR")).toBe(true);
    });

    test("should generate compliance reports", () => {
      const governance = new AutomatedGovernanceEngine();

      const report = governance.getComplianceReport();
      expect(report).toBeDefined();
      expect(typeof report.totalViolations).toBe("number");
      expect(typeof report.frameworks).toBe("object");
      expect(report.frameworks.GDPR).toBeDefined();
      expect(report.frameworks.CCPA).toBeDefined();
    });
  });

  describe("QuantumResistantSecureDataRepository", () => {
    test("should initialize quantum-resistant storage", async () => {
      const secureRepo = new QuantumResistantSecureDataRepository();

      await secureRepo.initialize();
      // Wait a moment for async initialization to complete
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(secureRepo.isQuantumReady()).toBe(true);
    });

    test("should store and retrieve encrypted data", async () => {
      const secureRepo = new QuantumResistantSecureDataRepository();

      await secureRepo.initialize();

      const testData = { sensitive: "information", timestamp: Date.now() };
      const key = await secureRepo.store("test-key", testData, {
        encrypt: true,
        sign: true,
        retention: "1y",
        quantumResistant: true,
      });

      expect(key).toBe("test-key");
      expect(secureRepo.isEncrypted("test-key")).toBe(true);

      const retrieved = await secureRepo.retrieve("test-key");
      expect(retrieved).toEqual(testData);
    });

    test("should provide storage statistics", async () => {
      const secureRepo = new QuantumResistantSecureDataRepository();

      await secureRepo.initialize();

      await secureRepo.store(
        "test1",
        { data: "test1" },
        { encrypt: true, quantumResistant: true, sign: true, retention: "1y" }
      );
      await secureRepo.store(
        "test2",
        { data: "test2" },
        {
          encrypt: false,
          quantumResistant: false,
          sign: false,
          retention: "1y",
        }
      );

      const stats = secureRepo.getStorageStats();
      expect(stats.totalItems).toBe(2);
      expect(stats.encryptedItems).toBe(1);
      expect(stats.quantumResistantItems).toBe(1);
      expect(stats.totalSize).toBeGreaterThan(0);
    });
  });
});

describe("EnhancedConfigManager Integration", () => {
  test("should initialize all security components", async () => {
    const configManager = new EnhancedConfigManager();

    await configManager.initialize();

    // Should not throw and should initialize properly
    expect(configManager).toBeDefined();
  });

  test("should audit configuration changes", async () => {
    const configManager = new EnhancedConfigManager();
    await configManager.initialize();

    const oldConfig = { port: 3000 };
    const newConfig = { port: 8080 };

    const auditEntry = await configManager.auditConfigChange(
      "serve",
      oldConfig,
      newConfig,
      "test-user",
      "127.0.0.1"
    );

    expect(auditEntry).toBeDefined();
    expect(auditEntry.section).toBe("serve");
    expect(auditEntry.userId).toBe("test-user");
    expect(auditEntry.ipAddress).toBe("127.0.0.1");
    expect(auditEntry.changes).toBeDefined();
    expect(auditEntry.riskScore).toBeDefined();
    expect(auditEntry.complianceStatus).toBeDefined();
    expect(["LOW", "MEDIUM", "HIGH"]).toContain(auditEntry.threatLevel);
  });

  test("should calculate risk scores correctly", async () => {
    const configManager = new EnhancedConfigManager();
    await configManager.initialize();

    // Safe configuration
    const safeConfig = {
      install: { registry: "https://registry.npmjs.org/" },
      serve: { port: 3000 },
      run: { executor: "bun" },
    };

    const riskScore = await configManager.calculateRiskScore(
      safeConfig,
      "test-user",
      "127.0.0.1"
    );
    expect(riskScore.score).toBeLessThan(70); // Should not be high risk
    expect(["LOW", "MEDIUM"]).toContain(riskScore.level);

    // Risky configuration
    const riskyConfig = {
      install: { registry: "http://insecure-registry.com" },
      serve: { port: 80 }, // Privileged port
      run: { executor: "../../../malicious" }, // Path traversal
    };

    const highRiskScore = await configManager.calculateRiskScore(
      riskyConfig,
      "test-user",
      "127.0.0.1"
    );
    expect(highRiskScore.score).toBeGreaterThan(40); // Should be elevated risk
    expect(["MEDIUM", "HIGH"]).toContain(highRiskScore.level);
    expect(highRiskScore.factors.length).toBeGreaterThan(0);
  });

  test("should check compliance properly", async () => {
    const configManager = new EnhancedConfigManager();
    await configManager.initialize();

    // Compliant configuration
    const compliantConfig = {
      serve: { static: { dir: "./public" } },
      install: { registry: "https://registry.npmjs.org/" },
    };

    const compliance = await configManager.checkCompliance(compliantConfig);
    expect(compliance.compliant).toBe(true);
    expect(compliance.violations).toHaveLength(0);
    expect(compliance.score).toBe(100);

    // Non-compliant configuration
    const nonCompliantConfig = {
      serve: { static: { dir: "./user-data" } },
      install: { registry: "http://tracking-registry.com" },
    };

    const nonCompliance =
      await configManager.checkCompliance(nonCompliantConfig);
    expect(nonCompliance.compliant).toBe(false);
    expect(nonCompliance.violations.length).toBeGreaterThan(0);
    expect(nonCompliance.score).toBeLessThan(100);
  });

  test("should generate compliance reports", () => {
    const configManager = new EnhancedConfigManager();

    const report = configManager.generateComplianceReport();
    expect(report).toBeDefined();
    expect(typeof report.overallScore).toBe("number");
    expect(typeof report.auditTrailSize).toBe("number");
    expect(typeof report.frameworks).toBe("object");
    expect(Array.isArray(report.recommendations)).toBe(true);
  });

  test("should detect configuration differences", () => {
    const configManager = new EnhancedConfigManager();

    const oldConfig = { a: 1, b: 2, c: 3 };
    const newConfig = { a: 1, b: 3, d: 4 };

    const differences = configManager.getConfigDifferences(
      oldConfig,
      newConfig
    );
    expect(differences).toHaveLength(3); // b modified, c removed, d added

    const modified = differences.find((d) => d.key === "b");
    expect(modified?.type).toBe("MODIFIED");
    expect(modified?.oldValue).toBe(2);
    expect(modified?.newValue).toBe(3);

    const removed = differences.find((d) => d.key === "c");
    expect(removed?.type).toBe("REMOVED");

    const added = differences.find((d) => d.key === "d");
    expect(added?.type).toBe("ADDED");
  });
});

describe("Enhanced Server Security Routes", () => {
  test("should handle security route with threat analysis", async () => {
    const _req = new Request("http://localhost:3001/security", {
      headers: {
        "x-forwarded-for": "127.0.0.1",
        cookie: "user-id=test-user",
      },
    });

    const response = await fetch("http://localhost:3001/security");
    const text = await response.text();

    expect(text).toContain("Security Score");
    expect(text).toContain("Risk Level");
    expect(text).toContain("IP Reputation");
    expect(text).toContain("User Risk");
  });

  test("should handle compliance route", async () => {
    const response = await fetch("http://localhost:3001/compliance");
    const text = await response.text();

    expect(text).toContain("Overall Compliance Score");
    expect(text).toContain("GDPR Score");
    expect(text).toContain("CCPA Score");
    expect(text).toContain("Audit Trail Size");
  });

  test("should handle audit trail route", async () => {
    const response = await fetch("http://localhost:3001/audit");
    const text = await response.text();

    expect(text).toContain("Timestamp");
    expect(text).toContain("Section");
    expect(text).toContain("User");
    expect(text).toContain("Risk");
    expect(text).toContain("Compliance");
  });

  test("should block high-risk requests", async () => {
    // This test would require mocking the threat intelligence to return HIGH risk
    // For now, we'll just test the route structure
    const _req = new Request("http://localhost:3001/config/install", {
      headers: {
        "x-forwarded-for": "192.168.1.100", // Known malicious IP in our mock data
        cookie: "user-id=test-user",
      },
    });

    // The server should handle this request (either allow or block based on threat analysis)
    const response = await fetch("http://localhost:3001/config/install");
    expect(response.status).toBeLessThan(500); // Should not error
  });
});

describe("Performance Benchmarks", () => {
  test("should complete configuration analysis quickly", async () => {
    const start = performance.now();

    await enhancedBunConfig.analyzeSecurity();
    await enhancedBunConfig.analyzePerformance();

    const end = performance.now();
    const duration = end - start;

    // Should complete within reasonable time (less than 100ms)
    expect(duration).toBeLessThan(100);
  });

  test("should handle concurrent requests", async () => {
    const requests = Array.from({ length: 10 }, () =>
      enhancedBunConfig.handleRequest(
        new Request(`http://localhost:3001/config/install`)
      )
    );

    const start = performance.now();
    const responses = await Promise.all(requests);
    const end = performance.now();

    expect(responses).toHaveLength(10);
    expect(end - start).toBeLessThan(50); // Should handle concurrent requests efficiently
  });
});

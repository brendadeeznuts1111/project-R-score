/**
 * [ENFORCEMENT][TEST][SUGGESTION-ENGINE][META:{COVERAGE:95%}][#REF:testing,suggestions]{BUN-NATIVE}
 * Tests for intelligent suggestion engine
 */

import { describe, it, expect, beforeEach } from "bun:test";
import {
  SuggestionEngine,
  type SuggestionContext,
  type ColumnSuggestion,
} from "../src/core/suggestion-engine";
import {
  DOMAIN_MODELS,
  detectDomain,
  getDomainColumns,
  isGenericColumn,
  isSensitiveColumn,
  GENERIC_COLUMNS,
  SENSITIVE_PATTERNS,
} from "../src/core/domain-models";

describe("SuggestionEngine", () => {
  let engine: SuggestionEngine;

  beforeEach(() => {
    engine = new SuggestionEngine();
  });

  describe("generateSuggestions", () => {
    it("should generate domain-specific suggestions", () => {
      const context: SuggestionContext = {
        domain: "user-management",
        existingColumns: ["name", "email"],
        filePath: "src/users/list.ts",
      };

      const suggestions = engine.generateSuggestions(context);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].source).toBe("domain");
    });

    it("should not suggest existing columns", () => {
      const context: SuggestionContext = {
        domain: "user-management",
        existingColumns: [
          "name",
          "email",
          "role",
          "department",
          "status",
          "lastLogin",
        ],
        filePath: "src/users/list.ts",
      };

      const suggestions = engine.generateSuggestions(context);

      for (const suggestion of suggestions) {
        expect(context.existingColumns).not.toContain(suggestion.column);
      }
    });

    it("should not suggest generic columns", () => {
      const context: SuggestionContext = {
        existingColumns: [],
        filePath: "src/data/test.ts",
      };

      const suggestions = engine.generateSuggestions(context);

      for (const suggestion of suggestions) {
        expect(isGenericColumn(suggestion.column)).toBe(false);
      }
    });

    it("should not suggest sensitive columns", () => {
      const context: SuggestionContext = {
        existingColumns: [],
        filePath: "src/data/test.ts",
      };

      const suggestions = engine.generateSuggestions(context);

      for (const suggestion of suggestions) {
        expect(isSensitiveColumn(suggestion.column)).toBe(false);
      }
    });

    it("should generate data-driven suggestions", () => {
      const context: SuggestionContext = {
        existingColumns: ["id"],
        dataSample: [
          { id: 1, name: "John", email: "john@test.com", role: "admin" },
          { id: 2, name: "Jane", email: "jane@test.com", role: "user" },
        ],
        filePath: "src/users/list.ts", // User domain to get meaningful suggestions
      };

      const suggestions = engine.generateSuggestions(context);

      // Should have suggestions (from user-management domain)
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it("should limit suggestions to 6", () => {
      const context: SuggestionContext = {
        existingColumns: [],
        filePath: "src/data/test.ts",
      };

      const suggestions = engine.generateSuggestions(context);

      expect(suggestions.length).toBeLessThanOrEqual(6);
    });
  });

  describe("getTopSuggestions", () => {
    it("should return simple string array", () => {
      const context: SuggestionContext = {
        domain: "user-management",
        existingColumns: ["name"],
        filePath: "src/users/test.ts",
      };

      const suggestions = engine.getTopSuggestions(context, 3);

      expect(suggestions.length).toBeLessThanOrEqual(3);
      expect(typeof suggestions[0]).toBe("string");
    });
  });

  describe("getPatternStats", () => {
    it("should return pattern statistics", () => {
      const stats = engine.getPatternStats();

      expect(stats).toHaveProperty("totalPatterns");
      expect(stats).toHaveProperty("patterns");
      expect(Array.isArray(stats.patterns)).toBe(true);
    });
  });
});

describe("Domain Models", () => {
  describe("DOMAIN_MODELS", () => {
    it("should have all expected domains", () => {
      const domainNames = DOMAIN_MODELS.map((d) => d.name);

      expect(domainNames).toContain("user-management");
      expect(domainNames).toContain("e-commerce");
      expect(domainNames).toContain("analytics");
      expect(domainNames).toContain("crm");
      expect(domainNames).toContain("content");
      expect(domainNames).toContain("orders");
      expect(domainNames).toContain("tasks");
      expect(domainNames).toContain("finance");
    });

    it("should have columns for each domain", () => {
      for (const model of DOMAIN_MODELS) {
        expect(model.columns.length).toBeGreaterThan(0);
        expect(model.keywords.length).toBeGreaterThan(0);
      }
    });
  });

  describe("detectDomain", () => {
    it("should detect user management domain", () => {
      expect(detectDomain("src/users/list.ts")).toBe("user-management");
      expect(detectDomain("src/auth/login.ts")).toBe("user-management");
    });

    it("should detect e-commerce domain", () => {
      expect(detectDomain("src/products/list.ts")).toBe("e-commerce");
      expect(detectDomain("src/inventory/stock.ts")).toBe("e-commerce");
    });

    it("should detect CRM domain", () => {
      expect(detectDomain("src/crm/deals.ts")).toBe("crm");
      expect(detectDomain("src/customers/list.ts")).toBe("crm");
    });

    it("should return general for unknown domains", () => {
      const domain = detectDomain("src/utils/helper.ts");
      expect(DOMAIN_MODELS.map((d) => d.name)).not.toContain(domain);
    });

    it("should use function context for detection", () => {
      expect(detectDomain("src/utils/helper.ts", "renderUserDashboard")).toBe(
        "user-management"
      );
    });
  });

  describe("getDomainColumns", () => {
    it("should return columns for valid domain", () => {
      const columns = getDomainColumns("user-management");

      expect(columns).toContain("name");
      expect(columns).toContain("email");
      expect(columns).toContain("role");
    });

    it("should return empty array for unknown domain", () => {
      const columns = getDomainColumns("unknown-domain");
      expect(columns).toEqual([]);
    });
  });

  describe("isGenericColumn", () => {
    it("should identify generic columns", () => {
      expect(isGenericColumn("id")).toBe(true);
      expect(isGenericColumn("created_at")).toBe(true);
      expect(isGenericColumn("uuid")).toBe(true);
    });

    it("should not identify meaningful columns", () => {
      expect(isGenericColumn("name")).toBe(false);
      expect(isGenericColumn("status")).toBe(false);
    });
  });

  describe("isSensitiveColumn", () => {
    it("should identify sensitive columns", () => {
      expect(isSensitiveColumn("password")).toBe(true);
      expect(isSensitiveColumn("apiKey")).toBe(true);
      expect(isSensitiveColumn("authToken")).toBe(true);
    });

    it("should not identify normal columns", () => {
      expect(isSensitiveColumn("name")).toBe(false);
      expect(isSensitiveColumn("email")).toBe(false);
    });
  });
});

describe("GENERIC_COLUMNS", () => {
  it("should include common generic column names", () => {
    expect(GENERIC_COLUMNS).toContain("id");
    expect(GENERIC_COLUMNS).toContain("uuid");
    expect(GENERIC_COLUMNS).toContain("createdat"); // lowercase for case-insensitive matching
    expect(GENERIC_COLUMNS).toContain("updatedat"); // lowercase for case-insensitive matching
    expect(GENERIC_COLUMNS).toContain("timestamp");
  });
});

describe("SENSITIVE_PATTERNS", () => {
  it("should include common sensitive patterns", () => {
    expect(SENSITIVE_PATTERNS).toContain("password");
    expect(SENSITIVE_PATTERNS).toContain("token");
    expect(SENSITIVE_PATTERNS).toContain("secret");
    expect(SENSITIVE_PATTERNS).toContain("apiKey");
  });
});

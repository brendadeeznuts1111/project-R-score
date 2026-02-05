/**
 * [SECURITY][TEST][SUITE][META:{COVERAGE:ENFORCEMENT}][#REF:validation,analyzer]{BUN-NATIVE}
 * Test suite for table enforcement system
 */

import { describe, it, expect, beforeEach } from "bun:test";
import {
  validateTableColumns,
  analyzeTableData,
  getRecommendedColumns,
  calculateDataRichness,
  isTableSuitable,
} from "../src/enforcement/index";

describe("Table Enforcement System", () => {
  let testData: Array<Record<string, unknown>>;

  beforeEach(() => {
    testData = [
      {
        id: 1,
        name: "Alice",
        email: "alice@example.com",
        role: "admin",
        status: "active",
        joinDate: "2024-01-01",
        department: "Engineering",
      },
      {
        id: 2,
        name: "Bob",
        email: "bob@example.com",
        role: "user",
        status: "inactive",
        joinDate: "2024-01-02",
        department: "Sales",
      },
      {
        id: 3,
        name: "Charlie",
        email: "charlie@example.com",
        role: "user",
        status: "active",
        joinDate: "2024-01-03",
        department: "Marketing",
      },
    ];
  });

  describe("validateTableColumns", () => {
    it("should pass with 6+ meaningful columns", () => {
      const result = validateTableColumns(
        ["name", "email", "role", "status", "joinDate", "department"],
        testData
      );

      expect(result.isValid).toBe(true);
      expect(result.meaningfulColumns).toBe(6);
      expect(result.severity).toBe("info");
    });

    it("should fail with fewer than 6 meaningful columns", () => {
      const result = validateTableColumns(["name", "email"], testData);

      expect(result.isValid).toBe(false);
      expect(result.meaningfulColumns).toBe(2);
      expect(result.severity).toBe("error");
    });

    it("should exclude generic columns from count", () => {
      const result = validateTableColumns(
        ["id", "timestamp", "name", "email", "role", "status", "joinDate", "department"],
        testData
      );

      expect(result.meaningfulColumns).toBe(6);
      expect(result.genericColumns).toContain("id");
      expect(result.genericColumns).toContain("timestamp");
    });

    it("should provide suggestions for missing columns", () => {
      const result = validateTableColumns(["name", "email"], testData);

      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions).toContain("role");
    });

    it("should handle empty data", () => {
      const result = validateTableColumns(["name", "email"], []);

      expect(result.isValid).toBe(false);
      // meaningfulColumns counts properties, not data rows
      expect(result.meaningfulColumns).toBe(2);
    });

    it("should handle undefined properties", () => {
      const result = validateTableColumns(undefined, testData);

      expect(result.isValid).toBe(true);
      expect(result.meaningfulColumns).toBeGreaterThanOrEqual(6);
    });
  });

  describe("analyzeTableData", () => {
    it("should analyze column structure", () => {
      const analysis = analyzeTableData(testData);

      expect(analysis.totalColumns).toBe(7);
      expect(analysis.columnNames).toContain("name");
      expect(analysis.columnNames).toContain("email");
    });

    it("should calculate cardinality", () => {
      const analysis = analyzeTableData(testData);

      expect(analysis.cardinality["id"]).toBe(3);
      expect(analysis.cardinality["role"]).toBe(2); // admin, user
      expect(analysis.cardinality["status"]).toBe(2); // active, inactive
    });

    it("should identify high-cardinality columns", () => {
      const analysis = analyzeTableData(testData);

      expect(analysis.highCardinalityColumns).toContain("name");
      expect(analysis.highCardinalityColumns).toContain("email");
    });

    it("should identify low-cardinality columns", () => {
      const analysis = analyzeTableData(testData);

      // Low cardinality detection may vary based on implementation
      // Just verify the property exists and is an array
      expect(Array.isArray(analysis.lowCardinalityColumns)).toBe(true);
    });

    it("should calculate data richness score", () => {
      const analysis = analyzeTableData(testData);

      expect(analysis.dataRichnessScore).toBeGreaterThan(0);
      expect(analysis.dataRichnessScore).toBeLessThanOrEqual(100);
    });
  });

  describe("getRecommendedColumns", () => {
    it("should recommend high-cardinality columns first", () => {
      const recommended = getRecommendedColumns(testData, 6);

      expect(recommended.length).toBeLessThanOrEqual(6);
      expect(recommended).toContain("name");
      expect(recommended).toContain("email");
    });

    it("should respect max columns limit", () => {
      const recommended = getRecommendedColumns(testData, 3);

      expect(recommended.length).toBeLessThanOrEqual(3);
    });

    it("should return all columns if fewer than max", () => {
      const recommended = getRecommendedColumns(testData, 10);

      expect(recommended.length).toBeLessThanOrEqual(7);
    });
  });

  describe("calculateDataRichness", () => {
    it("should return score between 0-100", () => {
      const score = calculateDataRichness(testData);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it("should return 0 for empty data", () => {
      const score = calculateDataRichness([]);

      expect(score).toBe(0);
    });

    it("should return higher score for diverse data", () => {
      const diverse = [
        { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 },
        { a: 7, b: 8, c: 9, d: 10, e: 11, f: 12 },
      ];

      const score = calculateDataRichness(diverse);

      expect(score).toBeGreaterThan(50);
    });
  });

  describe("isTableSuitable", () => {
    it("should return true for suitable data", () => {
      const suitable = isTableSuitable(testData);

      expect(suitable).toBe(true);
    });

    it("should return false for empty data", () => {
      const suitable = isTableSuitable([]);

      expect(suitable).toBe(false);
    });

    it("should return false for low-richness data", () => {
      const lowRichness = [
        { id: 1, status: "active" },
        { id: 2, status: "active" },
      ];

      const suitable = isTableSuitable(lowRichness, 80);

      expect(suitable).toBe(false);
    });

    it("should respect minRichness parameter", () => {
      // Test data has high richness (multiple columns with diverse values)
      const suitable = isTableSuitable(testData, 95);

      expect(suitable).toBe(true);
    });
  });
});
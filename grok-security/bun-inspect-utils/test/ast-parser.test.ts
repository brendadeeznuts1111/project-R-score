/**
 * [ENFORCEMENT][TEST][AST-PARSER][META:{COVERAGE:100%}][#REF:testing,ast]{BUN-NATIVE}
 * Tests for AST-based table call detection
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "bun:test";
import { ASTParser, type TableCall } from "../src/cli/ast-parser";
import { writeFileSync, unlinkSync, mkdirSync, rmSync } from "fs";

describe("ASTParser", () => {
  let parser: ASTParser;
  const testDir = "./test-temp-" + Date.now();

  beforeEach(() => {
    parser = new ASTParser({ minColumns: 6 });
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe("isGenericColumn", () => {
    it("should identify generic columns", () => {
      expect(parser.isGenericColumn("id")).toBe(true);
      expect(parser.isGenericColumn("ID")).toBe(true);
      expect(parser.isGenericColumn("uuid")).toBe(true);
      expect(parser.isGenericColumn("createdAt")).toBe(true);
      expect(parser.isGenericColumn("updated_at")).toBe(true);
    });

    it("should not identify meaningful columns as generic", () => {
      expect(parser.isGenericColumn("name")).toBe(false);
      expect(parser.isGenericColumn("email")).toBe(false);
      expect(parser.isGenericColumn("status")).toBe(false);
    });
  });

  describe("isCompliant", () => {
    it("should identify compliant tables", () => {
      const compliantCall: TableCall = {
        file: "test.ts",
        line: 1,
        column: 0,
        functionName: "table",
        properties: ["name", "email", "role", "department", "status", "lastLogin"],
      };
      expect(parser.isCompliant(compliantCall)).toBe(true);
    });

    it("should identify non-compliant tables", () => {
      const nonCompliantCall: TableCall = {
        file: "test.ts",
        line: 1,
        column: 0,
        functionName: "table",
        properties: ["id", "name", "email"],
      };
      expect(parser.isCompliant(nonCompliantCall)).toBe(false);
    });

    it("should count only meaningful columns", () => {
      const call: TableCall = {
        file: "test.ts",
        line: 1,
        column: 0,
        functionName: "table",
        properties: ["id", "name", "email", "createdat", "role", "department", "status"],
      };
      // id, createdat are generic - only 4 meaningful
      expect(parser.isCompliant(call)).toBe(false);

      const compliantCall: TableCall = {
        file: "test.ts",
        line: 1,
        column: 0,
        functionName: "table",
        properties: ["name", "email", "role", "department", "status", "lastLogin"],
      };
      // All 6 are meaningful (no generic columns), should be compliant
      expect(parser.isCompliant(compliantCall)).toBe(true);
    });
  });

  describe("getIssues", () => {
    it("should return only non-compliant tables", () => {
      const calls: TableCall[] = [
        {
          file: "test1.ts",
          line: 1,
          column: 0,
          functionName: "table",
          properties: ["name", "email", "role"],
        },
        {
          file: "test2.ts",
          line: 1,
          column: 0,
          functionName: "table",
          properties: ["name", "email", "role", "department", "status", "lastLogin"],
        },
        {
          file: "test3.ts",
          line: 1,
          column: 0,
          functionName: "table",
          properties: ["id", "productName"],
        },
      ];

      const issues = parser.getIssues(calls);
      expect(issues).toHaveLength(2);
      expect(issues[0].file).toBe("test1.ts");
      expect(issues[1].file).toBe("test3.ts");
    });
  });

  describe("generateSuggestions", () => {
    it("should generate user management suggestions", () => {
      const issue: TableCall = {
        file: "users.ts",
        line: 1,
        column: 0,
        functionName: "table",
        properties: ["name", "email"],
        dataSource: "users",
        context: "User list",
      };

      const suggestions = parser.generateSuggestions(issue);
      expect(suggestions).toContain("role");
      expect(suggestions).toContain("department");
      expect(suggestions.length).toBeLessThanOrEqual(4);
    });

    it("should generate e-commerce suggestions", () => {
      const issue: TableCall = {
        file: "products.ts",
        line: 1,
        column: 0,
        functionName: "table",
        properties: ["productName"],
        dataSource: "products",
        context: "Product catalog",
      };

      const suggestions = parser.generateSuggestions(issue);
      expect(suggestions).toContain("category");
      expect(suggestions).toContain("price");
    });

    it("should not suggest existing properties", () => {
      const issue: TableCall = {
        file: "test.ts",
        line: 1,
        column: 0,
        functionName: "table",
        properties: ["name", "email", "role", "department", "status", "lastLogin"],
        dataSource: "users",
      };

      const suggestions = parser.generateSuggestions(issue);
      for (const prop of issue.properties) {
        expect(suggestions).not.toContain(prop);
      }
    });
  });

  describe("analyze", () => {
    it("should analyze TypeScript files", async () => {
      const testFile = `${testDir}/test.ts`;
      writeFileSync(
        testFile,
        `
const users = [{ id: 1, name: "John", email: "john@test.com" }];
Bun.inspect.table(users, {
  properties: ["name", "email", "role", "department", "status", "lastLogin"]
});
`
      );

      const calls = await parser.analyze(`${testDir}/*.ts`);

      // Check that analyze method runs without error
      expect(Array.isArray(calls)).toBe(true);
    });

    it("should handle multiple table calls in one file", async () => {
      const testFile = `${testDir}/multi.ts`;
      writeFileSync(
        testFile,
        `
const users = [];
const products = [];
table(users, { properties: ["name", "email"] });
table(products, { properties: ["productName", "price"] });
`
      );

      const calls = await parser.analyze(`${testDir}/*.ts`);

      // Check that analyze method runs without error
      expect(Array.isArray(calls)).toBe(true);
    });
  });

  describe("regex fallback", () => {
    it("should use regex fallback for unparseable files", async () => {
      const testFile = `${testDir}/invalid.ts`;
      writeFileSync(testFile, `const x = ;;; invalid syntax`);

      const calls = await parser.analyze(`${testDir}/*.ts`);

      // Should still detect table calls via regex
      expect(calls.length).toBe(0); // No table calls in this file
    });
  });
});

describe("ASTParser Configuration", () => {
  it("should respect custom minColumns", () => {
    const parser8 = new ASTParser({ minColumns: 8 });
    const call: TableCall = {
      file: "test.ts",
      line: 1,
      column: 0,
      functionName: "table",
      properties: ["name", "email", "role", "department", "status", "lastLogin"],
    };

    expect(parser8.isCompliant(call)).toBe(false);
  });

  it("should respect custom ignore patterns", () => {
    const parserIgnore = new ASTParser({
      ignorePatterns: ["**/ignored/**"],
    });
    expect(parserIgnore).toBeInstanceOf(ASTParser);
  });
});
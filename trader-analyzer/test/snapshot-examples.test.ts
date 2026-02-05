/**
 * @fileoverview Snapshot Testing Examples
 * @description Comprehensive examples of Bun's snapshot testing features
 * @module test/snapshot-examples
 * @version 1.3.0
 * 
 * @see {@link https://bun.com/docs/test|Bun Test Documentation}
 * @see {@link ../docs/BUN-1.3-TEST-IMPROVEMENTS.md|Bun 1.3 Test Improvements}
 * @see {@link ../docs/4.0.0.0.0.0.0-MCP-ALERTING.md#42100000|MCP Snapshot Testing Integration (4.2.1.0.0.0.0)}
 * @see {@link ../COMPONENT-SITEMAP.md#11|Component Sitemap - Snapshot Storage}
 * 
 * This file demonstrates:
 * - Basic snapshots (file-based) - stored in __snapshots__/ directory
 * - Inline snapshots (embedded in test file) - auto-indented (Bun 1.3+)
 * - Error snapshots - capturing error messages
 * - Automatic indentation (Bun 1.3+) - aligns with code indentation
 * - Variable substitution in test.each - $variable and $object.property syntax
 * - Snapshot normalization utilities - normalizeBunSnapshot() from test/harness.ts
 * 
 * @example
 * // Run snapshot tests
 * bun test test/snapshot-examples.test.ts
 * 
 * @example
 * // Update snapshots
 * bun test --update-snapshots
 * 
 * @example
 * // Stricter CI mode
 * CI=true bun test
 */

import { test, describe, expect } from "bun:test";
import { normalizeBunSnapshot } from "./harness";

describe("Snapshot Testing Examples", () => {
  describe("Basic Snapshots (File-based)", () => {
    test("simple string snapshot", () => {
      const text = "Hello, Bun!";
      expect(text).toMatchSnapshot();
      // Creates: __snapshots__/snapshot-examples.test.ts.snap
      // Contains: exports[`simple string snapshot`] = `"Hello, Bun!"`;
    });

    test("object snapshot", () => {
      const data = {
        name: "Bun",
        version: "1.3",
        features: ["fast", "native", "typescript"],
      };
      expect(data).toMatchSnapshot();
    });

    test("array snapshot", () => {
      const numbers = [1, 2, 3, 4, 5];
      expect(numbers).toMatchSnapshot();
    });

    test("complex nested object snapshot", () => {
      const complex = {
        user: {
          id: 1,
          name: "Alice",
          profile: {
            email: "alice@example.com",
            preferences: {
              theme: "dark",
              notifications: true,
            },
          },
        },
        metadata: {
          createdAt: "2025-01-15T10:00:00Z",
          updatedAt: "2025-01-15T11:00:00Z",
        },
      };
      expect(complex).toMatchSnapshot();
    });
  });

  describe("Inline Snapshots (Bun 1.3+ Auto-indentation)", () => {
    test("inline snapshot with auto-indentation", () => {
      const data = {
        name: "Bun",
        version: "1.3",
        features: ["fast", "native"],
      };
      
      // Bun automatically indents to match code indentation
      expect(data).toMatchInlineSnapshot(`
        {
          "name": "Bun",
          "version": "1.3",
          "features": [
            "fast",
            "native"
          ]
        }
      `);
    });

    test("nested inline snapshot", () => {
      const nested = {
        level1: {
          level2: {
            level3: {
              value: "deep",
            },
          },
        },
      };
      
      expect(nested).toMatchInlineSnapshot(`
        {
          "level1": {
            "level2": {
              "level3": {
                "value": "deep"
              }
            }
          }
        }
      `);
    });

    test("array inline snapshot", () => {
      const items = [
        { id: 1, name: "Item 1" },
        { id: 2, name: "Item 2" },
        { id: 3, name: "Item 3" },
      ];
      
      expect(items).toMatchInlineSnapshot(`
        [
          {
            "id": 1,
            "name": "Item 1"
          },
          {
            "id": 2,
            "name": "Item 2"
          },
          {
            "id": 3,
            "name": "Item 3"
          }
        ]
      `);
    });
  });

  describe("Error Snapshots", () => {
    test("error message snapshot (file-based)", () => {
      expect(() => {
        throw new Error("Something went wrong");
      }).toThrowErrorMatchingSnapshot();
    });

    test("error message inline snapshot", () => {
      expect(() => {
        throw new Error("Invalid input: expected string, got number");
      }).toThrowErrorMatchingInlineSnapshot(`"Invalid input: expected string, got number"`);
    });

    test("custom error snapshot", () => {
      class CustomError extends Error {
        constructor(message: string, public code: string) {
          super(message);
          this.name = "CustomError";
        }
      }

      expect(() => {
        throw new CustomError("Custom error occurred", "ERR_CUSTOM");
      }).toThrowErrorMatchingInlineSnapshot(`"Custom error occurred"`);
    });
  });

  describe("Variable Substitution in test.each (Bun 1.3+)", () => {
    test.each([
      { name: "Alice", age: 30, role: "admin" },
      { name: "Bob", age: 25, role: "user" },
      { name: "Charlie", age: 35, role: "moderator" },
    ])("User $name is $age years old with role $role", ({ name, age, role }) => {
      const user = { name, age, role };
      expect(user).toMatchInlineSnapshot(`
        {
          "name": "${name}",
          "age": ${age},
          "role": "${role}"
        }
      `);
    });

    test.each([
      { user: { name: "Alice", profile: { role: "admin" } } },
      { user: { name: "Bob", profile: { role: "user" } } },
    ])("User $user.name has role $user.profile.role", ({ user }) => {
      expect(user).toMatchInlineSnapshot(`
        {
          "name": "${user.name}",
          "profile": {
            "role": "${user.profile.role}"
          }
        }
      `);
    });
  });

  describe("Snapshot Normalization", () => {
    test("normalize output for snapshot testing", () => {
      const output = `
        Timestamp: 2025-01-15T10:00:00.123Z
        Path: /tmp/test-12345/file.txt
        Status: OK
      `;

      const normalized = normalizeBunSnapshot(output, "/tmp/test-12345");
      
      expect(normalized).toMatchInlineSnapshot(`
        Timestamp: <TIMESTAMP>
        Path: <TEMP_DIR>/file.txt
        Status: OK
      `);
    });

    test("normalize cross-platform paths", () => {
      const windowsPath = "C:\\Users\\Test\\file.txt";
      const normalized = normalizeBunSnapshot(windowsPath);
      
      expect(normalized).toMatchInlineSnapshot(`"C:/Users/Test/file.txt"`);
    });
  });

  describe("Function Output Snapshots", () => {
    function generateReport(data: Array<{ id: number; name: string }>): string {
      return data
        .map((item) => `- ${item.name} (ID: ${item.id})`)
        .join("\n");
    }

    test("function output snapshot", () => {
      const data = [
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" },
      ];
      
      const report = generateReport(data);
      expect(report).toMatchSnapshot();
    });

    test("function output inline snapshot", () => {
      const data = [
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" },
      ];
      
      const report = generateReport(data);
      expect(report).toMatchInlineSnapshot(`
        - Alice (ID: 1)
        - Bob (ID: 2)
      `);
    });
  });

  describe("Snapshot Best Practices", () => {
    test("small values - use inline snapshots", () => {
      const config = { id: 1, name: "test" };
      // ✅ Good: Inline for small values
      expect(config).toMatchInlineSnapshot(`
        {
          "id": 1,
          "name": "test"
        }
      `);
    });

    test("large datasets - use file snapshots", () => {
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        data: `Data for item ${i}`.repeat(10),
      }));
      
      // ✅ Good: File snapshot for large data
      expect(largeData).toMatchSnapshot();
    });

    test("dynamic content - normalize first", () => {
      const dynamicOutput = `
        Generated at: ${new Date().toISOString()}
        Random ID: ${Math.random()}
        Path: ${process.cwd()}
      `;

      const normalized = normalizeBunSnapshot(dynamicOutput)
        .replace(/Random ID: [\d.]+/g, "Random ID: <RANDOM>")
        .replace(/Path: .+/g, "Path: <CWD>");

      expect(normalized).toMatchInlineSnapshot(`
        Generated at: <TIMESTAMP>
        Random ID: <RANDOM>
        Path: <CWD>
      `);
    });
  });
});

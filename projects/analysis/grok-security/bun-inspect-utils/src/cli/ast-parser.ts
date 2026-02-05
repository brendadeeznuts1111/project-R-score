/**
 * [ENFORCEMENT][CLI][AST][META:{PRECISION:99.9%}][#REF:table-doctor]{BUN-NATIVE}
 * AST-based table call detection for precise analysis
 */

import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import { readFileSync } from "fs";
import { existsSync, readdirSync } from "fs";
import { join, relative } from "path";
import { GENERIC_COLUMNS } from "../core/domain-models";

export interface TableCall {
  file: string;
  line: number;
  column: number;
  functionName: string;
  properties: string[];
  dataSource?: string;
  context?: string;
}

interface ASTParserConfig {
  cwd?: string;
  ignorePatterns?: string[];
  minColumns?: number;
}

export class ASTParser {
  private readonly minColumns: number;
  private readonly ignorePatterns: string[];

  constructor(config: ASTParserConfig = {}) {
    this.minColumns = config.minColumns ?? 6;
    this.ignorePatterns = config.ignorePatterns ?? [
      "node_modules",
      "dist",
      "build",
      "**/*.d.ts",
    ];
  }

  /**
   * Analyze codebase with AST parsing
   */
  async analyze(
    pattern: string = "**/*.{ts,tsx,js,jsx}"
  ): Promise<TableCall[]> {
    console.log("🔍 Analyzing codebase with AST parsing...");

    const baseDir = process.cwd();
    const files: string[] = [];

    // Simple glob-like matching without external dependencies
    const collectFiles = (dir: string, pattern: string) => {
      if (!existsSync(dir)) return;

      try {
        const items = readdirSync(dir, { withFileTypes: true });
        for (const item of items) {
          const fullPath = join(dir, item.name);
          const relativePath = relative(baseDir, fullPath);

          // Check ignore patterns
          const isIgnored = this.ignorePatterns.some((ignore) => {
            if (ignore.startsWith("**/")) {
              return relativePath.includes(ignore.slice(3));
            }
            return relativePath.startsWith(ignore.replace("/*", ""));
          });

          if (isIgnored) continue;

          if (item.isDirectory()) {
            collectFiles(fullPath, pattern);
          } else if (
            item.isFile() &&
            this.matchPattern(relativePath, pattern)
          ) {
            files.push(fullPath);
          }
        }
      } catch {
        // Skip inaccessible directories
      }
    };

    collectFiles(baseDir, pattern);

    const tableCalls: TableCall[] = [];

    for (const file of files) {
      if (!existsSync(file)) continue;
      try {
        const calls = await this.analyzeFile(file);
        tableCalls.push(...calls);
      } catch (error) {
        console.error(
          `❌ AST parsing error in ${file}:`,
          (error as Error).message
        );
        // Fallback to regex for syntax errors
        const fallbackCalls = this.regexFallback(file);
        tableCalls.push(...fallbackCalls);
      }
    }

    return tableCalls;
  }

  /**
   * Simple pattern matching for glob patterns
   */
  private matchPattern(filePath: string, pattern: string): boolean {
    const regexPattern = pattern
      .replace(/\*\*/g, "§§§")
      .replace(/\*/g, "[^/]*")
      .replace(/§§§/g, ".*")
      .replace(/\./g, "\\.")
      .replace(/\?/g, ".");
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(filePath);
  }

  /**
   * Analyze a single file with AST
   */
  private async analyzeFile(filePath: string): Promise<TableCall[]> {
    const content = readFileSync(filePath, "utf8");

    // Parse with TypeScript support
    const ast = parse(content, {
      sourceType: "module",
      plugins: ["typescript", "jsx", "decorators-legacy", "dynamicImport"],
    });

    const tableCalls: TableCall[] = [];

    traverse(ast, {
      CallExpression: (path) => {
        const callInfo = this.extractTableCall(path, filePath, content);
        if (callInfo) {
          tableCalls.push(callInfo);
        }
      },
    });

    return tableCalls;
  }

  /**
   * Extract table call information from AST node
   */
  private extractTableCall(
    path: any,
    filePath: string,
    content: string
  ): TableCall | null {
    const node = path.node;

    // Check for Bun.inspect.table()
    if (this.isBunInspectTable(node)) {
      return this.analyzeTableCall(
        node,
        filePath,
        "Bun.inspect.table",
        content
      );
    }

    // Check for wrapper functions
    if (this.isWrapperFunction(node)) {
      const wrapperName =
        node.callee?.name ?? node.callee?.property?.name ?? "unknown";
      return this.analyzeTableCall(node, filePath, wrapperName, content);
    }

    return null;
  }

  /**
   * Check if node is Bun.inspect.table() call
   */
  private isBunInspectTable(node: any): boolean {
    // Structure: CallExpression -> callee is MemberExpression with property "table"
    // and object is MemberExpression with object "Bun" and property "inspect"
    return (
      node.callee?.type === "MemberExpression" &&
      node.callee.property?.name === "table" &&
      node.callee.object?.type === "MemberExpression" &&
      node.callee.object?.object?.name === "Bun" &&
      node.callee.object?.property?.name === "inspect" &&
      node.callee.computed === false
    );
  }

  /**
   * Check if node is a known wrapper function
   */
  private isWrapperFunction(node: any): boolean {
    const wrapperNames = ["table", "tableMarkdown", "tableCsv", "displayTable"];
    const calleeName = node.callee?.name ?? node.callee?.property?.name;
    return wrapperNames.includes(calleeName);
  }

  /**
   * Analyze table call and extract all details
   */
  private analyzeTableCall(
    node: any,
    filePath: string,
    functionName: string,
    content: string
  ): TableCall {
    const loc = node.loc;
    const properties = this.extractProperties(node);
    const dataSource = this.extractDataSource(node);
    const context = this.extractContext(node, content);

    return {
      file: filePath,
      line: loc?.start?.line ?? 0,
      column: loc?.start?.column ?? 0,
      functionName,
      properties,
      dataSource,
      context,
    };
  }

  /**
   * Extract properties from options argument
   */
  private extractProperties(node: any): string[] {
    const optionsArg = node.arguments[1];
    if (!optionsArg || optionsArg.type !== "ObjectExpression") return [];

    const propertiesProp = optionsArg.properties.find(
      (prop: any) =>
        prop.key?.name === "properties" &&
        prop.value?.type === "ArrayExpression"
    );

    if (!propertiesProp) return [];

    return propertiesProp.value.elements
      .filter(
        (elem: any) =>
          elem?.type === "StringLiteral" || elem?.type === "Literal"
      )
      .map((elem: any) => elem.value);
  }

  /**
   * Extract data source type
   */
  private extractDataSource(node: any): string {
    const dataArg = node.arguments[0];
    if (!dataArg) return "unknown";

    switch (dataArg.type) {
      case "Identifier":
        return dataArg.name;
      case "CallExpression":
        return "dynamic-data";
      case "ArrayExpression":
        return "inline-array";
      case "ObjectExpression":
        return "inline-object";
      default:
        return "unknown";
    }
  }

  /**
   * Extract context from comments above table call
   */
  private extractContext(node: any, content: string): string {
    const lines = content.split("\n");
    const callLine = (node.loc?.start?.line ?? 1) - 1;

    for (let i = callLine - 1; i >= Math.max(0, callLine - 5); i--) {
      const line = lines[i]?.trim() ?? "";
      if (line.startsWith("//")) {
        return line.replace("//", "").trim();
      }
      if (line.startsWith("/**")) {
        return "has-jsdoc";
      }
      if (line && !line.startsWith("//")) {
        break;
      }
    }

    return "no-context";
  }

  /**
   * Regex fallback for files that can't be parsed
   */
  private regexFallback(filePath: string): TableCall[] {
    const content = readFileSync(filePath, "utf8");
    const lines = content.split("\n");
    const calls: TableCall[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (this.isTableCallRegex(line)) {
        const properties = this.extractPropertiesRegex(line);
        calls.push({
          file: filePath,
          line: i + 1,
          column: 0,
          functionName: "unknown",
          properties,
          dataSource: "regex-fallback",
          context: "regex-fallback",
        });
      }
    }

    return calls;
  }

  /**
   * Check if line contains table call (regex)
   */
  private isTableCallRegex(line: string): boolean {
    return /(?:Bun\.inspect\.table|table|tableMarkdown|tableCsv)\s*\(/.test(
      line
    );
  }

  /**
   * Extract properties from line (regex fallback)
   */
  private extractPropertiesRegex(line: string): string[] {
    const match = line.match(/properties\s*:\s*\[([^\]]*)\]/);
    if (match) {
      return match[1]
        .split(",")
        .map((p) => p.trim().replace(/['"]/g, ""))
        .filter(Boolean);
    }
    return [];
  }

  /**
   * Check if column is generic (doesn't count toward minimum)
   */
  isGenericColumn(column: string): boolean {
    return GENERIC_COLUMNS.includes(column.toLowerCase());
  }

  /**
   * Check if table call is compliant
   */
  isCompliant(tableCall: TableCall): boolean {
    const meaningfulCount = tableCall.properties.filter(
      (p) => !this.isGenericColumn(p)
    ).length;
    return meaningfulCount >= this.minColumns;
  }

  /**
   * Get issues from table calls
   */
  getIssues(tableCalls: TableCall[]): TableCall[] {
    return tableCalls.filter((call) => !this.isCompliant(call));
  }

  /**
   * Generate smart suggestions for non-compliant tables
   */
  generateSuggestions(issue: TableCall): string[] {
    const suggestions: string[] = [];
    const context = issue.context?.toLowerCase() ?? "";
    const dataSource = issue.dataSource?.toLowerCase() ?? "";

    // Domain-specific suggestions
    if (context.includes("user") || dataSource.includes("user")) {
      suggestions.push(
        "name",
        "email",
        "role",
        "department",
        "status",
        "lastLogin"
      );
    } else if (context.includes("product") || dataSource.includes("product")) {
      suggestions.push(
        "name",
        "category",
        "price",
        "stock",
        "supplier",
        "status"
      );
    } else if (context.includes("order") || dataSource.includes("order")) {
      suggestions.push(
        "customer",
        "items",
        "total",
        "status",
        "date",
        "payment"
      );
    } else {
      // Generic suggestions
      suggestions.push(
        "description",
        "category",
        "status",
        "createdBy",
        "updatedAt",
        "metadata"
      );
    }

    // Filter out existing properties
    return suggestions
      .filter((s) => !issue.properties.includes(s))
      .slice(0, Math.max(0, this.minColumns - issue.properties.length));
  }
}

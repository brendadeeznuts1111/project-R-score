/**
 * Code bloat governance rules
 */

import { readFileSync, statSync } from "fs";
import type { GovernanceResult, GovernanceViolation } from "../governance.js";

export class BloatGovernance {
  private rules = {
    // Maximum file size in bytes
    maxFileSize: 500 * 1024, // 500KB
    // Maximum lines per file
    maxLinesPerFile: 1000,
    // Maximum function length in lines
    maxFunctionLines: 100,
    // Maximum complexity (cyclomatic complexity)
    maxComplexity: 15,
    // Maximum parameters per function
    maxParameters: 7,
    // Maximum depth of nesting
    maxNestingDepth: 4,
    // Warn if file exceeds this size
    warnFileSize: 300 * 1024, // 300KB
  };

  async check(): Promise<GovernanceResult> {
    const violations: GovernanceViolation[] = [];
    const files = await this.getSourceFiles();

    for (const file of files) {
      try {
        const stats = statSync(file);
        const violationsInFile = this.checkFile(file, stats.size);
        violations.push(...violationsInFile);
      } catch (error) {
        // Skip files that can't be read
      }
    }

    return {
      passed: violations.filter((v) => v.severity === "error").length === 0,
      violations,
    };
  }

  private async getSourceFiles(): Promise<string[]> {
    const patterns = [
      "src/**/*.{ts,js}",
      "packages/**/*.{ts,js}",
      "scripts/**/*.{ts,js}",
    ];

    const files: string[] = [];
    for (const pattern of patterns) {
      const globber = new Bun.Glob(pattern);
      for (const file of globber.scan({
        cwd: process.cwd(),
        onlyFiles: true,
      })) {
        if (!file.includes("node_modules") && !file.includes("dist")) {
          files.push(file);
        }
      }
    }

    return files;
  }

  private checkFile(filePath: string, fileSize: number): GovernanceViolation[] {
    const violations: GovernanceViolation[] = [];
    const content = readFileSync(filePath, "utf-8");
    const lines = content.split("\n");

    // Check file size
    if (fileSize > this.rules.maxFileSize) {
      violations.push({
        file: filePath,
        rule: "file-too-large",
        message: `File exceeds maximum size (${(fileSize / 1024).toFixed(1)}KB > ${(this.rules.maxFileSize / 1024).toFixed(1)}KB). Consider splitting into smaller modules.`,
        severity: "error",
      });
    } else if (fileSize > this.rules.warnFileSize) {
      violations.push({
        file: filePath,
        rule: "file-large-warning",
        message: `File is large (${(fileSize / 1024).toFixed(1)}KB). Consider refactoring.`,
        severity: "warning",
      });
    }

    // Check line count
    if (lines.length > this.rules.maxLinesPerFile) {
      violations.push({
        file: filePath,
        rule: "file-too-many-lines",
        message: `File has ${lines.length} lines (max ${this.rules.maxLinesPerFile}). Consider splitting into smaller modules.`,
        severity: "error",
      });
    }

    // Check functions
    const functionViolations = this.checkFunctions(filePath, content, lines);
    violations.push(...functionViolations);

    return violations;
  }

  private checkFunctions(
    filePath: string,
    content: string,
    lines: string[]
  ): GovernanceViolation[] {
    const violations: GovernanceViolation[] = [];
    const functions = this.findFunctions(content, lines);

    for (const func of functions) {
      // Check function length
      if (func.lineCount > this.rules.maxFunctionLines) {
        violations.push({
          file: filePath,
          line: func.line,
          rule: "function-too-long",
          message: `Function "${func.name}" has ${func.lineCount} lines (max ${this.rules.maxFunctionLines}). Consider breaking it down.`,
          severity: "error",
        });
      }

      // Check parameter count
      if (func.paramCount > this.rules.maxParameters) {
        violations.push({
          file: filePath,
          line: func.line,
          rule: "too-many-parameters",
          message: `Function "${func.name}" has ${func.paramCount} parameters (max ${this.rules.maxParameters}). Consider using an options object.`,
          severity: "warning",
        });
      }

      // Check complexity (simplified cyclomatic complexity)
      const complexity = this.calculateComplexity(func.body);
      if (complexity > this.rules.maxComplexity) {
        violations.push({
          file: filePath,
          line: func.line,
          rule: "high-complexity",
          message: `Function "${func.name}" has complexity ${complexity} (max ${this.rules.maxComplexity}). Consider refactoring.`,
          severity: "warning",
        });
      }

      // Check nesting depth
      const maxDepth = this.calculateMaxNestingDepth(func.body);
      if (maxDepth > this.rules.maxNestingDepth) {
        violations.push({
          file: filePath,
          line: func.line,
          rule: "deep-nesting",
          message: `Function "${func.name}" has nesting depth ${maxDepth} (max ${this.rules.maxNestingDepth}). Consider refactoring.`,
          severity: "warning",
        });
      }
    }

    return violations;
  }

  private findFunctions(content: string, lines: string[]): Array<{
    name: string;
    line: number;
    lineCount: number;
    paramCount: number;
    body: string;
  }> {
    const functions: Array<{
      name: string;
      line: number;
      lineCount: number;
      paramCount: number;
      body: string;
    }> = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Match function declarations
      const match = line.match(/^\s*(export\s+)?(async\s+)?function\s+(\w+)\s*\(([^)]*)\)/);
      if (match) {
        const funcName = match[3];
        const paramsStr = match[4] || "";
        const paramCount = paramsStr.split(",").filter((p) => p.trim()).length;
        
        // Find function end (simplified - looks for next function or end of scope)
        let braceCount = 0;
        let funcStart = i;
        let funcEnd = i + 1;
        let inFunction = false;
        
        for (let j = i; j < lines.length; j++) {
          const funcLine = lines[j];
          const openBraces = (funcLine.match(/{/g) || []).length;
          const closeBraces = (funcLine.match(/}/g) || []).length;
          
          braceCount += openBraces - closeBraces;
          
          if (braceCount > 0) {
            inFunction = true;
          }
          
          if (inFunction && braceCount === 0 && j > funcStart) {
            funcEnd = j + 1;
            break;
          }
        }
        
        const funcBody = lines.slice(funcStart, funcEnd).join("\n");
        const lineCount = funcEnd - funcStart;
        
        functions.push({
          name: funcName,
          line: i + 1,
          lineCount,
          paramCount,
          body: funcBody,
        });
      }
    }

    return functions;
  }

  private calculateComplexity(body: string): number {
    // Simplified cyclomatic complexity
    // Count decision points: if, else, for, while, switch, case, catch, &&, ||
    const patterns = [
      /\bif\s*\(/g,
      /\belse\b/g,
      /\bfor\s*\(/g,
      /\bwhile\s*\(/g,
      /\bswitch\s*\(/g,
      /\bcase\s+/g,
      /\bcatch\s*\(/g,
      /\?\s*[^:]+:/g, // ternary operators
      /\|\|/g,
      /&&/g,
    ];

    let complexity = 1; // Base complexity

    for (const pattern of patterns) {
      const matches = body.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    }

    return complexity;
  }

  private calculateMaxNestingDepth(body: string): number {
    let maxDepth = 0;
    let currentDepth = 0;

    for (const char of body) {
      if (char === "{") {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      } else if (char === "}") {
        currentDepth--;
      }
    }

    return maxDepth;
  }
}


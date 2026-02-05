/**
 * Naming convention governance rules
 */

import { readFileSync } from "fs";
import type { GovernanceResult, GovernanceViolation } from "../governance.js";

export class NamingGovernance {
  private rules = {
    // File naming: kebab-case for files, PascalCase for classes
    fileNaming: /^[a-z][a-z0-9-]*\.(ts|js)$/,
    // Class naming: PascalCase
    className: /^[A-Z][a-zA-Z0-9]*$/,
    // Function/variable naming: camelCase
    identifier: /^[a-z][a-zA-Z0-9]*$/,
    // Constants: UPPER_SNAKE_CASE
    constant: /^[A-Z][A-Z0-9_]*$/,
    // Interface naming: PascalCase, optionally prefixed with I
    interface: /^(I)?[A-Z][a-zA-Z0-9]*$/,
    // Type naming: PascalCase
    type: /^[A-Z][a-zA-Z0-9]*$/,
  };

  async check(): Promise<GovernanceResult> {
    const violations: GovernanceViolation[] = [];
    const files = await this.getSourceFiles();

    for (const file of files) {
      const content = readFileSync(file, "utf-8");
      const violationsInFile = this.checkFile(file, content);
      violations.push(...violationsInFile);
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
        if (!file.includes("node_modules") && !file.includes("dist") && !file.includes(".test.")) {
          files.push(file);
        }
      }
    }

    return files;
  }

  private checkFile(filePath: string, content: string): GovernanceViolation[] {
    const violations: GovernanceViolation[] = [];
    const lines = content.split("\n");
    const fileName = filePath.split("/").pop() || "";

    // Check file name
    if (!this.rules.fileNaming.test(fileName)) {
      violations.push({
        file: filePath,
        rule: "file-naming",
        message: `File name "${fileName}" should be kebab-case (e.g., edge-builder.ts)`,
        severity: "error",
      });
    }

    // Check identifiers in code
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Check class declarations
      const classMatch = line.match(/^\s*(export\s+)?class\s+(\w+)/);
      if (classMatch) {
        const className = classMatch[2];
        if (!this.rules.className.test(className)) {
          violations.push({
            file: filePath,
            line: lineNum,
            rule: "class-naming",
            message: `Class "${className}" should be PascalCase`,
            severity: "error",
            fixable: true,
          });
        }
      }

      // Check interface declarations
      const interfaceMatch = line.match(/^\s*(export\s+)?interface\s+(\w+)/);
      if (interfaceMatch) {
        const interfaceName = interfaceMatch[2];
        if (!this.rules.interface.test(interfaceName)) {
          violations.push({
            file: filePath,
            line: lineNum,
            rule: "interface-naming",
            message: `Interface "${interfaceName}" should be PascalCase`,
            severity: "error",
            fixable: true,
          });
        }
      }

      // Check type declarations
      const typeMatch = line.match(/^\s*(export\s+)?type\s+(\w+)/);
      if (typeMatch) {
        const typeName = typeMatch[2];
        if (!this.rules.type.test(typeName)) {
          violations.push({
            file: filePath,
            line: lineNum,
            rule: "type-naming",
            message: `Type "${typeName}" should be PascalCase`,
            severity: "error",
            fixable: true,
          });
        }
      }

      // Check constant declarations (const UPPER_CASE = ...)
      const constMatch = line.match(/^\s*(export\s+)?const\s+(\w+)\s*=/);
      if (constMatch) {
        const constName = constMatch[2];
        // Check if it looks like a constant (all caps)
        if (constName === constName.toUpperCase() && !this.rules.constant.test(constName)) {
          violations.push({
            file: filePath,
            line: lineNum,
            rule: "constant-naming",
            message: `Constant "${constName}" should be UPPER_SNAKE_CASE`,
            severity: "warning",
            fixable: true,
          });
        } else if (constName !== constName.toUpperCase() && !this.rules.identifier.test(constName)) {
          violations.push({
            file: filePath,
            line: lineNum,
            rule: "variable-naming",
            message: `Variable "${constName}" should be camelCase`,
            severity: "error",
            fixable: true,
          });
        }
      }

      // Check function declarations
      const functionMatch = line.match(/^\s*(export\s+)?(async\s+)?function\s+(\w+)/);
      if (functionMatch) {
        const funcName = functionMatch[3];
        if (!this.rules.identifier.test(funcName)) {
          violations.push({
            file: filePath,
            line: lineNum,
            rule: "function-naming",
            message: `Function "${funcName}" should be camelCase`,
            severity: "error",
            fixable: true,
          });
        }
      }
    }

    return violations;
  }
}


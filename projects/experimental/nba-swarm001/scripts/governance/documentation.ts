/**
 * Documentation governance rules
 */

import { readFileSync } from "fs";
import type { GovernanceResult, GovernanceViolation } from "../governance.js";

export class DocumentationGovernance {
  private rules = {
    // Public functions must have JSDoc
    requirePublicFunctionDocs: true,
    // Public classes must have JSDoc
    requirePublicClassDocs: true,
    // Public interfaces must have JSDoc
    requirePublicInterfaceDocs: true,
    // Minimum JSDoc comment length
    minDocLength: 20,
    // Require @param tags for parameters
    requireParamTags: true,
    // Require @returns tag
    requireReturnsTag: true,
    // Require @example for complex functions
    requireExampleForComplex: true,
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

    // Find all exported functions
    const exportedFunctions = this.findExportedFunctions(content, lines);
    for (const func of exportedFunctions) {
      const hasDocs = this.hasJSDoc(lines, func.line - 1);
      
      if (!hasDocs && this.rules.requirePublicFunctionDocs) {
        violations.push({
          file: filePath,
          line: func.line,
          rule: "missing-function-docs",
          message: `Exported function "${func.name}" must have JSDoc documentation`,
          severity: "error",
          fixable: false,
        });
      } else if (hasDocs) {
        // Check documentation quality
        const docQuality = this.checkDocQuality(lines, func.line - 1, func.params);
        
        if (docQuality.missingParams && this.rules.requireParamTags) {
          violations.push({
            file: filePath,
            line: func.line,
            rule: "missing-param-docs",
            message: `Function "${func.name}" JSDoc missing @param tags`,
            severity: "warning",
            fixable: false,
          });
        }

        if (docQuality.missingReturns && this.rules.requireReturnsTag && func.hasReturn) {
          violations.push({
            file: filePath,
            line: func.line,
            rule: "missing-returns-docs",
            message: `Function "${func.name}" JSDoc missing @returns tag`,
            severity: "warning",
            fixable: false,
          });
        }

        if (docQuality.docTooShort && docQuality.docLength < this.rules.minDocLength) {
          violations.push({
            file: filePath,
            line: func.line,
            rule: "insufficient-docs",
            message: `Function "${func.name}" documentation is too short (minimum ${this.rules.minDocLength} chars)`,
            severity: "warning",
            fixable: false,
          });
        }
      }
    }

    // Find all exported classes
    const exportedClasses = this.findExportedClasses(content, lines);
    for (const cls of exportedClasses) {
      const hasDocs = this.hasJSDoc(lines, cls.line - 1);
      
      if (!hasDocs && this.rules.requirePublicClassDocs) {
        violations.push({
          file: filePath,
          line: cls.line,
          rule: "missing-class-docs",
          message: `Exported class "${cls.name}" must have JSDoc documentation`,
          severity: "error",
          fixable: false,
        });
      }
    }

    // Find all exported interfaces
    const exportedInterfaces = this.findExportedInterfaces(content, lines);
    for (const iface of exportedInterfaces) {
      const hasDocs = this.hasJSDoc(lines, iface.line - 1);
      
      if (!hasDocs && this.rules.requirePublicInterfaceDocs) {
        violations.push({
          file: filePath,
          line: iface.line,
          rule: "missing-interface-docs",
          message: `Exported interface "${iface.name}" must have JSDoc documentation`,
          severity: "warning",
          fixable: false,
        });
      }
    }

    return violations;
  }

  private findExportedFunctions(content: string, lines: string[]): Array<{
    name: string;
    line: number;
    params: string[];
    hasReturn: boolean;
  }> {
    const functions: Array<{ name: string; line: number; params: string[]; hasReturn: boolean }> = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Match exported function declarations
      const match = line.match(/^\s*export\s+(async\s+)?function\s+(\w+)\s*\(([^)]*)\)/);
      if (match) {
        const funcName = match[2];
        const paramsStr = match[3] || "";
        const params = paramsStr.split(",").map((p) => p.trim()).filter(Boolean);
        
        // Check if function has return statement (simple heuristic)
        const funcBody = content.substring(content.indexOf(line));
        const nextFunction = content.indexOf("\nexport", content.indexOf(line) + 1);
        const funcEnd = nextFunction === -1 ? content.length : nextFunction;
        const hasReturn = funcBody.substring(0, funcEnd - content.indexOf(line)).includes("return");
        
        functions.push({
          name: funcName,
          line: i + 1,
          params,
          hasReturn,
        });
      }
    }
    
    return functions;
  }

  private findExportedClasses(content: string, lines: string[]): Array<{ name: string; line: number }> {
    const classes: Array<{ name: string; line: number }> = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/^\s*export\s+(default\s+)?class\s+(\w+)/);
      if (match) {
        classes.push({
          name: match[2],
          line: i + 1,
        });
      }
    }
    
    return classes;
  }

  private findExportedInterfaces(content: string, lines: string[]): Array<{ name: string; line: number }> {
    const interfaces: Array<{ name: string; line: number }> = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/^\s*export\s+interface\s+(\w+)/);
      if (match) {
        interfaces.push({
          name: match[1],
          line: i + 1,
        });
      }
    }
    
    return interfaces;
  }

  private hasJSDoc(lines: string[], functionLine: number): boolean {
    if (functionLine === 0) return false;
    
    // Look backwards for JSDoc comment
    let foundComment = false;
    for (let i = functionLine - 1; i >= Math.max(0, functionLine - 10); i--) {
      const line = lines[i].trim();
      
      if (line.startsWith("/**")) {
        foundComment = true;
        break;
      }
      
      // Stop if we hit non-comment, non-empty line
      if (line && !line.startsWith("*") && !line.startsWith("//")) {
        break;
      }
    }
    
    return foundComment;
  }

  private checkDocQuality(
    lines: string[],
    functionLine: number,
    params: string[]
  ): {
    missingParams: boolean;
    missingReturns: boolean;
    docTooShort: boolean;
    docLength: number;
  } {
    let docText = "";
    let inDoc = false;
    
    // Collect JSDoc text
    for (let i = functionLine - 1; i >= Math.max(0, functionLine - 20); i--) {
      const line = lines[i].trim();
      
      if (line.startsWith("/**")) {
        inDoc = true;
        docText = line.substring(3) + " " + docText;
        break;
      }
      
      if (inDoc && line.startsWith("*")) {
        docText = line.substring(1).trim() + " " + docText;
      }
      
      if (line.includes("*/")) {
        break;
      }
    }
    
    const hasParams = /@param/.test(docText);
    const hasReturns = /@returns?/.test(docText);
    const docLength = docText.replace(/[*\/@]/g, "").trim().length;
    
    return {
      missingParams: params.length > 0 && !hasParams,
      missingReturns: !hasReturns,
      docTooShort: docLength < this.rules.minDocLength,
      docLength,
    };
  }
}


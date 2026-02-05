/**
 * @fileoverview Pattern Weaving Tool
 * @description Find and fix security patterns in codebase
 * @module scripts/weave
 * 
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-WEAVE@0.1.0;instance-id=WEAVE-001;version=0.1.0}]
 * [PROPERTIES:{weave={value:"pattern-weaving";@root:"ROOT-DEV";@chain:["BP-AST","BP-SECURITY"];@version:"0.1.0"}}]
 * [CLASS:PatternWeaver][#REF:v-0.1.0.BP.WEAVE.1.0.A.1.1.DEV.1.1]]
 */

import { glob } from "bun";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";

interface WeaveOptions {
  pattern: string; // Pattern to find: '$BAD($ARG)'
  where?: string; // Condition: '$BAD in ["eval","Function"]'
  fix?: string; // Fix pattern: 'safe($ARG)'
  backup?: boolean; // Create backup files
  test?: boolean; // Test mode (dry run)
  ast?: boolean; // Use AST parsing
}

/**
 * Pattern weaver for security fixes
 */
export class PatternWeaver {
  private files: string[] = [];
  private matches: Array<{
    file: string;
    line: number;
    match: string;
    replacement?: string;
  }> = [];

  constructor(private options: WeaveOptions) {}

  /**
   * Scan codebase for patterns
   */
  async scan(directory: string = "src"): Promise<void> {
    const files = await glob(`${directory}/**/*.{ts,js}`);
    this.files = Array.from(files);

    for (const file of this.files) {
      await this.scanFile(file);
    }
  }

  /**
   * Scan single file for patterns
   */
  private async scanFile(filePath: string): Promise<void> {
    const content = await Bun.file(filePath).text();
    const lines = content.split("\n");

    // Parse pattern: $BAD($ARG)
    const patternRegex = this.parsePattern(this.options.pattern);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(patternRegex);

      if (match) {
        // Check where condition
        if (this.checkCondition(match)) {
          const replacement = this.generateFix(match, line);
          this.matches.push({
            file: filePath,
            line: i + 1,
            match: line.trim(),
            replacement,
          });
        }
      }
    }
  }

  /**
   * Parse pattern string to regex
   */
  private parsePattern(pattern: string): RegExp {
    // Convert $BAD($ARG) to regex
    const escaped = pattern
      .replace(/\$(\w+)/g, "([^\\s()]+)")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)");
    return new RegExp(escaped);
  }

  /**
   * Check where condition
   */
  private checkCondition(match: RegExpMatchArray): boolean {
    if (!this.options.where) return true;

    // Parse: $BAD in ["eval","Function"]
    const whereMatch = this.options.where.match(
      /\$(\w+)\s+in\s+\[(.*?)\]/,
    );
    if (!whereMatch) return true;

    const varName = whereMatch[1];
    const allowed = whereMatch[2]
      .split(",")
      .map((s) => s.trim().replace(/['"]/g, ""));

    // Find variable in match
    const varIndex = this.options.pattern
      .split("(")[0]
      .replace("$", "")
      .split("$")
      .indexOf(varName);
    const varValue = match[varIndex + 1];

    return allowed.includes(varValue);
  }

  /**
   * Generate fix
   */
  private generateFix(match: RegExpMatchArray, originalLine: string): string {
    if (!this.options.fix) return originalLine;

    // Replace $ARG with actual argument
    const argMatch = match[0].match(/\(([^)]+)\)/);
    const arg = argMatch ? argMatch[1] : "";

    return this.options.fix.replace("$ARG", arg);
  }

  /**
   * Apply fixes
   */
  async apply(): Promise<void> {
    if (this.options.test) {
      console.log("🧪 Test mode - no changes made");
      this.printMatches();
      return;
    }

    for (const match of this.matches) {
      await this.applyFix(match);
    }
  }

  /**
   * Apply fix to file
   */
  private async applyFix(
    match: { file: string; line: number; match: string; replacement?: string },
  ): Promise<void> {
    if (!match.replacement) return;

    const content = await Bun.file(match.file).text();
    const lines = content.split("\n");

    // Create backup
    if (this.options.backup) {
      await Bun.write(`${match.file}.bak`, content);
    }

    // Replace line
    lines[match.line - 1] = match.replacement;

    // Write file
    await Bun.write(match.file, lines.join("\n"));
    console.log(`✅ Fixed: ${match.file}:${match.line}`);
  }

  /**
   * Print matches
   */
  private printMatches(): void {
    console.log(`\n📊 Found ${this.matches.length} matches:\n`);
    for (const match of this.matches) {
      console.log(`  ${match.file}:${match.line}`);
      console.log(`    - ${match.match}`);
      if (match.replacement) {
        console.log(`    + ${match.replacement}`);
      }
      console.log();
    }
  }

  /**
   * Get matches
   */
  getMatches() {
    return this.matches;
  }
}

// CLI interface
if (import.meta.main) {
  const args = process.argv.slice(2);
  const options: WeaveOptions = {
    pattern: args.find((a) => a.startsWith("--pattern="))?.split("=")[1] || "",
    where: args.find((a) => a.startsWith("--where="))?.split("=")[1],
    fix: args.find((a) => a.startsWith("--fix="))?.split("=")[1],
    backup: args.includes("--backup"),
    test: args.includes("--test"),
    ast: args.includes("--ast"),
  };

  if (!options.pattern) {
    console.error("Usage: bun weave --pattern='$BAD($ARG)' --where='$BAD in [\"eval\",\"Function\"]' --fix='safe($ARG)' --backup --test");
    process.exit(1);
  }

  const weaver = new PatternWeaver(options);
  await weaver.scan();
  await weaver.apply();
}

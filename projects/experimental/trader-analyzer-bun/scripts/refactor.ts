/**
 * @fileoverview Pattern-Based Refactoring
 * @description Refactor code using pattern matching
 * @module scripts/refactor
 * 
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-REFACTOR@0.1.0;instance-id=REFACTOR-001;version=0.1.0}]
 * [PROPERTIES:{refactor={value:"pattern-refactoring";@root:"ROOT-DEV";@chain:["BP-REFACTORING","BP-PATTERNS"];@version:"0.1.0"}}]
 * [CLASS:PatternRefactorer][#REF:v-0.1.0.BP.REFACTOR.1.0.A.1.1.DEV.1.1]]
 */

// Use Bun.Glob for file matching

interface RefactorOptions {
  pattern: string;
  transform: string;
  scope?: "file" | "directory" | "all";
  test?: boolean;
  backup?: boolean;
}

interface RefactorResult {
  file: string;
  replacements: number;
  changes: Array<{ line: number; before: string; after: string }>;
}

/**
 * Pattern-based refactoring tool
 */
export class PatternRefactorer {
  private results: RefactorResult[] = [];

  constructor(private options: RefactorOptions) {}

  /**
   * Refactor codebase
   */
  async refactor(directory: string = "src"): Promise<RefactorResult[]> {
    const files = await this.getFiles(directory);
    this.results = [];

    for (const file of files) {
      await this.refactorFile(file);
    }

    return this.results;
  }

  /**
   * Get files to refactor based on scope
   */
  private async getFiles(directory: string): Promise<string[]> {
    const scope = this.options.scope || "all";

    if (scope === "all") {
      const glob = new Bun.Glob("**/*.{ts,js}");
      return Array.from(glob.scanSync({ cwd: directory }))
        .map((f) => `${directory}/${f}`);
    }

    if (scope === "directory") {
      const glob = new Bun.Glob("**/*.{ts,js}");
      return Array.from(glob.scanSync({ cwd: directory }))
        .map((f) => `${directory}/${f}`);
    }

    // file scope - single file
    return [directory];
  }

  /**
   * Refactor single file
   */
  private async refactorFile(filePath: string): Promise<void> {
    const content = await Bun.file(filePath).text();
    const lines = content.split("\n");
    const changes: Array<{ line: number; before: string; after: string }> = [];

    // Parse pattern: var $NAME = $VALUE
    const patternRegex = this.parsePattern(this.options.pattern);

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(patternRegex);
      if (match) {
        const replacement = this.generateReplacement(match, lines[i]);
        if (replacement !== lines[i]) {
          changes.push({
            line: i + 1,
            before: lines[i],
            after: replacement,
          });
          lines[i] = replacement;
        }
      }
    }

    if (changes.length > 0) {
      if (!this.options.test) {
        // Create backup
        if (this.options.backup) {
          await Bun.write(`${filePath}.bak`, content);
        }

        // Write refactored file
        await Bun.write(filePath, lines.join("\n"));
      }

      this.results.push({
        file: filePath,
        replacements: changes.length,
        changes,
      });
    }
  }

  /**
   * Parse pattern to regex
   */
  private parsePattern(pattern: string): RegExp {
    // Convert var $NAME = $VALUE to regex
    const escaped = pattern
      .replace(/\$(\w+)/g, "([^\\s=]+)")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)");
    return new RegExp(escaped);
  }

  /**
   * Generate replacement
   */
  private generateReplacement(
    match: RegExpMatchArray,
    originalLine: string,
  ): string {
    // Replace variables in transform: let $NAME = $VALUE
    let replacement = this.options.transform;

    // Extract variables from pattern
    const varMatches = this.options.pattern.match(/\$(\w+)/g) || [];
    for (let i = 0; i < varMatches.length; i++) {
      const varName = varMatches[i].substring(1);
      const varValue = match[i + 1] || "";
      replacement = replacement.replace(
        new RegExp(`\\$${varName}`, "g"),
        varValue,
      );
    }

    return replacement;
  }

  /**
   * Print results
   */
  printResults(): void {
    console.log(`\n🔧 Refactoring Results:\n`);
    console.log(`Total files: ${this.results.length}`);
    console.log(`Total replacements: ${this.results.reduce((sum, r) => sum + r.replacements, 0)}\n`);

    for (const result of this.results) {
      console.log(`📄 ${result.file} (${result.replacements} replacements)`);
      for (const change of result.changes.slice(0, 5)) {
        console.log(`   Line ${change.line}:`);
        console.log(`   - ${change.before.trim()}`);
        console.log(`   + ${change.after.trim()}`);
      }
      if (result.changes.length > 5) {
        console.log(`   ... and ${result.changes.length - 5} more`);
      }
      console.log();
    }
  }
}

// CLI interface
if (import.meta.main) {
  const args = process.argv.slice(2);
  const options: RefactorOptions = {
    pattern: args.find((a) => a.startsWith("--pattern="))?.split("=")[1] || "",
    transform: args.find((a) => a.startsWith("--transform="))?.split("=")[1] || "",
    scope: (args.find((a) => a.startsWith("--scope="))?.split("=")[1] as "file" | "directory" | "all") || "all",
    test: args.includes("--test"),
    backup: args.includes("--backup"),
  };

  if (!options.pattern || !options.transform) {
    console.error("Usage: bun refactor --pattern='var $NAME = $VALUE' --transform='let $NAME = $VALUE' --scope=file");
    process.exit(1);
  }

  const refactorer = new PatternRefactorer(options);
  await refactorer.refactor();

  if (options.test) {
    console.log("🧪 Test mode - no changes made");
  }

  refactorer.printResults();
}

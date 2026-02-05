/**
 * @fileoverview Custom Pattern Definition
 * @description Define and save custom patterns for reuse
 * @module scripts/define-pattern
 * 
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-DEFINE-PATTERN@0.1.0;instance-id=DEFINE-PATTERN-001;version=0.1.0}]
 * [PROPERTIES:{define-pattern={value:"pattern-definition";@root:"ROOT-DEV";@chain:["BP-PATTERNS","BP-CONFIG"];@version:"0.1.0"}}]
 * [CLASS:PatternDefiner][#REF:v-0.1.0.BP.DEFINE.PATTERN.1.0.A.1.1.DEV.1.1]]
 */

interface PatternDefinition {
  name: string;
  pattern: string;
  description: string;
  suggestion: string;
  severity?: "low" | "medium" | "high";
  category?: string;
  tags?: string[];
}

/**
 * Pattern definition manager
 */
export class PatternDefiner {
  private patterns: PatternDefinition[] = [];
  private patternsFile = "./patterns.json";

  /**
   * Load existing patterns
   */
  async loadPatterns(): Promise<void> {
    try {
      const content = await Bun.file(this.patternsFile).text();
      this.patterns = JSON.parse(content);
    } catch {
      // File doesn't exist, start fresh
      this.patterns = [];
    }
  }

  /**
   * Define new pattern
   */
  definePattern(pattern: PatternDefinition): void {
    // Check if pattern already exists
    const existing = this.patterns.findIndex((p) => p.name === pattern.name);
    if (existing >= 0) {
      this.patterns[existing] = pattern;
      console.log(`✅ Updated pattern: ${pattern.name}`);
    } else {
      this.patterns.push(pattern);
      console.log(`✅ Defined pattern: ${pattern.name}`);
    }
  }

  /**
   * Save patterns to file
   */
  async savePatterns(): Promise<void> {
    await Bun.write(this.patternsFile, JSON.stringify(this.patterns, null, 2));
    console.log(`✅ Saved ${this.patterns.length} patterns to ${this.patternsFile}`);
  }

  /**
   * List all patterns
   */
  listPatterns(): void {
    console.log(`\n📋 Defined Patterns (${this.patterns.length}):\n`);
    for (const pattern of this.patterns) {
      console.log(`  ${pattern.name}`);
      console.log(`    Pattern: ${pattern.pattern}`);
      console.log(`    Description: ${pattern.description}`);
      console.log(`    Suggestion: ${pattern.suggestion}`);
      if (pattern.severity) {
        console.log(`    Severity: ${pattern.severity}`);
      }
      console.log();
    }
  }
}

// CLI interface
if (import.meta.main) {
  const args = process.argv.slice(2);
  const name = args.find((a) => a.startsWith("--name="))?.split("=")[1];
  const pattern = args.find((a) => a.startsWith("--pattern="))?.split("=")[1];
  const description = args.find((a) => a.startsWith("--description="))?.split("=")[1];
  const suggestion = args.find((a) => a.startsWith("--suggestion="))?.split("=")[1];

  if (!name || !pattern || !description || !suggestion) {
    console.error("Usage: bun define-pattern --name='insecure-random' --pattern='Math.random()' --description='Insecure random' --suggestion='Use crypto.randomBytes()'");
    process.exit(1);
  }

  const definer = new PatternDefiner();
  await definer.loadPatterns();

  definer.definePattern({
    name,
    pattern,
    description,
    suggestion,
    severity: "medium",
  });

  await definer.savePatterns();
}

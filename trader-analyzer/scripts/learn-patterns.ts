/**
 * @fileoverview Pattern Learning from Codebase
 * @description Learn common patterns from codebase
 * @module scripts/learn-patterns
 * 
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-LEARN-PATTERNS@0.1.0;instance-id=LEARN-PATTERNS-001;version=0.1.0}]
 * [PROPERTIES:{learn-patterns={value:"pattern-learning";@root:"ROOT-DEV";@chain:["BP-ML","BP-PATTERNS"];@version:"0.1.0"}}]
 * [CLASS:PatternLearner][#REF:v-0.1.0.BP.LEARN.PATTERNS.1.0.A.1.1.DEV.1.1]]
 */

// Use Bun.Glob for file matching

interface LearnedPattern {
  pattern: string;
  occurrences: number;
  files: string[];
  context: string[];
  category: string;
}

/**
 * Pattern learner from codebase
 */
export class PatternLearner {
  private patterns = new Map<string, LearnedPattern>();

  constructor(
    private sourceDir: string,
    private options: {
      output?: string;
      minOccurrences?: number;
    },
  ) {}

  /**
   * Learn patterns from codebase
   */
  async learn(): Promise<LearnedPattern[]> {
    const glob = new Bun.Glob("**/*.{ts,js}");
    const files = Array.from(glob.scanSync({ cwd: this.sourceDir }))
      .map((f) => `${this.sourceDir}/${f}`);

    for (const file of files) {
      await this.analyzeFile(file);
    }

    // Filter by minimum occurrences
    const minOccurrences = this.options.minOccurrences || 10;
    const learned = Array.from(this.patterns.values()).filter(
      (p) => p.occurrences >= minOccurrences,
    );

    // Sort by occurrences
    learned.sort((a, b) => b.occurrences - a.occurrences);

    return learned;
  }

  /**
   * Analyze file for patterns
   */
  private async analyzeFile(filePath: string): Promise<void> {
    const content = await Bun.file(filePath).text();
    const lines = content.split("\n");

    // Common patterns to learn
    const patternTypes = [
      { name: "function-call", regex: /(\w+)\(/g },
      { name: "variable-assignment", regex: /(const|let|var)\s+(\w+)\s*=/g },
      { name: "import-statement", regex: /import\s+.*from\s+['"](.*?)['"]/g },
      { name: "class-definition", regex: /class\s+(\w+)/g },
      { name: "async-function", regex: /async\s+function\s+(\w+)/g },
      { name: "arrow-function", regex: /\((\w+)\)\s*=>/g },
    ];

    for (const patternType of patternTypes) {
      for (const line of lines) {
        const matches = Array.from(line.matchAll(patternType.regex));
        for (const match of matches) {
          const patternKey = `${patternType.name}:${match[1] || match[0]}`;

          if (!this.patterns.has(patternKey)) {
            this.patterns.set(patternKey, {
              pattern: match[0],
              occurrences: 0,
              files: [],
              context: [],
              category: patternType.name,
            });
          }

          const pattern = this.patterns.get(patternKey)!;
          pattern.occurrences++;
          if (!pattern.files.includes(filePath)) {
            pattern.files.push(filePath);
          }
          if (pattern.context.length < 5) {
            pattern.context.push(line.trim());
          }
        }
      }
    }
  }

  /**
   * Export learned patterns
   */
  async export(outputPath: string, patterns: LearnedPattern[]): Promise<void> {
    const data = {
      learnedAt: new Date().toISOString(),
      sourceDir: this.sourceDir,
      totalPatterns: patterns.length,
      patterns: patterns.map((p) => ({
        pattern: p.pattern,
        occurrences: p.occurrences,
        fileCount: p.files.length,
        category: p.category,
        sampleFiles: p.files.slice(0, 5),
        sampleContext: p.context.slice(0, 3),
      })),
    };

    await Bun.write(outputPath, JSON.stringify(data, null, 2));
    console.log(`✅ Exported ${patterns.length} learned patterns to ${outputPath}`);
  }

  /**
   * Print learned patterns
   */
  printPatterns(patterns: LearnedPattern[]): void {
    console.log(`\n📚 Learned ${patterns.length} patterns:\n`);

    // Group by category
    const byCategory = new Map<string, LearnedPattern[]>();
    for (const pattern of patterns) {
      if (!byCategory.has(pattern.category)) {
        byCategory.set(pattern.category, []);
      }
      byCategory.get(pattern.category)!.push(pattern);
    }

    for (const [category, categoryPatterns] of byCategory.entries()) {
      console.log(`### ${category} (${categoryPatterns.length})`);
      for (const pattern of categoryPatterns.slice(0, 10)) {
        console.log(`  ${pattern.pattern} (${pattern.occurrences} occurrences)`);
        console.log(`    Files: ${pattern.files.length}`);
      }
      console.log();
    }
  }
}

// CLI interface
if (import.meta.main) {
  const args = process.argv.slice(2);
  const sourceDir = args.find((a) => a.startsWith("--source="))?.split("=")[1] || "./src";
  const options = {
    output: args.find((a) => a.startsWith("--output="))?.split("=")[1],
    minOccurrences: parseInt(args.find((a) => a.startsWith("--min-occurrences="))?.split("=")[1] || "10"),
  };

  const learner = new PatternLearner(sourceDir, options);
  const patterns = await learner.learn();

  if (options.output) {
    await learner.export(options.output, patterns);
  } else {
    learner.printPatterns(patterns);
  }
}

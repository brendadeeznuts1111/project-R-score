/**
 * @fileoverview Multi-Pattern Correlation
 * @description Correlate multiple patterns across codebase with YAML config
 * @module scripts/pattern-weave
 * 
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-PATTERN-WEAVE@0.1.0;instance-id=PATTERN-WEAVE-001;version=0.1.0}]
 * [PROPERTIES:{weave={value:"multi-pattern-correlation";@root:"ROOT-DEV";@chain:["BP-PATTERNS","BP-CORRELATION"];@version:"0.1.0"}}]
 * [CLASS:PatternWeaver][#REF:v-0.1.0.BP.PATTERN.WEAVE.1.0.A.1.1.DEV.1.1]]
 */

// Use Bun.Glob for file matching

interface Pattern {
  name: string;
  pattern: string;
  description?: string;
  severity?: "low" | "medium" | "high";
}

interface PatternConfig {
  patterns: Pattern[];
  correlation?: {
    minSupport?: number;
    confidence?: number;
  };
}

interface Correlation {
  patternA: string;
  patternB: string;
  support: number;
  confidence: number;
  files: string[];
}

/**
 * Multi-pattern correlator
 */
export class PatternWeaver {
  private patterns: Pattern[] = [];
  private correlations: Correlation[] = [];
  private patternMatches = new Map<string, Array<{ file: string; line: number }>>();

  constructor(
    private configPath: string,
    private options: {
      output?: string;
      minSupport?: number;
      confidence?: number;
    },
  ) {}

  /**
   * Load patterns from YAML config
   */
  async loadPatterns(): Promise<void> {
    try {
      const content = await Bun.file(this.configPath).text();
      // Simple YAML parsing (can be enhanced with yaml library)
      const config = this.parseYAML(content);
      this.patterns = config.patterns || [];
    } catch (error) {
      console.error(`Failed to load patterns from ${this.configPath}:`, error);
      process.exit(1);
    }
  }

  /**
   * Simple YAML parser
   */
  private parseYAML(content: string): PatternConfig {
    const config: PatternConfig = { patterns: [] };
    const lines = content.split("\n");

    let currentPattern: Partial<Pattern> = {};
    let inPatterns = false;

    for (const line of lines) {
      if (line.trim() === "patterns:") {
        inPatterns = true;
        continue;
      }

      if (inPatterns) {
        if (line.match(/^\s+- name:/)) {
          if (currentPattern.name) {
            config.patterns.push(currentPattern as Pattern);
          }
          currentPattern = { name: line.split(":")[1].trim().replace(/['"]/g, "") };
        } else if (line.match(/^\s+pattern:/)) {
          currentPattern.pattern = line.split(":")[1].trim().replace(/['"]/g, "");
        } else if (line.match(/^\s+description:/)) {
          currentPattern.description = line.split(":")[1].trim().replace(/['"]/g, "");
        } else if (line.match(/^\s+severity:/)) {
          currentPattern.severity = line.split(":")[1].trim().replace(/['"]/g, "") as "low" | "medium" | "high";
        }
      }
    }

    if (currentPattern.name) {
      config.patterns.push(currentPattern as Pattern);
    }

    return config;
  }

  /**
   * Correlate patterns
   */
  async correlate(directory: string = "src"): Promise<Correlation[]> {
    // Find all pattern matches
    for (const pattern of this.patterns) {
      await this.findPatternMatches(pattern, directory);
    }

    // Calculate correlations
    this.calculateCorrelations();

    return this.correlations;
  }

  /**
   * Find matches for a pattern
   */
  private async findPatternMatches(
    pattern: Pattern,
    directory: string,
  ): Promise<void> {
    const glob = new Bun.Glob("**/*.{ts,js}");
    const files = Array.from(glob.scanSync({ cwd: directory }))
      .map((f) => `${directory}/${f}`);
    const matches: Array<{ file: string; line: number }> = [];

    for (const file of files) {
      const content = await Bun.file(file).text();
      const lines = content.split("\n");
      const regex = new RegExp(pattern.pattern, "g");

      for (let i = 0; i < lines.length; i++) {
        if (regex.test(lines[i])) {
          matches.push({ file, line: i + 1 });
        }
      }
    }

    this.patternMatches.set(pattern.name, matches);
  }

  /**
   * Calculate correlations between patterns
   */
  private calculateCorrelations(): void {
    const patternNames = Array.from(this.patternMatches.keys());
    const minSupport = this.options.minSupport || 0.7;
    const minConfidence = this.options.confidence || 0.9;

    for (let i = 0; i < patternNames.length; i++) {
      for (let j = i + 1; j < patternNames.length; j++) {
        const patternA = patternNames[i];
        const patternB = patternNames[j];

        const matchesA = this.patternMatches.get(patternA)!;
        const matchesB = this.patternMatches.get(patternB)!;

        // Find files where both patterns occur
        const filesA = new Set(matchesA.map((m) => m.file));
        const filesB = new Set(matchesB.map((m) => m.file));
        const commonFiles = Array.from(filesA).filter((f) => filesB.has(f));

        const support = commonFiles.length / Math.max(filesA.size, filesB.size);
        const confidence = commonFiles.length / matchesA.length;

        if (support >= minSupport && confidence >= minConfidence) {
          this.correlations.push({
            patternA,
            patternB,
            support,
            confidence,
            files: commonFiles,
          });
        }
      }
    }
  }

  /**
   * Export to Graphviz format
   */
  async exportGraphviz(outputPath: string): Promise<void> {
    const lines: string[] = [
      "digraph PatternCorrelation {",
      "  rankdir=LR;",
      "  node [shape=box];",
    ];

    // Add nodes
    const allPatterns = new Set<string>();
    for (const corr of this.correlations) {
      allPatterns.add(corr.patternA);
      allPatterns.add(corr.patternB);
    }

    for (const pattern of allPatterns) {
      lines.push(`  "${pattern}" [label="${pattern}"];`);
    }

    // Add edges
    for (const corr of this.correlations) {
      const label = `support: ${corr.support.toFixed(2)}, confidence: ${corr.confidence.toFixed(2)}`;
      lines.push(`  "${corr.patternA}" -> "${corr.patternB}" [label="${label}"];`);
    }

    lines.push("}");

    await Bun.write(outputPath, lines.join("\n"));
    console.log(`✅ Exported correlation graph to ${outputPath}`);
  }

  /**
   * Print correlations
   */
  printCorrelations(): void {
    console.log(`\n🔗 Found ${this.correlations.length} correlations:\n`);
    for (const corr of this.correlations) {
      console.log(`  ${corr.patternA} ↔ ${corr.patternB}`);
      console.log(`    Support: ${(corr.support * 100).toFixed(1)}%`);
      console.log(`    Confidence: ${(corr.confidence * 100).toFixed(1)}%`);
      console.log(`    Files: ${corr.files.length}`);
      console.log();
    }
  }
}

// CLI interface
if (import.meta.main) {
  const args = process.argv.slice(2);
  const patternsPath = args.find((a) => a.startsWith("--patterns="))?.split("=")[1] || "./patterns.yaml";
  const acrossFiles = args.includes("--across-files");
  const minConfidence = parseFloat(args.find((a) => a.startsWith("--min-confidence="))?.split("=")[1] || "0.85");
  const output = args.find((a) => a.startsWith("--output="))?.split("=")[1] || "pattern-graph.json";
  
  const options = {
    output,
    minSupport: parseFloat(args.find((a) => a.startsWith("--min-support="))?.split("=")[1] || "0.7"),
    confidence: minConfidence,
    acrossFiles,
  };

  const weaver = new PatternWeaver(patternsPath, options);
  await weaver.loadPatterns();
  await weaver.correlate();

  // Export to JSON format
  if (output.endsWith(".json")) {
    const correlations = weaver["correlations"];
    const patternMatches = weaver["patternMatches"];
    const graphData = {
      correlations: correlations.map(c => ({
        patternA: c.patternA,
        patternB: c.patternB,
        support: c.support,
        confidence: c.confidence,
        files: c.files,
      })),
      patterns: Array.from(patternMatches.entries()).map(([name, matches]) => ({
        name,
        matches: matches.length,
        files: [...new Set(matches.map(m => m.file))],
      })),
    };
    await Bun.write(output, JSON.stringify(graphData, null, 2));
    console.log(`✅ Exported pattern graph to ${output}`);
  } else {
    await weaver.exportGraphviz(output);
  }
}

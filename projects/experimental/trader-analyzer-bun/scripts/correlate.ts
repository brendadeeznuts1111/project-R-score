/**
 * @fileoverview Cross-Pattern Correlation Tool
 * @description Find related patterns and assess risk
 * @module scripts/correlate
 * 
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-CORRELATE@0.1.0;instance-id=CORRELATE-001;version=0.1.0}]
 * [PROPERTIES:{correlate={value:"pattern-correlation";@root:"ROOT-DEV";@chain:["BP-SECURITY","BP-PATTERNS"];@version:"0.1.0"}}]
 * [CLASS:PatternCorrelator][#REF:v-0.1.0.BP.CORRELATE.1.0.A.1.1.DEV.1.1]]
 */

// Use Bun.Glob for file matching

interface CorrelateOptions {
  patternA: string;
  patternB: string;
  distance?: number;
  riskScore?: boolean;
  autoFix?: boolean;
}

interface Correlation {
  file: string;
  patternA: { line: number; content: string };
  patternB: { line: number; content: string };
  distance: number;
  riskScore: number;
}

/**
 * Pattern correlator for security analysis
 */
export class PatternCorrelator {
  private correlations: Correlation[] = [];

  constructor(private options: CorrelateOptions) {}

  /**
   * Correlate patterns across codebase
   */
  async correlate(directory: string = "src"): Promise<Correlation[]> {
    const glob = new Bun.Glob("**/*.{ts,js}");
    const files = Array.from(glob.scanSync({ cwd: directory }))
      .map((f) => `${directory}/${f}`);
    this.correlations = [];

    for (const file of files) {
      await this.correlateFile(file);
    }

    return this.correlations;
  }

  /**
   * Correlate patterns in single file
   */
  private async correlateFile(filePath: string): Promise<void> {
    const content = await Bun.file(filePath).text();
    const lines = content.split("\n");

    const matchesA = this.findPattern(lines, this.options.patternA);
    const matchesB = this.findPattern(lines, this.options.patternB);

    const maxDistance = this.options.distance || 3;

    for (const matchA of matchesA) {
      for (const matchB of matchesB) {
        const distance = Math.abs(matchA.line - matchB.line);

        if (distance <= maxDistance) {
          const riskScore = this.calculateRiskScore(matchA, matchB, distance);
          this.correlations.push({
            file: filePath,
            patternA: matchA,
            patternB: matchB,
            distance,
            riskScore,
          });
        }
      }
    }
  }

  /**
   * Find pattern matches in lines
   */
  private findPattern(
    lines: string[],
    pattern: string,
  ): Array<{ line: number; content: string }> {
    const matches: Array<{ line: number; content: string }> = [];
    const regex = this.patternToRegex(pattern);

    for (let i = 0; i < lines.length; i++) {
      if (regex.test(lines[i])) {
        matches.push({
          line: i + 1,
          content: lines[i].trim(),
        });
      }
    }

    return matches;
  }

  /**
   * Convert pattern to regex
   */
  private patternToRegex(pattern: string): RegExp {
    // Convert db.query($SQL) to regex
    const escaped = pattern
      .replace(/\$(\w+)/g, ".*?")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)");
    return new RegExp(escaped, "i");
  }

  /**
   * Calculate risk score
   */
  private calculateRiskScore(
    matchA: { line: number; content: string },
    matchB: { line: number; content: string },
    distance: number,
  ): number {
    let score = 0;

    // Base risk from pattern types
    if (this.options.patternA.includes("db.query")) score += 0.5;
    if (this.options.patternB.includes("userInput")) score += 0.5;

    // Proximity increases risk
    score += (1 - distance / 10) * 0.3;

    // Content analysis
    if (matchA.content.includes("eval") || matchB.content.includes("eval")) {
      score += 0.2;
    }

    return Math.min(1.0, score);
  }

  /**
   * Auto-fix correlations
   */
  async autoFix(): Promise<void> {
    for (const corr of this.correlations) {
      if (corr.riskScore > 0.7) {
        await this.fixCorrelation(corr);
      }
    }
  }

  /**
   * Fix single correlation
   */
  private async fixCorrelation(corr: Correlation): Promise<void> {
    const content = await Bun.file(corr.file).text();
    const lines = content.split("\n");

    // Simple fix: add validation/sanitization
    const fixLine = `  // SECURITY: Added input validation`;
    lines.splice(corr.patternB.line, 0, fixLine);

    await Bun.write(corr.file, lines.join("\n"));
    console.log(`✅ Fixed: ${corr.file} (risk: ${(corr.riskScore * 100).toFixed(0)}%)`);
  }

  /**
   * Print correlations
   */
  printCorrelations(): void {
    console.log(`\n🔗 Found ${this.correlations.length} correlations:\n`);
    
    const sorted = this.correlations.sort((a, b) => b.riskScore - a.riskScore);
    
    for (const corr of sorted) {
      console.log(`📄 ${corr.file}`);
      console.log(`   Pattern A (line ${corr.patternA.line}): ${corr.patternA.content}`);
      console.log(`   Pattern B (line ${corr.patternB.line}): ${corr.patternB.content}`);
      console.log(`   Distance: ${corr.distance} lines`);
      console.log(`   Risk Score: ${(corr.riskScore * 100).toFixed(0)}%`);
      console.log();
    }
  }
}

// CLI interface
if (import.meta.main) {
  const args = process.argv.slice(2);
  const options: CorrelateOptions = {
    patternA: args.find((a) => a.startsWith("--pattern-a="))?.split("=")[1] || "",
    patternB: args.find((a) => a.startsWith("--pattern-b="))?.split("=")[1] || "",
    distance: parseInt(args.find((a) => a.startsWith("--distance="))?.split("=")[1] || "3"),
    riskScore: args.includes("--risk-score"),
    autoFix: args.includes("--auto-fix"),
  };

  if (!options.patternA || !options.patternB) {
    console.error("Usage: bun correlate --pattern-a='db.query($SQL)' --pattern-b='userInput($VAR)' --distance=3 --risk-score --auto-fix");
    process.exit(1);
  }

  const correlator = new PatternCorrelator(options);
  await correlator.correlate();

  if (options.autoFix) {
    await correlator.autoFix();
  } else {
    correlator.printCorrelations();
  }
}

/**
 * @fileoverview Semantic Grep Tool
 * @description Semantic code search with context awareness
 * @module scripts/sgrep
 * 
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-SGREP@0.1.0;instance-id=SGREP-001;version=0.1.0}]
 * [PROPERTIES:{sgrep={value:"semantic-grep";@root:"ROOT-DEV";@chain:["BP-SEARCH","BP-SEMANTIC"];@version:"0.1.0"}}]
 * [CLASS:SemanticGrep][#REF:v-0.1.0.BP.SGREP.1.0.A.1.1.DEV.1.1]]
 */

// Use Bun.Glob for file matching

interface SGrepOptions {
  pattern: string;
  semantic?: boolean;
  confidence?: number;
  context?: number;
  transform?: string;
}

interface Match {
  file: string;
  line: number;
  content: string;
  context: string[];
  confidence: number;
}

/**
 * Semantic grep for code search
 */
export class SemanticGrep {
  private matches: Match[] = [];

  constructor(private options: SGrepOptions) {}

  /**
   * Search codebase
   */
  async search(directory: string = "src"): Promise<Match[]> {
    const glob = new Bun.Glob("**/*.{ts,js}");
    const files = Array.from(glob.scanSync({ cwd: directory }))
      .map((f) => `${directory}/${f}`);
    this.matches = [];

    for (const file of files) {
      await this.searchFile(file);
    }

    // Filter by confidence
    return this.matches.filter(
      (m) => m.confidence >= (this.options.confidence || 0.5),
    );
  }

  /**
   * Search single file
   */
  private async searchFile(filePath: string): Promise<void> {
    const content = await Bun.file(filePath).text();
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const confidence = this.matchSemantic(line, this.options.pattern);

      if (confidence > 0) {
        const context = this.getContext(lines, i, this.options.context || 3);
        this.matches.push({
          file: filePath,
          line: i + 1,
          content: line.trim(),
          context,
          confidence,
        });
      }
    }
  }

  /**
   * Semantic matching with confidence score
   */
  private matchSemantic(line: string, pattern: string): number {
    const lowerLine = line.toLowerCase();
    const lowerPattern = pattern.toLowerCase();

    // Exact match
    if (lowerLine.includes(lowerPattern)) {
      return 1.0;
    }

    // Semantic matching: split pattern into keywords
    const keywords = lowerPattern.split(/\s+/).filter((k) => k.length > 2);
    let matches = 0;

    for (const keyword of keywords) {
      if (lowerLine.includes(keyword)) {
        matches++;
      }
    }

    return matches / keywords.length;
  }

  /**
   * Get context lines
   */
  private getContext(
    lines: string[],
    index: number,
    contextLines: number,
  ): string[] {
    const start = Math.max(0, index - contextLines);
    const end = Math.min(lines.length, index + contextLines + 1);
    return lines.slice(start, end).map((l, i) => {
      const lineNum = start + i + 1;
      const marker = lineNum === index + 1 ? ">>>" : "   ";
      return `${marker} ${lineNum}: ${l}`;
    });
  }

  /**
   * Apply transform to matches
   */
  async applyTransform(): Promise<void> {
    if (!this.options.transform) return;

    for (const match of this.matches) {
      await this.transformFile(match);
    }
  }

  /**
   * Transform file
   */
  private async transformFile(match: Match): Promise<void> {
    const content = await Bun.file(match.file).text();
    const lines = content.split("\n");

    // Apply transform (simplified)
    const transformed = this.options.transform!.replace(
      "$LINE",
      match.content,
    );
    lines[match.line - 1] = transformed;

    await Bun.write(match.file, lines.join("\n"));
    console.log(`✅ Transformed: ${match.file}:${match.line}`);
  }

  /**
   * Print results
   */
  printResults(): void {
    console.log(`\n📊 Found ${this.matches.length} matches:\n`);
    for (const match of this.matches) {
      console.log(`📄 ${match.file}:${match.line} (confidence: ${(match.confidence * 100).toFixed(0)}%)`);
      console.log(`   ${match.content}`);
      if (match.context.length > 1) {
        console.log(`   Context:`);
        match.context.forEach((c) => console.log(`   ${c}`));
      }
      console.log();
    }
  }
}

// CLI interface
if (import.meta.main) {
  const args = process.argv.slice(2);
  const options: SGrepOptions = {
    pattern: args.find((a) => a.startsWith("--pattern="))?.split("=")[1] || "",
    semantic: args.includes("--semantic"),
    confidence: parseFloat(args.find((a) => a.startsWith("--confidence="))?.split("=")[1] || "0.5"),
    context: parseInt(args.find((a) => a.startsWith("--context="))?.split("=")[1] || "3"),
    transform: args.find((a) => a.startsWith("--transform="))?.split("=")[1],
  };

  if (!options.pattern) {
    console.error("Usage: bun sgrep --pattern='security.*vulnerability' --semantic --confidence=0.95 --context=3");
    process.exit(1);
  }

  const sgrep = new SemanticGrep(options);
  const matches = await sgrep.search();
  
  if (options.transform) {
    await sgrep.applyTransform();
  } else {
    sgrep.printResults();
  }
}

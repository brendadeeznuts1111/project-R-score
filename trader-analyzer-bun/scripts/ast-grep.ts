/**
 * @fileoverview Advanced AST Pattern Matching
 * @description AST grep with type inference and context awareness
 * @module scripts/ast-grep
 * 
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-AST-GREP@0.1.0;instance-id=AST-GREP-001;version=0.1.0}]
 * [PROPERTIES:{ast-grep={value:"ast-pattern-matching";@root:"ROOT-DEV";@chain:["BP-AST","BP-PATTERNS"];@version:"0.1.0"}}]
 * [CLASS:AstGrep][#REF:v-0.1.0.BP.AST.GREP.1.0.A.1.1.DEV.1.1]]
 */

interface AstGrepOptions {
  pattern: string;
  where?: string;
  transform?: string;
  context?: number;
  language?: "typescript" | "javascript";
  editor?: "integrate";
  query?: string;
  rewrite?: string;
}

interface Match {
  file: string;
  line: number;
  column: number;
  match: string;
  context: {
    before: string[];
    after: string[];
  };
  inferredType?: string;
}

/**
 * AST-aware pattern matcher with type inference
 */
export class AstGrep {
  private matches: Match[] = [];

  constructor(private options: AstGrepOptions) {}

  /**
   * Search codebase with AST patterns
   */
  async search(directory: string = "src"): Promise<Match[]> {
    const glob = new Bun.Glob("**/*.{ts,js}");
    const files = Array.from(glob.scanSync({ cwd: directory }))
      .map((f) => `${directory}/${f}`);
    this.matches = [];

    for (const file of files) {
      await this.searchFile(file);
    }

    return this.matches;
  }

  /**
   * Search single file with AST awareness
   */
  private async searchFile(filePath: string): Promise<void> {
    const content = await Bun.file(filePath).text();
    const lines = content.split("\n");

    // Parse pattern: unsafeCall($FUNC, $ARGS)
    const patternRegex = this.parseAstPattern(this.options.pattern);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(patternRegex);

      if (match) {
        // Check where condition with type inference
        if (await this.checkWhereCondition(match, line, filePath)) {
          const inferredType = this.inferType(match, line);
          const context = this.getContext(lines, i, this.options.context);

          this.matches.push({
            file: filePath,
            line: i + 1,
            column: match.index || 0,
            match: match[0],
            context,
            inferredType,
          });
        }
      }
    }
  }

  /**
   * Parse AST pattern to regex
   */
  private parseAstPattern(pattern: string): RegExp {
    // Convert unsafeCall($FUNC, $ARGS) to regex
    const escaped = pattern
      .replace(/\$(\w+)/g, "([^\\s(),]+)")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)");
    return new RegExp(escaped);
  }

  /**
   * Check where condition with type inference
   */
  private async checkWhereCondition(
    match: RegExpMatchArray,
    line: string,
    filePath: string,
  ): Promise<boolean> {
    if (!this.options.where) return true;

    // Parse: $FUNC.type() == "Identifier" && $FUNC.name() in ["eval", "setTimeout"]
    const conditions = this.options.where.split("&&");

    for (const condition of conditions) {
      if (!(await this.evaluateCondition(condition, match, line, filePath))) {
        return false;
      }
    }

    return true;
  }

  /**
   * Evaluate single condition
   */
  private async evaluateCondition(
    condition: string,
    match: RegExpMatchArray,
    line: string,
    filePath: string,
  ): Promise<boolean> {
    condition = condition.trim();

    // Type check: $FUNC.type() == "Identifier"
    const typeMatch = condition.match(/\$(\w+)\.type\(\)\s*==\s*"(\w+)"/);
    if (typeMatch) {
      const varName = typeMatch[1];
      const expectedType = typeMatch[2];
      const actualType = this.getVariableType(varName, match, line);
      return actualType === expectedType;
    }

    // Name check: $FUNC.name() in ["eval", "setTimeout"]
    const nameMatch = condition.match(/\$(\w+)\.name\(\)\s+in\s+\[(.*?)\]/);
    if (nameMatch) {
      const varName = nameMatch[1];
      const allowed = nameMatch[2]
        .split(",")
        .map((s) => s.trim().replace(/['"]/g, ""));
      const actualName = this.getVariableName(varName, match);
      return allowed.includes(actualName);
    }

    return true;
  }

  /**
   * Get variable type (simplified inference)
   */
  private getVariableType(
    varName: string,
    match: RegExpMatchArray,
    line: string,
  ): string {
    // Simple type inference based on context
    const varValue = this.getVariableValue(varName, match);
    if (/^[A-Z]/.test(varValue)) return "Identifier";
    if (/^\d+$/.test(varValue)) return "Literal";
    if (/^['"]/.test(varValue)) return "StringLiteral";
    return "Identifier";
  }

  /**
   * Get variable name
   */
  private getVariableName(varName: string, match: RegExpMatchArray): string {
    return this.getVariableValue(varName, match);
  }

  /**
   * Get variable value from match
   */
  private getVariableValue(varName: string, match: RegExpMatchArray): string {
    // Find variable position in pattern
    const patternParts = this.options.pattern.split(/\$(\w+)/);
    const varIndex = patternParts.indexOf(varName);
    return match[varIndex + 1] || "";
  }

  /**
   * Infer type from context
   */
  private inferType(match: RegExpMatchArray, line: string): string {
    // Simple type inference
    const funcName = match[1] || "";
    if (["eval", "Function"].includes(funcName)) return "Function";
    if (["setTimeout", "setInterval"].includes(funcName)) return "Timer";
    return "unknown";
  }

  /**
   * Get context lines
   */
  private getContext(
    lines: string[],
    index: number,
    contextLines?: number,
  ): { before: string[]; after: string[] } {
    const linesToShow = contextLines || this.options.context || 3;
    const start = Math.max(0, index - linesToShow);
    const end = Math.min(lines.length, index + linesToShow + 1);
    return {
      before: lines.slice(start, index),
      after: lines.slice(index + 1, end),
    };
  }

  /**
   * Apply transform
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

    // Apply transform: safeCall($FUNC, $ARGS)
    const transformed = this.options.transform!.replace(
      /\$(\w+)/g,
      (_, varName) => {
        return this.getVariableValue(varName, {
          0: match.match,
          1: match.match.split("(")[1]?.split(",")[0] || "",
        } as RegExpMatchArray);
      },
    );

    lines[match.line - 1] = lines[match.line - 1].replace(
      match.match,
      transformed,
    );

    await Bun.write(match.file, lines.join("\n"));
    console.log(`✅ Transformed: ${match.file}:${match.line}`);
  }

  /**
   * Print results
   */
  printResults(): void {
    console.log(`\n📊 Found ${this.matches.length} AST matches:\n`);
    for (const match of this.matches) {
      console.log(`📄 ${match.file}:${match.line}:${match.column}`);
      console.log(`   Match: ${match.match}`);
      if (match.inferredType) {
        console.log(`   Type: ${match.inferredType}`);
      }
      if (match.context.before.length > 0) {
        console.log(`   Context before:`);
        match.context.before.forEach((c) => console.log(`     ${c}`));
      }
      console.log();
    }
  }
}

// CLI interface
if (import.meta.main) {
  const args = process.argv.slice(2);
  const options: AstGrepOptions = {
    pattern: args.find((a) => a.startsWith("--pattern="))?.split("=")[1] || "",
    where: args.find((a) => a.startsWith("--where="))?.split("=")[1],
    transform: args.find((a) => a.startsWith("--transform="))?.split("=")[1],
    context: parseInt(args.find((a) => a.startsWith("--context="))?.split("=")[1] || "3"),
    language: (args.find((a) => a.startsWith("--language="))?.split("=")[1] as "typescript" | "javascript") || "typescript",
    editor: args.find((a) => a.startsWith("--editor="))?.split("=")[1] as "integrate",
    query: args.find((a) => a.startsWith("--query="))?.split("=")[1],
    rewrite: args.find((a) => a.startsWith("--rewrite="))?.split("=")[1],
  };

  // Support query syntax: [CallExpr:has([Identifier[name="require"]])]
  if (options.query && options.rewrite) {
    // Convert query to pattern
    const queryMatch = options.query.match(/\[(\w+):has\(\[(\w+)\[name="(\w+)"\]\]\)\]/);
    if (queryMatch) {
      options.pattern = `${queryMatch[3]}($EXPR)`;
      options.transform = options.rewrite;
    }
  }

  if (!options.pattern && !options.query) {
    console.error("Usage: bun ast-grep --pattern='eval($EXPR)' --context=50 --transform='safeEval($EXPR)'");
    console.error("   or: bun ast-grep --query='[CallExpr:has([Identifier[name=\"require\"]])]' --rewrite='import'");
    process.exit(1);
  }

  const astGrep = new AstGrep(options);
  await astGrep.search();

  if (options.transform || options.rewrite) {
    await astGrep.applyTransform();
  } else {
    astGrep.printResults();
  }
}

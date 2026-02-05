/**
 * @fileoverview Security Anti-Pattern Detection
 * @description Detect and fix security anti-patterns with automatic fixes
 * @module scripts/anti-pattern
 * 
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-ANTI-PATTERN@0.1.0;instance-id=ANTI-PATTERN-001;version=0.1.0}]
 * [PROPERTIES:{anti-pattern={value:"security-detection";@root:"ROOT-SECURITY";@chain:["BP-SECURITY","BP-PATTERNS"];@version:"0.1.0"}}]
 * [CLASS:AntiPatternDetector][#REF:v-0.1.0.BP.ANTI.PATTERN.1.0.A.1.1.SECURITY.1.1]]
 */

// Use Bun.Glob for file matching

interface SecurityRule {
  id: string;
  name: string;
  pattern: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  fix?: string;
  cwe?: string;
}

interface SecurityConfig {
  rules: SecurityRule[];
}

interface Finding {
  rule: SecurityRule;
  file: string;
  line: number;
  match: string;
  fixed?: boolean;
}

/**
 * Security anti-pattern detector
 */
export class AntiPatternDetector {
  private rules: SecurityRule[] = [];
  private findings: Finding[] = [];

  constructor(
    private configPath: string,
    private options: {
      autofix?: boolean;
      backup?: boolean;
      report?: string;
      severity?: "low" | "medium" | "high" | "critical";
    } = {},
  ) {}

  /**
   * Load security rules from YAML
   */
  async loadRules(): Promise<void> {
    try {
      const content = await Bun.file(this.configPath).text();
      const config = this.parseYAML(content);
      this.rules = config.rules || [];

      // Filter by severity
      if (this.options.severity) {
        const severityLevels = ["low", "medium", "high", "critical"];
        const minLevel = severityLevels.indexOf(this.options.severity);
        this.rules = this.rules.filter((rule) => {
          const ruleLevel = severityLevels.indexOf(rule.severity);
          return ruleLevel >= minLevel;
        });
      }
    } catch (error) {
      console.error(`Failed to load rules from ${this.configPath}:`, error);
      process.exit(1);
    }
  }

  /**
   * Simple YAML parser
   */
  private parseYAML(content: string): SecurityConfig {
    const config: SecurityConfig = { rules: [] };
    const lines = content.split("\n");

    let currentRule: Partial<SecurityRule> = {};
    let inRules = false;

    for (const line of lines) {
      if (line.trim() === "rules:") {
        inRules = true;
        continue;
      }

      if (inRules) {
        if (line.match(/^\s+- id:/)) {
          if (currentRule.id) {
            config.rules.push(currentRule as SecurityRule);
          }
          currentRule = { id: line.split(":")[1].trim().replace(/['"]/g, "") };
        } else if (line.match(/^\s+name:/)) {
          currentRule.name = line.split(":")[1].trim().replace(/['"]/g, "");
        } else if (line.match(/^\s+pattern:/)) {
          currentRule.pattern = line.split(":")[1].trim().replace(/['"]/g, "");
        } else if (line.match(/^\s+severity:/)) {
          currentRule.severity = line.split(":")[1].trim().replace(/['"]/g, "") as SecurityRule["severity"];
        } else if (line.match(/^\s+description:/)) {
          currentRule.description = line.split(":")[1].trim().replace(/['"]/g, "");
        } else if (line.match(/^\s+fix:/)) {
          currentRule.fix = line.split(":")[1].trim().replace(/['"]/g, "");
        } else if (line.match(/^\s+cwe:/)) {
          currentRule.cwe = line.split(":")[1].trim().replace(/['"]/g, "");
        }
      }
    }

    if (currentRule.id) {
      config.rules.push(currentRule as SecurityRule);
    }

    return config;
  }

  /**
   * Scan codebase for anti-patterns
   */
  async scan(directory: string = "src"): Promise<Finding[]> {
    const glob = new Bun.Glob("**/*.{ts,js}");
    const files = Array.from(glob.scanSync({ cwd: directory }))
      .map((f) => `${directory}/${f}`);
    this.findings = [];

    for (const file of files) {
      await this.scanFile(file);
    }

    return this.findings;
  }

  /**
   * Scan single file
   */
  private async scanFile(filePath: string): Promise<void> {
    const content = await Bun.file(filePath).text();
    const lines = content.split("\n");

    for (const rule of this.rules) {
      const regex = new RegExp(rule.pattern, "g");

      for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(regex);
        if (match) {
          this.findings.push({
            rule,
            file: filePath,
            line: i + 1,
            match: match[0],
          });
        }
      }
    }
  }

  /**
   * Apply automatic fixes
   */
  async applyFixes(): Promise<void> {
    if (!this.options.autofix) return;

    const filesToFix = new Map<string, Array<{ finding: Finding; replacement: string }>>();

    for (const finding of this.findings) {
      if (finding.rule.fix) {
        const replacement = finding.rule.fix.replace("$MATCH", finding.match);
        if (!filesToFix.has(finding.file)) {
          filesToFix.set(finding.file, []);
        }
        filesToFix.get(finding.file)!.push({ finding, replacement });
      }
    }

    for (const [file, fixes] of filesToFix.entries()) {
      await this.fixFile(file, fixes);
    }
  }

  /**
   * Fix single file
   */
  private async fixFile(
    filePath: string,
    fixes: Array<{ finding: Finding; replacement: string }>,
  ): Promise<void> {
    // Create backup
    if (this.options.backup) {
      const content = await Bun.file(filePath).text();
      await Bun.write(`${filePath}.bak`, content);
    }

    const content = await Bun.file(filePath).text();
    const lines = content.split("\n");

    // Apply fixes (reverse order to maintain line numbers)
    fixes.sort((a, b) => b.finding.line - a.finding.line);

    for (const fix of fixes) {
      lines[fix.finding.line - 1] = lines[fix.finding.line - 1].replace(
        fix.finding.match,
        fix.replacement,
      );
      fix.finding.fixed = true;
    }

    await Bun.write(filePath, lines.join("\n"));
    console.log(`✅ Fixed ${fixes.length} issues in ${filePath}`);
  }

  /**
   * Generate report
   */
  async generateReport(outputPath: string): Promise<void> {
    const lines: string[] = [
      "# Security Fixes Report",
      `Generated: ${new Date().toISOString()}`,
      "",
      `## Summary`,
      `Total Findings: ${this.findings.length}`,
      `Fixed: ${this.findings.filter((f) => f.fixed).length}`,
      `Remaining: ${this.findings.filter((f) => !f.fixed).length}`,
      "",
      "## Findings",
      "",
    ];

    // Group by severity
    const bySeverity = new Map<string, Finding[]>();
    for (const finding of this.findings) {
      const severity = finding.rule.severity;
      if (!bySeverity.has(severity)) {
        bySeverity.set(severity, []);
      }
      bySeverity.get(severity)!.push(finding);
    }

    for (const [severity, findings] of Array.from(bySeverity.entries()).sort()) {
      lines.push(`### ${severity.toUpperCase()} (${findings.length})`);
      lines.push("");

      for (const finding of findings) {
        lines.push(`- **${finding.rule.name}** (${finding.rule.id})`);
        lines.push(`  - File: \`${finding.file}:${finding.line}\``);
        lines.push(`  - Match: \`${finding.match}\``);
        lines.push(`  - Description: ${finding.rule.description}`);
        if (finding.rule.cwe) {
          lines.push(`  - CWE: ${finding.rule.cwe}`);
        }
        if (finding.fixed) {
          lines.push(`  - ✅ Fixed`);
        }
        lines.push("");
      }
    }

    await Bun.write(outputPath, lines.join("\n"));
    console.log(`✅ Report generated: ${outputPath}`);
  }

  /**
   * Print findings
   */
  printFindings(): void {
    console.log(`\n🔍 Found ${this.findings.length} security issues:\n`);
    for (const finding of this.findings) {
      console.log(`[${finding.rule.severity.toUpperCase()}] ${finding.rule.name}`);
      console.log(`  ${finding.file}:${finding.line}`);
      console.log(`  ${finding.match}`);
      console.log(`  ${finding.rule.description}`);
      if (finding.fixed) {
        console.log(`  ✅ Fixed`);
      }
      console.log();
    }
  }
}

// CLI interface
if (import.meta.main) {
  const args = process.argv.slice(2);
  const configPath = args.find((a) => a.startsWith("--config="))?.split("=")[1] || "./security-rules.yaml";
  const options = {
    autofix: args.includes("--autofix"),
    backup: args.includes("--backup"),
    report: args.find((a) => a.startsWith("--report="))?.split("=")[1],
    severity: args.find((a) => a.startsWith("--severity="))?.split("=")[1] as "low" | "medium" | "high" | "critical",
  };

  const detector = new AntiPatternDetector(configPath, options);
  await detector.loadRules();
  await detector.scan();

  if (options.autofix) {
    await detector.applyFixes();
  }

  if (options.report) {
    await detector.generateReport(options.report);
  } else {
    detector.printFindings();
  }
}

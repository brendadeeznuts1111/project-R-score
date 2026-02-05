import { apiTracker } from '../packages/odds-core/src/monitoring/api-tracker.js';
#!/usr/bin/env bun

import { spawn } from "bun";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

interface VerificationResult {
  status: "pass" | "fail" | "warning";
  category: string;
  message: string;
  details?: any;
  suggestions?: string[];
}

interface HealthReport {
  overall: "healthy" | "degraded" | "unhealthy";
  score: number;
  timestamp: string;
  results: VerificationResult[];
  summary: {
    passed: number;
    failed: number;
    warnings: number;
  };
}

class IncrementalVerifier {
  private projectPath: string;
  private cache = new Map<string, any>();
  private lastVerification: number = 0;

  constructor(projectPath: string = process.cwd()) {
    this.projectPath = projectPath;
  }

  async verifyProject(options: {
    deepScan?: boolean;
    security?: boolean;
    performance?: boolean;
    incremental?: boolean;
  } = {}): Promise<HealthReport> {
    const { deepScan = false, security = true, performance = true, incremental = true } = options;
    
    console.log("🔍 Starting project verification...");
    
    const results: VerificationResult[] = [];
    const startTime = Date.now();

    // Basic structure verification
    results.push(await this.verifyStructure());
    
    // Dependencies verification
    results.push(await this.verifyDependencies());
    
    // Configuration verification
    results.push(await this.verifyConfiguration());
    
    // TypeScript verification
    results.push(await this.verifyTypeScript());
    
    // Security verification
    if (security) {
      results.push(await this.verifySecurity());
    }
    
    // Performance verification
    if (performance) {
      results.push(await this.verifyPerformance());
    }
    
    // Testing verification
    results.push(await this.verifyTesting());
    
    // Deep scan verification
    if (deepScan) {
      results.push(await this.verifyCodeQuality());
      results.push(await this.verifyDocumentation());
    }

    const summary = {
      passed: results.filter(r => r.status === "pass").length,
      failed: results.filter(r => r.status === "fail").length,
      warnings: results.filter(r => r.status === "warning").length,
    };

    const score = Math.round((summary.passed / results.length) * 100);
    
    const overall: "healthy" | "degraded" | "unhealthy" = 
      score >= 90 ? "healthy" : 
      score >= 70 ? "degraded" : "unhealthy";

    const report: HealthReport = {
      overall,
      score,
      timestamp: new Date().toISOString(),
      results,
      summary,
    };

    // Cache results for incremental verification
    if (incremental) {
      this.cache.set("lastReport", report);
      this.lastVerification = startTime;
    }

    console.log(`✅ Verification completed in ${Date.now() - startTime}ms`);
    console.log(`📊 Overall health: ${overall} (${score}% - ${summary.passed}/${results.length} checks passed)`);

    return report;
  }

  private async verifyStructure(): Promise<VerificationResult> {
    const requiredDirs = ["packages", "apps", "scripts"];
    const requiredFiles = ["package.json", "bunfig.toml", "bun.test.toml", ".gitignore"];
    
    const missingDirs = requiredDirs.filter(dir => !existsSync(join(this.projectPath, dir)));
    const missingFiles = requiredFiles.filter(file => !existsSync(join(this.projectPath, file)));

    if (missingDirs.length === 0 && missingFiles.length === 0) {
      return {
        status: "pass",
        category: "Structure",
        message: "Project structure is complete",
      };
    }

    return {
      status: "fail",
      category: "Structure",
      message: "Missing required directories or files",
      details: { missingDirs, missingFiles },
      suggestions: [
        "Create missing directories with mkdir -p",
        "Add missing configuration files",
        "Ensure monorepo structure is properly set up",
      ],
    };
  }

  private async verifyDependencies(): Promise<VerificationResult> {
    try {
      const packageJsonPath = join(this.projectPath, "package.json");
      if (!existsSync(packageJsonPath)) {
        return {
          status: "fail",
          category: "Dependencies",
          message: "package.json not found",
        };
      }

      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
      
      // Check for workspace configuration
      if (!packageJson.workspaces) {
        return {
          status: "warning",
          category: "Dependencies",
          message: "No workspace configuration found",
          suggestions: ["Configure workspaces for monorepo management"],
        };
      }

      // Check for catalog management
      if (!packageJson.workspaces.catalog) {
        return {
          status: "warning",
          category: "Dependencies",
          message: "No dependency catalog configured",
          suggestions: ["Set up catalog for centralized dependency management"],
        };
      }

      // Verify bun.lock exists
      if (!existsSync(join(this.projectPath, "bun.lock"))) {
        return {
          status: "warning",
          category: "Dependencies",
          message: "No lock file found",
          suggestions: ["Run 'bun install' to generate lock file"],
        };
      }

      return {
        status: "pass",
        category: "Dependencies",
        message: "Dependencies are properly configured",
      };
    } catch (error: any) {
      return {
        status: "fail",
        category: "Dependencies",
        message: `Failed to verify dependencies: ${error.message}`,
      };
    }
  }

  private async verifyConfiguration(): Promise<VerificationResult> {
    const configs = [
      { file: "bunfig.toml", required: true },
      { file: "bun.test.toml", required: true },
      { file: "tsconfig.json", required: false },
    ];

    const missing = configs.filter(config => 
      config.required && !existsSync(join(this.projectPath, config.file))
    );

    if (missing.length > 0) {
      return {
        status: "fail",
        category: "Configuration",
        message: "Missing required configuration files",
        details: { missing: missing.map(c => c.file) },
      };
    }

    // Validate bunfig.toml
    try {
      const bunfigPath = join(this.projectPath, "bunfig.toml");
      if (existsSync(bunfigPath)) {
        const bunfig = readFileSync(bunfigPath, "utf-8");
        
        if (!bunfig.includes("[install]")) {
          return {
            status: "warning",
            category: "Configuration",
            message: "bunfig.toml missing install configuration",
            suggestions: ["Add [install] section with optimization settings"],
          };
        }
      }
    } catch (error: any) {
      return {
        status: "fail",
        category: "Configuration",
        message: `Failed to parse bunfig.toml: ${error.message}`,
      };
    }

    return {
      status: "pass",
      category: "Configuration",
      message: "Configuration files are valid",
    };
  }

  private async verifyTypeScript(): Promise<VerificationResult> {
    try {
      const proc = Bun.spawn({
        cmd: ["bun", "run", "typecheck"],
        cwd: this.projectPath,
        stdout: "pipe",
        stderr: "pipe",
      });

      const output = await new Response(proc.stderr).text();
      await proc.exited;

      if (proc.exitCode === 0) {
        return {
          status: "pass",
          category: "TypeScript",
          message: "TypeScript compilation successful",
        };
      }

      return {
        status: "fail",
        category: "TypeScript",
        message: "TypeScript compilation failed",
        details: { errors: output },
        suggestions: ["Fix type errors", "Check tsconfig.json configuration"],
      };
    } catch (error: any) {
      return {
        status: "fail",
        category: "TypeScript",
        message: `Failed to run TypeScript check: ${error.message}`,
      };
    }
  }

  private async verifySecurity(): Promise<VerificationResult> {
    try {
      const proc = Bun.spawn({
        cmd: ["bun", "audit"],
        cwd: this.projectPath,
        stdout: "pipe",
        stderr: "pipe",
      });

      const output = await new Response(proc.stdout).text();
      await proc.exited;

      if (output.includes("0 vulnerabilities found")) {
        return {
          status: "pass",
          category: "Security",
          message: "No security vulnerabilities found",
        };
      }

      const vulnCount = (output.match(/\d+ vulnerabilities/) || [])[0];
      
      return {
        status: "warning",
        category: "Security",
        message: `Security issues detected: ${vulnCount}`,
        details: { audit: output },
        suggestions: ["Update vulnerable dependencies", "Review security advisories"],
      };
    } catch (error: any) {
      return {
        status: "fail",
        category: "Security",
        message: `Failed to run security audit: ${error.message}`,
      };
    }
  }

  private async verifyPerformance(): Promise<VerificationResult> {
    try {
      // Check for performance optimizations
      const bunfigPath = join(this.projectPath, "bunfig.toml");
      if (!existsSync(bunfigPath)) {
        return {
          status: "warning",
          category: "Performance",
          message: "No bunfig.toml found for performance optimization",
        };
      }

      const bunfig = readFileSync(bunfigPath, "utf-8");
      
      const optimizations = [
        "linker = \"isolated\"",
        "backend = \"fast\"",
        "cache = true",
        "threadpool = true",
      ];

      const missing = optimizations.filter(opt => !bunfig.includes(opt));
      
      if (missing.length === 0) {
        return {
          status: "pass",
          category: "Performance",
          message: "Performance optimizations are configured",
        };
      }

      return {
        status: "warning",
        category: "Performance",
        message: "Missing performance optimizations",
        details: { missing },
        suggestions: [
          "Enable isolated linker for better monorepo performance",
          "Use fast backend for improved build times",
          "Enable threadpool for parallel processing",
        ],
      };
    } catch (error: any) {
      return {
        status: "fail",
        category: "Performance",
        message: `Failed to verify performance: ${error.message}`,
      };
    }
  }

  private async verifyTesting(): Promise<VerificationResult> {
    try {
      // Check test configuration
      const testConfigPath = join(this.projectPath, "bun.test.toml");
      if (!existsSync(testConfigPath)) {
        return {
          status: "warning",
          category: "Testing",
          message: "No test configuration found",
          suggestions: ["Create bun.test.toml with test settings"],
        };
      }

      // Check for test files
      const testDirs = ["packages/*/src/__tests__", "apps/*/src/__tests__", "__tests__"];
      let hasTests = false;

      for (const pattern of testDirs) {
        const proc = Bun.spawn({
          cmd: ["find", this.projectPath, "-path", pattern, "-name", "*.test.ts", "-type", "f"],
          stdout: "pipe",
        });
        
        const output = await new Response(proc.stdout).text();
        await proc.exited;
        
        if (output.trim()) {
          hasTests = true;
          break;
        }
      }

      if (!hasTests) {
        return {
          status: "warning",
          category: "Testing",
          message: "No test files found",
          suggestions: ["Add test files for critical functionality"],
        };
      }

      // Run a quick test
      const testProc = Bun.spawn({
        cmd: ["bun", "test", "--config", "./bun.test.toml", "--run"],
        cwd: this.projectPath,
        stdout: "pipe",
        stderr: "pipe",
      });

      await testProc.exited;

      if (testProc.exitCode === 0) {
        return {
          status: "pass",
          category: "Testing",
          message: "Tests are configured and passing",
        };
      }

      return {
        status: "warning",
        category: "Testing",
        message: "Tests configured but some are failing",
        suggestions: ["Fix failing tests", "Check test configuration"],
      };
    } catch (error: any) {
      return {
        status: "fail",
        category: "Testing",
        message: `Failed to verify tests: ${error.message}`,
      };
    }
  }

  private async verifyCodeQuality(): Promise<VerificationResult> {
    try {
      // Check for ESLint configuration
      const eslintFiles = [".eslintrc.js", ".eslintrc.json", "eslint.config.js"];
      const hasEslint = eslintFiles.some(file => existsSync(join(this.projectPath, file)));

      if (!hasEslint) {
        return {
          status: "warning",
          category: "Code Quality",
          message: "No ESLint configuration found",
          suggestions: ["Set up ESLint for code quality checks"],
        };
      }

      // Run ESLint
      const proc = Bun.spawn({
        cmd: ["bun", "run", "lint"],
        cwd: this.projectPath,
        stdout: "pipe",
        stderr: "pipe",
      });

      const output = await new Response(proc.stderr).text();
      await proc.exited;

      if (proc.exitCode === 0) {
        return {
          status: "pass",
          category: "Code Quality",
          message: "Code quality checks pass",
        };
      }

      return {
        status: "warning",
        category: "Code Quality",
        message: "Code quality issues detected",
        details: { lint: output },
        suggestions: ["Fix linting errors", "Review code style guidelines"],
      };
    } catch (error: any) {
      return {
        status: "fail",
        category: "Code Quality",
        message: `Failed to verify code quality: ${error.message}`,
      };
    }
  }

  private async verifyDocumentation(): Promise<VerificationResult> {
    const requiredDocs = ["README.md"];
    const optionalDocs = ["docs/", "CHANGELOG.md", "CONTRIBUTING.md"];

    const missing = requiredDocs.filter(doc => !existsSync(join(this.projectPath, doc)));
    const hasOptional = optionalDocs.some(doc => {
      if (doc.endsWith("/")) {
        return existsSync(join(this.projectPath, doc));
      }
      return existsSync(join(this.projectPath, doc));
    });

    if (missing.length > 0) {
      return {
        status: "warning",
        category: "Documentation",
        message: "Missing required documentation",
        details: { missing },
        suggestions: ["Create README.md with project information"],
      };
    }

    if (!hasOptional) {
      return {
        status: "warning",
        category: "Documentation",
        message: "Consider adding more documentation",
        suggestions: [
          "Add docs/ directory with detailed documentation",
          "Include CHANGELOG.md for version history",
          "Add CONTRIBUTING.md for development guidelines",
        ],
      };
    }

    return {
      status: "pass",
      category: "Documentation",
      message: "Documentation is complete",
    };
  }

  async generateReport(report: HealthReport): Promise<void> {
    const reportPath = join(this.projectPath, "health-report.json");
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📄 Health report saved to: ${reportPath}`);
    
    // Generate summary
    const summary = `
# Project Health Report

**Overall Status:** ${report.overall.toUpperCase()} (${report.score}%)
**Generated:** ${new Date(report.timestamp).toLocaleString()}

## Summary
- ✅ Passed: ${report.summary.passed}
- ❌ Failed: ${report.summary.failed}
- ⚠️  Warnings: ${report.summary.warnings}

## Detailed Results

${report.results.map(result => `
### ${result.category}
**Status:** ${result.status.toUpperCase()}
**Message:** ${result.message}

${result.details ? `\`\`\`json\n${JSON.stringify(result.details, null, 2)}\n\`\`\`` : ""}

${result.suggestions ? `**Suggestions:**\n${result.suggestions.map(s => `- ${s}`).join("\n")}` : ""}
`).join("\n")}

## Recommendations

${report.results
  .filter(r => r.status !== "pass")
  .flatMap(r => r.suggestions || [])
  .slice(0, 10)
  .map(s => `- ${s}`)
  .join("\n")}
    `;

    writeFileSync(join(this.projectPath, "HEALTH.md"), summary);
    console.log(`📄 Summary report saved to: HEALTH.md`);
  }
}

// CLI interface
if (import.meta.main) {
  const args = process.argv.slice(2);
  const options: any = {};

  for (const arg of args) {
    if (arg === "--deep-scan") options.deepScan = true;
    if (arg === "--no-security") options.security = false;
    if (arg === "--no-performance") options.performance = false;
    if (arg === "--no-incremental") options.incremental = false;
    if (arg === "--help") {
      console.log(`
Usage: bun run incremental-verification.ts [options]

Options:
  --deep-scan       Enable comprehensive code analysis
  --no-security     Skip security verification
  --no-performance  Skip performance verification
  --no-incremental  Disable incremental caching
  --help            Show this help

Examples:
  bun run incremental-verification.ts
  bun run incremental-verification.ts --deep-scan
  bun run incremental-verification.ts --no-security
      `);
      process.exit(0);
    }
  }

  const verifier = new IncrementalVerifier();
  
  try {
    const report = await verifier.verifyProject(options);
    await verifier.generateReport(report);
    
    // Exit with appropriate code
    process.exit(report.overall === "unhealthy" ? 1 : 0);
  } catch (error: any) {
    console.error(`❌ Verification failed: ${error.message}`);
    process.exit(1);
  }
}

export { IncrementalVerifier, VerificationResult, HealthReport };

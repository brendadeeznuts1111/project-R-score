// packages/odds-core/src/standards/rule-enforcement.ts
import { readFile, readdir } from 'fs/promises';
import { join, extname } from 'path';
import {
  UseBunBuiltinsRule,
  TrackAPIUsageRule,
  ErrorHandlingRule,
  TypeSafetyRule,
  MemoryMonitoringRule,
  PerformanceTestingRule,
  ResourceManagementRule,
  BunOptimizationsRule,
  LoggingMonitoringRule,
  StayUpdatedRule,
  EnvironmentVariablesRule
} from './rules/index.js';

export interface RuleViolation {
  rule: string;
  file: string;
  line?: number;
  message: string;
  severity: 'error' | 'warning';
  suggestion: string;
}

export interface RuleValidationResult {
  passed: boolean;
  violations: RuleViolation[];
  summary: {
    totalRules: number;
    passedRules: number;
    failedRules: number;
    errorCount: number;
    warningCount: number;
  };
}

export interface GoldenRule {
  name: string;
  description: string;
  validate(file: string, content: string): Promise<RuleViolation[]>;
}

export class GoldenRuleEnforcer {
  private violations: RuleViolation[] = [];
  private readonly rules: GoldenRule[];

  constructor() {
    this.rules = [
      new UseBunBuiltinsRule(),
      new TrackAPIUsageRule(),
      new ErrorHandlingRule(),
      new TypeSafetyRule(),
      new MemoryMonitoringRule(),
      new PerformanceTestingRule(),
      new ResourceManagementRule(),
      new BunOptimizationsRule(),
      new LoggingMonitoringRule(),
      new StayUpdatedRule(),
      new EnvironmentVariablesRule()
    ];
  }

  /**
   * Validate all golden rules against the codebase
   */
  async validateCodebase(rootDir: string = process.cwd()): Promise<RuleValidationResult> {
    console.log('🔍 Validating Golden Rules...\n');
    
    this.violations = [];
    const tsFiles = await this.findTypeScriptFiles(rootDir);

    for (const rule of this.rules) {
      await this.validateRule(rule, tsFiles);
    }

    return this.generateResult();
  }

  /**
   * Validate specific rule
   */
  async validateRule(rule: GoldenRule, files: string[]): Promise<void> {
    console.log(`📋 ${rule.name}...`);

    for (const file of files) {
      try {
        const content = await readFile(file, 'utf-8');
        const violations = await rule.validate(file, content);
        this.violations.push(...violations);
      } catch (error) {
        console.warn(`⚠️ Could not validate ${file}:`, error.message);
      }
    }
  }

  private async findTypeScriptFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    
    async function scanDirectory(currentDir: string) {
      const entries = await readdir(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(currentDir, entry.name);
        
        if (entry.isDirectory()) {
          // Skip node_modules, dist, and other generated directories
          if (!['node_modules', 'dist', 'build', 'coverage', '.git', 'reports'].includes(entry.name)) {
            await scanDirectory(fullPath);
          }
        } else if (extname(entry.name) === '.ts' && !entry.name.endsWith('.d.ts')) {
          files.push(fullPath);
        }
      }
    }
    
    await scanDirectory(dir);
    return files;
  }

  private generateResult(): RuleValidationResult {
    const errors = this.violations.filter(v => v.severity === 'error');
    const warnings = this.violations.filter(v => v.severity === 'warning');
    
    const summary = {
      totalRules: this.rules.length,
      passedRules: this.rules.length - errors.length,
      failedRules: errors.length,
      errorCount: errors.length,
      warningCount: warnings.length
    };

    return {
      passed: errors.length === 0,
      violations: this.violations,
      summary
    };
  }

  /**
   * Generate comprehensive report
   */
  generateReport(result: RuleValidationResult): string {
    const { summary, violations } = result;
    
    let report = `# GOLDEN RULES VALIDATION REPORT\n`;
    report += `Generated: ${new Date().toISOString()}\n\n`;
    
    report += `## 📊 Summary\n`;
    report += `- **Total Rules**: ${summary.totalRules}\n`;
    report += `- **Passed Rules**: ${summary.passedRules}\n`;
    report += `- **Failed Rules**: ${summary.failedRules}\n`;
    report += `- **Errors**: ${summary.errorCount}\n`;
    report += `- **Warnings**: ${summary.warningCount}\n\n`;
    
    report += `## 🚨 Rule Violations\n\n`;
    
    if (violations.length === 0) {
      report += `✅ All golden rules are being followed!\n`;
    } else {
      const byRule = this.groupViolationsByRule(violations);
      
      for (const [ruleName, ruleViolations] of Object.entries(byRule)) {
        report += `### ${ruleName}\n`;
        
        for (const violation of ruleViolations) {
          const icon = violation.severity === 'error' ? '❌' : '⚠️';
          report += `${icon} **${violation.file}**`;
          
          if (violation.line) {
            report += `:${violation.line}`;
          }
          
          report += ` - ${violation.message}\n`;
          report += `   💡 *${violation.suggestion}*\n\n`;
        }
      }
    }
    
    report += `## 🎯 Recommendations\n\n`;
    report += this.generateRecommendations(result);
    
    return report;
  }

  private groupViolationsByRule(violations: RuleViolation[]): Record<string, RuleViolation[]> {
    const grouped: Record<string, RuleViolation[]> = {};
    
    for (const violation of violations) {
      if (!grouped[violation.rule]) {
        grouped[violation.rule] = [];
      }
      grouped[violation.rule].push(violation);
    }
    
    return grouped;
  }

  private generateRecommendations(result: RuleValidationResult): string {
    const recommendations: string[] = [];
    const { summary, violations } = result;

    if (summary.errorCount > 0) {
      recommendations.push('**Immediate Action Required:**');
      recommendations.push('- Fix all error-level violations before deployment');
    }

    if (violations.some(v => v.rule === 'Use Bun Builtins')) {
      recommendations.push('**Bun API Migration:**');
      recommendations.push('- Replace npm packages with Bun builtin equivalents');
      recommendations.push('- Use `bunx --bun` to run tools with Bun');
    }

    if (violations.some(v => v.rule === 'Track API Usage')) {
      recommendations.push('**Monitoring Enhancement:**');
      recommendations.push('- Add API tracking to all Bun API calls');
      recommendations.push('- Implement performance monitoring');
    }

    if (summary.warningCount > 5) {
      recommendations.push('**Code Quality:**');
      recommendations.push('- Address warning-level violations in next sprint');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Codebase follows all golden rules!');
      recommendations.push('🎉 Continue maintaining these high standards.');
    }

    return recommendations.map(rec => `- ${rec}`).join('\n');
  }
}

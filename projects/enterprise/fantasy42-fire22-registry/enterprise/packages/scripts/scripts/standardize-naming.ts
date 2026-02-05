#!/usr/bin/env bun

/**
 * Crystal Clear Architecture - Naming Standards Enforcement
 * Automatically checks and fixes naming inconsistencies
 */

import { readdir, stat, readFile, writeFile } from 'fs/promises';
import { join, extname, basename } from 'path';
import { glob } from 'bun';

interface NamingRule {
  pattern: RegExp;
  replacement: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
}

class NamingStandards {
  private rules: NamingRule[] = [
    // Environment variables
    {
      pattern: /([A-Z_]+)_URL/g,
      replacement: '$1_URL',
      description: 'Environment variables should use URL suffix',
      severity: 'warning',
    },
    // Script names
    {
      pattern: /([a-z-]+)\.sh$/,
      replacement: '$1.sh',
      description: 'Scripts should use kebab-case',
      severity: 'info',
    },
    // Package names
    {
      pattern: /"name":\s*"([^"]*-[^"]*)"/g,
      replacement: '"name": "$1"',
      description: 'Package names should be consistent',
      severity: 'warning',
    },
  ];

  private standards = {
    // System prefixes
    systems: ['crystal-clear', 'dashboard', 'docs', 'fire22', 'water'],
    // Component suffixes
    components: ['worker', 'dashboard', 'api', 'client', 'system', 'service'],
    // Domain patterns
    domains: ['apexodds.net', 'sportsfire.co', 'pages.dev', 'workers.dev'],
    // File patterns
    scripts: ['.sh', '.ts', '.js'],
    config: ['.json', '.toml', '.yaml', '.yml'],
  };

  async analyzeProject(rootPath: string): Promise<{
    summary: Record<string, number>;
    issues: Array<{
      file: string;
      line: number;
      issue: string;
      severity: 'error' | 'warning' | 'info';
      suggestion: string;
    }>;
  }> {
    const summary = {
      totalFiles: 0,
      errors: 0,
      warnings: 0,
      info: 0,
    };

    const issues: Array<{
      file: string;
      line: number;
      issue: string;
      severity: 'error' | 'warning' | 'info';
      suggestion: string;
    }> = [];

    const self = this; // Capture class instance

    async function analyzeDirectory(dirPath: string): Promise<void> {
      const entries = await readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);

        // Skip certain directories
        if (
          entry.name.startsWith('.') ||
          entry.name === 'node_modules' ||
          entry.name === 'dist' ||
          entry.name === 'build'
        ) {
          continue;
        }

        if (entry.isDirectory()) {
          await analyzeDirectory(fullPath);
        } else if (entry.isFile()) {
          summary.totalFiles++;
          await analyzeFile(fullPath);
        }
      }
    }

    async function analyzeFile(filePath: string): Promise<void> {
      const ext = extname(filePath);
      const fileName = basename(filePath);

      // Check file naming
      if (self.standards.scripts.includes(ext)) {
        const scriptIssues = self.checkScriptNaming(fileName);
        scriptIssues.forEach(issue => {
          summary[issue.severity]++;
          issues.push({
            file: filePath,
            line: 0,
            issue: issue.message,
            severity: issue.severity,
            suggestion: issue.suggestion,
          });
        });
      }

      // Check file content for patterns
      if (['.ts', '.js', '.json', '.toml'].includes(ext)) {
        try {
          const content = await readFile(filePath, 'utf-8');
          const lines = content.split('\n');

          lines.forEach((line, index) => {
            const lineIssues = self.checkLineContent(line, filePath);
            lineIssues.forEach(issue => {
              summary[issue.severity]++;
              issues.push({
                file: filePath,
                line: index + 1,
                issue: issue.message,
                severity: issue.severity,
                suggestion: issue.suggestion,
              });
            });
          });
        } catch (error) {
          // Skip files that can't be read
        }
      }
    }

    await analyzeDirectory(rootPath);

    return { summary, issues };
  }

  private checkScriptNaming(fileName: string): Array<{
    message: string;
    severity: 'error' | 'warning' | 'info';
    suggestion: string;
  }> {
    const issues = [];

    // Check for kebab-case in script names
    if (fileName.includes('_')) {
      issues.push({
        message: `Script name "${fileName}" uses underscores, should use kebab-case`,
        severity: 'warning',
        suggestion: fileName.replace(/_/g, '-'),
      });
    }

    // Check for descriptive names
    if (fileName.length < 5) {
      issues.push({
        message: `Script name "${fileName}" is too short, should be descriptive`,
        severity: 'info',
        suggestion: `Consider renaming to "manage-${fileName}" or similar`,
      });
    }

    return issues;
  }

  private checkLineContent(
    line: string,
    filePath: string
  ): Array<{
    message: string;
    severity: 'error' | 'warning' | 'info';
    suggestion: string;
  }> {
    const issues = [];

    // Check for environment variables
    const envVars = line.match(/process\.env\.([A-Z_]+)/g);
    if (envVars) {
      envVars.forEach(envVar => {
        const varName = envVar.replace('process.env.', '');
        if (!varName.includes('_') && varName !== varName.toUpperCase()) {
          issues.push({
            message: `Environment variable "${varName}" should use SCREAMING_SNAKE_CASE`,
            severity: 'warning',
            suggestion: varName.toUpperCase(),
          });
        }
      });
    }

    // Check for API endpoints
    const apiEndpoints = line.match(/['"`]\/api\/([^'"`]+)['"`]/g);
    if (apiEndpoints) {
      apiEndpoints.forEach(endpoint => {
        const path = endpoint.slice(1, -1);
        if (path.includes('_')) {
          issues.push({
            message: `API endpoint "${path}" should use kebab-case instead of underscores`,
            severity: 'info',
            suggestion: path.replace(/_/g, '-'),
          });
        }
      });
    }

    return issues;
  }

  async generateReport(analysis: {
    summary: Record<string, number>;
    issues: Array<{
      file: string;
      line: number;
      issue: string;
      severity: 'error' | 'warning' | 'info';
      suggestion: string;
    }>;
  }): Promise<string> {
    const report = [
      '# 🚀 Crystal Clear Architecture - Naming Standards Report',
      '',
      '## 📊 Summary',
      '',
      `- Total files analyzed: ${analysis.summary.totalFiles}`,
      `- Errors found: ${analysis.summary.errors}`,
      `- Warnings found: ${analysis.summary.warnings}`,
      `- Info items: ${analysis.summary.info}`,
      '',
      '## 🔍 Issues Found',
      '',
    ];

    if (analysis.issues.length === 0) {
      report.push('✅ No naming issues found! Your project follows naming standards.');
    } else {
      // Group issues by severity
      const groupedIssues = {
        error: analysis.issues.filter(i => i.severity === 'error'),
        warning: analysis.issues.filter(i => i.severity === 'warning'),
        info: analysis.issues.filter(i => i.severity === 'info'),
      };

      Object.entries(groupedIssues).forEach(([severity, issues]) => {
        if (issues.length > 0) {
          const emoji = severity === 'error' ? '❌' : severity === 'warning' ? '⚠️' : 'ℹ️';
          report.push(
            `### ${emoji} ${severity.charAt(0).toUpperCase() + severity.slice(1)}s (${issues.length})`
          );
          report.push('');

          issues.forEach(issue => {
            report.push(`**${issue.file}:${issue.line}**`);
            report.push(`- Issue: ${issue.issue}`);
            report.push(`- Suggestion: ${issue.suggestion}`);
            report.push('');
          });
        }
      });
    }

    report.push('## 📋 Quick Fixes', '');
    report.push(
      '```bash',
      '# Fix common issues',
      'bun run standardize-naming --fix',
      '',
      '# Generate new component with proper naming',
      'bun run generate-component --name=my-feature --type=worker',
      '```'
    );

    return report.join('\n');
  }

  async fixIssues(
    issues: Array<{
      file: string;
      line: number;
      issue: string;
      severity: 'error' | 'warning' | 'info';
      suggestion: string;
    }>
  ): Promise<{ fixed: number; skipped: number }> {
    let fixed = 0;
    let skipped = 0;

    for (const issue of issues) {
      if (issue.severity === 'info') {
        // Skip info-level issues for auto-fix
        skipped++;
        continue;
      }

      try {
        const content = await readFile(issue.file, 'utf-8');
        const lines = content.split('\n');

        // Apply fixes based on issue type
        if (issue.issue.includes('SCREAMING_SNAKE_CASE')) {
          // This would need more sophisticated parsing
          console.log(`Manual fix needed: ${issue.file}:${issue.line}`);
          skipped++;
        } else if (issue.issue.includes('kebab-case')) {
          // Simple string replacements
          const fixedLine = lines[issue.line - 1].replace(/_/g, '-');
          lines[issue.line - 1] = fixedLine;
          await writeFile(issue.file, lines.join('\n'));
          fixed++;
        } else {
          skipped++;
        }
      } catch (error) {
        console.error(`Error fixing ${issue.file}:`, error);
        skipped++;
      }
    }

    return { fixed, skipped };
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'analyze';

  const namingStandards = new NamingStandards();
  const projectRoot = process.cwd();

  switch (command) {
    case 'analyze':
      console.log('🔍 Analyzing project naming standards...');
      const analysis = await namingStandards.analyzeProject(projectRoot);
      const report = await namingStandards.generateReport(analysis);
      console.log(report);
      break;

    case 'fix':
      console.log('🔧 Fixing naming issues...');
      const analysisForFix = await namingStandards.analyzeProject(projectRoot);
      const result = await namingStandards.fixIssues(analysisForFix.issues);
      console.log(`✅ Fixed ${result.fixed} issues`);
      console.log(`⏭️  Skipped ${result.skipped} issues (manual review needed)`);
      break;

    case 'help':
      console.log(`
🚀 Crystal Clear Architecture - Naming Standards Tool

Usage:
  bun run standardize-naming [command]

Commands:
  analyze    Analyze project for naming standard compliance
  fix        Automatically fix naming issues
  help       Show this help message

Examples:
  bun run standardize-naming
  bun run standardize-naming analyze
  bun run standardize-naming fix
      `);
      break;

    default:
      console.log('Unknown command. Use "help" for usage information.');
  }
}

if (import.meta.main) {
  main().catch(console.error);
}

export { NamingStandards };

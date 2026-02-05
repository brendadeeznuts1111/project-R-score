#!/usr/bin/env bun
/**
 * AST Rewriter Agent - Code transformation using ast-grep rewrite API
 * AST.REWRITE.AGENT - Intelligent code modification with AST awareness
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { spawn } from "bun";
import { join } from "path";

interface ASTRewriteRule {
  id: string;
  name: string;
  description: string;
  pattern: string;
  replacement: string;
  language?: string;
  constraints?: {
    file_pattern?: string;
    exclude_pattern?: string;
    max_occurrences?: number;
  };
  metadata: {
    author: string;
    version: string;
    tags: string[];
    last_modified: string;
  };
}

interface RewriteResult {
  file: string;
  changes: number;
  matches: Array<{
    line: number;
    column: number;
    original: string;
    replacement: string;
  }>;
  errors: string[];
}

class ASTRewriterAgent {
  private rules: Map<string, ASTRewriteRule> = new Map();

  constructor() {
    this.loadDefaultRules();
  }

  // Load built-in transformation rules
  private loadDefaultRules(): void {
    // React component modernization
    this.rules.set('react-class-to-functional', {
      id: 'react-class-to-functional',
      name: 'React Class to Functional Component',
      description: 'Convert React class components to functional components with hooks',
      pattern: `
class $CLASS extends React.Component {
  constructor(props) {
    super(props);
    this.state = $STATE;
  }

  $METHODS
}
      `,
      replacement: `
function $CLASS($$$) {
  const [state, setState] = useState($STATE);

  $METHODS
}
      `,
      language: 'javascript',
      constraints: {
        file_pattern: '*.{js,jsx,ts,tsx}',
        exclude_pattern: 'node_modules/**'
      },
      metadata: {
        author: 'cursor-ai',
        version: '1.0.0',
        tags: ['react', 'modernization', 'refactor'],
        last_modified: '2025-01-18T00:00:00Z'
      }
    });

    // TypeScript strict mode fixes
    this.rules.set('typescript-strict-null-checks', {
      id: 'typescript-strict-null-checks',
      name: 'TypeScript Strict Null Checks',
      description: 'Add null checks for strict TypeScript mode',
      pattern: `
const $VAR = $EXPR;
$VAR.$METHOD();
      `,
      replacement: `
const $VAR = $EXPR;
if ($VAR) {
  $VAR.$METHOD();
}
      `,
      language: 'typescript',
      constraints: {
        file_pattern: '*.{ts,tsx}',
        exclude_pattern: 'node_modules/**,*.d.ts'
      },
      metadata: {
        author: 'cursor-ai',
        version: '1.0.0',
        tags: ['typescript', 'strict-mode', 'null-safety'],
        last_modified: '2025-01-18T00:00:00Z'
      }
    });

    // Performance optimization - memoization
    this.rules.set('react-memo-optimization', {
      id: 'react-memo-optimization',
      name: 'React Memo Optimization',
      description: 'Add React.memo to prevent unnecessary re-renders',
      pattern: `
function $COMPONENT($$$) {
  return $JSX;
}
      `,
      replacement: `
const $COMPONENT = React.memo(function $COMPONENT($$$) {
  return $JSX;
});
      `,
      language: 'javascript',
      constraints: {
        file_pattern: '*.{js,jsx,ts,tsx}',
        exclude_pattern: 'node_modules/**'
      },
      metadata: {
        author: 'cursor-ai',
        version: '1.0.0',
        tags: ['react', 'performance', 'memoization'],
        last_modified: '2025-01-18T00:00:00Z'
      }
    });

    // Error handling improvement
    this.rules.set('async-error-handling', {
      id: 'async-error-handling',
      name: 'Async Error Handling',
      description: 'Add proper error handling to async functions',
      pattern: `
async function $FUNC($$$) {
  $BODY
}
      `,
      replacement: `
async function $FUNC($$$) {
  try {
    $BODY
  } catch (error) {
    console.error('Error in $FUNC:', error);
    throw error;
  }
}
      `,
      language: 'javascript',
      constraints: {
        file_pattern: '*.{js,ts}',
        exclude_pattern: 'node_modules/**,test/**,spec/**'
      },
      metadata: {
        author: 'cursor-ai',
        version: '1.0.0',
        tags: ['error-handling', 'async', 'robustness'],
        last_modified: '2025-01-18T00:00:00Z'
      }
    });

    // Database query optimization
    this.rules.set('sql-injection-prevention', {
      id: 'sql-injection-prevention',
      name: 'SQL Injection Prevention',
      description: 'Replace string concatenation with parameterized queries',
      pattern: `
"SELECT * FROM $TABLE WHERE id = '" + $PARAM + "'"
      `,
      replacement: `
"SELECT * FROM $TABLE WHERE id = ?"
      `,
      language: 'javascript',
      constraints: {
        file_pattern: '*.{js,ts}',
        exclude_pattern: 'node_modules/**'
      },
      metadata: {
        author: 'cursor-ai',
        version: '1.0.0',
        tags: ['security', 'sql', 'injection'],
        last_modified: '2025-01-18T00:00:00Z'
      }
    });
  }

  // Apply rewrite rule to a single file
  async rewriteFile(filePath: string, ruleId: string, options: { dryRun?: boolean; backup?: boolean } = {}): Promise<RewriteResult> {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new Error(`Rule not found: ${ruleId}`);
    }

    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Check constraints
    if (rule.constraints?.file_pattern) {
      const pattern = new RegExp(rule.constraints.file_pattern.replace(/\*/g, '.*'));
      if (!pattern.test(filePath)) {
        return {
          file: filePath,
          changes: 0,
          matches: [],
          errors: [`File does not match pattern: ${rule.constraints.file_pattern}`]
        };
      }
    }

    if (rule.constraints?.exclude_pattern) {
      const patterns = rule.constraints.exclude_pattern.split(',');
      for (const pattern of patterns) {
        const regex = new RegExp(pattern.trim().replace(/\*/g, '.*'));
        if (regex.test(filePath)) {
          return {
            file: filePath,
            changes: 0,
            matches: [],
            errors: [`File matches exclude pattern: ${pattern.trim()}`]
          };
        }
      }
    }

    const content = readFileSync(filePath, 'utf-8');

    // Create temporary file for ast-grep
    const tempPatternFile = join(process.cwd(), '.cursor', 'temp', `pattern-${ruleId}.txt`);
    const tempFile = join(process.cwd(), '.cursor', 'temp', `rewrite-${ruleId}.txt`);

    try {
      // Write pattern and replacement to temp files
      writeFileSync(tempPatternFile, rule.pattern);
      writeFileSync(tempFile, rule.replacement);

      // Use ast-grep to find matches
      const grepCmd = spawn({
        cmd: ['sg', '--pattern', rule.pattern, '--lang', rule.language || 'javascript', filePath],
        stdout: 'pipe',
        stderr: 'pipe'
      });

      const grepOutput = await new Response(grepCmd.stdout).text();
      const grepExitCode = await grepCmd.exited;

      if (grepExitCode !== 0) {
        return {
          file: filePath,
          changes: 0,
          matches: [],
          errors: ['No matches found for pattern']
        };
      }

      // Count matches
      const matches = grepOutput.trim().split('\n').filter(line => line.trim()).length;

      if (options.dryRun) {
        return {
          file: filePath,
          changes: 0,
          matches: [], // Would need to parse grep output for exact matches
          errors: []
        };
      }

      // Create backup if requested
      if (options.backup) {
        const backupPath = `${filePath}.backup.${Date.now()}`;
        writeFileSync(backupPath, content);
      }

      // Apply rewrite using ast-grep
      const rewriteCmd = spawn({
        cmd: ['sg', 'run', '-p', tempPatternFile, '-r', tempFile, '--lang', rule.language || 'javascript', filePath],
        stdout: 'pipe',
        stderr: 'pipe'
      });

      const rewriteOutput = await new Response(rewriteCmd.stdout).text();
      const rewriteError = await new Response(rewriteCmd.stderr).text();
      const rewriteExitCode = await rewriteCmd.exited;

      if (rewriteExitCode !== 0) {
        return {
          file: filePath,
          changes: 0,
          matches: [],
          errors: [`Rewrite failed: ${rewriteError}`]
        };
      }

      // Count actual changes made
      const newContent = readFileSync(filePath, 'utf-8');
      const changes = newContent !== content ? 1 : 0; // Simplified change detection

      return {
        file: filePath,
        changes,
        matches: [], // Would need more complex parsing
        errors: []
      };

    } finally {
      // Clean up temp files
      try {
        await Bun.file(tempPatternFile).delete();
        await Bun.file(tempFile).delete();
      } catch {}
    }
  }

  // Apply rule to multiple files
  async rewriteFiles(filePattern: string, ruleId: string, options: { dryRun?: boolean; backup?: boolean; maxFiles?: number } = {}): Promise<RewriteResult[]> {
    const results: RewriteResult[] = [];

    try {
      // Find files matching pattern
      const findCmd = spawn({
        cmd: ['find', '.', '-name', filePattern, '-type', 'f'],
        stdout: 'pipe',
        stderr: 'pipe'
      });

      const findOutput = await new Response(findCmd.stdout).text();
      const files = findOutput.trim().split('\n').filter(f => f && !f.includes('node_modules'));

      const maxFiles = options.maxFiles || 100;
      const filesToProcess = files.slice(0, maxFiles);

      for (const file of filesToProcess) {
        try {
          const result = await this.rewriteFile(file, ruleId, options);
          results.push(result);
        } catch (error) {
          results.push({
            file,
            changes: 0,
            matches: [],
            errors: [error.message]
          });
        }
      }
    } catch (error) {
      results.push({
        file: filePattern,
        changes: 0,
        matches: [],
        errors: [`File discovery failed: ${error.message}`]
      });
    }

    return results;
  }

  // Create custom rewrite rule
  createRule(rule: ASTRewriteRule): void {
    this.rules.set(rule.id, rule);
  }

  // Get available rules
  getRules(tags?: string[]): ASTRewriteRule[] {
    const allRules = Array.from(this.rules.values());

    if (!tags || tags.length === 0) {
      return allRules;
    }

    return allRules.filter(rule =>
      tags.some(tag => rule.metadata.tags.includes(tag))
    );
  }

  // Generate report of rewrite operations
  generateReport(results: RewriteResult[]): string {
    const totalFiles = results.length;
    const changedFiles = results.filter(r => r.changes > 0).length;
    const totalChanges = results.reduce((sum, r) => sum + r.changes, 0);
    const errorFiles = results.filter(r => r.errors.length > 0).length;

    let report = '# AST Rewrite Report\n\n';
    report += `## Summary\n\n`;
    report += `- **Files processed**: ${totalFiles}\n`;
    report += `- **Files changed**: ${changedFiles}\n`;
    report += `- **Total changes**: ${totalChanges}\n`;
    report += `- **Files with errors**: ${errorFiles}\n\n`;

    if (changedFiles > 0) {
      report += '## Changed Files\n\n';
      results.filter(r => r.changes > 0).forEach(result => {
        report += `- **${result.file}**: ${result.changes} changes\n`;
      });
      report += '\n';
    }

    if (errorFiles > 0) {
      report += '## Errors\n\n';
      results.filter(r => r.errors.length > 0).forEach(result => {
        report += `### ${result.file}\n\n`;
        result.errors.forEach(error => {
          report += `- ${error}\n`;
        });
        report += '\n';
      });
    }

    return report;
  }
}

// CLI interface
async function main() {
  const [command, ...args] = process.argv.slice(2);

  if (!command) {
    console.log(`
AST Rewriter Agent v1.0.0 - Code transformation with AST awareness

Usage:
  bun run scripts/ast-rewriter.ts <command> [options]

Commands:
  rewrite-file <file> <rule-id>           Rewrite single file with rule
  rewrite-files <pattern> <rule-id>       Rewrite multiple files with rule
  list-rules [tags]                       List available rewrite rules
  create-rule <rule-json>                 Create custom rewrite rule
  dry-run <file> <rule-id>                Preview changes without applying

Options:
  --backup                                Create backup files before rewriting
  --max-files <n>                        Maximum files to process (default: 100)

Examples:
  bun run scripts/ast-rewriter.ts rewrite-file src/component.js react-class-to-functional --backup
  bun run scripts/ast-rewriter.ts rewrite-files "*.js" async-error-handling
  bun run scripts/ast-rewriter.ts list-rules react typescript
  bun run scripts/ast-rewriter.ts dry-run src/app.ts react-memo-optimization
`);
    return;
  }

  const agent = new ASTRewriterAgent();

  try {
    switch (command) {
      case 'rewrite-file':
        const [filePath, ruleId, ...options] = args;
        if (!filePath || !ruleId) {
          throw new Error('Usage: rewrite-file <file> <rule-id> [--backup]');
        }

        const fileOptions = {
          backup: options.includes('--backup'),
          dryRun: false
        };

        console.log(`🔄 Rewriting ${filePath} with rule ${ruleId}...`);
        const result = await agent.rewriteFile(filePath, ruleId, fileOptions);

        if (result.errors.length > 0) {
          console.error(`❌ Errors: ${result.errors.join(', ')}`);
        } else {
          console.log(`✅ ${result.file}: ${result.changes} changes applied`);
        }
        break;

      case 'rewrite-files':
        const [pattern, filesRuleId, ...filesOptions] = args;
        if (!pattern || !filesRuleId) {
          throw new Error('Usage: rewrite-files <pattern> <rule-id> [--backup] [--max-files <n>]');
        }

        const filesOpts = {
          backup: filesOptions.includes('--backup'),
          dryRun: false,
          maxFiles: 100
        };

        // Parse max-files option
        const maxFilesIndex = filesOptions.indexOf('--max-files');
        if (maxFilesIndex > -1 && filesOptions[maxFilesIndex + 1]) {
          filesOpts.maxFiles = parseInt(filesOptions[maxFilesIndex + 1]);
        }

        console.log(`🔄 Rewriting files matching ${pattern} with rule ${filesRuleId}...`);
        const results = await agent.rewriteFiles(pattern, filesRuleId, filesOpts);

        const report = agent.generateReport(results);
        console.log(report);
        break;

      case 'list-rules':
        const tags = args;
        const rules = agent.getRules(tags.length > 0 ? tags : undefined);

        console.log('Available AST Rewrite Rules:');
        rules.forEach(rule => {
          console.log(`\n📝 ${rule.name} (${rule.id})`);
          console.log(`   ${rule.description}`);
          console.log(`   Language: ${rule.language || 'auto'}`);
          console.log(`   Tags: ${rule.metadata.tags.join(', ')}`);
          if (rule.constraints?.file_pattern) {
            console.log(`   Pattern: ${rule.constraints.file_pattern}`);
          }
        });
        break;

      case 'create-rule':
        const [ruleJson] = args;
        if (!ruleJson) {
          throw new Error('Usage: create-rule <rule-json>');
        }

        const rule = JSON.parse(ruleJson);
        agent.createRule(rule);
        console.log(`✅ Created custom rule: ${rule.id}`);
        break;

      case 'dry-run':
        const [dryFile, dryRuleId] = args;
        if (!dryFile || !dryRuleId) {
          throw new Error('Usage: dry-run <file> <rule-id>');
        }

        console.log(`🔍 Dry run: ${dryFile} with rule ${dryRuleId}`);
        const dryResult = await agent.rewriteFile(dryFile, dryRuleId, { dryRun: true });

        if (dryResult.errors.length > 0) {
          console.error(`❌ Errors: ${dryResult.errors.join(', ')}`);
        } else {
          console.log(`📊 Would apply ${dryResult.changes} changes`);
        }
        break;

      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error) {
    console.error('AST Rewriter error:', error.message);
    process.exit(1);
  }
}

export { ASTRewriterAgent };
export type { ASTRewriteRule, RewriteResult };

// Run CLI if called directly
if (import.meta.main) {
  main();
}

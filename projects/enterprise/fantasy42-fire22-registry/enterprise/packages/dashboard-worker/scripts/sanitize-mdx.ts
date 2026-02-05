#!/usr/bin/env bun
/**
 * MDX Sanitizer - Fixes common MDX compilation errors in documentation files
 *
 * This script automatically fixes the most common MDX syntax errors:
 * 1. Invalid JSX component names (starting with numbers)
 * 2. Malformed JavaScript expressions
 * 3. Function declarations in code blocks
 * 4. Invalid JSX syntax
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { glob } from 'glob';

interface SanitizationRule {
  name: string;
  pattern: RegExp;
  replacement: string | ((match: string, ...groups: string[]) => string);
  description: string;
}

const SANITIZATION_RULES: SanitizationRule[] = [
  // Fix invalid JSX component names starting with numbers
  {
    name: 'invalid-jsx-component-names',
    pattern: /<(\d+[^>\s]*)/g,
    replacement: (match, componentName) => {
      const fixed = componentName.replace(/^(\d+)/, (num: string) => {
        const numMap: Record<string, string> = {
          '1': 'One',
          '2': 'Two',
          '3': 'Three',
          '4': 'Four',
          '5': 'Five',
          '6': 'Six',
          '7': 'Seven',
          '8': 'Eight',
          '9': 'Nine',
          '0': 'Zero',
        };
        return numMap[num] || `Component${num}`;
      });
      return `<${fixed}`;
    },
    description: 'Fix JSX component names starting with numbers',
  },

  // Fix standalone JavaScript functions in MDX (wrap in code blocks)
  {
    name: 'standalone-function-declarations',
    pattern: /^function\s+\w+\s*\([^)]*\)\s*\{[\s\S]*?^\}/gm,
    replacement: match => `\`\`\`javascript\n${match}\n\`\`\``,
    description: 'Wrap standalone function declarations in code blocks',
  },

  // Fix malformed JSX expressions
  {
    name: 'malformed-jsx-expressions',
    pattern: /\{([^}]*[^}])\}(?!\s*\})/g,
    replacement: (match, expression) => {
      // Basic validation - if it looks malformed, escape it
      if (expression.includes('<') && !expression.includes('>')) {
        return `\`${match}\``;
      }
      if (expression.includes('&') && !expression.includes(';')) {
        return `\`${match}\``;
      }
      return match;
    },
    description: 'Fix malformed JSX expressions',
  },

  // Escape problematic HTML-like syntax that's not valid JSX
  {
    name: 'escape-invalid-html',
    pattern: /<([^>]*\d+[^>]*)>/g,
    replacement: match => `\`${match}\``,
    description: 'Escape invalid HTML-like syntax',
  },

  // Fix import statements that should be in code blocks
  {
    name: 'fix-import-statements',
    pattern: /^import\s+.*?;$/gm,
    replacement: match => `\`\`\`javascript\n${match}\n\`\`\``,
    description: 'Wrap import statements in code blocks',
  },

  // Fix export statements that should be in code blocks
  {
    name: 'fix-export-statements',
    pattern: /^export\s+.*?;$/gm,
    replacement: match => `\`\`\`javascript\n${match}\n\`\`\``,
    description: 'Wrap export statements in code blocks',
  },

  // Fix unescaped angle brackets
  {
    name: 'escape-angle-brackets',
    pattern: /(?<!`)`([^`]*)<([^>]+)>([^`]*)`(?!`)/g,
    replacement: '`$1&lt;$2&gt;$3`',
    description: 'Escape angle brackets in inline code',
  },

  // Fix JSX fragments with invalid syntax
  {
    name: 'fix-jsx-fragments',
    pattern: /<>\s*([^<]*)\s*<\/>/g,
    replacement: (match, content) => `\`${match}\``,
    description: 'Escape invalid JSX fragments',
  },
];

class MDXSanitizer {
  private errorCount = 0;
  private fixedFiles: string[] = [];
  private logPath: string;

  constructor() {
    this.logPath = join(process.cwd(), 'logs', 'mdx-sanitization.log');
  }

  async sanitizeFile(filePath: string): Promise<boolean> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      let sanitizedContent = content;
      let hasChanges = false;
      const appliedFixes: string[] = [];

      // Apply each sanitization rule
      for (const rule of SANITIZATION_RULES) {
        const beforeContent = sanitizedContent;

        if (typeof rule.replacement === 'string') {
          sanitizedContent = sanitizedContent.replace(rule.pattern, rule.replacement);
        } else {
          sanitizedContent = sanitizedContent.replace(rule.pattern, rule.replacement);
        }

        if (beforeContent !== sanitizedContent) {
          hasChanges = true;
          appliedFixes.push(rule.name);
        }
      }

      if (hasChanges) {
        // Create backup
        const backupPath = `${filePath}.backup.${Date.now()}`;
        await fs.writeFile(backupPath, content);

        // Write sanitized content
        await fs.writeFile(filePath, sanitizedContent);
        this.fixedFiles.push(filePath);

        await this.log(`✅ Fixed: ${filePath}`);
        await this.log(`   Applied fixes: ${appliedFixes.join(', ')}`);
        await this.log(`   Backup created: ${backupPath}`);

        return true;
      }

      return false;
    } catch (error) {
      this.errorCount++;
      await this.log(`❌ Error sanitizing ${filePath}: ${error.message}`);
      return false;
    }
  }

  async sanitizeDirectory(dirPath: string): Promise<void> {
    try {
      const markdownFiles = await glob('**/*.{md,mdx}', {
        cwd: dirPath,
        absolute: true,
        ignore: ['**/node_modules/**', '**/build/**', '**/dist/**'],
      });

      console.log(`🔍 Found ${markdownFiles.length} markdown files to sanitize`);
      await this.log(`Starting sanitization of ${markdownFiles.length} files in ${dirPath}`);

      let processedCount = 0;
      let fixedCount = 0;

      for (const file of markdownFiles) {
        const wasFixed = await this.sanitizeFile(file);
        if (wasFixed) {
          fixedCount++;
        }
        processedCount++;

        if (processedCount % 10 === 0) {
          console.log(`📊 Progress: ${processedCount}/${markdownFiles.length} processed`);
        }
      }

      console.log(`\n✨ Sanitization Complete!`);
      console.log(`📁 Processed: ${processedCount} files`);
      console.log(`🔧 Fixed: ${fixedCount} files`);
      console.log(`❌ Errors: ${this.errorCount}`);

      if (this.fixedFiles.length > 0) {
        console.log(`\n📝 Fixed Files:`);
        this.fixedFiles.forEach(file => console.log(`   • ${file}`));
      }

      await this.log(`Sanitization completed. ${fixedCount}/${processedCount} files fixed.`);
    } catch (error) {
      console.error('❌ Sanitization failed:', error);
      await this.log(`Fatal error: ${error.message}`);
      process.exit(1);
    }
  }

  private async log(message: string): Promise<void> {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;

    try {
      // Ensure log directory exists
      await fs.mkdir(join(process.cwd(), 'logs'), { recursive: true });
      await fs.appendFile(this.logPath, logMessage);
    } catch (error) {
      console.warn('Failed to write log:', error.message);
    }
  }

  async generateReport(): Promise<void> {
    const reportPath = join(process.cwd(), 'logs', 'mdx-sanitization-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      processedFiles: this.fixedFiles.length,
      errorCount: this.errorCount,
      fixedFiles: this.fixedFiles,
      appliedRules: SANITIZATION_RULES.map(rule => ({
        name: rule.name,
        description: rule.description,
      })),
    };

    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`📋 Report saved: ${reportPath}`);
  }
}

// CLI Usage
async function main() {
  const args = process.argv.slice(2);
  const targetDir = args[0] || 'docs';

  console.log('🥖 Fire22 Dashboard - MDX Sanitizer');
  console.log('!==!==!==!==!==!==!==');
  console.log(`🎯 Target directory: ${targetDir}`);
  console.log(`📅 Started at: ${new Date().toISOString()}`);
  console.log();

  const sanitizer = new MDXSanitizer();

  // Check if target directory exists
  try {
    await fs.access(targetDir);
  } catch (error) {
    console.error(`❌ Directory not found: ${targetDir}`);
    process.exit(1);
  }

  await sanitizer.sanitizeDirectory(targetDir);
  await sanitizer.generateReport();

  console.log('\n🎉 MDX Sanitization completed successfully!');
  console.log('💡 You can now restart Docusaurus to see if the errors are resolved.');
}

if (import.meta.main) {
  main().catch(console.error);
}

export { MDXSanitizer };

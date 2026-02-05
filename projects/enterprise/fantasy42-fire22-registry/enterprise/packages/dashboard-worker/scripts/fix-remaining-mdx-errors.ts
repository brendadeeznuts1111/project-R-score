#!/usr/bin/env bun
/**
 * Targeted MDX Error Fix - Fire22 Dashboard
 * Fixes remaining specific compilation errors identified by Docusaurus
 */

import { promises as fs } from 'fs';
import { join } from 'path';

const SPECIFIC_ERROR_FILES = [
  'docs/FIRE22-SECURITY-REGISTRY-INTEGRATION.md',
  'docs/business/BUSINESS-MANAGEMENT-ENHANCEMENT.md',
  'docs/data-schemas.md',
  'docs/deployment/CLOUDFLARE-INTEGRATION-COMPLETE.md',
  'docs/queue-system.md',
  'docs/api/API-SECURITY-GUIDE.md',
  'docs/api/ENDPOINT-MATRIX.md',
  'docs/api/ENDPOINT-QUICK-REFERENCE.md',
  'docs/api/FIRE22-API-ENDPOINTS-IMPLEMENTATION.md',
  'docs/api/FIRE22-ENDPOINTS-LOCATION-GUIDE.md',
  'docs/api/FIRE22-ENDPOINTS-SECURITY.md',
  'docs/api/FIRE22-INTEGRATION-GUIDE.md',
  'docs/api/FIRE22-INTEGRATION.md',
  'docs/api/intro.md',
  'docs/architecture/overview.md',
  'docs/architecture/deployment/cloudflare-workers.md',
  'docs/architecture/performance/caching.md',
];

interface FixRule {
  name: string;
  pattern: RegExp;
  replacement: string | ((match: string, ...args: any[]) => string);
  description: string;
}

const TARGETED_RULES: FixRule[] = [
  // Fix invalid JSX component names starting with numbers
  {
    name: 'fix-numbered-jsx-components',
    pattern: /<(\d+[a-zA-Z][^>\s]*)/g,
    replacement: (match, componentName) => {
      const numberMap: Record<string, string> = {
        '0': 'Zero',
        '1': 'One',
        '2': 'Two',
        '3': 'Three',
        '4': 'Four',
        '5': 'Five',
        '6': 'Six',
        '7': 'Seven',
        '8': 'Eight',
        '9': 'Nine',
      };
      const firstChar = componentName.charAt(0);
      const fixed = numberMap[firstChar]
        ? `${numberMap[firstChar]}${componentName.slice(1)}`
        : `Component${componentName}`;
      return `<${fixed}`;
    },
    description: 'Fix JSX component names starting with numbers',
  },

  // Wrap function declarations in code blocks
  {
    name: 'wrap-function-declarations',
    pattern: /^(function\s+\w+\s*\([^)]*\)\s*\{[\s\S]*?^\})/gm,
    replacement: (match, func) => `\`\`\`javascript\n${func}\n\`\`\``,
    description: 'Wrap function declarations in code blocks',
  },

  // Fix malformed expressions that cause acorn parsing errors
  {
    name: 'fix-malformed-expressions',
    pattern: /\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g,
    replacement: (match, expression) => {
      // Check for problematic patterns
      if (
        /^\s*\d+\s*$/.test(expression) || // Just a number
        /[<>](?![=!])/.test(expression) || // Unescaped comparison
        /&&\s*$/.test(expression) || // Trailing &&
        /\|\|\s*$/.test(expression) || // Trailing ||
        /\(\s*\)/.test(expression) || // Empty parens
        /^[&|]\w+/.test(expression) // Starting with & or |
      ) {
        return `\`${match}\``;
      }
      return match;
    },
    description: 'Fix malformed JSX expressions that cause parsing errors',
  },

  // Fix import/export statements outside code blocks
  {
    name: 'wrap-imports-exports',
    pattern: /^((?:import|export)\s+.*?;)$/gm,
    replacement: '```javascript\n$1\n```',
    description: 'Wrap import/export statements in code blocks',
  },

  // Fix problematic HTML-like syntax
  {
    name: 'escape-invalid-html',
    pattern: /<([^>]*\d+[^>]*(?![/>]))>/g,
    replacement: (match, content) => {
      // Only escape if it doesn't look like valid HTML attributes
      if (!content.includes('=') && !content.includes(' ')) {
        return `\`${match}\``;
      }
      return match;
    },
    description: 'Escape invalid HTML-like syntax',
  },
];

class TargetedMDXFixer {
  private fixedFiles = 0;
  private totalErrors = 0;

  async fixFile(filePath: string): Promise<boolean> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      let modified = content;
      let hasChanges = false;
      let fileErrors = 0;

      console.log(`🔧 Processing: ${filePath}`);

      for (const rule of TARGETED_RULES) {
        const originalContent = modified;

        if (typeof rule.replacement === 'string') {
          modified = modified.replace(rule.pattern, rule.replacement);
        } else {
          modified = modified.replace(rule.pattern, rule.replacement);
        }

        if (modified !== originalContent) {
          const matches = originalContent.match(rule.pattern)?.length || 0;
          fileErrors += matches;
          console.log(`   ✅ ${rule.name}: ${matches} fixes applied`);
          hasChanges = true;
        }
      }

      if (hasChanges) {
        // Create backup
        const backupPath = `${filePath}.backup-${Date.now()}`;
        await fs.writeFile(backupPath, content);

        // Write fixed content
        await fs.writeFile(filePath, modified);
        this.fixedFiles++;
        this.totalErrors += fileErrors;
        console.log(`   📝 Fixed ${fileErrors} errors, backup: ${backupPath}`);
        return true;
      } else {
        console.log(`   ✨ No fixes needed`);
        return false;
      }
    } catch (error) {
      console.error(`   ❌ Error processing ${filePath}:`, error);
      return false;
    }
  }

  async run(): Promise<void> {
    const startTime = Date.now();
    console.log('🎯 Fire22 Targeted MDX Error Fixer');
    console.log('!==!==!==!==!==!====');
    console.log(`🔍 Processing ${SPECIFIC_ERROR_FILES.length} specific error files`);
    console.log('');

    for (const file of SPECIFIC_ERROR_FILES) {
      const fullPath = join(process.cwd(), file);
      try {
        await fs.access(fullPath);
        await this.fixFile(fullPath);
      } catch (error) {
        console.log(`⚠️  Skipping missing file: ${file}`);
      }
      console.log('');
    }

    const duration = Date.now() - startTime;
    console.log('📊 Summary:');
    console.log(`   ✅ Files processed: ${SPECIFIC_ERROR_FILES.length}`);
    console.log(`   🔧 Files fixed: ${this.fixedFiles}`);
    console.log(`   🐛 Total errors fixed: ${this.totalErrors}`);
    console.log(`   ⏱️  Duration: ${duration}ms`);
    console.log('');
    console.log('🎉 Targeted fixes complete! Restart Docusaurus to see improvements.');
  }
}

// Run the targeted fixer
const fixer = new TargetedMDXFixer();
fixer.run().catch(console.error);

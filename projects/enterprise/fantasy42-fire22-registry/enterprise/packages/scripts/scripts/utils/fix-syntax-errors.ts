/**
 * Syntax Error Fixer
 * Domain-Driven Design Implementation
 *
 * Automated script to fix common syntax errors found by prettier
 */

// 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's enhanced fs operations and fs.glob
import * as fs from 'fs';
import { join } from 'path';

interface SyntaxFix {
  pattern: RegExp;
  replacement: string;
  description: string;
}

const syntaxFixes: SyntaxFix[] = [
  // Fix strict equality operator typos
  {
    pattern: /====/g,
    replacement: '===',
    description: 'Fix strict equality operator (==== → ===)',
  },
  {
    pattern: /====/g,
    replacement: '!==',
    description: 'Fix strict inequality operator (==== → !==)',
  },
  // Fix missing semicolons after console.log
  {
    pattern: /console\.log\(([^)]+)\)\s*\n\s*}/g,
    replacement: 'console.info($1);\n}',
    description: 'Add missing semicolons after console.log',
  },
  // Fix template literal syntax
  {
    pattern: /\$\{([^}]+)\}/g,
    replacement: '\\${$1}',
    description: 'Fix template literal escaping',
  },
  // Fix invalid characters in strings
  {
    pattern: /[^\x20-\x7E\n\r\t]/g,
    replacement: '',
    description: 'Remove invalid characters',
  },
];

async function fixSyntaxErrors() {
  console.info('🔧 Syntax Error Fixer Starting...');
  console.info('=================================\n');

  const files = [
    'src/**/*.ts',
    'crystal-clear-architecture/**/*.ts',
    'crystal-clear-architecture/**/*.html',
    'dashboard-worker/**/*.ts',
    'dashboard-worker/**/*.html',
  ];

  let totalFiles = 0;
  let fixedFiles = 0;
  let totalFixes = 0;

  for (const pattern of files) {
    console.info(`📁 Processing pattern: ${pattern}`);

    // 🚀 BUN 1.1.X OPTIMIZATION: Enhanced fs.glob with exclusion patterns
    const globFiles = await Array.fromAsync(fs.glob(pattern, {
      exclude: ['**/node_modules/**', '**/dist/**', '**/build/**']
    }));

    for (const file of globFiles) {
      totalFiles++;
      const filePath = join(process.cwd(), file);
      // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's optimized file reading
      let content = await Bun.file(filePath).text();
      let fileFixed = false;
      let fileFixes = 0;

      for (const fix of syntaxFixes) {
        const matches = content.match(fix.pattern);
        if (matches) {
          const before = content;
          content = content.replace(fix.pattern, fix.replacement);
          if (content !== before) {
            fileFixed = true;
            fileFixes += matches.length;
            totalFixes += matches.length;
            console.info(`   ✅ ${fix.description}: ${matches.length} fixes`);
          }
        }
      }

      if (fileFixed) {
        // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's optimized file writing
        await Bun.write(filePath, content);
        fixedFiles++;
        console.info(`   📄 Fixed: ${file} (${fileFixes} fixes)`);
      }
    }
  }

  console.info('\n📊 Fix Summary:');
  console.info(`   📁 Total files processed: ${totalFiles}`);
  console.info(`   🔧 Files fixed: ${fixedFiles}`);
  console.info(`   ✅ Total fixes applied: ${totalFixes}`);
  console.info('');

  if (fixedFiles > 0) {
    console.info('🎉 Syntax errors fixed! Now run prettier again:');
    console.info('   bunx prettier@3.2.5 --write .');
  } else {
    console.info('✨ No syntax errors found that can be auto-fixed.');
    console.info('   Check the prettier output for remaining issues.');
  }
}

async function manualFixSuggestions() {
  console.info('\n💡 Manual Fix Suggestions:');
  console.info('==========================');

  console.info('1. HTML Syntax Errors:');
  console.info('   - Check for unclosed tags');
  console.info('   - Verify proper nesting');
  console.info('   - Remove duplicate closing tags');

  console.info('\n2. TypeScript Errors:');
  console.info('   - Check for missing imports');
  console.info('   - Verify type definitions');
  console.info('   - Fix function declarations');

  console.info('\n3. Invalid Characters:');
  console.info('   - Remove non-ASCII characters');
  console.info('   - Check for corrupted files');
  console.info('   - Verify file encoding');

  console.info('\n4. Template Literals:');
  console.info('   - Use backticks for template literals');
  console.info('   - Properly escape ${} expressions');
  console.info('   - Check for nested quotes');

  console.info('\n🚀 After manual fixes, run:');
  console.info('   bunx prettier@3.2.5 --write .');
  console.info('   bunx prettier@3.2.5 --check .');
}

if (import.meta.main) {
  await fixSyntaxErrors();
  manualFixSuggestions();
}

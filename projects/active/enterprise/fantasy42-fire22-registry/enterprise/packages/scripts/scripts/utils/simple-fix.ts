/**
 * Simple Syntax Error Fixer
 * Domain-Driven Design Implementation
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

function findFiles(dir: string, extensions: string[]): string[] {
  const files: string[] = [];

  function scan(directory: string) {
    try {
      const items = readdirSync(directory);

      for (const item of items) {
        const fullPath = join(directory, item);
        const stat = statSync(fullPath);

        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          scan(fullPath);
        } else if (stat.isFile() && extensions.includes(extname(item))) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }

  scan(dir);
  return files;
}

function fixFile(filePath: string): { fixed: boolean; fixes: number } {
  let content = readFileSync(filePath, 'utf-8');
  let fixed = false;
  let fixes = 0;

  // Fix === typos
  const originalContent = content;
  content = content.replace(/====/g, '===');
  if (content !== originalContent) {
    fixes++;
    fixed = true;
  }

  // Fix !== typos
  const beforeNotEqual = content;
  content = content.replace(/====/g, '!==');
  if (content !== beforeNotEqual) {
    fixes++;
    fixed = true;
  }

  if (fixed) {
    writeFileSync(filePath, content, 'utf-8');
  }

  return { fixed, fixes };
}

async function main() {
  console.info('🔧 Simple Syntax Error Fixer');
  console.info('=============================\n');

  const directories = ['src', 'crystal-clear-architecture', 'dashboard-worker'];

  const extensions = ['.ts', '.js'];

  let totalFiles = 0;
  let fixedFiles = 0;
  let totalFixes = 0;

  for (const dir of directories) {
    console.info(`📁 Scanning: ${dir}`);

    const files = findFiles(dir, extensions);
    console.info(`   Found ${files.length} files`);

    for (const file of files) {
      totalFiles++;
      const result = fixFile(file);

      if (result.fixed) {
        fixedFiles++;
        totalFixes += result.fixes;
        console.info(`   ✅ Fixed: ${file} (${result.fixes} fixes)`);
      }
    }
  }

  console.info('\n📊 Summary:');
  console.info(`   📁 Total files: ${totalFiles}`);
  console.info(`   🔧 Fixed files: ${fixedFiles}`);
  console.info(`   ✅ Total fixes: ${totalFixes}`);

  if (fixedFiles > 0) {
    console.info('\n🎉 Fixes applied! Run prettier again:');
    console.info('   bunx prettier@3.2.5 --write .');
  } else {
    console.info('\n✨ No auto-fixable errors found.');
  }
}

if (import.meta.main) {
  main();
}

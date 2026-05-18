#!/usr/bin/env bun
/**
 * Fantasy42-Fire22 Repository Reference Fixer
 * Bulk update all old repository references to the new private repository
 */

import { readdirSync, statSync, readFileSync, writeFileSync } from 'fs';
import { join, extname } from 'path';

// Configuration
const OLD_REPO = 'nolarose1968-pixel';
const NEW_REPO = 'brendadeeznuts1111';
const OLD_REPO_FULL = 'brendadeeznuts1111/fantasy42-fire22-registry';
const NEW_REPO_FULL = 'brendadeeznuts1111/fantasy42-fire22-registry';
const OLD_CRYSTAL_REPO = 'brendadeeznuts1111/crystal-clear-architecture';
const NEW_CRYSTAL_REPO = 'brendadeeznuts1111/crystal-clear-architecture';

// Files to skip
const SKIP_FILES = [
  '.git/',
  'node_modules/',
  '.bun/',
  '.cache/',
  'coverage/',
  'test-results/',
  'logs/',
];

// File extensions to process
const PROCESS_EXTENSIONS = [
  '.json',
  '.js',
  '.ts',
  '.tsx',
  '.md',
  '.html',
  '.toml',
  '.yml',
  '.yaml',
  '.sh',
  '.txt',
];

let filesProcessed = 0;
let filesUpdated = 0;
let totalReplacements = 0;

function shouldProcessFile(filePath: string): boolean {
  // Skip directories
  if (SKIP_FILES.some(skip => filePath.includes(skip))) {
    return false;
  }

  // Check file extension
  const ext = extname(filePath);
  return PROCESS_EXTENSIONS.includes(ext) || !ext; // Files without extension
}

function processFile(filePath: string): void {
  try {
    const content = readFileSync(filePath, 'utf8');
    let updatedContent = content;
    let fileReplacements = 0;

    // Replace repository references
    const replacements = [
      [OLD_REPO_FULL, NEW_REPO_FULL],
      [OLD_CRYSTAL_REPO, NEW_CRYSTAL_REPO],
      [`https://github.com/${OLD_REPO}`, `https://github.com/${NEW_REPO}`],
      [`github.com/${OLD_REPO}`, `github.com/${NEW_REPO}`],
      [`${OLD_REPO}.github.io`, `${NEW_REPO}.github.io`],
    ];

    for (const [oldStr, newStr] of replacements) {
      const regex = new RegExp(oldStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      const matches = content.match(regex);
      if (matches) {
        updatedContent = updatedContent.replace(regex, newStr);
        fileReplacements += matches.length;
        totalReplacements += matches.length;
      }
    }

    if (fileReplacements > 0) {
      writeFileSync(filePath, updatedContent);
      filesUpdated++;
      console.info(`✅ ${filePath} - ${fileReplacements} replacements`);
    }

    filesProcessed++;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

function walkDirectory(dirPath: string): void {
  try {
    const items = readdirSync(dirPath);

    for (const item of items) {
      const fullPath = join(dirPath, item);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        // Skip certain directories
        if (!SKIP_FILES.some(skip => fullPath.includes(skip))) {
          walkDirectory(fullPath);
        }
      } else if (stat.isFile() && shouldProcessFile(fullPath)) {
        processFile(fullPath);
      }
    }
  } catch (error) {
    console.error(`❌ Error walking directory ${dirPath}:`, error.message);
  }
}

async function main() {
  console.info(`🔧 Fantasy42-Fire22 Repository Reference Fixer`);
  console.info(`══════════════════════════════════════════════`);
  console.info(`Replacing repository references:`);
  console.info(`  ${OLD_REPO_FULL} → ${NEW_REPO_FULL}`);
  console.info(`  ${OLD_CRYSTAL_REPO} → ${NEW_CRYSTAL_REPO}`);
  console.info(`  GitHub URLs updated accordingly`);
  console.info('');

  const startTime = Date.now();
  walkDirectory('.');

  const duration = Date.now() - startTime;

  console.info('');
  console.info(`📊 Summary:`);
  console.info(`   Files processed: ${filesProcessed}`);
  console.info(`   Files updated: ${filesUpdated}`);
  console.info(`   Total replacements: ${totalReplacements}`);
  console.info(`   Duration: ${duration}ms`);
  console.info('');

  if (filesUpdated > 0) {
    console.info(
      `✅ Successfully updated ${filesUpdated} files with ${totalReplacements} repository references`
    );
    console.info(`💡 Next steps:`);
    console.info(`   1. Review changes: git diff`);
    console.info(`   2. Test dependencies: bun install`);
    console.info(
      `   3. Commit changes: git add . && git commit -S -m "fix: Update repository references"`
    );

    // Show example of what was changed
    console.info('');
    console.info(`🔍 Example changes made:`);
    console.info(`   OLD: https://github.com/${OLD_REPO_FULL}`);
    console.info(`   NEW: https://github.com/${NEW_REPO_FULL}`);
    console.info('');
    console.info(`   OLD: ${OLD_CRYSTAL_REPO}`);
    console.info(`   NEW: ${NEW_CRYSTAL_REPO}`);
  } else {
    console.info(`ℹ️  No repository references found to update`);
  }
}

// Run the fixer
if (import.meta.main) {
  main().catch(console.error);
}

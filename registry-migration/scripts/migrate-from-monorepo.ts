#!/usr/bin/env bun
/**
 * 🔄 Migration Script: Extract Registry from Monorepo
 * 
 * Usage: bun run scripts/migrate-from-monorepo.ts <source-path>
 * Example: bun run scripts/migrate-from-monorepo.ts /Users/nolarose/Projects
 */

import { styled } from '../lib/theme/colors.ts';

interface MigrationConfig {
  sourcePath: string;
  targetPath: string;
  files: Record<string, string[]>;
}

const MIGRATION: MigrationConfig = {
  sourcePath: process.argv[2] || '../Projects',
  targetPath: '.',
  files: {
    // Core types and interfaces
    'packages/registry-core/src': [
      'registry-types.ts',
    ],
    
    // R2 storage
    'packages/r2-storage/src': [
      'r2-storage.ts',
    ],
    
    // Auth
    'packages/registry-core/src': [
      'auth.ts',
    ],
    
    // Semver
    'packages/semver/src': [
      'version-manager.ts',
    ],
    
    // Secrets
    'packages/secrets/src': [
      'secrets-manager.ts',
    ],
    
    // bunx
    'packages/bunx/src': [
      'bunx-integration.ts',
    ],
    
    // Version graph
    'packages/version-graph/src': [
      // version-manager.ts handles graphs
    ],
    
    // Documentation
    'packages/docs/src': [
      'package-docs.ts',
      'docs-sync.ts',
      'rss-aggregator.ts',
    ],
    
    // Server app
    'apps/registry-server/src': [
      'server.ts',
      'cdn-worker.ts',
    ],
    
    // CLI app
    'apps/registry-cli/src': [
      'cli.ts',
      'config-loader.ts',
    ],
  },
};

async function migrate() {
  console.log(styled('🔄 Registry Migration Tool', 'accent'));
  console.log(styled('=========================', 'accent'));
  
  const sourceDir = MIGRATION.sourcePath;
  const sourceRegistryDir = `${sourceDir}/lib/registry`;
  
  console.log(styled(`\n📂 Source: ${sourceRegistryDir}`, 'info'));
  console.log(styled(`📂 Target: ${MIGRATION.targetPath}`, 'info'));
  
  // Check source exists
  const sourceExists = await Bun.file(sourceRegistryDir).exists();
  if (!sourceExists) {
    console.error(styled(`❌ Source directory not found: ${sourceRegistryDir}`, 'error'));
    console.log(styled('Usage: bun run migrate.ts <path-to-monorepo>', 'muted'));
    process.exit(1);
  }
  
  // Track results
  const results = { copied: 0, skipped: 0, errors: 0 };
  
  // Migrate files
  for (const [targetDir, files] of Object.entries(MIGRATION.files)) {
    for (const file of files) {
      const sourcePath = `${sourceRegistryDir}/${file}`;
      const targetPath = `${MIGRATION.targetPath}/${targetDir}/${file}`;
      
      try {
        // Check if source exists
        const sourceFile = Bun.file(sourcePath);
        if (!await sourceFile.exists()) {
          console.log(styled(`⚠️ Skip: ${file} (not found)`, 'warning'));
          results.skipped++;
          continue;
        }
        
        // Read content
        const content = await sourceFile.text();
        
        // Update imports for new structure
        const updatedContent = updateImports(content, targetDir);
        
        // Ensure target directory exists
        await $`mkdir -p ${targetPath.split('/').slice(0, -1).join('/')}`;
        
        // Write to target
        await Bun.write(targetPath, updatedContent);
        
        console.log(styled(`✅ Copied: ${file} → ${targetDir}`, 'success'));
        results.copied++;
      } catch (error) {
        console.error(styled(`❌ Error copying ${file}: ${error.message}`, 'error'));
        results.errors++;
      }
    }
  }
  
  // Create index.ts files
  console.log(styled('\n📦 Creating index files...', 'info'));
  await createIndexFiles();
  
  // Summary
  console.log(styled('\n📊 Migration Summary:', 'accent'));
  console.log(styled(`  ✅ Copied: ${results.copied}`, 'success'));
  console.log(styled(`  ⚠️ Skipped: ${results.skipped}`, 'warning'));
  console.log(styled(`  ❌ Errors: ${results.errors}`, results.errors > 0 ? 'error' : 'muted'));
  
  if (results.errors === 0) {
    console.log(styled('\n🎉 Migration complete! Next steps:', 'success'));
    console.log(styled('  1. bun install', 'muted'));
    console.log(styled('  2. bun run build', 'muted'));
    console.log(styled('  3. bun run test', 'muted'));
    console.log(styled('  4. git init && git add .', 'muted'));
    console.log(styled('  5. git commit -m "Initial registry commit"', 'muted'));
  }
}

function updateImports(content: string, targetDir: string): string {
  // Update relative imports based on new structure
  const importMap: Record<string, string> = {
    '../theme/colors.ts': '@factorywager/theme',
    './registry-types.ts': '@factorywager/registry-core/types',
    './r2-storage.ts': '@factorywager/r2-storage',
    './auth.ts': '@factorywager/registry-core/auth',
  };
  
  let updated = content;
  for (const [old, newPath] of Object.entries(importMap)) {
    updated = updated.replaceAll(old, newPath);
  }
  
  return updated;
}

async function createIndexFiles() {
  const indexes = [
    {
      path: 'packages/registry-core/src/index.ts',
      content: `export * from './types.ts';
export * from './auth.ts';
export * from './config.ts';
`,
    },
    {
      path: 'packages/r2-storage/src/index.ts',
      content: `export * from './r2-storage.ts';
`,
    },
    {
      path: 'packages/semver/src/index.ts',
      content: `export * from './version-manager.ts';
`,
    },
    {
      path: 'packages/secrets/src/index.ts',
      content: `export * from './secrets-manager.ts';
`,
    },
    {
      path: 'packages/bunx/src/index.ts',
      content: `export * from './bunx-integration.ts';
`,
    },
  ];
  
  for (const { path, content } of indexes) {
    await $`mkdir -p ${path.split('/').slice(0, -1).join('/')}`;
    await Bun.write(path, content);
  }
}

// Run migration
migrate().catch(console.error);

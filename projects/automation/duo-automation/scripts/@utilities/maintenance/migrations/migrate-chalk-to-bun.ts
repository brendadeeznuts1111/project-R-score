#!/usr/bin/env bun
/**
 * Empire Pro Chalk to Bun Console Colors Migration Script
 * 
 * Automatically replaces chalk usage with Bun-native console colors
 * Performance improvement: Removes 5.6KB chalk dependency
 * 
 * Usage: bun run scripts/migrate-chalk-to-bun.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { resolve } from 'path';

// Migration patterns for chalk replacement
const migrationPatterns = [
  // Import replacements
  {
    pattern: /import\s+chalk\s+from\s+['"]chalk['"];?/g,
    replacement: "import { chalk, empireLog } from '../../utils/bun-console-colors.js';"
  },
  {
    pattern: /const\s+chalk\s*=\s*require\(['"]chalk['"]\);?/g,
    replacement: "const { chalk, empireLog } = require('../../utils/bun-console-colors.js');"
  },
  
  // Common color replacements with Empire Pro theming
  {
    pattern: /console\.log\(chalk\.green\(['"`]([^'"`]+)['"`]\)\);?/g,
    replacement: "empireLog.success('$1');"
  },
  {
    pattern: /console\.log\(chalk\.red\(['"`]([^'"`]+)['"`]\)\);?/g,
    replacement: "empireLog.error('$1');"
  },
  {
    pattern: /console\.log\(chalk\.yellow\(['"`]([^'"`]+)['"`]\)\);?/g,
    replacement: "empireLog.warning('$1');"
  },
  {
    pattern: /console\.log\(chalk\.blue\(['"`]([^'"`]+)['"`]\)\);?/g,
    replacement: "empireLog.info('$1');"
  },
  
  // Template literal replacements
  {
    pattern: /console\.log\(chalk\.green\(`([^`]+)`\)\);?/g,
    replacement: "console.info(`${empire.success}$1${colors.reset}`);"
  },
  {
    pattern: /console\.log\(chalk\.red\(`([^`]+)`\)\);?/g,
    replacement: "console.info(`${empire.error}$1${colors.reset}`);"
  },
  {
    pattern: /console\.log\(chalk\.yellow\(`([^`]+)`\)\);?/g,
    replacement: "console.info(`${empire.warning}$1${colors.reset}`);"
  },
  {
    pattern: /console\.log\(chalk\.blue\(`([^`]+)`\)\);?/g,
    replacement: "console.info(`${empire.info}$1${colors.reset}`);"
  },
  
  // Error handling
  {
    pattern: /console\.error\(chalk\.red\(([^)]+)\)\);?/g,
    replacement: "empireLog.error('Error', $1);"
  }
];

// Files to migrate
const filesToMigrate = [
  'src/cli/empire-pro-cli-v4.ts',
  'src/cli/empire-pro-cli-v4-complete.ts', 
  'src/cli/empire-pro-cli.ts'
];

// Migration statistics
let migrationStats = {
  filesProcessed: 0,
  patternsReplaced: 0,
  errors: 0
};

console.info('🎯 Empire Pro Chalk to Bun Console Colors Migration');
console.info('=' .repeat(55));

// Process each file
for (const filePath of filesToMigrate) {
  try {
    const fullPath = resolve(filePath);
    
    // Check if file exists
    try {
      const content = readFileSync(fullPath, 'utf8');
      
      let modifiedContent = content;
      let replacementsInFile = 0;
      
      // Apply migration patterns
      for (const pattern of migrationPatterns) {
        const matches = content.match(pattern.pattern);
        if (matches) {
          modifiedContent = modifiedContent.replace(pattern.pattern, pattern.replacement);
          replacementsInFile += matches.length;
          migrationStats.patternsReplaced += matches.length;
        }
      }
      
      // Write back if modified
      if (modifiedContent !== content) {
        writeFileSync(fullPath, modifiedContent, 'utf8');
        console.info(`✅ Migrated: ${filePath} (${replacementsInFile} replacements)`);
      } else {
        console.info(`ℹ️  No changes needed: ${filePath}`);
      }
      
      migrationStats.filesProcessed++;
      
    } catch (error) {
      console.info(`⚠️  File not found: ${filePath}`);
      migrationStats.errors++;
    }
    
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    migrationStats.errors++;
  }
}

// Update package.json to remove chalk dependency
try {
  const packageJsonPath = resolve('package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  
  if (packageJson.dependencies && packageJson.dependencies.chalk) {
    delete packageJson.dependencies.chalk;
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');
    console.info('✅ Removed chalk from package.json dependencies');
  }
  
} catch (error) {
  console.error('❌ Error updating package.json:', error.message);
  migrationStats.errors++;
}

// Migration summary
console.info('\n📊 Migration Summary:');
console.info(`   Files processed: ${migrationStats.filesProcessed}`);
console.info(`   Patterns replaced: ${migrationStats.patternsReplaced}`);
console.info(`   Errors: ${migrationStats.errors}`);

if (migrationStats.errors === 0) {
  console.info('\n🎉 Migration completed successfully!');
  console.info('💾 Bundle size reduced by ~5.6KB (chalk dependency removed)');
  console.info('⚡ Console output now uses native Bun performance');
  console.info('🎨 Empire Pro themed logging with enhanced readability');
} else {
  console.info('\n⚠️  Migration completed with errors. Please review the logs above.');
}

console.info('\n📋 Next Steps:');
console.info('   1. Test the migrated CLI files');
console.info('   2. Run: bun run src/cli/empire-pro-cli-v4.ts --help');
console.info('   3. Verify console output colors and formatting');
console.info('   4. Commit changes if everything works correctly');

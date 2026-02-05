// scripts/update-to-factory-wager.ts
/**
 * 🏭 Update All References to Factory-Wager
 * 
 * Comprehensive script to update all duoplus references to factory-wager
 * throughout the codebase.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { readdirSync, statSync } from 'fs';

interface FileUpdate {
  path: string;
  changes: number;
  updated: boolean;
}

class FactoryWagerUpdater {
  private updates: FileUpdate[] = [];
  private readonly replacements = [
    { from: /duoplus\.com/g, to: 'factory-wager.com' },
    { from: /duoplus-registry/g, to: 'factory-wager-registry' },
    { from: /@duoplus\//g, to: '@factory-wager/' },
    { from: /duoplus:\/\//g, to: 'factory-wager://' },
    { from: /DuoPlus/g, to: 'FactoryWager' },
    { from: /duoplus/g, to: 'factory-wager' },
    { from: /DUOPLUS/g, to: 'FACTORY_WAGER' },
    { from: /duo_plus/g, to: 'factory_wager' },
    { from: /duo-plus/g, to: 'factory-wager' },
    { from: /discord\.gg\/duoplus/g, to: 'discord.gg/factory-wager' },
    { from: /github\.com\/duoplus/g, to: 'github.com/factory-wager' },
    { from: /api\.duoplus\.com/g, to: 'api.factory-wager.com' },
    { from: /registry\.duoplus\.com/g, to: 'registry.factory-wager.com' },
    { from: /duoplus\.factory-wager\.com/g, to: 'factory-wager.com' }
  ];

  async updateDirectory(dirPath: string, recursive: boolean = true): Promise<void> {
    console.log(`🔍 Scanning directory: ${dirPath}`);
    
    const entries = readdirSync(dirPath);
    
    for (const entry of entries) {
      const fullPath = join(dirPath, entry);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory() && recursive && !this.shouldSkipDirectory(entry)) {
        await this.updateDirectory(fullPath, recursive);
      } else if (stat.isFile() && this.shouldProcessFile(entry)) {
        await this.updateFile(fullPath);
      }
    }
  }

  private shouldSkipDirectory(name: string): boolean {
    const skipDirs = ['.git', 'node_modules', '.next', 'dist', 'build', '.cache', 'coverage'];
    return skipDirs.includes(name);
  }

  private shouldProcessFile(filename: string): boolean {
    const extensions = ['.ts', '.js', '.tsx', '.jsx', '.json', '.md', '.html', '.css', '.yml', '.yaml', '.toml', '.sh', '.env'];
    return extensions.some(ext => filename.endsWith(ext));
  }

  private async updateFile(filePath: string): Promise<void> {
    try {
      const content = readFileSync(filePath, 'utf-8');
      let updatedContent = content;
      let changeCount = 0;

      // Apply all replacements
      for (const replacement of this.replacements) {
        const matches = updatedContent.match(replacement.from);
        if (matches) {
          updatedContent = updatedContent.replace(replacement.from, replacement.to);
          changeCount += matches.length;
        }
      }

      // Only write if changes were made
      if (changeCount > 0) {
        writeFileSync(filePath, updatedContent, 'utf-8');
        this.updates.push({
          path: filePath,
          changes: changeCount,
          updated: true
        });
        console.log(`✅ Updated: ${filePath} (${changeCount} changes)`);
      } else {
        this.updates.push({
          path: filePath,
          changes: 0,
          updated: false
        });
      }
    } catch (error) {
      console.error(`❌ Error processing ${filePath}:`, error);
    }
  }

  generateReport(): string {
    const totalFiles = this.updates.length;
    const updatedFiles = this.updates.filter(u => u.updated).length;
    const totalChanges = this.updates.reduce((sum, u) => sum + u.changes, 0);

    let report = '📊 FACTORY-WAGER UPDATE REPORT\n';
    report += '='.repeat(50) + '\n\n';

    report += `📈 SUMMARY:\n`;
    report += `   Total Files Scanned: ${totalFiles}\n`;
    report += `   Files Updated: ${updatedFiles}\n`;
    report += `   Total Changes Made: ${totalChanges}\n\n`;

    if (updatedFiles > 0) {
      report += `📝 UPDATED FILES:\n`;
      this.updates
        .filter(u => u.updated)
        .forEach(u => {
          report += `   ✅ ${u.path} (${u.changes} changes)\n`;
        });
      report += '\n';
    }

    report += `🔧 REPLACEMENTS APPLIED:\n`;
    this.replacements.forEach((r, i) => {
      report += `   ${i + 1}. ${r.from} → ${r.to}\n`;
    });

    return report;
  }

  async run(rootPath: string = './src'): Promise<void> {
    console.log('🏭 STARTING FACTORY-WAGER UPDATE');
    console.log('='.repeat(50));
    
    const startTime = Date.now();
    
    await this.updateDirectory(rootPath);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log('\n' + this.generateReport());
    console.log(`⏱️  Completed in ${duration}ms`);
    
    if (this.updates.some(u => u.updated)) {
      console.log('\n✅ UPDATE SUCCESSFUL!');
      console.log('🧪 Please run tests to verify changes');
      console.log('📝 Consider committing changes: git add . && git commit -m "🏭 Update to factory-wager branding"');
    } else {
      console.log('\n✅ NO CHANGES NEEDED');
      console.log('📊 All files already use factory-wager naming');
    }
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);
  const rootPath = args[0] || './src';
  const updater = new FactoryWagerUpdater();
  
  try {
    await updater.run(rootPath);
  } catch (error) {
    console.error('❌ Update failed:', error);
    process.exit(1);
  }
}

// Run if this is the main module
if (import.meta.main) {
  main();
}

export { FactoryWagerUpdater };

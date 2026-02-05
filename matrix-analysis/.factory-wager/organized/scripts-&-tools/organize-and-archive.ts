#!/usr/bin/env bun
/**
 * FactoryWager Organization & Archive System
 * Organizes untracked files and creates proper archives
 */

import { readFileSync, writeFileSync, existsSync, unlinkSync, statSync, mkdirSync, readdirSync } from "fs";
import { join, dirname, basename } from "path";
import { createHash } from "crypto";

interface FileCategory {
  name: string;
  description: string;
  patterns: string[];
  action: 'archive' | 'commit' | 'cleanup' | 'organize';
  priority: 'high' | 'medium' | 'low';
}

class FileOrganizer {
  private rootDir: string;
  private archiveDir: string;
  private organizedDir: string;
  private cleanupDir: string;

  constructor() {
    this.rootDir = process.cwd();
    this.archiveDir = join(this.rootDir, ".factory-wager", "archives", "organization");
    this.organizedDir = join(this.rootDir, ".factory-wager", "organized");
    this.cleanupDir = join(this.rootDir, ".factory-wager", "cleanup");
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    [this.archiveDir, this.organizedDir, this.cleanupDir].forEach(dir => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    });
  }

  private categories: FileCategory[] = [
    // High Priority - Should be committed
    {
      name: "Core Implementation",
      description: "Main system files that should be tracked",
      patterns: [
        "fw-vault-health.ts",
        "enhanced-bun-archive.ts", 
        "bun-archive-cli.ts",
        "secrets-manager.ts",
        "factory-wager-vault.ts"
      ],
      action: "commit",
      priority: "high"
    },
    {
      name: "Scripts & Tools",
      description: "Utility scripts and automation tools",
      patterns: [
        "scripts/*.ts",
        "fw-*.ts",
        "deploy-*.ts",
        "test-*.ts"
      ],
      action: "organize",
      priority: "high"
    },
    {
      name: "Configuration Files",
      description: "System configuration and settings",
      patterns: [
        "config/*.yaml",
        "config/*.json",
        "wrangler.toml",
        ".env.template"
      ],
      action: "organize",
      priority: "medium"
    },
    {
      name: "Documentation",
      description: "Markdown documentation and guides",
      patterns: [
        "*.md",
        "*.MD"
      ],
      action: "archive",
      priority: "medium"
    },
    {
      name: "Test Files",
      description: "Test configurations and temporary files",
      patterns: [
        "test-*.yaml",
        "test-*.json",
        "test-*.html",
        "test-*.js",
        "*test*.ts"
      ],
      action: "cleanup",
      priority: "low"
    },
    {
      name: "Temporary Files",
      description: "Temporary and generated files",
      patterns: [
        "*.log",
        "*.backup",
        "vault-metadata.json",
        "health.json",
        "quick-status.ts",
        "final-status.ts"
      ],
      action: "cleanup",
      priority: "low"
    },
    {
      name: "Build Artifacts",
      description: "Build outputs and compiled files",
      patterns: [
        "node_modules/",
        "sourcemaps/",
        "*.html",
        "*.jar",
        "registry-cookies.jar"
      ],
      action: "cleanup",
      priority: "low"
    },
    {
      name: "Backup Data",
      description: "Existing backup and archive files",
      patterns: [
        "backups/",
        "profiles/",
        "releases/",
        "deployments/"
      ],
      action: "archive",
      priority: "medium"
    }
  ];

  async organizeAndArchive(): Promise<void> {
    console.log("🗂️ FactoryWager File Organization & Archive System");
    console.log("=" .repeat(55));

    const startTime = Date.now();
    const results = {
      organized: 0,
      archived: 0,
      cleaned: 0,
      committed: 0,
      errors: [] as string[]
    };

    // Get all untracked files
    const untrackedFiles = await this.getUntrackedFiles();
    console.log(`📊 Found ${untrackedFiles.length} untracked files\n`);

    // Process each category
    for (const category of this.categories) {
      console.log(`\n📁 Processing: ${category.name} (${category.action})`);
      
      const categoryFiles = this.filterFilesByCategory(untrackedFiles, category);
      
      if (categoryFiles.length === 0) {
        console.log("   No files found");
        continue;
      }

      console.log(`   Found ${categoryFiles.length} files`);

      switch (category.action) {
        case 'commit':
          await this.commitFiles(categoryFiles, category, results);
          break;
        case 'organize':
          await this.organizeFiles(categoryFiles, category, results);
          break;
        case 'archive':
          await this.archiveFiles(categoryFiles, category, results);
          break;
        case 'cleanup':
          await this.cleanupFiles(categoryFiles, category, results);
          break;
      }
    }

    // Create summary report
    await this.createSummaryReport(results, Date.now() - startTime);
    
    console.log("\n✅ Organization complete!");
    console.log(`   Organized: ${results.organized}`);
    console.log(`   Archived: ${results.archived}`);
    console.log(`   Cleaned: ${results.cleaned}`);
    console.log(`   Committed: ${results.committed}`);
    
    if (results.errors.length > 0) {
      console.log(`\n⚠️ Errors: ${results.errors.length}`);
      results.errors.forEach(error => console.log(`   ${error}`));
    }
  }

  private async getUntrackedFiles(): Promise<string[]> {
    const { execSync } = require('child_process');
    try {
      const output = execSync('git status --porcelain', { encoding: 'utf8' });
      return output
        .split('\n')
        .filter(line => line.startsWith('??'))
        .map(line => line.substring(3).trim())
        .filter(file => file.length > 0);
    } catch (error) {
      console.error('Failed to get git status:', error);
      return [];
    }
  }

  private filterFilesByCategory(files: string[], category: FileCategory): string[] {
    return files.filter(file => {
      return category.patterns.some(pattern => {
        // Simple glob matching
        const regex = new RegExp(
          pattern
            .replace(/\./g, '\\.')
            .replace(/\*/g, '.*')
            .replace(/\//g, '\\/')
        );
        return regex.test(file);
      });
    });
  }

  private async commitFiles(files: string[], category: FileCategory, results: any): Promise<void> {
    console.log("   📝 Staging for commit...");
    
    try {
      const { execSync } = require('child_process');
      
      for (const file of files) {
        if (existsSync(file)) {
          execSync(`git add "${file}"`, { encoding: 'utf8' });
          console.log(`   ✅ Staged: ${file}`);
          results.committed++;
        }
      }
    } catch (error) {
      results.errors.push(`Failed to stage files: ${(error as Error).message}`);
    }
  }

  private async organizeFiles(files: string[], category: FileCategory, results: any): Promise<void> {
    const categoryDir = join(this.organizedDir, category.name.toLowerCase().replace(/\s+/g, '-'));
    
    if (!existsSync(categoryDir)) {
      mkdirSync(categoryDir, { recursive: true });
    }

    for (const file of files) {
      try {
        if (existsSync(file)) {
          const targetPath = join(categoryDir, basename(file));
          
          // Read file content
          const content = readFileSync(file);
          
          // Write to organized location
          writeFileSync(targetPath, content);
          
          console.log(`   📁 Organized: ${file} → ${category.name}`);
          results.organized++;
        }
      } catch (error) {
        results.errors.push(`Failed to organize ${file}: ${(error as Error).message}`);
      }
    }
  }

  private async archiveFiles(files: string[], category: FileCategory, results: any): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archiveName = `${category.name.toLowerCase().replace(/\s+/g, '-')}-${timestamp}`;
    const archiveDir = join(this.archiveDir, archiveName);
    
    if (!existsSync(archiveDir)) {
      mkdirSync(archiveDir, { recursive: true });
    }

    // Create manifest
    const manifest = {
      category: category.name,
      description: category.description,
      timestamp: new Date().toISOString(),
      files: [] as Array<{
        original: string;
        size: number;
        hash: string;
      }>
    };

    for (const file of files) {
      try {
        if (existsSync(file)) {
          const content = readFileSync(file);
          const stats = statSync(file);
          const hash = createHash('sha256').update(content).digest('hex');
          
          // Copy to archive
          const targetPath = join(archiveDir, basename(file));
          writeFileSync(targetPath, content);
          
          manifest.files.push({
            original: file,
            size: stats.size,
            hash
          });
          
          console.log(`   📦 Archived: ${file}`);
          results.archived++;
        }
      } catch (error) {
        results.errors.push(`Failed to archive ${file}: ${(error as Error).message}`);
      }
    }

    // Save manifest
    writeFileSync(join(archiveDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
    
    // Create compressed archive
    await this.createCompressedArchive(archiveDir, archiveName);
  }

  private async cleanupFiles(files: string[], category: FileCategory, results: any): Promise<void> {
    const cleanupLog = join(this.cleanupDir, `cleanup-${Date.now()}.json`);
    const log = {
      timestamp: new Date().toISOString(),
      category: category.name,
      files: [] as Array<{ file: string; size: number; deleted: boolean }>
    };

    for (const file of files) {
      try {
        let deleted = false;
        let size = 0;
        
        if (existsSync(file)) {
          const stats = statSync(file);
          size = stats.size;
          
          // Move to cleanup directory first (safer than direct delete)
          const cleanupPath = join(this.cleanupDir, basename(file));
          require('fs').renameSync(file, cleanupPath);
          
          deleted = true;
          console.log(`   🗑️ Cleaned: ${file}`);
          results.cleaned++;
        }
        
        log.files.push({ file, size, deleted });
      } catch (error) {
        results.errors.push(`Failed to cleanup ${file}: ${(error as Error).message}`);
        log.files.push({ file, size: 0, deleted: false });
      }
    }

    writeFileSync(cleanupLog, JSON.stringify(log, null, 2));
  }

  private async createCompressedArchive(sourceDir: string, archiveName: string): Promise<void> {
    try {
      // Use Bun.Archive for compression
      const archiveEntries: Record<string, string> = {};
      
      const files = readdirSync(sourceDir, { recursive: true });
      for (const file of files) {
        if (typeof file === 'string') {
          const fullPath = join(sourceDir, file);
          if (existsSync(fullPath) && require('fs').statSync(fullPath).isFile()) {
            archiveEntries[file] = readFileSync(fullPath, 'utf8');
          }
        }
      }

      const archive = new Bun.Archive(archiveEntries, { compress: "gzip" });
      const archivePath = join(this.archiveDir, `${archiveName}.tar.gz`);
      await Bun.write(archivePath, archive);
      
      console.log(`   📦 Created compressed archive: ${archiveName}.tar.gz`);
    } catch (error) {
      console.log(`   ⚠️ Archive creation failed: ${(error as Error).message}`);
    }
  }

  private async createSummaryReport(results: any, duration: number): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      duration,
      results,
      categories: this.categories.map(cat => ({
        name: cat.name,
        action: cat.action,
        priority: cat.priority
      }))
    };

    const reportPath = join(this.archiveDir, `organization-report-${Date.now()}.json`);
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n📄 Report saved: ${reportPath}`);
  }
}

// CLI interface
async function main() {
  const organizer = new FileOrganizer();
  await organizer.organizeAndArchive();
}

if (import.meta.main) {
  main().catch(error => {
    console.error('❌ Organization failed:', error.message);
    process.exit(1);
  });
}

export { FileOrganizer };

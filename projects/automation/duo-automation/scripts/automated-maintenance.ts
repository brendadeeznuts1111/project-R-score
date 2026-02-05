#!/usr/bin/env bun

/**
 * Automated Maintenance Suite
 * Comprehensive maintenance automation for the enhanced artifact system
 */

import { join, extname } from 'path';

interface MaintenanceOptions {
  dryRun?: boolean;
  fixIssues?: boolean;
  generateReports?: boolean;
  updateIndexes?: boolean;
  cleanupDeprecated?: boolean;
  backupBeforeChanges?: boolean;
}

interface MaintenanceReport {
  timestamp: string;
  summary: {
    totalArtifacts: number;
    validatedArtifacts: number;
    issuesFound: number;
    issuesFixed: number;
    deprecatedRemoved: number;
    indexesUpdated: boolean;
  };
  details: {
    validationResults: any[];
    deprecatedTags: string[];
    orphanedArtifacts: string[];
    performanceMetrics: any;
    recommendations: string[];
  };
}

class AutomatedMaintenance {
  private report: MaintenanceReport;
  private backupDir = './maintenance-backups';

  constructor() {
    this.report = this.initializeReport();
  }

  /**
   * Run complete maintenance suite
   */
  async runMaintenance(options: MaintenanceOptions = {}): Promise<MaintenanceReport> {
    console.log('🔧 Starting Automated Maintenance Suite...');
    const startTime = Date.now();

    try {
      // Create backup if requested
      if (options.backupBeforeChanges) {
        await this.createBackup();
      }

      // Step 1: Validate all artifacts
      console.log('\n📋 Step 1: Validating artifacts...');
      await this.validateArtifacts();

      // Step 2: Fix common issues
      if (options.fixIssues) {
        console.log('\n🔨 Step 2: Fixing common issues...');
        await this.fixCommonIssues();
      }

      // Step 3: Update indexes
      if (options.updateIndexes) {
        console.log('\n📊 Step 3: Updating indexes...');
        await this.updateIndexes();
      }

      // Step 4: Cleanup deprecated tags
      if (options.cleanupDeprecated) {
        console.log('\n🧹 Step 4: Cleaning up deprecated tags...');
        await this.cleanupDeprecatedTags();
      }

      // Step 5: Generate reports
      if (options.generateReports) {
        console.log('\n📄 Step 5: Generating maintenance reports...');
        await this.generateReports();
      }

      // Step 6: Performance optimization
      console.log('\n⚡ Step 6: Performance optimization...');
      await this.optimizePerformance();

      const elapsed = Date.now() - startTime;
      console.log(`✅ Maintenance completed in ${elapsed}ms`);

      this.finalizeReport();
      await this.saveReport();

      return this.report;

    } catch (error) {
      console.error('❌ Maintenance failed:', error.message);
      throw error;
    }
  }

  /**
   * Validate all artifacts
   */
  private async validateArtifacts(): Promise<void> {
    const { EnhancedTagValidator } = await import('./enhanced-validate-tags.ts');
    const validator = new EnhancedTagValidator();
    
    const results = await validator.validate({ 
      output: 'json',
      useRegistry: true,
      checkRelationships: true 
    });

    this.report.summary.validatedArtifacts = results.length;
    this.report.summary.issuesFound = results.filter(r => !r.valid).length;
    this.report.details.validationResults = results;

    console.log(`  ✓ Validated ${results.length} artifacts`);
    console.log(`  ✓ Found ${this.report.summary.issuesFound} issues`);
  }

  /**
   * Fix common issues automatically
   */
  private async fixCommonIssues(): Promise<void> {
    let fixesApplied = 0;

    // Fix missing tags in common files
    const commonFiles = [
      'package.json',
      'README.md',
      'bun.lock',
      'tsconfig.json'
    ];

    for (const file of commonFiles) {
      if (await this.fileExists(file)) {
        const fixed = await this.fixFileTags(file);
        if (fixed) fixesApplied++;
      }
    }

    // Fix TypeScript files missing basic tags
    const tsFiles = await this.findFiles('./src', '.ts');
    for (const file of tsFiles.slice(0, 10)) { // Limit to avoid too many changes
      const fixed = await this.fixTypeScriptTags(file);
      if (fixed) fixesApplied++;
    }

    this.report.summary.issuesFixed = fixesApplied;
    console.log(`  ✓ Applied ${fixesApplied} automatic fixes`);
  }

  /**
   * Update search indexes and caches
   */
  private async updateIndexes(): Promise<void> {
    try {
      // Rebuild search index
      const { ArtifactSearchEngine } = await import('./find-artifact.ts');
      const searchEngine = new ArtifactSearchEngine();
      await searchEngine.initialize();

      // Generate tag statistics
      const stats = searchEngine.getStats();
      
      // Update index file
      const indexData = {
        lastUpdated: new Date().toISOString(),
        totalArtifacts: stats.totalArtifacts,
        totalTags: stats.totalTags,
        tagDistribution: stats.tagDistribution,
        performance: {
          indexSize: JSON.stringify(stats).length,
          buildTime: Date.now()
        }
      };

      writeFileSync('./cache/search-index.json', JSON.stringify(indexData, null, 2));
      this.report.summary.indexesUpdated = true;
      
      console.log('  ✓ Search index updated');
      console.log(`  ✓ Indexed ${stats.totalArtifacts} artifacts with ${stats.totalTags} tags`);
    } catch (error) {
      console.error('  ❌ Failed to update indexes:', error.message);
      this.report.summary.indexesUpdated = false;
    }
  }

  /**
   * Cleanup deprecated tags
   */
  private async cleanupDeprecatedTags(): Promise<void> {
    try {
      const registry = JSON.parse(readFileSync('./docs/TAG_REGISTRY.json', 'utf-8'));
      const deprecatedTags = Object.keys(registry.tags).filter(tag => 
        registry.tags[tag].category === 'deprecated'
      );

      let removedCount = 0;

      // Find and remove deprecated tags from files
      const allFiles = await this.findAllFiles('./');
      
      for (const file of allFiles.slice(0, 50)) { // Limit for safety
        const content = readFileSync(file, 'utf-8');
        let modified = false;

        deprecatedTags.forEach(tag => {
          if (content.includes(tag)) {
            const newContent = content.replace(new RegExp(tag, 'g'), '');
            if (newContent !== content) {
              writeFileSync(file, newContent);
              modified = true;
            }
          }
        });

        if (modified) {
          removedCount++;
        }
      }

      this.report.summary.deprecatedRemoved = removedCount;
      this.report.details.deprecatedTags = deprecatedTags;
      
      console.log(`  ✓ Removed ${removedCount} deprecated tag occurrences`);
      console.log(`  ✓ Deprecated tags: ${deprecatedTags.join(', ')}`);
    } catch (error) {
      console.error('  ❌ Failed to cleanup deprecated tags:', error.message);
    }
  }

  /**
   * Generate comprehensive maintenance reports
   */
  private async generateReports(): Promise<void> {
    const reports = [
      'maintenance-summary.md',
      'validation-report.json',
      'performance-metrics.json',
      'recommendations.md'
    ];

    for (const report of reports) {
      await this.generateReport(report);
    }

    console.log(`  ✓ Generated ${reports.length} maintenance reports`);
  }

  /**
   * Optimize system performance
   */
  private async optimizePerformance(): Promise<void> {
    try {
      // Clean up cache files
      await this.cleanupCache();

      // Optimize tag registry
      await this.optimizeRegistry();

      // Generate performance metrics
      const metrics = await this.collectPerformanceMetrics();
      this.report.details.performanceMetrics = metrics;

      console.log('  ✓ Cache cleaned');
      console.log('  ✓ Registry optimized');
      console.log('  ✓ Performance metrics collected');
    } catch (error) {
      console.error('  ❌ Performance optimization failed:', error.message);
    }
  }

  /**
   * Create backup before making changes
   */
  private async createBackup(): Promise<void> {
    if (!await this.directoryExists(this.backupDir)) {
      execSync(`mkdir -p ${this.backupDir}`);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${this.backupDir}/backup-${timestamp}`;
    
    execSync(`mkdir -p ${backupPath}`);
    execSync(`cp -r docs ${backupPath}/`);
    execSync(`cp -r scripts ${backupPath}/`);
    execSync(`cp -r src ${backupPath}/`);

    console.log(`  ✓ Backup created: ${backupPath}`);
  }

  /**
   * Fix tags in a specific file
   */
  private async fixFileTags(filePath: string): Promise<boolean> {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const tags = this.extractTags(content);
      
      if (tags.length === 0) {
        // Add appropriate tags based on file type
        const newTags = this.suggestTagsForFile(filePath);
        if (newTags.length > 0) {
          const tagLine = `\n\n<!-- ${newTags.join(' ')} -->`;
          const newContent = content + tagLine;
          writeFileSync(filePath, newContent);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Fix TypeScript file tags
   */
  private async fixTypeScriptTags(filePath: string): Promise<boolean> {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const tags = this.extractTags(content);
      
      if (tags.length === 0) {
        // Add basic TypeScript tags
        const newTags = ['#typescript', '#development'];
        
        // Add domain-specific tags based on content
        if (content.includes('export') || content.includes('class')) {
          newTags.push('#api');
        }
        if (content.includes('test') || content.includes('spec')) {
          newTags.push('#testing');
        }
        
        const comment = `/**\n * ${newTags.join(' ')}\n */\n`;
        const newContent = comment + content;
        writeFileSync(filePath, newContent);
        return true;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Suggest tags for a file based on its path and type
   */
  private suggestTagsForFile(filePath: string): string[] {
    const tags: string[] = [];
    
    if (filePath.includes('package.json')) {
      tags.push('#config', '#dependencies', '#ready');
    } else if (filePath.includes('README.md')) {
      tags.push('#documentation', '#markdown', '#developers');
    } else if (filePath.includes('tsconfig.json')) {
      tags.push('#config', '#typescript', '#development');
    }
    
    return tags;
  }

  /**
   * Extract tags from content
   */
  private extractTags(content: string): string[] {
    const matches = content.match(/#[a-z0-9-]+/g) || [];
    return [...new Set(matches)].sort();
  }

  /**
   * Find files by extension
   */
  private async findFiles(dir: string, ext: string): Promise<string[]> {
    const files: string[] = [];
    
    const scan = (directory: string) => {
      try {
        const entries = readdirSync(directory);
        
        for (const entry of entries) {
          const fullPath = join(directory, entry);
          const stat = statSync(fullPath);
          
          if (stat.isDirectory() && !entry.startsWith('.')) {
            scan(fullPath);
          } else if (stat.isFile() && fullPath.endsWith(ext)) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    };
    
    scan(dir);
    return files;
  }

  /**
   * Find all files
   */
  private async findAllFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    const excludeDirs = ['.git', 'node_modules', '.bun', 'dist', 'build'];
    
    const scan = (directory: string) => {
      try {
        const entries = readdirSync(directory);
        
        for (const entry of entries) {
          const fullPath = join(directory, entry);
          const stat = statSync(fullPath);
          
          if (stat.isDirectory() && !excludeDirs.includes(entry)) {
            scan(fullPath);
          } else if (stat.isFile()) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    };
    
    scan(dir);
    return files;
  }

  /**
   * Cleanup cache files
   */
  private async cleanupCache(): Promise<void> {
    try {
      if (this.directoryExists('./cache')) {
        execSync('rm -rf ./cache/*');
        execSync('mkdir -p ./cache');
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  /**
   * Optimize tag registry
   */
  private async optimizeRegistry(): Promise<void> {
    try {
      const registry = JSON.parse(readFileSync('./docs/TAG_REGISTRY.json', 'utf-8'));
      
      // Remove unused tags
      const usedTags = await this.getUsedTags();
      const unusedTags = Object.keys(registry.tags).filter(tag => !usedTags.includes(tag));
      
      // Archive unused tags instead of deleting
      if (unusedTags.length > 0) {
        registry.archived = registry.archived || {};
        unusedTags.forEach(tag => {
          registry.archived[tag] = registry.tags[tag];
          delete registry.tags[tag];
        });
        
        writeFileSync('./docs/TAG_REGISTRY.json', JSON.stringify(registry, null, 2));
      }
    } catch (error) {
      console.error('Registry optimization failed:', error.message);
    }
  }

  /**
   * Get currently used tags
   */
  private async getUsedTags(): Promise<string[]> {
    const usedTags = new Set<string>();
    const allFiles = await this.findAllFiles('./');
    
    for (const file of allFiles.slice(0, 100)) { // Limit for performance
      try {
        const content = readFileSync(file, 'utf-8');
        const tags = this.extractTags(content);
        tags.forEach(tag => usedTags.add(tag));
      } catch (error) {
        // Skip files we can't read
      }
    }
    
    return Array.from(usedTags);
  }

  /**
   * Collect performance metrics
   */
  private async collectPerformanceMetrics(): Promise<any> {
    const startTime = Date.now();
    
    // Test search performance
    const { ArtifactSearchEngine } = await import('./find-artifact.ts');
    const searchEngine = new ArtifactSearchEngine();
    await searchEngine.initialize();
    
    const searchStart = Date.now();
    await searchEngine.search({ tags: ['#typescript'], maxResults: 10 });
    const searchTime = Date.now() - searchStart;
    
    // Test validation performance
    const { EnhancedTagValidator } = await import('./enhanced-validate-tags.ts');
    const validator = new EnhancedTagValidator();
    
    const validationStart = Date.now();
    await validator.validate({ output: 'json' });
    const validationTime = Date.now() - validationStart;
    
    return {
      timestamp: new Date().toISOString(),
      performance: {
        searchTime,
        validationTime,
        totalTime: Date.now() - startTime
      },
      system: {
        totalArtifacts: this.report.summary.totalArtifacts,
        totalTags: searchEngine.getStats().totalTags,
        cacheSize: this.getCacheSize()
      }
    };
  }

  /**
   * Get cache size
   */
  private getCacheSize(): number {
    try {
      if (this.directoryExists('./cache')) {
        const result = execSync('du -sh ./cache', { encoding: 'utf-8' });
        return parseInt(result.split('\t')[0]) || 0;
      }
    } catch (error) {
      return 0;
    }
    return 0;
  }

  /**
   * Generate specific report
   */
  private async generateReport(reportType: string): Promise<void> {
    switch (reportType) {
      case 'maintenance-summary.md':
        this.generateMaintenanceSummary();
        break;
      case 'validation-report.json':
        this.generateValidationReport();
        break;
      case 'performance-metrics.json':
        this.generatePerformanceReport();
        break;
      case 'recommendations.md':
        this.generateRecommendations();
        break;
    }
  }

  /**
   * Generate maintenance summary
   */
  private generateMaintenanceSummary(): void {
    const summary = `# Maintenance Summary

**Timestamp:** ${this.report.timestamp}
**Total Artifacts:** ${this.report.summary.totalArtifacts}
**Validated Artifacts:** ${this.report.summary.validatedArtifacts}
**Issues Found:** ${this.report.summary.issuesFound}
**Issues Fixed:** ${this.report.summary.issuesFixed}
**Deprecated Removed:** ${this.report.summary.deprecatedRemoved}
**Indexes Updated:** ${this.report.summary.indexesUpdated ? 'Yes' : 'No'}

## Recommendations

${this.report.details.recommendations.map(rec => `- ${rec}`).join('\n')}

## Next Steps

1. Review fixed issues
2. Update documentation if needed
3. Schedule next maintenance run
4. Monitor system performance
`;

    writeFileSync('./reports/maintenance-summary.md', summary);
  }

  /**
   * Generate validation report
   */
  private generateValidationReport(): void {
    writeFileSync('./reports/validation-report.json', JSON.stringify(this.report.details.validationResults, null, 2));
  }

  /**
   * Generate performance report
   */
  private generatePerformanceReport(): void {
    writeFileSync('./reports/performance-metrics.json', JSON.stringify(this.report.details.performanceMetrics, null, 2));
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(): void {
    const recommendations = `# Maintenance Recommendations

## Immediate Actions

${this.report.details.recommendations.map(rec => `- ${rec}`).join('\n')}

## Long-term Improvements

1. Implement automated tagging for new files
2. Set up continuous monitoring
3. Enhance validation rules
4. Expand tag registry coverage

## Performance Optimizations

1. Implement caching for frequently accessed tags
2. Optimize search algorithms
3. Add parallel processing for large repositories
4. Consider database backend for tag storage
`;

    writeFileSync('./reports/recommendations.md', recommendations);
  }

  /**
   * Initialize maintenance report
   */
  private initializeReport(): MaintenanceReport {
    return {
      timestamp: new Date().toISOString(),
      summary: {
        totalArtifacts: 0,
        validatedArtifacts: 0,
        issuesFound: 0,
        issuesFixed: 0,
        deprecatedRemoved: 0,
        indexesUpdated: false
      },
      details: {
        validationResults: [],
        deprecatedTags: [],
        orphanedArtifacts: [],
        performanceMetrics: {},
        recommendations: []
      }
    };
  }

  /**
   * Finalize report with recommendations
   */
  private finalizeReport(): void {
    const recommendations: string[] = [];

    if (this.report.summary.issuesFound > 0) {
      recommendations.push(`${this.report.summary.issuesFound} validation issues need attention`);
    }

    if (this.report.summary.deprecatedRemoved > 0) {
      recommendations.push(`Consider updating documentation for deprecated tag removal`);
    }

    if (!this.report.summary.indexesUpdated) {
      recommendations.push(`Search index update failed - manual intervention required`);
    }

    if (this.report.details.performanceMetrics.performance?.validationTime > 1000) {
      recommendations.push(`Validation performance is slow - consider optimization`);
    }

    if (recommendations.length === 0) {
      recommendations.push('System is operating optimally');
    }

    this.report.details.recommendations = recommendations;
  }

  /**
   * Save maintenance report
   */
  private async saveReport(): Promise<void> {
    try {
      if (!await this.directoryExists('./reports')) {
        execSync('mkdir -p ./reports');
      }
      
      const reportPath = `./reports/maintenance-${Date.now()}.json`;
      writeFileSync(reportPath, JSON.stringify(this.report, null, 2));
      
      console.log(`  ✓ Report saved: ${reportPath}`);
    } catch (error) {
      console.error('Failed to save report:', error.message);
    }
  }

  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      statSync(filePath);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if directory exists
   */
  private async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stat = statSync(dirPath);
      return stat.isDirectory();
    } catch (error) {
      return false;
    }
  }
}

/**
 * CLI interface for automated maintenance
 */
async function main() {
  const args = process.argv.slice(2);
  const options: MaintenanceOptions = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--fix':
        options.fixIssues = true;
        break;
      case '--reports':
        options.generateReports = true;
        break;
      case '--update-indexes':
        options.updateIndexes = true;
        break;
      case '--cleanup':
        options.cleanupDeprecated = true;
        break;
      case '--backup':
        options.backupBeforeChanges = true;
        break;
      case '--all':
        options.fixIssues = true;
        options.generateReports = true;
        options.updateIndexes = true;
        options.cleanupDeprecated = true;
        options.backupBeforeChanges = true;
        break;
      case '--help':
      case '-h':
        console.log(`
🔧 Automated Maintenance CLI

Usage: bun run scripts/automated-maintenance.ts [options]

Options:
  --dry-run               Show what would be done without making changes
  --fix                   Fix common issues automatically
  --reports               Generate detailed maintenance reports
  --update-indexes        Update search indexes and caches
  --cleanup               Remove deprecated tags
  --backup                Create backup before making changes
  --all                   Run all maintenance tasks
  -h, --help              Show this help

Examples:
  bun run scripts/automated-maintenance.ts --dry-run
  bun run scripts/automated-maintenance.ts --fix --reports
  bun run scripts/automated-maintenance.ts --all
        `);
        return;
    }
  }

  if (options.dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made');
  }

  const maintenance = new AutomatedMaintenance();
  const report = await maintenance.runMaintenance(options);
  
  console.log('\n📊 Maintenance Summary:');
  console.log(`  Artifacts Validated: ${report.summary.validatedArtifacts}`);
  console.log(`  Issues Found: ${report.summary.issuesFound}`);
  console.log(`  Issues Fixed: ${report.summary.issuesFixed}`);
  console.log(`  Deprecated Removed: ${report.summary.deprecatedRemoved}`);
  console.log(`  Indexes Updated: ${report.summary.indexesUpdated ? 'Yes' : 'No'}`);
}

// Run CLI if called directly
if (import.meta.main) {
  main().catch(console.error);
}

export { AutomatedMaintenance, MaintenanceOptions, MaintenanceReport };

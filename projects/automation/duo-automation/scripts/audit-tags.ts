#!/usr/bin/env bun

/**
 * Tag Audit Script
 * Analyzes tag usage patterns, identifies issues, and generates recommendations
 */

import { join, extname } from 'path';

interface AuditOptions {
  output?: 'table' | 'json' | 'summary';
  includeRecommendations?: boolean;
  failOnError?: boolean;
}

interface TagAuditResult {
  totalArtifacts: number;
  taggedArtifacts: number;
  untaggedArtifacts: number;
  tagCoverage: number;
  uniqueTags: number;
  totalTagUsage: number;
  deprecatedTags: string[];
  orphanedTags: string[];
  underusedTags: string[];
  overusedTags: string[];
  inconsistentTags: string[];
  recommendations: string[];
  tagStats: Record<string, TagStats>;
  categoryStats: Record<string, CategoryStats>;
}

interface TagStats {
  count: number;
  percentage: number;
  firstUsed: Date;
  lastUsed: Date;
  fileTypes: string[];
  relatedTags: string[];
}

interface CategoryStats {
  totalTags: number;
  totalUsage: number;
  averageUsage: number;
  mostUsed: string;
  leastUsed: string;
}

class TagAuditor {
  private results: TagAuditResult;
  private deprecatedTagsList = ['#old', '#legacy', '#temp', '#todo', '#fixme'];
  private requiredCategories = ['type', 'domain', 'status'];
  private minTagUsage = 3;
  private maxTagUsage = 100;

  constructor() {
    this.results = this.initializeResults();
  }

  /**
   * Run complete tag audit
   */
  async audit(options: AuditOptions = {}): Promise<TagAuditResult> {
    console.log('🔍 Running comprehensive tag audit...');
    const startTime = Date.now();

    await this.collectTagData();
    this.analyzeTagPatterns();
    this.generateRecommendations();

    const elapsed = Date.now() - startTime;
    console.log(`✅ Audit completed in ${elapsed}ms`);

    this.outputResults(options.output || 'table');

    if (options.failOnError && this.hasCriticalIssues()) {
      console.error('\n❌ Critical issues found');
      process.exit(1);
    }

    return this.results;
  }

  /**
   * Get audit summary
   */
  getSummary(): string {
    const { results } = this;
    
    return `
📊 Tag Audit Summary
==================
Total Artifacts: ${results.totalArtifacts}
Tagged Artifacts: ${results.taggedArtifacts}
Tag Coverage: ${results.tagCoverage}%
Unique Tags: ${results.uniqueTags}
Critical Issues: ${results.deprecatedTags.length + results.orphanedTags.length}
Recommendations: ${results.recommendations.length}
    `.trim();
  }

  /**
   * Initialize audit results structure
   */
  private initializeResults(): TagAuditResult {
    return {
      totalArtifacts: 0,
      taggedArtifacts: 0,
      untaggedArtifacts: 0,
      tagCoverage: 0,
      uniqueTags: 0,
      totalTagUsage: 0,
      deprecatedTags: [],
      orphanedTags: [],
      underusedTags: [],
      overusedTags: [],
      inconsistentTags: [],
      recommendations: [],
      tagStats: {},
      categoryStats: {}
    };
  }

  /**
   * Collect tag data from all artifacts
   */
  private async collectTagData(): Promise<void> {
    const excludeDirs = [
      '.git', 'node_modules', '.bun', 'dist', 'build', 'coverage',
      '.next', '.nuxt', '.cache', 'tmp', 'temp', '.github'
    ];

    const scanDirectory = (dirPath: string): void => {
      try {
        const entries = readdirSync(dirPath);

        for (const entry of entries) {
          const fullPath = join(dirPath, entry);
          const stat = statSync(fullPath);

          if (stat.isDirectory() && !excludeDirs.includes(entry)) {
            scanDirectory(fullPath);
          } else if (stat.isFile()) {
            this.processArtifact(fullPath);
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    };

    scanDirectory('./');
  }

  /**
   * Process a single artifact
   */
  private processArtifact(filePath: string): void {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const tags = this.extractTags(content);
      const ext = extname(filePath);

      this.results.totalArtifacts++;

      if (tags.length > 0) {
        this.results.taggedArtifacts++;
        this.results.totalTagUsage += tags.length;

        // Update tag statistics
        tags.forEach(tag => {
          if (!this.results.tagStats[tag]) {
            this.results.tagStats[tag] = {
              count: 0,
              percentage: 0,
              firstUsed: new Date(),
              lastUsed: new Date(),
              fileTypes: [],
              relatedTags: []
            };
          }

          const stats = this.results.tagStats[tag];
          stats.count++;
          stats.lastUsed = new Date();
          
          if (!stats.fileTypes.includes(ext)) {
            stats.fileTypes.push(ext);
          }
        });

        // Track tag relationships
        tags.forEach(tag => {
          const related = tags.filter(t => t !== tag);
          this.results.tagStats[tag].relatedTags.push(...related);
        });
      } else {
        this.results.untaggedArtifacts++;
      }
    } catch (error) {
      // Skip files we can't read
    }
  }

  /**
   * Extract tags from content
   */
  private extractTags(content: string): string[] {
    const tags = new Set<string>();

    // Extract inline tags
    const inlineMatches = content.match(/#[a-z0-9-]+/g) || [];
    inlineMatches.forEach(tag => tags.add(tag));

    return Array.from(tags).sort();
  }

  /**
   * Analyze tag patterns and identify issues
   */
  private analyzeTagPatterns(): void {
    // Calculate basic metrics
    this.results.tagCoverage = this.results.totalArtifacts > 0 ? 
      Math.round((this.results.taggedArtifacts / this.results.totalArtifacts) * 100) : 0;
    
    this.results.uniqueTags = Object.keys(this.results.tagStats).length;

    // Calculate percentages
    Object.values(this.results.tagStats).forEach(stats => {
      stats.percentage = Math.round((stats.count / this.results.totalTagUsage) * 100);
    });

    // Identify deprecated tags
    this.results.deprecatedTags = Object.keys(this.results.tagStats)
      .filter(tag => this.deprecatedTagsList.includes(tag));

    // Identify orphaned tags (used only once)
    this.results.orphanedTags = Object.keys(this.results.tagStats)
      .filter(tag => this.results.tagStats[tag].count === 1);

    // Identify underused tags
    this.results.underusedTags = Object.keys(this.results.tagStats)
      .filter(tag => this.results.tagStats[tag].count < this.minTagUsage && 
                     !this.results.orphanedTags.includes(tag));

    // Identify overused tags
    this.results.overusedTags = Object.keys(this.results.tagStats)
      .filter(tag => this.results.tagStats[tag].count > this.maxTagUsage);

    // Analyze category usage
    this.analyzeCategories();

    // Identify inconsistent patterns
    this.identifyInconsistencies();
  }

  /**
   * Analyze tag categories
   */
  private analyzeCategories(): void {
    const categories = {
      status: ['#ready', '#wip', '#review', '#blocked', '#deprecated'],
      priority: ['#critical', '#high', '#medium', '#low'],
      domain: [
        '#security', '#config-management', '#devops', '#monitoring',
        '#api', '#ui', '#database', '#testing', '#documentation', '#performance'
      ],
      audience: ['#developers', '#devops', '#security', '#users', '#admins', '#all'],
      technology: [
        '#typescript', '#javascript', '#bun', '#react', '#vue', '#docker',
        '#kubernetes', '#aws', '#gcp', '#azure', '#postgresql', '#redis'
      ],
      environment: ['#production', '#staging', '#development', '#local', '#testing'],
      type: ['#api', '#cli', '#dashboard', '#library', '#component', '#service', '#utility']
    };

    Object.entries(categories).forEach(([category, tags]) => {
      const categoryTags = Object.keys(this.results.tagStats)
        .filter(tag => tags.includes(tag));

      const totalUsage = categoryTags.reduce((sum, tag) => 
        sum + this.results.tagStats[tag].count, 0);

      this.results.categoryStats[category] = {
        totalTags: categoryTags.length,
        totalUsage,
        averageUsage: categoryTags.length > 0 ? Math.round(totalUsage / categoryTags.length) : 0,
        mostUsed: categoryTags.length > 0 ? 
          categoryTags.reduce((a, b) => this.results.tagStats[a].count > this.results.tagStats[b].count ? a : b) : '',
        leastUsed: categoryTags.length > 0 ? 
          categoryTags.reduce((a, b) => this.results.tagStats[a].count < this.results.tagStats[b].count ? a : b) : ''
      };
    });
  }

  /**
   * Identify inconsistent tagging patterns
   */
  private identifyInconsistencies(): void {
    // Check for missing required categories
    Object.entries(this.results.categoryStats).forEach(([category, stats]) => {
      if (this.requiredCategories.includes(category) && stats.totalTags === 0) {
        this.results.inconsistentTags.push(`Missing ${category} tags`);
      }
    });

    // Check for inconsistent status usage
    const statusTags = Object.keys(this.results.tagStats)
      .filter(tag => ['#ready', '#wip', '#review', '#blocked', '#deprecated'].includes(tag));
    
    if (statusTags.length === 0) {
      this.results.inconsistentTags.push('No status tags found');
    }

    // Check for inconsistent domain usage
    const domainTags = Object.keys(this.results.tagStats)
      .filter(tag => [
        '#security', '#config-management', '#devops', '#monitoring',
        '#api', '#ui', '#database', '#testing', '#documentation', '#performance'
      ].includes(tag));
    
    if (domainTags.length === 0) {
      this.results.inconsistentTags.push('No domain tags found');
    }
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(): void {
    const recommendations: string[] = [];

    // Coverage recommendations
    if (this.results.tagCoverage < 90) {
      recommendations.push(
        `Improve tag coverage from ${this.results.tagCoverage}% to 90% by tagging ${this.results.untaggedArtifacts} untagged artifacts`
      );
    }

    // Deprecated tags
    if (this.results.deprecatedTags.length > 0) {
      recommendations.push(
        `Replace ${this.results.deprecatedTags.length} deprecated tags: ${this.results.deprecatedTags.join(', ')}`
      );
    }

    // Orphaned tags
    if (this.results.orphanedTags.length > 0) {
      recommendations.push(
        `Review ${this.results.orphanedTags.length} orphaned tags or add them to more artifacts`
      );
    }

    // Underused tags
    if (this.results.underusedTags.length > 0) {
      recommendations.push(
        `Consider consolidating ${this.results.underusedTags.length} underused tags or promote them`
      );
    }

    // Overused tags
    if (this.results.overusedTags.length > 0) {
      recommendations.push(
        `Consider splitting ${this.results.overusedTags.length} overused tags into more specific ones`
      );
    }

    // Category recommendations
    Object.entries(this.results.categoryStats).forEach(([category, stats]) => {
      if (this.requiredCategories.includes(category) && stats.totalTags === 0) {
        recommendations.push(`Add ${category} tags to improve categorization`);
      }
    });

    // Inconsistency recommendations
    if (this.results.inconsistentTags.length > 0) {
      recommendations.push(
        `Fix ${this.results.inconsistentTags.length} tagging inconsistencies`
      );
    }

    // General recommendations
    if (this.results.uniqueTags > 100) {
      recommendations.push('Consider consolidating tags to reduce complexity');
    }

    if (this.results.tagCoverage === 100) {
      recommendations.push('Excellent tag coverage! Consider advanced analytics');
    }

    this.results.recommendations = recommendations;
  }

  /**
   * Check for critical issues
   */
  private hasCriticalIssues(): boolean {
    return this.results.deprecatedTags.length > 0 || 
           this.results.orphanedTags.length > 10 || 
           this.results.tagCoverage < 50;
  }

  /**
   * Output audit results
   */
  private outputResults(format: string): void {
    switch (format) {
      case 'json':
        console.log(JSON.stringify(this.results, null, 2));
        break;
      case 'summary':
        console.log(this.getSummary());
        break;
      case 'table':
      default:
        this.outputTable();
        break;
    }
  }

  /**
   * Output results as table
   */
  private outputTable(): void {
    console.log('\n📊 Tag Audit Results');
    console.log('='.repeat(80));

    // Basic metrics
    console.log('\n📈 Basic Metrics:');
    console.log(`  Total Artifacts: ${this.results.totalArtifacts}`);
    console.log(`  Tagged Artifacts: ${this.results.taggedArtifacts}`);
    console.log(`  Tag Coverage: ${this.results.tagCoverage}%`);
    console.log(`  Unique Tags: ${this.results.uniqueTags}`);
    console.log(`  Total Tag Usage: ${this.results.totalTagUsage}`);

    // Issues found
    console.log('\n🚨 Issues Found:');
    console.log(`  Deprecated Tags: ${this.results.deprecatedTags.length}`);
    console.log(`  Orphaned Tags: ${this.results.orphanedTags.length}`);
    console.log(`  Underused Tags: ${this.results.underusedTags.length}`);
    console.log(`  Overused Tags: ${this.results.overusedTags.length}`);
    console.log(`  Inconsistencies: ${this.results.inconsistentTags.length}`);

    // Category breakdown
    console.log('\n📂 Category Breakdown:');
    Object.entries(this.results.categoryStats).forEach(([category, stats]) => {
      console.log(`  ${category}: ${stats.totalTags} tags, ${stats.totalUsage} usage`);
      if (stats.mostUsed) {
        console.log(`    Most used: ${stats.mostUsed} (${this.results.tagStats[stats.mostUsed].count})`);
      }
    });

    // Top tags
    console.log('\n🏷️  Top 10 Tags:');
    Object.entries(this.results.tagStats)
      .sort(([,a], [,b]) => b.count - a.count)
      .slice(0, 10)
      .forEach(([tag, stats], index) => {
        console.log(`  ${index + 1}. ${tag}: ${stats.count} artifacts (${stats.percentage}%)`);
      });

    // Issues details
    if (this.results.deprecatedTags.length > 0) {
      console.log('\n⚠️  Deprecated Tags:');
      this.results.deprecatedTags.forEach(tag => {
        console.log(`    ${tag} (${this.results.tagStats[tag].count} artifacts)`);
      });
    }

    if (this.results.orphanedTags.length > 0) {
      console.log('\n🏝️  Orphaned Tags:');
      this.results.orphanedTags.slice(0, 10).forEach(tag => {
        console.log(`    ${tag}`);
      });
      if (this.results.orphanedTags.length > 10) {
        console.log(`    ... and ${this.results.orphanedTags.length - 10} more`);
      }
    }

    // Recommendations
    if (this.results.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      this.results.recommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec}`);
      });
    }
  }
}

/**
 * CLI interface for tag audit
 */
async function main() {
  const args = process.argv.slice(2);
  const options: AuditOptions = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--output':
      case '-o':
        options.output = args[++i] as any;
        break;
      case '--include-recommendations':
      case '-r':
        options.includeRecommendations = true;
        break;
      case '--fail-on-error':
        options.failOnError = true;
        break;
      case '--help':
      case '-h':
        console.log(`
🔍 Tag Audit CLI

Usage: bun run scripts/audit-tags.ts [options]

Options:
  -o, --output <format>     Output format: table, json, summary
  -r, --include-recommendations  Include detailed recommendations
  --fail-on-error           Exit with error code if critical issues found
  -h, --help                Show this help

Examples:
  bun run scripts/audit-tags.ts
  bun run scripts/audit-tags.ts --output json
  bun run scripts/audit-tags.ts --include-recommendations
  bun run scripts/audit-tags.ts --fail-on-error
        `);
        return;
    }
  }

  const auditor = new TagAuditor();
  await auditor.audit(options);
}

// Run CLI if called directly
if (import.meta.main) {
  main().catch(console.error);
}

export { TagAuditor, TagAuditResult, AuditOptions };

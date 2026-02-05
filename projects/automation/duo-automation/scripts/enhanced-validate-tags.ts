#!/usr/bin/env bun

/**
 * Enhanced Tag Validation Script with Registry Integration
 * Validates artifact tags against the comprehensive tag registry
 */

import { join, extname } from 'path';
import { load } from 'js-yaml';

interface ValidationOptions {
  strict?: boolean;
  fix?: boolean;
  output?: 'table' | 'json' | 'summary';
  failOnError?: boolean;
  useRegistry?: boolean;
  checkRelationships?: boolean;
}

interface ValidationResult {
  path: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  tags: string[];
  missingRequired: string[];
  invalidFormat: string[];
  duplicates: string[];
  deprecatedTags: string[];
  relationshipIssues: string[];
}

interface TagRegistry {
  tags: Record<string, TagDefinition>;
  relationships: {
    tagGroups: Record<string, string[]>;
    commonCombinations: Array<{
      combination: string[];
      description: string;
      useCase: string;
    }>;
    workflows: Record<string, string[]>;
  };
  governance: {
    quality: {
      minTagUsage: number;
      maxTagUsage: number;
      requiredCategories: string[];
      maxTagsPerArtifact: number;
    };
  };
}

interface TagDefinition {
  category: string;
  definition: string;
  usage: string;
  examples: string[];
  related: string[];
  aliases: string[];
  requirements?: string[];
  governance?: {
    approvalRequired: boolean;
    maintainer: string;
    reviewFrequency: string;
  };
}

class EnhancedTagValidator {
  private registry: TagRegistry;
  private results: ValidationResult[] = [];

  constructor() {
    this.loadRegistry();
  }

  /**
   * Validate all artifacts with enhanced registry support
   */
  async validate(options: ValidationOptions = {}): Promise<ValidationResult[]> {
    console.log('🔍 Running enhanced tag validation with registry...');
    const startTime = Date.now();

    await this.scanArtifacts('./');
    this.analyzeResults(options);

    const elapsed = Date.now() - startTime;
    console.log(`✅ Validated ${this.results.length} artifacts in ${elapsed}ms`);

    this.outputResults(options.output || 'table');

    if (options.failOnError && this.hasErrors()) {
      console.error('\n❌ Validation failed with errors');
      process.exit(1);
    }

    return this.results;
  }

  /**
   * Get enhanced validation statistics
   */
  getEnhancedStats(): {
    total: number;
    valid: number;
    invalid: number;
    errorCount: number;
    warningCount: number;
    suggestionCount: number;
    tagStats: Record<string, number>;
    categoryStats: Record<string, number>;
    relationshipScore: number;
    complianceRate: number;
  } {
    const total = this.results.length;
    const valid = this.results.filter(r => r.valid).length;
    const invalid = total - valid;
    const errorCount = this.results.reduce((sum, r) => sum + r.errors.length, 0);
    const warningCount = this.results.reduce((sum, r) => sum + r.warnings.length, 0);
    const suggestionCount = this.results.reduce((sum, r) => sum + r.suggestions.length, 0);
    
    const tagStats: Record<string, number> = {};
    const categoryStats: Record<string, number> = {};

    this.results.forEach(result => {
      result.tags.forEach(tag => {
        tagStats[tag] = (tagStats[tag] || 0) + 1;
        
        const tagDef = this.registry.tags[tag];
        if (tagDef) {
          categoryStats[tagDef.category] = (categoryStats[tagDef.category] || 0) + 1;
        }
      });
    });

    // Calculate relationship score
    const relationshipScore = this.calculateRelationshipScore();
    const complianceRate = total > 0 ? Math.round((valid / total) * 100) : 0;

    return {
      total,
      valid,
      invalid,
      errorCount,
      warningCount,
      suggestionCount,
      tagStats,
      categoryStats,
      relationshipScore,
      complianceRate
    };
  }

  /**
   * Generate tag suggestions based on registry
   */
  generateSuggestions(artifact: ValidationResult): string[] {
    const suggestions: string[] = [];
    const tags = artifact.tags;
    const tagDefs = tags.map(tag => this.registry.tags[tag]).filter(Boolean);

    // Suggest related tags
    tagDefs.forEach(tagDef => {
      tagDef.related.forEach(relatedTag => {
        if (!tags.includes(relatedTag) && this.registry.tags[relatedTag]) {
          suggestions.push(`Consider adding related tag: ${relatedTag}`);
        }
      });
    });

    // Suggest common combinations
    this.registry.relationships.commonCombinations.forEach(combo => {
      const hasAllTags = combo.combination.every(tag => tags.includes(tag));
      const hasSomeTags = combo.combination.some(tag => tags.includes(tag));
      
      if (hasSomeTags && !hasAllTags) {
        const missingTags = combo.combination.filter(tag => !tags.includes(tag));
        suggestions.push(`Common combination for ${combo.useCase}: add ${missingTags.join(', ')}`);
      }
    });

    // Suggest missing required categories
    const categories = this.categorizeTags(tags);
    this.registry.governance.quality.requiredCategories.forEach(category => {
      if (!categories[category] || categories[category].length === 0) {
        const availableTags = Object.entries(this.registry.tags)
          .filter(([, def]) => def.category === category)
          .map(([tag]) => tag);
        
        if (availableTags.length > 0) {
          suggestions.push(`Missing ${category} category. Consider: ${availableTags.slice(0, 3).join(', ')}`);
        }
      }
    });

    return suggestions;
  }

  /**
   * Load tag registry from file
   */
  private loadRegistry(): void {
    try {
      const registryContent = readFileSync('./docs/TAG_REGISTRY.json', 'utf-8');
      this.registry = JSON.parse(registryContent);
      console.log('✅ Tag registry loaded successfully');
    } catch (error) {
      console.warn('⚠️ Could not load tag registry, using defaults');
      this.registry = this.getDefaultRegistry();
    }
  }

  /**
   * Get default registry for fallback
   */
  private getDefaultRegistry(): TagRegistry {
    return {
      tags: {},
      relationships: {
        tagGroups: {},
        commonCombinations: [],
        workflows: {}
      },
      governance: {
        quality: {
          minTagUsage: 3,
          maxTagUsage: 100,
          requiredCategories: ['type', 'domain', 'status'],
          maxTagsPerArtifact: 10
        }
      }
    };
  }

  /**
   * Scan all artifacts in the repository
   */
  private async scanArtifacts(rootPath: string): Promise<void> {
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
            this.validateArtifact(fullPath);
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    };

    scanDirectory(rootPath);
  }

  /**
   * Validate a single artifact
   */
  private validateArtifact(filePath: string): void {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const result = this.extractAndValidate(filePath, content);
      this.results.push(result);
    } catch (error) {
      // Skip files we can't read
    }
  }

  /**
   * Extract tags and validate against registry
   */
  private extractAndValidate(filePath: string, content: string): ValidationResult {
    const tags = this.extractTags(content);
    const ext = extname(filePath);

    const result: ValidationResult = {
      path: filePath,
      valid: true,
      errors: [],
      warnings: [],
      suggestions: [],
      tags,
      missingRequired: [],
      invalidFormat: [],
      duplicates: [],
      deprecatedTags: [],
      relationshipIssues: []
    };

    // Basic validation
    this.validateBasicRules(result, tags);
    
    // Registry validation
    this.validateAgainstRegistry(result, tags);
    
    // Category validation
    this.validateCategories(result, tags);
    
    // Relationship validation
    this.validateRelationships(result, tags);
    
    // Generate suggestions
    result.suggestions = this.generateSuggestions(result);

    return result;
  }

  /**
   * Validate basic tag rules
   */
  private validateBasicRules(result: ValidationResult, tags: string[]): void {
    // Check minimum tag count
    if (tags.length < this.registry.governance.quality.minTagUsage) {
      result.errors.push(
        `Too few tags (${tags.length}). Minimum required: ${this.registry.governance.quality.minTagUsage}`
      );
      result.valid = false;
    }

    // Check maximum tag count
    if (tags.length > this.registry.governance.quality.maxTagsPerArtifact) {
      result.warnings.push(
        `Too many tags (${tags.length}). Maximum allowed: ${this.registry.governance.quality.maxTagsPerArtifact}`
      );
    }

    // Check for duplicates
    const uniqueTags = [...new Set(tags)];
    if (uniqueTags.length !== tags.length) {
      result.duplicates = tags.filter((tag, index) => tags.indexOf(tag) !== index);
      result.errors.push(`Duplicate tags found: ${result.duplicates.join(', ')}`);
      result.valid = false;
    }

    // Check tag format
    tags.forEach(tag => {
      if (!/^#[a-z0-9-]+$/.test(tag)) {
        result.invalidFormat.push(tag);
      }
    });

    if (result.invalidFormat.length > 0) {
      result.errors.push(
        `Invalid tag format: ${result.invalidFormat.join(', ')}. Tags must match ^#[a-z0-9-]+$`
      );
      result.valid = false;
    }
  }

  /**
   * Validate tags against registry
   */
  private validateAgainstRegistry(result: ValidationResult, tags: string[]): void {
    tags.forEach(tag => {
      const tagDef = this.registry.tags[tag];
      
      if (!tagDef) {
        result.warnings.push(`Unknown tag: ${tag}. Consider adding to registry.`);
      } else {
        // Check for deprecated tags (would be in registry.deprecated)
        if (tagDef.category === 'deprecated') {
          result.deprecatedTags.push(tag);
          result.warnings.push(`Deprecated tag: ${tag}. ${tagDef.definition}`);
        }
      }
    });
  }

  /**
   * Validate tag categories
   */
  private validateCategories(result: ValidationResult, tags: string[]): void {
    const categories = this.categorizeTags(tags);
    
    this.registry.governance.quality.requiredCategories.forEach(category => {
      if (!categories[category] || categories[category].length === 0) {
        result.missingRequired.push(category);
      }
    });

    if (result.missingRequired.length > 0) {
      result.errors.push(
        `Missing required tag categories: ${result.missingRequired.join(', ')}`
      );
      result.valid = false;
    }
  }

  /**
   * Validate tag relationships
   */
  private validateRelationships(result: ValidationResult, tags: string[]): void {
    // Check for conflicting tags
    const statusTags = tags.filter(tag => {
      const tagDef = this.registry.tags[tag];
      return tagDef && tagDef.category === 'status';
    });

    if (statusTags.length > 1) {
      result.relationshipIssues.push(
        `Multiple status tags detected: ${statusTags.join(', ')}`
      );
    }

    // Check for logical inconsistencies
    if (tags.includes('#deprecated') && tags.includes('#ready')) {
      result.relationshipIssues.push('Cannot be both #deprecated and #ready');
    }

    if (tags.includes('#wip') && tags.includes('#production')) {
      result.relationshipIssues.push('Work in progress should not be in #production');
    }
  }

  /**
   * Categorize tags by type
   */
  private categorizeTags(tags: string[]): Record<string, string[]> {
    const categories: Record<string, string[]> = {};
    
    tags.forEach(tag => {
      const tagDef = this.registry.tags[tag];
      if (tagDef) {
        const category = tagDef.category;
        if (!categories[category]) {
          categories[category] = [];
        }
        categories[category].push(tag);
      }
    });

    return categories;
  }

  /**
   * Calculate relationship score
   */
  private calculateRelationshipScore(): number {
    let totalScore = 0;
    let maxScore = 0;

    this.results.forEach(result => {
      const tags = result.tags;
      let artifactScore = 0;

      // Check for common combinations
      this.registry.relationships.commonCombinations.forEach(combo => {
        const matchingTags = combo.combination.filter(tag => tags.includes(tag));
        const score = (matchingTags.length / combo.combination.length) * 10;
        artifactScore += score;
        maxScore += 10;
      });

      totalScore += artifactScore;
    });

    return maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  }

  /**
   * Analyze validation results
   */
  private analyzeResults(options: ValidationOptions): void {
    const stats = this.getEnhancedStats();
    
    console.log(`\n📊 Enhanced Validation Summary:`);
    console.log(`  Total Artifacts: ${stats.total}`);
    console.log(`  Valid: ${stats.valid} (${stats.complianceRate}%)`);
    console.log(`  Invalid: ${stats.invalid}`);
    console.log(`  Errors: ${stats.errorCount}`);
    console.log(`  Warnings: ${stats.warningCount}`);
    console.log(`  Suggestions: ${stats.suggestionCount}`);
    console.log(`  Relationship Score: ${stats.relationshipScore}%`);
  }

  /**
   * Output results in specified format
   */
  private outputResults(format: string): void {
    switch (format) {
      case 'json':
        console.log(JSON.stringify(this.results, null, 2));
        break;
      case 'summary':
        this.outputSummary();
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
    const invalidResults = this.results.filter(r => !r.valid);
    
    if (invalidResults.length === 0) {
      console.log('\n✅ All artifacts passed validation!');
      return;
    }

    console.log('\n❌ Validation Issues Found:');
    console.log('─'.repeat(120));

    invalidResults.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.path}`);
      
      if (result.errors.length > 0) {
        console.log('   Errors:');
        result.errors.forEach(error => console.log(`     ❌ ${error}`));
      }
      
      if (result.warnings.length > 0) {
        console.log('   Warnings:');
        result.warnings.forEach(warning => console.log(`     ⚠️  ${warning}`));
      }
      
      if (result.suggestions.length > 0) {
        console.log('   Suggestions:');
        result.suggestions.slice(0, 3).forEach(suggestion => console.log(`     💡 ${suggestion}`));
      }
      
      console.log(`   Tags: ${result.tags.join(', ') || 'None'}`);
    });

    console.log(`\nFound ${invalidResults.length} artifacts with issues`);
  }

  /**
   * Output summary only
   */
  private outputSummary(): void {
    const stats = this.getEnhancedStats();
    
    console.log('\n📊 Enhanced Validation Summary:');
    console.log(`  Total artifacts: ${stats.total}`);
    console.log(`  Valid: ${stats.valid} (${stats.complianceRate}%)`);
    console.log(`  Invalid: ${stats.invalid}`);
    console.log(`  Errors: ${stats.errorCount}`);
    console.log(`  Warnings: ${stats.warningCount}`);
    console.log(`  Suggestions: ${stats.suggestionCount}`);
    console.log(`  Relationship Score: ${stats.relationshipScore}%`);
    
    console.log('\n🏷️  Category Distribution:');
    Object.entries(stats.categoryStats).forEach(([category, count]) => {
      console.log(`  ${category}: ${count}`);
    });
  }

  /**
   * Check if there are any validation errors
   */
  private hasErrors(): boolean {
    return this.results.some(result => result.errors.length > 0);
  }

  /**
   * Extract tags from content
   */
  private extractTags(content: string): string[] {
    const tags = new Set<string>();

    // Extract from inline tags
    const inlineMatches = content.match(/#[a-z0-9-]+/g) || [];
    inlineMatches.forEach(tag => tags.add(tag));

    // Extract from YAML frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (frontmatterMatch) {
      try {
        const frontmatter = load(frontmatterMatch[1]) as any;
        if (frontmatter.tags) {
          if (Array.isArray(frontmatter.tags)) {
            frontmatter.tags.forEach((tag: string) => {
              if (typeof tag === 'string' && tag.startsWith('#')) {
                tags.add(tag);
              }
            });
          }
        }
      } catch (error) {
        // Invalid YAML, skip
      }
    }

    return Array.from(tags).sort();
  }
}

/**
 * CLI interface for enhanced tag validation
 */
async function main() {
  const args = process.argv.slice(2);
  const options: ValidationOptions = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--strict':
      case '-s':
        options.strict = true;
        break;
      case '--fix':
      case '-f':
        options.fix = true;
        break;
      case '--output':
      case '-o':
        options.output = args[++i] as any;
        break;
      case '--fail-on-error':
        options.failOnError = true;
        break;
      case '--use-registry':
        options.useRegistry = true;
        break;
      case '--check-relationships':
        options.checkRelationships = true;
        break;
      case '--help':
      case '-h':
        console.log(`
🔍 Enhanced Tag Validation CLI

Usage: bun run scripts/enhanced-validate-tags.ts [options]

Options:
  -s, --strict              Enable strict validation mode
  -f, --fix                 Attempt to fix common issues automatically
  -o, --output <format>     Output format: table, json, summary
  --fail-on-error           Exit with error code if validation fails
  --use-registry            Use comprehensive tag registry
  --check-relationships     Validate tag relationships and combinations
  -h, --help                Show this help

Examples:
  bun run scripts/enhanced-validate-tags.ts --use-registry --check-relationships
  bun run scripts/enhanced-validate-tags.ts --strict --fail-on-error
  bun run scripts/enhanced-validate-tags.ts --output json --use-registry
        `);
        return;
    }
  }

  const validator = new EnhancedTagValidator();
  await validator.validate(options);
}

// Run CLI if called directly
if (import.meta.main) {
  main().catch(console.error);
}

export { EnhancedTagValidator, ValidationResult, ValidationOptions };

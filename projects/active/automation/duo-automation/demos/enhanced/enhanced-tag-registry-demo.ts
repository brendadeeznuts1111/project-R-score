#!/usr/bin/env bun

/**
 * Enhanced Tag Registry Demo for DuoPlus CLI v3.0+
 * Advanced tag management with hierarchical organization and search
 */

import { join } from 'path';
import { EnhancedTagValidator } from './scripts/enhanced-validate-tags.ts';

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

async function demonstrateEnhancedTagRegistry() {
  console.info('🏷️  Enhanced Tag Registry Demonstration');
  console.info('='.repeat(80));
  
  try {
    // Load the tag registry
    console.info('\n📚 Loading Comprehensive Tag Registry...');
    const registryContent = readFileSync('./docs/TAG_REGISTRY.json', 'utf-8');
    const registry: TagRegistry = JSON.parse(registryContent);
    
    console.info(`✅ Registry loaded with ${Object.keys(registry.tags).length} tags`);
    
    // Demonstrate tag definitions
    console.info('\n📋 Tag Definitions & Examples:');
    console.info('-'.repeat(50));
    
    const exampleTags = ['#devops', '#ready', '#typescript', '#security', '#critical'];
    
    exampleTags.forEach(tag => {
      const tagDef = registry.tags[tag];
      if (tagDef) {
        console.info(`\n🏷️  ${tag}`);
        console.info(`   Category: ${tagDef.category}`);
        console.info(`   Definition: ${tagDef.definition}`);
        console.info(`   Usage: ${tagDef.usage}`);
        console.info(`   Examples: ${tagDef.examples.slice(0, 2).join(', ')}`);
        console.info(`   Related: ${tagDef.related.slice(0, 3).join(', ')}`);
        
        if (tagDef.aliases.length > 0) {
          console.info(`   Aliases: ${tagDef.aliases.join(', ')}`);
        }
        
        if (tagDef.requirements) {
          console.info(`   Requirements: ${tagDef.requirements.slice(0, 2).join(', ')}`);
        }
        
        if (tagDef.governance) {
          console.info(`   Governance: ${tagDef.governance.maintainer} | Review: ${tagDef.governance.reviewFrequency}`);
        }
      }
    });
    
    // Demonstrate tag relationships
    console.info('\n🔗 Tag Relationships & Combinations:');
    console.info('-'.repeat(50));
    
    console.info('\n📊 Tag Groups:');
    Object.entries(registry.relationships.tagGroups).forEach(([group, tags]) => {
      console.info(`  ${group}: ${tags.join(', ')}`);
    });
    
    console.info('\n🎯 Common Combinations:');
    registry.relationships.commonCombinations.slice(0, 3).forEach((combo, index) => {
      console.info(`  ${index + 1}. ${combo.combination.join(' + ')}`);
      console.info(`     Use Case: ${combo.useCase}`);
      console.info(`     Description: ${combo.description}`);
    });
    
    console.info('\n🔄 Workflow Patterns:');
    Object.entries(registry.relationships.workflows).forEach(([workflow, tags]) => {
      console.info(`  ${workflow}: ${tags.join(' → ')}`);
    });
    
    // Demonstrate governance features
    console.info('\n🛡️ Governance Framework:');
    console.info('-'.repeat(50));
    
    console.info('\n📏 Quality Standards:');
    const quality = registry.governance.quality;
    console.info(`  Minimum tags per artifact: ${quality.minTagUsage}`);
    console.info(`  Maximum tags per artifact: ${quality.maxTagsPerArtifact}`);
    console.info(`  Required categories: ${quality.requiredCategories.join(', ')}`);
    console.info(`  Maximum tag usage: ${quality.maxTagUsage}`);
    
    console.info('\n📋 Tag Categories Distribution:');
    const categoryStats: Record<string, number> = {};
    Object.values(registry.tags).forEach(tagDef => {
      categoryStats[tagDef.category] = (categoryStats[tagDef.category] || 0) + 1;
    });
    
    Object.entries(categoryStats).forEach(([category, count]) => {
      console.info(`  ${category}: ${count} tags`);
    });
    
    // Demonstrate enhanced validation
    console.info('\n🔍 Enhanced Validation with Registry:');
    console.info('-'.repeat(50));
    
    const validator = new EnhancedTagValidator();
    const validationResults = await validator.validate({ 
      output: 'summary',
      useRegistry: true,
      checkRelationships: true 
    });
    
    const stats = validator.getEnhancedStats();
    
    console.info('\n📈 Enhanced Validation Statistics:');
    console.info(`  Total artifacts: ${stats.total}`);
    console.info(`  Valid artifacts: ${stats.valid} (${stats.complianceRate}%)`);
    console.info(`  Relationship score: ${stats.relationshipScore}%`);
    console.info(`  Suggestions generated: ${stats.suggestionCount}`);
    
    // Show validation examples
    console.info('\n🎯 Validation Examples:');
    console.info('-'.repeat(50));
    
    const exampleArtifacts = [
      {
        path: 'src/api/auth-service.ts',
        tags: ['#typescript', '#api', '#security', '#ready'],
        description: 'Production-ready authentication API'
      },
      {
        path: 'scripts/deploy-staging.sh',
        tags: ['#devops', '#cli', '#staging', '#wip'],
        description: 'Work in progress deployment script'
      },
      {
        path: 'docs/api-reference.md',
        tags: ['#documentation', '#markdown', '#developers', '#ready'],
        description: 'Complete API documentation'
      }
    ];
    
    exampleArtifacts.forEach(artifact => {
      console.info(`\n📄 ${artifact.path}`);
      console.info(`   Tags: ${artifact.tags.join(', ')}`);
      console.info(`   Description: ${artifact.description}`);
      
      // Analyze the tags
      const categories = artifact.tags.map(tag => {
        const tagDef = registry.tags[tag];
        return tagDef ? tagDef.category : 'unknown';
      });
      
      console.info(`   Categories: ${[...new Set(categories)].join(', ')}`);
      
      // Check for common combinations
      const matchingCombos = registry.relationships.commonCombinations.filter(combo =>
        combo.combination.every(tag => artifact.tags.includes(tag))
      );
      
      if (matchingCombos.length > 0) {
        console.info(`   ✅ Matches common combination: ${matchingCombos[0].useCase}`);
      }
      
      // Generate suggestions
      const suggestions = validator.generateSuggestions({
        path: artifact.path,
        valid: true,
        errors: [],
        warnings: [],
        suggestions: [],
        tags: artifact.tags,
        missingRequired: [],
        invalidFormat: [],
        duplicates: [],
        deprecatedTags: [],
        relationshipIssues: []
      });
      
      if (suggestions.length > 0) {
        console.info(`   💡 Suggestions: ${suggestions.slice(0, 2).join('; ')}`);
      }
    });
    
    // Demonstrate tag search and discovery
    console.info('\n🔍 Tag Search & Discovery:');
    console.info('-'.repeat(50));
    
    console.info('\n🎯 Find tags by category:');
    const categories = ['status', 'domain', 'technology', 'audience'];
    
    categories.forEach(category => {
      const categoryTags = Object.entries(registry.tags)
        .filter(([, def]) => def.category === category)
        .map(([tag]) => tag);
      
      console.info(`  ${category}: ${categoryTags.slice(0, 5).join(', ')}${categoryTags.length > 5 ? '...' : ''}`);
    });
    
    console.info('\n🔗 Find related tags:');
    const searchTags = ['#security', '#typescript', '#devops'];
    
    searchTags.forEach(tag => {
      const tagDef = registry.tags[tag];
      if (tagDef) {
        console.info(`  ${tag} → ${tagDef.related.slice(0, 3).join(', ')}`);
      }
    });
    
    console.info('\n🎨 Find tags by use case:');
    const useCases = [
      { name: 'API Development', tags: ['#api', '#typescript', '#security'] },
      { name: 'DevOps Automation', tags: ['#devops', '#cli', '#automation'] },
      { name: 'Documentation', tags: ['#documentation', '#markdown', '#developers'] },
      { name: 'Testing', tags: ['#testing', '#automation', '#quality'] }
    ];
    
    useCases.forEach(useCase => {
      console.info(`  ${useCase.name}: ${useCase.tags.join(' + ')}`);
    });
    
    // Demonstrate governance in action
    console.info('\n🛡️ Governance in Action:');
    console.info('-'.repeat(50));
    
    console.info('\n📋 Approval Requirements:');
    const approvalRequired = Object.entries(registry.tags)
      .filter(([, def]) => def.governance?.approvalRequired)
      .map(([tag]) => tag);
    
    console.info(`  Tags requiring approval: ${approvalRequired.join(', ')}`);
    
    console.info('\n👥 Maintainer Assignment:');
    const maintainers: Record<string, string[]> = {};
    
    Object.entries(registry.tags).forEach(([tag, def]) => {
      if (def.governance?.maintainer) {
        const maintainer = def.governance.maintainer;
        if (!maintainers[maintainer]) {
          maintainers[maintainer] = [];
        }
        maintainers[maintainer].push(tag);
      }
    });
    
    Object.entries(maintainers).forEach(([maintainer, tags]) => {
      console.info(`  ${maintainer}: ${tags.slice(0, 3).join(', ')}${tags.length > 3 ? '...' : ''}`);
    });
    
    console.info('\n📅 Review Schedule:');
    const reviewSchedule: Record<string, string[]> = {};
    
    Object.entries(registry.tags).forEach(([tag, def]) => {
      if (def.governance?.reviewFrequency) {
        const frequency = def.governance.reviewFrequency;
        if (!reviewSchedule[frequency]) {
          reviewSchedule[frequency] = [];
        }
        reviewSchedule[frequency].push(tag);
      }
    });
    
    Object.entries(reviewSchedule).forEach(([frequency, tags]) => {
      console.info(`  ${frequency}: ${tags.length} tag groups`);
    });
    
    // Show system benefits
    console.info('\n🌟 Enhanced Registry Benefits:');
    console.info('-'.repeat(50));
    
    console.info('\n✅ Improved Discoverability:');
    console.info('  • Rich tag definitions with usage examples');
    console.info('  • Relationship mapping for related tags');
    console.info('  • Common combinations for quick tagging');
    console.info('  • Category-based organization');
    
    console.info('\n✅ Enhanced Validation:');
    console.info('  • Registry-based tag validation');
    console.info('  • Relationship consistency checking');
    console.info('  • Automated suggestion generation');
    console.info('  • Governance rule enforcement');
    
    console.info('\n✅ Better Governance:');
    console.info('  • Clear approval workflows');
    console.info('  • Maintainer assignment');
    console.info('  • Review scheduling');
    console.info('  • Quality standards enforcement');
    
    console.info('\n✅ Developer Experience:');
    console.info('  • Contextual tag suggestions');
    console.info('  • Usage examples and guidelines');
    console.info('  • Relationship awareness');
    console.info('  • Workflow-based tagging');
    
    // Performance metrics
    console.info('\n⚡ Performance Metrics:');
    console.info('-'.repeat(50));
    
    const perfStartTime = Date.now();
    
    // Registry loading performance
    const loadStart = Date.now();
    const registrySize = JSON.stringify(registry).length;
    const loadTime = Date.now() - loadStart;
    
    // Validation performance
    const validationStart = Date.now();
    await validator.validate({ output: 'json' });
    const validationTime = Date.now() - validationStart;
    
    // Search performance
    const searchStart = Date.now();
    const searchResults = Object.keys(registry.tags).filter(tag => 
      tag.includes('security') || registry.tags[tag].definition.includes('security')
    );
    const searchTime = Date.now() - searchStart;
    
    console.info(`  Registry size: ${(registrySize / 1024).toFixed(1)}KB`);
    console.info(`  Load time: ${loadTime}ms`);
    console.info(`  Validation time: ${validationTime}ms`);
    console.info(`  Search time: ${searchTime}ms (${searchResults.length} results)`);
    console.info(`  Total demo time: ${Date.now() - perfStartTime}ms`);
    
    console.info('\n🎉 Enhanced Tag Registry Demo Complete!');
    console.info('\n💡 Next Steps:');
    console.info('  1. Integrate with IDE extensions for auto-completion');
    console.info('  2. Add visual tag relationship explorer');
    console.info('  3. Implement automated tag suggestions');
    console.info('  4. Create tag usage analytics dashboard');
    console.info('  5. Extend with custom domain-specific tags');
    
    console.info('\n📚 Registry Files:');
    console.info('  • docs/TAG_REGISTRY.json - Comprehensive tag definitions');
    console.info('  • scripts/enhanced-validate-tags.ts - Registry-aware validation');
    console.info('  • docs/METADATA_SCHEMA.json - Metadata validation schema');
    console.info('  • docs/TAG_GOVERNANCE.md - Governance framework');
    
  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    process.exit(1);
  }
}

// Additional demonstration functions

async function demonstrateTagRelationships() {
  console.info('\n🔗 Advanced Tag Relationships:');
  console.info('-'.repeat(50));
  
  const registryContent = readFileSync('./docs/TAG_REGISTRY.json', 'utf-8');
  const registry: TagRegistry = JSON.parse(registryContent);
  
  console.info('\n🎯 Relationship Analysis:');
  
  // Find most connected tags
  const connectionCounts: Record<string, number> = {};
  
  Object.entries(registry.tags).forEach(([tag, def]) => {
    connectionCounts[tag] = def.related.length;
  });
  
  const mostConnected = Object.entries(connectionCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);
  
  console.info('  Most Connected Tags:');
  mostConnected.forEach(([tag, count]) => {
    console.info(`    ${tag}: ${count} relationships`);
  });
  
  // Find relationship clusters
  console.info('\n🕸️  Relationship Clusters:');
  const clusters = [
    { name: 'Security', tags: ['#security', '#authentication', '#authorization', '#encryption'] },
    { name: 'Development', tags: ['#typescript', '#api', '#testing', '#documentation'] },
    { name: 'Operations', tags: ['#devops', '#monitoring', '#config-management', '#deployment'] }
  ];
  
  clusters.forEach(cluster => {
    const clusterConnections = cluster.tags.map(tag => 
      registry.tags[tag]?.related || []
    ).flat();
    
    const uniqueConnections = [...new Set(clusterConnections)];
    console.info(`    ${cluster.name}: ${cluster.tags.join(' ↔ ')} → ${uniqueConnections.length} related tags`);
  });
}

async function demonstrateGovernanceWorkflows() {
  console.info('\n🛡️ Governance Workflows:');
  console.info('-'.repeat(50));
  
  console.info('\n📋 Tag Lifecycle Management:');
  console.info('  1. Proposal → Review → Approval → Implementation');
  console.info('  2. Usage Monitoring → Performance Analysis → Optimization');
  console.info('  3. Deprecation Detection → Grace Period → Removal');
  
  console.info('\n🔄 Quality Assurance Process:');
  console.info('  • Pre-commit validation');
  console.info('  • CI/CD pipeline checks');
  console.info('  • Daily compliance audits');
  console.info('  • Quarterly governance reviews');
  
  console.info('\n📊 Continuous Improvement:');
  console.info('  • Usage pattern analysis');
  console.info('  • Relationship optimization');
  console.info('  • Category refinement');
  console.info('  • Governance process enhancement');
}

// Run the complete demonstration
if (import.meta.main) {
  await demonstrateEnhancedTagRegistry();
  await demonstrateTagRelationships();
  await demonstrateGovernanceWorkflows();
}

export { 
  demonstrateEnhancedTagRegistry,
  demonstrateTagRelationships,
  demonstrateGovernanceWorkflows
};

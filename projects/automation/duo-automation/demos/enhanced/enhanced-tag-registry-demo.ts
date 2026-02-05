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
  console.log('🏷️  Enhanced Tag Registry Demonstration');
  console.log('='.repeat(80));
  
  try {
    // Load the tag registry
    console.log('\n📚 Loading Comprehensive Tag Registry...');
    const registryContent = readFileSync('./docs/TAG_REGISTRY.json', 'utf-8');
    const registry: TagRegistry = JSON.parse(registryContent);
    
    console.log(`✅ Registry loaded with ${Object.keys(registry.tags).length} tags`);
    
    // Demonstrate tag definitions
    console.log('\n📋 Tag Definitions & Examples:');
    console.log('-'.repeat(50));
    
    const exampleTags = ['#devops', '#ready', '#typescript', '#security', '#critical'];
    
    exampleTags.forEach(tag => {
      const tagDef = registry.tags[tag];
      if (tagDef) {
        console.log(`\n🏷️  ${tag}`);
        console.log(`   Category: ${tagDef.category}`);
        console.log(`   Definition: ${tagDef.definition}`);
        console.log(`   Usage: ${tagDef.usage}`);
        console.log(`   Examples: ${tagDef.examples.slice(0, 2).join(', ')}`);
        console.log(`   Related: ${tagDef.related.slice(0, 3).join(', ')}`);
        
        if (tagDef.aliases.length > 0) {
          console.log(`   Aliases: ${tagDef.aliases.join(', ')}`);
        }
        
        if (tagDef.requirements) {
          console.log(`   Requirements: ${tagDef.requirements.slice(0, 2).join(', ')}`);
        }
        
        if (tagDef.governance) {
          console.log(`   Governance: ${tagDef.governance.maintainer} | Review: ${tagDef.governance.reviewFrequency}`);
        }
      }
    });
    
    // Demonstrate tag relationships
    console.log('\n🔗 Tag Relationships & Combinations:');
    console.log('-'.repeat(50));
    
    console.log('\n📊 Tag Groups:');
    Object.entries(registry.relationships.tagGroups).forEach(([group, tags]) => {
      console.log(`  ${group}: ${tags.join(', ')}`);
    });
    
    console.log('\n🎯 Common Combinations:');
    registry.relationships.commonCombinations.slice(0, 3).forEach((combo, index) => {
      console.log(`  ${index + 1}. ${combo.combination.join(' + ')}`);
      console.log(`     Use Case: ${combo.useCase}`);
      console.log(`     Description: ${combo.description}`);
    });
    
    console.log('\n🔄 Workflow Patterns:');
    Object.entries(registry.relationships.workflows).forEach(([workflow, tags]) => {
      console.log(`  ${workflow}: ${tags.join(' → ')}`);
    });
    
    // Demonstrate governance features
    console.log('\n🛡️ Governance Framework:');
    console.log('-'.repeat(50));
    
    console.log('\n📏 Quality Standards:');
    const quality = registry.governance.quality;
    console.log(`  Minimum tags per artifact: ${quality.minTagUsage}`);
    console.log(`  Maximum tags per artifact: ${quality.maxTagsPerArtifact}`);
    console.log(`  Required categories: ${quality.requiredCategories.join(', ')}`);
    console.log(`  Maximum tag usage: ${quality.maxTagUsage}`);
    
    console.log('\n📋 Tag Categories Distribution:');
    const categoryStats: Record<string, number> = {};
    Object.values(registry.tags).forEach(tagDef => {
      categoryStats[tagDef.category] = (categoryStats[tagDef.category] || 0) + 1;
    });
    
    Object.entries(categoryStats).forEach(([category, count]) => {
      console.log(`  ${category}: ${count} tags`);
    });
    
    // Demonstrate enhanced validation
    console.log('\n🔍 Enhanced Validation with Registry:');
    console.log('-'.repeat(50));
    
    const validator = new EnhancedTagValidator();
    const validationResults = await validator.validate({ 
      output: 'summary',
      useRegistry: true,
      checkRelationships: true 
    });
    
    const stats = validator.getEnhancedStats();
    
    console.log('\n📈 Enhanced Validation Statistics:');
    console.log(`  Total artifacts: ${stats.total}`);
    console.log(`  Valid artifacts: ${stats.valid} (${stats.complianceRate}%)`);
    console.log(`  Relationship score: ${stats.relationshipScore}%`);
    console.log(`  Suggestions generated: ${stats.suggestionCount}`);
    
    // Show validation examples
    console.log('\n🎯 Validation Examples:');
    console.log('-'.repeat(50));
    
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
      console.log(`\n📄 ${artifact.path}`);
      console.log(`   Tags: ${artifact.tags.join(', ')}`);
      console.log(`   Description: ${artifact.description}`);
      
      // Analyze the tags
      const categories = artifact.tags.map(tag => {
        const tagDef = registry.tags[tag];
        return tagDef ? tagDef.category : 'unknown';
      });
      
      console.log(`   Categories: ${[...new Set(categories)].join(', ')}`);
      
      // Check for common combinations
      const matchingCombos = registry.relationships.commonCombinations.filter(combo =>
        combo.combination.every(tag => artifact.tags.includes(tag))
      );
      
      if (matchingCombos.length > 0) {
        console.log(`   ✅ Matches common combination: ${matchingCombos[0].useCase}`);
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
        console.log(`   💡 Suggestions: ${suggestions.slice(0, 2).join('; ')}`);
      }
    });
    
    // Demonstrate tag search and discovery
    console.log('\n🔍 Tag Search & Discovery:');
    console.log('-'.repeat(50));
    
    console.log('\n🎯 Find tags by category:');
    const categories = ['status', 'domain', 'technology', 'audience'];
    
    categories.forEach(category => {
      const categoryTags = Object.entries(registry.tags)
        .filter(([, def]) => def.category === category)
        .map(([tag]) => tag);
      
      console.log(`  ${category}: ${categoryTags.slice(0, 5).join(', ')}${categoryTags.length > 5 ? '...' : ''}`);
    });
    
    console.log('\n🔗 Find related tags:');
    const searchTags = ['#security', '#typescript', '#devops'];
    
    searchTags.forEach(tag => {
      const tagDef = registry.tags[tag];
      if (tagDef) {
        console.log(`  ${tag} → ${tagDef.related.slice(0, 3).join(', ')}`);
      }
    });
    
    console.log('\n🎨 Find tags by use case:');
    const useCases = [
      { name: 'API Development', tags: ['#api', '#typescript', '#security'] },
      { name: 'DevOps Automation', tags: ['#devops', '#cli', '#automation'] },
      { name: 'Documentation', tags: ['#documentation', '#markdown', '#developers'] },
      { name: 'Testing', tags: ['#testing', '#automation', '#quality'] }
    ];
    
    useCases.forEach(useCase => {
      console.log(`  ${useCase.name}: ${useCase.tags.join(' + ')}`);
    });
    
    // Demonstrate governance in action
    console.log('\n🛡️ Governance in Action:');
    console.log('-'.repeat(50));
    
    console.log('\n📋 Approval Requirements:');
    const approvalRequired = Object.entries(registry.tags)
      .filter(([, def]) => def.governance?.approvalRequired)
      .map(([tag]) => tag);
    
    console.log(`  Tags requiring approval: ${approvalRequired.join(', ')}`);
    
    console.log('\n👥 Maintainer Assignment:');
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
      console.log(`  ${maintainer}: ${tags.slice(0, 3).join(', ')}${tags.length > 3 ? '...' : ''}`);
    });
    
    console.log('\n📅 Review Schedule:');
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
      console.log(`  ${frequency}: ${tags.length} tag groups`);
    });
    
    // Show system benefits
    console.log('\n🌟 Enhanced Registry Benefits:');
    console.log('-'.repeat(50));
    
    console.log('\n✅ Improved Discoverability:');
    console.log('  • Rich tag definitions with usage examples');
    console.log('  • Relationship mapping for related tags');
    console.log('  • Common combinations for quick tagging');
    console.log('  • Category-based organization');
    
    console.log('\n✅ Enhanced Validation:');
    console.log('  • Registry-based tag validation');
    console.log('  • Relationship consistency checking');
    console.log('  • Automated suggestion generation');
    console.log('  • Governance rule enforcement');
    
    console.log('\n✅ Better Governance:');
    console.log('  • Clear approval workflows');
    console.log('  • Maintainer assignment');
    console.log('  • Review scheduling');
    console.log('  • Quality standards enforcement');
    
    console.log('\n✅ Developer Experience:');
    console.log('  • Contextual tag suggestions');
    console.log('  • Usage examples and guidelines');
    console.log('  • Relationship awareness');
    console.log('  • Workflow-based tagging');
    
    // Performance metrics
    console.log('\n⚡ Performance Metrics:');
    console.log('-'.repeat(50));
    
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
    
    console.log(`  Registry size: ${(registrySize / 1024).toFixed(1)}KB`);
    console.log(`  Load time: ${loadTime}ms`);
    console.log(`  Validation time: ${validationTime}ms`);
    console.log(`  Search time: ${searchTime}ms (${searchResults.length} results)`);
    console.log(`  Total demo time: ${Date.now() - perfStartTime}ms`);
    
    console.log('\n🎉 Enhanced Tag Registry Demo Complete!');
    console.log('\n💡 Next Steps:');
    console.log('  1. Integrate with IDE extensions for auto-completion');
    console.log('  2. Add visual tag relationship explorer');
    console.log('  3. Implement automated tag suggestions');
    console.log('  4. Create tag usage analytics dashboard');
    console.log('  5. Extend with custom domain-specific tags');
    
    console.log('\n📚 Registry Files:');
    console.log('  • docs/TAG_REGISTRY.json - Comprehensive tag definitions');
    console.log('  • scripts/enhanced-validate-tags.ts - Registry-aware validation');
    console.log('  • docs/METADATA_SCHEMA.json - Metadata validation schema');
    console.log('  • docs/TAG_GOVERNANCE.md - Governance framework');
    
  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    process.exit(1);
  }
}

// Additional demonstration functions

async function demonstrateTagRelationships() {
  console.log('\n🔗 Advanced Tag Relationships:');
  console.log('-'.repeat(50));
  
  const registryContent = readFileSync('./docs/TAG_REGISTRY.json', 'utf-8');
  const registry: TagRegistry = JSON.parse(registryContent);
  
  console.log('\n🎯 Relationship Analysis:');
  
  // Find most connected tags
  const connectionCounts: Record<string, number> = {};
  
  Object.entries(registry.tags).forEach(([tag, def]) => {
    connectionCounts[tag] = def.related.length;
  });
  
  const mostConnected = Object.entries(connectionCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);
  
  console.log('  Most Connected Tags:');
  mostConnected.forEach(([tag, count]) => {
    console.log(`    ${tag}: ${count} relationships`);
  });
  
  // Find relationship clusters
  console.log('\n🕸️  Relationship Clusters:');
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
    console.log(`    ${cluster.name}: ${cluster.tags.join(' ↔ ')} → ${uniqueConnections.length} related tags`);
  });
}

async function demonstrateGovernanceWorkflows() {
  console.log('\n🛡️ Governance Workflows:');
  console.log('-'.repeat(50));
  
  console.log('\n📋 Tag Lifecycle Management:');
  console.log('  1. Proposal → Review → Approval → Implementation');
  console.log('  2. Usage Monitoring → Performance Analysis → Optimization');
  console.log('  3. Deprecation Detection → Grace Period → Removal');
  
  console.log('\n🔄 Quality Assurance Process:');
  console.log('  • Pre-commit validation');
  console.log('  • CI/CD pipeline checks');
  console.log('  • Daily compliance audits');
  console.log('  • Quarterly governance reviews');
  
  console.log('\n📊 Continuous Improvement:');
  console.log('  • Usage pattern analysis');
  console.log('  • Relationship optimization');
  console.log('  • Category refinement');
  console.log('  • Governance process enhancement');
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

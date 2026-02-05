#!/usr/bin/env bun

/**
 * 🗂️ Simple Catalog CLI for Empire Pro
 * Standalone catalog browser with no dependencies
 */

import { CatalogViewer, formatRegistryItem } from '../../src/registry/catalog-viewer';

/**
 * 🚀 Main CLI function
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  try {
    const catalog = new CatalogViewer();

    switch (command) {
      case 'list':
        await handleListCommand(catalog, args);
        break;
      
      case 'search':
        await handleSearchCommand(catalog, args);
        break;
      
      case 'info':
        await handleInfoCommand(catalog, args);
        break;
      
      case 'crossref':
        await handleCrossReferenceCommand(catalog, args);
        break;
      
      case 'crossref-stats':
        await handleCrossReferenceStatsCommand(catalog);
        break;
      
      case 'stats':
        await handleStatsCommand(catalog);
        break;
      
      case 'help':
      default:
        showHelp();
        break;
    }
  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

/**
 * 📦 Handle list command
 */
async function handleListCommand(catalog: CatalogViewer, args: string[]): Promise<void> {
  const category = args[1] || 'all';
  const limit = parseInt(args[2] || '20');
  
  const query: any = { limit };
  if (category !== 'all') {
    query.category = category;
  }

  const results = catalog.search(query);

  if (results.length === 0) {
    console.log(`📭 No items found for category: ${category}`);
    return;
  }

  console.log(`\n📦 ${category === 'all' ? 'All Items' : category.charAt(0).toUpperCase() + category.slice(1)} (${results.length} items)\n`);
  console.log('─'.repeat(80));

  results.forEach((item, index) => {
    console.log(`\n${index + 1}. ${formatRegistryItem(item, {
      includeDetails: false,
      colorize: true
    })}`);
  });

  console.log('\n' + '─'.repeat(80));
}

/**
 * 🔍 Handle search command
 */
async function handleSearchCommand(catalog: CatalogViewer, args: string[]): Promise<void> {
  const query = args[1];
  if (!query) {
    console.log('❌ Please provide a search query');
    console.log('Usage: catalog search <query>');
    return;
  }

  const limit = parseInt(args[2] || '10');
  const results = catalog.search({ text: query, limit });

  if (results.length === 0) {
    console.log(`📭 No items found for search: '${query}'`);
    return;
  }

  console.log(`\n🔍 Search Results for '${query}' (${results.length} items)\n`);
  console.log('─'.repeat(80));

  results.forEach((item, index) => {
    console.log(`\n${index + 1}. ${formatRegistryItem(item, {
      includeDetails: false,
      colorize: true
    })}`);
  });

  console.log('\n' + '─'.repeat(80));
  console.log(`\n💡 Use 'catalog info <id>' for detailed information about any item`);
}

/**
 * 🔗 Handle cross-reference command
 */
async function handleCrossReferenceCommand(catalog: CatalogViewer, args: string[]): Promise<void> {
  const itemId = args[1];
  if (!itemId) {
    console.log('❌ Please provide an item ID');
    console.log('Usage: catalog crossref <id>');
    return;
  }

  try {
    console.log(`🔗 Cross-References for ${itemId}...\n`);
    
    // Get cross-references using the new API
    const crossRefs = await catalog.getCrossReferences(itemId, {
      includeDependencies: true,
      includeSimilar: true,
      includeCategory: true,
      includeTagBased: true,
      maxResults: 10,
      minStrength: 30
    });

    console.log(`📊 Cross-Reference Summary:`);
    console.log(`   Item ID: ${crossRefs.itemId}`);
    console.log(`   Related By: ${crossRefs.relatedBy}`);
    console.log(`   Strength: ${crossRefs.strength}/100`);
    console.log(`   References Found: ${crossRefs.crossReferences.length}\n`);

    if (crossRefs.crossReferences.length > 0) {
      console.log(`🔗 Cross-References (${crossRefs.crossReferences.length} items):\n`);
      console.log('─'.repeat(80));
      
      crossRefs.crossReferences.forEach((ref, index) => {
        const icon = ref.relationship === 'dependency' ? '🔗' : 
                    ref.relationship === 'dependent' ? '🔌' :
                    ref.relationship === 'similar' ? '🔍' :
                    ref.relationship === 'category' ? '📂' : '🏷️';
        
        console.log(`${index + 1}. ${icon} ${ref.name} v${ref.version}`);
        console.log(`   📋 ${ref.description.substring(0, 80)}${ref.description.length > 80 ? '...' : ''}`);
        console.log(`   🎯 Relationship: ${ref.relationship} (Relevance: ${ref.relevanceScore}%)`);
        console.log(`   📊 Downloads: ${ref.metrics.downloads.toLocaleString()} | ⭐ Stars: ${ref.metrics.stars}`);
        console.log(`   🏷️ Tags: ${ref.tags.map(tag => `#${tag}`).join(', ')}`);
        console.log('');
      });

      console.log('─'.repeat(80));
      
      // Show metadata
      console.log(`\n📊 Cross-Reference Metadata:`);
      console.log(`   Shared Tags: ${crossRefs.metadata.sharedTags.map(tag => `#${tag}`).join(', ')}`);
      console.log(`   Same Category: ${crossRefs.metadata.sharedCategory ? 'Yes' : 'No'}`);
      console.log(`   Dependency Chain: ${crossRefs.metadata.dependencyChain.join(' → ') || 'None'}`);
      console.log(`   Compatibility: ${crossRefs.metadata.compatibility}%`);
      
      if (crossRefs.metadata.usagePatterns.length > 0) {
        console.log(`   Usage Patterns:`);
        crossRefs.metadata.usagePatterns.forEach(pattern => {
          console.log(`     • ${pattern}`);
        });
      }
    } else {
      console.log('📭 No cross-references found for this item.');
    }

    console.log('\n💡 Use "catalog crossref <id> --deps" to see only dependencies');
    console.log('💡 Use "catalog crossref <id> --similar" to see similar items');

  } catch (error) {
    console.error(`❌ Cross-reference command failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 📊 Handle cross-reference stats command
 */
async function handleCrossReferenceStatsCommand(catalog: CatalogViewer): Promise<void> {
  try {
    console.log('📊 Cross-Reference Statistics\n');
    
    const stats = await catalog.getCrossReferenceStats();
    
    console.log('📈 Overall Statistics:');
    console.log(`   Total Items: ${stats.totalItems}`);
    console.log(`   Total Relationships: ${stats.totalRelationships}`);
    console.log(`   Average References per Item: ${stats.averageReferences}`);
    console.log(`   Most Connected Item: ${stats.mostConnected}`);
    console.log(`   Strongest Relationship: ${stats.strongestRelationship}\n`);
    
    console.log('🔗 Relationship Distribution:');
    console.log('─'.repeat(50));
    
    // Get detailed relationship stats
    const allItems = catalog.search({ limit: 1000 });
    const relationshipCounts: Record<string, number> = {};
    
    for (const item of allItems) {
      try {
        const crossRefs = await catalog.getCrossReferences(item.id, { maxResults: 100 });
        crossRefs.crossReferences.forEach(ref => {
          relationshipCounts[ref.relationship] = (relationshipCounts[ref.relationship] || 0) + 1;
        });
      } catch {
        // Skip items that can't be processed
      }
    }
    
    Object.entries(relationshipCounts).forEach(([relationship, count]) => {
      const icon = relationship === 'dependency' ? '🔗' : 
                  relationship === 'dependent' ? '🔌' :
                  relationship === 'similar' ? '🔍' :
                  relationship === 'category' ? '📂' : '🏷️';
      console.log(`   ${icon} ${relationship}: ${count}`);
    });
    
    console.log('─'.repeat(50));
    
  } catch (error) {
    console.error(`❌ Cross-reference stats command failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 📋 Handle info command
 */
async function handleInfoCommand(catalog: CatalogViewer, args: string[]): Promise<void> {
  const itemId = args[1];
  if (!itemId) {
    console.log('❌ Please provide an item ID');
    console.log('Usage: catalog info <id>');
    return;
  }

  const item = catalog.getItem(itemId);
  if (!item) {
    console.log(`❌ Item '${itemId}' not found in catalog.`);
    console.log(`💡 Use 'catalog search ${itemId}' to search for similar items.`);
    return;
  }

  console.log(`\n📋 Item Information: ${item.name}\n`);
  console.log('─'.repeat(80));
  
  console.log(formatRegistryItem(item, {
    includeDetails: true,
    includeDependencies: true,
    colorize: true
  }));

  console.log('\n' + '─'.repeat(80));
}

/**
 * 📊 Handle stats command
 */
async function handleStatsCommand(catalog: CatalogViewer): Promise<void> {
  const stats = catalog.getStats();

  console.log('\n📊 Empire Pro Catalog Statistics\n');
  console.log('─'.repeat(50));
  
  console.log(`\n📦 Overview:`);
  console.log(`  Total Items: ${stats.total}`);
  console.log(`  Categories: ${Object.keys(stats.categories).length}`);
  console.log(`  Top Tags: ${stats.topTags.length}`);

  console.log(`\n📂 By Category:`);
  Object.entries(stats.categories).forEach(([category, count]) => {
    const icons = {
      component: '🧩',
      endpoint: '🔗',
      service: '⚙️',
      package: '📦',
      tool: '🔧'
    };
    console.log(`  ${icons[category as keyof typeof icons] || '📦'} ${category.charAt(0).toUpperCase() + category.slice(1)}: ${count}`);
  });

  console.log(`\n🏷️ Top Tags:`);
  stats.topTags.slice(0, 5).forEach(({ tag, count }) => {
    console.log(`  #${tag}: ${count}`);
  });

  console.log(`\n📈 Status Distribution:`);
  Object.entries(stats.statuses).forEach(([status, count]) => {
    const icons = {
      active: '✅',
      deprecated: '⚠️',
      experimental: '🧪',
      archived: '📦'
    };
    console.log(`  ${icons[status as keyof typeof icons] || '📦'} ${status.charAt(0).toUpperCase() + status.slice(1)}: ${count}`);
  });

  console.log('\n' + '─'.repeat(50));
}

/**
 * ❓ Show help
 */
function showHelp(): void {
  console.log(`
🗂️ Empire Pro Catalog CLI

Usage: catalog <command> [options]

Commands:
  list [category] [limit]     List items by category
  search <query> [limit]      Search catalog
  info <id>                   Get detailed information
  crossref <id>               Get cross-references for an item
  crossref-stats              Show cross-reference statistics
  stats                       Show catalog statistics
  help                        Show this help

Categories:
  component, endpoint, service, package, tool, all

Examples:
  catalog list component 10    # List 10 components
  catalog search performance   # Search for performance items
  catalog info master-perf     # Get detailed info about master-perf
  catalog crossref master-perf # Get cross-references for master-perf
  catalog crossref-stats       # Show cross-reference statistics
  catalog stats                 # Show catalog statistics

📚 More help: https://docs.empire-pro-cli.com/catalog
`);
}

// Run the CLI
if (import.meta.main) {
  main().catch(console.error);
}

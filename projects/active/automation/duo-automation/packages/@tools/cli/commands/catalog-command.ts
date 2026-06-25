/**
 * 🗂️ Catalog Command for Empire Pro CLI
 * Browse and manage the private registry catalog
 */

import { Command } from 'commander';
import { CatalogViewer, formatRegistryItem } from '../../../src/registry/catalog-viewer';

/**
 * 🚀 Create catalog command
 */
export function createCatalogCommand(): Command {
  const catalog = new Command('catalog')
    .description('🗂️ Browse and manage the private registry catalog')
    .option('--search <text>', 'Search by name, description, or type')
    .option('--category <type>', 'Filter by category (component|endpoint|service|package|tool)')
    .option('--status <status>', 'Filter by status (active|deprecated|experimental|archived)')
    .option('--visibility <level>', 'Filter by visibility (public|private|internal)')
    .option('--limit <number>', 'Limit number of results', '10')
    .option('--details', 'Show detailed information')
    .option('--dependencies', 'Include dependency information')
    .option('--json', 'Output in JSON format')
    .option('--report', 'Generate catalog report')
    .action(async (options) => {
      try {
        const viewer = new CatalogViewer();
        
        if (options.report) {
          console.info(viewer.generateReport());
          return;
        }

        // Build search query
        const query: any = {};
        if (options.search) query.text = options.search;
        if (options.category) query.category = options.category;
        if (options.status) query.status = options.status;
        if (options.visibility) query.visibility = options.visibility;
        if (options.limit) query.limit = parseInt(options.limit);

        // Search catalog
        const results = viewer.search(query);

        if (options.json) {
          console.info(JSON.stringify(results, null, 2));
          return;
        }

        // Display results
        if (results.length === 0) {
          console.info('📭 No items found matching your search criteria.');
          return;
        }

        console.info(`\n🗂️ Catalog Search Results (${results.length} items)\n`);
        console.info('─'.repeat(80));

        results.forEach((item, index) => {
          console.info(`\n${index + 1}. ${formatRegistryItem(item, {
            includeDetails: options.details,
            includeDependencies: options.dependencies,
            colorize: true
          })}`);
        });

        console.info('\n' + '─'.repeat(80));
        console.info(`\n💡 Use 'empire catalog --help' for more options`);
        console.info(`🔍 Try 'empire catalog --search performance --details' for detailed view`);

      } catch (error) {
        console.error(`❌ Catalog command failed: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // Add subcommands
  catalog.addCommand(createCatalogInfoCommand());
  catalog.addCommand(createCatalogListCommand());
  catalog.addCommand(createCatalogSearchCommand());
  catalog.addCommand(createCatalogStatsCommand());

  return catalog;
}

/**
 * 📋 Create catalog info command
 */
function createCatalogInfoCommand(): Command {
  return new Command('info')
    .description('📋 Get detailed information about a specific item')
    .argument('<id>', 'Item ID (e.g., master-perf-inspector)')
    .option('--dependencies', 'Include dependency information')
    .option('--dependents', 'Include dependent information')
    .option('--json', 'Output in JSON format')
    .action(async (id, options) => {
      try {
        const viewer = new CatalogViewer();
        const item = viewer.getItem(id);

        if (!item) {
          console.info(`❌ Item '${id}' not found in catalog.`);
          console.info(`💡 Use 'empire catalog --search ${id}' to search for similar items.`);
          return;
        }

        if (options.json) {
          const result = { ...item };
          
          if (options.dependencies) {
            result.dependencies = viewer.getDependencies(id);
          }
          
          if (options.dependents) {
            result.dependents = viewer.getDependents(id);
          }
          
          console.info(JSON.stringify(result, null, 2));
          return;
        }

        console.info(`\n📋 Item Information: ${item.name}\n`);
        console.info('─'.repeat(80));
        
        console.info(formatRegistryItem(item, {
          includeDetails: true,
          includeDependencies: true,
          colorize: true
        }));

        if (options.dependencies) {
          const dependencies = viewer.getDependencies(id);
          if (dependencies.length > 0) {
            console.info(`\n🔗 Dependencies (${dependencies.length}):\n`);
            dependencies.forEach((dep, index) => {
              console.info(`  ${index + 1}. ${dep.name} v${dep.version} (${dep.category})`);
            });
          }
        }

        if (options.dependents) {
          const dependents = viewer.getDependents(id);
          if (dependents.length > 0) {
            console.info(`\n🔗 Dependents (${dependents.length}):\n`);
            dependents.forEach((dep, index) => {
              console.info(`  ${index + 1}. ${dep.name} v${dep.version} (${dep.category})`);
            });
          }
        }

        console.info('\n' + '─'.repeat(80));

      } catch (error) {
        console.error(`❌ Info command failed: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });
}

/**
 * 📦 Create catalog list command
 */
function createCatalogListCommand(): Command {
  return new Command('list')
    .description('📦 List items by category')
    .argument('<category>', 'Category (component|endpoint|service|package|tool|all)')
    .option('--status <status>', 'Filter by status')
    .option('--limit <number>', 'Limit number of results', '20')
    .option('--compact', 'Show compact view')
    .action(async (category, options) => {
      try {
        const viewer = new CatalogViewer();
        
        const query: any = {
          limit: parseInt(options.limit)
        };

        if (category !== 'all') {
          query.category = category;
        }

        if (options.status) {
          query.status = options.status;
        }

        const results = viewer.search(query);

        if (results.length === 0) {
          console.info(`📭 No items found for category: ${category}`);
          return;
        }

        console.info(`\n📦 ${category === 'all' ? 'All Items' : category.charAt(0).toUpperCase() + category.slice(1)} (${results.length} items)\n`);
        console.info('─'.repeat(80));

        if (options.compact) {
          results.forEach((item, index) => {
            const status = item.status === 'active' ? '✅' : 
                          item.status === 'deprecated' ? '⚠️' : 
                          item.status === 'experimental' ? '🧪' : '📦';
            console.info(`  ${index + 1:2}. ${status} ${item.name.padEnd(25)} v${item.version.padEnd(8)} ${item.type}`);
          });
        } else {
          results.forEach((item, index) => {
            console.info(`\n${index + 1}. ${formatRegistryItem(item, {
              includeDetails: false,
              colorize: true
            })}`);
          });
        }

        console.info('\n' + '─'.repeat(80));

      } catch (error) {
        console.error(`❌ List command failed: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });
}

/**
 * 🔍 Create catalog search command
 */
function createCatalogSearchCommand(): Command {
  return new Command('search')
    .description('🔍 Search catalog with advanced filters')
    .argument('<query>', 'Search query')
    .option('--category <type>', 'Filter by category')
    .option('--status <status>', 'Filter by status')
    .option('--visibility <level>', 'Filter by visibility')
    .option('--tags <tags>', 'Filter by tags (comma-separated)')
    .option('--limit <number>', 'Limit number of results', '10')
    .option('--sort <field>', 'Sort by field (name|stars|downloads|updated)', 'name')
    .option('--order <direction>', 'Sort direction (asc|desc)', 'asc')
    .action(async (query, options) => {
      try {
        const viewer = new CatalogViewer();
        
        const searchQuery: any = {
          text: query,
          limit: parseInt(options.limit)
        };

        if (options.category) searchQuery.category = options.category;
        if (options.status) searchQuery.status = options.status;
        if (options.visibility) searchQuery.visibility = options.visibility;
        if (options.tags) {
          searchQuery.tags = options.tags.split(',').map(tag => tag.trim());
        }

        let results = viewer.search(searchQuery);

        // Sort results
        if (options.sort) {
          results.sort((a, b) => {
            let aValue, bValue;
            
            switch (options.sort) {
              case 'name':
                aValue = a.name.toLowerCase();
                bValue = b.name.toLowerCase();
                break;
              case 'stars':
                aValue = a.metrics.stars;
                bValue = b.metrics.stars;
                break;
              case 'downloads':
                aValue = a.metrics.downloads;
                bValue = b.metrics.downloads;
                break;
              case 'updated':
                aValue = new Date(a.metrics.lastUpdated).getTime();
                bValue = new Date(b.metrics.lastUpdated).getTime();
                break;
              default:
                aValue = a.name.toLowerCase();
                bValue = b.name.toLowerCase();
            }
            
            const direction = options.order === 'desc' ? -1 : 1;
            return aValue > bValue ? direction : aValue < bValue ? -direction : 0;
          });
        }

        if (results.length === 0) {
          console.info(`📭 No items found for search: '${query}'`);
          return;
        }

        console.info(`\n🔍 Search Results for '${query}' (${results.length} items)\n`);
        console.info('─'.repeat(80));

        results.forEach((item, index) => {
          console.info(`\n${index + 1}. ${formatRegistryItem(item, {
            includeDetails: false,
            colorize: true
          })}`);
        });

        console.info('\n' + '─'.repeat(80));
        console.info(`\n💡 Use 'empire catalog info <id>' for detailed information about any item`);

      } catch (error) {
        console.error(`❌ Search command failed: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });
}

/**
 * 📊 Create catalog stats command
 */
function createCatalogStatsCommand(): Command {
  return new Command('stats')
    .description('📊 Show catalog statistics and metrics')
    .option('--format <type>', 'Output format (table|json)', 'table')
    .action(async (options) => {
      try {
        const viewer = new CatalogViewer();
        const stats = viewer.getStats();

        if (options.format === 'json') {
          console.info(JSON.stringify(stats, null, 2));
          return;
        }

        console.info('\n📊 Empire Pro Catalog Statistics\n');
        console.info('─'.repeat(50));
        
        console.info(`\n📦 Overview:`);
        console.info(`  Total Items: ${stats.total}`);
        console.info(`  Categories: ${Object.keys(stats.categories).length}`);
        console.info(`  Top Tags: ${stats.topTags.length}`);

        console.info(`\n📂 By Category:`);
        Object.entries(stats.categories).forEach(([category, count]) => {
          const icons = {
            component: '🧩',
            endpoint: '🔗',
            service: '⚙️',
            package: '📦',
            tool: '🔧'
          };
          console.info(`  ${icons[category as keyof typeof icons] || '📦'} ${category.charAt(0).toUpperCase() + category.slice(1)}: ${count}`);
        });

        console.info(`\n🏷️ Top Tags:`);
        stats.topTags.slice(0, 5).forEach(({ tag, count }) => {
          console.info(`  #${tag}: ${count}`);
        });

        console.info(`\n📈 Status Distribution:`);
        Object.entries(stats.statuses).forEach(([status, count]) => {
          const icons = {
            active: '✅',
            deprecated: '⚠️',
            experimental: '🧪',
            archived: '📦'
          };
          console.info(`  ${icons[status as keyof typeof icons] || '📦'} ${status.charAt(0).toUpperCase() + status.slice(1)}: ${count}`);
        });

        console.info(`\n🌐 Visibility:`);
        Object.entries(stats.visibility).forEach(([visibility, count]) => {
          const icons = {
            public: '🌍',
            private: '🔒',
            internal: '🏢'
          };
          console.info(`  ${icons[visibility as keyof typeof icons] || '📦'} ${visibility.charAt(0).toUpperCase() + visibility.slice(1)}: ${count}`);
        });

        console.info('\n' + '─'.repeat(50));

      } catch (error) {
        console.error(`❌ Stats command failed: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });
}

export default createCatalogCommand;

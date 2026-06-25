#!/usr/bin/env bun
/**
 * Demo: Nebula-Flow™ Enhanced JSON Filtering
 * Demonstrates category-based filtering capabilities
 */

// Simple filtering function for enhanced data
function filterEnhancedLogs(logs: any[], options: any) {
  if (!logs || !Array.isArray(logs)) return [];

  return logs.filter(log => {
    // Category filter
    if (options.categories && !options.categories.includes(log.category.primary)) {
      return false;
    }

    // Priority filter
    if (options.priorities && !options.priorities.includes(log.category.priority)) {
      return false;
    }

    // Domain filter
    if (options.domains && !options.domains.includes(log.category.domain)) {
      return false;
    }

    // Tags filter
    if (options.tags && !log.category.tags.some((tag: string) => options.tags.includes(tag))) {
      return false;
    }

    // Search filter
    if (options.search) {
      const search = options.search.toLowerCase();
      const searchable = `${log.type} ${log.message} ${log.category.primary} ${log.category.tags.join(' ')}`.toLowerCase();
      if (!searchable.includes(search)) {
        return false;
      }
    }

    // Time range filter
    if (options.timeRange) {
      const logTime = new Date(log.timestamp).getTime();
      if (logTime < options.timeRange.start.getTime() || logTime > options.timeRange.end.getTime()) {
        return false;
      }
    }

    return true;
  });
}

async function demoFiltering() {
  console.info('🎯 Nebula-Flow™ Enhanced JSON Filtering Demo');
  console.info('============================================\n');

  try {
    // Load the enhanced dashboard data directly (already enhanced)
    const enhancedData = JSON.parse(await Bun.file('nebula-dashboard-2026-01-21-enhanced.json').text());

    console.info('📊 Available Filter Options:');
    const filters = enhancedData.filters.available;
    console.info(`  • Categories: ${filters.categories.join(', ')}`);
    console.info(`  • Priorities: ${filters.priorities.join(', ')}`);
    console.info(`  • Domains: ${filters.domains.join(', ')}`);
    console.info(`  • Tags: ${filters.tags.slice(0, 10).join(', ')}...`);
    console.info(`  • Time Range: ${filters.timeRange.start.toLocaleString()} - ${filters.timeRange.end.toLocaleString()}\n`);

    console.info('🔍 Filtering Demonstrations:');
    console.info('==========================\n');

    // Filter 1: Show only error/alert logs
    console.info('1️⃣ Filter: Error & Alert Logs Only');
    const errorFilter = { categories: ['alert'] };
    const errorResults = filterEnhancedLogs(enhancedData.data.logs, errorFilter);
    console.info(`   Results: ${errorResults.length} entries`);
    errorResults.forEach(log => {
      console.info(`   • ${log.type.toUpperCase()}: ${log.message}`);
    });
    console.info('');

    // Filter 2: Show only system-related entries
    console.info('2️⃣ Filter: System Domain Only');
    const systemFilter = { domains: ['system'] };
    const systemResults = filterEnhancedLogs(enhancedData.data.logs, systemFilter);
    console.info(`   Results: ${systemResults.length} entries`);
    systemResults.forEach(log => {
      console.info(`   • ${log.category.primary}: ${log.message}`);
    });
    console.info('');

    // Filter 3: High priority items only
    console.info('3️⃣ Filter: High Priority Items');
    const priorityFilter = { priorities: ['high', 'critical'] };
    const priorityResults = filterEnhancedLogs(enhancedData.data.logs, priorityFilter);
    console.info(`   Results: ${priorityResults.length} entries`);
    priorityResults.forEach(log => {
      console.info(`   • ${log.category.priority.toUpperCase()}: ${log.message}`);
    });
    console.info('');

    // Filter 4: Search for specific terms
    console.info('4️⃣ Filter: Search for "refreshed"');
    const searchFilter = { search: 'refreshed' };
    const searchResults = filterEnhancedLogs(enhancedData.data.logs, searchFilter);
    console.info(`   Results: ${searchResults.length} entries`);
    searchResults.forEach(log => {
      console.info(`   • ${log.type}: ${log.message}`);
    });
    console.info('');

    // Filter 5: Time-based filtering (last 30 seconds)
    console.info('5️⃣ Filter: Last 30 Seconds Only');
    const now = new Date();
    const thirtySecondsAgo = new Date(now.getTime() - 30000);
    const timeFilter = {
      timeRange: { start: thirtySecondsAgo, end: now }
    };
    const timeResults = filterEnhancedLogs(enhancedData.data.logs, timeFilter);
    console.info(`   Results: ${timeResults.length} entries`);
    console.info(`   Time Range: ${thirtySecondsAgo.toLocaleTimeString()} - ${now.toLocaleTimeString()}`);
    console.info('');

    // Filter 6: Complex multi-criteria filter
    console.info('6️⃣ Filter: Complex - Medium Priority System Events');
    const complexFilter = {
      priorities: ['medium'],
      domains: ['system'],
      categories: ['system', 'configuration']
    };
    const complexResults = filterEnhancedLogs(enhancedData.data.logs, complexFilter);
    console.info(`   Results: ${complexResults.length} entries`);
    console.info('   Criteria: Medium priority + System domain + System/Configuration categories');
    console.info('');

    // Show category breakdown
    console.info('📈 Category Analysis:');
    const logs = enhancedData.data.logs;
    const categories: Record<string, number> = {};
    const priorities: Record<string, number> = {};
    const domains: Record<string, number> = {};

    logs.forEach(log => {
      categories[log.category.primary] = (categories[log.category.primary] || 0) + 1;
      priorities[log.category.priority] = (priorities[log.category.priority] || 0) + 1;
      domains[log.category.domain] = (domains[log.category.domain] || 0) + 1;
    });

    console.info('   By Category:');
    Object.entries(categories).forEach(([category, count]) => {
      console.info(`   • ${category}: ${count} entries`);
    });
    console.info('');

    console.info('   By Priority:');
    Object.entries(priorities).forEach(([priority, count]) => {
      console.info(`   • ${priority}: ${count} entries`);
    });
    console.info('');

    console.info('   By Domain:');
    Object.entries(domains).forEach(([domain, count]) => {
      console.info(`   • ${domain}: ${count} entries`);
    });
    console.info('');

    // Export filtered results
    console.info('💾 Export Examples:');
    console.info('==================');

    // Export only error logs
    const errorExport = {
      ...enhancedData,
      data: { ...enhancedData.data, logs: errorResults },
      metadata: { ...enhancedData.metadata, filteredEntries: errorResults.length }
    };
    await Bun.write('filtered-errors-only.json', JSON.stringify(errorExport, null, 2));
    console.info('✅ Exported error logs to: filtered-errors-only.json');

    // Export high-priority items
    const priorityExport = {
      ...enhancedData,
      data: { ...enhancedData.data, logs: priorityResults },
      metadata: { ...enhancedData.metadata, filteredEntries: priorityResults.length }
    };
    await Bun.write('filtered-high-priority.json', JSON.stringify(priorityExport, null, 2));
    console.info('✅ Exported high-priority items to: filtered-high-priority.json');

    console.info('\n🎉 Filtering demonstration complete!');
    console.info('\n💡 Key Benefits of Enhanced JSON:');
    console.info('  • Intelligent categorization of all data');
    console.info('  • Multi-dimensional filtering capabilities');
    console.info('  • Priority-based data organization');
    console.info('  • Domain-specific data isolation');
    console.info('  • Time-range filtering support');
    console.info('  • Full-text search functionality');
    console.info('  • Export of filtered result sets');

  } catch (error) {
    console.error('❌ Error in filtering demo:', error);
  }
}

// Run demo if called directly
if (import.meta.main) {
  demoFiltering();
}
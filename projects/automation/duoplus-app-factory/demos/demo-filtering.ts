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
  console.log('🎯 Nebula-Flow™ Enhanced JSON Filtering Demo');
  console.log('============================================\n');

  try {
    // Load the enhanced dashboard data directly (already enhanced)
    const enhancedData = JSON.parse(await Bun.file('nebula-dashboard-2026-01-21-enhanced.json').text());

    console.log('📊 Available Filter Options:');
    const filters = enhancedData.filters.available;
    console.log(`  • Categories: ${filters.categories.join(', ')}`);
    console.log(`  • Priorities: ${filters.priorities.join(', ')}`);
    console.log(`  • Domains: ${filters.domains.join(', ')}`);
    console.log(`  • Tags: ${filters.tags.slice(0, 10).join(', ')}...`);
    console.log(`  • Time Range: ${filters.timeRange.start.toLocaleString()} - ${filters.timeRange.end.toLocaleString()}\n`);

    console.log('🔍 Filtering Demonstrations:');
    console.log('==========================\n');

    // Filter 1: Show only error/alert logs
    console.log('1️⃣ Filter: Error & Alert Logs Only');
    const errorFilter = { categories: ['alert'] };
    const errorResults = filterEnhancedLogs(enhancedData.data.logs, errorFilter);
    console.log(`   Results: ${errorResults.length} entries`);
    errorResults.forEach(log => {
      console.log(`   • ${log.type.toUpperCase()}: ${log.message}`);
    });
    console.log('');

    // Filter 2: Show only system-related entries
    console.log('2️⃣ Filter: System Domain Only');
    const systemFilter = { domains: ['system'] };
    const systemResults = filterEnhancedLogs(enhancedData.data.logs, systemFilter);
    console.log(`   Results: ${systemResults.length} entries`);
    systemResults.forEach(log => {
      console.log(`   • ${log.category.primary}: ${log.message}`);
    });
    console.log('');

    // Filter 3: High priority items only
    console.log('3️⃣ Filter: High Priority Items');
    const priorityFilter = { priorities: ['high', 'critical'] };
    const priorityResults = filterEnhancedLogs(enhancedData.data.logs, priorityFilter);
    console.log(`   Results: ${priorityResults.length} entries`);
    priorityResults.forEach(log => {
      console.log(`   • ${log.category.priority.toUpperCase()}: ${log.message}`);
    });
    console.log('');

    // Filter 4: Search for specific terms
    console.log('4️⃣ Filter: Search for "refreshed"');
    const searchFilter = { search: 'refreshed' };
    const searchResults = filterEnhancedLogs(enhancedData.data.logs, searchFilter);
    console.log(`   Results: ${searchResults.length} entries`);
    searchResults.forEach(log => {
      console.log(`   • ${log.type}: ${log.message}`);
    });
    console.log('');

    // Filter 5: Time-based filtering (last 30 seconds)
    console.log('5️⃣ Filter: Last 30 Seconds Only');
    const now = new Date();
    const thirtySecondsAgo = new Date(now.getTime() - 30000);
    const timeFilter = {
      timeRange: { start: thirtySecondsAgo, end: now }
    };
    const timeResults = filterEnhancedLogs(enhancedData.data.logs, timeFilter);
    console.log(`   Results: ${timeResults.length} entries`);
    console.log(`   Time Range: ${thirtySecondsAgo.toLocaleTimeString()} - ${now.toLocaleTimeString()}`);
    console.log('');

    // Filter 6: Complex multi-criteria filter
    console.log('6️⃣ Filter: Complex - Medium Priority System Events');
    const complexFilter = {
      priorities: ['medium'],
      domains: ['system'],
      categories: ['system', 'configuration']
    };
    const complexResults = filterEnhancedLogs(enhancedData.data.logs, complexFilter);
    console.log(`   Results: ${complexResults.length} entries`);
    console.log('   Criteria: Medium priority + System domain + System/Configuration categories');
    console.log('');

    // Show category breakdown
    console.log('📈 Category Analysis:');
    const logs = enhancedData.data.logs;
    const categories: Record<string, number> = {};
    const priorities: Record<string, number> = {};
    const domains: Record<string, number> = {};

    logs.forEach(log => {
      categories[log.category.primary] = (categories[log.category.primary] || 0) + 1;
      priorities[log.category.priority] = (priorities[log.category.priority] || 0) + 1;
      domains[log.category.domain] = (domains[log.category.domain] || 0) + 1;
    });

    console.log('   By Category:');
    Object.entries(categories).forEach(([category, count]) => {
      console.log(`   • ${category}: ${count} entries`);
    });
    console.log('');

    console.log('   By Priority:');
    Object.entries(priorities).forEach(([priority, count]) => {
      console.log(`   • ${priority}: ${count} entries`);
    });
    console.log('');

    console.log('   By Domain:');
    Object.entries(domains).forEach(([domain, count]) => {
      console.log(`   • ${domain}: ${count} entries`);
    });
    console.log('');

    // Export filtered results
    console.log('💾 Export Examples:');
    console.log('==================');

    // Export only error logs
    const errorExport = {
      ...enhancedData,
      data: { ...enhancedData.data, logs: errorResults },
      metadata: { ...enhancedData.metadata, filteredEntries: errorResults.length }
    };
    await Bun.write('filtered-errors-only.json', JSON.stringify(errorExport, null, 2));
    console.log('✅ Exported error logs to: filtered-errors-only.json');

    // Export high-priority items
    const priorityExport = {
      ...enhancedData,
      data: { ...enhancedData.data, logs: priorityResults },
      metadata: { ...enhancedData.metadata, filteredEntries: priorityResults.length }
    };
    await Bun.write('filtered-high-priority.json', JSON.stringify(priorityExport, null, 2));
    console.log('✅ Exported high-priority items to: filtered-high-priority.json');

    console.log('\n🎉 Filtering demonstration complete!');
    console.log('\n💡 Key Benefits of Enhanced JSON:');
    console.log('  • Intelligent categorization of all data');
    console.log('  • Multi-dimensional filtering capabilities');
    console.log('  • Priority-based data organization');
    console.log('  • Domain-specific data isolation');
    console.log('  • Time-range filtering support');
    console.log('  • Full-text search functionality');
    console.log('  • Export of filtered result sets');

  } catch (error) {
    console.error('❌ Error in filtering demo:', error);
  }
}

// Run demo if called directly
if (import.meta.main) {
  demoFiltering();
}
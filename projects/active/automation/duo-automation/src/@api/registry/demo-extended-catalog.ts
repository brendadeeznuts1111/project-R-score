#!/usr/bin/env bun
// 🎭 Extended Catalog Viewer Demo - Comprehensive Feature Showcase

import { CatalogViewer, formatRegistryItem } from './catalog-viewer.js';

console.info('🎭 EXTENDED Catalog Viewer Demo');
console.info('='.repeat(60));

async function demonstrateExtendedCatalog() {
  const catalog = new CatalogViewer();
  
  console.info('\n📊 1. EXTENDED SEARCH CAPABILITIES');
  console.info('-'.repeat(40));
  
  // Performance-based search
  console.info('\n⚡ High-Performance Items (A+ Rating):');
  const highPerfItems = catalog.extendedSearch({ 
    performanceRating: 'A+', 
    limit: 3 
  });
  highPerfItems.forEach(item => {
    console.info(`  🏆 ${item.name} - ${item.performance.rating} performance`);
  });
  
  // Security-focused search
  console.info('\n🔒 Secure Items (A Score, No Vulnerabilities):');
  const secureItems = catalog.extendedSearch({ 
    securityScore: 'A', 
    hasVulnerabilities: false,
    limit: 3 
  });
  secureItems.forEach(item => {
    console.info(`  ✅ ${item.name} - ${item.security.score} security score`);
  });
  
  // Maintainer-based search
  console.info('\n👥 Items by Empire Pro Team:');
  const teamItems = catalog.extendedSearch({ 
    maintainer: 'Empire Pro Team',
    sortBy: 'downloads',
    sortOrder: 'desc',
    limit: 3 
  });
  teamItems.forEach(item => {
    console.info(`  🛠️  ${item.name} - ${item.metrics.downloads.toLocaleString()} downloads`);
  });
  
  console.info('\n📈 2. ANALYTICS & PERFORMANCE');
  console.info('-'.repeat(40));
  
  // Get analytics
  const analytics = catalog.getAnalytics();
  console.info('\n📊 Registry Overview:');
  console.info(`  Total Items: ${analytics.overview.totalItems}`);
  console.info(`  Active Items: ${analytics.overview.activeItems}`);
  console.info(`  Health Score: ${analytics.overview.healthScore}/100`);
  console.info(`  Total Downloads: ${analytics.overview.totalDownloads.toLocaleString()}`);
  
  // Performance breakdown
  console.info('\n⚡ Performance Breakdown:');
  const performanceRatings = ['A+', 'A', 'B', 'C', 'D', 'F'] as const;
  performanceRatings.forEach(rating => {
    const items = catalog.getItemsByPerformanceRating(rating);
    if (items.length > 0) {
      console.info(`  ${rating}: ${items.length} items`);
    }
  });
  
  console.info('\n🔍 3. DEPENDENCY ANALYSIS');
  console.info('-'.repeat(40));
  
  // Generate dependency graph
  const depGraph = catalog.generateDependencyGraph();
  console.info('\n🕸️  Dependency Graph Metrics:');
  console.info(`  Total Nodes: ${depGraph.metrics.totalNodes}`);
  console.info(`  Total Edges: ${depGraph.metrics.totalEdges}`);
  console.info(`  Circular Dependencies: ${depGraph.metrics.circularDependencies}`);
  console.info(`  Max Depth: ${depGraph.metrics.maxDepth}`);
  console.info(`  Critical Path: ${depGraph.metrics.criticalPath.slice(0, 3).join(' → ')}`);
  
  console.info('\n🚨 4. SECURITY & COMPLIANCE');
  console.info('-'.repeat(40));
  
  // Security issues
  const securityIssues = catalog.getSecurityIssues();
  console.info(`\n🔒 Security Status: ${securityIssues.length === 0 ? 'All Clear' : 'Attention Needed'}`);
  
  if (securityIssues.length > 0) {
    console.info('Items requiring attention:');
    securityIssues.forEach(item => {
      console.info(`  ⚠️  ${item.name} - ${item.security.score} score, ${item.security.vulnerabilities} vulnerabilities`);
    });
  }
  
  // Compliance standards
  console.info('\n📋 Compliance Standards:');
  const items = Array.from(catalog['items'].values());
  const standards = new Set();
  items.forEach(item => {
    item.compliance.standards.forEach(standard => {
      standards.add(`${standard.name} v${standard.version}`);
    });
  });
  Array.from(standards).forEach(standard => {
    console.info(`  ✅ ${standard}`);
  });
  
  console.info('\n🤖 5. AUTOMATION RULES');
  console.info('-'.repeat(40));
  
  // Get automation rules
  const automationRules = catalog.getAutomationRules();
  console.info(`\n⚙️  Active Automation Rules: ${automationRules.filter(r => r.enabled).length}`);
  
  automationRules.forEach(rule => {
    const status = rule.enabled ? '✅' : '❌';
    console.info(`  ${status} ${rule.name} (${rule.executionCount} executions)`);
    console.info(`     ${rule.description}`);
  });
  
  console.info('\n💡 6. RECOMMENDATIONS');
  console.info('-'.repeat(40));
  
  // Get recommendations
  const recommendations = catalog.getRecommendations();
  console.info(`\n🎯 Total Recommendations: ${recommendations.length}`);
  
  // Group by priority
  const highPriority = recommendations.filter(r => r.priority === 'high');
  const mediumPriority = recommendations.filter(r => r.priority === 'medium');
  const lowPriority = recommendations.filter(r => r.priority === 'low');
  
  console.info(`  High Priority: ${highPriority.length}`);
  console.info(`  Medium Priority: ${mediumPriority.length}`);
  console.info(`  Low Priority: ${lowPriority.length}`);
  
  if (highPriority.length > 0) {
    console.info('\n🔥 High Priority Recommendations:');
    highPriority.slice(0, 3).forEach(rec => {
      console.info(`  • ${rec.title}`);
      console.info(`    ${rec.description}`);
      console.info(`    Impact: ${rec.impact} | Effort: ${rec.effort}`);
    });
  }
  
  console.info('\n🌍 7. ECOSYSTEM METRICS');
  console.info('-'.repeat(40));
  
  const ecosystem = catalog.getEcosystemStats();
  console.info('\n🌐 Community Engagement:');
  console.info(`  Total Contributors: ${ecosystem.totalContributors}`);
  console.info(`  Total Forks: ${ecosystem.totalForks}`);
  console.info(`  Open Issues: ${ecosystem.totalIssues.open}`);
  console.info(`  Closed Issues: ${ecosystem.totalIssues.closed}`);
  console.info(`  Total Discussions: ${ecosystem.totalDiscussions}`);
  
  console.info('\n📈 Marketplace Performance:');
  console.info(`  Average Rating: ${ecosystem.averageRating.toFixed(1)}/5.0`);
  console.info(`  Company Adoptions: ${ecosystem.totalAdoptions}`);
  
  console.info('\n📋 8. ITEM COMPARISON');
  console.info('-'.repeat(40));
  
  // Compare items (if we have multiple items)
  const itemIds = Array.from(catalog['items'].keys()).slice(0, 2);
  if (itemIds.length >= 2) {
    const comparison = catalog.compareItems(itemIds);
    console.info(`\n🔍 Comparing ${itemIds.join(' vs ')}:`);
    console.info(`  Similarities: ${comparison.summary.similarities}`);
    console.info(`  Differences: ${comparison.summary.differences}`);
    console.info(`  Recommendation: ${comparison.summary.recommendation}`);
    
    if (comparison.comparison.length > 0) {
      console.info('\n📊 Key Differences:');
      comparison.comparison.slice(0, 3).forEach(comp => {
        console.info(`  • ${comp.field}:`);
        comp.differences.forEach(diff => {
          console.info(`    ${diff.itemId}: ${diff.value}`);
        });
      });
    }
  }
  
  console.info('\n📤 9. EXPORT CAPABILITIES');
  console.info('-'.repeat(40));
  
  // Demonstrate export
  const exportOptions = {
    format: 'json' as const,
    fields: ['id', 'name', 'version', 'category', 'status'] as const,
    filters: { status: 'active', limit: 2 },
    includeMetadata: true
  };
  
  const exportedData = await catalog.exportData(exportOptions);
  console.info('\n📋 Export Sample (JSON format):');
  console.info(exportedData.substring(0, 300) + '...');
  
  console.info('\n📄 10. ENHANCED FORMATTING');
  console.info('-'.repeat(40));
  
  // Show enhanced formatting
  const sampleItem = catalog.getItem('master-perf-inspector');
  if (sampleItem) {
    console.info('\n🎨 Enhanced Item Display:');
    console.info(formatRegistryItem(sampleItem, {
      includeDetails: true,
      includePerformance: true,
      includeAnalytics: true,
      includeRecommendations: true,
      colorize: true
    }));
  }
  
  console.info('\n🎉 EXTENDED CATALOG DEMO COMPLETE');
  console.info('='.repeat(60));
  
  console.info('\n🚀 Available Extended Features:');
  console.info('• Advanced search with 12+ filter criteria');
  console.info('• Performance analytics and rating system');
  console.info('• Security scanning and compliance tracking');
  console.info('• Dependency graph visualization');
  console.info('• Automation rules and execution');
  console.info('• Intelligent recommendations engine');
  console.info('• Ecosystem metrics and adoption tracking');
  console.info('• Multi-format data export (JSON, CSV, YAML)');
  console.info('• Item comparison and analysis');
  console.info('• Real-time analytics and monitoring');
  
  console.info('\n📖 Usage Examples:');
  console.info('import { CatalogViewer } from "./catalog-viewer.js";');
  console.info('const catalog = new CatalogViewer();');
  console.info('');
  console.info('// Advanced search');
  console.info('const results = catalog.extendedSearch({');
  console.info('  performanceRating: "A+",');
  console.info('  securityScore: "A",');
  console.info('  sortBy: "downloads",');
  console.info('  sortOrder: "desc"');
  console.info('});');
  console.info('');
  console.info('// Get analytics');
  console.info('const analytics = catalog.getAnalytics();');
  console.info('');
  console.info('// Generate dependency graph');
  console.info('const graph = catalog.generateDependencyGraph();');
  console.info('');
  console.info('// Export data');
  console.info('const data = await catalog.exportData({');
  console.info('  format: "json",');
  console.info('  includeMetadata: true');
  console.info('});');
}

// Run the demonstration
demonstrateExtendedCatalog().catch(console.error);

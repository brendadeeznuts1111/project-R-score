#!/usr/bin/env bun
// 🎭 Extended Catalog Viewer Demo - Comprehensive Feature Showcase

import { CatalogViewer, formatRegistryItem } from './catalog-viewer.js';

console.log('🎭 EXTENDED Catalog Viewer Demo');
console.log('='.repeat(60));

async function demonstrateExtendedCatalog() {
  const catalog = new CatalogViewer();
  
  console.log('\n📊 1. EXTENDED SEARCH CAPABILITIES');
  console.log('-'.repeat(40));
  
  // Performance-based search
  console.log('\n⚡ High-Performance Items (A+ Rating):');
  const highPerfItems = catalog.extendedSearch({ 
    performanceRating: 'A+', 
    limit: 3 
  });
  highPerfItems.forEach(item => {
    console.log(`  🏆 ${item.name} - ${item.performance.rating} performance`);
  });
  
  // Security-focused search
  console.log('\n🔒 Secure Items (A Score, No Vulnerabilities):');
  const secureItems = catalog.extendedSearch({ 
    securityScore: 'A', 
    hasVulnerabilities: false,
    limit: 3 
  });
  secureItems.forEach(item => {
    console.log(`  ✅ ${item.name} - ${item.security.score} security score`);
  });
  
  // Maintainer-based search
  console.log('\n👥 Items by Empire Pro Team:');
  const teamItems = catalog.extendedSearch({ 
    maintainer: 'Empire Pro Team',
    sortBy: 'downloads',
    sortOrder: 'desc',
    limit: 3 
  });
  teamItems.forEach(item => {
    console.log(`  🛠️  ${item.name} - ${item.metrics.downloads.toLocaleString()} downloads`);
  });
  
  console.log('\n📈 2. ANALYTICS & PERFORMANCE');
  console.log('-'.repeat(40));
  
  // Get analytics
  const analytics = catalog.getAnalytics();
  console.log('\n📊 Registry Overview:');
  console.log(`  Total Items: ${analytics.overview.totalItems}`);
  console.log(`  Active Items: ${analytics.overview.activeItems}`);
  console.log(`  Health Score: ${analytics.overview.healthScore}/100`);
  console.log(`  Total Downloads: ${analytics.overview.totalDownloads.toLocaleString()}`);
  
  // Performance breakdown
  console.log('\n⚡ Performance Breakdown:');
  const performanceRatings = ['A+', 'A', 'B', 'C', 'D', 'F'] as const;
  performanceRatings.forEach(rating => {
    const items = catalog.getItemsByPerformanceRating(rating);
    if (items.length > 0) {
      console.log(`  ${rating}: ${items.length} items`);
    }
  });
  
  console.log('\n🔍 3. DEPENDENCY ANALYSIS');
  console.log('-'.repeat(40));
  
  // Generate dependency graph
  const depGraph = catalog.generateDependencyGraph();
  console.log('\n🕸️  Dependency Graph Metrics:');
  console.log(`  Total Nodes: ${depGraph.metrics.totalNodes}`);
  console.log(`  Total Edges: ${depGraph.metrics.totalEdges}`);
  console.log(`  Circular Dependencies: ${depGraph.metrics.circularDependencies}`);
  console.log(`  Max Depth: ${depGraph.metrics.maxDepth}`);
  console.log(`  Critical Path: ${depGraph.metrics.criticalPath.slice(0, 3).join(' → ')}`);
  
  console.log('\n🚨 4. SECURITY & COMPLIANCE');
  console.log('-'.repeat(40));
  
  // Security issues
  const securityIssues = catalog.getSecurityIssues();
  console.log(`\n🔒 Security Status: ${securityIssues.length === 0 ? 'All Clear' : 'Attention Needed'}`);
  
  if (securityIssues.length > 0) {
    console.log('Items requiring attention:');
    securityIssues.forEach(item => {
      console.log(`  ⚠️  ${item.name} - ${item.security.score} score, ${item.security.vulnerabilities} vulnerabilities`);
    });
  }
  
  // Compliance standards
  console.log('\n📋 Compliance Standards:');
  const items = Array.from(catalog['items'].values());
  const standards = new Set();
  items.forEach(item => {
    item.compliance.standards.forEach(standard => {
      standards.add(`${standard.name} v${standard.version}`);
    });
  });
  Array.from(standards).forEach(standard => {
    console.log(`  ✅ ${standard}`);
  });
  
  console.log('\n🤖 5. AUTOMATION RULES');
  console.log('-'.repeat(40));
  
  // Get automation rules
  const automationRules = catalog.getAutomationRules();
  console.log(`\n⚙️  Active Automation Rules: ${automationRules.filter(r => r.enabled).length}`);
  
  automationRules.forEach(rule => {
    const status = rule.enabled ? '✅' : '❌';
    console.log(`  ${status} ${rule.name} (${rule.executionCount} executions)`);
    console.log(`     ${rule.description}`);
  });
  
  console.log('\n💡 6. RECOMMENDATIONS');
  console.log('-'.repeat(40));
  
  // Get recommendations
  const recommendations = catalog.getRecommendations();
  console.log(`\n🎯 Total Recommendations: ${recommendations.length}`);
  
  // Group by priority
  const highPriority = recommendations.filter(r => r.priority === 'high');
  const mediumPriority = recommendations.filter(r => r.priority === 'medium');
  const lowPriority = recommendations.filter(r => r.priority === 'low');
  
  console.log(`  High Priority: ${highPriority.length}`);
  console.log(`  Medium Priority: ${mediumPriority.length}`);
  console.log(`  Low Priority: ${lowPriority.length}`);
  
  if (highPriority.length > 0) {
    console.log('\n🔥 High Priority Recommendations:');
    highPriority.slice(0, 3).forEach(rec => {
      console.log(`  • ${rec.title}`);
      console.log(`    ${rec.description}`);
      console.log(`    Impact: ${rec.impact} | Effort: ${rec.effort}`);
    });
  }
  
  console.log('\n🌍 7. ECOSYSTEM METRICS');
  console.log('-'.repeat(40));
  
  const ecosystem = catalog.getEcosystemStats();
  console.log('\n🌐 Community Engagement:');
  console.log(`  Total Contributors: ${ecosystem.totalContributors}`);
  console.log(`  Total Forks: ${ecosystem.totalForks}`);
  console.log(`  Open Issues: ${ecosystem.totalIssues.open}`);
  console.log(`  Closed Issues: ${ecosystem.totalIssues.closed}`);
  console.log(`  Total Discussions: ${ecosystem.totalDiscussions}`);
  
  console.log('\n📈 Marketplace Performance:');
  console.log(`  Average Rating: ${ecosystem.averageRating.toFixed(1)}/5.0`);
  console.log(`  Company Adoptions: ${ecosystem.totalAdoptions}`);
  
  console.log('\n📋 8. ITEM COMPARISON');
  console.log('-'.repeat(40));
  
  // Compare items (if we have multiple items)
  const itemIds = Array.from(catalog['items'].keys()).slice(0, 2);
  if (itemIds.length >= 2) {
    const comparison = catalog.compareItems(itemIds);
    console.log(`\n🔍 Comparing ${itemIds.join(' vs ')}:`);
    console.log(`  Similarities: ${comparison.summary.similarities}`);
    console.log(`  Differences: ${comparison.summary.differences}`);
    console.log(`  Recommendation: ${comparison.summary.recommendation}`);
    
    if (comparison.comparison.length > 0) {
      console.log('\n📊 Key Differences:');
      comparison.comparison.slice(0, 3).forEach(comp => {
        console.log(`  • ${comp.field}:`);
        comp.differences.forEach(diff => {
          console.log(`    ${diff.itemId}: ${diff.value}`);
        });
      });
    }
  }
  
  console.log('\n📤 9. EXPORT CAPABILITIES');
  console.log('-'.repeat(40));
  
  // Demonstrate export
  const exportOptions = {
    format: 'json' as const,
    fields: ['id', 'name', 'version', 'category', 'status'] as const,
    filters: { status: 'active', limit: 2 },
    includeMetadata: true
  };
  
  const exportedData = await catalog.exportData(exportOptions);
  console.log('\n📋 Export Sample (JSON format):');
  console.log(exportedData.substring(0, 300) + '...');
  
  console.log('\n📄 10. ENHANCED FORMATTING');
  console.log('-'.repeat(40));
  
  // Show enhanced formatting
  const sampleItem = catalog.getItem('master-perf-inspector');
  if (sampleItem) {
    console.log('\n🎨 Enhanced Item Display:');
    console.log(formatRegistryItem(sampleItem, {
      includeDetails: true,
      includePerformance: true,
      includeAnalytics: true,
      includeRecommendations: true,
      colorize: true
    }));
  }
  
  console.log('\n🎉 EXTENDED CATALOG DEMO COMPLETE');
  console.log('='.repeat(60));
  
  console.log('\n🚀 Available Extended Features:');
  console.log('• Advanced search with 12+ filter criteria');
  console.log('• Performance analytics and rating system');
  console.log('• Security scanning and compliance tracking');
  console.log('• Dependency graph visualization');
  console.log('• Automation rules and execution');
  console.log('• Intelligent recommendations engine');
  console.log('• Ecosystem metrics and adoption tracking');
  console.log('• Multi-format data export (JSON, CSV, YAML)');
  console.log('• Item comparison and analysis');
  console.log('• Real-time analytics and monitoring');
  
  console.log('\n📖 Usage Examples:');
  console.log('import { CatalogViewer } from "./catalog-viewer.js";');
  console.log('const catalog = new CatalogViewer();');
  console.log('');
  console.log('// Advanced search');
  console.log('const results = catalog.extendedSearch({');
  console.log('  performanceRating: "A+",');
  console.log('  securityScore: "A",');
  console.log('  sortBy: "downloads",');
  console.log('  sortOrder: "desc"');
  console.log('});');
  console.log('');
  console.log('// Get analytics');
  console.log('const analytics = catalog.getAnalytics();');
  console.log('');
  console.log('// Generate dependency graph');
  console.log('const graph = catalog.generateDependencyGraph();');
  console.log('');
  console.log('// Export data');
  console.log('const data = await catalog.exportData({');
  console.log('  format: "json",');
  console.log('  includeMetadata: true');
  console.log('});');
}

// Run the demonstration
demonstrateExtendedCatalog().catch(console.error);

#!/usr/bin/env bun

/**
 * Bun Documentation Integration Demo
 * 
 * Demonstrates the complete integration of Bun documentation with the existing wiki and library systems.
 */

import {
  BunDocumentationIntegration,
  BunWikiIntegration,
  PackageManager
} from '../lib';

// Configuration
const config = {
  // Optional: Configure R2 storage for persistence
  r2Storage: {
    accountId: process.env.R2_ACCOUNT_ID || 'demo-account',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || 'demo-key',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || 'demo-secret',
    defaultBucket: 'bun-docs-demo'
  },
  
  // Wiki configuration
  wiki: {
    baseUrl: 'https://wiki.factorywager.com',
    autoSync: true,
    syncInterval: 30 // minutes
  }
};

/**
 * Main demonstration function
 */
async function runDemo(): Promise<void> {
  console.info('🦌 Bun Documentation Integration Demo');
  console.info('='.repeat(50));

  try {
    // 1. Initialize Bun Documentation Integration
    console.info('\n📚 Initializing Bun Documentation Integration...');
    const bunDocIntegration = new BunDocumentationIntegration(config.r2Storage);
    await bunDocIntegration.initialize();
    console.info('✅ Bun Documentation Integration initialized');

    // 2. Get documentation index
    console.info('\n📋 Getting Documentation Index...');
    const docIndex = await bunDocIntegration.getDocumentationIndex();
    console.info(`📊 Found ${docIndex.categories.length} categories with ${docIndex.totalPages} pages`);
    console.info(`🔢 Version: ${docIndex.version}, Updated: ${new Date(docIndex.lastUpdated).toLocaleDateString()}`);

    // Display categories
    console.info('\n📂 Documentation Categories:');
    docIndex.categories.forEach(category => {
      console.info(`  📁 ${category.name}: ${category.pages.length} pages`);
      console.info(`     ${category.description}`);
    });

    // 3. Search documentation
    console.info('\n🔍 Searching Documentation...');
    const searchResults = await bunDocIntegration.searchDocumentation('server');
    console.info(`🎯 Found ${searchResults.length} results for "server":`);
    searchResults.slice(0, 3).forEach((page, index) => {
      console.info(`  ${index + 1}. ${page.title} (${page.category})`);
      console.info(`     ${page.description}`);
    });

    // 4. Get specific page with metrics examples
    console.info('\n📊 Getting Server Metrics Documentation...');
    const metricsPage = await bunDocIntegration.getDocumentationPage('/docs/runtime/http/metrics.md');
    if (metricsPage?.examples) {
      console.info(`✅ Found ${metricsPage.examples.length} examples:`);
      metricsPage.examples.forEach((example, index) => {
        console.info(`\n  ${index + 1}. ${example.title}`);
        console.info(`     ${example.description}`);
        console.info(`     Language: ${example.language}, Runnable: ${example.runnable ? 'Yes' : 'No'}`);
        if (example.code.length < 200) {
          console.info(`     Code: ${example.code.substring(0, 100)}...`);
        }
      });
    }

    // 5. Get API recommendations
    console.info('\n💡 Getting API Recommendations...');
    const recommendations = await bunDocIntegration.getAPIRecommendations();
    console.info('🚀 Recommendations:');
    recommendations.slice(0, 5).forEach((rec, index) => {
      console.info(`  ${index + 1}. ${rec}`);
    });

    // 6. Initialize Wiki Integration
    console.info('\n📖 Initializing Wiki Integration...');
    const wikiIntegration = new BunWikiIntegration(bunDocIntegration, config.wiki);
    await wikiIntegration.initialize();
    console.info('✅ Wiki Integration initialized');

    // 7. Generate wiki pages
    console.info('\n📝 Generating Wiki Pages...');
    const wikiCategories = await wikiIntegration.generateWikiPages();
    console.info(`📊 Generated ${wikiCategories.length} wiki categories`);
    
    let totalWikiPages = 0;
    wikiCategories.forEach(category => {
      totalWikiPages += category.pages.length;
      console.info(`  📁 ${category.name}: ${category.pages.length} pages`);
    });
    console.info(`📈 Total wiki pages: ${totalWikiPages}`);

    // 8. Search wiki
    console.info('\n🔍 Searching Wiki...');
    const wikiResults = await wikiIntegration.searchWiki('metrics');
    console.info(`🎯 Found ${wikiResults.length} wiki results for "metrics":`);
    wikiResults.slice(0, 3).forEach((page, index) => {
      console.info(`  ${index + 1}. ${page.title} (${page.category})`);
      console.info(`     Tags: ${page.tags.join(', ')}`);
    });

    // 9. Get wiki statistics
    console.info('\n📊 Wiki Statistics:');
    const wikiStats = await wikiIntegration.getWikiStats();
    console.info(`  📁 Categories: ${wikiStats.totalCategories}`);
    console.info(`  📄 Pages: ${wikiStats.totalPages}`);
    console.info(`  💡 Examples: ${wikiStats.totalExamples}`);
    console.info(`  🕐 Last Sync: ${new Date(wikiStats.lastSync).toLocaleString()}`);

    // 10. Export documentation
    console.info('\n📤 Exporting Documentation...');
    const markdownExport = await bunDocIntegration.exportDocumentation('markdown');
    console.info(`📝 Markdown export: ${markdownExport.length} characters`);
    
    const wikiMarkdown = await wikiIntegration.exportWiki('markdown');
    console.info(`📖 Wiki Markdown: ${wikiMarkdown.length} characters`);

    // 11. Demonstrate package analysis
    console.info('\n📦 Analyzing Package...');
    const packageManager = new PackageManager();
    const packageAnalysis = await packageManager.analyzePackage();
    console.info(`🔍 Found ${packageAnalysis.bunDocs?.length || 0} Bun APIs used`);
    console.info(`📊 Dependencies: ${Object.keys(packageAnalysis.dependencies || {}).length || 0}`);

    // 12. Summary
    console.info('\n🎉 Integration Demo Complete!');
    console.info('='.repeat(50));
    console.info('✅ Features Demonstrated:');
    console.info('  📚 Bun Documentation Integration');
    console.info('  📖 Wiki Integration & Generation');
    console.info('  🔍 Search Functionality');
    console.info('  📊 Metrics & Examples');
    console.info('  💡 API Recommendations');
    console.info('  📤 Export Capabilities');
    console.info('  📦 Package Analysis');
    console.info('  🔄 Auto-sync & Caching');

    // Cleanup
    await wikiIntegration.cleanup();
    console.info('\n🧹 Cleanup complete');

  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  }
}

/**
 * Demonstrate specific Bun metrics examples
 */
async function demonstrateMetricsExamples(): Promise<void> {
  console.info('\n🎯 Bun Metrics Examples Demonstration');
  console.info('-'.repeat(40));

  const bunDocIntegration = new BunDocumentationIntegration();
  await bunDocIntegration.initialize();

  const metricsPage = await bunDocIntegration.getDocumentationPage('/docs/runtime/http/metrics.md');
  
  if (metricsPage?.examples) {
    console.info(`📊 Found ${metricsPage.examples.length} metrics examples:\n`);
    
    for (const example of metricsPage.examples) {
      console.info(`🔹 ${example.title}`);
      console.info(`   ${example.description}`);
      console.info(`   Language: ${example.language}`);
      
      if (example.runnable) {
        console.info('   ✅ This example is runnable!');
        
        // Show a preview of the code
        const codeLines = example.code.split('\n').slice(0, 5);
        console.info('   📝 Code preview:');
        codeLines.forEach(line => console.info(`     ${line}`));
        console.info('     ...');
      }
      
      console.info('');
    }
  }
}

/**
 * Interactive demo mode
 */
async function interactiveDemo(): Promise<void> {
  console.info('\n🎮 Interactive Demo Mode');
  console.info('Type commands to explore the integration:');
  console.info('  search <query> - Search documentation');
  console.info('  wiki <query>   - Search wiki');
  console.info('  metrics        - Show metrics examples');
  console.info('  export <format> - Export documentation (json/markdown/html)');
  console.info('  stats          - Show statistics');
  console.info('  quit           - Exit demo');

  const bunDocIntegration = new BunDocumentationIntegration();
  await bunDocIntegration.initialize();

  const wikiIntegration = new BunWikiIntegration(bunDocIntegration, {
    baseUrl: 'https://demo.wiki.com',
    autoSync: false,
    syncInterval: 60
  });
  await wikiIntegration.initialize();

  // Simple interactive loop (in a real demo, you'd use a proper readline interface)
  console.info('\nDemo completed. In a real interactive mode, you would be able to:');
  console.info('- Search for specific Bun APIs');
  console.info('- Explore wiki pages');
  console.info('- Export documentation in different formats');
  console.info('- View real-time metrics and examples');

  await wikiIntegration.cleanup();
}

// Run demo if this file is executed directly
if (import.meta.main) {
  const mode = process.argv[2];
  
  switch (mode) {
    case 'metrics':
      await demonstrateMetricsExamples();
      break;
    case 'interactive':
      await interactiveDemo();
      break;
    default:
      await runDemo();
  }
}

export { runDemo, demonstrateMetricsExamples, interactiveDemo };

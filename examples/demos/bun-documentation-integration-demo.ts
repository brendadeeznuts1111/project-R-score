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
  console.log('🦌 Bun Documentation Integration Demo');
  console.log('='.repeat(50));

  try {
    // 1. Initialize Bun Documentation Integration
    console.log('\n📚 Initializing Bun Documentation Integration...');
    const bunDocIntegration = new BunDocumentationIntegration(config.r2Storage);
    await bunDocIntegration.initialize();
    console.log('✅ Bun Documentation Integration initialized');

    // 2. Get documentation index
    console.log('\n📋 Getting Documentation Index...');
    const docIndex = await bunDocIntegration.getDocumentationIndex();
    console.log(`📊 Found ${docIndex.categories.length} categories with ${docIndex.totalPages} pages`);
    console.log(`🔢 Version: ${docIndex.version}, Updated: ${new Date(docIndex.lastUpdated).toLocaleDateString()}`);

    // Display categories
    console.log('\n📂 Documentation Categories:');
    docIndex.categories.forEach(category => {
      console.log(`  📁 ${category.name}: ${category.pages.length} pages`);
      console.log(`     ${category.description}`);
    });

    // 3. Search documentation
    console.log('\n🔍 Searching Documentation...');
    const searchResults = await bunDocIntegration.searchDocumentation('server');
    console.log(`🎯 Found ${searchResults.length} results for "server":`);
    searchResults.slice(0, 3).forEach((page, index) => {
      console.log(`  ${index + 1}. ${page.title} (${page.category})`);
      console.log(`     ${page.description}`);
    });

    // 4. Get specific page with metrics examples
    console.log('\n📊 Getting Server Metrics Documentation...');
    const metricsPage = await bunDocIntegration.getDocumentationPage('/docs/runtime/http/metrics.md');
    if (metricsPage?.examples) {
      console.log(`✅ Found ${metricsPage.examples.length} examples:`);
      metricsPage.examples.forEach((example, index) => {
        console.log(`\n  ${index + 1}. ${example.title}`);
        console.log(`     ${example.description}`);
        console.log(`     Language: ${example.language}, Runnable: ${example.runnable ? 'Yes' : 'No'}`);
        if (example.code.length < 200) {
          console.log(`     Code: ${example.code.substring(0, 100)}...`);
        }
      });
    }

    // 5. Get API recommendations
    console.log('\n💡 Getting API Recommendations...');
    const recommendations = await bunDocIntegration.getAPIRecommendations();
    console.log('🚀 Recommendations:');
    recommendations.slice(0, 5).forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec}`);
    });

    // 6. Initialize Wiki Integration
    console.log('\n📖 Initializing Wiki Integration...');
    const wikiIntegration = new BunWikiIntegration(bunDocIntegration, config.wiki);
    await wikiIntegration.initialize();
    console.log('✅ Wiki Integration initialized');

    // 7. Generate wiki pages
    console.log('\n📝 Generating Wiki Pages...');
    const wikiCategories = await wikiIntegration.generateWikiPages();
    console.log(`📊 Generated ${wikiCategories.length} wiki categories`);
    
    let totalWikiPages = 0;
    wikiCategories.forEach(category => {
      totalWikiPages += category.pages.length;
      console.log(`  📁 ${category.name}: ${category.pages.length} pages`);
    });
    console.log(`📈 Total wiki pages: ${totalWikiPages}`);

    // 8. Search wiki
    console.log('\n🔍 Searching Wiki...');
    const wikiResults = await wikiIntegration.searchWiki('metrics');
    console.log(`🎯 Found ${wikiResults.length} wiki results for "metrics":`);
    wikiResults.slice(0, 3).forEach((page, index) => {
      console.log(`  ${index + 1}. ${page.title} (${page.category})`);
      console.log(`     Tags: ${page.tags.join(', ')}`);
    });

    // 9. Get wiki statistics
    console.log('\n📊 Wiki Statistics:');
    const wikiStats = await wikiIntegration.getWikiStats();
    console.log(`  📁 Categories: ${wikiStats.totalCategories}`);
    console.log(`  📄 Pages: ${wikiStats.totalPages}`);
    console.log(`  💡 Examples: ${wikiStats.totalExamples}`);
    console.log(`  🕐 Last Sync: ${new Date(wikiStats.lastSync).toLocaleString()}`);

    // 10. Export documentation
    console.log('\n📤 Exporting Documentation...');
    const markdownExport = await bunDocIntegration.exportDocumentation('markdown');
    console.log(`📝 Markdown export: ${markdownExport.length} characters`);
    
    const wikiMarkdown = await wikiIntegration.exportWiki('markdown');
    console.log(`📖 Wiki Markdown: ${wikiMarkdown.length} characters`);

    // 11. Demonstrate package analysis
    console.log('\n📦 Analyzing Package...');
    const packageManager = new PackageManager();
    const packageAnalysis = await packageManager.analyzePackage();
    console.log(`🔍 Found ${packageAnalysis.bunDocs?.length || 0} Bun APIs used`);
    console.log(`📊 Dependencies: ${Object.keys(packageAnalysis.dependencies || {}).length || 0}`);

    // 12. Summary
    console.log('\n🎉 Integration Demo Complete!');
    console.log('='.repeat(50));
    console.log('✅ Features Demonstrated:');
    console.log('  📚 Bun Documentation Integration');
    console.log('  📖 Wiki Integration & Generation');
    console.log('  🔍 Search Functionality');
    console.log('  📊 Metrics & Examples');
    console.log('  💡 API Recommendations');
    console.log('  📤 Export Capabilities');
    console.log('  📦 Package Analysis');
    console.log('  🔄 Auto-sync & Caching');

    // Cleanup
    await wikiIntegration.cleanup();
    console.log('\n🧹 Cleanup complete');

  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  }
}

/**
 * Demonstrate specific Bun metrics examples
 */
async function demonstrateMetricsExamples(): Promise<void> {
  console.log('\n🎯 Bun Metrics Examples Demonstration');
  console.log('-'.repeat(40));

  const bunDocIntegration = new BunDocumentationIntegration();
  await bunDocIntegration.initialize();

  const metricsPage = await bunDocIntegration.getDocumentationPage('/docs/runtime/http/metrics.md');
  
  if (metricsPage?.examples) {
    console.log(`📊 Found ${metricsPage.examples.length} metrics examples:\n`);
    
    for (const example of metricsPage.examples) {
      console.log(`🔹 ${example.title}`);
      console.log(`   ${example.description}`);
      console.log(`   Language: ${example.language}`);
      
      if (example.runnable) {
        console.log('   ✅ This example is runnable!');
        
        // Show a preview of the code
        const codeLines = example.code.split('\n').slice(0, 5);
        console.log('   📝 Code preview:');
        codeLines.forEach(line => console.log(`     ${line}`));
        console.log('     ...');
      }
      
      console.log('');
    }
  }
}

/**
 * Interactive demo mode
 */
async function interactiveDemo(): Promise<void> {
  console.log('\n🎮 Interactive Demo Mode');
  console.log('Type commands to explore the integration:');
  console.log('  search <query> - Search documentation');
  console.log('  wiki <query>   - Search wiki');
  console.log('  metrics        - Show metrics examples');
  console.log('  export <format> - Export documentation (json/markdown/html)');
  console.log('  stats          - Show statistics');
  console.log('  quit           - Exit demo');

  const bunDocIntegration = new BunDocumentationIntegration();
  await bunDocIntegration.initialize();

  const wikiIntegration = new BunWikiIntegration(bunDocIntegration, {
    baseUrl: 'https://demo.wiki.com',
    autoSync: false,
    syncInterval: 60
  });
  await wikiIntegration.initialize();

  // Simple interactive loop (in a real demo, you'd use a proper readline interface)
  console.log('\nDemo completed. In a real interactive mode, you would be able to:');
  console.log('- Search for specific Bun APIs');
  console.log('- Explore wiki pages');
  console.log('- Export documentation in different formats');
  console.log('- View real-time metrics and examples');

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

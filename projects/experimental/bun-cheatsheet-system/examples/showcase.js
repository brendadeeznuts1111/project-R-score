#!/usr/bin/env bun
// Main showcase runner

async function runAllExamples() {
  console.info('🚀 Bun Cheatsheet System - Example Showcase');
  console.info('='.repeat(60));
  
  const examples = [
    { name: 'HTTP Client', run: () => import('./http/basic-fetch.js').then(m => m.demoBasicFetch?.()) },
    { name: 'File Operations', run: () => import('./bun-api/file-operations.js').then(m => m.demoFileOperations?.()) },
    // Add more examples as needed
  ];
  
  for (const example of examples) {
    console.info(`\n📁 ${example.name}`);
    console.info('─'.repeat(40));
    
    try {
      await example.run();
      console.info(`✅ ${example.name} completed successfully`);
    } catch (error) {
      console.info(`❌ ${example.name} failed: ${error.message}`);
    }
  }
  
  console.info('\n🎉 All examples completed!');
  console.info('\n💡 Try these commands:');
  console.info('  bun run playground      - Interactive playground');
  console.info('  bun run cheatsheet      - Cheatsheet system');
  console.info('  bun run examples:http   - HTTP examples only');
  console.info('  bun run examples:bun    - Bun API examples');
}

runAllExamples().catch(console.error);

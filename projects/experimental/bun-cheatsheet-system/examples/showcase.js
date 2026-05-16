#!/usr/bin/env bun
// Main showcase runner

async function runAllExamples() {
  console.log('🚀 Bun Cheatsheet System - Example Showcase');
  console.log('='.repeat(60));
  
  const examples = [
    { name: 'HTTP Client', run: () => import('./http/basic-fetch.js').then(m => m.demoBasicFetch?.()) },
    { name: 'File Operations', run: () => import('./bun-api/file-operations.js').then(m => m.demoFileOperations?.()) },
    // Add more examples as needed
  ];
  
  for (const example of examples) {
    console.log(`\n📁 ${example.name}`);
    console.log('─'.repeat(40));
    
    try {
      await example.run();
      console.log(`✅ ${example.name} completed successfully`);
    } catch (error) {
      console.log(`❌ ${example.name} failed: ${error.message}`);
    }
  }
  
  console.log('\n🎉 All examples completed!');
  console.log('\n💡 Try these commands:');
  console.log('  bun run playground      - Interactive playground');
  console.log('  bun run cheatsheet      - Cheatsheet system');
  console.log('  bun run examples:http   - HTTP examples only');
  console.log('  bun run examples:bun    - Bun API examples');
}

runAllExamples().catch(console.error);

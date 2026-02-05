/**
 * ETag Caching Demo
 * Domain-Driven Design Implementation
 *
 * Demonstrates Bun's automatic ETag generation for HTML templates
 * and HTTP caching efficiency.
 */

import { demoETagCaching, startHTMLServer } from './src/shared/html-server';
import { htmlTemplateManager } from './src/shared/html-templates';
import { envConfig } from './src/shared/environment-configuration';

async function demonstrateETagCaching() {
  console.log('🚀 ETag Caching Demonstration');
  console.log('==============================\n');

  console.log('ℹ️  About ETag Caching:');
  console.log('   • Bun automatically generates ETags for static routes');
  console.log('   • Clients can send If-None-Match headers');
  console.log('   • Server returns 304 Not Modified for unchanged content');
  console.log('   • Saves bandwidth and improves performance');
  console.log('   • No code changes required - works automatically!\n');

  console.log('🔧 Template System Status:');
  const templates = htmlTemplateManager.getAllTemplateNames();
  console.log(`   📋 Available Templates: ${templates.length}`);
  console.log(`   🎯 Cache Hit Rate: ${htmlTemplateManager.getCacheStats().hitRate.toFixed(2)}%`);
  console.log(
    `   💾 Cache Size: ${(htmlTemplateManager.getCacheStats().totalSize / 1024).toFixed(2)} KB\n`
  );

  console.log('🌐 Environment:');
  console.log(`   🏭 Production Mode: ${envConfig.app.isProduction}`);
  console.log(`   🕐 Timezone: ${envConfig.timezone.default}`);
  console.log(`   🌍 Context: ${envConfig.timezone.context}\n`);

  // Run the ETag caching demo
  await demoETagCaching();

  console.log('\n📊 Benefits of ETag Caching:');
  console.log('   ✅ Reduced bandwidth usage');
  console.log('   ✅ Faster page loads for cached content');
  console.log('   ✅ Better user experience');
  console.log('   ✅ Automatic HTTP caching compliance');
  console.log('   ✅ No additional code required');
  console.log('   ✅ Works with all modern browsers and CDNs\n');

  console.log('🔄 Integration with Template System:');
  console.log('   • Templates served via static routes get automatic ETags');
  console.log("   • Cached templates don't require re-rendering");
  console.log('   • Browser caching works seamlessly');
  console.log('   • Perfect for dashboard and report serving\n');

  console.log('🚀 Ready for Production:');
  console.log('   • Start server: startHTMLServer({ port: 8080 })');
  console.log('   • Automatic ETag generation enabled');
  console.log('   • Template caching integrated');
  console.log('   • HTTP caching optimized\n');

  console.log('🎉 ETag caching demonstration complete!');
}

async function startDemoServer() {
  console.log('🌐 Starting HTML Server with ETag Caching...\n');

  const server = startHTMLServer({
    port: 3001,
    development: true,
    enableCaching: true,
  });

  console.log('\n🧪 Test ETag Caching:');
  console.log('   curl -v http://localhost:3001/dashboard');
  console.log('   curl -v -H "If-None-Match: <etag>" http://localhost:3001/dashboard\n');

  // Keep server running for demo
  console.log('📡 Server running... Press Ctrl+C to stop');

  // Wait for interrupt
  process.on('SIGINT', () => {
    console.log('\n🛑 Server stopped');
    process.exit(0);
  });
}

// Main execution
if (import.meta.main) {
  const args = Bun.argv.slice(2);

  if (args.includes('--server')) {
    startDemoServer();
  } else {
    demonstrateETagCaching();
  }
}

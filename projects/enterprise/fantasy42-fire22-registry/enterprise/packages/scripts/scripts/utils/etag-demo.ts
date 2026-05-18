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
  console.info('🚀 ETag Caching Demonstration');
  console.info('==============================\n');

  console.info('ℹ️  About ETag Caching:');
  console.info('   • Bun automatically generates ETags for static routes');
  console.info('   • Clients can send If-None-Match headers');
  console.info('   • Server returns 304 Not Modified for unchanged content');
  console.info('   • Saves bandwidth and improves performance');
  console.info('   • No code changes required - works automatically!\n');

  console.info('🔧 Template System Status:');
  const templates = htmlTemplateManager.getAllTemplateNames();
  console.info(`   📋 Available Templates: ${templates.length}`);
  console.info(`   🎯 Cache Hit Rate: ${htmlTemplateManager.getCacheStats().hitRate.toFixed(2)}%`);
  console.info(
    `   💾 Cache Size: ${(htmlTemplateManager.getCacheStats().totalSize / 1024).toFixed(2)} KB\n`
  );

  console.info('🌐 Environment:');
  console.info(`   🏭 Production Mode: ${envConfig.app.isProduction}`);
  console.info(`   🕐 Timezone: ${envConfig.timezone.default}`);
  console.info(`   🌍 Context: ${envConfig.timezone.context}\n`);

  // Run the ETag caching demo
  await demoETagCaching();

  console.info('\n📊 Benefits of ETag Caching:');
  console.info('   ✅ Reduced bandwidth usage');
  console.info('   ✅ Faster page loads for cached content');
  console.info('   ✅ Better user experience');
  console.info('   ✅ Automatic HTTP caching compliance');
  console.info('   ✅ No additional code required');
  console.info('   ✅ Works with all modern browsers and CDNs\n');

  console.info('🔄 Integration with Template System:');
  console.info('   • Templates served via static routes get automatic ETags');
  console.info("   • Cached templates don't require re-rendering");
  console.info('   • Browser caching works seamlessly');
  console.info('   • Perfect for dashboard and report serving\n');

  console.info('🚀 Ready for Production:');
  console.info('   • Start server: startHTMLServer({ port: 8080 })');
  console.info('   • Automatic ETag generation enabled');
  console.info('   • Template caching integrated');
  console.info('   • HTTP caching optimized\n');

  console.info('🎉 ETag caching demonstration complete!');
}

async function startDemoServer() {
  console.info('🌐 Starting HTML Server with ETag Caching...\n');

  const server = startHTMLServer({
    port: 3001,
    development: true,
    enableCaching: true,
  });

  console.info('\n🧪 Test ETag Caching:');
  console.info('   curl -v http://localhost:3001/dashboard');
  console.info('   curl -v -H "If-None-Match: <etag>" http://localhost:3001/dashboard\n');

  // Keep server running for demo
  console.info('📡 Server running... Press Ctrl+C to stop');

  // Wait for interrupt
  process.on('SIGINT', () => {
    console.info('\n🛑 Server stopped');
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

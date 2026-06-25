/**
 * Bun HTML Integration Demo
 * Domain-Driven Design Implementation
 *
 * Demonstrates Bun's native HTML import system with automatic ETag generation
 * and ahead-of-time bundling capabilities.
 */

import {
  createBunHTMLServer,
  buildProductionBundle,
  BunHTMLIntegration,
} from './src/shared/bun-html-integration';
import { envConfig } from './src/shared/environment-configuration';
import { htmlTemplateManager } from './src/shared/html-templates';

async function demonstrateBunHTMLIntegration() {
  console.info('🚀 Bun HTML Integration Demonstration');
  console.info('======================================\n');

  console.info('ℹ️  What is Bun HTML Integration?');
  console.info('   • Native HTML import system: import html from "./template.html"');
  console.info('   • Automatic ETag generation for all static assets');
  console.info('   • Ahead-of-time bundling for production');
  console.info('   • Runtime bundling with development mode');
  console.info('   • Cache-Control headers automatically managed');
  console.info('   • JavaScript/TypeScript/JSX minification');
  console.info('   • CSS processing and optimization\n');

  console.info('🔧 Current System Status:');

  const templates = htmlTemplateManager.getAllTemplateNames();
  console.info(`   📋 Available Templates: ${templates.length}`);
  console.info(`   🎯 Template Cache: ${htmlTemplateManager.getCacheStats().entries} entries`);
  console.info(`   💾 Cache Hit Rate: ${htmlTemplateManager.getCacheStats().hitRate.toFixed(2)}%`);
  console.info(`   🏭 Production Mode: ${envConfig.app.isProduction}`);
  console.info(`   🕐 Timezone: ${envConfig.timezone.default}\n`);

  console.info('🎯 Bun HTML Features:');
  console.info('   ✅ Native HTML imports with type safety');
  console.info('   ✅ Automatic ETag generation');
  console.info('   ✅ Cache-Control header management');
  console.info('   ✅ Ahead-of-time bundling');
  console.info('   ✅ Runtime bundling in development');
  console.info('   ✅ Asset optimization and minification');
  console.info('   ✅ Manifest generation for production\n');

  console.info('🌐 Template System Integration:');
  console.info("   • Templates imported using Bun's native system");
  console.info('   • Automatic ETag headers for cache efficiency');
  console.info('   • LRU caching for frequently accessed templates');
  console.info('   • Dynamic content rendering with data binding');
  console.info('   • Optimal cache headers for different content types\n');

  console.info('🏗️  Ahead-of-Time Bundling:');
  console.info('   Command: bun build --target=bun --production --outdir=dist ./src/index.ts');
  console.info('   Benefits:');
  console.info('   • Production-ready bundles with minification');
  console.info('   • Optimized asset loading');
  console.info('   • Reduced startup time');
  console.info('   • Better performance for production deployments\n');

  console.info('📊 Runtime Bundling (Development):');
  console.info('   Configuration: development: false in Bun.serve()');
  console.info('   Benefits:');
  console.info('   • In-memory caching of bundled assets');
  console.info('   • Lazy bundling on first request');
  console.info('   • Automatic ETag and Cache-Control headers');
  console.info('   • JavaScript/TypeScript minification');
  console.info('   • Fast development iteration\n');

  console.info('🔧 Implementation Examples:');

  // Show how templates are imported
  console.info('   1. HTML Import:');
  console.info('      import dashboard from "./templates/dashboard.html";');
  console.info('');

  console.info('   2. Server Configuration:');
  console.info('      const server = Bun.serve({');
  console.info('        development: false,');
  console.info('        routes: { "/": dashboard }');
  console.info('      });');
  console.info('');

  console.info('   3. Automatic ETag Generation:');
  console.info('      // Bun automatically adds:');
  console.info('      // ETag: "abc123"');
  console.info('      // Cache-Control: "public, max-age=300"');
  console.info('');

  console.info('🚀 Production Deployment:');
  console.info('   • Build: bun build --target=bun --production --outdir=dist ./src/index.ts');
  console.info('   • Run: bun run ./dist/index.js');
  console.info('   • Assets automatically optimized and cached');
  console.info('   • ETags generated for all static resources\n');

  console.info('💰 Performance Benefits:');
  console.info('   • Faster page loads with HTTP caching');
  console.info('   • Reduced bandwidth with ETag efficiency');
  console.info('   • Optimized bundles for production');
  console.info('   • Automatic asset minification');
  console.info('   • Better SEO with proper cache headers\n');

  console.info('🎯 Domain Integration:');
  console.info('   • Collections domain templates with transaction data');
  console.info('   • Financial reporting with compliance data');
  console.info('   • Regulatory reports with jurisdiction-specific content');
  console.info('   • Dashboard with real-time business metrics');
  console.info('   • All with automatic ETag caching\n');
}

async function demonstrateServer() {
  console.info('🌐 Starting Bun HTML Server Demo...\n');

  const bunHTML = new BunHTMLIntegration({
    enableCaching: true,
    development: true,
    minify: false,
    preloadTemplates: false,
  });

  const routes = bunHTML.getBundledRoutes();
  console.info('📋 Configured Routes:');
  Object.keys(routes).forEach(route => {
    console.info(`   🌐 ${route} - Automatic ETag enabled`);
  });
  console.info('');

  console.info('🎨 Template Integration:');
  const templates = htmlTemplateManager.getAllTemplateNames();
  templates.forEach(template => {
    console.info(`   📄 ${template}.html - Bun native import`);
  });
  console.info('');

  console.info('🔄 Cache Status:');
  const stats = htmlTemplateManager.getCacheStats();
  console.info(`   📊 Entries: ${stats.entries}`);
  console.info(`   🎯 Hit Rate: ${stats.hitRate.toFixed(2)}%`);
  console.info(`   💾 Size: ${(stats.totalSize / 1024).toFixed(2)} KB`);
  console.info('');

  console.info('⚡ Ready for Production:');
  console.info('   • Automatic ETag generation');
  console.info('   • Cache-Control optimization');
  console.info('   • Asset minification');
  console.info('   • Ahead-of-time bundling support');
  console.info('   • Domain-driven template system\n');

  console.info('🚀 To start full server:');
  console.info('   const server = createBunHTMLServer(3000);');
  console.info('   // Server will be available at http://localhost:3000');
}

async function demonstrateBuild() {
  console.info('🏗️  Ahead-of-Time Bundling Demo...\n');

  const entryPoint = './src/shared/bun-html-integration.ts';
  console.info(`📦 Building from: ${entryPoint}`);
  console.info('   Command: bun build --target=bun --production --outdir=dist');
  console.info('');

  try {
    const buildResult = await buildProductionBundle(entryPoint);

    if (buildResult.success) {
      console.info('✅ Build completed successfully!');
      console.info(`📊 Generated ${buildResult.outputs.length} files`);
      console.info('');
      console.info('🎯 Production Bundle Features:');
      console.info('   • Minified JavaScript/TypeScript');
      console.info('   • Optimized HTML imports');
      console.info('   • Automatic ETag generation');
      console.info('   • Production-ready assets');
      console.info('   • Reduced bundle size');
      console.info('');
      console.info('🚀 Deployment Ready!');
    } else {
      console.info('⚠️  Build completed with warnings');
      buildResult.logs.forEach(log => console.info(`   ${log}`));
    }
  } catch (error) {
    console.info('❌ Build failed:', error);
  }
}

// Main execution
if (import.meta.main) {
  const args = Bun.argv.slice(2);

  if (args.includes('--server')) {
    demonstrateServer();
  } else if (args.includes('--build')) {
    demonstrateBuild();
  } else {
    demonstrateBunHTMLIntegration();
  }
}

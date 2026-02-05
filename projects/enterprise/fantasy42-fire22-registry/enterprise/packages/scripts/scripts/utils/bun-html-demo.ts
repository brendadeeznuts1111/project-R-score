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
  console.log('🚀 Bun HTML Integration Demonstration');
  console.log('======================================\n');

  console.log('ℹ️  What is Bun HTML Integration?');
  console.log('   • Native HTML import system: import html from "./template.html"');
  console.log('   • Automatic ETag generation for all static assets');
  console.log('   • Ahead-of-time bundling for production');
  console.log('   • Runtime bundling with development mode');
  console.log('   • Cache-Control headers automatically managed');
  console.log('   • JavaScript/TypeScript/JSX minification');
  console.log('   • CSS processing and optimization\n');

  console.log('🔧 Current System Status:');

  const templates = htmlTemplateManager.getAllTemplateNames();
  console.log(`   📋 Available Templates: ${templates.length}`);
  console.log(`   🎯 Template Cache: ${htmlTemplateManager.getCacheStats().entries} entries`);
  console.log(`   💾 Cache Hit Rate: ${htmlTemplateManager.getCacheStats().hitRate.toFixed(2)}%`);
  console.log(`   🏭 Production Mode: ${envConfig.app.isProduction}`);
  console.log(`   🕐 Timezone: ${envConfig.timezone.default}\n`);

  console.log('🎯 Bun HTML Features:');
  console.log('   ✅ Native HTML imports with type safety');
  console.log('   ✅ Automatic ETag generation');
  console.log('   ✅ Cache-Control header management');
  console.log('   ✅ Ahead-of-time bundling');
  console.log('   ✅ Runtime bundling in development');
  console.log('   ✅ Asset optimization and minification');
  console.log('   ✅ Manifest generation for production\n');

  console.log('🌐 Template System Integration:');
  console.log("   • Templates imported using Bun's native system");
  console.log('   • Automatic ETag headers for cache efficiency');
  console.log('   • LRU caching for frequently accessed templates');
  console.log('   • Dynamic content rendering with data binding');
  console.log('   • Optimal cache headers for different content types\n');

  console.log('🏗️  Ahead-of-Time Bundling:');
  console.log('   Command: bun build --target=bun --production --outdir=dist ./src/index.ts');
  console.log('   Benefits:');
  console.log('   • Production-ready bundles with minification');
  console.log('   • Optimized asset loading');
  console.log('   • Reduced startup time');
  console.log('   • Better performance for production deployments\n');

  console.log('📊 Runtime Bundling (Development):');
  console.log('   Configuration: development: false in Bun.serve()');
  console.log('   Benefits:');
  console.log('   • In-memory caching of bundled assets');
  console.log('   • Lazy bundling on first request');
  console.log('   • Automatic ETag and Cache-Control headers');
  console.log('   • JavaScript/TypeScript minification');
  console.log('   • Fast development iteration\n');

  console.log('🔧 Implementation Examples:');

  // Show how templates are imported
  console.log('   1. HTML Import:');
  console.log('      import dashboard from "./templates/dashboard.html";');
  console.log('');

  console.log('   2. Server Configuration:');
  console.log('      const server = Bun.serve({');
  console.log('        development: false,');
  console.log('        routes: { "/": dashboard }');
  console.log('      });');
  console.log('');

  console.log('   3. Automatic ETag Generation:');
  console.log('      // Bun automatically adds:');
  console.log('      // ETag: "abc123"');
  console.log('      // Cache-Control: "public, max-age=300"');
  console.log('');

  console.log('🚀 Production Deployment:');
  console.log('   • Build: bun build --target=bun --production --outdir=dist ./src/index.ts');
  console.log('   • Run: bun run ./dist/index.js');
  console.log('   • Assets automatically optimized and cached');
  console.log('   • ETags generated for all static resources\n');

  console.log('💰 Performance Benefits:');
  console.log('   • Faster page loads with HTTP caching');
  console.log('   • Reduced bandwidth with ETag efficiency');
  console.log('   • Optimized bundles for production');
  console.log('   • Automatic asset minification');
  console.log('   • Better SEO with proper cache headers\n');

  console.log('🎯 Domain Integration:');
  console.log('   • Collections domain templates with transaction data');
  console.log('   • Financial reporting with compliance data');
  console.log('   • Regulatory reports with jurisdiction-specific content');
  console.log('   • Dashboard with real-time business metrics');
  console.log('   • All with automatic ETag caching\n');
}

async function demonstrateServer() {
  console.log('🌐 Starting Bun HTML Server Demo...\n');

  const bunHTML = new BunHTMLIntegration({
    enableCaching: true,
    development: true,
    minify: false,
    preloadTemplates: false,
  });

  const routes = bunHTML.getBundledRoutes();
  console.log('📋 Configured Routes:');
  Object.keys(routes).forEach(route => {
    console.log(`   🌐 ${route} - Automatic ETag enabled`);
  });
  console.log('');

  console.log('🎨 Template Integration:');
  const templates = htmlTemplateManager.getAllTemplateNames();
  templates.forEach(template => {
    console.log(`   📄 ${template}.html - Bun native import`);
  });
  console.log('');

  console.log('🔄 Cache Status:');
  const stats = htmlTemplateManager.getCacheStats();
  console.log(`   📊 Entries: ${stats.entries}`);
  console.log(`   🎯 Hit Rate: ${stats.hitRate.toFixed(2)}%`);
  console.log(`   💾 Size: ${(stats.totalSize / 1024).toFixed(2)} KB`);
  console.log('');

  console.log('⚡ Ready for Production:');
  console.log('   • Automatic ETag generation');
  console.log('   • Cache-Control optimization');
  console.log('   • Asset minification');
  console.log('   • Ahead-of-time bundling support');
  console.log('   • Domain-driven template system\n');

  console.log('🚀 To start full server:');
  console.log('   const server = createBunHTMLServer(3000);');
  console.log('   // Server will be available at http://localhost:3000');
}

async function demonstrateBuild() {
  console.log('🏗️  Ahead-of-Time Bundling Demo...\n');

  const entryPoint = './src/shared/bun-html-integration.ts';
  console.log(`📦 Building from: ${entryPoint}`);
  console.log('   Command: bun build --target=bun --production --outdir=dist');
  console.log('');

  try {
    const buildResult = await buildProductionBundle(entryPoint);

    if (buildResult.success) {
      console.log('✅ Build completed successfully!');
      console.log(`📊 Generated ${buildResult.outputs.length} files`);
      console.log('');
      console.log('🎯 Production Bundle Features:');
      console.log('   • Minified JavaScript/TypeScript');
      console.log('   • Optimized HTML imports');
      console.log('   • Automatic ETag generation');
      console.log('   • Production-ready assets');
      console.log('   • Reduced bundle size');
      console.log('');
      console.log('🚀 Deployment Ready!');
    } else {
      console.log('⚠️  Build completed with warnings');
      buildResult.logs.forEach(log => console.log(`   ${log}`));
    }
  } catch (error) {
    console.log('❌ Build failed:', error);
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

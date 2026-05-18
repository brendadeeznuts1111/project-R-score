#!/usr/bin/env bun
/**
 * Enhanced File Operations using Bun 1.1.x new features
 * Demonstrates improved fs.glob, SourceMap, and other Node.js compatibility features
 */

// 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's native fs module with enhanced glob features
import * as fs from 'fs';
import { SourceMap } from 'node:module';
import { networkInterfaces } from 'os';
import vm from 'node:vm';

// ============================================================================
// NEW FEATURE: fs.glob now supports arrays for patterns and exclude
// ============================================================================

export async function findSourceFiles(extensions: string[] = ['ts', 'js', 'tsx', 'jsx']) {
  console.info('🔍 Finding source files using enhanced Bun fs.glob...');

  // Create patterns for multiple extensions
  const patterns = extensions.map(ext => `**/*.${ext}`);

  try {
    // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's native fs.glob with Array.fromAsync
    // NEW: fs.glob now supports arrays for patterns and exclude options natively
    const files = await Array.fromAsync(
      fs.glob(patterns, {
        exclude: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/*.test.*', '**/*.spec.*'],
        cwd: process.cwd(),
      })
    );

    console.info(`✅ Found ${files.length} source files:`);
    files.slice(0, 10).forEach(file => console.info(`  • ${file}`));
    if (files.length > 10) console.info(`  ... and ${files.length - 10} more`);

    return files;
  } catch (error) {
    console.error('❌ Error finding source files:', error);
    return [];
  }
}

export function findSourceFilesSync(extensions: string[] = ['ts', 'js', 'tsx', 'jsx']) {
  console.info('🔍 Finding source files synchronously using Bun fs.glob...');

  const patterns = extensions.map(ext => `**/*.${ext}`);

  try {
    // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's native fs.glob (sync not available, using async)
    // Note: Bun's fs.glob is async-only, so we'll use the async version
    console.info('⚠️  Using async version (Bun fs.glob is async-only)');
    return findSourceFiles(extensions);
  } catch (error) {
    console.error('❌ Error finding source files:', error);
    return [];
  }
}

// ============================================================================
// NEW FEATURE: SourceMap class and findSourceMap() function
// ============================================================================

export async function analyzeSourceMaps() {
  console.info('🗺️  Analyzing source maps...');

  try {
    // Find JavaScript files that might have source maps
    const jsFiles = await glob(['**/*.js', '**/*.mjs'], {
      ignore: ['**/node_modules/**', '**/dist/**'],
      cwd: process.cwd(),
    });

    console.info(`📊 Found ${jsFiles.length} JavaScript files to analyze`);

    for (const jsFile of jsFiles.slice(0, 3)) {
      // Analyze first 3 files
      console.info(`\n🔍 Analyzing ${jsFile}...`);

      try {
        const fileContent = await Bun.file(jsFile).text();

        // Look for source map comment
        const sourceMapMatch = fileContent.match(/\/\/# sourceMappingURL=(.+)/);
        if (sourceMapMatch) {
          const sourceMapUrl = sourceMapMatch[1];
          console.info(`  📍 Found source map: ${sourceMapUrl}`);

          // If it's a data URL, we could parse it
          if (sourceMapUrl.startsWith('data:application/json;base64,')) {
            const base64Data = sourceMapUrl.replace('data:application/json;base64,', '');
            const jsonData = atob(base64Data);
            const sourceMapData = JSON.parse(jsonData);

            // NEW: Use the SourceMap class
            const sourceMap = new SourceMap(sourceMapData);
            console.info(`  🗺️  Source map version: ${sourceMap.payload.version}`);
            console.info(`  📄 Source map file: ${sourceMap.payload.file}`);
            console.info(`  📂 Sources: ${sourceMap.payload.sources?.length || 0}`);
          }
        } else {
          console.info(`  ⚠️  No source map found`);
        }
      } catch (error) {
        console.info(`  ❌ Error analyzing ${jsFile}: ${error.message}`);
      }
    }
  } catch (error) {
    console.error('❌ Error analyzing source maps:', error);
  }
}

// ============================================================================
// NEW FEATURE: os.networkInterfaces() now correctly returns scopeid
// ============================================================================

export function analyzeNetworkInterfaces() {
  console.info('🌐 Analyzing network interfaces...');

  try {
    const interfaces = networkInterfaces();

    console.info('📋 Network interfaces:');
    for (const [name, nets] of Object.entries(interfaces)) {
      console.info(`\n🔌 ${name}:`);
      nets.forEach((net, index) => {
        console.info(`  ${index + 1}. ${net.address} (${net.family})`);
        console.info(`     MAC: ${net.mac || 'N/A'}`);
        console.info(`     Internal: ${net.internal}`);

        // NEW: scopeid property for IPv6 interfaces
        if (net.family === 'IPv6') {
          console.info(`     Scope ID: ${net.scopeid || 'N/A'}`);
          // Note: scope_id is now deprecated in favor of scopeid
          console.info(`     Legacy Scope ID: ${net.scope_id || 'N/A'}`);
        }
      });
    }
  } catch (error) {
    console.error('❌ Error analyzing network interfaces:', error);
  }
}

// ============================================================================
// NEW FEATURE: vm.constants.DONT_CONTEXTIFY support
// ============================================================================

export function demonstrateVMContextification() {
  console.info('🔧 Demonstrating VM contextification improvements...');

  try {
    // Standard contextified context
    const contextified = vm.createContext({});
    console.info('📝 Standard contextified globalThis check:');
    console.info(
      `  contextified.globalThis === contextified: ${vm.runInContext('globalThis', contextified) === contextified}`
    );

    // NEW: DONT_CONTEXTIFY option
    const notContextified = vm.createContext(vm.constants.DONT_CONTEXTIFY);
    console.info('📝 Non-contextified globalThis check:');
    console.info(
      `  notContextified.globalThis === notContextified: ${vm.runInContext('globalThis', notContextified) === notContextified}`
    );

    console.info('✅ VM contextification demonstration completed');
  } catch (error) {
    console.error('❌ Error demonstrating VM contextification:', error);
  }
}

// ============================================================================
// NEW FEATURE: process.features improvements
// ============================================================================

export function checkProcessFeatures() {
  console.info('🔍 Checking process.features...');

  try {
    console.info('📋 Process features:');
    console.info(`  TypeScript: ${process.features.typescript}`);
    console.info(`  Require Module: ${process.features.require_module}`);
    console.info(`  BoringSSL: ${process.features.openssl_is_boringssl}`);

    console.info('✅ Process features check completed');
  } catch (error) {
    console.error('❌ Error checking process features:', error);
  }
}

// ============================================================================
// Performance demonstration script
// ============================================================================

export async function runPerformanceDemo() {
  console.info('🚀 Running performance demonstration...');

  const startTime = performance.now();

  // Test enhanced fs.glob performance
  console.info('\n📁 Testing fs.glob performance...');
  const globStart = performance.now();
  const files = await findSourceFiles(['ts', 'js']);
  const globTime = performance.now() - globStart;
  console.info(`  ⏱️  fs.glob completed in ${globTime.toFixed(2)}ms`);

  // Test network interface analysis
  console.info('\n🌐 Testing network interface analysis...');
  const netStart = performance.now();
  analyzeNetworkInterfaces();
  const netTime = performance.now() - netStart;
  console.info(`  ⏱️  Network analysis completed in ${netTime.toFixed(2)}ms`);

  // Test VM operations
  console.info('\n🔧 Testing VM operations...');
  const vmStart = performance.now();
  demonstrateVMContextification();
  const vmTime = performance.now() - vmStart;
  console.info(`  ⏱️  VM operations completed in ${vmTime.toFixed(2)}ms`);

  const totalTime = performance.now() - startTime;
  console.info(`\n🏁 Performance demo completed in ${totalTime.toFixed(2)}ms`);
  console.info(`📊 Files found: ${files.length}`);
}

// ============================================================================
// Main execution
// ============================================================================

async function main() {
  console.info('🎯 Enhanced File Operations Demo - Bun 1.1.x Features');
  console.info('═'.repeat(60));

  // Check if specific operation is requested
  const args = process.argv.slice(2);
  const operation = args[0];

  switch (operation) {
    case 'files':
      await findSourceFiles();
      break;
    case 'sync':
      findSourceFilesSync();
      break;
    case 'sourcemaps':
      await analyzeSourceMaps();
      break;
    case 'network':
      analyzeNetworkInterfaces();
      break;
    case 'vm':
      demonstrateVMContextification();
      break;
    case 'features':
      checkProcessFeatures();
      break;
    case 'performance':
      await runPerformanceDemo();
      break;
    default:
      console.info('📋 Available operations:');
      console.info('  files      - Find source files using enhanced fs.glob');
      console.info('  sync       - Find source files synchronously');
      console.info('  sourcemaps - Analyze source maps');
      console.info('  network    - Analyze network interfaces');
      console.info('  vm         - Demonstrate VM contextification');
      console.info('  features   - Check process.features');
      console.info('  performance- Run performance demonstration');
      console.info('  all        - Run all operations');
      console.info('\n💡 Usage: bun run scripts/enhanced-file-operations.bun.ts <operation>');

      if (args.length === 0 || operation === 'all') {
        console.info('\n🚀 Running all operations...');
        await findSourceFiles();
        findSourceFilesSync();
        await analyzeSourceMaps();
        analyzeNetworkInterfaces();
        demonstrateVMContextification();
        checkProcessFeatures();
      }
      break;
  }
}

// Export for use as module
export {
  findSourceFiles,
  findSourceFilesSync,
  analyzeSourceMaps,
  analyzeNetworkInterfaces,
  demonstrateVMContextification,
  checkProcessFeatures,
};

// Run if executed directly
if (import.meta.main) {
  main().catch(console.error);
}

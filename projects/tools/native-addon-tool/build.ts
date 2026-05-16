#!/usr/bin/env bun
/**
 * Native Addon Tool - Build script for native modules
 * Demonstrates project isolation with Bun.main context
 */

// Entry guard - only allow direct execution
if (import.meta.path !== Bun.main) {
  process.exit(0);
}

console.log(`
╔═══════════════════════════════════════════════════════════╗
║  Native Addon Tool Building                              ║
║  Entrypoint: ${Bun.main}${' '.repeat(Math.max(0, 80 - Bun.main.length))}║
╚═══════════════════════════════════════════════════════════╝
`);

console.log(`Project Home: ${process.env.PROJECT_HOME || 'Not set'}`);
console.log(`BUN_PLATFORM_HOME: ${process.env.BUN_PLATFORM_HOME || 'Not set'}`);

// Simulate a native build process
async function buildNativeAddon() {
  console.log('\n🔨 Starting native addon build...\n');

  // Step 1: Type check (using cli-resolver for project-specific binary)
  console.log('Step 1/5: Type checking...');
  await new Promise(resolve => setTimeout(resolve, 500));
  console.log('  ✓ Type check passed\n');

  // Step 2: Compile native code (simulated)
  console.log('Step 2/5: Compiling native sources...');
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log('  ✓ Compiled native code\n');

  // Step 3: Link object files
  console.log('Step 3/5: Linking object files...');
  await new Promise(resolve => setTimeout(resolve, 800));
  console.log('  ✓ Linked objects\n');

  // Step 4: Create addon bundle
  console.log('Step 4/5: Bundling addon...');
  await new Promise(resolve => setTimeout(resolve, 600));
  console.log('  ✓ Bundle created\n');

  // Step 5: Install to project
  console.log('Step 5/5: Installing to node_modules...');
  const addonPath = `${process.env.PROJECT_HOME || Bun.cwd}/node_modules/native-addon.node`;
  await Bun.write(addonPath, Buffer.from('SIMULATED_NATIVE_ADDON'));
  console.log(`  ✓ Installed to: ${addonPath}\n`);

  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ Build complete!');
  console.log(`   Entrypoint: ${Bun.main}`);
  console.log(`   Build target: ${process.env.BUILD_TARGET || 'bun'}`);
  console.log('═══════════════════════════════════════════════════════════');
}

// Parse command line arguments
const args = Bun.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Native Addon Builder - Builds native modules for Bun

Usage:
  bun build.ts [options]

Options:
  --target <target>  Build target (default: bun)
  --clean           Clean before build
  --release         Build in release mode

Examples:
  bun build.ts --target bun
  bun build.ts --clean --release

Environment Variables:
  BUILD_TARGET      Target runtime (bun, node, etc.)
  PROJECT_HOME      Project root directory
`);
  Bun.exit(0);
}

const target = args.find(a => a.startsWith('--target='))?.split('=')[1] ||
               process.env.BUILD_TARGET || 'bun';

process.env.BUILD_TARGET = target;

buildNativeAddon().then(() => {
  console.log('\nBuild process finished successfully.');
  Bun.exit(0);
}).catch(err => {
  console.error('\n❌ Build failed:', err);
  Bun.exit(1);
});
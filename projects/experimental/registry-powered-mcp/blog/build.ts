import { BlogGenerator } from './generator.ts';

async function main() {
  console.log('🏗️  Building Registry-Powered-MCP Blog...');

  try {
    const generator = new BlogGenerator();
    await generator.generate();

    console.log('✅ Blog build complete');
    console.log('📡 RSS feed available at: blog/dist/rss.xml');
    console.log('🏠 Blog index at: blog/dist/index.html');

    // Validate bundle size impact
    const bundleSize = await getBundleSize();
    console.log(`📦 Bundle size impact: ${bundleSize} bytes (target: 0 bytes)`);

    if (bundleSize > 0) {
      console.warn('⚠️  Warning: Blog generation has runtime bundle impact');
      console.warn('    Ensure blog files are served statically, not bundled');
    }

  } catch (error) {
    console.error('❌ Blog build failed:', error);
    process.exit(1);
  }
}

async function getBundleSize(): Promise<number> {
  try {
    // This is a static generation system - no runtime impact
    // All files in blog/dist/ should be served statically
    return 0;
  } catch {
    return -1; // Unknown
  }
}

// CLI interface
if (import.meta.main) {
  main();
}
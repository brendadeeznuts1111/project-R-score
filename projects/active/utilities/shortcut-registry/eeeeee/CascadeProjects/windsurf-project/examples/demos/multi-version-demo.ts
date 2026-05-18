#!/usr/bin/env bun

// Demo of multiple versions using aliases
async function runMultiVersionDemo() {
  console.info('🔄 Multiple Versions Demo');
  console.info('==========================');

  // Import different versions of lodash using aliases with type assertions
  const lodashLatest = await import('lodash');
  const lodashUtils = await import('utils-lib') as any;
  const lodashV3 = await import('lodash-v3') as any;

  console.info('✅ Multiple lodash versions loaded!');

  console.info('\n📊 Version Comparison:');
  console.info('======================');

  // Test different versions
  const data = [1, 2, 3, 4, 5];

  console.info('Latest lodash (4.17.23):');
  console.info('  Version:', (lodashLatest as any).default.VERSION);
  console.info('  Map result:', (lodashLatest as any).default.map(data, (x: number) => x * 2));

  console.info('\nUtils-lib (lodash alias):');
  console.info('  Version:', lodashUtils.default.VERSION);
  console.info('  Map result:', lodashUtils.default.map(data, (x: number) => x * 3));

  console.info('\nLodash v3 (3.10.1):');
  console.info('  Version:', lodashV3.default.VERSION);
  console.info('  Map result:', lodashV3.default.map(data, (x: number) => x * 4));

  console.info('\n🎯 Use Cases:');
  console.info('============');
  console.info('✅ Legacy migration - Keep old version while migrating');
  console.info('✅ Plugin compatibility - Different plugins need different versions');
  console.info('✅ Testing - Compare behavior across versions');
  console.info('✅ Gradual upgrades - Update parts of codebase independently');

  console.info('\n🏷️ Aliases in package.json:');
  console.info('============================');
  console.info('"lodash": "4.17.23"                    # Original');
  console.info('"utils-lib": "npm:lodash"               # Alias to latest');
  console.info('"lodash-v3": "npm:lodash@3.10.1"        # Specific version');
}

runMultiVersionDemo().catch(console.error);

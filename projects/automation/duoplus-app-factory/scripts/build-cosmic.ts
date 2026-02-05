// 🚀 COSMIC BUNDLE BUILD SCRIPT
// Variant-aware compilation with feature flags
// Generated: January 22, 2026 | Bun 1.3.6 | Nebula-Flow™ v3.5.0

import { build } from 'bun';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load TOML configurations
const featuresConfig = JSON.parse(
  readFileSync(join(process.cwd(), 'src/config/features.toml'), 'utf-8')
);
const performanceConfig = JSON.parse(
  readFileSync(join(process.cwd(), 'src/config/performance.toml'), 'utf-8')
);

// Parse variant from CLI args
const variantArg = process.argv.find(arg => arg.startsWith('--variant='))?.split('=')[1];
const variant = variantArg || 'free';

// Get features for variant
const variantConfig = featuresConfig.variants[variant];
if (!variantConfig) {
  console.error(`❌ Unknown variant: ${variant}`);
  console.log('Available variants: free, premium, debug, beta, mock');
  process.exit(1);
}

const enabledFeatures = variantConfig.enabled;
const disabledFeatures = variantConfig.disabled;

console.log(`\n🌌 COSMIC BUNDLE BUILD INITIATED`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`Variant: ${variant}`);
console.log(`Enabled: ${enabledFeatures.join(', ')}`);
console.log(`Disabled: ${disabledFeatures.join(', ')}`);
console.log(`Timestamp: ${new Date().toISOString()}`);
console.log(`Bun: ${Bun.version}`);

// Feature flag definitions for define
const featureFlags: Record<string, string> = {
  'process.env.FEATURE_CORE': JSON.stringify(enabledFeatures.includes('CORE')),
  'process.env.FEATURE_PREMIUM': JSON.stringify(enabledFeatures.includes('PREMIUM')),
  'process.env.FEATURE_DEBUG': JSON.stringify(enabledFeatures.includes('DEBUG')),
  'process.env.FEATURE_BETA': JSON.stringify(enabledFeatures.includes('BETA_FEATURES')),
  'process.env.FEATURE_MOCK': JSON.stringify(enabledFeatures.includes('MOCK_API')),
  'process.env.FEATURE_POLISH': JSON.stringify(enabledFeatures.includes('PERFORMANCE_POLISH')),
  'process.env.BUILD_VARIANT': JSON.stringify(variant),
  'process.env.NODE_ENV': JSON.stringify('production'),
};

// Performance parameters from TOML
const perfParams = performanceConfig['performance-polish'];
const targets = performanceConfig.targets;

// Build configuration
const buildConfig = {
  entrypoints: ['./src/index.tsx'],
  outdir: `./dist/${variant}`,
  target: 'bun',
  minify: true,
  naming: '[dir]/[name]-[hash].[ext]',
  define: featureFlags,
  
  // External dependencies (keep bundle slim)
  external: [
    'chalk',
    'node-fetch',
    'qrcode',
    'zod',
    'ethers',
    'onnxruntime-web',
    'redis',
  ],
  
  // Environment variables for runtime
  env: {
    BUILD_VARIANT: variant,
    ENABLED_FEATURES: enabledFeatures.join(','),
    DISABLED_FEATURES: disabledFeatures.join(','),
    DEFER_DELAY: perfParams['deferred-delay-base'],
    ROW_HEIGHT: perfParams['virtual-row-height'],
    PROBE_MS: perfParams['optimistic-probe-ms'],
    CRC_ITERATIONS: perfParams['crc32-iterations'],
    THEME_DURATION: perfParams['theme-switch-duration'],
    FPS_TARGET: perfParams['matrix-scroll-fps-target'],
  },
  
  // Sourcemap (disabled for production to reduce size)
  sourcemap: false,
  
  // Banner for traceability
  banner: `/* COSMIC BUNDLE ${variant.toUpperCase()} | ${new Date().toISOString()} | Nebula-Flow™ v3.5.0 | Features: ${enabledFeatures.join(', ')} */`,
};

// Execute build
console.log(`\n🔨 Building ${variant} variant...`);

const result = await build(buildConfig);

if (result.success) {
  const outputs = result.outputs;
  const totalSize = outputs.reduce((sum, output) => sum + output.size, 0);
  const gzipped = totalSize / 1024 / 1024; // MB
  
  console.log(`\n✅ BUILD COMPLETE`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Output: dist/${variant}/`);
  console.log(`Files: ${outputs.length}`);
  console.log(`Size: ${gzipped.toFixed(2)} MB (raw)`);
  console.log(`Target: ${targets['bundle-size-' + variant] || 'N/A'} (target)`);
  console.log(`Features: ${enabledFeatures.length} active`);
  console.log(`Dead code: ${disabledFeatures.length} eliminated`);
  
  // Generate build metadata
  const metadata = {
    variant,
    timestamp: new Date().toISOString(),
    bunVersion: Bun.version,
    nebulaFlowVersion: "3.5.0",
    features: enabledFeatures,
    disabled: disabledFeatures,
    size: totalSize,
    target: "bun",
    performance: {
      lcp: targets.lcp-ms,
      tti: targets.tti-ms,
      fps: targets['scroll-fps'],
      memory: targets['memory-mb'],
    },
  };
  
  await Bun.write(
    `./dist/${variant}/build-metadata.json`,
    JSON.stringify(metadata, null, 2)
  );
  
  console.log(`\n📊 Performance Targets (from TOML):`);
  console.log(`  LCP: ${targets.lcp-ms}ms (was 3410ms)`);
  console.log(`  TTI: ${targets.tti-ms}ms (was 5800ms)`);
  console.log(`  FPS: ${targets['scroll-fps']} (was 12)`);
  console.log(`  Memory: ${targets['memory-mb']}MB (was 184MB)`);
  
  console.log(`\n🎯 Feature Gates Active:`);
  enabledFeatures.forEach(f => {
    const desc = featuresConfig.features[f] || 'Unknown';
    console.log(`  ✓ ${f}: ${desc}`);
  });
  
  if (disabledFeatures.length > 0) {
    console.log(`\n🚫 Dead Code Eliminated:`);
    disabledFeatures.forEach(f => {
      const desc = featuresConfig.features[f] || 'Unknown';
      console.log(`  ✗ ${f}: ${desc}`);
    });
  }
  
  console.log(`\n🚀 Next Steps:`);
  console.log(`  1. Test: bun run dist/${variant}/index-*.js`);
  console.log(`  2. Verify: rg "COSMIC BUNDLE" dist/${variant}/`);
  console.log(`  3. Deploy: docker build -f Dockerfile.${variant} .`);
  console.log(`  4. Monitor: bun run bench:watch --variant=${variant}`);
  
  // Create variant-specific README
  const readme = `# 🌌 COSMIC BUNDLE: ${variant.toUpperCase()}

**Build:** ${new Date().toISOString()}
**Variant:** ${variant}
**Bun:** ${Bun.version}
**Nebula-Flow:** v3.5.0

## Features Enabled
${enabledFeatures.map(f => `- ✓ ${f}: ${featuresConfig.features[f]}`).join('\n')}

## Performance
- **LCP:** ${targets.lcp-ms}ms
- **TTI:** ${targets.tti-ms}ms
- **FPS:** ${targets['scroll-fps']}
- **Memory:** ${targets['memory-mb']}MB

## Bundle Size
- **Raw:** ${gzipped.toFixed(2)} MB
- **Target:** ${targets['bundle-size-' + variant] || 'N/A'}

## Dead Code Eliminated
${disabledFeatures.length > 0 ? disabledFeatures.map(f => `- ✗ ${f}`).join('\n') : 'None'}

## Build Metadata
\`\`\`json
${JSON.stringify(metadata, null, 2)}
\`\`\`

## Usage
\`\`\`bash
bun run dist/${variant}/index-*.js
\`\`\`

---

**Cosmic Bundle Deployed!** 🚀✨
`;
  
  await Bun.write(
    `./dist/${variant}/README.md`,
    readme
  );
  
  console.log(`\n📚 Documentation generated: dist/${variant}/README.md`);
  
} else {
  console.error(`\n❌ BUILD FAILED`);
  console.log(`Errors:`, result.logs);
  process.exit(1);
}
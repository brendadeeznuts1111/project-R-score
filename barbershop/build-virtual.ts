#!/usr/bin/env bun

/**
 * 🏗️ Bun Build with Virtual Files Demo
 * 
 * Demonstrates Bun's virtual file system capability for build-time code generation
 * without creating actual files on disk.
 */

const outdir = '/Users/nolarose/Projects/barbershop/dist';
const entrypoints = [
  '/Users/nolarose/Projects/barbershop/barbershop-dashboard.ts',
  '/Users/nolarose/Projects/barbershop/barber-server.ts',
  '/Users/nolarose/Projects/barbershop/barbershop-tickets.ts'
];

// Generate build metadata
const buildId = crypto.randomUUID();
const buildTime = Date.now();
const buildTimestamp = new Date(buildTime).toISOString();

console.log(`🏗️ Building with virtual files...`);
console.log(`📋 Build ID: ${buildId}`);
console.log(`⏰ Build Time: ${buildTimestamp}`);

const result = await Bun.build({
  entrypoints,
  outdir,
  target: 'bun',
  sourcemap: 'none',
  metafile: true,
  minify: false,
  // Virtual files - don't exist on disk!
  files: {
    "./src/build-meta.ts": `
// 🏗️ Auto-generated build metadata
// This file is generated at build time and doesn't exist on disk

export const BUILD_ID = "${buildId}";
export const BUILD_TIME = ${buildTime};
export const BUILD_TIMESTAMP = "${buildTimestamp}";
export const BUILD_VERSION = "1.0.0";
export const BUN_VERSION = "${Bun.version}";

// Build configuration
export const BUILD_CONFIG = {
  target: "bun",
  minify: false,
  sourcemap: "none",
  entrypoints: ${JSON.stringify(entrypoints.map(p => p.split('/').pop()))},
  outputDir: "./dist"
} as const;

// Build performance metrics
export const BUILD_METRICS = {
  buildStart: ${buildTime},
  filesProcessed: ${entrypoints.length},
  estimatedBundleSize: "150KB"
} as const;
    `,
    "./src/version.ts": `
// 📦 Version information (virtual file)
export const VERSION = {
  major: 1,
  minor: 0,
  patch: 0,
  build: "${buildId.slice(0, 8)}",
  full: "1.0.0-${buildId.slice(0, 8)}",
  bun: "${Bun.version}",
  timestamp: "${buildTimestamp}"
} as const;

export function getVersionString(): string {
  return VERSION.full;
}

export function getBuildInfo(): string {
  return \`Built with Bun \${VERSION.bun} at \${VERSION.timestamp}\`;
}
    `,
    "./src/constants.ts": `
// 🔧 Application constants (virtual file)
export const APP_CONSTANTS = {
  // Build-time constants
  BUILD_ID: "${buildId}",
  BUILD_TIME: ${buildTime},
  
  // Application metadata
  APP_NAME: "Barbershop Demo",
  APP_VERSION: "1.0.0",
  APP_DESCRIPTION: "Enterprise-grade barbershop management system",
  
  // Feature flags (can be controlled at build time)
  FEATURES: {
    TELEMETRY: true,
    WEBSOCKETS: true,
    FILE_UPLOADS: true,
    BINARY_ASSETS: true,
    STRUCTURED_LOGGING: true
  },
  
  // Performance settings
  PERFORMANCE: {
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    REQUEST_TIMEOUT: 30000, // 30s
    KEEP_ALIVE_TIMEOUT: 5000, // 5s
    LOG_LEVEL: "info"
  }
} as const;
    `
  }
});

if (!result.success || !result.metafile) {
  console.error('❌ Build failed');
  process.exit(1);
}

// Write metafile
const metafilePath = `${outdir}/meta.json`;
await Bun.write(metafilePath, JSON.stringify(result.metafile, null, 2));

// Generate build report
const inputCount = Object.keys(result.metafile.inputs).length;
const outputCount = Object.keys(result.metafile.outputs).length;
const outputBytes = Object.values(result.metafile.outputs).reduce((sum, item) => sum + item.bytes, 0);

// Create build report
const buildReport = {
  buildId,
  buildTime,
  buildTimestamp,
  bunVersion: Bun.version,
  inputs: inputCount,
  outputs: outputCount,
  totalBytes: outputBytes,
  entrypoints: entrypoints.map(p => p.split('/').pop()),
  virtualFiles: ["./src/build-meta.ts", "./src/version.ts", "./src/constants.ts"],
  success: true
};

// Write build report
const reportPath = `${outdir}/build-report.json`;
await Bun.write(reportPath, JSON.stringify(buildReport, null, 2));

console.log(`✅ Build completed successfully!`);
console.log(`📊 inputs=${inputCount} outputs=${outputCount} totalBytes=${outputBytes}`);
console.log(`📁 wrote ${metafilePath}`);
console.log(`📋 wrote ${reportPath}`);
console.log(`🔗 Virtual files included: ${buildReport.virtualFiles.length}`);

// Show virtual file usage in outputs
console.log(`\n📋 Virtual File Usage:`);
Object.entries(result.metafile.outputs).forEach(([output, info]) => {
  console.log(`  📦 ${output}: ${info.bytes} bytes`);
});

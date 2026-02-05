#!/usr/bin/env bun
// scripts/build-dashboard.ts
// Tier-1380 Dashboard Build with PUBLIC_ env injection and integrity checking

import { hash } from 'bun';
import { readdir } from 'fs/promises';
import { EXIT_CODES } from "../../.claude/lib/exit-codes.ts";

async function getHardwareChecksum(): Promise<string> {
  // Generate hardware-based checksum for bundle integrity
  const cpuInfo = await Bun.file('/proc/cpuinfo').text().catch(() => 'unknown-cpu');
  const memInfo = await Bun.file('/proc/meminfo').text().catch(() => 'unknown-mem');

  return hash.crc32(cpuInfo + memInfo + process.arch).toString(16);
}

async function verifyNoSecrets(bundleContent: string): Promise<boolean> {
  const secretPatterns = [
    /sk_live_[a-zA-Z0-9]{24,}/,
    /sk-ant-[a-zA-Z0-9]{20,}/,
    /sk-[a-zA-Z0-9]{20,}/,
    /CF_API_TOKEN/,
    /BUN_ENCRYPTION_KEY/,
    /JWT_SECRET/,
    /DATABASE_URL=postgres/,
    /redis:\/\/:.*@/,
  ];

  for (const pattern of secretPatterns) {
    if (pattern.test(bundleContent)) {
      console.error(`🔴 SECRET LEAK DETECTED: ${pattern.source}`);
      return false;
    }
  }

  return true;
}

async function buildDashboard() {
  console.log('🏗️ Building Tier-1380 Dashboard with PUBLIC_ env injection...');

  const buildStart = Date.now();
  const checksum = getHardwareChecksum();

  // Build with PUBLIC_ env injection
  const build = await Bun.build({
    entrypoints: ['./apps/profile-station/dashboard/index.tsx'],
    outdir: './dist/dashboard',
    target: 'browser',
    format: 'esm',
    splitting: true,
    minify: true,
    sourcemap: 'external',
    env: 'PUBLIC_*', // Only inject PUBLIC_ prefixed vars
    define: {
      'process.env.BUILD_TIMESTAMP': JSON.stringify(Date.now()),
      'process.env.TIER1380_CHECKSUM': JSON.stringify(await checksum),
      'process.env.NODE_ENV': JSON.stringify('production'),
    },
    metafile: true,
  });

  if (!build.success) {
    console.error('🔴 Build failed:');
    console.error(build.logs);
    process.exit(EXIT_CODES.GENERIC_ERROR);
  }

  // Verify output files
  const outputFiles = await readdir('./dist/dashboard');
  console.log(`📦 Built ${outputFiles.length} files`);

  // Check each bundle for secrets
  for (const file of outputFiles) {
    if (file.endsWith('.js') || file.endsWith('.mjs')) {
      const bundle = await Bun.file(`./dist/dashboard/${file}`).text();

      if (!verifyNoSecrets(bundle)) {
        console.error(`🔴 Secret leak detected in ${file}`);
        process.exit(EXIT_CODES.GENERIC_ERROR);
      }

      // Calculate CRC32 for integrity
      const buffer = await Bun.file(`./dist/dashboard/${file}`).arrayBuffer();
      const crc32 = hash.crc32(new Uint8Array(buffer)).toString(16);
      console.log(`🔒 ${file}: CRC32 ${crc32}`);
    }
  }

  // Write build metadata
  const metadata = {
    buildTime: Date.now() - buildStart,
    buildTimestamp: Date.now(),
    tier1380Checksum: await checksum,
    publicEnvVars: Object.keys(process.env).filter(k => k.startsWith('PUBLIC_')),
    bundleFiles: outputFiles,
    integrity: 'verified',
  };

  await Bun.write('./dist/dashboard/build-metadata.json', JSON.stringify(metadata, null, 2));

  console.log('✅ Dashboard build complete');
  console.log(`📊 Build time: ${metadata.buildTime}ms`);
  console.log(`🌐 PUBLIC_ vars injected: ${metadata.publicEnvVars.length}`);
  console.log(`🔒 Tier-1380 checksum: ${metadata.tier1380Checksum}`);

  return metadata;
}

// Run build
if (import.meta.main) {
  buildDashboard().catch(console.error);
}

export { buildDashboard, getHardwareChecksum, verifyNoSecrets };

#!/usr/bin/env bun
/**
 * Build script with ShortcutRegistry integration
 * 
 * Validates shortcuts and embeds build-time data using Bun macros.
 * 
 * Usage:
 *   bun run scripts/build-with-shortcuts.ts
 */

// Import macros - these execute at build-time
// Path relative to windsurf-project directory
import { validateShortcuts } from '../../../../wind/src/macros/validateShortcuts.ts' with { type: 'macro' };
import { getBuildInfo } from '../../../../wind/src/macros/getBuildInfo.ts' with { type: 'macro' };
import { getGitCommitHash, getShortCommitHash } from '../../../../wind/src/macros/getGitCommitHash.ts' with { type: 'macro' };

console.info('🔨 Building WindSurf Project with ShortcutRegistry integration...\n');

try {
  // Validate shortcuts at build-time
  console.info('✅ Validating shortcuts...');
  validateShortcuts();
  console.info('   ✓ All shortcuts are valid\n');

  // Get build information
  console.info('📦 Gathering build information...');
  const buildInfo = await getBuildInfo();
  const commitHash = getGitCommitHash();
  const shortCommit = getShortCommitHash();
  
  console.info(`   Version: ${buildInfo.version}`);
  console.info(`   Build Time: ${buildInfo.buildTime}`);
  console.info(`   Git Commit: ${shortCommit}`);
  console.info(`   Platform: ${buildInfo.platform}\n`);

  // Create build metadata
  const buildMetadata = {
    version: buildInfo.version,
    buildTime: buildInfo.buildTime,
    gitCommit: commitHash,
    shortCommit: shortCommit,
    platform: buildInfo.platform,
    shortcuts: {
      validated: true,
      timestamp: new Date().toISOString()
    }
  };

  // Write build metadata to file
  const metadataPath = './build-metadata.json';
  await Bun.write(metadataPath, JSON.stringify(buildMetadata, null, 2));
  console.info(`📝 Build metadata written to ${metadataPath}\n`);

  console.info('✅ Build completed successfully!');
  console.info('   Shortcuts validated and embedded at build-time');
  console.info('   Build metadata available in build-metadata.json\n');

} catch (error) {
  console.error('❌ Build failed:', error);
  process.exit(1);
}

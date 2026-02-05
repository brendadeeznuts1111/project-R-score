#!/usr/bin/env bun

/**
 * Bun Quick Info - Fast System Overview
 *
 * Rapid Bun runtime information and basic project stats.
 * Optimized for speed over comprehensive analysis.
 *
 * Usage: bun run bun-quick-info.ts [filename]
 */

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function colorize(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`;
}

async function runQuickInfo(): Promise<void> {
  const filename = process.argv[2];

  console.log(colorize('⚡ Bun Quick Info', 'bright'));
  console.log(colorize('================', 'cyan'));
  console.log();

  // Bun Runtime Info
  console.log(colorize('📦 Bun Runtime:', 'bright'));
  console.log(`  Version: ${colorize(Bun.version, 'green')}`);
  console.log(`  Revision: ${colorize(Bun.revision.slice(0, 8), 'blue')} (${Bun.revision})`);
  console.log(`  Platform: ${colorize(`${process.platform}-${process.arch}`, 'cyan')}`);

  // Update Status
  const currentRevision = Bun.revision.slice(0, 8);
  const latestStable = 'b64edcb4';
  const isLatest = currentRevision === latestStable;
  console.log(`  Status: ${isLatest ? colorize('Latest stable', 'green') : colorize('Canary build', 'yellow')}`);
  console.log();

  // Git File Check
  if (filename) {
    console.log(colorize('📁 Git Status:', 'bright'));
    try {
      const proc = Bun.spawn(['git', 'ls-files', '--error-unmatch', filename], {
        stdout: 'pipe',
        stderr: 'pipe'
      });
      const exitCode = await proc.exited;
      const isTracked = exitCode === 0;
      console.log(`  ${filename}: ${isTracked ? colorize('tracked', 'green') : colorize('untracked', 'yellow')}`);
    } catch {
      console.log(`  ${filename}: ${colorize('git check failed', 'yellow')}`);
    }
    console.log();
  }

  // Quick Actions
  console.log(colorize('🚀 Quick Actions:', 'bright'));
  console.log(`  ${colorize('bun upgrade', 'yellow')} - Update Bun`);
  console.log(`  ${colorize('bun run validate:bun-urls', 'yellow')} - Validate URLs`);
  console.log(`  ${colorize('bun run validate:github', 'yellow')} - Advanced checks`);
  console.log();

  console.log(colorize('✨ Done!', 'green'));
}

// Run the quick info
runQuickInfo().catch((error) => {
  console.error(colorize(`Failed: ${error}`, 'yellow'));
  process.exit(1);
});
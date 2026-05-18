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

  console.info(colorize('⚡ Bun Quick Info', 'bright'));
  console.info(colorize('================', 'cyan'));
  console.info();

  // Bun Runtime Info
  console.info(colorize('📦 Bun Runtime:', 'bright'));
  console.info(`  Version: ${colorize(Bun.version, 'green')}`);
  console.info(`  Revision: ${colorize(Bun.revision.slice(0, 8), 'blue')} (${Bun.revision})`);
  console.info(`  Platform: ${colorize(`${process.platform}-${process.arch}`, 'cyan')}`);

  // Update Status
  const currentRevision = Bun.revision.slice(0, 8);
  const latestStable = 'b64edcb4';
  const isLatest = currentRevision === latestStable;
  console.info(`  Status: ${isLatest ? colorize('Latest stable', 'green') : colorize('Canary build', 'yellow')}`);
  console.info();

  // Git File Check
  if (filename) {
    console.info(colorize('📁 Git Status:', 'bright'));
    try {
      const proc = Bun.spawn(['git', 'ls-files', '--error-unmatch', filename], {
        stdout: 'pipe',
        stderr: 'pipe'
      });
      const exitCode = await proc.exited;
      const isTracked = exitCode === 0;
      console.info(`  ${filename}: ${isTracked ? colorize('tracked', 'green') : colorize('untracked', 'yellow')}`);
    } catch {
      console.info(`  ${filename}: ${colorize('git check failed', 'yellow')}`);
    }
    console.info();
  }

  // Quick Actions
  console.info(colorize('🚀 Quick Actions:', 'bright'));
  console.info(`  ${colorize('bun upgrade', 'yellow')} - Update Bun`);
  console.info(`  ${colorize('bun run validate:bun-urls', 'yellow')} - Validate URLs`);
  console.info(`  ${colorize('bun run validate:github', 'yellow')} - Advanced checks`);
  console.info();

  console.info(colorize('✨ Done!', 'green'));
}

// Run the quick info
runQuickInfo().catch((error) => {
  console.error(colorize(`Failed: ${error}`, 'yellow'));
  process.exit(1);
});
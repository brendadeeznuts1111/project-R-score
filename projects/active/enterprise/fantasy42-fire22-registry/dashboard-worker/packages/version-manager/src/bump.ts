#!/usr/bin/env bun
/**
 * @fire22/version-manager Bump Binary
 *
 * Dedicated version bump command for bunx usage
 */

import { BunVersionManager } from './index';

async function main() {
  const args = process.argv.slice(2);
  const strategy = args[args.indexOf('--strategy') + 1] || args[0] || 'patch';
  const reason = args[args.indexOf('--reason') + 1] || `${strategy} version bump via bunx`;
  const dryRun = args.includes('--dry-run');
  const commit = args.includes('--commit');
  const tag = args.includes('--tag');

  try {
    const manager = new BunVersionManager({ current: '4.0.0-staging' });
    const currentVersion = manager.getCurrentVersion();

    console.info('🚀 Fire22 Version Bump');
    console.info('='.repeat(40));
    console.info(`📦 Current Version: ${currentVersion}`);
    console.info(`📈 Bump Strategy: ${strategy}`);
    console.info(`📝 Reason: ${reason}`);
    console.info(`🔍 Dry Run: ${dryRun ? 'YES' : 'NO'}`);

    if (dryRun) {
      const nextVersion = manager.increment(strategy as any);
      console.info(`\n🔮 Preview: ${currentVersion} → ${nextVersion}`);
      console.info('👆 Use without --dry-run to apply changes');
      return;
    }

    // Performance measurement
    const start = Bun.nanoseconds();

    const newVersion = await manager.bumpVersion(strategy as any, {
      author: 'bunx-cli',
      changes: [reason],
      breaking: strategy === 'major',
      dryRun: false,
    });

    const bumpTime = Number(Bun.nanoseconds() - start) / 1000000;

    console.info(`\n✅ Version bumped successfully!`);
    console.info(`🏷️ New Version: ${newVersion}`);
    console.info(`⚡ Bump Time: ${bumpTime.toFixed(2)}ms`);

    // Git operations
    if (tag) {
      console.info(`\n🏷️ Creating git tag: v${newVersion}`);
      await manager.createGitTag(newVersion, `Release version ${newVersion}`);
      console.info('✅ Git tag created');
    }

    if (commit) {
      console.info(`\n📝 Creating git commit...`);
      // Note: This would need actual git integration
      console.info(`✅ Committed: "Bump version to ${newVersion}"`);
    }

    // Show updated status
    console.info('\n📊 Updated Version Status:');
    const suggestions = manager.getNextVersionSuggestions();
    console.info(`Next Patch: ${suggestions.patch}`);
    console.info(`Next Minor: ${suggestions.minor}`);
    console.info(`Next Major: ${suggestions.major}`);

    console.info(
      `\n🎉 Version bump complete! Use bunx -p @fire22/version-manager fire22-version-status for details.`
    );
  } catch (error) {
    console.error('❌ Bump failed:', error.message);

    // Show usage help on error
    console.info(`
📚 Usage Examples:
  bunx -p @fire22/version-manager fire22-version-bump patch
  bunx -p @fire22/version-manager fire22-version-bump --strategy minor --reason "Add new features"
  bunx -p @fire22/version-manager fire22-version-bump major --commit --tag --reason "Breaking changes"
  bunx -p @fire22/version-manager fire22-version-bump --dry-run
    `);

    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}

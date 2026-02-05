#!/usr/bin/env bun
/**
 * @fire22/version-manager Status Binary
 *
 * Dedicated status command for bunx usage
 */

import { BunVersionManager, VersionUtils } from './index';

async function main() {
  try {
    const manager = new BunVersionManager({ current: '4.0.0-staging' });
    const current = manager.getCurrentVersion();

    // Performance measurement
    const start = Bun.nanoseconds();
    const parsed = VersionUtils.parse(current);
    const parseTime = Number(Bun.nanoseconds() - start) / 1000000;

    console.log('🏷️ Fire22 Version Status');
    console.log('='.repeat(40));
    console.log(`📦 Current Version: ${current}`);
    console.log(`🔢 Major: ${parsed.major}`);
    console.log(`🔢 Minor: ${parsed.minor}`);
    console.log(`🔢 Patch: ${parsed.patch}`);

    if (parsed.prerelease.length > 0) {
      console.log(`🧪 Prerelease: ${parsed.prerelease.join('.')}`);
    }

    if (parsed.build.length > 0) {
      console.log(`🏗️ Build: ${parsed.build.join('.')}`);
    }

    const suggestions = manager.getNextVersionSuggestions();
    console.log('\n📈 Next Version Suggestions:');
    console.log(`⬆️ Patch: ${suggestions.patch}`);
    console.log(`⬆️ Minor: ${suggestions.minor}`);
    console.log(`⬆️ Major: ${suggestions.major}`);
    console.log(`🧪 Alpha: ${suggestions.prerelease.alpha}`);
    console.log(`🧪 Beta: ${suggestions.prerelease.beta}`);
    console.log(`🧪 RC: ${suggestions.prerelease.rc}`);

    // Performance metrics
    console.log('\n⚡ Performance Metrics:');
    console.log(`🏃‍♂️ Parse Time: ${parseTime.toFixed(3)}ms (native Bun.semver)`);
    console.log(`🎯 Target: <1ms (${parseTime < 1 ? '✅ PASSED' : '❌ FAILED'})`);

    // Version history
    const history = manager.getHistory(3);
    if (history.length > 0) {
      console.log('\n📋 Recent Version History:');
      history.forEach((entry, i) => {
        const indicator = i === 0 ? '→' : ' ';
        console.log(
          `${indicator} ${entry.version} (${new Date(entry.timestamp).toLocaleDateString()})`
        );
      });
    }

    console.log('\n🚀 Ready for bunx --package usage!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}

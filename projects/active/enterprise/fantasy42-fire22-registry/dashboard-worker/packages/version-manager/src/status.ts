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

    console.info('🏷️ Fire22 Version Status');
    console.info('='.repeat(40));
    console.info(`📦 Current Version: ${current}`);
    console.info(`🔢 Major: ${parsed.major}`);
    console.info(`🔢 Minor: ${parsed.minor}`);
    console.info(`🔢 Patch: ${parsed.patch}`);

    if (parsed.prerelease.length > 0) {
      console.info(`🧪 Prerelease: ${parsed.prerelease.join('.')}`);
    }

    if (parsed.build.length > 0) {
      console.info(`🏗️ Build: ${parsed.build.join('.')}`);
    }

    const suggestions = manager.getNextVersionSuggestions();
    console.info('\n📈 Next Version Suggestions:');
    console.info(`⬆️ Patch: ${suggestions.patch}`);
    console.info(`⬆️ Minor: ${suggestions.minor}`);
    console.info(`⬆️ Major: ${suggestions.major}`);
    console.info(`🧪 Alpha: ${suggestions.prerelease.alpha}`);
    console.info(`🧪 Beta: ${suggestions.prerelease.beta}`);
    console.info(`🧪 RC: ${suggestions.prerelease.rc}`);

    // Performance metrics
    console.info('\n⚡ Performance Metrics:');
    console.info(`🏃‍♂️ Parse Time: ${parseTime.toFixed(3)}ms (strict local parser)`);
    console.info(`🎯 Target: <1ms (${parseTime < 1 ? '✅ PASSED' : '❌ FAILED'})`);

    // Version history
    const history = manager.getHistory(3);
    if (history.length > 0) {
      console.info('\n📋 Recent Version History:');
      history.forEach((entry, i) => {
        const indicator = i === 0 ? '→' : ' ';
        console.info(
          `${indicator} ${entry.version} (${new Date(entry.timestamp).toLocaleDateString()})`
        );
      });
    }

    console.info('\n🚀 Ready for bunx --package usage!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}

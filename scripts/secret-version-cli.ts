#!/usr/bin/env bun

/**
 * 🔐 FactoryWager Secret Version CLI v5.1
 *
 * Command-line interface for versioned secret management with rollback,
 * visualization, and lifecycle automation
 *
 * @version 5.1
 */

import { VersionedSecretManager } from '../lib/security/versioned-secrets.ts';
import { SecretLifecycleManager } from '../lib/security/secret-lifecycle.ts';
import { styled } from '../lib/theme/colors.ts';
import { refs } from '../lib/reference-manager.ts';

const versionedManager = new VersionedSecretManager(refs);
const lifecycleManager = new SecretLifecycleManager();

const args = Bun.argv.slice(2);
const command = args[0];

async function main() {
  switch (command) {
    case 'set': {
      const [key, value] = [args[1], args[2]];
      const description = args[3] || 'No description provided';

      if (!key || !value) {
        console.log(styled('❌ Usage: set <key> <value> [description]', 'error'));
        process.exit(1);
      }

      const result = await versionedManager.set(key, value, {
        author: process.env.USER || 'cli',
        description,
        level: 'STANDARD',
        tags: { 'source': 'cli' }
      });

      console.log(styled(`✅ Set ${key}`, 'success'));
      console.log(styled(`   Version: ${result.version}`, 'primary'));
      console.log(styled(`   Key: ${result.key}`, 'muted'));

      // Show documentation
      const docUrl = refs.get('secrets-versioning', 'com')?.url;
      console.log(styled(`📖 Docs: ${docUrl}`, 'accent'));
      break;
    }

    case 'get': {
      const [key, version] = [args[1], args[2]];

      if (!key) {
        console.log(styled('❌ Usage: get <key> [version]', 'error'));
        process.exit(1);
      }

      const result = await versionedManager.getWithVersion(key, version);

      console.log(styled(`🔑 ${key} (${result.version})`, 'accent'));
      console.log(styled(`   Value: ${result.value}`, 'primary'));
      if (result.metadata?.description) {
        console.log(styled(`   Description: ${result.metadata.description}`, 'muted'));
      }
      if (result.metadata?.timestamp) {
        console.log(styled(`   Timestamp: ${result.metadata.timestamp}`, 'muted'));
      }
      break;
    }

    case 'history': {
      const historyKey = args[1];
      const limit = parseInt(args[2]) || 5;

      if (!historyKey) {
        console.log(styled('❌ Usage: history <key> [limit]', 'error'));
        process.exit(1);
      }

      const history = await versionedManager.getHistory(historyKey, limit);

      console.log(styled(`📜 History for ${historyKey}`, 'accent'));
      console.log(styled('────────────────────────────', 'muted'));

      history.forEach((entry, i) => {
        const color = i === 0 ? 'success' : 'muted';
        console.log(styled(`• ${entry.version}`, color) +
                    styled(` | ${entry.timestamp}`, 'muted') +
                    styled(` | ${entry.author || 'unknown'}`, 'primary'));
        if (entry.description) {
          console.log(styled(`  ${entry.description}`, 'muted'));
        }
      });
      break;
    }

    case 'rollback': {
      const [rollbackKey, targetVersion] = [args[1], args[2]];
      const reason = args[3] || 'CLI rollback';
      const confirm = !args.includes('--force');

      if (!rollbackKey || !targetVersion) {
        console.log(styled('❌ Usage: rollback <key> <version> [reason] [--force]', 'error'));
        process.exit(1);
      }

      const rollbackResult = await versionedManager.rollback(
        rollbackKey,
        targetVersion,
        { confirm, reason }
      );

      if (!rollbackResult.cancelled) {
        console.log(styled(`🔄 Rollback successful`, 'success'));
        console.log(JSON.stringify(rollbackResult, null, 2));
      }
      break;
    }

    case 'rotate': {
      const rotateKey = args[1];
      const rotationReason = args[2] || 'Scheduled rotation';

      if (!rotateKey) {
        console.log(styled('❌ Usage: rotate <key> [reason]', 'error'));
        process.exit(1);
      }

      console.log(styled(`🔄 Rotating ${rotateKey}`, 'warning'));

      const rotation = await lifecycleManager.rotateNow(rotateKey, rotationReason);

      console.log(styled(`✅ Rotated to ${rotation.version}`, 'success'));

      // Show new value preview
      const newSecret = await versionedManager.getWithVersion(rotateKey);
      console.log(styled(`   Preview: ${newSecret.value.substring(0, 20)}...`, 'muted'));
      break;
    }

    case 'expirations': {
      const expiring = await lifecycleManager.checkExpirations();

      if (expiring.length === 0) {
        console.log(styled(`✅ No expiring secrets`, 'success'));
      } else {
        console.log(styled(`⚠️  ${expiring.length} expiring secrets`, 'warning'));

        expiring.forEach(secret => {
          const color = secret.daysLeft <= 3 ? 'error' : 'warning';
          console.log(styled(`• ${secret.key}`, color) +
                      styled(` | ${secret.daysLeft} days left`, 'muted'));
        });
      }
      break;
    }

    case 'visualize': {
      const vizKey = args[1];

      if (!vizKey) {
        console.log(styled('❌ Usage: visualize <key>', 'error'));
        process.exit(1);
      }

      const { mermaidUrl, d3Url } = await versionedManager.visualize(vizKey);

      console.log(styled(`📊 Visualization for ${vizKey}`, 'accent'));
      console.log(styled(`• Mermaid: ${mermaidUrl}`, 'primary'));
      console.log(styled(`• D3 JSON: ${d3Url}`, 'primary'));

      // Generate quick terminal graph
      const history = await versionedManager.getHistory(vizKey, 10);
      console.log(styled(`\nTerminal view:`, 'muted'));
      history.forEach((entry, i) => {
        const arrow = i < history.length - 1 ? '↓' : '★';
        const indent = '  '.repeat(i);
        console.log(`${indent}${arrow} ${entry.version} (${entry.timestamp.split('T')[0]})`);
      });
      break;
    }

    case 'schedule': {
      const key = args[1];
      const scheduleType = args[2]; // 'cron' or 'interval'
      const scheduleValue = args[3]; // cron expression or interval in ms

      if (!key || !scheduleType || !scheduleValue) {
        console.log(styled('❌ Usage: schedule <key> <cron|interval> <value>', 'error'));
        process.exit(1);
      }

      const rule = {
        key,
        schedule: scheduleType === 'cron'
          ? { type: 'cron' as const, cron: scheduleValue }
          : { type: 'interval' as const, intervalMs: parseInt(scheduleValue) },
        action: 'rotate' as const,
        metadata: { reason: 'CLI scheduled rotation' }
      };

      const result = await lifecycleManager.scheduleRotation(key, rule);

      console.log(styled(`⏰ Scheduled rotation for ${key}`, 'success'));
      console.log(styled(`   Rule ID: ${result.ruleId}`, 'primary'));
      console.log(styled(`   Next: ${result.nextRotation}`, 'muted'));
      break;
    }

    case 'help':
    default:
      console.log(styled('🔐 FactoryWager Secret Version CLI v5.1', 'accent'));
      console.log(styled('=========================================', 'muted'));
      console.log('');
      console.log(styled('Commands:', 'primary'));
      console.log('  set <key> <value> [desc]     Set secret with versioning');
      console.log('  get <key> [version]          Get secret (optionally specific version)');
      console.log('  history <key> [limit]        Show version history');
      console.log('  rollback <key> <version>     Rollback to specific version');
      console.log('  rotate <key> [reason]        Rotate secret now');
      console.log('  expirations                  Check expiring secrets');
      console.log('  visualize <key>              Generate version graph');
      console.log('  schedule <key> <type> <val>  Schedule rotation (cron/interval)');
      console.log('  help                         Show this help');
      console.log('');
      console.log(styled('Examples:', 'muted'));
      console.log('  bun secret-version-cli.ts set API_KEY "sk_live_123" "Production API key"');
      console.log('  bun secret-version-cli.ts history API_KEY 10');
      console.log('  bun secret-version-cli.ts rollback API_KEY v1.0.0 --force');
      console.log('  bun secret-version-cli.ts schedule JWT_SECRET cron "0 0 1 * *"');
      break;
  }
}

main().catch(error => {
  console.error(styled(`❌ Error: ${error.message}`, 'error'));
  process.exit(1);
});
#!/usr/bin/env bun
// tools/secret-version-cli.ts — CLI for versioned secret management

import { VersionedSecretManager } from '../lib/security/versioned-secrets';

/**
 * 🚀 Prefetch Optimizations
 *
 * This file includes prefetch hints for optimal performance:
 * - DNS prefetching for external domains
 * - Preconnect for faster handshakes
 * - Resource preloading for critical assets
 *
 * Generated automatically by optimize-examples-prefetch.ts
 */
import { SecretLifecycleManager } from '../lib/security/secret-lifecycle';
import { VersionGraph } from '../lib/security/version-graph';
import { styled, log } from '../lib/theme/colors';

// Initialize managers (in production, would pass actual R2 bucket)
const versionedManager = new VersionedSecretManager();
const lifecycleManager = new SecretLifecycleManager();
const versionGraph = new VersionGraph();

const args = Bun.argv.slice(2);
const command = args[0];

async function showHelp() {
  console.log(styled('\n🔐 FactoryWager Secret Version CLI v5.1', 'accent'));
  console.log(styled('─'.repeat(50), 'muted'));
  console.log(styled('\nCommands:', 'primary'));

  const commands = [
    ['set <key> <value> [description]', 'Set secret with versioning'],
    ['get <key> [version]', 'Get secret (specific version or current)'],
    ['history <key> [limit]', 'Show version history'],
    ['rollback <key> <version> [reason]', 'Rollback to specific version'],
    ['rotate <key> [reason]', 'Rotate secret now'],
    ['expirations', 'Check expiring secrets'],
    ['visualize <key>', 'Generate version visualization'],
    ['schedule <key> <cron|interval> <value>', 'Schedule rotation'],
    ['impact <key>', 'Show impact analysis'],
    ['help', 'Show this help']
  ];

  commands.forEach(([cmd, desc]) => {
    console.log(styled(`  ${cmd.padEnd(35)}`, 'muted') + styled(desc, 'success'));
  });

  console.log(styled('\nExamples:', 'primary'));
  console.log(styled('  bun secret-version-cli.ts set API_KEY "sk_live_123" "Production key"', 'muted'));
  console.log(styled('  bun secret-version-cli.ts rollback API_KEY v1.0.0 "Bug fix"', 'muted'));
  console.log(styled('  bun secret-version-cli.ts schedule JWT_KEY cron "0 0 1 * *"', 'muted'));

  console.log('\n' + styled('🚀 Secure your temporal secrets!', 'success'));
}

async function handleSet(key: string, value: string, description?: string) {
  try {
    const result = await versionedManager.set(key, value, {
      author: process.env.USER || 'cli',
      description: description || 'Set via CLI',
      level: 'STANDARD',
      tags: { 'source': 'cli' }
    });

    log.success(`Set ${key}`);
    log.metric('Version', result.version, 'primary');
    log.metric('Key', result.key, 'muted');
  } catch (error) {
    log.error(`Failed to set ${key}: ${error}`);
  }
}

async function handleGet(key: string, version?: string) {
  try {
    const result = await versionedManager.getWithVersion(key, version);

    log.info(`Retrieved ${key}`);
    log.metric('Version', result.version, 'primary');
    log.metric('Preview', result.value.substring(0, 20) + '...', 'muted');

    if (result.metadata?.tags) {
      console.log(styled('\nMetadata:', 'muted'));
      Object.entries(result.metadata.tags).forEach(([k, v]) => {
        console.log(styled(`  ${k}:`, 'muted') + styled(v, 'primary'));
      });
    }
  } catch (error) {
    log.error(`Failed to get ${key}: ${error}`);
  }
}

async function handleHistory(key: string, limit?: string) {
  try {
    const limitNum = limit ? parseInt(limit) : 5;
    const history = await versionedManager.getHistory(key, limitNum);

    if (history.length === 0) {
      log.warning(`No history found for ${key}`);
      return;
    }

    log.section(`History for ${key}`, 'accent');
    console.log(styled('─'.repeat(50), 'muted'));

    history.forEach((entry, i) => {
      const isLatest = i === 0;
      const color = isLatest ? 'success' : 'muted';
      const icon = entry.visual?.icon || '📝';

      console.log(styled(`${icon} ${entry.version}`, color));
      console.log(styled(`  ${entry.timestamp}`, 'muted'));
      console.log(styled(`  ${entry.author || 'unknown'}`, 'primary'));

      if (entry.description) {
        console.log(styled(`  ${entry.description}`, 'muted'));
      }

      if (i < history.length - 1) {
        console.log('');
      }
    });
  } catch (error) {
    log.error(`Failed to get history for ${key}: ${error}`);
  }
}

async function handleRollback(key: string, targetVersion: string, reason?: string) {
  try {
    const confirm = !args.includes('--force');
    const rollbackReason = reason || 'CLI rollback';

    const result = await versionedManager.rollback(key, targetVersion, {
      confirm,
      reason: rollbackReason
    });

    if (!result.cancelled) {
      log.success(`Rollback completed`);
      log.metric('From', result.from, 'muted');
      log.metric('To', result.to, 'primary');
      log.metric('Reason', result.reason, 'accent');
    }
  } catch (error) {
    log.error(`Failed to rollback ${key}: ${error}`);
  }
}

async function handleRotate(key: string, reason?: string) {
  try {
    const rotationReason = reason || 'Scheduled rotation';

    log.info(`Rotating ${key}`);
    const result = await lifecycleManager.rotateNow(key, rotationReason);

    if (result.success) {
      log.success(`Rotated ${key}`);
      log.metric('Reason', rotationReason, 'accent');
    }
  } catch (error) {
    log.error(`Failed to rotate ${key}: ${error}`);
  }
}

async function handleExpirations() {
  try {
    const expiring = await lifecycleManager.checkExpirations();

    if (expiring.length === 0) {
      log.success('No expiring secrets');
    } else {
      log.warning(`${expiring.length} expiring secrets`);

      expiring.forEach(secret => {
        const color = secret.daysLeft <= 3 ? 'error' : 'warning';
        console.log(styled(`• ${secret.key}`, color) +
                    styled(` | ${secret.daysLeft} days left`, 'muted'));
      });
    }
  } catch (error) {
    log.error(`Failed to check expirations: ${error}`);
  }
}

async function handleVisualize(key: string) {
  try {
    const history = await versionedManager.getHistory(key, 10);

    if (history.length === 0) {
      log.warning(`No history found for ${key}`);
      return;
    }

    // Generate terminal visualization
    await versionGraph.generateTerminalVisualization(key, history);

    // Generate impact analysis
    const impact = await versionGraph.generateImpactAnalysis(key, history);

    log.section('Impact Analysis', 'primary');
    log.metric('Total versions', impact.totalVersions, 'muted');
    log.metric('Rollbacks', impact.rollbacks, impact.rollbacks > 0 ? 'warning' : 'success');
    log.metric('Rotations', impact.rotations, 'accent');
    log.metric('Stability', (impact.stability * 100).toFixed(1) + '%',
              impact.stability > 0.8 ? 'success' : impact.stability > 0.5 ? 'warning' : 'error');

    if (impact.recommendations.length > 0) {
      console.log(styled('\nRecommendations:', 'warning'));
      impact.recommendations.forEach(rec => {
        console.log(styled(`• ${rec}`, 'muted'));
      });
    }
  } catch (error) {
    log.error(`Failed to visualize ${key}: ${error}`);
  }
}

async function handleSchedule(key: string, type: string, value: string) {
  try {
    const schedule = type === 'cron'
      ? { type: 'cron' as const, cron: value }
      : { type: 'interval' as const, intervalMs: parseInt(value) };

    const rule = {
      key,
      schedule,
      action: 'rotate' as const,
      metadata: {
        severity: 'MEDIUM' as const,
        notify: ['cli']
      }
    };

    const result = await lifecycleManager.scheduleRotation(key, rule);

    log.success(`Scheduled rotation for ${key}`);
    log.metric('Rule ID', result.ruleId, 'muted');
    log.metric('Next rotation', result.nextRotation.toISOString(), 'primary');
  } catch (error) {
    log.error(`Failed to schedule rotation for ${key}: ${error}`);
  }
}

async function handleImpact(key: string) {
  try {
    const history = await versionedManager.getHistory(key, 50);
    const impact = await versionGraph.generateImpactAnalysis(key, history);

    log.section(`Impact Analysis for ${key}`, 'primary');

    console.log(styled('Metrics:', 'muted'));
    log.metric('Total versions', impact.totalVersions, 'muted');
    log.metric('Rollbacks', impact.rollbacks, impact.rollbacks > 0 ? 'warning' : 'success');
    log.metric('Rotations', impact.rotations, 'accent');
    log.metric('Stability', (impact.stability * 100).toFixed(1) + '%',
              impact.stability > 0.8 ? 'success' : impact.stability > 0.5 ? 'warning' : 'error');

    if (impact.recommendations.length > 0) {
      console.log(styled('\nRecommendations:', 'warning'));
      impact.recommendations.forEach(rec => {
        console.log(styled(`• ${rec}`, 'muted'));
      });
    }
  } catch (error) {
    log.error(`Failed to analyze impact for ${key}: ${error}`);
  }
}

// Main CLI logic
async function main() {
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    await showHelp();
    return;
  }

  switch (command) {
    case 'set':
      await handleSet(args[1], args[2], args[3]);
      break;

    case 'get':
      await handleGet(args[1], args[2]);
      break;

    case 'history':
      await handleHistory(args[1], args[2]);
      break;

    case 'rollback':
      await handleRollback(args[1], args[2], args[3]);
      break;

    case 'rotate':
      await handleRotate(args[1], args[2]);
      break;

    case 'expirations':
      await handleExpirations();
      break;

    case 'visualize':
      await handleVisualize(args[1]);
      break;

    case 'schedule':
      await handleSchedule(args[1], args[2], args[3]);
      break;

    case 'impact':
      await handleImpact(args[1]);
      break;

    default:
      log.error(`Unknown command: ${command}`);
      await showHelp();
      process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  await main();
}

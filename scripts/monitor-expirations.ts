#!/usr/bin/env bun

/**
 * ⏰ FactoryWager Expiration Monitor v5.1
 *
 * Continuous monitoring of secret expirations with alerts
 *
 * @version 5.1
 */

import { SecretLifecycleManager } from '../lib/security/secret-lifecycle.ts';
import { styled } from '../lib/theme/colors.ts';
import { refs } from '@fw/business';

const lifecycleManager = new SecretLifecycleManager();

async function main() {
  const args = Bun.argv.slice(2);
  const daemon = args.includes('--daemon');
  const slackAlerts = args.includes('--slack-alerts');
  const r2Reports = args.includes('--r2-reports');
  const interval = parseInt(
    args.find(arg => arg.startsWith('--interval='))?.split('=')[1] || '3600000'
  ); // 1 hour default

  console.info(styled('⏰ FactoryWager Expiration Monitor v5.1', 'accent'));
  console.info(styled('=========================================', 'muted'));
  console.info('');

  if (daemon) {
    console.info(styled('🔄 Running in daemon mode', 'primary'));
    console.info(styled(`   Check interval: ${interval / 1000 / 60} minutes`, 'muted'));
    console.info(styled(`   Slack alerts: ${slackAlerts ? 'enabled' : 'disabled'}`, 'muted'));
    console.info(styled(`   R2 reports: ${r2Reports ? 'enabled' : 'disabled'}`, 'muted'));
    console.info('');
  }

  const runCheck = async () => {
    try {
      console.info(styled(`🔍 Checking expirations at ${new Date().toLocaleString()}`, 'primary'));

      const expiring = await lifecycleManager.checkExpirations();

      if (expiring.length === 0) {
        console.info(styled('✅ No expiring secrets found', 'success'));
      } else {
        console.info(styled(`⚠️  Found ${expiring.length} expiring secrets`, 'warning'));

        // Group by urgency
        const critical = expiring.filter(e => e.daysLeft <= 3);
        const warning = expiring.filter(e => e.daysLeft > 3 && e.daysLeft <= 7);
        const info = expiring.filter(e => e.daysLeft > 7);

        if (critical.length > 0) {
          console.info(styled(`🚨 CRITICAL (${critical.length}):`, 'error'));
          critical.forEach(secret => {
            console.info(styled(`   • ${secret.key}: ${secret.daysLeft} days`, 'error'));
          });
        }

        if (warning.length > 0) {
          console.info(styled(`⚠️  WARNING (${warning.length}):`, 'warning'));
          warning.forEach(secret => {
            console.info(styled(`   • ${secret.key}: ${secret.daysLeft} days`, 'warning'));
          });
        }

        if (info.length > 0) {
          console.info(styled(`ℹ️  INFO (${info.length}):`, 'muted'));
          info.forEach(secret => {
            console.info(styled(`   • ${secret.key}: ${secret.daysLeft} days`, 'muted'));
          });
        }

        // Send alerts if enabled
        if (slackAlerts && expiring.length > 0) {
          await sendSlackAlert(expiring);
        }

        // Generate R2 report if enabled
        if (r2Reports && expiring.length > 0) {
          await lifecycleManager.generateExpirationReport(expiring);
        }
      }

      console.info('');
    } catch (error) {
      console.error(styled(`❌ Check failed: ${error.message}`, 'error'));
    }
  };

  // Run initial check
  await runCheck();

  if (daemon) {
    console.info(styled('🔄 Entering daemon mode...', 'primary'));
    console.info(styled('   Press Ctrl+C to stop', 'muted'));
    console.info('');

    // Set up interval
    const intervalId = setInterval(runCheck, interval);

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.info('');
      console.info(styled('🛑 Shutting down monitor...', 'warning'));
      clearInterval(intervalId);
      console.info(styled('✅ Monitor stopped', 'success'));
      process.exit(0);
    });

    // Keep process alive
    await new Promise(() => {}); // Never resolves
  }
}

async function sendSlackAlert(expiring: Array<{ key: string; daysLeft: number }>) {
  // Mock Slack alert implementation
  const critical = expiring.filter(e => e.daysLeft <= 3);
  const message = {
    text: `🚨 Secret Expiration Alert`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🚨 Secret Expiration Alert',
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${expiring.length} secrets expiring soon*\n${critical.length} critical expirations`,
        },
      },
      {
        type: 'section',
        fields: expiring.slice(0, 10).map(secret => ({
          type: 'mrkdwn',
          text: `*${secret.key}*\n${secret.daysLeft} days left`,
        })),
      },
    ],
  };

  console.info(styled('📤 Slack alert sent (mock)', 'success'));
  console.info(JSON.stringify(message, null, 2));
}

main().catch(error => {
  console.error(styled(`💥 Fatal error: ${error.message}`, 'error'));
  process.exit(1);
});

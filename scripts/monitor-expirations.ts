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
import { refs } from '../lib/reference-manager.ts';

const lifecycleManager = new SecretLifecycleManager();

async function main() {
  const args = Bun.argv.slice(2);
  const daemon = args.includes('--daemon');
  const slackAlerts = args.includes('--slack-alerts');
  const r2Reports = args.includes('--r2-reports');
  const interval = parseInt(args.find(arg => arg.startsWith('--interval='))?.split('=')[1] || '3600000'); // 1 hour default

  console.log(styled('⏰ FactoryWager Expiration Monitor v5.1', 'accent'));
  console.log(styled('=========================================', 'muted'));
  console.log('');

  if (daemon) {
    console.log(styled('🔄 Running in daemon mode', 'primary'));
    console.log(styled(`   Check interval: ${interval / 1000 / 60} minutes`, 'muted'));
    console.log(styled(`   Slack alerts: ${slackAlerts ? 'enabled' : 'disabled'}`, 'muted'));
    console.log(styled(`   R2 reports: ${r2Reports ? 'enabled' : 'disabled'}`, 'muted'));
    console.log('');
  }

  const runCheck = async () => {
    try {
      console.log(styled(`🔍 Checking expirations at ${new Date().toLocaleString()}`, 'primary'));

      const expiring = await lifecycleManager.checkExpirations();

      if (expiring.length === 0) {
        console.log(styled('✅ No expiring secrets found', 'success'));
      } else {
        console.log(styled(`⚠️  Found ${expiring.length} expiring secrets`, 'warning'));

        // Group by urgency
        const critical = expiring.filter(e => e.daysLeft <= 3);
        const warning = expiring.filter(e => e.daysLeft > 3 && e.daysLeft <= 7);
        const info = expiring.filter(e => e.daysLeft > 7);

        if (critical.length > 0) {
          console.log(styled(`🚨 CRITICAL (${critical.length}):`, 'error'));
          critical.forEach(secret => {
            console.log(styled(`   • ${secret.key}: ${secret.daysLeft} days`, 'error'));
          });
        }

        if (warning.length > 0) {
          console.log(styled(`⚠️  WARNING (${warning.length}):`, 'warning'));
          warning.forEach(secret => {
            console.log(styled(`   • ${secret.key}: ${secret.daysLeft} days`, 'warning'));
          });
        }

        if (info.length > 0) {
          console.log(styled(`ℹ️  INFO (${info.length}):`, 'muted'));
          info.forEach(secret => {
            console.log(styled(`   • ${secret.key}: ${secret.daysLeft} days`, 'muted'));
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

      console.log('');

    } catch (error) {
      console.error(styled(`❌ Check failed: ${error.message}`, 'error'));
    }
  };

  // Run initial check
  await runCheck();

  if (daemon) {
    console.log(styled('🔄 Entering daemon mode...', 'primary'));
    console.log(styled('   Press Ctrl+C to stop', 'muted'));
    console.log('');

    // Set up interval
    const intervalId = setInterval(runCheck, interval);

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('');
      console.log(styled('🛑 Shutting down monitor...', 'warning'));
      clearInterval(intervalId);
      console.log(styled('✅ Monitor stopped', 'success'));
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
          text: '🚨 Secret Expiration Alert'
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${expiring.length} secrets expiring soon*\n${critical.length} critical expirations`
        }
      },
      {
        type: 'section',
        fields: expiring.slice(0, 10).map(secret => ({
          type: 'mrkdwn',
          text: `*${secret.key}*\n${secret.daysLeft} days left`
        }))
      }
    ]
  };

  console.log(styled('📤 Slack alert sent (mock)', 'success'));
  console.log(JSON.stringify(message, null, 2));
}

main().catch(error => {
  console.error(styled(`💥 Fatal error: ${error.message}`, 'error'));
  process.exit(1);
});
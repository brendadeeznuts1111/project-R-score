#!/usr/bin/env bun

import { VersionedSecretManager } from '../lib/security/versioned-secrets';
import { SecretLifecycleManager } from '../lib/security/secret-lifecycle';

const versionedManager = new VersionedSecretManager();
const lifecycleManager = new SecretLifecycleManager();

const args = Bun.argv.slice(2);
const command = args[0];

switch (command) {
  case 'set': {
    const [key, value] = [args[1], args[2]];
    const description = args[3] || 'No description provided';
    if (!key || !value) throw new Error('Usage: set <key> <value> [description]');

    const result = await versionedManager.set(key, value, {
      author: process.env.USER || 'cli',
      description,
      level: 'STANDARD',
      tags: { source: 'cli' },
    });

    console.info(`✅ Set ${key}`);
    console.info(`   Version: ${result.version}`);
    console.info(`   Key: ${result.key}`);
    break;
  }
  case 'history': {
    const historyKey = args[1];
    const limit = parseInt(args[2] || '5', 10);
    if (!historyKey) throw new Error('Usage: history <key> [limit]');
    const history = await versionedManager.getHistory(historyKey, limit);
    console.info(`📜 History for ${historyKey}`);
    history.forEach(entry => {
      console.info(`• ${entry.version} | ${entry.timestamp} | ${entry.author || 'unknown'}`);
      if (entry.description) console.info(`  ${entry.description}`);
    });
    break;
  }
  case 'rollback': {
    const [rollbackKey, targetVersion] = [args[1], args[2]];
    const reason = args[3] || 'CLI rollback';
    const confirm = !args.includes('--force');
    if (!rollbackKey || !targetVersion) throw new Error('Usage: rollback <key> <version> [reason]');

    const rollbackResult = await versionedManager.rollback(rollbackKey, targetVersion, {
      confirm,
      reason,
    });
    console.info(JSON.stringify(rollbackResult, null, 2));
    break;
  }
  case 'rotate': {
    const rotateKey = args[1];
    const rotationReason = args[2] || 'Scheduled rotation';
    if (!rotateKey) throw new Error('Usage: rotate <key> [reason]');

    const rotation = await lifecycleManager.rotateNow(rotateKey, rotationReason);
    console.info(`✅ Rotated to ${rotation.version}`);
    break;
  }
  case 'expirations': {
    const result = await lifecycleManager.checkExpirations();
    const expiring = result.expiring;
    if (expiring.length === 0) {
      console.info('✅ No expiring secrets');
    } else {
      expiring.forEach(secret => {
        const severity = secret.daysLeft <= 3 ? 'CRITICAL' : 'WARNING';
        console.info(`• ${secret.key} | ${secret.daysLeft} days left | ${severity}`);
      });
      if (result.reportInfo?.jsonUrl) {
        console.info(`JSON report: ${result.reportInfo.jsonUrl}`);
      }
      if (result.reportInfo?.htmlUrl) {
        console.info(`HTML report: ${result.reportInfo.htmlUrl}`);
      }
      if (result.reportInfo?.localJson) {
        console.info(`Local JSON: ${result.reportInfo.localJson}`);
      }
      if (result.reportInfo?.localHtml) {
        console.info(`Local HTML: ${result.reportInfo.localHtml}`);
      }
    }
    break;
  }
  case 'visualize': {
    const vizKey = args[1];
    if (!vizKey) throw new Error('Usage: visualize <key>');
    const result = await versionedManager.visualize(vizKey);
    console.info(JSON.stringify(result, null, 2));
    break;
  }
  default:
    console.info('Commands: set, history, rollback, rotate, expirations, visualize');
}

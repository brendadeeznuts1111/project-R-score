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
      tags: { source: 'cli' }
    });

    console.log(`✅ Set ${key}`);
    console.log(`   Version: ${result.version}`);
    console.log(`   Key: ${result.key}`);
    break;
  }
  case 'history': {
    const historyKey = args[1];
    const limit = parseInt(args[2] || '5', 10);
    if (!historyKey) throw new Error('Usage: history <key> [limit]');
    const history = await versionedManager.getHistory(historyKey, limit);
    console.log(`📜 History for ${historyKey}`);
    history.forEach((entry) => {
      console.log(`• ${entry.version} | ${entry.timestamp} | ${entry.author || 'unknown'}`);
      if (entry.description) console.log(`  ${entry.description}`);
    });
    break;
  }
  case 'rollback': {
    const [rollbackKey, targetVersion] = [args[1], args[2]];
    const reason = args[3] || 'CLI rollback';
    const confirm = !args.includes('--force');
    if (!rollbackKey || !targetVersion) throw new Error('Usage: rollback <key> <version> [reason]');

    const rollbackResult = await versionedManager.rollback(rollbackKey, targetVersion, { confirm, reason });
    console.log(JSON.stringify(rollbackResult, null, 2));
    break;
  }
  case 'rotate': {
    const rotateKey = args[1];
    const rotationReason = args[2] || 'Scheduled rotation';
    if (!rotateKey) throw new Error('Usage: rotate <key> [reason]');

    const rotation = await lifecycleManager.rotateNow(rotateKey, rotationReason);
    console.log(`✅ Rotated to ${rotation.version}`);
    break;
  }
  case 'expirations': {
    const result = await lifecycleManager.checkExpirations();
    const expiring = result.expiring;
    if (expiring.length === 0) {
      console.log('✅ No expiring secrets');
    } else {
      expiring.forEach((secret) => {
        const severity = secret.daysLeft <= 3 ? 'CRITICAL' : 'WARNING';
        console.log(`• ${secret.key} | ${secret.daysLeft} days left | ${severity}`);
      });
      if (result.reportInfo?.jsonUrl) {
        console.log(`JSON report: ${result.reportInfo.jsonUrl}`);
      }
      if (result.reportInfo?.htmlUrl) {
        console.log(`HTML report: ${result.reportInfo.htmlUrl}`);
      }
      if (result.reportInfo?.localJson) {
        console.log(`Local JSON: ${result.reportInfo.localJson}`);
      }
      if (result.reportInfo?.localHtml) {
        console.log(`Local HTML: ${result.reportInfo.localHtml}`);
      }
    }
    break;
  }
  case 'visualize': {
    const vizKey = args[1];
    if (!vizKey) throw new Error('Usage: visualize <key>');
    const result = await versionedManager.visualize(vizKey);
    console.log(JSON.stringify(result, null, 2));
    break;
  }
  default:
    console.log('Commands: set, history, rollback, rotate, expirations, visualize');
}

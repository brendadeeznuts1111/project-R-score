#!/usr/bin/env bun
/**
 * @fileoverview Secrets Management CLI
 * @description CLI tool for managing Bun.secrets with role-based access control
 */

import { parseArgs } from 'util';
import { secrets } from 'bun';
import { getCurrentOperator } from '../secrets/operator-session';
import { authorizeSecretAccess } from '../auth/secret-guard';
import { globalLogger as logger } from '../logging/logger';
import { versionManager } from '../secrets/version-manager';

function printUsage() {
  console.log(`
Secrets Management CLI

USAGE:
  bun run secrets:list                    # List all secrets (senior-engineer+)
  bun run secrets:set --service=<svc> --name=<key> --value=<val>  # Set secret
  bun run secrets:delete --service=<svc> --name=<key>             # Delete secret
  bun run secrets:rotate                 # Rotate all secrets (90-day compliance)
  bun run secrets:versions --service=<svc> --name=<key>           # Show version history
  bun run secrets:rollback --service=<svc> --name=<key> --version=<v>  # Rollback to version
  bun run secrets:emergency-rotate        # Emergency rotation (compromise response)
  bun run secrets:provision --environment=<env>  # Provision initial secrets

EXAMPLES:
  bun run secrets:set --service=nexus --name=mcp.bun.apiKey --value="sk-123"
  bun run secrets:delete --service=nexus --name=mcp.bun.apiKey
  bun run secrets:rotate --all

PERMISSIONS:
  - list: senior-engineer role required
  - set/delete/rotate: senior-engineer role required
  - versions: senior-engineer role required (read)
  - rollback: senior-engineer role required (write)

VERSION CONTROL:
  All secrets are automatically versioned. Use 'versions' to see history
  and 'rollback' to restore a previous version.
`);
}

async function requireSecretAccess(service: string, operation: 'read' | 'write' | 'delete'): Promise<void> {
  const authorized = await authorizeSecretAccess(service, operation);
  if (!authorized) {
    const operator = getCurrentOperator();
    console.error('❌ Access denied: insufficient permissions');
    console.error(`Required operation: ${operation} on service: ${service}`);
    console.error(`Current role: ${operator?.role || 'none'}`);
    process.exit(1);
  }
}

async function listSecrets(): Promise<void> {
  await requireSecretAccess('nexus', 'read');

  try {
    // Note: Bun.secrets doesn't have a list method, so we show status
    console.log('🔐 Secrets Management Status');
    console.log('=' .repeat(50));

    // Check if secrets are available
    const testSecret = await secrets.get({ service: 'nexus', name: 'test' }).catch(() => null);
    console.log(`Secrets API: ${testSecret !== null ? '✅ Available' : '⚠️  Limited access'}`);

    // Show rotation status (placeholder - would need implementation)
    console.log('Rotation Status: Not implemented');
    console.log('Last Rotation: Never');

    console.log('\n📋 Available Services:');
    console.log('  - nexus (MCP API keys)');
    console.log('  - telegram (Bot tokens)');
    console.log('  - github (API tokens)');
    console.log('  - database (Connection strings)');

    logger.info('SE-200', 'Secrets list accessed', undefined, { operator: (await getCurrentOperator())?.id });
  } catch (error) {
    logger.error('SE-500', 'Failed to list secrets', error);
    console.error('❌ Failed to access secrets');
    process.exit(1);
  }
}

async function setSecret(service: string, name: string, value: string): Promise<void> {
  await requireSecretAccess(service, 'write');

  if (!service || !name || !value) {
    console.error('❌ Missing required parameters: --service, --name, --value');
    process.exit(1);
  }

  try {
    // Use version manager for version tracking
    const version = await versionManager.setWithVersion(name, value, 'manual');
    console.log(`✅ Secret set: ${service}.${name} (version ${version})`);

    logger.info('HBSE-005', 'Secret created/updated', undefined, {
      service,
      name,
      version,
      operator: (await getCurrentOperator())?.id
    });
  } catch (error) {
    logger.error('HBSE-004', 'Failed to set secret', error);
    console.error('❌ Failed to set secret');
    process.exit(1);
  }
}

async function deleteSecret(service: string, name: string): Promise<void> {
  await requireSecretAccess(service, 'delete');

  if (!service || !name) {
    console.error('❌ Missing required parameters: --service, --name');
    process.exit(1);
  }

  try {
    // Use version manager to delete all versions
    await versionManager.delete(name);
    console.log(`✅ Secret deleted: ${service}.${name} (all versions)`);

    logger.info('HBSE-001', 'Secret deleted', undefined, {
      service,
      name,
      operator: (await getCurrentOperator())?.id
    });
  } catch (error) {
    logger.error('HBSE-004', 'Failed to delete secret', error);
    console.error('❌ Failed to delete secret');
    process.exit(1);
  }
}

async function showVersions(service: string, name: string): Promise<void> {
  await requireSecretAccess(service, 'read');

  if (!service || !name) {
    console.error('❌ Missing required parameters: --service, --name');
    process.exit(1);
  }

  try {
    const history = await versionManager.getVersionHistory(name);
    
    console.log(`\n📋 Version History: ${service}.${name}`);
    console.log(`Current Version: ${history.currentVersion}`);
    console.log(`Last Rotation: ${history.lastRotation ? new Date(history.lastRotation).toISOString() : 'Never'}`);
    console.log('\nVersions:');
    
    for (const version of history.versions.reverse()) {
      const date = new Date(version.timestamp).toISOString();
      const reason = version.reason || 'manual';
      console.log(`  v${version.version} - ${date} (${reason}) [${version.fingerprint}]`);
    }
  } catch (error) {
    logger.error('HBSE-004', 'Failed to get version history', error);
    console.error('❌ Failed to get version history');
    process.exit(1);
  }
}

async function rollbackSecret(service: string, name: string, targetVersion: number): Promise<void> {
  await requireSecretAccess(service, 'write');

  if (!service || !name || !targetVersion) {
    console.error('❌ Missing required parameters: --service, --name, --version');
    process.exit(1);
  }

  try {
    await versionManager.rollback(name, targetVersion);
    console.log(`✅ Secret rolled back to version ${targetVersion}: ${service}.${name}`);

    logger.info('HBSE-005', 'Secret rolled back', undefined, {
      service,
      name,
      targetVersion,
      operator: (await getCurrentOperator())?.id
    });
  } catch (error) {
    logger.error('HBSE-004', 'Failed to rollback secret', error);
    console.error(`❌ Failed to rollback: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
}

async function rotateSecrets(all: boolean): Promise<void> {
  await requireSecretAccess('nexus', 'write');

  console.log('🔄 Rotating secrets...');

  if (!all) {
    console.error('❌ --all flag required for rotation');
    process.exit(1);
  }

  try {
    // Use the actual rotation script
    const { rotateAllSecrets } = await import('../../scripts/secrets-rotate-cron');
    await rotateAllSecrets();
    
    console.log('✅ Secret rotation completed');
    logger.info('HBSE-005', 'Secrets rotated via CLI', undefined, {
      operator: (await getCurrentOperator())?.id,
      method: 'cli'
    });
  } catch (error) {
    logger.error('HBSE-004', 'Failed to rotate secrets', error);
    console.error('❌ Failed to rotate secrets');
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    printUsage();
    return;
  }

  const command = args[0];

  // Parse additional args
  const parsedArgs = parseArgs({
    args: args.slice(1),
    options: {
      service: { type: 'string' },
      name: { type: 'string' },
      value: { type: 'string' },
      version: { type: 'string' }, // For rollback
      all: { type: 'boolean' },
      help: { type: 'boolean' }
    },
    allowPositionals: false
  });

  const options = parsedArgs.values;

  if (options.help) {
    printUsage();
    return;
  }

  switch (command) {
    case 'list':
      await listSecrets();
      break;

    case 'set':
      await setSecret(options.service!, options.name!, options.value!);
      break;

    case 'delete':
      await deleteSecret(options.service!, options.name!);
      break;

    case 'rotate':
      await rotateSecrets(options.all!);
      break;

    case 'versions':
      await showVersions(options.service!, options.name!);
      break;

    case 'rollback':
      const targetVersion = options.version ? parseInt(options.version) : undefined;
      if (!targetVersion) {
        console.error('❌ --version parameter required for rollback');
        process.exit(1);
      }
      await rollbackSecret(options.service!, options.name!, targetVersion);
      break;

    default:
      console.error(`❌ Unknown command: ${command}`);
      printUsage();
      process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
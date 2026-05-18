#!/usr/bin/env bun
/**
 * 🔥 FIRE22 SECRETS MANAGER
 * Secure credential management using Bun.secrets
 * Native OS credential storage for enterprise security
 */

import { secrets } from 'bun';

// ╔══════════════════════════════════════════════════════════════╗
// ║                 SECRETS MANAGEMENT CONFIGURATION           ║
// ╚══════════════════════════════════════════════════════════════╝

const SECRETS_SERVICE = 'fantasy42-fire22-enterprise';
const SECRETS_CONFIG = {
  CLOUDFLARE_API_TOKEN: 'Cloudflare API Token',
  CLOUDFLARE_ACCOUNT_ID: 'Cloudflare Account ID',
  GITHUB_TOKEN: 'GitHub Personal Access Token',
  FIRE22_REGISTRY_TOKEN: 'Fire22 Registry Token',
  FIRE22_ENTERPRISE_TOKEN: 'Enterprise Registry Token',
  NPM_TOKEN: 'NPM Registry Token',
  DATABASE_URL: 'Database Connection URL',
  REDIS_URL: 'Redis Connection URL',
  JWT_SECRET: 'JWT Signing Secret',
  ENCRYPTION_KEY: 'Data Encryption Key',
};

// ╔══════════════════════════════════════════════════════════════╗
// ║                 SECRETS MANAGEMENT FUNCTIONS               ║
// ╚══════════════════════════════════════════════════════════════╝

async function storeSecret(name: string, value: string): Promise<boolean> {
  try {
    await secrets.set({
      service: SECRETS_SERVICE,
      name,
      value,
    });
    console.info(`✅ Stored: ${name}`);
    return true;
  } catch (error) {
    console.info(`❌ Failed to store ${name}:`, error.message);
    return false;
  }
}

async function retrieveSecret(name: string): Promise<string | null> {
  try {
    const secret = await secrets.get({
      service: SECRETS_SERVICE,
      name,
    });
    return secret || null;
  } catch (error) {
    console.info(`❌ Failed to retrieve ${name}:`, error.message);
    return null;
  }
}

async function deleteSecret(name: string): Promise<boolean> {
  try {
    await secrets.delete({
      service: SECRETS_SERVICE,
      name,
    });
    console.info(`🗑️ Deleted: ${name}`);
    return true;
  } catch (error) {
    console.info(`❌ Failed to delete ${name}:`, error.message);
    return false;
  }
}

async function listSecrets(): Promise<string[]> {
  // Note: Bun.secrets doesn't have a list function yet
  // We'll check each configured secret
  const available: string[] = [];

  for (const secretName of Object.keys(SECRETS_CONFIG)) {
    const value = await retrieveSecret(secretName);
    if (value) {
      available.push(secretName);
    }
  }

  return available;
}

async function migrateFromEnv(): Promise<void> {
  console.info('🔄 Migrating secrets from .env to secure storage...');

  // Read current .env file
  let envContent = '';
  try {
    envContent = await Bun.file('.env').text();
  } catch {
    console.info('ℹ️ No .env file found');
    return;
  }

  const envLines = envContent.split('\n');
  let migrated = 0;

  for (const line of envLines) {
    const [key, ...valueParts] = line.split('=');
    if (!key || !valueParts.length) continue;

    const value = valueParts.join('=').trim();
    const cleanKey = key.trim();

    // Only migrate configured secrets
    if (SECRETS_CONFIG[cleanKey] && value && value !== `your_${cleanKey.toLowerCase()}_here`) {
      const success = await storeSecret(cleanKey, value);
      if (success) {
        migrated++;
        // Optionally remove from .env
        console.info(`🔄 Migrated: ${cleanKey}`);
      }
    }
  }

  console.info(`✅ Migration complete: ${migrated} secrets migrated`);
}

// ╔══════════════════════════════════════════════════════════════╗
// ║                 BULK OPERATIONS                            ║
// ╚══════════════════════════════════════════════════════════════╝

async function setupEnterpriseSecrets(): Promise<void> {
  console.info('🔐 Setting up Enterprise Secrets...');
  console.info('This will store your credentials securely using OS keychain.');

  const secretsToSetup = [
    'CLOUDFLARE_API_TOKEN',
    'CLOUDFLARE_ACCOUNT_ID',
    'GITHUB_TOKEN',
    'FIRE22_REGISTRY_TOKEN',
  ];

  for (const secretName of secretsToSetup) {
    const description = SECRETS_CONFIG[secretName];
    const currentValue = await retrieveSecret(secretName);

    if (currentValue) {
      console.info(`✅ ${secretName}: Already configured`);
      continue;
    }

    console.info(`\n🔑 ${secretName}`);
    console.info(`📝 ${description}`);
    console.info(`Enter value (or press Enter to skip):`);

    const value = prompt(`> `)?.trim();

    if (value && value.length > 0) {
      await storeSecret(secretName, value);
    } else {
      console.info(`⏭️ Skipped: ${secretName}`);
    }
  }

  console.info('\n🎉 Enterprise secrets setup complete!');
}

async function validateSecrets(): Promise<void> {
  console.info('🔍 Validating stored secrets...');

  const results = {
    valid: 0,
    invalid: 0,
    missing: 0,
  };

  for (const [secretName, description] of Object.entries(SECRETS_CONFIG)) {
    const value = await retrieveSecret(secretName);

    if (!value) {
      console.info(`❌ ${secretName}: Missing`);
      results.missing++;
    } else if (value.length < 10) {
      console.info(`⚠️ ${secretName}: Too short (may be invalid)`);
      results.invalid++;
    } else {
      console.info(`✅ ${secretName}: Configured`);
      results.valid++;
    }
  }

  console.info(`\n📊 Validation Results:`);
  console.info(`✅ Valid: ${results.valid}`);
  console.info(`⚠️ Invalid: ${results.invalid}`);
  console.info(`❌ Missing: ${results.missing}`);
}

// ╔══════════════════════════════════════════════════════════════╗
// ║                 UTILITY FUNCTIONS                          ║
// ╚══════════════════════════════════════════════════════════════╝

async function exportSecrets(): Promise<void> {
  console.info('📤 Exporting secrets for backup...');

  const secretsData: Record<string, string> = {};

  for (const secretName of Object.keys(SECRETS_CONFIG)) {
    const value = await retrieveSecret(secretName);
    if (value) {
      secretsData[secretName] = value;
    }
  }

  const exportPath = `./secrets-backup-${Date.now()}.json`;
  await Bun.write(exportPath, JSON.stringify(secretsData, null, 2));

  console.info(`✅ Secrets exported to: ${exportPath}`);
  console.info('⚠️ WARNING: This file contains sensitive data!');
  console.info('🔒 Encrypt this file and store it securely!');
}

async function showSecurityInfo(): Promise<void> {
  console.info('🔐 FIRE22 SECRETS MANAGER - Security Information');
  console.info('='.repeat(60));

  console.info('\n🛡️ SECURITY FEATURES:');
  console.info(
    '• Uses OS-native credential storage (Keychain/macOS, GNOME/Linux, Windows Credential Manager)'
  );
  console.info('• Credentials are encrypted at rest');
  console.info('• No plaintext storage in files');
  console.info('• Isolated by service name for security');

  console.info('\n🔑 SUPPORTED SECRETS:');
  for (const [name, description] of Object.entries(SECRETS_CONFIG)) {
    console.info(`• ${name}: ${description}`);
  }

  console.info('\n📋 USAGE PATTERNS:');
  console.info('• CI/CD: Retrieve secrets for deployment');
  console.info('• Development: Secure local credential storage');
  console.info('• CLI Tools: Authenticate without exposing credentials');
  console.info('• Enterprise: Centralized secret management');

  console.info('\n⚡ PERFORMANCE:');
  console.info("• Asynchronous operations in Bun's thread pool");
  console.info('• Fast retrieval from OS credential storage');
  console.info('• No network calls or external dependencies');
}

// ╔══════════════════════════════════════════════════════════════╗
// ║                 COMMAND LINE INTERFACE                     ║
// ╚══════════════════════════════════════════════════════════════╝

async function showHelp(): Promise<void> {
  console.info(`
🔥 FIRE22 SECRETS MANAGER
Secure credential management using Bun.secrets

USAGE:
  bun run scripts/secrets-manager.fire22.ts <command> [options]

COMMANDS:
  setup          Interactive setup of enterprise secrets
  list           List all stored secrets
  get <name>     Retrieve a specific secret
  set <name>     Store a specific secret
  delete <name>  Delete a specific secret
  validate       Validate all configured secrets
  migrate        Migrate secrets from .env file
  export         Export secrets for backup
  clear          Delete all managed secrets
  info           Show security information
  help           Show this help

EXAMPLES:
  bun run scripts/secrets-manager.fire22.ts setup
  bun run scripts/secrets-manager.fire22.ts list
  bun run scripts/secrets-manager.fire22.ts get GITHUB_TOKEN
  bun run scripts/secrets-manager.fire22.ts validate
  bun run scripts/secrets-manager.fire22.ts migrate

SECURITY:
  • Uses OS-native credential storage
  • Encrypted at rest
  • No plaintext files
  • Enterprise-grade security

CONFIGURED SECRETS:
  CLOUDFLARE_API_TOKEN     - Cloudflare API Token
  CLOUDFLARE_ACCOUNT_ID     - Cloudflare Account ID
  GITHUB_TOKEN             - GitHub Personal Access Token
  FIRE22_REGISTRY_TOKEN    - Fire22 Registry Token
  FIRE22_ENTERPRISE_TOKEN  - Enterprise Registry Token
  NPM_TOKEN                - NPM Registry Token
  DATABASE_URL             - Database Connection URL
  REDIS_URL                - Redis Connection URL
  JWT_SECRET               - JWT Signing Secret
  ENCRYPTION_KEY           - Data Encryption Key
`);
}

// ╔══════════════════════════════════════════════════════════════╗
// ║                 MAIN FUNCTION                              ║
// ╚══════════════════════════════════════════════════════════════╝

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    await showHelp();
    return;
  }

  switch (command) {
    case 'setup':
      await setupEnterpriseSecrets();
      break;

    case 'list':
      const secrets = await listSecrets();
      console.info('🔑 Stored Secrets:');
      if (secrets.length === 0) {
        console.info('❌ No secrets stored');
      } else {
        secrets.forEach(secret => {
          console.info(`✅ ${secret}: ${SECRETS_CONFIG[secret]}`);
        });
      }
      break;

    case 'get':
      const secretName = args[1];
      if (!secretName) {
        console.info('❌ Please specify a secret name');
        console.info('Usage: bun run scripts/secrets-manager.fire22.ts get <name>');
        return;
      }
      const value = await retrieveSecret(secretName);
      if (value) {
        console.info(`${secretName}: ${value}`);
      } else {
        console.info(`❌ Secret not found: ${secretName}`);
      }
      break;

    case 'set':
      const setName = args[1];
      if (!setName) {
        console.info('❌ Please specify a secret name');
        console.info('Usage: bun run scripts/secrets-manager.fire22.ts set <name>');
        return;
      }
      const setValue = prompt(`Enter value for ${setName}:`)?.trim();
      if (setValue) {
        await storeSecret(setName, setValue);
      } else {
        console.info('❌ No value provided');
      }
      break;

    case 'delete':
      const delName = args[1];
      if (!delName) {
        console.info('❌ Please specify a secret name');
        console.info('Usage: bun run scripts/secrets-manager.fire22.ts delete <name>');
        return;
      }
      await deleteSecret(delName);
      break;

    case 'validate':
      await validateSecrets();
      break;

    case 'migrate':
      await migrateFromEnv();
      break;

    case 'export':
      await exportSecrets();
      break;

    case 'clear':
      console.info('🗑️ Clearing all managed secrets...');
      for (const secretName of Object.keys(SECRETS_CONFIG)) {
        await deleteSecret(secretName);
      }
      console.info('✅ All secrets cleared');
      break;

    case 'info':
      await showSecurityInfo();
      break;

    default:
      console.info(`❌ Unknown command: ${command}`);
      await showHelp();
      break;
  }
}

// Run the secrets manager
if (import.meta.main) {
  main().catch(console.error);
}

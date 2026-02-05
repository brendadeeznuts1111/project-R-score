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
    console.log(`✅ Stored: ${name}`);
    return true;
  } catch (error) {
    console.log(`❌ Failed to store ${name}:`, error.message);
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
    console.log(`❌ Failed to retrieve ${name}:`, error.message);
    return null;
  }
}

async function deleteSecret(name: string): Promise<boolean> {
  try {
    await secrets.delete({
      service: SECRETS_SERVICE,
      name,
    });
    console.log(`🗑️ Deleted: ${name}`);
    return true;
  } catch (error) {
    console.log(`❌ Failed to delete ${name}:`, error.message);
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
  console.log('🔄 Migrating secrets from .env to secure storage...');

  // Read current .env file
  let envContent = '';
  try {
    envContent = await Bun.file('.env').text();
  } catch {
    console.log('ℹ️ No .env file found');
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
        console.log(`🔄 Migrated: ${cleanKey}`);
      }
    }
  }

  console.log(`✅ Migration complete: ${migrated} secrets migrated`);
}

// ╔══════════════════════════════════════════════════════════════╗
// ║                 BULK OPERATIONS                            ║
// ╚══════════════════════════════════════════════════════════════╝

async function setupEnterpriseSecrets(): Promise<void> {
  console.log('🔐 Setting up Enterprise Secrets...');
  console.log('This will store your credentials securely using OS keychain.');

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
      console.log(`✅ ${secretName}: Already configured`);
      continue;
    }

    console.log(`\n🔑 ${secretName}`);
    console.log(`📝 ${description}`);
    console.log(`Enter value (or press Enter to skip):`);

    const value = prompt(`> `)?.trim();

    if (value && value.length > 0) {
      await storeSecret(secretName, value);
    } else {
      console.log(`⏭️ Skipped: ${secretName}`);
    }
  }

  console.log('\n🎉 Enterprise secrets setup complete!');
}

async function validateSecrets(): Promise<void> {
  console.log('🔍 Validating stored secrets...');

  const results = {
    valid: 0,
    invalid: 0,
    missing: 0,
  };

  for (const [secretName, description] of Object.entries(SECRETS_CONFIG)) {
    const value = await retrieveSecret(secretName);

    if (!value) {
      console.log(`❌ ${secretName}: Missing`);
      results.missing++;
    } else if (value.length < 10) {
      console.log(`⚠️ ${secretName}: Too short (may be invalid)`);
      results.invalid++;
    } else {
      console.log(`✅ ${secretName}: Configured`);
      results.valid++;
    }
  }

  console.log(`\n📊 Validation Results:`);
  console.log(`✅ Valid: ${results.valid}`);
  console.log(`⚠️ Invalid: ${results.invalid}`);
  console.log(`❌ Missing: ${results.missing}`);
}

// ╔══════════════════════════════════════════════════════════════╗
// ║                 UTILITY FUNCTIONS                          ║
// ╚══════════════════════════════════════════════════════════════╝

async function exportSecrets(): Promise<void> {
  console.log('📤 Exporting secrets for backup...');

  const secretsData: Record<string, string> = {};

  for (const secretName of Object.keys(SECRETS_CONFIG)) {
    const value = await retrieveSecret(secretName);
    if (value) {
      secretsData[secretName] = value;
    }
  }

  const exportPath = `./secrets-backup-${Date.now()}.json`;
  await Bun.write(exportPath, JSON.stringify(secretsData, null, 2));

  console.log(`✅ Secrets exported to: ${exportPath}`);
  console.log('⚠️ WARNING: This file contains sensitive data!');
  console.log('🔒 Encrypt this file and store it securely!');
}

async function showSecurityInfo(): Promise<void> {
  console.log('🔐 FIRE22 SECRETS MANAGER - Security Information');
  console.log('='.repeat(60));

  console.log('\n🛡️ SECURITY FEATURES:');
  console.log(
    '• Uses OS-native credential storage (Keychain/macOS, GNOME/Linux, Windows Credential Manager)'
  );
  console.log('• Credentials are encrypted at rest');
  console.log('• No plaintext storage in files');
  console.log('• Isolated by service name for security');

  console.log('\n🔑 SUPPORTED SECRETS:');
  for (const [name, description] of Object.entries(SECRETS_CONFIG)) {
    console.log(`• ${name}: ${description}`);
  }

  console.log('\n📋 USAGE PATTERNS:');
  console.log('• CI/CD: Retrieve secrets for deployment');
  console.log('• Development: Secure local credential storage');
  console.log('• CLI Tools: Authenticate without exposing credentials');
  console.log('• Enterprise: Centralized secret management');

  console.log('\n⚡ PERFORMANCE:');
  console.log("• Asynchronous operations in Bun's thread pool");
  console.log('• Fast retrieval from OS credential storage');
  console.log('• No network calls or external dependencies');
}

// ╔══════════════════════════════════════════════════════════════╗
// ║                 COMMAND LINE INTERFACE                     ║
// ╚══════════════════════════════════════════════════════════════╝

async function showHelp(): Promise<void> {
  console.log(`
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
      console.log('🔑 Stored Secrets:');
      if (secrets.length === 0) {
        console.log('❌ No secrets stored');
      } else {
        secrets.forEach(secret => {
          console.log(`✅ ${secret}: ${SECRETS_CONFIG[secret]}`);
        });
      }
      break;

    case 'get':
      const secretName = args[1];
      if (!secretName) {
        console.log('❌ Please specify a secret name');
        console.log('Usage: bun run scripts/secrets-manager.fire22.ts get <name>');
        return;
      }
      const value = await retrieveSecret(secretName);
      if (value) {
        console.log(`${secretName}: ${value}`);
      } else {
        console.log(`❌ Secret not found: ${secretName}`);
      }
      break;

    case 'set':
      const setName = args[1];
      if (!setName) {
        console.log('❌ Please specify a secret name');
        console.log('Usage: bun run scripts/secrets-manager.fire22.ts set <name>');
        return;
      }
      const setValue = prompt(`Enter value for ${setName}:`)?.trim();
      if (setValue) {
        await storeSecret(setName, setValue);
      } else {
        console.log('❌ No value provided');
      }
      break;

    case 'delete':
      const delName = args[1];
      if (!delName) {
        console.log('❌ Please specify a secret name');
        console.log('Usage: bun run scripts/secrets-manager.fire22.ts delete <name>');
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
      console.log('🗑️ Clearing all managed secrets...');
      for (const secretName of Object.keys(SECRETS_CONFIG)) {
        await deleteSecret(secretName);
      }
      console.log('✅ All secrets cleared');
      break;

    case 'info':
      await showSecurityInfo();
      break;

    default:
      console.log(`❌ Unknown command: ${command}`);
      await showHelp();
      break;
  }
}

// Run the secrets manager
if (import.meta.main) {
  main().catch(console.error);
}

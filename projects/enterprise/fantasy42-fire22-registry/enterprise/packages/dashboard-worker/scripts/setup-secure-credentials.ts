#!/usr/bin/env bun

/**
 * Secure Credentials Setup for Fire22 Dashboard
 * Uses Bun.secrets for native OS credential storage
 */

import { secrets } from 'bun';
import { prompt } from './utils/prompt';

const SERVICE_NAME = 'fire22-dashboard';

interface Credential {
  name: string;
  description: string;
  required: boolean;
  sensitive: boolean;
}

const CREDENTIALS: Credential[] = [
  {
    name: 'jwt-secret',
    description: 'JWT signing secret (min 32 chars)',
    required: true,
    sensitive: true,
  },
  {
    name: 'fire22-api-token',
    description: 'Fire22 API authentication token',
    required: true,
    sensitive: true,
  },
  {
    name: 'admin-password',
    description: 'Admin dashboard password',
    required: true,
    sensitive: true,
  },
  {
    name: 'bot-token',
    description: 'Telegram bot token',
    required: false,
    sensitive: true,
  },
  {
    name: 'stripe-secret-key',
    description: 'Stripe API secret key',
    required: false,
    sensitive: true,
  },
  {
    name: 'sendgrid-api-key',
    description: 'SendGrid API key',
    required: false,
    sensitive: true,
  },
  {
    name: 'fire22-webhook-secret',
    description: 'Fire22 webhook secret',
    required: false,
    sensitive: true,
  },
];

async function setupCredentials() {
  console.log(`
╔════════════════════════════════════════════════════════╗
║        Fire22 Secure Credentials Setup                ║
║                                                        ║
║  This will securely store credentials using your OS's ║
║  native credential manager (Keychain/Keyring/Windows) ║
╚════════════════════════════════════════════════════════╝
`);

  const mode = await prompt(
    'Select mode: (1) Setup new credentials (2) View existing (3) Update specific (4) Delete all: '
  );

  switch (mode) {
    case '1':
      await setupNewCredentials();
      break;
    case '2':
      await viewExistingCredentials();
      break;
    case '3':
      await updateSpecificCredential();
      break;
    case '4':
      await deleteAllCredentials();
      break;
    default:
      console.error('Invalid option');
  }
}

async function setupNewCredentials() {
  console.log('\n📝 Setting up new credentials...\n');

  for (const cred of CREDENTIALS) {
    const existing = await secrets.get({
      service: SERVICE_NAME,
      name: cred.name,
    });

    if (existing) {
      const overwrite = await prompt(`${cred.name} already exists. Overwrite? (y/n): `);
      if (overwrite.toLowerCase() !== 'y') {
        continue;
      }
    }

    const value = await prompt(
      `Enter ${cred.description}${cred.required ? ' (required)' : ' (optional, press Enter to skip)'}: `,
      cred.sensitive
    );

    if (value || cred.required) {
      if (!value && cred.required) {
        console.error(`❌ ${cred.name} is required!`);
        process.exit(1);
      }

      try {
        await secrets.set({
          service: SERVICE_NAME,
          name: cred.name,
          value: value,
        });
        console.log(`✅ ${cred.name} stored securely`);
      } catch (error) {
        console.error(`❌ Failed to store ${cred.name}:`, error);
      }
    }
  }

  console.log('\n✨ Credentials setup complete!');
}

async function viewExistingCredentials() {
  console.log('\n📋 Checking existing credentials...\n');

  for (const cred of CREDENTIALS) {
    try {
      const value = await secrets.get({
        service: SERVICE_NAME,
        name: cred.name,
      });

      if (value) {
        // Show only first/last few characters for security
        const masked =
          value.length > 8
            ? `${value.substring(0, 4)}...${value.substring(value.length - 4)}`
            : '****';
        console.log(`✅ ${cred.name}: ${masked}`);
      } else {
        console.log(`⚠️  ${cred.name}: Not set`);
      }
    } catch (error) {
      console.log(`❌ ${cred.name}: Error reading`);
    }
  }
}

async function updateSpecificCredential() {
  console.log('\n🔄 Update specific credential\n');

  CREDENTIALS.forEach((cred, index) => {
    console.log(`${index + 1}. ${cred.name} - ${cred.description}`);
  });

  const choice = await prompt('\nSelect credential to update (number): ');
  const index = parseInt(choice) - 1;

  if (index >= 0 && index < CREDENTIALS.length) {
    const cred = CREDENTIALS[index];
    const value = await prompt(`Enter new value for ${cred.name}: `, cred.sensitive);

    if (value) {
      try {
        await secrets.set({
          service: SERVICE_NAME,
          name: cred.name,
          value: value,
        });
        console.log(`✅ ${cred.name} updated successfully`);
      } catch (error) {
        console.error(`❌ Failed to update ${cred.name}:`, error);
      }
    }
  } else {
    console.error('Invalid selection');
  }
}

async function deleteAllCredentials() {
  const confirm = await prompt(
    "⚠️  Are you sure you want to delete ALL credentials? Type 'DELETE' to confirm: "
  );

  if (confirm === 'DELETE') {
    for (const cred of CREDENTIALS) {
      try {
        await secrets.delete({
          service: SERVICE_NAME,
          name: cred.name,
        });
        console.log(`🗑️  Deleted ${cred.name}`);
      } catch (error) {
        console.log(`⚠️  Could not delete ${cred.name} (may not exist)`);
      }
    }
    console.log('\n✨ All credentials deleted');
  } else {
    console.log('Deletion cancelled');
  }
}

// Export functions for use in other scripts
export async function getSecureCredential(name: string): Promise<string | null> {
  try {
    return await secrets.get({
      service: SERVICE_NAME,
      name: name,
    });
  } catch (error) {
    console.error(`Failed to retrieve ${name}:`, error);
    return null;
  }
}

export async function setSecureCredential(name: string, value: string): Promise<boolean> {
  try {
    await secrets.set({
      service: SERVICE_NAME,
      name: name,
      value: value,
    });
    return true;
  } catch (error) {
    console.error(`Failed to store ${name}:`, error);
    return false;
  }
}

// Create prompt utility if it doesn't exist
async function createPromptUtil() {
  const utilsDir = './utils';
  const promptFile = `${utilsDir}/prompt.ts`;

  if (!require('fs').existsSync(utilsDir)) {
    require('fs').mkdirSync(utilsDir, { recursive: true });
  }

  if (!require('fs').existsSync(promptFile)) {
    require('fs').writeFileSync(
      promptFile,
      `
export async function prompt(message: string, sensitive = false): Promise<string> {
  process.stdout.write(message);
  
  for await (const line of console) {
    return line;
  }
  
  return "";
}
`
    );
  }
}

// Run setup if called directly
if (import.meta.main) {
  await createPromptUtil();
  setupCredentials().catch(console.error);
}

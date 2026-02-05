import { configManager } from './secure-config';

// Simple prompt implementation since Bun doesn't have built-in prompt
async function promptQuestion(question: string, isPassword = false): Promise<string> {
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

async function setupSecureConfig() {
  console.log('🔐 Fire22 Secure Configuration Setup\n');

  const BOT_TOKEN = await promptQuestion('Enter your Telegram Bot Token: ');
  const CASHIER_BOT_TOKEN = await promptQuestion('Enter your Cashier Bot Token: ');
  const ADMIN_USERNAME =
    (await promptQuestion('Enter admin username (default: admin): ')) || 'admin';
  const ADMIN_PASSWORD = await promptQuestion('Enter admin password: ');

  const config = {
    BOT_TOKEN,
    CASHIER_BOT_TOKEN,
    ADMIN_USERNAME,
    ADMIN_PASSWORD,
  };

  await configManager.setConfig(config);
  console.log('\n✅ Configuration securely stored using Bun.secrets');
}

// Run setup if this script is executed directly
if (import.meta.main) {
  setupSecureConfig().catch(console.error);
}

// scripts/dashboard-config-store.ts - Dashboard Config Store CLI
// Store dashboard config with interpolation and vault sync

import { file, YAML } from 'bun';
import { unifiedRegistry } from '../src/api/services/unified-registry';

const args = process.argv.slice(2);

interface StoreOptions {
  filePath: string;
  interpolate: boolean;
  vaultSync: boolean;
}

async function interpolateConfig(content: string): Promise<string> {
  // Replace ${VAR} with environment variables
  return content.replace(/\$\{([^}]+)\}/g, (match, varName) => {
    return process.env[varName] || match;
  });
}

async function syncToVault(secrets: Record<string, string>): Promise<void> {
  // TODO: Implement actual vault sync with Bun.secrets or external vault
  console.info(`🔐 Syncing ${Object.keys(secrets).length} secrets to vault...`);
  
  // Extract secrets from config (keys containing 'password', 'secret', 'key', 'token')
  const secretKeys = Object.keys(secrets).filter(key => 
    /password|secret|key|token|api/i.test(key)
  );
  
  if (secretKeys.length > 0) {
    console.info(`   Found ${secretKeys.length} secret keys: ${secretKeys.join(', ')}`);
    // In production, this would sync to actual vault
  }
}

async function storeConfig(options: StoreOptions): Promise<void> {
  console.info(`📦 Storing dashboard config: ${options.filePath}`);
  console.info(`   Interpolate: ${options.interpolate ? '✅' : '❌'}`);
  console.info(`   Vault Sync: ${options.vaultSync ? '✅' : '❌'}`);

  try {
    // Read file
    const content = await file(options.filePath).text();
    
    // Interpolate environment variables if requested
    let processedContent = content;
    if (options.interpolate) {
      processedContent = await interpolateConfig(content);
      console.info('✅ Environment variables interpolated');
    }

    // Parse YAML to extract secrets for vault sync
    let secrets: Record<string, string> = {};
    if (options.vaultSync) {
      try {
        const parsed = YAML.parse(processedContent);
        // Extract nested secrets
        const extractSecrets = (obj: any, prefix = ''): void => {
          for (const [key, value] of Object.entries(obj)) {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            if (typeof value === 'object' && value !== null) {
              extractSecrets(value, fullKey);
            } else if (typeof value === 'string' && /password|secret|key|token|api/i.test(key)) {
              secrets[fullKey] = value;
            }
          }
        };
        extractSecrets(parsed);
      } catch (error) {
        console.warn('⚠️  Could not parse YAML for vault sync:', error.message);
      }
    }

    // Store using unified registry
    const hash = Bun.hash(new TextEncoder().encode(processedContent));
    const hashHex = typeof hash === 'bigint' ? hash.toString(16) : hash.toString(16);
    const shortHash = hashHex.substring(0, 8);
    
    const path = `configs/dashboard-${shortHash}.yaml`;
    await Bun.write(path, processedContent);
    
    console.info(`\n✅ Config stored:`);
    console.info(`   Hash: ${shortHash}`);
    console.info(`   Path: ${path}`);
    console.info(`   Size: ${processedContent.length} bytes`);

    // Sync to vault if requested
    if (options.vaultSync && Object.keys(secrets).length > 0) {
      await syncToVault(secrets);
    }

    console.info(`\n💡 Retrieval:`);
    console.info(`   bun run dashboard:config-get --hash=${shortHash}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Parse arguments
function parseArgs(): StoreOptions {
  const filePath = args.find(arg => !arg.startsWith('--')) || args[0];
  
  if (!filePath) {
    console.error('❌ Error: File path required');
    console.error('Usage: bun run dashboard:config-store <file> [--interpolate] [--vault-sync]');
    process.exit(1);
  }

  return {
    filePath,
    interpolate: args.includes('--interpolate'),
    vaultSync: args.includes('--vault-sync')
  };
}

if (import.meta.main) {
  const options = parseArgs();
  storeConfig(options);
}


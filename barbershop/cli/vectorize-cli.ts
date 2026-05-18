#!/usr/bin/env bun
/**
 * Vectorize CLI Tool
 * ==================
 * Command-line interface for Cloudflare Vectorize operations with Bun.secrets integration
 *
 * @version 1.0.0
 * Build: bun build --compile --minify ./cli/vectorize-cli.ts --outfile vectorize
 */

import { Database } from 'bun:sqlite';
import { vectorizeClient } from '../src/core/vectorize-client';
import {
  deleteSecret as deleteManagedSecret,
  getSecret as getManagedSecret,
  setSecret as setManagedSecret,
} from '../lib/cloudflare/bun-secrets-adapter';

const VERSION = '1.0.0';
// Use UTI format for service name (best practice for CLI tools)
// See: https://bun.com/docs/runtime/secrets#best-practices
const CF_SERVICE = 'com.barbershop.vectorize';
const TOKEN_NAME = 'api_token';
const ACCOUNT_ID_NAME = 'account_id';

// Colors for terminal output
const c = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightRed: '\x1b[91m',
  brightCyan: '\x1b[96m',
};

const color = (text: string, code: keyof typeof c) => `${c[code]}${text}${c.reset}`;

// CLI option parsing
interface ParsedArgs {
  command: string;
  subcommand: string;
  positional: string[];
  flags: Record<string, string | boolean>;
}

function parseArgs(argv: string[]): ParsedArgs {
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      if (value !== undefined) {
        flags[key] = value;
      } else if (argv[i + 1] && !argv[i + 1].startsWith('-')) {
        flags[key] = argv[++i];
      } else {
        flags[key] = true;
      }
    } else if (arg.startsWith('-')) {
      flags[arg.slice(1)] = true;
    } else {
      positional.push(arg);
    }
  }

  return {
    command: positional[0] || '',
    subcommand: positional[1] || '',
    positional: positional.slice(2),
    flags,
  };
}

function header() {
  console.info(color(`\n🔍 Vectorize CLI v${VERSION}`, 'brightCyan'));
  console.info(color('═══════════════════════════════════════════', 'dim'));
}

function showHelp() {
  header();
  console.info(`
${color('Usage:', 'bright')} vectorize <command> [subcommand] [options]

${color('Secrets Management:', 'bright')}
  ${color('secrets set-token <token>', 'cyan')}        Store API token in Bun.secrets
  ${color('secrets set-account-id <id>', 'cyan')}      Store account ID in Bun.secrets
  ${color('secrets get-token', 'cyan')}                Get API token from Bun.secrets
  ${color('secrets get-account-id', 'cyan')}           Get account ID from Bun.secrets
  ${color('secrets delete-token', 'cyan')}             Delete API token from Bun.secrets
  ${color('secrets delete-account-id', 'cyan')}         Delete account ID from Bun.secrets
  ${color('secrets migrate', 'cyan')}                   Migrate secrets from old to new service name
  ${color('secrets status', 'cyan')}                  Check secrets configuration

${color('Index Management:', 'bright')}
  ${color('indexes list', 'cyan')}                    List all Vectorize indexes
  ${color('indexes create <name>', 'cyan')}            Create a new index
  ${color('indexes delete <name>', 'cyan')}            Delete an index
  ${color('indexes info <name>', 'cyan')}              Show index details

${color('Metadata Indexes:', 'bright')}
  ${color('metadata create <index> <property> <type>', 'cyan')}  Create metadata index
  ${color('metadata list <index>', 'cyan')}           List metadata indexes for an index

${color('Indexing Operations:', 'bright')}
  ${color('index barbers', 'cyan')}                    Index all barbers from database
  ${color('index customers', 'cyan')}                  Index all customers from database
  ${color('index documents', 'cyan')}                  Index knowledge base documents
  ${color('index all', 'cyan')}                        Index all (barbers + customers + docs)

${color('Search Operations:', 'bright')}
  ${color('search barbers <query>', 'cyan')}           Search barbers semantically
  ${color('search customers <query>', 'cyan')}        Search customers semantically
  ${color('search docs <query>', 'cyan')}             Search knowledge base documents

${color('Matching Operations:', 'bright')}
  ${color('match customer <customerId>', 'cyan')}      Match barbers to customer preferences

${color('Setup:', 'bright')}
  ${color('setup', 'cyan')}                            Run full setup (indexes + metadata)
  ${color('setup-indexes', 'cyan')}                   Create all indexes
  ${color('setup-metadata', 'cyan')}                   Create all metadata indexes

${color('Options:', 'bright')}
  ${color('--db-path <path>', 'yellow')}              Database path (default: ./barbershop.db)
  ${color('--worker-url <url>', 'yellow')}            Vectorize worker URL
  ${color('--enabled', 'yellow')}                     Enable Vectorize (default: check env)
  ${color('--limit <n>', 'yellow')}                    Limit results (default: 10)
  ${color('--verbose, -v', 'yellow')}                 Verbose output
  ${color('--help, -h', 'yellow')}                    Show this help

${color('Examples:', 'bright')}
  ${color('vectorize secrets set-token YOUR_TOKEN', 'dim')}
  ${color('vectorize setup', 'dim')}
  ${color('vectorize index barbers', 'dim')}
  ${color('vectorize search barbers "fade specialist"', 'dim')}
  ${color('vectorize match customer cust_001', 'dim')}
`);
}

/**
 * Get secret from Bun.secrets or environment
 */
async function getSecret(service: string, name: string): Promise<string | undefined> {
  const value = await getManagedSecret({
    service,
    name,
    legacyServices: service === CF_SERVICE ? ['cloudflare'] : [],
  });
  return value ?? undefined;
}

/**
 * Store secret in Bun.secrets
 */
async function setSecret(service: string, name: string, value: string): Promise<void> {
  try {
    await setManagedSecret({ service, name, value });
    console.info(color(`✅ Stored ${name} in Bun.secrets (${service})`, 'green'));
  } catch (error: any) {
    const envVarMap: Record<string, string> = {
      'com.barbershop.vectorize:api_token': 'CLOUDFLARE_API_TOKEN',
      'com.barbershop.vectorize:account_id': 'CLOUDFLARE_ACCOUNT_ID',
      'cloudflare:api_token': 'CLOUDFLARE_API_TOKEN',
      'cloudflare:account_id': 'CLOUDFLARE_ACCOUNT_ID',
    };
    const envVar = envVarMap[`${service}:${name}`];
    if (!envVar) throw error;
    Bun.env[envVar] = value;
    console.info(color(`⚠️  Bun.secrets unavailable (${error.message}); set ${envVar} for this process`, 'yellow'));
  }
}

/**
 * Secrets management commands
 */
async function handleSecrets(args: ParsedArgs) {
  const { subcommand, positional } = args;

  switch (subcommand) {
    case 'set-token': {
      const token = positional[0];
      if (!token) {
        console.error(color('❌ Token required', 'red'));
        console.info(color('Usage: vectorize secrets set-token <token>', 'dim'));
        process.exit(1);
      }
      await setSecret(CF_SERVICE, TOKEN_NAME, token);
      break;
    }

    case 'set-account-id': {
      const accountId = positional[0];
      if (!accountId) {
        console.error(color('❌ Account ID required', 'red'));
        console.info(color('Usage: vectorize secrets set-account-id <id>', 'dim'));
        process.exit(1);
      }
      await setSecret(CF_SERVICE, ACCOUNT_ID_NAME, accountId);
      break;
    }

    case 'get-token': {
      const token = await getSecret(CF_SERVICE, TOKEN_NAME);
      if (token) {
        console.info(color('✅ Token found:', 'green'));
        console.info(`   ${token.substring(0, 10)}...${token.substring(token.length - 4)}`);
      } else {
        console.info(color('❌ Token not found', 'red'));
        console.info(color('   Set it with: vectorize secrets set-token <token>', 'dim'));
      }
      break;
    }

    case 'get-account-id': {
      const accountId = await getSecret(CF_SERVICE, ACCOUNT_ID_NAME);
      if (accountId) {
        console.info(color('✅ Account ID found:', 'green'));
        console.info(`   ${accountId}`);
      } else {
        console.info(color('❌ Account ID not found', 'red'));
        console.info(color('   Set it with: vectorize secrets set-account-id <id>', 'dim'));
      }
      break;
    }

    case 'delete-token': {
      try {
        const deleted = await deleteManagedSecret({ service: CF_SERVICE, name: TOKEN_NAME });
        if (deleted) {
          console.info(color('✅ Token deleted from Bun.secrets', 'green'));
        } else {
          console.info(color('⚠️  Token not found in Bun.secrets', 'yellow'));
        }
      } catch (error: any) {
        console.error(color(`❌ Failed to delete token: ${error.message}`, 'red'));
        process.exit(1);
      }
      break;
    }

    case 'delete-account-id': {
      try {
        const deleted = await deleteManagedSecret({ service: CF_SERVICE, name: ACCOUNT_ID_NAME });
        if (deleted) {
          console.info(color('✅ Account ID deleted from Bun.secrets', 'green'));
        } else {
          console.info(color('⚠️  Account ID not found in Bun.secrets', 'yellow'));
        }
      } catch (error: any) {
        console.error(color(`❌ Failed to delete account ID: ${error.message}`, 'red'));
        process.exit(1);
      }
      break;
    }

    case 'migrate': {
      console.info(color('🔄 Migrating secrets to new service name...', 'cyan'));
      console.info(color('   Old: cloudflare', 'dim'));
      console.info(color('   New: com.barbershop.vectorize', 'dim'));
      console.info('');

      let migrated = 0;
      let skipped = 0;

      // Migrate API token
      try {
        const oldToken = await getManagedSecret({ service: 'cloudflare', name: TOKEN_NAME, legacyServices: [] });
        if (oldToken) {
          const newToken = await getManagedSecret({ service: CF_SERVICE, name: TOKEN_NAME, legacyServices: [] });
          if (!newToken) {
            await setManagedSecret({ service: CF_SERVICE, name: TOKEN_NAME, value: oldToken });
            console.info(color('  ✅ Migrated API token', 'green'));
            migrated++;
          } else {
            console.info(color('  ⏭️  API token already exists in new location', 'yellow'));
            skipped++;
          }
        } else {
          console.info(color('  ⏭️  No API token found in old location', 'dim'));
          skipped++;
        }
      } catch (error: any) {
        console.info(color(`  ⚠️  Could not migrate API token: ${error.message}`, 'yellow'));
      }

      // Migrate Account ID
      try {
        const oldAccountId = await getManagedSecret({ service: 'cloudflare', name: ACCOUNT_ID_NAME, legacyServices: [] });
        if (oldAccountId) {
          const newAccountId = await getManagedSecret({ service: CF_SERVICE, name: ACCOUNT_ID_NAME, legacyServices: [] });
          if (!newAccountId) {
            await setManagedSecret({ service: CF_SERVICE, name: ACCOUNT_ID_NAME, value: oldAccountId });
            console.info(color('  ✅ Migrated Account ID', 'green'));
            migrated++;
          } else {
            console.info(color('  ⏭️  Account ID already exists in new location', 'yellow'));
            skipped++;
          }
        } else {
          console.info(color('  ⏭️  No Account ID found in old location', 'dim'));
          skipped++;
        }
      } catch (error: any) {
        console.info(color(`  ⚠️  Could not migrate Account ID: ${error.message}`, 'yellow'));
      }

      console.info('');
      if (migrated > 0) {
        console.info(color(`✅ Migration complete! Migrated ${migrated} secret(s)`, 'green'));
        console.info(color('   Old secrets remain for backward compatibility', 'dim'));
        console.info(color('   You can delete them with: vectorize secrets delete-token (old)', 'dim'));
      } else if (skipped > 0) {
        console.info(color('ℹ️  No migration needed - secrets already in new location or not found', 'cyan'));
      }
      break;
    }

    case 'status': {
      console.info(color('\n📋 Secrets Status:', 'bright'));
      const token = await getSecret(CF_SERVICE, TOKEN_NAME);
      const accountId = await getSecret(CF_SERVICE, ACCOUNT_ID_NAME);

      console.info(`\n${color('API Token:', 'cyan')}`);
      if (token) {
        console.info(color('  ✅ Found', 'green'));
        console.info(`  Length: ${token.length} characters`);
        console.info(`  Preview: ${token.substring(0, 10)}...${token.substring(token.length - 4)}`);
      } else {
        console.info(color('  ❌ Not found', 'red'));
        console.info(color('  Set with: vectorize secrets set-token <token>', 'dim'));
      }

      console.info(`\n${color('Account ID:', 'cyan')}`);
      if (accountId) {
        console.info(color('  ✅ Found', 'green'));
        console.info(`  Value: ${accountId}`);
      } else {
        console.info(color('  ❌ Not found', 'red'));
        console.info(color('  Set with: vectorize secrets set-account-id <id>', 'dim'));
      }

      // Check Vectorize availability
      console.info(`\n${color('Vectorize Status:', 'cyan')}`);
      const available = await vectorizeClient.isAvailable();
      if (available) {
        console.info(color('  ✅ Vectorize is available', 'green'));
      } else {
        console.info(color('  ❌ Vectorize is not available', 'red'));
        console.info(color('  Check VECTORIZE_WORKER_URL and VECTORIZE_ENABLED', 'dim'));
      }
      break;
    }

    default:
      console.error(color(`❌ Unknown secrets command: ${subcommand}`, 'red'));
      console.info(color('Available: set-token, set-account-id, get-token, get-account-id, status', 'dim'));
      process.exit(1);
  }
}

/**
 * Index management commands (via wrangler)
 */
async function handleIndexes(args: ParsedArgs) {
  const { subcommand, positional } = args;
  const token = await getSecret(CF_SERVICE, TOKEN_NAME);

  if (!token) {
    console.error(color('❌ API token not found. Set it with: vectorize secrets set-token <token>', 'red'));
    process.exit(1);
  }

  // Set token for wrangler
  Bun.env.CLOUDFLARE_API_TOKEN = token;

  switch (subcommand) {
    case 'list': {
      const { execSync } = await import('child_process');
      try {
        const output = execSync('bunx wrangler vectorize list', { encoding: 'utf-8', stdio: 'inherit' });
      } catch (error) {
        process.exit(1);
      }
      break;
    }

    case 'create': {
      const indexName = positional[0];
      if (!indexName) {
        console.error(color('❌ Index name required', 'red'));
        process.exit(1);
      }
      const { execSync } = await import('child_process');
      try {
        execSync(`bunx wrangler vectorize create ${indexName} --dimensions=768 --metric=cosine`, {
          encoding: 'utf-8',
          stdio: 'inherit',
        });
        console.info(color(`✅ Created index: ${indexName}`, 'green'));
      } catch (error) {
        process.exit(1);
      }
      break;
    }

    case 'delete': {
      const indexName = positional[0];
      if (!indexName) {
        console.error(color('❌ Index name required', 'red'));
        process.exit(1);
      }
      console.info(color(`⚠️  Deleting index: ${indexName}`, 'yellow'));
      const { execSync } = await import('child_process');
      try {
        execSync(`bunx wrangler vectorize delete ${indexName}`, { encoding: 'utf-8', stdio: 'inherit' });
        console.info(color(`✅ Deleted index: ${indexName}`, 'green'));
      } catch (error) {
        process.exit(1);
      }
      break;
    }

    case 'info': {
      const indexName = positional[0];
      if (!indexName) {
        console.error(color('❌ Index name required', 'red'));
        process.exit(1);
      }
      const { execSync } = await import('child_process');
      try {
        execSync(`bunx wrangler vectorize describe ${indexName}`, { encoding: 'utf-8', stdio: 'inherit' });
      } catch (error) {
        process.exit(1);
      }
      break;
    }

    default:
      console.error(color(`❌ Unknown indexes command: ${subcommand}`, 'red'));
      console.info(color('Available: list, create, delete, info', 'dim'));
      process.exit(1);
  }
}

/**
 * Metadata index management
 */
async function handleMetadata(args: ParsedArgs) {
  const { subcommand, positional } = args;
  const token = await getSecret(CF_SERVICE, TOKEN_NAME);

  if (!token) {
    console.error(color('❌ API token not found', 'red'));
    process.exit(1);
  }

  Bun.env.CLOUDFLARE_API_TOKEN = token;
  const { execSync } = await import('child_process');

  switch (subcommand) {
    case 'create': {
      const [indexName, propertyName, propertyType] = positional;
      if (!indexName || !propertyName || !propertyType) {
        console.error(color('❌ Usage: vectorize metadata create <index> <property> <type>', 'red'));
        process.exit(1);
      }
      try {
        execSync(
          `bunx wrangler vectorize create-metadata-index ${indexName} --property-name=${propertyName} --type=${propertyType}`,
          { encoding: 'utf-8', stdio: 'inherit' }
        );
        console.info(color(`✅ Created metadata index: ${indexName}.${propertyName}`, 'green'));
      } catch (error) {
        process.exit(1);
      }
      break;
    }

    case 'list': {
      const indexName = positional[0];
      if (!indexName) {
        console.error(color('❌ Index name required', 'red'));
        process.exit(1);
      }
      console.info(color(`📋 Metadata indexes for ${indexName}:`, 'cyan'));
      // Note: wrangler doesn't have a direct list-metadata-indexes command
      // We can describe the index to see metadata indexes
      try {
        execSync(`bunx wrangler vectorize describe ${indexName}`, { encoding: 'utf-8', stdio: 'inherit' });
      } catch (error) {
        process.exit(1);
      }
      break;
    }

    default:
      console.error(color(`❌ Unknown metadata command: ${subcommand}`, 'red'));
      console.info(color('Available: create, list', 'dim'));
      process.exit(1);
  }
}

/**
 * Indexing operations
 */
async function handleIndex(args: ParsedArgs) {
  const { subcommand, flags } = args;
  const dbPath = (flags['db-path'] as string) || './barbershop.db';

  switch (subcommand) {
    case 'barbers': {
      console.info(color('🔍 Indexing barbers...', 'cyan'));
      const available = await vectorizeClient.isAvailable();
      if (!available) {
        console.error(color('❌ Vectorize is not available', 'red'));
        process.exit(1);
      }

      const db = new Database(dbPath);
      try {
        const barbers = db.query('SELECT id, name, skills, status FROM barbers').all() as Array<{
          id: string;
          name: string;
          skills: string | null;
          status: string;
        }>;

        console.info(color(`Found ${barbers.length} barbers`, 'dim'));

        let successCount = 0;
        for (const barber of barbers) {
          try {
            const skills = barber.skills ? barber.skills.split(',').map(s => s.trim()).filter(Boolean) : [];
            if (skills.length > 0) {
              await vectorizeClient.indexBarber({
                id: barber.id,
                name: barber.name,
                skills,
                status: barber.status,
              });
              successCount++;
              console.info(color(`  ✅ ${barber.name}`, 'green'));
            }
          } catch (error: any) {
            console.error(color(`  ❌ ${barber.name}: ${error.message}`, 'red'));
          }
        }

        console.info(color(`\n✅ Indexed ${successCount}/${barbers.length} barbers`, 'green'));
      } finally {
        db.close();
      }
      break;
    }

    case 'customers': {
      console.info(color('🔍 Indexing customers...', 'cyan'));
      const available = await vectorizeClient.isAvailable();
      if (!available) {
        console.error(color('❌ Vectorize is not available', 'red'));
        process.exit(1);
      }

      const db = new Database(dbPath);
      try {
        const customers = db.query('SELECT id, name, tier, preferredBarber, homeShop, address, zipcode FROM customers').all() as Array<{
          id: string;
          name: string;
          tier: string | null;
          preferredBarber: string | null;
          homeShop: string | null;
          address: string | null;
          zipcode: string | null;
        }>;

        console.info(color(`Found ${customers.length} customers`, 'dim'));

        let successCount = 0;
        for (const customer of customers) {
          try {
            await vectorizeClient.indexCustomer({
              id: customer.id,
              name: customer.name,
              tier: customer.tier || undefined,
              preferredBarber: customer.preferredBarber || undefined,
              homeShop: customer.homeShop || undefined,
              address: customer.address || undefined,
              zipcode: customer.zipcode || undefined,
            });
            successCount++;
            console.info(color(`  ✅ ${customer.name}`, 'green'));
          } catch (error: any) {
            console.error(color(`  ❌ ${customer.name}: ${error.message}`, 'red'));
          }
        }

        console.info(color(`\n✅ Indexed ${successCount}/${customers.length} customers`, 'green'));
      } finally {
        db.close();
      }
      break;
    }

    case 'documents': {
      console.info(color('🔍 Indexing documents...', 'cyan'));
      // Import and run the index-documents script
      const scriptPath = './scripts/vectorize/index-documents.ts';
      try {
        await import(scriptPath);
      } catch (error: any) {
        console.error(color(`❌ Error: ${error.message}`, 'red'));
        process.exit(1);
      }
      break;
    }

    case 'all': {
      console.info(color('🔍 Indexing all data...', 'brightCyan'));
      await handleIndex({ ...args, subcommand: 'barbers' });
      await handleIndex({ ...args, subcommand: 'customers' });
      await handleIndex({ ...args, subcommand: 'documents' });
      console.info(color('\n✅ All indexing complete!', 'green'));
      break;
    }

    default:
      console.error(color(`❌ Unknown index command: ${subcommand}`, 'red'));
      console.info(color('Available: barbers, customers, documents, all', 'dim'));
      process.exit(1);
  }
}

/**
 * Search operations
 */
async function handleSearch(args: ParsedArgs) {
  const { subcommand, positional, flags } = args;
  const query = positional.join(' ');
  const limit = Number(flags.limit) || 10;

  if (!query) {
    console.error(color('❌ Query required', 'red'));
    process.exit(1);
  }

  const available = await vectorizeClient.isAvailable();
  if (!available) {
    console.error(color('❌ Vectorize is not available', 'red'));
    process.exit(1);
  }

  switch (subcommand) {
    case 'barbers': {
      console.info(color(`🔍 Searching barbers: "${query}"`, 'cyan'));
      try {
        const matches = await vectorizeClient.queryBarbers(query, {}, limit);
        console.info(color(`\nFound ${matches.length} matches:\n`, 'bright'));
        matches.forEach((match, i) => {
          console.info(`${i + 1}. ${color(match.metadata?.name || 'Unknown', 'bright')}`);
          console.info(`   ID: ${match.metadata?.barber_id}`);
          console.info(`   Skills: ${match.metadata?.skills || 'N/A'}`);
          console.info(`   Score: ${(match.score * 100).toFixed(1)}%`);
          console.info('');
        });
      } catch (error: any) {
        console.error(color(`❌ Error: ${error.message}`, 'red'));
        process.exit(1);
      }
      break;
    }

    case 'customers': {
      console.info(color(`🔍 Searching customers: "${query}"`, 'cyan'));
      try {
        const matches = await vectorizeClient.queryCustomers(query, {}, limit);
        console.info(color(`\nFound ${matches.length} matches:\n`, 'bright'));
        matches.forEach((match, i) => {
          console.info(`${i + 1}. ${color(match.metadata?.name || 'Unknown', 'bright')}`);
          console.info(`   ID: ${match.metadata?.customer_id}`);
          console.info(`   Tier: ${match.metadata?.tier || 'N/A'}`);
          console.info(`   Home Shop: ${match.metadata?.homeShop || 'N/A'}`);
          console.info(`   Score: ${(match.score * 100).toFixed(1)}%`);
          console.info('');
        });
      } catch (error: any) {
        console.error(color(`❌ Error: ${error.message}`, 'red'));
        process.exit(1);
      }
      break;
    }

    case 'docs': {
      console.info(color(`🔍 Searching documents: "${query}"`, 'cyan'));
      try {
        const matches = await vectorizeClient.queryDocuments(query, limit);
        console.info(color(`\nFound ${matches.length} matches:\n`, 'bright'));
        matches.forEach((match, i) => {
          console.info(`${i + 1}. ${color(match.metadata?.doc_id || 'Unknown', 'bright')}`);
          console.info(`   Topic: ${match.metadata?.topic || 'N/A'}`);
          console.info(`   Section: ${match.metadata?.section || 'N/A'}`);
          console.info(`   Score: ${(match.score * 100).toFixed(1)}%`);
          if (match.metadata?.content) {
            const preview = match.metadata.content.substring(0, 100);
            console.info(`   Preview: ${preview}...`);
          }
          console.info('');
        });
      } catch (error: any) {
        console.error(color(`❌ Error: ${error.message}`, 'red'));
        process.exit(1);
      }
      break;
    }

    default:
      console.error(color(`❌ Unknown search command: ${subcommand}`, 'red'));
      console.info(color('Available: barbers, customers, docs', 'dim'));
      process.exit(1);
  }
}

/**
 * Matching operations
 */
async function handleMatch(args: ParsedArgs) {
  const { subcommand, positional, flags } = args;
  const dbPath = (flags['db-path'] as string) || './barbershop.db';

  switch (subcommand) {
    case 'customer': {
      const customerId = positional[0];
      if (!customerId) {
        console.error(color('❌ Customer ID required', 'red'));
        process.exit(1);
      }

      const db = new Database(dbPath);
      try {
        const customers = db.query('SELECT * FROM customers WHERE id = ?', customerId).all() as Array<any>;
        if (customers.length === 0) {
          console.error(color(`❌ Customer not found: ${customerId}`, 'red'));
          process.exit(1);
        }

        const customer = customers[0];
        console.info(color(`🔍 Matching barbers for customer: ${customer.name}`, 'cyan'));

        // Build query from customer preferences
        const queryParts: string[] = [];
        if (customer.preferredBarber) {
          const preferredBarber = db.query('SELECT name, skills FROM barbers WHERE id = ?', customer.preferredBarber).all() as Array<any>;
          if (preferredBarber.length > 0) {
            queryParts.push(preferredBarber[0].skills || '');
          }
        }
        if (customer.homeShop) queryParts.push(customer.homeShop);
        if (customer.tier) queryParts.push(customer.tier);

        const query = queryParts.filter(Boolean).join(', ') || customer.name;

        const matches = await vectorizeClient.queryBarbers(query, { status: 'active' }, 10);
        const allBarbers = db.query('SELECT * FROM barbers').all() as Array<any>;

        console.info(color(`\nFound ${matches.length} matching barbers:\n`, 'bright'));
        matches.forEach((match, i) => {
          const barberId = match.metadata?.barber_id;
          const barber = allBarbers.find((b: any) => b.id === barberId);
          if (!barber) return;

          let matchReason = 'semantic_match';
          if (customer.preferredBarber === barberId) matchReason = 'preferred_barber';
          else if (customer.homeShop && barber.shop === customer.homeShop) matchReason = 'home_shop';

          console.info(`${i + 1}. ${color(barber.name, 'bright')} (${barber.code})`);
          console.info(`   Skills: ${barber.skills || 'N/A'}`);
          console.info(`   Shop: ${barber.shop || 'N/A'}`);
          console.info(`   Match Reason: ${color(matchReason, 'cyan')}`);
          console.info(`   Similarity: ${(match.score * 100).toFixed(1)}%`);
          console.info('');
        });
      } finally {
        db.close();
      }
      break;
    }

    default:
      console.error(color(`❌ Unknown match command: ${subcommand}`, 'red'));
      console.info(color('Available: customer', 'dim'));
      process.exit(1);
  }
}

/**
 * Setup operations
 */
async function handleSetup(args: ParsedArgs) {
  const { subcommand } = args;
  const token = await getSecret(CF_SERVICE, TOKEN_NAME);

  if (!token) {
    console.error(color('❌ API token not found. Set it with: vectorize secrets set-token <token>', 'red'));
    process.exit(1);
  }

  Bun.env.CLOUDFLARE_API_TOKEN = token;

  switch (subcommand) {
    case 'setup-indexes': {
      console.info(color('🔧 Creating Vectorize indexes...', 'cyan'));
      const { execSync } = await import('child_process');

      const indexes = [
        { name: 'barbershop-barbers-index', metadata: ['barber_id', 'status', 'skill_type'] },
        { name: 'barbershop-docs-index', metadata: ['doc_id', 'section', 'topic'] },
        { name: 'barbershop-customers-index', metadata: ['customer_id', 'tier', 'preferredBarber', 'homeShop'] },
      ];

      for (const index of indexes) {
        try {
          console.info(color(`Creating ${index.name}...`, 'dim'));
          execSync(`bunx wrangler vectorize create ${index.name} --dimensions=768 --metric=cosine`, {
            encoding: 'utf-8',
            stdio: 'pipe',
          });
          console.info(color(`  ✅ Created ${index.name}`, 'green'));

          for (const prop of index.metadata) {
            console.info(color(`  Creating metadata index: ${prop}...`, 'dim'));
            execSync(
              `bunx wrangler vectorize create-metadata-index ${index.name} --property-name=${prop} --type=string`,
              { encoding: 'utf-8', stdio: 'pipe' }
            );
          }
        } catch (error: any) {
          if (error.message.includes('already exists')) {
            console.info(color(`  ⚠️  ${index.name} already exists`, 'yellow'));
          } else {
            console.error(color(`  ❌ Error creating ${index.name}: ${error.message}`, 'red'));
          }
        }
      }

      console.info(color('\n✅ Setup complete!', 'green'));
      break;
    }

    case 'setup-metadata': {
      console.info(color('🔧 Creating metadata indexes...', 'cyan'));
      // This is handled in setup-indexes, but we can add a separate command if needed
      console.info(color('Run "vectorize setup-indexes" to create indexes with metadata', 'dim'));
      break;
    }

    default: {
      // Full setup
      console.info(color('🚀 Running full Vectorize setup...', 'brightCyan'));
      await handleSetup({ ...args, subcommand: 'setup-indexes' });
      console.info(color('\n📋 Next steps:', 'bright'));
      console.info('  1. Deploy worker: bunx wrangler deploy');
      console.info('  2. Set VECTORIZE_WORKER_URL in .env');
      console.info('  3. Set VECTORIZE_ENABLED=true');
      console.info('  4. Index data: vectorize index all');
      break;
    }
  }
}

/**
 * Main CLI handler
 */
async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.flags.help || args.flags.h || !args.command) {
    showHelp();
    return;
  }

  // Load secrets into environment for vectorize-client
  const token = await getSecret(CF_SERVICE, TOKEN_NAME);
  if (token) {
    Bun.env.CLOUDFLARE_API_TOKEN = token;
  }

  const accountId = await getSecret(CF_SERVICE, ACCOUNT_ID_NAME);
  if (accountId) {
    Bun.env.CLOUDFLARE_ACCOUNT_ID = accountId;
  }

  switch (args.command) {
    case 'secrets':
      await handleSecrets(args);
      break;
    case 'indexes':
      await handleIndexes(args);
      break;
    case 'metadata':
      await handleMetadata(args);
      break;
    case 'index':
      await handleIndex(args);
      break;
    case 'search':
      await handleSearch(args);
      break;
    case 'match':
      await handleMatch(args);
      break;
    case 'setup':
    case 'setup-indexes':
    case 'setup-metadata':
      await handleSetup({ ...args, command: 'setup', subcommand: args.command === 'setup' ? 'all' : args.command });
      break;
    default:
      console.error(color(`❌ Unknown command: ${args.command}`, 'red'));
      showHelp();
      process.exit(1);
  }
}

// Run if executed directly
if (import.meta.main) {
  main().catch((error) => {
    console.error(color(`❌ Fatal error: ${error.message}`, 'red'));
    if (process.env.VERBOSE) {
      console.error(error);
    }
    process.exit(1);
  });
}

#!/usr/bin/env bun

// scripts/secret-helper.ts - FactoryWager Secret CLI v5.0
import { SecretManager, SECURITY_LEVELS, SecurityLevel } from '../lib/security/secrets-v5';
import { styled } from '../lib/theme/colors';
import { ReferenceManager } from '../lib/docs/url-builder';
import { BUN_DOCS } from '../lib/docs/url-builder';

// Initialize secret manager
const refs = new ReferenceManager();
const secretManager = new SecretManager(refs);

// CLI interface
const args = Bun.argv.slice(2);
const command = args[0];

// Helper functions
function showHeader() {
  console.info(styled('🔐 FactoryWager Secret Manager v5.0', 'accent'));
  console.info(styled('═══════════════════════════════════════', 'muted'));
}

function showSuccess(message: string) {
  console.info(styled(`✅ ${message}`, 'success'));
}

function showError(message: string) {
  console.info(styled(`❌ ${message}`, 'error'));
}

function showWarning(message: string) {
  console.info(styled(`⚠️ ${message}`, 'warning'));
}

function showInfo(message: string) {
  console.info(styled(`ℹ️ ${message}`, 'primary'));
}

// Mask secret value for display
function maskSecret(value: string): string {
  if (value.length <= 8) {
    return '[REDACTED]';
  }
  return `${value.substring(0, 4)}${'*'.repeat(value.length - 8)}${value.substring(value.length - 4)}`;
}

// Show secret with color coding
function showSecret(key: string, value: string, level: SecurityLevel) {
  const config = SECURITY_LEVELS[level];
  const masked = maskSecret(value);

  console.info(styled(`🔑 ${key}`, config.color));
  console.info(styled(`   Level: ${level}`, 'muted'));
  console.info(styled(`   Value: ${masked}`, 'primary'));
  console.info(styled(`   Length: ${value.length} chars`, 'dim'));
  console.info(styled(`   TTL: ${config.ttl}s`, 'dim'));
  console.info(styled(`   Cached: ${config.cache ? 'Yes' : 'No'}`, 'dim'));

  // Show documentation reference
  const docRef = refs.get(config.doc, 'com');
  if (docRef) {
    console.info(styled(`   Docs: ${docRef.url}`, 'accent'));
  }
}

// Commands
async function handleGet() {
  const key = args[1];
  const level = (args[2] as SecurityLevel) || 'STANDARD';

  if (!key) {
    showError('Missing secret key. Usage: bun secret-helper.ts get <key> [level]');
    process.exit(1);
  }

  if (!Object.keys(SECURITY_LEVELS).includes(level)) {
    showError(`Invalid security level: ${level}`);
    showInfo(`Valid levels: ${Object.keys(SECURITY_LEVELS).join(', ')}`);
    process.exit(1);
  }

  try {
    showHeader();
    showInfo(`Retrieving secret: ${key} (Level: ${level})`);

    const value = await secretManager.get(key, level);
    showSecret(key, value, level);
  } catch (error) {
    showError(
      `Failed to retrieve secret: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}

async function handleGetAll() {
  const keys = args.slice(1);
  const level = args[args.length - 1] as SecurityLevel;

  // Check if last argument is a valid level
  const actualLevel = Object.keys(SECURITY_LEVELS).includes(level) ? level : 'STANDARD';
  const actualKeys = Object.keys(SECURITY_LEVELS).includes(level) ? keys.slice(0, -1) : keys;

  if (actualKeys.length === 0) {
    showError('Missing secret keys. Usage: bun secret-helper.ts get-all <key1> <key2> ... [level]');
    process.exit(1);
  }

  try {
    showHeader();
    showInfo(`Retrieving ${actualKeys.length} secrets (Level: ${actualLevel})`);

    const secrets = await secretManager.getAll(actualKeys, actualLevel);

    console.info(styled('\n📊 Results:', 'primary'));
    console.info(styled('─'.repeat(40), 'muted'));

    for (const [key, value] of secrets) {
      showSecret(key, value, actualLevel);
      console.info('');
    }

    showSuccess(`Retrieved ${secrets.size}/${actualKeys.length} secrets successfully`);
  } catch (error) {
    showError(
      `Failed to retrieve secrets: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}

async function handleRotate() {
  const key = args[1];
  const level = (args[2] as SecurityLevel) || 'HIGH';

  if (!key) {
    showError('Missing secret key. Usage: bun secret-helper.ts rotate <key> [level]');
    process.exit(1);
  }

  try {
    showHeader();
    await secretManager.rotate(key, level);
    showSuccess(`Secret rotation queued: ${key}`);
  } catch (error) {
    showError(`Failed to rotate secret: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

async function handleInvalidate() {
  const key = args[1];
  const level = (args[2] as SecurityLevel) || 'HIGH';

  if (!key) {
    showError('Missing secret key. Usage: bun secret-helper.ts invalidate <key> [level]');
    process.exit(1);
  }

  try {
    showHeader();
    await secretManager.invalidate(key, level);
    showSuccess(`Secret invalidated: ${key}`);
  } catch (error) {
    showError(
      `Failed to invalidate secret: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}

function handleCache() {
  const subcommand = args[1];

  if (subcommand === 'stats') {
    showHeader();
    showInfo('Cache Statistics:');

    const stats = secretManager.getCacheStats();

    if (stats.size === 0) {
      showInfo('Cache is empty');
      return;
    }

    console.info(styled(`\n📊 Cache Size: ${stats.size} entries`, 'primary'));
    console.info(styled('─'.repeat(50), 'muted'));

    stats.entries.forEach(entry => {
      const ttlMinutes = Math.floor(entry.ttl / 60000);
      console.info(styled(`   🔑 ${entry.key}`, 'primary'));
      console.info(styled(`      Access Count: ${entry.accessCount}`, 'dim'));
      console.info(styled(`      TTL: ${ttlMinutes}m`, 'dim'));
      console.info('');
    });
  } else if (subcommand === 'clear') {
    showHeader();
    secretManager.clearCache();
    showSuccess('Cache cleared successfully');
  } else {
    showError('Invalid cache subcommand. Use: stats | clear');
    process.exit(1);
  }
}

function handleDocs() {
  const domain = (args[1] as 'sh' | 'com') || 'com';

  if (!['sh', 'com'].includes(domain)) {
    showError('Invalid domain. Use: sh | com');
    process.exit(1);
  }

  showHeader();
  console.info(styled('📚 Bun Secrets Documentation', 'accent'));
  console.info(styled('────────────────────────────', 'muted'));

  const docs = refs.getSecretsDocs(domain);

  Object.entries(docs).forEach(([key, doc]) => {
    if (doc) {
      const icon =
        key === 'overview'
          ? '📖'
          : key === 'api'
            ? '🔧'
            : key === 'getOptions'
              ? '⚙️'
              : key === 'examples'
                ? '💡'
                : '🔒';
      console.info(styled(`${icon} ${key}:`, 'primary'), styled(doc.url, 'accent'));
    }
  });

  console.info('');
  console.info(styled('🌐 Domain-specific URLs:', 'muted'));
  console.info(styled(`   sh (stable): ${BUN_DOCS.secrets.overview}`, 'dim'));
  console.info(styled(`   com (latest): ${BUN_DOCS.secrets.com.overview}`, 'dim'));
}

function handleLevels() {
  showHeader();
  console.info(styled('🛡️ Security Levels', 'accent'));
  console.info(styled('─────────────────', 'muted'));

  Object.entries(SECURITY_LEVELS).forEach(([level, config]) => {
    console.info(styled(`${level}:`, config.color));
    console.info(styled(`   Color: ${config.color}`, 'dim'));
    console.info(styled(`   TTL: ${config.ttl}s (${Math.floor(config.ttl / 60)}m)`, 'dim'));
    console.info(styled(`   Audit: ${config.audit ? 'Yes' : 'No'}`, 'dim'));
    console.info(styled(`   Cache: ${config.cache ? 'Yes' : 'No'}`, 'dim'));
    console.info(styled(`   Region: ${config.region}`, 'dim'));

    const docRef = refs.get(config.doc, 'com');
    if (docRef) {
      console.info(styled(`   Docs: ${docRef.url}`, 'accent'));
    }
    console.info('');
  });
}

function handleBenchmark() {
  showHeader();
  showInfo('Running performance benchmark...');

  const testKey = 'BENCHMARK_SECRET';
  const iterations = 100;

  // Warm up
  try {
    await secretManager.get(testKey, 'STANDARD');
  } catch {
    // Ignore warmup errors
  }

  // Benchmark cache hits
  const cacheStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    try {
      await secretManager.get(testKey, 'STANDARD');
    } catch {
      // Ignore errors for benchmark
    }
  }
  const cacheEnd = performance.now();

  const cacheAvg = ((cacheEnd - cacheStart) / iterations) * 1000; // Convert to microseconds

  console.info(styled('📊 Benchmark Results:', 'primary'));
  console.info(styled('─'.repeat(30), 'muted'));
  console.info(styled(`   Iterations: ${iterations}`, 'dim'));
  console.info(styled(`   Cache Hit Avg: ${cacheAvg.toFixed(0)}μs`, 'success'));
  console.info(styled(`   Target: <300μs`, cacheAvg < 300 ? 'success' : 'warning'));

  if (cacheAvg < 300) {
    showSuccess('Performance benchmark passed!');
  } else {
    showWarning('Performance above target threshold');
  }
}

function handleHelp() {
  showHeader();
  console.info(styled('Usage:', 'primary'));
  console.info(styled('  bun secret-helper.ts <command> [options]', 'dim'));
  console.info('');
  console.info(styled('Commands:', 'accent'));
  console.info(styled('  get <key> [level]           - Retrieve a secret', 'primary'));
  console.info(styled('  get-all <key1> <key2> [level] - Retrieve multiple secrets', 'primary'));
  console.info(styled('  rotate <key> [level]        - Queue secret rotation', 'primary'));
  console.info(styled('  invalidate <key> [level]    - Invalidate secret cache', 'primary'));
  console.info(styled('  cache stats                 - Show cache statistics', 'primary'));
  console.info(styled('  cache clear                 - Clear cache', 'primary'));
  console.info(styled('  docs [domain]                - Show documentation links', 'primary'));
  console.info(styled('  levels                       - Show security levels', 'primary'));
  console.info(styled('  benchmark                    - Performance benchmark', 'primary'));
  console.info(styled('  help                         - Show this help', 'primary'));
  console.info('');
  console.info(styled('Security Levels:', 'accent'));
  Object.keys(SECURITY_LEVELS).forEach(level => {
    console.info(styled(`  ${level.toLowerCase()}`, 'primary'));
  });
  console.info('');
  console.info(styled('Examples:', 'accent'));
  console.info(styled('  bun secret-helper.ts get API_KEY HIGH', 'dim'));
  console.info(styled('  bun secret-helper.ts get-all KEY1 KEY2 KEY3 STANDARD', 'dim'));
  console.info(styled('  bun secret-helper.ts cache stats', 'dim'));
  console.info(styled('  bun secret-helper.ts docs com', 'dim'));
}

// Main command router
async function main() {
  try {
    switch (command) {
      case 'get':
        await handleGet();
        break;

      case 'get-all':
        await handleGetAll();
        break;

      case 'rotate':
        await handleRotate();
        break;

      case 'invalidate':
        await handleInvalidate();
        break;

      case 'cache':
        handleCache();
        break;

      case 'docs':
        handleDocs();
        break;

      case 'levels':
        handleLevels();
        break;

      case 'benchmark':
        handleBenchmark();
        break;

      case 'help':
      case '--help':
      case '-h':
        handleHelp();
        break;

      default:
        showError(`Unknown command: ${command}`);
        showInfo('Use "bun secret-helper.ts help" for usage information');
        process.exit(1);
    }
  } catch (error) {
    showError(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.main) {
  main();
}

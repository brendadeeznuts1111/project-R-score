#!/usr/bin/env bun
/**
 * Bun Data API CLI
 * 
 * Demonstrates Bun's data management APIs:
 * - Bun.Cookie / Bun.CookieMap - Cookie management
 * - Bun.color - CSS color processing
 * - Bun.env - Prefixed environment variables
 * - Headers - HTTP header case preservation
 * 
 * Usage:
 *   bun run cf-data.ts [command] [options]
 */

import {
  cookieManager,
  colorManager,
  headerManager,
  createPrefixedEnv,
  BunDataCLIManager,
} from '../../lib/cloudflare/bun-data-api';
import {
  ThemedConsole,
  getDomainTheme,
  themedSeparator,
} from '../../themes/config/domain-theme';
import { FACTORY_WAGER_BRAND } from '../../src/config/domain';

const args = process.argv.slice(2);
const command = args[0];
const subcommand = args[1];

// Initialize themed console
const t = new ThemedConsole('professional');

function printHeader(): void {
  const { icon, name } = FACTORY_WAGER_BRAND;
  const separator = themedSeparator('professional', 60);

  t.log();
  t.log(separator);
  t.log(`${icon} ${name} Data API CLI`);
  t.log(`   Bun.Cookie | Bun.color | Prefixed Env`);
  t.log(separator);
  t.log();
}

// ==================== Cookie Commands ====================

async function cmdCookieSet(): Promise<void> {
  const [name, value, ...opts] = args.slice(1);

  if (!name || !value) {
    t.error('Usage: cookie-set <name> <value> [options]');
    t.log('  Options: --secure --httpOnly --sameSite=strict');
    return;
  }

  t.header(`🍪 Set Cookie: ${name}`);
  t.log();

  const options: any = {};
  if (opts.includes('--secure')) options.secure = true;
  if (opts.includes('--httpOnly')) options.httpOnly = true;
  if (opts.includes('--sameSite=strict')) options.sameSite = 'strict';

  cookieManager.set(name, value, options);

  const cookie = cookieManager.get(name);
  t.success('Cookie set!');
  t.log(`  Name: ${cookie?.name}`);
  t.log(`  Value: ${cookie?.value}`);
  t.log(`  Secure: ${cookie?.secure}`);
  t.log(`  HttpOnly: ${cookie?.httpOnly}`);
  t.log(`  SameSite: ${cookie?.sameSite}`);

  const serialized = cookieManager.serialize(name);
  t.log();
  t.info('Serialized:');
  t.log(`  ${serialized}`);
}

async function cmdCookieGet(): Promise<void> {
  const name = args[1];

  if (!name) {
    t.error('Usage: cookie-get <name>');
    return;
  }

  t.header(`🍪 Get Cookie: ${name}`);
  t.log();

  const cookie = cookieManager.get(name);
  if (!cookie) {
    t.warning('Cookie not found');
    return;
  }

  t.success('Cookie found:');
  t.log(`  Name: ${cookie.name}`);
  t.log(`  Value: ${cookie.value}`);
  t.log(`  Path: ${cookie.path}`);
  t.log(`  Domain: ${cookie.domain || '(none)'}`);
}

async function cmdCookieList(): Promise<void> {
  t.header('🍪 All Cookies');
  t.log();

  const cookies = cookieManager.getAll();

  if (cookies.size === 0) {
    t.warning('No cookies set');
    return;
  }

  for (const [name, cookie] of cookies) {
    t.log(`  ${name}: ${cookie.value}`);
  }

  t.log();
  t.success(`${cookies.size} cookie(s)`);
}

async function cmdCookieDelete(): Promise<void> {
  const name = args[1];

  if (!name) {
    t.error('Usage: cookie-delete <name>');
    return;
  }

  t.header(`🍪 Delete Cookie: ${name}`);
  t.log();

  cookieManager.delete(name);
  t.success('Cookie deleted');
}

// ==================== Color Commands ====================

async function cmdColorParse(): Promise<void> {
  const color = args[1];

  if (!color) {
    t.error('Usage: color-parse <color>');
    t.log('  Example: color-parse red');
    return;
  }

  t.header(`🎨 Parse Color: ${color}`);
  t.log();

  try {
    const parsed = colorManager.parse(color);
    t.success(`Parsed: ${parsed}`);

    // Show brand colors
    t.log();
    t.info('Brand Colors:');
    t.log(`  Primary: ${colorManager.brandColor('primary')}`);
    t.log(`  Secondary: ${colorManager.brandColor('secondary')}`);
    t.log(`  Success: ${colorManager.brandColor('success')}`);
    t.log(`  Warning: ${colorManager.brandColor('warning')}`);
    t.log(`  Error: ${colorManager.brandColor('error')}`);

    // CSS variables
    t.log();
    t.info('CSS Variables:');
    t.log(colorManager.generateCSSVariables());

  } catch (error) {
    t.error(`Parse failed: ${(error as Error).message}`);
  }
}

async function cmdColorBrand(): Promise<void> {
  const [type, alpha] = [args[1], args[2]];

  if (!type) {
    t.error('Usage: color-brand <primary|secondary|success|warning|error> [alpha]');
    return;
  }

  t.header(`🎨 Brand Color: ${type}`);
  t.log();

  const a = alpha ? parseFloat(alpha) : undefined;
  const color = colorManager.brandColor(type as any, a);

  t.success(`Color: ${color}`);

  // Visual representation
  t.log();
  t.log(`  ████████ ${color}`);
}

async function cmdColorGradient(): Promise<void> {
  const colors = args.slice(1);

  if (colors.length < 2) {
    t.error('Usage: color-gradient <color1> <color2> [color3...]');
    return;
  }

  t.header('🎨 Gradient');
  t.log();

  try {
    const gradient = colorManager.gradient(colors);
    t.success('Gradient created:');
    t.log(`  ${gradient}`);

    // Visual
    t.log();
    t.log('  Preview:');
    colors.forEach((c, i) => {
      const pct = Math.round((i / (colors.length - 1)) * 100);
      t.log(`    ${pct}%: ${c}`);
    });

  } catch (error) {
    t.error(`Gradient failed: ${(error as Error).message}`);
  }
}

// ==================== Environment Commands ====================

async function cmdEnvSet(): Promise<void> {
  const [prefix, name, value] = args.slice(1);

  if (!prefix || !name || !value) {
    t.error('Usage: env-set <prefix> <name> <value>');
    t.log('  Example: env-set FW API_KEY secret123');
    return;
  }

  t.header(`🔧 Set Env: ${prefix}_${name}`);
  t.log();

  const env = createPrefixedEnv(prefix);
  env.set(name, value);

  t.success('Environment variable set');
  t.log(`  Key: ${prefix}_${name}`);
  t.log(`  Value: ${value}`);
}

async function cmdEnvGet(): Promise<void> {
  const [prefix, name] = args.slice(1);

  if (!prefix || !name) {
    t.error('Usage: env-get <prefix> <name>');
    return;
  }

  t.header(`🔧 Get Env: ${prefix}_${name}`);
  t.log();

  const env = createPrefixedEnv(prefix);
  const value = env.get(name);

  if (value) {
    t.success(`Value: ${value}`);
  } else {
    t.warning('Not set');
  }
}

async function cmdEnvList(): Promise<void> {
  const prefix = args[1];

  if (!prefix) {
    t.error('Usage: env-list <prefix>');
    return;
  }

  t.header(`🔧 Env Variables: ${prefix}_*`);
  t.log();

  const env = createPrefixedEnv(prefix);
  const vars = env.getAll();

  const keys = Object.keys(vars);
  if (keys.length === 0) {
    t.warning('No variables found');
    return;
  }

  for (const [key, value] of Object.entries(vars)) {
    const masked = value.length > 4 ? '*'.repeat(value.length - 4) + value.slice(-4) : value;
    t.log(`  ${key}: ${masked}`);
  }

  t.log();
  t.success(`${keys.length} variable(s)`);
}

// ==================== Header Commands ====================

async function cmdHeaderCreate(): Promise<void> {
  t.header('📋 Create Headers');
  t.log();

  const headers = headerManager.create({
    'Authorization': 'Bearer token123',
    'Content-Type': 'application/json',
    'X-Custom-Header': 'value',
  });

  t.success('Headers created:');
  headers.forEach((value, key) => {
    t.log(`  ${key}: ${value}`);
  });

  t.log();
  t.info('Note: Bun v1.3.7+ preserves header case');
}

async function cmdHeaderCF(): Promise<void> {
  const token = args[1] || 'your-api-token';

  t.header('📋 Cloudflare Headers');
  t.log();

  const headers = headerManager.createCFHeaders(token);

  t.success('Cloudflare API headers:');
  headers.forEach((value, key) => {
    t.log(`  ${key}: ${value}`);
  });
}

async function cmdHeaderTelemetry(): Promise<void> {
  t.header('📋 Telemetry Headers');
  t.log();

  const headers = headerManager.createTelemetryHeaders({
    version: '1.0.0',
    platform: 'bun',
    region: 'us-east-1',
  });

  t.success('Telemetry headers:');
  headers.forEach((value, key) => {
    t.log(`  ${key}: ${value}`);
  });
}

// ==================== Data CLI Commands ====================

async function cmdDataSession(): Promise<void> {
  t.header('💾 Session Data');
  t.log();

  const dataCLI = new BunDataCLIManager({ prefix: 'FW_CLI' });

  // Store session
  dataCLI.storeSession({
    api_token: 'test-token',
    account_id: 'test-account',
    theme: 'professional',
  });

  t.success('Session stored');

  // Retrieve session
  const session = dataCLI.getSession();
  t.log();
  t.info('Retrieved session:');
  for (const [key, value] of Object.entries(session)) {
    const masked = value.length > 8 ? value.slice(0, 4) + '****' : value;
    t.log(`  ${key}: ${masked}`);
  }
}

// ==================== Help ====================

async function cmdHelp(): Promise<void> {
  printHeader();

  t.header('Usage:');
  t.log('  bun run cf-data.ts <command> [options]');
  t.log();

  t.header('Cookie Commands:');
  t.log('  cookie-set <name> <value> [opts]  Set cookie');
  t.log('  cookie-get <name>                  Get cookie');
  t.log('  cookie-list                        List all cookies');
  t.log('  cookie-delete <name>               Delete cookie');
  t.log();

  t.header('Color Commands:');
  t.log('  color-parse <color>                Parse color with Bun.color');
  t.log('  color-brand <type> [alpha]         Get brand color');
  t.log('  color-gradient <c1> <c2> [c3...]   Create gradient');
  t.log();

  t.header('Environment Commands:');
  t.log('  env-set <prefix> <name> <value>    Set prefixed env var');
  t.log('  env-get <prefix> <name>            Get prefixed env var');
  t.log('  env-list <prefix>                  List prefixed env vars');
  t.log();

  t.header('Header Commands:');
  t.log('  header-create                      Create HTTP headers');
  t.log('  header-cf [token]                  Create Cloudflare headers');
  t.log('  header-telemetry                   Create telemetry headers');
  t.log();

  t.header('Data CLI Commands:');
  t.log('  data-session                       Store/retrieve session');
  t.log();

  t.header('Examples:');
  t.log('  bun run cf-data.ts cookie-set session abc123 --secure');
  t.log('  bun run cf-data.ts color-brand primary 0.8');
  t.log('  bun run cf-data.ts env-set FW API_KEY secret123');
  t.log('  bun run cf-data.ts header-cf my-token');
}

// ==================== Main ====================

async function main() {
  if (!command || ['help', '--help', '-h'].includes(command)) {
    await cmdHelp();
    return;
  }

  // Don't print header for help
  if (!['help', '--help', '-h'].includes(command)) {
    printHeader();
  }

  switch (command) {
    // Cookie commands
    case 'cookie-set':
      await cmdCookieSet();
      break;
    case 'cookie-get':
      await cmdCookieGet();
      break;
    case 'cookie-list':
      await cmdCookieList();
      break;
    case 'cookie-delete':
      await cmdCookieDelete();
      break;

    // Color commands
    case 'color-parse':
      await cmdColorParse();
      break;
    case 'color-brand':
      await cmdColorBrand();
      break;
    case 'color-gradient':
      await cmdColorGradient();
      break;

    // Environment commands
    case 'env-set':
      await cmdEnvSet();
      break;
    case 'env-get':
      await cmdEnvGet();
      break;
    case 'env-list':
      await cmdEnvList();
      break;

    // Header commands
    case 'header-create':
      await cmdHeaderCreate();
      break;
    case 'header-cf':
      await cmdHeaderCF();
      break;
    case 'header-telemetry':
      await cmdHeaderTelemetry();
      break;

    // Data CLI commands
    case 'data-session':
      await cmdDataSession();
      break;

    default:
      t.error(`Unknown command: ${command}`);
      t.log('Run "help" for available commands');
  }
}

main().catch(console.error);

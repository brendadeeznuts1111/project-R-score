#!/usr/bin/env bun
/**
 * Cookie Security v3.26 CLI Tool
 * ===============================
 * Standalone executable for cookie security operations
 *
 * @version 3.26.1
 * @author FactoryWager Engineering
 *
 * Build: bun build --compile --minify ./cli/cookie-security-cli.ts --outfile cookie-security
 *
 * @see {@link https://bun.sh/docs/bundler/executables Bun Compile Documentation}
 */

import { cookieSecurity, variantManager, SECURITY_CONFIG } from '../lib/cookie-security-v3.26';

const VERSION = '3.26.1';

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

const gradeColor = (grade: string) => {
  const colors: Record<string, string> = {
    'A+': c.brightGreen,
    A: c.green,
    B: c.brightYellow,
    C: c.yellow,
    D: c.brightRed,
    F: c.red,
  };
  return colors[grade] || c.dim;
};

// CLI option parsing
interface ParsedArgs {
  command: string;
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
    positional: positional.slice(1),
    flags,
  };
}

function header() {
  console.info(color(`\n🍪 Cookie Security v${VERSION}`, 'bright'));
  console.info(color('═══════════════════════════════════════', 'dim'));
}

function showHelp() {
  header();
  console.info(`
${color('Usage:', 'bright')} cookie-security <command> [options]

${color('Commands:', 'bright')}
  ${color('audit', 'cyan')} <cookie>              Audit a cookie header string
  ${color('create', 'cyan')} <name> <value>       Create a secure cookie
  ${color('csrf', 'cyan')} <session>              Generate CSRF token
  ${color('validate', 'cyan')} <session> <token>  Validate CSRF token
  ${color('variant', 'cyan')} <user> <A|B>        Create A/B variant
  ${color('check-variant', 'cyan')} <v> <u>       Validate variant
  ${color('benchmark', 'cyan')}                   Run performance benchmarks
  ${color('stats', 'cyan')}                       Show CSRF token statistics
  ${color('config', 'cyan')}                      Show security configuration

${color('Options:', 'bright')}
  --type <t>        Cookie type (session|auth|csrf|preferences)
  --format <f>      Output format (json|table|compact)
  --max-age <s>     Override max age in seconds
  --domain <d>      Set cookie domain
  --no-secure       Disable Secure flag (dev only!)
  --no-httponly     Disable HttpOnly flag (dev only!)
  -h, --help        Show this help
  -v, --version     Show version
  -q, --quiet       Suppress banner

${color('Examples:', 'bright')}
  ${color('# Audit an existing cookie', 'dim')}
  cookie-security audit "session=abc123; Secure; HttpOnly; SameSite=Strict"

  ${color('# Create a session cookie', 'dim')}
  cookie-security create sid '{"user":123}' --type session

  ${color('# Generate CSRF token', 'dim')}
  cookie-security csrf user_session_123

  ${color('# Run benchmarks', 'dim')}
  cookie-security benchmark

  ${color('# Output as JSON', 'dim')}
  cookie-security audit "session=x" --format json
`);
}

async function audit(args: ParsedArgs) {
  const cookieStr = args.positional[0];
  const format = (args.flags.format as string) || 'table';

  if (!cookieStr) {
    console.error(color('Error: Cookie string required', 'red'));
    console.info('Usage: cookie-security audit "<cookie-header>"');
    process.exit(1);
  }

  const { cookie, report } = cookieSecurity.parseAndValidate(cookieStr);

  if (!cookie) {
    console.error(color('Error: Failed to parse cookie', 'red'));
    process.exit(1);
  }

  if (format === 'json') {
    console.info(
      JSON.stringify(
        {
          name: cookie.name,
          value: cookie.value,
          secure: cookie.secure,
          httpOnly: cookie.httpOnly,
          sameSite: cookie.sameSite,
          path: cookie.path,
          domain: cookie.domain,
          maxAge: cookie.maxAge,
          partitioned: cookie.partitioned,
          report,
        },
        null,
        2
      )
    );
    return;
  }

  // Table format
  console.info();
  console.info(`${color('Cookie:', 'bright')} ${color(cookie.name, 'cyan')}`);
  console.info(`${color('Value:', 'bright')} ${cookie.value.slice(0, 30)}${cookie.value.length > 30 ? '...' : ''}`);
  console.info();

  // Properties
  console.info(color('Properties:', 'bright'));
  console.info(`  Secure:    ${cookie.secure ? color('✓', 'green') : color('✗', 'red')}`);
  console.info(`  HttpOnly:  ${cookie.httpOnly ? color('✓', 'green') : color('✗', 'red')}`);
  console.info(`  SameSite:  ${cookie.sameSite || color('not set', 'yellow')}`);
  console.info(`  Path:      ${cookie.path || '/'}`);
  console.info(`  MaxAge:    ${cookie.maxAge ? `${cookie.maxAge}s` : color('session', 'dim')}`);
  console.info();

  // Security Report
  console.info(`${color('Grade:', 'bright')} ${gradeColor(report.grade)}${c.bright}${report.grade}${c.reset} (${report.score}/100)`);
  console.info(`${color('Valid:', 'bright')} ${report.valid ? color('✓ Yes', 'green') : color('✗ No', 'red')}`);

  if (report.issues.length) {
    console.info(`\n${color('Issues:', 'red')}`);
    report.issues.forEach((issue) => console.info(`  ${color('✗', 'red')} ${issue}`));
  }

  if (report.warnings.length) {
    console.info(`\n${color('Warnings:', 'yellow')}`);
    report.warnings.forEach((warn) => console.info(`  ${color('⚠', 'yellow')} ${warn}`));
  }

  if (Object.keys(report.headers).length) {
    console.info(`\n${color('Recommended Headers:', 'cyan')}`);
    Object.entries(report.headers).forEach(([key, value]) => {
      if (value) console.info(`  ${key}: ${color(value, 'dim')}`);
    });
  }

  console.info(`\n${color('Set-Cookie:', 'bright')}`);
  console.info(`  ${color(cookie.serialize(), 'cyan')}`);
}

async function create(args: ParsedArgs) {
  const [name, value] = args.positional;
  const type = (args.flags.type as 'session' | 'auth' | 'csrf' | 'preferences') || 'session';
  const format = (args.flags.format as string) || 'table';
  const maxAge = args.flags['max-age'] ? parseInt(args.flags['max-age'] as string, 10) : undefined;
  const domain = args.flags.domain as string | undefined;
  const noSecure = args.flags['no-secure'] === true;
  const noHttpOnly = args.flags['no-httponly'] === true;

  if (!name || !value) {
    console.error(color('Error: Name and value required', 'red'));
    console.info('Usage: cookie-security create <name> <value> [--type <type>]');
    process.exit(1);
  }

  let parsed: string | object = value;
  try {
    parsed = JSON.parse(value);
  } catch {
    // Keep as string
  }

  const overrides: Record<string, unknown> = {};
  if (maxAge !== undefined) overrides.maxAge = maxAge;
  if (domain !== undefined) overrides.domain = domain;
  if (noSecure) overrides.secure = false;
  if (noHttpOnly) overrides.httpOnly = false;

  const { cookie, report } = cookieSecurity.createSecure(name, parsed, type, overrides);

  if (format === 'json') {
    console.info(
      JSON.stringify(
        {
          name: cookie.name,
          value: cookie.value,
          serialized: cookie.serialize(),
          type,
          report,
        },
        null,
        2
      )
    );
    return;
  }

  console.info(`\n${color('Created:', 'bright')} ${color(type, 'cyan')} cookie`);
  console.info(`${color('Grade:', 'bright')} ${gradeColor(report.grade)}${report.grade}${c.reset}`);
  console.info(`${color('Set-Cookie:', 'bright')}`);
  console.info(`  ${color(cookie.serialize(), 'cyan')}`);

  if (report.issues.length) {
    console.info(`\n${color('Warnings:', 'yellow')}`);
    report.issues.forEach((issue) => console.info(`  ${color('⚠', 'yellow')} ${issue}`));
  }
}

async function csrf(args: ParsedArgs) {
  const session = args.positional[0];
  const format = (args.flags.format as string) || 'table';

  if (!session) {
    console.error(color('Error: Session ID required', 'red'));
    console.info('Usage: cookie-security csrf <session-id>');
    process.exit(1);
  }

  const { token, cookie } = await cookieSecurity.generateCSRF(session);

  if (format === 'json') {
    console.info(
      JSON.stringify(
        {
          session,
          token,
          cookie: cookie.serialize(),
        },
        null,
        2
      )
    );
    return;
  }

  console.info(`\n${color('Session:', 'bright')} ${session}`);
  console.info(`${color('Token:', 'bright')} ${color(token, 'cyan')}`);
  console.info(`${color('Cookie:', 'bright')}`);
  console.info(`  ${color(cookie.serialize(), 'dim')}`);
}

async function validate(args: ParsedArgs) {
  const [session, token] = args.positional;

  if (!session || !token) {
    console.error(color('Error: Session and token required', 'red'));
    console.info('Usage: cookie-security validate <session> <token>');
    process.exit(1);
  }

  const valid = cookieSecurity.validateCSRF(session, token);

  console.info(valid ? color('\n✓ VALID', 'green') : color('\n✗ INVALID', 'red'));

  if (!valid) {
    console.info(color('  Token mismatch or expired', 'yellow'));
  }

  process.exit(valid ? 0 : 1);
}

async function variant(args: ParsedArgs) {
  const [user, variantName] = args.positional;
  const format = (args.flags.format as string) || 'table';

  if (!user || !variantName) {
    console.error(color('Error: User and variant required', 'red'));
    console.info('Usage: cookie-security variant <user-id> <A|B|control>');
    process.exit(1);
  }

  if (!['A', 'B', 'control'].includes(variantName)) {
    console.error(color('Error: Variant must be A, B, or control', 'red'));
    process.exit(1);
  }

  const result = variantManager.createVariantCookie(user, variantName as 'A' | 'B' | 'control');

  if (format === 'json') {
    console.info(
      JSON.stringify(
        {
          user,
          variant: variantName,
          signature: result.signature,
          cookie: result.cookie.serialize(),
        },
        null,
        2
      )
    );
    return;
  }

  const variantColor = variantName === 'A' ? 'green' : variantName === 'B' ? 'blue' : 'yellow';

  console.info(`\n${color('User:', 'bright')} ${user}`);
  console.info(`${color('Variant:', 'bright')} ${color(variantName, variantColor)}`);
  console.info(`${color('Signature:', 'bright')} ${color(result.signature, 'dim')}`);
  console.info(`${color('Cookie:', 'bright')}`);
  console.info(`  ${color(result.cookie.serialize(), 'cyan')}`);
}

async function checkVariant(args: ParsedArgs) {
  const [cookieValue, userId] = args.positional;

  if (!cookieValue || !userId) {
    console.error(color('Error: Cookie value and user ID required', 'red'));
    console.info('Usage: cookie-security check-variant <cookie-value> <user-id>');
    process.exit(1);
  }

  const result = variantManager.validateVariant(cookieValue, userId);

  if (result.valid) {
    const variantColor = result.variant === 'A' ? 'green' : result.variant === 'B' ? 'blue' : 'yellow';
    console.info(color('\n✓ VALID', 'green'));
    console.info(`  Variant: ${color(result.variant!, variantColor)}`);
  } else {
    console.info(color('\n✗ INVALID', 'red'));
    console.info(color('  Signature mismatch or expired', 'yellow'));
  }

  process.exit(result.valid ? 0 : 1);
}

async function showStats() {
  header();

  const csrfStats = cookieSecurity.getCSRFStats();
  const variantStats = variantManager.getVariantStats();

  console.info(`\n${color('CSRF Tokens:', 'bright')}`);
  console.info(`  Active:  ${color(String(csrfStats.active), 'green')}`);
  console.info(`  Expired: ${color(String(csrfStats.expired), 'yellow')}`);

  console.info(`\n${color('Variants:', 'bright')}`);
  const variants = Object.entries(variantStats);
  if (variants.length === 0) {
    console.info(`  ${color('No variants tracked', 'dim')}`);
  } else {
    variants.forEach(([variant, count]) => {
      const vColor = variant === 'A' ? 'green' : variant === 'B' ? 'blue' : 'yellow';
      console.info(`  ${color(variant, vColor)}: ${count}`);
    });
  }
}

async function showConfig() {
  header();

  console.info(`\n${color('Security Configuration:', 'bright')}`);
  console.info(`  Min Score:        ${SECURITY_CONFIG.MIN_SCORE}/100`);
  console.info(`  Session MaxAge:   ${SECURITY_CONFIG.MAX_AGE_SESSION}s (1 day)`);
  console.info(`  Persistent Age:   ${SECURITY_CONFIG.MAX_AGE_PERSISTENT}s (1 year)`);
  console.info(`  CSRF Secret:      ${color(SECURITY_CONFIG.CSRF_SECRET.slice(0, 8) + '...', 'dim')}`);
  console.info(`  Debug Mode:       ${Bun.env.DEBUG_COOKIE_SECURITY === 'true' ? color('enabled', 'yellow') : color('disabled', 'dim')}`);
  console.info(`  Bun Version:      ${Bun.version}`);
}

async function benchmark() {
  header();
  console.info(color('\nRunning benchmarks...\n', 'yellow'));

  const b = async (name: string, fn: () => void | Promise<void>, iter = 10000) => {
    // Warmup
    for (let i = 0; i < 100; i++) await fn();

    // Actual benchmark
    const start = performance.now();
    for (let i = 0; i < iter; i++) await fn();
    const elapsed = performance.now() - start;
    const ops = Math.round((iter / elapsed) * 1000);

    const opsFormatted = ops.toLocaleString().padStart(10);
    const status = ops >= 285000 ? color('✓', 'green') : color('○', 'dim');

    console.info(`  ${name.padEnd(25)} ${opsFormatted} ops/s ${status}`);
    return ops;
  };

  const results: number[] = [];

  // Run benchmarks
  results.push(await b('Cookie.parse', () => cookieSecurity.parseAndValidate('s=1; Secure; HttpOnly'), 50000));
  results.push(await b('createSecure', () => cookieSecurity.createSecure('x', 'v', 'session'), 50000));
  results.push(await b('generateCSRF', () => cookieSecurity.generateCSRF('session-' + Math.random()), 5000));
  results.push(
    await b(
      'validateCSRF',
      () => {
        cookieSecurity.validateCSRF('s', 't');
      },
      50000
    )
  );
  results.push(await b('createVariant', () => variantManager.createVariantCookie('u', 'A'), 50000));

  const avg = Math.round(results.reduce((a, b) => a + b, 0) / results.length);

  console.info(`\n${color('Average:', 'bright')} ${avg.toLocaleString()} ops/s`);

  const targetOps = 285000;
  if (avg >= targetOps) {
    console.info(color(`✓ EXCEEDS TARGET (${targetOps.toLocaleString()} ops/s)`, 'green'));
  } else {
    const pct = Math.round((avg / targetOps) * 100);
    console.info(color(`○ ${pct}% of target (${targetOps.toLocaleString()} ops/s)`, 'yellow'));
  }
}

// Main entry point
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { command, flags } = args;

  // Show banner unless quiet mode
  if (!flags.q && !flags.quiet && command !== '' && command !== 'help') {
    header();
  }

  switch (command) {
    case 'audit':
      await audit(args);
      break;

    case 'create':
      await create(args);
      break;

    case 'csrf':
      await csrf(args);
      break;

    case 'validate':
      await validate(args);
      break;

    case 'variant':
      await variant(args);
      break;

    case 'check-variant':
      await checkVariant(args);
      break;

    case 'stats':
      await showStats();
      break;

    case 'config':
      await showConfig();
      break;

    case 'benchmark':
      await benchmark();
      break;

    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;

    case '-v':
    case '--version':
      console.info(VERSION);
      break;

    case '':
      if (!flags.q && !flags.quiet) {
        showHelp();
      }
      break;

    default:
      console.error(color(`Unknown command: ${command}`, 'red'));
      console.info(`Run ${color('cookie-security help', 'cyan')} for usage`);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(color(`Error: ${err.message}`, 'red'));
  process.exit(1);
});
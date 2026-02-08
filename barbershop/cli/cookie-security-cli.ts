#!/usr/bin/env bun
/**
 * Cookie Security v3.26 CLI Tool
 * Standalone executable for cookie security operations
 * 
 * Build: bun build --compile --minify ./cli/cookie-security-cli.ts --outfile cookie-security
 * 
 * @see {@link https://bun.sh/docs/bundler/executables Bun Compile Documentation}
 */

import { cookieSecurity, variantManager } from '../lib/cookie-security-v3.26';

const VERSION = '3.26.0';

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
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightRed: '\x1b[91m',
};

const color = (text: string, code: keyof typeof c) => `${c[code]}${text}${c.reset}`;

const gradeColor = (grade: string) => {
  const colors: Record<string, string> = {
    'A+': c.brightGreen, 'A': c.green, 'B': c.brightYellow,
    'C': c.yellow, 'D': c.brightRed, 'F': c.red,
  };
  return colors[grade] || c.dim;
};

function header() {
  console.log(color(`\n🍪 Cookie Security v${VERSION}`, 'bright'));
  console.log(color('═══════════════════════════════════════\n', 'dim'));
}

function help() {
  header();
  console.log(`Usage: cookie-security <command> [options]

Commands:
  audit <cookie>          Audit a cookie header string
  create <name> <value>   Create a secure cookie
  csrf <session>          Generate CSRF token
  validate <s> <t>        Validate CSRF token
  variant <user> <A|B>    Create A/B variant
  check-variant <v> <u>   Validate variant
  benchmark               Run benchmarks

Options:
  --type <t>   Cookie type (session|auth|csrf|preferences)
  --format     Output format (json|table)
  -h, --help   Show help
  -v           Show version`);
}

async function audit(args: string[]) {
  const cookieStr = args[0];
  if (!cookieStr) { console.error(color('Error: Cookie required', 'red')); process.exit(1); }
  
  const { cookie, report } = cookieSecurity.parseAndValidate(cookieStr);
  if (!cookie) { console.error(color('Parse failed', 'red')); process.exit(1); }
  
  console.log(`\n${color('Grade:', 'bright')} ${gradeColor(report.grade)}${c.bright}${report.grade}${c.reset} (${report.score}/100)`);
  console.log(`${color('Valid:', 'bright')} ${report.valid ? color('✓', 'green') : color('✗', 'red')}`);
  
  if (report.issues.length) {
    console.log(`\n${color('Issues:', 'red')}`);
    report.issues.forEach(i => console.log(`  ${color('✗', 'red')} ${i}`));
  }
  console.log(`\nSet-Cookie: ${color(cookie.serialize(), 'cyan')}`);
}

async function create(args: string[]) {
  const [name, value] = args;
  const type = (args.includes('--type') ? args[args.indexOf('--type') + 1] : 'session') as any;
  
  if (!name || !value) { console.error(color('Error: name and value required', 'red')); process.exit(1); }
  
  let parsed: string | object = value;
  try { parsed = JSON.parse(value); } catch {}
  
  const { cookie, report } = cookieSecurity.createSecure(name, parsed, type);
  console.log(`Grade: ${gradeColor(report.grade)}${report.grade}${c.reset}`);
  console.log(`Cookie: ${color(cookie.serialize(), 'cyan')}`);
}

async function csrf(args: string[]) {
  const session = args[0];
  if (!session) { console.error(color('Error: session ID required', 'red')); process.exit(1); }
  
  const { token, cookie } = await cookieSecurity.generateCSRF(session);
  console.log(`Token: ${color(token, 'cyan')}`);
  console.log(`Cookie: ${color(cookie.serialize(), 'cyan')}`);
}

async function validate(args: string[]) {
  const [session, token] = args;
  if (!session || !token) { console.error(color('Error: session and token required', 'red')); process.exit(1); }
  
  const valid = cookieSecurity.validateCSRF(session, token);
  console.log(valid ? color('✓ VALID', 'green') : color('✗ INVALID', 'red'));
  process.exit(valid ? 0 : 1);
}

async function variant(args: string[]) {
  const [user, variant] = args;
  if (!user || !variant) { console.error(color('Error: user and variant required', 'red')); process.exit(1); }
  
  const result = variantManager.createVariantCookie(user, variant as any);
  console.log(`Variant: ${color(variant, variant === 'A' ? 'green' : 'blue')}`);
  console.log(`Cookie: ${color(result.cookie.serialize(), 'cyan')}`);
}

async function benchmark() {
  header();
  console.log(color('Running benchmarks...\n', 'yellow'));
  
  const b = async (name: string, fn: () => void, iter = 10000) => {
    const start = performance.now();
    for (let i = 0; i < iter; i++) await fn();
    const ops = Math.round((iter / (performance.now() - start)) * 1000);
    console.log(`  ${name.padEnd(25)} ${ops.toLocaleString().padStart(10)} ops/s`);
    return ops;
  };
  
  const results = [];
  results.push(await b('Cookie.parse', () => cookieSecurity.parseAndValidate('s=1; Secure; HttpOnly'), 50000));
  results.push(await b('createSecure', () => cookieSecurity.createSecure('x', 'v', 'session'), 50000));
  results.push(await b('generateCSRF', () => cookieSecurity.generateCSRF('s'), 5000));
  results.push(await b('validateCSRF', () => cookieSecurity.validateCSRF('u', 't'), 50000));
  results.push(await b('createVariant', () => variantManager.createVariantCookie('u', 'A'), 50000));
  
  const avg = Math.round(results.reduce((a, b) => a + b, 0) / results.length);
  console.log(`\n${color('Average:', 'bright')} ${avg.toLocaleString()} ops/s ${avg >= 285000 ? color('✓ EXCEEDS TARGET', 'green') : ''}`);
}

// Main
async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];
  
  switch (cmd) {
    case 'audit': await audit(args.slice(1)); break;
    case 'create': await create(args.slice(1)); break;
    case 'csrf': await csrf(args.slice(1)); break;
    case 'validate': await validate(args.slice(1)); break;
    case 'variant': await variant(args.slice(1)); break;
    case 'benchmark': await benchmark(); break;
    case '-v': console.log(VERSION); break;
    default: help(); break;
  }
}

main().catch(console.error);

/**
 * Phone Sanitizer CLI Command
 *
 * Sanitizes phone numbers to E.164 format with optional validation.
 *
 * Usage:
 *   bun run core/cli/commands/phone.ts [options] <phone-number>
 *   echo "+1 415 555 1234" | bun run core/cli/commands/phone.ts
 *
 * Examples:
 *   bun run core/cli/commands/phone.ts "+1 (415) 555-1234"
 *   bun run core/cli/commands/phone.ts -c US "4155551234"
 *   bun run core/cli/commands/phone.ts --json "+14155551234"
 *   bun run core/cli/commands/phone.ts --batch numbers.txt
 *   bun run core/cli/commands/phone.ts --carrier "+14155551234"
 */

import { type SanitizeResult } from './common/phone-sanitizer.js';
import type { CountryCode } from 'libphonenumber-js';
import { cliLogger } from './common/logger.js';
import { Readable } from 'stream';
import { emojiAlignedTable, superTableCli } from '../../utils/super-table';
import { PhoneSanitizerV2 } from '../filters/phone-sanitizer-v2.js';
import { PhoneFarm } from './filter/phone-farm';

// Initialize optimized filter V2: §Filter:89-V2
const sanitizerV2 = new PhoneSanitizerV2({
  ipqsApiKey: process.env.IPQS_API_KEY
});

/** CLI flags for phone sanitizer */
export interface PhoneFlags {
  /** Default country code (ISO 3166-1 alpha-2) */
  country?: string;
  /** Skip validation step */
  skipValidation?: boolean;
  /** Output as JSON */
  json?: boolean;
  /** Quiet mode - only output E.164 */
  quiet?: boolean;
  /** Show all supported countries */
  listCountries?: boolean;
  /** Process multiple numbers from file */
  batch?: string;
  /** IPQS API key for carrier lookup, fraud scoring, and geolocation */
  ipqsKey?: string;
  /** Show help */
  help?: boolean;
  /** Show version */
  version?: boolean;
}

/** Parse CLI arguments into flags and positional args */
export function parseArgs(args: string[]): { flags: PhoneFlags; positional: string[] } {
  const flags: PhoneFlags = {};
  const positional: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === undefined) continue;

    if (arg === '-c' || arg === '--country') {
      flags.country = args[++i];
    } else if (arg === '-s' || arg === '--skip-validation') {
      flags.skipValidation = true;
    } else if (arg === '-j' || arg === '--json') {
      flags.json = true;
    } else if (arg === '-q' || arg === '--quiet') {
      flags.quiet = true;
    } else if (arg === '-l' || arg === '--list-countries') {
      flags.listCountries = true;
    } else if (arg === '-b' || arg === '--batch') {
      flags.batch = args[++i];
    } else if (arg === '-k' || arg === '--ipqs-key') {
      flags.ipqsKey = args[++i];
    } else if (arg === '-h' || arg === '--help') {
      flags.help = true;
    } else if (arg === '-v' || arg === '--version') {
      flags.version = true;
    } else if (!arg.startsWith('-')) {
      positional.push(arg);
    }
  }

  return { flags, positional };
}

/** Format result for display */
function formatResult(result: SanitizeResult, flags: PhoneFlags): string {
  if (flags.json) {
    return JSON.stringify(result, null, 2);
  }

  if (flags.quiet) {
    return result.e164;
  }

  const lines: string[] = [
    `E.164:      ${result.e164}`,
    `Valid:      ${result.isValid ? 'Yes' : 'No'}`,
    `Method:     ${result.validationMethod}`,
  ];

  if (result.country) {
    lines.push(`Country:    ${result.country}`);
  }

  if (result.type) {
    lines.push(`Type:       ${result.type}`);
  }

  if (result.carrier) {
    lines.push(`Carrier:    ${result.carrier}`);
  }

  if (result.region) {
    lines.push(`Region:     ${result.region}`);
  }

  if (result.city) {
    lines.push(`City:       ${result.city}`);
  }

  if (result.zipCode) {
    lines.push(`ZipCode:    ${result.zipCode}`);
  }

  if (result.fraudScore !== undefined) {
    const risk = result.fraudScore > 75 ? 'HIGH' : result.fraudScore > 50 ? 'MEDIUM' : 'LOW';
    lines.push(`FraudScore: ${result.fraudScore} (${risk})`);
  }

  if (result.countryCodeAdded) {
    lines.push(`Note:       Country code was prepended`);
  }

  return lines.join('\n');
}

/** Show help message */
function showHelp(): void {
  cliLogger.info(`
Phone Sanitizer - Convert phone numbers to E.164 format

USAGE:
  phone [options] <number>
  echo "<number>" | phone [options]

OPTIONS:
  -c, --country <code>    Default country (ISO 3166-1 alpha-2, e.g., US, GB, IN)
  -s, --skip-validation   Skip validation step (just sanitize)
  -j, --json              Output as JSON
  -q, --quiet             Quiet mode - only output E.164
  -b, --batch <file>      Process multiple numbers from file (one per line)
  -k, --ipqs-key <key>    IPQS API key for carrier, fraud scoring, geolocation
  -l, --list-countries    List all supported country codes
  -h, --help              Show this help message
  -v, --version           Show version

EXAMPLES:
  phone "+1 (415) 555-1234"           # Standard format
  phone -c US "4155551234"            # With default country
  phone --json "+14155551234"         # JSON output
  phone -q "+1-415-555-1234"          # Just E.164
  phone --batch numbers.txt           # Batch process file
  phone -c US -j "4155551234"         # Combined flags
  phone -k $IPQS_KEY "+14155551234"   # With IPQS intelligence

OUTPUT FIELDS:
  E.164       Formatted number (+14155551234)
  Valid       Whether number is valid
  Method      Validation method (basic or libphonenumber)
  Country     Detected country code (if available)
  Type        Number type: MOBILE, FIXED_LINE, TOLL_FREE, VOIP, etc.
  Carrier     Carrier name (requires --ipqs-key)
  Region      State/province from IPQS geolocation
  City        City from IPQS geolocation
  ZipCode     Postal code from IPQS geolocation
  FraudScore  Risk score (0-100, higher = riskier)

IPQS INTELLIGENCE:
  Sign up at https://www.ipqualityscore.com for API key.
  Features: carrier lookup, fraud scoring, geolocation (city, region, zip).
  Set IPQS_KEY env var or use -k/--ipqs-key flag.

SECURITY:
  - Strips XSS attempts (<script>, etc.)
  - Strips SQL injection attempts
  - Removes null bytes, emojis, invalid characters
  - Only allows: digits, +, -, ., (, ), space
`);
}

/** Show supported countries */
function showCountries(): void {
  // Use PhoneFilter's backing logic if needed, but for listing we still need libphonenumber-js access
  // For simplicity, we keep the core logic but could also expose it via PhoneFilter if required
  cliLogger.info('\n🌍 Supported Countries:\n');
  cliLogger.info('Use --batch with a list of numbers to verify multiple countries.');
}

/** Process a single phone number */
async function processNumber(input: string, flags: PhoneFlags): Promise<SanitizeResult> {
  const ipqsKey = flags.ipqsKey || process.env.IPQS_KEY;
  const localSanitizer = (flags.country || flags.skipValidation || flags.ipqsKey) 
    ? new PhoneSanitizerV2({
        defaultCountry: flags.country,
        skipValidation: flags.skipValidation,
        ipqsApiKey: ipqsKey
      })
    : sanitizerV2;

  return await localSanitizer.exec(input) as any;
}

/** Process batch file with high-performance §PhoneFarm */
async function processBatch(filePath: string, flags: PhoneFlags): Promise<void> {
  const file = Bun.file(filePath);
  if (!await file.exists()) {
    cliLogger.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  const ipqsKey = flags.ipqsKey || process.env.IPQS_KEY;
  const localSanitizer = new PhoneSanitizerV2({
    defaultCountry: flags.country,
    skipValidation: flags.skipValidation,
    ipqsApiKey: ipqsKey
  });

  const content = await file.text();
  const farm = new PhoneFarm();
  
  const results = await farm.exec({
    stream: Readable.from(content),
    worker: (phone) => localSanitizer.exec(phone),
    concurrency: 100
  });

  if (flags.json) {
    cliLogger.info(JSON.stringify(results, null, 2));
  } else if (flags.quiet) {
    results.forEach(r => r && cliLogger.info(r.e164));
  } else {
    superTableCli(results, []);
  }
}

/** Main CLI entry point */
export async function main(args: string[] = process.argv.slice(2)): Promise<void> {
  const { flags, positional } = parseArgs(args);

  if (flags.help) {
    showHelp();
    return;
  }

  if (flags.version) {
    cliLogger.info('phone-sanitizer v2.0.0 (Empire Pro Hardened)');
    cliLogger.info('Pattern: §Filter:89-V2');
    return;
  }

  if (flags.listCountries) {
    // We'll keep the original showCountries logic for now or refactor it to use the new filter
    const { phoneSanitizer } = await import('./common/phone-sanitizer');
    const countries = phoneSanitizer.getSupportedCountries();
    const rows = countries.map(code => ({
      code,
      dial: `+${phoneSanitizer.getCountryCode(code) || ''}`,
    }));
    cliLogger.info('\n🌍 Supported Countries:\n');
    emojiAlignedTable(rows, ['code', 'dial']);
    return;
  }

  if (flags.batch) {
    await processBatch(flags.batch, flags);
    return;
  }

  // Get input from positional arg or stdin
  let inputs: string[] = [];

  if (positional.length > 0) {
    inputs = [positional.join(' ')];
  } else if (!process.stdin.isTTY) {
    const stdinText = await Bun.stdin.text();
    // Split by newlines and filter empty lines
    inputs = stdinText.split('\n').map(l => l.trim()).filter(Boolean);
  } else {
    showHelp();
    return;
  }

  if (inputs.length === 0) {
    cliLogger.error('Error: No phone number provided');
    process.exit(1);
  }

  // Process single or multiple numbers
  const results: SanitizeResult[] = [];
  for (const input of inputs) {
    const result = await processNumber(input, flags);
    results.push(result);
  }

  // Output results
  if (inputs.length === 1 && results[0]) {
    cliLogger.info(formatResult(results[0], flags));
    if (!results[0].isValid && !flags.skipValidation) {
      process.exit(2);
    }
  } else {
    // Multiple numbers from stdin/batch
    if (flags.json) {
      cliLogger.info(JSON.stringify(results, null, 2));
    } else if (flags.quiet) {
      results.forEach(r => r && cliLogger.info(r.e164));
    } else {
      // Use superTableCli for consistent project patterns when handle multiple results
      superTableCli(results, args);
    }
    // Exit with error if any invalid
    const hasInvalid = results.some(r => !r.isValid);
    if (hasInvalid && !flags.skipValidation) {
      process.exit(2);
    }
  }
}

// Run if executed directly
if (import.meta.main) {
  main();
}

#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
/**
 * Read-only portal theme token printer — resolve theme.jsonc paths via
 * lib/portal/theme-token-resolve.ts and print Bun.color formats.
 *
 * Usage:
 *   bun run tokens --token semantic.vertical.sportsbook --format hex
 *   bun run tokens --token semantic.tier.sharp --format hsl
 *   bun run tokens --token semantic.pattern.bettor.sharp --format hex
 *   bun run tokens --token dark.green --format '[rgba]'
 *   bun run tokens --token semantic.tiers.sharp --format hex   # alias → tier
 *
 * @see https://bun.com/docs/runtime/color
 * @see docs/portal-foundation.md
 */
import {
  ThemeTokenResolveError,
  formatThemeToken,
  type ThemeColorScheme,
} from '../lib/portal/theme-token-resolve.ts';

const HELP = `Read-only portal theme token printer (theme.jsonc via portalTheme).

Usage:
  bun run tokens --token <dotted.path> [--format <fmt>] [--scheme dark|light]

Options:
  --token <path>     Required. Dotted path into theme.jsonc
                     (e.g. semantic.vertical.sportsbook, semantic.pattern.bettor.sharp,
                     dark.green)
  --format <fmt>     Bun.color format (default: hex). Examples:
                     hex, HEX, hsl, number, [rgba], {rgba}, [rgb], css, ansi
  --scheme dark|light  Palette scheme for CSS var resolution (default: dark)
  --help             Show this help

Notes:
  - Alias: semantic.tiers.* → semantic.tier.* (SSOT key is singular "tier")
  - Not a parallel color kernel — resolves existing theme.jsonc only
  - Success prints only the formatted value (pipe-friendly)
  - Exit 2 on unknown token / unresolved var / Bun.color failure

@see https://bun.com/docs/runtime/color
`;

type Parsed = {
  token?: string;
  format: string;
  scheme: ThemeColorScheme;
  help: boolean;
};

function parseArgv(argv: string[]): Parsed {
  const out: Parsed = { format: 'hex', scheme: 'dark', help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === '--help' || arg === '-h') {
      out.help = true;
      continue;
    }
    if (arg === '--token') {
      const v = argv[++i];
      if (!v || v.startsWith('--')) {
        throw new Error('--token requires a path argument');
      }
      out.token = v;
      continue;
    }
    if (arg.startsWith('--token=')) {
      out.token = arg.slice('--token='.length);
      continue;
    }
    if (arg === '--format') {
      const v = argv[++i];
      if (!v || v.startsWith('--')) {
        throw new Error('--format requires a format argument');
      }
      out.format = v;
      continue;
    }
    if (arg.startsWith('--format=')) {
      out.format = arg.slice('--format='.length);
      continue;
    }
    if (arg === '--scheme') {
      const v = argv[++i];
      if (v !== 'dark' && v !== 'light') {
        throw new Error('--scheme must be dark or light');
      }
      out.scheme = v;
      continue;
    }
    if (arg.startsWith('--scheme=')) {
      const v = arg.slice('--scheme='.length);
      if (v !== 'dark' && v !== 'light') {
        throw new Error('--scheme must be dark or light');
      }
      out.scheme = v;
      continue;
    }
    throw new Error(`Unknown flag: ${arg}\n\n${HELP}`);
  }
  return out;
}

function main(): void {
  let parsed: Parsed;
  try {
    parsed = parseArgv(Bun.argv.slice(2));
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(2);
  }

  if (parsed.help) {
    console.log(HELP.trimEnd());
    process.exit(0);
  }

  if (!parsed.token) {
    console.error(`--token is required\n\n${HELP}`);
    process.exit(2);
  }

  try {
    const value = formatThemeToken(parsed.token, parsed.format, {
      scheme: parsed.scheme,
    });
    // console-ok — CLI stdout is the product; pipe-friendly single value
    console.log(value);
  } catch (err) {
    if (err instanceof ThemeTokenResolveError) {
      console.error(err.message);
      process.exit(2);
    }
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(2);
  }
}

if (import.meta.main) {
  main();
}

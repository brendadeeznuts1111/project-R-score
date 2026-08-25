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
 *   bun run tokens --token namespaces.bun14.accent --all-formats
 *   bun run tokens --token semantic.tiers.sharp --format hex   # alias → tier
 *
 * @see https://bun.com/docs/runtime/color
 * @see docs/portal-foundation.md
 */
import {
  ThemeTokenResolveError,
  formatThemeToken,
  normalizeThemeTokenPath,
  resolveThemeTokenColor,
  type ThemeColorScheme,
} from '../lib/portal/theme-token-resolve.ts';
import { diagnoseColor } from '../lib/factory/color-diagnostics.ts';

const HELP = `Read-only portal theme token printer (theme.jsonc via portalTheme).

Usage:
  bun run tokens --token <dotted.path> [--format <fmt> | --all-formats] [--scheme dark|light]

Options:
  --token <path>     Required. Dotted path into theme.jsonc
                     (e.g. semantic.vertical.sportsbook, semantic.pattern.bettor.sharp,
                     dark.green)
  --format <fmt>     Bun.color format (default: hex). Examples:
                     ansi, ansi-16, ansi-256, ansi-16m, css, rgb, rgba,
                     hsl, lab, hex, HEX, {rgb}, {rgba}, [rgb], [rgba], number
  --all-formats      Emit a JSON report for all 16 Bun 1.4 color formats
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
  formatExplicit: boolean;
  allFormats: boolean;
  scheme: ThemeColorScheme;
  help: boolean;
};

function parseArgv(argv: string[]): Parsed {
  const out: Parsed = {
    format: 'hex',
    formatExplicit: false,
    allFormats: false,
    scheme: 'dark',
    help: false,
  };
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
      out.formatExplicit = true;
      continue;
    }
    if (arg.startsWith('--format=')) {
      out.format = arg.slice('--format='.length);
      out.formatExplicit = true;
      continue;
    }
    if (arg === '--all-formats') {
      out.allFormats = true;
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
  if (out.allFormats && out.formatExplicit) {
    throw new Error('--format and --all-formats are mutually exclusive');
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
    if (parsed.allFormats) {
      const color = resolveThemeTokenColor(parsed.token, { scheme: parsed.scheme });
      const report = diagnoseColor(color);
      // console-ok — CLI stdout is the JSON product.
      console.log(
        JSON.stringify(
          {
            token: normalizeThemeTokenPath(parsed.token),
            scheme: parsed.scheme,
            sourceColor: color,
            formatCount: report.formats.length,
            formats: report.formats,
          },
          null,
          2
        )
      );
      return;
    }
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

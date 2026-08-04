#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Verify warehouse tournament snap keys have glossary ownership.
 *
 *   bun run verify:tournament-glossary -- setka_cup_ua_w
 *   bun run verify:tournament-glossary -- setka_cup_ua_w tournament.setka_cup --json
 *   bun run verify:tournament-glossary -- --json setka_cup_ua_w
 *   bun run verify:tournament-glossary -- --list-known
 *
 * Ownership rule: snap facets (region/gender) hang off tournament.* leaves.
 * setka_cup_ua_w → tournament.setka_cup + region=ua + gender=FEMALE
 *
 * @see lib/glossary/tournament-snap.ts
 */
import { colorize, jsonOut } from '../lib/console-depth.ts';
import {
  KNOWN_TOURNAMENT_KEYS,
  formatOwnershipReport,
  parseTournamentSnap,
  verifyTournamentSnapOwnership,
} from '../lib/glossary/tournament-snap.ts';

/** Boolean flags that never consume the following token as a value. */
const BOOLEAN_FLAGS = new Set(['--json', '--list-known', '--']);

/**
 * Collect positional snap keys. Boolean options never eat the next arg.
 * Value options (`--foo=bar` or future `--path DIR`) still skip the value.
 */
export function positionalSnaps(argv: readonly string[]): string[] {
  const out: string[] = [];
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === '--') continue;
    if (a.startsWith('--')) {
      if (a.includes('=')) continue;
      if (BOOLEAN_FLAGS.has(a)) continue;
      // Value-taking option: skip following non-flag token
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) i++;
      continue;
    }
    out.push(a);
  }
  return out;
}

async function main(): Promise<void> {
  const argv = Bun.argv;
  const asJson = argv.includes('--json');
  const listKnown = argv.includes('--list-known');

  if (listKnown) {
    if (asJson) {
      jsonOut({
        ok: true,
        tournaments: KNOWN_TOURNAMENT_KEYS.map(k => ({
          key: k,
          glossaryId: `tournament.${k}`,
        })),
      });
    } else {
      console.log('Known tournament series keys (glossary leaves):');
      for (const k of KNOWN_TOURNAMENT_KEYS) {
        console.log(`  ${k.padEnd(22)} tournament.${k}`);
      }
      console.log('\nSnap facets (not glossary leaves): region (iso2) + gender (m|w|x)');
      console.log('  e.g. setka_cup_ua_w → tournament.setka_cup + ua + FEMALE');
    }
    return;
  }

  const snaps = positionalSnaps(argv);
  if (snaps.length === 0) {
    console.error(`Usage:
  bun run verify:tournament-glossary -- <snap> [snap…]
  bun run verify:tournament-glossary -- --list-known
  bun run verify:tournament-glossary -- setka_cup_ua_w --json
  bun run verify:tournament-glossary -- --json setka_cup_ua_w

Example:
  bun run verify:tournament-glossary -- setka_cup_ua_w`);
    process.exit(2);
  }

  const reports = [];
  for (const snap of snaps) {
    reports.push(await verifyTournamentSnapOwnership(snap));
  }

  if (asJson) {
    jsonOut({
      ok: reports.every(r => r.ok),
      count: reports.length,
      reports,
    });
  } else {
    for (const r of reports) {
      console.log(colorize(formatOwnershipReport(r), r.ok ? '#3fb950' : '#f85149'));
      console.log('');
    }
    // Parse preview for the first snap
    const p = parseTournamentSnap(snaps[0]!);
    if (p && !asJson) {
      console.log(
        colorize(
          `parse · ${snaps[0]} → ${p.glossaryId} region=${p.region ?? '—'} gender=${p.gender ?? '—'}`,
          '#8b949e'
        )
      );
    }
  }

  if (reports.some(r => !r.ok)) process.exit(1);
}

if (import.meta.main) {
  await main();
}

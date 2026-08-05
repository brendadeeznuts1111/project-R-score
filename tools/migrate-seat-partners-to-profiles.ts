#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/reference/bun/TOML/parse — Bun.TOML.parse
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
// @see https://bun.com/docs/runtime/toml#bun-toml-stringify — Bun.TOML.stringify
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// migrate-seat-partners-to-profiles.ts — seed unified Partner Profiles from
// the committed seat-capital-desk bake.
//
//   bun run partners:profiles:seed            # write config/partner-profiles/<CODE>.toml
//   bun run partners:profiles:seed -- --dry-run   # print the plan, write nothing
//
// Mapping rules:
//   - ready outs → books.<bookKey> (bookKey = slug derived from the seat book
//     name, BOOK_KEY_RE-safe; not registry-membership-claimed — those PPH
//     desks are not in the canonical @factorywager/bookmakers registry yet)
//   - placeholder / deferred outs (no real book or username) are skipped
//   - funding (method/rail/target) + limits (maxBet/freeRollPct) mapped from
//     the seat out; vaultKey = partner:<CODE>:<bookKey> (derived, not secret)
//   - accounting.fundStatus from the seat row; lifecycle phase derived
//     (operator_ready when the partner has books, else incomplete)
//   - telegram chatIds are intentionally NOT copied (sensitive — the
//     gitleaks safety gate rejects re-uploading them); link later
// Idempotent: merges into existing profiles (books upserted per bookKey).
//
// @see docs/design/unified-partner-profile.md

import { joinPath } from '../lib/path-bun';
import { BOOK_KEY_RE } from '../lib/partner-profile/schema';
import { tomlStringify } from '../lib/toml-stringify';

export const SEAT_CAPITAL_DESK_PATH = 'public/registry/seat-capital-desk.json';
export const PROFILES_DIR = 'config/partner-profiles';

export interface SeatOut {
  outNum?: string;
  book?: string;
  username?: string;
  depositMethod?: string;
  sendTo?: string;
  maxBet?: string | number;
  freeplayPct?: string | number;
  status?: string;
  incomplete?: boolean;
}

export interface SeatRow {
  partnerCode?: string;
  callSign?: string;
  fundStatus?: string;
  outs?: SeatOut[];
}

export interface ProfileFromSeatResult {
  code: string;
  callSign: string;
  profile: Record<string, unknown>;
  skipped: string[];
}

/** Stable BOOK_KEY_RE-safe slug from a seat book name ("Hard Rock Florida" → "hard-rock-florida"). */
export function slugifyBookKey(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!BOOK_KEY_RE.test(slug)) {
    throw new Error(`cannot derive bookKey from "${name}" (got "${slug}")`);
  }
  return slug;
}

function toNumber(value: string | number | undefined): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'number') return value;
  const n = Number(String(value).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : undefined;
}

/** Map a seat row to a unified profile (books from ready outs only). */
export function profileFromSeatRow(row: SeatRow): ProfileFromSeatResult {
  const code = String(row.partnerCode || '').toUpperCase();
  const callSign = String(row.callSign || '').toUpperCase();
  if (!code || !callSign) throw new Error(`seat row missing partnerCode/callSign`);
  const books: Record<string, unknown> = {};
  const skipped: string[] = [];
  for (const out of row.outs ?? []) {
    const bookName = (out.book ?? '').trim();
    const username = (out.username ?? '').trim();
    const ready = out.status === 'ready' && username && username !== '—';
    if (!ready) {
      skipped.push(`${bookName || '(no book)'} (${out.status ?? 'no status'})`);
      continue;
    }
    const bookKey = slugifyBookKey(bookName);
    const method = (out.depositMethod ?? 'unknown').trim().toLowerCase();
    const freeRollPct = toNumber(out.freeplayPct);
    books[bookKey] = {
      type: 'pph',
      status: 'ready',
      account: { username, vaultKey: `partner:${code}:${bookKey}` },
      funding: {
        method: `deposit.method.${method}`,
        rail: out.depositMethod ?? 'unknown',
        ...(out.sendTo ? { target: out.sendTo } : {}),
      },
      limits: {
        ...(toNumber(out.maxBet) !== undefined ? { maxBet: toNumber(out.maxBet) } : {}),
        ...(freeRollPct !== undefined ? { freeRollPct } : {}),
      },
    };
  }
  const hasBooks = Object.keys(books).length > 0;
  return {
    code,
    callSign,
    skipped,
    profile: {
      meta: { templateId: 'partner-active', name: code, version: '1.0.0', source: 'telegram' },
      identity: { code, callSign, status: 'onboarded' },
      lifecycle: { status: 'active', phase: hasBooks ? 'operator_ready' : 'incomplete' },
      accounting: { fundStatus: row.fundStatus ?? 'ready' },
      ...(hasBooks ? { books } : {}),
    },
  };
}

export async function migrateSeatPartnersToProfiles(
  root = process.cwd(),
  dryRun = false
): Promise<{ written: string[]; skipped: Record<string, string[]> }> {
  const seatPath = joinPath(root, SEAT_CAPITAL_DESK_PATH);
  const seat = (await Bun.file(seatPath).json()) as { rows?: SeatRow[] };
  const written: string[] = [];
  const skipped: Record<string, string[]> = {};
  for (const row of seat.rows ?? []) {
    const { code, profile, skipped: rowSkipped } = profileFromSeatRow(row);
    const path = joinPath(root, PROFILES_DIR, `${code}.toml`);
    // Merge into any existing profile (idempotent — books upserted per bookKey).
    let merged = profile;
    if (!dryRun && (await Bun.file(path).exists())) {
      const existing = Bun.TOML.parse(await Bun.file(path).text()) as Record<string, unknown>;
      merged = { ...existing, ...profile, books: { ...existing.books, ...profile.books } };
    }
    if (rowSkipped.length > 0) skipped[code] = rowSkipped;
    if (dryRun) {
      console.log(
        `[dry-run] would write ${code}.toml (${Object.keys(profile.books ?? {}).length} books)`
      );
    } else {
      await Bun.write(path, `${tomlStringify(merged).trimEnd()}\n`);
      written.push(`${code}.toml`);
    }
  }
  return { written, skipped };
}

async function main(): Promise<void> {
  const dryRun = Bun.argv.includes('--dry-run');
  const { written, skipped } = await migrateSeatPartnersToProfiles(process.cwd(), dryRun);
  for (const [code, outs] of Object.entries(skipped)) {
    for (const out of outs) console.log(`  · ${code}: skipped ${out}`);
  }
  if (dryRun) console.log(`\n[dry-run] no profiles written`);
  else console.log(`\n✓ wrote ${written.length} profile(s): ${written.join(', ')}`);
}

if (import.meta.main) {
  main().catch(e => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}

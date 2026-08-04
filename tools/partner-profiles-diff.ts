// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// tools/partner-profiles-diff.ts — partner profile TOML vs ops-DB diff + audit.
//
//   bun run partner:profiles:diff                      # added / changed / removed / unchanged
//   bun run partner:profiles:diff -- --record          # also advance the audit baseline
//   bun run partner:profiles:audit                     # list all audit rows
//   bun run partner:profiles:audit -- --code=SPEN      # filter by partner
//
// Baseline semantics: a code is "added" with no audit record, "changed" when
// its TOML SHA-256 drifts from the last record, "removed" when it is known
// (audited or bound) but has no TOML file. --record writes audit rows.

import { colorize, logTable } from '../lib/console-depth.ts';
import {
  diffPartnerProfiles,
  listProfileAudit,
  loadProfileTomlEntries,
  openProfileAuditDb,
  recordDiffAudit,
} from '../lib/partner-profile/profiles-diff.ts';

type Command = 'diff' | 'audit';

function parseArgv(argv: string[]): { command: Command; record: boolean; code?: string } | null {
  const positional = argv.filter(a => !a.startsWith('-'));
  const command = positional[0] as Command | undefined;
  if (!command || !['diff', 'audit'].includes(command)) return null;
  let record = false;
  let code: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === '--record') record = true;
    else if (a === '--code' && argv[i + 1]) code = argv[++i]!.toUpperCase();
  }
  return { command, record, code };
}

async function main(): Promise<void> {
  const opts = parseArgv(Bun.argv.slice(2));
  if (!opts) {
    console.log(
      `Usage: bun tools/partner-profiles-diff.ts <diff|audit> [--record] [--code <CODE>]`
    );
    process.exit(2);
  }

  const db = openProfileAuditDb();

  try {
    if (opts.command === 'audit') {
      const rows = listProfileAudit(db, opts.code);
      if (rows.length === 0) {
        console.log(colorize('partner:profiles:audit · no rows', '#8b949e'));
        return;
      }
      logTable(
        rows.slice(0, 50).map(r => ({
          code: r.partnerCode,
          action: r.action,
          hash: r.fileHash.slice(0, 10),
          at: r.recordedAt.slice(0, 19),
        })),
        ['code', 'action', 'hash', 'at']
      );
      if (rows.length > 50) console.log(`  · … +${rows.length - 50} more`);
      return;
    }

    const entries = await loadProfileTomlEntries();
    const diff = diffPartnerProfiles({ entries, db });

    logTable(
      [
        {
          total: diff.total,
          added: diff.added.length,
          changed: diff.changed.length,
          removed: diff.removed.length,
          unchanged: diff.unchanged,
        },
      ],
      ['total', 'added', 'changed', 'removed', 'unchanged']
    );

    if (diff.added.length > 0) {
      console.log(colorize(`added (no audit baseline): ${diff.added.join(', ')}`, '#3fb950'));
    }
    for (const c of diff.changed) {
      console.log(
        colorize(
          `changed: ${c.code} · ${c.prevHash?.slice(0, 10)} → ${c.hash.slice(0, 10)}`,
          '#d29922'
        )
      );
    }
    if (diff.removed.length > 0) {
      console.log(colorize(`removed (no TOML): ${diff.removed.join(', ')}`, '#f85149'));
    }

    if (opts.record) {
      const recorded = recordDiffAudit(db, diff, entries);
      console.log(colorize(`partner:profiles:diff · ${recorded} audit row(s) recorded`, '#3fb950'));
    }
  } finally {
    db.close();
  }
}

if (import.meta.main) {
  await main();
}

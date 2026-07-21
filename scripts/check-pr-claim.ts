#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/console#reading-from-stdin — Bun.stdin
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/file-io — Bun.file
/**
 * Light PR claim→evidence checker (docs/harness/PROOF.md).
 *
 * Warn-first until WARN_UNTIL_ISO (then exit 1 on empty claim rows).
 * Draft PRs are skipped. `--strict` always fails on empty claims.
 *
 *   bun scripts/check-pr-claim.ts --body-file path.md
 *   bun scripts/check-pr-claim.ts --event "$GITHUB_EVENT_PATH"
 *   echo "$BODY" | bun scripts/check-pr-claim.ts --stdin
 */
import { flagValue, hasFlag } from './lib/cli-args';

/** After this date (UTC), empty claim tables fail CI (warn-only before). */
const WARN_UNTIL_ISO = '2026-07-28T00:00:00.000Z';

type Result = {
  ok: boolean;
  draft: boolean;
  warnOnly: boolean;
  missingSection: boolean;
  emptyClaimRow: boolean;
  message: string;
};

function warnOnlyMode(strict: boolean): boolean {
  if (strict) return false;
  return Date.now() < Date.parse(WARN_UNTIL_ISO);
}

function parseClaimTable(body: string): { missingSection: boolean; emptyClaimRow: boolean } {
  const missingSection = !/##\s*Claim\s*→\s*evidence/i.test(body);
  if (missingSection) return { missingSection: true, emptyClaimRow: true };

  // Data rows under the claim table: | claim | kind | evidence |
  const rows = body
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.startsWith('|') && !/^\|\s*-+/.test(l));

  const dataRows = rows.filter(l => {
    const lower = l.toLowerCase();
    return (
      !lower.includes('claim (one sentence)') &&
      !lower.includes('kind (`unit`') &&
      !lower.includes('evidence (command')
    );
  });

  // Prefer rows in/after the Claim section
  const claimIdx = body.search(/##\s*Claim\s*→\s*evidence/i);
  const after = claimIdx >= 0 ? body.slice(claimIdx) : body;
  const afterRows = after
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.startsWith('|') && !/^\|\s*-+/.test(l))
    .filter(l => {
      const lower = l.toLowerCase();
      return (
        !lower.includes('claim (one sentence)') &&
        !lower.includes('kind (`unit`') &&
        !lower.includes('evidence (command')
      );
    });

  const candidates = afterRows.length > 0 ? afterRows : dataRows;
  if (candidates.length === 0) return { missingSection: false, emptyClaimRow: true };

  const filled = candidates.some(row => {
    const cells = row
      .split('|')
      .slice(1, -1)
      .map(c =>
        c
          .replace(/<!--.*?-->/g, '')
          .replace(/\u00a0/g, ' ')
          .trim()
      );
    // Need non-empty claim + kind + evidence
    return cells.length >= 3 && cells[0] !== '' && cells[1] !== '' && cells[2] !== '';
  });

  return { missingSection: false, emptyClaimRow: !filled };
}

export function evaluatePrClaim(body: string, opts: { draft?: boolean; strict?: boolean }): Result {
  const draft = opts.draft === true;
  if (draft) {
    return {
      ok: true,
      draft: true,
      warnOnly: true,
      missingSection: false,
      emptyClaimRow: false,
      message: 'draft PR — claim→evidence check skipped',
    };
  }

  const { missingSection, emptyClaimRow } = parseClaimTable(body ?? '');
  const warnOnly = warnOnlyMode(opts.strict === true);
  const bad = missingSection || emptyClaimRow;
  const message = missingSection
    ? 'PR body missing "## Claim → evidence" section — fill the table (docs/harness/PROOF.md)'
    : emptyClaimRow
      ? 'Claim → evidence table has no filled row (claim · kind · evidence)'
      : 'claim→evidence present';

  return {
    ok: !bad || warnOnly,
    draft: false,
    warnOnly: bad && warnOnly,
    missingSection,
    emptyClaimRow,
    message,
  };
}

async function readBody(): Promise<{ body: string; draft: boolean }> {
  if (hasFlag('stdin')) {
    const body = await new Response(Bun.stdin).text();
    return { body, draft: hasFlag('draft') };
  }

  const bodyFile = flagValue('body-file');
  if (bodyFile) {
    const body = await Bun.file(bodyFile).text();
    return { body, draft: hasFlag('draft') };
  }

  const eventPath = flagValue('event') || Bun.env.GITHUB_EVENT_PATH || '';
  if (eventPath) {
    const raw = await Bun.file(eventPath).json();
    const pr = (raw as { pull_request?: { body?: string | null; draft?: boolean } }).pull_request;
    if (!pr) throw new Error(`no pull_request in event file: ${eventPath}`);
    return { body: pr.body ?? '', draft: pr.draft === true };
  }

  console.error('usage: check-pr-claim.ts --body-file PATH | --event PATH | --stdin [--strict]');
  process.exit(2);
}

async function main(): Promise<void> {
  const strict = hasFlag('strict');
  const { body, draft } = await readBody();
  const result = evaluatePrClaim(body, { draft, strict });

  if (result.draft) {
    console.info(`ℹ️  ${result.message}`);
    process.exit(0);
  }

  if (result.warnOnly) {
    console.warn(`⚠️  ${result.message}`);
    console.warn(`   warn-only until ${WARN_UNTIL_ISO} — then this fails (or pass --strict now)`);
    console.warn('   repair: fill Claim → evidence in the PR body (docs/harness/PROOF.md)');
    process.exit(0);
  }

  if (!result.ok) {
    console.error(`❌ ${result.message}`);
    console.error('   invariant: non-draft PRs state claim · kind · evidence');
    console.error('   owner: docs/harness/PROOF.md · .github/pull_request_template.md');
    console.error('   repair: edit PR body — fill the Claim → evidence table');
    process.exit(1);
  }

  console.info(`✅ ${result.message}`);
}

if (import.meta.main) {
  await main();
}

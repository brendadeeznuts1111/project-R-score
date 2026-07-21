#!/usr/bin/env bun
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
// @see https://bun.com/docs/runtime/console#reading-from-stdin — Bun.stdin
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/file-io — Bun.file
/**
 * Light PR claim→evidence checker (docs/harness/PROOF.md).
 *
 * Warn-first until WARN_UNTIL_ISO (then exit 1 on empty claim rows).
 * Draft PRs are skipped. `--strict` always fails on empty claims.
 * `--dry-run` evaluates fail-closed semantics but always exits 0 (WOULD_FAIL / WOULD_PASS).
 * Kind cell must be ProofKind allowlist (unit|boundary|journey|deployed), optionally joined with +.
 * Soft: if body mentions `` `proof-id` ``, warn when that path’s freshRerun command is absent (never fails CI).
 *
 *   bun scripts/check-pr-claim.ts --body-file PATH
 *   bun scripts/check-pr-claim.ts --event "$GITHUB_EVENT_PATH"
 *   bun scripts/check-pr-claim.ts --dry-run --event "$GITHUB_EVENT_PATH"
 *   echo "$BODY" | bun scripts/check-pr-claim.ts --stdin
 */
import { CRITICAL_PROOF_PATHS } from '../lib/harness/proof';
import { flagValue, hasFlag } from './lib/cli-args';

/** After this instant (UTC), empty claim tables fail CI (warn-only before). */
export const WARN_UNTIL_ISO = '2026-07-28T00:00:00.000Z';
export const WARN_UNTIL_MS = Date.parse(WARN_UNTIL_ISO);

/** Matches ProofKind in lib/harness/proof.ts */
export const PROOF_KINDS = ['unit', 'boundary', 'journey', 'deployed'] as const;

export type Result = {
  ok: boolean;
  draft: boolean;
  warnOnly: boolean;
  missingSection: boolean;
  emptyClaimRow: boolean;
  invalidKind: boolean;
  /** Soft: proof ids mentioned in backticks whose freshRerun command is absent from the body */
  missingFreshRerun: string[];
  message: string;
};

/** UTC ms comparison — flip is not runner-local calendar day. */
export function warnOnlyMode(strict: boolean, nowMs: number = Date.now()): boolean {
  if (strict) return false;
  return nowMs < WARN_UNTIL_MS;
}

export function kindCellValid(cell: string): boolean {
  const parts = cell
    .replace(/`/g, '')
    .split(/[+/,]/)
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
  if (parts.length === 0) return false;
  const allow = new Set<string>(PROOF_KINDS);
  return parts.every(p => allow.has(p));
}

/**
 * Soft paste ratchet: when the PR body mentions `` `proof-id` ``, the body should
 * also contain that path’s `freshRerun` command string. Never fail-closed by itself.
 */
export function mentionedProofIdsMissingFreshRerun(
  body: string,
  paths: readonly { id: string; freshRerun: string }[] = CRITICAL_PROOF_PATHS // brand-ok — opaque proof-path catalog key
): string[] {
  const missing: string[] = [];
  for (const p of paths) {
    if (!body.includes(`\`${p.id}\``)) continue;
    if (!body.includes(p.freshRerun)) missing.push(p.id);
  }
  return missing;
}

function parseClaimTable(body: string): {
  missingSection: boolean;
  emptyClaimRow: boolean;
  invalidKind: boolean;
} {
  const missingSection = !/##\s*Claim\s*→\s*evidence/i.test(body);
  if (missingSection) return { missingSection: true, emptyClaimRow: true, invalidKind: false };

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

  if (afterRows.length === 0)
    return { missingSection: false, emptyClaimRow: true, invalidKind: false };

  let hasValidRow = false;
  let sawInvalidKind = false;
  for (const row of afterRows) {
    const cells = row
      .split('|')
      .slice(1, -1)
      .map(c =>
        c
          .replace(/<!--.*?-->/g, '')
          .replace(/\u00a0/g, ' ')
          .trim()
      );
    if (cells.length < 3 || cells[0] === '' || cells[1] === '' || cells[2] === '') continue;
    if (!kindCellValid(cells[1]!)) {
      sawInvalidKind = true;
      continue;
    }
    hasValidRow = true;
  }

  return {
    missingSection: false,
    emptyClaimRow: !hasValidRow,
    invalidKind: sawInvalidKind && !hasValidRow,
  };
}

export function evaluatePrClaim(
  body: string,
  opts: { draft?: boolean; strict?: boolean; nowMs?: number } = {}
): Result {
  const draft = opts.draft === true;
  if (draft) {
    return {
      ok: true,
      draft: true,
      warnOnly: true,
      missingSection: false,
      emptyClaimRow: false,
      invalidKind: false,
      missingFreshRerun: [],
      message: 'draft PR — claim→evidence check skipped',
    };
  }

  const text = body ?? '';
  const { missingSection, emptyClaimRow, invalidKind } = parseClaimTable(text);
  const missingFreshRerun = mentionedProofIdsMissingFreshRerun(text);
  const warnOnly = warnOnlyMode(opts.strict === true, opts.nowMs);
  const bad = missingSection || emptyClaimRow;
  const message = missingSection
    ? 'PR body missing "## Claim → evidence" section — fill the table (docs/harness/PROOF.md)'
    : invalidKind
      ? 'Claim → evidence kind must be unit|boundary|journey|deployed (optionally joined with +)'
      : emptyClaimRow
        ? 'Claim → evidence table has no filled row (claim · kind · evidence)'
        : 'claim→evidence present';

  return {
    ok: !bad || warnOnly,
    draft: false,
    warnOnly: bad && warnOnly,
    missingSection,
    emptyClaimRow,
    invalidKind,
    missingFreshRerun,
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

  console.error(
    'usage: check-pr-claim.ts --body-file PATH | --event PATH | --stdin [--strict|--dry-run]'
  );
  process.exit(2);
}

function warnMissingFreshRerun(ids: string[]): void {
  if (ids.length === 0) return;
  console.warn(
    `⚠️  soft: mentioned proof id(s) missing freshRerun command in body: ${ids.join(', ')}`
  );
  console.warn('   repair: paste that claim’s freshRerun output (docs/harness/FRESH-RERUN.md)');
}

async function main(): Promise<void> {
  const dryRun = hasFlag('dry-run');
  const strict = hasFlag('strict') || dryRun;
  const { body, draft } = await readBody();
  const result = evaluatePrClaim(body, { draft, strict });

  if (dryRun) {
    if (result.draft) {
      console.info(`DRY_RUN SKIP · ${result.message}`);
      process.exit(0);
    }
    const wouldFail = result.missingSection || result.emptyClaimRow;
    console.info(`${wouldFail ? 'WOULD_FAIL' : 'WOULD_PASS'} · ${result.message}`);
    warnMissingFreshRerun(result.missingFreshRerun);
    process.exit(0);
  }

  if (result.draft) {
    console.info(`ℹ️  ${result.message}`);
    process.exit(0);
  }

  if (result.warnOnly) {
    console.warn(`⚠️  ${result.message}`);
    console.warn(`   warn-only until ${WARN_UNTIL_ISO} — then this fails (or pass --strict now)`);
    console.warn('   repair: fill Claim → evidence in the PR body (docs/harness/PROOF.md)');
    warnMissingFreshRerun(result.missingFreshRerun);
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
  warnMissingFreshRerun(result.missingFreshRerun);
}

if (import.meta.main) {
  await main();
}

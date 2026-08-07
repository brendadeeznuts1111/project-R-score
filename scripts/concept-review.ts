#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Review pending concept proposals.
 *
 *   bun scripts/concept-review.ts --list [--output json]
 *   bun scripts/concept-review.ts --id <id> --approve [--reason r] [--correlation-id PR#n]
 *   bun scripts/concept-review.ts --id <id> --reject --reason r
 *
 * Approve inserts the concept into lib/portal/semantic-vocabulary.ts.
 * Env: CONCEPT_REVIEWER (recorded as reviewedBy).
 */
import { colorize, jsonOut, logTable } from '../lib/console-depth.ts';
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
import {
  appendHistory,
  insertConceptIntoVocabulary,
  loadLifecycleStore,
  saveLifecycleStore,
  todayIsoDate,
  vocabularyEntryFromProposal,
  type ConceptLifecycleStore,
  type ConceptProposal,
} from '../lib/portal/concept-lifecycle.ts';

function argValue(argv: readonly string[], flag: string): string | undefined {
  const eq = argv.find(a => a.startsWith(`${flag}=`));
  if (eq) return eq.slice(flag.length + 1);
  const i = argv.indexOf(flag);
  if (i !== -1) return argv[i + 1];
  return undefined;
}

function findPending(
  store: ConceptLifecycleStore,
  id: string // brand-ok — glossary concept key
): ConceptProposal | undefined {
  return store.proposals.find(p => p.id === id);
}

export async function runReview(argv: readonly string[]): Promise<number> {
  const store = await loadLifecycleStore();
  const output = argValue(argv, '--output') ?? Bun.env.CONCEPT_OUTPUT?.trim() ?? 'table';

  if (argv.includes('--list') || !argValue(argv, '--id')) {
    const pending = store.proposals.filter(p => p.status === 'pending');
    if (output === 'json') {
      jsonOut({ pending });
    } else if (pending.length === 0) {
      console.log('no pending concept proposals');
    } else {
      logTable(
        pending.map(p => ({
          id: p.id,
          label: p.label,
          domain: p.domain,
          group: p.group,
          proposedBy: p.proposedBy,
          proposedAt: p.proposedAt,
        })),
        ['id', 'label', 'domain', 'group', 'proposedBy', 'proposedAt']
      );
    }
    return 0;
  }

  const id = argValue(argv, '--id')!;
  const approve = argv.includes('--approve');
  const reject = argv.includes('--reject');
  const reason = argValue(argv, '--reason')?.trim() || null;

  if (approve === reject) {
    console.error(colorize('❌ pass exactly one of --approve / --reject', '#f85149'));
    return 1;
  }
  const proposal = findPending(store, id);
  if (!proposal) {
    console.error(colorize(`❌ unknown proposal id "${id}"`, '#f85149'));
    return 1;
  }
  if (proposal.status !== 'pending') {
    console.error(
      colorize(`❌ proposal "${id}" already reviewed (status: ${proposal.status})`, '#f85149')
    );
    return 1;
  }
  if (reject && !reason) {
    console.error(colorize('❌ --reject requires --reason', '#f85149'));
    return 1;
  }

  const now = new Date().toISOString();
  proposal.status = approve ? 'approved' : 'rejected';
  proposal.reviewedBy = Bun.env.CONCEPT_REVIEWER?.trim() || 'cli';
  proposal.reviewedAt = now;
  proposal.reviewReason = reason;

  if (approve) {
    const entry = vocabularyEntryFromProposal(proposal, {
      correlationId: argValue(argv, '--correlation-id')?.trim() || undefined,
      addedAt: todayIsoDate(),
    });
    await insertConceptIntoVocabulary(entry);
    console.log(colorize(`✅ approved ${id} — inserted into semantic vocabulary`, '#2da44e'));
  } else {
    console.log(colorize(`🚫 rejected ${id} — ${reason}`, '#f85149'));
  }

  const next = appendHistory(store, {
    at: now,
    action: approve ? 'approve' : 'reject',
    id,
    actor: 'cli',
    reason,
    replaceBy: null,
  });
  await saveLifecycleStore(next);
  return 0;
}

if (import.meta.main) {
  const argv = applyUnknownLongOptionGuardFor('concept:review', Bun.argv.slice(2));
  process.exit(await runReview(argv));
}

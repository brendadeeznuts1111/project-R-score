#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Concept lifecycle history — newest first.
 *
 *   bun scripts/concept-history.ts [--id <id>] [--limit N] [--output json|table]
 */
import { jsonOut, logTable } from '../lib/console-depth.ts';
import { loadLifecycleStore, type ConceptHistoryEvent } from '../lib/portal/concept-lifecycle.ts';

function argValue(argv: readonly string[], flag: string): string | undefined {
  const eq = argv.find(a => a.startsWith(`${flag}=`));
  if (eq) return eq.slice(flag.length + 1);
  const i = argv.indexOf(flag);
  if (i !== -1) return argv[i + 1];
  return undefined;
}

export function selectHistory(
  history: readonly ConceptHistoryEvent[],
  options: { id?: string; limit?: number } = {} // brand-ok — glossary concept key filter
): ConceptHistoryEvent[] {
  const limit = options.limit ?? 20;
  return history
    .filter(event => !options.id || event.id === options.id)
    .slice()
    .reverse()
    .slice(0, limit);
}

export async function runHistory(argv: readonly string[]): Promise<number> {
  const id = argValue(argv, '--id')?.trim();
  const rawLimit = argValue(argv, '--limit') ?? Bun.env.CONCEPT_HISTORY_LIMIT?.trim();
  const parsed = rawLimit ? Number.parseInt(rawLimit, 10) : Number.NaN;
  const limit = Number.isFinite(parsed) && parsed > 0 ? parsed : 20;
  const output = argValue(argv, '--output') ?? Bun.env.CONCEPT_OUTPUT?.trim() ?? 'table';

  const store = await loadLifecycleStore();
  const events = selectHistory(store.history, { id, limit });

  if (output === 'json') {
    jsonOut({ events });
  } else if (events.length === 0) {
    console.log(id ? `no history for ${id}` : 'no concept lifecycle history');
  } else {
    logTable(
      events.map(e => ({
        at: e.at,
        action: e.action,
        id: e.id,
        actor: e.actor,
        reason: e.reason ?? '',
        replaceBy: e.replaceBy ?? '',
      })),
      ['at', 'action', 'id', 'actor', 'reason', 'replaceBy']
    );
  }
  return 0;
}

if (import.meta.main) {
  process.exit(await runHistory(Bun.argv.slice(2)));
}

#!/usr/bin/env bun
// @see https://bun.com/docs/bundler/executables — --force
// @see https://bun.com/reference/bun/argv — Bun.argv
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * Archive a portal semantic concept (terminal lifecycle state).
 *
 *   bun scripts/concept-archive.ts --id <id> [--force] [--reason "…"]
 *
 * Refuses to archive a concept still referenced in portal surfaces unless
 * --force is passed (usage counted via lib/portal/concept-usage.ts).
 */
import { colorize } from '../lib/console-depth.ts';
import {
  appendHistory,
  loadLifecycleStore,
  saveLifecycleStore,
  setConceptLifecycleInVocabulary,
  todayIsoDate,
} from '../lib/portal/concept-lifecycle.ts';
import { countPortalConceptUsages } from '../lib/portal/concept-usage.ts';
import { PORTAL_SEMANTIC_CONCEPTS } from '../lib/portal/semantic-vocabulary.ts';

function argValue(argv: readonly string[], flag: string): string | undefined {
  const eq = argv.find(a => a.startsWith(`${flag}=`));
  if (eq) return eq.slice(flag.length + 1);
  const i = argv.indexOf(flag);
  if (i !== -1) return argv[i + 1];
  return undefined;
}

export async function runArchive(argv: readonly string[]): Promise<number> {
  const id = argValue(argv, '--id')?.trim();
  const reason = argValue(argv, '--reason')?.trim() || null;
  const force = argv.includes('--force');

  if (!id) {
    console.error(colorize('❌ usage: concept-archive.ts --id <id> [--force]', '#f85149'));
    return 1;
  }
  if (!PORTAL_SEMANTIC_CONCEPTS.some(c => c.id === id)) {
    console.error(colorize(`❌ unknown concept id "${id}"`, '#f85149'));
    return 1;
  }

  const usages = await countPortalConceptUsages();
  const usage = usages.get(id) ?? 0;
  if (usage > 0 && !force) {
    console.error(
      colorize(
        `❌ "${id}" still has ${usage} usage(s) in portal surfaces — pass --force to archive anyway`,
        '#f85149'
      )
    );
    return 1;
  }

  const deprecatedAt = todayIsoDate();
  await setConceptLifecycleInVocabulary(id, { status: 'archived', deprecatedAt });

  const store = await loadLifecycleStore();
  const next = appendHistory(store, {
    at: new Date().toISOString(),
    action: 'archive',
    id,
    actor: 'cli',
    reason,
    replaceBy: null,
  });
  await saveLifecycleStore(next);

  console.log(
    colorize(
      `🗄  archived ${id} (${deprecatedAt})${usage > 0 ? ` · force, ${usage} usage(s)` : ''}`,
      '#8b949e'
    )
  );
  return 0;
}

if (import.meta.main) {
  process.exit(
    await runArchive(applyUnknownLongOptionGuardFor('concept:archive', Bun.argv.slice(2)))
  );
}

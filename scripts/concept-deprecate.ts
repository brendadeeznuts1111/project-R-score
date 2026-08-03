#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
/**
 * Deprecate a portal semantic concept in favor of a replacement.
 *
 *   bun scripts/concept-deprecate.ts <id> --replace-by <other-id> --reason "…"
 */
import { colorize } from '../lib/console-depth.ts';
import {
  appendHistory,
  loadLifecycleStore,
  saveLifecycleStore,
  setConceptLifecycleInVocabulary,
  todayIsoDate,
  validateDeprecation,
} from '../lib/portal/concept-lifecycle.ts';

function argValue(argv: readonly string[], flag: string): string | undefined {
  const eq = argv.find(a => a.startsWith(`${flag}=`));
  if (eq) return eq.slice(flag.length + 1);
  const i = argv.indexOf(flag);
  if (i !== -1) return argv[i + 1];
  return undefined;
}

export async function runDeprecate(argv: readonly string[]): Promise<number> {
  const id = argv.find(a => !a.startsWith('--'));
  const replaceBy = argValue(argv, '--replace-by')?.trim();
  const reason = argValue(argv, '--reason')?.trim();

  if (!id || !replaceBy || !reason) {
    console.error(
      colorize(
        '❌ usage: concept-deprecate.ts <id> --replace-by <other-id> --reason "…"',
        '#f85149'
      )
    );
    return 1;
  }

  const errors = validateDeprecation(id, replaceBy);
  if (errors.length > 0) {
    console.error(colorize('❌ cannot deprecate:', '#f85149'));
    for (const error of errors) console.error(`  · ${error}`);
    return 1;
  }

  const deprecatedAt = todayIsoDate();
  await setConceptLifecycleInVocabulary(id, {
    status: 'deprecated',
    replacedBy: replaceBy,
    deprecatedAt,
  });

  const store = await loadLifecycleStore();
  const next = appendHistory(store, {
    at: new Date().toISOString(),
    action: 'deprecate',
    id,
    actor: 'cli',
    reason,
    replaceBy,
  });
  await saveLifecycleStore(next);

  console.log(
    colorize(`⚠️  deprecated ${id} → replaced by ${replaceBy} (${deprecatedAt})`, '#d29922')
  );
  return 0;
}

if (import.meta.main) {
  process.exit(await runDeprecate(Bun.argv.slice(2)));
}

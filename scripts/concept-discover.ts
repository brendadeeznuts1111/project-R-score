#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/runtime/glob — Bun.Glob
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Discover concept-like references in source that are missing from the
 * portal semantic vocabulary, optionally auto-proposing them into the
 * lifecycle review queue.
 *
 *   bun run concept:discover                          # report unknown refs under lib/
 *   bun run concept:discover -- --scan lib/ --output json
 *   bun run concept:discover -- --scan lib/,public/portal --auto-propose
 *
 * Candidates come from data-glossary-concept attributes, #glossary: hrefs,
 * and quoted dotted ids in a known namespace (api · ops · page · section · ui).
 * --auto-propose writes pending proposals to scripts/concept-lifecycle.json;
 * review them with bun run concept:review -- --list.
 */
import { colorize, jsonOut, logTable } from '../lib/console-depth.ts';
import {
  appendHistory,
  loadLifecycleStore,
  saveLifecycleStore,
  validateProposal,
  type ConceptLifecycleStore,
  type ConceptProposal,
} from '../lib/portal/concept-lifecycle.ts';
import {
  inferPortalSemanticDomain,
  PORTAL_SEMANTIC_CONCEPTS,
} from '../lib/portal/semantic-vocabulary.ts';

const ROOT = `${import.meta.dir}/..`;

const LITERAL_ATTR = /data-glossary-concept\s*=\s*"([^"${][^"]*)"/g;
const HREF_LITERAL = /#glossary:([A-Za-z0-9._-]+)/g;
const QUOTED_DOTTED = /['"`]([a-z][a-z0-9_]*(?:\.[a-z0-9_]+){1,4})['"`]/g;

export type ConceptCandidate = {
  id: string; // brand-ok — glossary concept key
  files: string[];
  namespace: string | null;
};

function bump(candidates: Map<string, Set<string>>, id: string, file: string): void {
  // brand-ok — glossary concept key
  const key = id.trim();
  if (!key) return;
  const set = candidates.get(key) ?? new Set<string>();
  set.add(file);
  candidates.set(key, set);
}

/**
 * Scan roots for concept-like refs not present in `known`.
 * Returns candidates keyed by id with their source files.
 */
export async function discoverConceptCandidates(
  roots: readonly string[],
  known: ReadonlySet<string>
): Promise<ConceptCandidate[]> {
  const found = new Map<string, Set<string>>();
  const glob = new Bun.Glob('**/*.{ts,tsx,js,html}');
  for (const root of roots) {
    for await (const rel of glob.scan({ cwd: root, onlyFiles: true })) {
      const text = await Bun.file(`${root}/${rel}`).text();
      const at = `${root}/${rel}`.replace(`${ROOT}/`, '');
      for (const match of text.matchAll(LITERAL_ATTR)) {
        if (match[1]) bump(found, match[1], at);
      }
      for (const match of text.matchAll(HREF_LITERAL)) {
        if (match[1]) bump(found, match[1], at);
      }
      for (const match of text.matchAll(QUOTED_DOTTED)) {
        const id = match[1];
        // Generic quoted ids: only known vocabulary namespaces (noise control).
        if (id && inferPortalSemanticDomain(id)) bump(found, id, at);
      }
    }
  }
  return [...found.entries()]
    .filter(([id]) => !known.has(id))
    .map(([id, files]) => ({
      id,
      files: [...files].sort(),
      namespace: inferPortalSemanticDomain(id) ?? null,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

function humanize(id: string): string {
  // brand-ok — glossary concept key
  const last = id.split('.').pop() ?? id;
  const words = last.replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export type AutoProposeResult = {
  store: ConceptLifecycleStore;
  proposed: string[]; // brand-ok — glossary concept keys
  skipped: Array<{ id: string; reason: string }>; // brand-ok — glossary concept keys
};

/** Create pending proposals for candidates; validate each against the queue. */
export function autoProposeCandidates(
  candidates: readonly ConceptCandidate[],
  store: ConceptLifecycleStore,
  opts: { actor?: string; now?: string } = {}
): AutoProposeResult {
  const actor = opts.actor ?? 'concept-discover';
  const now = opts.now ?? new Date().toISOString();
  let next = store;
  const proposed: string[] = [];
  const skipped: Array<{ id: string; reason: string }> = []; // brand-ok — glossary concept keys

  for (const candidate of candidates) {
    if (!candidate.namespace) {
      skipped.push({
        id: candidate.id,
        reason: 'unknown namespace (expected api · ops · page · section · ui)',
      });
      continue;
    }
    const description = `Discovered by concept:discover in ${candidate.files.join(', ')}`;
    const errors = validateProposal(
      { id: candidate.id, label: humanize(candidate.id), description, domain: candidate.namespace },
      next
    );
    if (errors.length > 0) {
      skipped.push({ id: candidate.id, reason: errors.join('; ') });
      continue;
    }
    const proposal: ConceptProposal = {
      id: candidate.id,
      label: humanize(candidate.id),
      description,
      category: candidate.namespace,
      group: candidate.id.split('.').slice(0, 2).join('.'),
      domain: candidate.namespace,
      correlationId: 'concept-discover',
      status: 'pending',
      proposedBy: actor,
      proposedAt: now,
    };
    next = {
      ...next,
      proposals: [...next.proposals, proposal],
    };
    next = appendHistory(next, {
      at: now,
      action: 'propose',
      id: candidate.id,
      actor,
      reason: `auto-proposed from ${candidate.files.length} file(s)`,
    });
    proposed.push(candidate.id);
  }
  return { store: next, proposed, skipped };
}

function argValues(argv: readonly string[], flag: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === flag && argv[i + 1]) out.push(argv[i + 1]!);
    else if (arg.startsWith(`${flag}=`)) out.push(arg.slice(flag.length + 1));
  }
  return out
    .flatMap(v => v.split(','))
    .map(v => v.trim())
    .filter(Boolean);
}

async function main(): Promise<void> {
  const scans = argValues(Bun.argv, '--scan');
  const roots = (scans.length > 0 ? scans : ['lib/']).map(p => `${ROOT}/${p.replace(/\/$/, '')}`);
  const autoPropose =
    Bun.argv.includes('--auto-propose') || Bun.env.CONCEPT_DISCOVER_AUTO_PROPOSE === '1';
  const wantJson = Bun.argv.includes('--output') && Bun.argv.includes('json');
  const actor = Bun.env.CONCEPT_DISCOVER_ACTOR ?? 'concept-discover';

  const store = await loadLifecycleStore();
  const known = new Set<string>(PORTAL_SEMANTIC_CONCEPTS.map(c => c.id));
  for (const p of store.proposals.filter(p => p.status === 'pending')) known.add(p.id);

  const candidates = await discoverConceptCandidates(roots, known);

  if (!autoPropose) {
    if (wantJson) {
      jsonOut({ scanned: roots.map(r => r.replace(`${ROOT}/`, '')), candidates });
      return;
    }
    console.log(
      colorize(`concept:discover · ${candidates.length} unknown concept ref(s)`, '#58a6ff')
    );
    if (candidates.length > 0) {
      logTable(
        candidates.map(c => ({ id: c.id, namespace: c.namespace ?? '—', files: c.files.length })),
        ['id', 'namespace', 'files']
      );
      console.log(
        colorize('Run with --auto-propose to queue these for concept:review.', '#8b949e')
      );
    }
    return;
  }

  const result = autoProposeCandidates(candidates, store, { actor });
  if (result.proposed.length > 0) await saveLifecycleStore(result.store);

  if (wantJson) {
    jsonOut({ proposed: result.proposed, skipped: result.skipped });
    return;
  }
  console.log(
    colorize(
      `concept:discover · proposed ${result.proposed.length} · skipped ${result.skipped.length}`,
      '#58a6ff'
    )
  );
  if (result.proposed.length > 0) {
    logTable(
      result.proposed.map(id => ({ id })),
      ['id']
    );
    console.log(colorize('Review with: bun run concept:review -- --list', '#8b949e'));
  }
  for (const skip of result.skipped) {
    console.error(colorize(`  ✗ ${skip.id} — ${skip.reason}`, '#d29922'));
  }
}

if (import.meta.main) {
  await main();
}

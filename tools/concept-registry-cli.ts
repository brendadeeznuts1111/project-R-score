#!/usr/bin/env bun
// @see https://bun.com/docs/bundler/bytecode#with-standalone-executables — --format
// @see https://bun.com/docs/bundler/executables — --force
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Concept Registry CLI — propose / approve / deprecate / archive / graph / seed.
 *
 *   bun run concept:propose -- --id accounting.batch_import --label "Batch Import" --category ops --group accounting
 *   bun run concept:approve -- accounting.batch_import
 *   bun run concept:deprecate -- accounting.old_thing --replace-by accounting.new_thing
 *   bun run concept:archive -- unused_concept --force
 *   bun run concept:graph -- --output mermaid
 *   bun run concept:registry:seed
 */
import { colorize, jsonOut, logTable } from '../lib/console-depth.ts';
import {
  approveConcept,
  archiveConcept,
  buildConceptGraph,
  deprecateConcept,
  getConcept,
  graphCentrality,
  graphOrphans,
  graphStaleEdges,
  graphToMermaid,
  listConcepts,
  openConceptRegistryDb,
  proposeConcept,
  seedConceptRegistry,
} from '../lib/concept-registry/index.ts';

function argValue(argv: readonly string[], flag: string): string | undefined {
  const eq = argv.find(a => a.startsWith(`${flag}=`));
  if (eq) return eq.slice(flag.length + 1);
  const i = argv.indexOf(flag);
  if (i !== -1) return argv[i + 1];
  return undefined;
}

function positional(argv: readonly string[], after = 0): string[] {
  // skip bun + script path + flags
  const out: string[] = [];
  for (let i = after; i < argv.length; i++) {
    const a = argv[i]!;
    if (a.startsWith('--')) {
      // skip flag values that are not --x=y when next doesn't start with --
      const next = argv[i + 1];
      if (!a.includes('=') && next && !next.startsWith('--')) i++;
      continue;
    }
    out.push(a);
  }
  return out;
}

function printHelp(): void {
  console.log(`concept-registry CLI

Commands:
  seed                         Seed from semantic-vocabulary + domain-glossary (+ usage scan)
  propose --id --label [...]   Propose a draft concept
  approve <id>                 Approve proposed → active
  deprecate <id> [--replace-by <id>]
  archive <id> [--force]       Soft-delete → archived
  get <id>                     Show one concept
  list [--status active]       List concepts
  graph [--output mermaid|json] [--centrality] [--orphans] [--stale]

Env:
  CONCEPT_REGISTRY_DB_PATH     default data/concept-registry.db
  CONCEPT_REGISTRY_AUTHOR      version/review author (else git user.name)
`);
}

async function main(): Promise<void> {
  const argv = Bun.argv;
  const cmd = argv[2] ?? 'help';

  if (cmd === 'help' || cmd === '--help' || cmd === '-h') {
    printHelp();
    return;
  }

  const db = openConceptRegistryDb();

  try {
    if (cmd === 'seed') {
      const report = await seedConceptRegistry(db, {
        skipUsage: argv.includes('--skip-usage'),
      });
      console.log(
        colorize(
          `seed OK · vocab=${report.fromVocabulary} glossary=${report.fromGlossary} usage=${report.usageRows} total=${report.total}`,
          '#3fb950'
        )
      );
      return;
    }

    if (cmd === 'propose') {
      const id = argValue(argv, '--id');
      const label = argValue(argv, '--label');
      if (!id || !label) {
        console.error('propose requires --id and --label');
        process.exit(1);
      }
      const concept = proposeConcept(db, {
        id,
        label,
        category: argValue(argv, '--category'),
        group: argValue(argv, '--group'),
        kind: argValue(argv, '--kind'),
        summary: argValue(argv, '--summary'),
        unit: argValue(argv, '--unit'),
        format: argValue(argv, '--format'),
        mapsTo: argValue(argv, '--maps-to'),
        correlationId: argValue(argv, '--correlation-id'),
      });
      jsonOut({ ok: true, concept });
      return;
    }

    if (cmd === 'approve') {
      const id = positional(argv, 3)[0] ?? argValue(argv, '--id');
      if (!id) {
        console.error('approve requires <id>');
        process.exit(1);
      }
      jsonOut({ ok: true, concept: approveConcept(db, id) });
      return;
    }

    if (cmd === 'deprecate') {
      const id = positional(argv, 3)[0] ?? argValue(argv, '--id');
      if (!id) {
        console.error('deprecate requires <id>');
        process.exit(1);
      }
      jsonOut({
        ok: true,
        concept: deprecateConcept(db, id, argValue(argv, '--replace-by')),
      });
      return;
    }

    if (cmd === 'archive') {
      const id = positional(argv, 3)[0] ?? argValue(argv, '--id');
      if (!id) {
        console.error('archive requires <id>');
        process.exit(1);
      }
      jsonOut({
        ok: true,
        concept: archiveConcept(db, id, undefined, argv.includes('--force')),
      });
      return;
    }

    if (cmd === 'get') {
      const id = positional(argv, 3)[0];
      if (!id) {
        console.error('get requires <id>');
        process.exit(1);
      }
      const concept = getConcept(db, id);
      if (!concept) {
        console.error(`not found: ${id}`);
        process.exit(1);
      }
      jsonOut({ ok: true, concept });
      return;
    }

    if (cmd === 'list') {
      const status = argValue(argv, '--status');
      const concepts = listConcepts(db, {
        status: status ? (status.split(',').map(s => s.trim()) as never) : undefined,
        category: argValue(argv, '--category'),
        group: argValue(argv, '--group'),
        q: argValue(argv, '--q'),
        limit: Number(argValue(argv, '--limit') ?? 100),
      });
      if (argValue(argv, '--output') === 'json' || argv.includes('--json')) {
        jsonOut({ ok: true, count: concepts.length, concepts });
      } else {
        logTable(
          concepts.map(c => ({
            id: c.id,
            label: c.label,
            status: c.status,
            category: c.category,
            group: c.groupName,
          })),
          ['id', 'label', 'status', 'category', 'group']
        );
        console.log(colorize(`count=${concepts.length}`, '#8b949e'));
      }
      return;
    }

    if (cmd === 'graph') {
      const graph = buildConceptGraph(db);
      const output = argValue(argv, '--output') ?? 'json';
      if (output === 'mermaid') {
        console.log(graphToMermaid(graph));
        return;
      }
      const body: Record<string, unknown> = {
        ok: true,
        nodes: graph.nodes.length,
        edges: graph.edges.length,
        generatedAt: graph.generatedAt,
      };
      if (argv.includes('--centrality')) body.centrality = graphCentrality(graph);
      if (argv.includes('--orphans')) body.orphans = graphOrphans(graph);
      if (argv.includes('--stale')) body.staleEdges = graphStaleEdges(graph);
      if (!argv.includes('--summary')) body.graph = graph;
      jsonOut(body);
      return;
    }

    console.error(`unknown command: ${cmd}`);
    printHelp();
    process.exit(1);
  } finally {
    db.close();
  }
}

if (import.meta.main) {
  await main();
}

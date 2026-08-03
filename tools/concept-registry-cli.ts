#!/usr/bin/env bun
// @see https://bun.com/docs/bundler/bytecode#with-standalone-executables — --format
// @see https://bun.com/docs/bundler/executables — --force
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Concept Registry CLI — lifecycle + graph + seed.
 *
 *   bun run concept:propose -- --id accounting.batch_import --label "Batch Import" --domain accounting
 *   bun run concept:propose -- --id … --draft
 *   bun run concept:review -- --list
 *   bun run concept:review -- --id accounting.batch_import --approve
 *   bun run concept:review -- --id … --reject --reason "…"
 *   bun run concept:deprecate -- accounting.old --replace-by accounting.new --reason "…"
 *   bun run concept:history -- --id accounting.transfer
 *   bun run concept:health
 *   bun run concept:registry:seed
 */
import { colorize, jsonOut, logTable } from '../lib/console-depth.ts';
import {
  archiveConcept,
  approveProposal,
  buildConceptGraph,
  computeConceptHealth,
  conceptHistory,
  deprecateWithReason,
  getConcept,
  graphCentrality,
  graphOrphans,
  graphStaleEdges,
  graphToMermaid,
  listConcepts,
  listProposals,
  openConceptRegistryDb,
  proposeForReview,
  rejectProposal,
  seedConceptRegistry,
  submitProposal,
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
  console.log(`concept-registry CLI — lifecycle management

Commands:
  seed                         Seed from semantic-vocabulary + domain-glossary
  propose --id --label […]     Propose (default: proposed; --draft for WIP)
  review --list                Pending drafts/proposals
  review --id <id> --approve
  review --id <id> --reject --reason "…"
  submit <id>                  draft → proposed
  approve <id>                 proposed → active (alias of review --approve)
  deprecate <id> [--replace-by] [--reason]
  archive <id> [--force]
  history --id <id>            Version + review timeline
  health                       Registry health metrics + alerts
  get <id> | list | graph

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
      const concept = proposeForReview(db, {
        id,
        label,
        category: argValue(argv, '--category'),
        group: argValue(argv, '--group'),
        domain: argValue(argv, '--domain'),
        kind: argValue(argv, '--kind'),
        summary: argValue(argv, '--summary'),
        unit: argValue(argv, '--unit'),
        format: argValue(argv, '--format'),
        color: argValue(argv, '--color'),
        mapsTo: argValue(argv, '--maps-to'),
        correlationId: argValue(argv, '--correlation-id'),
        asDraft: argv.includes('--draft'),
        reviewer: argValue(argv, '--reviewer'),
      });
      jsonOut({ ok: true, concept });
      return;
    }

    if (cmd === 'review') {
      if (argv.includes('--list') || (!argValue(argv, '--id') && !positional(argv, 3)[0])) {
        const status = argValue(argv, '--status');
        const rows = listProposals(
          db,
          status
            ? (status.split(',').map(s => s.trim()) as never)
            : (['draft', 'proposed'] as never)
        );
        if (argValue(argv, '--output') === 'json' || argv.includes('--json')) {
          jsonOut({ ok: true, count: rows.length, proposals: rows });
        } else {
          logTable(
            rows.map(r => ({
              conceptId: r.conceptId,
              status: r.status,
              ageDays: r.ageDays.toFixed(1),
              reviewer: r.reviewer ?? '—',
            })),
            ['conceptId', 'status', 'ageDays', 'reviewer']
          );
          console.log(colorize(`count=${rows.length}`, '#8b949e'));
        }
        return;
      }
      const id = argValue(argv, '--id') ?? positional(argv, 3)[0];
      if (!id) {
        console.error('review requires --id or --list');
        process.exit(1);
      }
      if (argv.includes('--approve')) {
        jsonOut({ ok: true, concept: approveProposal(db, id) });
        return;
      }
      if (argv.includes('--reject')) {
        const reason = argValue(argv, '--reason') ?? 'rejected';
        jsonOut({
          ok: true,
          concept: rejectProposal(db, id, reason, undefined, argv.includes('--soft')),
        });
        return;
      }
      console.error('review requires --list, --approve, or --reject');
      process.exit(1);
    }

    if (cmd === 'submit') {
      const id = positional(argv, 3)[0] ?? argValue(argv, '--id');
      if (!id) {
        console.error('submit requires <id>');
        process.exit(1);
      }
      jsonOut({ ok: true, concept: submitProposal(db, id) });
      return;
    }

    if (cmd === 'approve') {
      const id = positional(argv, 3)[0] ?? argValue(argv, '--id');
      if (!id) {
        console.error('approve requires <id>');
        process.exit(1);
      }
      jsonOut({ ok: true, concept: approveProposal(db, id) });
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
        concept: deprecateWithReason(db, id, {
          replaceBy: argValue(argv, '--replace-by'),
          reason: argValue(argv, '--reason'),
        }),
      });
      return;
    }

    if (cmd === 'history') {
      const id = argValue(argv, '--id') ?? positional(argv, 3)[0];
      if (!id) {
        console.error('history requires --id');
        process.exit(1);
      }
      const events = conceptHistory(db, id);
      if (argValue(argv, '--output') === 'json' || argv.includes('--json')) {
        jsonOut({ ok: true, conceptId: id, events });
      } else {
        logTable(
          events.map(e => ({
            at: e.at,
            kind: e.kind,
            summary: e.summary,
            author: e.author ?? '—',
          })),
          ['at', 'kind', 'summary', 'author']
        );
      }
      return;
    }

    if (cmd === 'health') {
      const health = computeConceptHealth(db);
      if (argValue(argv, '--output') === 'json' || argv.includes('--json')) {
        jsonOut({ ok: true, health });
      } else {
        console.log(colorize('Concept registry health', '#58a6ff'));
        logTable(
          [
            {
              total: health.total,
              usageRatio: `${(health.usageRatio * 100).toFixed(0)}%`,
              provenance: `${(health.provenanceCoverage * 100).toFixed(0)}%`,
              depBacklog: health.deprecationBacklog,
              oldProposals: health.proposalsOlderThan7d,
              maxAgeDays: health.proposalAgeDaysMax.toFixed(1),
            },
          ],
          ['total', 'usageRatio', 'provenance', 'depBacklog', 'oldProposals', 'maxAgeDays']
        );
        logTable(
          [health.byStatus as unknown as Record<string, number>],
          Object.keys(health.byStatus)
        );
        if (health.alerts.length > 0) {
          console.error(colorize('alerts:', '#f85149'));
          for (const a of health.alerts) console.error(`  ⚠ ${a}`);
        } else {
          console.log(colorize('no alerts', '#3fb950'));
        }
      }
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

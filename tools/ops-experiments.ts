#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/sqlite — bun:sqlite
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
/**
 * Ops factorial experiments CLI.
 *
 *   bun run ops:experiments --help
 *   bun run ops:experiments design --factors 'routing:static,dynamic;cut:0.10,0.15' --fraction 2
 *   bun run ops:experiments create --name routing-cut --factors '...'
 *   bun run ops:experiments list
 *   bun run ops:experiments activate --id <id>
 *   bun run ops:experiments assign --id <id> --partner <treeNodeId>
 *   bun run ops:experiments record --id <id> --partner <treeNodeId> --value 0.58
 *   bun run ops:experiments analyze --id <id>
 */
import { openOperationsDb, DEFAULT_OPS_DB_PATH } from '../lib/operations/db.ts';
import {
  FactorialEngine,
  ensureAssignedToActiveExperiments,
  generateDesign,
  resolveExperimentSubject,
  type Factor,
  type FactorLevel,
} from '../lib/experiments/index.ts';
import {
  parseExperimentId,
  parseTreeNodeId,
  unbrand,
} from '../lib/types/branded.ts';

const dbPath = Bun.env.OPS_DB_PATH || DEFAULT_OPS_DB_PATH;
const argv = Bun.argv.slice(2);
const json = argv.includes('--json');
const cmd = argv.find(a => !a.startsWith('-')) ?? 'help';

function flag(name: string): string | undefined {
  const i = argv.indexOf(name);
  if (i === -1) return undefined;
  return argv[i + 1];
}

function flagNum(name: string, fallback: number): number {
  const v = flag(name);
  if (v === undefined) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Parse `routing:static,dynamic;cut:0.10,0.15` into factors.
 * Numeric-looking levels become numbers.
 */
export function parseFactorsSpec(spec: string): Factor[] {
  const parts = spec
    .split(';')
    .map(s => s.trim())
    .filter(Boolean);
  if (!parts.length) throw new Error('Empty factors spec');

  return parts.map(part => {
    const colon = part.indexOf(':');
    if (colon <= 0) throw new Error(`Bad factor segment: ${part}`);
    const name = part.slice(0, colon).trim();
    const levelsRaw = part.slice(colon + 1).split(',');
    const levels: FactorLevel[] = levelsRaw.map(raw => {
      const t = raw.trim();
      if (t === 'true') return true;
      if (t === 'false') return false;
      if (t !== '' && Number.isFinite(Number(t))) return Number(t);
      return t;
    });
    if (!name || !levels.length) throw new Error(`Bad factor segment: ${part}`);
    return { name, levels };
  });
}

function printHelp(): void {
  console.log(`
ops:experiments — factorial designs for partner policy

Commands:
  design        --factors SPEC [--fraction N]     Print design (no DB)
  create        --name NAME --factors SPEC [--fraction N] [--metric win_rate]
  list
  show          --id EXPERIMENT_ID
  activate      --id EXPERIMENT_ID
  pause         --id EXPERIMENT_ID
  assign        --id EXPERIMENT_ID --partner ID[,ID2,...]
  assign-active --partner ID[,ID2,...]            Sticky-assign into all active experiments
  record        --id EXPERIMENT_ID --partner ID --value N [--metric NAME]
  analyze       --id EXPERIMENT_ID
  predict       --id EXPERIMENT_ID --config 'routing:dynamic;cut:0.15'

Factors SPEC:
  name:level1,level2;name2:a,b,c
  example: routing:static,dynamic;cut:0.10,0.15;min_coverage_pct:30,40

Settlement auto-records win_rate/pnl for active experiments (see lib/experiments/outcomes.ts).

Env: OPS_DB_PATH (default ${DEFAULT_OPS_DB_PATH})
Flags: --json
`);
}

function partnerIdsFromFlag(): string[] {
  const raw = flag('--partner');
  if (!raw) return [];
  return raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function out(data: unknown): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
  } else if (typeof data === 'string') {
    console.log(data);
  } else {
    console.log(Bun.inspect(data, { depth: 6, colors: true }));
  }
}

function main(): number {
  if (cmd === 'help' || cmd === '--help' || argv.includes('--help')) {
    printHelp();
    return 0;
  }

  if (cmd === 'design') {
    const spec = flag('--factors');
    if (!spec) {
      console.error('design requires --factors');
      return 1;
    }
    const factors = parseFactorsSpec(spec);
    const design = generateDesign(factors, flagNum('--fraction', 1));
    out({
      method: design.method,
      fullRuns: design.fullRuns,
      targetRuns: design.targetRuns,
      fractionDenom: design.fractionDenom,
      aliases: design.aliases,
      variants: design.variants,
    });
    return 0;
  }

  const db = openOperationsDb({ path: dbPath });
  const engine = new FactorialEngine(db);

  try {
    switch (cmd) {
      case 'create': {
        const name = flag('--name');
        const spec = flag('--factors');
        if (!name || !spec) {
          console.error('create requires --name and --factors');
          return 1;
        }
        const exp = engine.createExperiment({
          name,
          factors: parseFactorsSpec(spec),
          fractionDenom: flagNum('--fraction', 1),
          metricName: flag('--metric') ?? 'win_rate',
        });
        out({
          id: unbrand(exp.id),
          name: exp.name,
          status: exp.status,
          method: exp.designMethod,
          variants: exp.design.variants.length,
          aliases: exp.aliases,
        });
        return 0;
      }
      case 'list': {
        const rows = engine.listExperiments().map(e => ({
          id: unbrand(e.id),
          name: e.name,
          status: e.status,
          variants: e.design.variants.length,
          method: e.designMethod,
          metric: e.metricName,
        }));
        out(rows);
        return 0;
      }
      case 'show': {
        const id = flag('--id');
        if (!id) {
          console.error('show requires --id');
          return 1;
        }
        const exp = engine.getExperiment(parseExperimentId(id));
        if (!exp) {
          console.error('not found');
          return 1;
        }
        out({
          ...exp,
          id: unbrand(exp.id),
          variants: engine.listVariants(exp.id).map(v => ({
            id: unbrand(v.id),
            index: v.index,
            config: v.config,
            assignments: v.assignmentCount,
          })),
        });
        return 0;
      }
      case 'activate':
      case 'pause': {
        const id = flag('--id');
        if (!id) {
          console.error(`${cmd} requires --id`);
          return 1;
        }
        const eid = parseExperimentId(id);
        engine.setStatus(eid, cmd === 'activate' ? 'active' : 'paused');
        out({ id, status: cmd === 'activate' ? 'active' : 'paused' });
        return 0;
      }
      case 'assign': {
        const id = flag('--id');
        const partners = partnerIdsFromFlag();
        if (!id || !partners.length) {
          console.error('assign requires --id and --partner (comma-separated ok)');
          return 1;
        }
        const eid = parseExperimentId(id);
        const results = partners.map(p => {
          const result = engine.assignBalanced(eid, parseTreeNodeId(p));
          return {
            assignmentId: result.assignmentId,
            experimentId: unbrand(result.experimentId),
            partnerId: unbrand(result.partnerId),
            variantId: unbrand(result.variantId),
            config: result.config,
            created: result.created,
          };
        });
        out(results.length === 1 ? results[0]! : results);
        return 0;
      }
      case 'assign-active': {
        const partners = partnerIdsFromFlag();
        if (!partners.length) {
          console.error('assign-active requires --partner (comma-separated ok)');
          return 1;
        }
        const results = partners.map(raw => {
          const subject = resolveExperimentSubject(db, raw);
          const assignments = ensureAssignedToActiveExperiments(db, subject);
          return {
            input: raw,
            subject: unbrand(subject),
            assignments: assignments.map(a => ({
              experimentId: unbrand(a.experimentId),
              config: a.config,
              created: a.created,
            })),
          };
        });
        out(results.length === 1 ? results[0]! : results);
        return 0;
      }
      case 'record': {
        const id = flag('--id');
        const partner = flag('--partner');
        const value = flag('--value');
        if (!id || !partner || value === undefined) {
          console.error('record requires --id, --partner, --value');
          return 1;
        }
        if (partner.includes(',')) {
          console.error('record accepts a single --partner');
          return 1;
        }
        const metricId = engine.recordMetric({
          experimentId: parseExperimentId(id),
          partnerId: parseTreeNodeId(partner),
          value: Number(value),
          metricName: flag('--metric'),
        });
        out({ metricId, value: Number(value) });
        return 0;
      }
      case 'analyze': {
        const id = flag('--id');
        if (!id) {
          console.error('analyze requires --id');
          return 1;
        }
        const analysis = engine.analyze(parseExperimentId(id));
        if (analysis.nPartners === 0) {
          console.error(
            'analyze: no partner metrics yet — settle wins/losses or use record --value'
          );
          out(analysis);
          return 2;
        }
        out(analysis);
        return 0;
      }
      case 'predict': {
        const id = flag('--id');
        const configSpec = flag('--config');
        if (!id || !configSpec) {
          console.error('predict requires --id and --config (name:level;...)');
          return 1;
        }
        const factors = parseFactorsSpec(configSpec);
        const config: Record<string, FactorLevel> = {};
        for (const f of factors) {
          config[f.name] = f.levels[0]!;
        }
        const y = engine.predict(parseExperimentId(id), config, true);
        const yMain = engine.predict(parseExperimentId(id), config, false);
        out({ config, withInteractions: y, mainEffectsOnly: yMain, delta: y - yMain });
        return 0;
      }
      default:
        console.error(`Unknown command: ${cmd}`);
        printHelp();
        return 1;
    }
  } finally {
    db.close();
  }
}

if (import.meta.main) {
  process.exit(main());
}

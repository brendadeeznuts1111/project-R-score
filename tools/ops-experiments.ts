#!/usr/bin/env bun
// @see https://bun.com/docs/pm/bunx — bunx (args after bin name; --bun before package)
// @see https://bun.com/docs/runtime/sqlite — bun:sqlite
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
/**
 * Ops factorial experiments CLI (`package.json` → `ops:experiments`).
 *
 * Implementation: `lib/experiments/` (`FactorialEngine`, `generateDesign`, policy).
 * DB: `openOperationsDb` / `OPS_DB_PATH` / `DEFAULT_OPS_DB_PATH`.
 *
 *   bun run ops:experiments --help
 *   bun run ops:experiments design --factors 'routing:static,dynamic;cut:0.10,0.15' --fraction 1
 *   bun run ops:experiments create --name routing-cut \
 *     --factors 'routing:static,dynamic;cut:0.10,0.15;min_coverage_pct:30,40' \
 *     --min-partners-per-variant 1 --min-duration-days 0   # sandbox policy
 *   bun run ops:experiments activate --id <experimentId>
 *   bun run ops:experiments assign --id <experimentId> --partner <treeNodeId>
 *   bun run ops:experiments record --id <experimentId> --partner <treeNodeId> --value 0.58
 *   bun run ops:experiments analyze --id <experimentId>
 *
 * @see lib/experiments/README.md
 */
import { openOperationsDb, DEFAULT_OPS_DB_PATH } from '../lib/operations/db.ts';
import {
  FactorialEngine,
  analyzeSwitchback,
  assignClustered,
  createSwitchbackSchedule,
  dailyCheckById,
  ensureAssignedToActiveExperiments,
  generateDesign,
  launchPhase,
  resolveExperimentSubject,
  type ClusterBy,
  type ExperimentProtocol,
  type Factor,
  type FactorLevel,
} from '../lib/experiments/index.ts';
import { parseExperimentId, parseTreeNodeId, unbrand } from '../lib/types/branded.ts';

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
                  [--min-partners-per-variant N] [--min-duration-days N]
                  [--allow-exploratory-subset]
  phase         --n 1..4 [--protocol switchback|between]
                  [--period-days N] [--washout N] [--cluster-by expert|parent]
                  (sandbox: OPS_EXPERIMENT_SANDBOX=1)
  list
  show          --id EXPERIMENT_ID
  activate      --id EXPERIMENT_ID
  pause         --id EXPERIMENT_ID
  assign        --id EXPERIMENT_ID --partner ID[,ID2,...]
  assign-cluster --id EXPERIMENT_ID --partner ID --cluster-by expert|parent
  assign-active --partner ID[,ID2,...]            Sticky-assign into all active experiments
  switchback-schedule --id EXPERIMENT_ID --partner ID
                  [--period-days N] [--washout N]
  switchback-analyze --id EXPERIMENT_ID [--metric win_rate]
  check         --id EXPERIMENT_ID                Daily operational check (no cron)
  record        --id EXPERIMENT_ID --partner ID --value N [--metric NAME]
  analyze       --id EXPERIMENT_ID
  predict       --id EXPERIMENT_ID --config 'routing:dynamic;cut:0.15'

Phased timeline (sequential — do not run all domains at once):
  Phase 1 (mo 1-2): routing static|dynamic
  Phase 2 (mo 3-4): + cut 0.10|0.15
  Phase 3 (mo 5-6): + stake fixed|kelly
  Phase 4 (mo 7-8): + timing immediate|batched

Protocols: between (sticky cluster) OR switchback (within-partner periods) — not both.
System factors → champion/challenger shadow (ops:prediction shadow-eval).

Env: OPS_DB_PATH (default ${DEFAULT_OPS_DB_PATH}) · OPS_EXPERIMENT_SANDBOX=1
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

/** CLI dump helper — accepts any serializable payload at the process edge. */
function out(data: object | string | number | boolean | null): void {
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
      resolution: design.resolution,
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
        const policy: {
          minPartnersPerVariant?: number;
          minDurationDays?: number;
          allowExploratorySubset?: boolean;
        } = {};
        if (flag('--min-partners-per-variant') !== undefined) {
          policy.minPartnersPerVariant = flagNum('--min-partners-per-variant', 1);
        }
        if (flag('--min-duration-days') !== undefined) {
          policy.minDurationDays = flagNum('--min-duration-days', 0);
        }
        if (argv.includes('--allow-exploratory-subset')) {
          policy.allowExploratorySubset = true;
        }
        const exp = engine.createExperiment({
          name,
          factors: parseFactorsSpec(spec),
          fractionDenom: flagNum('--fraction', 1),
          metricName: flag('--metric') ?? 'win_rate',
          policy: Object.keys(policy).length ? policy : undefined,
        });
        out({
          id: unbrand(exp.id),
          name: exp.name,
          status: exp.status,
          method: exp.designMethod,
          variants: exp.design.variants.length,
          aliases: exp.aliases,
          policy: exp.policy,
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
          policy: e.policy,
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
          readiness: engine.launchReadiness(exp),
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
      case 'phase': {
        const n = flagNum('--n', 0);
        if (n < 1 || n > 4) {
          console.error('phase requires --n 1..4');
          return 1;
        }
        const protocol = (flag('--protocol') as ExperimentProtocol | undefined) ?? undefined;
        const clusterBy = (flag('--cluster-by') as ClusterBy | undefined) ?? 'expert';
        const result = launchPhase(db, {
          phase: n as 1 | 2 | 3 | 4,
          protocol,
          periodDays:
            flag('--period-days') !== undefined ? flagNum('--period-days', 14) : undefined,
          washoutDays: flag('--washout') !== undefined ? flagNum('--washout', 3) : undefined,
          clusterBy,
          sandbox: Bun.env.OPS_EXPERIMENT_SANDBOX === '1' || argv.includes('--sandbox'),
        });
        out({
          id: unbrand(result.experiment.id),
          name: result.experiment.name,
          status: result.experiment.status,
          protocol: result.protocol,
          assigned: result.assigned,
          switchbackScheduled: result.switchbackScheduled,
          clusterBy: result.clusterBy,
          variants: result.experiment.design.variants.length,
        });
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
      case 'assign-cluster': {
        const id = flag('--id');
        const partner = flag('--partner');
        if (!id || !partner || partner.includes(',')) {
          console.error('assign-cluster requires --id and a single --partner');
          return 1;
        }
        const clusterBy = (flag('--cluster-by') as ClusterBy | undefined) ?? 'expert';
        const node = db
          .query(`SELECT id, expert_id, parent_id, type FROM tree_nodes WHERE id = $id`)
          .get({ $id: partner }) as {
          id: string; // brand-ok — opaque tree_nodes primary key
          expert_id: string | null; // brand-ok — opaque FK from SQLite row
          parent_id: string | null; // brand-ok — opaque FK from SQLite row
          type: string;
        } | null;
        if (!node) {
          console.error('partner not found');
          return 1;
        }
        const key =
          clusterBy === 'expert' && node.expert_id
            ? `expert:${node.expert_id}`
            : node.parent_id
              ? `parent:${node.parent_id}`
              : node.expert_id
                ? `expert:${node.expert_id}`
                : 'default';
        const result = assignClustered(db, engine, {
          experimentId: parseExperimentId(id),
          partnerId: parseTreeNodeId(partner),
          clusterKey: key,
        });
        out({
          clusterKey: key,
          assignmentId: result.assignmentId,
          variantId: unbrand(result.variantId),
          config: result.config,
        });
        return 0;
      }
      case 'switchback-schedule': {
        const id = flag('--id');
        const partner = flag('--partner');
        if (!id || !partner) {
          console.error('switchback-schedule requires --id and --partner');
          return 1;
        }
        const periods = createSwitchbackSchedule(db, engine, {
          experimentId: parseExperimentId(id),
          partnerId: parseTreeNodeId(partner),
          periodDays: flagNum('--period-days', 14),
          washoutDays: flagNum('--washout', 3),
        });
        out({
          periods: periods.length,
          first: periods[0]
            ? {
                startsAt: periods[0].startsAt,
                endsAt: periods[0].endsAt,
                config: periods[0].config,
              }
            : null,
        });
        return 0;
      }
      case 'switchback-analyze': {
        const id = flag('--id');
        if (!id) {
          console.error('switchback-analyze requires --id');
          return 1;
        }
        const analysis = analyzeSwitchback(
          db,
          engine,
          parseExperimentId(id),
          flag('--metric') ?? 'win_rate'
        );
        out(analysis);
        return 0;
      }
      case 'check': {
        const id = flag('--id');
        if (!id) {
          console.error('check requires --id');
          return 1;
        }
        out(dailyCheckById(db, id));
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
        const experimentId = parseExperimentId(id);
        const analysis = engine.analyze(experimentId);
        if (analysis.nPartners === 0) {
          console.error(
            'analyze: no partner metrics yet — settle wins/losses or use record --value'
          );
          out({
            readiness: engine.analysisReadiness(experimentId),
            analysis,
          });
          return 2;
        }
        out({
          readiness: engine.analysisReadiness(experimentId),
          analysis,
        });
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

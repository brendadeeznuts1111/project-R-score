#!/usr/bin/env bun
/** ast-grep MCP — pi-ast-grep parity for Cursor (outline, search, map, scan). Zero npm deps. */

import { readFileSync } from 'node:fs';
import { access, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import {
  readJsonRpcStream,
  rpcErr,
  rpcOk,
  toolText,
  writeJsonRpc,
  type JsonRpcMessage,
  type ToolCallResult,
} from '../../../../lib/mcp/stdio-jsonrpc.ts';
import { assertBunStablePin } from '../../../../lib/verification/bun-runtime-pin.ts';

const SERVER_NAME = 'ast-grep';
const SERVER_VERSION = '0.23.1';
const SKILL_ROOT = resolve(import.meta.dir, '..');
const MAX_LINES = 2_000;
const MAX_BYTES = 50 * 1024;

function loadZoneIds(): string[] {
  try {
    const raw = JSON.parse(readFileSync(join(SKILL_ROOT, 'repo-map.json'), 'utf8')) as {
      zones?: Record<string, string>;
    };
    return Object.keys(raw.zones ?? {});
  } catch {
    return ['sports-terminal', 'kimi', 'packages', 'agents'];
  }
}

const ZONE_IDS = loadZoneIds();
const ZONE_DESC = `Zone id from repo-map.json: ${ZONE_IDS.join(', ')}`;

type RepoTarget = {
  id?: string;
  name?: string;
  path?: string;
  view?: string;
  items?: string;
  globs?: string[];
};

const TOOLS = [
  {
    name: 'ast_grep_doctor',
    description: 'Health check: binary, outline, skill bundle, autofix rules. fix=true installs skill pin when missing.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        fix: { type: 'boolean', description: 'Install skill pin if binary/outline missing.' },
      },
    },
  },
  {
    name: 'ast_grep_outline',
    description: 'Map code structure (symbols, exports, digest). Use only/zone to expand repo-map targets.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        paths: { type: 'array', items: { type: 'string' }, description: 'Files or directories' },
        only: { type: 'string', description: 'repo-map filter (id/name/zone/tag)' },
        zone: { type: 'string', enum: ZONE_IDS, description: ZONE_DESC },
        view: { type: 'string', enum: ['auto', 'names', 'signatures', 'digest', 'expanded'] },
        items: { type: 'string', enum: ['auto', 'structure', 'exports', 'imports', 'all'] },
        match: { type: 'string', description: 'Regex filter on symbol names' },
        types: { type: 'string', description: 'Comma-separated symbol types' },
        bunRules: { type: 'boolean', description: 'Load outline-rules/bun-monorepo.yml' },
        pubMembers: { type: 'boolean' },
        jsonOut: { type: 'boolean', description: 'Emit outline JSON' },
        globs: { type: 'array', items: { type: 'string' } },
      },
    },
  },
  {
    name: 'ast_grep_search',
    description: 'Structural AST search (read-only). Pattern uses $VAR and $$$ metavars.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        pattern: { type: 'string' },
        lang: { type: 'string', description: 'ts, tsx, py, go, rust, ...' },
        paths: { type: 'array', items: { type: 'string' } },
        context: { type: 'number' },
        globs: { type: 'array', items: { type: 'string' } },
      },
      required: ['pattern'],
    },
  },
  {
    name: 'ast_grep_files',
    description: 'List files with at least one structural match (cheap).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        pattern: { type: 'string' },
        lang: { type: 'string' },
        paths: { type: 'array', items: { type: 'string' } },
        globs: { type: 'array', items: { type: 'string' } },
      },
      required: ['pattern'],
    },
  },
  {
    name: 'ast_grep_map',
    description: 'Map repo-map.json zones/targets. list=true inventory; compact=true symbol counts; heatmap=true ASCII bar chart; default=full outline.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        only: { type: 'string', description: 'Filter by id/name/zone/tag substring' },
        zone: { type: 'string', enum: ZONE_IDS, description: ZONE_DESC },
        list: { type: 'boolean', description: 'Inventory only (no outline)' },
        compact: { type: 'boolean', description: 'Symbol counts per target' },
        heatmap: { type: 'boolean', description: 'ASCII bar chart of symbol counts per target' },
        jsonOut: { type: 'boolean', description: 'Structured JSON report' },
        view: { type: 'string', enum: ['auto', 'names', 'signatures', 'digest', 'expanded'] },
        bunRules: { type: 'boolean' },
        match: { type: 'string' },
      },
    },
  },
  {
    name: 'ast_grep_zones',
    description: 'List repo-map zones and targets. stats=true includes symbol counts from outline index cache.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        stats: { type: 'boolean', description: 'Include symbol counts per zone' },
        discover: { type: 'boolean', description: 'Find unmapped monorepo candidates (alias: ast_grep_discover)' },
        zone: { type: 'string', enum: ZONE_IDS, description: ZONE_DESC },
        failOn: { type: 'boolean', description: 'With discover: exit 1 when unmapped exist' },
        jsonOut: { type: 'boolean', description: 'Emit JSON' },
      },
    },
  },
  {
    name: 'ast_grep_discover',
    description: 'Scan monorepo for repo-map gaps — skills, workspaces, packages (zone-discovery.json probes).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        zone: { type: 'string', enum: ZONE_IDS, description: ZONE_DESC },
        failOn: { type: 'boolean', description: 'Exit 1 when unmapped candidates exist' },
        jsonOut: { type: 'boolean', description: 'Emit JSON' },
      },
    },
  },
  {
    name: 'ast_grep_index',
    description: 'Cross-target symbol index from repo-map outlines. Filter by name, type, zone, exports.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Filter symbols by name substring' },
        type: { type: 'string', description: 'Symbol type (function, class, ...)' },
        exports: { type: 'boolean', description: 'Exported symbols only' },
        only: { type: 'string', description: 'Filter repo-map targets' },
        zone: { type: 'string', enum: ZONE_IDS, description: ZONE_DESC },
        refresh: { type: 'boolean', description: 'Rebuild .outline-index.json cache' },
        status: { type: 'boolean', description: 'Show cache age and stale targets' },
        jsonOut: { type: 'boolean', description: 'Emit JSON' },
      },
    },
  },
  {
    name: 'ast_grep_anchors',
    description: 'Validate repo-map anchor symbols against the symbol index.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        only: { type: 'string' },
        zone: { type: 'string', enum: ZONE_IDS, description: ZONE_DESC },
        failOn: { type: 'boolean', description: 'Error when anchors missing' },
        jsonOut: { type: 'boolean' },
      },
    },
  },
  {
    name: 'ast_grep_exports',
    description: 'Exported symbol surface across repo-map targets.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        only: { type: 'string' },
        zone: { type: 'string', enum: ZONE_IDS, description: ZONE_DESC },
        jsonOut: { type: 'boolean' },
      },
    },
  },
  {
    name: 'ast_grep_collisions',
    description: 'Symbol names duplicated across multiple repo-map targets.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        only: { type: 'string' },
        zone: { type: 'string', enum: ZONE_IDS, description: ZONE_DESC },
        minTargets: { type: 'number', description: 'Minimum targets for a collision (default 2)' },
        jsonOut: { type: 'boolean' },
      },
    },
  },
  {
    name: 'ast_grep_graph',
    description: 'Import and depends_on edges between repo-map targets.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        only: { type: 'string' },
        zone: { type: 'string', enum: ZONE_IDS, description: ZONE_DESC },
        jsonOut: { type: 'boolean' },
      },
    },
  },
  {
    name: 'ast_grep_jump',
    description: 'Resolve symbol name to file:line jump hints for agent Read.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Symbol name (required)' },
        type: { type: 'string' },
        exports: { type: 'boolean' },
        zone: { type: 'string', enum: ZONE_IDS, description: ZONE_DESC },
        jsonOut: { type: 'boolean' },
      },
      required: ['name'],
    },
  },
  {
    name: 'ast_grep_bun',
    description: 'Bun native API: patterns, inventory, matrix, heatmap, or cataloged search by pattern id.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        action: { type: 'string', enum: ['patterns', 'bundles', 'inventory', 'matrix', 'heatmap', 'score', 'migrate', 'report', 'docs', 'roadmap', 'features', 'test-ci', 'test-list', 'install-docs', 'install-scan', 'install-ci', 'bundle-threat', 'supply-chain-layers', 'supply-chain-rules', 'supply-chain-advisories', 'supply-chain-scan', 'search'], description: 'Bun subcommand' },
        topic: { type: 'string', enum: ['sources', 'linker', 'security', 'bunfig', 'env', 'profiles', 'platform', 'lockfile', 'backends', 'pnpm', 'peers', 'cache', 'cli'], description: 'For install-docs: filter section' },
        cpu: { type: 'string', description: 'For install-ci: --cpu override' },
        osTarget: { type: 'string', description: 'For install-ci: --os override' },
        scanPath: { type: 'string', description: 'For install-scan or supply-chain-scan: directory or package.json' },
        format: { type: 'string', enum: ['json', 'html', 'markdown'], description: 'For supply-chain-scan: report format' },
        parallel: { type: 'boolean', description: 'For supply-chain-scan: Worker pool per-file scan' },
        ruleIds: { type: 'string', description: 'For supply-chain-scan: comma-separated rule ids' },
        threatFeed: { type: 'boolean', description: 'For supply-chain-scan: correlate bun.lock with threat-feed.json' },
        release: { type: 'string', description: 'For features: release key (1.3.13)' },
        profile: { type: 'string', description: 'For test-ci: bun-test-profiles.json key (ci, unit, network, snapshot, ...)' },
        testPath: { type: 'string', description: 'For test-ci: exact file (./tests/...) or substring filter' },
        testFilter: { type: 'array', items: { type: 'string' }, description: 'For test-ci: position filters (unit, integration, concurrent)' },
        testNamePattern: { type: 'string', description: 'For test-ci: -t regex on describe/test names' },
        shard: { type: 'string', description: 'For test-ci: M/N shard for CI matrix' },
        changed: { type: 'string', description: 'For test-ci: --changed or --changed=REF' },
        skipPreflight: { type: 'boolean', description: 'For test-ci: skip snapshot-validate preflight' },
        dryRun: { type: 'boolean', description: 'For test-ci: print command only' },
        priority: { type: 'string', enum: ['high', 'medium', 'low', 'nice'], description: 'For roadmap: filter by priority' },
        integration: { type: 'string', enum: ['catalog', 'planned', 'integrated'], description: 'For roadmap: filter by integration state' },
        patternId: { type: 'string', description: 'For search: bun-serve, bun-file, bun-glob, ...' },
        only: { type: 'string' },
        zone: { type: 'string', enum: ZONE_IDS, description: ZONE_DESC },
        group: { type: 'string', description: 'Filter patterns: http, io, db, crypto, anti-pattern, ...' },
        tier: { type: 'string', enum: ['core', 'extended', 'migrate'] },
        coreOnly: { type: 'boolean', description: 'Shorthand for tier=core' },
        bundle: { type: 'string', description: 'Pattern bundle: server-boot, cli, core, hygiene' },
        refresh: { type: 'boolean', description: 'Rebuild bun inventory cache' },
        minScore: { type: 'number', description: 'For score: exit error below threshold' },
        failOn: { type: 'boolean', description: 'For migrate: error when anti-patterns found' },
        jsonOut: { type: 'boolean' },
      },
      required: ['action'],
    },
  },
  {
    name: 'ast_grep_nav',
    description: 'Guided read order for a repo-map zone (navigation block in repo-map.json).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        zone: { type: 'string', enum: ZONE_IDS, description: `${ZONE_DESC} (required)` },
        digest: { type: 'boolean', description: 'Inline outline preview per step' },
      },
      required: ['zone'],
    },
  },
  {
    name: 'ast_grep_scan',
    description: 'Run bundled YAML rules (no-console-log, no-as-any, empty-catch, ...). Preview unless apply/fix=true.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        paths: { type: 'array', items: { type: 'string' } },
        rule: { type: 'string', description: 'Single rule file under skill rules/' },
        apply: { type: 'boolean' },
        fix: { type: 'boolean', description: 'Alias for apply (mutate files for rules with fix: field).' },
        globs: { type: 'array', items: { type: 'string' } },
      },
    },
  },
  {
    name: 'ast_grep_fix',
    description: 'Apply all bundled autofix rules (rules with fix: field, e.g. no-as-any). dryRun=true for preview.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        paths: { type: 'array', items: { type: 'string' } },
        rule: { type: 'string', description: 'Single autofix rule under skill rules/' },
        dryRun: { type: 'boolean', description: 'Preview violations only (no mutation).' },
        only: { type: 'string', description: 'Expand paths from repo-map targets when paths omitted.' },
        globs: { type: 'array', items: { type: 'string' } },
      },
    },
  },
  {
    name: 'ast_grep_replace',
    description: 'Structural codemod (dry-run by default). fix=true applies and returns git diff.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        pattern: { type: 'string' },
        rewrite: { type: 'string' },
        lang: { type: 'string' },
        paths: { type: 'array', items: { type: 'string' } },
        fix: { type: 'boolean', description: 'Apply rewrite (alias for apply).' },
        globs: { type: 'array', items: { type: 'string' } },
      },
      required: ['pattern', 'rewrite'],
    },
  },
  {
    name: 'ast_grep_validate',
    description: 'Offline pattern hint check — catches regex misuse before calling ast-grep.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        pattern: { type: 'string' },
        lang: { type: 'string' },
      },
      required: ['pattern'],
    },
  },
  {
    name: 'ast_grep_rules',
    description: 'List bundled scan rules and which ones support autofix.',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'ast_grep_audit',
    description: 'Scan repo-map targets; summarize by rule. parallel=true uses Bun Worker pool (one scan per target).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        only: { type: 'string', description: 'Filter targets by id/name substring' },
        zone: { type: 'string', enum: ZONE_IDS, description: ZONE_DESC },
        rule: { type: 'string', description: 'Single rule instead of full sgconfig' },
        profile: { type: 'string', description: 'scan-profiles.json key (ci, autofix, strict)' },
        verbose: { type: 'boolean', description: 'Per-file violation breakdown' },
        parallel: { type: 'boolean', description: 'Scan targets in parallel via Bun Workers' },
        workers: { type: 'number', description: 'Worker count for parallel audit' },
        format: { type: 'string', enum: ['github', 'sarif'], description: 'CI annotation format' },
        failOn: { type: 'boolean', description: 'Return error when violations found' },
        globs: { type: 'array', items: { type: 'string' } },
      },
    },
  },
  {
    name: 'ast_grep_codemods',
    description: 'List named codemods from codemods.json (strip-as-any, strip-double-cast, ...).',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'ast_grep_codemod',
    description: 'Run a named codemod. fix=true applies; only= expands repo-map paths.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Codemod id' },
        paths: { type: 'array', items: { type: 'string' } },
        only: { type: 'string' },
        fix: { type: 'boolean' },
        globs: { type: 'array', items: { type: 'string' } },
      },
      required: ['name'],
    },
  },
  {
    name: 'ast_grep_test',
    description: 'Run ast-grep rule snapshot tests (tests/). update=true refreshes snapshots.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        update: { type: 'boolean', description: 'Update __snapshots__ (-U)' },
      },
    },
  },
  {
    name: 'ast_grep_network',
    description:
      'Supply-chain network audit: dist surface scan, OpenAPI catalog, health probes, baseline seed, ground-truth gate. pointers=true lists modules/standards without --path.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        pointers: { type: 'boolean', description: 'Module/script/baseline index (no scan path required).' },
        dryRun: { type: 'boolean', description: 'Single audit preview (no loop).' },
        validateGroundTruth: { type: 'boolean', description: 'Compare live audit to pinned golden counts.' },
        seed: { type: 'boolean', description: 'Refresh baselines/<domain>/snapshot.json network section.' },
        loop: { type: 'boolean', description: 'Enter watch/probe loop.' },
        watch: { type: 'boolean', description: 'With loop: re-audit on file changes.' },
        scanPath: { type: 'string', description: 'Bundle scan path (e.g. dist/frontend).' },
        domain: { type: 'string', description: 'Domain id (default sports-terminal-os).' },
        profile: { type: 'string', description: 'bundle-threat-profiles.json key (supply-chain-network-dist).' },
        healthUrl: { type: 'string', description: 'Health probe URL.' },
        output: { type: 'string', enum: ['table', 'json', 'herdr'], description: 'Dry-run output format.' },
        verbose: { type: 'boolean' },
        quiet: { type: 'boolean' },
        jsonOut: { type: 'boolean', description: 'JSON stdout (pointers, dry-run, validate).' },
        failOnDrift: { type: 'boolean', description: 'Exit error on route drift (not dry-run).' },
        failOnHealth: { type: 'boolean', description: 'Exit error when health probe fails.' },
        noSeed: { type: 'boolean', description: 'Skip auto-seed before loop when no baseline.' },
      },
    },
  },
  {
    name: 'ast_grep_skill_loop',
    description:
      'Unified skill loop: test, bench, network, snapshot, rate across agent skills. bench-snapshot repeats validateSnapshotFull + live network + ground-truth.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        action: {
          type: 'string',
          enum: ['list', 'run', 'matrix', 'bench', 'bench-snapshot', 'close-loop', 'full', 'plan', 'workflow', 'precommit'],
          description: 'Loop subcommand (plan = full --dry-run --explain; workflow/precommit delegate to dedicated tools).',
        },
        skill: { type: 'string', description: 'Target skill id (run action).' },
        phases: { type: 'string', description: 'Comma-separated: doctor,test,bench,network,snapshot,rate.' },
        preset: { type: 'string', description: 'quick | standard | full | ci (full/plan).' },
        profile: { type: 'string', description: 'Bench profile (unit, ci, ...).' },
        iterations: { type: 'number', description: 'Bench or bench-snapshot repeat count.' },
        domain: { type: 'string', description: 'bench-snapshot domain (sports-terminal-os).' },
        scanPath: { type: 'string', description: 'bench-snapshot live network drift path.' },
        targetMs: { type: 'number', description: 'p50 speed target for bench rating.' },
        groundTruth: { type: 'boolean', description: 'bench-snapshot: validateNetworkGroundTruth gate.' },
        failOnNetworkDrift: { type: 'boolean', description: 'bench-snapshot: fail iteration on route drift.' },
        minRating: { type: 'number', description: 'Rating gate threshold.' },
        only: { type: 'string', description: 'Filter matrix skills by id substring.' },
        dryRun: { type: 'boolean', description: 'Preview plan without executing.' },
        explain: { type: 'boolean', description: 'With dryRun: show commands and per-iteration pipeline.' },
        verbose: { type: 'boolean', description: 'Per-phase timings (bench-snapshot) or phase starts.' },
        quiet: { type: 'boolean' },
        parallel: { type: 'boolean', description: 'Matrix concurrent execution.' },
        skipPreflight: { type: 'boolean' },
        failOnRating: { type: 'boolean' },
        failOnDrift: { type: 'boolean', description: 'full preset baseline drift gate.' },
        baselineWrite: { type: 'boolean' },
        noBaseline: { type: 'boolean' },
        smoke: { type: 'boolean' },
        seed: { type: 'boolean', description: 'close-loop: seed network baseline first.' },
        effect: { type: 'boolean', description: 'close-loop: Effect-TS CloseLoopEngine program.' },
        jsonOut: { type: 'boolean' },
        herdrTab: { type: 'boolean' },
        noColor: { type: 'boolean' },
      },
      required: ['action'],
    },
  },
  {
    name: 'ast_grep_precommit',
    description:
      'Run husky pre-commit gates: repo hygiene, harness lint, ast-grep rule tests, semver policy, supply-chain packages (on lockfile/policy changes).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        full: { type: 'boolean', description: 'Full gate chain + ast-grep --full (doctor, rules, semver, packages).' },
        staged: { type: 'boolean', description: 'ast-grep gate: --staged (husky behaviour).' },
        changed: { type: 'boolean', description: 'ast-grep gate: --changed (diff vs HEAD).' },
        hygiene: { type: 'boolean', description: 'Include repo-hygiene --staged (default true when full).' },
        harness: { type: 'boolean', description: 'Include harness lint/format (default true when full).' },
        astGrep: { type: 'boolean', description: 'Include ast-grep + semver gate (default true).' },
      },
    },
  },
  {
    name: 'ast_grep_workflow',
    description:
      'Continuous workflow loop: semver + network scanners, drift detection, pluggable effects (log, alert, fix, report, custom).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        domain: { type: 'string', description: 'Domain id (required).' },
        scanPath: { type: 'string', description: 'Scan target path relative to repo root.' },
        scanners: { type: 'string', description: 'Comma-separated: semver,network (default).' },
        watch: { type: 'boolean', description: 'Continuous watch loop.' },
        dryRun: { type: 'boolean', description: 'Preview without applying fixes.' },
        seed: { type: 'string', description: 'Seed baseline path (json5).' },
        seedWrite: { type: 'string', description: 'Write baseline after each run.' },
        failOnIssue: { type: 'boolean' },
        failOnDrift: { type: 'boolean' },
        alertUrl: { type: 'string', description: 'Enable alert effect with webhook URL.' },
        fix: { type: 'boolean', description: 'Enable fix effect.' },
        report: { type: 'string', description: 'Report output path.' },
        effectsDir: { type: 'string', description: 'Custom effect plugins directory.' },
        effects: { type: 'array', items: { type: 'string' }, description: 'Effect specs (e.g. custom, alert.url=...).' },
        jsonOut: { type: 'boolean' },
      },
      required: ['domain'],
    },
  },
];

async function executable(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function resolveBinary(): Promise<string> {
  const env = process.env.AST_GREP_BIN;
  if (env && await executable(env)) return env;
  const candidates = [
    join(SKILL_ROOT, 'node_modules/.bin/ast-grep'),
    '/opt/homebrew/bin/ast-grep',
    '/usr/local/bin/ast-grep',
  ];
  for (const c of candidates) {
    if (await executable(c)) {
      const proc = Bun.spawn([c, 'outline', '--help'], { stdout: 'pipe', stderr: 'pipe' });
      const code = await proc.exited;
      if (code === 0) return c;
    }
  }
  throw new Error('ast-grep 0.44+ not found. Run: cd .agents/skills/ast-grep && ./scripts/install.sh');
}

function repoRoot(): string {
  return process.env.AST_GREP_REPO_ROOT || process.env.WORKSPACE_FOLDER || process.cwd();
}

function truncate(text: string): string {
  const lines = text.split('\n');
  let body = lines.slice(0, MAX_LINES).join('\n');
  if (Buffer.byteLength(body) > MAX_BYTES) {
    body = Buffer.from(body).subarray(0, MAX_BYTES).toString('utf8');
  }
  const clipped = lines.length > MAX_LINES || Buffer.byteLength(text) > MAX_BYTES;
  if (clipped) {
    body += `\n\n[truncated — narrow paths, match, or globs]`;
  }
  return body || '(no output)';
}

async function runSg(args: string[], cwd: string): Promise<{ stdout: string; stderr: string; code: number }> {
  const bin = await resolveBinary();
  const proc = Bun.spawn([bin, ...args], { cwd, stdout: 'pipe', stderr: 'pipe', env: process.env });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  return { stdout, stderr, code: await proc.exited };
}

function strPaths(args: Record<string, unknown>): string[] {
  const p = args.paths;
  if (Array.isArray(p) && p.length) return p.map(String);
  return ['.'];
}

function pushGlobs(sgArgs: string[], globs: unknown) {
  if (!Array.isArray(globs)) return;
  for (const g of globs) sgArgs.push('--globs', String(g));
}

function wantsApply(args: Record<string, unknown>): boolean {
  return args.apply === true || args.fix === true;
}

async function safeGitDiff(paths: string[], cwd: string): Promise<string> {
  const check = Bun.spawn(['git', 'rev-parse', '--is-inside-work-tree'], { cwd, stdout: 'pipe', stderr: 'pipe' });
  if (await check.exited !== 0) return '';
  const diffArgs = ['git', 'diff', '--no-ext-diff', '--', ...paths];
  const proc = Bun.spawn(diffArgs, { cwd, stdout: 'pipe', stderr: 'pipe' });
  const stdout = await new Response(proc.stdout).text();
  return (await proc.exited) === 0 ? stdout.trim() : '';
}

async function runHelper(subcmd: string, extra: string[] = []): Promise<{ stdout: string; stderr: string; code: number }> {
  const helper = join(SKILL_ROOT, 'scripts/ast_grep_helper.py');
  const proc = Bun.spawn(['python3', helper, subcmd, ...extra], {
    cwd: repoRoot(),
    stdout: 'pipe',
    stderr: 'pipe',
    env: process.env,
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  return { stdout, stderr, code: await proc.exited };
}

async function runBunScript(
  script: string,
  extra: string[] = [],
): Promise<{ stdout: string; stderr: string; code: number }> {
  const proc = Bun.spawn(['bun', script, ...extra], {
    cwd: repoRoot(),
    stdout: 'pipe',
    stderr: 'pipe',
    env: process.env,
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  return { stdout, stderr, code: await proc.exited };
}

async function cmdDoctor(args: Record<string, unknown>): Promise<ToolCallResult> {
  const extra: string[] = [];
  if (args.fix === true) extra.push('--fix');
  const { stdout, stderr, code } = await runHelper('doctor', extra);
  const body = (stdout || stderr).trim();
  return toolText(body || '(no doctor output)', code !== 0);
}

async function cmdOutline(args: Record<string, unknown>): Promise<ToolCallResult> {
  const extra: string[] = [];
  if (args.view) extra.push('--view', String(args.view));
  if (args.items) extra.push('--items', String(args.items));
  if (args.match) extra.push('--match', String(args.match));
  if (args.types) extra.push('--type', String(args.types));
  if (args.only) extra.push('--only', String(args.only));
  if (args.zone) extra.push('--zone', String(args.zone));
  if (args.bunRules === true) extra.push('--bun-rules');
  if (args.pubMembers === true) extra.push('--pub-members');
  if (args.jsonOut === true) extra.push('--json-out');
  for (const g of args.globs as unknown[] ?? []) extra.push('--globs', String(g));
  for (const p of strPaths(args)) extra.push(p);
  const { stdout, stderr, code } = await runHelper('outline', extra);
  return toolText(truncate((stdout || stderr).trim() || '(no outline entries)'), code !== 0);
}

async function cmdSearch(args: Record<string, unknown>, filesOnly = false): Promise<ToolCallResult> {
  const pattern = String(args.pattern ?? '');
  if (!pattern) return toolText('pattern is required', true);
  const sgArgs = ['run', '--color', 'never', '-p', pattern];
  if (filesOnly) sgArgs.push('--files-with-matches');
  else sgArgs.push('--json=compact');
  if (args.lang) sgArgs.push('--lang', String(args.lang));
  if (!filesOnly && args.context) sgArgs.push('-C', String(args.context));
  pushGlobs(sgArgs, args.globs);
  sgArgs.push(...strPaths(args));
  const { stdout, stderr, code } = await runSg(sgArgs, repoRoot());
  if (code !== 0 && code !== 1) return toolText(stderr || stdout || `search failed (${code})`, true);
  if (filesOnly) return toolText(truncate(stdout.trim() || '(no files with matches)'));
  if (!stdout.trim()) return toolText('(no matches)');
  try {
    const matches = JSON.parse(stdout) as Array<{ file?: string; text?: string; range?: { start?: { line?: number } } }>;
    const lines: string[] = [];
    for (const m of matches.slice(0, 200)) {
      const line = m.range?.start?.line ?? '?';
      const preview = (m.text ?? '').split('\n')[0];
      lines.push(`${m.file}:${line}  ${preview}`);
    }
    if (matches.length > 200) lines.push(`... ${matches.length - 200} more matches`);
    return toolText(truncate(lines.join('\n')));
  } catch {
    return toolText(truncate(stdout));
  }
}

async function cmdMap(args: Record<string, unknown>): Promise<ToolCallResult> {
  const extra: string[] = [];
  if (args.only) extra.push('--only', String(args.only));
  if (args.zone) extra.push('--zone', String(args.zone));
  if (args.list === true) extra.push('--list');
  if (args.compact === true) extra.push('--compact');
  if (args.heatmap === true) extra.push('--heatmap');
  if (args.jsonOut === true) extra.push('--json-out');
  if (args.view) extra.push('--view', String(args.view));
  if (args.bunRules === true) extra.push('--bun-rules');
  if (args.match) extra.push('--match', String(args.match));
  const { stdout, stderr, code } = await runHelper('map', extra);
  return toolText(truncate((stdout || stderr).trim() || '(no map output)'), code !== 0);
}

async function cmdZones(args: Record<string, unknown>): Promise<ToolCallResult> {
  const extra: string[] = [];
  if (args.discover === true) extra.push('--discover');
  if (args.stats === true) extra.push('--stats');
  if (args.zone) extra.push('--zone', String(args.zone));
  if (args.failOn === true) extra.push('--fail-on');
  if (args.jsonOut === true) extra.push('--json-out');
  const { stdout, stderr, code } = await runHelper('zones', extra);
  return toolText(truncate((stdout || stderr).trim() || '(no zones output)'), code !== 0);
}

async function cmdDiscover(args: Record<string, unknown>): Promise<ToolCallResult> {
  const extra: string[] = [];
  if (args.zone) extra.push('--zone', String(args.zone));
  if (args.failOn === true) extra.push('--fail-on');
  if (args.jsonOut === true) extra.push('--json-out');
  const { stdout, stderr, code } = await runHelper('discover', extra);
  return toolText(truncate((stdout || stderr).trim() || '(no discover output)'), code !== 0);
}

async function cmdIndex(args: Record<string, unknown>): Promise<ToolCallResult> {
  const extra: string[] = [];
  if (args.name) extra.push('--name', String(args.name));
  if (args.type) extra.push('--type', String(args.type));
  if (args.exports === true) extra.push('--exports');
  if (args.only) extra.push('--only', String(args.only));
  if (args.zone) extra.push('--zone', String(args.zone));
  if (args.refresh === true) extra.push('--refresh');
  if (args.status === true) extra.push('--status');
  if (args.jsonOut === true) extra.push('--json-out');
  const { stdout, stderr, code } = await runHelper('index', extra);
  return toolText(truncate((stdout || stderr).trim() || '(no index output)'), code !== 0);
}

async function cmdAnchors(args: Record<string, unknown>): Promise<ToolCallResult> {
  const extra: string[] = [];
  if (args.only) extra.push('--only', String(args.only));
  if (args.zone) extra.push('--zone', String(args.zone));
  if (args.failOn === true) extra.push('--fail-on');
  if (args.jsonOut === true) extra.push('--json-out');
  const { stdout, stderr, code } = await runHelper('anchors', extra);
  return toolText(truncate((stdout || stderr).trim() || '(no anchors output)'), code !== 0);
}

async function cmdExports(args: Record<string, unknown>): Promise<ToolCallResult> {
  const extra: string[] = [];
  if (args.only) extra.push('--only', String(args.only));
  if (args.zone) extra.push('--zone', String(args.zone));
  if (args.jsonOut === true) extra.push('--json-out');
  const { stdout, stderr, code } = await runHelper('exports', extra);
  return toolText(truncate((stdout || stderr).trim() || '(no exports output)'), code !== 0);
}

async function cmdCollisions(args: Record<string, unknown>): Promise<ToolCallResult> {
  const extra: string[] = [];
  if (args.only) extra.push('--only', String(args.only));
  if (args.zone) extra.push('--zone', String(args.zone));
  if (args.minTargets) extra.push('--min-targets', String(args.minTargets));
  if (args.jsonOut === true) extra.push('--json-out');
  const { stdout, stderr, code } = await runHelper('collisions', extra);
  return toolText(truncate((stdout || stderr).trim() || '(no collisions output)'), code !== 0);
}

async function cmdGraph(args: Record<string, unknown>): Promise<ToolCallResult> {
  const extra: string[] = [];
  if (args.only) extra.push('--only', String(args.only));
  if (args.zone) extra.push('--zone', String(args.zone));
  if (args.jsonOut === true) extra.push('--json-out');
  const { stdout, stderr, code } = await runHelper('graph', extra);
  return toolText(truncate((stdout || stderr).trim() || '(no graph output)'), code !== 0);
}

async function cmdJump(args: Record<string, unknown>): Promise<ToolCallResult> {
  const name = String(args.name ?? '');
  if (!name) return toolText('name is required', true);
  const extra = ['--name', name];
  if (args.type) extra.push('--type', String(args.type));
  if (args.exports === true) extra.push('--exports');
  if (args.zone) extra.push('--zone', String(args.zone));
  if (args.jsonOut === true) extra.push('--json-out');
  const { stdout, stderr, code } = await runHelper('jump', extra);
  return toolText(truncate((stdout || stderr).trim() || '(no jump output)'), code !== 0);
}

async function cmdBun(args: Record<string, unknown>): Promise<ToolCallResult> {
  const action = String(args.action ?? 'patterns');
  const extra: string[] = [action];
  if (action === 'search') {
    const pid = String(args.patternId ?? '');
    if (!pid) return toolText('patternId is required for search', true);
    extra.push(pid);
  }
  if (action === 'test-ci') {
    if (args.profile) extra.push('--profile', String(args.profile));
    if (args.testPath) extra.push('--path', String(args.testPath));
    if (Array.isArray(args.testFilter)) {
      for (const f of args.testFilter) extra.push(String(f));
    }
    if (args.testNamePattern) extra.push('-t', String(args.testNamePattern));
    if (args.shard) extra.push('--shard', String(args.shard));
    if (args.changed) extra.push('--changed', String(args.changed));
    if (args.skipPreflight === true) extra.push('--skip-preflight');
    if (args.dryRun === true) extra.push('--dry-run');
  }
  if (action === 'test-list') {
    if (args.jsonOut === true) extra.push('--json-out');
  }
  if (action === 'install-docs' && args.topic) extra.push('--topic', String(args.topic));
  if (action === 'install-scan') {
    if (args.scanPath) extra.push('--path', String(args.scanPath));
    if (args.failOn === true) extra.push('--fail-on');
  }
  if (action === 'install-ci') {
    if (args.profile) extra.push('--profile', String(args.profile));
    if (args.cpu) extra.push('--cpu', String(args.cpu));
    if (args.osTarget) extra.push('--os-target', String(args.osTarget));
    if (args.dryRun === true) extra.push('--dry-run');
  }
  if (action === 'supply-chain-layers') {
    extra.length = 0;
    extra.push('supply-chain', 'layers');
  } else if (action === 'supply-chain-rules') {
    extra.length = 0;
    extra.push('supply-chain', 'rules');
  } else if (action === 'supply-chain-advisories') {
    extra.length = 0;
    extra.push('supply-chain', 'advisories');
  } else if (action === 'supply-chain-scan') {
    extra.length = 0;
    extra.push('supply-chain', 'scan');
  }
  if (action === 'bundle-threat' || action === 'supply-chain-scan') {
    if (args.profile) extra.push('--profile', String(args.profile));
    if (args.dryRun === true) extra.push('--dry-run');
    if (args.verbose === true) extra.push('--verbose');
    if (args.scanPath) extra.push('--path', String(args.scanPath));
    if (args.format) extra.push('--format', String(args.format));
    if (args.parallel === true) extra.push('--parallel');
    if (args.ruleIds) extra.push('--rules', String(args.ruleIds));
    if (args.failOn === true) extra.push('--fail-on');
    if (args.threatFeed === true) extra.push('--threat-feed');
  }
  if (action === 'features' && args.release) extra.push('--release', String(args.release));
  if (args.only) extra.push('--only', String(args.only));
  if (args.zone) extra.push('--zone', String(args.zone));
  if (args.group) extra.push('--group', String(args.group));
  if (args.tier) extra.push('--tier', String(args.tier));
  if (args.bundle) extra.push('--bundle', String(args.bundle));
  if (args.priority) extra.push('--priority', String(args.priority));
  if (args.integration) extra.push('--integration', String(args.integration));
  if (args.coreOnly === true) extra.push('--core-only');
  if (args.refresh === true) extra.push('--refresh');
  if (args.minScore != null) extra.push('--min-score', String(args.minScore));
  if (args.failOn === true) extra.push('--fail-on');
  if (args.jsonOut === true) extra.push('--json-out');
  const { stdout, stderr, code } = await runHelper('bun', extra);
  return toolText(truncate((stdout || stderr).trim() || '(no bun output)'), code !== 0);
}

async function cmdNav(args: Record<string, unknown>): Promise<ToolCallResult> {
  const zone = String(args.zone ?? '');
  if (!zone) return toolText('zone is required', true);
  const extra = ['--zone', zone];
  if (args.digest === true) extra.push('--digest');
  const { stdout, stderr, code } = await runHelper('nav', extra);
  return toolText(truncate((stdout || stderr).trim() || '(no nav output)'), code !== 0);
}

async function cmdScan(args: Record<string, unknown>): Promise<ToolCallResult> {
  const sgArgs = ['scan', '--color', 'never'];
  if (args.rule) {
    const rulePath = String(args.rule).startsWith('/')
      ? String(args.rule)
      : join(SKILL_ROOT, 'rules', String(args.rule));
    sgArgs.push('-r', rulePath);
  } else {
    sgArgs.push('-c', join(SKILL_ROOT, 'sgconfig.yml'));
  }
  if (wantsApply(args)) sgArgs.push('-U');
  const paths = strPaths(args);
  pushGlobs(sgArgs, args.globs);
  sgArgs.push(...paths);
  const { stdout, stderr, code } = await runSg(sgArgs, repoRoot());
  if (code !== 0 && code !== 1) return toolText(stderr || stdout || `scan failed (${code})`, true);
  let body = (stdout || stderr).trim() || '(no scan results)';
  if (wantsApply(args)) {
    const diff = await safeGitDiff(paths, repoRoot());
    if (diff) body += `\n\n[git diff after scan apply]\n${truncate(diff)}`;
  }
  return toolText(truncate(body));
}

async function cmdFix(args: Record<string, unknown>): Promise<ToolCallResult> {
  const extra: string[] = [];
  if (args.dryRun === true) extra.push('--dry-run');
  if (args.rule) extra.push('--rule', String(args.rule));
  if (args.only) extra.push('--only', String(args.only));
  for (const g of args.globs as unknown[] ?? []) extra.push('--globs', String(g));
  for (const p of strPaths(args)) extra.push('--path', p);
  const { stdout, stderr, code } = await runHelper('fix', extra);
  let body = (stdout || stderr).trim() || '(no fix output)';
  if (!args.dryRun && code === 0) {
    const diff = await safeGitDiff(strPaths(args), repoRoot());
    if (diff) body += `\n\n[git diff after fix]\n${truncate(diff)}`;
  }
  return toolText(truncate(body), code !== 0);
}

async function cmdReplace(args: Record<string, unknown>): Promise<ToolCallResult> {
  const pattern = String(args.pattern ?? '');
  const rewrite = String(args.rewrite ?? '');
  if (!pattern || !rewrite) return toolText('pattern and rewrite are required', true);
  const extra = [pattern, rewrite];
  if (args.lang) extra.push('--lang', String(args.lang));
  if (args.fix === true) extra.push('--fix');
  for (const g of args.globs as unknown[] ?? []) extra.push('--globs', String(g));
  for (const p of strPaths(args)) extra.push('--path', p);
  const { stdout, stderr, code } = await runHelper('replace', extra);
  return toolText(truncate((stdout || stderr).trim() || '(no replace output)'), code !== 0);
}

async function cmdValidate(args: Record<string, unknown>): Promise<ToolCallResult> {
  const pattern = String(args.pattern ?? '');
  if (!pattern) return toolText('pattern is required', true);
  const extra = [pattern];
  if (args.lang) extra.push('--lang', String(args.lang));
  const { stdout, stderr, code } = await runHelper('validate', extra);
  return toolText((stdout || stderr).trim() || '(no validate output)', code !== 0);
}

async function cmdRules(): Promise<ToolCallResult> {
  const { stdout, stderr, code } = await runHelper('rules');
  return toolText((stdout || stderr).trim() || '(no rules)', code !== 0);
}

async function cmdAudit(args: Record<string, unknown>): Promise<ToolCallResult> {
  const extra: string[] = [];
  if (args.only) extra.push('--only', String(args.only));
  if (args.zone) extra.push('--zone', String(args.zone));
  if (args.rule) extra.push('--rule', String(args.rule));
  if (args.profile) extra.push('--profile', String(args.profile));
  if (args.verbose === true) extra.push('--verbose');
  if (args.parallel === true) extra.push('--parallel');
  if (args.workers != null) extra.push('--workers', String(args.workers));
  if (args.format) extra.push('--format', String(args.format));
  if (args.failOn === true) extra.push('--fail-on');
  for (const g of args.globs as unknown[] ?? []) extra.push('--globs', String(g));
  const { stdout, stderr, code } = await runHelper('audit', extra);
  return toolText(truncate((stdout || stderr).trim() || '(no audit output)'), code !== 0);
}

async function cmdCodemods(): Promise<ToolCallResult> {
  const { stdout, stderr, code } = await runHelper('codemods');
  return toolText((stdout || stderr).trim() || '(no codemods)', code !== 0);
}

async function cmdCodemod(args: Record<string, unknown>): Promise<ToolCallResult> {
  const name = String(args.name ?? '');
  if (!name) return toolText('name is required', true);
  const extra = [name];
  if (args.fix === true) extra.push('--fix');
  if (args.only) extra.push('--only', String(args.only));
  for (const g of args.globs as unknown[] ?? []) extra.push('--globs', String(g));
  for (const p of strPaths(args)) extra.push('--path', p);
  const { stdout, stderr, code } = await runHelper('codemod', extra);
  return toolText(truncate((stdout || stderr).trim() || '(no codemod output)'), code !== 0);
}

async function cmdTest(args: Record<string, unknown>): Promise<ToolCallResult> {
  const extra: string[] = [];
  if (args.update === true) extra.push('-U');
  const { stdout, stderr, code } = await runHelper('test', extra);
  return toolText(truncate((stdout || stderr).trim() || '(no test output)'), code !== 0);
}

async function cmdNetwork(args: Record<string, unknown>): Promise<ToolCallResult> {
  const script = join(SKILL_ROOT, 'scripts/network-cli.ts');
  const extra: string[] = [];
  if (args.pointers === true) {
    extra.push('--pointers');
    if (args.jsonOut === true) extra.push('--json');
    const { stdout, stderr, code } = await runBunScript(script, extra);
    return toolText(truncate((stdout || stderr).trim() || '(no pointers output)'), code !== 0);
  }
  const scanPath = args.scanPath ? String(args.scanPath) : '';
  if (!scanPath) {
    return toolText('scanPath is required unless pointers=true', true);
  }
  extra.push('--path', scanPath, '--repo', repoRoot());
  if (args.domain) extra.push('--domain', String(args.domain));
  if (args.profile) extra.push('--profile', String(args.profile));
  if (args.healthUrl) extra.push('--health-url', String(args.healthUrl));
  if (args.output) extra.push('--output', String(args.output));
  if (args.dryRun === true) extra.push('--dry-run');
  if (args.validateGroundTruth === true) extra.push('--validate-ground-truth');
  if (args.seed === true) extra.push('--seed');
  if (args.noSeed === true) extra.push('--no-seed');
  if (args.loop === true) extra.push('--loop');
  if (args.watch === true) extra.push('--watch');
  if (args.verbose === true) extra.push('--verbose');
  if (args.quiet === true) extra.push('--quiet');
  if (args.jsonOut === true) extra.push('--json');
  if (args.failOnDrift === true) extra.push('--fail-on-drift');
  if (args.failOnHealth === true) extra.push('--fail-on-health');
  const { stdout, stderr, code } = await runBunScript(script, extra);
  const body = [stdout.trim(), stderr.trim()].filter(Boolean).join('\n') || '(no network output)';
  return toolText(truncate(body), code !== 0);
}

async function cmdPrecommit(args: Record<string, unknown>): Promise<ToolCallResult> {
  const root = repoRoot();
  const full = args.full === true;
  const steps: Array<{ label: string; script: string; extra?: string[] }> = [];

  if (full || args.hygiene === true) {
    steps.push({ label: 'hygiene', script: join(root, 'scripts/repo-hygiene.ts'), extra: ['--staged'] });
  }
  if (full || args.harness === true) {
    steps.push({ label: 'harness', script: join(root, 'scripts/pre-commit-harness.ts') });
  }
  if (args.astGrep !== false) {
    const astGrepMode = full
      ? '--full'
      : args.staged === true
        ? '--staged'
        : args.changed === true
          ? '--changed'
          : '--full';
    steps.push({
      label: 'ast-grep',
      script: join(root, 'scripts/pre-commit-ast-grep.ts'),
      extra: [astGrepMode],
    });
  }
  if (steps.length === 0) {
    steps.push({
      label: 'ast-grep',
      script: join(root, 'scripts/pre-commit-ast-grep.ts'),
      extra: ['--full'],
    });
  }

  const chunks: string[] = [];
  let code = 0;
  for (const step of steps) {
    const { stdout, stderr, code: stepCode } = await runBunScript(step.script, step.extra ?? []);
    chunks.push(`== ${step.label} ==\n${[stdout.trim(), stderr.trim()].filter(Boolean).join('\n')}`);
    if (stepCode !== 0) {
      code = stepCode;
      break;
    }
  }
  return toolText(truncate(chunks.join('\n\n')), code !== 0);
}

async function cmdWorkflow(args: Record<string, unknown>): Promise<ToolCallResult> {
  const script = join(SKILL_ROOT, 'scripts/workflow-cli.ts');
  const extra: string[] = ['start', '--domain', String(args.domain)];
  if (args.scanPath) extra.push('--scan-path', String(args.scanPath));
  if (args.scanners) extra.push('--scanners', String(args.scanners));
  if (args.watch === true) extra.push('--watch');
  if (args.dryRun === true) extra.push('--dry-run');
  if (args.seed) extra.push('--seed', String(args.seed));
  if (args.seedWrite) extra.push('--seed-write', String(args.seedWrite));
  if (args.failOnIssue === true) extra.push('--fail-on-issue');
  if (args.failOnDrift === true) extra.push('--fail-on-drift');
  if (args.alertUrl) extra.push('--alert-url', String(args.alertUrl));
  if (args.fix === true) extra.push('--fix');
  if (args.report) extra.push('--report', String(args.report));
  if (args.effectsDir) extra.push('--effects-dir', String(args.effectsDir));
  if (Array.isArray(args.effects)) {
    for (const effect of args.effects) extra.push('--effect', String(effect));
  }
  if (args.jsonOut === true) extra.push('--json');
  const { stdout, stderr, code } = await runBunScript(script, extra);
  const body = [stdout.trim(), stderr.trim()].filter(Boolean).join('\n') || '(no workflow output)';
  return toolText(truncate(body), code !== 0);
}

async function cmdSkillLoop(args: Record<string, unknown>): Promise<ToolCallResult> {
  let action = String(args.action ?? 'list');
  if (action === 'precommit') return cmdPrecommit({ full: args.full, hygiene: args.hygiene, harness: args.harness, astGrep: args.astGrep });
  if (action === 'workflow') {
    return cmdWorkflow({
      domain: args.domain ?? 'sports-terminal-os',
      scanPath: args.scanPath,
      watch: args.watch,
      dryRun: args.dryRun,
      seed: args.seed,
      failOnDrift: args.failOnDrift,
      alertUrl: args.alertUrl,
      fix: args.fix,
      effectsDir: args.effectsDir,
      effects: args.effects,
      jsonOut: args.jsonOut,
    });
  }
  const script = join(SKILL_ROOT, 'scripts/skill-loop-cli.ts');
  if (action === 'plan') action = 'full';
  const extra: string[] = [action];
  if (args.skill) extra.push('--skill', String(args.skill));
  if (args.phases) extra.push('--phases', String(args.phases));
  if (args.preset) extra.push('--preset', String(args.preset));
  if (args.profile) extra.push('--profile', String(args.profile));
  if (args.iterations != null) extra.push('--iterations', String(args.iterations));
  if (args.domain) extra.push('--domain', String(args.domain));
  if (args.scanPath) extra.push('--scan-path', String(args.scanPath));
  if (args.targetMs != null) extra.push('--target-ms', String(args.targetMs));
  if (args.groundTruth === true) extra.push('--ground-truth');
  if (args.failOnNetworkDrift === true) extra.push('--fail-on-network-drift');
  if (args.minRating != null) extra.push('--min-rating', String(args.minRating));
  if (args.only) extra.push('--only', String(args.only));
  if (args.dryRun === true || args.action === 'plan') extra.push('--dry-run');
  if (args.explain === true || args.action === 'plan') extra.push('--explain');
  if (args.verbose === true) extra.push('--verbose');
  if (args.quiet === true) extra.push('--quiet');
  if (args.parallel === true) extra.push('--parallel');
  if (args.skipPreflight === true) extra.push('--skip-preflight');
  if (args.failOnRating === true) extra.push('--fail-on-rating');
  if (args.failOnDrift === true) extra.push('--fail-on-drift');
  if (args.baselineWrite === true) extra.push('--baseline-write');
  if (args.noBaseline === true) extra.push('--no-baseline');
  if (args.smoke === true) extra.push('--smoke');
  if (args.seed === true) extra.push('--seed');
  if (args.effect === true) extra.push('--effect');
  if (args.jsonOut === true) extra.push('--json');
  if (args.herdrTab === true) extra.push('--herdr-tab');
  if (args.noColor === true) extra.push('--no-color');
  const { stdout, stderr, code } = await runBunScript(script, extra);
  const body = [stdout.trim(), stderr.trim()].filter(Boolean).join('\n') || '(no skill-loop output)';
  return toolText(truncate(body), code !== 0);
}

async function handleToolsCall(id: number | string | undefined, params: Record<string, unknown>): Promise<JsonRpcMessage> {
  const name = String(params?.name ?? '');
  const args = (params?.arguments ?? {}) as Record<string, unknown>;
  try {
    let result: ToolCallResult;
    switch (name) {
      case 'ast_grep_doctor': result = await cmdDoctor(args); break;
      case 'ast_grep_outline': result = await cmdOutline(args); break;
      case 'ast_grep_search': result = await cmdSearch(args); break;
      case 'ast_grep_files': result = await cmdSearch(args, true); break;
      case 'ast_grep_map': result = await cmdMap(args); break;
      case 'ast_grep_zones': result = await cmdZones(args); break;
      case 'ast_grep_discover': result = await cmdDiscover(args); break;
      case 'ast_grep_index': result = await cmdIndex(args); break;
      case 'ast_grep_anchors': result = await cmdAnchors(args); break;
      case 'ast_grep_exports': result = await cmdExports(args); break;
      case 'ast_grep_collisions': result = await cmdCollisions(args); break;
      case 'ast_grep_graph': result = await cmdGraph(args); break;
      case 'ast_grep_jump': result = await cmdJump(args); break;
      case 'ast_grep_bun': result = await cmdBun(args); break;
      case 'ast_grep_nav': result = await cmdNav(args); break;
      case 'ast_grep_scan': result = await cmdScan(args); break;
      case 'ast_grep_fix': result = await cmdFix(args); break;
      case 'ast_grep_replace': result = await cmdReplace(args); break;
      case 'ast_grep_validate': result = await cmdValidate(args); break;
      case 'ast_grep_rules': result = await cmdRules(); break;
      case 'ast_grep_audit': result = await cmdAudit(args); break;
      case 'ast_grep_codemods': result = await cmdCodemods(); break;
      case 'ast_grep_codemod': result = await cmdCodemod(args); break;
      case 'ast_grep_test': result = await cmdTest(args); break;
      case 'ast_grep_network': result = await cmdNetwork(args); break;
      case 'ast_grep_skill_loop': result = await cmdSkillLoop(args); break;
      case 'ast_grep_precommit': result = await cmdPrecommit(args); break;
      case 'ast_grep_workflow': result = await cmdWorkflow(args); break;
      default: return rpcErr(id, -32601, `Unknown tool: ${name}`);
    }
    return rpcOk(id, result);
  } catch (e) {
    return rpcOk(id, toolText(String(e), true));
  }
}

function handleRequest(msg: JsonRpcMessage): JsonRpcMessage | null {
  const { method, id } = msg;
  if (method === 'notifications/initialized' || method?.startsWith('notifications/')) return null;
  switch (method) {
    case 'initialize':
      return rpcOk(id, {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: {
          name: SERVER_NAME,
          version: SERVER_VERSION,
          bunVersion: Bun.version,
          bunRevision: Bun.revision,
        },
      });
    case 'tools/list':
      return rpcOk(id, { tools: TOOLS });
    default:
      return id !== undefined ? rpcErr(id, -32601, `Unknown method: ${method}`) : null;
  }
}

async function main() {
  await assertBunStablePin();
  const log = (s: string) => process.stderr.write(`${s}\n`);
  try {
    const bin = await resolveBinary();
    const ver = await runSg(['--version'], repoRoot());
    log(`[${SERVER_NAME}] v${SERVER_VERSION} · ${ver.stdout.trim()} · repo ${repoRoot()}`);
  } catch (e) {
    log(`[${SERVER_NAME}] warn: ${e}`);
  }

  for await (const msg of readJsonRpcStream(Bun.stdin.stream())) {
    try {
      if (msg.method === 'tools/call') {
        writeJsonRpc(await handleToolsCall(msg.id, (msg.params ?? {}) as Record<string, unknown>));
        continue;
      }
      const response = handleRequest(msg);
      if (response) writeJsonRpc(response);
    } catch (e) {
      log(`[${SERVER_NAME}] ${e}`);
    }
  }
}

void main().catch(error => {
  console.error(`[${SERVER_NAME}] fatal:`, error);
  process.exit(1);
});

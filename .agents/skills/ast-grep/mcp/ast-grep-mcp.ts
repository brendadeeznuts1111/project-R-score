#!/usr/bin/env bun
/** ast-grep MCP — pi-ast-grep parity for Cursor (outline, search, map, scan). Zero npm deps. */

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

const SERVER_NAME = 'ast-grep';
const SERVER_VERSION = '0.12.0';
const MAX_LINES = 2_000;
const MAX_BYTES = 50 * 1024;

const SKILL_ROOT = resolve(import.meta.dir, '..');

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
        globalFix: { type: 'boolean', description: 'Hint npm global install when fix is set.' },
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
        zone: { type: 'string', enum: ['sports-terminal', 'kimi', 'agents'] },
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
        zone: { type: 'string', enum: ['sports-terminal', 'kimi', 'agents'] },
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
        zone: { type: 'string', enum: ['sports-terminal', 'kimi', 'agents'] },
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
        zone: { type: 'string', enum: ['sports-terminal', 'kimi', 'agents'] },
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
        zone: { type: 'string', enum: ['sports-terminal', 'kimi', 'agents'] },
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
        zone: { type: 'string', enum: ['sports-terminal', 'kimi', 'agents'] },
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
        zone: { type: 'string', enum: ['sports-terminal', 'kimi', 'agents'] },
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
        zone: { type: 'string', enum: ['sports-terminal', 'kimi', 'agents'] },
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
        action: { type: 'string', enum: ['patterns', 'bundles', 'inventory', 'matrix', 'heatmap', 'score', 'migrate', 'report', 'docs', 'roadmap', 'search'], description: 'Bun subcommand' },
        priority: { type: 'string', enum: ['high', 'medium', 'low', 'nice'], description: 'For roadmap: filter by priority' },
        integration: { type: 'string', enum: ['catalog', 'planned', 'integrated'], description: 'For roadmap: filter by integration state' },
        patternId: { type: 'string', description: 'For search: bun-serve, bun-file, bun-glob, ...' },
        only: { type: 'string' },
        zone: { type: 'string', enum: ['sports-terminal', 'kimi', 'agents'] },
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
        zone: { type: 'string', enum: ['sports-terminal', 'kimi', 'agents'], description: 'Zone id (required)' },
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
    description: 'Scan repo-map targets; summarize by rule. profile=ci|autofix|strict, verbose=file breakdown.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        only: { type: 'string', description: 'Filter targets by id/name substring' },
        rule: { type: 'string', description: 'Single rule instead of full sgconfig' },
        profile: { type: 'string', description: 'scan-profiles.json key (ci, autofix, strict)' },
        verbose: { type: 'boolean', description: 'Per-file violation breakdown' },
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

async function cmdDoctor(args: Record<string, unknown>): Promise<ToolCallResult> {
  const extra: string[] = [];
  if (args.fix === true) extra.push('--fix');
  if (args.globalFix === true) extra.push('--global-fix');
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
  if (args.stats === true) extra.push('--stats');
  if (args.jsonOut === true) extra.push('--json-out');
  const { stdout, stderr, code } = await runHelper('zones', extra);
  return toolText(truncate((stdout || stderr).trim() || '(no zones output)'), code !== 0);
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
  if (args.rule) extra.push('--rule', String(args.rule));
  if (args.profile) extra.push('--profile', String(args.profile));
  if (args.verbose === true) extra.push('--verbose');
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
        serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
      });
    case 'tools/list':
      return rpcOk(id, { tools: TOOLS });
    default:
      return id !== undefined ? rpcErr(id, -32601, `Unknown method: ${method}`) : null;
  }
}

async function main() {
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

main();
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
const SERVER_VERSION = '0.4.0';
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
    description: 'Map code structure (symbols, exports, digest). Requires ast-grep 0.44+.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        paths: { type: 'array', items: { type: 'string' }, description: 'Files or directories' },
        view: { type: 'string', enum: ['auto', 'names', 'signatures', 'digest', 'expanded'] },
        items: { type: 'string', enum: ['auto', 'structure', 'exports', 'imports', 'all'] },
        match: { type: 'string', description: 'Regex filter on symbol names' },
        types: { type: 'string', description: 'Comma-separated symbol types' },
        bunRules: { type: 'boolean', description: 'Load outline-rules/bun-monorepo.yml' },
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
    description: 'Outline monorepo targets from repo-map.json (sports-terminal, kimi-plugin, ...).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        only: { type: 'string', description: 'Filter targets by id/name substring' },
      },
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
  const sgArgs = ['outline', '--color', 'never'];
  if (args.view) sgArgs.push('--view', String(args.view));
  if (args.items) sgArgs.push('--items', String(args.items));
  if (args.match) sgArgs.push('--match', String(args.match));
  if (args.types) sgArgs.push('--type', String(args.types));
  if (args.bunRules === true) {
    sgArgs.push('--outline-rules', join(SKILL_ROOT, 'outline-rules/bun-monorepo.yml'));
  }
  pushGlobs(sgArgs, args.globs);
  sgArgs.push(...strPaths(args));
  const { stdout, stderr, code } = await runSg(sgArgs, repoRoot());
  if (code !== 0) return toolText(stderr || stdout || `outline failed (${code})`, true);
  return toolText(truncate(stdout.trim() || '(no outline entries)'));
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
  const manifest = join(SKILL_ROOT, 'repo-map.json');
  const data = JSON.parse(await readFile(manifest, 'utf8')) as { targets?: RepoTarget[] };
  const root = repoRoot();
  const only = String(args.only ?? '').toLowerCase();
  let targets = data.targets ?? [];
  if (only) {
    targets = targets.filter(
      t => (t.id ?? '').toLowerCase().includes(only) || (t.name ?? '').toLowerCase().includes(only),
    );
  }
  if (!targets.length) return toolText('no map targets matched filter', true);
  const chunks: string[] = [`repo: ${root}`, `targets: ${targets.length}`, ''];
  for (const t of targets) {
    const rel = t.path ?? '.';
    chunks.push(`## ${t.name ?? rel}`, `path: ${rel}`);
    const sgArgs = ['outline', '--color', 'never'];
    if (t.view) sgArgs.push('--view', t.view);
    if (t.items) sgArgs.push('--items', t.items);
    pushGlobs(sgArgs, t.globs);
    sgArgs.push(resolve(root, rel));
    const { stdout, code } = await runSg(sgArgs, root);
    chunks.push(code === 0 ? truncate(stdout.trim() || '(no outline)') : '(outline failed)', '');
  }
  return toolText(chunks.join('\n'));
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
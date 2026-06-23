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
const SERVER_VERSION = '0.1.0';
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
    description: 'Verify ast-grep 0.44+ binary and outline support.',
    inputSchema: { type: 'object' as const, properties: {} },
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
    description: 'Run bundled YAML rules (no-console-log, no-as-any, empty-catch, ...). Preview unless apply=true.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        paths: { type: 'array', items: { type: 'string' } },
        rule: { type: 'string', description: 'Single rule file under skill rules/' },
        apply: { type: 'boolean' },
        globs: { type: 'array', items: { type: 'string' } },
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

async function cmdDoctor(): Promise<ToolCallResult> {
  const bin = await resolveBinary();
  const ver = await runSg(['--version'], repoRoot());
  const lines = [`binary: ${bin}`, `version: ${ver.stdout.trim()}`, `outline: supported`, `repo: ${repoRoot()}`];
  return toolText(lines.join('\n'));
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
  if (args.apply === true) sgArgs.push('-U');
  pushGlobs(sgArgs, args.globs);
  sgArgs.push(...strPaths(args));
  const { stdout, stderr, code } = await runSg(sgArgs, repoRoot());
  if (code !== 0 && code !== 1) return toolText(stderr || stdout || `scan failed (${code})`, true);
  return toolText(truncate((stdout || stderr).trim() || '(no scan results)'));
}

async function handleToolsCall(id: number | string | undefined, params: Record<string, unknown>): Promise<JsonRpcMessage> {
  const name = String(params?.name ?? '');
  const args = (params?.arguments ?? {}) as Record<string, unknown>;
  try {
    let result: ToolCallResult;
    switch (name) {
      case 'ast_grep_doctor': result = await cmdDoctor(); break;
      case 'ast_grep_outline': result = await cmdOutline(args); break;
      case 'ast_grep_search': result = await cmdSearch(args); break;
      case 'ast_grep_files': result = await cmdSearch(args, true); break;
      case 'ast_grep_map': result = await cmdMap(args); break;
      case 'ast_grep_scan': result = await cmdScan(args); break;
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
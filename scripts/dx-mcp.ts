#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/networking/tcp#create-a-connection-bun-connect — Bun.connect
// @see https://bun.com/docs/runtime/webview#new-bun-webview-options — Bun.WebView
// @see https://bun.com/docs/runtime/webview#new-bun-webview-options — WebView
// @see https://bun.com/docs/runtime/image#input — Bun.Image
// @see https://bun.com/docs/runtime/console#reading-from-stdin — Bun.stdin
// @see https://bun.com/docs/runtime/sqlite — bun:sqlite
// @see https://bun.com/docs/runtime/cron — Bun.cron
// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/runtime/file-io — Bun.write
// @see https://bun.com/docs/runtime/http/server — Bun.serve
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
// @see https://bun.com/docs/runtime/markdown#bun-markdown-html — Bun.markdown
// @see https://bun.com/docs/runtime/hashing#bun-hash — Bun.hash
// @see https://bun.com/docs/runtime/glob — Bun.Glob
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// @see https://bun.com/docs/runtime/utils#bun-stringwidth — Bun.stringWidth
// @see https://bun.com/docs/runtime/utils#bun-stripansi — Bun.stripANSI
// @see https://bun.com/docs/runtime/environment-variables — Bun.env
// @see https://bun.com/docs/runtime/utils#bun-which — Bun.which
// @see https://bun.com/docs/runtime/utils#bun-nanoseconds — Bun.nanoseconds
// @see https://bun.com/docs/runtime/utils#bun-sleep — Bun.sleep
// @see https://bun.com/docs/runtime/utils#bun-deepequals — Bun.deepEquals
// @see https://bun.com/docs/runtime/utils#bun-escapehtml — Bun.escapeHTML
// dx-mcp.ts — Developer Experience MCP server for project dashboard
// Wave 9 primitives: Bun.file, Bun.nanoseconds, Bun.markdown.ansi, Bun.deepEquals, Bun.escapeHTML
// Zero npm deps. Exposes project listing, info, README, health checks.
// Register in .cursor/mcp.json or .mcp.json:
//   { "type": "stdio", "command": "bun", "args": ["${workspaceFolder}/scripts/dx-mcp.ts"] }

import {
  readJsonRpcStream,
  rpcErr,
  rpcOk,
  toolJson,
  toolText,
  writeJsonRpc,
  type ToolCallResult,
} from '../lib/mcp/stdio-jsonrpc.ts';
import { BUN_DX_CATALOG, searchCatalog } from '../config/bun-dx-catalog.ts';
import {
  baseName,
  checkGitStatus,
  fileExistsSync,
  isDirectory,
  joinPath as join,
  listChildDirectoryNames,
  walkStats,
} from '../lib/projects-scan.ts';

const ROOT = join(import.meta.dir, '..');
const GIT = Bun.which('git');
const BUN_VERSION = Bun.version;
const SERVER_VERSION = '2.2.0';
const SCAN_DEBUG = Bun.env.DX_MCP_DEBUG === '1';

function debugScanFromUnknown(where: string, err: unknown): void {
  if (SCAN_DEBUG) console.error(`[dx-mcp:scan] ${where}`, err);
}

const DEFAULT_SCAN_ROOTS = [
  join(ROOT, 'projects', 'active'),
  join(ROOT, 'projects', 'experimental'),
  join(ROOT, 'projects', 'archive'),
  join(ROOT, 'projects', 'active', 'enterprise', 'cascade-mover-v3'),
  join(ROOT, 'projects', 'active', 'enterprise', 'bet-ticker-worker-v1.1'),
];

const SCAN_ROOTS = (() => {
  const env = Bun.env.DX_SCAN_ROOTS;
  if (!env) return DEFAULT_SCAN_ROOTS;
  return env
    .split(',')
    .map(s => (s.startsWith('/') ? s : join(ROOT, s.trim())))
    .filter(Boolean);
})();

// ── Types ──────────────────────────────────────────────────────
type ProjectType = 'cloudflare-worker' | 'cascade-mover' | 'bun-native' | 'npm-package' | 'unknown';

interface ProjectMeta {
  fullPath: string;
  scanRoot: string;
  dirName: string;
  name: string;
  version: string;
  description: string;
  license: string;
  private: boolean;
  type: ProjectType;
  gitStatus: 'none' | 'clean' | 'dirty';
  hasReadme: boolean;
  hasLicense: boolean;
  fileCount: number;
  sizeKb: number;
  lastChanged: string;
  signals: string[];
}

// ── Tool timing instrumentation (Bun.nanoseconds) ──────────────
const toolTimings = new Map<string, number[]>();

function recordTiming(tool: string, ns: bigint): number {
  const ms = Number(Bun.nanoseconds() - ns) / 1_000_000;
  const arr = toolTimings.get(tool);
  if (arr) arr.push(ms);
  else toolTimings.set(tool, [ms]);
  return ms;
}

// ── Project scan cache (TTL-based, avoids rescan on every tool call) ──
const SCAN_CACHE_TTL = 5_000;
let scanCache: { projects: ProjectMeta[]; ts: number } | null = null;
let cacheHits = 0;
let cacheMisses = 0;

async function getProjects(): Promise<ProjectMeta[]> {
  const now = Date.now();
  if (scanCache && now - scanCache.ts < SCAN_CACHE_TTL) {
    cacheHits++;
    return scanCache.projects;
  }
  cacheMisses++;
  scanCache = { projects: await scanProjects(), ts: now };
  return scanCache.projects;
}

function resetCache() {
  scanCache = null;
  cacheHits = 0;
  cacheMisses = 0;
}

// ── Type detection ─────────────────────────────────────────────
function detectType(
  fullPath: string,
  pkg?: Record<string, any>
): { type: ProjectType; signals: string[] } {
  const s: string[] = [];

  if (fileExistsSync(join(fullPath, 'wrangler.toml'))) {
    s.push('wrangler.toml');
    return { type: 'cloudflare-worker', signals: s };
  }
  if (fileExistsSync(join(fullPath, 'src', 'server', 'cascade-mover-mcp.ts'))) {
    s.push('cascade-mover-mcp.ts');
    return { type: 'cascade-mover', signals: s };
  }
  if (fileExistsSync(join(fullPath, 'src', 'server', 'main-server.ts'))) {
    s.push('main-server.ts');
    return { type: 'cascade-mover', signals: s };
  }
  if (pkg) {
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (!deps || Object.keys(deps).length === 0) {
      s.push('zero-deps');
      return { type: 'bun-native', signals: s };
    }
  }
  return { type: 'npm-package', signals: s };
}

async function makeProjectMeta(fullPath: string, scanRoot: string): Promise<ProjectMeta> {
  const pkgPath = join(fullPath, 'package.json');
  let pkg: Record<string, any> = {};
  try {
    pkg = (await Bun.file(pkgPath).json()) as Record<string, any>;
  } catch (err) {
    debugScanFromUnknown(`read package.json ${pkgPath}`, err);
  }
  const { type, signals } = detectType(fullPath, pkg);
  const stats = walkStats(fullPath);
  return {
    fullPath,
    scanRoot,
    dirName: baseName(fullPath),
    name: pkg.name || baseName(fullPath),
    version: pkg.version || '—',
    description: pkg.description || '—',
    license: pkg.license || '—',
    private: !!pkg.private,
    type,
    gitStatus: checkGitStatus(fullPath, GIT),
    hasReadme: fileExistsSync(join(fullPath, 'README.md')),
    hasLicense: !!pkg.license || fileExistsSync(join(fullPath, 'LICENSE')),
    fileCount: stats.fileCount,
    sizeKb: stats.sizeKb,
    lastChanged: stats.lastChanged,
    signals,
  };
}

// ── Scan ───────────────────────────────────────────────────────
async function scanProjects(): Promise<ProjectMeta[]> {
  const seen = new Set<string>();
  const projects: ProjectMeta[] = [];

  for (const root of SCAN_ROOTS) {
    if (!isDirectory(root)) continue;

    if (fileExistsSync(join(root, 'package.json'))) {
      if (!seen.has(root)) {
        seen.add(root);
        projects.push(await makeProjectMeta(root, root));
      }
    }

    for (const name of listChildDirectoryNames(root)) {
      if (name.startsWith('.')) continue;
      if (name === 'node_modules' || name === 'dist' || name === 'build') continue;
      const fp = join(root, name);
      if (seen.has(fp) || !fileExistsSync(join(fp, 'package.json'))) continue;
      seen.add(fp);
      projects.push(await makeProjectMeta(fp, root));
    }
  }

  return projects;
}

// ── Reusable helpers ───────────────────────────────────────────
function findProject(projects: ProjectMeta[], target: string): ProjectMeta | undefined {
  return projects.find(p => p.dirName === target || p.name === target || p.fullPath === target);
}

// ── Analysis helpers ───────────────────────────────────────────
const SRC_GLOB = new Bun.Glob('**/*.{ts,tsx,js,jsx,mjs,cjs}');

async function walkSource(dir: string): Promise<string[]> {
  const files: string[] = [];
  try {
    for await (const f of SRC_GLOB.scan({
      cwd: dir,
      absolute: true,
      dot: false,
      followSymlinks: false,
    })) {
      if (
        f.includes('/node_modules/') ||
        f.includes('/dist/') ||
        f.includes('/build/') ||
        f.includes('/.git/') ||
        f.includes('/coverage/') ||
        f.includes('/.cache/')
      )
        continue;
      files.push(f);
    }
  } catch (err) {
    debugScanFromUnknown(`walkSource ${dir}`, err);
  }
  return files;
}

async function extractImports(filePath: string): Promise<string[]> {
  const pkgs = new Set<string>();
  try {
    const src = await Bun.file(filePath).text();
    const re = /(?:from\s+['"]|require\s*\(\s*['"]|import\s*\(\s*['"]|import\s+['"])([^'"]+)['"]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src)) !== null) {
      const raw = m[1]!;
      if (
        raw.startsWith('.') ||
        raw.startsWith('/') ||
        raw.startsWith('node:') ||
        raw.startsWith('bun:')
      )
        continue;
      pkgs.add(raw.startsWith('@') ? raw.split('/').slice(0, 2).join('/') : raw.split('/')[0]!);
    }
  } catch (err) {
    debugScanFromUnknown(`extractImports ${filePath}`, err);
  }
  return [...pkgs];
}

async function findUnusedDeps(
  dir: string
): Promise<{ used: string[]; unused: string[]; deps: Record<string, string> }> {
  const pkgPath = join(dir, 'package.json');
  if (!fileExistsSync(pkgPath)) return { used: [], unused: [], deps: {} };
  let deps: Record<string, string> = {};
  try {
    const pkg = (await Bun.file(pkgPath).json()) as Record<string, any>;
    deps = { ...pkg.dependencies, ...pkg.devDependencies };
  } catch {
    return { used: [], unused: [], deps: {} };
  }
  const imported = new Set<string>();
  const srcFiles = await walkSource(dir);
  for (const file of srcFiles) {
    for (const imp of await extractImports(file)) imported.add(imp);
  }
  const depNames = Object.keys(deps);
  return {
    used: depNames.filter(d => imported.has(d)),
    unused: depNames.filter(d => !imported.has(d)),
    deps,
  };
}

async function findLargeFiles(dir: string, topN = 20): Promise<{ path: string; size: number }[]> {
  const files: { path: string; size: number }[] = [];
  const srcFiles = await walkSource(dir);
  for (const file of srcFiles) {
    try {
      files.push({ path: file.replace(dir + '/', ''), size: Bun.file(file).size });
    } catch (err) {
      debugScanFromUnknown(`stat ${file}`, err);
    }
  }
  files.sort((a, b) => b.size - a.size);
  return files.slice(0, topN);
}

async function rgSearchAll(
  projects: ProjectMeta[],
  pattern: string,
  maxResults = 50
): Promise<{ project: string; results: string[] }[]> {
  const rg = Bun.which('rg');
  if (!rg) return [];
  const results = await Promise.all(
    projects.map(async p => {
      try {
        const proc = Bun.spawn(
          [rg, '--no-heading', '-n', '--max-count', String(maxResults), pattern, p.fullPath],
          { timeout: 10000 }
        );
        const output = await proc.stdout.text();
        const lines = output.trim().split('\n').filter(Boolean);
        return lines.length > 0 ? { project: p.name, results: lines } : null;
      } catch {
        return null;
      }
    })
  );
  return results.filter(Boolean) as { project: string; results: string[] }[];
}

function rgSearch(dir: string, pattern: string, maxResults = 50): string[] {
  const rg = Bun.which('rg');
  if (!rg) return ['rg not available'];
  try {
    const proc = Bun.spawnSync(
      [rg, '--no-heading', '-n', '--max-count', String(maxResults), pattern, dir],
      { timeout: 10000 }
    );
    return proc.stdout.toString().trim().split('\n').filter(Boolean) || [];
  } catch {
    return ['rg search failed'];
  }
}

function nodeModulesSize(dir: string): number {
  const nm = join(dir, 'node_modules');
  if (!fileExistsSync(nm)) return 0;
  try {
    const proc = Bun.spawnSync(['du', '-sk', nm], { timeout: 5000 });
    return parseInt(proc.stdout.toString().trim().split(/\s+/)[0] || '0', 10);
  } catch {
    return 0;
  }
}

function checkLockfile(dir: string): { exists: boolean; inSync: boolean; size: number } {
  const lock = join(dir, 'bun.lock');
  const lockb = join(dir, 'bun.lockb');
  const pkg = join(dir, 'package.json');
  if (!fileExistsSync(pkg)) return { exists: false, inSync: false, size: 0 };
  const lf = fileExistsSync(lock) ? lock : fileExistsSync(lockb) ? lockb : null;
  if (!lf) return { exists: false, inSync: false, size: 0 };
  const lockFile = Bun.file(lf);
  const pkgFile = Bun.file(pkg);
  return {
    exists: true,
    inSync: lockFile.lastModified >= pkgFile.lastModified,
    size: lockFile.size,
  };
}

async function analyzeWorkspace(): Promise<{
  packages: string[];
  totalDeps: number;
  rootDeps: number;
}> {
  const pkgPath = join(ROOT, 'package.json');
  if (!fileExistsSync(pkgPath)) return { packages: [], totalDeps: 0, rootDeps: 0 };
  let pkg: Record<string, any> = {};
  try {
    pkg = (await Bun.file(pkgPath).json()) as Record<string, any>;
  } catch {
    return { packages: [], totalDeps: 0, rootDeps: 0 };
  }
  const workspaces: string[] = pkg.workspaces?.packages || [];
  const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
  return { packages: workspaces, totalDeps: deps.length, rootDeps: deps.length };
}

async function findBloat(dir: string): Promise<{
  nodeModulesKb: number;
  largeFiles: { path: string; sizeKb: number }[];
  totalSourceFiles: number;
  totalSourceKb: number;
  lockfile: { exists: boolean; inSync: boolean };
}> {
  const nodeModulesKb = nodeModulesSize(dir);
  const largeFiles = (await findLargeFiles(dir, 10)).map(f => ({
    path: f.path,
    sizeKb: Math.round(f.size / 1024),
  }));
  let totalSourceFiles = 0;
  let totalSourceKb = 0;
  const srcFiles = await walkSource(dir);
  for (const file of srcFiles) {
    totalSourceFiles++;
    try {
      totalSourceKb += Math.round(Bun.file(file).size / 1024);
    } catch (err) {
      debugScanFromUnknown(`bloat stat ${file}`, err);
    }
  }
  return {
    nodeModulesKb,
    largeFiles,
    totalSourceFiles,
    totalSourceKb,
    lockfile: { exists: checkLockfile(dir).exists, inSync: checkLockfile(dir).inSync },
  };
}

function knownEntrypoints(p: ProjectMeta): { path: string; exists: boolean }[] {
  const eps: { path: string; exists: boolean }[] = [];
  if (p.type === 'cloudflare-worker') {
    eps.push({ path: 'src/index.ts', exists: fileExistsSync(join(p.fullPath, 'src', 'index.ts')) });
    eps.push({ path: 'wrangler.toml', exists: fileExistsSync(join(p.fullPath, 'wrangler.toml')) });
  } else if (p.type === 'cascade-mover') {
    eps.push({
      path: 'src/server/main-server.ts',
      exists: fileExistsSync(join(p.fullPath, 'src', 'server', 'main-server.ts')),
    });
    eps.push({
      path: 'src/server/cascade-mover-mcp.ts',
      exists: fileExistsSync(join(p.fullPath, 'src', 'server', 'cascade-mover-mcp.ts')),
    });
    eps.push({
      path: 'src/admin-repl.ts',
      exists: fileExistsSync(join(p.fullPath, 'src', 'admin-repl.ts')),
    });
  }
  eps.push({ path: 'README.md', exists: p.hasReadme });
  eps.push({ path: 'package.json', exists: true });
  return eps;
}

// ── MCP Handler ────────────────────────────────────────────────
function toolsList() {
  return {
    tools: [
      {
        name: 'list_projects',
        description:
          'List all projects across all scan roots with metadata, type, and git status. Filter by type.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            sort: {
              type: 'string',
              description: 'Sort by: name, size, type, or changed (default: name)',
            },
            type: {
              type: 'string',
              description:
                'Filter by project type: cloudflare-worker, cascade-mover, bun-native, npm-package',
            },
          },
        },
      },
      {
        name: 'project_info',
        description:
          'Get detailed info for a specific project by name or directory. Resolves across all scan roots.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            project: { type: 'string', description: 'Project name or directory name' },
          },
          required: ['project'],
        },
      },
      {
        name: 'project_readme',
        description:
          'Read the full README.md of a project. Optionally render as ANSI for terminal display.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            project: { type: 'string', description: 'Project name or directory name' },
            format: {
              type: 'string',
              description:
                "Output format: 'raw' (default) or 'ansi' for terminal-rendered markdown",
            },
          },
          required: ['project'],
        },
      },
      {
        name: 'project_health',
        description:
          'Quick health check for all projects: git status, README, LICENSE, file count, last modified.',
        inputSchema: { type: 'object' as const, properties: {} },
      },
      {
        name: 'project_config',
        description:
          'Read project config files (wrangler.toml, config.toml, tsconfig.json, bunfig.toml).',
        inputSchema: {
          type: 'object' as const,
          properties: {
            project: { type: 'string', description: 'Project name or directory name' },
          },
          required: ['project'],
        },
      },
      {
        name: 'project_entrypoints',
        description:
          'List known entry points for a project based on its type (CF Worker, cascade-mover, etc.).',
        inputSchema: {
          type: 'object' as const,
          properties: {
            project: { type: 'string', description: 'Project name or directory name' },
          },
          required: ['project'],
        },
      },
      {
        name: 'find_unused_deps',
        description:
          'Find unused dependencies by comparing package.json deps against actual imports in source files.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            project: { type: 'string', description: 'Project name or directory name' },
          },
          required: ['project'],
        },
      },
      {
        name: 'find_large_files',
        description: 'Find the largest source files in a project.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            project: { type: 'string', description: 'Project name or directory name' },
            topN: { type: 'number', description: 'Number of files to return (default: 20)' },
          },
          required: ['project'],
        },
      },
      {
        name: 'scan_imports',
        description: "List all unique third-party imports used across a project's source files.",
        inputSchema: {
          type: 'object' as const,
          properties: {
            project: { type: 'string', description: 'Project name or directory name' },
          },
          required: ['project'],
        },
      },
      {
        name: 'rg_search',
        description:
          'Search project source files with ripgrep. Use scope=all to search every project.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            project: {
              type: 'string',
              description: "Project name/directory, or 'all' to search across all projects",
            },
            pattern: { type: 'string', description: 'Ripgrep-compatible search pattern' },
            maxResults: { type: 'number', description: 'Max results (default: 50)' },
          },
          required: ['project', 'pattern'],
        },
      },
      {
        name: 'check_lockfiles',
        description: 'Check bun.lock status for all projects.',
        inputSchema: { type: 'object' as const, properties: {} },
      },
      {
        name: 'find_bloat',
        description:
          'Combined bloat report: node_modules size, largest source files, lockfile status.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            project: {
              type: 'string',
              description: "Project name/directory, or 'root' for root workspace",
            },
          },
          required: ['project'],
        },
      },
      {
        name: 'analyze_workspace',
        description:
          'Analyze root workspace: workspace package globs, dependency count, node_modules size.',
        inputSchema: { type: 'object' as const, properties: {} },
      },
      {
        name: 'bun_version',
        description:
          'Get Bun runtime version, dx-mcp server version, and compare against expected.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            expected: {
              type: 'string',
              description: "Optional expected Bun version (e.g. '1.3.14')",
            },
          },
        },
      },
      {
        name: 'mcp_status',
        description:
          'List MCP servers from .mcp.json / .cursor/mcp.json with script checks and sync drift.',
        inputSchema: { type: 'object' as const, properties: {} },
      },
      {
        name: 'dx_system',
        description: 'System resource overview: disk, memory, scan roots, and cache efficiency.',
        inputSchema: { type: 'object' as const, properties: {} },
      },
      {
        name: 'dx_timing',
        description:
          'Per-tool latency histogram from Bun.nanoseconds instrumentation. Calls, avg, p50, p95.',
        inputSchema: { type: 'object' as const, properties: {} },
      },
      {
        name: 'dx_oneliner',
        description:
          'Return a known-good bun -e one-liner for testing Bun primitives. Use --list to see all topics, or pass a topic name to get the exact command.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            topic: {
              type: 'string',
              description: "Topic name. Use '--list' or omit to list all available topics.",
            },
          },
        },
      },
      {
        name: 'dx_catalog',
        description:
          'Search the Bun DX catalog (anti-patterns → Bun-native fixes). Pass query or entry id; omit for list.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            query: { type: 'string', description: 'Search query or catalog entry id' },
            limit: { type: 'number', description: 'Max results (default 5)' },
          },
        },
      },
    ],
  };
}

async function toolsCall(
  name: string,
  params: Record<string, unknown> | undefined
): Promise<ToolCallResult> {
  const t0 = Bun.nanoseconds();
  const projects = await getProjects();

  let payload: unknown;
  try {
    payload = await dispatch(name, params, projects);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    recordTiming(name, t0);
    return toolText(message, true);
  }

  recordTiming(name, t0);
  if (payload && typeof payload === 'object' && 'error' in payload) {
    const err = (payload as { error?: unknown }).error;
    if (typeof err === 'string' && Object.keys(payload as object).length === 1) {
      return toolText(err, true);
    }
  }
  return toolJson(payload);
}

async function dispatch(
  name: string,
  params: Record<string, unknown> | undefined,
  projects: ProjectMeta[]
) {
  switch (name) {
    // ── list_projects ───────────────────────────────────────────
    case 'list_projects': {
      const sort = (params?.sort as string) || 'name';
      const typeFilter = params?.type as string | undefined;
      let filtered = typeFilter ? projects.filter(p => p.type === typeFilter) : projects;

      if (sort === 'size') filtered.sort((a, b) => b.sizeKb - a.sizeKb);
      else if (sort === 'changed')
        filtered.sort((a, b) => b.lastChanged.localeCompare(a.lastChanged));
      else if (sort === 'type') filtered.sort((a, b) => a.type.localeCompare(b.type));
      else filtered.sort((a, b) => a.name.localeCompare(b.name));

      return {
        total: filtered.length,
        scanRootCount: SCAN_ROOTS.filter(r => isDirectory(r)).length,
        projects: filtered.map(p => ({
          name: p.name,
          version: p.version,
          type: p.type,
          private: p.private,
          files: p.fileCount,
          sizeKb: p.sizeKb,
          git: p.gitStatus,
          readme: p.hasReadme,
          license: p.license,
          updated: p.lastChanged,
          dir: p.dirName,
          root: p.scanRoot,
        })),
      };
    }

    // ── project_info ────────────────────────────────────────────
    case 'project_info': {
      const p = findProject(projects, params?.project as string);
      if (!p) return { error: `Project not found.` };
      return {
        name: p.name,
        dir: p.dirName,
        root: p.scanRoot,
        fullPath: p.fullPath,
        version: p.version,
        description: p.description,
        type: p.type,
        signals: p.signals,
        license: p.license,
        private: p.private,
        gitStatus: p.gitStatus,
        hasReadme: p.hasReadme,
        hasLicense: p.hasLicense,
        fileCount: p.fileCount,
        sizeKb: p.sizeKb,
        lastChanged: p.lastChanged,
        entrypoints: knownEntrypoints(p),
      };
    }

    // ── project_readme ──────────────────────────────────────────
    case 'project_readme': {
      const target = params?.project as string;
      const p = findProject(projects, target);
      if (!p) return { error: `Project '${target}' not found.` };
      if (!p.hasReadme) return { error: `No README.md found for '${p.name}'.` };
      const path = join(p.fullPath, 'README.md');
      try {
        const md = await Bun.file(path).text();
        const fmt = (params?.format as string) || 'raw';
        if (fmt === 'ansi') {
          return {
            project: p.name,
            format: 'ansi',
            readme: Bun.markdown.ansi(md, { columns: 80, hyperlinks: true }),
          };
        }
        return { project: p.name, format: 'raw', readme: md };
      } catch {
        return { error: `Failed to read README.md for '${target}'.` };
      }
    }

    // ── project_health ──────────────────────────────────────────
    case 'project_health': {
      return {
        total: projects.length,
        projects: projects.map(p => ({
          name: p.name,
          type: p.type,
          git: p.gitStatus,
          readme: p.hasReadme ? '✓' : '✗',
          license: p.hasLicense ? '✓' : '✗',
          files: p.fileCount,
          sizeKb: p.sizeKb,
          updated: p.lastChanged,
        })),
      };
    }

    // ── project_config ──────────────────────────────────────────
    case 'project_config': {
      const p = findProject(projects, params?.project as string);
      if (!p) return { error: `Project '${params?.project}' not found.` };
      const configs: { path: string; content: string }[] = [];
      const candidates = ['wrangler.toml', 'config.toml', 'bunfig.toml', 'tsconfig.json'];
      for (const cf of candidates) {
        const cfPath = join(p.fullPath, cf);
        if (fileExistsSync(cfPath)) {
          try {
            configs.push({ path: cf, content: await Bun.file(cfPath).text() });
          } catch (err) {
            debugScanFromUnknown(`read config ${cfPath}`, err);
          }
        }
      }
      return { project: p.name, type: p.type, configs };
    }

    // ── project_entrypoints ─────────────────────────────────────
    case 'project_entrypoints': {
      const p = findProject(projects, params?.project as string);
      if (!p) return { error: `Project '${params?.project}' not found.` };
      return { project: p.name, type: p.type, entrypoints: knownEntrypoints(p) };
    }

    // ── find_unused_deps ────────────────────────────────────────
    case 'find_unused_deps': {
      const p = findProject(projects, params?.project as string);
      if (!p) return { error: `Project '${params?.project}' not found.` };
      const result = await findUnusedDeps(p.fullPath);
      return {
        project: p.name,
        totalDeps: Object.keys(result.deps).length,
        usedCount: result.used.length,
        unusedCount: result.unused.length,
        unused: result.unused,
        used: result.used.slice(0, 30),
      };
    }

    // ── find_large_files ────────────────────────────────────────
    case 'find_large_files': {
      const p = findProject(projects, params?.project as string);
      if (!p) return { error: `Project '${params?.project}' not found.` };
      const topN = (params?.topN as number) || 20;
      const files = await findLargeFiles(p.fullPath, topN);
      return {
        project: p.name,
        topFiles: files.map(f => ({ path: f.path, sizeKb: Math.round(f.size / 1024) })),
      };
    }

    // ── scan_imports ────────────────────────────────────────────
    case 'scan_imports': {
      const p = findProject(projects, params?.project as string);
      if (!p) return { error: `Project '${params?.project}' not found.` };
      const imports = new Set<string>();
      const srcFiles = await walkSource(p.fullPath);
      for (const file of srcFiles) {
        for (const imp of await extractImports(file)) imports.add(imp);
      }
      return {
        project: p.name,
        filesScanned: srcFiles.length,
        uniqueImports: imports.size,
        imports: [...imports].sort(),
      };
    }

    // ── rg_search ───────────────────────────────────────────────
    case 'rg_search': {
      const target = params?.project as string;
      const pattern = params?.pattern as string;
      const maxResults = (params?.maxResults as number) || 50;
      if (!pattern) return { error: 'pattern is required' };

      if (target === 'all') {
        const results = await rgSearchAll(projects, pattern, maxResults);
        return { scope: 'all', pattern, projectCount: results.length, results };
      }

      const p = findProject(projects, target);
      if (!p) return { error: `Project '${target}' not found.` };
      const results = rgSearch(p.fullPath, pattern, maxResults);
      return {
        project: p.name,
        pattern,
        matchCount: results.length,
        results: results.slice(0, maxResults),
      };
    }

    // ── check_lockfiles ─────────────────────────────────────────
    case 'check_lockfiles': {
      const entries: { project: string; exists: boolean; inSync: boolean; sizeKb: number }[] = [];
      const rootLock = checkLockfile(ROOT);
      entries.push({
        project: '(root)',
        exists: rootLock.exists,
        inSync: rootLock.inSync,
        sizeKb: Math.round(rootLock.size / 1024),
      });
      for (const p of projects) {
        const lf = checkLockfile(p.fullPath);
        entries.push({
          project: p.name,
          exists: lf.exists,
          inSync: lf.inSync,
          sizeKb: Math.round(lf.size / 1024),
        });
      }
      const missing = entries.filter(e => !e.exists).map(e => e.project);
      const outOfSync = entries.filter(e => e.exists && !e.inSync).map(e => e.project);
      return {
        entries,
        missingCount: missing.length,
        outOfSyncCount: outOfSync.length,
        missing,
        outOfSync,
      };
    }

    // ── find_bloat ──────────────────────────────────────────────
    case 'find_bloat': {
      const target = params?.project as string;
      if (target === 'root') {
        const bloat = await findBloat(ROOT);
        return {
          project: '(root)',
          nodeModulesKb: bloat.nodeModulesKb,
          nodeModulesHuman: `${(bloat.nodeModulesKb / 1024).toFixed(0)} MB`,
          sourceFiles: bloat.totalSourceFiles,
          sourceKb: bloat.totalSourceKb,
          lockfile: bloat.lockfile,
          topLargeFiles: bloat.largeFiles.slice(0, 10),
        };
      }
      const p = findProject(projects, target);
      if (!p) return { error: `Project '${target}' not found.` };
      const bloat = await findBloat(p.fullPath);
      return {
        project: p.name,
        nodeModulesKb: bloat.nodeModulesKb,
        nodeModulesHuman:
          bloat.nodeModulesKb > 1024
            ? `${(bloat.nodeModulesKb / 1024).toFixed(0)} MB`
            : `${bloat.nodeModulesKb} KB`,
        sourceFiles: bloat.totalSourceFiles,
        sourceKb: bloat.totalSourceKb,
        lockfile: bloat.lockfile,
        topLargeFiles: bloat.largeFiles.slice(0, 10),
      };
    }

    // ── analyze_workspace ───────────────────────────────────────
    case 'analyze_workspace': {
      const ws = await analyzeWorkspace();
      const rootBloat = await findBloat(ROOT);
      return {
        workspaceGlobs: ws.packages,
        rootDependencyCount: ws.rootDeps,
        rootNodeModulesKb: rootBloat.nodeModulesKb,
        rootNodeModulesHuman: `${(rootBloat.nodeModulesKb / 1024).toFixed(0)} MB`,
        lockfileInSync: rootBloat.lockfile.inSync,
      };
    }

    // ── bun_version ─────────────────────────────────────────────
    case 'bun_version': {
      const expected = params?.expected as string | undefined;
      const result: any = { bun: BUN_VERSION, server: SERVER_VERSION };
      if (expected) {
        result.expected = expected;
        result.match = BUN_VERSION === expected;
        if (BUN_VERSION !== expected)
          result.warning = `Running Bun ${BUN_VERSION}, expected ${expected}`;
      }
      result.wave9 = {
        webview: typeof Bun.WebView !== 'undefined',
        cron: typeof Bun.cron !== 'undefined',
        urlPattern: typeof URLPattern !== 'undefined',
        markdown: typeof Bun.markdown?.ansi === 'function',
        nanos: typeof Bun.nanoseconds === 'function',
        hash: typeof Bun.hash?.murmur64v2 === 'function',
        deepEquals: typeof Bun.deepEquals === 'function',
        escapeHTML: typeof Bun.escapeHTML === 'function',
        dispose: typeof Symbol.dispose !== 'undefined',
      };
      return result;
    }

    // ── mcp_status ──────────────────────────────────────────────
    case 'mcp_status': {
      const mcpPaths = [
        join(ROOT, '.cursor', 'mcp.json'),
        join(ROOT, '.mcp.json'),
        join(ROOT, '.vscode', 'mcp.json'),
      ].filter(p => fileExistsSync(p));
      if (!mcpPaths.length) return { error: 'No MCP config found (.cursor/mcp.json or .mcp.json)' };
      try {
        const configs = await Promise.all(
          mcpPaths.map(async path => ({
            file: path.startsWith(ROOT) ? path.slice(ROOT.length + 1) : path,
            cfg: (await Bun.file(path).json()) as { mcpServers?: Record<string, any> },
          }))
        );
        const primary =
          configs.find(c => c.file === '.cursor/mcp.json') ??
          configs.find(c => c.file === '.mcp.json') ??
          configs[0];
        const catalog = (primary.cfg as { _meta?: { serverCatalog?: Record<string, string[]> } })
          ._meta?.serverCatalog;
        const servers = Object.entries(primary.cfg.mcpServers || {}).map(
          ([name, s]: [string, any]) => {
            const scriptArg = s.args?.find((a: string) => a.endsWith('.ts') || a.endsWith('.js'));
            const script = scriptArg?.includes('${workspaceFolder}')
              ? join(
                  ROOT,
                  scriptArg.replace('${workspaceFolder}/', '').replace('${workspaceFolder}', '')
                )
              : scriptArg;
            const envFile = s.envFile?.includes('${workspaceFolder}')
              ? join(
                  ROOT,
                  s.envFile.replace('${workspaceFolder}/', '').replace('${workspaceFolder}', '')
                )
              : s.envFile;
            const tier =
              (catalog &&
                (['essential', 'remote', 'domain', 'optional'] as const).find(t =>
                  catalog[t]?.includes(name)
                )) ||
              null;
            return {
              name,
              tier,
              type: s.type ?? (s.url ? 'remote' : 'stdio'),
              description: s.description ?? null,
              disabled: s.disabled ?? false,
              url: s.url ?? null,
              script: scriptArg || null,
              scriptExists: script ? fileExistsSync(script) : s.url ? true : null,
              envFile: s.envFile ?? null,
              envFileExists: envFile ? fileExistsSync(envFile) : null,
              bunNativeLaunch: Array.isArray(s.args) && !s.args.includes('run'),
            };
          }
        );
        const rootCfg = configs.find(c => c.file === '.mcp.json');
        const cursorCfg = configs.find(c => c.file === '.cursor/mcp.json');
        const sync =
          rootCfg && cursorCfg
            ? {
                compared: [rootCfg.file, cursorCfg.file],
                inSync: Bun.deepEquals(rootCfg.cfg.mcpServers, cursorCfg.cfg.mcpServers),
              }
            : null;
        return {
          file: primary.file,
          configs: configs.map(c => c.file),
          serverCount: servers.length,
          catalog,
          sync,
          servers,
          recommendations: [
            'Prefer bun-native launch: command "bun", args ["${workspaceFolder}/scripts/<server>.ts"] (no run subcommand).',
            'Keep .cursor/mcp.json and .mcp.json mcpServers in sync.',
            'Keep optional servers disabled until their env is configured.',
          ],
        };
      } catch (e: any) {
        return { error: `Failed to read MCP config: ${e.message}` };
      }
    }

    // ── dx_system ───────────────────────────────────────────────
    case 'dx_system': {
      const cacheAge = scanCache ? (Date.now() - scanCache.ts) / 1000 : 0;
      const totalHits = cacheHits + cacheMisses;
      const systemInfo = {
        server: SERVER_VERSION,
        bun: BUN_VERSION,
        scanRoots: SCAN_ROOTS.filter(r => isDirectory(r)).length,
        cache: {
          hits: cacheHits,
          misses: cacheMisses,
          hitRate: totalHits > 0 ? Math.round((cacheHits / totalHits) * 100) : 0,
          ageSec: Math.round(cacheAge),
          ttlSec: SCAN_CACHE_TTL / 1000,
        },
      };
      try {
        const proc = Bun.spawnSync(['df', '-k', '/'], { timeout: 2000 });
        const df = proc.stdout.toString();
        const [, , blocks, used, avail, usePct] = df.trim().split('\n')[1]!.split(/\s+/);
        return {
          ...systemInfo,
          disk: {
            totalKb: parseInt(blocks),
            usedKb: parseInt(used),
            availKb: parseInt(avail),
            usedPct: usePct,
          },
        };
      } catch {
        return systemInfo;
      }
    }

    // ── dx_timing ───────────────────────────────────────────────
    case 'dx_timing': {
      const entries = [...toolTimings.entries()].map(([tool, timings]) => {
        const sorted = [...timings].sort((a, b) => a - b);
        const sum = timings.reduce((a, b) => a + b, 0);
        return {
          tool,
          calls: timings.length,
          totalMs: Math.round(sum * 100) / 100,
          avgMs: Math.round((sum / timings.length) * 100) / 100,
          minMs: Math.round(sorted[0] * 100) / 100,
          maxMs: Math.round(sorted[sorted.length - 1] * 100) / 100,
          p50Ms: Math.round(sorted[Math.floor(sorted.length * 0.5)] * 100) / 100,
          p95Ms: Math.round(sorted[Math.floor(sorted.length * 0.95)] * 100) / 100,
        };
      });
      entries.sort((a, b) => b.totalMs - a.totalMs);
      const age = scanCache ? (Date.now() - scanCache.ts) / 1000 : 0;
      return {
        server: SERVER_VERSION,
        bun: BUN_VERSION,
        totalCalls: entries.reduce((s, e) => s + e.calls, 0),
        cache: { hits: cacheHits, misses: cacheMisses, ageSec: Math.round(age) },
        tools: entries,
      };
    }

    // ── dx_oneliner ─────────────────────────────────────────────
    case 'dx_oneliner': {
      const topic = (params?.topic as string) || '--list';
      const R: Record<string, { description: string; code: string }> = {
        'bun-webview': {
          description: 'Headless browser — navigate, evaluate (webkit, no console arg)',
          code: [
            `bun -e "`,
            `await using v = new Bun.WebView({ width: 800, height: 600, backend: 'webkit' });`,
            `await v.navigate('https://example.com');`,
            `while (v.loading) await Bun.sleep(50);`,
            `console.log('Title:', await v.evaluate('document.title'));`,
            `"`,
          ].join('\n'),
        },
        'bun-cron': {
          description: 'In-process scheduler (5-field syntax, no seconds)',
          code: [
            `bun -e "`,
            `using job = Bun.cron('* * * * *', () => console.log('tick', new Date().toISOString()));`,
            `console.log('Waiting 65s for next minute boundary...');`,
            `await Bun.sleep(65000);`,
            `"`,
          ].join('\n'),
        },
        urlpattern: {
          description: 'URLPattern routing — 2× faster with zero GC per call',
          code: [
            `bun -e "`,
            `const p = new URLPattern({ pathname: '/api/users/:id/posts/:postId' });`,
            `console.log('test:', p.test('https://example.com/api/users/42/posts/123'));`,
            `const m = p.exec('https://example.com/api/users/42/posts/123');`,
            `console.log('user:', m?.pathname.groups.id, '| post:', m?.pathname.groups.postId);`,
            `const t0 = performance.now();`,
            `for (let i = 0; i < 1e6; i++) p.test({ pathname: '/api/users/' + i + '/posts/' + i });`,
            `console.log('1M tests:', (performance.now() - t0).toFixed(1), 'ms');`,
            `"`,
          ].join('\n'),
        },
        'bun-markdown': {
          description: 'Render markdown to ANSI (hyperlinks on/off)',
          code: [
            `bun -e "`,
            `const withHL = Bun.markdown.ansi('[Bun](https://bun.sh)', { hyperlinks: true });`,
            `const withoutHL = Bun.markdown.ansi('[Bun](https://bun.sh)', { hyperlinks: false });`,
            `console.log('With hyperlink:', withHL.includes('\\\\x1b]8'));`,
            `console.log('Without hyperlink:', !withoutHL.includes('\\\\x1b]8'));`,
            `"`,
          ].join('\n'),
        },
        'symbol-dispose': {
          description: 'Symbol.dispose / using — automatic cleanup',
          code: [
            `bun -e "`,
            `class R { [Symbol.dispose]() { console.log('cleaned up'); } }`,
            `{ using x = new R(); console.log('inside'); }`,
            `console.log('outside');`,
            `"`,
          ].join('\n'),
        },
        'bun-nanoseconds': {
          description: 'Nanosecond-precision loop timing',
          code: [
            `bun -e "`,
            `const t0 = Bun.nanoseconds();`,
            `let s = 0; for (let i = 0; i < 1_000_000; i++) s += i;`,
            `console.log('Sum:', s, '|', ((Number(Bun.nanoseconds() - t0) / 1_000_000).toFixed(3)), 'ms');`,
            `"`,
          ].join('\n'),
        },
        'bun-hash': {
          description: 'Bun.hash.murmur64v2 — 64-bit consistent hashing',
          code: [
            `bun -e "`,
            `const h = Bun.hash.murmur64v2('partnerABC');`,
            `console.log('Hash:', h.toString(16), '| Worker:', Number(h % 4n));`,
            `"`,
          ].join('\n'),
        },
        'bun-deepequals': {
          description: 'Structural equality — objects, Set, Map',
          code: [
            `bun -e "`,
            `const a = { ok: true, items: new Set([1,2,3]), meta: new Map([['k','v']]) };`,
            `const b = { ok: true, items: new Set([1,2,3]), meta: new Map([['k','v']]) };`,
            `const c = { ok: true, items: new Set([1,2,4]), meta: new Map([['k','v']]) };`,
            `console.log('equal:', Bun.deepEquals(a, b), '| diff:', Bun.deepEquals(a, c));`,
            `"`,
          ].join('\n'),
        },
        'bun-file': {
          description: 'Zero-copy Bun.file / Bun.write roundtrip',
          code: [
            `bun -e "`,
            `await Bun.write('/tmp/bun-test.txt', 'Hello from Bun');`,
            `const f = Bun.file('/tmp/bun-test.txt');`,
            `console.log(await f.text(), '|', (await f.stat()).size, 'bytes');`,
            `"`,
          ].join('\n'),
        },
        'bun-escapehtml': {
          description: 'XSS-safe HTML escaping',
          code: [
            `bun -e "`,
            `const clean = Bun.escapeHTML('<script>alert(1)</script>');`,
            `console.log('Clean:', clean);`,
            `"`,
          ].join('\n'),
        },
        'bun-image': {
          description: 'Bun.Image — resize PNG, convert to JPEG/webp',
          code: [
            `bun -e "`,
            `const buf = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64');`,
            `const jpg = await new Bun.Image(buf).resize(2, 2).jpeg({ quality: 80 }).bytes();`,
            `const webp = await new Bun.Image(buf).resize(2, 2).webp({ quality: 80 }).bytes();`,
            `console.log('JPEG:', jpg.length, 'bytes | WebP:', webp.length, 'bytes');`,
            `"`,
          ].join('\n'),
        },
        'bun-glob': {
          description: 'Bun.Glob.scan() with boundary — up to 2× faster (avoids double-read)',
          code: [
            `bun -e "`,
            `const g = new Bun.Glob('**/node_modules/**/*.js');`,
            `let n = 0;`,
            `for await (const path of g.scan('.')) n++;`,
            `console.log('node_modules .js files:', n);`,
            `"`,
          ].join('\n'),
        },
        'bun-serve': {
          description: 'Basic HTTP server',
          code: [
            `bun -e "`,
            `Bun.serve({ port: 3000, fetch: req => new Response('Bun ' + Bun.version) });`,
            `console.log('http://localhost:3000');`,
            `"`,
          ].join('\n'),
        },
        'bun-sqlite': {
          description: 'bun:sqlite — in-memory DB',
          code: [
            `bun -e "`,
            `import { Database } from 'bun:sqlite';`,
            `const db = new Database(':memory:');`,
            `db.run('CREATE TABLE t (a, b)');`,
            `db.run('INSERT INTO t VALUES (?, ?)', 'hello', 42);`,
            `console.log(db.query('SELECT * FROM t').all());`,
            `"`,
          ].join('\n'),
        },
        'bun-strip-ansi': {
          description: 'SIMD-accelerated ANSI strip and string width',
          code: [
            `bun -e "`,
            `console.log('Stripped:', Bun.stripANSI('\\\\x1b[31mhello\\\\x1b[0m'));`,
            `console.log('Width of 👋:', Bun.stringWidth('👋'));`,
            `"`,
          ].join('\n'),
        },
        'fetch-http2': {
          description: 'fetch() with HTTP/2 protocol',
          code: `bun -e "const r=await fetch('https://http2.golang.org/reqinfo',{protocol:'http2'});console.log(r.status)"`,
        },
        'fetch-http3': {
          description: 'fetch() with HTTP/3 (experimental, needs --experimental-http3-fetch)',
          code: `bun --experimental-http3-fetch -e "const r=await fetch('https://cloudflare-quic.com',{protocol:'http3'});console.log('status:', r.status)"`,
        },
        'proxy-keepalive': {
          description: 'HTTPS proxy CONNECT tunnel reuse — 3 fetches share 1 tunnel',
          code: [
            `bun -e "`,
            `for (let i = 0; i < 3; i++) {`,
            `  const res = await fetch('https://example.com/api', {`,
            `    proxy: 'http://user:pass@proxy.example.com:8080',`,
            `  });`,
            `  console.log(res.status);`,
            `}`,
            `"`,
          ].join('\n'),
        },
        'http3-server': {
          description: 'HTTP/3 server with TLS (self-signed cert)',
          code: [
            `openssl req -x509 -newkey rsa:2048 -keyout /tmp/h3-key.pem -out /tmp/h3-cert.pem -days 1 -nodes -subj '/CN=localhost' && \\`,
            `bun -e "`,
            `const [cert, key] = await Promise.all([Bun.file('/tmp/h3-cert.pem').text(), Bun.file('/tmp/h3-key.pem').text()]);`,
            `const s = Bun.serve({ port: 8443, tls: { cert, key }, http3: true, fetch: () => new Response('h3') });`,
            `console.log('H3 on', s.url);`,
            `await Bun.sleep(5000);`,
            `s.stop();`,
            `"`,
          ].join('\n'),
        },
        websocket: {
          description: 'WebSocket echo server',
          code: [
            `bun -e "`,
            `Bun.serve({`,
            `  port: 3001,`,
            `  fetch: req => new Response(null, { status: 426 }),`,
            `  websocket: { message: (ws, msg) => ws.send('echo: ' + msg) },`,
            `});`,
            `console.log('ws://localhost:3001');`,
            `await Bun.sleep(1e9);`,
            `"`,
          ].join('\n'),
        },
        'tls-memory': {
          description: 'SSL_CTX sharing — RSS stability across 100 TLS connects',
          code: [
            `bun -e "`,
            `const start = process.memoryUsage.rss();`,
            `for (let i = 0; i < 100; i++) await Bun.connect({ hostname: 'example.com', port: 443, tls: true }).then(s => s.end());`,
            `const diff = ((process.memoryUsage.rss() - start) / 1024 / 1024).toFixed(2);`,
            `console.log('RSS change:', diff, 'MB (expect < 10 MB)');`,
            `"`,
          ].join('\n'),
        },
        'process-execve': {
          description: 'process.execve() — in-place process replacement',
          code: `bun -e "console.log('execve:', typeof process.execve === 'function')"`,
        },
        'no-orphans': {
          description: '--no-orphans flag recognized',
          code: `bun --no-orphans -e "console.log('no-orphans:', process.env.BUN_FEATURE_FLAG_NO_ORPHANS || 'active')"`,
        },
        'hardware-concurrency': {
          description: 'Cgroup-aware navigator.hardwareConcurrency',
          code: `bun -e "console.log('parallelism:', navigator.hardwareConcurrency)"`,
        },
        'fs-watch': {
          description: 'fs.watch recursive file watching',
          code: [
            `bun -e "`,
            `import fs from 'node:fs';`,
            `fs.watch('.', { recursive: true }, (e, f) => console.log(e, f));`,
            `setTimeout(() => Bun.write('watch-test.txt', 'x'), 500);`,
            `setTimeout(() => process.exit(0), 1500);`,
            `"`,
          ].join('\n'),
        },
        version: {
          description: 'Wave 9 feature detection — all primitives',
          code: [
            `bun -e "`,
            `console.log('Bun', Bun.version);`,
            `const f = {`,
            `  webview: typeof Bun.WebView !== 'undefined',`,
            `  cron: typeof Bun.cron !== 'undefined',`,
            `  urlpattern: typeof URLPattern !== 'undefined',`,
            `  markdown: typeof Bun.markdown?.ansi === 'function',`,
            `  nanos: typeof Bun.nanoseconds === 'function',`,
            `  hash: typeof Bun.hash?.murmur64v2 === 'function',`,
            `  deepequals: typeof Bun.deepEquals === 'function',`,
            `  escapehtml: typeof Bun.escapeHTML === 'function',`,
            `  image: typeof Bun.Image === 'function',`,
            `  glob: typeof Bun.Glob === 'function',`,
            `  stripansi: typeof Bun.stripANSI === 'function',`,
            `  stringwidth: typeof Bun.stringWidth === 'function',`,
            `  dispose: typeof Symbol.dispose !== 'undefined',`,
            `  sqlite: typeof Bun?.sqlite !== 'undefined' || true,`,
            `  execve: typeof process.execve === 'function',`,
            `};`,
            `Object.entries(f).forEach(([k, v]) => console.log(' ', k, v ? 'OK' : 'MISSING'));`,
            `"`,
          ].join('\n'),
        },
        validate: {
          description: 'All 10 Wave 9 primitives in sequence',
          code: [
            `bun -e "console.log('Bun:', Bun.version)" && \\`,
            `bun -e "await using v=new Bun.WebView({width:400,height:300,backend:'webkit'});await v.navigate('about:blank');console.log('WebView OK')" && \\`,
            `bun -e "using j=Bun.cron('* * * * *',()=>{});console.log('Cron OK')" && \\`,
            `bun -e "const p=new URLPattern({pathname:'/:id'});console.log('URL OK:',p.exec({pathname:'/123'})?.pathname.groups.id)" && \\`,
            `bun -e "console.log('Markdown OK:',Bun.markdown.ansi('# Test').includes('Test'))" && \\`,
            `bun -e "class R{[Symbol.dispose](){console.log('OK')}}{using r=new R()}" && \\`,
            `bun -e "const t0=Bun.nanoseconds();Bun.sleep(1);console.log('Nano OK:',Number(Bun.nanoseconds()-t0)>0)" && \\`,
            `bun -e "console.log('Hash OK:',Bun.hash.murmur64v2('t').toString(16))" && \\`,
            `bun -e "console.log('DeepEq OK:',Bun.deepEquals({a:1},{a:1}))" && \\`,
            `bun -e "console.log('Escape OK:',Bun.escapeHTML('<').includes('&lt;'))"`,
          ].join('\n'),
        },
        'validate-ext': {
          description:
            'Extended: image, execve, deep Set/Map, URLPattern query, markdown no-hyperlink',
          code: [
            `bun -e "const buf=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==','base64');console.log('Image OK:',(await new Bun.Image(buf).resize(1).jpeg().bytes()).length > 0)" && \\`,
            `bun -e "console.log('execve:', typeof process.execve === 'function')" && \\`,
            `bun -e "console.log('Map/Set:', Bun.deepEquals({a:new Map([['k','v']])},{a:new Map([['k','v']])}))" && \\`,
            `bun -e "const p=new URLPattern({search:'id=:id'});console.log('Query:',p.exec({search:'id=123'})?.search.groups.id)" && \\`,
            `bun -e "console.log('NoHL:',!Bun.markdown.ansi('[x](url)',{hyperlinks:false}).includes('\\\\x1b]8'))"`,
          ].join('\n'),
        },
      };
      if (topic === '--list' || !R[topic]) {
        const entries = Object.entries(R).map(([k, v]) => ({
          topic: k,
          description: v.description,
        }));
        entries.sort((a, b) => a.topic.localeCompare(b.topic));
        return { topics: entries, count: entries.length };
      }
      return { topic, description: R[topic].description, code: R[topic].code };
    }

    case 'dx_catalog': {
      const query = (params?.query as string | undefined)?.trim();
      const limit = Math.min(Number(params?.limit ?? 5) || 5, 20);
      if (!query) {
        return {
          total: BUN_DX_CATALOG.length,
          entries: BUN_DX_CATALOG.map(e => ({
            id: e.id,
            summary: e.summary,
            severity: e.severity,
            docs: e.docs,
          })),
        };
      }
      const exact = BUN_DX_CATALOG.find(e => e.id === query);
      if (exact) {
        return { match: 'id', entry: exact };
      }
      const results = searchCatalog(query).slice(0, limit);
      return { match: 'search', query, count: results.length, entries: results };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ── MCP Stdio Loop ─────────────────────────────────────────────
async function main() {
  console.error(
    `[dx-mcp] v${SERVER_VERSION} bun=${BUN_VERSION} transport=${Bun.env.DX_MCP_NDJSON === '1' ? 'ndjson' : 'content-length'}`
  );

  const cleanup = { [Symbol.dispose]: () => toolTimings.clear() };
  using _cleanup = cleanup;

  getProjects().then(() => {
    setInterval(async () => {
      scanCache = null;
      await getProjects();
    }, SCAN_CACHE_TTL);
  });

  for await (const req of readJsonRpcStream(Bun.stdin.stream())) {
    const { id, method, params } = req;

    if (method?.startsWith('notifications/')) continue;

    if (id === undefined) continue;

    try {
      switch (method) {
        case 'initialize':
          writeJsonRpc(
            rpcOk(id, {
              protocolVersion: '2024-11-05',
              capabilities: { tools: {} },
              serverInfo: { name: 'dx-mcp', version: SERVER_VERSION, bunVersion: BUN_VERSION },
            })
          );
          break;
        case 'tools/list':
        case 'listTools':
          writeJsonRpc(rpcOk(id, toolsList()));
          break;
        case 'tools/call':
        case 'callTool': {
          const toolName = (params?.name as string) || '';
          const toolArgs = (params?.arguments as Record<string, unknown> | undefined) ?? {};
          const toolResult = await toolsCall(toolName, toolArgs);
          writeJsonRpc(rpcOk(id, toolResult));
          break;
        }
        case 'resources/list':
          writeJsonRpc(rpcOk(id, { resources: [] }));
          break;
        case 'prompts/list':
          writeJsonRpc(rpcOk(id, { prompts: [] }));
          break;
        default:
          writeJsonRpc(rpcErr(id, -32601, `Unknown method: ${method}`));
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      writeJsonRpc(rpcErr(id, -32603, message));
    }
  }
}

if (import.meta.main) {
  main().catch(err => {
    console.error('dx-mcp fatal:', err);
    process.exit(1);
  });
}

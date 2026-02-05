/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  PROJECTS.TS - Unified Project Control Center                            ║
 * ║  Single point of entry for all workspace operations                      ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

// ┌──────────────────────────────────────────────────────────────────────────┐
// │  ANSI Styling                                                            │
// └──────────────────────────────────────────────────────────────────────────┘

const style = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  italic: "\x1b[3m",
  underline: "\x1b[4m",

  // Foreground
  black: "\x1b[30m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",

  // Bright
  brightRed: "\x1b[91m",
  brightGreen: "\x1b[92m",
  brightYellow: "\x1b[93m",
  brightBlue: "\x1b[94m",
  brightMagenta: "\x1b[95m",
  brightCyan: "\x1b[96m",

  // Background
  bgBlack: "\x1b[40m",
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgBlue: "\x1b[44m",
} as const;

const fmt = {
  title: (s: string) => `${style.bold}${style.brightCyan}${s}${style.reset}`,
  subtitle: (s: string) => `${style.bold}${style.white}${s}${style.reset}`,
  success: (s: string) => `${style.brightGreen}${s}${style.reset}`,
  error: (s: string) => `${style.brightRed}${s}${style.reset}`,
  warn: (s: string) => `${style.brightYellow}${s}${style.reset}`,
  info: (s: string) => `${style.brightBlue}${s}${style.reset}`,
  muted: (s: string) => `${style.gray}${s}${style.reset}`,
  accent: (s: string) => `${style.brightMagenta}${s}${style.reset}`,
  highlight: (s: string) => `${style.bold}${style.yellow}${s}${style.reset}`,
  code: (s: string) => `${style.cyan}${s}${style.reset}`,
};

// ┌──────────────────────────────────────────────────────────────────────────┐
// │  Visual Components                                                       │
// └──────────────────────────────────────────────────────────────────────────┘

const bar = {
  full: "█",
  high: "▓",
  med: "▒",
  low: "░",
  empty: "·",
};

function healthBar(value: number, max: number, width = 20): string {
  const pct = Math.min(value / max, 1);
  const filled = Math.round(pct * width);
  const empty = width - filled;

  const color = pct >= 0.7 ? style.brightGreen : pct >= 0.4 ? style.brightYellow : style.brightRed;

  return `${color}${bar.full.repeat(filled)}${style.gray}${bar.empty.repeat(empty)}${style.reset}`;
}

function sparkline(values: number[]): string {
  const chars = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];
  const max = Math.max(...values, 1);
  return values.map((v) => chars[Math.min(Math.floor((v / max) * 7), 7)]).join("");
}

function statusBadge(status: "ok" | "warn" | "error" | "info"): string {
  const badges = {
    ok: `${style.bgGreen}${style.black} OK ${style.reset}`,
    warn: `${style.bgYellow}${style.black} !! ${style.reset}`,
    error: `${style.bgRed}${style.white} ERR ${style.reset}`,
    info: `${style.bgBlue}${style.white} i ${style.reset}`,
  };
  return badges[status];
}

function divider(char = "─", width = 70): string {
  return style.gray + char.repeat(width) + style.reset;
}

function header(title: string, icon = "◆"): string {
  const line = "─".repeat(Math.max(0, 68 - title.length));
  return `\n${style.brightCyan}${icon}${style.reset} ${fmt.title(title)} ${style.gray}${line}${style.reset}\n`;
}

// ┌──────────────────────────────────────────────────────────────────────────┐
// │  Workspace Configuration                                                 │
// └──────────────────────────────────────────────────────────────────────────┘

const WORKSPACE_ROOT = "/Users/nolarose/Projects" as const;

export const workspace = {
  root: WORKSPACE_ROOT,

  // ─── API & Infrastructure ─────────────────────────────────────────────
  apiPlive: `${WORKSPACE_ROOT}/api-plive-setup-discovery`,
  registryMcp: `${WORKSPACE_ROOT}/registry-powered-mcp`,
  conciseAgents: `${WORKSPACE_ROOT}/concise-mcp-agents`,

  // ─── Trading & Analytics ──────────────────────────────────────────────
  traderAnalyzer: `${WORKSPACE_ROOT}/trader-analyzer`,
  traderBun: `${WORKSPACE_ROOT}/trader-analyzer-bun`,

  // ─── Dashboards & UI ──────────────────────────────────────────────────
  dashboard: `${WORKSPACE_ROOT}/enterprise-dashboard`,
  geelark: `${WORKSPACE_ROOT}/geelark`,

  // ─── Bots & Automation ────────────────────────────────────────────────
  kalPoly: `${WORKSPACE_ROOT}/kal-poly-bot`,
  foxyProxy: `${WORKSPACE_ROOT}/foxy-proxy`,

  // ─── Full Stack & Core ────────────────────────────────────────────────
  fullStack: `${WORKSPACE_ROOT}/full-stack-bun.io`,
  newDem: `${WORKSPACE_ROOT}/new-dem`,
  zigSelf: `${WORKSPACE_ROOT}/zig-self-bun`,

  // ─── Utilities & Config ───────────────────────────────────────────────
  skills: `${WORKSPACE_ROOT}/skills`,
  providers: `${WORKSPACE_ROOT}/providers`,
  testing: `${WORKSPACE_ROOT}/testing`,
  working: `${WORKSPACE_ROOT}/working`,
  r2: `${WORKSPACE_ROOT}/r2`,
} as const;

// Canonical name mapping (kebab-case -> camelCase)
export const projects = {
  "api-plive-setup-discovery": workspace.apiPlive,
  "registry-powered-mcp": workspace.registryMcp,
  "concise-mcp-agents": workspace.conciseAgents,
  "trader-analyzer": workspace.traderAnalyzer,
  "trader-analyzer-bun": workspace.traderBun,
  "enterprise-dashboard": workspace.dashboard,
  geelark: workspace.geelark,
  "kal-poly-bot": workspace.kalPoly,
  "foxy-proxy": workspace.foxyProxy,
  "full-stack-bun.io": workspace.fullStack,
  "new-dem": workspace.newDem,
  "zig-self-bun": workspace.zigSelf,
  skills: workspace.skills,
  providers: workspace.providers,
  testing: workspace.testing,
  working: workspace.working,
  r2: workspace.r2,
} as const;

// Short alias for quick access
export const w = workspace;
export const p = projects;

// ┌──────────────────────────────────────────────────────────────────────────┐
// │  Type Definitions                                                        │
// └──────────────────────────────────────────────────────────────────────────┘

export type ProjectSlug = keyof typeof projects;
export type ProjectPath = (typeof projects)[ProjectSlug];
export type WorkspaceKey = keyof typeof workspace;
export type ProjectRef = ProjectSlug | ProjectPath;

export interface ExecutionOptions {
  args?: string[];
  env?: Record<string, string>;
  silent?: boolean;
  timeout?: number;
}

export interface ExecutionResult {
  code: number;
  stdout: string;
  stderr: string;
  ok: boolean;
  ms: number;
}

export interface ScriptDescriptor {
  name: string;
  pattern: string;
  category: CategoryKey;
  project: ProjectSlug;
}

export interface ProjectStats {
  slug: ProjectSlug;
  scriptCount: number;
  byCategory: Record<CategoryKey, number>;
  topPatterns: Array<{ pattern: string; count: number }>;
  health: number; // 0-100
}

export interface WorkspaceStats {
  projectCount: number;
  scriptCount: number;
  avgScriptsPerProject: number;
  byCategory: Record<CategoryKey, { count: number; percent: number }>;
  topPatterns: Array<{ pattern: string; count: number; projects: ProjectSlug[] }>;
  ranking: Array<{ slug: ProjectSlug; scripts: number; health: number }>;
}

// ┌──────────────────────────────────────────────────────────────────────────┐
// │  Script Categories                                                       │
// └──────────────────────────────────────────────────────────────────────────┘

export const CATEGORIES = {
  dev: {
    icon: "🚀",
    label: "Development",
    color: style.brightGreen,
    match: ["dev", "dev:*", "start", "serve"],
  },
  build: {
    icon: "📦",
    label: "Build",
    color: style.brightYellow,
    match: ["build", "build:*", "compile", "bundle"],
  },
  test: {
    icon: "🧪",
    label: "Test",
    color: style.brightCyan,
    match: ["test", "test:*", "spec", "e2e"],
  },
  lint: {
    icon: "✨",
    label: "Lint",
    color: style.brightMagenta,
    match: ["lint", "lint:*", "format", "check", "typecheck"],
  },
  bench: {
    icon: "⚡",
    label: "Benchmark",
    color: style.yellow,
    match: ["bench", "bench:*", "benchmark", "perf"],
  },
  deploy: {
    icon: "🚢",
    label: "Deploy",
    color: style.brightBlue,
    match: ["deploy", "deploy:*", "release", "publish"],
  },
  docker: {
    icon: "🐳",
    label: "Docker",
    color: style.blue,
    match: ["docker", "docker:*", "container"],
  },
  database: {
    icon: "🗄️",
    label: "Database",
    color: style.magenta,
    match: ["db", "db:*", "migrate", "seed", "sql"],
  },
  docs: {
    icon: "📚",
    label: "Docs",
    color: style.cyan,
    match: ["docs", "docs:*", "readme"],
  },
  ci: {
    icon: "🔄",
    label: "CI/CD",
    color: style.brightYellow,
    match: ["ci", "ci:*", "pipeline", "workflow"],
  },
  security: {
    icon: "🔐",
    label: "Security",
    color: style.red,
    match: ["security", "security:*", "audit", "scan", "secrets"],
  },
  mcp: {
    icon: "🤖",
    label: "MCP",
    color: style.brightMagenta,
    match: ["mcp", "mcp:*", "agent", "agents"],
  },
  registry: {
    icon: "📋",
    label: "Registry",
    color: style.brightCyan,
    match: ["registry", "registry:*"],
  },
  dashboard: {
    icon: "📊",
    label: "Dashboard",
    color: style.brightGreen,
    match: ["dashboard", "dashboard:*", "dash"],
  },
  etl: {
    icon: "🔀",
    label: "ETL",
    color: style.yellow,
    match: ["etl", "etl:*", "pipe", "datapipe", "dataview"],
  },
  telegram: {
    icon: "📱",
    label: "Telegram",
    color: style.blue,
    match: ["telegram", "telegram:*"],
  },
  worker: {
    icon: "⚙️",
    label: "Worker",
    color: style.gray,
    match: ["worker", "worker:*", "workers"],
  },
  git: {
    icon: "📝",
    label: "Git",
    color: style.brightRed,
    match: ["git", "branch", "commit", "pr"],
  },
  clean: {
    icon: "🧹",
    label: "Clean",
    color: style.gray,
    match: ["clean", "clean:*", "purge", "reset"],
  },
  config: {
    icon: "⚙️",
    label: "Config",
    color: style.cyan,
    match: ["config", "config:*", "setup", "init"],
  },
  monitor: {
    icon: "👁️",
    label: "Monitor",
    color: style.brightYellow,
    match: ["monitor", "health", "status", "watch"],
  },
  api: {
    icon: "🌐",
    label: "API",
    color: style.brightBlue,
    match: ["api", "api:*", "server"],
  },
  other: {
    icon: "📁",
    label: "Other",
    color: style.gray,
    match: [],
  },
} as const;

export type CategoryKey = keyof typeof CATEGORIES;

// ┌──────────────────────────────────────────────────────────────────────────┐
// │  Core Utilities                                                          │
// └──────────────────────────────────────────────────────────────────────────┘

function resolveProjectPath(ref: ProjectRef): string {
  if (ref.startsWith("/")) return ref;
  return projects[ref as ProjectSlug];
}

function resolveProjectSlug(ref: ProjectRef): ProjectSlug {
  if (ref.startsWith("/")) {
    const entry = Object.entries(projects).find(([, path]) => path === ref);
    return (entry?.[0] as ProjectSlug) ?? ("unknown" as ProjectSlug);
  }
  return ref as ProjectSlug;
}

export function toPattern(script: string): string {
  if (!script.includes(":")) return script;
  return `${script.split(":")[0]}:*`;
}

export function toCategory(script: string): CategoryKey {
  const lower = script.toLowerCase();

  for (const [key, def] of Object.entries(CATEGORIES)) {
    if (key === "other") continue;
    for (const pattern of def.match) {
      if (pattern.endsWith("*")) {
        if (lower.startsWith(pattern.slice(0, -1))) return key as CategoryKey;
      } else if (lower === pattern || lower.startsWith(`${pattern}:`)) {
        return key as CategoryKey;
      }
    }
  }
  return "other";
}

export function listProjectSlugs(): ProjectSlug[] {
  return Object.keys(projects) as ProjectSlug[];
}

export function getProjectPath(slug: ProjectSlug): string {
  return projects[slug];
}

// ┌──────────────────────────────────────────────────────────────────────────┐
// │  Script Execution                                                        │
// └──────────────────────────────────────────────────────────────────────────┘

export async function execute(
  ref: ProjectRef,
  script: string,
  opts: ExecutionOptions = {}
): Promise<ExecutionResult> {
  const cwd = resolveProjectPath(ref);
  const { args = [], env = {}, silent = false, timeout } = opts;

  const t0 = performance.now();
  const proc = Bun.spawn(["bun", "run", script, ...args], {
    cwd,
    env: { ...process.env, ...env },
    stdout: silent ? "pipe" : "inherit",
    stderr: silent ? "pipe" : "inherit",
  });

  let timer: Timer | undefined;
  if (timeout) timer = setTimeout(() => proc.kill(), timeout);

  const code = await proc.exited;
  if (timer) clearTimeout(timer);

  const ms = performance.now() - t0;
  const stdout = silent ? await new Response(proc.stdout).text() : "";
  const stderr = silent ? await new Response(proc.stderr).text() : "";

  return { code, stdout, stderr, ok: code === 0, ms };
}

export async function executeSilent(
  ref: ProjectRef,
  script: string,
  opts: Omit<ExecutionOptions, "silent"> = {}
): Promise<ExecutionResult> {
  return execute(ref, script, { ...opts, silent: true });
}

export function executeBackground(
  ref: ProjectRef,
  script: string,
  opts: Omit<ExecutionOptions, "silent"> = {}
): Bun.Subprocess {
  const cwd = resolveProjectPath(ref);
  const { args = [], env = {} } = opts;

  return Bun.spawn(["bun", "run", script, ...args], {
    cwd,
    env: { ...process.env, ...env },
    stdout: "inherit",
    stderr: "inherit",
  });
}

export async function shell(
  ref: ProjectRef,
  command: string | string[],
  opts: ExecutionOptions = {}
): Promise<ExecutionResult> {
  const cwd = resolveProjectPath(ref);
  const { env = {}, silent = false, timeout } = opts;
  const cmd = typeof command === "string" ? command.split(" ") : command;

  const t0 = performance.now();
  const proc = Bun.spawn(cmd, {
    cwd,
    env: { ...process.env, ...env },
    stdout: silent ? "pipe" : "inherit",
    stderr: silent ? "pipe" : "inherit",
  });

  let timer: Timer | undefined;
  if (timeout) timer = setTimeout(() => proc.kill(), timeout);

  const code = await proc.exited;
  if (timer) clearTimeout(timer);

  const ms = performance.now() - t0;
  const stdout = silent ? await new Response(proc.stdout).text() : "";
  const stderr = silent ? await new Response(proc.stderr).text() : "";

  return { code, stdout, stderr, ok: code === 0, ms };
}

// ┌──────────────────────────────────────────────────────────────────────────┐
// │  Script Discovery                                                        │
// └──────────────────────────────────────────────────────────────────────────┘

export async function getScriptNames(ref: ProjectRef): Promise<string[]> {
  const cwd = resolveProjectPath(ref);
  try {
    const pkg = await Bun.file(`${cwd}/package.json`).json();
    return Object.keys(pkg.scripts || {}).sort();
  } catch {
    return [];
  }
}

export async function getScriptDescriptors(ref: ProjectRef): Promise<ScriptDescriptor[]> {
  const slug = resolveProjectSlug(ref);
  const names = await getScriptNames(ref);

  return names.map((name) => ({
    name,
    pattern: toPattern(name),
    category: toCategory(name),
    project: slug,
  }));
}

export async function hasScript(ref: ProjectRef, script: string): Promise<boolean> {
  const names = await getScriptNames(ref);
  return names.includes(script);
}

export async function searchScripts(
  query: string | RegExp
): Promise<Array<{ project: ProjectSlug; script: string }>> {
  const regex = typeof query === "string" ? new RegExp(query, "i") : query;
  const results: Array<{ project: ProjectSlug; script: string }> = [];

  for (const slug of listProjectSlugs()) {
    const names = await getScriptNames(slug);
    for (const script of names) {
      if (regex.test(script)) results.push({ project: slug, script });
    }
  }

  return results;
}

export async function getScriptsByCategory(
  category: CategoryKey
): Promise<Array<{ project: ProjectSlug; script: string }>> {
  const results: Array<{ project: ProjectSlug; script: string }> = [];

  for (const slug of listProjectSlugs()) {
    const descriptors = await getScriptDescriptors(slug);
    for (const d of descriptors) {
      if (d.category === category) results.push({ project: slug, script: d.name });
    }
  }

  return results;
}

// ┌──────────────────────────────────────────────────────────────────────────┐
// │  Batch Operations                                                        │
// └──────────────────────────────────────────────────────────────────────────┘

export async function executeSequence(
  ref: ProjectRef,
  scripts: string[],
  opts: ExecutionOptions = {}
): Promise<{ results: ExecutionResult[]; allOk: boolean }> {
  const results: ExecutionResult[] = [];

  for (const script of scripts) {
    const result = await execute(ref, script, opts);
    results.push(result);
    if (!result.ok) break;
  }

  return { results, allOk: results.every((r) => r.ok) };
}

export async function executeParallel(
  tasks: Array<[ProjectRef, string, ExecutionOptions?]>
): Promise<ExecutionResult[]> {
  return Promise.all(tasks.map(([ref, script, opts]) => execute(ref, script, opts ?? {})));
}

// ┌──────────────────────────────────────────────────────────────────────────┐
// │  Project Handle (Fluent API)                                             │
// └──────────────────────────────────────────────────────────────────────────┘

export function useProject(ref: ProjectRef) {
  const path = resolveProjectPath(ref);
  const slug = resolveProjectSlug(ref);

  return {
    path,
    slug,
    execute: (script: string, opts?: ExecutionOptions) => execute(path, script, opts),
    executeSilent: (script: string, opts?: Omit<ExecutionOptions, "silent">) =>
      executeSilent(path, script, opts),
    executeBackground: (script: string, opts?: Omit<ExecutionOptions, "silent">) =>
      executeBackground(path, script, opts),
    shell: (cmd: string | string[], opts?: ExecutionOptions) => shell(path, cmd, opts),
    scripts: () => getScriptNames(path),
    descriptors: () => getScriptDescriptors(path),
    has: (script: string) => hasScript(path, script),
    stats: () => getProjectStats(slug),
  };
}

// ┌──────────────────────────────────────────────────────────────────────────┐
// │  Statistics & Metrics                                                    │
// └──────────────────────────────────────────────────────────────────────────┘

export async function getProjectStats(slug: ProjectSlug): Promise<ProjectStats> {
  const descriptors = await getScriptDescriptors(slug);

  const byCategory = {} as Record<CategoryKey, number>;
  for (const key of Object.keys(CATEGORIES) as CategoryKey[]) byCategory[key] = 0;

  const patternCounts = new Map<string, number>();

  for (const d of descriptors) {
    byCategory[d.category]++;
    patternCounts.set(d.pattern, (patternCounts.get(d.pattern) || 0) + 1);
  }

  const topPatterns = [...patternCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([pattern, count]) => ({ pattern, count }));

  // Health score based on coverage of essential categories
  const essentialCats: CategoryKey[] = ["dev", "build", "test", "lint"];
  const essentialScore = essentialCats.filter((c) => byCategory[c] > 0).length;
  const health = Math.round((essentialScore / essentialCats.length) * 100);

  return {
    slug,
    scriptCount: descriptors.length,
    byCategory,
    topPatterns,
    health,
  };
}

export async function getWorkspaceStats(): Promise<WorkspaceStats> {
  const allDescriptors: ScriptDescriptor[] = [];
  const ranking: Array<{ slug: ProjectSlug; scripts: number; health: number }> = [];

  for (const slug of listProjectSlugs()) {
    const stats = await getProjectStats(slug);
    const descriptors = await getScriptDescriptors(slug);
    allDescriptors.push(...descriptors);
    ranking.push({ slug, scripts: stats.scriptCount, health: stats.health });
  }

  const byCategory = {} as Record<CategoryKey, { count: number; percent: number }>;
  for (const key of Object.keys(CATEGORIES) as CategoryKey[]) {
    byCategory[key] = { count: 0, percent: 0 };
  }

  const patternMap = new Map<string, { count: number; projects: Set<ProjectSlug> }>();

  for (const d of allDescriptors) {
    byCategory[d.category].count++;
    const entry = patternMap.get(d.pattern) || { count: 0, projects: new Set() };
    entry.count++;
    entry.projects.add(d.project);
    patternMap.set(d.pattern, entry);
  }

  const total = allDescriptors.length;
  for (const key of Object.keys(byCategory) as CategoryKey[]) {
    byCategory[key].percent = total > 0 ? Math.round((byCategory[key].count / total) * 1000) / 10 : 0;
  }

  const topPatterns = [...patternMap.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 25)
    .map(([pattern, data]) => ({
      pattern,
      count: data.count,
      projects: [...data.projects] as ProjectSlug[],
    }));

  return {
    projectCount: listProjectSlugs().length,
    scriptCount: total,
    avgScriptsPerProject: Math.round(total / listProjectSlugs().length),
    byCategory,
    topPatterns,
    ranking: ranking.sort((a, b) => b.scripts - a.scripts),
  };
}

// ┌──────────────────────────────────────────────────────────────────────────┐
// │  File Utilities                                                          │
// └──────────────────────────────────────────────────────────────────────────┘

export interface FileInfo {
  path: string;
  name: string;
  ext: string;
  mime: string;
  size: number;
  sizeHuman: string;
}

export interface FileTypeGroup {
  mime: string;
  ext: string;
  count: number;
  totalSize: number;
  files: string[];
}

export interface ProjectFileStats {
  slug: ProjectSlug;
  totalFiles: number;
  totalSize: number;
  totalSizeHuman: string;
  byType: FileTypeGroup[];
  byExt: Record<string, { count: number; size: number }>;
  largestFiles: FileInfo[];
}

const FILE_TYPE_ICONS: Record<string, string> = {
  "application/javascript": "📜",
  "application/typescript": "📘",
  "text/typescript": "📘",
  "application/json": "📋",
  "text/html": "🌐",
  "text/css": "🎨",
  "text/markdown": "📝",
  "image/png": "🖼️",
  "image/jpeg": "🖼️",
  "image/svg+xml": "🎭",
  "image/webp": "🖼️",
  "application/octet-stream": "📦",
  "text/plain": "📄",
  "application/yaml": "⚙️",
  "application/toml": "⚙️",
};

function getFileIcon(mime: string): string {
  if (mime.startsWith("image/")) return "🖼️";
  if (mime.startsWith("video/")) return "🎬";
  if (mime.startsWith("audio/")) return "🎵";
  if (mime.startsWith("font/")) return "🔤";
  return FILE_TYPE_ICONS[mime] || "📄";
}

function humanSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

/**
 * Get file info without reading contents
 */
export function getFileInfo(path: string): FileInfo {
  const file = Bun.file(path);
  const name = path.split("/").pop() || path;
  const ext = name.includes(".") ? name.split(".").pop() || "" : "";

  return {
    path,
    name,
    ext,
    mime: file.type,
    size: file.size,
    sizeHuman: humanSize(file.size),
  };
}

/**
 * Read file to Uint8Array
 */
export async function readBytes(path: string): Promise<Uint8Array> {
  return Bun.file(path).bytes();
}

/**
 * Read file to string
 */
export async function readText(path: string): Promise<string> {
  return Bun.file(path).text();
}

/**
 * Read and parse JSON file
 */
export async function readJson<T = unknown>(path: string): Promise<T> {
  return Bun.file(path).json();
}

/**
 * Get checksum of file (CRC32)
 */
export async function getChecksum(path: string): Promise<string> {
  const bytes = await Bun.file(path).bytes();
  return Bun.hash.crc32(bytes).toString(16).padStart(8, "0");
}

/**
 * Compare two files by content
 */
export async function filesEqual(pathA: string, pathB: string): Promise<boolean> {
  const [a, b] = await Promise.all([
    Bun.file(pathA).bytes(),
    Bun.file(pathB).bytes(),
  ]);
  return Bun.deepEquals(a, b);
}

/**
 * Scan project directory for files
 */
export async function scanProjectFiles(
  ref: ProjectRef,
  options: { pattern?: string; exclude?: string[] } = {}
): Promise<FileInfo[]> {
  const cwd = resolveProjectPath(ref);
  const { pattern = "**/*", exclude = ["node_modules", ".git", "dist", "build", ".next"] } = options;

  const glob = new Bun.Glob(pattern);
  const files: FileInfo[] = [];

  for await (const path of glob.scan({ cwd, onlyFiles: true })) {
    // Skip excluded directories
    if (exclude.some((ex) => path.startsWith(ex + "/") || path.includes("/" + ex + "/"))) {
      continue;
    }

    const fullPath = `${cwd}/${path}`;
    try {
      const file = Bun.file(fullPath);
      if (file.size > 0) {
        files.push({
          path: fullPath,
          name: path.split("/").pop() || path,
          ext: path.includes(".") ? path.split(".").pop() || "" : "",
          mime: file.type,
          size: file.size,
          sizeHuman: humanSize(file.size),
        });
      }
    } catch {
      // Skip inaccessible files
    }
  }

  return files;
}

/**
 * Get file statistics for a project
 */
export async function getProjectFileStats(
  ref: ProjectRef,
  options?: { pattern?: string; exclude?: string[] }
): Promise<ProjectFileStats> {
  const slug = resolveProjectSlug(ref);
  const files = await scanProjectFiles(ref, options);

  const byMime = new Map<string, FileTypeGroup>();
  const byExt: Record<string, { count: number; size: number }> = {};
  let totalSize = 0;

  for (const f of files) {
    totalSize += f.size;

    // Group by MIME
    const group = byMime.get(f.mime) || {
      mime: f.mime,
      ext: f.ext,
      count: 0,
      totalSize: 0,
      files: [],
    };
    group.count++;
    group.totalSize += f.size;
    if (group.files.length < 5) group.files.push(f.name);
    byMime.set(f.mime, group);

    // Group by extension
    const extKey = f.ext || "(none)";
    byExt[extKey] = byExt[extKey] || { count: 0, size: 0 };
    byExt[extKey].count++;
    byExt[extKey].size += f.size;
  }

  const byType = [...byMime.values()].sort((a, b) => b.count - a.count);
  const largestFiles = [...files].sort((a, b) => b.size - a.size).slice(0, 10);

  return {
    slug,
    totalFiles: files.length,
    totalSize,
    totalSizeHuman: humanSize(totalSize),
    byType,
    byExt,
    largestFiles,
  };
}

// ┌──────────────────────────────────────────────────────────────────────────┐
// │  CLI Interface                                                           │
// └──────────────────────────────────────────────────────────────────────────┘

async function cli() {
  const [cmd, ...args] = process.argv.slice(2);

  // ─── Default: List projects ───────────────────────────────────────────
  if (!cmd || cmd === "ls" || cmd === "list") {
    console.log(header("WORKSPACE PROJECTS", "◈"));

    const stats = await getWorkspaceStats();
    const rows = stats.ranking.map((r, i) => ({
      "#": i + 1,
      Project: r.slug,
      Scripts: r.scripts,
      Health: healthBar(r.health, 100, 10),
      Path: fmt.muted(projects[r.slug].replace(WORKSPACE_ROOT, "~")),
    }));

    console.log(Bun.inspect.table(rows, { colors: true }));
    console.log(
      `\n  ${fmt.muted("Total:")} ${fmt.highlight(String(stats.scriptCount))} scripts across ${fmt.highlight(String(stats.projectCount))} projects\n`
    );
    return;
  }

  // ─── Scripts for a project ────────────────────────────────────────────
  if (cmd === "scripts" && args[0]) {
    const slug = args[0] as ProjectSlug;
    if (!projects[slug]) {
      console.error(fmt.error(`  Unknown project: ${slug}`));
      process.exit(1);
    }

    const descriptors = await getScriptDescriptors(slug);
    const stats = await getProjectStats(slug);

    console.log(header(`${slug.toUpperCase()} SCRIPTS`, "◇"));
    console.log(`  ${fmt.muted("Total:")} ${fmt.highlight(String(descriptors.length))}  ${fmt.muted("Health:")} ${healthBar(stats.health, 100, 15)}\n`);

    const rows = descriptors.map((d, i) => {
      const cat = CATEGORIES[d.category];
      return {
        "#": style.gray + String(i + 1).padStart(3) + style.reset,
        Script: fmt.code(d.name),
        Pattern: fmt.muted(d.pattern),
        Category: `${cat.color}${cat.icon} ${cat.label}${style.reset}`,
      };
    });

    console.log(Bun.inspect.table(rows, { colors: true }));
    return;
  }

  // ─── Metrics ──────────────────────────────────────────────────────────
  if (cmd === "metrics" || cmd === "stats") {
    if (args[0] && projects[args[0] as ProjectSlug]) {
      const slug = args[0] as ProjectSlug;
      const stats = await getProjectStats(slug);

      console.log(header(`${slug.toUpperCase()} METRICS`, "◆"));
      console.log(`  ${fmt.muted("Scripts:")} ${fmt.highlight(String(stats.scriptCount))}  ${fmt.muted("Health:")} ${healthBar(stats.health, 100, 15)}\n`);

      console.log(fmt.subtitle("  Category Distribution:\n"));
      const catRows = Object.entries(stats.byCategory)
        .filter(([, count]) => count > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([key, count]) => {
          const cat = CATEGORIES[key as CategoryKey];
          return {
            Category: `${cat.color}${cat.icon} ${cat.label}${style.reset}`,
            Count: count,
            Bar: healthBar(count, stats.scriptCount, 25),
          };
        });

      console.log(Bun.inspect.table(catRows, { colors: true }));

      console.log(fmt.subtitle("\n  Top Patterns:\n"));
      const patRows = stats.topPatterns.map((p, i) => ({
        "#": i + 1,
        Pattern: fmt.code(p.pattern),
        Count: p.count,
      }));
      console.log(Bun.inspect.table(patRows, { colors: true }));
      return;
    }

    // Global metrics
    const stats = await getWorkspaceStats();

    console.log(header("WORKSPACE METRICS", "◈"));
    console.log(`  ${fmt.muted("Projects:")} ${fmt.highlight(String(stats.projectCount))}`);
    console.log(`  ${fmt.muted("Scripts:")}  ${fmt.highlight(String(stats.scriptCount))}`);
    console.log(`  ${fmt.muted("Average:")}  ${fmt.highlight(String(stats.avgScriptsPerProject))} per project\n`);

    console.log(fmt.subtitle("  Category Distribution:\n"));
    const catRows = Object.entries(stats.byCategory)
      .filter(([, data]) => data.count > 0)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([key, data]) => {
        const cat = CATEGORIES[key as CategoryKey];
        return {
          Category: `${cat.color}${cat.icon} ${cat.label.padEnd(12)}${style.reset}`,
          Count: String(data.count).padStart(4),
          Pct: `${data.percent.toFixed(1)}%`.padStart(6),
          Distribution: healthBar(data.count, stats.scriptCount, 30),
        };
      });
    console.log(Bun.inspect.table(catRows, { colors: true }));

    console.log(fmt.subtitle("\n  Project Ranking:\n"));
    const projRows = stats.ranking.slice(0, 10).map((r, i) => ({
      "#": i + 1,
      Project: r.slug,
      Scripts: r.scripts,
      Health: healthBar(r.health, 100, 10),
      Volume: healthBar(r.scripts, stats.ranking[0].scripts, 20),
    }));
    console.log(Bun.inspect.table(projRows, { colors: true }));

    console.log(fmt.subtitle("\n  Top Patterns:\n"));
    const patRows = stats.topPatterns.slice(0, 15).map((p, i) => ({
      "#": i + 1,
      Pattern: fmt.code(p.pattern.padEnd(15)),
      Count: String(p.count).padStart(4),
      Projects: p.projects.length,
      Spread: sparkline(p.projects.map(() => 1).slice(0, 10)),
    }));
    console.log(Bun.inspect.table(patRows, { colors: true }));
    return;
  }

  // ─── Categories ───────────────────────────────────────────────────────
  if (cmd === "categories" || cmd === "cats") {
    console.log(header("SCRIPT CATEGORIES", "◇"));

    const rows = Object.entries(CATEGORIES).map(([key, def]) => ({
      Key: fmt.code(key),
      Label: `${def.color}${def.icon} ${def.label}${style.reset}`,
      Patterns: fmt.muted(def.match.join(", ") || "(fallback)"),
    }));

    console.log(Bun.inspect.table(rows, { colors: true }));
    return;
  }

  // ─── Scripts by category ──────────────────────────────────────────────
  if (cmd === "category" && args[0]) {
    const catKey = args[0] as CategoryKey;
    if (!CATEGORIES[catKey]) {
      console.error(fmt.error(`  Unknown category: ${catKey}`));
      console.log(fmt.muted(`  Valid: ${Object.keys(CATEGORIES).join(", ")}`));
      process.exit(1);
    }

    const cat = CATEGORIES[catKey];
    const scripts = await getScriptsByCategory(catKey);

    console.log(header(`${cat.icon} ${cat.label.toUpperCase()} SCRIPTS`, "◇"));
    console.log(`  ${fmt.muted("Total:")} ${fmt.highlight(String(scripts.length))}\n`);

    const rows = scripts.map((s, i) => ({
      "#": i + 1,
      Project: s.project,
      Script: fmt.code(s.script),
    }));

    console.log(Bun.inspect.table(rows, { colors: true }));
    return;
  }

  // ─── Find/Search ──────────────────────────────────────────────────────
  if ((cmd === "find" || cmd === "search") && args[0]) {
    const query = args[0];
    const results = await searchScripts(query);

    console.log(header(`SEARCH: "${query}"`, "◇"));
    console.log(`  ${fmt.muted("Found:")} ${fmt.highlight(String(results.length))} matches\n`);

    const rows = results.map((r, i) => ({
      "#": i + 1,
      Project: r.project,
      Script: fmt.code(r.script),
    }));

    console.log(Bun.inspect.table(rows, { colors: true }));
    return;
  }

  // ─── Patterns ─────────────────────────────────────────────────────────
  if (cmd === "patterns") {
    const stats = await getWorkspaceStats();

    console.log(header("SCRIPT PATTERNS", "◇"));
    console.log(`  ${fmt.muted("Unique patterns:")} ${fmt.highlight(String(stats.topPatterns.length))}\n`);

    const rows = stats.topPatterns.map((p, i) => ({
      "#": i + 1,
      Pattern: fmt.code(p.pattern.padEnd(18)),
      Count: String(p.count).padStart(4),
      Projects: p.projects.length,
      Examples: fmt.muted(p.projects.slice(0, 3).join(", ") + (p.projects.length > 3 ? "..." : "")),
    }));

    console.log(Bun.inspect.table(rows, { colors: true }));
    return;
  }

  // ─── Files ──────────────────────────────────────────────────────────────
  if (cmd === "files" && args[0]) {
    const slug = args[0] as ProjectSlug;
    if (!projects[slug]) {
      console.error(fmt.error(`  Unknown project: ${slug}`));
      process.exit(1);
    }

    console.log(header(`${slug.toUpperCase()} FILE ANALYSIS`, "◇"));
    console.log(fmt.muted("  Scanning files...\n"));

    const stats = await getProjectFileStats(slug);

    console.log(`  ${fmt.muted("Total Files:")} ${fmt.highlight(String(stats.totalFiles))}`);
    console.log(`  ${fmt.muted("Total Size:")}  ${fmt.highlight(stats.totalSizeHuman)}\n`);

    // By MIME type
    console.log(fmt.subtitle("  File Types by MIME:\n"));
    const mimeRows = stats.byType.slice(0, 15).map((t, i) => ({
      "#": i + 1,
      Icon: getFileIcon(t.mime),
      Type: fmt.code(t.mime.length > 30 ? t.mime.slice(0, 27) + "..." : t.mime),
      Count: String(t.count).padStart(5),
      Size: humanSize(t.totalSize).padStart(8),
      Bar: healthBar(t.count, stats.totalFiles, 15),
    }));
    console.log(Bun.inspect.table(mimeRows, { colors: true }));

    // By extension
    console.log(fmt.subtitle("\n  File Types by Extension:\n"));
    const extEntries = Object.entries(stats.byExt)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 15);
    const extRows = extEntries.map(([ext, data], i) => ({
      "#": i + 1,
      Ext: fmt.code(ext.padEnd(10)),
      Count: String(data.count).padStart(5),
      Size: humanSize(data.size).padStart(8),
      Bar: healthBar(data.count, stats.totalFiles, 15),
    }));
    console.log(Bun.inspect.table(extRows, { colors: true }));

    // Largest files
    console.log(fmt.subtitle("\n  Largest Files:\n"));
    const largeRows = stats.largestFiles.map((f, i) => ({
      "#": i + 1,
      Icon: getFileIcon(f.mime),
      Name: fmt.code(f.name.length > 35 ? f.name.slice(0, 32) + "..." : f.name),
      Size: fmt.highlight(f.sizeHuman.padStart(10)),
      Type: fmt.muted(f.mime.slice(0, 25)),
    }));
    console.log(Bun.inspect.table(largeRows, { colors: true }));
    return;
  }

  // ─── Run script ───────────────────────────────────────────────────────
  if (cmd === "run" && args[0] && args[1]) {
    const slug = args[0] as ProjectSlug;
    const script = args[1];
    const extraArgs = args.slice(2);

    if (!projects[slug]) {
      console.error(fmt.error(`  Unknown project: ${slug}`));
      process.exit(1);
    }

    console.log(`\n  ${fmt.info("▶")} ${fmt.subtitle(script)} ${fmt.muted("in")} ${fmt.code(slug)}\n`);
    console.log(divider());

    const result = await execute(slug, script, { args: extraArgs });

    console.log(divider());
    const status = result.ok ? fmt.success("✓ OK") : fmt.error("✗ FAILED");
    console.log(`\n  ${status} ${fmt.muted(`(${result.ms.toFixed(0)}ms)`)}\n`);

    process.exit(result.code);
  }

  // ─── Help ─────────────────────────────────────────────────────────────
  if (cmd === "help" || cmd === "-h" || cmd === "--help") {
    console.log(`
${header("PROJECT CONTROL CENTER", "◈")}
  ${fmt.subtitle("Usage:")}

    ${fmt.code("bun projects.ts")} ${fmt.muted("[command] [options]")}

  ${fmt.subtitle("Commands:")}

    ${fmt.code("ls, list")}                      List all projects with health
    ${fmt.code("scripts")} ${fmt.muted("<project>")}            Show scripts with categories
    ${fmt.code("metrics")} ${fmt.muted("[project]")}            Show statistics & metrics
    ${fmt.code("categories")}                    List all script categories
    ${fmt.code("category")} ${fmt.muted("<cat>")}               Scripts in a category
    ${fmt.code("patterns")}                      List all script patterns
    ${fmt.code("find")} ${fmt.muted("<query>")}                 Search scripts by regex
    ${fmt.code("files")} ${fmt.muted("<project>")}              Analyze file types & sizes
    ${fmt.code("run")} ${fmt.muted("<project> <script>")}       Execute a script

  ${fmt.subtitle("Examples:")}

    ${fmt.muted("$")} bun projects.ts scripts trader-analyzer
    ${fmt.muted("$")} bun projects.ts metrics enterprise-dashboard
    ${fmt.muted("$")} bun projects.ts category test
    ${fmt.muted("$")} bun projects.ts find "deploy"
    ${fmt.muted("$")} bun projects.ts files skills
    ${fmt.muted("$")} bun projects.ts run dashboard dev

  ${fmt.subtitle("Shorthand:")}

    ${fmt.muted("$")} bun projects.ts dashboard dev    ${fmt.muted("# same as: run dashboard dev")}
`);
    return;
  }

  // ─── Shorthand: <project> <script> ────────────────────────────────────
  if (cmd && args[0] && projects[cmd as ProjectSlug]) {
    const slug = cmd as ProjectSlug;
    const script = args[0];
    const extraArgs = args.slice(1);

    console.log(`\n  ${fmt.info("▶")} ${fmt.subtitle(script)} ${fmt.muted("in")} ${fmt.code(slug)}\n`);
    console.log(divider());

    const result = await execute(slug, script, { args: extraArgs });

    console.log(divider());
    const status = result.ok ? fmt.success("✓ OK") : fmt.error("✗ FAILED");
    console.log(`\n  ${status} ${fmt.muted(`(${result.ms.toFixed(0)}ms)`)}\n`);

    process.exit(result.code);
  }

  console.error(fmt.error(`\n  Unknown command: ${cmd}`));
  console.log(fmt.muted("  Run with --help for usage.\n"));
  process.exit(1);
}

// ┌──────────────────────────────────────────────────────────────────────────┐
// │  Entry Point                                                             │
// └──────────────────────────────────────────────────────────────────────────┘

if (import.meta.main) {
  cli();
}

// @see https://bun.com/docs/runtime/color#flexible-input — Bun.color
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
/**
 * Sandboxed Bun-native system panel for the operator-research desk.
 * @see https://bun.com/docs/runtime/file-io — Bun.file / Bun.write
 * @see https://bun.com/docs/runtime/glob — Bun.Glob
 * @see https://bun.com/docs/runtime/utils#bun-which — Bun.which
 * @see https://bun.com/docs/runtime/utils#bun-password — Bun.password
 * @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
 * @see https://bun.com/docs/runtime/utils#bun-color — Bun.color
 */
import { basenamePath, joinPath, normalizePath, relativePath, resolvePath } from '../path-bun.ts';
import { ROOT } from './paths.ts';
import { listTaskIds, getTask, getTaskPromise } from './tasks.ts';
import { mimeFromBunFile, openBunFile } from './http/bun-file.ts';

const MAX_READ_BYTES = 512 * 1024;
const MAX_WRITE_BYTES = 256 * 1024;
const MAX_LIST = 200;
const MAX_GLOB = 80;

const SENSITIVE_ENV =
  /^(.*_)?(SECRET|TOKEN|PASSWORD|PASSWD|PRIVATE|API_KEY|AUTH|CREDENTIAL|COOKIE|SESSION)(_.*)?$/i;

/** Paths relative to ROOT that may be written from the desk. */
const WRITE_ALLOW = [
  /^package\.json$/,
  /^\.env\.desk(\.local)?$/,
  /^\.env\.example$/,
  /^config\/operator-research\/[^/]+\.toml$/,
  /^config\/operators\/[^/]+\.toml$/,
  /^data\/exports\/[^/]+\.(json|csv|md)$/,
];

export type SystemInfo = {
  bun: { version: string; revision: string };
  os: string;
  arch: string;
  cwd: string;
  root: string;
  pid: number;
  uptimeSec: number;
  which: Record<string, string | null>;
  colors: { hex: string; ansi: string | null; css: string | null }[];
  envKeys: string[];
  generatedAt: string;
};

export function resolveUnderProject(inputPath: string | undefined | null):
  | {
      ok: true;
      abs: string;
      rel: string;
    }
  | { ok: false; error: string } {
  const raw = (inputPath ?? '.').trim() || '.';
  if (raw.includes('\0') || raw.includes('..')) {
    // Still allow ".." if normalize stays under root — check after resolve
  }
  const absRoot = resolvePath(ROOT);
  const abs = normalizePath(resolvePath(absRoot, raw));
  if (abs !== absRoot && !abs.startsWith(`${absRoot}/`)) {
    return { ok: false, error: 'Path escapes project root' };
  }
  return { ok: true, abs, rel: relativePath(absRoot, abs) || '.' };
}

function isWritableRel(rel: string): boolean {
  const norm = rel.replace(/\\/g, '/');
  return WRITE_ALLOW.some(re => re.test(norm));
}

function redactEnvValue(key: string, value: string | undefined): string {
  if (value == null) return '';
  if (SENSITIVE_ENV.test(key)) {
    if (!value) return '';
    return value.length <= 4
      ? '••••'
      : `${value.slice(0, 2)}…${value.slice(-2)} (${value.length} chars)`;
  }
  if (value.length > 120) return value.slice(0, 117) + '…';
  return value;
}

export async function getSystemInfo(): Promise<SystemInfo> {
  const tools = ['bun', 'node', 'npm', 'git', 'docker', 'sqlite3', 'rg', 'curl'] as const;
  const which: Record<string, string | null> = {};
  for (const t of tools) {
    which[t] = Bun.which(t) ?? null;
  }

  const sampleHex = ['#5fc3f4', '#6fcf97', '#f28b82', '#f9ca7f'];
  const colors = sampleHex.map(hex => ({
    hex,
    ansi: (() => {
      try {
        return Bun.color(hex, 'ansi') ?? null;
      } catch {
        return null;
      }
    })(),
    css: (() => {
      try {
        return Bun.color(hex, 'css') ?? null;
      } catch {
        return null;
      }
    })(),
  }));

  return {
    bun: { version: Bun.version, revision: Bun.revision },
    os: process.platform,
    arch: process.arch,
    cwd: process.cwd(),
    root: ROOT,
    pid: process.pid,
    uptimeSec: Math.round(process.uptime()),
    which,
    colors,
    envKeys: Object.keys(Bun.env).sort().slice(0, 40),
    generatedAt: new Date().toISOString(),
  };
}

export type FsEntry = {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size: number | null;
  mime: string | null;
};

/** List a single directory (non-recursive) under project root. */
export async function listDirectory(pathInput?: string): Promise<{
  path: string;
  rel: string;
  entries: FsEntry[];
}> {
  const resolved = resolveUnderProject(pathInput ?? '.');
  if (!resolved.ok) throw new Error(resolved.error);

  const glob = new Bun.Glob('*');
  const entries: FsEntry[] = [];
  for await (const name of glob.scan({
    cwd: resolved.abs,
    onlyFiles: false,
    dot: false,
  })) {
    const abs = joinPath(resolved.abs, name);
    let type: 'file' | 'dir' = 'file';
    let size: number | null = null;
    let mime: string | null = null;
    try {
      const st = await Bun.file(abs).stat();
      if (st.isDirectory()) {
        type = 'dir';
      } else {
        const file = Bun.file(abs);
        size = st.size;
        mime = mimeFromBunFile(file, abs);
      }
    } catch {
      continue;
    }
    entries.push({
      name,
      path: joinPath(resolved.rel === '.' ? '' : resolved.rel, name).replace(/\\/g, '/') || name,
      type,
      size,
      mime,
    });
    if (entries.length >= MAX_LIST) break;
  }
  entries.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return { path: resolved.abs, rel: resolved.rel, entries };
}

export async function readProjectFile(pathInput: string): Promise<{
  path: string;
  rel: string;
  mime: string;
  size: number;
  content: string;
  truncated: boolean;
}> {
  const resolved = resolveUnderProject(pathInput);
  if (!resolved.ok) throw new Error(resolved.error);
  const file = openBunFile(resolved.abs);
  if (!(await file.exists())) throw new Error('File not found');
  if (file.size > MAX_READ_BYTES) {
    const slice = file.slice(0, MAX_READ_BYTES);
    const content = await slice.text();
    return {
      path: resolved.abs,
      rel: resolved.rel,
      mime: mimeFromBunFile(file, resolved.abs),
      size: file.size,
      content,
      truncated: true,
    };
  }
  const content = await file.text();
  return {
    path: resolved.abs,
    rel: resolved.rel,
    mime: mimeFromBunFile(file, resolved.abs),
    size: file.size,
    content,
    truncated: false,
  };
}

export async function writeProjectFile(
  pathInput: string,
  content: string
): Promise<{ path: string; rel: string; bytes: number }> {
  const resolved = resolveUnderProject(pathInput);
  if (!resolved.ok) throw new Error(resolved.error);
  if (!isWritableRel(resolved.rel)) {
    throw new Error(
      `Write forbidden for ${resolved.rel}. Allowed: package.json, .env.desk, config/**/*.toml, data/exports/*`
    );
  }
  const bytes = Buffer.byteLength(content, 'utf8');
  if (bytes > MAX_WRITE_BYTES) throw new Error(`Content too large (>${MAX_WRITE_BYTES} bytes)`);
  await Bun.write(resolved.abs, content);
  return { path: resolved.abs, rel: resolved.rel, bytes };
}

export async function listProcesses(limit = 40): Promise<{
  processes: Array<{ user: string; pid: string; cpu: string; mem: string; command: string }>;
  source: string;
}> {
  const ps = Bun.which('ps');
  if (!ps) return { processes: [], source: 'ps-missing' };
  const proc = Bun.spawn([ps, 'aux'], {
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...Bun.env, NO_COLOR: '1' },
  });
  const output = await new Response(proc.stdout).text();
  await proc.exited;
  const lines = output.split('\n').slice(1);
  const processes = [];
  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 11) continue;
    processes.push({
      user: parts[0]!,
      pid: parts[1]!,
      cpu: parts[2]!,
      mem: parts[3]!,
      command: parts.slice(10).join(' ').slice(0, 200),
    });
    if (processes.length >= limit) break;
  }
  return { processes, source: ps };
}

export function getEnvView(opts: { includeValues?: boolean } = {}): {
  count: number;
  vars: Array<{ key: string; value: string; sensitive: boolean }>;
} {
  const keys = Object.keys(Bun.env).sort();
  const vars = keys.map(key => {
    const sensitive = SENSITIVE_ENV.test(key);
    const raw = Bun.env[key];
    return {
      key,
      value: opts.includeValues
        ? redactEnvValue(key, raw)
        : sensitive
          ? '(redacted)'
          : redactEnvValue(key, raw),
      sensitive,
    };
  });
  return { count: vars.length, vars };
}

/** Process-local env mutation for DESK_* keys only (does not persist to disk). */
export function setDeskEnv(key: string, value: string): { key: string; value: string } {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) throw new Error('Invalid env key');
  if (!key.startsWith('DESK_') && !key.startsWith('OPERATOR_RESEARCH_')) {
    throw new Error('Only DESK_* or OPERATOR_RESEARCH_* keys may be set from the desk');
  }
  if (SENSITIVE_ENV.test(key) && key.includes('SECRET')) {
    // Allow setting but don't echo full value later
  }
  Bun.env[key] = value;
  return { key, value: redactEnvValue(key, value) };
}

export async function hashPassword(plain: string): Promise<{ hashed: string; algorithm: string }> {
  if (!plain || plain.length > 200) throw new Error('Invalid plaintext');
  const hashed = await Bun.password.hash(plain, { algorithm: 'bcrypt', cost: 10 });
  return { hashed, algorithm: 'bcrypt' };
}

export async function verifyPassword(plain: string, hash: string): Promise<{ valid: boolean }> {
  if (!plain || !hash) throw new Error('Missing plain or hash');
  const valid = await Bun.password.verify(plain, hash);
  return { valid };
}

export async function globSearch(
  pattern: string,
  cwdInput?: string
): Promise<{ pattern: string; cwd: string; results: string[] }> {
  if (!pattern || pattern.length > 200) throw new Error('Invalid pattern');
  // Block absolute / parent escapes in pattern
  if (pattern.startsWith('/') || pattern.includes('\0')) throw new Error('Invalid pattern');
  const resolved = resolveUnderProject(cwdInput ?? '.');
  if (!resolved.ok) throw new Error(resolved.error);

  const glob = new Bun.Glob(pattern);
  const results: string[] = [];
  for await (const match of glob.scan({
    cwd: resolved.abs,
    onlyFiles: true,
    dot: false,
  })) {
    results.push(
      joinPath(resolved.rel === '.' ? '' : resolved.rel, match).replace(/\\/g, '/') || match
    );
    if (results.length >= MAX_GLOB) break;
  }
  return { pattern, cwd: resolved.rel, results };
}

// eslint-disable-next-line harness/no-unknown-function-param -- system inspect accepts wire JSON
export function inspectValue(value: unknown, depth = 2): { inspected: string; depth: number } {
  const d = Math.min(Math.max(Number(depth) || 2, 0), 6);
  return {
    inspected: Bun.inspect(value, { depth: d, colors: false }),
    depth: d,
  };
}

/** Bun.peek status for registered desk tasks. */
export function peekTasks(): {
  tasks: Array<{
    id: string; // brand-ok — legacy task registry owns this opaque identifier
    kind: string | undefined;
    createdAt: string | undefined;
    peekStatus: string;
  }>;
} {
  const ids = listTaskIds();
  const tasks = ids.slice(0, 50).map(id => {
    const record = getTask(id);
    const promise = getTaskPromise(id);
    const peekStatus = promise ? Bun.peek.status(promise) : 'missing';
    return {
      id,
      kind: record?.kind,
      createdAt: record?.createdAt,
      peekStatus,
    };
  });
  return { tasks };
}

export function basenameSafe(p: string): string {
  return basenamePath(p);
}

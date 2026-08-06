#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils — Bun utils surface (partial docs page)
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/glob — Bun.Glob
// @see https://bun.com/docs/runtime/utils#bun-resolve-sync — Bun.resolveSync
// @see https://bun.com/reference/bun/argv — Bun.argv
/**
 * bun-types-inventory.ts — **deep** inventory of pinned `bun-types`:
 *
 *  - Top-level module members (function / namespace / class / const / var / interface / type)
 *  - Nested namespace · class · **interface** · **`type X = {…}`** methods/properties
 *  - Satellite modules: bun:jsc · bun:ffi · bun:sqlite · bun:test · serve/sql/s3/redis/shell …
 *  - Optional tip-vs-pin diff (`~/bun/packages/bun-types` or `BUN_TYPES_TIP`)
 *  - AGENTS.md grounded-map hits + repo call-site counts (qualified paths)
 *
 * Not the docs-only utils page (`export-bun-api-index` is separate SSOT).
 *
 * Usage:
 *   bun tools/bun-types-inventory.ts                 # deep (iface + type aliases + props)
 *   bun tools/bun-types-inventory.ts --shallow       # top-level only
 *   bun tools/bun-types-inventory.ts --no-interfaces
 *   bun tools/bun-types-inventory.ts --no-type-aliases
 *   bun tools/bun-types-inventory.ts --no-props
 *   bun tools/bun-types-inventory.ts --tip-diff
 *   bun tools/bun-types-inventory.ts --write · --check · --json · --no-counts · --full-scan
 *   bun tools/bun-types-inventory.ts --module=bun:jsc · --kind=function,method,property
 *
 * Scripts: bun:types-inventory · :write · :check
 */
import { logTable } from '../lib/console-depth.ts';
import { joinPath, resolvePath } from '../lib/path-bun.ts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MemberKind =
  | 'function'
  | 'namespace'
  | 'class'
  | 'const'
  | 'var'
  | 'interface'
  | 'type'
  | 'method'
  | 'property';

export type InventoryMember = {
  kind: MemberKind;
  /** Leaf name, e.g. `table` or `sleep` */
  name: string;
  /** Parent path without module, e.g. `Bun.inspect` or null at module root */
  parent: string | null;
  /** Fully qualified setting: `Bun.inspect.table` · `bun:jsc.serialize` */
  setting: string;
  /** Declaring module id */
  module: string;
  /** 0 = top-level of module */
  depth: number;
  form: string;
  default: string;
  notes: string;
  source: string;
  line: number;
  deprecated: boolean;
  /** Number of overloads collapsed into this row */
  overloads: number;
  agentsMap: boolean;
  callSites: number;
};

export type TipDiff = {
  tipRoot: string;
  tipRevision: string | null;
  pinOnly: string[];
  tipOnly: string[];
  shared: number;
};

export type InventoryResult = {
  schema: 'factorywager/bun-types-inventory/v3';
  generated: string;
  runtime: {
    bunVersion: string;
    bunRevision: string;
  };
  types: {
    package: string;
    version: string;
    root: string;
    files: string[];
  };
  mode: {
    shallow: boolean;
    interfaces: boolean;
    properties: boolean;
    /** Open `type X = { … }` object-literal aliases */
    typeAliases: boolean;
    counted: boolean;
    moduleFilter: string | null;
    kindFilter: MemberKind[] | null;
  };
  scan: {
    roots: string[];
    counted: boolean;
  };
  summary: {
    total: number;
    topLevel: number;
    nested: number;
    byKind: Partial<Record<MemberKind, number>>;
    byModule: Record<string, number>;
    byDepth: Record<string, number>;
    agentsMapHits: number;
    withCallSites: number;
    zeroCallSites: number;
    maxDepth: number;
  };
  tipDiff: TipDiff | null;
  members: InventoryMember[];
};

type RawMember = Omit<InventoryMember, 'agentsMap' | 'callSites'>;

// ---------------------------------------------------------------------------
// Paths + files
// ---------------------------------------------------------------------------

const TOOLS_DIR = resolvePath(import.meta.dir);
const REPO_ROOT = resolvePath(TOOLS_DIR, '..');
const OUT_JSON = joinPath(TOOLS_DIR, 'bun-types-inventory.json');
const OUT_MD = joinPath(TOOLS_DIR, 'bun-types-inventory.md');
const AGENTS_MD = joinPath(REPO_ROOT, 'AGENTS.md');

const DEFAULT_SCAN_ROOTS = ['lib', 'tools', 'scripts', 'tests', 'config'] as const;
const FULL_SCAN_EXTRA = ['packages', 'projects'] as const;

/** Core + satellites under bun-types package */
export const INVENTORY_DTS_FILES = [
  'bun.d.ts',
  'deprecated.d.ts',
  'serve.d.ts',
  'sql.d.ts',
  's3.d.ts',
  'redis.d.ts',
  'shell.d.ts',
  'security.d.ts',
  'wasm.d.ts',
  'jsc.d.ts',
  'ffi.d.ts',
  'sqlite.d.ts',
  'test.d.ts',
  'bundle.d.ts',
] as const;

// ---------------------------------------------------------------------------
// FS helpers
// ---------------------------------------------------------------------------

async function pathExists(path: string): Promise<boolean> {
  try {
    return await Bun.file(path).exists();
  } catch {
    return false;
  }
}

async function readText(path: string): Promise<string> {
  return Bun.file(path).text();
}

export async function readCatalogBunTypesVersion(repoRoot: string = REPO_ROOT): Promise<string | null> {
  const pkgPath = joinPath(repoRoot, 'package.json');
  if (!(await pathExists(pkgPath))) return null;
  try {
    const pkg = (await Bun.file(pkgPath).json()) as {
      catalog?: Record<string, string>;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const cat = pkg.catalog?.['bun-types'];
    if (cat && cat !== 'catalog:') return cat;
    for (const block of [pkg.devDependencies, pkg.dependencies]) {
      const v = block?.['bun-types'];
      if (v && v !== 'catalog:') return v;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export async function resolveBunTypesRoot(repoRoot: string = REPO_ROOT): Promise<{
  root: string;
  version: string;
  packageName: string;
}> {
  const tried: string[] = [];
  const wantVersion = await readCatalogBunTypesVersion(repoRoot);

  const tryDir = async (
    dir: string,
  ): Promise<{ root: string; version: string; packageName: string } | null> => {
    const pkgPath = joinPath(dir, 'package.json');
    const dts = joinPath(dir, 'bun.d.ts');
    if (!(await pathExists(pkgPath)) || !(await pathExists(dts))) return null;
    try {
      const pkg = (await Bun.file(pkgPath).json()) as { name?: string; version?: string };
      return {
        root: dir,
        version: pkg.version ?? 'unknown',
        packageName: pkg.name ?? 'bun-types',
      };
    } catch {
      return null;
    }
  };

  const candidates: string[] = [];
  candidates.push(joinPath(repoRoot, 'node_modules', 'bun-types'));
  const home = Bun.env.HOME ?? '';
  if (home) {
    candidates.push(joinPath(home, 'Projects', 'node_modules', 'bun-types'));
    if (wantVersion) {
      candidates.push(joinPath(home, '.bun', 'install', 'cache', `bun-types@${wantVersion}`));
      candidates.push(joinPath(home, '.bun', 'install', 'cache', `bun-types@${wantVersion}@@@1`));
    }
  }
  try {
    const pkgJson = Bun.resolveSync('bun-types/package.json', repoRoot);
    candidates.push(resolvePath(pkgJson, '..'));
  } catch {
    /* continue */
  }

  const hits: Array<{ root: string; version: string; packageName: string }> = [];
  for (const dir of candidates) {
    tried.push(dir);
    const hit = await tryDir(dir);
    if (hit) hits.push(hit);
  }
  if (hits.length === 0) {
    throw new Error(
      `bun-types not found. Tried:\n${tried.map(t => `  - ${t}`).join('\n')}\nRun bun install.`,
    );
  }
  if (wantVersion) {
    const exact = hits.find(h => h.version === wantVersion);
    if (exact) return exact;
  }
  return hits[0]!;
}

// ---------------------------------------------------------------------------
// JSDoc helpers
// ---------------------------------------------------------------------------

function extractDefault(jsdoc: string): string {
  const m = [...jsdoc.matchAll(/@default\s+([^\n*]+)/g)];
  if (m.length === 0) return '—';
  return m[m.length - 1]![1]!.trim().replace(/\s+$/, '') || '—';
}

function extractNotes(jsdoc: string): string {
  const cleaned = jsdoc
    .replace(/^\s*\/\*\*?/, '')
    .replace(/\*\/\s*$/, '')
    .split('\n')
    .map(l => l.replace(/^\s*\*+\s?/, '').trim())
    .filter(Boolean);
  for (const line of cleaned) {
    if (line.startsWith('@') || line === '/' || line === '*') continue;
    const s = line.replace(/\s+/g, ' ').trim();
    if (!s || s === '*' || s === '/**') continue;
    return s.length > 160 ? `${s.slice(0, 157)}…` : s;
  }
  return '—';
}

function precedingJsdoc(lines: string[], lineIndex: number): string {
  let i = lineIndex - 1;
  while (i >= 0 && lines[i]!.trim() === '') i--;
  if (i < 0) return '';
  if (!lines[i]!.includes('*/')) return '';
  let end = i;
  let start = i;
  while (start >= 0 && !lines[start]!.includes('/**') && !lines[start]!.trim().startsWith('/*')) {
    start--;
  }
  if (start < 0) return '';
  return lines.slice(start, end + 1).join('\n');
}

// ---------------------------------------------------------------------------
// Deep DTS walker
// ---------------------------------------------------------------------------

type ScopeFrame = {
  /** Path segments after module prefix, e.g. ['inspect'] or ['Spawn'] */
  path: string[];
  /** kind of scope container */
  kind: 'module' | 'namespace' | 'class' | 'interface' | 'type' | 'other';
  /** brace depth when this scope opened */
  openDepth: number;
};

const DECL_RE =
  /^(?:export\s+)?(?:declare\s+)?(function|namespace|class|const|var|let|interface|type)\s+([A-Za-z_][A-Za-z0-9_]*)\b(.*)$/;

const STATIC_METHOD_RE = /^(?:export\s+)?static\s+(?:async\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*[<(]/;
/** Instance / interface method — name( or name<T>( */
const INSTANCE_METHOD_RE =
  /^(?:export\s+)?(?:async\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*(?:<[^>]*>)?\s*\(/;
/** Interface/class property: name: Type or name?: Type (not call signatures) */
const PROPERTY_RE =
  /^(?:export\s+)?(?:readonly\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*(\?)?\s*:\s*(?!\()/;

const SKIP_METHOD_NAMES = new Set([
  'if',
  'for',
  'while',
  'switch',
  'catch',
  'function',
  'class',
  'const',
  'let',
  'var',
  'return',
  'throw',
  'new',
  'typeof',
  'instanceof',
  'get',
  'set',
  'constructor',
  'if',
  'else',
  'try',
  'from',
  'import',
  'export',
  'extends',
  'implements',
  'infer',
  'keyof',
  'readonly',
  'declare',
  'type',
  'interface',
  'namespace',
  'module',
  'enum',
  'as',
  'is',
  'in',
  'of',
  'void',
  'never',
  'any',
  'unknown',
  'boolean',
  'string',
  'number',
  'object',
  'symbol',
  'bigint',
  'true',
  'false',
  'null',
  'undefined',
]);

/** Scopes that nest children in deep mode (type aliases need object-body check). */
function isNestingKind(
  kind: string,
  opts: { interfaces: boolean; typeAliases: boolean },
): boolean {
  if (kind === 'namespace' || kind === 'class') return true;
  if (kind === 'interface' && opts.interfaces) return true;
  if (kind === 'type' && opts.typeAliases) return true;
  return false;
}

/** Strip balanced `<…>` so generic defaults like `P = {}` do not fake object bodies. */
export function stripAngleGenerics(s: string): string {
  let out = '';
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    if (c === '<') {
      depth++;
      continue;
    }
    if (c === '>') {
      depth = Math.max(0, depth - 1);
      continue;
    }
    if (depth === 0) out += c;
  }
  return out;
}

/**
 * True when `type Name… = {` is an object-type alias (not `= string | …`).
 * Looks ahead a few lines for multi-line `type Foo =\n  {`.
 */
export function typeAliasOpensObjectBody(
  trimmed: string,
  lines: string[],
  lineIndex: number,
): boolean {
  if (!/^(?:export\s+)?type\s+/.test(trimmed)) return false;
  let buf = trimmed;
  let look = lineIndex + 1;
  for (let step = 0; step < 12; step++) {
    const stripped = stripAngleGenerics(buf.replace(/\s+/g, ' ').trim());
    if (/^(?:export\s+)?type\s+[A-Za-z_][\w]*\s*=\s*\{/.test(stripped)) return true;
    // finished non-object assignment
    if (
      /^(?:export\s+)?type\s+[A-Za-z_][\w]*\s*=/.test(stripped) &&
      stripped.includes(';') &&
      !/=\s*\{/.test(stripped)
    ) {
      return false;
    }
    if (look >= lines.length) break;
    const next = lines[look]!.trim();
    look++;
    if (!next || next.startsWith('//') || next.startsWith('*') || next.startsWith('/*')) continue;
    buf += ' ' + next;
  }
  return /^(?:export\s+)?type\s+[A-Za-z_][\w]*\s*=\s*\{/.test(
    stripAngleGenerics(buf.replace(/\s+/g, ' ').trim()),
  );
}

function isHarvestScope(kind: ScopeFrame['kind']): boolean {
  return kind === 'class' || kind === 'interface' || kind === 'type' || kind === 'namespace';
}

function settingFor(moduleId: string, path: string[], leaf: string): string {
  const segs = [...path, leaf];
  if (moduleId === 'bun') return `Bun.${segs.join('.')}`;
  return `${moduleId}.${segs.join('.')}`;
}

function parentSetting(moduleId: string, path: string[]): string | null {
  if (path.length === 0) return null;
  if (moduleId === 'bun') return `Bun.${path.join('.')}`;
  return `${moduleId}.${path.join('.')}`;
}

function formFor(
  kind: MemberKind,
  setting: string,
  rest: string,
  lines: string[],
  lineIndex: number,
): string {
  if (kind === 'function' || kind === 'method') {
    let sig = rest.trim();
    if (!sig.includes('(')) sig = '()';
    if (!sig.includes(')') && lineIndex + 1 < lines.length) {
      const parts = [sig];
      for (let j = lineIndex + 1; j < Math.min(lineIndex + 14, lines.length); j++) {
        const t = lines[j]!.trim();
        parts.push(t);
        if (t.includes('):') || t.endsWith(');') || t.endsWith('{') || t.endsWith('}')) break;
      }
      sig = parts.join(' ').replace(/\s+/g, ' ');
      const open = sig.indexOf('(');
      if (open >= 0) sig = sig.slice(open);
    } else if (sig.startsWith('(')) {
      /* ok */
    } else {
      const open = sig.indexOf('(');
      sig = open >= 0 ? sig.slice(open) : '()';
    }
    return `${setting}${sig}`.replace(/\s+/g, ' ').slice(0, 160);
  }
  if (kind === 'namespace') return `${setting}.*`;
  if (kind === 'class') return `new ${setting}(…)`;
  if (kind === 'interface' || kind === 'type') return setting;
  if (kind === 'const' || kind === 'var' || kind === 'property') {
    const t = rest.trim();
    if (t.startsWith(':') || t.startsWith('?:')) return `${setting}${t.split('=')[0]!.trim()}`.slice(0, 140);
    return setting;
  }
  return setting;
}

/** Strip strings + comments so `{`/`}` inside them do not break scope depth. */
function braceDelta(line: string): number {
  let s = line;
  s = s.replace(/\/\*[\s\S]*?\*\//g, '');
  const hash = s.indexOf('//');
  if (hash >= 0) s = s.slice(0, hash);
  s = s.replace(/'(?:\\.|[^'\\])*'/g, "''");
  s = s.replace(/"(?:\\.|[^"\\])*"/g, '""');
  s = s.replace(/`(?:\\.|[^`\\])*`/g, '``');
  const opens = (s.match(/\{/g) ?? []).length;
  const closes = (s.match(/\}/g) ?? []).length;
  return opens - closes;
}

export type ParseDtsOpts = {
  deprecatedFile?: boolean;
  /** Top-level members only */
  shallow?: boolean;
  /** Open interface bodies and harvest methods/props (default true when not shallow) */
  interfaces?: boolean;
  /** Harvest `name: Type` properties inside class/interface/type (default true when not shallow) */
  properties?: boolean;
  /** Open `type X = { … }` object-literal aliases (default true when not shallow) */
  typeAliases?: boolean;
};

/**
 * Parse all `declare module "…"` blocks in a .d.ts file into inventory rows.
 *
 * Nesting scopes: **namespace**, **class**, optionally **interface**, and
 * **`type X = { … }`** object aliases (not unions / generic-only types).
 * Members are harvested only at the immediate body brace depth (anonymous nested
 * objects do not invent false fields on the parent type).
 */
export function parseDtsFile(
  text: string,
  sourceRel: string,
  opts: ParseDtsOpts = {},
): RawMember[] {
  const shallow = opts.shallow === true;
  const interfaces = opts.interfaces !== false && !shallow;
  const properties = opts.properties !== false && !shallow;
  const typeAliases = opts.typeAliases !== false && !shallow;

  const lines = text.split(/\r?\n/);
  const out: RawMember[] = [];
  const seen = new Map<string, RawMember>();

  const push = (raw: RawMember) => {
    const key = `${raw.module}|${raw.setting}|${raw.kind}`;
    const prev = seen.get(key);
    if (prev) {
      prev.overloads += 1;
      return;
    }
    raw.overloads = 1;
    seen.set(key, raw);
    out.push(raw);
  };

  let i = 0;
  let inBlockComment = false;
  while (i < lines.length) {
    const modMatch = lines[i]!.match(/^declare\s+module\s+["']([^"']+)["']\s*\{/);
    if (!modMatch) {
      i++;
      continue;
    }
    const moduleId = modMatch[1]!;
    let depth = 1;
    const stack: ScopeFrame[] = [{ path: [], kind: 'module', openDepth: 1 }];
    let pending: ScopeFrame | null = null;
    i++;
    while (i < lines.length && depth > 0) {
      let line = lines[i]!;
      const depthAtLineStart = depth;

      if (inBlockComment) {
        const end = line.indexOf('*/');
        if (end < 0) {
          i++;
          continue;
        }
        line = line.slice(end + 2);
        inBlockComment = false;
      }
      if (line.includes('/*') && !line.includes('*/')) {
        const start = line.indexOf('/*');
        const before = line.slice(0, start);
        depth += braceDelta(before);
        while (stack.length > 1 && depth < stack[stack.length - 1]!.openDepth) stack.pop();
        inBlockComment = true;
        i++;
        continue;
      }

      const trimmed = line.trim();
      const codeLine =
        !trimmed.startsWith('*') &&
        !trimmed.startsWith('//') &&
        !trimmed.startsWith('/*') &&
        trimmed.length > 0;

      if (codeLine) {
        const top = stack[stack.length - 1]!;
        const decl = trimmed.match(DECL_RE);
        if (decl) {
          let kind = decl[1]! as MemberKind | 'let';
          if (kind === 'let') kind = 'var';
          const name = decl[2]!;
          const rest = decl[3] ?? '';
          const depthOfMember = stack.length - 1;
          if (!shallow || depthOfMember === 0) {
            const jsdoc = precedingJsdoc(lines, i);
            const setting = settingFor(moduleId, top.path, name);
            push({
              kind: kind as MemberKind,
              name,
              parent: parentSetting(moduleId, top.path),
              setting,
              module: moduleId,
              depth: depthOfMember,
              form: formFor(kind as MemberKind, setting, rest, lines, i),
              default: extractDefault(jsdoc),
              notes: extractNotes(jsdoc),
              source: sourceRel,
              line: i + 1,
              deprecated: opts.deprecatedFile === true || /@deprecated/i.test(jsdoc),
              overloads: 1,
            });
          }
          const mayNest = isNestingKind(kind, { interfaces, typeAliases });
          if (mayNest) {
            if (kind === 'type') {
              if (typeAliasOpensObjectBody(trimmed, lines, i)) {
                pending = {
                  path: [...top.path, name],
                  kind: 'type',
                  openDepth: -1,
                };
              }
            } else if (!trimmed.endsWith(';')) {
              pending = {
                path: [...top.path, name],
                kind: kind as 'namespace' | 'class' | 'interface',
                openDepth: -1,
              };
            }
          }
        } else if (
          !shallow &&
          isHarvestScope(top.kind) &&
          // only immediate body — not fields inside nested anonymous `{ … }`
          depthAtLineStart === top.openDepth
        ) {
          // skip index / mapped signatures
          if (!trimmed.startsWith('[') && !trimmed.startsWith('<')) {
            const staticM = trimmed.match(STATIC_METHOD_RE);
            const instM =
              !staticM &&
              (top.kind === 'class' || top.kind === 'interface' || top.kind === 'type')
                ? trimmed.match(INSTANCE_METHOD_RE)
                : null;
            if (staticM || instM) {
              const name = (staticM ?? instM)![1]!;
              if (!SKIP_METHOD_NAMES.has(name) && !name.startsWith('_')) {
                const jsdoc = precedingJsdoc(lines, i);
                const setting = settingFor(moduleId, top.path, name);
                const rest = trimmed.slice(trimmed.indexOf(name) + name.length);
                push({
                  kind: 'method',
                  name,
                  parent: parentSetting(moduleId, top.path),
                  setting,
                  module: moduleId,
                  depth: stack.length - 1,
                  form: formFor('method', setting, rest, lines, i),
                  default: extractDefault(jsdoc),
                  notes: extractNotes(jsdoc),
                  source: sourceRel,
                  line: i + 1,
                  deprecated: /@deprecated/i.test(jsdoc),
                  overloads: 1,
                });
              }
            } else if (
              properties &&
              (top.kind === 'class' || top.kind === 'interface' || top.kind === 'type')
            ) {
              const propM = trimmed.match(PROPERTY_RE);
              if (propM) {
                const name = propM[1]!;
                if (!SKIP_METHOD_NAMES.has(name) && !name.startsWith('_')) {
                  const jsdoc = precedingJsdoc(lines, i);
                  const setting = settingFor(moduleId, top.path, name);
                  const rest = trimmed.slice(trimmed.indexOf(name) + name.length);
                  push({
                    kind: 'property',
                    name,
                    parent: parentSetting(moduleId, top.path),
                    setting,
                    module: moduleId,
                    depth: stack.length - 1,
                    form: formFor('property', setting, rest, lines, i),
                    default: extractDefault(jsdoc),
                    notes: extractNotes(jsdoc),
                    source: sourceRel,
                    line: i + 1,
                    deprecated: /@deprecated/i.test(jsdoc),
                    overloads: 1,
                  });
                }
              }
            }
          }
        }
      }

      const delta = braceDelta(line);
      const depthBefore = depth;
      depth += delta;

      if (pending) {
        if (depth > depthBefore) {
          pending.openDepth = depth;
          stack.push(pending);
          pending = null;
        } else if (trimmed.endsWith(';') || trimmed.includes('}')) {
          // type Foo = string;  or failed open
          pending = null;
        }
      }

      while (stack.length > 1 && depth < stack[stack.length - 1]!.openDepth) {
        stack.pop();
      }

      i++;
    }
  }

  return out;
}

/** Compat wrapper for unit fixtures. */
export function parseBunModuleDts(
  text: string,
  sourceRel: string,
  opts: {
    deprecated?: boolean;
    shallow?: boolean;
    interfaces?: boolean;
    properties?: boolean;
    typeAliases?: boolean;
  } = {},
): RawMember[] {
  const wrapped = text.includes('declare module')
    ? text
    : `declare module "bun" {\n${text}\n}\n`;
  return parseDtsFile(wrapped, sourceRel, {
    deprecatedFile: opts.deprecated,
    shallow: opts.shallow,
    interfaces: opts.interfaces,
    properties: opts.properties,
    typeAliases: opts.typeAliases,
  });
}

// ---------------------------------------------------------------------------
// Tip vs pin
// ---------------------------------------------------------------------------

export async function resolveTipTypesRoot(): Promise<{ root: string; revision: string | null } | null> {
  const env = Bun.env.BUN_TYPES_TIP;
  const home = Bun.env.HOME ?? '';
  const candidates = [
    env,
    home ? joinPath(home, 'bun', 'packages', 'bun-types') : null,
  ].filter(Boolean) as string[];
  for (const root of candidates) {
    if (await pathExists(joinPath(root, 'bun.d.ts'))) {
      let revision: string | null = null;
      const gitDir = resolvePath(root, '..', '..');
      try {
        const proc = Bun.spawn(['git', '-C', gitDir, 'rev-parse', '--short', 'HEAD'], {
          stdout: 'pipe',
          stderr: 'pipe',
        });
        const out = await new Response(proc.stdout).text();
        await proc.exited;
        revision = out.trim() || null;
      } catch {
        revision = null;
      }
      return { root, revision };
    }
  }
  return null;
}

export async function computeTipDiff(
  pinMembers: RawMember[],
  tipRoot: string,
  tipRevision: string | null,
  parseOpts: ParseDtsOpts,
): Promise<TipDiff> {
  const tipRaw: RawMember[] = [];
  for (const f of INVENTORY_DTS_FILES) {
    const p = joinPath(tipRoot, f);
    if (!(await pathExists(p))) continue;
    tipRaw.push(...parseDtsFile(await readText(p), f, parseOpts));
  }
  const pinSet = new Set(pinMembers.map(m => m.setting));
  const tipSet = new Set(tipRaw.map(m => m.setting));
  const pinOnly: string[] = [];
  const tipOnly: string[] = [];
  for (const s of pinSet) if (!tipSet.has(s)) pinOnly.push(s);
  for (const s of tipSet) if (!pinSet.has(s)) tipOnly.push(s);
  pinOnly.sort();
  tipOnly.sort();
  let shared = 0;
  for (const s of pinSet) if (tipSet.has(s)) shared++;
  return {
    tipRoot,
    tipRevision,
    pinOnly,
    tipOnly,
    shared,
  };
}

// ---------------------------------------------------------------------------
// AGENTS map
// ---------------------------------------------------------------------------

export async function loadAgentsMapHaystack(agentsPath: string = AGENTS_MD): Promise<string> {
  if (!(await pathExists(agentsPath))) return '';
  const text = await readText(agentsPath);
  const start = text.indexOf('## Grounded capability map');
  if (start < 0) return text;
  const rest = text.slice(start);
  const next = rest.indexOf('\n## ', 2);
  return next < 0 ? rest : rest.slice(0, next);
}

export function agentsMapHits(haystack: string, setting: string, leaf: string): boolean {
  if (!haystack) return false;
  if (haystack.includes(setting)) return true;
  // Bun.X leaf for top-level
  if (setting.startsWith('Bun.') && haystack.includes(`Bun.${leaf}`)) {
    // only exact-ish: avoid Bun.spawn matching Bun.spawnSync via includes? 
    // "Bun.spawn" is contained in "Bun.spawnSync" — use word boundary after
    const re = new RegExp(`Bun\\.${leaf}(?![A-Za-z0-9_])`);
    if (re.test(haystack)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Call-site counts (qualified paths)
// ---------------------------------------------------------------------------

export async function countCallSitesDeep(
  repoRoot: string,
  settings: string[],
  scanRoots: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  for (const s of settings) counts.set(s, 0);

  // longest-first so Bun.inspect.table wins over Bun.inspect when counting exact
  const sorted = [...settings].sort((a, b) => b.length - a.length);
  // Build regex for Bun.* chains and module imports
  const bunChainRe = /\bBun(?:\.[A-Za-z_][A-Za-z0-9_]*)+/g;
  const importFromRe =
    /import\s*(?:type\s*)?(?:\{([^}]+)\}|\*\s+as\s+(\w+)|(\w+))\s*from\s*['"](bun(?::[A-Za-z0-9_-]+)?)['"]/g;

  for (const root of scanRoots) {
    const base = joinPath(repoRoot, root);
    const glob = new Bun.Glob('**/*.{ts,tsx,js,mjs,cjs}');
    try {
      for await (const rel of glob.scan({ cwd: base, onlyFiles: true, followSymlinks: false })) {
        if (rel.includes('node_modules/') || rel.includes('/.git/')) continue;
        if (rel.includes('bun-types-inventory.')) continue;
        const abs = joinPath(base, rel);
        let text: string;
        try {
          text = await Bun.file(abs).text();
        } catch {
          continue;
        }

        // Exact setting hits via chain tokens
        bunChainRe.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = bunChainRe.exec(text)) !== null) {
          const chain = m[0]!; // Bun.foo.bar
          // count every setting that is a prefix path equal to chain or chain itself
          if (counts.has(chain)) {
            counts.set(chain, (counts.get(chain) ?? 0) + 1);
          }
        }

        // also match bun:jsc.serialize style if code uses namespace import — rare
        for (const s of sorted) {
          if (!s.startsWith('bun:')) continue;
          // import { serialize } from "bun:jsc"
          const mod = s.slice(0, s.indexOf('.'));
          const leaf = s.slice(s.indexOf('.') + 1);
          if (!leaf || leaf.includes('.')) continue;
          const re = new RegExp(
            `import\\s*\\{[^}]*\\b${leaf}\\b[^}]*\\}\\s*from\\s*['"]${mod.replace(':', '\\:')}['"]`,
          );
          if (re.test(text)) counts.set(s, (counts.get(s) ?? 0) + 1);
          // bare serialize( after import is too noisy — skip
        }

        importFromRe.lastIndex = 0;
        while ((m = importFromRe.exec(text)) !== null) {
          const named = m[1];
          const mod = m[4]!;
          if (named) {
            for (const spec of named.split(',')) {
              const id = spec.trim().split(/\s+as\s+/)[0]!.trim();
              if (!id) continue;
              // map to Bun.id for module bun, else mod.id
              const setting = mod === 'bun' ? `Bun.${id}` : `${mod}.${id}`;
              if (counts.has(setting)) counts.set(setting, (counts.get(setting) ?? 0) + 1);
            }
          }
        }
      }
    } catch {
      continue;
    }
  }
  return counts;
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

export async function buildInventory(opts: {
  repoRoot?: string;
  countSites?: boolean;
  fullScan?: boolean;
  shallow?: boolean;
  interfaces?: boolean;
  properties?: boolean;
  typeAliases?: boolean;
  tipDiff?: boolean;
  moduleFilter?: string | null;
  kindFilter?: MemberKind[] | null;
}): Promise<InventoryResult> {
  const repoRoot = opts.repoRoot ?? REPO_ROOT;
  const shallow = opts.shallow === true;
  const interfaces = opts.interfaces !== false && !shallow;
  const properties = opts.properties !== false && !shallow;
  const typeAliases = opts.typeAliases !== false && !shallow;
  const parseOpts: ParseDtsOpts = { shallow, interfaces, properties, typeAliases };
  const types = await resolveBunTypesRoot(repoRoot);

  const files: string[] = [];
  for (const f of INVENTORY_DTS_FILES) {
    if (await pathExists(joinPath(types.root, f))) files.push(f);
  }

  const membersRaw: RawMember[] = [];
  for (const f of files) {
    const text = await readText(joinPath(types.root, f));
    membersRaw.push(
      ...parseDtsFile(text, f, {
        ...parseOpts,
        deprecatedFile: f === 'deprecated.d.ts',
      }),
    );
  }

  const byKey = new Map<string, RawMember>();
  for (const m of membersRaw) {
    const k = `${m.module}|${m.setting}|${m.kind}`;
    const prev = byKey.get(k);
    if (!prev) {
      byKey.set(k, { ...m });
      continue;
    }
    if (prev.deprecated && !m.deprecated) {
      byKey.set(k, { ...m, overloads: prev.overloads + m.overloads });
    } else {
      prev.overloads += m.overloads;
    }
  }

  let members = [...byKey.values()];

  if (opts.moduleFilter) {
    members = members.filter(m => m.module === opts.moduleFilter);
  }
  if (opts.kindFilter?.length) {
    const set = new Set(opts.kindFilter);
    members = members.filter(m => set.has(m.kind));
  }

  members.sort((a, b) => {
    if (a.module !== b.module) return a.module.localeCompare(b.module);
    if (a.depth !== b.depth) return a.depth - b.depth;
    if (a.setting !== b.setting) return a.setting.localeCompare(b.setting);
    return a.kind.localeCompare(b.kind);
  });

  const haystack = await loadAgentsMapHaystack(joinPath(repoRoot, 'AGENTS.md'));
  const scanRoots = [
    ...DEFAULT_SCAN_ROOTS,
    ...(opts.fullScan ? FULL_SCAN_EXTRA : []),
  ].map(String);

  const counted = opts.countSites !== false;
  let counts = new Map<string, number>();
  if (counted) {
    counts = await countCallSitesDeep(
      repoRoot,
      members.map(m => m.setting),
      scanRoots,
    );
  }

  const full: InventoryMember[] = members.map(m => ({
    ...m,
    agentsMap: agentsMapHits(haystack, m.setting, m.name),
    callSites: counted ? (counts.get(m.setting) ?? 0) : -1,
  }));

  const byKind: Partial<Record<MemberKind, number>> = {};
  const byModule: Record<string, number> = {};
  const byDepth: Record<string, number> = {};
  let maxDepth = 0;
  let topLevel = 0;
  let nested = 0;
  for (const m of full) {
    byKind[m.kind] = (byKind[m.kind] ?? 0) + 1;
    byModule[m.module] = (byModule[m.module] ?? 0) + 1;
    const dk = String(m.depth);
    byDepth[dk] = (byDepth[dk] ?? 0) + 1;
    if (m.depth > maxDepth) maxDepth = m.depth;
    if (m.depth === 0) topLevel++;
    else nested++;
  }

  let tipDiff: TipDiff | null = null;
  if (opts.tipDiff) {
    const tip = await resolveTipTypesRoot();
    if (tip) {
      tipDiff = await computeTipDiff(members, tip.root, tip.revision, parseOpts);
    }
  }

  return {
    schema: 'factorywager/bun-types-inventory/v3',
    generated: new Date().toISOString(),
    runtime: {
      bunVersion: Bun.version,
      bunRevision: Bun.revision,
    },
    types: {
      package: types.packageName,
      version: types.version,
      root: types.root,
      files,
    },
    mode: {
      shallow,
      interfaces,
      properties,
      typeAliases,
      counted,
      moduleFilter: opts.moduleFilter ?? null,
      kindFilter: opts.kindFilter ?? null,
    },
    scan: {
      roots: scanRoots,
      counted,
    },
    summary: {
      total: full.length,
      topLevel,
      nested,
      byKind,
      byModule,
      byDepth,
      agentsMapHits: full.filter(m => m.agentsMap).length,
      withCallSites: full.filter(m => m.callSites > 0).length,
      zeroCallSites: full.filter(m => m.callSites === 0).length,
      maxDepth,
    },
    tipDiff,
    members: full,
  };
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

function mdEscape(s: string): string {
  return s.replace(/\|/g, '\\|');
}

export function renderMarkdown(inv: InventoryResult): string {
  const lines: string[] = [];
  lines.push('# bun-types inventory (deep v3)');
  lines.push('');
  lines.push(
    'Generated from pinned **bun-types** — top-level + nested namespace/class/**interface**/**type X = {…}** methods & properties + satellite modules. Not the docs-only utils page.',
  );
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('| --- | --- |');
  lines.push(`| Schema | \`${inv.schema}\` |`);
  lines.push(`| Generated | ${inv.generated} |`);
  lines.push(`| Runtime | Bun ${inv.runtime.bunVersion} (\`${inv.runtime.bunRevision.slice(0, 8)}\`) |`);
  lines.push(`| bun-types | ${inv.types.package}@${inv.types.version} |`);
  lines.push(`| Types root | \`${inv.types.root}\` |`);
  lines.push(`| Source files | ${inv.types.files.map(f => `\`${f}\``).join(', ')} |`);
  lines.push(
    `| Mode | ${inv.mode.shallow ? 'shallow' : 'deep'}${inv.mode.interfaces ? ' · interfaces' : ''}${inv.mode.typeAliases ? ' · typeAliases' : ''}${inv.mode.properties ? ' · props' : ''}${inv.mode.moduleFilter ? ` · module=${inv.mode.moduleFilter}` : ''} |`,
  );
  lines.push(
    `| Scan roots | ${inv.scan.roots.map(r => `\`${r}/\``).join(', ')}${inv.scan.counted ? '' : ' *(counts skipped)*'} |`,
  );
  lines.push(
    `| Total members | **${inv.summary.total}** (top **${inv.summary.topLevel}** · nested **${inv.summary.nested}** · maxDepth **${inv.summary.maxDepth}**) |`,
  );
  const depthParts = Object.entries(inv.summary.byDepth)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([d, n]) => `d${d}=${n}`);
  lines.push(`| By depth | ${depthParts.join(' · ')} |`);
  const kindParts = Object.entries(inv.summary.byKind)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, n]) => `${k} ${n}`);
  lines.push(`| By kind | ${kindParts.join(' · ')} |`);
  const modParts = Object.entries(inv.summary.byModule)
    .sort((a, b) => b[1]! - a[1]!)
    .map(([k, n]) => `\`${k}\` ${n}`);
  lines.push(`| By module | ${modParts.join(' · ')} |`);
  lines.push(`| AGENTS map hits | ${inv.summary.agentsMapHits} / ${inv.summary.total} |`);
  lines.push(
    `| Call sites > 0 | ${inv.summary.withCallSites} · zero ${inv.summary.zeroCallSites} |`,
  );
  if (inv.tipDiff) {
    lines.push(
      `| Tip diff | tip \`${inv.tipDiff.tipRevision ?? '?'}\` · shared **${inv.tipDiff.shared}** · pin-only **${inv.tipDiff.pinOnly.length}** · tip-only **${inv.tipDiff.tipOnly.length}** |`,
    );
    lines.push(`| Tip root | \`${inv.tipDiff.tipRoot}\` |`);
  }
  lines.push('');
  lines.push(
    'Regenerate: `bun run bun:types-inventory:write` · check: `bun run bun:types-inventory:check` · flags: `--shallow` · `--no-interfaces` · `--no-type-aliases` · `--no-props` · `--tip-diff`',
  );
  lines.push('');

  if (inv.tipDiff && (inv.tipDiff.tipOnly.length > 0 || inv.tipDiff.pinOnly.length > 0)) {
    lines.push('## Tip vs pin');
    lines.push('');
    if (inv.tipDiff.tipOnly.length) {
      lines.push(`### Tip-only (${inv.tipDiff.tipOnly.length})`);
      lines.push('');
      for (const s of inv.tipDiff.tipOnly.slice(0, 80)) lines.push(`- \`${s}\``);
      if (inv.tipDiff.tipOnly.length > 80) lines.push(`- … +${inv.tipDiff.tipOnly.length - 80} more`);
      lines.push('');
    }
    if (inv.tipDiff.pinOnly.length) {
      lines.push(`### Pin-only (${inv.tipDiff.pinOnly.length})`);
      lines.push('');
      for (const s of inv.tipDiff.pinOnly.slice(0, 80)) lines.push(`- \`${s}\``);
      if (inv.tipDiff.pinOnly.length > 80) lines.push(`- … +${inv.tipDiff.pinOnly.length - 80} more`);
      lines.push('');
    }
  }

  const modules = [...new Set(inv.members.map(m => m.module))].sort();
  for (const mod of modules) {
    const modMembers = inv.members.filter(m => m.module === mod);
    lines.push(`## Module \`${mod}\` (${modMembers.length})`);
    lines.push('');
    const top = modMembers.filter(m => m.depth === 0);
    const nest = modMembers.filter(m => m.depth > 0);
    if (top.length) {
      lines.push(`### Top-level (${top.length})`);
      lines.push('');
      lines.push(memberTable(top));
      lines.push('');
    }
    if (nest.length) {
      lines.push(`### Nested (${nest.length})`);
      lines.push('');
      lines.push(memberTable(nest));
      lines.push('');
    }
  }

  lines.push('## Related SSOTs');
  lines.push('');
  lines.push('- Docs/canonical map: `tools/export-bun-api-index.ts` → `tools/bun-api-index.json`');
  lines.push('- Doc refs: `bun tools/bun-doc-refs.ts suggest "<api>"`');
  lines.push('- Utils proof: `bun run bun:utils-proof`');
  lines.push('- AGENTS grounded map: `AGENTS.md` § Grounded capability map');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function memberTable(members: InventoryMember[]): string {
  const rows = [
    '| Depth | Kind | Setting | Form | Default | agentsMap | callSites | Overloads | Notes | Source |',
    '| ---: | --- | --- | --- | --- | --- | ---: | ---: | --- | --- |',
  ];
  for (const m of members) {
    rows.push(
      `| ${m.depth} | ${m.kind} | \`${mdEscape(m.setting)}\`${m.deprecated ? ' *(deprecated)*' : ''} | \`${mdEscape(m.form)}\` | ${mdEscape(m.default)} | ${m.agentsMap ? 'yes' : '—'} | ${m.callSites < 0 ? '—' : m.callSites} | ${m.overloads} | ${mdEscape(m.notes)} | \`${m.source}:${m.line}\` |`,
    );
  }
  return rows.join('\n');
}

export function stableInventoryPayload(inv: InventoryResult): unknown {
  return {
    schema: inv.schema,
    mode: inv.mode,
    runtime: { bunVersion: inv.runtime.bunVersion },
    types: {
      package: inv.types.package,
      version: inv.types.version,
      files: inv.types.files,
    },
    scan: { roots: inv.scan.roots, counted: inv.scan.counted },
    summary: inv.summary,
    // tipDiff excluded from stale check (local tip moves independently)
    members: inv.members.map(m => ({
      kind: m.kind,
      name: m.name,
      parent: m.parent,
      setting: m.setting,
      module: m.module,
      depth: m.depth,
      form: m.form,
      default: m.default,
      notes: m.notes,
      source: m.source,
      line: m.line,
      deprecated: m.deprecated,
      overloads: m.overloads,
      agentsMap: m.agentsMap,
      callSites: m.callSites,
    })),
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseCli(argv: string[]) {
  let moduleFilter: string | null = null;
  let kindFilter: MemberKind[] | null = null;
  for (const a of argv) {
    if (a.startsWith('--module=')) moduleFilter = a.slice('--module='.length) || null;
    if (a.startsWith('--kind=')) {
      kindFilter = a
        .slice('--kind='.length)
        .split(',')
        .map(s => s.trim())
        .filter(Boolean) as MemberKind[];
    }
  }
  return {
    write: argv.includes('--write'),
    check: argv.includes('--check'),
    json: argv.includes('--json'),
    noCounts: argv.includes('--no-counts'),
    fullScan: argv.includes('--full-scan'),
    shallow: argv.includes('--shallow'),
    noInterfaces: argv.includes('--no-interfaces'),
    noProps: argv.includes('--no-props'),
    noTypeAliases: argv.includes('--no-type-aliases'),
    tipDiff: argv.includes('--tip-diff'),
    moduleFilter,
    kindFilter,
    help: argv.includes('--help') || argv.includes('-h'),
  };
}

function printHelp(): void {
  console.log(`bun-types-inventory — deep Bun types surface from bun-types (v3)

Usage:
  bun tools/bun-types-inventory.ts [options]

  --write           Write tools/bun-types-inventory.json + .md
  --check           Exit 1 if committed JSON stable payload differs
  --json            Print full inventory JSON
  --no-counts       Skip repo call-site walk
  --full-scan       Also scan packages/ and projects/
  --shallow         Top-level only
  --no-interfaces   Do not open interface bodies
  --no-type-aliases Do not open type X = { … } object aliases
  --no-props        Skip name: Type properties inside class/interface/type
  --tip-diff        Compare pin vs ~/bun/packages/bun-types (or BUN_TYPES_TIP)
  --module=ID       Filter e.g. bun · bun:jsc · bun:test
  --kind=a,b        function,method,class,namespace,const,var,interface,type,property
  -h, --help
`);
}

async function main(): Promise<void> {
  const args = parseCli(Bun.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const inv = await buildInventory({
    countSites: !args.noCounts,
    fullScan: args.fullScan,
    shallow: args.shallow,
    interfaces: !args.noInterfaces,
    properties: !args.noProps,
    typeAliases: !args.noTypeAliases,
    tipDiff: args.tipDiff,
    moduleFilter: args.moduleFilter,
    kindFilter: args.kindFilter,
  });

  if (args.json) {
    process.stdout.write(`${JSON.stringify(inv, null, 2)}\n`);
  } else {
    console.log(
      `bun-types ${inv.types.package}@${inv.types.version} · runtime ${inv.runtime.bunVersion} · ${inv.summary.total} members (top ${inv.summary.topLevel} · nested ${inv.summary.nested} · maxDepth ${inv.summary.maxDepth})`,
    );
    console.log(`root: ${inv.types.root}`);
    console.log(
      `mode: ${inv.mode.shallow ? 'shallow' : 'deep'}${inv.mode.interfaces ? '+iface' : ''}${inv.mode.typeAliases ? '+type' : ''}${inv.mode.properties ? '+props' : ''}`,
    );
    console.log(
      `modules: ${Object.entries(inv.summary.byModule)
        .map(([k, n]) => `${k}=${n}`)
        .join(' · ')}`,
    );
    console.log(
      `depth: ${Object.entries(inv.summary.byDepth)
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([d, n]) => `d${d}=${n}`)
        .join(' · ')}`,
    );
    console.log(
      `agentsMap ${inv.summary.agentsMapHits}/${inv.summary.total} · callSites>0 ${inv.summary.withCallSites} · zero ${inv.summary.zeroCallSites}`,
    );
    if (inv.tipDiff) {
      console.log(
        `tipDiff: shared ${inv.tipDiff.shared} · pin-only ${inv.tipDiff.pinOnly.length} · tip-only ${inv.tipDiff.tipOnly.length} (${inv.tipDiff.tipRevision ?? '?'})`,
      );
    }
    // Prefer high-signal nested API methods for TTY preview
    const apiNested = inv.members.filter(
      m =>
        m.depth > 0 &&
        (m.kind === 'method' || m.kind === 'function') &&
        (m.setting.includes('Server') ||
          m.setting.includes('inspect') ||
          m.setting.includes('peek') ||
          m.setting.includes('semver') ||
          m.setting.includes('dns') ||
          m.setting.includes('SQL') ||
          m.setting.includes('Glob') ||
          m.setting.includes('Terminal')),
    );
    const preview = inv.mode.shallow
      ? inv.members
      : [
          ...inv.members.filter(m => m.depth === 0 && m.module === 'bun' && m.kind !== 'interface' && m.kind !== 'type').slice(0, 50),
          ...apiNested.slice(0, 40),
          ...inv.members.filter(m => m.module !== 'bun' && m.depth === 0).slice(0, 25),
        ];
    logTable(
      preview.map(m => ({
        d: String(m.depth),
        kind: m.kind,
        setting: m.setting,
        agentsMap: m.agentsMap ? 'yes' : '',
        callSites: m.callSites < 0 ? '—' : String(m.callSites),
        notes: m.notes.slice(0, 48),
      })),
      ['d', 'kind', 'setting', 'agentsMap', 'callSites', 'notes'],
      { colors: true },
    );
    if (!inv.mode.shallow && inv.members.length > preview.length) {
      console.log(`… ${inv.members.length - preview.length} more rows (see --write MD/JSON)`);
    }
  }

  if (args.write) {
    await Bun.write(OUT_JSON, `${JSON.stringify(inv, null, 2)}\n`);
    await Bun.write(OUT_MD, renderMarkdown(inv));
    if (!args.json) {
      console.log(`\nwrote ${OUT_JSON}`);
      console.log(`wrote ${OUT_MD}`);
    }
  }

  if (args.check) {
    if (!(await pathExists(OUT_JSON))) {
      console.error(`❌ missing ${OUT_JSON} — run bun run bun:types-inventory:write`);
      process.exit(1);
    }
    const committed = (await Bun.file(OUT_JSON).json()) as InventoryResult;
    const a = JSON.stringify(stableInventoryPayload(inv));
    const b = JSON.stringify(stableInventoryPayload(committed));
    if (a !== b) {
      console.error('❌ bun-types-inventory.json is stale vs bun-types + repo usage');
      console.error('   fix: bun run bun:types-inventory:write');
      const cur = new Set(inv.members.map(m => m.setting));
      const old = new Set(committed.members.map(m => m.setting));
      for (const k of cur) if (!old.has(k)) console.error(`  + ${k}`);
      for (const k of old) if (!cur.has(k)) console.error(`  - ${k}`);
      process.exit(1);
    }
    if (!args.json) console.log('✓ bun-types-inventory.json up to date');
  }
}

if (import.meta.main) {
  await main();
}

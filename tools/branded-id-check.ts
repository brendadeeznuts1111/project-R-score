#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/runtime/glob — Bun.Glob
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// @see https://bun.com/reference/bun/argv — Bun.argv
/**
 * branded-id-check.ts — detector for unbranded ID declarations.
 *
 * Flags TypeScript declarations shaped like `id: string` / `userId?: string`
 * **including mid-line function parameters** (`function f(sessionId: string)`)
 * that must use branded ID types from lib/types/branded.ts.
 *
 * Agents: domain *Id types MUST be brands after the wire boundary.
 * Pre-commit runs `--staged --strict` (no baseline) + `--smart --strict`
 * (baseline may grandfather pre-ratchet mid-line hits only).
 *
 * Usage:
 *   bun tools/branded-id-check.ts [paths...]   # report by directory (exit 0)
 *   bun tools/branded-id-check.ts --smart      # role + structure clusters
 *   bun tools/branded-id-check.ts --smart --json
 *   bun tools/branded-id-check.ts --smart --quiet  # one-line success / full on fail
 *   bun tools/branded-id-check.ts --strict     # exit 1 on actionable hits
 *                                              #   (--smart also rejects stale baseline rows)
 *   bun tools/branded-id-check.ts --staged     # ADDED lines only (agents)
 *   bun tools/branded-id-check.ts --write-baseline  # refresh grandfather list
 *
 * Suppression: end a declaration line with `// brand-ok` to skip it
 * (for IDs that are genuinely opaque passthroughs). Bare `id`/`_id` DTOs
 * MUST be explicitly suppressed — the detector no longer auto-suppresses them.
 * Brand foundation: lib/types/branded.ts · institutional record: brand-manifest.json
 * Baseline: tools/branded-id-baseline.json (legacy mid-line only; staged ignores it)
 */

import { isModuleEntrypoint } from '../lib/bun-executable.ts';

// ID-shaped field names: exact `id`, *Id/*ID, *_id. Not guid/valid/correlationIdHeader.
const ID_FIELD_NAME = String.raw`(id|[a-zA-Z]+(?:Id|ID)|[a-zA-Z_]*_id)`;
/** Line-leading property / param-alone lines (historical pattern). */
const ID_DECL = new RegExp(String.raw`^\s*(?:readonly\s+)?${ID_FIELD_NAME}\??:\s*string\b`);
/**
 * Anywhere on the line — catches `function f(sessionId: string)`, nested types,
 * and multi-param signatures. Negative lookbehind avoids `fooSessionId` false starts.
 */
const ID_DECL_ANYWHERE = new RegExp(String.raw`(?<![\w$.])${ID_FIELD_NAME}\??:\s*string\b`, 'g');
const SKIP_FILE =
  /lib\/types\/branded(\.ts|\/)|lib\/types\/brand-manifest\.json$|branded-id-baseline\.json$/;
const SKIP_LINE = /brand-ok/;
const BASELINE_URL = new URL('./branded-id-baseline.json', import.meta.url);

/** High-trust boundary layers — bare `id` still flags here. */
const HIGH_TRUST_PATH =
  /(?:^|\/)(lib\/security|lib\/core|lib\/mcp|lib\/registry|lib\/auth)(?:\/|$)/;

/** Type / interface names that behave as domain ingress even as properties. */
const INGRESS_TYPE_NAME =
  /(?:Request|Context|Input|Args|Params|Options|Config|Command|Handler|Envelope)$/;

/**
 * Domains whose brands are credential/zone material (highest risk if plain string).
 * Drawn from brand-manifest.json domain tags when present.
 */
const AUTH_DOMAINS = new Set(['identity', 'documents']);

/** Wire-only third-party fields — not our domain brands (auto new-brand → suppress-ish). */
const WIRE_OPAQUE_FIELDS = new Set(['legacy_id', 'legacyId']);

type Role = 'auth-credential' | 'named-domain' | 'new-brand' | 'opaque-pk' | 'ambiguous';

type ManifestBrand = {
  name: string;
  domain: string;
  tiers: string[];
  mint: string[];
  description: string;
};

type ManifestFile = {
  brandCount: number;
  brands: ManifestBrand[];
};

/** Pascal brand name → field aliases (sessionId, SessionId, session_id). */
function fieldAliasesForBrand(brandName: string): string[] {
  const suffix = (['Id', 'Key', 'Code'] as const).find(candidate => brandName.endsWith(candidate));
  const base = suffix ? brandName.slice(0, -suffix.length) : brandName;
  const fieldSuffix = suffix ?? '';
  const camel = base.charAt(0).toLowerCase() + base.slice(1) + fieldSuffix;
  const snakeBase = base.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
  const snake = `${snakeBase}${fieldSuffix ? `_${fieldSuffix.toLowerCase()}` : ''}`;
  return [...new Set([brandName, camel, snake])];
}

type FieldMaps = {
  auth: Set<string>;
  named: Set<string>;
  /** brand name by field alias */
  brandByField: Map<string, string>;
  loadedFromManifest: boolean;
};

async function loadFieldMapsFromManifest(): Promise<FieldMaps> {
  const path = new URL('../lib/types/brand-manifest.json', import.meta.url).pathname;
  const auth = new Set<string>();
  const named = new Set<string>();
  const brandByField = new Map<string, string>();

  try {
    const raw = await Bun.file(path).text();
    const manifest = JSON.parse(raw) as ManifestFile;
    for (const b of manifest.brands ?? []) {
      const aliases = fieldAliasesForBrand(b.name);
      // ZoneId is documents domain but auth-credential risk (CF wire)
      const isAuth =
        AUTH_DOMAINS.has(b.domain) &&
        /AccountId|AccessKeyId|ZoneId|TokenId|IdentityId/.test(b.name);
      for (const a of aliases) {
        brandByField.set(a, b.name);
        if (isAuth) auth.add(a);
        else named.add(a);
      }
    }
    return { auth, named, brandByField, loadedFromManifest: true };
  } catch {
    // Fallback if manifest missing — empty sets; unknown *Id still new-brand
    return { auth, named, brandByField, loadedFromManifest: false };
  }
}

let FIELD_MAPS: FieldMaps | null = null;

async function fieldMaps(): Promise<FieldMaps> {
  if (!FIELD_MAPS) FIELD_MAPS = await loadFieldMapsFromManifest();
  return FIELD_MAPS;
}

type StructuralKind =
  | 'function-param'
  | 'ingress-type-property'
  | 'dto-property'
  | 'object-literal'
  | 'unknown';

type Hit = {
  file: string;
  line: number;
  text: string;
  field: string;
  role: Role;
  structural: StructuralKind;
  /** True when detector auto-suppresses (not an actionable domain ingress). */
  suppressed: boolean;
  brandHint: string | null;
  reason: string;
};

type Violation = { file: string; line: number; text: string };

function relPath(file: string): string {
  return file.replace(/^.*?(?=lib\/|scripts\/|tools\/|tests\/|dashboard\/)/, '') || file;
}

function extractField(line: string): string | null {
  const fields = extractFields(line);
  return fields[0] ?? null;
}

/** Doc/comment lines — example prose like `sessionId: string` is not a declaration. */
function isCommentOrDocLine(line: string): boolean {
  const t = line.trim();
  return (
    t.startsWith('//') ||
    t.startsWith('*') ||
    t.startsWith('/*') ||
    t.startsWith('*/') ||
    t.startsWith('·') // box-drawing in usage banners
  );
}

/** Prettier may move a trailing `// brand-ok` to its own line after a long signature. */
function nextLineIsBrandOk(lines: string[], index: number): boolean {
  for (let i = index + 1; i < lines.length && i <= index + 2; i++) {
    const t = lines[i]!.trim();
    if (t === '') continue;
    return /^\/\/\s*brand-ok\b/.test(t);
  }
  return false;
}

/** All ID-shaped `…: string` bindings on a line (params + properties). */
function extractFields(line: string): string[] {
  if (isCommentOrDocLine(line)) return [];
  // Strip trailing line comments so `foo: string // note` still matches code,
  // but `"sessionId: string"` in a pure string literal on RHS is rare enough.
  const out: string[] = [];
  ID_DECL_ANYWHERE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ID_DECL_ANYWHERE.exec(line)) !== null) {
    if (m[1]) out.push(m[1]);
  }
  return out;
}

type BaselineFile = {
  version: 1;
  generatedAt: string;
  note: string;
  /** Keys: file \\t field \\t trimmed line text */
  keys: string[];
};

function baselineKey(file: string, field: string, text: string): string {
  return `${file}\t${field}\t${text.trim()}`;
}

/** Baseline rows must disappear as soon as their legacy declaration disappears. */
export function findStaleBaselineKeys(
  baselineKeys: ReadonlySet<string>,
  liveActionableKeys: ReadonlySet<string>
): string[] {
  return [...baselineKeys].filter(key => !liveActionableKeys.has(key)).sort();
}

function actionableBaselineKeys(hits: readonly Hit[]): Set<string> {
  return new Set(
    hits.filter(hit => !hit.suppressed).map(hit => baselineKey(hit.file, hit.field, hit.text))
  );
}

async function loadBaselineKeys(): Promise<Set<string>> {
  try {
    const raw = await Bun.file(BASELINE_URL).text();
    const data = JSON.parse(raw) as BaselineFile;
    return new Set(data.keys ?? []);
  } catch {
    return new Set();
  }
}

function applyBaseline(hits: Hit[], baseline: Set<string>): Hit[] {
  if (baseline.size === 0) return hits;
  return hits.map(h => {
    if (h.suppressed) return h;
    const key = baselineKey(h.file, h.field, h.text);
    if (!baseline.has(key)) return h;
    return {
      ...h,
      suppressed: true,
      reason: 'legacy baseline (grandfathered; new code must brand — staged ignores baseline)',
    };
  });
}

function isOpaquePrimaryKey(field: string): boolean {
  return field === 'id' || field === '_id' || field === 'ID';
}

function fieldRole(field: string, maps: FieldMaps): Role {
  if (isOpaquePrimaryKey(field)) return 'opaque-pk';
  if (WIRE_OPAQUE_FIELDS.has(field)) return 'opaque-pk';
  if (maps.auth.has(field)) return 'auth-credential';
  if (maps.named.has(field)) return 'named-domain';
  // Unknown *Id / *_id shape — candidate for a new brand not yet in manifest
  if (/Id$|ID$|_id$/.test(field)) return 'new-brand';
  return 'ambiguous';
}

function brandHintFor(field: string, role: Role, maps: FieldMaps): string | null {
  if (role === 'opaque-pk') return null;
  const fromManifest = maps.brandByField.get(field);
  if (fromManifest) return fromManifest;
  // Normalize snake / camel to Pascal brand name
  const camel = field.includes('_')
    ? field
        .split('_')
        .filter(Boolean)
        .map((p, i) => (i === 0 ? p : p.charAt(0).toUpperCase() + p.slice(1)))
        .join('')
    : field;
  const pascal = camel.charAt(0).toUpperCase() + camel.slice(1);
  // Ensure Id suffix
  if (/Id$/i.test(pascal)) return pascal.replace(/ID$/, 'Id');
  return `${pascal}Id`;
}

/**
 * Walk upward from a hit line to classify structural context.
 * Lightweight (no full AST) — good enough for migration triage.
 */
function classifyStructure(lines: string[], hitIndex: number): StructuralKind {
  const hit = lines[hitIndex] ?? '';
  // Function / method parameter: field appears mid-signature before `) {` / `):`
  // e.g. `export function foo(sessionId: string, …)` or `  sessionId: string,`
  const trimmed = hit.trim();
  const looksLikeParam =
    /,\s*$/.test(trimmed) ||
    /\)\s*[:{]/.test(trimmed) ||
    (/\(\s*$/.test(trimmed) === false &&
      /^\s*(?:readonly\s+)?(?:id|[a-zA-Z]+(?:Id|ID)|[a-zA-Z_]*_id)\??:\s*string\b/.test(hit) &&
      /,\s*$|\)\s*(?::|\{|=>)/.test(hit));

  // Scan upward for type/interface/class/function openers
  let depthBrace = 0;
  let depthParen = 0;
  let nearestType: { kind: 'interface' | 'type' | 'class'; name: string } | null = null;
  let nearestFn = false;
  let nearestObjectLiteral = false;

  for (let i = hitIndex; i >= Math.max(0, hitIndex - 80); i--) {
    const ln = lines[i] ?? '';
    // Rough paren/brace balance walking upward (inverted)
    for (let c = ln.length - 1; c >= 0; c--) {
      const ch = ln[c];
      if (ch === ')') depthParen++;
      else if (ch === '(') depthParen--;
      else if (ch === '}') depthBrace++;
      else if (ch === '{') depthBrace--;
    }

    const iface = ln.match(/^\s*(?:export\s+)?(?:interface|type)\s+([A-Za-z0-9_]+)/);
    if (iface && depthBrace <= 0) {
      nearestType = {
        kind: ln.includes('interface') ? 'interface' : 'type',
        name: iface[1]!,
      };
      break;
    }
    const cls = ln.match(/^\s*(?:export\s+)?class\s+([A-Za-z0-9_]+)/);
    if (cls && depthBrace <= 0) {
      nearestType = { kind: 'class', name: cls[1]! };
      break;
    }
    if (
      /^\s*(?:export\s+)?(?:async\s+)?function\s/.test(ln) ||
      /^\s*(?:export\s+)?(?:const|let)\s+\w+\s*=\s*(?:async\s*)?\(/.test(ln) ||
      /^\s*(?:public|private|protected|readonly|async)?\s*\w+\s*\(/.test(ln)
    ) {
      // Only if we are still inside parens of that function
      if (depthParen > 0 || looksLikeParam) {
        nearestFn = true;
        break;
      }
    }
    // Object literal assignment: `const x = {` or `return {`
    if (
      /(?:=\s*\{|\breturn\s*\{|\(\s*\{)\s*$/.test(ln.trim()) ||
      /(?:=\s*\{|\breturn\s*\{)/.test(ln)
    ) {
      if (depthBrace >= 0 && !nearestType) {
        nearestObjectLiteral = true;
        // keep scanning for stronger type/fn signals
      }
    }
  }

  // Same-line function signature: `function f(sessionId: string)`
  if (
    /function\s+\w+\s*\(/.test(hit) ||
    /=\s*(?:async\s*)?\([^)]*(?:id|[A-Za-z]+Id|_id)\??:\s*string/.test(hit)
  ) {
    return 'function-param';
  }

  // Multi-line param: previous non-empty lines open a `(` without closing
  if (looksLikeParam || nearestFn) {
    // Prefer function-param when we see trailing comma / close paren
    if (/,\s*$|\)\s*(?::|\{|=>)/.test(trimmed) || nearestFn) {
      // But if clearly inside a type body, prefer type property
      if (nearestType && depthBrace < 0) {
        // still inside type braces from type open
      } else if (nearestFn || /,\s*$|\)\s*(?::|\{|=>)/.test(trimmed)) {
        // Check we're not inside interface (properties also use trailing commas)
        if (nearestType && !nearestFn) {
          // fall through to type handling
        } else {
          return 'function-param';
        }
      }
    }
  }

  if (nearestType) {
    if (INGRESS_TYPE_NAME.test(nearestType.name)) {
      return 'ingress-type-property';
    }
    return 'dto-property';
  }

  if (nearestObjectLiteral) return 'object-literal';
  if (looksLikeParam) return 'function-param';
  return 'unknown';
}

function classifyHit(
  file: string,
  lineNo: number,
  text: string,
  field: string,
  structural: StructuralKind,
  maps: FieldMaps
): Hit {
  const role = fieldRole(field, maps);
  const brandHint = brandHintFor(field, role, maps);
  const highTrust = HIGH_TRUST_PATH.test(relPath(file));
  let suppressed = false;
  let reason = '';

  // Dual-typed boundary input ports: `accountId?: string | AccountId`.
  // Why suppress: raw env/config until try*/normalize — not a forgotten brand.
  if (
    /:\s*string\s*\|\s*[A-Za-z][A-Za-z0-9_]*Id\b/.test(text) ||
    /:\s*[A-Za-z][A-Za-z0-9_]*Id\s*\|\s*string\b/.test(text)
  ) {
    return {
      file: relPath(file),
      line: lineNo,
      text: text.trim(),
      field,
      role,
      structural,
      suppressed: true,
      brandHint,
      reason: 'dual string|Brand input port (normalize with try*/as*)',
    };
  }

  if (role === 'opaque-pk') {
    // No silent auto-suppression. Every bare `id`/`_id` must be branded or
    // explicitly suppressed with `// brand-ok` (SKIP_LINE handles that).
    suppressed = false;
    reason = 'opaque primary key — must brand or explicitly suppress with // brand-ok';
  } else if (role === 'auth-credential') {
    suppressed = false;
    reason = 'auth/credential ID — always flag';
  } else if (role === 'named-domain' || role === 'new-brand') {
    if (structural === 'dto-property' && role === 'named-domain') {
      // Wire/DTO properties: still flag named domain IDs (they should brand
      // when they are domain fields), but note DTO context for reviewers.
      suppressed = false;
      reason = 'named domain ID on DTO property (prefer brand type on the field)';
    } else if (structural === 'function-param' || structural === 'ingress-type-property') {
      suppressed = false;
      reason = 'domain ingress (function param or *Request/*Context field)';
    } else {
      suppressed = false;
      reason = role === 'new-brand' ? 'new-brand candidate field' : 'named domain ID occurrence';
    }
  } else {
    suppressed = false;
    reason = 'ambiguous ID shape';
  }

  return {
    file: relPath(file),
    line: lineNo,
    text: text.trim(),
    field,
    role,
    structural,
    suppressed,
    brandHint,
    reason,
  };
}

/**
 * Violations in added lines of the staged diff (hunk-aware).
 * **No baseline** — agents cannot introduce new bare-string domain IDs.
 * Catches mid-line function params (`sessionId: string`) as well as properties.
 */
async function stagedViolations(): Promise<Violation[]> {
  const maps = await fieldMaps();
  const proc = Bun.spawn(['git', 'diff', '--cached', '-U0', '--diff-filter=ACM', '--', '*.ts'], {
    stdout: 'pipe',
  });
  const diff = await new Response(proc.stdout).text();
  const diffLines = diff.split('\n');
  const violations: Violation[] = [];
  let file = '';
  let newLine = 0;

  /** Prettier may wrap a trailing `// brand-ok` to the next added line; honor it. */
  function addedLineHasBrandOkNext(index: number): boolean {
    for (let j = index + 1; j < diffLines.length; j++) {
      const peek = diffLines[j]!;
      if (peek.startsWith('+') && /^\+\s*\/\/\s*brand-ok\b/.test(peek)) return true;
      if (peek.startsWith('+') || peek.startsWith('-')) return false;
      if (peek.startsWith(' ') || peek.startsWith('\\')) continue;
      if (peek.trim() === '') continue;
      return false;
    }
    return false;
  }

  for (let idx = 0; idx < diffLines.length; idx++) {
    const raw = diffLines[idx]!;
    if (raw.startsWith('+++ b/')) {
      file = raw.slice(6);
      continue;
    }
    const hunk = raw.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) {
      newLine = Number(hunk[1]) - 1;
      continue;
    }
    if (raw.startsWith('+') && !raw.startsWith('+++')) {
      newLine++;
      const line = raw.slice(1);
      if (SKIP_FILE.test(file) || SKIP_LINE.test(line)) {
        continue;
      }
      if (addedLineHasBrandOkNext(idx)) continue;
      const fields = extractFields(line);
      if (fields.length === 0) continue;
      // Single-line structural hint (staged has no full file context)
      const structural: StructuralKind = /function\s|\(.*\)\s*[:{]|,\s*$|\)\s*(?::|\{|=>)/.test(
        line.trim()
      )
        ? 'function-param'
        : 'unknown';
      for (const field of fields) {
        const hit = classifyHit(file, newLine, line, field, structural, maps);
        if (hit.suppressed) continue;
        violations.push({
          file,
          line: newLine,
          text: `${line.trim()}  ← ${field}${hit.brandHint ? ` → use ${hit.brandHint}` : ''}`,
        });
      }
      continue;
    }
    if (raw.startsWith('-')) continue; // deleted line: not counted
    if (raw.startsWith(' ') || raw.startsWith('\\')) newLine++; // context (U0: rare)
  }
  return violations;
}

async function collectFiles(args: string[]): Promise<string[]> {
  const paths = args.filter(a => !a.startsWith('--'));
  // The repository-wide smart gate governs committed source. Untracked files
  // are handled by the staged no-baseline gate when an author proposes them;
  // scanning every local prototype here lets an unrelated worktree lane block
  // otherwise independent commits.
  if (paths.length === 0) {
    const proc = Bun.spawn(['git', 'ls-files', '-z', '--', 'lib/**/*.ts', 'lib/*.ts'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const output = await new Response(proc.stdout).text();
    const code = await proc.exited;
    if (code !== 0) throw new Error('git ls-files failed while collecting branded-ID sources');
    return output
      .split('\0')
      .map(file => file.trim())
      .filter(file => file.endsWith('.ts'));
  }

  const roots = paths;
  const files: string[] = [];
  for (const root of roots) {
    const stat = await Bun.file(root)
      .stat()
      .catch(() => null);
    if (stat?.isDirectory()) {
      const glob = new Bun.Glob('**/*.ts');
      for await (const f of glob.scan({ cwd: root, absolute: true })) files.push(f);
    } else if (root.endsWith('.ts')) {
      files.push(root);
    }
  }
  return files;
}

async function scanAll(files: string[]): Promise<Hit[]> {
  const maps = await fieldMaps();
  const hits: Hit[] = [];
  for (const file of files) {
    if (SKIP_FILE.test(file)) continue;
    const text = await Bun.file(file).text();
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      if (SKIP_LINE.test(line)) continue;
      // Prettier sometimes wraps a trailing `// brand-ok` to the next line
      // when the signature exceeds printWidth; honor that suppression.
      if (nextLineIsBrandOk(lines, i)) continue;
      const fields = extractFields(line);
      if (fields.length === 0) continue;
      const structural = classifyStructure(lines, i);
      for (const field of fields) {
        hits.push(classifyHit(file, i + 1, line, field, structural, maps));
      }
    }
  }
  return hits;
}

async function writeBaselineFile(files: string[]): Promise<void> {
  const hits = await scanAll(files);
  // Grandfather only hits that would fail --smart --strict today (actionable).
  const actionable = hits.filter(h => !h.suppressed);
  const keys = [...new Set(actionable.map(h => baselineKey(h.file, h.field, h.text)))].sort();
  const payload: BaselineFile = {
    version: 1,
    generatedAt: new Date().toISOString(),
    note:
      'Legacy unbranded ID surfaces grandfathered when mid-line param detection was enabled. ' +
      'Staged commits never use this baseline — new bare-string domain IDs always fail. ' +
      'Remove entries as you migrate to brands (as*/try*/parse*). ' +
      'Regenerate: bun tools/branded-id-check.ts --write-baseline',
    keys,
  };
  await Bun.write(BASELINE_URL, `${JSON.stringify(payload, null, 2)}\n`);
  console.info(
    `✅ wrote ${keys.length} baseline keys → tools/branded-id-baseline.json\n` +
      `   (staged gate still blocks any NEW bare-string domain ID)`
  );
}

async function printSmartReport(
  hits: Hit[],
  asJson: boolean,
  quiet = false,
  staleBaselineKeys: readonly string[] = []
): Promise<void> {
  const maps = await fieldMaps();
  const actionable = hits.filter(h => !h.suppressed);
  const suppressed = hits.filter(h => h.suppressed);

  if (quiet && !asJson && actionable.length === 0 && staleBaselineKeys.length === 0) {
    console.info(
      `✅ brands-smart (${hits.length} hits, 0 actionable, ${suppressed.length} suppressed)`
    );
    return;
  }

  if (asJson) {
    process.stdout.write(
      `${JSON.stringify(
        {
          total: hits.length,
          actionable: actionable.length,
          autoSuppressed: suppressed.length,
          staleBaselineKeys,
          manifestLoaded: maps.loadedFromManifest,
          byRole: Object.fromEntries(
            (
              ['auth-credential', 'named-domain', 'new-brand', 'opaque-pk', 'ambiguous'] as Role[]
            ).map(role => [
              role,
              {
                total: hits.filter(h => h.role === role).length,
                actionable: actionable.filter(h => h.role === role).length,
                suppressed: suppressed.filter(h => h.role === role).length,
              },
            ])
          ),
          hits: actionable,
          suppressedSample: suppressed.slice(0, 20),
        },
        null,
        2
      )}\n`
    );
    return;
  }

  const legacy = suppressed.filter(h => h.reason.startsWith('legacy baseline')).length;
  console.info(
    `\n🧠 branded-id-check --smart` +
      `${maps.loadedFromManifest ? ' (manifest-driven)' : ' (manifest missing — weak field maps)'}\n` +
      `${hits.length} total hits → ${actionable.length} actionable ` +
      `(${suppressed.length} suppressed` +
      `${legacy > 0 ? `, ${legacy} legacy-baseline` : ''})\n` +
      `  AGENTS: new domain *Id fields MUST use brands (as*/try*/parse*) — staged gate has no baseline.\n`
  );

  if (staleBaselineKeys.length > 0) {
    console.info(`\n  stale baseline keys (${staleBaselineKeys.length}):`);
    for (const key of staleBaselineKeys) console.info(`    ${key}`);
    console.info('  repair: bun run brand:baseline');
  }

  const roles: Role[] = ['auth-credential', 'named-domain', 'new-brand', 'opaque-pk', 'ambiguous'];
  for (const role of roles) {
    const all = hits.filter(h => h.role === role);
    const act = actionable.filter(h => h.role === role);
    const sup = suppressed.filter(h => h.role === role);
    if (all.length === 0) continue;
    const tag = `[${role}]`.padEnd(18);
    // Opaque-pk is no longer auto-suppressed; all instances are actionable.
    if (role === 'opaque-pk' && act.length === 0 && sup.length > 0) {
      console.info(
        `${tag} ${String(sup.length).padStart(3)} — suppressed by // brand-ok or baseline`
      );
      continue;
    }
    // Directory rollup for actionable
    const byDir = new Map<string, number>();
    for (const h of act) {
      const dir = h.file.split('/').slice(0, 2).join('/');
      byDir.set(dir, (byDir.get(dir) ?? 0) + 1);
    }
    const dirs = [...byDir.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([d, n]) => `${d}(${n})`)
      .join(', ');
    const extra = sup.length > 0 && act.length > 0 ? ` · ${sup.length} suppressed` : '';
    console.info(`${tag} ${String(act.length).padStart(3)} → ${dirs || '(none)'}${extra}`);
  }

  // New-brand field frequency
  const newBrandFields = new Map<string, number>();
  for (const h of actionable.filter(h => h.role === 'new-brand')) {
    newBrandFields.set(h.field, (newBrandFields.get(h.field) ?? 0) + 1);
  }
  if (newBrandFields.size > 0) {
    console.info(`\n  new-brand field breakdown:`);
    for (const [f, n] of [...newBrandFields.entries()].sort((a, b) => b[1] - a[1])) {
      const hint = brandHintFor(f, 'new-brand', maps);
      console.info(`    ${String(n).padStart(3)}  ${f}${hint ? ` → ${hint}` : ''}`);
    }
  }

  // Auth + named actionable detail (top 40)
  const priority = actionable
    .filter(h => h.role === 'auth-credential' || h.role === 'named-domain')
    .slice(0, 40);
  if (priority.length > 0) {
    console.info(`\n  top actionable (auth + named-domain):`);
    for (const h of priority) {
      console.info(
        `    ${h.file}:${h.line}  ${h.field}  [${h.structural}]` +
          (h.brandHint ? ` → ${h.brandHint}` : '')
      );
    }
    if (
      actionable.filter(h => h.role === 'auth-credential' || h.role === 'named-domain').length > 40
    ) {
      console.info(`    …`);
    }
  }

  console.info(
    `\n  brands: lib/types/branded.ts · manifest: lib/types/brand-manifest.json\n` +
      `  catalog: bun tools/brand-catalog.ts [domain|brand]\n` +
      `  baseline: tools/branded-id-baseline.json (legacy only; staged ignores)\n` +
      `  gate: bun run check:brands  ·  agents: MUST brand domain *Id (no bare string)\n` +
      `  strict (actionable + baseline freshness): bun tools/branded-id-check.ts --smart --strict\n`
  );
}

async function main(): Promise<void> {
  const args = Bun.argv.slice(2);
  const strict = args.includes('--strict');
  const smart = args.includes('--smart');
  const asJson = args.includes('--json');
  const quiet = args.includes('--quiet');
  const writeBaseline = args.includes('--write-baseline');

  // Staged mode: hunk-aware — only ADDED lines are judged, so legacy
  // violations elsewhere in a touched file never block the commit.
  // Baseline does NOT apply — agents cannot add new bare-string domain IDs.
  if (args.includes('--staged')) {
    const violations = await stagedViolations();
    if (violations.length === 0) {
      console.info('✅ no new unbranded ID declarations in staged changes');
      return;
    }
    for (const v of violations) console.info(`  ${v.file}:${v.line}: ${v.text}`);
    console.info(
      `\n❌ ${violations.length} new unbranded ID declaration(s) in staged changes\n` +
        '   → REQUIRED: use brands from lib/types/branded.ts (as*/try*/parse*)\n' +
        '   → catalog: bun tools/brand-catalog.ts [SessionId|UserId|…]\n' +
        '   → intentional opaque only: end line with // brand-ok\n' +
        '   → triage: bun tools/branded-id-check.ts --smart'
    );
    if (strict) process.exit(1);
    return;
  }

  const files = await collectFiles(args);

  if (writeBaseline) {
    await writeBaselineFile(files);
    return;
  }

  if (smart) {
    const baseline = await loadBaselineKeys();
    const rawHits = await scanAll(files);
    const isRepoWideScan = !args.some(arg => !arg.startsWith('--'));
    const staleBaselineKeys = isRepoWideScan
      ? findStaleBaselineKeys(baseline, actionableBaselineKeys(rawHits))
      : [];
    const hits = applyBaseline(rawHits, baseline);
    await printSmartReport(hits, asJson, quiet, staleBaselineKeys);
    const actionable = hits.filter(h => !h.suppressed).length;
    if (strict && (actionable > 0 || staleBaselineKeys.length > 0)) process.exit(1);
    return;
  }

  // Legacy directory rollup (mid-line + line-leading)
  const perDir = new Map<string, number>();
  let total = 0;
  for (const file of files) {
    if (SKIP_FILE.test(file)) continue;
    const text = await Bun.file(file).text();
    const lines = text.split('\n');
    let fileCount = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      if (SKIP_LINE.test(line)) continue;
      const n = extractFields(line).length;
      if (n > 0) {
        fileCount += n;
        total += n;
      }
    }
    if (fileCount > 0) {
      const rel = relPath(file);
      const dir = rel.split('/').slice(0, 2).join('/');
      perDir.set(dir, (perDir.get(dir) ?? 0) + fileCount);
      if (strict || files.length <= 20) {
        for (let i = 0; i < lines.length; i++) {
          if (SKIP_LINE.test(lines[i]!)) continue;
          for (const field of extractFields(lines[i]!)) {
            console.info(`  ${file}:${i + 1}: ${field} ← ${lines[i]!.trim()}`);
          }
        }
      }
    }
  }

  console.info(`\n📋 Unbranded ID declarations: ${total}`);
  for (const [dir, n] of [...perDir.entries()].sort((a, b) => b[1] - a[1])) {
    console.info(`   ${String(n).padStart(4)}  ${dir}`);
  }
  console.info(
    '   → brands + constructors: lib/types/branded.ts; suppress with // brand-ok\n' +
      '   → note: bare `id`/`_id` are NEVER auto-suppressed; every opaque primary key must be branded or // brand-ok\n' +
      '     the ACTIONABLE count is the one that matters: bun tools/branded-id-check.ts --smart'
  );

  if (strict && total > 0) process.exit(1);
}

if (isModuleEntrypoint(import.meta)) {
  await main();
}

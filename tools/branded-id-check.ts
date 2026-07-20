#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/runtime/glob — Bun.Glob
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
/**
 * branded-id-check.ts — detector for unbranded ID declarations.
 *
 * Flags TypeScript property declarations shaped like `id: string` /
 * `userId?: string` that should use branded ID types from
 * lib/types/branded.ts (see its header for the migration plan).
 *
 * Usage:
 *   bun tools/branded-id-check.ts [paths...]   # report by directory (exit 0)
 *   bun tools/branded-id-check.ts --smart      # role + structure clusters
 *   bun tools/branded-id-check.ts --smart --json
 *   bun tools/branded-id-check.ts --strict     # exit 1 on actionable hits
 *                                              #   (with --smart: ignores opaque-pk)
 *   bun tools/branded-id-check.ts --staged     # scan ADDED lines of staged
 *                                              #   diff only (new violations
 *                                              #   in changed lines; legacy
 *                                              #   violations elsewhere in
 *                                              #   the file never block)
 *
 * Suppression: end a declaration line with `// brand-ok` to skip it
 * (for IDs that are genuinely opaque passthroughs). Prefer --smart
 * auto-suppression of bare `id`/`_id` DTOs over polluting call sites.
 * Brand foundation: lib/types/branded.ts · institutional record: brand-manifest.json
 */

// Matches ID-shaped names only: exact `id`, names ending in `Id`/`ID`
// (sessionId, RequestId), names ending in `_id` (account_id, `_id` itself).
// Does NOT match words merely containing "id" (valid, forbidden, guid,
// validationErrors, cidr_whitelist, correlationIdHeader).
const ID_DECL = /^\s*(?:readonly\s+)?(id|[a-zA-Z]+(?:Id|ID)|[a-zA-Z_]*_id)\??:\s*string\b/;
const SKIP_FILE = /lib\/types\/branded(\.ts|\/)|lib\/types\/brand-manifest\.json$/;
const SKIP_LINE = /brand-ok/;

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
  // SessionId → sessionId, SessionId, session_id
  const base = brandName.endsWith('Id') ? brandName.slice(0, -2) : brandName;
  const camel = base.charAt(0).toLowerCase() + base.slice(1) + 'Id';
  const snake = base.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase() + '_id';
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
  const m = line.match(ID_DECL);
  return m?.[1] ?? null;
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
    if (structural === 'function-param' && highTrust) {
      suppressed = false;
      reason = 'bare id as function param in high-trust path';
    } else if (structural === 'ingress-type-property' && highTrust) {
      suppressed = false;
      reason = 'bare id on *Request/*Context in high-trust path';
    } else if (structural === 'dto-property' || structural === 'unknown') {
      suppressed = true;
      reason = 'opaque primary key on DTO/property (auto-suppressed)';
    } else if (structural === 'object-literal' && !highTrust) {
      suppressed = true;
      reason = 'opaque primary key in object literal outside high-trust path';
    } else if (!highTrust) {
      suppressed = true;
      reason = 'opaque primary key outside high-trust path (auto-suppressed)';
    } else {
      suppressed = false;
      reason = 'bare id in high-trust path — review';
    }
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

/** Violations in added lines of the staged diff (hunk-aware). */
async function stagedViolations(): Promise<Violation[]> {
  const proc = Bun.spawn(['git', 'diff', '--cached', '-U0', '--diff-filter=ACM', '--', '*.ts'], {
    stdout: 'pipe',
  });
  const diff = await new Response(proc.stdout).text();
  const violations: Violation[] = [];
  let file = '';
  let newLine = 0;
  for (const raw of diff.split('\n')) {
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
      if (!SKIP_FILE.test(file) && !SKIP_LINE.test(line) && ID_DECL.test(line)) {
        // Smart staged: only block actionable hits (mirror --smart suppressions)
        const field = extractField(line);
        if (!field) continue;
        // Dual string|Brand input ports are intentional soft boundaries
        if (
          /:\s*string\s*\|\s*[A-Za-z][A-Za-z0-9_]*Id\b/.test(line) ||
          /:\s*[A-Za-z][A-Za-z0-9_]*Id\s*\|\s*string\b/.test(line)
        ) {
          continue;
        }
        if (isOpaquePrimaryKey(field) && !HIGH_TRUST_PATH.test(file)) {
          continue;
        }
        violations.push({ file, line: newLine, text: line.trim() });
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
  const roots = paths.length > 0 ? paths : ['lib'];
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
      if (!ID_DECL.test(line)) continue;
      const field = extractField(line);
      if (!field) continue;
      const structural = classifyStructure(lines, i);
      hits.push(classifyHit(file, i + 1, line, field, structural, maps));
    }
  }
  return hits;
}

async function printSmartReport(hits: Hit[], asJson: boolean): Promise<void> {
  const maps = await fieldMaps();
  const actionable = hits.filter(h => !h.suppressed);
  const suppressed = hits.filter(h => h.suppressed);

  if (asJson) {
    process.stdout.write(
      `${JSON.stringify(
        {
          total: hits.length,
          actionable: actionable.length,
          autoSuppressed: suppressed.length,
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

  console.info(
    `\n🧠 branded-id-check --smart` +
      `${maps.loadedFromManifest ? ' (manifest-driven)' : ' (manifest missing — weak field maps)'}\n` +
      `${hits.length} total hits → ${actionable.length} actionable ` +
      `(${suppressed.length} auto-suppressed as opaque / DTO primary keys)\n`
  );

  const roles: Role[] = ['auth-credential', 'named-domain', 'new-brand', 'opaque-pk', 'ambiguous'];
  for (const role of roles) {
    const all = hits.filter(h => h.role === role);
    const act = actionable.filter(h => h.role === role);
    const sup = suppressed.filter(h => h.role === role);
    if (all.length === 0) continue;
    const tag = `[${role}]`.padEnd(18);
    if (role === 'opaque-pk' && act.length === 0) {
      console.info(`${tag} ${String(sup.length).padStart(3)} — auto-suppressed`);
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
      `  rollout: COMPLETE — actionable must stay 0 (gate: bun run check:brands)\n` +
      `  strict (actionable only): bun tools/branded-id-check.ts --smart --strict\n`
  );
}

async function main(): Promise<void> {
  const args = Bun.argv.slice(2);
  const strict = args.includes('--strict');
  const smart = args.includes('--smart');
  const asJson = args.includes('--json');

  // Staged mode: hunk-aware — only ADDED lines are judged, so legacy
  // violations elsewhere in a touched file never block the commit.
  if (args.includes('--staged')) {
    const violations = await stagedViolations();
    if (violations.length === 0) {
      console.info('✅ no new unbranded ID declarations in staged changes');
      return;
    }
    for (const v of violations) console.info(`  ${v.file}:${v.line}: ${v.text}`);
    console.info(
      `\n❌ ${violations.length} new unbranded ID declaration(s) in staged changes\n` +
        '   → use brands from lib/types/branded.ts, or suppress with // brand-ok\n' +
        '   → triage: bun tools/branded-id-check.ts --smart'
    );
    if (strict) process.exit(1);
    return;
  }

  const files = await collectFiles(args);

  if (smart) {
    const hits = await scanAll(files);
    await printSmartReport(hits, asJson);
    const actionable = hits.filter(h => !h.suppressed).length;
    if (strict && actionable > 0) process.exit(1);
    return;
  }

  // Legacy directory rollup
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
      if (ID_DECL.test(line)) {
        fileCount++;
        total++;
      }
    }
    if (fileCount > 0) {
      const rel = relPath(file);
      const dir = rel.split('/').slice(0, 2).join('/');
      perDir.set(dir, (perDir.get(dir) ?? 0) + fileCount);
      if (strict || files.length <= 20) {
        for (let i = 0; i < lines.length; i++) {
          if (!SKIP_LINE.test(lines[i]!) && ID_DECL.test(lines[i]!)) {
            console.info(`  ${file}:${i + 1}: ${lines[i]!.trim()}`);
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
      '   → note: total includes opaque DTO primary keys that --smart auto-suppresses;\n' +
      '     the ACTIONABLE count is the one that matters: bun tools/branded-id-check.ts --smart'
  );

  if (strict && total > 0) process.exit(1);
}

if (import.meta.main) {
  await main();
}

#!/usr/bin/env bun
/**
 * Deeper discovery (+ optional safe apply) for Bun-native file I/O debt.
 *
 * Grounded in:
 *   https://bun.com/docs/runtime/file-io
 *   https://bun.com/docs/guides/read-file/exists
 *   https://bun.com/docs/runtime/glob
 *   https://bun.com/docs/runtime/child-process
 *
 * Usage:
 *   bun run scripts/bun-native-discover.ts
 *   bun run scripts/bun-native-discover.ts --roots=scripts,lib,packages,tools
 *   bun run scripts/bun-native-discover.ts --json
 *   bun run scripts/bun-native-discover.ts --apply --roots=lib
 *   bun run scripts/bun-native-discover.ts --apply --dry-run --roots=lib
 *
 * --apply only rewrites high-confidence call sites (see SAFE transforms below)
 * for every root passed in --roots=. Complex readdir/stream/crypto/spawn debt
 * is reported, not auto-fixed.
 *
 * @see https://bun.com/docs/runtime/file-io
 * @see https://bun.com/docs/runtime/glob
 * @see https://bun.com/docs/runtime/utils#bun-peek
 */

import { listFilesSync, readText, resolvePath, writeJson, writeText } from './lib/fs-bun';

// ── CLI ──────────────────────────────────────────────────────────────
const argv = Bun.argv.slice(2);
const APPLY = argv.includes('--apply');
const DRY = argv.includes('--dry-run');
const AS_JSON = argv.includes('--json');
const WRITE_REPORT = argv.includes('--write-report') || APPLY;
const rootsArg = argv.find(a => a.startsWith('--roots='))?.slice('--roots='.length);
const ROOTS = (rootsArg ?? 'scripts,lib,packages,tools')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const SKIP_FILES = new Set([
  'scripts/lib/fs-bun.ts',
  'scripts/bun-native-discover.ts',
  // intentional string samples / rule catalogs
  'scripts/dx-mcp.ts',
  'scripts/bun-rules.ts',
  'scripts/bun-quick-wins-table.ts',
  'lib/validation/bun-first-compliance.ts',
  'lib/validation/bun-first-auditor.ts',
  'lib/guards/bun-first-guard.ts',
  'packages/guards/src/bun-first-guard.ts',
]);

type Severity = 'error' | 'warn' | 'info';
type Kind =
  | 'node-fs-import'
  | 'readFileSync'
  | 'writeFileSync'
  | 'existsSync'
  | 'readFile-async'
  | 'writeFile-async'
  | 'mkdir'
  | 'readdir'
  | 'child_process'
  | 'console.log'
  | 'process.env'
  | 'spawn-shell-mkdir';

type Hit = {
  file: string;
  line: number;
  kind: Kind;
  severity: Severity;
  snippet: string;
  fix: string;
  safeApply: boolean;
};

type FileReport = {
  file: string;
  hits: Hit[];
  safeApplyEligible: boolean;
  applied?: boolean;
  applyNote?: string;
};

// Patterns with Bun-doc replacements
const RULES: Array<{
  kind: Kind;
  severity: Severity;
  re: RegExp;
  fix: string;
  safeApply: boolean;
}> = [
  {
    kind: 'node-fs-import',
    severity: 'error',
    re: /from\s+['"]node:fs(?:\/promises)?['"]|from\s+['"]fs(?:\/promises)?['"]/,
    fix: 'Prefer Bun.file / Bun.write (file-io). Dirs: readdir/mkdir via node:fs only when listing (Bun docs).',
    safeApply: false,
  },
  {
    kind: 'readFileSync',
    severity: 'error',
    re: /\breadFileSync\s*\(/,
    fix: 'Bun.file(path).text() / .json() or readTextSync/readJsonSync from scripts/lib/fs-bun',
    safeApply: true,
  },
  {
    kind: 'writeFileSync',
    severity: 'error',
    re: /\bwriteFileSync\s*\(/,
    fix: 'await Bun.write(path, data) or writeText/writeJson from scripts/lib/fs-bun',
    safeApply: false, // often sync context
  },
  {
    kind: 'existsSync',
    severity: 'error',
    re: /\bexistsSync\s*\(/,
    fix: 'await Bun.file(path).exists() or fileExistsSync from scripts/lib/fs-bun',
    safeApply: true,
  },
  {
    kind: 'readFile-async',
    severity: 'error',
    re: /\breadFile\s*\(\s*[^,)]+\s*,\s*['"]utf-?8['"]/,
    fix: 'await Bun.file(path).text() or readText from scripts/lib/fs-bun',
    safeApply: true,
  },
  {
    kind: 'writeFile-async',
    severity: 'warn',
    re: /\bwriteFile\s*\(/,
    fix: 'await Bun.write(path, data) — only if not node:fs writeFile left intentionally',
    safeApply: false,
  },
  {
    kind: 'mkdir',
    severity: 'info',
    re: /\bmkdir(?:Sync)?\s*\(/,
    fix: 'Bun.write creates parent path segments for nested files; pure dir create → node:fs mkdir per Bun file-io docs',
    safeApply: false,
  },
  {
    kind: 'readdir',
    severity: 'info',
    re: /\breaddir(?:Sync)?\s*\(/,
    fix: 'Prefer Bun.Glob for file discovery; readdir from node:fs for raw dirs (Bun docs)',
    safeApply: false,
  },
  {
    kind: 'child_process',
    severity: 'error',
    re: /from\s+['"](?:node:)?child_process['"]|require\(\s*['"]child_process['"]\s*\)/,
    fix: 'Bun.spawn / Bun.spawnSync',
    safeApply: false,
  },
  {
    kind: 'spawn-shell-mkdir',
    severity: 'warn',
    re: /spawnSync\s*\(\s*\[\s*['"]mkdir['"]/,
    fix: 'Do not shell mkdir; Bun.write creates parents for nested paths',
    safeApply: true,
  },
  {
    kind: 'console.log',
    severity: 'warn',
    re: /(?<![.\w])console\.log\s*\(/,
    fix: 'console.info (project convention)',
    safeApply: true,
  },
  {
    kind: 'process.env',
    severity: 'info',
    re: /\bprocess\.env\b/,
    fix: 'Bun.env (when not Node-compat testing)',
    safeApply: false,
  },
];

function rel(abs: string): string {
  const root = resolvePath();
  return abs.startsWith(root) ? abs.slice(root.length + 1) : abs;
}

function shouldSkip(relPath: string): boolean {
  if (SKIP_FILES.has(relPath)) return true;
  if (relPath.includes('/node_modules/')) return true;
  if (relPath.endsWith('.d.ts')) return true;
  if (relPath.includes('__tests__') || relPath.includes('.test.ts')) return true;
  // string catalogs
  if (relPath.includes('bun-dx-catalog')) return true;
  return false;
}

function scanFile(abs: string, text: string): Hit[] {
  const file = rel(abs);
  const hits: Hit[] = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;
    for (const rule of RULES) {
      if (rule.re.test(line)) {
        hits.push({
          file,
          line: i + 1,
          kind: rule.kind,
          severity: rule.severity,
          snippet: trimmed.slice(0, 140),
          fix: rule.fix,
          safeApply: rule.safeApply,
        });
      }
    }
  }
  return hits;
}

/**
 * Line-aware rewrite: skip doc samples, GH Action template bodies, and
 * member calls (fs.existsSync). Only free-standing import usage is rewritten.
 */
function mapCodeLines(source: string, map: (line: string) => string): string {
  return source
    .split('\n')
    .map(line => {
      const t = line.trim();
      // Catalog / docs / embedded Node (github-script) — leave alone
      if (
        /\bexampleCode\b|\bexample\s*:/.test(line) ||
        /script:\s*\|/.test(line) ||
        /require\(\s*['"]fs['"]\s*\)/.test(line) ||
        /from\s+['"]bun['"]/.test(line)
      ) {
        return line;
      }
      // Inside a multi-line template sample for Bun APIs (heuristic)
      if (/^\s*(const content = await readFile|await writeFile|if \(fs\.|JSON\.parse\(fs\.)/.test(line)) {
        return line;
      }
      return map(line);
    })
    .join('\n');
}

/** Safe mechanical transforms for --apply. */
function applySafeTransforms(source: string, fileRel: string): { text: string; changes: string[] } {
  let text = source;
  const changes: string[] = [];

  const beforeLog = text;
  text = text.replace(/(?<![.\w])console\.log\s*\(/g, 'console.info(');
  if (text !== beforeLog) changes.push('console.log→console.info');

  // Shell mkdir spawn — remove ensureDir helpers that only spawn mkdir -p is rare; flag lines:
  if (/spawnSync\s*\(\s*\[\s*['"]mkdir['"]/.test(text)) {
    // Don't auto-delete functions; report only unless it's a one-liner we can blank
    changes.push('spawn-shell-mkdir:needs-review');
  }

  // existsSync(x) → fileExistsSync(x)
  // Skip member access (fs.existsSync / require('fs').existsSync) — those stay Node.
  {
    const before = text;
    text = mapCodeLines(text, line =>
      line.replace(/(?<![\w.])existsSync\s*\(/g, 'fileExistsSync(')
    );
    if (text !== before) changes.push('existsSync→fileExistsSync');
  }

  // JSON.parse(readFileSync(X, 'utf8')) → readJsonSync(X)
  {
    const before = text;
    text = mapCodeLines(text, line =>
      line.replace(
        /JSON\.parse\s*\(\s*(?<![\w.])readFileSync\s*\(\s*([^,)]+?)\s*,\s*['"]utf-?8['"]\s*\)\s*\)/g,
        'readJsonSync($1)'
      )
    );
    if (text !== before) changes.push('JSON.parse(readFileSync)→readJsonSync');
  }

  // readFileSync(X, 'utf8') → readTextSync(X) — bare import usage only
  {
    const before = text;
    text = mapCodeLines(text, line =>
      line
        .replace(
          /(?<![\w.])readFileSync\s*\(\s*([^,)]+?)\s*,\s*['"]utf-?8['"]\s*\)/g,
          'readTextSync($1)'
        )
        .replace(/(?<![\w.])readFileSync\s*\(\s*([^,)]+?)\s*\)/g, 'readTextSync($1)')
    );
    if (text !== before) changes.push('readFileSync→readTextSync');
  }

  // await readFile(X, 'utf8') → await readText(X) — bare import usage only
  {
    const before = text;
    text = mapCodeLines(text, line =>
      line.replace(
        /await\s+readFile\s*\(\s*([^,)]+?)\s*,\s*['"]utf-?8['"]\s*\)/g,
        'await readText($1)'
      )
    );
    if (text !== before) changes.push('await readFile→readText');
  }

  // await writeFile(path, data[, encoding]) → await writeText(path, data)
  if (!/export async function writeFile/.test(text)) {
    const before = text;
    text = mapCodeLines(text, line =>
      line
        .replace(
          /await\s+writeFile\s*\(\s*([^,]+?)\s*,\s*([^,]+?)\s*,\s*['"]utf-?8['"]\s*\)/g,
          'await writeText($1, $2)'
        )
        .replace(/await\s+writeFile\s*\(\s*([^,]+?)\s*,\s*([^)]+?)\s*\)/g, 'await writeText($1, $2)')
    );
    if (text !== before) changes.push('await writeFile→writeText');
  }

  // Clean node:fs named imports — drop symbols we replaced
  const fsGone = new Set(['existsSync', 'readFileSync', 'writeFileSync', 'readFile', 'writeFile']);
  text = text.replace(
    /^import\s*\{([^}]+)\}\s*from\s*['"]((?:node:)?fs(?:\/promises)?)['"]\s*;?\s*$/gm,
    (full, body: string, mod: string) => {
      const names = body
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .filter(n => {
          const base = n.replace(/\s+as\s+\w+$/, '').trim();
          // keep if still used in body
          if (fsGone.has(base) && !new RegExp(`\\b${base}\\b`).test(text.replace(full, ''))) {
            return false;
          }
          if (fsGone.has(base)) return false;
          return true;
        });
      if (names.length === 0) return '';
      return `import { ${names.join(', ')} } from '${mod}';`;
    }
  );
  if (text !== source && !changes.includes('clean-fs-imports')) {
    // only push if import lines changed — rough
    if (!/existsSync|readFileSync/.test(text) || /from\s+['"](?:node:)?fs/.test(text)) {
      changes.push('clean-fs-imports');
    }
  }

  // Drop empty leftover blank-only import removals handled above
  const stillNeedsFs =
    /\b(readdir|readdirSync|mkdir|mkdirSync|stat|statSync|createReadStream|createWriteStream|writeFileSync|writeFile|appendFile|rm|unlink|open|readFile|readFileSync|existsSync)\b/.test(
      text
    );

  if (!stillNeedsFs) {
    const stripped = text
      .replace(/^import\s+[^;{\n]*\s+from\s+['"](?:node:)?fs(?:\/promises)?['"]\s*;?\s*\n/gm, '')
      .replace(/^import\s*\{[^}]*\}\s*from\s*['"](?:node:)?fs(?:\/promises)?['"]\s*;?\s*\n/gm, '');
    if (stripped !== text) {
      text = stripped;
      changes.push('strip-fs-imports');
    }
  }

  // Ensure fs-bun import if we introduced helpers
  const needs = new Set<string>();
  if (/\bfileExistsSync\s*\(/.test(text)) needs.add('fileExistsSync');
  if (/\breadTextSync\s*\(/.test(text)) needs.add('readTextSync');
  if (/\breadJsonSync\s*\(/.test(text)) needs.add('readJsonSync');
  if (
    /\breadText\s*\(/.test(text) &&
    !/\breadTextSync/.test(text.match(/\breadText\b/g)?.join('') || '')
  ) {
    // readText used
  }
  if (/\bawait\s+readText\s*\(/.test(text) || /[^a-zA-Z]readText\s*\(/.test(text)) {
    if (
      /\breadText\s*\(/.test(text) &&
      !/\breadTextSync\s*\(/.test(text.replace(/readTextSync/g, ''))
    ) {
      needs.add('readText');
    }
  }
  // simpler needs detection
  for (const name of [
    'fileExistsSync',
    'fileExists',
    'readTextSync',
    'readText',
    'readJsonSync',
    'readJson',
    'writeText',
    'writeJson',
    'resolvePath',
  ] as const) {
    const re = new RegExp(`\\b${name}\\b`);
    if (re.test(text) && !new RegExp(`import\\s*\\{[^}]*\\b${name}\\b`).test(text)) {
      needs.add(name);
    }
  }

  // Only add names that are actually used without import
  const usedNeeds = [...needs].filter(n => {
    const re = new RegExp(`\\b${n}\\b`);
    return re.test(text);
  });

  if (
    usedNeeds.length > 0 &&
    !/from\s+['"]\.\/lib\/fs-bun['"]|from\s+['"]\.\.\/lib\/fs-bun['"]/.test(text)
  ) {
    // Relative import from scripts/*
    const depth = fileRel.split('/').length - 1; // scripts/foo.ts → 1
    let imp: string;
    if (fileRel.startsWith('scripts/lib/')) {
      imp = `import { ${usedNeeds.sort().join(', ')} } from './fs-bun';\n`;
    } else if (fileRel.startsWith('scripts/')) {
      imp = `import { ${usedNeeds.sort().join(', ')} } from './lib/fs-bun';\n`;
    } else {
      // outside scripts — use absolute-style path from repo root via relative
      const up = '../'.repeat(depth);
      imp = `import { ${usedNeeds.sort().join(', ')} } from '${up}scripts/lib/fs-bun';\n`;
    }

    // Insert after shebang / leading comments / existing imports
    if (text.startsWith('#!')) {
      const nl = text.indexOf('\n');
      text = text.slice(0, nl + 1) + imp + text.slice(nl + 1);
    } else {
      text = imp + text;
    }
    changes.push(`import-fs-bun:{${usedNeeds.sort().join(',')}}`);
  } else if (usedNeeds.length > 0 && /from\s+['"][^'"]*fs-bun['"]/.test(text)) {
    // Merge into existing import
    text = text.replace(
      /import\s*\{([^}]*)\}\s*from\s*['"]([^'"]*fs-bun)['"]\s*;?/,
      (_m, body: string, from: string) => {
        const existing = body
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);
        const set = new Set([...existing, ...usedNeeds]);
        return `import { ${[...set].sort().join(', ')} } from '${from}';`;
      }
    );
    changes.push('merge-fs-bun-import');
  }

  // Ensure @see file-io if we touched file I/O and missing
  if (
    changes.some(c => c.includes('read') || c.includes('exists') || c.includes('fs-bun')) &&
    !text.includes('bun.com/docs/runtime/file-io')
  ) {
    if (text.startsWith('#!')) {
      const nl = text.indexOf('\n');
      text =
        text.slice(0, nl + 1) +
        '// @see https://bun.com/docs/runtime/file-io — Bun.file, Bun.write\n' +
        text.slice(nl + 1);
    } else {
      text = '// @see https://bun.com/docs/runtime/file-io — Bun.file, Bun.write\n' + text;
    }
    changes.push('@see-file-io');
  }

  return { text, changes };
}

// ── Main ─────────────────────────────────────────────────────────────
const reports: FileReport[] = [];
let totalHits = 0;

for (const root of ROOTS) {
  const absRoot = resolvePath(root);
  if (!(await Bun.file(absRoot).exists()) && !listFilesSync('**/*', { cwd: absRoot }).length) {
    // directory may not be a file; Glob from cwd
  }
  let files: string[] = [];
  try {
    files = listFilesSync('**/*.{ts,tsx}', { cwd: absRoot });
  } catch {
    continue;
  }
  for (const relFile of files) {
    const fileRel = `${root}/${relFile}`.replace(/\\/g, '/');
    if (shouldSkip(fileRel)) continue;
    const abs = resolvePath(absRoot, relFile);
    let text: string;
    try {
      text = await readText(abs);
    } catch {
      continue;
    }
    const hits = scanFile(abs, text);
    if (hits.length === 0) continue;
    totalHits += hits.length;
    const safeKinds = hits.filter(h => h.safeApply);
    const report: FileReport = {
      file: fileRel,
      hits,
      safeApplyEligible: safeKinds.length > 0,
    };

    // --apply rewrites any listed --roots= (not scripts-only). Outside scripts/,
    // helpers import from scripts/lib/fs-bun via relative path.
    if (APPLY && report.safeApplyEligible) {
      const { text: next, changes } = applySafeTransforms(text, fileRel);
      if (changes.length > 0 && next !== text) {
        report.applied = !DRY;
        report.applyNote = changes.join(', ');
        if (!DRY) {
          await writeText(abs, next);
        }
      } else {
        report.applyNote = changes.length ? changes.join(', ') : 'no safe rewrite';
      }
    }

    reports.push(report);
  }
}

// Summary
const byKind = new Map<string, number>();
for (const r of reports) {
  for (const h of r.hits) {
    byKind.set(h.kind, (byKind.get(h.kind) ?? 0) + 1);
  }
}

const summary = {
  generatedAt: new Date().toISOString(),
  roots: ROOTS,
  apply: APPLY,
  dryRun: DRY,
  filesWithHits: reports.length,
  totalHits,
  byKind: Object.fromEntries([...byKind.entries()].sort((a, b) => b[1] - a[1])),
  appliedFiles: reports.filter(r => r.applied).map(r => ({ file: r.file, note: r.applyNote })),
};

if (AS_JSON) {
  console.info(JSON.stringify({ summary, files: reports }, null, 2));
} else {
  console.info('Bun-native discovery');
  console.info('='.repeat(72));
  console.info(`roots: ${ROOTS.join(', ')}  files: ${reports.length}  hits: ${totalHits}`);
  console.info('by kind:');
  for (const [k, n] of Object.entries(summary.byKind)) {
    console.info(`  ${n.toString().padStart(4)}  ${k}`);
  }
  console.info('');
  // Top offenders
  const ranked = [...reports].sort((a, b) => b.hits.length - a.hits.length).slice(0, 25);
  console.info('Top files:');
  for (const r of ranked) {
    const kinds = [...new Set(r.hits.map(h => h.kind))].join(', ');
    const flag = r.applied ? ' [APPLIED]' : r.safeApplyEligible ? ' [safe-apply]' : '';
    console.info(`  ${r.hits.length.toString().padStart(3)}  ${r.file}${flag}  (${kinds})`);
  }
  if (APPLY) {
    console.info('');
    console.info(
      DRY
        ? `Dry-run: would apply to ${reports.filter(r => r.applyNote && r.applyNote !== 'no safe rewrite').length} files`
        : `Applied: ${summary.appliedFiles.length} files`
    );
    for (const a of summary.appliedFiles) {
      console.info(`  ✓ ${a.file} — ${a.note}`);
    }
  }
  console.info('');
  console.info(
    'Safe apply: bun run scripts/bun-native-discover.ts --apply --roots=lib  (or scripts,packages,tools)'
  );
  console.info('Docs: https://bun.com/docs/runtime/file-io · scripts/lib/fs-bun.ts');
}

if (WRITE_REPORT) {
  const out = resolvePath('artifacts', 'bun-native-discover.latest.json');
  await writeJson(out, { summary, files: reports });
  if (!AS_JSON) console.info(`\nReport: ${out}`);
}

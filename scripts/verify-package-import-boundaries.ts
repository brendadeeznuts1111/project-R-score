import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

type PackageBoundaryRule = {
  name: string;
  sourceDir: string;
  allowedRoots: string[];
};

type Violation = {
  file: string;
  line: number;
  specifier: string;
  resolved: string;
  packageName: string;
};

const ROOT = process.cwd();

const RULES: PackageBoundaryRule[] = [
  {
    name: 'business',
    sourceDir: 'packages/business/src',
    allowedRoots: ['packages/business/src', 'lib/docs'],
  },
  {
    name: 'docs-tools',
    sourceDir: 'packages/docs-tools/src',
    allowedRoots: ['packages/docs-tools/src', 'lib/docs'],
  },
  {
    name: 'package',
    sourceDir: 'packages/package/src',
    allowedRoots: ['packages/package/src', 'lib/docs'],
  },
];

const IMPORT_PATTERN =
  /(?:import|export)\s+(?:type\s+)?(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;

function isCodeFile(path: string): boolean {
  return /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/.test(path);
}

function walk(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry === 'build') continue;
    const abs = join(dir, entry);
    const st = statSync(abs);
    if (st.isDirectory()) {
      walk(abs, out);
    } else if (st.isFile() && isCodeFile(abs)) {
      out.push(abs);
    }
  }
}

function resolveImport(fromFile: string, specifier: string): string {
  // Resolve path lexically; boundary validation only needs the effective path root.
  return resolve(dirname(fromFile), specifier);
}

function lineAt(content: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i++) {
    if (content.charCodeAt(i) === 10) line++;
  }
  return line;
}

function toRel(absPath: string): string {
  return relative(ROOT, absPath).replace(/\\/g, '/');
}

function isUnder(relPath: string, allowedRoot: string): boolean {
  return relPath === allowedRoot || relPath.startsWith(`${allowedRoot}/`);
}

function checkRule(rule: PackageBoundaryRule): Violation[] {
  const sourceAbs = resolve(ROOT, rule.sourceDir);
  const files: string[] = [];
  walk(sourceAbs, files);

  const violations: Violation[] = [];
  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    let m: RegExpExecArray | null;
    while ((m = IMPORT_PATTERN.exec(content)) !== null) {
      const specifier = m[1] ?? m[2];
      if (!specifier || !specifier.startsWith('.')) continue;

      const resolvedAbs = resolveImport(file, specifier);
      const rel = toRel(resolvedAbs);

      const allowed = rule.allowedRoots.some((root) => isUnder(rel, root));
      if (!allowed) {
        violations.push({
          file: toRel(file),
          line: lineAt(content, m.index),
          specifier,
          resolved: rel,
          packageName: rule.name,
        });
      }
    }
    IMPORT_PATTERN.lastIndex = 0;
  }

  return violations;
}

function main(): void {
  const violations = RULES.flatMap(checkRule);
  if (violations.length === 0) {
    console.log('✅ Package import boundaries are clean.');
    return;
  }

  console.error('❌ Package import boundary violations found:');
  for (const v of violations) {
    console.error(
      `- [${v.packageName}] ${v.file}:${v.line} imports "${v.specifier}" -> ${v.resolved} (outside allowed roots)`
    );
  }
  process.exit(1);
}

main();

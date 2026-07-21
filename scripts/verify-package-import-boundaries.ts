// @see https://bun.com/docs/runtime/file-io — Bun.file, Bun.write
// @see https://bun.com/docs/runtime/glob — Bun.Glob
import { joinPath, readTextSync, resolvePath } from './lib/fs-bun';

const dirnamePath = (p: string) => (p.includes('/') ? p.slice(0, p.lastIndexOf('/')) || '/' : '.');

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

function collectCodeFiles(dir: string): string[] {
  const pattern = '**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}';
  const glob = new Bun.Glob(pattern);
  const files: string[] = [];
  for (const relativePath of glob.scanSync({ cwd: dir, onlyFiles: true, dot: false })) {
    if (
      relativePath.includes('/node_modules/') ||
      relativePath.includes('/dist/') ||
      relativePath.includes('/build/')
    )
      continue;
    files.push(joinPath(dir, relativePath));
  }
  return files;
}

function resolveImport(fromFile: string, specifier: string): string {
  // Resolve path lexically; boundary validation only needs the effective path root.
  return resolvePath(dirnamePath(fromFile), specifier);
}

function lineAt(content: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i++) {
    if (content.charCodeAt(i) === 10) line++;
  }
  return line;
}

function toRel(absPath: string): string {
  return relativePath(ROOT, absPath).replace(/\\/g, '/');
}

function isUnder(relPath: string, allowedRoot: string): boolean {
  return relPath === allowedRoot || relPath.startsWith(`${allowedRoot}/`);
}

function checkRule(rule: PackageBoundaryRule): Violation[] {
  const sourceAbs = resolvePath(ROOT, rule.sourceDir);
  const files = collectCodeFiles(sourceAbs);

  const violations: Violation[] = [];
  for (const file of files) {
    const content = readTextSync(file);
    let m: RegExpExecArray | null;
    while ((m = IMPORT_PATTERN.exec(content)) !== null) {
      const specifier = m[1] ?? m[2];
      if (!specifier || !specifier.startsWith('.')) continue;

      const resolvedAbs = resolveImport(file, specifier);
      const rel = toRel(resolvedAbs);

      const allowed = rule.allowedRoots.some(root => isUnder(rel, root));
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
    console.info('✅ Package import boundaries are clean.');
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

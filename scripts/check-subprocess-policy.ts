#!/usr/bin/env bun

// @see https://bun.com/reference/bun/argv — Bun.argv
// @updated Bun.argv · changed v0.6.10 · 2023-06-26 · https://bun.com/blog/bun-v0.6.10
// @verified Bun.argv · Bun v1.4.0 · 2026-08-25 · https://bun.com/reference/bun/argv
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @updated Bun.CryptoHasher · changed v0.5.0 · 2023-01-18 · https://bun.com/blog/bun-v0.5.0
// @updated Bun.CryptoHasher · fixed v1.0.19 · 2023-12-22 · https://bun.com/blog/bun-v1.0.19
// @updated Bun.CryptoHasher · changed v1.0.21 · 2024-01-02 · https://bun.com/blog/bun-v1.0.21
// @updated Bun.CryptoHasher · fixed v1.1.11 · 2024-06-01 · https://bun.com/blog/bun-v1.1.11
// @updated Bun.CryptoHasher · fixed v1.1.32 · 2024-10-21 · https://bun.com/blog/bun-v1.1.32
// @updated Bun.CryptoHasher · fixed v1.1.35 · 2024-11-19 · https://bun.com/blog/bun-v1.1.35
// @verified Bun.CryptoHasher · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/hashing#bun-cryptohasher
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @updated Bun.Glob · fixed v1.0.27 · 2024-02-17 · https://bun.com/blog/bun-v1.0.27
// @updated Bun.Glob · fixed v1.0.28 · 2024-02-19 · https://bun.com/blog/bun-v1.0.28
// @updated Bun.Glob · fixed v1.0.29 · 2024-02-23 · https://bun.com/blog/bun-v1.0.29
// @updated Bun.Glob · fixed v1.0.30 · 2024-03-04 · https://bun.com/blog/bun-v1.0.30
// @updated Bun.Glob · fixed v1.1.5 · 2024-04-26 · https://bun.com/blog/bun-v1.1.5
// @updated Bun.Glob · changed v1.2.3 · 2025-02-22 · https://bun.com/blog/bun-v1.2.3
// @updated Bun.Glob · fixed v1.2.3 · 2025-02-22 · https://bun.com/blog/bun-v1.2.3
// @updated Bun.Glob · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.Glob · fixed v1.3.7 · 2026-01-27 · https://bun.com/blog/bun-v1.3.7
// @updated Bun.Glob · changed v1.3.12 · 2026-04-09 · https://bun.com/blog/bun-v1.3.12
// @updated Bun.Glob · fixed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @verified Bun.Glob · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/glob#quickstart
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @updated Bun.write · fixed v0.4.0 · 2022-12-23 · https://bun.com/blog/bun-v0.4.0
// @updated Bun.write · fixed v0.6.10 · 2023-06-26 · https://bun.com/blog/bun-v0.6.10
// @updated Bun.write · fixed v0.7.2 · 2023-08-03 · https://bun.com/blog/bun-v0.7.2
// @updated Bun.write · fixed v1.0.7 · 2023-10-20 · https://bun.com/blog/bun-v1.0.7
// @updated Bun.write · changed v1.0.16 · 2023-12-10 · https://bun.com/blog/bun-v1.0.16
// @updated Bun.write · fixed v1.0.21 · 2024-01-02 · https://bun.com/blog/bun-v1.0.21
// @updated Bun.write · fixed v1.0.23 · 2024-01-16 · https://bun.com/blog/bun-v1.0.23
// @updated Bun.write · fixed v1.0.24 · 2024-01-20 · https://bun.com/blog/bun-v1.0.24
// @updated Bun.write · changed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.write · fixed v1.1.6 · 2024-04-28 · https://bun.com/blog/bun-v1.1.6
// @updated Bun.write · fixed v1.1.21 · 2024-07-27 · https://bun.com/blog/bun-v1.1.21
// @updated Bun.write · changed v1.1.37 · 2024-11-26 · https://bun.com/blog/bun-v1.1.37
// @updated Bun.write · changed v1.2.8 · 2025-03-31 · https://bun.com/blog/bun-v1.2.8
// @updated Bun.write · fixed v1.2.8 · 2025-03-31 · https://bun.com/blog/bun-v1.2.8
// @updated Bun.write · fixed v1.2.20 · 2025-08-10 · https://bun.com/blog/bun-v1.2.20
// @updated Bun.write · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.write · fixed v1.3.5 · 2025-12-17 · https://bun.com/blog/bun-v1.3.5
// @updated Bun.write · fixed v1.3.6 · 2026-01-13 · https://bun.com/blog/bun-v1.3.6
// @updated Bun.write · fixed v1.3.12 · 2026-04-09 · https://bun.com/blog/bun-v1.3.12
// @verified Bun.write · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/file-io#writing-files-bun-write
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @verified Bun.file · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/file-io
import ts from 'typescript';
import { relativePath } from '../lib/path-bun.ts';

const ROOT = new URL('../', import.meta.url).pathname;
const MANIFEST_PATH = `${ROOT}scripts/subprocess-authority-inventory.json`;
const SCAN_ROOTS = ['lib', 'packages', 'scripts', 'tools'] as const;

type AuthorityClass =
  | 'guarded-authority-primitive'
  | 'typed-registry-planner'
  | 'raw-bun-package-manager-probe'
  | 'raw-bun-runtime-tooling'
  | 'non-bun-utility'
  | 'dynamic-process-boundary';

type InventoryEntry = {
  readonly id: string; // brand-ok — opaque, deterministic inventory identity
  readonly file: string;
  readonly callee: 'Bun.spawn' | 'Bun.spawnSync';
  readonly authority: AuthorityClass;
  readonly expressionHash: string;
};

type InventoryManifest = {
  readonly schema: 'factorywager.subprocess-authority-inventory.v1';
  readonly entries: readonly InventoryEntry[];
};

function sha256(value: string): string {
  const hasher = new Bun.CryptoHasher('sha256');
  hasher.update(value);
  return hasher.digest('hex');
}

function spawnCallee(node: ts.CallExpression): InventoryEntry['callee'] | undefined {
  if (!ts.isPropertyAccessExpression(node.expression)) return undefined;
  if (!ts.isIdentifier(node.expression.expression) || node.expression.expression.text !== 'Bun') {
    return undefined;
  }
  if (node.expression.name.text === 'spawn') return 'Bun.spawn';
  if (node.expression.name.text === 'spawnSync') return 'Bun.spawnSync';
  return undefined;
}

function firstLiteralCommand(node: ts.CallExpression): string | undefined {
  const first = node.arguments[0];
  if (!first || !ts.isArrayLiteralExpression(first)) return undefined;
  const command = first.elements[0];
  return command && ts.isStringLiteralLike(command) ? command.text : undefined;
}

function classifyCall(
  file: string,
  node: ts.CallExpression,
  source: ts.SourceFile,
  printed: string
): AuthorityClass {
  const sourceWithComments = source.text.slice(node.getFullStart(), node.end);
  if (file === 'lib/security/guarded-bun-process.ts') return 'guarded-authority-primitive';
  if (sourceWithComments.includes('registry-command-plan-reviewed'))
    return 'typed-registry-planner';
  const command = firstLiteralCommand(node);
  const bunLaunch =
    command === 'bun' ||
    printed.includes('bunSpawnArgs(') ||
    printed.includes('process.execPath') ||
    /\b(?:bunPath|bunBin|bunExecutable|bunArgs)\b/.test(printed);
  if (bunLaunch && /['"](?:install|info|publish)['"]/.test(printed)) {
    return 'raw-bun-package-manager-probe';
  }
  if (command && command !== 'bun') return 'non-bun-utility';
  if (bunLaunch) {
    return 'raw-bun-runtime-tooling';
  }
  return 'dynamic-process-boundary';
}

async function currentInventory(): Promise<readonly InventoryEntry[]> {
  const printer = ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed });
  const entries: InventoryEntry[] = [];
  const duplicateCount = new Map<string, number>();
  for (const scanRoot of SCAN_ROOTS) {
    const glob = new Bun.Glob('**/*.ts');
    const files: string[] = [];
    for await (const absolutePath of glob.scan({ cwd: `${ROOT}${scanRoot}`, absolute: true })) {
      files.push(absolutePath);
    }
    for (const absolutePath of files.sort()) {
      const file = relativePath(ROOT, absolutePath);
      const text = await Bun.file(absolutePath).text();
      const source = ts.createSourceFile(
        file,
        text,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TS
      );
      const visit = (node: ts.Node): void => {
        if (ts.isCallExpression(node)) {
          const callee = spawnCallee(node);
          if (callee) {
            const printed = printer.printNode(ts.EmitHint.Expression, node, source);
            const expressionHash = sha256(printed);
            const duplicateKey = `${file}\0${callee}\0${expressionHash}`;
            const ordinal = (duplicateCount.get(duplicateKey) ?? 0) + 1;
            duplicateCount.set(duplicateKey, ordinal);
            entries.push({
              id: `${file}#${callee}#${expressionHash.slice(0, 16)}#${ordinal}`,
              file,
              callee,
              authority: classifyCall(file, node, source, printed),
              expressionHash,
            });
          }
        }
        ts.forEachChild(node, visit);
      };
      visit(source);
    }
  }
  return entries.sort((left, right) => left.id.localeCompare(right.id));
}

function summarize(entries: readonly InventoryEntry[]): string {
  const counts = new Map<AuthorityClass, number>();
  for (const entry of entries) counts.set(entry.authority, (counts.get(entry.authority) ?? 0) + 1);
  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([authority, count]) => `${authority}=${count}`)
    .join(', ');
}

const entries = await currentInventory();
const manifest: InventoryManifest = {
  schema: 'factorywager.subprocess-authority-inventory.v1',
  entries,
};

if (Bun.argv.includes('--write')) {
  await Bun.write(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  console.info(`subprocess authority inventory: wrote ${entries.length} exact calls`);
  console.info(summarize(entries));
  process.exit(0);
}

const expected = (await Bun.file(MANIFEST_PATH).json()) as InventoryManifest;
if (
  expected.schema !== manifest.schema ||
  JSON.stringify(expected.entries) !== JSON.stringify(entries)
) {
  const expectedIds = new Set(expected.entries.map(entry => entry.id));
  const actualIds = new Set(entries.map(entry => entry.id));
  const additions = entries.filter(entry => !expectedIds.has(entry.id));
  const removals = expected.entries.filter(entry => !actualIds.has(entry.id));
  throw new Error(
    [
      'Subprocess authority inventory drifted; additions and removals require explicit review.',
      ...additions.map(entry => `+ ${entry.id} [${entry.authority}]`),
      ...removals.map(entry => `- ${entry.id} [${entry.authority}]`),
      'After review: bun scripts/check-subprocess-policy.ts --write',
    ].join('\n')
  );
}

if (Bun.argv.includes('--list')) {
  for (const entry of entries) console.info(`${entry.authority}\t${entry.id}`);
}
console.info(
  `subprocess authority inventory: ok (${entries.length} exact calls; ${summarize(entries)})`
);

// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/ffi#dlopen-usage-bunffi — bun:ffi
// @see https://bun.com/docs/runtime/workers#creating-a-worker — Worker
// @see https://bun.com/docs/runtime/html-rewriter — HTMLRewriter
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/utils#bun-resolvesync — Bun.resolveSync
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher
/**
 * Proof hash for Bun API / ops one-liner demos — three-source audit trail.
 *
 * Combines demo signature, canonical doc URL, runtime output, and Bun version
 * into a stable SHA-256 for manifest diffing across upgrades.
 */
import { BUN_REPOSITORY_URL } from './docs/bun-source-links.ts';
import ts from 'typescript';

export type ProofInput = {
  /** Demo id + apis joined, or API token for per-symbol proofs. */
  signature: string;
  docsUrl?: string | null;
  docsUrls?: readonly string[];
  bunTypesSource?: string;
  runtimeOutput?: string;
  bunVersion?: string;
};

export function proofHash(input: ProofInput): string {
  const h = new Bun.CryptoHasher('sha256');
  h.update(input.signature);
  if (input.docsUrl) h.update(input.docsUrl);
  for (const docsUrl of input.docsUrls ?? []) h.update(docsUrl);
  if (input.bunTypesSource) h.update(input.bunTypesSource);
  if (input.runtimeOutput) h.update(input.runtimeOutput);
  h.update(input.bunVersion ?? Bun.version);
  return h.digest('hex');
}

export function proofPreview(hash: string, len = 8): string {
  return hash.slice(0, len);
}

/** Resolve bun-types package root (all .d.ts concatenated by callers). */
export function resolveBunTypesDir(): string {
  const pkg = Bun.resolveSync('bun-types/package.json', process.cwd());
  return pkg.replace(/\/package\.json$/, '');
}

export type BunTypesPackageMetadata = {
  name: string;
  version: string;
  repositoryUrl: string;
  repositoryDirectory: string;
};

/** Read the exact installed bun-types package identity and upstream repository metadata. */
export async function readBunTypesPackageMetadata(): Promise<BunTypesPackageMetadata> {
  const dir = resolveBunTypesDir();
  const pkg = (await Bun.file(`${dir}/package.json`).json()) as {
    name?: string;
    version?: string;
    repository?: { url?: string; directory?: string };
  };
  if (
    pkg.name !== 'bun-types' ||
    typeof pkg.version !== 'string' ||
    pkg.repository?.url !== BUN_REPOSITORY_URL ||
    pkg.repository.directory !== 'packages/bun-types'
  ) {
    throw new Error('Installed bun-types package metadata does not match the Bun repository');
  }
  return {
    name: pkg.name,
    version: pkg.version,
    repositoryUrl: pkg.repository.url,
    repositoryDirectory: pkg.repository.directory,
  };
}

export async function readBunTypesText(): Promise<string> {
  const dir = resolveBunTypesDir();
  const glob = new Bun.Glob('**/*.d.ts');
  let text = '';
  for await (const f of glob.scan(dir)) {
    text += await Bun.file(`${dir}/${f}`).text();
  }
  return text;
}

/** Resolve a dotted API name against the live runtime. */
export async function probeRuntimeApi(api: string): Promise<string> {
  if (api === 'HTMLRewriter') return typeof HTMLRewriter;
  if (api === 'Worker') return typeof Worker;
  if (api === 'import.meta') return 'object';
  if (api.startsWith('bun:sqlite')) return typeof (await import('bun:sqlite')).Database;
  if (api.startsWith('bun:ffi')) return typeof (await import('bun:ffi')).dlopen;
  let cur: unknown = globalThis;
  const parts = api.split('.');
  for (const part of parts) {
    if (part === 'Bun') {
      cur = Bun;
      continue;
    }
    cur = (cur as Record<string, unknown> | undefined)?.[part];
  }
  return typeof cur;
}

function declarationName(node: ts.Node): string | undefined {
  if (
    (ts.isModuleDeclaration(node) ||
      ts.isFunctionDeclaration(node) ||
      ts.isClassDeclaration(node) ||
      ts.isInterfaceDeclaration(node) ||
      ts.isTypeAliasDeclaration(node) ||
      ts.isEnumDeclaration(node) ||
      ts.isPropertySignature(node) ||
      ts.isMethodSignature(node) ||
      ts.isPropertyDeclaration(node) ||
      ts.isMethodDeclaration(node)) &&
    node.name
  ) {
    return ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)
      ? node.name.text
      : node.name.getText();
  }
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) return node.name.text;
  return undefined;
}

function declarationsNamed(nodes: readonly ts.Node[], name: string): ts.Node[] {
  const matches: ts.Node[] = [];
  for (const node of nodes) {
    if (ts.isVariableStatement(node)) {
      for (const declaration of node.declarationList.declarations) {
        if (declarationName(declaration) === name) matches.push(declaration);
      }
    } else if (declarationName(node) === name) {
      matches.push(node);
    }
  }
  return matches;
}

function moduleMembers(node: ts.ModuleDeclaration): readonly ts.Node[] {
  let body = node.body;
  while (body && ts.isModuleDeclaration(body)) body = body.body;
  return body && ts.isModuleBlock(body) ? body.statements : [];
}

function typeMembers(type: ts.TypeNode | undefined, root: readonly ts.Node[]): ts.Node[] {
  if (!type) return [];
  if (ts.isParenthesizedTypeNode(type)) return typeMembers(type.type, root);
  if (ts.isTypeLiteralNode(type)) return [...type.members];
  if (ts.isIntersectionTypeNode(type) || ts.isUnionTypeNode(type)) {
    return type.types.flatMap(member => typeMembers(member, root));
  }
  if (ts.isTypeReferenceNode(type) && ts.isIdentifier(type.typeName)) {
    return declarationsNamed(root, type.typeName.text).flatMap(node => nestedMembers(node, root));
  }
  if (ts.isTypeQueryNode(type) && ts.isIdentifier(type.exprName)) {
    return declarationsNamed(root, type.exprName.text).flatMap(node => nestedMembers(node, root));
  }
  return [];
}

function nestedMembers(node: ts.Node, root: readonly ts.Node[]): ts.Node[] {
  if (ts.isModuleDeclaration(node)) return [...moduleMembers(node)];
  if (
    ts.isInterfaceDeclaration(node) ||
    ts.isClassDeclaration(node) ||
    ts.isTypeLiteralNode(node)
  ) {
    return [...node.members];
  }
  if (ts.isVariableDeclaration(node) || ts.isTypeAliasDeclaration(node)) {
    return typeMembers(node.type, root);
  }
  return [];
}

function moduleDeclarations(source: ts.SourceFile, moduleName: string): ts.ModuleDeclaration[] {
  return source.statements.filter(
    (node): node is ts.ModuleDeclaration =>
      ts.isModuleDeclaration(node) &&
      (ts.isStringLiteral(node.name) || ts.isIdentifier(node.name)) &&
      node.name.text === moduleName
  );
}

/**
 * Resolve the full API path through the installed declaration AST.
 *
 * Unlike substring checks, this keeps namespace ownership: a declaration of
 * `Other.parse` cannot satisfy `Bun.TOML.parse`.
 */
export function typesContains(dts: string, api: string): boolean {
  const source = ts.createSourceFile('bun-types.d.ts', dts, ts.ScriptTarget.Latest, false);

  if (api.startsWith('bun:')) return moduleDeclarations(source, api).length > 0;

  const parts = api.split('.');
  let candidates: ts.Node[];
  let root: readonly ts.Node[];
  if (parts[0] === 'Bun') {
    root = moduleDeclarations(source, 'bun').flatMap(moduleMembers);
    candidates = declarationsNamed(root, parts[1] ?? '');
    parts.splice(0, 2);
  } else {
    root = source.statements;
    candidates = declarationsNamed(root, parts.shift() ?? '');
  }

  for (const part of parts) {
    candidates = candidates.flatMap(node => declarationsNamed(nestedMembers(node, root), part));
    if (candidates.length === 0) return false;
  }
  return candidates.length > 0;
}

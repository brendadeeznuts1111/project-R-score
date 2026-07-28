#!/usr/bin/env bun
// @see https://bun.com/reference/bun/sliceAnsi — Bun.sliceAnsi
// @see https://bun.com/docs/runtime/http/server#basic-setup — Bun.serve
// @see https://bun.com/docs/runtime/cron#bun-cron-schedule-handler-in-process — Bun.cron
// @see https://bun.com/docs/runtime/shell#getting-started — Bun.$
// @see https://bun.com/docs/runtime/webview#new-bun-webview-options — Bun.WebView
// @see https://bun.com/docs/runtime/webview#new-bun-webview-options — WebView
// @see https://bun.com/docs/runtime/image#input — Bun.Image
// @see https://bun.com/blog/bun-v1.3.14#no-orphans — --no-orphans
// @see https://bun.com/blog/bun-v1.3.14#http3 — Bun.serve http3
// @see https://bun.com/blog/bun-v1.3.13#bun-test-changed — --changed
// @see https://bun.com/blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel — --isolate
// @see https://bun.com/blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel — --parallel
// @see https://bun.com/blog/bun-v1.3.13#bun-test-shard-m-n-for-splitting-tests-across-ci-jobs — --shard
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
// @see https://bun.com/docs/runtime/file-io — Bun.file / Bun.write
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — source digests
// @see https://bun.com/reference/bun/argv — Bun.argv
/**
 * Bake the Bun capability × FactoryWager brand cross-map.
 *
 *   bun tools/bun-brand-map.ts
 *   bun tools/bun-brand-map.ts --check
 *   bun tools/bun-brand-map.ts --write-baseline
 *   bun tools/bun-brand-map.ts --json
 */

import * as ts from 'typescript';
import { BUN_BRAND_USAGES } from '../lib/docs/bun-brand-usages.ts';
import {
  assertBunBrandUsages,
  type BunBrandCatalogToken,
  type BunBrandEvidenceState,
  type BunBrandUsageDeclaration,
} from '../lib/docs/bun-brand-contract.ts';

export const BUN_BRAND_MAP_PATH = 'public/registry/bun-brand-map.json';
export const BUN_BRAND_MAP_URL = '/registry/bun-brand-map.json';
export const BUN_BRAND_BASELINE_PATH = 'lib/docs/bun-brand-usage-baseline.json';

type Catalog = {
  generated: string;
  entries: Array<
    BunBrandCatalogToken & {
      releasedIn?: string;
      docsUrl?: string;
      canonicalPage?: string;
    }
  >;
};

type BrandManifest = {
  brandCount: number;
  domains: string[];
  brands: Array<{ name: string; domain: string }>;
};

type BrandKeymap = {
  projects: Array<{
    project: string;
    status: string;
  }>;
};

type ReleaseProof = {
  timestamp: string;
  results: Array<{
    canonicalKey?: string;
    passed?: boolean;
    introducedIn?: string;
    name?: string;
  }>;
};

export type BunCapabilityObservation = {
  token: string;
  variant: string | null;
  path: string;
  symbol: string | null;
  line: number;
  occurrence?: number;
  project: string;
  syntax: 'ast-call' | 'ast-new' | 'package-script' | 'workflow-command' | 'bun-config';
};

export type BunBrandUsageBaseline = {
  schemaVersion: 1;
  kind: 'bun-brand-usage-baseline';
  keys: string[];
};

type SourceFile = { path: string; content: string };

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts']);
const CONFIG_EXTENSIONS = new Set(['.json', '.jsonc', '.yml', '.yaml', '.toml']);
const EXCLUDED_PARTS = [
  '/node_modules/',
  '/vendor/',
  '/dist/',
  '/build/',
  '/coverage/',
  '/archive/',
  '/fixtures/',
  '/__fixtures__/',
  '/public/registry/',
];
const EXCLUDED_EXACT = new Set([
  'lib/docs/bun-brand-usages.ts',
  BUN_BRAND_BASELINE_PATH,
  BUN_BRAND_MAP_PATH,
  'tools/bun-brand-map.ts',
  'tools/bun-docs-catalog.json',
  'tools/bun-docs-index.json',
]);

function extension(path: string): string {
  const dot = path.lastIndexOf('.');
  return dot < 0 ? '' : path.slice(dot);
}

export function isBunBrandScanPath(path: string): boolean {
  const wrapped = `/${path}`;
  if (EXCLUDED_EXACT.has(path) || EXCLUDED_PARTS.some(part => wrapped.includes(part))) return false;
  if (
    path.endsWith('.d.ts') ||
    path.endsWith('.bundle.js') ||
    path.includes('.test.') ||
    path.includes('.spec.')
  ) {
    return false;
  }
  return SOURCE_EXTENSIONS.has(extension(path)) || CONFIG_EXTENSIONS.has(extension(path));
}

function scriptKind(path: string): ts.ScriptKind {
  if (path.endsWith('.tsx')) return ts.ScriptKind.TSX;
  if (path.endsWith('.jsx')) return ts.ScriptKind.JSX;
  if (path.endsWith('.js') || path.endsWith('.mjs') || path.endsWith('.cjs')) {
    return ts.ScriptKind.JS;
  }
  return ts.ScriptKind.TS;
}

function sourceLine(source: ts.SourceFile, node: ts.Node): number {
  return source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
}

function declarationName(name: ts.DeclarationName | undefined): string | null {
  if (!name) return null;
  if (
    ts.isIdentifier(name) ||
    ts.isStringLiteralLike(name) ||
    ts.isNumericLiteral(name) ||
    ts.isPrivateIdentifier(name)
  ) {
    return name.text;
  }
  return null;
}

function enclosingSymbol(node: ts.Node): string | null {
  let current: ts.Node | undefined = node.parent;
  while (current) {
    if (
      ts.isMethodDeclaration(current) ||
      ts.isGetAccessorDeclaration(current) ||
      ts.isSetAccessorDeclaration(current)
    ) {
      const method = declarationName(current.name);
      const owner =
        ts.isClassDeclaration(current.parent) || ts.isClassExpression(current.parent)
          ? current.parent.name?.text
          : undefined;
      return method ? (owner ? `${owner}.${method}` : method) : null;
    }
    if (ts.isConstructorDeclaration(current)) {
      const owner =
        ts.isClassDeclaration(current.parent) || ts.isClassExpression(current.parent)
          ? current.parent.name?.text
          : undefined;
      return owner ? `${owner}.constructor` : 'constructor';
    }
    if (ts.isFunctionDeclaration(current) && current.name) return current.name.text;
    if (ts.isArrowFunction(current) || ts.isFunctionExpression(current)) {
      const parent = current.parent;
      if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
        return parent.name.text;
      }
      if (ts.isPropertyAssignment(parent)) return declarationName(parent.name);
    }
    current = current.parent;
  }
  return null;
}

function propertyPath(expression: ts.Expression): string | null {
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isPropertyAccessExpression(expression)) {
    const left = propertyPath(expression.expression);
    return left ? `${left}.${expression.name.text}` : null;
  }
  return null;
}

function literalText(expression: ts.Expression | undefined): string | null {
  if (!expression) return null;
  if (ts.isStringLiteralLike(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    return expression.text;
  }
  return null;
}

function objectPropertyValue(
  expression: ts.Expression | undefined,
  name: string
): ts.Expression | undefined {
  if (!expression || !ts.isObjectLiteralExpression(expression)) return undefined;
  for (const property of expression.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    const key =
      ts.isIdentifier(property.name) || ts.isStringLiteralLike(property.name)
        ? property.name.text
        : null;
    if (key === name) return property.initializer;
  }
  return undefined;
}

function cronVariant(args: readonly ts.Expression[], expressionPath: string): string {
  if (expressionPath.endsWith('.parse')) return 'parse';
  const first = args[0];
  const second = args[1];
  if (
    second &&
    (ts.isArrowFunction(second) ||
      ts.isFunctionExpression(second) ||
      ts.isMethodDeclaration(second))
  ) {
    return 'in-process';
  }
  if (
    (first && ts.isIdentifier(first) && /path|file|script/i.test(first.text)) ||
    (literalText(first)?.includes('/') ?? false)
  ) {
    return 'os-persistent';
  }
  return 'unknown';
}

function addObservation(
  observations: BunCapabilityObservation[],
  source: ts.SourceFile,
  node: ts.Node,
  path: string,
  project: string,
  token: string,
  variant: string | null,
  syntax: BunCapabilityObservation['syntax']
): void {
  observations.push({
    token,
    variant,
    path,
    symbol: enclosingSymbol(node),
    line: sourceLine(source, node),
    project,
    syntax,
  });
}

function observeSourceFile(file: SourceFile, project: string): BunCapabilityObservation[] {
  const source = ts.createSourceFile(
    file.path,
    file.content,
    ts.ScriptTarget.Latest,
    true,
    scriptKind(file.path)
  );
  const observations: BunCapabilityObservation[] = [];
  const namedAliases = new Map<string, string>();
  const namespaceAliases = new Set<string>();

  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) {
      continue;
    }
    if (statement.moduleSpecifier.text !== 'bun') continue;
    const clause = statement.importClause;
    if (!clause || clause.isTypeOnly || !clause.namedBindings) continue;
    if (ts.isNamespaceImport(clause.namedBindings)) {
      namespaceAliases.add(clause.namedBindings.name.text);
      continue;
    }
    for (const element of clause.namedBindings.elements) {
      if (element.isTypeOnly) continue;
      const imported = element.propertyName?.text ?? element.name.text;
      namedAliases.set(element.name.text, `Bun.${imported}`);
    }
  }

  const normalizePath = (raw: string | null): string | null => {
    if (!raw) return null;
    if (namedAliases.has(raw)) return namedAliases.get(raw) ?? null;
    const [root, ...rest] = raw.split('.');
    if (namespaceAliases.has(root) && rest.length > 0) return `Bun.${rest.join('.')}`;
    return raw;
  };

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
      const args = node.arguments ?? [];
      const path = normalizePath(propertyPath(node.expression));
      const syntax = ts.isNewExpression(node) ? 'ast-new' : 'ast-call';

      if (path === 'Bun.Image') {
        addObservation(
          observations,
          source,
          node,
          file.path,
          project,
          'Bun.Image',
          'image-processing',
          syntax
        );
      } else if (path === 'Bun.WebView') {
        addObservation(
          observations,
          source,
          node,
          file.path,
          project,
          'Bun.WebView',
          'headless',
          syntax
        );
      } else if (path === 'Bun.randomUUIDv7') {
        const encoding = literalText(args[0]);
        addObservation(
          observations,
          source,
          node,
          file.path,
          project,
          'Bun.randomUUIDv7',
          encoding ? `uuid-${encoding}` : 'uuid-string',
          syntax
        );
      } else if (path === 'Bun.sliceAnsi') {
        addObservation(
          observations,
          source,
          node,
          file.path,
          project,
          'Bun.sliceAnsi',
          'display-width',
          syntax
        );
      } else if (path === 'Bun.Terminal') {
        addObservation(
          observations,
          source,
          node,
          file.path,
          project,
          'Bun.Terminal',
          'pty',
          syntax
        );
      } else if (path === 'process.execve') {
        addObservation(
          observations,
          source,
          node,
          file.path,
          project,
          'process.execve',
          'process-replacement',
          syntax
        );
      } else if (path === 'Bun.cron' || path === 'Bun.cron.parse') {
        addObservation(
          observations,
          source,
          node,
          file.path,
          project,
          'Bun.cron',
          cronVariant(args, path),
          syntax
        );
      } else if (path === 'Bun.serve') {
        const http3 = objectPropertyValue(args[0], 'http3');
        if (http3?.kind === ts.SyntaxKind.TrueKeyword) {
          addObservation(
            observations,
            source,
            node,
            file.path,
            project,
            'Bun.serve http3',
            'quic-server',
            syntax
          );
        }
      } else if (path === 'fetch') {
        const protocol = literalText(objectPropertyValue(args[1], 'protocol'));
        if (protocol === 'http2') {
          addObservation(
            observations,
            source,
            node,
            file.path,
            project,
            'fetch protocol http2',
            'fetch-client',
            syntax
          );
        } else if (protocol === 'http3') {
          addObservation(
            observations,
            source,
            node,
            file.path,
            project,
            'http3',
            'fetch-client',
            syntax
          );
        }
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(source);
  return observations;
}

const TEST_FLAGS = ['--parallel', '--isolate', '--shard', '--changed'] as const;

function commandObservations(
  command: string,
  path: string,
  line: number,
  project: string,
  syntax: 'package-script' | 'workflow-command',
  symbol: string | null = null
): BunCapabilityObservation[] {
  const rows: BunCapabilityObservation[] = [];
  if (/\bbun(?:\s+--\S+)*\s+test\b/.test(command)) {
    for (const flag of TEST_FLAGS) {
      if (new RegExp(`(^|\\s)${flag.replace('-', '\\-')}(?:=|\\s|$)`).test(command)) {
        rows.push({ token: flag, variant: 'bun-test', path, symbol, line, project, syntax });
      }
    }
  }
  if (/\bbun(?:\s+--\S+)*\s+run\b/.test(command) && /(^|\s)--parallel(?:=|\s|$)/.test(command)) {
    rows.push({ token: '--parallel', variant: 'bun-run', path, symbol, line, project, syntax });
  }
  if (/\bbun\b[^\n]*--no-orphans(?:=|\s|$)/.test(command)) {
    rows.push({
      token: '--no-orphans',
      variant: 'runtime-cli',
      path,
      symbol,
      line,
      project,
      syntax,
    });
  }
  return rows;
}

function observeConfigFile(file: SourceFile, project: string): BunCapabilityObservation[] {
  if (file.path.endsWith('package.json')) {
    try {
      const parsed = JSON.parse(file.content) as { scripts?: Record<string, string> };
      const rows: BunCapabilityObservation[] = [];
      for (const [script, command] of Object.entries(parsed.scripts ?? {})) {
        const index = file.content.indexOf(command);
        const line = index < 0 ? 1 : file.content.slice(0, index).split('\n').length;
        rows.push(
          ...commandObservations(command, file.path, line, project, 'package-script', script)
        );
      }
      return rows;
    } catch {
      return [];
    }
  }
  if (file.path.endsWith('.yml') || file.path.endsWith('.yaml')) {
    return file.content
      .split('\n')
      .flatMap((line, index) =>
        commandObservations(line, file.path, index + 1, project, 'workflow-command')
      );
  }
  if (file.path.endsWith('.toml') && /\bnoOrphans\s*=\s*true\b/.test(file.content)) {
    const index = file.content.search(/\bnoOrphans\s*=\s*true\b/);
    return [
      {
        token: '--no-orphans',
        variant: 'bun-config',
        path: file.path,
        symbol: 'noOrphans',
        line: file.content.slice(0, index).split('\n').length,
        project,
        syntax: 'bun-config',
      },
    ];
  }
  return [];
}

export function inferBunBrandProject(path: string, knownProjects: readonly string[] = []): string {
  const match = [...knownProjects]
    .sort((a, b) => b.length - a.length)
    .find(project => path === project || path.startsWith(`${project}/`));
  if (match) return match;
  if (!path.startsWith('projects/')) return 'project-R-score';
  const parts = path.split('/');
  if (parts[1] === 'active' && ['enterprise', 'dashboards', 'utilities'].includes(parts[2] ?? '')) {
    return parts.slice(0, 4).join('/');
  }
  return parts.slice(0, 3).join('/');
}

export function observeBunCapabilities(
  files: readonly SourceFile[],
  knownProjects: readonly string[] = []
): BunCapabilityObservation[] {
  const sorted = files
    .flatMap(file => {
      const project = inferBunBrandProject(file.path, knownProjects);
      return SOURCE_EXTENSIONS.has(extension(file.path))
        ? observeSourceFile(file, project)
        : observeConfigFile(file, project);
    })
    .sort(
      (a, b) =>
        a.token.localeCompare(b.token) ||
        (a.variant ?? '').localeCompare(b.variant ?? '') ||
        a.path.localeCompare(b.path) ||
        a.line - b.line
    );
  const occurrences = new Map<string, number>();
  return sorted.map(row => {
    const group = `${row.token}|${row.variant ?? 'default'}|${row.path}`;
    const occurrence = (occurrences.get(group) ?? 0) + 1;
    occurrences.set(group, occurrence);
    return { ...row, occurrence };
  });
}

export function observationKey(row: BunCapabilityObservation): string {
  return `${row.token}|${row.variant ?? 'default'}|${row.path}#${row.occurrence ?? 1}`;
}

function declarationMatches(
  declaration: BunBrandUsageDeclaration,
  observation: BunCapabilityObservation
): boolean {
  return (
    declaration.token === observation.token &&
    declaration.variant === observation.variant &&
    declaration.implementations.some(
      ref => ref.path === observation.path && ref.symbol === observation.symbol
    )
  );
}

function proofState(
  declaration: BunBrandUsageDeclaration,
  releases: ReadonlyMap<string, ReleaseProof>,
  generatedAt: string
): {
  state: BunBrandEvidenceState;
  proofs: Array<{ source: string; key: string; state: 'passed' | 'failed' | 'missing' | 'stale' }>;
} {
  if (declaration.proofs.length === 0) return { state: 'declared-unproven', proofs: [] };
  let state: BunBrandEvidenceState = 'verified';
  const proofs = declaration.proofs.map(proof => {
    const report = releases.get(proof.source);
    const result =
      proof.key.startsWith('result:') && report
        ? report.results.find(row => row.canonicalKey === proof.key.slice('result:'.length))
        : undefined;
    if (!report || !result || typeof result.passed !== 'boolean') {
      state = 'declared-unproven';
      return { source: proof.source, key: proof.key, state: 'missing' as const };
    }
    if (!result.passed) {
      state = 'failed';
      return { source: proof.source, key: proof.key, state: 'failed' as const };
    }
    if (proof.maxAgeDays) {
      const ageMs = Date.parse(generatedAt) - Date.parse(report.timestamp);
      if (ageMs > proof.maxAgeDays * 86_400_000) {
        state = 'stale';
        return { source: proof.source, key: proof.key, state: 'stale' as const };
      }
    }
    return { source: proof.source, key: proof.key, state: 'passed' as const };
  });
  return { state, proofs };
}

function comparable(value: BunBrandMapPayload): BunBrandMapPayload {
  return { ...value, generatedAt: '' };
}

function sourceDigest(value: object): string {
  return new Bun.CryptoHasher('sha256').update(JSON.stringify(value)).digest('hex');
}

export type BunBrandMapPayload = ReturnType<typeof buildBunBrandMap>;

export function buildBunBrandMap(input: {
  declarations: readonly BunBrandUsageDeclaration[];
  catalog: Catalog;
  manifest: BrandManifest;
  brandKeymap: BrandKeymap;
  trackedPaths: ReadonlySet<string>;
  observations: readonly BunCapabilityObservation[];
  baseline: ReadonlySet<string>;
  releases: ReadonlyMap<string, ReleaseProof>;
  generatedAt?: string;
}) {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const catalogTokens = new Map(input.catalog.entries.map(row => [row.name, row]));
  const brandNames = new Set(input.manifest.brands.map(row => row.name));
  const ownerLanes = new Set([...input.manifest.domains, 'runtime-tooling']);
  assertBunBrandUsages(input.declarations, {
    catalogTokens,
    brandNames,
    ownerLanes,
    trackedPaths: input.trackedPaths,
    today: generatedAt.slice(0, 10),
  });

  const declarationObservations = new Map<string, BunCapabilityObservation[]>();
  const undeclared = input.observations.filter(observation => {
    const declaration = input.declarations.find(row => declarationMatches(row, observation));
    if (!declaration) return true;
    const rows = declarationObservations.get(declaration.key) ?? [];
    rows.push(observation);
    declarationObservations.set(declaration.key, rows);
    return false;
  });

  const findings: Array<{
    key: string;
    kind: string;
    severity: 'warning' | 'error';
    api: string;
    path: string;
    line: number;
    detail: string;
    baseline: boolean;
  }> = undeclared.map(row => {
    const key = observationKey(row);
    const baseline = input.baseline.has(key);
    return {
      key,
      kind: 'observed-undeclared',
      severity: baseline ? 'warning' : 'error',
      api: row.token,
      path: row.path,
      line: row.line,
      detail: `${row.token}${row.variant ? ` (${row.variant})` : ''} has no reviewed declaration for this owner path`,
      baseline,
    };
  });

  const catalogConflicts: Array<{
    declaration: string;
    token: string;
    catalogVersion: string;
    proofVersion: string;
  }> = [];

  const capabilities = input.declarations.map(declaration => {
    const token = catalogTokens.get(declaration.token)!;
    const evidence = proofState(declaration, input.releases, generatedAt);
    for (const proof of declaration.proofs) {
      if (!proof.key.startsWith('result:')) continue;
      const result = input.releases
        .get(proof.source)
        ?.results.find(row => row.canonicalKey === proof.key.slice('result:'.length));
      if (token.releasedIn && result?.introducedIn && token.releasedIn !== result.introducedIn) {
        catalogConflicts.push({
          declaration: declaration.key,
          token: declaration.token,
          catalogVersion: token.releasedIn,
          proofVersion: result.introducedIn,
        });
      }
    }
    const observations = declarationObservations.get(declaration.key) ?? [];
    const projects = [
      ...new Set([
        ...declaration.implementations.map(ref =>
          inferBunBrandProject(
            ref.path,
            input.brandKeymap.projects.map(row => row.project)
          )
        ),
        ...observations.map(row => row.project),
      ]),
    ].sort();
    const attention: string[] = [];
    if (evidence.state !== 'verified') attention.push(evidence.state);
    if (token.stability === 'experimental') attention.push('experimental');
    if (declaration.policy === 'lab-only') attention.push('lab-only');
    return {
      id: declaration.key,
      key: declaration.key,
      token: declaration.token as string,
      variant: declaration.variant,
      kind: token.type,
      versionIntroduced: token.releasedIn ?? null,
      stability: token.stability,
      docsUrl: token.docsUrl ?? null,
      scope: declaration.scope,
      policy: declaration.policy,
      ownerLane: declaration.ownerLane,
      implementations: declaration.implementations,
      consumers: declaration.consumers,
      brands: declaration.relationships,
      proofs: evidence.proofs,
      evidenceState: evidence.state,
      projects,
      observations: observations.length,
      attention,
    };
  });

  for (const capability of capabilities) {
    if (capability.evidenceState === 'verified') continue;
    const hard = capability.policy === 'production-approved';
    findings.push({
      key: `proof-state|${capability.key}`,
      kind: 'proof-state',
      severity: hard ? 'error' : 'warning',
      api: capability.token,
      path: capability.implementations[0]?.path ?? 'lib/docs/bun-brand-usages.ts',
      line: 1,
      detail: `${capability.policy} capability is ${capability.evidenceState}`,
      baseline: false,
    });
  }

  for (const conflict of catalogConflicts) {
    findings.push({
      key: `catalog-conflict|${conflict.declaration}`,
      kind: 'catalog-conflict',
      severity: 'error',
      api: conflict.token,
      path: 'tools/bun-docs-catalog.json',
      line: 1,
      detail: `catalog ${conflict.catalogVersion} != proof ${conflict.proofVersion}`,
      baseline: false,
    });
  }

  const relationships = input.declarations.flatMap(declaration => {
    const evidence = capabilities.find(row => row.key === declaration.key)!;
    return declaration.implementations.flatMap((implementation, implementationIndex) =>
      declaration.relationships.map((relationship, relationshipIndex) => ({
        id: `${declaration.key}:${implementationIndex}:${relationshipIndex}`,
        key: `${declaration.key}:${implementationIndex}:${relationshipIndex}`,
        capabilityId: declaration.key,
        capabilityKey: declaration.key,
        api: declaration.token as string,
        variant: declaration.variant,
        brand: relationship.brand,
        direction: relationship.direction,
        rationale: relationship.rationale,
        wrapper: implementation.path,
        wrapperSymbol: implementation.symbol,
        consumer:
          declaration.consumers[implementationIndex]?.path ??
          declaration.consumers[0]?.path ??
          null,
        consumerSymbol:
          declaration.consumers[implementationIndex]?.symbol ??
          declaration.consumers[0]?.symbol ??
          null,
        project: inferBunBrandProject(
          implementation.path,
          input.brandKeymap.projects.map(row => row.project)
        ),
        policy: declaration.policy,
        evidenceState: evidence.evidenceState,
        proofs: declaration.proofs.map(row => `${row.source}#${row.key}`),
      }))
    );
  });

  const projectRows = input.brandKeymap.projects.map(project => {
    const projectObservations = input.observations.filter(row => row.project === project.project);
    const projectRelationships = relationships.filter(row => row.project === project.project);
    const projectFindings = findings.filter(
      row =>
        inferBunBrandProject(
          row.path,
          input.brandKeymap.projects.map(p => p.project)
        ) === project.project
    );
    return {
      path: project.project,
      status: project.status,
      capabilities: [...new Set(projectRelationships.map(row => row.api))].sort(),
      relationships: projectRelationships.length,
      brands: [...new Set(projectRelationships.map(row => row.brand).filter(Boolean))].sort(),
      verified: projectRelationships.filter(row => row.evidenceState === 'verified').length,
      attention: projectFindings.length,
      observed: projectObservations.length,
      undeclared: projectFindings.filter(row => row.kind === 'observed-undeclared').length,
      legacyUndeclared: projectFindings.filter(
        row => row.kind === 'observed-undeclared' && row.baseline
      ).length,
    };
  });

  const baselineUndeclared = findings.filter(
    row => row.kind === 'observed-undeclared' && row.baseline
  ).length;
  const newUndeclared = findings.filter(
    row => row.kind === 'observed-undeclared' && !row.baseline
  ).length;
  const externalProjects = projectRows.filter(row => row.status === 'external-or-untracked').length;
  const trackedProjects = projectRows.length - externalProjects;

  return {
    schemaVersion: 1,
    kind: 'bun-brand-map',
    path: BUN_BRAND_MAP_URL,
    generatedAt,
    sources: {
      declarations: 'lib/docs/bun-brand-usages.ts',
      catalog: 'tools/bun-docs-catalog.json',
      brands: 'lib/types/brand-manifest.json',
      brandKeymap: 'public/registry/brand-keymap.json',
      baseline: BUN_BRAND_BASELINE_PATH,
      proof: 'public/registry/release-features.json',
    },
    sourceDigests: {
      declarations: sourceDigest(input.declarations),
      catalog: sourceDigest(input.catalog),
      brandManifest: sourceDigest(input.manifest),
      brandKeymap: sourceDigest(input.brandKeymap),
      observations: sourceDigest(input.observations),
      baseline: sourceDigest([...input.baseline].sort()),
      proofs: sourceDigest(
        [...input.releases.entries()].sort(([left], [right]) => left.localeCompare(right))
      ),
    },
    summary: {
      apis: new Set(input.declarations.map(row => row.token)).size,
      relationships: relationships.length,
      wrappers: new Set(input.declarations.flatMap(row => row.implementations.map(ref => ref.path)))
        .size,
      projects: trackedProjects,
      verified: capabilities.filter(row => row.evidenceState === 'verified').length,
      attention: findings.length + capabilities.filter(row => row.attention.length > 0).length,
      declared: input.declarations.length,
      observed: input.observations.length,
      matched: input.observations.length - undeclared.length,
      undeclared: undeclared.length,
      baselineUndeclared,
      legacyUndeclared: baselineUndeclared,
      newUndeclared,
      catalogConflicts: catalogConflicts.length,
      productionProofErrors: findings.filter(
        row => row.kind === 'proof-state' && row.severity === 'error'
      ).length,
      stale: capabilities.filter(row => row.evidenceState === 'stale').length,
      experimentalApprovals: input.declarations.filter(row => row.experimentalApproval).length,
      brands: input.manifest.brandCount,
      mappedBrands: new Set(
        input.declarations.flatMap(row =>
          row.relationships.flatMap(relationship =>
            relationship.brand ? [relationship.brand] : []
          )
        )
      ).size,
      totalCanonicalBrands: input.manifest.brandCount,
      trackedProjects,
      externalProjects,
    },
    capabilities,
    relationships,
    brands: input.manifest.brands.map(brand => {
      const brandRelationships = relationships.filter(row => row.brand === brand.name);
      return {
        name: brand.name,
        domain: brand.domain,
        capabilities: [...new Set(brandRelationships.map(row => row.api))].sort(),
        relationships: brandRelationships.length,
        projects: [...new Set(brandRelationships.map(row => row.project))].sort(),
      };
    }),
    projects: projectRows,
    findings: findings.sort(
      (a, b) => a.severity.localeCompare(b.severity) || a.key.localeCompare(b.key)
    ),
  } as const;
}

async function trackedFiles(root: string): Promise<{ paths: string[]; files: SourceFile[] }> {
  const proc = Bun.spawn(['git', 'ls-files', '-z'], {
    cwd: root,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (exitCode !== 0) throw new Error(`git ls-files failed: ${stderr.trim()}`);
  const paths = stdout.split('\0').filter(Boolean);
  const scanPaths = paths.filter(isBunBrandScanPath);
  const files = await Promise.all(
    scanPaths.map(async path => ({ path, content: await Bun.file(`${root}/${path}`).text() }))
  );
  return { paths, files };
}

async function loadBaseline(root: string): Promise<BunBrandUsageBaseline> {
  const file = Bun.file(`${root}/${BUN_BRAND_BASELINE_PATH}`);
  if (!(await file.exists())) {
    return { schemaVersion: 1, kind: 'bun-brand-usage-baseline', keys: [] };
  }
  return file.json() as Promise<BunBrandUsageBaseline>;
}

export async function loadBunBrandMapInput(root: string, generatedAt?: string) {
  const [catalog, manifest, brandKeymap, releaseFeatures, baseline, tracked] = await Promise.all([
    Bun.file(`${root}/tools/bun-docs-catalog.json`).json() as Promise<Catalog>,
    Bun.file(`${root}/lib/types/brand-manifest.json`).json() as Promise<BrandManifest>,
    Bun.file(`${root}/public/registry/brand-keymap.json`).json() as Promise<BrandKeymap>,
    Bun.file(`${root}/public/registry/release-features.json`).json() as Promise<ReleaseProof>,
    loadBaseline(root),
    trackedFiles(root),
  ]);
  const knownProjects = brandKeymap.projects.map(row => row.project);
  const observations = observeBunCapabilities(tracked.files, knownProjects);
  return {
    declarations: BUN_BRAND_USAGES,
    catalog,
    manifest,
    brandKeymap,
    trackedPaths: new Set(tracked.paths),
    observations,
    baseline: new Set(baseline.keys),
    releases: new Map([['public/registry/release-features.json', releaseFeatures]]),
    generatedAt,
  };
}

async function main(): Promise<void> {
  const root = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
  const args = new Set(Bun.argv.slice(2));

  if (args.has('--write-baseline')) {
    const input = await loadBunBrandMapInput(root);
    const payload = buildBunBrandMap({ ...input, baseline: new Set() });
    const keys = payload.findings
      .filter(row => row.kind === 'observed-undeclared')
      .map(row => row.key)
      .sort();
    const baseline: BunBrandUsageBaseline = {
      schemaVersion: 1,
      kind: 'bun-brand-usage-baseline',
      keys,
    };
    await Bun.write(`${root}/${BUN_BRAND_BASELINE_PATH}`, `${JSON.stringify(baseline, null, 2)}\n`);
    console.info(`✅ wrote ${BUN_BRAND_BASELINE_PATH} (${keys.length} legacy findings)`);
    return;
  }

  const payload = buildBunBrandMap(await loadBunBrandMapInput(root));
  const target = `${root}/${BUN_BRAND_MAP_PATH}`;

  if (args.has('--json')) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }
  if (args.has('--check')) {
    const targetFile = Bun.file(target);
    if (!(await targetFile.exists())) {
      throw new Error(`missing ${BUN_BRAND_MAP_PATH}; run bun tools/bun-brand-map.ts`);
    }
    const current = (await targetFile.json()) as BunBrandMapPayload;
    if (JSON.stringify(comparable(current)) !== JSON.stringify(comparable(payload))) {
      throw new Error(`${BUN_BRAND_MAP_PATH} is stale; run bun tools/bun-brand-map.ts`);
    }
    const hardErrors = payload.findings.filter(row => row.severity === 'error').length;
    if (hardErrors > 0) {
      throw new Error(
        `${hardErrors} hard error(s): ${payload.summary.newUndeclared} new undeclared use(s), ${payload.summary.catalogConflicts} catalog conflict(s)`
      );
    }
    console.info(
      `✅ Bun brand map current (${payload.summary.declared} declarations · ${payload.summary.baselineUndeclared} legacy warnings)`
    );
    return;
  }

  await Bun.write(target, `${JSON.stringify(payload, null, 2)}\n`);
  console.info(
    `✅ wrote ${BUN_BRAND_MAP_PATH} (${payload.summary.declared} declarations · ${payload.summary.baselineUndeclared} legacy warnings · ${payload.summary.newUndeclared} new)`
  );
  if (payload.findings.some(row => row.severity === 'error')) process.exit(1);
}

if (import.meta.main) {
  await main();
}

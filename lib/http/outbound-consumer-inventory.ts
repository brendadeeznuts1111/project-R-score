// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @updated Bun.CryptoHasher · changed v0.5.0 · 2023-01-18 · https://bun.com/blog/bun-v0.5.0
// @updated Bun.CryptoHasher · fixed v1.0.19 · 2023-12-22 · https://bun.com/blog/bun-v1.0.19
// @updated Bun.CryptoHasher · changed v1.0.21 · 2024-01-02 · https://bun.com/blog/bun-v1.0.21
// @updated Bun.CryptoHasher · fixed v1.1.11 · 2024-06-01 · https://bun.com/blog/bun-v1.1.11
// @updated Bun.CryptoHasher · fixed v1.1.32 · 2024-10-21 · https://bun.com/blog/bun-v1.1.32
// @updated Bun.CryptoHasher · fixed v1.1.35 · 2024-11-19 · https://bun.com/blog/bun-v1.1.35
// @verified Bun.CryptoHasher · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/hashing#bun-cryptohasher
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @updated Bun.file · fixed v0.2.2 · 2022-10-27 · https://bun.com/blog/bun-v0.2.2
// @updated Bun.file · changed v0.6.0 · 2023-05-16 · https://bun.com/blog/bun-v0.6.0
// @updated Bun.file · fixed v0.6.5 · 2023-05-29 · https://bun.com/blog/bun-v0.6.5
// @updated Bun.file · changed v0.6.12 · 2023-06-30 · https://bun.com/blog/bun-v0.6.12
// @updated Bun.file · fixed v1.0.1 · 2023-09-12 · https://bun.com/blog/bun-v1.0.1
// @updated Bun.file · fixed v1.0.2 · 2023-09-15 · https://bun.com/blog/bun-v1.0.2
// @updated Bun.file · changed v1.0.16 · 2023-12-10 · https://bun.com/blog/bun-v1.0.16
// @updated Bun.file · changed v1.0.21 · 2024-01-02 · https://bun.com/blog/bun-v1.0.21
// @updated Bun.file · fixed v1.0.21 · 2024-01-02 · https://bun.com/blog/bun-v1.0.21
// @updated Bun.file · fixed v1.0.23 · 2024-01-16 · https://bun.com/blog/bun-v1.0.23
// @updated Bun.file · fixed v1.0.24 · 2024-01-20 · https://bun.com/blog/bun-v1.0.24
// @updated Bun.file · fixed v1.0.25 · 2024-01-21 · https://bun.com/blog/bun-v1.0.25
// @updated Bun.file · fixed v1.0.26 · 2024-02-03 · https://bun.com/blog/bun-v1.0.26
// @updated Bun.file · fixed v1.0.27 · 2024-02-17 · https://bun.com/blog/bun-v1.0.27
// @updated Bun.file · fixed v1.0.28 · 2024-02-19 · https://bun.com/blog/bun-v1.0.28
// @updated Bun.file · changed v1.0.36 · 2024-03-29 · https://bun.com/blog/bun-v1.0.36
// @updated Bun.file · changed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.file · fixed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.file · fixed v1.1.6 · 2024-04-28 · https://bun.com/blog/bun-v1.1.6
// @updated Bun.file · changed v1.1.9 · 2024-05-22 · https://bun.com/blog/bun-v1.1.9
// @updated Bun.file · fixed v1.1.11 · 2024-06-01 · https://bun.com/blog/bun-v1.1.11
// @updated Bun.file · fixed v1.1.22 · 2024-08-07 · https://bun.com/blog/bun-v1.1.22
// @updated Bun.file · fixed v1.1.27 · 2024-09-07 · https://bun.com/blog/bun-v1.1.27
// @updated Bun.file · fixed v1.1.28 · 2024-09-18 · https://bun.com/blog/bun-v1.1.28
// @updated Bun.file · fixed v1.1.37 · 2024-11-26 · https://bun.com/blog/bun-v1.1.37
// @updated Bun.file · changed v1.1.39 · 2024-12-17 · https://bun.com/blog/bun-v1.1.39
// @updated Bun.file · changed v1.1.43 · 2025-01-08 · https://bun.com/blog/bun-v1.1.43
// @updated Bun.file · changed v1.2.0 · 2025-01-22 · https://bun.com/blog/bun-v1.2
// @updated Bun.file · fixed v1.2.2 · 2025-02-01 · https://bun.com/blog/bun-v1.2.2
// @updated Bun.file · changed v1.2.3 · 2025-02-22 · https://bun.com/blog/bun-v1.2.3
// @updated Bun.file · fixed v1.2.3 · 2025-02-22 · https://bun.com/blog/bun-v1.2.3
// @updated Bun.file · changed v1.2.19 · 2025-07-19 · https://bun.com/blog/bun-v1.2.19
// @updated Bun.file · fixed v1.2.19 · 2025-07-19 · https://bun.com/blog/bun-v1.2.19
// @updated Bun.file · fixed v1.2.20 · 2025-08-10 · https://bun.com/blog/bun-v1.2.20
// @updated Bun.file · changed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.file · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.file · fixed v1.3.6 · 2026-01-13 · https://bun.com/blog/bun-v1.3.6
// @updated Bun.file · fixed v1.3.10 · 2026-02-26 · https://bun.com/blog/bun-v1.3.10
// @updated Bun.file · fixed v1.3.11 · 2026-03-18 · https://bun.com/blog/bun-v1.3.11
// @updated Bun.file · fixed v1.3.12 · 2026-04-09 · https://bun.com/blog/bun-v1.3.12
// @updated Bun.file · changed v1.3.13 · 2026-04-20 · https://bun.com/blog/bun-v1.3.13
// @updated Bun.file · fixed v1.3.13 · 2026-04-20 · https://bun.com/blog/bun-v1.3.13
// @updated Bun.file · changed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @updated Bun.file · fixed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @verified Bun.file · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/file-io
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
import ts from 'typescript';
import { joinPath, relativePath } from '../path-bun.ts';

export const OUTBOUND_SCAN_ROOTS = [
  'lib',
  'packages',
  'scripts',
  'tools',
  'server',
  'projects/active',
] as const;

const SOURCE_GLOB = new Bun.Glob('**/*.{ts,tsx,js,jsx,mjs,cjs}');
const EXCLUDED_SEGMENTS = [
  '/node_modules/',
  '/dist/',
  '/build/',
  '/coverage/',
  '/vendor/',
  '/frontend/',
  '/client/',
  '/examples/',
  '/test/',
  '/tests/',
  '/__tests__/',
] as const;

export type OutboundConsumerClassification =
  'owned-policy-boundary' | 'intentional-native-probe' | 'unowned';

export interface OutboundConsumerDiscovery {
  readonly id: string; // brand-ok — structural manifest identity, not a domain entity ID
  readonly path: string;
  readonly line: number;
  readonly column: number;
  readonly callee: OutboundConsumerCallee;
  readonly fingerprint: string;
}

export type OutboundConsumerCallee =
  | 'fetch'
  | 'Bun.fetch'
  | 'fetchWithPolicy'
  | 'fetchPublicResource'
  | 'fetchRegistryReadTokenless'
  | 'fetchKimiRisk'
  | 'fetchPinnacleOddsEndpoint'
  | 'fetchTelegramBotApi'
  | 'fetchPartnerSourceHealth'
  | 'fetchPredictionProvider'
  | 'fetchInternalProxy'
  | 'fetchWebhookEndpoint';

const OWNED_BOUNDARY_CALLEES = new Set<OutboundConsumerCallee>([
  'fetchWithPolicy',
  'fetchPublicResource',
  'fetchRegistryReadTokenless',
  'fetchKimiRisk',
  'fetchPinnacleOddsEndpoint',
  'fetchTelegramBotApi',
  'fetchPartnerSourceHealth',
  'fetchPredictionProvider',
  'fetchInternalProxy',
  'fetchWebhookEndpoint',
]);

export interface OutboundConsumerManifestRow extends OutboundConsumerDiscovery {
  readonly classification: OutboundConsumerClassification;
  readonly owner: string;
  readonly reason: string;
}

export interface OutboundConsumerManifest {
  readonly version: 1;
  readonly rows: readonly OutboundConsumerManifestRow[];
}

function isExcluded(repoPath: string): boolean {
  const wrapped = `/${repoPath}`;
  return (
    EXCLUDED_SEGMENTS.some(segment => wrapped.includes(segment)) ||
    /(?:^|\/)[^/]+\.(?:test|spec)\.[cm]?[jt]sx?$/.test(repoPath) ||
    repoPath.endsWith('.d.ts')
  );
}

function scriptKind(repoPath: string): ts.ScriptKind {
  if (repoPath.endsWith('.tsx')) return ts.ScriptKind.TSX;
  if (repoPath.endsWith('.jsx')) return ts.ScriptKind.JSX;
  if (/\.[cm]?js$/.test(repoPath)) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

function calleeName(node: ts.CallExpression): OutboundConsumerDiscovery['callee'] | undefined {
  if (ts.isIdentifier(node.expression)) {
    if (node.expression.text === 'fetch') return 'fetch';
    if (OWNED_BOUNDARY_CALLEES.has(node.expression.text as OutboundConsumerCallee)) {
      return node.expression.text as OutboundConsumerCallee;
    }
  }
  if (
    ts.isPropertyAccessExpression(node.expression) &&
    ts.isIdentifier(node.expression.expression) &&
    node.expression.expression.text === 'Bun' &&
    node.expression.name.text === 'fetch'
  ) {
    return 'Bun.fetch';
  }
  return undefined;
}

function normalizeExpression(node: ts.CallExpression, source: ts.SourceFile): string {
  return node.getText(source).replace(/\s+/g, ' ').trim();
}

function structuralFingerprint(value: string): string {
  return new Bun.CryptoHasher('sha256').update(value).digest('hex').slice(0, 16);
}

export async function discoverOutboundConsumers(
  repoRoot: string
): Promise<readonly OutboundConsumerDiscovery[]> {
  const rows: Array<Omit<OutboundConsumerDiscovery, 'id'>> = [];
  for (const scanRoot of OUTBOUND_SCAN_ROOTS) {
    const absoluteRoot = joinPath(repoRoot, scanRoot);
    if (!(await Bun.file(absoluteRoot).exists()) && scanRoot === 'server') continue;
    for await (const absoluteFile of SOURCE_GLOB.scan({
      cwd: absoluteRoot,
      absolute: true,
      onlyFiles: true,
    })) {
      const repoPath = relativePath(repoRoot, absoluteFile);
      if (isExcluded(repoPath)) continue;
      const text = await Bun.file(absoluteFile).text();
      const source = ts.createSourceFile(
        repoPath,
        text,
        ts.ScriptTarget.Latest,
        true,
        scriptKind(repoPath)
      );
      const visit = (node: ts.Node): void => {
        if (ts.isCallExpression(node)) {
          const callee = calleeName(node);
          if (callee) {
            const position = source.getLineAndCharacterOfPosition(node.getStart(source));
            rows.push({
              path: repoPath,
              line: position.line + 1,
              column: position.character + 1,
              callee,
              fingerprint: structuralFingerprint(normalizeExpression(node, source)),
            });
          }
        }
        ts.forEachChild(node, visit);
      };
      visit(source);
    }
  }

  rows.sort(
    (left, right) =>
      left.path.localeCompare(right.path) ||
      left.line - right.line ||
      left.column - right.column ||
      left.callee.localeCompare(right.callee)
  );
  const occurrences = new Map<string, number>();
  return rows.map(row => {
    const base = `${row.path}#${row.callee}#${row.fingerprint}`;
    const occurrence = (occurrences.get(base) ?? 0) + 1;
    occurrences.set(base, occurrence);
    return { id: `${base}#${occurrence}`, ...row };
  });
}

export function compareOutboundInventory(
  discovered: readonly OutboundConsumerDiscovery[],
  manifest: OutboundConsumerManifest
): { readonly additions: readonly string[]; readonly removals: readonly string[] } {
  const discoveredIds = new Set(discovered.map(row => row.id));
  const manifestIds = new Set(manifest.rows.map(row => row.id));
  return {
    additions: discovered.filter(row => !manifestIds.has(row.id)).map(row => row.id),
    removals: manifest.rows.filter(row => !discoveredIds.has(row.id)).map(row => row.id),
  };
}

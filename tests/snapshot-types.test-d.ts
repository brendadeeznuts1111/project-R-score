/**
 * Compile-only snapshot CLI type assertions.
 *
 * `expectTypeOf` is a runtime no-op. TypeScript verifies these assertions with:
 *
 *   bun run check:snapshot:types
 *
 * @see https://bun.com/docs/test/writing-tests#type-testing
 */
import { expectTypeOf } from 'bun:test';
import type {
  ParsedSnapshotFlags,
  SnapshotFilterOptions,
  SnapshotManifest,
  SnapshotRunOptions,
} from '../tools/snapshot-types.ts';
import type { SnapshotScopeConfig, SnapshotScopeName } from '../tools/snapshot-scopes.ts';
import { isSnapshotScope, resolveSnapshotUrl, scopeConfigs } from '../tools/snapshot-scopes.ts';

expectTypeOf<SnapshotScopeName>().toEqualTypeOf<'prediction' | 'portal' | 'gaps' | 'limits'>();
expectTypeOf('prediction' as SnapshotScopeName).toBeString();

expectTypeOf(isSnapshotScope).toBeFunction();
expectTypeOf(isSnapshotScope).parameters.toEqualTypeOf<[name: string]>();
expectTypeOf(isSnapshotScope).returns.toEqualTypeOf<boolean>();

expectTypeOf(resolveSnapshotUrl).toBeFunction();
expectTypeOf(resolveSnapshotUrl).parameters.toEqualTypeOf<[baseUrl: string, path: string]>();
expectTypeOf(resolveSnapshotUrl).returns.toBeString();

function narrowScope(name: string): SnapshotScopeName | undefined {
  if (isSnapshotScope(name)) {
    expectTypeOf(name).toEqualTypeOf<SnapshotScopeName>();
    return name;
  }
  return undefined;
}
void narrowScope;

expectTypeOf(scopeConfigs).toMatchObjectType<Record<SnapshotScopeName, SnapshotScopeConfig>>();
expectTypeOf(scopeConfigs.prediction).toMatchObjectType<{
  label: string;
  reportPath: string;
  reportKind: 'html' | 'json';
}>();
expectTypeOf(scopeConfigs.prediction.reportKind).toEqualTypeOf<'html' | 'json'>();
expectTypeOf(scopeConfigs.gaps.assetPaths).items.toBeString();

expectTypeOf<SnapshotManifest['scope']>().toEqualTypeOf<SnapshotScopeName>();
expectTypeOf<SnapshotManifest['metadata']>().toEqualTypeOf<Record<string, string>>();
expectTypeOf<SnapshotManifest['files']>().items.toBeString();
expectTypeOf<SnapshotManifest['fileCount']>().toBeNumber();

const manifest: SnapshotManifest = {
  id: 'prediction-abc',
  scope: 'prediction',
  reportType: 'prediction',
  capturedAt: '2026-07-28T00:00:00.000Z',
  commit: 'deadbeef',
  branch: 'main',
  bunVersion: '1.0.0',
  baseUrl: 'http://localhost:3000',
  fileCount: 0,
  files: [],
  metadata: { status: 'ok' },
};
expectTypeOf(manifest).toMatchObjectType<{ scope: SnapshotScopeName }>();
expectTypeOf(manifest.scope).toEqualTypeOf<SnapshotScopeName>();

// @ts-expect-error — scope must be SnapshotScopeName, not arbitrary string
const badScope: SnapshotManifest = { ...manifest, scope: 'not-a-scope' };
void badScope;

expectTypeOf<SnapshotRunOptions['scope']>().toEqualTypeOf<SnapshotScopeName>();
expectTypeOf<SnapshotRunOptions>().toMatchObjectType<{
  scope: SnapshotScopeName;
  baseUrl?: string;
  dryRun?: boolean;
  debug?: boolean;
}>();

expectTypeOf<SnapshotFilterOptions>().toMatchObjectType<{
  scope?: SnapshotScopeName;
  grep?: string;
  debug?: boolean;
}>();

expectTypeOf<ParsedSnapshotFlags>().toMatchObjectType<{
  scope?: string;
  baseUrl: string;
  dryRun: boolean;
  debug: boolean;
  positional: string[];
}>();

const flags: ParsedSnapshotFlags = {
  baseUrl: 'http://localhost:3000',
  dryRun: false,
  debug: true,
  positional: ['grep', 'bias>2'],
};
expectTypeOf(flags.baseUrl).toBeString();
expectTypeOf(flags.dryRun).toBeBoolean();
expectTypeOf(flags.debug).toBeBoolean();
expectTypeOf(flags.positional).items.toBeString();

type RunSnapshotResult = Promise<SnapshotManifest | null>;
type ReadIndexResult = Promise<SnapshotManifest[]>;

expectTypeOf<RunSnapshotResult>().resolves.toEqualTypeOf<SnapshotManifest | null>();
expectTypeOf<ReadIndexResult>().resolves.toEqualTypeOf<SnapshotManifest[]>();
expectTypeOf<ReadIndexResult>().resolves.items.toMatchObjectType<SnapshotManifest>();

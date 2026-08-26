import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  assertPublicationRouteEnabled,
  parseReleaseTargets,
  validateChannel,
  validateExpectedBinaries,
  validateExportClosure,
  validateJunitXml,
  validatePackageReleaseMetadata,
  type ReleaseTarget,
} from '../scripts/release-artifact.ts';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map(directory =>
      rm(directory, { recursive: true, force: true })
    )
  );
});

function target(overrides: Partial<ReleaseTarget> = {}): ReleaseTarget {
  return {
    target: 'registry-client',
    packageName: '@factorywager/registry-client',
    packageDirectory: 'packages/registry-client',
    buildCommand: ['bun', 'run', 'build'],
    testCommand: [
      'bun',
      'scripts/run-with-junit-env.ts',
      'test',
      'tests/registry-sdk.test.ts',
      '--reporter=junit',
      '--reporter-outfile=tmp/releases/registry-client/junit.xml',
    ],
    junitPath: 'tmp/releases/registry-client/junit.xml',
    expectedJunitFiles: ['tests/registry-sdk.test.ts'],
    sourceInputs: [
      '.bun-version',
      'bun.lock',
      'config/release-targets.json',
      'lib/path-bun.ts',
      'package.json',
      'packages/registry-client/LICENSE',
      'packages/registry-client/README.md',
      'packages/registry-client/package.json',
      'packages/registry-client/tsconfig.json',
      'packages/registry-client/src/index.ts',
      'scripts/release-artifact.ts',
      'scripts/lib/release-artifact-io.ts',
      'scripts/lib/release-artifact-lifecycle.ts',
      'scripts/lib/release-artifact-runner.ts',
      'scripts/lib/release-junit-contract.ts',
      'scripts/lib/release-package-contract.ts',
      'scripts/lib/release-receipt-io.ts',
      'scripts/lib/release-target-contract.ts',
      'scripts/run-with-junit-env.ts',
      'scripts/verify-registry-client-package.ts',
      'tests/registry-sdk.test.ts',
    ],
    archiveDirectory: 'tmp/releases/registry-client',
    allowedChannels: ['latest', 'next'],
    expectedBinaries: [],
    requiredPackageFiles: [
      'package.json',
      'LICENSE',
      'README.md',
      'dist/index.js',
      'dist/index.d.ts',
    ],
    hashArtifacts: ['dist/index.js', 'dist/index.d.ts'],
    allowedGeneratedFiles: ['tsconfig.tsbuildinfo'],
    publicationRoutes: {
      'native-npm': { enabled: false },
      'factory-artifact': { enabled: false },
    },
    ...overrides,
  };
}

function manifest(targetOverrides: Record<string, unknown> = {}): unknown {
  return {
    schemaVersion: 1,
    readRegistryUrl: 'https://registry.factory-wager.com/api/npm',
    targets: [{ ...target(), ...targetOverrides }],
  };
}

function junit(commit = 'abc123', counters = 'tests="2" failures="0" errors="0"'): string {
  return `<?xml version="1.0"?><testsuites ${counters}><testsuite file="tests/registry-sdk.test.ts" ${counters}><properties><property name="commit" value="${commit}" /></properties><testcase name="one" /></testsuite></testsuites>`;
}

async function commandText(command: string[], cwd: string): Promise<string> {
  const process = Bun.spawn(command, { cwd, stdout: 'pipe', stderr: 'pipe' });
  const [stdout, exitCode] = await Promise.all([
    new Response(process.stdout).text(),
    process.exited,
  ]);
  expect(exitCode).toBe(0);
  return stdout.trim();
}

describe('release target manifest', () => {
  test('loads the checked-in target with an exact zero-binary contract', async () => {
    const parsed = parseReleaseTargets(await Bun.file('config/release-targets.json').json());
    expect(parsed.readRegistryUrl).toBe('https://registry.factory-wager.com/api/npm');
    expect(parsed.targets).toHaveLength(1);
    expect(parsed.targets[0]?.expectedBinaries).toEqual([]);
    expect(Object.values(parsed.targets[0]!.publicationRoutes).every(route => !route.enabled)).toBe(
      true
    );
  });

  test('rejects traversal, duplicate files, and the read plane as a write endpoint', () => {
    expect(() => parseReleaseTargets(manifest({ packageDirectory: '../outside' }))).toThrow(
      'must stay inside'
    );
    expect(() =>
      parseReleaseTargets(manifest({ packageDirectory: 'packages/client/../../../outside' }))
    ).toThrow('must stay inside');
    expect(() =>
      parseReleaseTargets(manifest({ requiredPackageFiles: ['package.json', 'package.json'] }))
    ).toThrow('must not contain duplicates');
    expect(() =>
      parseReleaseTargets(
        manifest({
          publicationRoutes: {
            native: {
              enabled: false,
              endpoint: 'https://registry.factory-wager.com/api/npm',
            },
          },
        })
      )
    ).toThrow('read-only registry URL');
    expect(() => parseReleaseTargets({ ...(manifest() as object), typo: true })).toThrow(
      'unknown keys'
    );
  });

  test('rejects undeclared binaries, channels, and all publication attempts', () => {
    expect(() => validateExpectedBinaries({ bin: { unexpected: './dist/cli.js' } }, target())).toThrow(
      'binary contract mismatch'
    );
    expect(() => validateChannel(target(), 'canary')).toThrow('is not allowed');
    expect(() => assertPublicationRouteEnabled(target(), 'factory-artifact')).toThrow(
      'is disabled'
    );
  });

  test('requires explicit public package metadata and boolean optional peer metadata', () => {
    const valid = {
      private: false,
      license: 'MIT',
      repository: { directory: 'packages/registry-client' },
      publishConfig: { access: 'public' },
      peerDependenciesMeta: { 'bun-types': { optional: true } },
      dependencies: {},
    };
    expect(() => validatePackageReleaseMetadata(valid, target())).not.toThrow();
    expect(() =>
      validatePackageReleaseMetadata(
        { ...valid, peerDependenciesMeta: { 'bun-types': { optional: 'true' } } },
        target()
      )
    ).toThrow('must be boolean true');
    expect(() =>
      validatePackageReleaseMetadata(
        { ...valid, dependencies: { local: 'workspace:*' } },
        target()
      )
    ).toThrow('cannot use workspace:*');
  });
});

describe('release evidence', () => {
  test('requires clean Bun JUnit counters and current commit provenance', () => {
    expect(
      validateJunitXml(junit('abc123'), 'abc123', ['tests/registry-sdk.test.ts'])
    ).toMatchObject({
      tests: 2,
      failures: 0,
      errors: 0,
      commit: 'abc123',
    });
    expect(() => validateJunitXml(junit('old'), 'current')).toThrow('does not match current HEAD');
    expect(() => validateJunitXml(junit('abc', 'tests="2" failures="1" errors="0"'))).toThrow(
      'not clean'
    );
    expect(() => validateJunitXml(junit('abc', 'tests="2" failures="0" errors="1"'))).toThrow(
      'not clean'
    );
    expect(() => validateJunitXml('<testsuites>')).toThrow('invalid JUnit XML');
    expect(() => validateJunitXml(junit('abc', 'tests="0" failures="0"'))).toThrow(
      'at least one non-skipped test'
    );
    expect(() =>
      validateJunitXml(junit('abc').replace('<testcase name="one" />', '<testcase><failure /></testcase>'))
    ).toThrow('failure or error element');
    expect(() =>
      validateJunitXml(junit('abc'), undefined, ['tests/unrelated.test.ts'])
    ).toThrow('suite files do not match');
  });

  test('requires every exported path to exist inside the files allowlist', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'release-artifact-'));
    temporaryDirectories.push(directory);
    await Bun.write(join(directory, 'dist/index.js'), 'export const ok = true;');
    await expect(
      validateExportClosure(directory, {
        files: ['dist'],
        exports: { '.': { import: './dist/index.js' } },
      })
    ).resolves.toEqual(['dist/index.js']);
    await expect(
      validateExportClosure(directory, {
        files: ['dist'],
        exports: { '.': { default: './src/index.ts' } },
      })
    ).rejects.toThrow('excluded by package files');
  });

  test('keeps bun pm pkg inspection scoped to the owning package directory', async () => {
    const root = process.cwd();
    expect(
      await commandText(
        ['bun', 'pm', 'pkg', 'get', 'peerDependenciesMeta.bun-types.optional'],
        root
      )
    ).toBe('{}');
    expect(
      await commandText(
        ['bun', 'pm', 'pkg', 'get', 'peerDependenciesMeta.bun-types.optional'],
        join(root, 'packages/registry-client')
      )
    ).toBe('true');
  });
});

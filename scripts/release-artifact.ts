#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @updated Bun.argv · changed v0.6.10 · 2023-06-26 · https://bun.com/blog/bun-v0.6.10
// @verified Bun.argv · Bun v1.4.0 · 2026-08-25 · https://bun.com/reference/bun/argv
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
// @see https://bun.com/reference/bun/XML/parse — Bun.XML.parse
// @released Bun.XML.parse · released v1.4.0 · 2026-08-20 · https://bun.com/blog/bun-v1.4
// @see https://bun.com/docs/runtime/xml — Bun.XML
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.com/docs/runtime/child-process — Bun.spawn

import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

export interface ExpectedBinary {
  name: string;
  path: string;
}

export interface PublicationRoute {
  enabled: boolean;
  endpoint?: string;
}

export interface ReleaseTarget {
  target: string;
  packageName: string;
  packageDirectory: string;
  buildCommand: string[];
  testCommand: string[];
  junitPath: string;
  expectedJunitFiles: string[];
  sourceInputs: string[];
  archiveDirectory: string;
  allowedChannels: string[];
  expectedBinaries: ExpectedBinary[];
  requiredPackageFiles: string[];
  hashArtifacts: string[];
  publicationRoutes: Record<string, PublicationRoute>;
}

export interface ReleaseTargetsManifest {
  schemaVersion: 1;
  readRegistryUrl: string;
  targets: ReleaseTarget[];
}

interface PackageManifest {
  name?: unknown;
  version?: unknown;
  private?: unknown;
  license?: unknown;
  repository?: unknown;
  publishConfig?: unknown;
  peerDependenciesMeta?: unknown;
  dependencies?: unknown;
  bin?: unknown;
  files?: unknown;
  exports?: unknown;
  main?: unknown;
  module?: unknown;
  types?: unknown;
}

export interface JunitSummary {
  suites: number;
  tests: number;
  failures: number;
  errors: number;
  skipped: number;
  commit: string;
}

export interface ReleaseReceipt {
  schemaVersion: 1;
  target: string;
  packageName: string;
  packageVersion: string;
  channel: string;
  gitCommit: string;
  sourceTreeClean: true;
  manifest: { path: string; sha256: string };
  sources: Array<{ path: string; sha256: string }>;
  junit: JunitSummary & { path: string; sha256: string };
  tarball: { path: string; sha256: string; bytes: number };
  artifacts: Array<{ path: string; sha256: string }>;
}

type JsonRecord = Record<string, unknown>;

const DEFAULT_MANIFEST = 'config/release-targets.json';

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertExactKeys(record: JsonRecord, allowed: string[], context: string): void {
  const unknown = Object.keys(record).filter(key => !allowed.includes(key));
  if (unknown.length > 0) throw new Error(`${context} has unknown keys: ${unknown.join(', ')}`);
}

function requiredString(record: JsonRecord, key: string, context: string): string {
  const value = record[key];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${context}.${key} must be a non-empty string`);
  }
  return value;
}

function parseStringArray(value: unknown, context: string): string[] {
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string' || item === '')) {
    throw new Error(`${context} must be an array of non-empty strings`);
  }
  if (new Set(value).size !== value.length)
    throw new Error(`${context} must not contain duplicates`);
  return value;
}

function parseCommandArray(value: unknown, context: string): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${context} must be a non-empty command array`);
  }
  if (value.some(item => typeof item !== 'string' || item === '')) {
    throw new Error(`${context} must contain only non-empty strings`);
  }
  return value;
}

function assertRelativePackagePath(value: string, context: string): void {
  const normalized = value.replaceAll('\\', '/').replace(/^\.\//, '');
  const lexicalRoot = '/release-contract-root';
  const resolved = resolve(lexicalRoot, normalized);
  const resolvedRelative = relative(lexicalRoot, resolved);
  if (isAbsolute(value) || normalized === '' || resolvedRelative.startsWith('..')) {
    throw new Error(`${context} must stay inside the package directory: ${value}`);
  }
}

/** Parse the release target SSOT once at its JSON wire boundary. */
export function parseReleaseTargets(value: unknown): ReleaseTargetsManifest {
  if (!isRecord(value) || value.schemaVersion !== 1 || !Array.isArray(value.targets)) {
    throw new Error('release target manifest must have schemaVersion 1 and a targets array');
  }
  assertExactKeys(
    value,
    ['schemaVersion', 'readRegistryUrl', 'targets'],
    'release target manifest'
  );
  const readRegistryUrl = requiredString(value, 'readRegistryUrl', 'release target manifest');
  const parsedReadRegistryUrl = new URL(readRegistryUrl);
  if (!['http:', 'https:'].includes(parsedReadRegistryUrl.protocol)) {
    throw new Error('release target manifest readRegistryUrl must be HTTP(S)');
  }

  const ids = new Set<string>();
  const packageNames = new Set<string>();
  const targets = value.targets.map((item, index): ReleaseTarget => {
    const context = `targets[${index}]`;
    if (!isRecord(item)) throw new Error(`${context} must be an object`);
    assertExactKeys(
      item,
      [
        'target',
        'packageName',
        'packageDirectory',
        'buildCommand',
        'testCommand',
        'junitPath',
        'expectedJunitFiles',
        'sourceInputs',
        'archiveDirectory',
        'allowedChannels',
        'expectedBinaries',
        'requiredPackageFiles',
        'hashArtifacts',
        'publicationRoutes',
      ],
      context
    );
    const targetName = requiredString(item, 'target', context);
    const packageName = requiredString(item, 'packageName', context);
    const packageDirectory = requiredString(item, 'packageDirectory', context);
    assertRelativePackagePath(packageDirectory, `${context}.packageDirectory`);
    const buildCommand = parseCommandArray(item.buildCommand, `${context}.buildCommand`);
    const testCommand = parseCommandArray(item.testCommand, `${context}.testCommand`);
    const junitPath = requiredString(item, 'junitPath', context);
    assertRelativePackagePath(junitPath, `${context}.junitPath`);
    const expectedJunitFiles = parseStringArray(
      item.expectedJunitFiles,
      `${context}.expectedJunitFiles`
    );
    const sourceInputs = parseStringArray(item.sourceInputs, `${context}.sourceInputs`);
    if (expectedJunitFiles.length === 0) {
      throw new Error(`${context}.expectedJunitFiles must not be empty`);
    }
    if (sourceInputs.length === 0) throw new Error(`${context}.sourceInputs must not be empty`);
    for (const input of [...expectedJunitFiles, ...sourceInputs]) {
      assertRelativePackagePath(input, `${context}.evidencePath`);
    }
    const archiveDirectory = requiredString(item, 'archiveDirectory', context);
    assertRelativePackagePath(archiveDirectory, `${context}.archiveDirectory`);
    if (ids.has(targetName)) throw new Error(`duplicate release target: ${targetName}`);
    if (packageNames.has(packageName)) throw new Error(`duplicate release package: ${packageName}`);
    ids.add(targetName);
    packageNames.add(packageName);

    const expectedBinaries = item.expectedBinaries;
    if (!Array.isArray(expectedBinaries)) {
      throw new Error(`${context}.expectedBinaries must be an array`);
    }
    const binaries = expectedBinaries.map((binary, binaryIndex): ExpectedBinary => {
      const binaryContext = `${context}.expectedBinaries[${binaryIndex}]`;
      if (!isRecord(binary)) throw new Error(`${binaryContext} must be an object`);
      assertExactKeys(binary, ['name', 'path'], binaryContext);
      const path = requiredString(binary, 'path', binaryContext);
      assertRelativePackagePath(path, `${binaryContext}.path`);
      return { name: requiredString(binary, 'name', binaryContext), path };
    });

    if (!isRecord(item.publicationRoutes) || Object.keys(item.publicationRoutes).length === 0) {
      throw new Error(`${context}.publicationRoutes must declare at least one disabled route`);
    }
    const publicationRoutes = Object.fromEntries(
      Object.entries(item.publicationRoutes).map(([route, config]) => {
        if (!isRecord(config) || config.enabled !== false) {
          throw new Error(`${context}.publicationRoutes.${route}.enabled must be explicitly false`);
        }
        assertExactKeys(config, ['enabled', 'endpoint'], `${context}.publicationRoutes.${route}`);
        const endpoint = config.endpoint;
        if (endpoint !== undefined && (typeof endpoint !== 'string' || endpoint === '')) {
          throw new Error(`${context}.publicationRoutes.${route}.endpoint must be a URL`);
        }
        if (endpoint === readRegistryUrl) {
          throw new Error(
            `${context}.publicationRoutes.${route}.endpoint cannot use the read-only registry URL`
          );
        }
        return [route, { enabled: false, ...(endpoint === undefined ? {} : { endpoint }) }];
      })
    );

    const requiredPackageFiles = parseStringArray(
      item.requiredPackageFiles,
      `${context}.requiredPackageFiles`
    );
    const hashArtifacts = parseStringArray(item.hashArtifacts, `${context}.hashArtifacts`);
    for (const [fileIndex, file] of [...requiredPackageFiles, ...hashArtifacts].entries()) {
      assertRelativePackagePath(file, `${context}.packagePath[${fileIndex}]`);
    }
    for (const artifact of hashArtifacts) {
      if (!requiredPackageFiles.includes(artifact)) {
        throw new Error(
          `${context}.hashArtifacts must also be required package files: ${artifact}`
        );
      }
    }

    return {
      target: targetName,
      packageName,
      packageDirectory,
      buildCommand,
      testCommand,
      junitPath,
      expectedJunitFiles,
      sourceInputs,
      archiveDirectory,
      allowedChannels: parseStringArray(item.allowedChannels, `${context}.allowedChannels`),
      expectedBinaries: binaries,
      requiredPackageFiles,
      hashArtifacts,
      publicationRoutes,
    };
  });

  if (targets.length === 0) throw new Error('release target manifest must not be empty');
  return { schemaVersion: 1, readRegistryUrl, targets };
}

export function validateChannel(target: ReleaseTarget, channel: string): void {
  if (!target.allowedChannels.includes(channel)) {
    throw new Error(
      `channel ${JSON.stringify(channel)} is not allowed for ${target.target}; expected one of ${target.allowedChannels.join(', ')}`
    );
  }
}

function normalizePackageBinaries(value: unknown): ExpectedBinary[] {
  if (value === undefined) return [];
  if (typeof value === 'string') return [{ name: '', path: value }];
  if (!isRecord(value)) throw new Error('package bin must be a string or object');
  return Object.entries(value).map(([name, path]) => {
    if (typeof path !== 'string' || path === '')
      throw new Error(`package bin.${name} must be a path`);
    return { name, path };
  });
}

/** Require the package bin map to match the manifest exactly, including the zero-bin case. */
export function validateExpectedBinaries(
  packageManifest: PackageManifest,
  target: ReleaseTarget
): void {
  const actual = normalizePackageBinaries(packageManifest.bin).sort((a, b) =>
    `${a.name}:${a.path}`.localeCompare(`${b.name}:${b.path}`)
  );
  const expected = [...target.expectedBinaries].sort((a, b) =>
    `${a.name}:${a.path}`.localeCompare(`${b.name}:${b.path}`)
  );
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `binary contract mismatch for ${target.target}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`
    );
  }
}

/** Return every local file target reachable from package exports. */
export function parseExportTargets(value: unknown): string[] {
  const targets: string[] = [];
  const parseNode = (node: unknown): void => {
    if (typeof node === 'string') {
      if (node.startsWith('./')) targets.push(node.slice(2));
      return;
    }
    if (Array.isArray(node)) {
      for (const item of node) parseNode(item);
      return;
    }
    if (isRecord(node)) for (const item of Object.values(node)) parseNode(item);
  };
  parseNode(value);
  return [...new Set(targets)].sort();
}

function collectPackageEntryTargets(packageManifest: PackageManifest): string[] {
  return [packageManifest.main, packageManifest.module, packageManifest.types]
    .filter((value): value is string => typeof value === 'string' && value.startsWith('./'))
    .map(value => value.slice(2));
}

export function validatePackageReleaseMetadata(
  packageManifest: PackageManifest,
  target: ReleaseTarget
): void {
  if (packageManifest.private !== false) {
    throw new Error(`release package ${target.packageName} must explicitly set private=false`);
  }
  if (typeof packageManifest.license !== 'string' || packageManifest.license === '') {
    throw new Error(`release package ${target.packageName} must declare a license`);
  }
  if (!isRecord(packageManifest.repository)) {
    throw new Error(`release package ${target.packageName} must declare repository metadata`);
  }
  if (packageManifest.repository.directory !== target.packageDirectory) {
    throw new Error(`release package repository.directory must be ${target.packageDirectory}`);
  }
  if (
    !isRecord(packageManifest.publishConfig) ||
    packageManifest.publishConfig.access !== 'public'
  ) {
    throw new Error(`release package ${target.packageName} must declare public access`);
  }
  const peerMeta = packageManifest.peerDependenciesMeta;
  if (
    !isRecord(peerMeta) ||
    !isRecord(peerMeta['bun-types']) ||
    peerMeta['bun-types'].optional !== true
  ) {
    throw new Error('peerDependenciesMeta.bun-types.optional must be boolean true');
  }
  if (isRecord(packageManifest.dependencies)) {
    for (const [name, version] of Object.entries(packageManifest.dependencies)) {
      if (typeof version === 'string' && /^(workspace|catalog):/.test(version)) {
        throw new Error(`runtime dependency ${name} cannot use ${version} in a public package`);
      }
    }
  }
}

export function isPackageFileIncluded(file: string, files: unknown): boolean {
  if (file === 'package.json') return true;
  if (!Array.isArray(files)) return true;
  const normalized = file.replaceAll('\\', '/').replace(/^\.\//, '');
  return files.some(entry => {
    if (typeof entry !== 'string') return false;
    const allowed = entry.replaceAll('\\', '/').replace(/^\.\//, '').replace(/\/$/, '');
    return normalized === allowed || normalized.startsWith(`${allowed}/`);
  });
}

/** Validate export targets against both the filesystem and the package files allowlist. */
export async function validateExportClosure(
  packageDirectory: string,
  packageManifest: PackageManifest
): Promise<string[]> {
  const targets = [
    ...new Set([
      ...parseExportTargets(packageManifest.exports),
      ...collectPackageEntryTargets(packageManifest),
    ]),
  ].sort();
  for (const target of targets) {
    assertRelativePackagePath(target, 'package export');
    if (!isPackageFileIncluded(target, packageManifest.files)) {
      throw new Error(`export target is excluded by package files: ${target}`);
    }
    if (!(await Bun.file(join(packageDirectory, target)).exists())) {
      throw new Error(`export target does not exist: ${target}`);
    }
  }
  return targets;
}

function numericAttribute(record: JsonRecord, name: string): number | undefined {
  const raw = record[`@${name}`];
  if (raw === undefined) return undefined;
  if (typeof raw !== 'string' || !/^\d+$/.test(raw)) {
    throw new Error(`JUnit ${name} must be a non-negative integer`);
  }
  return Number(raw);
}

/** Parse Bun's JUnit output and reject malformed or failing reports. */
export function validateJunitXml(
  xml: string,
  expectedCommit?: string,
  expectedFiles: string[] = []
): JunitSummary {
  let document: unknown;
  try {
    document = Bun.XML.parse(xml);
  } catch (error) {
    throw new Error(`invalid JUnit XML: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!isRecord(document) || (!('testsuites' in document) && !('testsuite' in document))) {
    throw new Error('JUnit XML must have a testsuites or testsuite root');
  }

  const roots = 'testsuites' in document ? document.testsuites : document.testsuite;
  const suiteNodes: JsonRecord[] = [];
  const parseSuiteNode = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const item of node) parseSuiteNode(item);
      return;
    }
    if (!isRecord(node)) return;
    if ('@tests' in node || '@failures' in node || '@errors' in node) suiteNodes.push(node);
    if ('testsuite' in node) parseSuiteNode(node.testsuite);
  };
  parseSuiteNode(roots);
  if (suiteNodes.length === 0) throw new Error('JUnit XML has no suite counters');

  // Prefer child suite totals; a testsuites aggregate would otherwise double-count them.
  const leaves = suiteNodes.filter(node => !('testsuite' in node));
  const counted = leaves.length > 0 ? leaves : suiteNodes;
  const reportedFiles = [
    ...new Set(
      suiteNodes
        .map(suite => suite['@file'])
        .filter((file): file is string => typeof file === 'string')
    ),
  ].sort();
  if (
    expectedFiles.length > 0 &&
    JSON.stringify(reportedFiles) !== JSON.stringify([...expectedFiles].sort())
  ) {
    throw new Error(
      `JUnit suite files do not match the release target: expected=${JSON.stringify(expectedFiles)}, received=${JSON.stringify(reportedFiles)}`
    );
  }
  const commits: string[] = [];
  const parseCommitProperties = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const item of node) parseCommitProperties(item);
      return;
    }
    if (!isRecord(node)) return;
    if (node['@name'] === 'commit' && typeof node['@value'] === 'string') {
      commits.push(node['@value']);
    }
    for (const item of Object.values(node)) parseCommitProperties(item);
  };
  parseCommitProperties(document);
  const commit = [...new Set(commits)][0];
  if (!commit || new Set(commits).size !== 1) {
    throw new Error('JUnit XML must contain exactly one commit property value');
  }
  if (expectedCommit && commit !== expectedCommit) {
    throw new Error(`JUnit commit ${commit} does not match current HEAD ${expectedCommit}`);
  }
  const parseFailureElements = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const item of node) parseFailureElements(item);
      return;
    }
    if (!isRecord(node)) return;
    if ('failure' in node || 'error' in node) {
      throw new Error('JUnit report contains a failure or error element');
    }
    for (const item of Object.values(node)) parseFailureElements(item);
  };
  parseFailureElements(document);
  for (const suite of suiteNodes) {
    const failures = numericAttribute(suite, 'failures') ?? 0;
    const errors = numericAttribute(suite, 'errors') ?? 0;
    if (failures !== 0 || errors !== 0) {
      throw new Error(`JUnit report is not clean: failures=${failures}, errors=${errors}`);
    }
  }
  for (const suite of counted) {
    if (numericAttribute(suite, 'tests') === undefined) {
      throw new Error('JUnit counted suites must declare tests');
    }
    if (numericAttribute(suite, 'failures') === undefined) {
      throw new Error('JUnit counted suites must declare failures');
    }
  }
  const summary = counted.reduce<JunitSummary>(
    (total, suite) => ({
      suites: total.suites + 1,
      tests: total.tests + (numericAttribute(suite, 'tests') ?? 0),
      failures: total.failures + (numericAttribute(suite, 'failures') ?? 0),
      errors: total.errors + (numericAttribute(suite, 'errors') ?? 0),
      skipped: total.skipped + (numericAttribute(suite, 'skipped') ?? 0),
      commit,
    }),
    { suites: 0, tests: 0, failures: 0, errors: 0, skipped: 0, commit }
  );
  if (summary.tests === 0 || summary.tests <= summary.skipped) {
    throw new Error(
      `JUnit report must execute at least one non-skipped test: tests=${summary.tests}, skipped=${summary.skipped}`
    );
  }
  return summary;
}

export function assertPublicationRouteEnabled(target: ReleaseTarget, route: string): void {
  const config = target.publicationRoutes[route];
  if (!config) throw new Error(`unknown publication route ${route} for ${target.target}`);
  if (!config.enabled)
    throw new Error(`publication route ${route} is disabled for ${target.target}`);
}

export async function sha256File(file: string): Promise<string> {
  if (!(await Bun.file(file).exists())) throw new Error(`required file does not exist: ${file}`);
  const hasher = new Bun.CryptoHasher('sha256');
  hasher.update(await Bun.file(file).arrayBuffer());
  return hasher.digest('hex');
}

async function commandText(command: string[], cwd: string): Promise<string> {
  const process = Bun.spawn(command, { cwd, stdout: 'pipe', stderr: 'pipe' });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
    process.exited,
  ]);
  if (exitCode !== 0) throw new Error(stderr.trim() || `${command.join(' ')} failed`);
  return stdout.trim();
}

async function runCommand(command: string[], cwd: string): Promise<void> {
  const process = Bun.spawn(command, { cwd, stdout: 'inherit', stderr: 'inherit' });
  const exitCode = await process.exited;
  if (exitCode !== 0) throw new Error(`${command.join(' ')} failed with exit code ${exitCode}`);
}

async function repositoryRoot(cwd: string): Promise<string> {
  return commandText(['git', 'rev-parse', '--show-toplevel'], cwd);
}

async function assertRealPathInside(
  root: string,
  candidate: string,
  context: string
): Promise<void> {
  const [realRoot, realCandidate] = await Promise.all([
    commandText(['realpath', root], root),
    commandText(['realpath', candidate], root),
  ]);
  const candidateRelative = relative(realRoot, realCandidate);
  if (candidateRelative.startsWith('..') || isAbsolute(candidateRelative)) {
    throw new Error(`${context} resolves outside the repository: ${candidate}`);
  }
}

async function tarballFiles(tarball: string, cwd: string): Promise<Set<string>> {
  const output = await commandText(['tar', '-tzf', tarball], cwd);
  return new Set(
    output
      .split('\n')
      .filter(file => !file.endsWith('/'))
      .map(file =>
        file
          .replace(/^\.\//, '')
          .replace(/^package\//, '')
          .replace(/\/$/, '')
      )
      .filter(Boolean)
  );
}

async function tarballEntryBytes(tarball: string, file: string, cwd: string): Promise<ArrayBuffer> {
  const process = Bun.spawn(['tar', '-xOzf', tarball, `package/${file}`], {
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [bytes, stderr, exitCode] = await Promise.all([
    new Response(process.stdout).arrayBuffer(),
    new Response(process.stderr).text(),
    process.exited,
  ]);
  if (exitCode !== 0) throw new Error(stderr.trim() || `could not read ${file} from tarball`);
  return bytes;
}

function sha256Bytes(bytes: Bun.BlobOrStringOrBuffer): string {
  return new Bun.CryptoHasher('sha256').update(bytes).digest('hex');
}

function relativeDisplay(root: string, path: string): string {
  const value = relative(root, path);
  return value === '' ? '.' : value.split(sep).join('/');
}

export interface GateOptions {
  manifest: string;
  target: string;
  channel: string;
  junit: string;
  tarball: string;
  receipt?: string;
}

function option(args: string[], name: string, required = true): string | undefined {
  const prefix = `--${name}=`;
  const value = args.find(arg => arg.startsWith(prefix))?.slice(prefix.length);
  if (required && !value) throw new Error(`missing required option ${prefix}<value>`);
  return value;
}

function gateOptions(args: string[]): GateOptions {
  return {
    manifest: option(args, 'manifest', false) ?? DEFAULT_MANIFEST,
    target: option(args, 'target')!,
    channel: option(args, 'channel')!,
    junit: option(args, 'junit', false) ?? '',
    tarball: option(args, 'tarball', false) ?? '',
    receipt: option(args, 'receipt', false),
  };
}

async function loadTarget(
  root: string,
  manifestPath: string,
  targetName: string
): Promise<ReleaseTarget> {
  const parsed = parseReleaseTargets(await Bun.file(resolve(root, manifestPath)).json());
  const target = parsed.targets.find(item => item.target === targetName);
  if (!target) throw new Error(`unknown release target: ${targetName}`);
  return target;
}

export async function runReleaseBuild(
  targetName: string,
  manifestPath = DEFAULT_MANIFEST,
  cwd = process.cwd()
): Promise<void> {
  const root = await repositoryRoot(cwd);
  const target = await loadTarget(root, manifestPath, targetName);
  await runCommand(target.buildCommand, resolve(root, target.packageDirectory));
}

export async function runReleaseTest(
  targetName: string,
  manifestPath = DEFAULT_MANIFEST,
  cwd = process.cwd()
): Promise<string> {
  const root = await repositoryRoot(cwd);
  const target = await loadTarget(root, manifestPath, targetName);
  const junitPath = resolve(root, target.junitPath);
  await runCommand(['mkdir', '-p', dirname(junitPath)], root);
  if (await Bun.file(junitPath).exists()) await Bun.file(junitPath).delete();
  await runCommand(target.testCommand, root);
  if (!(await Bun.file(junitPath).exists())) {
    throw new Error(`test command did not create ${target.junitPath}`);
  }
  return junitPath;
}

export async function runReleasePack(
  targetName: string,
  manifestPath = DEFAULT_MANIFEST,
  cwd = process.cwd()
): Promise<string> {
  const root = await repositoryRoot(cwd);
  const target = await loadTarget(root, manifestPath, targetName);
  const packageDirectory = resolve(root, target.packageDirectory);
  const packageManifest = (await Bun.file(
    join(packageDirectory, 'package.json')
  ).json()) as PackageManifest;
  if (packageManifest.name !== target.packageName || typeof packageManifest.version !== 'string') {
    throw new Error(`package identity/version does not match release target ${target.target}`);
  }
  const archiveDirectory = resolve(root, target.archiveDirectory);
  const filename = `${target.target}-${packageManifest.version}.tgz`;
  const archive = join(archiveDirectory, filename);
  await runCommand(['mkdir', '-p', archiveDirectory], root);
  await runCommand(
    ['bun', 'pm', 'pack', '--filename', archive, '--gzip-level', '9', '--quiet'],
    packageDirectory
  );
  if (!(await Bun.file(archive).exists())) throw new Error(`pack did not create ${archive}`);
  return archive;
}

export async function runReleaseGate(
  options: GateOptions,
  cwd = process.cwd()
): Promise<ReleaseReceipt> {
  const root = await repositoryRoot(cwd);
  const target = await loadTarget(root, options.manifest, options.target);
  validateChannel(target, options.channel);
  const packageDirectory = resolve(root, target.packageDirectory);
  await assertRealPathInside(root, packageDirectory, 'release package directory');
  const packageManifest = (await Bun.file(
    join(packageDirectory, 'package.json')
  ).json()) as PackageManifest;
  if (packageManifest.name !== target.packageName) {
    throw new Error(
      `package identity mismatch: expected ${target.packageName}, received ${String(packageManifest.name)}`
    );
  }
  if (typeof packageManifest.version !== 'string' || packageManifest.version === '') {
    throw new Error(`package ${target.packageName} must have a version`);
  }
  validateExpectedBinaries(packageManifest, target);
  validatePackageReleaseMetadata(packageManifest, target);
  await validateExportClosure(packageDirectory, packageManifest);

  for (const file of target.requiredPackageFiles) {
    if (!isPackageFileIncluded(file, packageManifest.files)) {
      throw new Error(`required package file is excluded by package files: ${file}`);
    }
    if (!(await Bun.file(join(packageDirectory, file)).exists())) {
      throw new Error(`required package file does not exist: ${file}`);
    }
    await assertRealPathInside(root, join(packageDirectory, file), 'required package file');
  }

  const sources = await Promise.all(
    target.sourceInputs.map(async path => {
      const source = resolve(root, path);
      await commandText(['git', 'ls-files', '--error-unmatch', '--', path], root);
      await assertRealPathInside(root, source, 'release source input');
      return { path, sha256: await sha256File(source) };
    })
  );
  const packageUntracked = new Set<string>();
  for (const command of [
    ['git', 'ls-files', '--others', '--exclude-standard', '--', target.packageDirectory],
    [
      'git',
      'ls-files',
      '--others',
      '--ignored',
      '--exclude-standard',
      '--',
      target.packageDirectory,
    ],
  ]) {
    const output = await commandText(command, root);
    for (const path of output.split('\n').filter(Boolean)) packageUntracked.add(path);
  }
  const allowedGenerated = new Set(
    target.requiredPackageFiles.map(path => `${target.packageDirectory}/${path}`)
  );
  const unexpectedPackageFiles = [...packageUntracked].filter(
    path =>
      !allowedGenerated.has(path) && !path.startsWith(`${target.packageDirectory}/node_modules/`)
  );
  if (unexpectedPackageFiles.length > 0) {
    throw new Error(
      `release package has untracked build inputs/files: ${unexpectedPackageFiles.join(', ')}`
    );
  }

  const tarball = resolve(
    root,
    options.tarball ||
      join(target.archiveDirectory, `${target.target}-${packageManifest.version}.tgz`)
  );
  const packedFiles = await tarballFiles(tarball, root);
  const expectedPackedFiles = new Set(target.requiredPackageFiles);
  const missing = target.requiredPackageFiles.filter(file => !packedFiles.has(file));
  const extra = [...packedFiles].filter(file => !expectedPackedFiles.has(file));
  if (missing.length > 0 || extra.length > 0) {
    throw new Error(
      `tarball file contract mismatch: missing=${JSON.stringify(missing)}, extra=${JSON.stringify(extra)}`
    );
  }
  for (const file of target.requiredPackageFiles) {
    const workingBytes = await Bun.file(join(packageDirectory, file)).arrayBuffer();
    const packedBytes = await tarballEntryBytes(tarball, file, root);
    if (sha256Bytes(workingBytes) !== sha256Bytes(packedBytes)) {
      throw new Error(`tarball content differs from working package file: ${file}`);
    }
  }
  const packedManifest = JSON.parse(
    new TextDecoder().decode(await tarballEntryBytes(tarball, 'package.json', root))
  ) as PackageManifest;
  if (
    packedManifest.name !== target.packageName ||
    packedManifest.version !== packageManifest.version
  ) {
    throw new Error('embedded tarball package identity/version does not match the release target');
  }
  validatePackageReleaseMetadata(packedManifest, target);

  const gitCommit = await commandText(['git', 'rev-parse', 'HEAD'], root);
  const junitPath = resolve(root, options.junit || target.junitPath);
  const junitXml = await Bun.file(junitPath).text();
  const junit = validateJunitXml(junitXml, gitCommit, target.expectedJunitFiles);
  const dirty = await commandText(['git', 'status', '--porcelain', '--untracked-files=no'], root);
  if (dirty !== '') throw new Error('release gate requires a clean tracked source tree');

  const artifacts = await Promise.all(
    target.hashArtifacts.map(async path => ({
      path: `${target.packageDirectory}/${path}`,
      sha256: await sha256File(join(packageDirectory, path)),
    }))
  );
  const receipt: ReleaseReceipt = {
    schemaVersion: 1,
    target: target.target,
    packageName: target.packageName,
    packageVersion: packageManifest.version,
    channel: options.channel,
    gitCommit,
    sourceTreeClean: true,
    manifest: {
      path: relativeDisplay(root, resolve(root, options.manifest)),
      sha256: await sha256File(resolve(root, options.manifest)),
    },
    sources,
    junit: {
      ...junit,
      path: relativeDisplay(root, junitPath),
      sha256: await sha256File(junitPath),
    },
    tarball: {
      path: relativeDisplay(root, tarball),
      sha256: await sha256File(tarball),
      bytes: Bun.file(tarball).size,
    },
    artifacts,
  };

  const receiptPath = resolve(
    root,
    options.receipt ??
      `tmp/releases/${target.target}-${packageManifest.version}-${options.channel}.receipt.json`
  );
  await Bun.write(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  return receipt;
}

async function main(): Promise<void> {
  const [command, ...args] = Bun.argv.slice(2);
  if (command === 'build') {
    await runReleaseBuild(
      option(args, 'target')!,
      option(args, 'manifest', false) ?? DEFAULT_MANIFEST
    );
    return;
  }
  if (command === 'pack') {
    console.info(
      await runReleasePack(
        option(args, 'target')!,
        option(args, 'manifest', false) ?? DEFAULT_MANIFEST
      )
    );
    return;
  }
  if (command === 'test') {
    console.info(
      await runReleaseTest(
        option(args, 'target')!,
        option(args, 'manifest', false) ?? DEFAULT_MANIFEST
      )
    );
    return;
  }
  if (command === 'gate') {
    const receipt = await runReleaseGate(gateOptions(args));
    console.info(JSON.stringify(receipt, null, 2)); // console-ok — explicit machine receipt
    return;
  }
  if (command === 'publish') {
    const root = await repositoryRoot(process.cwd());
    const manifest = option(args, 'manifest', false) ?? DEFAULT_MANIFEST;
    const target = await loadTarget(root, manifest, option(args, 'target')!);
    const route = option(args, 'route')!;
    assertPublicationRouteEnabled(target, route);
    throw new Error('publication is not implemented by this gate; no external write was attempted');
  }
  throw new Error(
    'usage: bun scripts/release-artifact.ts build --target=<name>\n' +
      '       bun scripts/release-artifact.ts test --target=<name>\n' +
      '       bun scripts/release-artifact.ts pack --target=<name>\n' +
      '       bun scripts/release-artifact.ts gate --target=<name> --channel=<tag> [--tarball=<tgz>] [--junit=<xml>] [--receipt=<json>]\n' +
      '       bun scripts/release-artifact.ts publish --target=<name> --route=<route>'
  );
}

if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    console.error(`release-artifact: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

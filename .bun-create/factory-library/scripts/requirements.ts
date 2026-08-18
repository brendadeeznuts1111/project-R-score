// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/reference/bun/JSON5 — Bun.JSON5
// @see https://bun.com/docs/runtime/json5#bun-json5-parse — Bun.JSON5.parse
// @see https://bun.com/reference/bun/semver/satisfies — Bun.semver.satisfies
// @see https://bun.com/reference/bun/TOML/parse — Bun.TOML.parse
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @see https://bun.com/reference/bun/argv — Bun.argv

type JsonRecord = Record<string, unknown>;

export type HarnessRequirementMode = 'check' | 'lockfile' | 'release' | 'publish';

type HarnessRequirementPolicy = {
  requiredEnv: string[];
  requiredFiles: string[];
  requireCustomizedDescription: boolean;
  requireLicense: boolean;
  requireRepository: boolean;
  requirePublishArmed: boolean;
  requireLockfileCoherence: boolean;
};

export type HarnessRequirementsContract = {
  schemaVersion: 1;
  template: 'factory-library';
  runtime: {
    engine: 'bun';
    minimumVersion: string;
  };
  lockfile: {
    path: 'bun.lock';
    lockfileVersion: 1;
    configVersion: 1;
    verification: 'frozen-dry-run';
  };
  config: {
    install: { linker: 'isolated'; globalStore: true; frozenLockfile: false };
    run: { noOrphans: true };
    console: { depth: 6 };
    test: { coverageSkipTestFiles: true };
  };
  package: {
    type: 'module';
    sourceEntrypoint: './src/index.ts';
    publishFiles: ['src', 'README.md'];
    publishAccess: 'public';
    publishTag: 'latest';
  };
  requirements: Record<HarnessRequirementMode, HarnessRequirementPolicy>;
};

export type HarnessRequirementFinding = {
  field: string;
  message: string;
};

const DEFAULT_DESCRIPTION = 'A Bun-native library.';
const MINIMUM_BUN_VERSION = '1.3.14';
const TEMPLATE_NAME = ['{', '{', 'name', '}', '}'].join('');
const PACKAGE_NAME = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/;
const SEMVER = /^(\d+)\.(\d+)\.(\d+)(?:[-+][0-9A-Za-z.-]+)?$/;
const ENVIRONMENT_KEY = /^[A-Z][A-Z0-9_]*$/;
const REPOSITORY_URL = /^(?:https:\/\/|git\+https:\/\/|git\+ssh:\/\/|ssh:\/\/|git@[^:]+:)[^\s]+$/;
const LICENSE_PLACEHOLDERS = new Set(['', 'UNLICENSED', 'TODO', 'TBD']);

function record(value: unknown): JsonRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function stringArray(value: unknown, field: string): string[] {
  if (
    !Array.isArray(value) ||
    value.some(item => typeof item !== 'string' || !ENVIRONMENT_KEY.test(item)) ||
    new Set(value).size !== value.length
  ) {
    throw new Error(
      `${field} must contain unique uppercase environment variable names using A-Z, 0-9, and underscore`
    );
  }
  return value;
}

function exactStrings(value: unknown, expected: string[]): boolean {
  return (
    Array.isArray(value) &&
    value.length === expected.length &&
    value.every((item, index) => item === expected[index])
  );
}

function requiredFiles(value: unknown, expected: string[], field: string): string[] {
  if (
    !Array.isArray(value) ||
    value.some(
      item =>
        typeof item !== 'string' ||
        !item ||
        item.startsWith('/') ||
        item.includes('..') ||
        item.includes('\\')
    ) ||
    !exactStrings(value, expected)
  ) {
    throw new Error(`${field} must preserve its exact safe project-relative file list`);
  }
  return value;
}

function assertExactKeys(value: JsonRecord | null, expected: string[], field: string): void {
  if (!value) throw new Error(`${field} must be an object`);
  const expectedKeys = new Set(expected);
  const unknown = Object.keys(value).filter(key => !expectedKeys.has(key));
  if (unknown.length) throw new Error(`${field} has unknown field: ${unknown.sort().join(', ')}`);
}

function parseRequirementPolicy(input: {
  value: JsonRecord | null;
  field: string;
  requiredEnv: string[];
  requiredFiles: string[];
  flags: boolean;
  requireLockfileCoherence: boolean;
}): HarnessRequirementPolicy {
  assertExactKeys(
    input.value,
    [
      'requiredEnv',
      'requiredFiles',
      'requireCustomizedDescription',
      'requireLicense',
      'requireRepository',
      'requirePublishArmed',
      'requireLockfileCoherence',
    ],
    input.field
  );
  const requiredEnv = stringArray(input.value?.requiredEnv, `${input.field}.requiredEnv`);
  const requiredFileList = requiredFiles(
    input.value?.requiredFiles,
    input.requiredFiles,
    `${input.field}.requiredFiles`
  );
  const flagNames = [
    'requireCustomizedDescription',
    'requireLicense',
    'requireRepository',
    'requirePublishArmed',
  ] as const;
  if (
    !exactStrings(requiredEnv, input.requiredEnv) ||
    flagNames.some(name => input.value?.[name] !== input.flags) ||
    input.value?.requireLockfileCoherence !== input.requireLockfileCoherence
  ) {
    throw new Error(
      `${input.field} must preserve its exact environment and release-readiness policy`
    );
  }
  return {
    requiredEnv,
    requiredFiles: requiredFileList,
    requireCustomizedDescription: input.flags,
    requireLicense: input.flags,
    requireRepository: input.flags,
    requirePublishArmed: input.flags,
    requireLockfileCoherence: input.requireLockfileCoherence,
  };
}

export function parseHarnessRequirementsContract(input: unknown): HarnessRequirementsContract {
  const root = record(input);
  const runtime = record(root?.runtime);
  const lockfile = record(root?.lockfile);
  const config = record(root?.config);
  const configInstall = record(config?.install);
  const configRun = record(config?.run);
  const configConsole = record(config?.console);
  const configTest = record(config?.test);
  const packageContract = record(root?.package);
  const requirements = record(root?.requirements);
  const check = record(requirements?.check);
  const lockfileRequirement = record(requirements?.lockfile);
  const release = record(requirements?.release);
  const publish = record(requirements?.publish);
  if (root?.schemaVersion !== 1) throw new Error('harness.toml schemaVersion must be 1');
  if (root.template !== 'factory-library') {
    throw new Error('harness.toml template must be factory-library');
  }
  assertExactKeys(
    root,
    ['schemaVersion', 'template', 'runtime', 'lockfile', 'config', 'package', 'requirements'],
    'harness.toml'
  );
  assertExactKeys(runtime, ['engine', 'minimumVersion'], 'harness.toml.runtime');
  assertExactKeys(
    lockfile,
    ['path', 'lockfileVersion', 'configVersion', 'verification'],
    'harness.toml.lockfile'
  );
  assertExactKeys(config, ['install', 'run', 'console', 'test'], 'harness.toml.config');
  assertExactKeys(
    configInstall,
    ['linker', 'globalStore', 'frozenLockfile'],
    'harness.toml.config.install'
  );
  assertExactKeys(configRun, ['noOrphans'], 'harness.toml.config.run');
  assertExactKeys(configConsole, ['depth'], 'harness.toml.config.console');
  assertExactKeys(configTest, ['coverageSkipTestFiles'], 'harness.toml.config.test');
  assertExactKeys(
    packageContract,
    ['type', 'sourceEntrypoint', 'publishFiles', 'publishAccess', 'publishTag'],
    'harness.toml.package'
  );
  assertExactKeys(
    requirements,
    ['check', 'lockfile', 'release', 'publish'],
    'harness.toml.requirements'
  );
  if (runtime?.engine !== 'bun' || runtime.minimumVersion !== MINIMUM_BUN_VERSION) {
    throw new Error(
      `harness.toml runtime must declare Bun ${MINIMUM_BUN_VERSION} as its minimumVersion`
    );
  }
  if (
    lockfile?.path !== 'bun.lock' ||
    lockfile.lockfileVersion !== 1 ||
    lockfile.configVersion !== 1 ||
    lockfile.verification !== 'frozen-dry-run'
  ) {
    throw new Error(
      'harness.toml lockfile must require Bun lockfile/config schema 1 with frozen-dry-run verification'
    );
  }
  if (
    configInstall?.linker !== 'isolated' ||
    configInstall.globalStore !== true ||
    configInstall.frozenLockfile !== false ||
    configRun?.noOrphans !== true ||
    configConsole?.depth !== 6 ||
    configTest?.coverageSkipTestFiles !== true
  ) {
    throw new Error(
      'harness.toml config must preserve the isolated bootstrap, parent-death, console-depth, and test-coverage policy'
    );
  }
  if (
    packageContract?.type !== 'module' ||
    packageContract.sourceEntrypoint !== './src/index.ts' ||
    !exactStrings(packageContract.publishFiles, ['src', 'README.md']) ||
    packageContract.publishAccess !== 'public' ||
    packageContract.publishTag !== 'latest'
  ) {
    throw new Error(
      'harness.toml package must preserve the Bun source entrypoint and exact public publish surface'
    );
  }
  const checkPolicy = parseRequirementPolicy({
    value: check,
    field: 'requirements.check',
    requiredEnv: [],
    requiredFiles: ['README.md', 'src/index.ts', 'test/index.test.ts'],
    flags: false,
    requireLockfileCoherence: false,
  });
  const lockfilePolicy = parseRequirementPolicy({
    value: lockfileRequirement,
    field: 'requirements.lockfile',
    requiredEnv: [],
    requiredFiles: ['bun.lock'],
    flags: false,
    requireLockfileCoherence: true,
  });
  const releasePolicy = parseRequirementPolicy({
    value: release,
    field: 'requirements.release',
    requiredEnv: [],
    requiredFiles: ['README.md', 'src/index.ts', 'bun.lock'],
    flags: true,
    requireLockfileCoherence: true,
  });
  const publishPolicy = parseRequirementPolicy({
    value: publish,
    field: 'requirements.publish',
    requiredEnv: ['NPM_CONFIG_TOKEN'],
    requiredFiles: ['README.md', 'src/index.ts', 'bun.lock'],
    flags: true,
    requireLockfileCoherence: true,
  });
  return {
    schemaVersion: 1,
    template: 'factory-library',
    runtime: { engine: 'bun', minimumVersion: runtime.minimumVersion },
    lockfile: {
      path: 'bun.lock',
      lockfileVersion: 1,
      configVersion: 1,
      verification: 'frozen-dry-run',
    },
    config: {
      install: { linker: 'isolated', globalStore: true, frozenLockfile: false },
      run: { noOrphans: true },
      console: { depth: 6 },
      test: { coverageSkipTestFiles: true },
    },
    package: {
      type: 'module',
      sourceEntrypoint: './src/index.ts',
      publishFiles: ['src', 'README.md'],
      publishAccess: 'public',
      publishTag: 'latest',
    },
    requirements: {
      check: checkPolicy,
      lockfile: lockfilePolicy,
      release: releasePolicy,
      publish: publishPolicy,
    },
  };
}

export function validateHarnessBunfig(input: {
  contract: HarnessRequirementsContract;
  bunfig: unknown;
}): HarnessRequirementFinding[] {
  const bunfig = record(input.bunfig);
  const install = record(bunfig?.install);
  const run = record(bunfig?.run);
  const consoleConfig = record(bunfig?.console);
  const test = record(bunfig?.test);
  const expected = input.contract.config;
  const findings: HarnessRequirementFinding[] = [];
  const checks: Array<[string, unknown, unknown]> = [
    ['bunfig.toml.install.linker', install?.linker, expected.install.linker],
    ['bunfig.toml.install.globalStore', install?.globalStore, expected.install.globalStore],
    [
      'bunfig.toml.install.frozenLockfile',
      install?.frozenLockfile,
      expected.install.frozenLockfile,
    ],
    ['bunfig.toml.run.noOrphans', run?.noOrphans, expected.run.noOrphans],
    ['bunfig.toml.console.depth', consoleConfig?.depth, expected.console.depth],
    [
      'bunfig.toml.test.coverageSkipTestFiles',
      test?.coverageSkipTestFiles,
      expected.test.coverageSkipTestFiles,
    ],
  ];
  for (const [field, actual, expectedValue] of checks) {
    if (actual !== expectedValue) {
      findings.push({ field, message: `must equal ${JSON.stringify(expectedValue)}` });
    }
  }
  return findings;
}

export async function validateHarnessLockfileSchema(input: {
  contract: HarnessRequirementsContract;
  root?: string;
}): Promise<HarnessRequirementFinding[]> {
  const root = input.root ?? process.cwd();
  const path = input.contract.lockfile.path;
  const file = Bun.file(`${root}/${path}`);
  if (!(await file.exists()) || file.size === 0) return [];

  let lockfile: JsonRecord | null = null;
  try {
    lockfile = record(Bun.JSON5.parse(await file.text()));
  } catch {
    return [{ field: `file.${path}.schema`, message: 'must be valid Bun text lockfile syntax' }];
  }
  if (
    lockfile?.lockfileVersion !== input.contract.lockfile.lockfileVersion ||
    lockfile.configVersion !== input.contract.lockfile.configVersion
  ) {
    return [
      {
        field: `file.${path}.schema`,
        message: `must declare lockfileVersion ${input.contract.lockfile.lockfileVersion} and configVersion ${input.contract.lockfile.configVersion}`,
      },
    ];
  }
  return [];
}

export async function validateHarnessRequirementFiles(input: {
  contract: HarnessRequirementsContract;
  mode: HarnessRequirementMode;
  root?: string;
}): Promise<HarnessRequirementFinding[]> {
  const findings: HarnessRequirementFinding[] = [];
  const root = input.root ?? process.cwd();
  for (const path of input.contract.requirements[input.mode].requiredFiles) {
    const file = Bun.file(`${root}/${path}`);
    if (!(await file.exists())) {
      findings.push({ field: `file.${path}`, message: 'must exist' });
    } else if (file.size === 0) {
      findings.push({ field: `file.${path}`, message: 'must be non-empty' });
    }
  }
  return findings;
}

function repositoryUrl(value: unknown): string | null {
  if (typeof value === 'string') return value.trim();
  const repository = record(value);
  return typeof repository?.url === 'string' ? repository.url.trim() : null;
}

function placeholderPaths(value: unknown, path = 'package.json'): string[] {
  if (typeof value === 'string') {
    return value.includes(['{', '{'].join('')) || value.includes(['}', '}'].join('')) ? [path] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => placeholderPaths(item, `${path}[${index}]`));
  }
  const object = record(value);
  if (!object) return [];
  return Object.entries(object).flatMap(([key, item]) => placeholderPaths(item, `${path}.${key}`));
}

export function validateHarnessRequirements(input: {
  contract: HarnessRequirementsContract;
  manifest: unknown;
  mode: HarnessRequirementMode;
  env?: Record<string, string | undefined>;
  bunVersion?: string;
}): HarnessRequirementFinding[] {
  const findings: HarnessRequirementFinding[] = [];
  const manifest = record(input.manifest);
  const env = input.env ?? Bun.env;
  const bunVersion = input.bunVersion ?? Bun.version;
  const requirement = input.contract.requirements[input.mode];
  const name = manifest?.name;
  const version = manifest?.version;
  const description = manifest?.description;
  const engines = record(manifest?.engines);
  const exports = record(manifest?.exports);
  const publishConfig = record(manifest?.publishConfig);
  const templateSource = record(manifest?.['bun-create']) !== null;

  if (
    typeof name !== 'string' ||
    name.length > 214 ||
    (templateSource && input.mode === 'check'
      ? name !== TEMPLATE_NAME
      : !PACKAGE_NAME.test(name) || name.includes(TEMPLATE_NAME.slice(0, 2)))
  ) {
    findings.push({
      field: 'package.json.name',
      message:
        templateSource && input.mode === 'check'
          ? 'must retain the Bun name placeholder in the source template'
          : 'must be a concrete lowercase npm package name',
    });
  }
  if (typeof version !== 'string' || !SEMVER.test(version)) {
    findings.push({
      field: 'package.json.version',
      message: 'must be a complete semantic version',
    });
  }
  if (typeof description !== 'string' || !description.trim()) {
    findings.push({ field: 'package.json.description', message: 'must be non-empty' });
  } else if (requirement.requireCustomizedDescription && description === DEFAULT_DESCRIPTION) {
    findings.push({
      field: 'package.json.description',
      message: 'must be customized before release or publication',
    });
  }
  if (typeof manifest?.private !== 'boolean') {
    findings.push({
      field: 'package.json.private',
      message: 'must be an explicit boolean release-arming switch',
    });
  } else if (requirement.requirePublishArmed && manifest.private !== false) {
    findings.push({
      field: 'package.json.private',
      message: 'must be explicitly set to false before release or publication',
    });
  }
  if (typeof manifest?.license !== 'string' || !manifest.license.trim()) {
    findings.push({ field: 'package.json.license', message: 'must be a non-empty string' });
  } else if (
    requirement.requireLicense &&
    (LICENSE_PLACEHOLDERS.has(manifest.license.trim().toUpperCase()) ||
      manifest.license.includes(['{', '{'].join('')))
  ) {
    findings.push({
      field: 'package.json.license',
      message: 'must be replaced with a deliberate SPDX license expression',
    });
  }
  if (requirement.requireRepository) {
    const url = repositoryUrl(manifest?.repository);
    if (!url || !REPOSITORY_URL.test(url) || url.includes(['{', '{'].join(''))) {
      findings.push({
        field: 'package.json.repository',
        message: 'must contain an explicit HTTPS or Git repository URL',
      });
    }
  }
  if (manifest?.type !== input.contract.package.type) {
    findings.push({ field: 'package.json.type', message: 'must equal module' });
  }
  for (const field of ['module', 'types'] as const) {
    if (manifest?.[field] !== input.contract.package.sourceEntrypoint) {
      findings.push({
        field: `package.json.${field}`,
        message: `must equal ${input.contract.package.sourceEntrypoint}`,
      });
    }
  }
  if (exports?.['.'] !== input.contract.package.sourceEntrypoint) {
    findings.push({
      field: 'package.json.exports[.]',
      message: `must equal ${input.contract.package.sourceEntrypoint}`,
    });
  }
  if (!exactStrings(manifest?.files, input.contract.package.publishFiles)) {
    findings.push({
      field: 'package.json.files',
      message: `must equal ${JSON.stringify(input.contract.package.publishFiles)}`,
    });
  }
  if (publishConfig?.access !== input.contract.package.publishAccess) {
    findings.push({ field: 'package.json.publishConfig.access', message: 'must equal public' });
  }
  if (publishConfig?.tag !== input.contract.package.publishTag) {
    findings.push({ field: 'package.json.publishConfig.tag', message: 'must equal latest' });
  }
  if (engines?.bun !== `>=${input.contract.runtime.minimumVersion}`) {
    findings.push({
      field: 'package.json.engines.bun',
      message: `must equal >=${input.contract.runtime.minimumVersion}`,
    });
  }
  if (!Bun.semver.satisfies(bunVersion, `>=${input.contract.runtime.minimumVersion}`)) {
    findings.push({
      field: 'Bun.version',
      message: `must be at least ${input.contract.runtime.minimumVersion}`,
    });
  }
  for (const key of requirement.requiredEnv) {
    if (!env[key]?.trim()) {
      findings.push({ field: `environment.${key}`, message: 'must be set and non-empty' });
    }
  }
  const placeholderManifest = { ...manifest };
  if (templateSource) delete placeholderManifest.name;
  for (const field of placeholderPaths(placeholderManifest)) {
    findings.push({ field, message: 'must not contain unresolved Bun template placeholders' });
  }
  return findings;
}

export async function loadHarnessRequirementsContract(
  path = 'harness.toml'
): Promise<HarnessRequirementsContract> {
  return parseHarnessRequirementsContract(Bun.TOML.parse(await Bun.file(path).text()));
}

async function main(): Promise<void> {
  const args = Bun.argv.slice(2);
  const mode = args[0] ?? 'check';
  if (
    (mode !== 'check' && mode !== 'lockfile' && mode !== 'release' && mode !== 'publish') ||
    args.length > 1
  ) {
    throw new Error('Usage: bun scripts/requirements.ts [check|lockfile|release|publish]');
  }
  const [contract, manifest, bunfig] = await Promise.all([
    loadHarnessRequirementsContract(),
    Bun.file('package.json').json(),
    Bun.TOML.parse(await Bun.file('bunfig.toml').text()),
  ]);
  const findings = [
    ...validateHarnessRequirements({ contract, manifest, mode }),
    ...validateHarnessBunfig({ contract, bunfig }),
    ...(await validateHarnessRequirementFiles({ contract, mode })),
  ];
  if (!findings.length && contract.requirements[mode].requireLockfileCoherence) {
    findings.push(...(await validateHarnessLockfileSchema({ contract })));
  }
  if (findings.length) {
    console.error(`harness requirements (${mode}) failed:`);
    for (const finding of findings) console.error(`  - ${finding.field}: ${finding.message}`);
    process.exitCode = 1;
    return;
  }
  const required = contract.requirements[mode].requiredEnv;
  const requiredFiles = contract.requirements[mode].requiredFiles;
  console.log(
    `harness requirements (${mode}) passed · required env: ${required.length ? required.join(', ') : 'none'} · required files: ${requiredFiles.join(', ')} · lockfile coherence: ${contract.requirements[mode].requireLockfileCoherence ? contract.lockfile.verification : 'not required'}`
  );
}

if (import.meta.main) {
  await main();
}

// @see https://bun.com/docs/test/code-coverage#enabling-coverage
// @see https://bun.com/docs/test/code-coverage#lcov-coverage-reporter
// @see https://bun.com/docs/test/code-coverage#coverage-with-specific-test-patterns
// @see https://bun.com/docs/test/reporters#dots-reporter
// @see https://bun.com/docs/pm/cli/publish#dry-run
export type ContractGroupId =
  'identity' | 'runtime' | 'quality' | 'reporting' | 'publish' | 'files' | 'environment' | 'flags';

export type ContractGroup = {
  id: ContractGroupId;
  owner: 'package.json' | 'Bun' | 'CI environment';
  properties: readonly string[];
  rule: string;
};

const REQUIRED_DEV_DEPENDENCIES = {
  '@eslint/js': '9.39.4',
  '@types/bun': '1.3.14',
  eslint: '9.39.4',
  prettier: '3.9.6',
  'typescript-eslint': '8.65.0',
  typescript: '6.0.3',
} as const;

/**
 * The library template's public configuration surface. Keep this small and
 * explicit: generated projects can change their implementation, but any new
 * package property, environment input, or flag belongs in one of these groups.
 */
export const FACTORY_LIBRARY_CONTRACT_GROUPS: readonly ContractGroup[] = [
  {
    id: 'identity',
    owner: 'package.json',
    properties: [
      'name',
      'version',
      'description',
      'packageManager',
      'type',
      'module',
      'types',
      'exports',
      'engines.bun',
    ],
    rule: 'Bun-native source package; only package.json.name uses Bun template substitution.',
  },
  {
    id: 'runtime',
    owner: 'package.json',
    properties: [
      'scripts.dev',
      'scripts.test',
      'scripts.test:watch',
      'scripts.color-test',
      'scripts.build',
    ],
    rule: 'Development, test, watch, terminal-color demo, and build commands run with Bun.',
  },
  {
    id: 'quality',
    owner: 'package.json',
    properties: [
      'scripts.typecheck',
      'scripts.format',
      'scripts.format:check',
      'scripts.lint',
      'scripts.lint:fix',
      'scripts.check',
      ...Object.keys(REQUIRED_DEV_DEPENDENCIES).map(name => `devDependencies.${name}`),
    ],
    rule: 'Pinned Bun types, TypeScript, formatting, and linting precede explicit no-emit checks after installation.',
  },
  {
    id: 'reporting',
    owner: 'package.json',
    properties: [
      'scripts.test:dots',
      'scripts.test:coverage',
      'scripts.test:coverage:lcov',
      'scripts.test:junit',
      'scripts.test:ci',
      'scripts.junit:enrich',
      'scripts.build:metafile',
    ],
    rule: 'JUnit and bundle reports are generated artifacts, not package inputs.',
  },
  {
    id: 'publish',
    owner: 'package.json',
    properties: [
      'files',
      'publishConfig.access',
      'publishConfig.tag',
      'scripts.prepack',
      'scripts.publish:dry-run',
    ],
    rule: 'Only src and README publish; prepack proves the contract before packing.',
  },
  {
    id: 'files',
    owner: 'package.json',
    properties: ['scripts.generate:files', 'scripts.check:files', 'files.md'],
    rule: 'files.md is a generated, tracked index of every non-generated, non-secret project file and package allowlist proof.',
  },
  {
    id: 'environment',
    owner: 'CI environment',
    properties: [
      'CI',
      'GITHUB_RUN_ID',
      'GITHUB_SERVER_URL',
      'GITHUB_REPOSITORY',
      'GITHUB_REF_NAME',
      'CI_JOB_URL',
      'GITHUB_SHA',
      'CI_COMMIT_SHA',
      'GIT_SHA',
      'PROJECT_NAME',
      'NPM_CONFIG_TOKEN',
      'BENCH_ITERATIONS',
    ],
    rule: 'CI values win. Missing provenance stays absent; explicit source fields describe availability. Tokens never enter package output.',
  },
  {
    id: 'flags',
    owner: 'Bun',
    properties: ['bun test passthrough', 'bun publish flags'],
    rule: 'Only flags consumed by the generated library belong in this contract; Factory create routing stays with the wrapper.',
  },
] as const;

export const FACTORY_LIBRARY_ENVIRONMENT = {
  junitCi: ['CI', 'GITHUB_RUN_ID', 'GITHUB_SERVER_URL', 'GITHUB_REPOSITORY', 'CI_JOB_URL'],
  junitCommit: ['GITHUB_SHA', 'CI_COMMIT_SHA', 'GIT_SHA'],
  junitBranch: ['GITHUB_REF_NAME'],
  enrichment: ['PROJECT_NAME'],
  publishAuthentication: ['NPM_CONFIG_TOKEN'],
  benchmark: ['BENCH_ITERATIONS'],
} as const;

/** Native Bun properties are optional and only appear when their source exists.
 * Enrichment writes required package fields plus explicit source-state fields,
 * so missing provenance is never fabricated or serialized as `undefined`. */
export const FACTORY_LIBRARY_JUNIT_PROPERTIES = {
  native: [
    {
      name: 'ci',
      inputs: FACTORY_LIBRARY_ENVIRONMENT.junitCi,
      absence: 'omitted when CI context is absent',
    },
    {
      name: 'commit',
      inputs: [...FACTORY_LIBRARY_ENVIRONMENT.junitCommit, 'git HEAD'],
      absence: 'omitted when no commit is available',
    },
    { name: 'hostname', inputs: ['system hostname'], absence: 'Bun runtime owned' },
  ],
  enrichment: [
    {
      name: 'package',
      inputs: ['package.json.name'],
      absence: 'fail enrichment: required package metadata',
    },
    {
      name: 'package_version',
      inputs: ['package.json.version'],
      absence: 'fail enrichment: required package metadata',
    },
    {
      name: 'project',
      inputs: [...FACTORY_LIBRARY_ENVIRONMENT.enrichment, 'package.json.name'],
      absence: 'package name is required',
    },
    {
      name: 'project_source',
      inputs: [...FACTORY_LIBRARY_ENVIRONMENT.enrichment, 'package.json.name'],
      absence: 'always records environment or package',
    },
    {
      name: 'report_context',
      inputs: FACTORY_LIBRARY_ENVIRONMENT.junitCi,
      absence: 'always records local when CI context is absent',
    },
    {
      name: 'commit_source',
      inputs: [...FACTORY_LIBRARY_ENVIRONMENT.junitCommit, 'git HEAD'],
      absence: 'always records unavailable when absent',
    },
    {
      name: 'branch',
      inputs: [...FACTORY_LIBRARY_ENVIRONMENT.junitBranch, 'git branch'],
      absence: 'omitted; branch_source records state',
    },
    {
      name: 'branch_source',
      inputs: [...FACTORY_LIBRARY_ENVIRONMENT.junitBranch, 'git branch'],
      absence: 'environment, git, detached, or unavailable',
    },
    {
      name: 'repository',
      inputs: ['GITHUB_REPOSITORY', 'git remote.origin.url'],
      absence: 'omitted; repository_source records state',
    },
    {
      name: 'repository_source',
      inputs: ['GITHUB_REPOSITORY', 'git remote.origin.url'],
      absence: 'environment, git-remote, or unavailable',
    },
    { name: 'run_id', inputs: ['GITHUB_RUN_ID'], absence: 'omitted; run_id_source records state' },
    { name: 'run_id_source', inputs: ['GITHUB_RUN_ID'], absence: 'environment or unavailable' },
    {
      name: 'generated_at',
      inputs: ['run context timestamp'],
      absence: 'always generated from the reporting run',
    },
  ],
} as const;

export const FACTORY_LIBRARY_FLAGS = {
  testJunitPassthrough: ['--bail', '--coverage'],
  testCoverage: [
    '--coverage',
    '--coverage-reporter=text',
    '--coverage-reporter=lcov',
    '<test filter>',
    '--test-name-pattern=<regex>',
  ],
  junitEnrichInput: ['[reportPath]'],
  bunPublish: [
    'bun publish --dry-run',
    '--access',
    '--tag',
    '--registry',
    '--auth-type',
    '--otp',
    '--tolerate-republish',
    '--ignore-scripts',
  ],
} as const;

type JsonRecord = Record<string, unknown>;
export type TemplateContractFinding = { property: string; expected: string; actual: unknown };
const TEMPLATE_NAME = ['{', '{', 'name', '}', '}'].join('');
const TEMPLATE_OPEN = ['{', '{'].join('');

function record(value: unknown): JsonRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function nested(value: JsonRecord, key: string): JsonRecord | null {
  return record(value[key]);
}

function pushIf(
  findings: TemplateContractFinding[],
  valid: boolean,
  property: string,
  expected: string,
  actual: unknown,
): void {
  if (!valid) findings.push({ property, expected, actual });
}

export function validateFactoryLibraryManifest(manifest: unknown): TemplateContractFinding[] {
  const findings: TemplateContractFinding[] = [];
  const pkg = record(manifest);
  if (!pkg) return [{ property: 'package.json', expected: 'object', actual: manifest }];

  const scripts = nested(pkg, 'scripts');
  const exports = nested(pkg, 'exports');
  const publishConfig = nested(pkg, 'publishConfig');
  const engines = nested(pkg, 'engines');
  const devDependencies = nested(pkg, 'devDependencies');

  pushIf(
    findings,
    typeof pkg.name === 'string' &&
      (pkg.name === TEMPLATE_NAME || (pkg.name.length > 0 && !pkg.name.includes(TEMPLATE_OPEN))),
    'name',
    'the exact Bun template name placeholder or a non-empty generated package name without template syntax',
    pkg.name,
  );
  for (const [property, expected] of [
    ['version', 'string'],
    ['description', 'string'],
    ['type', 'module'],
    ['module', './src/index.ts'],
    ['types', './src/index.ts'],
  ] as const) {
    const actual = pkg[property];
    pushIf(
      findings,
      expected === 'string' ? typeof actual === 'string' : actual === expected,
      property,
      expected,
      actual,
    );
  }
  pushIf(
    findings,
    exports?.['.'] === './src/index.ts',
    'exports[.]',
    './src/index.ts',
    exports?.['.'],
  );
  pushIf(
    findings,
    Array.isArray(pkg.files) &&
      pkg.files.length === 2 &&
      pkg.files[0] === 'src' &&
      pkg.files[1] === 'README.md',
    'files',
    '["src", "README.md"]',
    pkg.files,
  );
  pushIf(findings, engines?.bun === '>=1.3.14', 'engines.bun', '>=1.3.14', engines?.bun);
  pushIf(
    findings,
    pkg.packageManager === 'bun@1.3.14',
    'packageManager',
    'bun@1.3.14',
    pkg.packageManager,
  );
  pushIf(
    findings,
    publishConfig?.access === 'public',
    'publishConfig.access',
    'public',
    publishConfig?.access,
  );
  pushIf(
    findings,
    publishConfig?.tag === 'latest',
    'publishConfig.tag',
    'latest',
    publishConfig?.tag,
  );
  for (const [name, expected] of Object.entries(REQUIRED_DEV_DEPENDENCIES)) {
    pushIf(
      findings,
      devDependencies?.[name] === expected,
      `devDependencies.${name}`,
      expected,
      devDependencies?.[name],
    );
  }

  const requiredScripts: Readonly<Record<string, (value: unknown) => boolean>> = {
    dev: value => typeof value === 'string' && value.includes('bun --watch'),
    test: value => value === 'bun test',
    'test:dots': value => value === 'bun test --reporter=dots',
    'test:watch': value => typeof value === 'string' && value.includes('bun --watch'),
    'test:coverage': value => value === 'bun test --coverage',
    'test:coverage:lcov': value =>
      value === 'bun test --coverage --coverage-reporter=text --coverage-reporter=lcov',
    'test:junit': value => typeof value === 'string' && value.includes('run-test-junit'),
    'test:ci': value => typeof value === 'string' && value.includes('junit:enrich'),
    'junit:enrich': value => typeof value === 'string' && value.includes('junit-enrich'),
    'color-test': value => value === 'bun scripts/color-test.ts',
    format: value => value === 'bun run prettier --write .',
    'format:check': value => value === 'bun run prettier --check .',
    lint: value => value === 'bun run eslint . --max-warnings=0',
    'lint:fix': value => value === 'bun run eslint . --fix --max-warnings=0',
    typecheck: value => value === 'bun run tsc --noEmit',
    build: value =>
      typeof value === 'string' && value.startsWith('bun build ') && value.includes('--target bun'),
    'build:metafile': value =>
      typeof value === 'string' &&
      value.includes('--target bun') &&
      value.includes('--metafile-md'),
    'generate:files': value => typeof value === 'string' && value.includes('generate-files-md'),
    'check:files': value => typeof value === 'string' && value.includes('validate-files-md'),
    check: value =>
      typeof value === 'string' &&
      value.includes('check:files') &&
      value.includes('format:check') &&
      value.includes('lint') &&
      value.includes('typecheck') &&
      value.includes('bun run test') &&
      !value.includes('generate:files'),
    prepack: value => value === 'bun run check',
    'publish:dry-run': value => value === 'bun publish --dry-run',
  };
  for (const [name, valid] of Object.entries(requiredScripts)) {
    pushIf(
      findings,
      valid(scripts?.[name]),
      `scripts.${name}`,
      'documented Bun-native command pattern',
      scripts?.[name],
    );
  }
  return findings;
}

/** Stable, secret-free contract used by the repository snapshot test. */
export function factoryLibraryContractSnapshot(manifest: unknown) {
  const pkg = record(manifest) ?? {};
  const scripts = nested(pkg, 'scripts') ?? {};
  return {
    propertyGroups: FACTORY_LIBRARY_CONTRACT_GROUPS,
    environment: FACTORY_LIBRARY_ENVIRONMENT,
    junitProperties: FACTORY_LIBRARY_JUNIT_PROPERTIES,
    flags: FACTORY_LIBRARY_FLAGS,
    package: {
      name: pkg.name,
      packageManager: pkg.packageManager,
      exports: nested(pkg, 'exports'),
      files: pkg.files,
      publishConfig: nested(pkg, 'publishConfig'),
      engines: nested(pkg, 'engines'),
      devDependencies: nested(pkg, 'devDependencies'),
      scripts: Object.fromEntries(
        Object.keys(scripts)
          .sort((left, right) => left.localeCompare(right))
          .map(name => [name, scripts[name]]),
      ),
    },
  };
}

import { describe, expect, test } from 'bun:test';
import { stripANSI } from 'bun';
import {
  ANSI_RESET,
  AUTO_TERMINAL_COLOR_FORMAT,
  brandHex,
  brandRgb,
  colors,
  formatTerminal,
  TERMINAL_COLOR_FORMATS,
  terminalColorFormat,
  terminalColorOpen,
} from '../.bun-create/factory-library/src/index.ts';
import { bunSpawnArgs } from '../lib/bun-executable.ts';
import { makeTempDir, removeTempDir } from '../lib/tmp-probe.ts';
import {
  FACTORY_LIBRARY_CONTRACT_GROUPS,
  factoryLibraryContractSnapshot,
  validateFactoryLibraryManifest,
} from '../.bun-create/factory-library/scripts/template-contract.ts';
import {
  parseHarnessRequirementsContract,
  validateHarnessBunfig,
  validateHarnessRequirementFiles,
  validateHarnessLockfileSchema,
  validateHarnessRequirements,
} from '../.bun-create/factory-library/scripts/requirements.ts';
import {
  junitContextPath,
  readJunitContext,
  repositoryFromRemote,
} from '../.bun-create/factory-library/scripts/junit-context.ts';
import { projectFiles } from '../.bun-create/factory-library/scripts/files-index.ts';

const TEMPLATE_ROOT = `${import.meta.dir}/../.bun-create/factory-library`;

describe('factory-library template contract', () => {
  test('uses the isolated global store and hardened project runtime defaults', async () => {
    const config = Bun.TOML.parse(await Bun.file(`${TEMPLATE_ROOT}/bunfig.toml`).text()) as {
      install?: { linker?: string; globalStore?: boolean };
      run?: { noOrphans?: boolean };
      console?: { depth?: number };
      serve?: unknown;
    };
    expect(config.install).toEqual({
      linker: 'isolated',
      globalStore: true,
      frozenLockfile: false,
    });
    expect(config.run?.noOrphans).toBe(true);
    expect(config.console?.depth).toBe(6);
    expect(config.serve).toBeUndefined();

    const contract = parseHarnessRequirementsContract(
      Bun.TOML.parse(await Bun.file(`${TEMPLATE_ROOT}/harness.toml`).text())
    );
    expect(validateHarnessBunfig({ contract, bunfig: config })).toEqual([]);
    expect(
      validateHarnessBunfig({
        contract,
        bunfig: { ...config, console: { depth: 4 } },
      })
    ).toEqual([{ field: 'bunfig.toml.console.depth', message: 'must equal 6' }]);
  });

  test('keeps base checks secret-free and automated publication fail-closed', async () => {
    const contract = parseHarnessRequirementsContract(
      Bun.TOML.parse(await Bun.file(`${TEMPLATE_ROOT}/harness.toml`).text())
    );
    const manifest = await Bun.file(`${TEMPLATE_ROOT}/package.json`).json();
    const scaffoldManifest = {
      ...manifest,
      name: 'example-library',
      'bun-create': undefined,
    };

    expect(contract.requirements.check.requiredEnv).toEqual([]);
    expect(contract.requirements.check.requiredFiles).toEqual([
      'README.md',
      'src/index.ts',
      'test/index.test.ts',
    ]);
    expect(contract.requirements.lockfile).toEqual({
      requiredEnv: [],
      requiredFiles: ['bun.lock'],
      requireCustomizedDescription: false,
      requireLicense: false,
      requireRepository: false,
      requirePublishArmed: false,
      requireLockfileCoherence: true,
    });
    expect(contract.requirements.release.requiredEnv).toEqual([]);
    expect(contract.requirements.release.requireLockfileCoherence).toBe(true);
    expect(contract.requirements.release.requiredFiles).toEqual([
      'README.md',
      'src/index.ts',
      'bun.lock',
    ]);
    expect(contract.requirements.publish.requiredEnv).toEqual(['NPM_CONFIG_TOKEN']);
    expect(contract.requirements.publish.requireLockfileCoherence).toBe(true);
    expect(contract.lockfile).toEqual({
      path: 'bun.lock',
      lockfileVersion: 1,
      configVersion: 1,
      verification: 'frozen-dry-run',
    });
    expect(contract.config).toEqual({
      install: { linker: 'isolated', globalStore: true, frozenLockfile: false },
      run: { noOrphans: true },
      console: { depth: 6 },
      test: { coverageSkipTestFiles: true },
    });
    expect(contract.package).toEqual({
      type: 'module',
      sourceEntrypoint: './src/index.ts',
      publishFiles: ['src', 'README.md'],
      publishAccess: 'public',
      publishTag: 'latest',
    });
    expect(
      validateHarnessRequirements({
        contract,
        manifest: scaffoldManifest,
        mode: 'check',
        env: {},
        bunVersion: '1.3.14',
      })
    ).toEqual([]);

    const publishFindings = validateHarnessRequirements({
      contract,
      manifest: scaffoldManifest,
      mode: 'publish',
      env: {},
      bunVersion: '1.3.14',
    });
    expect(publishFindings.map(finding => finding.field)).toEqual([
      'package.json.description',
      'package.json.private',
      'package.json.license',
      'package.json.repository',
      'environment.NPM_CONFIG_TOKEN',
    ]);
    const releaseFindings = validateHarnessRequirements({
      contract,
      manifest: scaffoldManifest,
      mode: 'release',
      env: {},
      bunVersion: '1.3.14',
    });
    expect(releaseFindings.map(finding => finding.field)).toEqual([
      'package.json.description',
      'package.json.private',
      'package.json.license',
      'package.json.repository',
    ]);
    const releaseReadyManifest = {
      ...scaffoldManifest,
      description: 'A concrete domain library.',
      private: false,
      license: 'MIT',
      repository: {
        type: 'git',
        url: 'https://github.com/factory-wager/example-library.git',
      },
    };
    expect(
      validateHarnessRequirements({
        contract,
        manifest: releaseReadyManifest,
        mode: 'publish',
        env: { NPM_CONFIG_TOKEN: 'present-for-contract-test' },
        bunVersion: '1.3.14',
      })
    ).toEqual([]);
    expect(
      validateHarnessRequirements({
        contract,
        manifest: scaffoldManifest,
        mode: 'check',
        env: {},
        bunVersion: '1.3.13',
      })
    ).toContainEqual({ field: 'Bun.version', message: 'must be at least 1.3.14' });

    expect(
      validateHarnessRequirements({
        contract,
        manifest: { ...scaffoldManifest, files: ['src', 'dist'] },
        mode: 'check',
        env: {},
        bunVersion: '1.3.14',
      })
    ).toContainEqual({
      field: 'package.json.files',
      message: 'must equal ["src","README.md"]',
    });
    expect(
      validateHarnessRequirements({
        contract,
        manifest: { ...scaffoldManifest, description: 'Unresolved {{description}}' },
        mode: 'check',
        env: {},
        bunVersion: '1.3.14',
      })
    ).toContainEqual({
      field: 'package.json.description',
      message: 'must not contain unresolved Bun template placeholders',
    });
  });

  test('requires accountable non-empty files and a lockfile only at release boundaries', async () => {
    const contract = parseHarnessRequirementsContract(
      Bun.TOML.parse(await Bun.file(`${TEMPLATE_ROOT}/harness.toml`).text())
    );
    const directory = await makeTempDir('harness-required-files');
    try {
      await Promise.all([
        Bun.write(`${directory}/README.md`, '# Fixture\n'),
        Bun.write(`${directory}/src/index.ts`, 'export const fixture = true;\n'),
        Bun.write(`${directory}/test/index.test.ts`, 'export {};\n'),
      ]);
      expect(
        await validateHarnessRequirementFiles({ contract, mode: 'check', root: directory })
      ).toEqual([]);
      expect(
        await validateHarnessRequirementFiles({ contract, mode: 'release', root: directory })
      ).toEqual([{ field: 'file.bun.lock', message: 'must exist' }]);

      await Bun.write(`${directory}/bun.lock`, '');
      expect(
        await validateHarnessRequirementFiles({ contract, mode: 'release', root: directory })
      ).toEqual([{ field: 'file.bun.lock', message: 'must be non-empty' }]);

      await Bun.write(`${directory}/bun.lock`, '{"lockfileVersion": 1}\n');
      expect(
        await validateHarnessRequirementFiles({ contract, mode: 'release', root: directory })
      ).toEqual([]);
    } finally {
      await removeTempDir(directory);
    }
  });

  test('locks the Bun text lockfile schema before native coherence verification', async () => {
    const contract = parseHarnessRequirementsContract(
      Bun.TOML.parse(await Bun.file(`${TEMPLATE_ROOT}/harness.toml`).text())
    );
    const directory = await makeTempDir('harness-lockfile-schema');
    try {
      await Bun.write(`${directory}/bun.lock`, '{ lockfileVersion: 1, configVersion: 0 }\n');
      expect(await validateHarnessLockfileSchema({ contract, root: directory })).toEqual([
        {
          field: 'file.bun.lock.schema',
          message: 'must declare lockfileVersion 1 and configVersion 1',
        },
      ]);

      await Bun.write(
        `${directory}/bun.lock`,
        '{ lockfileVersion: 1, configVersion: 1, workspaces: {}, packages: {} }\n'
      );
      expect(await validateHarnessLockfileSchema({ contract, root: directory })).toEqual([]);
    } finally {
      await removeTempDir(directory);
    }
  });

  test('fails the direct lockfile gate when no lock artifact exists', async () => {
    const proc = Bun.spawn(bunSpawnArgs([`${TEMPLATE_ROOT}/scripts/requirements.ts`, 'lockfile']), {
      cwd: TEMPLATE_ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const [exitCode, stderr] = await Promise.all([proc.exited, new Response(proc.stderr).text()]);
    expect(exitCode).not.toBe(0);
    expect(stderr).toContain('file.bun.lock: must exist');
  });

  test('uses Bun frozen dry-run as the package-to-lock coherence authority', async () => {
    const directory = await makeTempDir('harness-lockfile-coherence');
    const packagePath = `${directory}/package.json`;
    try {
      await Promise.all([
        Bun.write(
          packagePath,
          JSON.stringify(
            {
              name: 'lockfile-fixture',
              version: '1.0.0',
              private: true,
              devDependencies: { '@types/bun': 'latest' },
            },
            null,
            2
          )
        ),
        Bun.write(`${directory}/bunfig.toml`, '[install]\nfrozenLockfile = false\n'),
      ]);
      const bootstrap = Bun.spawn(
        bunSpawnArgs(['install', '--lockfile-only', '--ignore-scripts']),
        { cwd: directory, stdout: 'pipe', stderr: 'pipe' }
      );
      const [bootstrapExit, bootstrapError] = await Promise.all([
        bootstrap.exited,
        new Response(bootstrap.stderr).text(),
      ]);
      expect(bootstrapExit, bootstrapError).toBe(0);

      const before = await Bun.file(`${directory}/bun.lock`).text();
      const valid = Bun.spawn(
        bunSpawnArgs(['install', '--frozen-lockfile', '--dry-run', '--ignore-scripts']),
        { cwd: directory, stdout: 'pipe', stderr: 'pipe' }
      );
      const [validExit, validError] = await Promise.all([
        valid.exited,
        new Response(valid.stderr).text(),
      ]);
      expect(validExit, validError).toBe(0);
      expect(await Bun.file(`${directory}/bun.lock`).text()).toBe(before);

      await Bun.write(
        packagePath,
        JSON.stringify(
          {
            name: 'lockfile-drift',
            version: '1.0.0',
            private: true,
            devDependencies: { '@types/bun': 'latest', 'left-pad': '1.3.0' },
          },
          null,
          2
        )
      );
      const drifted = Bun.spawn(
        bunSpawnArgs(['install', '--frozen-lockfile', '--dry-run', '--ignore-scripts']),
        { cwd: directory, stdout: 'pipe', stderr: 'pipe' }
      );
      const [driftedExit, driftedError] = await Promise.all([
        drifted.exited,
        new Response(drifted.stderr).text(),
      ]);
      expect(driftedExit).not.toBe(0);
      expect(driftedError).toContain('lockfile had changes, but lockfile is frozen');
      expect(await Bun.file(`${directory}/bun.lock`).text()).toBe(before);
    } finally {
      await removeTempDir(directory);
    }
  });

  test('rejects weakened release policy and malformed environment names', async () => {
    const input = Bun.TOML.parse(await Bun.file(`${TEMPLATE_ROOT}/harness.toml`).text()) as Record<
      string,
      unknown
    >;
    const weakened = structuredClone(input) as {
      requirements: { release: { requirePublishArmed: boolean } };
    };
    weakened.requirements.release.requirePublishArmed = false;
    expect(() => parseHarnessRequirementsContract(weakened)).toThrow(
      'requirements.release must preserve its exact environment and release-readiness policy'
    );

    const malformed = structuredClone(input) as {
      requirements: { publish: { requiredEnv: string[] } };
    };
    malformed.requirements.publish.requiredEnv = ['npm-token'];
    expect(() => parseHarnessRequirementsContract(malformed)).toThrow(
      'requirements.publish.requiredEnv must contain unique uppercase environment variable names'
    );

    const misspelled = structuredClone(input) as {
      package: Record<string, unknown>;
    };
    misspelled.package.publishFile = ['src'];
    expect(() => parseHarnessRequirementsContract(misspelled)).toThrow(
      'harness.toml.package has unknown field: publishFile'
    );
  });

  test('normalizes GitHub-style remotes without undefined or lost owner scope', () => {
    expect(repositoryFromRemote('https://github.com/factory-wager/library.git')).toBe(
      'factory-wager/library'
    );
    expect(repositoryFromRemote('git@github.com:factory-wager/library.git')).toBe(
      'factory-wager/library'
    );
    expect(repositoryFromRemote('not-a-repository')).toBeUndefined();
  });

  test('rejects an incoherent cached JUnit context instead of serializing source-only metadata', async () => {
    const directory = await makeTempDir('junit-context-contract');
    const reportPath = `${directory}/junit.xml`;
    try {
      await Bun.write(
        junitContextPath(reportPath),
        JSON.stringify({
          schemaVersion: 2,
          generatedAt: new Date().toISOString(),
          reportContext: 'local',
          commitSource: 'git',
          runIdSource: 'unavailable',
          repositorySource: 'unavailable',
          branchSource: 'unavailable',
        })
      );
      expect(await readJunitContext(reportPath)).toBeUndefined();
    } finally {
      await removeTempDir(directory);
    }
  });

  test('accounts for every non-generated, non-secret project file', async () => {
    const directory = await makeTempDir('files-index-contract');
    try {
      await Promise.all([
        Bun.write(`${directory}/README.md`, '# Fixture\n'),
        Bun.write(`${directory}/.gitignore`, 'dist/\n'),
        Bun.write(`${directory}/docs/decision.md`, '# Decision\n'),
        Bun.write(`${directory}/.env.example`, 'PUBLIC_FLAG=1\n'),
        Bun.write(`${directory}/.env.local`, 'SECRET=not-indexed\n'),
        Bun.write(`${directory}/dist/index.js`, 'generated\n'),
        Bun.write(`${directory}/reports/junit.xml`, 'generated\n'),
        Bun.write(`${directory}/artifact.tgz`, 'generated\n'),
      ]);
      expect(await projectFiles(directory)).toEqual([
        '.bun-keep',
        '.env.example',
        '.gitignore',
        'docs/decision.md',
        'README.md',
      ]);
    } finally {
      await removeTempDir(directory);
    }
  });

  test('keeps mustache placeholders only where Bun resolves the package name', async () => {
    const files = [
      'README.md',
      'bunfig.toml',
      'scripts/bench.ts',
      'scripts/build-summary.ts',
      'scripts/color-test.ts',
      'scripts/cron-preview.ts',
      'scripts/files-index.ts',
      'scripts/generate-files-md.ts',
      'scripts/junit-context.ts',
      'scripts/junit-enrich.ts',
      'scripts/requirements.ts',
      'scripts/template-contract.ts',
      'harness.toml',
      '.env.example',
      'src/index.ts',
      'test/index.test.ts',
      'test/terminal-types.test-d.ts',
      'scripts/postpublish.ts',
      'scripts/validate-files-md.ts',
    ];
    for (const file of files) {
      const text = await Bun.file(`${TEMPLATE_ROOT}/${file}`).text();
      expect(text).not.toContain('{{');
    }

    const packageJson = await Bun.file(`${TEMPLATE_ROOT}/package.json`).json();
    expect(packageJson.name).toBe('{{name}}');
    expect(JSON.stringify(packageJson['bun-create'])).not.toContain('{{');
  });

  test('publishes a Bun-native source entry point without template-only files', async () => {
    const packageJson = await Bun.file(`${TEMPLATE_ROOT}/package.json`).json();
    expect(packageJson.exports['.']).toBe('./src/index.ts');
    expect(packageJson.types).toBe('./src/index.ts');
    expect(packageJson.files).toEqual(['src', 'README.md']);
    expect(packageJson.scripts.build).toContain('bun build');
    expect(packageJson.scripts['test:dots']).toBe('bun test --reporter=dots');
    expect(packageJson.scripts['test:coverage']).toBe('bun test --coverage');
    expect(packageJson.scripts['test:coverage:lcov']).toBe(
      'bun test --coverage --coverage-reporter=text --coverage-reporter=lcov'
    );
    expect(packageJson.scripts.dev).toContain('--watch');
    expect(packageJson.scripts.dev).toContain('--no-clear-screen');
    expect(packageJson.scripts['test:watch']).toContain('bun --watch');
    expect(packageJson.scripts['test:junit']).toContain('run-test-junit');
    expect(packageJson.scripts['test:ci']).toContain('junit:enrich');
    expect(packageJson.scripts['junit:enrich']).toContain('junit-enrich');
    expect(packageJson.scripts.format).toBe('bun run prettier --write .');
    expect(packageJson.scripts['format:check']).toBe('bun run prettier --check .');
    expect(packageJson.scripts.lint).toBe('bun run eslint . --max-warnings=0');
    expect(packageJson.scripts['lint:fix']).toBe('bun run eslint . --fix --max-warnings=0');
    expect(packageJson.scripts.typecheck).toBe('tsc --noEmit');
    expect(packageJson.scripts.check).toContain('bun run format:check');
    expect(packageJson.scripts.check).toContain('bun run lint');
    expect(packageJson.scripts.check).toContain('bun run typecheck');
    expect(packageJson.scripts['generate:files']).toContain('generate-files-md');
    expect(packageJson.scripts['check:files']).toContain('validate-files-md');
    expect(packageJson.scripts['build:metafile']).toContain('--metafile-md');
    expect(packageJson.scripts.requirements).toBe('bun scripts/requirements.ts check');
    expect(packageJson.scripts['requirements:release']).toBe('bun scripts/requirements.ts release');
    expect(packageJson.scripts['requirements:publish']).toBe('bun scripts/requirements.ts publish');
    expect(packageJson.scripts['lockfile:check']).toBe(
      'bun scripts/requirements.ts lockfile && bun install --frozen-lockfile --dry-run --ignore-scripts'
    );
    expect(packageJson.scripts['publish:ci']).toBe(
      'bun run requirements:publish && bun run lockfile:check && bun publish'
    );
    expect(packageJson.scripts.prepack).toBe('bun run check');
    expect(packageJson.scripts.postpublish).toContain('postpublish.ts');
    expect(packageJson.scripts['release:dry-run']).toBe(
      'bun run requirements:release && bun run lockfile:check && bun pm pack --dry-run'
    );
    expect(packageJson.scripts['cron:preview']).toBe('TZ=UTC bun scripts/cron-preview.ts');
    expect(packageJson.private).toBe(true);
    expect(packageJson.license).toBe('UNLICENSED');
    expect(packageJson.scripts['color-test']).toBe('bun scripts/color-test.ts');
    expect(packageJson.publishConfig).toEqual({ access: 'public', tag: 'latest' });
    expect(packageJson.devDependencies.typescript).toBe('6.0.3');
    expect(packageJson.devDependencies.prettier).toBe('3.9.6');
    expect(packageJson.devDependencies.eslint).toBe('9.39.4');

    expect(await Bun.file(`${TEMPLATE_ROOT}/plugin.example.ts`).exists()).toBe(false);
    expect(await Bun.file(`${TEMPLATE_ROOT}/.gitignore`).exists()).toBe(true);
    expect(await Bun.file(`${TEMPLATE_ROOT}/scripts/run-test-junit.ts`).exists()).toBe(true);
    expect(await Bun.file(`${TEMPLATE_ROOT}/scripts/junit-context.ts`).exists()).toBe(true);
    expect(await Bun.file(`${TEMPLATE_ROOT}/scripts/junit-enrich.ts`).exists()).toBe(true);
    expect(await Bun.file(`${TEMPLATE_ROOT}/scripts/build-summary.ts`).exists()).toBe(true);
    expect(await Bun.file(`${TEMPLATE_ROOT}/scripts/requirements.ts`).exists()).toBe(true);
    expect(await Bun.file(`${TEMPLATE_ROOT}/harness.toml`).exists()).toBe(true);
    expect(await Bun.file(`${TEMPLATE_ROOT}/.env.example`).exists()).toBe(true);
    expect(await Bun.file(`${TEMPLATE_ROOT}/scripts/postpublish.ts`).exists()).toBe(true);
    expect(await Bun.file(`${TEMPLATE_ROOT}/scripts/color-test.ts`).exists()).toBe(true);
    expect(await Bun.file(`${TEMPLATE_ROOT}/scripts/cron-preview.ts`).exists()).toBe(true);
    expect(await Bun.file(`${TEMPLATE_ROOT}/files.md`).exists()).toBe(true);
    expect(await Bun.file(`${TEMPLATE_ROOT}/eslint.config.mjs`).exists()).toBe(true);

    const filesIndex = await Bun.file(`${TEMPLATE_ROOT}/files.md`).text();
    expect(filesIndex).toContain('## Publish allowlist');
    expect(filesIndex).toContain('scripts/generate-files-md.ts');

    const readme = await Bun.file(`${TEMPLATE_ROOT}/README.md`).text();
    expect(readme).toContain('NPM_CONFIG_TOKEN');
    expect(readme).toContain('NPM_CLIENT');
    expect(readme).toContain('--ignore-scripts');
    expect(readme).toContain('CI_JOB_URL');
    expect(readme).toContain('CI_COMMIT_SHA');
    expect(readme).toContain('stdout`/`stderr');
    expect(readme).toContain('--test-name-pattern="hello"');
    expect(readme).toContain('rather than a glob API');
    expect(readme).toContain('AUTO_TERMINAL_COLOR_FORMAT');
    expect(readme).toContain('Bun.color(color, "ansi")');
    expect(readme).toContain('depth: "16"');
    expect(readme).toContain('terminalColorOpen()');
    expect(readme).toContain('bun run color-test');
    expect(readme).toContain('bun run cron:preview');
    expect(readme).toContain('standard five-field expressions');
    expect(readme).toContain('Seconds are not supported');

    const bunfig = await Bun.file(`${TEMPLATE_ROOT}/bunfig.toml`).text();
    expect(bunfig).toContain('Keep [test.reporter] unset');
    expect(bunfig).toContain('coverageSkipTestFiles = true');
    expect(bunfig).toContain('Do not set coverageThreshold');

    const junitEnricher = await Bun.file(`${TEMPLATE_ROOT}/scripts/junit-enrich.ts`).text();
    expect(junitEnricher).toContain('Bun.file');
    expect(junitEnricher).toContain('Bun.write');
    expect(junitEnricher).not.toContain("from 'fs'");
    expect(junitEnricher).toContain('package_version');
    expect(junitEnricher).toContain('repository');
    expect(junitEnricher).toContain('run_id');
    expect(junitEnricher).toContain('readJunitContext');
    const junitContext = await Bun.file(`${TEMPLATE_ROOT}/scripts/junit-context.ts`).text();
    expect(junitContext).toContain('repositoryFromRemote');
    expect(junitContext).not.toContain("'unknown'");
    expect(junitContext).not.toContain('local-${');
    const gitignore = await Bun.file(`${TEMPLATE_ROOT}/.gitignore`).text();
    expect(gitignore).toContain('coverage/');
    expect(gitignore).toContain('profiles/');

    const tsconfig = await Bun.file(`${TEMPLATE_ROOT}/tsconfig.json`).json();
    expect(tsconfig.compilerOptions.noEmit).toBe(true);
    expect(tsconfig.compilerOptions.types).toEqual(['bun']);
    expect(tsconfig.compilerOptions.moduleDetection).toBe('force');
    expect(tsconfig.compilerOptions.noUncheckedIndexedAccess).toBe(true);
  });

  test('defines ansi and lets Bun.color auto-format terminal output', async () => {
    expect(AUTO_TERMINAL_COLOR_FORMAT).toBe('ansi');
    expect(TERMINAL_COLOR_FORMATS.truecolor).toBe('ansi-16m');
    expect(terminalColorFormat('256')).toBe('ansi-256');
    expect(terminalColorOpen('#e06c75', 'truecolor')).toBe('\x1b[38;2;224;108;117m');
    expect(formatTerminal('ready', '#e06c75', 'truecolor')).toBe(
      `\x1b[38;2;224;108;117mready${ANSI_RESET}`
    );
    expect(brandHex).toBe('#7dd3c0');
    expect(brandRgb).toEqual({ r: 125, g: 211, b: 192 });
    expect(colors.brand('brand')).toBe(formatTerminal('brand', brandHex));

    const proc = Bun.spawn(
      bunSpawnArgs([
        '-e',
        `import { AUTO_TERMINAL_COLOR_FORMAT, formatTerminal } from ${JSON.stringify(`${TEMPLATE_ROOT}/src/index.ts`)}; console.write(AUTO_TERMINAL_COLOR_FORMAT + "\\n" + formatTerminal("ready", "#e06c75"));`,
      ]),
      {
        env: { ...Bun.env, FORCE_COLOR: '3' },
        stdout: 'pipe',
        stderr: 'pipe',
      }
    );
    const [exitCode, stdout, stderr] = await Promise.all([
      proc.exited,
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);
    expect(exitCode, stderr).toBe(0);
    expect(stdout.startsWith('ansi\n\x1b[38;2;224;108;117m')).toBe(true);
    expect(stdout.endsWith('\x1b[0m')).toBe(true);
    expect(stripANSI(stdout)).toBe('ansi\nready');

    const noColorEnv = { ...Bun.env, NO_COLOR: '1' };
    delete noColorEnv.FORCE_COLOR;
    const plainProc = Bun.spawn(
      bunSpawnArgs([
        '-e',
        `import { formatTerminal } from ${JSON.stringify(`${TEMPLATE_ROOT}/src/index.ts`)}; console.write(formatTerminal("ready", "#e06c75"));`,
      ]),
      { env: noColorEnv, stdout: 'pipe', stderr: 'pipe' }
    );
    const [plainExitCode, plainStdout, plainStderr] = await Promise.all([
      plainProc.exited,
      new Response(plainProc.stdout).text(),
      new Response(plainProc.stderr).text(),
    ]);
    expect(plainExitCode, plainStderr).toBe(0);
    expect(plainStdout).toBe('ready');
  });

  test('color-test keeps auto output plain while fixed serialization stays explicit', async () => {
    const env = { ...Bun.env, NO_COLOR: '1' };
    delete env.FORCE_COLOR;
    const proc = Bun.spawn(bunSpawnArgs([`${TEMPLATE_ROOT}/scripts/color-test.ts`]), {
      cwd: TEMPLATE_ROOT,
      env,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const [exitCode, stdout, stderr] = await Promise.all([
      proc.exited,
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);
    expect(exitCode, stderr).toBe(0);
    expect(stdout).toContain('Bun.color terminal mode: ansi\n✅ Success\n❌ Failure\n');
    expect(stdout).toContain('\x1b[38;5;');
    expect(stripANSI(stdout)).toContain('256-color serialization sample');
    expect(stdout).toContain('"truecolor": "ansi-16m"');
  });

  test('cron preview uses Bun parsing without registering a job', async () => {
    const preview = Bun.spawn(
      bunSpawnArgs([
        `${TEMPLATE_ROOT}/scripts/cron-preview.ts`,
        '0 * * * *',
        '2026-01-01T00:30:00Z',
      ]),
      {
        cwd: TEMPLATE_ROOT,
        env: { ...Bun.env, TZ: 'UTC' },
        stdout: 'pipe',
        stderr: 'pipe',
      }
    );
    const [previewCode, previewOut, previewErr] = await Promise.all([
      preview.exited,
      new Response(preview.stdout).text(),
      new Response(preview.stderr).text(),
    ]);
    expect(previewCode, previewErr).toBe(0);
    expect(JSON.parse(previewOut)).toEqual({
      schedule: '0 * * * *',
      scheduleSource: 'argument',
      timeZone: 'UTC',
      relativeInput: '2026-01-01T00:30:00Z',
      relativeDate: '2026-01-01T00:30:00.000Z',
      next: '2026-01-01T01:00:00.000Z',
      bunVersion: Bun.version,
    });

    const invalid = Bun.spawn(
      bunSpawnArgs([
        `${TEMPLATE_ROOT}/scripts/cron-preview.ts`,
        '*/30 * * * * *',
        '2026-01-01T00:00:00Z',
      ]),
      {
        cwd: TEMPLATE_ROOT,
        env: { ...Bun.env, TZ: 'UTC' },
        stdout: 'pipe',
        stderr: 'pipe',
      }
    );
    const [invalidCode, invalidErr] = await Promise.all([
      invalid.exited,
      new Response(invalid.stderr).text(),
    ]);
    expect(invalidCode).not.toBe(0);
    expect(invalidErr).toContain('5 fields');
    expect(invalidErr).toContain('seconds are not supported');

    const naive = Bun.spawn(
      bunSpawnArgs([
        `${TEMPLATE_ROOT}/scripts/cron-preview.ts`,
        '0 * * * *',
        '2026-01-01T00:30:00',
      ]),
      {
        cwd: TEMPLATE_ROOT,
        env: { ...Bun.env, TZ: 'UTC' },
        stdout: 'pipe',
        stderr: 'pipe',
      }
    );
    const [naiveCode, naiveErr] = await Promise.all([
      naive.exited,
      new Response(naive.stderr).text(),
    ]);
    expect(naiveCode).not.toBe(0);
    expect(naiveErr).toContain('ending in Z or ±HH:MM');

    const unsupportedZone = Bun.spawn(
      bunSpawnArgs([
        `${TEMPLATE_ROOT}/scripts/cron-preview.ts`,
        '0 * * * *',
        '2026-01-01T00:30:00Z',
      ]),
      {
        cwd: TEMPLATE_ROOT,
        env: { ...Bun.env, TZ: 'UTC', CRON_TZ: 'America/Chicago' },
        stdout: 'pipe',
        stderr: 'pipe',
      }
    );
    const [zoneCode, zoneErr] = await Promise.all([
      unsupportedZone.exited,
      new Response(unsupportedZone.stderr).text(),
    ]);
    expect(zoneCode).not.toBe(0);
    expect(zoneErr).toContain('unsupported by Bun 1.3.14');
  });

  test('groups package properties, environment, and flags in a stable contract snapshot', async () => {
    const packageJson = await Bun.file(`${TEMPLATE_ROOT}/package.json`).json();
    expect(validateFactoryLibraryManifest(packageJson, 'template')).toEqual([]);
    expect(FACTORY_LIBRARY_CONTRACT_GROUPS.map(group => group.id)).toEqual([
      'identity',
      'runtime',
      'quality',
      'reporting',
      'publish',
      'lifecycle',
      'files',
      'requirements',
      'environment',
      'flags',
    ]);
    expect(factoryLibraryContractSnapshot(packageJson, 'template')).toMatchSnapshot();
  });

  test('Factory materializes the local template without install or Git', async () => {
    const destination = await makeTempDir('factory-library-scaffold');
    await Bun.write(`${destination}/stale.txt`, 'this local destination must be replaced');

    try {
      const proc = Bun.spawn(
        bunSpawnArgs([
          'lib/factory/cli.ts',
          'create',
          'factory-library',
          '--replace-local',
          '--no-install',
          '--no-git',
          destination,
        ]),
        {
          cwd: `${import.meta.dir}/..`,
          env: { ...Bun.env },
          stdout: 'pipe',
          stderr: 'pipe',
        }
      );
      const [exitCode, stdout, stderr] = await Promise.all([
        proc.exited,
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
      ]);

      expect(exitCode, `${stdout}\n${stderr}`).toBe(0);
      expect(stdout).toContain('Scaffold source: local (factory-library)');
      expect(stdout).toContain('Template preflight: requirements, files, and manifest passed');
      expect(stdout).toContain(
        'Scaffold materialization: requirements, files, and manifest passed'
      );
      // Active Bun 1.3.14 suppresses preinstall when --no-install is present,
      // while preserving the postinstall next-step message.
      expect(stdout).not.toContain('Installing library dependencies');
      expect(stdout).toContain('Library scaffolded successfully');
      expect(await Bun.file(`${destination}/stale.txt`).exists()).toBe(false);
      expect(await Bun.file(`${destination}/node_modules`).exists()).toBe(false);
      expect(await Bun.file(`${destination}/.git`).exists()).toBe(false);

      const manifest = (await Bun.file(`${destination}/package.json`).json()) as Record<
        string,
        unknown
      >;
      expect(manifest.name).toBe(destination.slice(destination.lastIndexOf('/') + 1));
      expect(manifest['bun-create']).toBeUndefined();
      expect(manifest.private).toBe(true);
      expect(manifest.license).toBe('UNLICENSED');
      expect(manifest.exports).toEqual({ '.': './src/index.ts' });
      expect(validateFactoryLibraryManifest(manifest, 'scaffold')).toEqual([]);
      expect(await Bun.file(`${destination}/src/index.ts`).exists()).toBe(true);
      expect(await Bun.file(`${destination}/test/index.test.ts`).exists()).toBe(true);

      const cronPreview = Bun.spawn(
        bunSpawnArgs(['run', 'cron:preview', '--', '0 * * * *', '2026-01-01T00:30:00Z']),
        { cwd: destination, env: { ...Bun.env }, stdout: 'pipe', stderr: 'pipe' }
      );
      const [cronCode, cronOut, cronErr] = await Promise.all([
        cronPreview.exited,
        new Response(cronPreview.stdout).text(),
        new Response(cronPreview.stderr).text(),
      ]);
      expect(cronCode, cronErr).toBe(0);
      expect(JSON.parse(cronOut)).toMatchObject({
        schedule: '0 * * * *',
        next: '2026-01-01T01:00:00.000Z',
      });

      const accidentalPublish = Bun.spawn(
        bunSpawnArgs(['publish', '--dry-run', '--ignore-scripts']),
        { cwd: destination, env: { ...Bun.env }, stdout: 'pipe', stderr: 'pipe' }
      );
      const [publishCode, publishOut, publishErr] = await Promise.all([
        accidentalPublish.exited,
        new Response(accidentalPublish.stdout).text(),
        new Response(accidentalPublish.stderr).text(),
      ]);
      expect(publishCode).toBe(1);
      expect(`${publishOut}\n${publishErr}`).toContain('attempted to publish a private package');

      const coverage = Bun.spawn(bunSpawnArgs(['test', '--coverage', './test/index.test.ts']), {
        cwd: destination,
        env: { ...Bun.env },
        stdout: 'pipe',
        stderr: 'pipe',
      });
      const [coverageCode, coverageOut, coverageErr] = await Promise.all([
        coverage.exited,
        new Response(coverage.stdout).text(),
        new Response(coverage.stderr).text(),
      ]);
      const coverageLog = `${coverageOut}\n${coverageErr}`;
      expect(coverageCode, coverageLog).toBe(0);
      expect(coverageLog).toContain('src/index.ts');
      expect(coverageLog).not.toContain('test/index.test.ts |');

      const lcov = Bun.spawn(
        bunSpawnArgs([
          'test',
          '--coverage',
          '--coverage-reporter=text',
          '--coverage-reporter=lcov',
          './test/index.test.ts',
        ]),
        { cwd: destination, env: { ...Bun.env }, stdout: 'pipe', stderr: 'pipe' }
      );
      const [lcovCode, lcovOut, lcovErr] = await Promise.all([
        lcov.exited,
        new Response(lcov.stdout).text(),
        new Response(lcov.stderr).text(),
      ]);
      const lcovLog = `${lcovOut}\n${lcovErr}`;
      expect(lcovCode, lcovLog).toBe(0);
      expect(lcovLog).toContain('src/index.ts');
      const lcovInfo = await Bun.file(`${destination}/coverage/lcov.info`).text();
      expect(lcovInfo).toContain('SF:src/index.ts');
      expect(lcovInfo).not.toContain('SF:test/');

      const localEnvironment = { ...Bun.env };
      for (const key of [
        'CI',
        'CI_JOB_URL',
        'CI_COMMIT_SHA',
        'GITHUB_SHA',
        'GIT_SHA',
        'GITHUB_RUN_ID',
        'GITHUB_SERVER_URL',
        'GITHUB_REPOSITORY',
        'GITHUB_REF_NAME',
        'PROJECT_NAME',
      ])
        delete localEnvironment[key];

      const ci = Bun.spawn(bunSpawnArgs(['run', 'test:ci']), {
        cwd: destination,
        env: localEnvironment,
        stdout: 'pipe',
        stderr: 'pipe',
      });
      const [ciCode, ciOut, ciErr] = await Promise.all([
        ci.exited,
        new Response(ci.stdout).text(),
        new Response(ci.stderr).text(),
      ]);
      const ciLog = `${ciOut}\n${ciErr}`;
      expect(ciCode, ciLog).toBe(0);
      expect(ciLog).toContain('src/index.ts');
      const junit = await Bun.file(`${destination}/reports/junit.xml`).text();
      for (const property of [
        'package',
        'package_version',
        'project',
        'project_source',
        'report_context',
        'commit_source',
        'branch_source',
        'repository_source',
        'run_id_source',
        'generated_at',
      ]) {
        expect(junit).toContain(`name="${property}"`);
      }
      expect(junit).toContain('hostname="');
      expect(junit).not.toContain('undefined');
      expect(junit).not.toContain('value="unknown"');
      expect(junit).not.toContain('value="detached"');
      expect(junit).not.toContain('name="ci"');
      expect(junit).not.toContain('name="commit"');
      expect(junit).not.toContain('name="branch"');
      expect(junit).not.toContain('name="repository"');
      expect(junit).not.toContain('name="run_id"');
      const context = (await Bun.file(
        `${destination}/reports/junit-context.json`
      ).json()) as Record<string, unknown>;
      expect(context.schemaVersion).toBe(2);
      expect(context.reportContext).toBe('local');
      expect(context.commitSource).toBe('unavailable');
      expect(context.branchSource).toBe('unavailable');
      expect(context.repositorySource).toBe('unavailable');
      expect(context.runIdSource).toBe('unavailable');
      expect(junit).toContain(`name="generated_at" value="${context.generatedAt}"`);
    } finally {
      await removeTempDir(destination);
    }
  });
});

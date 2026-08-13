import { describe, expect, test } from 'bun:test';
import { bunSpawnArgs } from '../lib/bun-executable.ts';
import { makeTempDir, removeTempDir } from '../lib/tmp-probe.ts';
import {
  FACTORY_LIBRARY_CONTRACT_GROUPS,
  factoryLibraryContractSnapshot,
  validateFactoryLibraryManifest,
} from '../.bun-create/factory-library/scripts/template-contract.ts';
import { junitContextPath, readJunitContext, repositoryFromRemote } from '../.bun-create/factory-library/scripts/junit-context.ts';
import { projectFiles } from '../.bun-create/factory-library/scripts/files-index.ts';

const TEMPLATE_ROOT = `${import.meta.dir}/../.bun-create/factory-library`;

describe('factory-library template contract', () => {
  test('uses the isolated global store and parent-death protection', async () => {
    const config = Bun.TOML.parse(await Bun.file(`${TEMPLATE_ROOT}/bunfig.toml`).text()) as {
      install?: { linker?: string; globalStore?: boolean };
      run?: { noOrphans?: boolean };
    };
    expect(config.install).toEqual({ linker: 'isolated', globalStore: true });
    expect(config.run?.noOrphans).toBe(true);
  });

  test('normalizes GitHub-style remotes without undefined or lost owner scope', () => {
    expect(repositoryFromRemote('https://github.com/factory-wager/library.git')).toBe('factory-wager/library');
    expect(repositoryFromRemote('git@github.com:factory-wager/library.git')).toBe('factory-wager/library');
    expect(repositoryFromRemote('not-a-repository')).toBeUndefined();
  });

  test('rejects an incoherent cached JUnit context instead of serializing source-only metadata', async () => {
    const directory = await makeTempDir('junit-context-contract');
    const reportPath = `${directory}/junit.xml`;
    try {
      await Bun.write(junitContextPath(reportPath), JSON.stringify({
        schemaVersion: 2,
        generatedAt: new Date().toISOString(),
        reportContext: 'local',
        commitSource: 'git',
        runIdSource: 'unavailable',
        repositorySource: 'unavailable',
        branchSource: 'unavailable',
      }));
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
      'scripts/files-index.ts',
      'scripts/generate-files-md.ts',
      'scripts/junit-context.ts',
      'scripts/junit-enrich.ts',
      'scripts/template-contract.ts',
      'src/index.ts',
      'test/index.test.ts',
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
    expect(packageJson.scripts.typecheck).toBe('tsc --noEmit');
    expect(packageJson.scripts.check).toContain('bun run typecheck');
    expect(packageJson.scripts['generate:files']).toContain('generate-files-md');
    expect(packageJson.scripts['check:files']).toContain('validate-files-md');
    expect(packageJson.scripts['build:metafile']).toContain('--metafile-md');
    expect(packageJson.scripts.prepack).toBe('bun run check');
    expect(packageJson.scripts.postpublish).toContain('postpublish.ts');
    expect(packageJson.scripts['publish:dry-run']).toBe('bun publish --dry-run');
    expect(packageJson.publishConfig).toEqual({ access: 'public', tag: 'latest' });
    expect(packageJson.devDependencies.typescript).toBe('latest');

    expect(await Bun.file(`${TEMPLATE_ROOT}/plugin.example.ts`).exists()).toBe(false);
    expect(await Bun.file(`${TEMPLATE_ROOT}/.gitignore`).exists()).toBe(true);
    expect(await Bun.file(`${TEMPLATE_ROOT}/scripts/run-test-junit.ts`).exists()).toBe(true);
    expect(await Bun.file(`${TEMPLATE_ROOT}/scripts/junit-context.ts`).exists()).toBe(true);
    expect(await Bun.file(`${TEMPLATE_ROOT}/scripts/junit-enrich.ts`).exists()).toBe(true);
    expect(await Bun.file(`${TEMPLATE_ROOT}/scripts/build-summary.ts`).exists()).toBe(true);
    expect(await Bun.file(`${TEMPLATE_ROOT}/scripts/postpublish.ts`).exists()).toBe(true);
    expect(await Bun.file(`${TEMPLATE_ROOT}/files.md`).exists()).toBe(true);

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
      expect(manifest.exports).toEqual({ '.': './src/index.ts' });
      expect(validateFactoryLibraryManifest(manifest, 'scaffold')).toEqual([]);
      expect(await Bun.file(`${destination}/src/index.ts`).exists()).toBe(true);
      expect(await Bun.file(`${destination}/test/index.test.ts`).exists()).toBe(true);

      const coverage = Bun.spawn(
        bunSpawnArgs(['test', '--coverage', './test/index.test.ts']),
        { cwd: destination, env: { ...Bun.env }, stdout: 'pipe', stderr: 'pipe' }
      );
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
      ]) delete localEnvironment[key];

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
      const context = await Bun.file(`${destination}/reports/junit-context.json`).json() as Record<string, unknown>;
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

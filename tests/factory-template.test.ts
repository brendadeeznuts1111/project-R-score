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
  junitContextPath,
  readJunitContext,
  repositoryFromRemote,
} from '../.bun-create/factory-library/scripts/junit-context.ts';
import { projectFiles } from '../.bun-create/factory-library/scripts/files-index.ts';

const TEMPLATE_ROOT = `${import.meta.dir}/../.bun-create/factory-library`;

describe('factory-library template contract', () => {
  test('uses the isolated global store and parent-death protection', async () => {
    const config = Bun.TOML.parse(await Bun.file(`${TEMPLATE_ROOT}/bunfig.toml`).text()) as {
      install?: { linker?: string; globalStore?: boolean };
      run?: { noOrphans?: boolean };
      console?: { depth?: number };
      serve?: unknown;
    };
    expect(config.install).toEqual({
      linker: 'isolated',
      globalStore: true,
    });
    expect(config.serve).toBeUndefined();
    expect(config.run?.noOrphans).toBe(true);
    expect(config.console?.depth).toBe(4);
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
        Bun.write(`${directory}/.DS_Store`, 'macOS metadata\n'),
        Bun.write(`${directory}/docs/.DS_Store`, 'nested macOS metadata\n'),
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
      'scripts/files-index.ts',
      'scripts/generate-files-md.ts',
      'scripts/junit-context.ts',
      'scripts/junit-enrich.ts',
      'scripts/template-contract.ts',
      'src/index.ts',
      'test/index.test.ts',
      'test/terminal-types.test-d.ts',
      'scripts/validate-files-md.ts',
    ];
    for (const file of files) {
      const text = await Bun.file(`${TEMPLATE_ROOT}/${file}`).text();
      expect(text).not.toContain('{{');
    }

    const packageJson = await Bun.file(`${TEMPLATE_ROOT}/package.json`).json();
    expect(packageJson.name).toBe('{{name}}');
  });

  test('publishes only the Bun-native source entry without template lifecycle hooks', async () => {
    const packageJson = await Bun.file(`${TEMPLATE_ROOT}/package.json`).json();
    expect(packageJson.exports['.']).toBe('./src/index.ts');
    expect(packageJson.types).toBe('./src/index.ts');
    expect(packageJson.files).toEqual(['src', 'README.md']);
    expect(packageJson.packageManager).toBe('bun@1.3.14');
    expect(packageJson['bun-create']).toBeUndefined();
    expect(packageJson.scripts.postpublish).toBeUndefined();
    expect(packageJson.publishConfig).toEqual({ access: 'public', tag: 'latest' });

    expect(await Bun.file(`${TEMPLATE_ROOT}/plugin.example.ts`).exists()).toBe(false);
    expect(await Bun.file(`${TEMPLATE_ROOT}/.gitignore`).exists()).toBe(true);
    expect(await Bun.file(`${TEMPLATE_ROOT}/.prettierignore`).exists()).toBe(false);
    expect(await Bun.file(`${TEMPLATE_ROOT}/scripts/run-test-junit.ts`).exists()).toBe(true);
    expect(await Bun.file(`${TEMPLATE_ROOT}/scripts/junit-context.ts`).exists()).toBe(true);
    expect(await Bun.file(`${TEMPLATE_ROOT}/scripts/junit-enrich.ts`).exists()).toBe(true);
    expect(await Bun.file(`${TEMPLATE_ROOT}/scripts/build-summary.ts`).exists()).toBe(true);
    expect(await Bun.file(`${TEMPLATE_ROOT}/scripts/postpublish.ts`).exists()).toBe(false);
    expect(await Bun.file(`${TEMPLATE_ROOT}/scripts/color-test.ts`).exists()).toBe(true);
    expect(await Bun.file(`${TEMPLATE_ROOT}/files.md`).exists()).toBe(true);
    expect(await Bun.file(`${TEMPLATE_ROOT}/eslint.config.mjs`).exists()).toBe(true);

    const filesIndex = await Bun.file(`${TEMPLATE_ROOT}/files.md`).text();
    expect(filesIndex).toContain('## Publish allowlist');
    expect(filesIndex).toContain('scripts/generate-files-md.ts');

    const readme = await Bun.file(`${TEMPLATE_ROOT}/README.md`).text();
    expect(readme).toContain('NPM_CONFIG_TOKEN');
    expect(readme).toContain('GITHUB_REF_NAME');
    expect(readme).toContain('JUnit context classification');
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
    expect(gitignore).toContain('.DS_Store');

    const tsconfig = await Bun.file(`${TEMPLATE_ROOT}/tsconfig.json`).json();
    expect(tsconfig.compilerOptions.noEmit).toBe(true);
    expect(tsconfig.compilerOptions.types).toEqual(['bun']);
    expect(tsconfig.compilerOptions.moduleDetection).toBe('force');
    expect(tsconfig.compilerOptions.noUncheckedIndexedAccess).toBe(true);

    const prettierConfig = await Bun.file(`${TEMPLATE_ROOT}/.prettierrc`).json();
    expect(prettierConfig).toEqual({
      singleQuote: true,
      printWidth: 100,
      arrowParens: 'avoid',
    });
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

  test('groups package properties, environment, and flags in a stable contract snapshot', async () => {
    const packageJson = await Bun.file(`${TEMPLATE_ROOT}/package.json`).json();
    expect(validateFactoryLibraryManifest(packageJson)).toEqual([]);
    expect(FACTORY_LIBRARY_CONTRACT_GROUPS.map(group => group.id)).toEqual([
      'identity',
      'runtime',
      'quality',
      'reporting',
      'publish',
      'files',
      'environment',
      'flags',
    ]);
    expect(factoryLibraryContractSnapshot(packageJson)).toMatchSnapshot();
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
      expect(await Bun.file(`${destination}/stale.txt`).exists()).toBe(false);
      expect(await Bun.file(`${destination}/node_modules`).exists()).toBe(false);
      expect(await Bun.file(`${destination}/.git`).exists()).toBe(false);

      const manifest = (await Bun.file(`${destination}/package.json`).json()) as Record<
        string,
        unknown
      >;
      expect(manifest.name).toBe(destination.slice(destination.lastIndexOf('/') + 1));
      expect(manifest.exports).toEqual({ '.': './src/index.ts' });
      expect(validateFactoryLibraryManifest(manifest)).toEqual([]);
      expect(await Bun.file(`${destination}/src/index.ts`).exists()).toBe(true);
      expect(await Bun.file(`${destination}/test/index.test.ts`).exists()).toBe(true);

      const build = Bun.spawn(bunSpawnArgs(['run', 'build:metafile']), {
        cwd: destination,
        env: { ...Bun.env },
        stdout: 'pipe',
        stderr: 'pipe',
      });
      const [buildCode, buildOut, buildErr] = await Promise.all([
        build.exited,
        new Response(build.stdout).text(),
        new Response(build.stderr).text(),
      ]);
      expect(buildCode, `${buildOut}\n${buildErr}`).toBe(0);
      const summaryLine = buildOut
        .split('\n')
        .find(line => line.startsWith('{"kind":"build-summary"'));
      expect(summaryLine).toBeString();
      expect(JSON.parse(summaryLine!)).toEqual({
        kind: 'build-summary',
        entry_points: 1,
        input_files: 1,
        output_files: 1,
        output_bytes: expect.any(Number),
      });
      expect(await Bun.file(`${destination}/dist/metafile.json`).exists()).toBe(true);
      expect(await Bun.file(`${destination}/dist/metafile.md`).exists()).toBe(true);

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
      ]) {
        delete localEnvironment[key];
      }

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

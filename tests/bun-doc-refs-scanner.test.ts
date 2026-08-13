// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
// @see https://bun.com/docs/runtime/utils#bun-stringwidth — Bun.stringWidth
// @see https://bun.com/docs/runtime/shell#getting-started — Bun.$
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/test/index#run-tests — bun:test
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/bundler/executables#runtime-arguments-via-bun-options — --cpu-prof-md
import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  CANONICAL_REFS,
  collectCodeApiUsageDetails,
  collectCodeApiUsages,
  findMissing,
  sourceFiles,
} from '../tools/bun-doc-refs.ts';

const temporaryDirectories: string[] = [];

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'bun-doc-refs-'));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map(directory =>
      rm(directory, { recursive: true, force: true })
    )
  );
});

describe('bun-doc-refs syntax-aware scanner', () => {
  test('excludes comments and template-string examples from executable usage', () => {
    const usages = collectCodeApiUsages(
      `
// Bun.gc();
const example = \`Bun.JSONL.parse("{}")\`;
const markdown = \`
  Bun.semver.satisfies("1.0.0", ">=1");
\`;
await Bun.file("package.json").text();
`,
      'fixture.ts'
    );

    expect([...usages].sort()).toEqual(['Bun.file']);
  });

  test('maps static, aliased, namespace, and dynamic imports to canonical APIs', () => {
    const usages = collectCodeApiUsages(
      `
import { randomUUIDv7 as uuid, stringWidth, $ as shell } from "bun";
import * as BunRuntime from "bun";
const { Glob: NativeGlob } = await import("bun");
BunRuntime.inspect({ ok: true });
void uuid; void stringWidth; void shell; void NativeGlob;
`,
      'fixture.ts'
    );

    expect(usages).toEqual(
      new Set(['Bun.randomUUIDv7', 'Bun.stringWidth', 'Bun.$', 'Bun.Glob', 'Bun.inspect'])
    );
  });

  test('uses the most-specific canonical member in a nested Bun chain', () => {
    const usages = collectCodeApiUsages('Bun.inspect.table([{ ok: true }]);', 'fixture.ts');
    expect(usages).toEqual(new Set(['Bun.inspect.table']));
  });

  test('does not treat declarations or object property names as API usage', () => {
    const usages = collectCodeApiUsages(
      'type Server = { TLSOptions: string }; const refs = { SocialMetadata: "docs" };',
      'fixture.ts'
    );
    expect(usages).toEqual(new Set());
  });

  test('uses symbol binding to reject shadowed Bun and PascalCase locals', () => {
    const usages = collectCodeApiUsages(
      `
const Server = { start() {} };
function local(Bun: { file(path: string): unknown }) {
  Bun.file("not-the-runtime");
  return Server.start();
}
function loader(require: (name: string) => { file(path: string): unknown }) {
  return require("bun").file("not-the-runtime");
}
Bun.write("out.txt", "runtime");
`,
      'fixture.ts'
    );

    expect(usages).toEqual(new Set(['Bun.write']));
  });

  test('covers type positions, globalThis, namespace aliases, require, and dynamic modules', () => {
    const usages = collectCodeApiUsages(
      `
type RuntimeServer = Bun.Server;
type RuntimeCookies = import("bun").CookieMap;
globalThis.Bun.write("out.txt", "ok");
const runtime = require("bun");
runtime.file("package.json");
const alias = Bun;
const { Glob: RuntimeGlob } = alias;
const sqlite = await import("bun:sqlite");
void RuntimeGlob; void sqlite;
`,
      'fixture.ts'
    );

    expect(usages).toEqual(
      new Set(['Server', 'Bun.CookieMap', 'Bun.write', 'Bun.file', 'Bun.Glob', 'bun:sqlite'])
    );
  });

  test('reports stable one-based source locations for every occurrence', () => {
    expect(
      collectCodeApiUsageDetails(
        'Bun.file("a");\n  Bun.file("b");\nBun.write("c", "d");\n',
        'fixture.ts'
      )
    ).toEqual([
      { api: 'Bun.file', line: 1, column: 1 },
      { api: 'Bun.file', line: 2, column: 3 },
      { api: 'Bun.write', line: 3, column: 1 },
    ]);
  });

  test('does not treat a longer CLI flag as usage of its prefix', () => {
    expect(collectCodeApiUsages('const flag = "--cpu-prof-md";', 'fixture.ts')).toEqual(
      new Set(['--cpu-prof-md'])
    );
  });

  test('does not let a Bun.file anchor cover Bun.write', async () => {
    const directory = await temporaryDirectory();
    const file = join(directory, 'specific.ts');
    await Bun.write(
      file,
      `// @see ${CANONICAL_REFS['Bun.file']} — Bun.file\nawait Bun.write("out.txt", "ok");\n`
    );

    expect(await findMissing([file])).toEqual([
      {
        file,
        api: 'Bun.write',
        url: CANONICAL_REFS['Bun.write'],
        line: 2,
        column: 7,
        occurrences: 1,
      },
    ]);

    await Bun.write(
      file,
      `// @see ${CANONICAL_REFS['Bun.write']} — Bun.write\nawait Bun.write("out.txt", "ok");\n`
    );
    expect(await findMissing([file])).toEqual([]);
  });

  test('accepts a page-level reference only when its @see line labels that API', async () => {
    const directory = await temporaryDirectory();
    const file = join(directory, 'labelled.ts');
    await Bun.write(
      file,
      '// @see https://bun.com/docs/runtime/file-io — Bun.write\nawait Bun.write("out", "ok");\n'
    );
    expect(await findMissing([file])).toEqual([]);
  });

  test('fails closed for missing and unsupported explicit targets', async () => {
    const directory = await temporaryDirectory();
    await expect(findMissing([join(directory, 'missing.ts')])).rejects.toThrow(
      'scan target does not exist or is unreadable'
    );
    const markdown = join(directory, 'README.md');
    await Bun.write(markdown, '# docs\n');
    await expect(findMissing([markdown])).rejects.toThrow('unsupported scan target');

    const empty = join(directory, 'empty');
    await Bun.write(join(empty, 'README.md'), '# no source\n');
    await expect(findMissing([empty])).rejects.toThrow('contains no supported source files');
  });

  test('fails closed on malformed source instead of scanning a recovered tree', async () => {
    const directory = await temporaryDirectory();
    const file = join(directory, 'malformed.ts');
    await Bun.write(file, 'Bun.file("package.json";\n');

    await expect(findMissing([file])).rejects.toThrow(`syntax error in ${file}:1:`);
  });

  test('CLI exits nonzero with a bounded error for a missing explicit target', async () => {
    const directory = await temporaryDirectory();
    const missing = join(directory, 'missing.ts');
    const proc = Bun.spawn(
      [process.execPath, 'tools/bun-doc-refs.ts', 'check', missing],
      { cwd: import.meta.dir + '/..', stdout: 'pipe', stderr: 'pipe' }
    );
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    expect(exitCode).toBe(1);
    expect(stdout).toBe('');
    expect(stderr).toContain(`scan target does not exist or is unreadable: ${missing}`);
    expect(stderr).not.toContain('at sourceFiles');
  });

  test('check --json emits machine-readable locations and preserves failure status', async () => {
    const directory = await temporaryDirectory();
    const file = join(directory, 'missing-ref.ts');
    await Bun.write(file, 'Bun.file("a");\nBun.file("b");\n');
    const proc = Bun.spawn(
      [process.execPath, 'tools/bun-doc-refs.ts', 'check', '--json', file],
      { cwd: import.meta.dir + '/..', stdout: 'pipe', stderr: 'pipe' }
    );
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);

    expect(exitCode).toBe(1);
    expect(stderr).toBe('');
    expect(JSON.parse(stdout)).toEqual({
      schemaVersion: 1,
      command: 'check',
      ok: false,
      count: 1,
      filesWithMissingRefs: 1,
      missing: [
        {
          file,
          api: 'Bun.file',
          url: CANONICAL_REFS['Bun.file'],
          line: 1,
          column: 1,
          occurrences: 2,
        },
      ],
    });
  });

  test('check --json keeps target and syntax failures machine-readable', async () => {
    const directory = await temporaryDirectory();
    const missing = join(directory, 'missing.ts');
    const proc = Bun.spawn(
      [process.execPath, 'tools/bun-doc-refs.ts', 'check', '--json', missing],
      { cwd: import.meta.dir + '/..', stdout: 'pipe', stderr: 'pipe' }
    );
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);

    expect(exitCode).toBe(1);
    expect(stderr).toBe('');
    expect(JSON.parse(stdout)).toEqual({
      schemaVersion: 1,
      command: 'check',
      ok: false,
      error: { message: `scan target does not exist or is unreadable: ${missing}` },
    });
  });

  test('discovers every supported JavaScript and TypeScript source extension', async () => {
    const directory = await temporaryDirectory();
    const names = ['a.ts', 'b.tsx', 'c.mts', 'd.cts', 'e.js', 'f.jsx', 'g.mjs', 'h.cjs'];
    await Promise.all(names.map(name => Bun.write(join(directory, name), 'export {};\n')));
    await Bun.write(join(directory, 'ignored.md'), '# ignored\n');

    expect((await sourceFiles([directory])).map(file => file.split('/').at(-1))).toEqual(names);

    const javascript = join(directory, 'e.js');
    await Bun.write(javascript, 'await Bun.file("package.json").text();\n');
    expect(await findMissing([javascript])).toEqual([
      {
        file: javascript,
        api: 'Bun.file',
        url: CANONICAL_REFS['Bun.file'],
        line: 1,
        column: 7,
        occurrences: 1,
      },
    ]);
  });

  test('directory scans skip dependency and generated trees', async () => {
    const directory = await temporaryDirectory();
    const source = join(directory, 'src', 'index.ts');
    const dependency = join(directory, 'node_modules', 'pkg', 'index.ts');
    const generated = join(directory, 'dist', 'index.js');
    await Promise.all([
      Bun.write(source, 'export {};\n'),
      Bun.write(dependency, 'Bun.file("dependency");\n'),
      Bun.write(generated, 'Bun.write("generated", "output");\n'),
    ]);

    expect(await sourceFiles([directory])).toEqual([source]);
    expect(await sourceFiles([directory, source])).toEqual([source]);
  });
});

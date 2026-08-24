// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
// @see https://bun.com/docs/runtime/utils#bun-stringwidth — Bun.stringWidth
// @see https://bun.com/docs/runtime/shell#getting-started — Bun.$
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/test/index#run-tests — bun:test
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/project/benchmarking#markdown-output — --cpu-prof-md
// @see https://bun.com/blog/bun-v1.4#cpu-prof-md — shipped Bun 1.4.0
import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  CANONICAL_REFS,
  classifyReferenceBacklog,
  collectCodeApiUsageDetails,
  collectCodeApiUsages,
  buildApiReleaseProvenance,
  findSyntaxErrors,
  findMissing,
  sourceFiles,
  type MissingRef,
} from '../tools/bun-doc-refs.ts';

const temporaryDirectories: string[] = [];

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'bun-doc-refs-'));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map(directory => rm(directory, { recursive: true, force: true }))
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

  test('ignores array-binding holes when a Bun namespace expression is destructured', () => {
    expect(collectCodeApiUsages('const [, second] = Bun; void second;', 'fixture.ts')).toEqual(
      new Set()
    );
  });

  test('uses the most-specific canonical member in a nested Bun chain', () => {
    const usages = collectCodeApiUsages('Bun.inspect.table([{ ok: true }]);', 'fixture.ts');
    expect(usages).toEqual(new Set(['Bun.inspect.table']));
  });

  test('grounds YAML serialization at its official function reference', () => {
    expect(
      collectCodeApiUsages('Bun.YAML.stringify({ ok: true }, null, 2);', 'fixture.ts')
    ).toEqual(new Set(['Bun.YAML.stringify']));
    expect(CANONICAL_REFS['Bun.YAML.stringify']).toBe(
      'https://bun.com/reference/bun/YAML/stringify'
    );
  });

  test('uses the exact Bun.Image operation instead of the page-level constructor', async () => {
    const usages = collectCodeApiUsages(
      'await new Bun.Image(bytes).resize(32, 32).webp().bytes();',
      'fixture.ts'
    );
    expect(usages).toEqual(
      new Set(['Bun.Image', 'Bun.Image.resize', 'Bun.Image.webp', 'Bun.Image.bytes'])
    );

    const directory = await temporaryDirectory();
    const file = join(directory, 'image.ts');
    await Bun.write(
      file,
      `// @see ${CANONICAL_REFS['Bun.Image']} — Bun.Image\nawait new Bun.Image(bytes).resize(32, 32);\n`
    );
    expect(await findMissing([file])).toMatchObject([
      {
        api: 'Bun.Image.resize',
        url: CANONICAL_REFS['Bun.Image.resize'],
        line: 2,
      },
    ]);
  });

  test('tracks Bun.Image properties and explicitly typed bindings', () => {
    const usages = collectCodeApiUsages(
      `
let image: Bun.Image;
image = new Bun.Image(bytes);
await image.toBuffer();
void image.width;
void image["height"];

class Holder {
  image!: Bun.Image;
  dimensions() {
    return [this.image.width, this.image.height];
  }
}
`,
      'fixture.ts'
    );

    expect(usages).toEqual(
      new Set(['Bun.Image', 'Bun.Image.toBuffer', 'Bun.Image.width', 'Bun.Image.height'])
    );
  });

  test('does not rebind terminal results as Bun.Image pipelines', () => {
    const usages = collectCodeApiUsages(
      `
const metadata = await new Bun.Image(bytes).metadata();
void metadata.width;
const encoded = await new Bun.Image(bytes).webp().bytes();
void encoded.length;
`,
      'fixture.ts'
    );

    expect(usages).toEqual(
      new Set(['Bun.Image', 'Bun.Image.metadata', 'Bun.Image.webp', 'Bun.Image.bytes'])
    );
  });

  test('tracks Image aliases, Blob.image starts, and computed image members', () => {
    const usages = collectCodeApiUsages(
      `
import { Image as Picture } from "bun";
import type { BunFile as NativeFile } from "bun";
const aliased = new Picture(bytes).resize(1).png();
const { Image: Other } = Bun;
const destructured = new Other(bytes)["resize"](2)["webp"]();
const blob: Blob = new Blob([bytes]);
const fromBinding = blob.image().resize(3).bytes();
const fromConstructor = new Blob([bytes]).image()["resize"](4)["png"]().bytes();
function fromTypedFile(file: NativeFile) { return file.image()["metadata"](); }
class Holder {
  file = Bun.file("fixture.png");
  image = new Picture(bytes);
  read() { return [this.file.image().metadata(), this.image.width]; }
}
let assignedFile;
assignedFile = Bun.file("fixture.png");
assignedFile.image().metadata();
void aliased; void destructured; void fromBinding; void fromConstructor; void fromTypedFile; void Holder;
`,
      'fixture.ts'
    );

    expect(usages).toEqual(
      new Set([
        'Bun.Image',
        'Bun.Image.resize',
        'Bun.Image.png',
        'Bun.Image.webp',
        'Bun.Image.bytes',
        'Bun.Image.metadata',
        'Bun.Image.width',
        'Blob.image',
        'Bun.file',
      ])
    );
  });

  test('rejects shadowed Blob constructors and unrelated image methods', () => {
    const usages = collectCodeApiUsages(
      `
class Blob { image() { return { resize() {} }; } }
new Blob().image().resize();
const canvas = { image() { return { png() {} }; } };
canvas.image().png();
`,
      'fixture.ts'
    );

    expect(usages).toEqual(new Set());
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

  test('does not attribute external process flags to the Bun CLI', () => {
    const usages = collectCodeApiUsages(
      `Bun.spawn(["git", "rev-parse", "--verify"]); Bun.spawn(["bun", "--cpu-prof"]);`,
      'fixture.ts'
    );
    expect(usages).not.toContain('--verify');
    expect(usages).toContain('--cpu-prof');
  });

  test('does not let a Bun.file anchor cover Bun.write', async () => {
    const directory = await temporaryDirectory();
    const file = join(directory, 'specific.ts');
    await Bun.write(
      file,
      `// @see ${CANONICAL_REFS['Bun.file']} — Bun.file\nawait Bun.write("out.txt", "ok");\n`
    );

    expect(await findMissing([file])).toMatchObject([
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

  test('aggregates syntax failures across the requested source tree', async () => {
    const directory = await temporaryDirectory();
    await Bun.write(join(directory, 'valid.ts'), 'Bun.file("package.json");\n');
    await Bun.write(join(directory, 'broken-a.ts'), 'Bun.file("a";\n');
    await Bun.write(join(directory, 'broken-b.tsx'), 'export const View = () => <div>;\n');

    const findings = await findSyntaxErrors([directory]);

    expect(findings).toHaveLength(2);
    expect(findings.map(finding => finding.file)).toEqual([
      join(directory, 'broken-a.ts'),
      join(directory, 'broken-b.tsx'),
    ]);
    expect(findings.every(finding => finding.line === 1 && finding.column > 0)).toBe(true);
  });

  test('CLI exits nonzero with a bounded error for a missing explicit target', async () => {
    const directory = await temporaryDirectory();
    const missing = join(directory, 'missing.ts');
    const proc = Bun.spawn([process.execPath, 'tools/bun-doc-refs.ts', 'check', missing], {
      cwd: import.meta.dir + '/..',
      stdout: 'pipe',
      stderr: 'pipe',
    });
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
    const proc = Bun.spawn([process.execPath, 'tools/bun-doc-refs.ts', 'check', '--json', file], {
      cwd: import.meta.dir + '/..',
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);

    expect(exitCode).toBe(1);
    expect(stderr).toBe('');
    expect(JSON.parse(stdout)).toMatchObject({
      schemaVersion: 2,
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
      schemaVersion: 2,
      command: 'check',
      ok: false,
      error: { message: `scan target does not exist or is unreadable: ${missing}` },
    });
  });

  test('classifies only exact official Bun canonical references as safe', () => {
    const provenance: MissingRef['provenance'] = {
      status: 'release-unknown',
      docsReference: CANONICAL_REFS['Bun.file'],
      release: null,
      updates: [],
      catalogVerification: { version: null, date: null, reference: CANONICAL_REFS['Bun.file'] },
    };
    const findings: MissingRef[] = [
      {
        file: '/repo/projects/active/development/geelark/src/cli.ts',
        api: '--parallel',
        url: CANONICAL_REFS['--parallel'],
        line: 1,
        column: 1,
        occurrences: 1,
        provenance,
      },
      {
        file: '/repo/projects/active/development/geelark/src/file.ts',
        api: 'Bun.file',
        url: CANONICAL_REFS['Bun.file'],
        line: 1,
        column: 1,
        occurrences: 2,
        provenance,
      },
      {
        file: '/repo/projects/active/development/geelark/src/url-pattern.ts',
        api: 'URLPattern MDN',
        url: CANONICAL_REFS['URLPattern MDN'],
        line: 1,
        column: 1,
        occurrences: 1,
        provenance,
      },
    ];

    expect(classifyReferenceBacklog(findings)).toMatchObject([
      {
        api: '--parallel',
        project: 'development/geelark',
        disposition: 'manual',
        reason: 'ambiguous-cli-flag-requires-context',
      },
      {
        api: 'Bun.file',
        project: 'development/geelark',
        disposition: 'safe-exact-official',
        reason: 'exact-official-canonical-reference',
      },
      {
        api: 'URLPattern MDN',
        project: 'development/geelark',
        disposition: 'manual',
        reason: 'canonical-reference-is-not-official-bun',
      },
    ]);
  });

  test('backlog JSON is a deterministic dry-run with grouped bounded selection', async () => {
    const directory = await temporaryDirectory();
    const fileUse = join(directory, 'file.ts');
    const flagUse = join(directory, 'flag.ts');
    const writeUse = join(directory, 'write.ts');
    await Bun.write(fileUse, 'await Bun.file("package.json").text();\n');
    await Bun.write(flagUse, 'const option = "--parallel";\n');
    await Bun.write(writeUse, 'await Bun.write("out.txt", "ok");\n');
    const before = await Promise.all([
      Bun.file(fileUse).text(),
      Bun.file(flagUse).text(),
      Bun.file(writeUse).text(),
    ]);
    const proc = Bun.spawn(
      [process.execPath, 'tools/bun-doc-refs.ts', 'backlog', '--json', '--limit=1', directory],
      { cwd: import.meta.dir + '/..', stdout: 'pipe', stderr: 'pipe' }
    );
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);

    expect(exitCode).toBe(0);
    expect(stderr).toBe('');
    expect(JSON.parse(stdout)).toMatchObject({
      schemaVersion: 1,
      command: 'backlog',
      ok: true,
      dryRun: true,
      summary: { total: 3, safe: 2, manual: 1, selected: 1, filesChanged: 0, remaining: 3 },
      groups: {
        byProject: [{ key: 'unscoped', total: 3, safe: 2, manual: 1 }],
        byApi: [
          { key: '--parallel', total: 1, safe: 0, manual: 1 },
          { key: 'Bun.file', total: 1, safe: 1, manual: 0 },
          { key: 'Bun.write', total: 1, safe: 1, manual: 0 },
        ],
      },
      selected: [{ api: 'Bun.file', file: fileUse }],
      manual: [{ api: '--parallel', file: flagUse }],
    });
    expect(
      await Promise.all([
        Bun.file(fileUse).text(),
        Bun.file(flagUse).text(),
        Bun.file(writeUse).text(),
      ])
    ).toEqual(before);
  });

  test('backlog write requires an explicit bounded target and writes only that batch', async () => {
    const directory = await temporaryDirectory();
    const fileUse = join(directory, 'file.ts');
    const flagUse = join(directory, 'flag.ts');
    const writeUse = join(directory, 'write.ts');
    await Bun.write(fileUse, 'await Bun.file("package.json").text();\n');
    await Bun.write(flagUse, 'const option = "--parallel";\n');
    await Bun.write(writeUse, 'await Bun.write("out.txt", "ok");\n');

    const rejected = Bun.spawn(
      [process.execPath, 'tools/bun-doc-refs.ts', 'backlog', '--json', '--write', directory],
      { cwd: import.meta.dir + '/..', stdout: 'pipe', stderr: 'pipe' }
    );
    const rejectedOutput = JSON.parse(await new Response(rejected.stdout).text());
    expect(await rejected.exited).toBe(1);
    expect(rejectedOutput).toMatchObject({
      schemaVersion: 1,
      command: 'backlog',
      ok: false,
      error: { message: 'backlog --write requires --limit=N with N greater than zero' },
    });

    const oversized = Bun.spawn(
      [
        process.execPath,
        'tools/bun-doc-refs.ts',
        'backlog',
        '--json',
        '--write',
        '--limit=101',
        directory,
      ],
      { cwd: import.meta.dir + '/..', stdout: 'pipe', stderr: 'pipe' }
    );
    const oversizedOutput = JSON.parse(await new Response(oversized.stdout).text());
    expect(await oversized.exited).toBe(1);
    expect(oversizedOutput.error.message).toBe(
      'backlog --write limits batches to 100 references'
    );

    const applied = Bun.spawn(
      [
        process.execPath,
        'tools/bun-doc-refs.ts',
        'backlog',
        '--json',
        '--write',
        '--limit=1',
        directory,
      ],
      { cwd: import.meta.dir + '/..', stdout: 'pipe', stderr: 'pipe' }
    );
    const appliedOutput = JSON.parse(await new Response(applied.stdout).text());
    expect(await applied.exited).toBe(0);
    expect(appliedOutput).toMatchObject({
      dryRun: false,
      summary: { total: 3, safe: 2, manual: 1, selected: 1, filesChanged: 1, remaining: 2 },
      manual: [
        {
          api: '--parallel',
          file: flagUse,
          reason: 'ambiguous-cli-flag-requires-context',
        },
      ],
    });
    const written = await Bun.file(fileUse).text();
    expect(written).toStartWith(`// @see ${CANONICAL_REFS['Bun.file']} — Bun.file\n`);
    expect(written).not.toContain('// @released');
    expect(written).not.toContain('// @updated');
    expect(written).not.toContain('// @verified');
    expect(await Bun.file(flagUse).text()).toBe('const option = "--parallel";\n');
    expect(await Bun.file(writeUse).text()).toBe('await Bun.write("out.txt", "ok");\n');
  });

  test('backlog max is a non-mutating ratchet gate', async () => {
    const directory = await temporaryDirectory();
    await Bun.write(join(directory, 'file.ts'), 'Bun.file("package.json");\n');
    const proc = Bun.spawn(
      [process.execPath, 'tools/bun-doc-refs.ts', 'backlog', '--json', '--max=0', directory],
      { cwd: import.meta.dir + '/..', stdout: 'pipe', stderr: 'pipe' }
    );
    const output = JSON.parse(await new Response(proc.stdout).text());

    expect(await proc.exited).toBe(1);
    expect(output).toMatchObject({
      ok: false,
      dryRun: true,
      summary: { total: 1, remaining: 1 },
      ratchet: { max: 0, actual: 1, ok: false },
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
    expect(await findMissing([javascript])).toMatchObject([
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
    const bundled = join(directory, 'tools', 'generated.bundle.js');
    await Promise.all([
      Bun.write(source, 'export {};\n'),
      Bun.write(dependency, 'Bun.file("dependency");\n'),
      Bun.write(generated, 'Bun.write("generated", "output");\n'),
      Bun.write(bundled, 'Bun.write("bundled", "output");\n'),
    ]);

    expect(await sourceFiles([directory])).toEqual([source]);
    expect(await sourceFiles([directory, source])).toEqual([source]);
  });

  test('keeps release history distinct from catalog verification', () => {
    const unknown = buildApiReleaseProvenance('Bun.file', {
      name: 'Bun.file',
      type: 'api',
      stability: 'stable',
      canonicalPage: 'https://bun.com/docs/runtime/file-io',
      docsUrl: CANONICAL_REFS['Bun.file'],
      allPages: ['https://bun.com/docs/runtime/file-io'],
      verifiedOn: '1.3.14',
      lastUpdated: '2026-08-06T21:05:07.912Z',
    });
    expect(unknown.status).toBe('release-unknown');
    expect(unknown.release).toBeNull();
    expect(unknown.catalogVerification.version).toBe('1.3.14');

    const dated = buildApiReleaseProvenance('Bun.file', {
      name: 'Bun.file',
      type: 'api',
      stability: 'stable',
      canonicalPage: 'https://bun.com/docs/runtime/file-io',
      allPages: ['https://bun.com/docs/runtime/file-io'],
      releasedIn: '1.3.13',
      releasedAt: '2026-04-20T07:33:26.000Z',
      releasedUrl: 'https://bun.com/blog/bun-v1.3.13',
      changedIn: '1.3.14',
      changedAt: '2026-05-13T03:19:35.000Z',
      changedUrl: 'https://bun.com/blog/bun-v1.3.14',
    });
    expect(dated.status).toBe('complete');
    expect(dated.release?.date).toBe('2026-04-20T07:33:26.000Z');
    expect(dated.updates[0]?.reference).toBe('https://bun.com/blog/bun-v1.3.14');
  });

  test('history and provenance-check expose dated official evidence', async () => {
    const history = Bun.spawn(
      [process.execPath, 'tools/bun-doc-refs.ts', 'history', 'Bun.Terminal', '--json'],
      { cwd: import.meta.dir + '/..', stdout: 'pipe', stderr: 'pipe' }
    );
    const historyOutput = JSON.parse(await new Response(history.stdout).text());
    expect(await history.exited).toBe(0);
    expect(historyOutput).toMatchObject({
      command: 'history',
      api: 'Bun.Terminal',
      status: 'complete',
      release: {
        version: '1.3.5',
        date: '2025-12-17T10:11:00.000Z',
        reference: 'https://bun.com/blog/bun-v1.3.5',
      },
    });

    const markdownHistory = Bun.spawn(
      [process.execPath, 'tools/bun-doc-refs.ts', 'history', 'Bun.markdown', '--json'],
      { cwd: import.meta.dir + '/..', stdout: 'pipe', stderr: 'pipe' }
    );
    const markdownOutput = JSON.parse(await new Response(markdownHistory.stdout).text());
    expect(await markdownHistory.exited).toBe(0);
    expect(markdownOutput.release).toMatchObject({
      version: '1.3.8',
      section: 'Bun.markdown — Built-in Markdown Parser',
    });
    expect(markdownOutput.release.evidence).toContain('new Bun.markdown API');

    const csrfHistory = Bun.spawn(
      [process.execPath, 'tools/bun-doc-refs.ts', 'history', 'Bun.CSRF', '--json'],
      { cwd: import.meta.dir + '/..', stdout: 'pipe', stderr: 'pipe' }
    );
    const csrfOutput = JSON.parse(await new Response(csrfHistory.stdout).text());
    expect(await csrfHistory.exited).toBe(0);
    expect(csrfOutput.api).toBe('Bun.CSRF');
    expect(csrfOutput.release.version).toBe('1.2.5');
    expect(csrfOutput.updates).toEqual([
      expect.objectContaining({ type: 'changed', version: '1.3.0' }),
    ]);

    const check = Bun.spawn(
      [process.execPath, 'tools/bun-doc-refs.ts', 'provenance-check', '--json'],
      { cwd: import.meta.dir + '/..', stdout: 'pipe', stderr: 'pipe' }
    );
    const checkOutput = JSON.parse(await new Response(check.stdout).text());
    expect(await check.exited).toBe(0);
    expect(checkOutput.ok).toBe(true);
    expect(checkOutput.invalid).toEqual([]);
    expect(checkOutput.officialMismatches).toEqual([]);
    expect(checkOutput.recordedEvents).toBeGreaterThan(80);
  });

  test('annotate writes release and update evidence beside the canonical reference', async () => {
    const directory = await temporaryDirectory();
    const file = join(directory, 'terminal.ts');
    await Bun.write(file, 'const terminal = new Bun.Terminal({});\n');
    const proc = Bun.spawn(
      [process.execPath, 'tools/bun-doc-refs.ts', 'annotate', '--write', file],
      { cwd: import.meta.dir + '/..', stdout: 'pipe', stderr: 'pipe' }
    );
    await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    expect(await proc.exited).toBe(0);
    const annotated = await Bun.file(file).text();
    expect(annotated).toContain(`// @see ${CANONICAL_REFS['Bun.Terminal']} — Bun.Terminal`);
    expect(annotated).toContain(
      '// @released Bun.Terminal · released v1.3.5 · 2025-12-17 · https://bun.com/blog/bun-v1.3.5'
    );
    expect(annotated).toContain(
      '// @updated Bun.Terminal · changed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14'
    );
  });
});

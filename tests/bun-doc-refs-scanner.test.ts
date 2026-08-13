// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
// @see https://bun.com/docs/runtime/utils#bun-stringwidth — Bun.stringWidth
// @see https://bun.com/docs/runtime/shell#getting-started — Bun.$
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/test/index#run-tests — bun:test
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  CANONICAL_REFS,
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

  test('does not let a Bun.file anchor cover Bun.write', async () => {
    const directory = await temporaryDirectory();
    const file = join(directory, 'specific.ts');
    await Bun.write(
      file,
      `// @see ${CANONICAL_REFS['Bun.file']} — Bun.file\nawait Bun.write("out.txt", "ok");\n`
    );

    expect(await findMissing([file])).toEqual([
      { file, api: 'Bun.write', url: CANONICAL_REFS['Bun.write'] },
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

  test('discovers every supported JavaScript and TypeScript source extension', async () => {
    const directory = await temporaryDirectory();
    const names = ['a.ts', 'b.tsx', 'c.mts', 'd.cts', 'e.js', 'f.jsx', 'g.mjs', 'h.cjs'];
    await Promise.all(names.map(name => Bun.write(join(directory, name), 'export {};\n')));
    await Bun.write(join(directory, 'ignored.md'), '# ignored\n');

    expect((await sourceFiles([directory])).map(file => file.split('/').at(-1))).toEqual(names);

    const javascript = join(directory, 'e.js');
    await Bun.write(javascript, 'await Bun.file("package.json").text();\n');
    expect(await findMissing([javascript])).toEqual([
      { file: javascript, api: 'Bun.file', url: CANONICAL_REFS['Bun.file'] },
    ]);
  });
});

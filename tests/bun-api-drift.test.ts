// @see https://bun.com/docs/test/index#run-tests — bun:test
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write

import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  collectBunApiDriftOccurrences,
  runBunApiDriftCli,
  scanBunApiDrift,
} from '../tools/bun-api-drift.ts';

const temporaryDirectories: string[] = [];

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'bun-api-drift-'));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map(directory => rm(directory, { recursive: true, force: true }))
  );
});

describe('Bun runtime API drift scanner', () => {
  test('reports unavailable Bun members but accepts members on the running runtime', () => {
    const occurrences = collectBunApiDriftOccurrences(
      `
await Bun.file("fixture.txt").text();
await Bun.mkdir("output");
`,
      'fixture.ts'
    );

    expect(occurrences).toEqual([
      {
        surface: 'namespace',
        member: 'mkdir',
        file: 'fixture.ts',
        line: 3,
        column: 11,
      },
    ]);
  });

  test('ignores comments, strings, type positions, shadowed Bun, and bun submodules', () => {
    const occurrences = collectBunApiDriftOccurrences(
      `
// Bun.mkdir("comment");
const example = "Bun.mkdir('string')";
type FileFactory = typeof Bun.file;
function local(Bun: { mkdir(path: string): void }) { Bun.mkdir("local"); }
import { Database } from "bun:sqlite";
new Database();
`,
      'fixture.ts'
    );

    expect(occurrences).toEqual([]);
  });

  test('checks named bun value imports against runtime exports', () => {
    const occurrences = collectBunApiDriftOccurrences(
      `
import { file, missing as unavailable, type Server } from "bun";
import { BunFile as LegacyBunFile } from "bun";
import type { BunFile } from "bun";
type LegacyTypeImport = LegacyBunFile | BunFile;
await file("fixture.txt").text();
unavailable();
`,
      'fixture.ts',
      {},
      { file: () => undefined }
    );

    expect(occurrences).toEqual([
      {
        surface: 'module-export',
        member: 'missing',
        file: 'fixture.ts',
        line: 2,
        column: 16,
      },
    ]);
  });

  test('uses the installed bun module export shape by default', () => {
    const occurrences = collectBunApiDriftOccurrences(
      `
import { file, watch } from "bun";
await file("fixture.txt").text();
watch("fixture.txt", () => {});
`,
      'fixture.ts'
    );

    expect(occurrences).toEqual([
      {
        surface: 'module-export',
        member: 'watch',
        file: 'fixture.ts',
        line: 2,
        column: 16,
      },
    ]);
  });

  test('checks nested static namespace shapes against the running runtime', () => {
    const occurrences = collectBunApiDriftOccurrences(
      `
Bun.stable.ok();
Bun.stable.missing();
globalThis.Bun.stable["alsoMissing"]();
`,
      'fixture.ts',
      { stable: { ok: () => undefined } }
    );

    expect(occurrences).toEqual([
      {
        surface: 'namespace',
        member: 'stable.missing',
        file: expect.stringContaining('fixture.ts'),
        line: 3,
        column: 12,
      },
      {
        surface: 'namespace',
        member: 'stable.alsoMissing',
        file: expect.stringContaining('fixture.ts'),
        line: 4,
        column: 23,
      },
    ]);
  });

  test('does not let type assertions hide runtime namespace drift', () => {
    const occurrences = collectBunApiDriftOccurrences(
      `
(Bun as any).missing();
((globalThis.Bun as unknown) as { absent(): void }).absent();
`,
      'fixture.ts',
      {}
    );

    expect(occurrences).toEqual([
      {
        surface: 'namespace',
        member: 'missing',
        file: 'fixture.ts',
        line: 2,
        column: 14,
      },
      {
        surface: 'namespace',
        member: 'absent',
        file: 'fixture.ts',
        line: 3,
        column: 53,
      },
    ]);
  });

  test('does not let ambient declarations hide the global runtime', () => {
    const occurrences = collectBunApiDriftOccurrences(
      `
declare const Bun: { missing(): void };
Bun.missing();
`,
      'fixture.ts',
      {}
    );

    expect(occurrences).toEqual([
      {
        surface: 'namespace',
        member: 'missing',
        file: 'fixture.ts',
        line: 3,
        column: 5,
      },
    ]);
  });

  test('accepts methods on primitive Bun values and arbitrary Bun.env keys', () => {
    expect(
      collectBunApiDriftOccurrences(
        `
Bun.version.startsWith("1.");
Bun.env.APP_PRIVATE_KEY?.trim();
`,
        'fixture.ts',
        { version: '1.2.3', env: {} }
      )
    ).toEqual([]);
  });

  test('groups findings deterministically and applies the occurrence ratchet', async () => {
    const directory = await temporaryDirectory();
    const first = join(directory, 'a.ts');
    const second = join(directory, 'b.ts');
    await Bun.write(first, 'Bun.mkdir("a");\nBun.mkdir("b");\n');
    await Bun.write(second, 'Bun.file("valid");\n');

    const report = await scanBunApiDrift([directory]);
    expect(report).toMatchObject({
      scannedFileCount: 2,
      occurrenceCount: 2,
      findingCount: 1,
      affectedFileCount: 1,
      findings: [{ member: 'mkdir', occurrences: 2, line: 1 }],
    });
    expect(await runBunApiDriftCli(['--max=2', directory])).toBe(0);
    expect(await runBunApiDriftCli(['--max=1', '--json', directory])).toBe(1);
  });
});

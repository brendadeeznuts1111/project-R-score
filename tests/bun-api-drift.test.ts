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
      { member: 'mkdir', file: expect.stringContaining('fixture.ts'), line: 3, column: 11 },
    ]);
  });

  test('ignores comments, strings, type positions, shadowed Bun, and bun module APIs', () => {
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
        member: 'stable.missing',
        file: expect.stringContaining('fixture.ts'),
        line: 3,
        column: 12,
      },
      {
        member: 'stable.alsoMissing',
        file: expect.stringContaining('fixture.ts'),
        line: 4,
        column: 23,
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

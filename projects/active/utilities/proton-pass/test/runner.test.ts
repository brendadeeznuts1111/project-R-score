import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import { mkdir, writeFile, rmdir } from 'node:fs/promises';
import { join } from 'node:path';
import { runJson, runRaw, ProtonPassCliError } from '../src/client.ts';

async function createFakeCli(dir: string, script: string): Promise<string> {
  await mkdir(dir, { recursive: true });
  const path = join(dir, 'pass-cli');
  await writeFile(path, script, { mode: 0o755 });
  return path;
}

describe('client runner', () => {
  const tmpDir = join(import.meta.dir, '.tmp-runner-test');
  const previousPat = Bun.env.PROTON_PASS_PERSONAL_ACCESS_TOKEN;
  const previousPath = Bun.env.PROTON_PASS_CLI_PATH;

  beforeEach(async () => {
    Bun.env.PROTON_PASS_PERSONAL_ACCESS_TOKEN = 'pst_test_token';
    await mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    if (previousPat !== undefined) {
      Bun.env.PROTON_PASS_PERSONAL_ACCESS_TOKEN = previousPat;
    } else {
      delete Bun.env.PROTON_PASS_PERSONAL_ACCESS_TOKEN;
    }

    if (previousPath !== undefined) {
      Bun.env.PROTON_PASS_CLI_PATH = previousPath;
    } else {
      delete Bun.env.PROTON_PASS_CLI_PATH;
    }

    await rmdir(tmpDir).catch(() => {});
  });

  it('runJson parses JSON stdout', async () => {
    const fakeCli = await createFakeCli(
      tmpDir,
      '#!/usr/bin/env bun\nconsole.log(JSON.stringify({ id: "vault-1", name: "Test" }));'
    );
    Bun.env.PROTON_PASS_CLI_PATH = fakeCli;
    const result = await runJson<Record<string, unknown>>(['vault', 'list']);
    expect(result).toEqual({ id: 'vault-1', name: 'Test' });
  });

  it('runRaw returns trimmed stdout', async () => {
    const fakeCli = await createFakeCli(
      tmpDir,
      '#!/usr/bin/env bun\nconsole.log("ok result");'
    );
    Bun.env.PROTON_PASS_CLI_PATH = fakeCli;
    const result = await runRaw(['status']);
    expect(result).toBe('ok result');
  });

  it('throws ProtonPassCliError on non-zero exit', async () => {
    const fakeCli = await createFakeCli(
      tmpDir,
      '#!/usr/bin/env bun\nconsole.error("boom");\nprocess.exit(1);'
    );
    Bun.env.PROTON_PASS_CLI_PATH = fakeCli;
    expect(runJson(['vault', 'list'])).rejects.toBeInstanceOf(ProtonPassCliError);
  });
});

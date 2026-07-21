/**
 * @see https://bun.com/docs/runtime#bun — `--bun` overrides `#!/usr/bin/env node`
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { joinPath } from '../../../../lib/path-bun';
import { runBun } from '../_spawn';

const CWD = import.meta.dir;
const binLink = joinPath(CWD, 'node_modules/.bin/fake-cli');

describe('shebang-bun', () => {
  beforeAll(async () => {
    await Bun.$`chmod +x ${joinPath(CWD, 'cli.js')}`.quiet();
    await Bun.$`mkdir -p ${joinPath(CWD, 'node_modules/.bin')}`.quiet();
    await Bun.$`ln -sfn ../../cli.js ${binLink}`.quiet();
  });

  afterAll(async () => {
    await Bun.$`rm -rf ${joinPath(CWD, 'node_modules')}`.quiet();
  });

  test('node shebang CLI runs under Node without --bun', async () => {
    const { stdout, exitCode } = await runBun(['run', 'fake'], CWD);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('RUNTIME=node');
  });

  test('--bun forces Bun runtime for node-shebang CLI', async () => {
    const { stdout, exitCode } = await runBun(['run', '--bun', 'fake'], CWD);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('RUNTIME=bun');
  });
});

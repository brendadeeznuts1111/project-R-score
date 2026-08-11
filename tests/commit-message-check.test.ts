import { describe, expect, test } from 'bun:test';
import {
  analyzeCommitMessage,
  CONVENTIONAL_COMMIT_TYPES,
  validateCommitMessage,
} from '../scripts/check-commit-message.ts';

describe('conventional commit-message gate', () => {
  test('accepts repository conventional forms', () => {
    expect(validateCommitMessage('feat(factory): add gradient output\n')).toEqual([]);
    expect(validateCommitMessage('fix!: remove legacy wire\n')).toEqual([]);
    expect(validateCommitMessage('chore(Kalshi-bot): bump nested product\n')).toEqual([]);
  });

  test('accepts bodies separated by a blank line', () => {
    expect(
      validateCommitMessage('fix(factory): preserve alpha\n\nExplain the runtime boundary here.\n')
    ).toEqual([]);
  });

  test('keeps Git-generated history operations usable', () => {
    expect(validateCommitMessage('Merge branch \'main\' into feature\n')).toEqual([]);
    expect(validateCommitMessage('fixup! feat(factory): add gradient output\n')).toEqual([]);
    expect(validateCommitMessage('Automatic merge failed; fix conflicts and then commit.\n')).toEqual(
      []
    );
  });

  test('rejects non-conventional and malformed messages', () => {
    expect(validateCommitMessage('update gradient output\n')).toContain(
      'header must match "type(scope)!: subject" or "type!: subject"'
    );
    expect(validateCommitMessage('feature(factory): add output\n')[0]).toContain('type must be one of');
    expect(validateCommitMessage('feat(factory): add output.\n')).toContain(
      'subject must not end with a period'
    );
    expect(validateCommitMessage('feat(factory): add output\nbody without blank line\n')).toContain(
      'body must begin after a blank line'
    );
  });

  test('type vocabulary matches config-conventional', () => {
    expect(CONVENTIONAL_COMMIT_TYPES).toEqual([
      'build',
      'chore',
      'ci',
      'docs',
      'feat',
      'fix',
      'perf',
      'refactor',
      'revert',
      'style',
      'test',
    ]);
  });

  test('reports parsed scope and breaking-change metadata', () => {
    expect(analyzeCommitMessage('feat(factory)!: change palette wire\n')).toMatchObject({
      valid: true,
      ignored: false,
      type: 'feat',
      scope: 'factory',
      breaking: true,
      subject: 'change palette wire',
    });
    expect(
      analyzeCommitMessage(
        'feat(factory): change palette wire\n\nBREAKING CHANGE: consumers must select a format\n'
      )
    ).toMatchObject({ valid: true, breaking: true });
  });
});

describe('Husky commit-msg wiring', () => {
  test('uses the Bun package script without bun-git-hooks', async () => {
    const hook = await Bun.file(`${import.meta.dir}/../.husky/commit-msg`).text();
    const pkg = await Bun.file(`${import.meta.dir}/../package.json`).json();
    expect(hook).toContain('bun run commitlint --edit "$1"');
    expect(hook).not.toContain('bun-git-hooks');
    expect(pkg.scripts.commitlint).toBe('bun scripts/check-commit-message.ts');
  });

  test('CLI exposes config and structured diagnostics', async () => {
    const script = `${import.meta.dir}/../scripts/check-commit-message.ts`;
    const config = Bun.spawn(['bun', script, '--print-config'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const configJson = JSON.parse(await new Response(config.stdout).text()) as {
      hookManager: string;
      types: string[];
    };
    expect(await config.exited).toBe(0);
    expect(configJson.hookManager).toBe('husky');
    expect(configJson.types).toContain('feat');

    const path = `${Bun.env.TMPDIR ?? '/tmp'}/commitlint-${Bun.randomUUIDv7()}.txt`;
    await Bun.write(path, 'not conventional\n');
    const invalid = Bun.spawn(['bun', script, '--edit', path, '--json'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const report = JSON.parse(await new Response(invalid.stdout).text()) as {
      valid: boolean;
      errors: string[];
    };
    expect(await invalid.exited).toBe(1);
    expect(report.valid).toBe(false);
    expect(report.errors).toHaveLength(1);
    await Bun.file(path).delete();
  });
});

import { describe, expect, test } from 'bun:test';
import { BUN_GITHUB_ENV, GITHUB_ORIGIN } from '../lib/github-repository-ref.ts';
import { ensureJunitReporterEnv } from '../lib/junit-reporter-env.ts';

describe('ensureJunitReporterEnv', () => {
  test('fills commit + repo + local ci from origin (no clobber)', () => {
    const env: Record<string, string | undefined> = {};
    const applied = ensureJunitReporterEnv(env, { gitSha: 'abc123' });
    expect(applied).toEqual({
      commit: 'GIT_SHA',
      serverUrl: 'GITHUB_SERVER_URL',
      repository: 'GITHUB_REPOSITORY',
      ciJobUrl: 'CI_JOB_URL',
    });
    expect(env.GIT_SHA).toBe('abc123');
    expect(env.GITHUB_SERVER_URL).toBe(`https://${GITHUB_ORIGIN.host}`);
    expect(env.GITHUB_REPOSITORY).toBe(GITHUB_ORIGIN.ownerName);
    expect(env.CI_JOB_URL).toBe(`${GITHUB_ORIGIN.url}/commit/abc123`);
  });

  test('does not clobber Actions-set provenance', () => {
    const env: Record<string, string | undefined> = {
      [BUN_GITHUB_ENV.ACTIONS]: 'true',
      [BUN_GITHUB_ENV.SHA]: 'deadbeef',
      [BUN_GITHUB_ENV.SERVER_URL]: 'https://github.com',
      [BUN_GITHUB_ENV.REPOSITORY]: 'acme/widget',
      [BUN_GITHUB_ENV.RUN_ID]: '99',
    };
    const applied = ensureJunitReporterEnv(env, { gitSha: 'should-not-win' });
    expect(applied).toEqual({});
    expect(env.GIT_SHA).toBeUndefined();
    expect(env.CI_JOB_URL).toBeUndefined();
    expect(env.GITHUB_SHA).toBe('deadbeef');
    expect(env.GITHUB_REPOSITORY).toBe('acme/widget');
  });

  test('skips git when gitSha is null; still fills repo + ci from origin url', () => {
    const env: Record<string, string | undefined> = {};
    const applied = ensureJunitReporterEnv(env, { gitSha: null });
    expect(applied.commit).toBeUndefined();
    expect(env.GIT_SHA).toBeUndefined();
    expect(applied.ciJobUrl).toBe('CI_JOB_URL');
    expect(env.CI_JOB_URL).toBe(GITHUB_ORIGIN.url);
  });
});

describe('BUN_GITHUB_ENV junit keys', () => {
  test('names match Bun JUnit property sources', () => {
    expect(BUN_GITHUB_ENV.SHA).toBe('GITHUB_SHA');
    expect(BUN_GITHUB_ENV.CI_COMMIT_SHA).toBe('CI_COMMIT_SHA');
    expect(BUN_GITHUB_ENV.GIT_SHA).toBe('GIT_SHA');
    expect(BUN_GITHUB_ENV.CI_JOB_URL).toBe('CI_JOB_URL');
  });
});

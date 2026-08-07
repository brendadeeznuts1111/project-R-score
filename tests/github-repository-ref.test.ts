import { describe, expect, test } from 'bun:test';
import {
  apiBaseUrl,
  blobUrl,
  BUN_GITHUB_ENV,
  commitUrl,
  GITHUB_CASCADE,
  GITHUB_DEFAULT_API_DOMAIN,
  GITHUB_ORIGIN,
  GITHUB_REMOTES,
  githubTokenPresence,
  htmlUrl,
  ownerName,
  parseGitRemoteUrl,
  parseOwnerName,
  rawUrl,
  resolveGitHubRepositoryRef,
  treeUrl,
} from '../lib/github-repository-ref';

describe('parseOwnerName', () => {
  test('owner/name', () => {
    expect(parseOwnerName('brendadeeznuts1111/project-R-score')).toEqual({
      owner: 'brendadeeznuts1111',
      name: 'project-R-score',
    });
  });

  test('strips .git', () => {
    expect(parseOwnerName('o/n.git')?.name).toBe('n');
  });
});

describe('parseGitRemoteUrl', () => {
  test('git@ host:owner/name.git', () => {
    expect(parseGitRemoteUrl('git@github.com:brendadeeznuts1111/project-R-score.git')).toEqual({
      host: 'github.com',
      owner: 'brendadeeznuts1111',
      name: 'project-R-score',
    });
  });

  test('https url', () => {
    expect(
      parseGitRemoteUrl('https://github.com/brendadeeznuts1111/cascade-mover-v3.git')
    ).toEqual({
      host: 'github.com',
      owner: 'brendadeeznuts1111',
      name: 'cascade-mover-v3',
    });
  });

  test('ssh://git@host/owner/name.git', () => {
    expect(parseGitRemoteUrl('ssh://git@github.com/acme/widget.git')).toEqual({
      host: 'github.com',
      owner: 'acme',
      name: 'widget',
    });
  });
});

describe('resolveGitHubRepositoryRef', () => {
  test('Actions GITHUB_REPOSITORY + GITHUB_SERVER_URL', () => {
    const ref = resolveGitHubRepositoryRef({
      remote: 'origin',
      gitRemoteUrl: null,
      env: {
        GITHUB_REPOSITORY: 'acme/widget',
        GITHUB_REPOSITORY_OWNER: 'acme',
        GITHUB_SERVER_URL: 'https://github.com',
      },
    });
    expect(ref).toEqual({
      host: 'github.com',
      owner: 'acme',
      name: 'widget',
      remote: 'origin',
      source: 'actions',
    });
  });

  test('fail-loud on garbage GITHUB_REPOSITORY', () => {
    expect(() =>
      resolveGitHubRepositoryRef({
        remote: 'origin',
        gitRemoteUrl: null,
        env: { GITHUB_REPOSITORY: 'not-a-pair' },
      })
    ).toThrow(/GITHUB_REPOSITORY is not owner\/name/);
  });

  test('fail-loud when OWNER disagrees with REPOSITORY', () => {
    expect(() =>
      resolveGitHubRepositoryRef({
        remote: 'origin',
        gitRemoteUrl: null,
        env: {
          GITHUB_REPOSITORY: 'acme/widget',
          GITHUB_REPOSITORY_OWNER: 'other',
        },
      })
    ).toThrow(/disagrees/);
  });

  test('fail-loud on garbage git remote url', () => {
    expect(() =>
      resolveGitHubRepositoryRef({
        remote: 'origin',
        env: {},
        gitRemoteUrl: 'not-a-url',
      })
    ).toThrow(/not a parseable GitHub URL/);
  });

  test('git remote when Actions unset', () => {
    const ref = resolveGitHubRepositoryRef({
      remote: 'origin',
      env: {},
      gitRemoteUrl: 'git@github.com:other/repo.git',
    });
    expect(ref.source).toBe('git-remote');
    expect(ref.owner).toBe('other');
    expect(ref.name).toBe('repo');
  });

  test('canonical fallback sets source: canonical', () => {
    const ref = resolveGitHubRepositoryRef({
      remote: 'origin',
      env: {},
      gitRemoteUrl: null,
    });
    expect(ref).toEqual({
      host: 'github.com',
      owner: 'brendadeeznuts1111',
      name: 'project-R-score',
      remote: 'origin',
      source: 'canonical',
    });
  });

  test('cascade slot canonical', () => {
    const ref = resolveGitHubRepositoryRef({
      remote: 'cascade',
      env: {},
      gitRemoteUrl: null,
    });
    expect(ref.name).toBe('cascade-mover-v3');
    expect(ref.source).toBe('canonical');
  });
});

describe('global frozen constants', () => {
  test('GITHUB_ORIGIN matches CANONICAL origin + link edge', () => {
    expect(GITHUB_ORIGIN).toMatchObject({
      remote: 'origin',
      host: 'github.com',
      owner: 'brendadeeznuts1111',
      name: 'project-R-score',
      ownerName: 'brendadeeznuts1111/project-R-score',
      url: 'https://github.com/brendadeeznuts1111/project-R-score',
      gitSsh: 'git@github.com:brendadeeznuts1111/project-R-score.git',
      apiHost: GITHUB_DEFAULT_API_DOMAIN,
    });
    expect(GITHUB_REMOTES.origin).toBe(GITHUB_ORIGIN);
  });

  test('GITHUB_CASCADE is nested product remote', () => {
    expect(GITHUB_CASCADE.name).toBe('cascade-mover-v3');
    expect(GITHUB_CASCADE.url).toBe('https://github.com/brendadeeznuts1111/cascade-mover-v3');
  });

  test('BUN_GITHUB_ENV key names match Bun create + Actions wire', () => {
    expect(BUN_GITHUB_ENV.TOKEN).toBe('GITHUB_TOKEN');
    expect(BUN_GITHUB_ENV.ACCESS_TOKEN).toBe('GITHUB_ACCESS_TOKEN');
    expect(BUN_GITHUB_ENV.API_DOMAIN).toBe('GITHUB_API_DOMAIN');
    expect(BUN_GITHUB_ENV.REPOSITORY).toBe('GITHUB_REPOSITORY');
    expect(BUN_GITHUB_ENV.SERVER_URL).toBe('GITHUB_SERVER_URL');
    expect(BUN_GITHUB_ENV.RUN_ID).toBe('GITHUB_RUN_ID');
  });
});

describe('link edge helpers', () => {
  const ref = {
    host: 'github.com',
    owner: 'o',
    name: 'n',
    remote: 'origin' as const,
    source: 'canonical' as const,
  };

  test('htmlUrl + ownerName', () => {
    expect(htmlUrl(ref)).toBe('https://github.com/o/n');
    expect(ownerName(ref)).toBe('o/n');
  });

  test('treeUrl encodes branch segments', () => {
    expect(treeUrl(ref, 'feat/foo')).toBe('https://github.com/o/n/tree/feat/foo');
  });

  test('commitUrl', () => {
    expect(commitUrl(ref, 'abc123')).toBe('https://github.com/o/n/commit/abc123');
  });

  test('blobUrl + rawUrl encode path/branch', () => {
    expect(blobUrl(ref, 'docs/AGENTS.md')).toBe(
      'https://github.com/o/n/blob/main/docs/AGENTS.md'
    );
    expect(blobUrl(ref, 'lib/foo.ts', 'feat/bar')).toBe(
      'https://github.com/o/n/blob/feat/bar/lib/foo.ts'
    );
    expect(rawUrl(ref, 'public/registry/x.json')).toBe(
      'https://raw.githubusercontent.com/o/n/main/public/registry/x.json'
    );
  });

  test('apiBaseUrl strips scheme and trailing slash', () => {
    expect(apiBaseUrl()).toBe('https://api.github.com');
    expect(apiBaseUrl('https://ghe.example/')).toBe('https://ghe.example');
  });
});

describe('githubTokenPresence', () => {
  test('GITHUB_TOKEN over GITHUB_ACCESS_TOKEN', () => {
    expect(
      githubTokenPresence({
        GITHUB_TOKEN: 't1',
        GITHUB_ACCESS_TOKEN: 't2',
        GITHUB_API_DOMAIN: 'api.github.com',
      })
    ).toEqual({ tokenSource: 'GITHUB_TOKEN', apiDomain: 'api.github.com' });
  });

  test('falls through to ACCESS then GH_TOKEN then none', () => {
    expect(githubTokenPresence({ GITHUB_ACCESS_TOKEN: 'x' }).tokenSource).toBe(
      'GITHUB_ACCESS_TOKEN'
    );
    expect(githubTokenPresence({ GH_TOKEN: 'x' }).tokenSource).toBe('GH_TOKEN');
    expect(githubTokenPresence({}).tokenSource).toBe('none');
  });

  test('default apiDomain', () => {
    expect(githubTokenPresence({}).apiDomain).toBe('api.github.com');
  });
});

import { describe, expect, test } from 'bun:test';
import {
  buildProjectRSSChannelRegistry,
  parseProjectRSSChannelRegistry,
  projectRSSAliasRedirects,
  projectRSSAliasRoutes,
  resolveProjectRSSAlias,
} from '../lib/rss/project-channel-registry.ts';
import { discoverProjectLeaves } from '../tools/projects-root-check.ts';

const active = [
  { tier: 'active' as const, path: 'projects/active/sports-terminal-os' },
  { tier: 'active' as const, path: 'projects/active/analysis/scanner' },
];

describe('project RSS channel registry', () => {
  test('maps explicit repository authority without inventing project feeds', () => {
    const registry = buildProjectRSSChannelRegistry(active);
    expect(registry.defaultPolicy).toBe('unregistered-no-fallback');
    expect(registry.projects.map(project => String(project.projectId))).toEqual([
      'project-r-score',
      'scanner',
      'sports-terminal-os',
    ]);

    const root = registry.projects[0]!;
    expect(root.repositoryRemote).toBe('origin');
    expect(root.feedStatus).toBe('registered');
    expect(root.channels.map(channel => String(channel.id))).toEqual([
      'bun-1.4:all',
      'bun-1.4:image',
      'bun-1.4:video',
      'bun-1.4:embed',
    ]);

    const scanner = registry.projects.find(project => project.projectId === 'scanner')!;
    expect(scanner.repositoryRemote).toBe('origin');
    expect(scanner.feedStatus).toBe('unregistered');
    expect(scanner.channels).toEqual([]);
    expect(registry.repositories[1]?.repository.ownerName).toBe(
      'brendadeeznuts1111/cascade-mover-v3'
    );
    expect(registry.repositories[1]?.channelIds).toEqual([]);
    expect(registry.pendingIndependentProjects.map(project => String(project.projectId))).toEqual([
      'kimiremote',
      'f402-openapi',
      'bet-ticker-worker-v1.1',
    ]);
  });

  test('declares lean aliases for the canonical Bun 1.4 documents', () => {
    expect([...projectRSSAliasRedirects()]).toEqual([
      ['/feeds/v1/projects/project-r-score/bun-1.4/all.xml', '/feeds/v1/all.xml'],
      ['/feeds/v1/projects/project-r-score/bun-1.4/images.xml', '/feeds/v1/images.xml'],
      ['/feeds/v1/projects/project-r-score/bun-1.4/videos.xml', '/feeds/v1/videos.xml'],
      ['/feeds/v1/projects/project-r-score/bun-1.4/embeds.xml', '/feeds/v1/embeds.xml'],
    ]);
    expect(projectRSSAliasRedirects().has('/feeds/v1/projects/scanner/bun-1.4/all.xml')).toBe(
      false
    );
  });

  test('redirects GET and HEAD aliases while preserving query strings', () => {
    const routes = projectRSSAliasRoutes();
    const path = '/feeds/v1/projects/project-r-score/bun-1.4/all.xml';
    for (const method of ['GET', 'HEAD']) {
      const response = routes[path]!(new Request(`https://example.test${path}?view=compact`, { method }));
      expect(response.status).toBe(301);
      expect(response.headers.get('Location')).toBe('/feeds/v1/all.xml?view=compact');
      expect(response.body).toBeNull();
    }
    const rejected = routes[path]!(new Request(`https://example.test${path}`, { method: 'POST' }));
    expect(rejected.status).toBe(405);
    expect(rejected.headers.get('Allow')).toBe('GET, HEAD');
    expect(resolveProjectRSSAlias(path)).toBe('/feeds/v1/all.xml');
    expect(resolveProjectRSSAlias('/feeds/v1/projects/scanner/bun-1.4/all.xml')).toBeUndefined();
  });

  test('rejects duplicate project IDs that point to different projects', () => {
    expect(() =>
      buildProjectRSSChannelRegistry([
        { tier: 'active', path: 'projects/active/same' },
        { tier: 'active', path: 'projects/active/analysis/same' },
      ])
    ).toThrow('Duplicate project ID same');
  });

  test('keeps optional independent checkouts out of origin ownership', () => {
    const registry = buildProjectRSSChannelRegistry([
      ...active,
      { tier: 'active', path: 'projects/active/kimiremote' },
      { tier: 'active', path: 'projects/active/enterprise/cascade-mover-v3' },
    ]);
    expect(registry.projects.some(project => project.projectId === 'kimiremote')).toBe(false);
    expect(registry.projects.some(project => project.projectId === 'cascade-mover-v3')).toBe(false);
    expect(registry.repositories[1]?.projectIds).toEqual(['cascade-mover-v3']);
  });

  test('committed registry matches the live active-project inventory', async () => {
    const discovered = await discoverProjectLeaves();
    const activeLeaves = discovered.leaves.filter(
      (leaf): leaf is { tier: 'active'; path: string } => leaf.tier === 'active'
    );
    const expected = buildProjectRSSChannelRegistry(activeLeaves);
    const actual = parseProjectRSSChannelRegistry(
      await Bun.file('public/registry/project-rss-channels.json').json()
    );
    expect(actual).toEqual(expected);
    expect(activeLeaves).toHaveLength(20);
    expect(expected.projects).toHaveLength(21);
    expect(expected.projects.filter(project => project.feedStatus === 'registered')).toHaveLength(1);

    const duplicateFeedFiles = await Array.fromAsync(
      new Bun.Glob('projects/**/*.xml').scan({ cwd: 'public/feeds/v1', onlyFiles: true })
    );
    expect(duplicateFeedFiles).toEqual([]);
  });

  test('is enforced by Bun 1.4 release and merge proof', async () => {
    const packageJson = await Bun.file('package.json').json();
    expect(packageJson.scripts['channels:bun-1.4:check']).toContain(
      'bun run channels:projects:types'
    );
    const ciCoreSteps = await Bun.file('scripts/lib/ci-core-steps.ts').text();
    expect(ciCoreSteps).toContain("cmd: ['bun', 'run', 'docs:blog-assets:check']");
    expect(ciCoreSteps).toContain("cmd: ['bun', 'run', 'channels:bun-1.4:check']");
    const scheduledDrift = await Bun.file('.github/workflows/bun-1.4-release-drift.yml').text();
    expect(scheduledDrift).toContain('cron: "20 6 * * *"');
    expect(scheduledDrift).toContain('bun run docs:blog-assets:check');
    expect(scheduledDrift).toContain('bun run channels:bun-1.4:refresh:plan');
  });

  test('fails closed for malformed registries, aliases, and ownership', () => {
    const base = buildProjectRSSChannelRegistry(active);
    const mutate = (change: (value: any) => void) => {
      const value = structuredClone(base) as any;
      change(value);
      return value;
    };

    expect(() => parseProjectRSSChannelRegistry({ ...base, surprise: true })).toThrow(
      'keys must be exactly'
    );
    expect(() =>
      parseProjectRSSChannelRegistry(
        mutate(value => {
          value.repositories[0].repository.owner = 'invented-owner';
        })
      )
    ).toThrow('does not match canonical origin');
    expect(() =>
      parseProjectRSSChannelRegistry(
        mutate(value => {
          value.projects[0].channels[0].projectEndpoint =
            '/feeds/v1/projects/project-r-score/bun-1.4/%2e%2e/all.xml';
        })
      )
    ).toThrow('normalized URL path');
    expect(() =>
      parseProjectRSSChannelRegistry(
        mutate(value => {
          value.projects[0].channels[1].id = value.projects[0].channels[0].id;
        })
      )
    ).toThrow('duplicate channel IDs');
    expect(() =>
      parseProjectRSSChannelRegistry(
        mutate(value => {
          value.projects[1].channels = [
            {
              ...value.projects[0].channels[0],
              projectEndpoint: '/feeds/v1/projects/scanner/bun-1.4/all.xml',
            },
          ];
        })
      )
    ).toThrow('unregistered projects cannot have channels');
    expect(() =>
      parseProjectRSSChannelRegistry(
        mutate(value => {
          value.projects[0].channels[0].canonicalEndpoint = '/feeds/v1/changelog.xml';
          value.projects[0].channels[0].projectEndpoint =
            '/feeds/v1/projects/project-r-score/bun-1.4/changelog.xml';
        })
      )
    ).toThrow('root channels must match the Bun 1.4 channel contract');
    expect(() =>
      parseProjectRSSChannelRegistry(
        mutate(value => {
          value.pendingIndependentProjects.pop();
        })
      )
    ).toThrow('pending independent project identities do not match the reviewed inventory');
    expect(() =>
      parseProjectRSSChannelRegistry(
        mutate(value => {
          value.projects[1].path = 'projects/active/analysis/not-scanner';
        })
      )
    ).toThrow('contained project scanner has invalid ownership');
    expect(() =>
      projectRSSAliasRedirects([
        ...base.projects[0]!.channels,
        structuredClone(base.projects[0]!.channels[0]!),
      ])
    ).toThrow('Duplicate project RSS alias');
    expect(() =>
      buildProjectRSSChannelRegistry([
        { tier: 'active', path: 'projects/active/analysis/../scanner' },
      ])
    ).toThrow('not normalized');
  });
});

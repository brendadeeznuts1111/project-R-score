import { afterAll, describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { joinPath } from '../lib/path-bun.ts';
import {
  verifyBun14ReleaseArchive,
  writeBun14ReleaseArchive,
} from '../tools/bun-blog-assets/release-archive.ts';
import { buildBun14ReleaseSnapshot } from '../tools/bun-blog-assets/release-snapshot.ts';

const temporaryPaths: string[] = [];
afterAll(async () => {
  await Promise.all(temporaryPaths.map(path => rm(path, { recursive: true, force: true })));
});

describe('Bun 1.4 channel release lifecycle', () => {
  test('maps manifest ownership and active items into exact channel membership', async () => {
    const { snapshot } = await buildBun14ReleaseSnapshot();
    expect(snapshot.owner).toEqual({ name: 'Bun', url: 'https://bun.com/' });
    expect(snapshot.items).toHaveLength(26);
    expect(snapshot.channels.map(channel => [channel.id, channel.itemCount])).toEqual([
      ['bun-1.4:all', 26],
      ['bun-1.4:image', 21],
      ['bun-1.4:video', 4],
      ['bun-1.4:embed', 1],
    ]);
    const declaredChannels = new Set(snapshot.channels.map(channel => channel.id));
    expect(
      snapshot.items.every(item => item.channels.every(channel => declaredChannels.has(channel)))
    ).toBe(true);
    expect(snapshot.items.find(item => item.id === 'bun-1.4-test-timings')?.channels).toEqual([
      'bun-1.4:all',
      'bun-1.4:image',
    ]);
    expect(snapshot.items.every(item => item.state === 'active' && item.owner === 'Bun')).toBe(true);
    expect(snapshot.schemaVersion).toBe(3);
    expect(snapshot.project).toEqual({
      id: 'project-r-score',
      repository: 'brendadeeznuts1111/project-R-score',
      aliases: [
        {
          id: 'bun-1.4:all',
          canonicalEndpoint: '/feeds/v1/all.xml',
          projectEndpoint: '/feeds/v1/projects/project-r-score/bun-1.4/all.xml',
        },
        {
          id: 'bun-1.4:image',
          canonicalEndpoint: '/feeds/v1/images.xml',
          projectEndpoint: '/feeds/v1/projects/project-r-score/bun-1.4/images.xml',
        },
        {
          id: 'bun-1.4:video',
          canonicalEndpoint: '/feeds/v1/videos.xml',
          projectEndpoint: '/feeds/v1/projects/project-r-score/bun-1.4/videos.xml',
        },
        {
          id: 'bun-1.4:embed',
          canonicalEndpoint: '/feeds/v1/embeds.xml',
          projectEndpoint: '/feeds/v1/projects/project-r-score/bun-1.4/embeds.xml',
        },
      ],
    });
    expect(snapshot.chapters.map(chapter => [chapter.id, chapter.itemCount])).toEqual([
      ['what-s-new', 4],
      ['bun-install', 6],
      ['bun-test', 1],
      ['bun-build', 1],
      ['faster', 1],
    ]);
    expect(snapshot.items.find(item => item.id === 'bun-1.4-bun-prune')?.chapters).toEqual([
      'bun-install',
    ]);
    expect(snapshot.items.find(item => item.addressKind === 'sha256-source-url')).toBeDefined();
    expect(snapshot.snapshotDigest).toHaveLength(64);
    expect(snapshot.files.some(file => file.path === 'registry/project-rss-channels.json')).toBe(
      true
    );
  });

  test('writes and verifies a content-addressed Bun.Archive', async () => {
    const outputRoot = await mkdtemp(joinPath(tmpdir(), 'bun-1.4-channel-'));
    temporaryPaths.push(outputRoot);
    const { snapshot, input } = await buildBun14ReleaseSnapshot();
    const archived = await writeBun14ReleaseArchive(snapshot, input, outputRoot);
    await expect(verifyBun14ReleaseArchive(archived)).resolves.toBeUndefined();
    expect(archived.archivePath).toEndWith(`${snapshot.snapshotDigest}.tar.gz`);
    expect(archived.archiveSha256).toHaveLength(64);
    expect(await Bun.file(joinPath(outputRoot, 'latest.json')).exists()).toBe(true);

    const files = await new Bun.Archive(await Bun.file(archived.archivePath).bytes()).files();
    expect([...files.keys()].sort()).toEqual(Object.keys(input).sort());
  });
});

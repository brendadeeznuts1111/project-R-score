import { afterAll, describe, expect, test } from 'bun:test';
import {
  buildOfflineDesk,
  prepareOfflineDeskHtml,
  readOfflineDeskArtifacts,
} from '../tools/build-offline-desk';

const SOURCE = `${import.meta.dir}/../public/portal/desk/index.html`;
const OUTPUT = `${import.meta.dir}/../.bun-cache/offline-desk-test/desk.html`;

afterAll(async () => {
  await Bun.$`rm -rf ${`${import.meta.dir}/../.bun-cache/offline-desk-test`}`.quiet();
});

describe('offline standalone desk', () => {
  test('stages local dependencies and embeds the complete desk dataset', async () => {
    const source = await Bun.file(SOURCE).text();
    const artifacts = await readOfflineDeskArtifacts();
    const staged = prepareOfflineDeskHtml(source, artifacts);

    expect(staged).toContain('data-offline-artifact="true"');
    expect(staged).toContain('const OFFLINE_REGISTRY = Object.freeze(');
    expect(staged).toContain("'./desk-board.js'");
    expect(staged).toContain("'../partners/partners-board.js'");
    expect(staged).not.toContain("from '/portal/fetch-json.js'");
    expect(staged).not.toContain('fonts.googleapis.com');
    expect(staged).not.toContain('src="/portal/');
    expect(Object.keys(artifacts)).toHaveLength(10);
  });

  test('compiles one self-contained HTML artifact without changing the online desk', async () => {
    const sourceBefore = await Bun.file(SOURCE).text();
    const result = await buildOfflineDesk({ outfile: OUTPUT });
    const output = await Bun.file(result.outfile).text();

    expect(result.bytes).toBeGreaterThan(100_000);
    expect(output).toContain('data-offline-artifact="true"');
    expect(output).toContain('partners-dashboard.v2');
    expect(output).not.toMatch(/<(?:script|link)[^>]+(?:src|href)=["'](?:\/|\.\.?\/)/);
    expect(await Bun.file(SOURCE).text()).toBe(sourceBefore);
  }, 30_000);
});

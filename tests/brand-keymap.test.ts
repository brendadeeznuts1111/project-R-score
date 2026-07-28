import { describe, expect, test } from 'bun:test';

import { buildBrandKeymap } from '../tools/brand-keymap.ts';
import type { BrandCoverageFile } from '../tools/brand-coverage.ts';

describe('brand keymap', () => {
  test('joins the manifest, scoped coverage, and project adoption', async () => {
    const manifest = await Bun.file('lib/types/brand-manifest.json').json();
    const files: BrandCoverageFile[] = [
      {
        path: 'lib/example.ts',
        text: `
          import { parseStateCode } from './types/branded.ts';
          export const state = parseStateCode(raw);
        `,
      },
      {
        path: 'projects/active/example/src/index.ts',
        project: 'projects/active/example',
        text: `
          import { asSessionId } from '../../../../lib/types/branded.ts';
          export const session = asSessionId('session');
        `,
      },
    ];

    const payload = buildBrandKeymap(
      manifest,
      files,
      ['projects/active/example', 'projects/active/external'],
      '2026-07-28T00:00:00.000Z'
    );

    expect(payload).toMatchObject({
      schemaVersion: 1,
      kind: 'brand-keymap',
      path: '/registry/brand-keymap.json',
      generatedAt: '2026-07-28T00:00:00.000Z',
      summary: {
        brands: 52,
        domains: 9,
        trackedProjects: 1,
        canonicalProjects: 1,
      },
    });
    expect(payload.brands.find(brand => brand.name === 'StateCode')).toMatchObject({
      coverage: {
        status: 'covered',
        scopes: {
          spine: { constructionCalls: 1 },
          projects: { constructionCalls: 0 },
        },
      },
    });
    expect(payload.projects).toEqual([
      expect.objectContaining({
        project: 'projects/active/example',
        status: 'adopted',
        brands: ['SessionId'],
      }),
      expect.objectContaining({
        project: 'projects/active/external',
        status: 'external-or-untracked',
      }),
    ]);
  });

  test(
    'committed portal artifact stays aligned with the current sources',
    async () => {
      const proc = Bun.spawn(['bun', 'tools/brand-keymap.ts', '--check'], {
        stdout: 'pipe',
        stderr: 'pipe',
      });
      const [stdout, stderr, exitCode] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
        proc.exited,
      ]);
      expect(stderr).toBe('');
      expect(exitCode, stdout).toBe(0);
    },
    { timeout: 15_000 }
  );
});

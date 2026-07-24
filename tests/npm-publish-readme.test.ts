// @see https://bun.com/blog/bun-v1.3.14#bun-publish-now-sends-readme-metadata-to-the-registry
import { describe, expect, test } from 'bun:test';
import {
  extractPublishVersionManifest,
  extractReadmeFromTarball,
} from '../lib/registry/npm-publish-readme.ts';

describe('lib/registry/npm-publish-readme', () => {
  test('extractPublishVersionManifest reads readme from Bun publish body', () => {
    const body = {
      versions: {
        '1.0.0': {
          readme: '# my-package\n\nA great package...',
          readmeFilename: 'README.md',
          description: 'Great',
          dependencies: { zod: '^3.0.0' },
        },
      },
    };
    const m = extractPublishVersionManifest(body, '1.0.0');
    expect(m.readme).toContain('# my-package');
    expect(m.readmeFilename).toBe('README.md');
    expect(m.description).toBe('Great');
    expect(m.dependencies?.zod).toBe('^3.0.0');
  });

  test('extractReadmeFromTarball finds README.md in tgz', async () => {
    const proc = Bun.spawn(['tar', '-czf', '-', 'README.md'], {
      cwd: `${import.meta.dir}/../packages/registry-client`,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const tarball = new Uint8Array(await new Response(proc.stdout).arrayBuffer());
    await proc.exited;

    const m = await extractReadmeFromTarball(tarball);
    expect(m.readmeFilename).toBe('README.md');
    expect(m.readme).toContain('@factorywager/registry-client');
  });
});

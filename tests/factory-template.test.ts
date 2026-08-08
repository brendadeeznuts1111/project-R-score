import { describe, expect, test } from 'bun:test';

const TEMPLATE_ROOT = `${import.meta.dir}/../.bun-create/factory-library`;

describe('factory-library template contract', () => {
  test('keeps mustache placeholders only where Bun resolves the package name', async () => {
    const files = ['README.md', 'bunfig.toml', 'src/index.ts', 'test/index.test.ts'];
    for (const file of files) {
      const text = await Bun.file(`${TEMPLATE_ROOT}/${file}`).text();
      expect(text).not.toContain('{{');
    }

    const packageJson = await Bun.file(`${TEMPLATE_ROOT}/package.json`).json();
    expect(packageJson.name).toBe('{{name}}');
  });

  test('publishes a Bun-native source entry point without template-only files', async () => {
    const packageJson = await Bun.file(`${TEMPLATE_ROOT}/package.json`).json();
    expect(packageJson.exports['.']).toBe('./src/index.ts');
    expect(packageJson.types).toBe('./src/index.ts');
    expect(packageJson.files).toEqual(['src', 'README.md']);
    expect(packageJson.scripts.build).toContain('bun build');
    expect(packageJson.scripts.dev).toContain('--watch');

    expect(await Bun.file(`${TEMPLATE_ROOT}/plugin.example.ts`).exists()).toBe(false);
    expect(await Bun.file(`${TEMPLATE_ROOT}/.gitignore`).exists()).toBe(true);
  });
});

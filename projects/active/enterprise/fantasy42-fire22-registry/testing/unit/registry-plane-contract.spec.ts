import { describe, expect, it } from 'bun:test';
import { resolve } from 'node:path';

const productRoot = resolve(import.meta.dir, '../..');

const readText = (relativePath: string) => Bun.file(resolve(productRoot, relativePath)).text();

describe('Fire22 root registry-plane contract', () => {
  it('keeps unscoped installs public and Fire22 scopes independently authorized', async () => {
    const bunfig = Bun.TOML.parse(await readText('bunfig.toml')) as {
      install: {
        registry: string;
        scopes: Record<string, Record<string, string>>;
      };
    };

    expect(bunfig.install.registry).toBe('https://registry.npmjs.org/');
    expect(bunfig.install.scopes['@fire22']).toEqual({
      url: '$FIRE22_REGISTRY_URL',
      token: '$FIRE22_REGISTRY_TOKEN',
    });
    expect(bunfig.install.scopes['@enterprise']).toEqual({
      url: '$FIRE22_ENTERPRISE_REGISTRY_URL',
      token: '$FIRE22_ENTERPRISE_TOKEN',
    });
    expect(bunfig.install.scopes['@private']).toEqual({
      url: '$FIRE22_PRIVATE_REGISTRY_URL',
      username: '$FIRE22_PRIVATE_USER',
      password: '$FIRE22_PRIVATE_PASS',
    });
  });

  it('keeps npm-compatible scope mappings on the same Fire22 URL contracts', async () => {
    const npmrc = await readText('.npmrc');

    expect(npmrc).toContain('registry=https://registry.npmjs.org/');
    expect(npmrc).toContain('@fire22:registry=${FIRE22_REGISTRY_URL}');
    expect(npmrc).toContain('@enterprise:registry=${FIRE22_ENTERPRISE_REGISTRY_URL}');
    expect(npmrc).toContain('@private:registry=${FIRE22_PRIVATE_REGISTRY_URL}');
    expect(npmrc).not.toContain('always-auth=true');
  });

  it('rejects inherited FactoryWager routes and credentials at product root', async () => {
    const rootSurfaces = await Promise.all(
      ['package.json', 'bunfig.toml', '.npmrc', '.npmrc.template'].map(readText)
    );
    const combined = rootSurfaces.join('\n');
    const packageJson = JSON.parse(rootSurfaces[0]) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
      publishConfig?: unknown;
    };

    expect(combined).not.toContain('registry.factory-wager.com');
    expect(combined).not.toContain('FW_REGISTRY_TOKEN');
    expect(combined).not.toContain('@factorywager');
    expect(combined).not.toContain('@duoplus');
    expect(packageJson.publishConfig).toBeUndefined();

    const dependencyNames = Object.keys({
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
      ...packageJson.peerDependencies,
    });
    expect(dependencyNames.some(name => /^@(factorywager|duoplus)\//.test(name))).toBe(false);
  });
});

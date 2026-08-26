import { describe, expect, test } from 'bun:test';
import {
  checkRegistryConfig,
  checkRegistryConfigDocuments,
  type RegistryConfigDocuments,
} from '../scripts/check-registry-config.ts';
import { runRegistryDoctor } from '../scripts/registry-stack-doctor.ts';

function fixture(overrides: Partial<RegistryConfigDocuments> = {}): RegistryConfigDocuments {
  return {
    npmrc: '@factorywager:registry=https://registry.factory-wager.com/api/npm\n',
    bunfig:
      '[install.scopes]\n"@factorywager" = { url = "https://registry.factory-wager.com/api/npm" }\n',
    localBunfig:
      '[install.scopes]\n"@factorywager" = { url = "http://localhost:3000/" }\n',
    packageJson: '{"private":true}',
    releaseTargetsJson:
      '{"readRegistryUrl":"https://registry.factory-wager.com/api/npm","targets":[{"publicationRoutes":{"native":{"enabled":false}}}]}',
    registryConfigJson5: `{
      read: { origin: "https://registry.factory-wager.com", npm: {
        url: "https://registry.factory-wager.com/api/npm", methods: ["GET", "HEAD"] } },
      localWrite: { url: "http://localhost:3000" },
      productionWrite: { type: "r2-sigv4", bucket: "factory-wager-registry" },
    }`,
    envExample: [
      'FACTORY_WAGER_NPM_REGISTRY_URL=https://registry.factory-wager.com/api/npm',
      'FACTORY_WAGER_REGISTRY_ORIGIN=https://registry.factory-wager.com',
      'FACTORY_WAGER_LOCAL_REGISTRY_WRITE_URL=http://localhost:3000',
    ].join('\n'),
    ...overrides,
  };
}

describe('FactoryWager root registry configuration', () => {
  test('checked-in root contracts are aligned and the doctor is read-only', async () => {
    expect(await checkRegistryConfig()).toEqual({ ok: true, errors: [] });
    const doctor = await runRegistryDoctor();
    expect(doctor.ok).toBe(true);
    expect(doctor.mode).toBe('read-only');
    const source = await Bun.file('scripts/registry-stack-doctor.ts').text();
    expect(source).not.toMatch(/Bun\.write|writeText|writeFile/);
  });

  test('accepts a fully separated read/local-write/R2 fixture', () => {
    expect(checkRegistryConfigDocuments(fixture())).toEqual({ ok: true, errors: [] });
  });

  test('rejects a public-read token and publishConfig destination', () => {
    const result = checkRegistryConfigDocuments(
      fixture({
        npmrc:
          '@factorywager:registry=https://registry.factory-wager.com/api/npm\n//registry.factory-wager.com/:_authToken=${TOKEN}\n',
        packageJson:
          '{"private":true,"publishConfig":{"registry":"https://registry.factory-wager.com/api/npm"}}',
      })
    );
    expect(result.errors).toContain('.npmrc: public registry must not receive credentials');
    expect(result.errors).toContain(
      'package.json: publishConfig.registry must not equal the public read URL'
    );
  });

  test('rejects publish TOML, non-loopback SDK writes, and production HTTP writes', () => {
    const result = checkRegistryConfigDocuments(
      fixture({
        bunfig: `[install.scopes]
"@factorywager" = { url = "https://registry.factory-wager.com/api/npm", token = "$TOKEN" }
[publish]
registry = "https://registry.factory-wager.com/api/npm"`,
        registryConfigJson5: `{
          read: { origin: "https://registry.factory-wager.com", npm: {
            url: "https://registry.factory-wager.com/api/npm", methods: ["GET", "HEAD"] } },
          localWrite: { url: "https://registry.factory-wager.com" },
          productionWrite: { type: "http", url: "https://registry.factory-wager.com" },
        }`,
      })
    );
    expect(result.errors).toContain('bunfig.toml: public registry scope must be tokenless');
    expect(result.errors).toContain(
      'bunfig.toml: publish registry must not equal the public read URL'
    );
    expect(result.errors).toContain(
      'config/registry.config.json5: local SDK write URL must use HTTP loopback'
    );
    expect(result.errors).toContain(
      'config/registry.config.json5: production write must be URL-free R2 SigV4'
    );
  });

  test('rejects release-target drift and the ambiguous raw environment key', () => {
    const result = checkRegistryConfigDocuments(
      fixture({
        releaseTargetsJson: '{"readRegistryUrl":"https://registry.example/api/npm","targets":[]}',
        envExample: 'REGISTRY_URL=https://registry.factory-wager.com/api/npm\n',
      })
    );
    expect(result.errors).toContain(
      'config/release-targets.json: readRegistryUrl differs from canonical npm URL'
    );
    expect(result.errors).toContain('.env.example: ambiguous REGISTRY_URL is forbidden');
  });
});

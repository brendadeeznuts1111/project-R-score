import { describe, expect, test } from 'bun:test';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadDomainRegistry, resolveDomainRegistry } from '../scripts/lib/domain-registry';

describe('domain-registry', () => {
  test('loads registry entries from file', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'domain-registry-'));
    const path = join(dir, 'domain-registry.json');
    await writeFile(
      path,
      JSON.stringify(
        {
          version: '2026.02.08.1',
          domains: [
            {
              domain: 'factory-wager.com',
              bucket: 'bench-bucket',
              prefix: 'domains/factory-wager/cloudflare',
              requiredHeader: 'x-factory-domain-token',
              tokenEnvVar: 'FACTORY_WAGER_DOMAIN_TOKEN',
            },
          ],
        },
        null,
        2
      )
    );

    const data = await loadDomainRegistry(path);
    expect(data.version).toBe('2026.02.08.1');
    expect(data.entries).toHaveLength(1);
    expect(data.entries[0]?.domain).toBe('factory-wager.com');
  });

  test('resolves fallback mapping when domain is missing', async () => {
    const resolved = await resolveDomainRegistry('unknown.example.com', {
      bucket: 'fallback-bucket',
      endpoint: 'https://example.com',
    });

    expect(resolved.mappingSource).toBe('fallback');
    expect(resolved.bucket).toBe('fallback-bucket');
    expect(resolved.prefix).toBe('domains/unknown.example/cloudflare');
  });
});

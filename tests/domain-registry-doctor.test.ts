import { describe, expect, test } from 'bun:test';
import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runDomainRegistryDoctor } from '../scripts/domain-registry-status';

describe('domain-registry-doctor', () => {
  test('adds missing env scaffolding in fix mode', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'domain-registry-doctor-'));
    const reportsDir = join(dir, 'reports');
    const benchDir = join(reportsDir, 'search-benchmark');
    await mkdir(benchDir, { recursive: true });

    const registryPath = join(dir, 'domain-registry.json');
    const envFile = join(dir, '.env.factory-wager');
    await writeFile(
      registryPath,
      JSON.stringify(
        {
          version: '2026.02.08.1',
          domains: [
            {
              domain: 'api.factory-wager.com',
              zone: 'factory-wager.com',
              bucket: 'bun-secrets',
              prefix: 'domains/api.factory-wager/cloudflare',
              requiredHeader: 'x-factory-domain-token',
              tokenEnvVar: 'FACTORY_WAGER_TOKEN_API',
            },
          ],
        },
        null,
        2
      )
    );
    await writeFile(envFile, 'SEARCH_BENCH_DOMAIN=factory-wager.com\n');
    await writeFile(join(benchDir, 'latest.json'), JSON.stringify({ id: 'snap-1', path: './lib' }, null, 2));
    await writeFile(join(reportsDir, 'health-report.json'), JSON.stringify({ details: [] }, null, 2));

    const doctor = await runDomainRegistryDoctor({
      registryPath,
      latestPath: join(benchDir, 'latest.json'),
      healthReportPath: join(reportsDir, 'health-report.json'),
      envFile,
      json: true,
      doctor: true,
      fix: true,
    });

    expect(doctor.fixApplied).toBe(true);
    const nextEnv = await readFile(envFile, 'utf8');
    expect(nextEnv).toContain('DOMAIN_REGISTRY_PATH=.search/domain-registry.json');
    expect(nextEnv).toContain('FACTORY_WAGER_REQUIRED_HEADER=x-factory-domain-token');
    expect(nextEnv).toContain('FACTORY_WAGER_TOKEN_API=replace_me');
  });

  test('emits bun/wrangler secret command templates for missing tokens', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'domain-registry-doctor-secrets-'));
    const missingTokenEnvVar = `FACTORY_WAGER_TOKEN_API_MISSING_${Date.now()}`;
    delete process.env[missingTokenEnvVar];
    const reportsDir = join(dir, 'reports');
    const benchDir = join(reportsDir, 'search-benchmark');
    await mkdir(benchDir, { recursive: true });

    const registryPath = join(dir, 'domain-registry.json');
    const envFile = join(dir, '.env.factory-wager');
    await writeFile(
      registryPath,
      JSON.stringify(
        {
          version: '2026.02.08.1',
          domains: [
            {
              domain: 'api.factory-wager.com',
              zone: 'factory-wager.com',
              bucket: 'bun-secrets',
              prefix: 'domains/api.factory-wager/cloudflare',
              requiredHeader: 'x-factory-domain-token',
              tokenEnvVar: missingTokenEnvVar,
            },
          ],
        },
        null,
        2
      )
    );
    await writeFile(envFile, `${missingTokenEnvVar}=replace_me\n`);
    await writeFile(join(benchDir, 'latest.json'), JSON.stringify({ id: 'snap-1', path: './lib' }, null, 2));
    await writeFile(join(reportsDir, 'health-report.json'), JSON.stringify({ details: [] }, null, 2));

    const doctor = await runDomainRegistryDoctor({
      registryPath,
      latestPath: join(benchDir, 'latest.json'),
      healthReportPath: join(reportsDir, 'health-report.json'),
      envFile,
      json: true,
      doctor: true,
      fix: false,
      emitSecretsCommands: true,
    });

    expect(Array.isArray(doctor.secretCommands?.bunSecretsSet)).toBe(true);
    expect(Array.isArray(doctor.secretCommands?.wranglerSecretPut)).toBe(true);
    for (const cmd of doctor.secretCommands?.bunSecretsSet || []) {
      expect(cmd.startsWith('bun secrets set ')).toBe(true);
    }
    for (const cmd of doctor.secretCommands?.wranglerSecretPut || []) {
      expect(cmd.startsWith('wrangler secret put ')).toBe(true);
    }
  });
});

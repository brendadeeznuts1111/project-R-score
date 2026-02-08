import { describe, expect, test } from 'bun:test';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

async function makeRegistry(payload: unknown): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'domain-token-sync-'));
  await mkdir(join(dir, '.search'), { recursive: true });
  const registryPath = join(dir, '.search', 'domain-registry.json');
  await writeFile(registryPath, JSON.stringify(payload, null, 2));
  return registryPath;
}

describe('domain-token-sync error handling', () => {
  test('fails with placeholder token', async () => {
    const registryPath = await makeRegistry({
      domains: [{ domain: 'factory-wager.com', tokenEnvVar: 'FACTORY_WAGER_TOKEN_ROOT' }],
    });

    const proc = Bun.spawnSync(
      ['bun', join(process.cwd(), 'scripts', 'domain-token-sync.ts'), '--registry', registryPath, '--token', 'replace_me', '--json'],
      { stdout: 'pipe', stderr: 'pipe' }
    );

    expect(proc.exitCode).toBe(3);
    const stdout = new TextDecoder().decode(proc.stdout);
    const payload = JSON.parse(stdout) as any;
    expect(payload.ok).toBe(false);
    expect(payload.code).toBe('placeholder_token');
  });

  test('fails when registry has no token env vars', async () => {
    const registryPath = await makeRegistry({
      domains: [{ domain: 'factory-wager.com' }],
    });

    const proc = Bun.spawnSync(
      ['bun', join(process.cwd(), 'scripts', 'domain-token-sync.ts'), '--registry', registryPath, '--token', 'real-token-value', '--json'],
      { stdout: 'pipe', stderr: 'pipe' }
    );

    expect(proc.exitCode).toBe(4);
    const stdout = new TextDecoder().decode(proc.stdout);
    const payload = JSON.parse(stdout) as any;
    expect(payload.ok).toBe(false);
    expect(payload.code).toBe('missing_token_env_vars');
  });
});

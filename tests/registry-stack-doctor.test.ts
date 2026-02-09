import { describe, expect, test } from 'bun:test';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('registry-stack-doctor', () => {
  test('fix mode adds canonical keys to env and npmrc', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'registry-stack-doctor-'));
    const envPath = join(dir, '.env.registry');
    const npmrcPath = join(dir, '.npmrc');
    const cfgPath = join(dir, 'registry.config.json5');
    await writeFile(envPath, 'LOG_LEVEL=info\n');
    await writeFile(npmrcPath, 'strict-ssl=true\n');

    const proc = Bun.spawnSync(
      [
        'bun',
        'run',
        'scripts/registry-stack-doctor.ts',
        '--fix',
        '--env-file',
        envPath,
        '--npmrc-file',
        npmrcPath,
        '--registry-config',
        cfgPath,
        '--json',
      ],
      { cwd: process.cwd(), stdout: 'pipe', stderr: 'pipe' }
    );
    expect(proc.exitCode).toBe(0);

    const envRaw = await readFile(envPath, 'utf8');
    const npmrcRaw = await readFile(npmrcPath, 'utf8');
    const cfgRaw = await readFile(cfgPath, 'utf8');
    expect(envRaw).toContain('REGISTRY_URL=https://registry.factory-wager.com');
    expect(envRaw).toContain('R2_REGISTRY_BUCKET=npm-registry');
    expect(npmrcRaw).toContain('@factory-wager:registry=https://registry.factory-wager.com/');
    expect(cfgRaw).toContain('url: "https://registry.factory-wager.com"');
  });
});

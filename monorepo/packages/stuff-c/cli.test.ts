import { test, expect, afterAll } from 'bun:test';
import { healthCheck, seedUsers } from './index';

test('healthCheck returns ok:false for unreachable server', async () => {
  const result = await healthCheck('http://localhost:19999');
  expect(result.ok).toBe(false);
  expect(result.latencyMs).toBeGreaterThan(0);
});

test('CLI shows usage with no args', async () => {
  const proc = Bun.spawn(['bun', 'run', 'cli.ts'], {
    cwd: import.meta.dir,
    stdout: 'pipe',
  });
  const output = await new Response(proc.stdout).text();
  await proc.exited;
  expect(output).toContain('stuff — CLI for the stuff monorepo');
  expect(output).toContain('list');
  expect(output).toContain('update');
  expect(output).toContain('delete');
  expect(output).toContain('--json');
});

test('CLI validate accepts valid user JSON', async () => {
  const user = JSON.stringify({
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Alice',
    email: 'alice@example.com',
    role: 'admin',
    createdAt: '2026-01-01',
  });
  const proc = Bun.spawn(['bun', 'run', 'cli.ts', 'validate', user], {
    cwd: import.meta.dir,
    stdout: 'pipe',
  });
  const output = await new Response(proc.stdout).text();
  const exitCode = await proc.exited;
  expect(exitCode).toBe(0);
  expect(output).toContain('VALID');
});

test('CLI validate rejects bad JSON', async () => {
  const proc = Bun.spawn(['bun', 'run', 'cli.ts', 'validate', '{"name":""}'], {
    cwd: import.meta.dir,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const exitCode = await proc.exited;
  expect(exitCode).toBe(1);
});

test('CLI info shows version info', async () => {
  const proc = Bun.spawn(['bun', 'run', 'cli.ts', 'info'], {
    cwd: import.meta.dir,
    stdout: 'pipe',
  });
  const output = await new Response(proc.stdout).text();
  await proc.exited;
  expect(output).toContain('stuff-c');
  expect(output).toContain('stuff-a');
  expect(output).toContain('Bun');
});

test('CLI delete shows usage when no id', async () => {
  const proc = Bun.spawn(['bun', 'run', 'cli.ts', 'delete'], {
    cwd: import.meta.dir,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const exitCode = await proc.exited;
  const stderr = await new Response(proc.stderr).text();
  expect(exitCode).toBe(1);
  expect(stderr).toContain('Usage: stuff delete <id> [--yes]');
});

test('CLI update shows usage when args missing', async () => {
  const proc = Bun.spawn(['bun', 'run', 'cli.ts', 'update'], {
    cwd: import.meta.dir,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const exitCode = await proc.exited;
  const stderr = await new Response(proc.stderr).text();
  expect(exitCode).toBe(1);
  expect(stderr).toContain('Usage: stuff update <id> <json>');
});

test('CLI health --json outputs parseable JSON', async () => {
  const proc = Bun.spawn(['bun', 'run', 'cli.ts', 'health', '--json'], {
    cwd: import.meta.dir,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const output = await new Response(proc.stdout).text();
  await proc.exited;
  const parsed = JSON.parse(output);
  expect(typeof parsed.ok).toBe('boolean');
  expect(typeof parsed.latencyMs).toBe('number');
});

test('CLI info --json outputs parseable JSON', async () => {
  const proc = Bun.spawn(['bun', 'run', 'cli.ts', 'info', '--json'], {
    cwd: import.meta.dir,
    stdout: 'pipe',
  });
  const output = await new Response(proc.stdout).text();
  await proc.exited;
  const parsed = JSON.parse(output);
  expect(parsed['stuff-c']).toBeDefined();
  expect(parsed.runtime).toContain('Bun');
});

test('unknown command exits with code 1', async () => {
  const proc = Bun.spawn(['bun', 'run', 'cli.ts', 'nonexistent-command'], {
    cwd: import.meta.dir,
    stdout: 'pipe',
  });
  const exitCode = await proc.exited;
  expect(exitCode).toBe(1);
});

test('generate 0 outputs "Generated 0 users"', async () => {
  const proc = Bun.spawn(['bun', 'run', 'cli.ts', 'generate', '0'], {
    cwd: import.meta.dir,
    stdout: 'pipe',
  });
  const output = await new Response(proc.stdout).text();
  await proc.exited;
  expect(output).toContain('Generated 0 users');
});

test('delete --yes bypasses prompt', async () => {
  // --yes with unreachable server should still skip prompt and fail on fetch
  const proc = Bun.spawn(['bun', 'run', 'cli.ts', 'delete', 'some-id', '--yes'], {
    cwd: import.meta.dir,
    env: { ...process.env, STUFF_SERVER: 'http://localhost:19999' },
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const exitCode = await proc.exited;
  const stderr = await new Response(proc.stderr).text();
  // Should not prompt, just fail on connection
  expect(exitCode).toBe(1);
  expect(stderr).toContain('Cannot reach');
});

test('usage includes --yes', async () => {
  const proc = Bun.spawn(['bun', 'run', 'cli.ts'], {
    cwd: import.meta.dir,
    stdout: 'pipe',
  });
  const output = await new Response(proc.stdout).text();
  await proc.exited;
  expect(output).toContain('--yes');
});

// ── seedUsers coverage ──

const seedPort = 13579;
const seedServer = Bun.serve({
  port: seedPort,
  routes: {
    '/users/bulk': {
      POST: async (req) => {
        const body = await req.json();
        return Response.json({ created: Array.isArray(body) ? body.length : 0, errors: 0 });
      },
    },
  },
});

afterAll(() => seedServer.stop());

test('seedUsers sends users to server', async () => {
  const result = await seedUsers(`http://localhost:${seedPort}`, 3);
  expect(result.created).toBe(3);
  expect(result.errors).toBe(0);
  expect(result.durationMs).toBeGreaterThan(0);
});

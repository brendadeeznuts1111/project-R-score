import { test, expect } from 'bun:test';
import { healthCheck } from './index';

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

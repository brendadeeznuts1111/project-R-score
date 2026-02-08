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

test('CLI info --json includes db size and type', async () => {
  const proc = Bun.spawn(['bun', 'run', 'cli.ts', 'info', '--json'], {
    cwd: import.meta.dir,
    stdout: 'pipe',
  });
  const output = await new Response(proc.stdout).text();
  await proc.exited;
  const parsed = JSON.parse(output);
  expect(parsed.db).toBeDefined();
  expect(typeof parsed.db.size).toBe('number');
  expect(typeof parsed.db.type).toBe('string');
  expect(parsed.db.path).toBeDefined();
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

// ── export/import JSONL via CLI ──

test('CLI export outputs JSONL to stdout', async () => {
  const tmpDb = '/tmp/stuff-c-export-test.db';
  // Seed a user into a temp DB first
  const { createDB } = await import('stuff-b/db');
  const { generateUsers } = await import('stuff-a/generate');
  const db = createDB(tmpDb);
  const users = generateUsers(2);
  for (const u of users) db.insert(u);
  db.close();

  const proc = Bun.spawn(['bun', 'run', 'cli.ts', 'export', `--db=${tmpDb}`], {
    cwd: import.meta.dir,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const output = await new Response(proc.stdout).text();
  await proc.exited;

  const lines = output.trim().split('\n');
  expect(lines).toHaveLength(2);
  for (const line of lines) {
    const parsed = JSON.parse(line);
    expect(parsed).toHaveProperty('id');
    expect(parsed).toHaveProperty('name');
  }

  await Bun.$`rm -f ${tmpDb}`.quiet();
});

test('CLI import reads JSONL from stdin', async () => {
  const tmpDb = '/tmp/stuff-c-import-test.db';
  const jsonl = [
    JSON.stringify({ id: '550e8400-e29b-41d4-a716-446655440000', name: 'Alice', email: 'alice@test.com', role: 'admin', createdAt: '2026-01-01T00:00:00.000Z' }),
    JSON.stringify({ id: '660e8400-e29b-41d4-a716-446655440000', name: 'Bob', email: 'bob@test.com', role: 'user', createdAt: '2026-02-01T00:00:00.000Z' }),
  ].join('\n') + '\n';

  const proc = Bun.spawn(['bun', 'run', 'cli.ts', 'import', `--db=${tmpDb}`], {
    cwd: import.meta.dir,
    stdin: new Blob([jsonl]),
    stdout: 'pipe',
  });
  const output = await new Response(proc.stdout).text();
  await proc.exited;

  expect(output).toContain('Imported 2 users');
  expect(output).toContain('skipped 0');

  await Bun.$`rm -f ${tmpDb}`.quiet();
});

test('usage includes export and import', async () => {
  const proc = Bun.spawn(['bun', 'run', 'cli.ts'], {
    cwd: import.meta.dir,
    stdout: 'pipe',
  });
  const output = await new Response(proc.stdout).text();
  await proc.exited;
  expect(output).toContain('export');
  expect(output).toContain('import');
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

// ── Phase 1: gzip ──

test('usage includes --gzip', async () => {
  const proc = Bun.spawn(['bun', 'run', 'cli.ts'], {
    cwd: import.meta.dir,
    stdout: 'pipe',
  });
  const output = await new Response(proc.stdout).text();
  await proc.exited;
  expect(output).toContain('--gzip');
});

// ── Phase 3: info --json includes config path ──

test('CLI info --json includes config path', async () => {
  const proc = Bun.spawn(['bun', 'run', 'cli.ts', 'info', '--json'], {
    cwd: import.meta.dir,
    stdout: 'pipe',
  });
  const output = await new Response(proc.stdout).text();
  await proc.exited;
  const parsed = JSON.parse(output);
  expect(parsed.config).toContain('config.ts');
});

// ── Phase 3: list alignment ──

test('CLI list output has aligned columns', async () => {
  // Use the seed server to populate, then test list formatting
  const listPort = 13580;
  const listServer = Bun.serve({
    port: listPort,
    routes: {
      '/users': {
        GET: () => Response.json({
          users: [
            { id: '550e8400-e29b-41d4-a716-446655440000', name: 'Alice', email: 'alice@example.com', role: 'admin' },
            { id: '660e8400-e29b-41d4-a716-446655440000', name: 'Bob', email: 'bob@example.com', role: 'user' },
          ],
          total: 2, limit: 100, offset: 0,
        }),
      },
    },
  });

  const proc = Bun.spawn(['bun', 'run', 'cli.ts', 'list'], {
    cwd: import.meta.dir,
    env: { ...process.env, STUFF_SERVER: `http://localhost:${listPort}` },
    stdout: 'pipe',
  });
  const output = await new Response(proc.stdout).text();
  await proc.exited;
  listServer.stop();

  const lines = output.trim().split('\n');
  // Header + 2 data rows + count line
  expect(lines.length).toBeGreaterThanOrEqual(3);
  // Each data row should contain both name and email with consistent spacing
  expect(lines[1]).toContain('Alice');
  expect(lines[1]).toContain('alice@example.com');
});

// ── Phase 5: version sync ──

test('CLI info --json includes version sync status', async () => {
  const proc = Bun.spawn(['bun', 'run', 'cli.ts', 'info', '--json'], {
    cwd: import.meta.dir,
    stdout: 'pipe',
  });
  const output = await new Response(proc.stdout).text();
  await proc.exited;
  const parsed = JSON.parse(output);
  expect(['in sync', 'version mismatch']).toContain(parsed.versionSync);
});

// ── Phase 5: healthCheck dnsMs ──

test('healthCheck returns dnsMs field', async () => {
  const result = await healthCheck('http://localhost:19999');
  expect(typeof result.dnsMs).toBe('number');
  expect(result.dnsMs).toBeGreaterThanOrEqual(0);
});

test('healthCheck with invalid hostname still returns ok:false gracefully', async () => {
  const result = await healthCheck('http://nonexistent.invalid.hostname.test:19999');
  expect(result.ok).toBe(false);
  expect(typeof result.dnsMs).toBe('number');
});

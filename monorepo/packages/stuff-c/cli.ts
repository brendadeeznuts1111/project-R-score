#!/usr/bin/env bun
import { validateUser, safeValidateUser } from 'stuff-a';
import { hashUser } from 'stuff-a/hash';
import { generateUser, generateUsers } from 'stuff-a/generate';
import {
  ROUTES, HEADERS, LIMITS, DB, AUTH,
  serverUrl, wsUrl,
} from 'stuff-a/config';
import { createDB } from 'stuff-b/db';
import { healthCheck, seedUsers } from './index';

const argv = process.argv.slice(2);

// Extract global --json flag
const jsonIdx = argv.indexOf('--json');
const jsonOutput = jsonIdx !== -1;
if (jsonIdx !== -1) argv.splice(jsonIdx, 1);

const [cmd, ...args] = argv;
const SERVER = process.env.STUFF_SERVER ?? serverUrl();

function output(data: unknown, humanFn: (d: any) => void): void {
  if (jsonOutput) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    humanFn(data);
  }
}

function flag(name: string): string | undefined {
  const prefix = `--${name}=`;
  const arg = args.find(a => a.startsWith(prefix));
  return arg?.slice(prefix.length);
}

const usage = `stuff — CLI for the stuff monorepo

Usage:
  stuff health                    Check server health
  stuff validate <json>           Validate a user JSON string
  stuff hash <json>               Hash a user JSON string
  stuff seed <count>              Seed N random users to server
  stuff generate <count>          Generate random users (local, no server)
  stuff metrics                   Show server metrics
  stuff list [--role=] [--search=] [--limit=]  List/search users
  stuff update <id> <json>        Update user (PATCH)
  stuff delete <id>               Delete user by ID
  stuff watch                     Watch server events via WebSocket
  stuff serve                     Start stuff-b server as child process
  stuff load [total] [concurrency]  HTTP load test against server
  stuff info                      Show monorepo info

Options:
  --json                          Output as JSON (works with health, metrics, list, delete, update, info)
  STUFF_SERVER=<url>              Server URL (default: ${serverUrl()})
  STUFF_DB_PATH=<path>            Database path (default: ${DB.DEFAULT_PATH})
  ${AUTH.API_TOKEN_ENV}=<hash>    Bcrypt hash for bearer token auth`;

switch (cmd) {
  case 'health': {
    const result = await healthCheck(SERVER);
    output(result, (r) => {
      console.log(r.ok
        ? `OK  ${SERVER}  ${r.latencyMs.toFixed(1)}ms`
        : `FAIL  ${SERVER}  ${r.latencyMs.toFixed(1)}ms`);
    });
    process.exit(result.ok ? 0 : 1);
    break;
  }

  case 'validate': {
    const json = args[0];
    if (!json) { console.error('Missing JSON argument'); process.exit(1); }
    const result = safeValidateUser(JSON.parse(json));
    if (result.success) {
      console.log('VALID');
      console.log(Bun.inspect(result.data, { depth: 4 }));
    } else {
      console.log('INVALID');
      console.log(Bun.inspect(result.error, { depth: 4 }));
      process.exit(1);
    }
    break;
  }

  case 'hash': {
    const json = args[0];
    if (!json) { console.error('Missing JSON argument'); process.exit(1); }
    const user = validateUser(JSON.parse(json));
    console.log(hashUser(user));
    break;
  }

  case 'seed': {
    const count = parseInt(args[0] ?? '10', 10);
    console.log(`Seeding ${count} users to ${SERVER}...`);
    const result = await seedUsers(SERVER, count);
    console.log(`Created: ${result.created}  Errors: ${result.errors}  Duration: ${result.durationMs.toFixed(1)}ms`);
    break;
  }

  case 'generate': {
    const count = parseInt(args[0] ?? '5', 10);
    const users = generateUsers(count);
    for (const u of users) {
      console.log(`${hashUser(u)}  ${u.role.padEnd(6)}  ${u.name}  <${u.email}>`);
    }
    console.log(`\nGenerated ${count} users`);
    break;
  }

  case 'metrics': {
    try {
      const res = await fetch(`${SERVER}${ROUTES.METRICS}`);
      const metrics = await res.json() as { count: number; sizeBytes: number; path: string; logs: unknown[] };
      output(metrics, (m) => {
        console.log(`Server: ${SERVER}`);
        console.log(`  Users: ${m.count}`);
        console.log(`  DB size: ${(m.sizeBytes / 1024).toFixed(1)} KB`);
        console.log(`  DB path: ${m.path}`);
        console.log(`  Request logs: ${m.logs.length}`);
      });
    } catch {
      console.error(`Cannot reach ${SERVER}`);
      process.exit(1);
    }
    break;
  }

  case 'list': {
    try {
      const params = new URLSearchParams();
      const role = flag('role');
      const search = flag('search');
      const limit = flag('limit');
      if (role) params.set('role', role);
      if (search) params.set('search', search);
      if (limit) params.set('limit', limit);
      const qs = params.toString();
      const url = `${SERVER}${ROUTES.USERS}${qs ? `?${qs}` : ''}`;
      const res = await fetch(url);
      const users = await res.json() as { id: string; name: string; email: string; role: string }[];
      output(users, (list) => {
        if (list.length === 0) {
          console.log('No users found.');
          return;
        }
        console.log(`${'ID'.padEnd(38)} ${'NAME'.padEnd(20)} ${'ROLE'.padEnd(8)} EMAIL`);
        for (const u of list) {
          console.log(`${u.id.padEnd(38)} ${u.name.padEnd(20)} ${u.role.padEnd(8)} ${u.email}`);
        }
        console.log(`\n${list.length} user(s)`);
      });
    } catch {
      console.error(`Cannot reach ${SERVER}`);
      process.exit(1);
    }
    break;
  }

  case 'delete': {
    const id = args[0];
    if (!id) {
      console.error('Usage: stuff delete <id>');
      process.exit(1);
    }
    try {
      const res = await fetch(`${SERVER}/users/${id}`, { method: 'DELETE' });
      const body = await res.json();
      output(body, (b) => {
        if (res.status === 200) {
          console.log(`Deleted user ${id}`);
        } else {
          console.error(`Failed: ${b.error ?? 'unknown error'}`);
          process.exit(1);
        }
      });
    } catch {
      console.error(`Cannot reach ${SERVER}`);
      process.exit(1);
    }
    break;
  }

  case 'update': {
    const id = args[0];
    const json = args[1];
    if (!id || !json) {
      console.error('Usage: stuff update <id> <json>');
      process.exit(1);
    }
    try {
      const res = await fetch(`${SERVER}/users/${id}`, {
        method: 'PATCH',
        headers: HEADERS.JSON,
        body: json,
      });
      const body = await res.json();
      output(body, (b) => {
        if (res.status === 200) {
          console.log(`Updated user ${id}:`);
          console.log(`  Name:  ${b.name}`);
          console.log(`  Email: ${b.email}`);
          console.log(`  Role:  ${b.role}`);
        } else {
          console.error(`Failed: ${b.error ?? 'unknown error'}`);
          process.exit(1);
        }
      });
    } catch {
      console.error(`Cannot reach ${SERVER}`);
      process.exit(1);
    }
    break;
  }

  case 'watch': {
    const wsTarget = `${SERVER.replace(/^http/, 'ws')}${ROUTES.WS}`;
    console.log(`Connecting to ${wsTarget}...`);
    const ws = new WebSocket(wsTarget);
    ws.onopen = () => console.log('Connected. Watching for events...\n');
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data as string);
      const time = new Date(msg.ts).toISOString().slice(11, 19);
      console.log(`[${time}] ${msg.event}  ${JSON.stringify(msg.data)}`);
    };
    ws.onclose = () => { console.log('Disconnected'); process.exit(0); };
    ws.onerror = () => { console.error(`Cannot connect to ${wsTarget}`); process.exit(1); };
    await new Promise(() => {});
    break;
  }

  case 'serve': {
    const serverPath = import.meta.dir + '/../stuff-b/server.ts';
    console.log(`Starting stuff-b server...`);
    const proc = Bun.spawn(['bun', 'run', serverPath], {
      env: { ...process.env },
      stdout: 'inherit',
      stderr: 'inherit',
    });

    // Wait for server to be ready
    let ready = false;
    for (let i = 0; i < 30; i++) {
      await Bun.sleep(100);
      try {
        const res = await fetch(`${SERVER}${ROUTES.HEALTH}`);
        if (res.status === 200) { ready = true; break; }
      } catch {}
    }
    if (ready) {
      console.log(`\nServer ready at ${SERVER}`);
    } else {
      console.error('Server failed to start within 3s');
    }

    // Keep alive until child exits or Ctrl+C
    process.on('SIGINT', () => proc.kill());
    process.on('SIGTERM', () => proc.kill());
    await proc.exited;
    break;
  }

  case 'load': {
    const total = parseInt(args[0] ?? '100', 10);
    const concurrency = parseInt(args[1] ?? String(LIMITS.LOAD_TEST_DEFAULT_CONCURRENCY), 10);
    console.log(`Load testing ${SERVER} — ${total} requests, ${concurrency} concurrent\n`);

    // Verify server is up
    const check = await healthCheck(SERVER);
    if (!check.ok) {
      console.error(`Server unreachable at ${SERVER}`);
      process.exit(1);
    }

    const latencies: number[] = [];
    let errors = 0;
    let completed = 0;
    const t0 = Bun.nanoseconds();

    async function sendRequest() {
      while (completed < total) {
        const idx = completed++;
        const user = generateUsers(1)[0];
        const start = Bun.nanoseconds();
        try {
          const res = await fetch(`${SERVER}${ROUTES.USERS}`, {
            method: 'POST',
            headers: HEADERS.JSON,
            body: JSON.stringify({ ...user, createdAt: user.createdAt.toISOString() }),
          });
          const ms = (Bun.nanoseconds() - start) / 1e6;
          latencies.push(ms);
          if (res.status !== 201) errors++;
        } catch {
          errors++;
        }
      }
    }

    // Run concurrent workers
    await Promise.all(Array.from({ length: concurrency }, () => sendRequest()));
    const totalMs = (Bun.nanoseconds() - t0) / 1e6;

    latencies.sort((a, b) => a - b);
    const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const p50 = latencies[Math.floor(latencies.length * 0.5)];
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    const p99 = latencies[Math.floor(latencies.length * 0.99)];
    const rps = (total / totalMs) * 1000;

    console.log(`Results:`);
    console.log(`  Total:    ${total} requests in ${totalMs.toFixed(0)}ms`);
    console.log(`  RPS:      ${rps.toFixed(0)} req/s`);
    console.log(`  Errors:   ${errors}`);
    console.log(`  Latency:`);
    console.log(`    avg:    ${avg.toFixed(2)}ms`);
    console.log(`    p50:    ${p50.toFixed(2)}ms`);
    console.log(`    p95:    ${p95.toFixed(2)}ms`);
    console.log(`    p99:    ${p99.toFixed(2)}ms`);
    console.log(`    min:    ${latencies[0].toFixed(2)}ms`);
    console.log(`    max:    ${latencies[latencies.length - 1].toFixed(2)}ms`);
    break;
  }

  case 'info': {
    const root = await Bun.file(import.meta.dir + '/package.json').json();
    const stuffA = await Bun.file(import.meta.dir + '/../stuff-a/package.json').json();
    const stuffB = await Bun.file(import.meta.dir + '/../stuff-b/package.json').json();
    const data = {
      'stuff-c': root.version,
      'stuff-a': { version: stuffA.version, zod: stuffA.dependencies.zod },
      'stuff-b': { version: stuffB.version },
      server: SERVER,
      runtime: `Bun ${Bun.version}`,
    };
    output(data, () => {
      console.log(`stuff-c  v${root.version}`);
      console.log(`  stuff-a  v${stuffA.version}  (zod ${stuffA.dependencies.zod})`);
      console.log(`  stuff-b  v${stuffB.version}  (depends on stuff-a)`);
      console.log(`  server   ${SERVER}`);
      console.log(`  runtime  Bun ${Bun.version}`);
    });
    break;
  }

  default:
    console.log(usage);
    process.exit(cmd ? 1 : 0);
}

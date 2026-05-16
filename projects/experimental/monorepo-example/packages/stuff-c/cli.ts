#!/usr/bin/env bun
import { validateUser, safeValidateUser } from 'stuff-a';
import { hashUser } from 'stuff-a/hash';
import { generateUser, generateUsers } from 'stuff-a/generate';
import {
  ROUTES, HEADERS, LIMITS, DB, AUTH, CONFIG_PATH,
  serverUrl, wsUrl,
} from 'stuff-a/config';
import { createDB } from 'stuff-b/db';
import { exportJSONL, importJSONL, exportGzip, importGzip } from 'stuff-b/stream';
import { healthCheck, seedUsers } from './index';
import { green, red, yellow, cyan, bold, dim, setStripColors } from './colors';

const argv = process.argv.slice(2);

// Extract global --json flag
const jsonIdx = argv.indexOf('--json');
const jsonOutput = jsonIdx !== -1;
if (jsonIdx !== -1) argv.splice(jsonIdx, 1);
if (jsonOutput) setStripColors(true);

// Extract --yes flag
const yesIdx = argv.indexOf('--yes');
const yesFlag = yesIdx !== -1;
if (yesIdx !== -1) argv.splice(yesIdx, 1);

const [cmd, ...args] = argv;
const SERVER = process.env.STUFF_SERVER ?? serverUrl();

function pad(text: string, width: number): string {
  const w = Bun.stringWidth(text);
  return text + ' '.repeat(Math.max(0, width - w));
}

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
  stuff delete <id> [--yes]        Delete user by ID
  stuff export [--db=] [--gzip=<file>]  Export users as JSONL (stdout) or gzip (file)
  stuff import [--db=] [<file.gz>]     Import JSONL from stdin or gzip file
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
        ? `${green('OK')}  ${SERVER}  ${r.latencyMs.toFixed(1)}ms`
        : `${red('FAIL')}  ${SERVER}  ${r.latencyMs.toFixed(1)}ms`);
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
        console.log(`${cyan('Server:')} ${SERVER}`);
        console.log(`  ${cyan('Users:')} ${m.count}`);
        console.log(`  ${cyan('DB size:')} ${(m.sizeBytes / 1024).toFixed(1)} KB`);
        console.log(`  ${cyan('DB path:')} ${m.path}`);
        console.log(`  ${cyan('Request logs:')} ${m.logs.length}`);
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
      const body = await res.json() as { users: { id: string; name: string; email: string; role: string }[]; total: number; limit: number; offset: number };
      const { users, total } = body;
      output(body, () => {
        if (users.length === 0) {
          console.log('No users found.');
          return;
        }
        console.log(`${pad(cyan('ID'), 38)} ${pad(cyan('NAME'), 20)} ${pad(cyan('ROLE'), 8)} ${cyan('EMAIL')}`);
        for (const u of users) {
          console.log(`${pad(dim(u.id), 38)} ${pad(u.name, 20)} ${pad(u.role, 8)} ${u.email}`);
        }
        console.log(`\n${users.length} of ${total} user(s)`);
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
      console.error('Usage: stuff delete <id> [--yes]');
      process.exit(1);
    }
    if (!yesFlag && !jsonOutput) {
      const answer = prompt(`Delete user ${id}? [y/N]`);
      if (answer?.toLowerCase() !== 'y') {
        console.log('Cancelled');
        process.exit(0);
      }
    }
    try {
      const res = await fetch(`${SERVER}/users/${id}`, { method: 'DELETE' });
      const body = await res.json();
      output(body, (b) => {
        if (res.status === 200) {
          console.log(green(`Deleted user ${id}`));
        } else {
          console.error(red(`Failed: ${b.error ?? 'unknown error'}`));
          process.exit(1);
        }
      });
    } catch {
      console.error(red(`Cannot reach ${SERVER}`));
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
          console.log(green(`Updated user ${id}:`));
          console.log(`  Name:  ${b.name}`);
          console.log(`  Email: ${b.email}`);
          console.log(`  Role:  ${b.role}`);
        } else {
          console.error(red(`Failed: ${b.error ?? 'unknown error'}`));
          process.exit(1);
        }
      });
    } catch {
      console.error(`Cannot reach ${SERVER}`);
      process.exit(1);
    }
    break;
  }

  case 'export': {
    const dbPath = flag('db') ?? DB.DEFAULT_PATH;
    const gzipPath = flag('gzip');
    const db = createDB(dbPath);
    if (gzipPath) {
      const count = await exportGzip(db, gzipPath);
      db.close();
      if (!jsonOutput) {
        console.error(`Exported ${count} users as gzip to ${gzipPath}`);
      }
    } else {
      const sink = Bun.stdout.writer();
      const count = await exportJSONL(db, sink);
      await sink.flush();
      db.close();
      if (!jsonOutput) {
        console.error(`Exported ${count} users as JSONL`);
      }
    }
    break;
  }

  case 'import': {
    const dbPath = flag('db') ?? DB.DEFAULT_PATH;
    const db = createDB(dbPath);
    const inputFile = args[0];
    if (inputFile && inputFile.endsWith('.gz')) {
      const result = await importGzip(inputFile, db);
      db.close();
      if (jsonOutput) {
        console.log(JSON.stringify(result));
      } else {
        console.log(`Imported ${result.imported} users from gzip, skipped ${result.skipped}`);
      }
    } else {
      const stream = Bun.stdin.stream();
      const result = await importJSONL(db, stream);
      db.close();
      if (jsonOutput) {
        console.log(JSON.stringify(result));
      } else {
        console.log(`Imported ${result.imported} users, skipped ${result.skipped}`);
      }
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
    const dbFile = Bun.file(DB.DEFAULT_PATH);
    const dbExists = await dbFile.exists();
    const versionSync = Bun.semver.order(stuffA.version, stuffB.version) === 0
      ? 'in sync'
      : 'version mismatch';
    const data = {
      'stuff-c': root.version,
      'stuff-a': { version: stuffA.version, zod: stuffA.dependencies.zod },
      'stuff-b': { version: stuffB.version },
      versionSync,
      server: SERVER,
      runtime: `Bun ${Bun.version}`,
      config: CONFIG_PATH,
      db: {
        path: DB.DEFAULT_PATH,
        size: dbExists ? dbFile.size : 0,
        type: dbFile.type,
      },
    };
    output(data, () => {
      console.log(`stuff-c  v${root.version}`);
      console.log(`  stuff-a  v${stuffA.version}  (zod ${stuffA.dependencies.zod})`);
      console.log(`  stuff-b  v${stuffB.version}  (depends on stuff-a)`);
      console.log(`  server   ${SERVER}`);
      console.log(`  runtime  Bun ${Bun.version}`);
      console.log(`  config   ${CONFIG_PATH}`);
      if (dbExists) {
        console.log(`  db       ${DB.DEFAULT_PATH}  (${(dbFile.size / 1024).toFixed(1)} KB, ${dbFile.type})`);
      } else {
        console.log(`  db       ${DB.DEFAULT_PATH}  (not created)`);
      }
    });
    break;
  }

  default:
    console.log(usage);
    process.exit(cmd ? 1 : 0);
}

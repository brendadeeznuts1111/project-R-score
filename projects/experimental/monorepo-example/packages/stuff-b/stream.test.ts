import { test, expect, beforeEach, afterAll } from 'bun:test';
import { createDB } from './db';
import { exportJSONL, importJSONL, exportGzip, importGzip } from './stream';
import { generateUsers } from 'stuff-a/generate';
import { validateUser } from 'stuff-a';

const dbPath = '/tmp/stuff-b-stream-test.db';
const exportPath = '/tmp/stuff-b-stream-export.jsonl';
const gzipPath = '/tmp/stuff-b-stream-export.jsonl.gz';

let db: ReturnType<typeof createDB>;

beforeEach(async () => {
  db = createDB(':memory:');
  // Clean up export file between tests to avoid stale data
  if (await Bun.file(exportPath).exists()) {
    await Bun.$`rm -f ${exportPath}`.quiet();
  }
  if (await Bun.file(gzipPath).exists()) {
    await Bun.$`rm -f ${gzipPath}`.quiet();
  }
});

afterAll(async () => {
  await Bun.$`rm -f ${dbPath} ${exportPath} ${gzipPath}`.quiet();
});

test('exportJSONL writes valid JSONL to file sink', async () => {
  const users = generateUsers(5);
  for (const u of users) db.insert(u);

  const sink = Bun.file(exportPath).writer();
  const count = await exportJSONL(db, sink);
  sink.end();

  expect(count).toBe(5);

  const content = await Bun.file(exportPath).text();
  const lines = content.trim().split('\n');
  expect(lines).toHaveLength(5);

  for (const line of lines) {
    const parsed = JSON.parse(line);
    expect(parsed).toHaveProperty('id');
    expect(parsed).toHaveProperty('name');
    expect(parsed).toHaveProperty('email');
    expect(parsed).toHaveProperty('role');
    expect(parsed).toHaveProperty('createdAt');
  }
});

test('exportJSONL returns 0 for empty db', async () => {
  const sink = Bun.file(exportPath).writer();
  const count = await exportJSONL(db, sink);
  sink.end();
  expect(count).toBe(0);
});

test('importJSONL reads JSONL stream into db', async () => {
  const users = generateUsers(3);
  const jsonl = users.map(u => JSON.stringify({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
  })).join('\n') + '\n';

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(jsonl));
      controller.close();
    },
  });

  const result = await importJSONL(db, stream);
  expect(result.imported).toBe(3);
  expect(result.skipped).toBe(0);
  expect(db.count()).toBe(3);
});

test('importJSONL skips invalid lines', async () => {
  const valid = JSON.stringify({
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Alice',
    email: 'alice@example.com',
    role: 'admin',
    createdAt: '2026-01-01T00:00:00.000Z',
  });
  const jsonl = `${valid}\n{bad json}\nnot json at all\n`;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(jsonl));
      controller.close();
    },
  });

  const result = await importJSONL(db, stream);
  expect(result.imported).toBe(1);
  expect(result.skipped).toBe(2);
});

test('exportJSONL → importJSONL round-trips', async () => {
  // Insert users into source db
  const users = generateUsers(4);
  for (const u of users) db.insert(u);

  // Export to file
  const sink = Bun.file(exportPath).writer();
  await exportJSONL(db, sink);
  sink.end();

  // Import into a fresh db
  const db2 = createDB(':memory:');
  const fileStream = Bun.file(exportPath).stream();
  const result = await importJSONL(db2, fileStream);

  expect(result.imported).toBe(4);
  expect(result.skipped).toBe(0);
  expect(db2.count()).toBe(4);

  // Verify data integrity
  for (const u of users) {
    const loaded = db2.get(u.id);
    expect(loaded).not.toBeNull();
    expect(loaded!.name).toBe(u.name);
    expect(loaded!.email).toBe(u.email);
  }
});

test('importJSONL handles chunked stream', async () => {
  const user = {
    id: '660e8400-e29b-41d4-a716-446655440000',
    name: 'Bob',
    email: 'bob@example.com',
    role: 'user',
    createdAt: '2026-02-01T00:00:00.000Z',
  };
  const line = JSON.stringify(user) + '\n';
  const encoder = new TextEncoder();

  // Split the line into multiple small chunks
  const mid = Math.floor(line.length / 2);
  const chunk1 = encoder.encode(line.slice(0, mid));
  const chunk2 = encoder.encode(line.slice(mid));

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(chunk1);
      controller.enqueue(chunk2);
      controller.close();
    },
  });

  const result = await importJSONL(db, stream);
  expect(result.imported).toBe(1);
  expect(result.skipped).toBe(0);
});

test('exportGzip produces valid gzip file', async () => {
  const users = generateUsers(5);
  for (const u of users) db.insert(u);

  const count = await exportGzip(db, gzipPath);
  expect(count).toBe(5);

  const bytes = await Bun.file(gzipPath).bytes();
  // gzip magic number: 0x1f 0x8b
  expect(bytes[0]).toBe(0x1f);
  expect(bytes[1]).toBe(0x8b);
});

test('importGzip reads gzip back into db', async () => {
  const users = generateUsers(3);
  for (const u of users) db.insert(u);
  await exportGzip(db, gzipPath);

  const db2 = createDB(':memory:');
  const result = await importGzip(gzipPath, db2);
  expect(result.imported).toBe(3);
  expect(result.skipped).toBe(0);
  expect(db2.count()).toBe(3);
});

test('exportGzip → importGzip round-trip preserves data', async () => {
  const users = generateUsers(4);
  for (const u of users) db.insert(u);
  await exportGzip(db, gzipPath);

  const db2 = createDB(':memory:');
  await importGzip(gzipPath, db2);

  for (const u of users) {
    const loaded = db2.get(u.id);
    expect(loaded).not.toBeNull();
    expect(loaded!.name).toBe(u.name);
    expect(loaded!.email).toBe(u.email);
  }
});

test('importGzip skips corrupt data gracefully', async () => {
  // Write non-gzip data to the file
  await Bun.write(gzipPath, 'this is not gzip data');
  const db2 = createDB(':memory:');
  expect(() => importGzip(gzipPath, db2)).toThrow();
});

test('importJSONL with readableStreamToText refactor still round-trips', async () => {
  const users = generateUsers(3);
  for (const u of users) db.insert(u);

  const sink = Bun.file(exportPath).writer();
  await exportJSONL(db, sink);
  sink.end();

  const db2 = createDB(':memory:');
  const fileStream = Bun.file(exportPath).stream();
  const result = await importJSONL(db2, fileStream);
  expect(result.imported).toBe(3);
  expect(db2.count()).toBe(3);
});

test('large importJSONL (1000 lines) completes', async () => {
  const users = generateUsers(1000);
  const jsonl = users.map(u => JSON.stringify({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
  })).join('\n') + '\n';

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(jsonl));
      controller.close();
    },
  });

  const result = await importJSONL(db, stream);
  expect(result.imported).toBe(1000);
  expect(result.skipped).toBe(0);
  expect(db.count()).toBe(1000);
});

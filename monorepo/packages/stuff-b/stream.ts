import type { FileSink } from 'bun';
import type { User } from 'stuff-a';
import type { UserDB } from './db';

/**
 * Stream all users from db as JSONL to a FileSink (e.g. Bun.stdout.writer()).
 * Returns the number of rows written.
 */
export async function exportJSONL(db: UserDB, sink: FileSink, batchSize = 500): Promise<number> {
  let offset = 0;
  let total = 0;

  while (true) {
    const batch = db.list(batchSize, offset);
    if (batch.length === 0) break;

    for (const user of batch) {
      const line = JSON.stringify({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
      }) + '\n';
      sink.write(line);
    }

    total += batch.length;
    offset += batchSize;

    if (batch.length < batchSize) break;
  }

  await sink.flush();
  return total;
}

/**
 * Import users from a JSONL ReadableStream (e.g. Bun.stdin.stream()) into db.
 * Uses Bun.readableStreamToText() for simplified stream-to-string conversion.
 * Returns { imported, skipped } counts.
 */
export async function importJSONL(
  db: UserDB,
  stream: ReadableStream<Uint8Array>,
): Promise<{ imported: number; skipped: number }> {
  let imported = 0;
  let skipped = 0;

  const text = await Bun.readableStreamToText(stream);
  const lines = text.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;

    try {
      const obj = JSON.parse(trimmed);
      if (typeof obj.createdAt === 'string') {
        obj.createdAt = new Date(obj.createdAt);
      }
      db.insert(obj);
      imported++;
    } catch {
      skipped++;
    }
  }

  return { imported, skipped };
}

/**
 * Export all users from db as gzip-compressed JSONL.
 * Uses Bun.gzipSync() for compression and Bun.write() for output.
 */
export async function exportGzip(db: UserDB, path: string, batchSize = 500): Promise<number> {
  let offset = 0;
  let total = 0;
  let jsonl = '';

  while (true) {
    const batch = db.list(batchSize, offset);
    if (batch.length === 0) break;

    for (const user of batch) {
      jsonl += JSON.stringify({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
      }) + '\n';
    }

    total += batch.length;
    offset += batchSize;

    if (batch.length < batchSize) break;
  }

  const compressed = Bun.gzipSync(Buffer.from(jsonl));
  await Bun.write(path, compressed);
  return total;
}

/**
 * Import users from a gzip-compressed JSONL file into db.
 * Uses Bun.file().bytes() + Bun.gunzipSync() for decompression.
 */
export async function importGzip(
  path: string,
  db: UserDB,
): Promise<{ imported: number; skipped: number }> {
  let imported = 0;
  let skipped = 0;

  const compressed = await Bun.file(path).bytes();
  const decompressed = Bun.gunzipSync(compressed);
  const text = new TextDecoder().decode(decompressed);
  const lines = text.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;

    try {
      const obj = JSON.parse(trimmed);
      if (typeof obj.createdAt === 'string') {
        obj.createdAt = new Date(obj.createdAt);
      }
      db.insert(obj);
      imported++;
    } catch {
      skipped++;
    }
  }

  return { imported, skipped };
}

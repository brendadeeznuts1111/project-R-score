#!/usr/bin/env bun

// ab-persistence-worker.ts — Snapshot persistence via postMessage
// Offloads zstd compress + SQLite write from the request hot path.

import { serialize } from "bun:jsc";
import { Database } from "bun:sqlite";
import type { ABSnapshotState } from "../../examples/ab-variant-types.ts";

// ── Types ───────────────────────────────────────────────────────────────────

interface PersistMessage {
	type: "persist";
	sessionId: string;
	state: ABSnapshotState;
}

interface LoadMessage {
	type: "load";
	sessionId: string;
	requestId: string;
}

interface PingMessage {
	type: "ping";
}

type WorkerMessage = PersistMessage | LoadMessage | PingMessage;

// ── SQLite Setup ────────────────────────────────────────────────────────────

const DB_PATH = process.env.AB_SNAPSHOT_DB_PATH || "./.claude/data/ab-snapshots.db";

let db: Database | null = null;

function getDb(): Database {
	if (!db) {
		db = new Database(DB_PATH);
		db.run(`
      CREATE TABLE IF NOT EXISTS snapshots (
        id TEXT PRIMARY KEY,
        data BLOB NOT NULL,
        variant TEXT,
        pool_size INTEGER,
        created_at INTEGER DEFAULT (unixepoch())
      )
    `);
		db.run("CREATE INDEX IF NOT EXISTS idx_snapshots_created ON snapshots(created_at)");
	}
	return db;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function toArrayBuffer(buf: ArrayBuffer | SharedArrayBuffer): ArrayBuffer {
	if (buf instanceof ArrayBuffer) return buf;
	const ab = new ArrayBuffer(buf.byteLength);
	new Uint8Array(ab).set(new Uint8Array(buf));
	return ab;
}

// ── Message Handler ─────────────────────────────────────────────────────────

declare var self: Worker;

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
	const msg = event.data;

	switch (msg.type) {
		case "persist": {
			const { sessionId, state } = msg;
			const database = getDb();

			const serialized = serialize(state);
			const arrayBuffer = toArrayBuffer(serialized);
			const compressed = Bun.zstdCompressSync(new Uint8Array(arrayBuffer));

			database.run(
				"INSERT OR REPLACE INTO snapshots (id, data, variant, pool_size) VALUES (?, ?, ?, ?)",
				[sessionId, compressed, state.variant, state.poolSize],
			);

			self.postMessage({
				type: "persisted",
				sessionId,
				snapshotSize: compressed.byteLength,
				variant: state.variant,
				poolSize: state.poolSize,
			});
			break;
		}

		case "load": {
			const { sessionId, requestId } = msg;
			const database = getDb();

			const row = database
				.query<{ data: Uint8Array; variant: string; pool_size: number }, [string]>(
					"SELECT data, variant, pool_size FROM snapshots WHERE id = ?",
				)
				.get(sessionId);

			if (!row) {
				self.postMessage({
					type: "loaded",
					requestId,
					sessionId,
					snapshot: null,
				});
				break;
			}

			const data = row.data instanceof Uint8Array ? row.data : new Uint8Array(row.data);
			const decompressed = Bun.zstdDecompressSync(data);
			const { deserialize } = require("bun:jsc");
			const state = deserialize(decompressed.buffer) as ABSnapshotState;

			self.postMessage({
				type: "loaded",
				requestId,
				sessionId,
				snapshot: state,
			});
			break;
		}

		case "ping": {
			self.postMessage({ type: "pong", ts: Date.now() });
			break;
		}
	}
};

self.postMessage({ type: "ready" });

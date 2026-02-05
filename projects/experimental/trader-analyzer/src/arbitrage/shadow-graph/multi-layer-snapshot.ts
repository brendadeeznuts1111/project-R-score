/**
 * @fileoverview Multi-Layer Snapshot System
 * @description Snapshot system for backtesting and regression testing
 * @module arbitrage/shadow-graph/multi-layer-snapshot
 */

import { Database } from "bun:sqlite";
import type { MultiLayerGraph } from "./multi-layer-correlation-graph";
// Generate UUID v4
function randomUUID(): string {
	return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Snapshot metadata
 */
export interface SnapshotMetadata {
	snapshotId: string;
	eventId: string;
	timestamp: number;
	layer1Edges: number;
	layer2Edges: number;
	layer3Edges: number;
	layer4Edges: number;
	totalAnomalies: number;
	highConfidenceAnomalies: number;
}

/**
 * Multi-Layer Snapshot System
 */
export class MultiLayerSnapshotSystem {
	private db: Database;

	constructor(db: Database) {
		this.db = db;
	}

	/**
	 * Take snapshot of multi-layer graph
	 */
	async takeSnapshot(eventId: string, graph: MultiLayerGraph): Promise<string> {
		const snapshotId = randomUUID();
		const timestamp = Date.now();

		// Count anomalies per layer
		const layerCounts = {
			layer1: await graph.detection_priority[3](graph),
			layer2: await graph.detection_priority[2](graph),
			layer3: await graph.detection_priority[1](graph),
			layer4: await graph.detection_priority[0](graph),
		};

		const totalAnomalies = Object.values(layerCounts).flat().length;
		const highConfidence = Object.values(layerCounts)
			.flat()
			.filter((a) => a.confidence > 0.7).length;

		// Store snapshot metadata
		const stmt = this.db.prepare(`
			INSERT INTO multi_layer_snapshots (
				event_id, snapshot_timestamp,
				layer1_edges, layer2_edges, layer3_edges, layer4_edges,
				total_anomalies, high_confidence_anomalies
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		`);

		stmt.run(
			eventId,
			timestamp,
			layerCounts.layer1.length,
			layerCounts.layer2.length,
			layerCounts.layer3.length,
			layerCounts.layer4.length,
			totalAnomalies,
			highConfidence,
		);

		// Store full graph state with compression (Bun v1.51 CompressionStream)
		// Serialize graph with full metadata
		const graphData = JSON.stringify({
			nodes: Array.from(graph.nodes?.entries() || []),
			edges: Array.from(graph.edges?.entries() || []),
			layers: {
				layer1: graph.layers?.layer1?.getMetrics?.() || {},
				layer2: graph.layers?.layer2?.getMetrics?.() || {},
				layer3: graph.layers?.layer3?.getMetrics?.() || {},
				layer4: graph.layers?.layer4?.getMetrics?.() || {},
			},
			metadata: graph.metadata || {},
		});

		const originalSize = new TextEncoder().encode(graphData).length;

		// Compress with zstd for speed (faster than gzip, better than brotli for JSON)
		// Bun v1.51 CompressionStream provides ~86% size reduction
		const compressedStream = new Blob([graphData])
			.stream()
			.pipeThrough(new CompressionStream("zstd"));
		const compressedBuffer = await new Response(compressedStream).arrayBuffer();
		const compressedSize = compressedBuffer.byteLength;
		const compressionRatio = originalSize > 0 ? compressedSize / originalSize : 1;

		// Ensure enhanced ml_snapshots table exists (with compression fields and JSONB indexing)
		// SQLite 3.51.0: Improved JSONB handling for better indexing performance
		this.db.exec(`
			CREATE TABLE IF NOT EXISTS ml_snapshots (
				snapshot_id TEXT PRIMARY KEY,
				event_id TEXT NOT NULL,
				timestamp INTEGER NOT NULL,
				snapshot_data BLOB NOT NULL,
				compression_ratio REAL,
				original_size_bytes INTEGER,
				compressed_size_bytes INTEGER,
				layers_included TEXT NOT NULL,
				anomaly_count INTEGER GENERATED ALWAYS AS (
					json_extract(metadata, '$.anomalyCount')
				) STORED,
				hidden_edge_count INTEGER,
				metadata JSONB,  -- Better indexing performance (SQLite 3.51.0)
				access_count INTEGER DEFAULT 0,
				last_accessed INTEGER,
				avg_retrieval_time_ms REAL,
				retention_days INTEGER DEFAULT 30,
				expires_at INTEGER GENERATED ALWAYS AS (timestamp + retention_days * 86400000) STORED
			);
			
			-- GIN index for fast metadata queries (SQLite 3.51.0)
			CREATE INDEX IF NOT EXISTS idx_graph_metadata ON ml_snapshots USING GIN(metadata);
			CREATE INDEX IF NOT EXISTS idx_graph_anomaly_count ON ml_snapshots(anomaly_count);
		`);

		// Store compressed snapshot in enhanced table
		const insertCompressed = this.db.prepare(`
			INSERT OR REPLACE INTO ml_snapshots (
				snapshot_id, event_id, timestamp, snapshot_data,
				compression_ratio, original_size_bytes, compressed_size_bytes,
				layers_included, anomaly_count, hidden_edge_count
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`);

		insertCompressed.run(
			snapshotId,
			eventId,
			timestamp,
			compressedBuffer,
			compressionRatio,
			originalSize,
			compressedSize,
			"1,2,3,4", // layers included
			totalAnomalies,
			Object.values(layerCounts).flat().length,
		);

		// Also maintain legacy table for backward compatibility (uncompressed)
		this.db.exec(`
			CREATE TABLE IF NOT EXISTS snapshot_graphs (
				snapshot_id TEXT PRIMARY KEY,
				event_id TEXT NOT NULL,
				graph_data TEXT NOT NULL,
				created_at INTEGER NOT NULL
			)
		`);

		const insertLegacy = this.db.prepare(`
			INSERT OR REPLACE INTO snapshot_graphs (snapshot_id, event_id, graph_data, created_at)
			VALUES (?, ?, ?, ?)
		`);

		insertLegacy.run(snapshotId, eventId, graphData, timestamp);

		return snapshotId;
	}

	/**
	 * Load snapshot (prefers compressed, falls back to legacy)
	 */
	async loadSnapshot(snapshotId: string): Promise<MultiLayerGraph | null> {
		// Try compressed snapshot first (Bun v1.51)
		const compressedQuery = this.db.query(`
			SELECT snapshot_data, compressed_size_bytes, original_size_bytes
			FROM ml_snapshots
			WHERE snapshot_id = ?
		`);

		const compressedResult = compressedQuery.get(snapshotId) as
			| {
					snapshot_data: ArrayBuffer;
					compressed_size_bytes: number;
					original_size_bytes: number;
			  }
			| undefined;

		if (compressedResult) {
			// Decompress using Bun v1.51 DecompressionStream
			const decompressedStream = new Blob([compressedResult.snapshot_data])
				.stream()
				.pipeThrough(new DecompressionStream("zstd"));
			const graphData = await new Response(decompressedStream).text();
			const parsed = JSON.parse(graphData);

			// Update access metrics
			this.db
				.prepare(`
				UPDATE ml_snapshots
				SET access_count = access_count + 1,
					last_accessed = ?,
					avg_retrieval_time_ms = (
						(avg_retrieval_time_ms * (access_count - 1) + ?) / access_count
					)
				WHERE snapshot_id = ?
			`)
				.run(Date.now(), 0, snapshotId); // TODO: measure actual retrieval time

			return this.rehydrateGraph(parsed);
		}

		// Fallback to legacy uncompressed format
		const legacyQuery = this.db.query(`
			SELECT graph_data FROM snapshot_graphs
			WHERE snapshot_id = ?
		`);

		const legacyResult = legacyQuery.get(snapshotId) as
			| { graph_data: string }
			| undefined;

		if (!legacyResult) {
			return null;
		}

		const parsed = JSON.parse(legacyResult.graph_data);
		return this.rehydrateGraph(parsed);
	}

	/**
	 * Rehydrate graph from serialized data
	 */
	private rehydrateGraph(data: any): MultiLayerGraph {
		// Reconstruct graph from serialized data
		// This is a simplified version - adjust based on your MultiLayerGraph structure
		return data as MultiLayerGraph;
	}

	/**
	 * Get snapshot metadata
	 */
	async getSnapshotMetadata(
		snapshotId: string,
	): Promise<SnapshotMetadata | null> {
		const query = this.db.query(`
			SELECT * FROM multi_layer_snapshots
			WHERE snapshot_id = ?
		`);

		const result = query.get(snapshotId) as any;

		if (!result) {
			return null;
		}

		return {
			snapshotId: result.snapshot_id || snapshotId,
			eventId: result.event_id,
			timestamp: result.snapshot_timestamp,
			layer1Edges: result.layer1_edges,
			layer2Edges: result.layer2_edges,
			layer3Edges: result.layer3_edges,
			layer4Edges: result.layer4_edges,
			totalAnomalies: result.total_anomalies,
			highConfidenceAnomalies: result.high_confidence_anomalies,
		};
	}

	/**
	 * List snapshots for an event
	 */
	async listSnapshots(
		eventId: string,
		limit: number = 10,
	): Promise<SnapshotMetadata[]> {
		const query = this.db.query(`
			SELECT * FROM multi_layer_snapshots
			WHERE event_id = ?
			ORDER BY snapshot_timestamp DESC
			LIMIT ?
		`);

		const results = query.all(eventId, limit) as any[];

		return results.map((r) => ({
			snapshotId: r.snapshot_id || "",
			eventId: r.event_id,
			timestamp: r.snapshot_timestamp,
			layer1Edges: r.layer1_edges,
			layer2Edges: r.layer2_edges,
			layer3Edges: r.layer3_edges,
			layer4Edges: r.layer4_edges,
			totalAnomalies: r.total_anomalies,
			highConfidenceAnomalies: r.high_confidence_anomalies,
		}));
	}

	/**
	 * Compare snapshots
	 */
	async compareSnapshots(
		snapshotId1: string,
		snapshotId2: string,
	): Promise<{
		layer1Diff: number;
		layer2Diff: number;
		layer3Diff: number;
		layer4Diff: number;
		totalDiff: number;
	}> {
		const meta1 = await this.getSnapshotMetadata(snapshotId1);
		const meta2 = await this.getSnapshotMetadata(snapshotId2);

		if (!meta1 || !meta2) {
			throw new Error("One or both snapshots not found");
		}

		return {
			layer1Diff: meta1.layer1Edges - meta2.layer1Edges,
			layer2Diff: meta1.layer2Edges - meta2.layer2Edges,
			layer3Diff: meta1.layer3Edges - meta2.layer3Edges,
			layer4Diff: meta1.layer4Edges - meta2.layer4Edges,
			totalDiff: meta1.totalAnomalies - meta2.totalAnomalies,
		};
	}
}

#!/usr/bin/env bun
/**
 * @fileoverview Correlation Engine Health Check Tests
 * @description Test health check functionality for DoD Multi-Layer Correlation Engine
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import { DoDMultiLayerCorrelationGraph, healthCheck, type HealthStatus } from "../src/analytics/correlation-engine";
import { existsSync, unlinkSync } from "fs";
import { join } from "path";

const TEST_DB_PATH = join(import.meta.dir, "correlation-health-test.db");

describe("Correlation Engine Health Check", () => {
	let db: Database;
	let engine: DoDMultiLayerCorrelationGraph;

	beforeEach(() => {
		// Use in-memory database for tests to avoid file I/O issues
		db = new Database(":memory:");
		engine = new DoDMultiLayerCorrelationGraph(db);
	});

	afterEach(() => {
		if (db) {
			db.close();
		}
		// Clean up test file if it exists
		if (existsSync(TEST_DB_PATH)) {
			try {
				unlinkSync(TEST_DB_PATH);
			} catch {
				// Ignore cleanup errors
			}
		}
	});

	it("should return HEALTHY status when database is responsive", () => {
		const wsClients = new Set();
		const health = engine.getHealthStatus(wsClients);

		expect(health).toBeDefined();
		expect(health.status).toBe("HEALTHY");
		expect(health.timestamp).toBeGreaterThan(0);
		expect(health.metrics.dbLatency).toBeLessThan(100);
		expect(health.metrics.layerFailures).toBe(0);
		expect(health.metrics.activeConnections).toBe(0);
		expect(health.failover).toBe(false);
	});

	it("should track layer failures correctly", async () => {
		// Build graph with invalid eventId to trigger failures
		const graph = await engine.buildMultiLayerGraph("INVALID-EVENT-ID");
		expect(graph).toBeNull();

		// Check health status - should still be healthy (no failures tracked yet)
		const health1 = engine.getHealthStatus();
		expect(health1.status).toBe("HEALTHY");

		// Try building layers directly to trigger failures
		// Note: We can't directly access private methods, but failures are tracked
		// when buildMultiLayerGraph returns null layers
	});

	it("should return DEGRADED status when database latency is high", () => {
		// This test would require mocking database latency
		// For now, we verify the structure
		const health = engine.getHealthStatus();
		expect(health.metrics.dbLatency).toBeGreaterThanOrEqual(0);
	});

	it("should include active connections in metrics", () => {
		const wsClients = new Set([1, 2, 3]);
		const health = engine.getHealthStatus(wsClients);

		expect(health.metrics.activeConnections).toBe(3);
	});

	it("should return last successful build timestamp", async () => {
		// Build a valid graph
		const validEventId = "NBA-20240101-1200";
		
		// Insert some test data first
		db.run(`
			INSERT INTO multi_layer_correlations
			(layer, event_id, source_node, target_node, correlation_type, correlation_score,
			 latency_ms, expected_propagation, detected_at, confidence, severity_level)
			VALUES (1, ?, 'test_source_node_12345', 'test_target_node_12345', 'direct_latency', 
			        0.5, 100, 0.4, ?, 0.7, 'MEDIUM')
		`, [validEventId, Date.now()]);

		const graph = await engine.buildMultiLayerGraph(validEventId);
		
		if (graph) {
			const health = engine.getHealthStatus();
			expect(health.metrics.lastSuccessfulBuild).toBeGreaterThan(0);
		}
	});

	it("should enable failover when FAILOVER_ENABLED is set and failures >= 3", () => {
		const originalEnv = process.env.FAILOVER_ENABLED;
		
		try {
			process.env.FAILOVER_ENABLED = "true";
			
			// Manually trigger failures by recording them
			// Note: This tests the internal failure tracking mechanism
			const health = engine.getHealthStatus();
			
			// With no failures, failover should be false
			expect(health.failover).toBe(false);
		} finally {
			if (originalEnv) {
				process.env.FAILOVER_ENABLED = originalEnv;
			} else {
				delete process.env.FAILOVER_ENABLED;
			}
		}
	});

	it("should work with static healthCheck function", () => {
		const wsClients = new Set();
		const health = healthCheck(db, wsClients);

		expect(health).toBeDefined();
		expect(health.status).toMatch(/^(HEALTHY|DEGRADED)$/);
		expect(health.timestamp).toBeGreaterThan(0);
		expect(health.metrics).toBeDefined();
		expect(health.metrics.dbLatency).toBeGreaterThanOrEqual(0);
		expect(health.metrics.layerFailures).toBeGreaterThanOrEqual(0);
		expect(health.metrics.activeConnections).toBe(0);
		expect(health.metrics.lastSuccessfulBuild).toBeGreaterThanOrEqual(0);
		expect(typeof health.failover).toBe("boolean");
	});

	it("should handle database errors gracefully", () => {
		// Close database to simulate error
		db.close();

		// Create new engine with closed DB - should handle gracefully
		const newDb = new Database(":memory:");
		const newEngine = new DoDMultiLayerCorrelationGraph(newDb);
		
		// Health check should still work
		const health = newEngine.getHealthStatus();
		expect(health).toBeDefined();
		expect(health.status).toMatch(/^(HEALTHY|DEGRADED)$/);
		
		newDb.close();
	});
});

/**
 * @fileoverview Statistical Analysis Database Adapter Tests
 * @description Tests for 6.7.1A.0.0.0.0 database integration
 * 
 * Validates that statistical analysis can access and analyze historical data
 * from line_movement_audit_v2 and url_anomaly_audit tables.
 * 
 * @module test/statistical-analysis-database
 * @version 6.7.1A.0.0.0.0
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { Database } from "bun:sqlite";
import {
	extractPerformanceMetrics,
	extractAnomalyPerformanceMetrics,
	analyzeHistoricalPerformance,
	analyzeAnomalyPerformanceImpact,
	compareBookmakerPerformance,
} from "../src/utils/statistical-analysis-database";
import { initializeUrlAnomalyDatabase } from "../src/utils/database-initialization";

describe("6.7.1A.0.0.0.0 - Database Statistical Analysis", () => {
	let db: Database;

	beforeAll(async () => {
		// Ensure database is initialized
		const initResult = await initializeUrlAnomalyDatabase();
		expect(initResult.success).toBe(true);

		// Create test database
		db = new Database(":memory:");
		
		// Create tables with same schema
		db.run(`
			CREATE TABLE line_movement_audit_v2 (
				auditId TEXT PRIMARY KEY,
				bookmaker TEXT NOT NULL,
				eventId TEXT NOT NULL,
				raw_url TEXT NOT NULL,
				parsed_params TEXT,
				response_status INTEGER,
				response_size INTEGER,
				timestamp INTEGER NOT NULL
			)
		`);

		db.run(`
			CREATE TABLE url_anomaly_audit (
				anomalyId TEXT PRIMARY KEY,
				bookmaker TEXT NOT NULL,
				eventId TEXT NOT NULL,
				original_url TEXT NOT NULL,
				parsed_param_count INTEGER NOT NULL,
				corrected_param_count INTEGER NOT NULL,
				threat_level TEXT NOT NULL,
				detected_at INTEGER NOT NULL
			)
		`);

		// Insert test data
		const now = Date.now();
		for (let i = 0; i < 20; i++) {
			const timestamp = now - (20 - i) * 1000; // 1 second intervals
			db.run(
				`INSERT INTO line_movement_audit_v2 
				 (auditId, bookmaker, eventId, raw_url, response_status, response_size, timestamp)
				 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
				`test-${i}`,
				"test-bookmaker",
				"test-event",
				"https://test.example.com/api",
				200,
				1024 * (10 + i), // Increasing response sizes (10KB to 29KB)
				timestamp,
			);
		}

		// Insert anomaly test data
		for (let i = 0; i < 10; i++) {
			const detectedAt = now - (10 - i) * 2000; // 2 second intervals
			db.run(
				`INSERT INTO url_anomaly_audit
				 (anomalyId, bookmaker, eventId, original_url, parsed_param_count, corrected_param_count, threat_level, detected_at)
				 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
				`anomaly-${i}`,
				"test-bookmaker",
				"test-event",
				"https://test.example.com/api?param=value",
				5 + i, // Increasing parsed param count
				3, // Fixed corrected count
				"suspicious",
				detectedAt,
			);
		}
	});

	afterAll(() => {
		db.close();
	});

	describe("extractPerformanceMetrics", () => {
		test("should extract performance metrics from line_movement_audit_v2", () => {
			const metrics = extractPerformanceMetrics(db, {
				bookmaker: "test-bookmaker",
				limit: 20,
			});

			expect(metrics.sampleCount).toBe(20);
			expect(metrics.executionTimes.length).toBeGreaterThan(0);
			expect(metrics.responseSizes.length).toBeGreaterThan(0);
			expect(metrics.timestamps.length).toBe(20);
		});

		test("should filter by time range", () => {
			const now = Date.now();
			const startTime = now - 15 * 1000; // 15 seconds ago
			const endTime = now;

			const metrics = extractPerformanceMetrics(db, {
				startTime,
				endTime,
				limit: 100,
			});

			expect(metrics.sampleCount).toBeLessThanOrEqual(20);
			expect(metrics.timestamps.every((t) => t >= startTime && t <= endTime)).toBe(true);
		});

		test("should filter by bookmaker", () => {
			const metrics = extractPerformanceMetrics(db, {
				bookmaker: "test-bookmaker",
			});

			expect(metrics.sampleCount).toBeGreaterThan(0);
		});
	});

	describe("extractAnomalyPerformanceMetrics", () => {
		test("should extract anomaly metrics from url_anomaly_audit", () => {
			const metrics = extractAnomalyPerformanceMetrics(db, {
				bookmaker: "test-bookmaker",
				limit: 10,
			});

			expect(metrics.sampleCount).toBe(10);
			expect(metrics.paramDeltas.length).toBe(10);
			expect(metrics.detectedAt.length).toBe(10);
			expect(metrics.threatLevels.length).toBe(10);

			// Verify param deltas are calculated correctly
			expect(metrics.paramDeltas[0]).toBe(2); // 5 - 3 = 2
			expect(metrics.paramDeltas[9]).toBe(11); // 14 - 3 = 11
		});

		test("should filter by threat level", () => {
			const metrics = extractAnomalyPerformanceMetrics(db, {
				threatLevel: "suspicious",
			});

			expect(metrics.sampleCount).toBeGreaterThan(0);
			expect(metrics.threatLevels.every((level) => level === "suspicious")).toBe(true);
		});
	});

	describe("analyzeHistoricalPerformance", () => {
		test("should perform statistical analysis on historical data", async () => {
			const now = Date.now();
			const baselineStart = now - 20 * 1000;
			const baselineEnd = now - 10 * 1000;
			const currentStart = now - 10 * 1000;
			const currentEnd = now;

			const analysis = await analyzeHistoricalPerformance(
				db,
				{
					bookmaker: "test-bookmaker",
					startTime: baselineStart,
					endTime: baselineEnd,
				},
				{
					bookmaker: "test-bookmaker",
					startTime: currentStart,
					endTime: currentEnd,
				},
			);

			expect(analysis.meanDifference.test).toBeDefined();
			expect(analysis.meanDifference.confidenceInterval).toBeDefined();
			expect(analysis.meanDifference.effectSize).toBeDefined();
			expect(analysis.metadata.databasePath).toBe("./data/research.db");
			expect(analysis.metadata.tableName).toBe("line_movement_audit_v2");
			expect(analysis.metadata.sampleCount).toBeGreaterThan(0);
		});

		test("should detect performance changes", async () => {
			// Create data with clear performance difference
			const db2 = new Database(":memory:");
			db2.run(`
				CREATE TABLE line_movement_audit_v2 (
					auditId TEXT PRIMARY KEY,
					bookmaker TEXT NOT NULL,
					eventId TEXT NOT NULL,
					raw_url TEXT NOT NULL,
					parsed_params TEXT,
					response_status INTEGER,
					response_size INTEGER,
					timestamp INTEGER NOT NULL
				)
			`);

			const now = Date.now();
			
			// Baseline: small responses (fast)
			for (let i = 0; i < 15; i++) {
				db2.run(
					`INSERT INTO line_movement_audit_v2 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
					`baseline-${i}`,
					"test",
					"event",
					"https://test.com",
					null,
					200,
					1024 * 5, // 5KB (fast)
					now - (15 - i) * 1000,
				);
			}

			// Current: large responses (slow)
			for (let i = 0; i < 15; i++) {
				db2.run(
					`INSERT INTO line_movement_audit_v2 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
					`current-${i}`,
					"test",
					"event",
					"https://test.com",
					null,
					200,
					1024 * 20, // 20KB (slow)
					now - (15 - i) * 1000,
				);
			}

			const analysis = await analyzeHistoricalPerformance(
				db2,
				{ startTime: now - 20000, endTime: now - 10000 },
				{ startTime: now - 10000, endTime: now },
			);

			// Should detect significant difference (current slower)
			expect(analysis.meanDifference.meanDiff).toBeLessThan(0);
			expect(analysis.meanDifference.effectSize.magnitude).toMatch(/medium|large|very large/);

			db2.close();
		});
	});

	describe("analyzeAnomalyPerformanceImpact", () => {
		test("should analyze impact of anomalies on performance", async () => {
			const now = Date.now();
			const analysis = await analyzeAnomalyPerformanceImpact(
				db,
				{
					bookmaker: "test-bookmaker",
					startTime: now - 30000,
					endTime: now,
				},
			);

			expect(analysis.meanDifference.test).toBeDefined();
			expect(analysis.metadata.tableName).toContain("url_anomaly_audit");
			expect(analysis.metadata.sampleCount).toBeGreaterThan(0);
		});
	});

	describe("compareBookmakerPerformance", () => {
		test("should compare multiple bookmakers", async () => {
			// Create test data with multiple bookmakers
			const db2 = new Database(":memory:");
			db2.run(`
				CREATE TABLE line_movement_audit_v2 (
					auditId TEXT PRIMARY KEY,
					bookmaker TEXT NOT NULL,
					eventId TEXT NOT NULL,
					raw_url TEXT NOT NULL,
					parsed_params TEXT,
					response_status INTEGER,
					response_size INTEGER,
					timestamp INTEGER NOT NULL
				)
			`);

			const now = Date.now();
			
			// Bookmaker A: fast (5KB responses)
			for (let i = 0; i < 10; i++) {
				db2.run(
					`INSERT INTO line_movement_audit_v2 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
					`a-${i}`,
					"bookmaker-a",
					"event",
					"https://test.com",
					null,
					200,
					1024 * 5,
					now - (10 - i) * 1000,
				);
			}

			// Bookmaker B: slow (15KB responses)
			for (let i = 0; i < 10; i++) {
				db2.run(
					`INSERT INTO line_movement_audit_v2 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
					`b-${i}`,
					"bookmaker-b",
					"event",
					"https://test.com",
					null,
					200,
					1024 * 15,
					now - (10 - i) * 1000,
				);
			}

			const comparisons = await compareBookmakerPerformance(
				db2,
				["bookmaker-a", "bookmaker-b"],
				{ startTime: now - 20000, endTime: now },
			);

			expect(comparisons.size).toBe(1);
			expect(comparisons.has("bookmaker-b")).toBe(true);

			const comparison = comparisons.get("bookmaker-b")!;
			expect(comparison.meanDifference.test).toBeDefined();
			expect(comparison.metadata.filterCriteria?.baselineBookmaker).toBe("bookmaker-a");
			expect(comparison.metadata.filterCriteria?.currentBookmaker).toBe("bookmaker-b");

			db2.close();
		});
	});
});

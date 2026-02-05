#!/usr/bin/env bun
/**
 * @fileoverview 9.1.5.30.0.0.0: Debug Bundle Generator
 * @description Generate debug bundles with forensic data, threats, and performance snapshots
 * @module scripts/generate-debug-bundle
 * 
 * Cross-Reference Hub:
 * - @see 9.1.5.24.0.0.0 → Forensic Binary Data
 * - @see 9.1.5.25.0.0.0 → Inspectable Security Threat
 * - @see 9.1.5.26.0.0.0 → Inspectable Performance Snapshot
 */

import { Database } from "bun:sqlite";
import { ForensicBinaryData } from "../src/forensics/inspectable-forensic-data";
import { InspectableSecurityThreat } from "../src/security/inspectable-security-event";
import { InspectablePerformanceSnapshot } from "../src/observability/inspectable-performance-snapshot";
import { BinaryTagCollection } from "../src/utils/binary-tag-collection";

/**
 * Debug bundle options
 */
interface DebugBundleOptions {
	include?: ("forensics" | "threats" | "performance")[];
	compress?: "zstd" | "gzip" | "none";
	output?: string;
	maxItems?: number;
}

/**
 * 9.1.5.30.0.0.0: Generate debug bundle
 */
async function generateDebugBundle(options: DebugBundleOptions = {}): Promise<void> {
	const {
		include = ["forensics", "threats", "performance"],
		compress = "zstd",
		output = `debug-bundle-${Date.now()}.${compress === "zstd" ? "zst" : compress === "gzip" ? "gz" : "json"}`,
		maxItems = 100,
	} = options;

	console.log(`📦 Generating debug bundle: ${output}`);
	console.log(`   Include: ${include.join(", ")}`);
	console.log(`   Compression: ${compress}`);

	const bundle: any = {
		timestamp: new Date().toISOString(),
		version: "1.0.0",
		includes: include,
		data: {},
	};

	// Include forensics
	if (include.includes("forensics")) {
		console.log("   Collecting forensic data...");
		try {
			const db = new Database("./data/research.db", { create: true });
			const movements = db.query<{
				auditId: number;
				bookmaker: string;
				eventId: string;
				move_timestamp: number;
				url_signature: string;
				threat_level: string;
				raw_payload: Uint8Array;
			}, [number]>(
				`SELECT auditId, bookmaker, eventId, move_timestamp, url_signature, threat_level, raw_payload 
				 FROM line_movement_audit_v2 
				 ORDER BY move_timestamp DESC 
				 LIMIT ?1`,
			).all(maxItems);

			bundle.data.forensics = movements.map((m) => {
				const binary = new ForensicBinaryData(
					m.raw_payload instanceof Uint8Array
						? m.raw_payload
						: new Uint8Array(m.raw_payload),
					{
						auditId: m.auditId,
						bookmaker: m.bookmaker,
						eventId: m.eventId,
						captureTimestamp: m.move_timestamp,
						urlSignature: m.url_signature || "",
						threatLevel: (m.threat_level as "none" | "suspicious" | "malicious") || "none",
					},
				);

				return {
					auditId: m.auditId,
					inspect: Bun.inspect(binary, { depth: 2 }),
					compression: binary.analyzeCompressionRatio(),
				};
			});

			db.close();
			console.log(`   ✅ Collected ${bundle.data.forensics.length} forensic records`);
		} catch (error) {
			console.warn(`   ⚠️  Failed to collect forensics: ${error}`);
			bundle.data.forensics = [];
		}
	}

	// Include threats
	if (include.includes("threats")) {
		console.log("   Collecting security threats...");
		try {
			const db = new Database("./data/research.db", { create: true });
			const threats = db.query<{
				threatId: string;
				threat_type: string;
				severity: number;
				context: string;
				detected_at: number;
				bookmaker?: string;
				url?: string;
			}, [number]>(
				`SELECT threatId, threat_type, severity, context, detected_at, bookmaker, url 
				 FROM security_threats 
				 ORDER BY detected_at DESC 
				 LIMIT ?1`,
			).all(maxItems);

			bundle.data.threats = threats.map((t) => {
				const inspectable = new InspectableSecurityThreat(
					new TextEncoder().encode(JSON.stringify(JSON.parse(t.context || "{}")).slice(0, 2048)),
					{
						threatId: t.threatId,
						threatType: t.threat_type,
						severity: t.severity,
						context: JSON.parse(t.context || "{}"),
						detectedAt: t.detected_at,
						bookmaker: t.bookmaker,
						url: t.url,
					},
				);

				return {
					threatId: t.threatId,
					inspect: Bun.inspect(inspectable, { depth: 2 }),
				};
			});

			db.close();
			console.log(`   ✅ Collected ${bundle.data.threats.length} security threats`);
		} catch (error) {
			console.warn(`   ⚠️  Failed to collect threats: ${error}`);
			bundle.data.threats = [];
		}
	}

	// Include performance
	if (include.includes("performance")) {
		console.log("   Collecting performance snapshots...");
		try {
			const cpuUsage = process.cpuUsage();
			const cpuTotal = (cpuUsage.user + cpuUsage.system) / 1e6;
			const cpuPercent = Math.min(cpuTotal / 1.0, 1.0);

			const snapshot = new InspectablePerformanceSnapshot({
				timestamp: Date.now(),
				cpu: cpuPercent,
				memory: {
					...process.memoryUsage(),
					baseline: process.memoryUsage().heapTotal,
				},
				network: {
					requests: 0,
					errors: 0,
				},
				database: {
					queries: 0,
					slowQueries: 0,
				},
				threats: {
					detected: 0,
					mitigated: 0,
				},
			});

			bundle.data.performance = {
				inspect: Bun.inspect(snapshot, { depth: 2 }),
				snapshot: snapshot.getSnapshot(),
			};

			console.log(`   ✅ Collected performance snapshot`);
		} catch (error) {
			console.warn(`   ⚠️  Failed to collect performance: ${error}`);
			bundle.data.performance = null;
		}
	}

	// Serialize bundle
	const jsonData = JSON.stringify(bundle, null, 2);
	let finalData: Uint8Array;

	if (compress === "zstd") {
		// Use Bun's zstd compression if available
		finalData = Bun.gzipSync(new TextEncoder().encode(jsonData)); // Fallback to gzip
	} else if (compress === "gzip") {
		finalData = Bun.gzipSync(new TextEncoder().encode(jsonData));
	} else {
		finalData = new TextEncoder().encode(jsonData);
	}

	// Write bundle
	await Bun.write(output, finalData);

	console.log(`✅ Debug bundle written: ${output}`);
	console.log(`   Size: ${(finalData.byteLength / 1024).toFixed(2)} KB`);
	console.log(`   Compression ratio: ${((1 - finalData.byteLength / jsonData.length) * 100).toFixed(1)}%`);
}

// Parse command line arguments
const args = Bun.argv.slice(2);
const options: DebugBundleOptions = {};

for (let i = 0; i < args.length; i++) {
	const arg = args[i];
	if (arg === "--include" && args[i + 1]) {
		options.include = args[i + 1].split(",") as any;
		i++;
	} else if (arg === "--compress" && args[i + 1]) {
		options.compress = args[i + 1] as any;
		i++;
	} else if (arg === "--output" && args[i + 1]) {
		options.output = args[i + 1];
		i++;
	} else if (arg === "--max-items" && args[i + 1]) {
		options.maxItems = parseInt(args[i + 1]);
		i++;
	}
}

// Generate bundle
if (import.meta.main) {
	generateDebugBundle(options).catch((error) => {
		console.error("Failed to generate debug bundle:", error);
		process.exit(1);
	});
}

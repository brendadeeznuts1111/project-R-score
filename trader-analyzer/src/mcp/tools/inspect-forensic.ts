/**
 * @fileoverview 9.1.5.27.0.0.0: MCP Tools for Forensic Data Inspection
 * @description MCP tools for inspecting forensic binary data, security threats, and performance snapshots
 * @module mcp/tools/inspect-forensic
 *
 * Cross-Reference Hub:
 * - @see 9.1.5.24.0.0.0 → Forensic Binary Data
 * - @see 9.1.5.25.0.0.0 → Inspectable Security Threat
 * - @see 9.1.5.26.0.0.0 → Inspectable Performance Snapshot
 * - @see src/mcp/ → MCP server integration
 */

import { Database } from "bun:sqlite";
import { ForensicBinaryData } from "../../forensics/inspectable-forensic-data";
import { InspectableSecurityThreat } from "../../security/inspectable-security-event";
import {
	InspectablePerformanceSnapshot,
	type PerformanceSnapshot,
} from "../../observability/inspectable-performance-snapshot";
import { BinaryTagCollection } from "../../utils/binary-tag-collection";
import type { MCPTool } from "../server";

/**
 * 9.1.5.27.0.0.0: MCP Tools for Forensic Inspection
 */
export const inspectForensicTools: MCPTool[] = [
	{
		name: "inspect-forensic-data",
		description: "Inspect raw forensic binary data with metadata",
		inputSchema: {
			type: "object",
			properties: {
				auditId: { type: "number", description: "Audit ID to inspect" },
			},
			required: ["auditId"],
		},
		execute: async (args: any) => {
			try {
				const db = new Database("./data/research.db", { create: true });
				const data = db
					.query<
						{
							auditId: number;
							bookmaker: string;
							eventId: string;
							move_timestamp: number;
							url_signature: string;
							threat_level: string;
							raw_payload: Uint8Array;
						},
						[number]
					>(
						`SELECT auditId, bookmaker, eventId, move_timestamp, url_signature, threat_level, raw_payload 
					 FROM line_movement_audit_v2 
					 WHERE auditId = ?1`,
					)
					.get(args.auditId);

				if (!data) {
					db.close();
					return {
						content: [
							{
								type: "text",
								text: `Forensic data not found for auditId: ${args.auditId}`,
							},
						],
						isError: true,
					};
				}

				const binary = new ForensicBinaryData(
					data.raw_payload instanceof Uint8Array
						? data.raw_payload
						: new Uint8Array(data.raw_payload),
					{
						auditId: data.auditId,
						bookmaker: data.bookmaker,
						eventId: data.eventId,
						captureTimestamp: data.move_timestamp,
						urlSignature: data.url_signature || "",
						threatLevel:
							(data.threat_level as "none" | "suspicious" | "malicious") ||
							"none",
					},
				);

				const compression = binary.analyzeCompressionRatio();
				let decodedJson: any = null;
				try {
					decodedJson = binary.decodeAsJson();
				} catch {
					// Not JSON or not compressed
				}

				db.close();

				return {
					content: [
						{
							type: "text",
							text:
								`Forensic Data Inspection #${args.auditId}\n` +
								`${Bun.inspect(binary)}\n\n` +
								`Compression Ratio: ${JSON.stringify(compression)}\n` +
								(decodedJson
									? `Decoded JSON: ${Bun.inspect(decodedJson, { depth: 1 })}\n`
									: ""),
						},
					],
				};
			} catch (error) {
				return {
					content: [
						{
							type: "text",
							text: `Error inspecting forensic data: ${error instanceof Error ? error.message : String(error)}`,
						},
					],
					isError: true,
				};
			}
		},
	},
	{
		name: "inspect-security-threat",
		description: "Inspect detailed security threat information",
		inputSchema: {
			type: "object",
			properties: {
				threatId: { type: "string", description: "Threat ID to inspect" },
			},
			required: ["threatId"],
		},
		execute: async (args: any) => {
			try {
				const db = new Database("./data/research.db", { create: true });
				const threat = db
					.query<
						{
							threatId: string;
							threat_type: string;
							severity: number;
							context: string;
							detected_at: number;
							bookmaker?: string;
							url?: string;
						},
						[string]
					>(
						`SELECT threatId, threat_type, severity, context, detected_at, bookmaker, url 
					 FROM security_threats 
					 WHERE threatId = ?1`,
					)
					.get(args.threatId);

				if (!threat) {
					db.close();
					return {
						content: [
							{
								type: "text",
								text: `Security threat not found: ${args.threatId}`,
							},
						],
						isError: true,
					};
				}

				const contextData = JSON.parse(threat.context || "{}");
				const inspectable = new InspectableSecurityThreat(
					new TextEncoder().encode(JSON.stringify(contextData).slice(0, 1024)),
					{
						threatId: threat.threatId,
						threatType: threat.threat_type,
						severity: threat.severity,
						context: contextData,
						detectedAt: threat.detected_at,
						bookmaker: threat.bookmaker,
						url: threat.url,
					},
				);

				db.close();

				return {
					content: [
						{
							type: "text",
							text: `Security Threat Inspection\n${Bun.inspect(inspectable, { depth: 2 })}`,
						},
					],
				};
			} catch (error) {
				return {
					content: [
						{
							type: "text",
							text: `Error inspecting security threat: ${error instanceof Error ? error.message : String(error)}`,
						},
					],
					isError: true,
				};
			}
		},
	},
	{
		name: "inspect-performance-snapshot",
		description: "Capture and inspect current system performance",
		inputSchema: {
			type: "object",
			properties: {},
		},
		execute: async () => {
			try {
				// Get current CPU usage
				const cpuUsage = process.cpuUsage();
				const cpuTotal = (cpuUsage.user + cpuUsage.system) / 1e6; // Convert to seconds
				const cpuPercent = Math.min(cpuTotal / 1.0, 1.0); // Normalize (rough estimate)

				// Get memory usage
				const memory = process.memoryUsage();

				// Create snapshot (in real implementation, these would come from metrics)
				const snapshot: PerformanceSnapshot = {
					timestamp: Date.now(),
					cpu: cpuPercent,
					memory: {
						...memory,
						baseline: memory.heapTotal,
					},
					network: {
						requests: 0, // Would come from metrics
						errors: 0,
					},
					database: {
						queries: 0, // Would come from metrics
						slowQueries: 0,
					},
					threats: {
						detected: 0, // Would come from security metrics
						mitigated: 0,
					},
				};

				const inspectable = new InspectablePerformanceSnapshot(snapshot);

				return {
					content: [
						{
							type: "text",
							text: `Performance Snapshot\n${Bun.inspect(inspectable)}`,
						},
						{
							type: "text",
							mimeType: "application/json",
							data: Bun.gzipSync(
								new TextEncoder().encode(JSON.stringify(snapshot)),
							),
						},
					],
				};
			} catch (error) {
				return {
					content: [
						{
							type: "text",
							text: `Error capturing performance snapshot: ${error instanceof Error ? error.message : String(error)}`,
						},
					],
					isError: true,
				};
			}
		},
	},
	{
		name: "inspect-binary-collection",
		description: "Inspect a collection of binary data with performance metrics",
		inputSchema: {
			type: "object",
			properties: {
				collectionKey: {
					type: "string",
					description: "Collection key to inspect",
				},
				maxItems: {
					type: "number",
					default: 10,
					description: "Maximum items to show",
				},
			},
			required: ["collectionKey"],
		},
		execute: async (args: any) => {
			try {
				const db = new Database("./data/research.db", { create: true });
				const tags = db
					.query<
						{
							key: string;
							value: Uint8Array | null;
							metadata: string | null;
						},
						[string, number]
					>(
						`SELECT key, value, metadata 
					 FROM metadata_tags 
					 WHERE collection_key = ?1 
					 LIMIT ?2`,
					)
					.all(args.collectionKey, args.maxItems || 10);

				const collection = new BinaryTagCollection();
				for (const tag of tags) {
					collection.addTag({
						key: tag.key,
						value: tag.value ? new Uint8Array(tag.value) : undefined,
						metadata: tag.metadata ? JSON.parse(tag.metadata) : undefined,
					});
				}

				db.close();

				// Calculate average performance if available
				const perfStats = collection.getPerformanceStats();
				const avgPerf =
					perfStats.totalOperations > 0 ? perfStats.averageDuration : 0;

				return {
					content: [
						{
							type: "text",
							text: `Binary Collection: ${args.collectionKey}\n${Bun.inspect(collection, { depth: 2 })}`,
						},
						{
							type: "text",
							mimeType: "application/json",
							data: new TextEncoder().encode(
								JSON.stringify({
									tagCount: collection.tags.length,
									cacheSize: collection.getCacheStats().size,
									avgPerf,
								}),
							),
						},
					],
				};
			} catch (error) {
				return {
					content: [
						{
							type: "text",
							text: `Error inspecting binary collection: ${error instanceof Error ? error.message : String(error)}`,
						},
					],
					isError: true,
				};
			}
		},
	},
];

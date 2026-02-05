#!/usr/bin/env bun
/**
 * Tier-1380 MCP Tool Registry Validation
 * Bun.deepMatch runtime validation for MCP tool calls
 */

import { Database } from "bun:sqlite";
import { existsSync } from "fs";

// ─── Glyphs ───────────────────────────────────────
const GLYPHS = {
	VALID: "✓",
	INVALID: "✗",
	SCHEMA: "📋",
	MATCH: "🎯",
	LOCK: "🔐",
	DRIFT: "▵⟂⥂",
};

// ─── Colors ───────────────────────────────────────
const COLORS = {
	success: (s: string) =>
		typeof Bun !== "undefined" && Bun.color
			? Bun.color("#00ff00", "ansi") + s + "\x1b[0m"
			: s,
	error: (s: string) =>
		typeof Bun !== "undefined" && Bun.color
			? Bun.color("#ff0000", "ansi") + s + "\x1b[0m"
			: s,
	warning: (s: string) =>
		typeof Bun !== "undefined" && Bun.color
			? Bun.color("#ffff00", "ansi") + s + "\x1b[0m"
			: s,
	info: (s: string) =>
		typeof Bun !== "undefined" && Bun.color
			? Bun.color("#00ffff", "ansi") + s + "\x1b[0m"
			: s,
};

// ─── Load Registry Schema ─────────────────────────
const REGISTRY_PATH = "./.registry-cache/mcp-tool-registry.json";
let TOOL_SCHEMAS: Record<string, any> = {};

try {
	if (existsSync(REGISTRY_PATH)) {
		const content = await Bun.file(REGISTRY_PATH).json();
		TOOL_SCHEMAS = content.properties || {};
	}
} catch {
	console.error(`${GLYPHS.INVALID} Failed to load registry schema`);
}

// ─── Validate Tool Call (Bun.deepMatch) ───────────
export function validateToolCall(
	toolName: string,
	args: any,
): { valid: boolean; errors: string[] } {
	const errors: string[] = [];

	// 1. Check if tool exists in registry
	if (!TOOL_SCHEMAS[toolName]) {
		return { valid: false, errors: [`Tool "${toolName}" not registered`] };
	}

	const schema = TOOL_SCHEMAS[toolName];

	// 2. Validate arguments are a subset of input schema (Bun.deepMatch)
	const argsMatchSchema = Bun.deepMatch(args, schema.input || {}, true);
	if (!argsMatchSchema) {
		errors.push("Arguments do not match schema subset");
	}

	// 3. Check required fields
	for (const field of schema.required || []) {
		if (!(field in args)) {
			errors.push(`Missing required field: ${field}`);
		}
	}

	// 4. Type validation for known fields
	for (const [key, value] of Object.entries(args)) {
		const fieldSchema = schema.input?.[key];
		if (fieldSchema) {
			const expectedType =
				typeof fieldSchema === "string" ? fieldSchema : fieldSchema.type;
			const actualType = Array.isArray(value) ? "array" : typeof value;

			if (expectedType && expectedType !== actualType) {
				errors.push(`Field "${key}": expected ${expectedType}, got ${actualType}`);
			}

			// Enum validation
			if (fieldSchema.enum && !fieldSchema.enum.includes(value)) {
				errors.push(`Field "${key}": must be one of [${fieldSchema.enum.join(", ")}]`);
			}

			// Range validation
			if (expectedType === "number") {
				if (fieldSchema.minimum !== undefined && value < fieldSchema.minimum) {
					errors.push(`Field "${key}": minimum ${fieldSchema.minimum}`);
				}
				if (fieldSchema.maximum !== undefined && value > fieldSchema.maximum) {
					errors.push(`Field "${key}": maximum ${fieldSchema.maximum}`);
				}
			}

			// Pattern validation
			if (fieldSchema.pattern && typeof value === "string") {
				const regex = new RegExp(fieldSchema.pattern);
				if (!regex.test(value)) {
					errors.push(`Field "${key}": must match pattern ${fieldSchema.pattern}`);
				}
			}
		}
	}

	return { valid: errors.length === 0, errors };
}

// ─── Compliance Score Calculator ──────────────────
interface ComplianceMetrics {
	totalLines: number;
	compliantLines: number;
	violations: number;
	maxWidth: number;
	avgWidth: number;
	score: number;
	grade: string;
}

export function calculateComplianceScore(
	tenantId: string = "default",
): ComplianceMetrics {
	console.log(`${GLYPHS.DRIFT} Calculating Compliance Score for ${tenantId}\n`);

	const dbPath = "./data/tier1380.db";
	if (!existsSync(dbPath)) {
		return {
			totalLines: 0,
			compliantLines: 0,
			violations: 0,
			maxWidth: 0,
			avgWidth: 0,
			score: 100,
			grade: "A+",
		};
	}

	const db = new Database(dbPath);

	// Get violation stats
	const violationStats = db
		.query(`
    SELECT 
      COUNT(*) as count,
      MAX(width) as max_width,
      AVG(width) as avg_width
    FROM violations
    WHERE file LIKE ?
  `)
		.get(`%${tenantId}%`) as any;

	// Get total lines (approximation from violations table)
	const totalStats = db
		.query(`
    SELECT COUNT(DISTINCT file) as files,
           COUNT(*) as violations
    FROM violations
    WHERE file LIKE ?
  `)
		.get(`%${tenantId}%`) as any;

	db.close();

	const violations = violationStats.count || 0;
	const maxWidth = violationStats.max_width || 0;
	const avgWidth = Math.round(violationStats.avg_width || 0);

	// Estimate total lines (violations represent ~1-5% of total lines typically)
	const estimatedTotal = Math.max(violations * 20, 100);
	const compliantLines = estimatedTotal - violations;

	// Calculate score (100 - penalty)
	// Penalty: 0.5 points per violation, capped at 50
	const penalty = Math.min(violations * 0.5, 50);
	const score = Math.round(100 - penalty);

	// Grade
	let grade = "F";
	if (score >= 98) grade = "A+";
	else if (score >= 95) grade = "A";
	else if (score >= 90) grade = "A-";
	else if (score >= 85) grade = "B+";
	else if (score >= 80) grade = "B";
	else if (score >= 75) grade = "B-";
	else if (score >= 70) grade = "C+";
	else if (score >= 65) grade = "C";
	else if (score >= 60) grade = "C-";
	else if (score >= 50) grade = "D";

	return {
		totalLines: estimatedTotal,
		compliantLines,
		violations,
		maxWidth,
		avgWidth,
		score,
		grade,
	};
}

export function displayComplianceScore(metrics: ComplianceMetrics): void {
	console.log("-".repeat(70));
	console.log(`  Total Lines:        ${metrics.totalLines.toLocaleString()}`);
	console.log(
		`  Compliant Lines:    ${metrics.compliantLines.toLocaleString()} (${((metrics.compliantLines / metrics.totalLines) * 100).toFixed(1)}%)`,
	);
	console.log(`  Violations:         ${metrics.violations}`);
	console.log(`  Max Width:          ${metrics.maxWidth} cols`);
	console.log(`  Avg Width:          ${metrics.avgWidth} cols`);
	console.log();

	const scoreColor =
		metrics.score >= 90
			? COLORS.success
			: metrics.score >= 70
				? COLORS.warning
				: COLORS.error;
	console.log(`  Compliance Score:   ${scoreColor(metrics.score.toString())}/100`);
	console.log(`  Grade:              ${scoreColor(metrics.grade)}`);

	// Trend indicator
	const trend =
		metrics.score >= 95
			? "🟢 Excellent"
			: metrics.score >= 80
				? "🟡 Good"
				: metrics.score >= 60
					? "🟠 Needs Improvement"
					: "🔴 Critical";
	console.log(`  Status:             ${trend}`);

	console.log("-".repeat(70));
}

// ─── Export Registry Stats ────────────────────────
export async function exportRegistryStats(
	format: "json" | "csv" = "json",
): Promise<string> {
	const dbPath = "./data/tier1380.db";
	if (!existsSync(dbPath)) {
		return format === "json" ? "{}" : "";
	}

	const db = new Database(dbPath);

	const stats = {
		timestamp: new Date().toISOString(),
		tools: Object.keys(TOOL_SCHEMAS).length,
		violations: db.query("SELECT COUNT(*) as count FROM violations").get() as any,
		cache: db
			.query("SELECT COUNT(*) as count, SUM(size) as total FROM registry_cache")
			.get() as any,
		syncLog: db.query("SELECT COUNT(*) as count FROM registry_sync_log").get() as any,
	};

	db.close();

	if (format === "csv") {
		return `timestamp,total_tools,violations,cache_entries,cache_size,sync_ops
${stats.timestamp},${stats.tools},${stats.violations.count},${stats.cache.count},${stats.cache.total},${stats.syncLog.count}`;
	}

	return JSON.stringify(stats, null, 2);
}

// ─── Main CLI ─────────────────────────────────────
async function main() {
	const args = process.argv.slice(2);
	const cmd = args[0] || "validate";

	switch (cmd) {
		case "validate": {
			const toolName = args[1];
			const toolArgs = args[2] ? JSON.parse(args[2]) : {};

			if (!toolName) {
				console.error(
					`${GLYPHS.INVALID} Usage: bun run registry:validate <tool-name> [args-json]`,
				);
				process.exit(1);
			}

			console.log(`${GLYPHS.SCHEMA} Validating: ${toolName}`);
			console.log(`  Args: ${JSON.stringify(toolArgs)}\n`);

			const start = Bun.nanoseconds();
			const result = validateToolCall(toolName, toolArgs);
			const duration = Number(Bun.nanoseconds() - start) / 1000;

			if (result.valid) {
				console.log(
					`${GLYPHS.VALID} ${COLORS.success("VALID")} (${duration.toFixed(2)}µs)`,
				);
			} else {
				console.log(
					`${GLYPHS.INVALID} ${COLORS.error("INVALID")} (${duration.toFixed(2)}µs)`,
				);
				result.errors.forEach((e) => console.log(`  ${GLYPHS.INVALID} ${e}`));
			}
			break;
		}

		case "compliance":
		case "score": {
			const tenantId = args[1] || "default";
			const metrics = calculateComplianceScore(tenantId);
			displayComplianceScore(metrics);

			// Save to database
			const dbPath = "./data/tier1380.db";
			if (existsSync(dbPath)) {
				const db = new Database(dbPath);
				db.prepare(`
          CREATE TABLE IF NOT EXISTS compliance_scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant TEXT,
            score INTEGER,
            grade TEXT,
            violations INTEGER,
            timestamp INTEGER DEFAULT (unixepoch())
          )
        `).run();

				db.prepare(
					"INSERT INTO compliance_scores (tenant, score, grade, violations) VALUES (?, ?, ?, ?)",
				).run(tenantId, metrics.score, metrics.grade, metrics.violations);

				console.log(`\n${GLYPHS.VALID} Score saved to database`);
				db.close();
			}
			break;
		}

		case "export": {
			const format = (args[1] as "json" | "csv") || "json";
			const output = await exportRegistryStats(format);
			const outputPath = `./.registry-cache/stats.${format}`;
			await Bun.write(outputPath, output);
			console.log(`${GLYPHS.VALID} Exported to ${outputPath}`);
			console.log(output.slice(0, 500));
			break;
		}

		case "list": {
			console.log(
				`${GLYPHS.SCHEMA} Registered Tools (${Object.keys(TOOL_SCHEMAS).length}):\n`,
			);
			console.log(
				Bun.inspect.table(
					Object.entries(TOOL_SCHEMAS).map(([name, schema]) => ({
						Tool: name,
						Category: schema.category,
						Tier: schema.tier,
						Glyph: schema.glyph,
						Required: (schema.required || []).join(", ") || "none",
					})),
				),
			);
			break;
		}

		case "help":
		default:
			console.log(`
${GLYPHS.DRIFT} Tier-1380 Registry Validation & Compliance

Usage:
  bun run registry:validate <tool> [args-json]  Validate tool call
  bun run registry:compliance [tenant]          Calculate compliance score
  bun run registry:export [json|csv]            Export registry stats
  bun run registry:list                         List all registered tools

Examples:
  bun run registry:validate registry/r2/upload '{"localPath":"file.txt"}'
  bun run registry:compliance tenant-a
  bun run registry:export csv
`);
	}
}

if (import.meta.main) {
	main();
}

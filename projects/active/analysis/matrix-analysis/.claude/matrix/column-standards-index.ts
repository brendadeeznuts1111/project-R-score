/**
 * Tier-1380 OMEGA: Column Standards Index
 *
 * Centralized export of all MATRIX_COLUMNS for CLI consumption
 * Imported by column-standards-all.ts for god-tier interactive surface
 *
 * @module column-standards-index
 * @tier 1380-OMEGA-96COL
 */

import {
	CHROME_API_COLUMNS,
	CHROME_COOKIE_COLUMNS,
	CHROME_GLOBAL_COLUMNS,
	CHROME_PROFILE_COLUMNS,
	CHROME_TAB_COLUMNS,
} from "./chrome-api-standards";
import { COLUMN_STANDARDS } from "./column-standards";
import { CLOUDFLARE_COLUMNS, CLOUDFLARE_OWNERSHIP } from "./column-standards-cloudflare";
import { CORE_COLUMNS } from "./column-standards-core";
import {
	DEFAULT_COLUMN,
	generateDefaultGrepTag,
	getDefaultValue,
} from "./column-standards-default";
import { TENSION_COLUMNS } from "./column-standards-tension";
import { VALIDATION_COLUMNS } from "./column-standards-validation";

// ═════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═════════════════════════════════════════════════════════════════════════════

export type TeamId =
	| "runtime"
	| "security"
	| "platform"
	| "tension"
	| "infra"
	| "validation"
	| "skills";

export interface UriPattern {
	protocol?: string;
	hostname?: string;
	pathname?: string;
	query?: Record<string, string>;
}

export interface ColumnDefinition {
	index: number;
	name: string;
	type: string;
	owner: TeamId;
	color: string;
	description?: string;
	required: boolean;
	zone: string;
	// Optional fields based on type
	values?: string[];
	range?: [number, number];
	unit?: string;
	precision?: number;
	trigger?: string;
	warning?: string;
	critical?: string;
	formula?: string;
	pattern?: string;
	protocol?: string;
	example?: string;
	format?: string;
	profileLink?: boolean;
	default?: unknown;
	alias?: number;
	alert?: string;
	// Extended fields
	uriPattern?: UriPattern;
	category?: string;
	id?: string;
}

// ═════════════════════════════════════════════════════════════════════════════
// MATRIX_COLUMNS UNIFIED (0-96)
// ═════════════════════════════════════════════════════════════════════════════

export const MATRIX_COLUMNS: Record<number, ColumnDefinition> = {
	// DEFAULT (0)
	0: {
		index: 0,
		name: "default",
		type: "variant",
		owner: "infra",
		color: "⚪",
		description: "Context-dependent DEFAULT column",
		required: true,
		zone: "default",
		default: "[DEFAULT:CONTEXT]",
	},

	// Core (1-10)
	...Object.fromEntries(
		Object.entries(CORE_COLUMNS).map(([idx, col]: [string, any]) => [
			Number(idx),
			{
				index: Number(idx),
				name: col.name,
				type: col.type,
				owner: col.owner as TeamId,
				color: col.color,
				description: col.description,
				required: col.required ?? false,
				zone: "core",
				values: col.values,
				example: col.example,
				format: col.format,
			} as ColumnDefinition,
		]),
	),

	// Security (11-20) - placeholders
	...Object.fromEntries(
		Array.from({ length: 10 }, (_, i) => [
			11 + i,
			{
				index: 11 + i,
				name: `security-col-${11 + i}`,
				type: "string",
				owner: "security" as TeamId,
				color: "🔴",
				description: `Security column ${11 + i}`,
				required: false,
				zone: "security",
			} as ColumnDefinition,
		]),
	),

	// Cloudflare (21-30)
	...Object.fromEntries(
		Object.entries(CLOUDFLARE_COLUMNS).map(([idx, col]: [string, any]) => [
			Number(idx),
			{
				index: Number(idx),
				name: col.name,
				type: col.type,
				owner: col.owner as TeamId,
				color: col.color,
				description: col.description,
				required: col.required ?? false,
				zone: "cloudflare",
				profileLink: col.profileLink,
				pattern: col.pattern,
				protocol: col.protocol,
				unit: col.unit,
				uriPattern: col.uriPattern,
			} as ColumnDefinition,
		]),
	),

	// Tension (31-45)
	...Object.fromEntries(
		Object.entries(TENSION_COLUMNS).map(([idx, col]: [string, any]) => [
			Number(idx),
			{
				index: Number(idx),
				name: col.name,
				type: col.type,
				owner: col.owner as TeamId,
				color: col.color,
				description: col.description,
				required: col.required ?? false,
				zone: "tension",
				range: col.range,
				precision: col.precision,
				unit: col.unit,
				trigger: col.trigger,
				formula: col.formula,
				values: col.values,
				alert: col.alert,
				pattern: col.pattern,
				protocol: col.protocol,
				uriPattern:
					col.uriPattern ||
					(col.protocol && col.pattern
						? {
								protocol: col.protocol,
								hostname: col.pattern.split("/")[0],
								pathname: `/${col.pattern.split("/").slice(1).join("/")}`,
							}
						: undefined),
			} as ColumnDefinition,
		]),
	),

	// Infra (46-60) - placeholders
	...Object.fromEntries(
		Array.from({ length: 15 }, (_, i) => [
			46 + i,
			{
				index: 46 + i,
				name: `infra-col-${46 + i}`,
				type: "string",
				owner: "infra" as TeamId,
				color: "🟢",
				description: `Infrastructure column ${46 + i}`,
				required: false,
				zone: "infra",
			} as ColumnDefinition,
		]),
	),

	// Validation (61-75)
	...Object.fromEntries(
		Object.entries(VALIDATION_COLUMNS).map(([idx, col]: [string, any]) => [
			Number(idx),
			{
				index: Number(idx),
				name: col.name,
				type: col.type,
				owner: col.owner as TeamId,
				color: col.color,
				description: col.description,
				required: col.required ?? false,
				zone: "validation",
				values: col.values,
				formula: col.formula,
				example: col.example,
			} as ColumnDefinition,
		]),
	),

	// Extensibility (76-88)
	...Object.fromEntries(
		Array.from({ length: 13 }, (_, i) => [
			76 + i,
			{
				index: 76 + i,
				name: i === 0 ? "profile-link" : `reserved-${i}`,
				type: i === 0 ? "url" : "string",
				owner: "infra" as TeamId,
				color: "⚪",
				description: i === 0 ? "CPU/Heap profile link" : `Reserved slot ${i}`,
				required: false,
				zone: "extensibility",
			} as ColumnDefinition,
		]),
	),

	// Skills (89-95)
	...Object.fromEntries(
		Object.values(COLUMN_STANDARDS)
			.filter((col: any) => col.category === "skills")
			.map((col: any) => [
				col.index,
				{
					index: col.index,
					name: col.id,
					type: col.type,
					owner: "skills" as TeamId,
					color: "📝",
					description: col.description,
					required: col.required,
					zone: "skills",
					category: col.category,
					id: col.id,
				} as ColumnDefinition,
			]),
	),

	// DEFAULT trailing (96)
	96: {
		index: 96,
		name: "trailing-default",
		type: "variant",
		owner: "infra",
		color: "⚪",
		description: "Trailing DEFAULT column (alias of col 0)",
		required: false,
		zone: "default",
		alias: 0,
	},
};

// Chrome API columns (71-75) - extend with detailed chrome state info
Object.assign(MATRIX_COLUMNS, {
	71: {
		index: 71,
		name: "chrome-cookie-store",
		type: "object",
		owner: "platform",
		color: "🔵",
		description: "Chrome cookie store snapshot",
		required: false,
		zone: "chrome",
		uriPattern: {
			protocol: "chrome",
			hostname: "cookies",
			pathname: "/:storeId",
		},
	},
	72: {
		index: 72,
		name: "chrome-domain-bound",
		type: "boolean",
		owner: "platform",
		color: "🔵",
		description: "Chrome domain-bound session indicator",
		required: false,
		zone: "chrome",
	},
	73: {
		index: 73,
		name: "chrome-partition-key",
		type: "string",
		owner: "platform",
		color: "🔵",
		description: "Chrome storage partition key",
		required: false,
		zone: "chrome",
	},
	74: {
		index: 74,
		name: "chrome-state-entropy",
		type: "float",
		owner: "platform",
		color: "🔵",
		description: "Chrome state entropy score (0-1)",
		required: false,
		zone: "chrome",
		range: [0, 1],
		precision: 4,
	},
	75: {
		index: 75,
		name: "chrome-integrity-seal",
		type: "hex",
		owner: "platform",
		color: "🔵",
		description: "Chrome state integrity SHA-256 seal",
		required: false,
		zone: "chrome",
		format: "0x...",
	},
} as Record<number, ColumnDefinition>);

// ═════════════════════════════════════════════════════════════════════════════
// ZONE METADATA
// ═════════════════════════════════════════════════════════════════════════════

export const ZONES = {
	default: {
		start: 0,
		end: 0,
		color: "\x1b[38;5;250m",
		emoji: "⚪",
		team: "infra",
		description: "Context-dependent DEFAULT",
	},
	core: {
		start: 1,
		end: 10,
		color: "\x1b[38;5;75m",
		emoji: "🔵",
		team: "runtime",
		description: "Core / Runtime / Header invariants",
	},
	security: {
		start: 11,
		end: 20,
		color: "\x1b[38;5;203m",
		emoji: "🔴",
		team: "security",
		description: "Security policy & audit",
	},
	cloudflare: {
		start: 21,
		end: 30,
		color: "\x1b[38;5;141m",
		emoji: "🟣",
		team: "platform",
		description: "Cloudflare edge telemetry",
	},
	tension: {
		start: 31,
		end: 45,
		color: "\x1b[38;5;208m",
		emoji: "🟠",
		team: "tension",
		description: "Tension anomaly detection (XGBoost)",
	},
	infra: {
		start: 46,
		end: 60,
		color: "\x1b[38;5;78m",
		emoji: "🟢",
		team: "infra",
		description: "Infrastructure metrics",
	},
	validation: {
		start: 61,
		end: 75,
		color: "\x1b[38;5;220m",
		emoji: "🟡",
		team: "validation",
		description: "Validation & quality gates",
	},
	extensibility: {
		start: 76,
		end: 88,
		color: "\x1b[38;5;250m",
		emoji: "⚪",
		team: "infra",
		description: "Extensibility & profile links",
	},
	skills: {
		start: 89,
		end: 95,
		color: "\x1b[38;5;159m",
		emoji: "📝",
		team: "skills",
		description: "Skill invocation tracking",
	},
	chrome: {
		start: 71,
		end: 75,
		color: "\x1b[38;5;33m",
		emoji: "🔷",
		team: "platform",
		description: "Chrome state & cookie management",
	},
} as const;

// ═════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═════════════════════════════════════════════════════════════════════════════

export function getColumn(index: number): ColumnDefinition | undefined {
	return MATRIX_COLUMNS[index];
}

export function getColumnsByTeam(team: TeamId): ColumnDefinition[] {
	return Object.values(MATRIX_COLUMNS).filter((col) => col.owner === team);
}

export function getColumnsByZone(zone: string): ColumnDefinition[] {
	return Object.values(MATRIX_COLUMNS).filter((col) => col.zone === zone);
}

export function getZoneForColumnIndex(index: number): string | null {
	if (index === 0 || index === 96) return "default";
	if (index >= 1 && index <= 10) return "core";
	if (index >= 11 && index <= 20) return "security";
	if (index >= 21 && index <= 30) return "cloudflare";
	if (index >= 31 && index <= 45) return "tension";
	if (index >= 46 && index <= 60) return "infra";
	if (index >= 61 && index <= 70) return "validation";
	if (index >= 71 && index <= 75) return "chrome";
	if (index >= 76 && index <= 88) return "extensibility";
	if (index >= 89 && index <= 95) return "skills";
	return null;
}

export function getTeamForColumnIndex(index: number): TeamId | null {
	const col = MATRIX_COLUMNS[index];
	return col?.owner || null;
}

// Re-exports for compatibility
export {
	CHROME_API_COLUMNS,
	CHROME_COOKIE_COLUMNS,
	CHROME_GLOBAL_COLUMNS,
	CHROME_PROFILE_COLUMNS,
	CHROME_TAB_COLUMNS,
	CLOUDFLARE_COLUMNS,
	CLOUDFLARE_OWNERSHIP,
	CORE_COLUMNS,
	DEFAULT_COLUMN,
	TENSION_COLUMNS,
	VALIDATION_COLUMNS,
	COLUMN_STANDARDS,
	generateDefaultGrepTag,
	getDefaultValue,
};

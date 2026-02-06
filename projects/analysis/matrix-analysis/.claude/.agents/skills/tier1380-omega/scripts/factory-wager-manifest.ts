#!/usr/bin/env bun
/**
 * FACTORY_WAGER Tier-1380 Constants & Governance Manifest
 * [DOMAIN][SCOPE][TYPE][META:{PROPERTY}][CLASS][FUNCTION][INTERFACE][#REF:*][BUN-NATIVE]
 */

// ============================================================================
// COLOR CONSTANTS (from table)
// ============================================================================

export const FACTORY_WAGER_CONSTANTS = {
	// Tier & Mode
	FACTORY_WAGER_TIER: {
		value: "#ff6b6b",
		color: Bun.color("#ff6b6b", "hex"),
		description: "Factory tier level",
		icon: "🔐",
	},
	FACTORY_WAGER_MODE: {
		value: "#4ecdc4",
		color: Bun.color("hsl(174, 60%, 65%)", "hex"),
		description: "Deployment mode",
		icon: "🚀",
	},

	// Infrastructure
	BASE_URL: {
		value: "#00b894",
		color: Bun.color([0, 184, 148], "hex"),
		description: "Base API URL",
		icon: "🌐",
	},
	PORT: {
		value: "#ffd93d",
		color: Bun.color(0xffd93d, "hex"),
		description: "Server port",
		icon: "⚡",
	},
	WORKER_COUNT: {
		value: "#00ffff",
		color: Bun.color("cyan", "hex"),
		description: "Worker threads",
		icon: "🔧",
	},
	R2_BUCKETS: {
		value: "#6c5ce7",
		color: Bun.color({ r: 108, g: 92, b: 231 }, "hex"),
		description: "R2 bucket names",
		icon: "💾",
		type: "const[]" as const,
	},

	// Security
	QUANTUM_ALGORITHM: {
		value: "#00b894",
		color: Bun.color("#00B894", "hex"),
		description: "Quantum seal algorithm",
		icon: "🛡️",
	},
	ARGON2ID_PARAMS: {
		value: "#9b59b6",
		color: Bun.color("rgb(155, 89, 182)", "hex"),
		description: "Argon2id parameters",
		icon: "🔑",
	},

	// Performance
	METRICS_INTERVAL: {
		value: "#fd79a8",
		color: Bun.color([253, 121, 168], "hex"),
		description: "Metrics collection interval",
		icon: "⏱️",
	},
	STORAGE_WARNING_GB: {
		value: "#e17055",
		color: Bun.color(0xe17055, "hex"),
		description: "Storage warning threshold",
		icon: "📈",
	},
	WEBSOCKET_TIMEOUT: {
		value: "#ff9f43",
		color: Bun.color("orange", "hex"),
		description: "WebSocket timeout",
		icon: "📡",
	},

	// Capacity
	MAX_TEAM_PROFILES: {
		value: "#74b9ff",
		color: Bun.color("hsl(210, 100%, 70%)", "hex"),
		description: "Max profiles per team",
		icon: "👥",
	},
	MAX_TERMINAL_SESSIONS: {
		value: "#a29bfe",
		color: Bun.color("#A29BFE", "hex"),
		description: "Max terminal sessions",
		icon: "💻",
	},
	SESSION_BUFFER_SIZE: {
		value: "#55e6c1",
		color: Bun.color([85, 230, 193], "hex"),
		description: "Terminal buffer lines",
		icon: "🎯",
	},

	// Data Lifecycle
	RSS_UPDATE_INTERVAL: {
		value: "#f97f51",
		color: Bun.color("#F97F51", "hex"),
		description: "RSS feed update interval",
		icon: "🔄",
	},
	METRICS_RETENTION_DAYS: {
		value: "#82589f",
		color: Bun.color(0x82589f, "hex"),
		description: "Metrics retention period",
		icon: "📊",
	},
} as const;

// Type inference
export type FactoryWagerConstant = keyof typeof FACTORY_WAGER_CONSTANTS;

// ============================================================================
// EXTENDED GOVERNANCE FORMAT TYPES
// ============================================================================

export interface ExtendedCommitMessage {
	domain: "MARKET" | "SECURITY" | "INFRA" | "SKILLS" | "MICROSTRUCTURE";
	scope: string;
	type: "FEAT" | "FIX" | "REFACTOR" | "PERF" | "DOCS" | "CHORE";
	meta: Record<string, string>;
	className?: string;
	functionName?: string;
	interfaceName?: string;
	ref?: string;
	bunNative: boolean;
	subject: string;
}

// Parser regex
export const EXTENDED_GOVERNANCE_REGEX =
	/^\[(?<domain>[A-Z]+)\]\[(?<scope>[A-Z:_-]+)\]\[(?<type>FEAT|FIX|REFACTOR|PERF|DOCS|CHORE)\](?:\[META:\{(?<meta>[^}]+)\}\])?(?:\[(?<className>[A-Z][a-zA-Z0-9_]+)\])?(?:\[(?<functionName>[a-z][a-zA-Z0-9_]*)\])?(?:\[(?<interfaceName>[A-Z][a-zA-Z0-9_]+)\])?(?:\[#REF:(?<ref>[\w#-]+)\])?(?<bunNative>\[BUN-NATIVE\])?\s+(?<subject>.+)$/;

// ============================================================================
// VALIDATION & PARSING
// ============================================================================

export function parseExtendedCommit(message: string): ExtendedCommitMessage | null {
	const match = EXTENDED_GOVERNANCE_REGEX.exec(message);
	if (!match?.groups) return null;

	const { groups } = match;

	// Parse META:{key:value,key2:value2}
	const meta: Record<string, string> = {};
	if (groups.meta) {
		groups.meta.split(",").forEach((pair) => {
			const [k, v] = pair.split(":").map((s) => s.trim());
			if (k && v) meta[k] = v;
		});
	}

	return {
		domain: groups.domain as ExtendedCommitMessage["domain"],
		scope: groups.scope,
		type: groups.type as ExtendedCommitMessage["type"],
		meta,
		className: groups.className,
		functionName: groups.functionName,
		interfaceName: groups.interfaceName,
		ref: groups.ref,
		bunNative: !!groups.bunNative,
		subject: groups.subject,
	};
}

// ============================================================================
// COLOR UTILITIES
// ============================================================================

export function getConstantColor(name: FactoryWagerConstant): string | null {
	return FACTORY_WAGER_CONSTANTS[name].color;
}

export function renderConstantsTable(): string {
	const rows = Object.entries(FACTORY_WAGER_CONSTANTS).map(([name, data]) => ({
		icon: (data as { icon: string }).icon || "⬜",
		name,
		value: data.value,
		description: data.description,
	}));

	return Bun.inspect.table(rows, {
		colors: true,
	});
}

// ============================================================================
// VALIDATION RESULT
// ============================================================================

export interface ValidationResult {
	valid: boolean;
	format: "extended" | "legacy" | "invalid";
	domain?: string;
	tier?: number;
	bunNative?: boolean;
	ref?: string;
	blastRadius?: {
		class?: string;
		function?: string;
		interface?: string;
	};
	errors?: string[];
}

export function validateExtendedMessage(message: string): ValidationResult {
	// Try extended format first
	const extended = parseExtendedCommit(message);
	if (extended) {
		return {
			valid: true,
			format: "extended",
			domain: extended.domain,
			tier: Number.parseInt(extended.meta.TIER) || 0,
			bunNative: extended.bunNative,
			ref: extended.ref,
			blastRadius: {
				class: extended.className,
				function: extended.functionName,
				interface: extended.interfaceName,
			},
		};
	}

	// Fall back to legacy format check
	const legacyRegex = /^\[([A-Z]+)\]\[COMPONENT:([A-Z]+)\]\[TIER:(\d+)\]\s+(.+)$/;
	const legacyMatch = legacyRegex.exec(message);
	if (legacyMatch) {
		return {
			valid: true,
			format: "legacy",
			domain: legacyMatch[1],
			tier: Number.parseInt(legacyMatch[3]),
		};
	}

	return {
		valid: false,
		format: "invalid",
		errors: ["Message does not match extended or legacy format"],
	};
}

// ============================================================================
// EXAMPLE USAGE
// ============================================================================

if (import.meta.main) {
	console.log("🏭 FACTORY_WAGER Tier-1380 Manifest\n");

	// Test governance parsing
	const testMsg =
		"[MARKET][MICROSTRUCTURE:PATTERNS][FEAT][META:{TIER:1380,RISK:HIGH}][MarketAnalyzer][detectHiddenSteam][T11_v2Pattern][#REF:52][BUN-NATIVE] Implement Hidden Steam T11_v2";

	console.log("🔍 Parsing:", testMsg.slice(0, 60) + "...\n");
	const parsed = parseExtendedCommit(testMsg);
	if (parsed) {
		console.log("Parsed Result:");
		console.log(Bun.inspect(parsed, { colors: true, depth: null }));
	}

	// Validate
	console.log("\n✅ Validation:");
	const validation = validateExtendedMessage(testMsg);
	console.log(Bun.inspect(validation, { colors: true }));

	// Constants table
	console.log("\n🎨 Constants Table:");
	console.log(renderConstantsTable());

	// Example commit commands
	console.log("\n📝 Example Commit Commands:");
	console.log(
		'git commit -m "[MARKET][MICROSTRUCTURE][FEAT][META:{TIER:1380}][MarketAnalyzer][detectSteam][T11][#REF:52][BUN-NATIVE] Hidden Steam T11_v2"',
	);
	console.log(
		'git commit -m "[INFRA][R2:STORAGE][FIX][META:{TIER:1380}][BucketManager][upload][R2Client][#REF:123] Fix upload retry logic"',
	);
}

// All exports already defined above

/**
 * [DoD][CLASS:TimezoneConfig][SCOPE:GlobalTiming]
 * Centralized timezone configuration for mission-critical event correlation
 * Regulatory requirement: All timestamps must be traceable to UTC with local offset
 * 
 * @module core/timezone
 * @description Timezone service for HyperBun MLGS with DoD compliance
 */

import { Database } from "bun:sqlite";

// Primary timezones for sports betting jurisdictions
export const SUPPORTED_TZ = {
	UTC: { offset: 0, abbr: "UTC", description: "Universal Coordinated Time" },
	EST: { offset: -5, abbr: "EST", description: "Eastern Standard Time (NYC)" },
	EDT: { offset: -4, abbr: "EDT", description: "Eastern Daylight Time (NYC)" },
	PST: { offset: -8, abbr: "PST", description: "Pacific Standard Time (Vegas)" },
	PDT: { offset: -7, abbr: "PDT", description: "Pacific Daylight Time (Vegas)" },
	GMT: { offset: 0, abbr: "GMT", description: "Greenwich Mean Time (London)" },
	BST: { offset: 1, abbr: "BST", description: "British Summer Time (London)" },
	CET: { offset: 1, abbr: "CET", description: "Central European Time" },
	CEST: { offset: 2, abbr: "CEST", description: "Central European Summer Time" },
	AEST: { offset: 10, abbr: "AEST", description: "Australian Eastern Standard Time" },
} as const;

export type TimezoneKey = keyof typeof SUPPORTED_TZ;

export interface TimezoneConfig {
	system_timezone: TimezoneKey; // Runtime timezone for operators
	storage_timezone: "UTC"; // FIXED: Must be UTC (regulatory)
	event_timezone_source: "auto" | "explicit"; // Auto-detect from eventId
	daylight_saving: "auto" | "disabled"; // Auto-adjust for DST
	audit_format: "ISO8601" | "RFC3339" | "UNIX_MS"; // Audit log format
}

// ==================== [DoD][REGISTRY:TimezoneDefaults] ====================
export const DEFAULT_TZ_CONFIG: TimezoneConfig = {
	system_timezone: "PST", // Default: Vegas time (primary data center)
	storage_timezone: "UTC", // Immutable
	event_timezone_source: "auto",
	daylight_saving: "auto",
	audit_format: "ISO8601",
} as const;

// ==================== [DoD][CLASS:TimezoneService] ====================
export class TimezoneService {
	private readonly db: Database;
	private config: TimezoneConfig;
	private dstTransitions: Map<number, TimezoneKey> = new Map();

	constructor(db: Database, config: Partial<TimezoneConfig> = {}) {
		this.db = db;
		this.config = { ...DEFAULT_TZ_CONFIG, ...config };
		this.initializeDSTDatabase();
	}

	private initializeDSTDatabase(): void {
		// DST transition table for 2024-2026
		// Required for historical event correlation
		this.db.run(`
      CREATE TABLE IF NOT EXISTS timezone_transitions (
        transition_id INTEGER PRIMARY KEY AUTOINCREMENT,
        transition_timestamp INTEGER NOT NULL,
        from_tz TEXT NOT NULL,
        to_tz TEXT NOT NULL,
        offset_change INTEGER NOT NULL
      )
    `);

		this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_transition_time 
      ON timezone_transitions(transition_timestamp)
    `);

		// Pre-populate known DST transitions (US & EU)
		const transitions = [
			{ ts: 1709222400000, from: "PST", to: "PDT", change: 1 }, // 2024-03-10 02:00 PST → PDT
			{ ts: 1727779200000, from: "PDT", to: "PST", change: -1 }, // 2024-11-03 02:00 PDT → PST
			{ ts: 1711843200000, from: "CET", to: "CEST", change: 1 }, // 2024-03-31 02:00 CET → CEST
			{ ts: 1727779200000, from: "CEST", to: "CET", change: -1 }, // 2024-10-27 03:00 CEST → CET
			{ ts: 1730419200000, from: "PST", to: "PDT", change: 1 }, // 2025-03-09 02:00 PST → PDT
			{ ts: 1738972800000, from: "PDT", to: "PST", change: -1 }, // 2025-11-02 02:00 PDT → PST
			{ ts: 1733011200000, from: "CET", to: "CEST", change: 1 }, // 2025-03-30 02:00 CET → CEST
			{ ts: 1738972800000, from: "CEST", to: "CET", change: -1 }, // 2025-10-26 03:00 CEST → CET
			{ ts: 1761955200000, from: "PST", to: "PDT", change: 1 }, // 2026-03-08 02:00 PST → PDT
			{ ts: 1770508800000, from: "PDT", to: "PST", change: -1 }, // 2026-11-01 02:00 PDT → PST
			{ ts: 1764547200000, from: "CET", to: "CEST", change: 1 }, // 2026-03-29 02:00 CET → CEST
			{ ts: 1770508800000, from: "CEST", to: "CET", change: -1 }, // 2026-10-25 03:00 CEST → CET
		];

		const existing = this.db
			.prepare("SELECT COUNT(*) as cnt FROM timezone_transitions")
			.get() as { cnt: number };
		if (existing.cnt === 0) {
			const stmt = this.db.prepare(`
        INSERT INTO timezone_transitions (transition_timestamp, from_tz, to_tz, offset_change)
        VALUES (?, ?, ?, ?)
      `);
			const insert = this.db.transaction((rows: typeof transitions) => {
				for (const row of rows) {
					stmt.run(row.ts, row.from, row.to, row.change);
				}
			});
			insert(transitions);
		}
	}

	// ==================== [DoD][METHOD:GetCurrentOffset] ====================
	getCurrentOffset(tz: TimezoneKey = this.config.system_timezone): number {
		// UTC never has DST adjustments
		if (tz === "UTC") {
			return 0;
		}

		if (this.config.daylight_saving === "disabled") {
			return SUPPORTED_TZ[tz].offset;
		}

		const now = Date.now();
		const transition = this.db
			.prepare(`
      SELECT to_tz, offset_change 
      FROM timezone_transitions 
      WHERE transition_timestamp <= ? 
      AND (from_tz = ? OR to_tz = ?)
      ORDER BY transition_timestamp DESC 
      LIMIT 1
    `)
			.get(now, tz, tz) as
			| { to_tz: TimezoneKey; offset_change: number }
			| undefined;

		const baseOffset = SUPPORTED_TZ[tz].offset;
		const dstAdjustment = transition?.offset_change || 0;

		return baseOffset + dstAdjustment;
	}

	// ==================== [DoD][METHOD:ConvertTimestamp] ====================
	convertTimestamp(
		timestamp: number,
		fromTz: TimezoneKey | "UTC",
		toTz: TimezoneKey | "UTC" = this.config.system_timezone,
	): { utc: number; local: number; tz: TimezoneKey; offset: number } {
		const fromOffset =
			fromTz === "UTC" ? 0 : this.getCurrentOffset(fromTz);
		const toOffset = toTz === "UTC" ? 0 : this.getCurrentOffset(toTz);

		const utcTime = timestamp - fromOffset * 3600000; // Convert to UTC
		const localTime = utcTime + toOffset * 3600000; // Convert to target TZ

		return {
			utc: utcTime,
			local: localTime,
			tz: toTz,
			offset: toOffset,
		};
	}

	// ==================== [DoD][METHOD:FormatForAudit] ====================
	formatForAudit(timestamp: number, tz: TimezoneKey = "UTC"): string {
		const converted = this.convertTimestamp(timestamp, "UTC", tz);
		const date = new Date(converted.local);

		switch (this.config.audit_format) {
			case "ISO8601": {
				const offsetHours = Math.floor(Math.abs(converted.offset));
				const offsetMinutes = Math.abs(converted.offset % 1) * 60;
				const sign = converted.offset >= 0 ? "+" : "-";
				const offsetStr = `${sign}${String(offsetHours).padStart(2, "0")}:${String(offsetMinutes).padStart(2, "0")}`;
				return date.toISOString().replace("Z", offsetStr);
			}
			case "RFC3339":
				return date.toISOString();
			case "UNIX_MS":
				return timestamp.toString();
			default:
				return date.toISOString();
		}
	}

	// ==================== [DoD][METHOD:EventTimezoneDetector] ====================
	detectEventTimezone(eventId: string): TimezoneKey {
		if (this.config.event_timezone_source === "explicit") {
			return this.config.system_timezone;
		}

		// Auto-detect from eventId format: NFL-20241207-1345-PST
		const match = eventId.match(/-([A-Z]{3,4})$/);
		if (match && match[1] in SUPPORTED_TZ) {
			return match[1] as TimezoneKey;
		}

		// Fallback to venue-based detection
		const venueMap: Record<string, TimezoneKey> = {
			VEGAS: "PST",
			NYC: "EST",
			LONDON: "GMT",
			MELBOURNE: "AEST",
		};

		for (const [venue, tz] of Object.entries(venueMap)) {
			if (eventId.includes(venue)) return tz;
		}

		return this.config.system_timezone; // Default fallback
	}

	/**
	 * Get configuration
	 */
	getConfig(): TimezoneConfig {
		return { ...this.config };
	}

	/**
	 * Update configuration (for runtime adjustments)
	 */
	updateConfig(updates: Partial<TimezoneConfig>): void {
		this.config = { ...this.config, ...updates };
		// Note: storage_timezone cannot be changed (regulatory requirement)
		if (updates.storage_timezone && updates.storage_timezone !== "UTC") {
			throw new Error(
				"storage_timezone must remain UTC for regulatory compliance",
			);
		}
	}
}

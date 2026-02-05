/**
 * @fileoverview Timezone Service Tests
 * @description Tests for DoD-compliant timezone configuration
 */

import { describe, test, expect, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import {
	TimezoneService,
	SUPPORTED_TZ,
	DEFAULT_TZ_CONFIG,
	type TimezoneKey,
} from "../../src/core/timezone";

describe("TimezoneService", () => {
	let db: Database;
	let timezoneService: TimezoneService;

	beforeEach(() => {
		db = new Database(":memory:");
		timezoneService = new TimezoneService(db);
	});

	describe("Constructor", () => {
		test("should initialize with default config", () => {
			const config = timezoneService.getConfig();
			expect(config.system_timezone).toBe("PST");
			expect(config.storage_timezone).toBe("UTC");
			expect(config.event_timezone_source).toBe("auto");
			expect(config.daylight_saving).toBe("auto");
			expect(config.audit_format).toBe("ISO8601");
		});

		test("should initialize DST transition table", () => {
			const result = db
				.prepare("SELECT COUNT(*) as cnt FROM timezone_transitions")
				.get() as { cnt: number };
			expect(result.cnt).toBeGreaterThan(0);
		});
	});

	describe("getCurrentOffset", () => {
		test("should return correct offset for PST (accounting for DST)", () => {
			const offset = timezoneService.getCurrentOffset("PST");
			// PST is -8, but if DST is active (PDT), it's -7
			// Accept either value depending on current date
			expect([-8, -7]).toContain(offset);
		});

		test("should return correct offset for EST (accounting for DST)", () => {
			const offset = timezoneService.getCurrentOffset("EST");
			// EST is -5, but if DST is active (EDT), it's -4
			// Accept either value depending on current date
			expect([-5, -4]).toContain(offset);
		});

		test("should return correct offset for UTC", () => {
			const offset = timezoneService.getCurrentOffset("UTC");
			expect(offset).toBe(0);
		});

		test("should use system_timezone as default", () => {
			const offset = timezoneService.getCurrentOffset();
			// PST default is -8, but if DST is active (PDT), it's -7
			expect([-8, -7]).toContain(offset);
		});
	});

	describe("convertTimestamp", () => {
		test("should convert UTC to PST", () => {
			const utcTimestamp = Date.now();
			const result = timezoneService.convertTimestamp(
				utcTimestamp,
				"UTC",
				"PST",
			);

			expect(result.utc).toBe(utcTimestamp);
			expect(result.tz).toBe("PST");
			// PST offset is -8, but if DST is active (PDT), it's -7
			expect([-8, -7]).toContain(result.offset);
			// Local time should be offset hours behind UTC (offset is negative, so we add it)
			const expectedLocal = utcTimestamp + result.offset * 3600000;
			expect(result.local).toBe(expectedLocal);
		});

		test("should convert PST to UTC", () => {
			const pstTimestamp = Date.now();
			const result = timezoneService.convertTimestamp(
				pstTimestamp,
				"PST",
				"UTC",
			);

			expect(result.tz).toBe("UTC");
			expect(result.offset).toBe(0);
			// UTC time should be offset hours ahead of PST
			const pstOffset = timezoneService.getCurrentOffset("PST");
			const expectedUtc = pstTimestamp - pstOffset * 3600000;
			expect(result.utc).toBe(expectedUtc);
		});

		test("should use system_timezone as default target", () => {
			const utcTimestamp = Date.now();
			const result = timezoneService.convertTimestamp(utcTimestamp, "UTC");

			expect(result.tz).toBe("PST"); // Default system timezone
		});
	});

	describe("formatForAudit", () => {
		test("should format as ISO8601", () => {
			const timestamp = Date.now();
			const formatted = timezoneService.formatForAudit(timestamp, "UTC");

			expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
		});

		test("should include timezone offset in ISO8601 format", () => {
			const timestamp = Date.now();
			const formatted = timezoneService.formatForAudit(timestamp, "PST");

			// Should include offset like -08:00
			expect(formatted).toMatch(/[+-]\d{2}:\d{2}$/);
		});

		test("should format as UNIX_MS when configured", () => {
			timezoneService.updateConfig({ audit_format: "UNIX_MS" });
			const timestamp = Date.now();
			const formatted = timezoneService.formatForAudit(timestamp, "UTC");

			expect(formatted).toBe(timestamp.toString());
		});
	});

	describe("detectEventTimezone", () => {
		test("should detect timezone from eventId suffix", () => {
			const eventId = "NFL-20241207-1345-PST";
			const tz = timezoneService.detectEventTimezone(eventId);
			expect(tz).toBe("PST");
		});

		test("should detect EST from eventId", () => {
			const eventId = "NBA-20241208-1900-EST";
			const tz = timezoneService.detectEventTimezone(eventId);
			expect(tz).toBe("EST");
		});

		test("should detect GMT from eventId", () => {
			const eventId = "SOCCER-20241209-1500-GMT";
			const tz = timezoneService.detectEventTimezone(eventId);
			expect(tz).toBe("GMT");
		});

		test("should detect timezone from venue keywords", () => {
			const eventId = "NFL-VEGAS-20241207-1345";
			const tz = timezoneService.detectEventTimezone(eventId);
			expect(tz).toBe("PST");
		});

		test("should fallback to system_timezone when not detected", () => {
			const eventId = "NFL-20241207-1345";
			const tz = timezoneService.detectEventTimezone(eventId);
			expect(tz).toBe("PST"); // Default system timezone
		});
	});

	describe("updateConfig", () => {
		test("should update config", () => {
			timezoneService.updateConfig({ system_timezone: "EST" });
			const config = timezoneService.getConfig();
			expect(config.system_timezone).toBe("EST");
		});

		test("should prevent changing storage_timezone from UTC", () => {
			expect(() => {
				timezoneService.updateConfig({ storage_timezone: "PST" });
			}).toThrow("storage_timezone must remain UTC");
		});
	});

	describe("DST Transitions", () => {
		test("should handle DST transitions", () => {
			// Test that DST transitions are stored
			const transitions = db
				.prepare(
					"SELECT COUNT(*) as cnt FROM timezone_transitions WHERE from_tz = 'PST' AND to_tz = 'PDT'",
				)
				.get() as { cnt: number };
			expect(transitions.cnt).toBeGreaterThan(0);
		});

		test("should adjust offset for DST when enabled", () => {
			// Note: Actual DST adjustment would require specific timestamp testing
			// This test verifies the method exists and works
			const offset = timezoneService.getCurrentOffset("PST");
			expect(typeof offset).toBe("number");
			expect(offset).toBeLessThanOrEqual(-7); // PST is -8, PDT is -7
		});
	});

	describe("Regulatory Compliance", () => {
		test("should always store timestamps in UTC", () => {
			const config = timezoneService.getConfig();
			expect(config.storage_timezone).toBe("UTC");
		});

		test("should format audit logs with timezone offset", () => {
			const timestamp = Date.now();
			const formatted = timezoneService.formatForAudit(timestamp, "PST");
			// Should include timezone offset for regulatory compliance
			expect(formatted).toMatch(/[+-]\d{2}:\d{2}/);
		});
	});
});

describe("SUPPORTED_TZ", () => {
	test("should contain all required timezones", () => {
		expect(SUPPORTED_TZ).toHaveProperty("UTC");
		expect(SUPPORTED_TZ).toHaveProperty("PST");
		expect(SUPPORTED_TZ).toHaveProperty("EST");
		expect(SUPPORTED_TZ).toHaveProperty("GMT");
		expect(SUPPORTED_TZ).toHaveProperty("AEST");
	});

	test("should have correct offsets", () => {
		expect(SUPPORTED_TZ.UTC.offset).toBe(0);
		expect(SUPPORTED_TZ.PST.offset).toBe(-8);
		expect(SUPPORTED_TZ.EST.offset).toBe(-5);
		expect(SUPPORTED_TZ.AEST.offset).toBe(10);
	});
});

describe("DEFAULT_TZ_CONFIG", () => {
	test("should have PST as default system timezone", () => {
		expect(DEFAULT_TZ_CONFIG.system_timezone).toBe("PST");
	});

	test("should have UTC as storage timezone", () => {
		expect(DEFAULT_TZ_CONFIG.storage_timezone).toBe("UTC");
	});

	test("should have auto event timezone source", () => {
		expect(DEFAULT_TZ_CONFIG.event_timezone_source).toBe("auto");
	});
});

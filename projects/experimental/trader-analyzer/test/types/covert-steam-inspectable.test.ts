/**
 * Tests for InspectableCovertSteamAlert custom inspect implementation
 */

import { describe, expect, test } from "bun:test";
import {
	InspectableCovertSteamAlert,
	InspectableCovertSteamSendResult,
	makeInspectable,
} from "../../src/types/covert-steam-inspectable";
import type { CovertSteamEventRecord } from "../../src/types/covert-steam";

describe("InspectableCovertSteamAlert", () => {
	test("Custom inspect returns formatted string", () => {
		const alert: CovertSteamEventRecord = {
			event_identifier: "NFL-2025-001",
			detection_timestamp: 1704556800000,
			bookmaker_name: "DraftKings",
			impact_severity_score: 9.5,
			source_dark_node_id: "node_abc123",
		};

		const inspectable = new InspectableCovertSteamAlert(alert);
		const inspected = Bun.inspect(inspectable);

		expect(inspected).toContain("CovertSteamAlert");
		expect(inspected).toContain('event: "NFL-2025-001"');
		expect(inspected).toContain('bookmaker: "DraftKings"');
		expect(inspected).toContain("severity:");
		expect(inspected).toContain("🚨");
		expect(inspected).toContain("CRITICAL");
		expect(inspected).toContain('node: "node_abc123"');
	});

	test("makeInspectable helper creates inspectable alert", () => {
		const alert: CovertSteamEventRecord = {
			event_identifier: "TEST-001",
			detection_timestamp: Date.now(),
		};

		const inspectable = makeInspectable(alert);
		expect(inspectable).toBeInstanceOf(InspectableCovertSteamAlert);
		expect(inspectable.event_identifier).toBe("TEST-001");
	});

	test("toJSON returns plain object", () => {
		const alert: CovertSteamEventRecord = {
			event_identifier: "TEST-002",
			detection_timestamp: 1704556800000,
			bookmaker_name: "Betfair",
			impact_severity_score: 7.5,
		};

		const inspectable = new InspectableCovertSteamAlert(alert);
		const json = inspectable.toJSON();

		expect(json).toEqual(alert);
		expect(json).not.toBeInstanceOf(InspectableCovertSteamAlert);
	});

	test("InspectableCovertSteamSendResult formats success result", () => {
		const result = new InspectableCovertSteamSendResult({
			ok: true,
			messageId: 12345,
		});

		const inspected = Bun.inspect(result);

		expect(inspected).toContain("CovertSteamSendResult");
		expect(inspected).toContain("ok: true");
		expect(inspected).toContain("messageId: 12345");
	});

	test("InspectableCovertSteamSendResult formats error result", () => {
		const result = new InspectableCovertSteamSendResult({
			ok: false,
			error: "Invalid topic ID",
		});

		const inspected = Bun.inspect(result);

		expect(inspected).toContain("CovertSteamSendResult");
		expect(inspected).toContain("ok: false");
		expect(inspected).toContain('error: "Invalid topic ID"');
	});

	test("Custom inspect handles missing optional fields", () => {
		const alert: CovertSteamEventRecord = {
			event_identifier: "MINIMAL-001",
			detection_timestamp: Date.now(),
		};

		const inspectable = new InspectableCovertSteamAlert(alert);
		const inspected = Bun.inspect(inspectable);

		expect(inspected).toContain("CovertSteamAlert");
		expect(inspected).toContain('event: "MINIMAL-001"');
		expect(inspected).not.toContain("bookmaker:");
		expect(inspected).not.toContain("node:");
	});
});

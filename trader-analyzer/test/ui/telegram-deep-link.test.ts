#!/usr/bin/env bun
/**
 * @fileoverview UI Integration Tests for Telegram Deep-Link RFC Compliance
 * @description End-to-end validation of deep-link generation and UI routing per RFC 001
 * @module test/ui/telegram-deep-link
 * @see {@link ../../docs/rfc/001-telegram-deeplink-standard.md|RFC 001: Telegram Deep-Link Standard}
 */

import { test, expect } from "bun:test";
import { DeepLinkGenerator } from "../../src/utils/deeplink-generator";
import type { HyperBunUIContext } from "../../src/services/ui-context-rewriter";

/**
 * Test Formula: Validate RFC-compliant deep-link generation
 * Expected Result: Deep-link URL matches RFC 001 specification with all required parameters
 */
test("Deep-Link RFC Compliance - Covert Steam Alert", () => {
	const generator = new DeepLinkGenerator("http://localhost:8080");
	
	const alert = {
		event_identifier: "NFL-2025-001",
		bookmaker_name: "DraftKings",
		detection_timestamp: 1704556800000,
		source_dark_node_id: "node_abc123",
		impact_severity_score: 9.5,
	};
	
	const link = generator.generateCovertSteamLink(alert);
	const url = new URL(link);
	
	// Validate base URL and path
	expect(url.origin).toBe("http://localhost:8080");
	expect(url.pathname).toBe("/alert/covert-steam/");
	
	// Validate required parameters (RFC 9.1.1.9.1.4.0)
	const params = url.searchParams;
	expect(params.get("id")).toBeTruthy();
	expect(params.get("id")).toContain("NFL-2025-001");
	expect(params.get("id")).toContain("1704556800000");
	expect(params.get("type")).toBe("covert-steam");
	expect(params.get("ts")).toBe("1704556800000");
	
	// Validate optional parameters (RFC 9.1.1.9.1.5.0)
	expect(params.get("bm")).toBe("DraftKings");
	expect(params.get("ev")).toBe("NFL-2025-001");
	expect(params.get("node")).toBe("node_abc123");
	expect(params.get("severity")).toBe("9.5");
});

/**
 * Test Formula: Validate error handling for missing required parameters
 * Expected Result: TypeError thrown with descriptive message
 */
test("Deep-Link RFC Compliance - Error Handling", () => {
	const generator = new DeepLinkGenerator("http://localhost:8080");
	
	// Missing event_identifier
	expect(() => {
		generator.generateCovertSteamLink({
			event_identifier: "",
			detection_timestamp: 1704556800000,
		});
	}).toThrow(TypeError);
	
	// Missing detection_timestamp
	expect(() => {
		generator.generateCovertSteamLink({
			event_identifier: "NFL-2025-001",
			detection_timestamp: undefined as any,
		});
	}).toThrow(TypeError);
});

/**
 * Test Formula: Validate HyperBunUIContext integration
 * Expected Result: Dashboard URL correctly derived from UI context
 */
test("Deep-Link RFC Compliance - HyperBunUIContext Integration", () => {
	const uiContext: HyperBunUIContext = {
		apiBaseUrl: "http://localhost:3001",
		featureFlags: {},
		userRole: "admin",
		debugMode: false,
		currentTimestamp: Date.now(),
	};
	
	const generator = new DeepLinkGenerator(uiContext);
	const dashboardUrl = generator.getDashboardBaseUrl();
	
	// Should convert port 3001 to 8080
	expect(dashboardUrl).toBe("http://localhost:8080");
	
	// Test static factory method
	const generator2 = DeepLinkGenerator.fromUIContext(uiContext);
	expect(generator2.getDashboardBaseUrl()).toBe("http://localhost:8080");
});

/**
 * Test Formula: Validate URL encoding handles special characters
 * Expected Result: Special characters properly encoded in URL parameters
 */
test("Deep-Link RFC Compliance - URL Encoding", () => {
	const generator = new DeepLinkGenerator("http://localhost:8080");
	
	const alert = {
		event_identifier: "NFL-2025-001 & Special",
		bookmaker_name: "DraftKings & Co.",
		detection_timestamp: 1704556800000,
	};
	
	const link = generator.generateCovertSteamLink(alert);
	const url = new URL(link);
	const params = url.searchParams;
	
	// Verify parameters are accessible (URLSearchParams decodes automatically)
	expect(params.get("ev")).toBe("NFL-2025-001 & Special");
	expect(params.get("bm")).toBe("DraftKings & Co.");
	
	// Verify raw URL contains encoded characters
	expect(link).toMatch(/[%+]/); // URL encoding characters present
});

/**
 * Test Formula: Validate performance regression link generation
 * Expected Result: Valid deep-link with performance-specific parameters
 */
test("Deep-Link RFC Compliance - Performance Regression", () => {
	const generator = new DeepLinkGenerator("http://localhost:8080");
	
	const alert = {
		regression_id: "perf-reg-20250106-001",
		detected_at: 1704556800000,
		endpoint: "/api/arbitrage/scan",
		severity: 8.0,
		source: "perf-monitor",
	};
	
	const link = generator.generatePerfRegressionLink(alert);
	const url = new URL(link);
	
	expect(url.pathname).toBe("/alert/perf-regression/");
	
	const params = url.searchParams;
	expect(params.get("id")).toBe("perf-reg-20250106-001");
	expect(params.get("type")).toBe("perf-regression");
	expect(params.get("ts")).toBe("1704556800000");
	expect(params.get("severity")).toBe("8");
	expect(params.get("source")).toBe("perf-monitor");
	expect(params.get("endpoint")).toBe("/api/arbitrage/scan");
});

/**
 * Test Formula: Validate deep-link can be parsed and used in UI
 * Expected Result: URL can be parsed, parameters extracted, and used for dashboard navigation
 */
test("Deep-Link RFC Compliance - UI Routing Validation", () => {
	const generator = new DeepLinkGenerator("http://localhost:8080");
	
	const alert = {
		event_identifier: "NFL-2025-001",
		bookmaker_name: "DraftKings",
		detection_timestamp: 1704556800000,
		source_dark_node_id: "node_abc123",
		impact_severity_score: 9.5,
	};
	
	const deepLink = generator.generateCovertSteamLink(alert);
	
	// Simulate UI routing: Parse URL and extract parameters
	const url = new URL(deepLink);
	const route = url.pathname; // "/alert/covert-steam/"
	const alertId = url.searchParams.get("id");
	const alertType = url.searchParams.get("type");
	const timestamp = url.searchParams.get("ts");
	
	// Validate UI can extract all required information
	expect(route).toBe("/alert/covert-steam/");
	expect(alertId).toBeTruthy();
	expect(alertType).toBe("covert-steam");
	expect(timestamp).toBe("1704556800000");
	
	// Validate UI can extract optional context
	expect(url.searchParams.get("bm")).toBe("DraftKings");
	expect(url.searchParams.get("ev")).toBe("NFL-2025-001");
	expect(url.searchParams.get("node")).toBe("node_abc123");
	expect(url.searchParams.get("severity")).toBe("9.5");
});

/**
 * Test Formula: Validate deep-link format matches Telegram HTML anchor requirements
 * Expected Result: Deep-link can be embedded in Telegram HTML messages
 */
test("Deep-Link RFC Compliance - Telegram HTML Integration", () => {
	const generator = new DeepLinkGenerator("http://localhost:8080");
	
	const alert = {
		event_identifier: "NFL-2025-001",
		detection_timestamp: 1704556800000,
	};
	
	const deepLink = generator.generateCovertSteamLink(alert);
	
	// Format as Telegram HTML anchor tag
	const telegramMessage = `🚨 <b>CRITICAL Covert Steam Alert!</b>

<b>Event:</b> <code>NFL-2025-001</code>

<a href="${deepLink}">View Details on Dashboard</a>`;
	
	// Verify deep-link is properly formatted for Telegram HTML
	expect(telegramMessage).toContain(`href="${deepLink}"`);
	expect(telegramMessage).toContain("View Details on Dashboard");
	
	// Verify URL is valid and can be used in anchor tag
	const url = new URL(deepLink);
	expect(url.protocol).toMatch(/^https?:$/);
	expect(url.hostname).toBeTruthy();
});

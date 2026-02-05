#!/usr/bin/env bun
/**
 * @fileoverview Tests for DeepLinkGenerator
 * @description Verify RFC 001 deep-link generation compliance
 * @module test/utils/deeplink-generator
 * @see {@link ../docs/rfc/001-telegram-deeplink-standard.md|RFC 001: Telegram Deep-Link Standard}
 */

import { test, expect } from "bun:test";
import { DeepLinkGenerator } from "../../src/utils/deeplink-generator";
import { DEEP_LINK_DEFAULTS, DEEP_LINK_PATHS } from "../../src/utils/rss-constants";

// Test Formula: Generate deep-link for Covert Steam alert with all optional parameters
// Expected Result: Valid deep-link URL with all parameters properly encoded

test("DeepLinkGenerator - Covert Steam Link Generation", () => {
	const generator = new DeepLinkGenerator(DEEP_LINK_DEFAULTS.DASHBOARD_URL_DEV);
	
	const alert = {
		event_identifier: "NFL-2025-001",
		bookmaker_name: "DraftKings",
		detection_timestamp: 1704556800000,
		source_dark_node_id: "node_abc123",
		impact_severity_score: 9.5,
	};
	
	const link = generator.generateCovertSteamLink(alert);
	
	// Verify base URL and path
	expect(link).toStartWith(`${DEEP_LINK_DEFAULTS.DASHBOARD_URL_DEV}${DEEP_LINK_PATHS.ALERT_COVERT_STEAM}`);
	
	// Verify required parameters
	expect(link).toContain("id=");
	expect(link).toContain("type=covert-steam");
	expect(link).toContain("ts=1704556800000");
	
	// Verify optional parameters
	expect(link).toContain("bm=DraftKings");
	expect(link).toContain("ev=NFL-2025-001");
	expect(link).toContain("node=node_abc123");
	expect(link).toContain("severity=9.5");
	
	// Verify URL encoding
	expect(link).not.toContain(" ");
	expect(link).not.toContain("&amp;");
});

// Test Formula: Generate deep-link for Performance Regression alert
// Expected Result: Valid deep-link with performance-specific parameters

test("DeepLinkGenerator - Performance Regression Link Generation", () => {
	const generator = new DeepLinkGenerator(DEEP_LINK_DEFAULTS.DASHBOARD_URL_DEV);
	
	const alert = {
		regression_id: "perf-reg-20250106-001",
		detected_at: 1704556800000,
		endpoint: "/api/arbitrage/scan",
		severity: 8.0,
		source: "perf-monitor",
	};
	
	const link = generator.generatePerfRegressionLink(alert);
	
	expect(link).toStartWith(`${DEEP_LINK_DEFAULTS.DASHBOARD_URL_DEV}${DEEP_LINK_PATHS.ALERT_PERF_REGRESSION}`);
	expect(link).toContain("id=perf-reg-20250106-001");
	expect(link).toContain("type=perf-regression");
	expect(link).toContain("ts=1704556800000");
	expect(link).toContain("severity=8");
	expect(link).toContain("source=perf-monitor");
});

// Test Formula: Generate deep-link for URL Anomaly Pattern alert
// Expected Result: Valid deep-link with audit path and anomaly parameters

test("DeepLinkGenerator - URL Anomaly Link Generation", () => {
	const generator = new DeepLinkGenerator(DEEP_LINK_DEFAULTS.DASHBOARD_URL_DEV);
	
	const alert = {
		pattern_id: "url-anom-001",
		detected_at: 1704556800000,
		bookmaker: "Betfair",
		anomaly_type: "query-parameter-anomaly",
	};
	
	const link = generator.generateUrlAnomalyLink(alert);
	
	expect(link).toStartWith(`${DEEP_LINK_DEFAULTS.DASHBOARD_URL_DEV}${DEEP_LINK_PATHS.AUDIT_URL_ANOMALY}`);
	expect(link).toContain("id=url-anom-001");
	expect(link).toContain("type=url-anomaly");
	expect(link).toContain("ts=1704556800000");
	expect(link).toContain("bm=Betfair");
});

// Test Formula: Generate generic alert deep-link with custom parameters
// Expected Result: Valid deep-link with all custom parameters included

test("DeepLinkGenerator - Generic Alert Link Generation", () => {
	const generator = new DeepLinkGenerator(DEEP_LINK_DEFAULTS.DASHBOARD_URL_DEV);
	
	const alert = {
		alert_id: "custom-alert-001",
		alert_type: "custom-type",
		timestamp: 1704556800000,
		severity: 7.5,
		source: "custom-source",
		custom_param: "custom_value",
	};
	
	const link = generator.generateGenericAlertLink(alert);
	
	expect(link).toStartWith(`${DEEP_LINK_DEFAULTS.DASHBOARD_URL_DEV}${DEEP_LINK_PATHS.ALERT_BASE}`);
	expect(link).toContain("id=custom-alert-001");
	expect(link).toContain("type=custom-type");
	expect(link).toContain("ts=1704556800000");
	expect(link).toContain("severity=7.5");
	expect(link).toContain("source=custom-source");
	expect(link).toContain("custom_param=custom_value");
});

// Test Formula: Generate commit link for changelog
// Expected Result: GitHub commit URL (external link, not dashboard deep-link)

test("DeepLinkGenerator - Commit Link Generation", () => {
	const generator = new DeepLinkGenerator();
	
	const commit = {
		hash: "48ad827",
		message: "docs: Add advanced Telegram features",
		date: 1704556800000,
	};
	
	const link = generator.generateCommitLink(commit);
	
	expect(link).toStartWith("https://github.com/brendadeeznuts1111/trader-analyzer-bun/commit/");
	expect(link).toContain("48ad827");
});

// Test Formula: Generate RSS item link (uses existing link if external)
// Expected Result: Original link preserved for external URLs, dashboard deep-link for internal

test("DeepLinkGenerator - RSS Item Link Generation", () => {
	const generator = new DeepLinkGenerator(DEEP_LINK_DEFAULTS.DASHBOARD_URL_DEV);
	
	// External link - should be preserved
	const externalItem = {
		link: "https://example.com/article",
		category: "external",
		pubDate: "2025-01-06T12:00:00Z",
	};
	
	const externalLink = generator.generateRSSItemLink(externalItem);
	expect(externalLink).toBe("https://example.com/article");
	
	// Internal link - should generate dashboard deep-link
	const internalItem = {
		link: "/api/registry",
		category: "registry",
		pubDate: "2025-01-06T12:00:00Z",
	};
	
	const internalLink = generator.generateRSSItemLink(internalItem);
	expect(internalLink).toStartWith(`${DEEP_LINK_DEFAULTS.DASHBOARD_URL_DEV}${DEEP_LINK_PATHS.DASHBOARD}`);
	expect(internalLink).toContain("type=registry");
});

// Test Formula: Verify base URL resolution from environment variable
// Expected Result: Uses HYPERBUN_DASHBOARD_URL if set, otherwise default

test("DeepLinkGenerator - Base URL Resolution", () => {
	// Test default
	const defaultGen = new DeepLinkGenerator();
	expect(defaultGen.getDashboardBaseUrl()).toBe(DEEP_LINK_DEFAULTS.DASHBOARD_URL_DEV);
	
	// Test custom URL
	const customGen = new DeepLinkGenerator(DEEP_LINK_DEFAULTS.DASHBOARD_URL_PROD);
	expect(customGen.getDashboardBaseUrl()).toBe(DEEP_LINK_DEFAULTS.DASHBOARD_URL_PROD);
});

// Test Formula: Verify URL encoding handles special characters
// Expected Result: Special characters in parameters are properly URL-encoded

test("DeepLinkGenerator - URL Encoding", () => {
	const generator = new DeepLinkGenerator(DEEP_LINK_DEFAULTS.DASHBOARD_URL_DEV);
	
	const alert = {
		event_identifier: "NFL-2025-001 & Special",
		bookmaker_name: "DraftKings & Co.",
		detection_timestamp: 1704556800000,
	};
	
	const link = generator.generateCovertSteamLink(alert);
	
	// Verify URL is valid and can be parsed
	const url = new URL(link);
	const params = url.searchParams;
	
	// Verify parameters are accessible (URLSearchParams decodes automatically)
	expect(params.get("type")).toBe("covert-steam");
	expect(params.get("ev")).toBe("NFL-2025-001 & Special");
	expect(params.get("bm")).toBe("DraftKings & Co.");
	
	// Verify raw URL contains encoded characters (spaces as +, & as %26)
	expect(link).toMatch(/[%+]/); // URL encoding characters present
});

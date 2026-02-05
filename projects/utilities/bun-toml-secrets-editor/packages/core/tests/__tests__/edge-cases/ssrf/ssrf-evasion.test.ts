#!/usr/bin/env bun
/**
 * Advanced SSRF Evasion Techniques Test Suite
 * Tests various bypass attempts and ensures robust protection
 */

import { describe, expect, test } from "bun:test";
import { ProfileRssBridge } from "../../../integration/profile-rss-bridge";

describe("SSRF Evasion Techniques", () => {
	// Test the isInternalURL method directly by creating a minimal bridge
	const bridge = new ProfileRssBridge();

	// Helper function to test isInternalURL method directly
	const testInternalURL = (url: string): boolean => {
		return (bridge as any).isInternalURL(url);
	};

	// Test various bypass attempts
	const evasionAttempts = [
		// IP Encoding bypasses
		"http://0177.0.0.1/", // Octal encoding
		"http://0x7f.0x00.0x00.0x01/", // Hex encoding
		"http://2130706433/", // Decimal encoding (127.0.0.1)
		"http://0x7f000001/", // Hex single number

		// URL obfuscation
		"http://127.0.0.1.nip.io/", // DNS rebinding
		"http://127.0.0.1.xip.io/",
		"http://①②⑦.⓪.⓪.①/", // Unicode digits

		// Protocol smuggling
		"http://evil.com@127.0.0.1", // Credential stuffing
		"http://127.0.0.1#@evil.com", // Fragment confusion

		// Case variations
		"http://LOCALHOST/",
		"http://LocalHost/",
		"http://127.0.0.1./", // Trailing dot

		// IPv6 variations
		"http://[::1]/",
		"http://[::ffff:127.0.0.1]/",
		"http://[0:0:0:0:0:0:0:1]/",

		// URL parsing tricks
		"http://0x7F000001%2F", // URL encoded
		"http://127.0.0.1%252F", // Double URL encoded
		"http://127.0.0.1#fragment", // Fragment injection
		"http://127.0.0.1?query=test", // Query injection

		// Domain bypasses
		"http://127.0.0.1.com/", // TLD confusion
		"http://127.0.0.1.org/",
		"http://localhost.com/", // Public domain that might resolve locally

		// Port variations
		"http://127.0.0.1:80/", // Standard HTTP port
		"http://127.0.0.1:443/", // HTTPS port
		"http://127.0.0.1:8080/", // Common dev port
		"http://127.0.0.1:3000/", // Node.js default port

		// Private IP ranges
		"http://192.168.1.1/", // Private Class C
		"http://10.0.0.1/", // Private Class A
		"http://172.16.0.1/", // Private Class B start
		"http://172.31.0.1/", // Private Class B end
		"http://169.254.169.254/", // Link-local (AWS metadata)
		"http://0.0.0.0/", // Unspecified address

		// Reserved ranges
		"http://224.0.0.1/", // Multicast
		"http://240.0.0.1/", // Reserved
	];

	test.each(
		evasionAttempts,
	)("should block evasion attempt: %s", async (url) => {
		expect(testInternalURL(url)).toBe(true);
	});

	test("should allow legitimate external URLs", async () => {
		const legitimateUrls = [
			"https://feeds.bbci.co.uk/news/rss.xml",
			"https://rss.cnn.com/rss/edition.rss",
			"https://feeds.reuters.com/reuters/topNews",
		];

		for (const url of legitimateUrls) {
			expect(testInternalURL(url)).toBe(false);
		}
	});

	test("should handle malformed URLs gracefully", async () => {
		const malformedURLs = [
			"not-a-url",
			"ftp://invalid-protocol",
			"http://",
			"https://",
			"javascript:alert('xss')",
			"data:text/html,<script>alert('xss')</script>",
		];

		for (const url of malformedURLs) {
			// Malformed URLs should be considered unsafe (return true)
			expect(testInternalURL(url)).toBe(true);
		}
	});

	test("should validate domain whitelist when configured", async () => {
		// Test the isDomainAllowed method directly
		const testDomainAllowed = (
			bridge: ProfileRssBridge,
			url: string,
		): boolean => {
			return (bridge as any).isDomainAllowed(url);
		};

		// Test with default bridge (no whitelist configured - should allow all)
		expect(testDomainAllowed(bridge, "https://trusted.com/feed")).toBe(true);
		expect(testDomainAllowed(bridge, "https://untrusted.com/feed")).toBe(true);

		// Test that the method exists and doesn't throw
		expect(() =>
			testDomainAllowed(bridge, "https://example.com"),
		).not.toThrow();

		// Test with malformed URL
		expect(testDomainAllowed(bridge, "not-a-url")).toBe(false);
	});

	test("should detect DNS rebinding attempts", async () => {
		const rebindingAttempts = [
			"http://127.0.0.1.nip.io/",
			"http://192.168.1.1.xip.io/",
			"http://10.0.0.1.nip.io/",
		];

		for (const url of rebindingAttempts) {
			expect(testInternalURL(url)).toBe(true);
		}
	});

	test("should handle IPv6 addresses correctly", async () => {
		const ipv6Tests = [
			{ url: "http://[::1]/", shouldBlock: true }, // Loopback
			{ url: "http://[::ffff:127.0.0.1]/", shouldBlock: true }, // IPv4-mapped
			{ url: "http://[2001:db8::1]/", shouldBlock: false }, // Documentation
			{
				url: "http://[2606:2800:220:1:248:1893:25c8:1946]/",
				shouldBlock: false,
			}, // Public
		];

		for (const { url, shouldBlock } of ipv6Tests) {
			const isInternal = testInternalURL(url);
			if (shouldBlock) {
				expect(isInternal).toBe(true);
			} else {
				expect(isInternal).toBe(false);
			}
		}
	});
});

// Helper function for comprehensive IP validation
function isInternalIP(url: string): boolean {
	try {
		// Decode various encoding schemes
		const decoded = decodeURIComponent(url);

		// Handle different URL formats
		const parsed = new URL(decoded);
		let hostname = parsed.hostname.toLowerCase();

		// Remove trailing dot
		if (hostname.endsWith(".")) {
			hostname = hostname.slice(0, -1);
		}

		// Check for localhost variations
		if (hostname === "localhost" || hostname === "localdomain") {
			return true;
		}

		// Check for IPv4 addresses
		if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
			const parts = hostname.split(".").map(Number);
			return (
				parts[0] === 127 || // Loopback
				parts[0] === 10 || // Private Class A
				(parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || // Private Class B
				(parts[0] === 192 && parts[1] === 168) || // Private Class C
				(parts[0] === 169 && parts[1] === 254) || // Link-local
				parts.every((p) => p === 0) // 0.0.0.0
			);
		}

		// Check for IPv6 addresses
		if (hostname.startsWith("[") && hostname.endsWith("]")) {
			const ipv6 = hostname.slice(1, -1);
			return ipv6 === "::1" || ipv6.startsWith("::ffff:127");
		}

		// Check for DNS rebinding patterns
		if (hostname.match(/\d+\.\d+\.\d+\.\d+\.(nip|xip)\.io$/)) {
			return true;
		}

		// Check for Unicode digits that might represent IPs
		if (/[①②③④⑤⑥⑦⑧⑨⑩]/.test(hostname)) {
			// Convert Unicode digits to regular digits
			const converted = hostname
				.replace(/①/g, "1")
				.replace(/②/g, "2")
				.replace(/③/g, "3")
				.replace(/④/g, "4")
				.replace(/⑤/g, "5")
				.replace(/⑥/g, "6")
				.replace(/⑦/g, "7")
				.replace(/⑧/g, "8")
				.replace(/⑨/g, "9")
				.replace(/⑩/g, "0");

			if (/^\d+\.\d+\.\d+\.\d+$/.test(converted)) {
				const parts = converted.split(".").map(Number);
				return (
					parts[0] === 127 ||
					parts[0] === 10 ||
					(parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
					(parts[0] === 192 && parts[1] === 168)
				);
			}
		}

		return false;
	} catch {
		// If we can't parse the URL, assume it's unsafe
		return true;
	}
}

export { isInternalIP };

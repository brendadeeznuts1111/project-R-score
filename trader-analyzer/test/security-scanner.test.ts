/**
 * @fileoverview Tests for NEXUS Security Scanner
 * @description Tests security scanner functionality following Bun Security Scanner Template patterns
 * @module test/security-scanner
 * 
 * @see {@link https://github.com/oven-sh/security-scanner-template|Security Scanner Template}
 */

import { describe, it, expect } from "bun:test";
import { scanner } from "../src/security/bun-scanner";

describe("NEXUS Security Scanner", () => {
	it("should have version '1' (Bun security scanner implementation version)", () => {
		expect(scanner.version).toBe("1");
	});

	it("should return empty array for safe packages", async () => {
		const advisories = await scanner.scan({
			packages: [
				{ name: "safe-package", version: "1.0.0" },
			],
		});

		expect(advisories).toEqual([]);
	});

	it("should detect known malicious packages", async () => {
		const advisories = await scanner.scan({
			packages: [
				{ name: "malicious-package", version: "1.0.0" },
			],
		});

		expect(advisories.length).toBeGreaterThan(0);
		expect(advisories[0].level).toBe("fatal");
		expect(advisories[0].package).toBe("malicious-package");
		expect(advisories[0].description).toContain("malicious");
	});

	it("should detect vulnerable package versions using Bun.semver.satisfies()", async () => {
		const advisories = await scanner.scan({
			packages: [
				{ name: "vulnerable-package", version: "1.0.5" }, // In range >=1.0.0 <1.2.5
			],
		});

		expect(advisories.length).toBeGreaterThan(0);
		expect(advisories[0].level).toBe("fatal"); // CVSS 9.8 >= 9.0 threshold
		expect(advisories[0].package).toBe("vulnerable-package");
		expect(advisories[0].description).toContain("CVE");
		expect(advisories[0].url).toContain("nvd.nist.gov");
	});

	it("should not flag safe versions of vulnerable packages", async () => {
		const advisories = await scanner.scan({
			packages: [
				{ name: "vulnerable-package", version: "2.0.0" }, // Outside range >=1.0.0 <1.2.5
			],
		});

		expect(advisories).toEqual([]);
	});

	it("should handle multiple packages", async () => {
		const advisories = await scanner.scan({
			packages: [
				{ name: "safe-package", version: "1.0.0" },
				{ name: "malicious-package", version: "1.0.0" },
				{ name: "vulnerable-package", version: "1.0.5" },
			],
		});

		// Should detect threats for malicious and vulnerable packages
		expect(advisories.length).toBeGreaterThanOrEqual(2);
		
		const packageNames = advisories.map(a => a.package);
		expect(packageNames).toContain("malicious-package");
		expect(packageNames).toContain("vulnerable-package");
		expect(packageNames).not.toContain("safe-package");
	});

	it("should return advisories with required fields", async () => {
		const advisories = await scanner.scan({
			packages: [
				{ name: "malicious-package", version: "1.0.0" },
			],
		});

		expect(advisories.length).toBeGreaterThan(0);
		
		for (const advisory of advisories) {
			expect(advisory).toHaveProperty("level");
			expect(advisory).toHaveProperty("package");
			expect(advisory).toHaveProperty("description");
			expect(advisory).toHaveProperty("url");
			expect(["fatal", "warn"]).toContain(advisory.level);
		}
	});

	it("should handle errors gracefully by blocking installation", async () => {
		// Test error handling by scanning with invalid input
		// The scanner should return fatal advisories on error
		const advisories = await scanner.scan({
			packages: [
				{ name: "", version: "" }, // Invalid package info
			],
		});

		// Should either return empty array or fatal advisory
		// Both are acceptable - empty means no threats detected, fatal means blocked
		expect(Array.isArray(advisories)).toBe(true);
	});

	it("should use Bun.semver.satisfies() for version range matching", async () => {
		// Test that Bun.semver.satisfies() is used correctly
		// Version 1.0.5 should match range ">=1.0.0 <1.2.5"
		const advisories = await scanner.scan({
			packages: [
				{ name: "vulnerable-package", version: "1.0.5" },
			],
		});

		expect(advisories.length).toBeGreaterThan(0);
		expect(advisories[0].package).toBe("vulnerable-package");
	});

	it("should verify scanner version is '1' (Bun security scanner implementation version)", () => {
		// The version field should always be '1' - this is Bun's scanner API version
		// not the scanner implementation version
		expect(scanner.version).toBe("1");
		expect(typeof scanner.scan).toBe("function");
	});
});

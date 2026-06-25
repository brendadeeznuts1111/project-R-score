#!/usr/bin/env bun
/**
 * Tests for commit message validation
 */

import { describe, expect, it } from "bun:test";
import {
	VALID_COMPONENTS,
	VALID_DOMAINS,
	validateCommitMessage,
} from "../scripts/validate-message";

describe("Legacy format validation", () => {
	it("should validate correct legacy format", () => {
		const result = validateCommitMessage(
			"[RUNTIME][COMPONENT:CHROME][TIER:1380] Fix entropy",
		);
		expect(result.valid).toBe(true);
		expect(result.format).toBe("legacy");
	});

	it("should reject missing domain", () => {
		const result = validateCommitMessage("[COMPONENT:CHROME][TIER:1380] Fix entropy");
		expect(result.valid).toBe(false);
		expect(result.format).toBe("invalid");
	});

	it("should reject invalid domain", () => {
		const result = validateCommitMessage(
			"[INVALID][COMPONENT:CHROME][TIER:1380] Fix entropy",
		);
		expect(result.valid).toBe(false);
		expect(result.errors.length).toBeGreaterThan(0);
	});

	it("should reject invalid tier format", () => {
		// Non-numeric tier fails the pattern match entirely
		const result = validateCommitMessage(
			"[RUNTIME][COMPONENT:CHROME][TIER:abc] Fix entropy",
		);
		expect(result.valid).toBe(false);
		expect(result.format).toBe("invalid");
	});

	it("should reject out-of-range tier", () => {
		const result = validateCommitMessage(
			"[RUNTIME][COMPONENT:CHROME][TIER:50] Fix entropy",
		);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes("tier"))).toBe(true);
	});

	it("should warn about long description", () => {
		const result = validateCommitMessage(
			`[RUNTIME][COMPONENT:CHROME][TIER:1380] ${"a".repeat(80)}`,
		);
		expect(result.valid).toBe(true);
		expect(result.warnings.length).toBeGreaterThan(0);
	});

	it("should warn about description ending with period", () => {
		const result = validateCommitMessage(
			"[RUNTIME][COMPONENT:CHROME][TIER:1380] Fix entropy.",
		);
		expect(result.valid).toBe(true);
		expect(result.warnings.some((w) => w.includes("period"))).toBe(true);
	});
});

describe("Domain validation", () => {
	for (const domain of VALID_DOMAINS.slice(0, 5)) {
		it(`should accept domain: ${domain}`, () => {
			const result = validateCommitMessage(
				`[${domain}][COMPONENT:CHROME][TIER:1380] Test`,
			);
			expect(result.errors.some((e) => e.includes("domain"))).toBe(false);
		});
	}
});

describe("Component validation", () => {
	for (const component of VALID_COMPONENTS.slice(0, 5)) {
		it(`should accept component: ${component}`, () => {
			const result = validateCommitMessage(
				`[RUNTIME][COMPONENT:${component}][TIER:1380] Test`,
			);
			expect(result.errors.some((e) => e.includes("component"))).toBe(false);
		});
	}
});

#!/usr/bin/env bun
/**
 * Tests for branch validator
 */

import { describe, expect, it } from "bun:test";
import { PROTECTED_BRANCHES, validateBranchName } from "../scripts/branch-validator";

describe("Branch name validation", () => {
	it("should validate main branch", () => {
		const result = validateBranchName("main");
		expect(result.valid).toBe(true);
		expect(result.warnings).toContain("Protected branch - use PR workflow");
	});

	it("should validate feature branch", () => {
		const result = validateBranchName("feature/TIER-1380-add-new-feature");
		expect(result.valid).toBe(true);
		expect(result.type).toBe("feature");
	});

	it("should validate fix branch", () => {
		const result = validateBranchName("fix/TIER-1380-bug-fix");
		expect(result.valid).toBe(true);
		expect(result.type).toBe("fix");
	});

	it("should validate hotfix branch", () => {
		const result = validateBranchName("hotfix/TIER-1380-critical-fix");
		expect(result.valid).toBe(true);
		expect(result.type).toBe("hotfix");
	});

	it("should validate release branch", () => {
		const result = validateBranchName("release/v1.2.3");
		expect(result.valid).toBe(true);
		expect(result.type).toBe("release");
	});

	it("should validate docs branch", () => {
		const result = validateBranchName("docs/update-readme");
		expect(result.valid).toBe(true);
		expect(result.type).toBe("docs");
	});

	it("should reject invalid branch names", () => {
		const result = validateBranchName("invalid-branch-name");
		expect(result.valid).toBe(false);
		expect(result.errors.length).toBeGreaterThan(0);
	});

	it("should reject branches with underscores", () => {
		const result = validateBranchName("feature/TIER-1380_new_feature");
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes("underscore"))).toBe(true);
	});

	it("should warn about long branch names", () => {
		const result = validateBranchName(`feature/TIER-1380-${"a".repeat(50)}`);
		expect(result.valid).toBe(true);
		expect(result.warnings.some((w) => w.includes("50"))).toBe(true);
	});

	it("should warn about non-1380 tier", () => {
		const result = validateBranchName("feature/TIER-900-old-feature");
		expect(result.valid).toBe(true);
		expect(result.warnings.some((w) => w.includes("Tier 900"))).toBe(true);
	});
});

describe("Protected branches", () => {
	for (const branch of PROTECTED_BRANCHES) {
		it(`should recognize ${branch} as protected`, () => {
			const result = validateBranchName(branch);
			expect(result.valid).toBe(true);
			expect(result.warnings).toContain("Protected branch - use PR workflow");
		});
	}
});

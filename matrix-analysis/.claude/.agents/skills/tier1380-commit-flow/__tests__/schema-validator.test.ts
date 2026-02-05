#!/usr/bin/env bun
/**
 * Tests for Bun.deepMatch-based schema validator
 */

import { describe, expect, it } from "bun:test";
import {
	COMMIT_MESSAGE_SCHEMA,
	type Schema,
	SNAPSHOT_METADATA_SCHEMA,
	validateSchema,
} from "../lib/schema-validator";

describe("validateSchema", () => {
	it("should validate valid commit message", () => {
		const input = {
			domain: "PLATFORM",
			component: "REGISTRY",
			tier: 1380,
			description: "Add new validation feature",
		};

		const result = validateSchema(COMMIT_MESSAGE_SCHEMA, input);
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it("should reject invalid domain", () => {
		const input = {
			domain: "INVALID",
			component: "REGISTRY",
			tier: 1380,
			description: "Add new validation feature",
		};

		const result = validateSchema(COMMIT_MESSAGE_SCHEMA, input);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.path === "domain")).toBe(true);
	});

	it("should reject missing required field", () => {
		const input = {
			domain: "PLATFORM",
			component: "REGISTRY",
			tier: 1380,
			// missing description
		};

		const result = validateSchema(COMMIT_MESSAGE_SCHEMA, input);
		expect(result.valid).toBe(false);
		expect(
			result.errors.some(
				(e) => e.path === "description" && e.message.includes("Missing"),
			),
		).toBe(true);
	});

	it("should reject wrong type", () => {
		const input = {
			domain: "PLATFORM",
			component: "REGISTRY",
			tier: "1380", // should be number
			description: "Add new validation feature",
		};

		const result = validateSchema(COMMIT_MESSAGE_SCHEMA, input);
		expect(result.valid).toBe(false);
		expect(
			result.errors.some((e) => e.path === "tier" && e.message.includes("Wrong type")),
		).toBe(true);
	});

	it("should reject description too short", () => {
		const input = {
			domain: "PLATFORM",
			component: "REGISTRY",
			tier: 1380,
			description: "Short", // less than 10 chars
		};

		const result = validateSchema(COMMIT_MESSAGE_SCHEMA, input);
		expect(result.valid).toBe(false);
		expect(
			result.errors.some(
				(e) => e.path === "description" && e.message.includes("too short"),
			),
		).toBe(true);
	});

	it("should reject tier out of range", () => {
		const input = {
			domain: "PLATFORM",
			component: "REGISTRY",
			tier: 50, // below min
			description: "Add new validation feature",
		};

		const result = validateSchema(COMMIT_MESSAGE_SCHEMA, input);
		expect(result.valid).toBe(false);
		expect(
			result.errors.some((e) => e.path === "tier" && e.message.includes("too small")),
		).toBe(true);
	});

	it("should validate snapshot metadata", () => {
		const input = {
			tenant: "tenant-a",
			snapshot_at: "2026-02-01T00:00:00Z",
			total_violations: 10,
			max_width: 95,
			bun_version: "1.3.7",
		};

		const result = validateSchema(SNAPSHOT_METADATA_SCHEMA, input);
		expect(result.valid).toBe(true);
	});

	it("should reject invalid tenant name", () => {
		const input = {
			tenant: "invalid tenant!",
			snapshot_at: "2026-02-01T00:00:00Z",
			total_violations: 10,
			max_width: 95,
			bun_version: "1.3.7",
		};

		const result = validateSchema(SNAPSHOT_METADATA_SCHEMA, input);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.path === "tenant")).toBe(true);
	});
});

describe("Bun.deepMatch integration", () => {
	it("should use deepMatch for structural validation", () => {
		const schema: Schema = {
			user: {
				name: "string",
				role: "string",
			},
		};

		// Extra fields allowed (deepMatch subset check)
		const input = {
			user: {
				name: "Ashley",
				role: "admin",
				id: 123, // extra field
			},
		};

		const result = validateSchema(schema, input);
		expect(result.valid).toBe(true);
	});

	it("should detect missing nested fields", () => {
		const schema: Schema = {
			user: {
				name: "string",
				role: "string",
			},
		};

		const input = {
			user: {
				name: "Ashley",
				// missing role
			},
		};

		const result = validateSchema(schema, input);
		expect(result.valid).toBe(false);
	});
});

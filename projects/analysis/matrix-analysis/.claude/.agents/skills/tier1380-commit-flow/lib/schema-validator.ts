#!/usr/bin/env bun
/**
 * Tier-1380 OMEGA Schema Validator
 * Bun.deepMatch-based validation with required fields, types, and error messages
 */

export type SchemaType =
	| "string"
	| "number"
	| "boolean"
	| "object"
	| "array"
	| "null"
	| "undefined";

export interface SchemaField {
	type: SchemaType;
	required?: boolean;
	enum?: unknown[];
	min?: number;
	max?: number;
	pattern?: RegExp;
	default?: unknown;
}

export type Schema = Record<string, SchemaType | SchemaField | Schema>;

export interface ValidationResult {
	valid: boolean;
	errors: ValidationError[];
}

export interface ValidationError {
	path: string;
	message: string;
	expected?: string;
	actual?: string;
}

/**
 * Validate input against schema using Bun.deepMatch + layered checks
 */
export function validateSchema(
	schema: Schema,
	input: unknown,
	path = "",
): ValidationResult {
	const errors: ValidationError[] = [];

	// Root must be an object
	if (typeof input !== "object" || input === null) {
		return {
			valid: false,
			errors: [{ path, message: "Expected object", actual: String(input) }],
		};
	}

	const inputObj = input as Record<string, unknown>;

	// 1. Subset check with Bun.deepMatch (structural matching)
	const pattern = createDeepMatchPattern(schema);
	if (!Bun.deepMatch(pattern, inputObj)) {
		// Find structural mismatches
		findStructuralErrors(schema, inputObj, path, errors);
	}

	// 2. Required fields check
	for (const [key, fieldSchema] of Object.entries(schema)) {
		const fieldPath = path ? `${path}.${key}` : key;
		const isRequired = isFieldRequired(fieldSchema);

		if (!(key in inputObj)) {
			if (isRequired) {
				errors.push({
					path: fieldPath,
					message: `Missing required field`,
				});
			}
			continue;
		}

		// 3. Type and constraint checking
		const value = inputObj[key];
		validateField(fieldSchema, value, fieldPath, errors);
	}

	return {
		valid: errors.length === 0,
		errors,
	};
}

/**
 * Create a pattern for Bun.deepMatch from schema
 */
function createDeepMatchPattern(schema: Schema): Record<string, unknown> {
	const pattern: Record<string, unknown> = {};

	for (const [key, fieldSchema] of Object.entries(schema)) {
		if (typeof fieldSchema === "string") {
			// Simple type shorthand: { name: "string" }
			pattern[key] = getTypePlaceholder(fieldSchema);
		} else if (isSchemaField(fieldSchema)) {
			// Full field definition: { name: { type: "string", required: true } }
			pattern[key] = getTypePlaceholder(fieldSchema.type);
		} else {
			// Nested schema
			pattern[key] = createDeepMatchPattern(fieldSchema as Schema);
		}
	}

	return pattern;
}

function getTypePlaceholder(type: SchemaType): unknown {
	switch (type) {
		case "string":
			return "";
		case "number":
			return 0;
		case "boolean":
			return true;
		case "object":
			return {};
		case "array":
			return [];
		case "null":
			return null;
		case "undefined":
			return undefined;
		default:
			return null;
	}
}

function isSchemaField(value: unknown): value is SchemaField {
	return typeof value === "object" && value !== null && "type" in value;
}

function isFieldRequired(fieldSchema: SchemaType | SchemaField | Schema): boolean {
	if (typeof fieldSchema === "string") {
		return true; // Simple type shorthand implies required
	}
	if (isSchemaField(fieldSchema)) {
		return fieldSchema.required !== false;
	}
	return true; // Nested schema objects are required by default
}

function validateField(
	fieldSchema: SchemaType | SchemaField | Schema,
	value: unknown,
	path: string,
	errors: ValidationError[],
): void {
	// Handle nested schema
	if (
		typeof fieldSchema === "object" &&
		!isSchemaField(fieldSchema) &&
		fieldSchema !== null
	) {
		if (typeof value !== "object" || value === null) {
			errors.push({
				path,
				message: "Expected object",
				actual: typeof value,
			});
			return;
		}
		const nested = validateSchema(fieldSchema as Schema, value, path);
		errors.push(...nested.errors);
		return;
	}

	// Get type from field schema
	let expectedType: SchemaType;
	let constraints: Partial<SchemaField> = {};

	if (typeof fieldSchema === "string") {
		expectedType = fieldSchema;
	} else if (isSchemaField(fieldSchema)) {
		expectedType = fieldSchema.type;
		constraints = fieldSchema;
	} else {
		return; // Unknown schema type
	}

	// Type check
	const actualType = getActualType(value);
	if (actualType !== expectedType) {
		errors.push({
			path,
			message: `Wrong type: expected ${expectedType}`,
			expected: expectedType,
			actual: actualType,
		});
		return;
	}

	// Constraint checks
	if (expectedType === "string") {
		validateStringConstraints(value as string, constraints, path, errors);
	} else if (expectedType === "number") {
		validateNumberConstraints(value as number, constraints, path, errors);
	} else if (expectedType === "array" && Array.isArray(value)) {
		validateArrayConstraints(value, constraints, path, errors);
	}

	// Enum check
	if (constraints.enum && !constraints.enum.includes(value)) {
		errors.push({
			path,
			message: `Invalid value: must be one of [${constraints.enum.join(", ")}]`,
			expected: `enum[${constraints.enum.join(", ")}]`,
			actual: String(value),
		});
	}
}

function getActualType(value: unknown): SchemaType | string {
	if (value === null) return "null";
	if (value === undefined) return "undefined";
	if (Array.isArray(value)) return "array";
	return typeof value as SchemaType;
}

function validateStringConstraints(
	value: string,
	constraints: Partial<SchemaField>,
	path: string,
	errors: ValidationError[],
): void {
	if (constraints.min !== undefined && value.length < constraints.min) {
		errors.push({
			path,
			message: `String too short: minimum ${constraints.min} characters`,
			expected: `length >= ${constraints.min}`,
			actual: `length ${value.length}`,
		});
	}

	if (constraints.max !== undefined && value.length > constraints.max) {
		errors.push({
			path,
			message: `String too long: maximum ${constraints.max} characters`,
			expected: `length <= ${constraints.max}`,
			actual: `length ${value.length}`,
		});
	}

	if (constraints.pattern && !constraints.pattern.test(value)) {
		errors.push({
			path,
			message: `String does not match pattern ${constraints.pattern.source}`,
		});
	}
}

function validateNumberConstraints(
	value: number,
	constraints: Partial<SchemaField>,
	path: string,
	errors: ValidationError[],
): void {
	if (constraints.min !== undefined && value < constraints.min) {
		errors.push({
			path,
			message: `Number too small: minimum ${constraints.min}`,
			expected: `>= ${constraints.min}`,
			actual: String(value),
		});
	}

	if (constraints.max !== undefined && value > constraints.max) {
		errors.push({
			path,
			message: `Number too large: maximum ${constraints.max}`,
			expected: `<= ${constraints.max}`,
			actual: String(value),
		});
	}
}

function validateArrayConstraints(
	value: unknown[],
	constraints: Partial<SchemaField>,
	path: string,
	errors: ValidationError[],
): void {
	if (constraints.min !== undefined && value.length < constraints.min) {
		errors.push({
			path,
			message: `Array too short: minimum ${constraints.min} items`,
			expected: `length >= ${constraints.min}`,
			actual: `length ${value.length}`,
		});
	}

	if (constraints.max !== undefined && value.length > constraints.max) {
		errors.push({
			path,
			message: `Array too long: maximum ${constraints.max} items`,
			expected: `length <= ${constraints.max}`,
			actual: `length ${value.length}`,
		});
	}
}

function findStructuralErrors(
	schema: Schema,
	input: Record<string, unknown>,
	path: string,
	errors: ValidationError[],
): void {
	// Find missing keys that deepMatch would catch
	for (const key of Object.keys(schema)) {
		if (!(key in input)) {
			const fieldPath = path ? `${path}.${key}` : key;
			// Only report if not already reported as required
			const existing = errors.find((e) => e.path === fieldPath);
			if (!existing) {
				errors.push({
					path: fieldPath,
					message: "Structural mismatch: field missing",
				});
			}
		}
	}
}

// Predefined schemas for Tier-1380
export const COMMIT_MESSAGE_SCHEMA: Schema = {
	domain: {
		type: "string",
		required: true,
		enum: [
			"RUNTIME",
			"PLATFORM",
			"SECURITY",
			"API",
			"UI",
			"DOCS",
			"TEST",
			"BENCH",
			"CONFIG",
			"INFRA",
			"OPENCLAW",
			"SKILLS",
		],
	},
	component: { type: "string", required: true },
	tier: { type: "number", required: true, min: 100, max: 9999 },
	description: { type: "string", required: true, min: 10, max: 72 },
};

export const SNAPSHOT_METADATA_SCHEMA: Schema = {
	tenant: { type: "string", required: true, pattern: /^[a-z0-9_-]+$/i },
	snapshot_at: { type: "string", required: true },
	total_violations: { type: "number", required: true, min: 0 },
	max_width: { type: "number", required: true, min: 0, max: 500 },
	bun_version: { type: "string", required: true },
};

// Main for CLI testing
if (import.meta.main) {
	const testInput = {
		domain: "PLATFORM",
		component: "REGISTRY",
		tier: 1380,
		description: "Add new validation feature",
	};

	console.log("Testing Tier-1380 Schema Validator\n");
	console.log("Input:", JSON.stringify(testInput, null, 2));
	console.log();

	const result = validateSchema(COMMIT_MESSAGE_SCHEMA, testInput);

	if (result.valid) {
		console.log("✅ Validation passed");
	} else {
		console.log("❌ Validation failed:");
		for (const error of result.errors) {
			console.log(`  ${error.path}: ${error.message}`);
		}
	}
}

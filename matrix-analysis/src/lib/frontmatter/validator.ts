/**
 * Frontmatter schema validation
 * Lightweight Zod-like validation for frontmatter fields
 */

export type FieldType = "string" | "number" | "boolean" | "array" | "object" | "date";

export interface FieldRule {
	type: FieldType;
	required?: boolean;
	enum?: unknown[];
	min?: number;
	max?: number;
	pattern?: RegExp;
}

export type FrontmatterSchema = Record<string, FieldType | FieldRule>;

export interface ValidationError {
	field: string;
	message: string;
	expected?: string;
	actual?: string;
}

export interface ValidationResult {
	valid: boolean;
	errors: ValidationError[];
}

/**
 * Validate frontmatter data against a schema.
 * Schema can use shorthand ("string") or full rule objects.
 */
export function validateFrontmatter(
	data: Record<string, unknown>,
	schema: FrontmatterSchema,
): ValidationResult {
	const errors: ValidationError[] = [];

	for (const [field, rule] of Object.entries(schema)) {
		const fieldRule = typeof rule === "string" ? ({ type: rule } as FieldRule) : rule;
		const value = data[field];

		// Required check
		if (value == null || value === "") {
			if (fieldRule.required) {
				errors.push({ field, message: "Required field missing" });
			}
			continue;
		}

		// Type check
		const actualType = getFieldType(value);
		if (actualType !== fieldRule.type) {
			errors.push({
				field,
				message: `Type mismatch`,
				expected: fieldRule.type,
				actual: actualType,
			});
			continue;
		}

		// Enum check
		if (fieldRule.enum && !fieldRule.enum.includes(value)) {
			errors.push({
				field,
				message: `Must be one of: ${fieldRule.enum.join(", ")}`,
				actual: String(value),
			});
		}

		// Min/max for strings
		if (fieldRule.type === "string" && typeof value === "string") {
			if (fieldRule.min !== undefined && value.length < fieldRule.min) {
				errors.push({
					field,
					message: `Too short (min ${fieldRule.min})`,
					actual: `length ${value.length}`,
				});
			}
			if (fieldRule.max !== undefined && value.length > fieldRule.max) {
				errors.push({
					field,
					message: `Too long (max ${fieldRule.max})`,
					actual: `length ${value.length}`,
				});
			}
		}

		// Min/max for numbers
		if (fieldRule.type === "number" && typeof value === "number") {
			if (fieldRule.min !== undefined && value < fieldRule.min) {
				errors.push({
					field,
					message: `Below minimum (${fieldRule.min})`,
					actual: String(value),
				});
			}
			if (fieldRule.max !== undefined && value > fieldRule.max) {
				errors.push({
					field,
					message: `Above maximum (${fieldRule.max})`,
					actual: String(value),
				});
			}
		}

		// Min/max for arrays
		if (fieldRule.type === "array" && Array.isArray(value)) {
			if (fieldRule.min !== undefined && value.length < fieldRule.min) {
				errors.push({
					field,
					message: `Too few items (min ${fieldRule.min})`,
					actual: `length ${value.length}`,
				});
			}
			if (fieldRule.max !== undefined && value.length > fieldRule.max) {
				errors.push({
					field,
					message: `Too many items (max ${fieldRule.max})`,
					actual: `length ${value.length}`,
				});
			}
		}

		// Pattern for strings
		if (
			fieldRule.pattern &&
			typeof value === "string" &&
			!fieldRule.pattern.test(value)
		) {
			errors.push({
				field,
				message: `Does not match pattern: ${fieldRule.pattern.source}`,
				actual: value,
			});
		}
	}

	return { valid: errors.length === 0, errors };
}

function getFieldType(value: unknown): FieldType | string {
	if (value === null || value === undefined) return "null";
	if (value instanceof Date) return "date";
	if (Array.isArray(value)) return "array";
	return typeof value;
}

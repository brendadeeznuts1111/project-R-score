/**
 * Validation types for enterprise configuration and input validation
 */

export interface ValidationResult {
	valid: boolean;
	errors: ValidationError[];
	data?: any;
}

export interface ValidationError {
	field: string;
	message: string;
	value?: any;
	constraint?: string;
}

export * from "./index";

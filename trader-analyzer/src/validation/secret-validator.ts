/**
 * @fileoverview Secret Validation
 * @description Input validation for secret values
 * @version 1.0.0.0.0.0.0
 * @module validation/secret-validator
 * 
 * [DoD][FUNCTION:InputValidation][SCOPE:SecretSanity]
 */

import { HyperBunLogger } from '../logging/logger';
import { LOG_CODES } from '../logging/log-codes';
import { recordSecretValidationError } from '../observability/metrics';

const logger = new HyperBunLogger('SecretValidator');

/**
 * Validate secret value format based on type
 * 
 * Validation rules:
 * - API keys: 32-128 chars, alphanumeric + underscore/hyphen
 * - Cookies: Must be valid JWT or session format (3 parts separated by dots)
 * 
 * @param value - Secret value to validate
 * @param type - Secret type: 'api-key' or 'cookie'
 * @returns true if valid, false otherwise
 * 
 * @example
 * ```typescript
 * const isValid = validateSecretValue('sk_live_1234567890abcdef', 'api-key');
 * if (!isValid) {
 *   throw new Error('Invalid API key format');
 * }
 * ```
 */
export function validateSecretValue(value: string, type: 'api-key' | 'cookie'): boolean {
	// Input validation: reject null, undefined, or non-string values
	if (!value || typeof value !== 'string') {
		logger.warn(LOG_CODES['HBSE-007'].code, LOG_CODES['HBSE-007'].summary, {
			type,
			length: value?.length ?? 0,
			validation: 'failed',
			action: 'invalid_secret_format_rejected',
			reason: 'invalid_input_type',
		});
		recordSecretValidationError(type, 'invalid_input_type');
		return false;
	}

	// API keys: 32-128 chars, alphanumeric + special chars
	const apiKeyRegex = /^[a-zA-Z0-9_-]{32,128}$/;

	// Cookies: Must be valid JWT or session format
	const cookieRegex = /^[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]*$/;

	const regex = type === 'api-key' ? apiKeyRegex : cookieRegex;
	const isValid = regex.test(value);

	if (!isValid) {
		logger.warn(LOG_CODES['HBSE-007'].code, LOG_CODES['HBSE-007'].summary, {
			type,
			length: value.length,
			validation: 'failed',
			action: 'invalid_secret_format_rejected',
		});
		recordSecretValidationError(type, 'format_mismatch');
	}

	return isValid;
}

/**
 * Input Validation Utilities - Enterprise-Grade Validation
 *
 * Comprehensive input validation with security considerations.
 * Prevents injection attacks, validates data integrity, and provides
 * clear error messages for invalid inputs.
 */

import { VALIDATION_CONSTANTS, ERROR_CODES } from './constants';
import { ValidationError } from './errors';

// ============================================================================
// STRING VALIDATION
// ============================================================================

/**
 * Validate package name according to npm naming conventions
 */
export function validatePackageName(name: string): void {
  if (!name || typeof name !== 'string') {
    throw new ValidationError('Package name is required', 'packageName');
  }

  if (name.length === 0) {
    throw new ValidationError('Package name cannot be empty', 'packageName');
  }

  if (name.length > VALIDATION_CONSTANTS.MAX_PACKAGE_NAME_LENGTH) {
    throw new ValidationError(
      `Package name too long (max ${VALIDATION_CONSTANTS.MAX_PACKAGE_NAME_LENGTH} characters)`,
      'packageName'
    );
  }

  // Check for npm naming restrictions
  if (name.includes(' ')) {
    throw new ValidationError('Package name cannot contain spaces', 'packageName');
  }

  if (name.toLowerCase() !== name) {
    throw new ValidationError('Package name must be lowercase', 'packageName');
  }

  // Basic injection prevention
  const dangerousChars = /[<>'"&\\]/;
  if (dangerousChars.test(name)) {
    throw new ValidationError('Package name contains invalid characters', 'packageName');
  }
}

/**
 * Validate semantic version string
 */
export function validateVersion(version: string): void {
  if (!version || typeof version !== 'string') {
    throw new ValidationError('Version is required', 'version');
  }

  if (version.length === 0) {
    throw new ValidationError('Version cannot be empty', 'version');
  }

  if (version.length > VALIDATION_CONSTANTS.MAX_VERSION_LENGTH) {
    throw new ValidationError(
      `Version too long (max ${VALIDATION_CONSTANTS.MAX_VERSION_LENGTH} characters)`,
      'version'
    );
  }

  // Basic semantic version validation (simplified)
  const semverPattern = /^\d+\.\d+\.\d+(-[\w\.\-]+)?(\+[\w\.\-]+)?$/;
  if (!semverPattern.test(version)) {
    throw new ValidationError('Invalid semantic version format', 'version');
  }
}

/**
 * Validate description length and content
 */
export function validateDescription(description: string | null): void {
  if (description === null || description === undefined) {
    return; // Optional field
  }

  if (typeof description !== 'string') {
    throw new ValidationError('Description must be a string', 'description');
  }

  if (description.length > VALIDATION_CONSTANTS.MAX_DESCRIPTION_LENGTH) {
    throw new ValidationError(
      `Description too long (max ${VALIDATION_CONSTANTS.MAX_DESCRIPTION_LENGTH} characters)`,
      'description'
    );
  }
}

// ============================================================================
// URL VALIDATION
// ============================================================================

/**
 * Validate URL format and security
 */
export function validateUrl(url: string | null, fieldName: string = 'url'): void {
  if (url === null || url === undefined || url === '') {
    return; // Optional field
  }

  if (typeof url !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`, fieldName);
  }

  if (url.length > VALIDATION_CONSTANTS.MAX_URL_LENGTH) {
    throw new ValidationError(
      `${fieldName} too long (max ${VALIDATION_CONSTANTS.MAX_URL_LENGTH} characters)`,
      fieldName
    );
  }

  try {
    const parsedUrl = new URL(url);

    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new ValidationError(`${fieldName} must use HTTP or HTTPS protocol`, fieldName);
    }

    // Prevent localhost URLs in production
    if (
      process.env.NODE_ENV === 'production' &&
      (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1')
    ) {
      throw new ValidationError(`${fieldName} cannot use localhost in production`, fieldName);
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError(`Invalid ${fieldName} format`, fieldName);
  }
}

/**
 * Validate repository URL
 */
export function validateRepositoryUrl(url: string | null): void {
  validateUrl(url, 'repository');
}

/**
 * Validate homepage URL
 */
export function validateHomepageUrl(url: string | null): void {
  validateUrl(url, 'homepage');
}

// ============================================================================
// SECURITY VALIDATION
// ============================================================================

/**
 * Validate password strength
 */
export function validatePassword(password: string): void {
  if (!password || typeof password !== 'string') {
    throw new ValidationError('Password is required', 'password');
  }

  if (password.length < VALIDATION_CONSTANTS.MIN_PASSWORD_LENGTH) {
    throw new ValidationError(
      `Password too short (minimum ${VALIDATION_CONSTANTS.MIN_PASSWORD_LENGTH} characters)`,
      'password'
    );
  }

  if (password.length > VALIDATION_CONSTANTS.MAX_PASSWORD_LENGTH) {
    throw new ValidationError(
      `Password too long (maximum ${VALIDATION_CONSTANTS.MAX_PASSWORD_LENGTH} characters)`,
      'password'
    );
  }

  // Check for common weak patterns
  if (password.toLowerCase().includes('password')) {
    throw new ValidationError("Password cannot contain the word 'password'", 'password');
  }

  if (/^(.)\1+$/.test(password)) {
    throw new ValidationError('Password cannot be all the same character', 'password');
  }
}

/**
 * Validate username format
 */
export function validateUsername(username: string): void {
  if (!username || typeof username !== 'string') {
    throw new ValidationError('Username is required', 'username');
  }

  if (username.length < VALIDATION_CONSTANTS.MIN_USERNAME_LENGTH) {
    throw new ValidationError(
      `Username too short (minimum ${VALIDATION_CONSTANTS.MIN_USERNAME_LENGTH} characters)`,
      'username'
    );
  }

  if (username.length > VALIDATION_CONSTANTS.MAX_USERNAME_LENGTH) {
    throw new ValidationError(
      `Username too long (maximum ${VALIDATION_CONSTANTS.MAX_USERNAME_LENGTH} characters)`,
      'username'
    );
  }

  // Allow only alphanumeric characters, hyphens, and underscores
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    throw new ValidationError(
      'Username can only contain letters, numbers, hyphens, and underscores',
      'username'
    );
  }

  // Cannot start or end with special characters
  if (/^[-_]|[-_]$/.test(username)) {
    throw new ValidationError(
      'Username cannot start or end with hyphens or underscores',
      'username'
    );
  }
}

// ============================================================================
// DATABASE INPUT VALIDATION
// ============================================================================

/**
 * Sanitize SQL input to prevent injection attacks
 */
export function sanitizeSqlInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return input;
  }

  // Remove potentially dangerous characters
  return input.replace(/['";\\]/g, '');
}

/**
 * Validate table name for safety
 */
export function validateTableName(tableName: string): void {
  if (!tableName || typeof tableName !== 'string') {
    throw new ValidationError('Table name is required', 'tableName');
  }

  // Only allow alphanumeric characters and underscores
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
    throw new ValidationError(
      'Table name can only contain letters, numbers, and underscores',
      'tableName'
    );
  }

  // Check for SQL keywords (basic check)
  const sqlKeywords = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER'];
  if (sqlKeywords.includes(tableName.toUpperCase())) {
    throw new ValidationError('Table name cannot be a SQL keyword', 'tableName');
  }
}

/**
 * Validate column name for safety
 */
export function validateColumnName(columnName: string): void {
  if (!columnName || typeof columnName !== 'string') {
    throw new ValidationError('Column name is required', 'columnName');
  }

  // Only allow alphanumeric characters and underscores
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(columnName)) {
    throw new ValidationError(
      'Column name can only contain letters, numbers, and underscores',
      'columnName'
    );
  }
}

// ============================================================================
// PAGINATION VALIDATION
// ============================================================================

/**
 * Validate pagination parameters
 */
export function validatePagination(
  page: number = 1,
  limit: number = 50
): { page: number; limit: number } {
  const validatedPage = Math.max(1, Math.floor(Number(page) || 1));
  const validatedLimit = Math.min(
    VALIDATION_CONSTANTS.MAX_PAGE_SIZE,
    Math.max(
      VALIDATION_CONSTANTS.MIN_PAGE_SIZE,
      Math.floor(Number(limit) || VALIDATION_CONSTANTS.DEFAULT_PAGE_SIZE)
    )
  );

  return { page: validatedPage, limit: validatedLimit };
}

// ============================================================================
// FILE SIZE VALIDATION
// ============================================================================

/**
 * Validate file size
 */
export function validateFileSize(
  size: number,
  maxSize: number = VALIDATION_CONSTANTS.MAX_PACKAGE_SIZE
): void {
  if (typeof size !== 'number' || size < 0) {
    throw new ValidationError('Invalid file size', 'fileSize');
  }

  if (size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    throw new ValidationError(`File size exceeds maximum (${maxSizeMB}MB)`, 'fileSize');
  }
}

// ============================================================================
// COMPREHENSIVE VALIDATION OBJECTS
// ============================================================================

/**
 * Validate complete package metadata
 */
export function validatePackageMetadata(metadata: {
  name: string;
  version: string;
  description?: string;
  repository?: string;
  homepage?: string;
}): void {
  validatePackageName(metadata.name);
  validateVersion(metadata.version);

  if (metadata.description) {
    validateDescription(metadata.description);
  }

  if (metadata.repository) {
    validateRepositoryUrl(metadata.repository);
  }

  if (metadata.homepage) {
    validateHomepageUrl(metadata.homepage);
  }
}

/**
 * Validate user registration data
 */
export function validateUserRegistration(data: {
  username: string;
  password: string;
  email?: string;
}): void {
  validateUsername(data.username);
  validatePassword(data.password);

  if (data.email) {
    // Basic email validation
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(data.email)) {
      throw new ValidationError('Invalid email format', 'email');
    }
  }
}

// ============================================================================
// VALIDATION RESULT TYPE
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Run multiple validations and collect all errors
 */
export function validateAll(validations: (() => void)[]): ValidationResult {
  const errors: ValidationError[] = [];

  for (const validation of validations) {
    try {
      validation();
    } catch (error) {
      if (error instanceof ValidationError) {
        errors.push(error);
      } else {
        // Wrap unknown errors
        errors.push(new ValidationError('Unknown validation error'));
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

#!/usr/bin/env bun
/**
 * 🛡️ FactoryWager Input Validation Utilities
 * 
 * Common validation patterns for user inputs
 */

/**
 * Validate userId format (@username)
 */
export function validateUserId(userId: string): boolean {
  return /^@[\w-]+$/.test(userId);
}

/**
 * Validate and sanitize userId, throwing if invalid
 */
export function requireValidUserId(userId: string): string {
  if (!validateUserId(userId)) {
    throw new Error(`Invalid userId format: ${userId}. Expected format: @username`);
  }
  return userId;
}

/**
 * Sanitize string input (basic XSS prevention)
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .trim();
}

/**
 * @fileoverview Standardized Log Levels
 * @description Log level enumeration for consistent logging across Hyper-Bun
 * @module logging/levels
 * @version 16.3.1.0.0.0.0
 */

/**
 * Standardized log levels for Hyper-Bun logging system
 * Aligns with common logging standards (RFC 5424)
 */
export enum StandardizedLogLevel {
	DEBUG = 0,
	INFO = 1,
	WARN = 2,
	ERROR = 3,
	CRITICAL = 4
}

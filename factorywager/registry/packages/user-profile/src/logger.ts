#!/usr/bin/env bun
/**
 * 🪵 FactoryWager Logger Utility
 * 
 * Conditional logging for development/production environments
 */

const isDev = process.env.NODE_ENV !== 'production';

export const logger = {
  /**
   * Log info messages (only in development)
   */
  info: (...args: unknown[]): void => {
    if (isDev) {
      console.log(...args);
    }
  },

  /**
   * Log error messages (always logged)
   */
  error: (...args: unknown[]): void => {
    console.error(...args);
  },

  /**
   * Log warning messages (always logged)
   */
  warn: (...args: unknown[]): void => {
    console.warn(...args);
  },

  /**
   * Log debug messages (only in development with DEBUG flag)
   */
  debug: (...args: unknown[]): void => {
    if (isDev && process.env.DEBUG) {
      console.debug(...args);
    }
  },
};

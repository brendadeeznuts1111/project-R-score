/**
 * 🛠️ FactoryWager Utilities
 * 
 * Central utility functions for the monorepo
 * 
 * @version 1.0.0
 */

import { FACTORYWAGER_CONFIG } from './config';
import type { Severity, PerformanceMetrics } from './types';

// Performance utilities
export class PerformanceUtils {
  /**
   * Analyze performance metrics and determine severity
   */
  static analyzePerformance(metrics: Partial<PerformanceMetrics>): Severity {
    if (metrics.cpu?.severity === 'error' || 
        metrics.memory?.severity === 'error' || 
        metrics.network?.severity === 'error') {
      return 'error';
    }
    
    if (metrics.cpu?.severity === 'warning' || 
        metrics.memory?.severity === 'warning' || 
        metrics.network?.severity === 'warning') {
      return 'warning';
    }
    
    return 'success';
  }
  
  /**
   * Format bytes to human readable format
   */
  static formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
  
  /**
   * Format milliseconds to human readable format
   */
  static formatMs(ms: number): string {
    if (ms < 1000) {
      return `${ms.toFixed(2)}ms`;
    }
    return `${(ms / 1000).toFixed(2)}s`;
  }
}

// String utilities
export class StringUtils {
  /**
   * Pad string to specified length
   */
  static pad(str: string, length: number, padChar: string = ' '): string {
    return str.padEnd(length, padChar);
  }
  
  /**
   * Truncate string with ellipsis
   */
  static truncate(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - 3) + '...';
  }
  
  /**
   * Capitalize first letter
   */
  static capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

// Array utilities
export class ArrayUtils {
  /**
   * Chunk array into smaller arrays
   */
  static chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
  
  /**
   * Remove duplicates from array
   */
  static unique<T>(array: T[]): T[] {
    return [...new Set(array)];
  }
  
  /**
   * Group array by key
   */
  static groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce((groups, item) => {
      const groupKey = String(item[key]);
      groups[groupKey] = groups[groupKey] || [];
      groups[groupKey].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  }
}

// Object utilities
export class ObjectUtils {
  /**
   * Deep merge objects
   */
  static deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] !== undefined) {
        if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
          result[key] = this.deepMerge(result[key] || {}, source[key] as any);
        } else {
          result[key] = source[key] as any;
        }
      }
    }
    
    return result;
  }
  
  /**
   * Pick specific keys from object
   */
  static pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
    const result = {} as Pick<T, K>;
    for (const key of keys) {
      if (key in obj) {
        result[key] = obj[key];
      }
    }
    return result;
  }
  
  /**
   * Omit specific keys from object
   */
  static omit<T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
    const result = { ...obj };
    for (const key of keys) {
      delete result[key];
    }
    return result as Omit<T, K>;
  }
}

// Validation utilities
export class ValidationUtils {
  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  /**
   * Validate URL format
   */
  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Validate hex color
   */
  static isValidHexColor(color: string): boolean {
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return hexRegex.test(color);
  }
}

// Time utilities
export class TimeUtils {
  /**
   * Get timestamp in seconds
   */
  static now(): number {
    return Math.floor(Date.now() / 1000);
  }
  
  /**
   * Format timestamp as ISO string
   */
  static isoTimestamp(date?: Date): string {
    return (date || new Date()).toISOString();
  }
  
  /**
   * Get relative time string
   */
  static relativeTime(timestamp: number): string {
    const diff = Date.now() - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return `${seconds} second${seconds > 1 ? 's' : ''} ago`;
  }
}

// Export all utilities
export const Utils = {
  Performance: PerformanceUtils,
  String: StringUtils,
  Array: ArrayUtils,
  Object: ObjectUtils,
  Validation: ValidationUtils,
  Time: TimeUtils,
} as const;

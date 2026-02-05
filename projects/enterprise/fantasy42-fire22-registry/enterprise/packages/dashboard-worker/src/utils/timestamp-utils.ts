#!/usr/bin/env bun

/**
 * 🕐 Enhanced Timestamp Utilities for Fire22 Dashboard
 * Comprehensive timestamp parsing, validation, formatting, and manipulation
 */

export interface TimestampInfo {
  original: string;
  parsed: Date;
  isValid: boolean;
  format: string;
  timezone?: string;
  unix: number;
  iso: string;
  humanReadable: string;
  relative: string;
  components: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
    millisecond: number;
  };
}

export interface TimestampValidationResult {
  isValid: boolean;
  format: string;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export class TimestampUtils {
  // Supported timestamp formats
  private static readonly FORMATS = {
    ISO: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/,
    CUSTOM: /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d{3})?$/,
    DATE_ONLY: /^\d{4}-\d{2}-\d{2}$/,
    TIME_ONLY: /^\d{2}:\d{2}:\d{2}(\.\d{3})?$/,
    UNIX: /^\d{10,13}$/,
    RFC2822: /^[A-Za-z]{3}, \d{2} [A-Za-z]{3} \d{4} \d{2}:\d{2}:\d{2} [+-]\d{4}$/,
  };

  /**
   * Parse and analyze any timestamp format
   */
  static parseTimestamp(timestamp: string): TimestampInfo {
    const original = timestamp.trim();
    let parsed: Date;
    let format = 'unknown';
    let isValid = false;

    try {
      // Try to detect format and parse
      if (TimestampUtils.FORMATS.ISO.test(original)) {
        parsed = new Date(original);
        format = 'ISO';
      } else if (TimestampUtils.FORMATS.CUSTOM.test(original)) {
        // Handle custom format: "2025-08-25 20:05:00.000"
        const [datePart, timePart] = original.split(' ');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hour, minute, second] = timePart.split(':').map(Number);
        const millisecond = timePart.includes('.') ? parseInt(timePart.split('.')[1]) : 0;

        parsed = new Date(year, month - 1, day, hour, minute, second, millisecond);
        format = 'CUSTOM';
      } else if (TimestampUtils.FORMATS.DATE_ONLY.test(original)) {
        parsed = new Date(original);
        format = 'DATE_ONLY';
      } else if (TimestampUtils.FORMATS.TIME_ONLY.test(original)) {
        const today = new Date();
        const [hour, minute, second] = original.split(':').map(Number);
        const millisecond = original.includes('.') ? parseInt(original.split('.')[1]) : 0;
        parsed = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate(),
          hour,
          minute,
          second,
          millisecond
        );
        format = 'TIME_ONLY';
      } else if (TimestampUtils.FORMATS.UNIX.test(original)) {
        const unixTime = parseInt(original);
        parsed = original.length === 10 ? new Date(unixTime * 1000) : new Date(unixTime);
        format = 'UNIX';
      } else if (TimestampUtils.FORMATS.RFC2822.test(original)) {
        parsed = new Date(original);
        format = 'RFC2822';
      } else {
        // Fallback to Date constructor
        parsed = new Date(original);
        format = 'FALLBACK';
      }

      isValid = !isNaN(parsed.getTime());
    } catch (error) {
      parsed = new Date();
      isValid = false;
    }

    const now = new Date();
    const diffMs = parsed.getTime() - now.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    let relative = '';
    if (Math.abs(diffDays) > 0) {
      relative =
        diffDays > 0
          ? `in ${diffDays} day${diffDays > 1 ? 's' : ''}`
          : `${Math.abs(diffDays)} day${Math.abs(diffDays) > 1 ? 's' : ''} ago`;
    } else if (Math.abs(diffHours) > 0) {
      relative =
        diffHours > 0
          ? `in ${diffHours} hour${diffHours > 1 ? 's' : ''}`
          : `${Math.abs(diffHours)} hour${Math.abs(diffHours) > 1 ? 's' : ''} ago`;
    } else if (Math.abs(diffMinutes) > 0) {
      relative =
        diffMinutes > 0
          ? `in ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`
          : `${Math.abs(diffMinutes)} minute${Math.abs(diffMinutes) > 1 ? 's' : ''} ago`;
    } else if (Math.abs(diffSeconds) > 0) {
      relative =
        diffSeconds > 0
          ? `in ${diffSeconds} second${diffSeconds > 1 ? 's' : ''}`
          : `${Math.abs(diffSeconds)} second${Math.abs(diffSeconds) > 1 ? 's' : ''} ago`;
    } else {
      relative = 'now';
    }

    return {
      original,
      parsed,
      isValid,
      format,
      unix: Math.floor(parsed.getTime() / 1000),
      iso: isValid ? parsed.toISOString() : 'Invalid Date',
      humanReadable: isValid ? parsed.toLocaleString() : 'Invalid Date',
      relative,
      components: {
        year: isValid ? parsed.getFullYear() : 0,
        month: isValid ? parsed.getMonth() + 1 : 0,
        day: isValid ? parsed.getDate() : 0,
        hour: isValid ? parsed.getHours() : 0,
        minute: isValid ? parsed.getMinutes() : 0,
        second: isValid ? parsed.getSeconds() : 0,
        millisecond: isValid ? parsed.getMilliseconds() : 0,
      },
    };
  }

  /**
   * Validate timestamp format and provide suggestions
   */
  static validateTimestamp(timestamp: string): TimestampValidationResult {
    const info = TimestampUtils.parseTimestamp(timestamp);
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    if (!info.isValid) {
      errors.push('Invalid timestamp format');
      suggestions.push('Use ISO format: YYYY-MM-DDTHH:mm:ss.sssZ');
      suggestions.push('Use custom format: YYYY-MM-DD HH:mm:ss.sss');
    }

    if (info.format === 'unknown') {
      warnings.push('Unable to determine timestamp format');
      suggestions.push('Check timestamp format and try again');
    }

    if (info.parsed < new Date('1900-01-01')) {
      warnings.push('Timestamp is very old (before 1900)');
    }

    if (info.parsed > new Date()) {
      warnings.push('Timestamp is in the future');
    } else if (info.parsed > new Date('2100-01-01')) {
      warnings.push('Timestamp is very far in the future (after 2100)');
    }

    // Check for common format issues
    if (timestamp.includes(' ') && !TimestampUtils.FORMATS.CUSTOM.test(timestamp)) {
      suggestions.push('Consider using ISO format with T separator: YYYY-MM-DDTHH:mm:ss.sssZ');
    }

    return {
      isValid: info.isValid,
      format: info.format,
      errors,
      warnings,
      suggestions,
    };
  }

  /**
   * Format timestamp in various output formats
   */
  static formatTimestamp(
    timestamp: string,
    format: 'iso' | 'human' | 'custom' | 'unix' | 'relative' = 'human'
  ): string {
    const info = TimestampUtils.parseTimestamp(timestamp);

    if (!info.isValid) {
      return 'Invalid timestamp';
    }

    switch (format) {
      case 'iso':
        return info.iso;
      case 'human':
        return info.humanReadable;
      case 'custom':
        return `${info.components.year}-${String(info.components.month).padStart(2, '0')}-${String(info.components.day).padStart(2, '0')} ${String(info.components.hour).padStart(2, '0')}:${String(info.components.minute).padStart(2, '0')}:${String(info.components.second).padStart(2, '0')}.${String(info.components.millisecond).padStart(3, '0')}`;
      case 'unix':
        return info.unix.toString();
      case 'relative':
        return info.relative;
      default:
        return info.humanReadable;
    }
  }

  /**
   * Convert between timestamp formats
   */
  static convertFormat(
    timestamp: string,
    targetFormat: 'iso' | 'custom' | 'unix' | 'rfc2822'
  ): string {
    const info = TimestampUtils.parseTimestamp(timestamp);

    if (!info.isValid) {
      return 'Invalid timestamp';
    }

    switch (targetFormat) {
      case 'iso':
        return info.iso;
      case 'custom':
        return this.formatTimestamp(timestamp, 'custom');
      case 'unix':
        return info.unix.toString();
      case 'rfc2822':
        return info.parsed.toUTCString();
      default:
        return info.iso;
    }
  }

  /**
   * Get time difference between two timestamps
   */
  static getTimeDifference(
    timestamp1: string,
    timestamp2: string
  ): {
    milliseconds: number;
    seconds: number;
    minutes: number;
    hours: number;
    days: number;
    humanReadable: string;
  } {
    const info1 = TimestampUtils.parseTimestamp(timestamp1);
    const info2 = TimestampUtils.parseTimestamp(timestamp2);

    if (!info1.isValid || !info2.isValid) {
      return {
        milliseconds: 0,
        seconds: 0,
        minutes: 0,
        hours: 0,
        days: 0,
        humanReadable: 'Invalid timestamp',
      };
    }

    const diffMs = info2.parsed.getTime() - info1.parsed.getTime();
    const diffSeconds = Math.floor(Math.abs(diffMs) / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    // Calculate remaining hours after days
    const remainingHours = diffHours % 24;
    const remainingMinutes = diffMinutes % 60;
    const remainingSeconds = diffSeconds % 60;

    let humanReadable = '';
    if (diffDays > 0) {
      humanReadable = `${diffDays} day${diffDays > 1 ? 's' : ''}`;
      if (remainingHours > 0) {
        humanReadable += ` ${remainingHours} hour${remainingHours > 1 ? 's' : ''}`;
      }
    } else if (diffHours > 0) {
      humanReadable = `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    } else if (diffMinutes > 0) {
      humanReadable = `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
    } else if (diffSeconds > 0) {
      humanReadable = `${diffSeconds} second${diffSeconds > 1 ? 's' : ''}`;
    } else {
      humanReadable = `${Math.abs(diffMs)} millisecond${Math.abs(diffMs) > 1 ? 's' : ''}`;
    }

    if (diffMs < 0) {
      humanReadable = `${humanReadable} ago`;
    }

    return {
      milliseconds: diffMs,
      seconds: diffSeconds,
      minutes: remainingMinutes, // Return remaining minutes after hours
      hours: remainingHours, // Return remaining hours after days
      days: diffDays,
      humanReadable,
    };
  }

  /**
   * Check if timestamp is in the future
   */
  static isFuture(timestamp: string): boolean {
    const info = TimestampUtils.parseTimestamp(timestamp);
    if (!info.isValid) return false;
    return info.parsed > new Date();
  }

  /**
   * Check timestamp is in the past
   */
  static isPast(timestamp: string): boolean {
    const info = TimestampUtils.parseTimestamp(timestamp);
    if (!info.isValid) return false;
    return info.parsed < new Date();
  }

  /**
   * Get current timestamp in various formats
   */
  static now(format: 'iso' | 'custom' | 'unix' | 'rfc2822' = 'iso'): string {
    const now = new Date();
    switch (format) {
      case 'iso':
        return now.toISOString();
      case 'custom':
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.${String(now.getMilliseconds()).padStart(3, '0')}`;
      case 'unix':
        return Math.floor(now.getTime() / 1000).toString();
      case 'rfc2822':
        return now.toUTCString();
      default:
        return now.toISOString();
    }
  }

  /**
   * Add time to a timestamp
   */
  static addTime(
    timestamp: string,
    amount: number,
    unit: 'milliseconds' | 'seconds' | 'minutes' | 'hours' | 'days'
  ): string {
    const info = TimestampUtils.parseTimestamp(timestamp);
    if (!info.isValid) return 'Invalid timestamp';

    const newDate = new Date(info.parsed);
    switch (unit) {
      case 'milliseconds':
        newDate.setMilliseconds(newDate.getMilliseconds() + amount);
        break;
      case 'seconds':
        newDate.setSeconds(newDate.getSeconds() + amount);
        break;
      case 'minutes':
        newDate.setMinutes(newDate.getMinutes() + amount);
        break;
      case 'hours':
        newDate.setHours(newDate.getHours() + amount);
        break;
      case 'days':
        newDate.setDate(newDate.getDate() + amount);
        break;
    }

    return newDate.toISOString();
  }

  /**
   * Get business hours between two timestamps
   */
  static getBusinessHours(
    startTimestamp: string,
    endTimestamp: string,
    businessStartHour: number = 0,
    businessEndHour: number = 17
  ): number {
    const info1 = TimestampUtils.parseTimestamp(startTimestamp);
    const info2 = TimestampUtils.parseTimestamp(endTimestamp);

    if (!info1.isValid || !info2.isValid) return 0;

    const start = new Date(info1.parsed);
    const end = new Date(info2.parsed);

    let businessHours = 0;
    const current = new Date(start);

    while (current < end) {
      const dayOfWeek = current.getDay();
      const hour = current.getHours();

      // Skip weekends and non-business hours
      if (dayOfWeek > 0 && dayOfWeek < 6 && hour >= businessStartHour && hour < businessEndHour) {
        businessHours += 1;
      }

      current.setHours(current.getHours() + 1);
    }

    return businessHours;
  }
}

// Export utility functions for backward compatibility
export const parseTimestamp = TimestampUtils.parseTimestamp;
export const validateTimestamp = TimestampUtils.validateTimestamp;
export const formatTimestamp = TimestampUtils.formatTimestamp;
export const convertFormat = TimestampUtils.convertFormat;
export const getTimeDifference = TimestampUtils.getTimeDifference;
export const isFuture = TimestampUtils.isFuture;
export const isPast = TimestampUtils.isPast;
export const now = TimestampUtils.now;
export const addTime = TimestampUtils.addTime;
export const getBusinessHours = TimestampUtils.getBusinessHours;

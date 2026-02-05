#!/usr/bin/env bun
/**
 * Error Code Index & Reference System
 * Comprehensive error tracking with links and documentation
 */

import { color } from 'bun' with { type: 'macro' };

// !==!==!===== ERROR CODE CATEGORIES !==!==!=====
export const ERROR_CATEGORIES = {
  SYSTEM: {
    prefix: 'E1',
    name: 'System Errors',
    description: 'Core system initialization and runtime errors',
    color: color('#dc2626', 'css'),
    range: '1000-1999',
  },
  DATABASE: {
    prefix: 'E2',
    name: 'Database Errors',
    description: 'Database connection, query, and transaction errors',
    color: color('#ef4444', 'css'),
    range: '2000-2999',
  },
  API: {
    prefix: 'E3',
    name: 'API Errors',
    description: 'REST API, authentication, and validation errors',
    color: color('#f59e0b', 'css'),
    range: '3000-3999',
  },
  NETWORK: {
    prefix: 'E4',
    name: 'Network Errors',
    description: 'DNS, SSL, timeout, and connectivity errors',
    color: color('#f97316', 'css'),
    range: '4000-4999',
  },
  APPLICATION: {
    prefix: 'E5',
    name: 'Application Errors',
    description: 'Business logic, validation, and resource errors',
    color: color('#eab308', 'css'),
    range: '5000-5999',
  },
  SECURITY: {
    prefix: 'E6',
    name: 'Security Errors',
    description: 'Authentication, authorization, and security violations',
    color: color('#dc2626', 'css'),
    range: '6000-6999',
  },
} as const;

// !==!==!===== COMPREHENSIVE ERROR INDEX !==!==!=====
export const ERROR_INDEX = {
  // **SYSTEM ERRORS (1000-1999)**
  E1001: {
    code: 'E1001',
    name: 'SYSTEM_INIT_FAILED',
    message: 'System initialization failed',
    severity: 'CRITICAL',
    category: 'SYSTEM',
    description: 'Core system components failed to initialize properly',
    solutions: [
      'Check system resources (memory, disk space)',
      'Verify configuration files',
      'Review system logs for detailed error messages',
    ],
    links: [
      { text: 'System Troubleshooting Guide', url: '/docs/system/troubleshooting' },
      { text: 'Configuration Reference', url: '/docs/system/config' },
    ],
    occurrences: 0,
    firstSeen: null as Date | null,
    lastSeen: null as Date | null,
  },

  E1002: {
    code: 'E1002',
    name: 'MEMORY_LIMIT_EXCEEDED',
    message: 'Memory limit exceeded',
    severity: 'ERROR',
    category: 'SYSTEM',
    description: 'Application exceeded allocated memory limits',
    solutions: [
      'Increase memory allocation in configuration',
      'Optimize memory usage in application code',
      'Check for memory leaks',
    ],
    links: [
      { text: 'Memory Management Guide', url: '/docs/system/memory' },
      { text: 'Performance Optimization', url: '/docs/performance' },
    ],
    occurrences: 0,
    firstSeen: null as Date | null,
    lastSeen: null as Date | null,
  },

  E1003: {
    code: 'E1003',
    name: 'CONFIG_INVALID',
    message: 'Invalid configuration',
    severity: 'ERROR',
    category: 'SYSTEM',
    description: 'Configuration file contains invalid or missing values',
    solutions: [
      'Validate configuration syntax',
      'Check required configuration keys',
      'Use configuration validation tool',
    ],
    links: [
      { text: 'Configuration Schema', url: '/docs/config/schema' },
      { text: 'Config Validation', url: '/docs/config/validation' },
    ],
    occurrences: 0,
    firstSeen: null as Date | null,
    lastSeen: null as Date | null,
  },

  // **DATABASE ERRORS (2000-2999)**
  E2001: {
    code: 'E2001',
    name: 'DB_CONNECTION_FAILED',
    message: 'Database connection failed',
    severity: 'CRITICAL',
    category: 'DATABASE',
    description: 'Unable to establish connection to database server',
    solutions: [
      'Verify database server is running',
      'Check connection string and credentials',
      'Test network connectivity to database host',
    ],
    links: [
      { text: 'Database Setup Guide', url: '/docs/database/setup' },
      { text: 'Connection Troubleshooting', url: '/docs/database/connection' },
    ],
    occurrences: 0,
    firstSeen: null as Date | null,
    lastSeen: null as Date | null,
  },

  E2001: {
    code: 'E2001',
    name: 'DB_CONNECTION_POOL_EXHAUSTED',
    message: 'Connection pool exhausted - troubleshoot',
    severity: 'CRITICAL',
    category: 'DATABASE',
    description:
      'Database connection pool has reached maximum capacity and cannot serve new requests',
    solutions: [
      'Increase connection pool size in configuration',
      'Implement connection pooling optimization',
      'Check for connection leaks in application code',
      'Monitor and scale database resources',
      'Implement circuit breaker pattern',
    ],
    links: [
      { text: 'Database Connection Guide', url: '/docs/database/connection' },
      { text: 'Connection Troubleshooting', url: '/docs/database/connection-troubleshooting' },
      { text: 'Pool Configuration', url: '/docs/database/pool-config' },
    ],
    occurrences: 0,
    firstSeen: null as Date | null,
    lastSeen: null as Date | null,
  },

  E2002: {
    code: 'E2002',
    name: 'DB_QUERY_TIMEOUT',
    message: 'Database query timeout',
    severity: 'ERROR',
    category: 'DATABASE',
    description: 'Database query exceeded maximum execution time',
    solutions: [
      'Optimize query performance with indexes',
      'Increase query timeout settings',
      'Review query execution plan',
    ],
    links: [
      { text: 'Query Optimization', url: '/docs/database/optimization' },
      { text: 'Index Strategy Guide', url: '/docs/database/indexes' },
    ],
    occurrences: 0,
    firstSeen: null as Date | null,
    lastSeen: null as Date | null,
  },

  // **API ERRORS (3000-3999)**
  E3001: {
    code: 'E3001',
    name: 'API_UNAUTHORIZED',
    message: 'Unauthorized API request',
    severity: 'WARNING',
    category: 'API',
    description: 'Request lacks valid authentication credentials',
    solutions: [
      'Provide valid API key or token',
      'Check authentication header format',
      'Verify token expiration',
    ],
    links: [
      { text: 'API Authentication', url: '/crystal-clear-architecture/docs/api/auth' },
      { text: 'Token Management', url: '/crystal-clear-architecture/docs/api/tokens' },
    ],
    occurrences: 0,
    firstSeen: null as Date | null,
    lastSeen: null as Date | null,
  },

  E3002: {
    code: 'E3002',
    name: 'API_RATE_LIMIT_EXCEEDED',
    message: 'Rate limit exceeded - docs',
    severity: 'WARNING',
    category: 'API',
    description:
      'Request rate exceeds configured API limits, check documentation for rate limit configuration',
    solutions: [
      'Implement exponential backoff retry strategy',
      'Use request caching to reduce API calls',
      'Consider upgrading rate limit tier or plan',
      'Implement request queuing system',
      'Review API usage patterns and optimize',
    ],
    links: [
      { text: 'Rate Limiting Guide', url: '/crystal-clear-architecture/docs/api/rate-limits' },
      { text: 'API Optimization', url: '/crystal-clear-architecture/docs/api/optimization' },
      { text: 'Caching Strategies', url: '/crystal-clear-architecture/docs/api/caching' },
      { text: 'Retry Patterns', url: '/crystal-clear-architecture/docs/api/retry-patterns' },
    ],
    occurrences: 0,
    firstSeen: null as Date | null,
    lastSeen: null as Date | null,
  },

  // **NETWORK ERRORS (4000-4999)**
  E4001: {
    code: 'E4001',
    name: 'NETWORK_TIMEOUT',
    message: 'Network request timeout',
    severity: 'ERROR',
    category: 'NETWORK',
    description: 'Network request exceeded timeout duration',
    solutions: [
      'Increase request timeout settings',
      'Check network connectivity',
      'Implement retry logic with backoff',
    ],
    links: [
      { text: 'Network Configuration', url: '/docs/network/config' },
      { text: 'Timeout Settings', url: '/docs/network/timeouts' },
    ],
    occurrences: 0,
    firstSeen: null as Date | null,
    lastSeen: null as Date | null,
  },

  E4002: {
    code: 'E4002',
    name: 'DNS_RESOLUTION_FAILED',
    message: 'DNS resolution failed',
    severity: 'ERROR',
    category: 'NETWORK',
    description: 'Unable to resolve hostname to IP address',
    solutions: [
      'Check DNS server configuration',
      'Verify hostname spelling',
      'Test with alternative DNS servers',
    ],
    links: [
      { text: 'DNS Troubleshooting', url: '/docs/network/dns' },
      { text: 'Network Diagnostics', url: '/docs/network/diagnostics' },
    ],
    occurrences: 0,
    firstSeen: null as Date | null,
    lastSeen: null as Date | null,
  },

  // **APPLICATION ERRORS (5000-5999)**
  E5001: {
    code: 'E5001',
    name: 'VALIDATION_ERROR',
    message: 'Data validation error',
    severity: 'WARNING',
    category: 'APPLICATION',
    description: 'Input data failed validation rules',
    solutions: [
      'Check input data format and types',
      'Review validation schema requirements',
      'Provide user-friendly error messages',
    ],
    links: [
      { text: 'Validation Rules', url: '/docs/validation/rules' },
      { text: 'Error Handling', url: '/docs/validation/errors' },
    ],
    occurrences: 0,
    firstSeen: null as Date | null,
    lastSeen: null as Date | null,
  },

  // **SECURITY ERRORS (6000-6999)**
  E6001: {
    code: 'E6001',
    name: 'MULTIPLE_FAILED_LOGIN_ATTEMPTS',
    message: 'Multiple failed login attempts detected',
    severity: 'CRITICAL',
    category: 'SECURITY',
    description:
      'Multiple consecutive failed login attempts detected, potential brute force attack or unauthorized access attempt',
    solutions: [
      'Temporarily lock affected user account',
      'Implement IP-based rate limiting',
      'Enable account lockout after failed attempts',
      'Review and strengthen password policies',
      'Enable multi-factor authentication (MFA)',
      'Monitor suspicious login patterns',
      'Implement CAPTCHA verification',
    ],
    links: [
      { text: 'Security Policies', url: '/docs/security/policies' },
      { text: 'Authentication Security', url: '/docs/security/authentication' },
      { text: 'Brute Force Protection', url: '/docs/security/brute-force-protection' },
      { text: 'Account Lockout Configuration', url: '/docs/security/account-lockout' },
      { text: 'Security Audit Guide', url: '/docs/security/audit' },
    ],
    occurrences: 0,
    firstSeen: null as Date | null,
    lastSeen: null as Date | null,
  },

  E6002: {
    code: 'E6002',
    name: 'SUSPICIOUS_CONNECTION_DETECTED',
    message: 'New connection from suspicious source',
    severity: 'HIGH',
    category: 'SECURITY',
    description:
      'New connection detected from potentially suspicious IP address or geographic location',
    solutions: [
      'Verify connection legitimacy',
      'Check IP reputation databases',
      'Review geographic access patterns',
      'Implement connection monitoring',
      'Enable enhanced logging for suspicious IPs',
    ],
    links: [
      { text: 'Connection Monitoring', url: '/docs/security/connection-monitoring' },
      { text: 'IP Reputation', url: '/docs/security/ip-reputation' },
      { text: 'Geographic Security', url: '/docs/security/geographic-controls' },
    ],
    occurrences: 0,
    firstSeen: null as Date | null,
    lastSeen: null as Date | null,
  },
} as const;

// !==!==!===== ERROR TRACKING CLASS !==!==!=====
export class ErrorTracker {
  private static instance: ErrorTracker;
  private errorIndex: Map<string, any>;

  constructor() {
    this.errorIndex = new Map(Object.entries(ERROR_INDEX));
  }

  static getInstance(): ErrorTracker {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = new ErrorTracker();
    }
    return ErrorTracker.instance;
  }

  /**
   * Track error occurrence
   */
  trackError(errorCode: string): void {
    const error = this.errorIndex.get(errorCode);
    if (error) {
      error.occurrences++;
      const now = new Date();

      if (!error.firstSeen) {
        error.firstSeen = now;
      }
      error.lastSeen = now;

      this.errorIndex.set(errorCode, error);
    }
  }

  /**
   * Get error details with tracking info
   */
  getError(errorCode: string): any {
    return this.errorIndex.get(errorCode);
  }

  /**
   * Get all errors by category
   */
  getErrorsByCategory(category: string): any[] {
    return Array.from(this.errorIndex.values()).filter(error => error.category === category);
  }

  /**
   * Get top errors by occurrence count
   */
  getTopErrors(limit: number = 10): any[] {
    return Array.from(this.errorIndex.values())
      .sort((a, b) => b.occurrences - a.occurrences)
      .slice(0, limit);
  }

  /**
   * Generate error report
   */
  generateReport(): {
    totalErrors: number;
    categoryCounts: Record<string, number>;
    severityCounts: Record<string, number>;
    topErrors: any[];
  } {
    const errors = Array.from(this.errorIndex.values());

    const categoryCounts: Record<string, number> = {};
    const severityCounts: Record<string, number> = {};
    let totalErrors = 0;

    errors.forEach(error => {
      totalErrors += error.occurrences;

      categoryCounts[error.category] = (categoryCounts[error.category] || 0) + error.occurrences;
      severityCounts[error.severity] = (severityCounts[error.severity] || 0) + error.occurrences;
    });

    return {
      totalErrors,
      categoryCounts,
      severityCounts,
      topErrors: this.getTopErrors(5),
    };
  }

  /**
   * Reset all error counts
   */
  resetCounts(): void {
    this.errorIndex.forEach(error => {
      error.occurrences = 0;
      error.firstSeen = null;
      error.lastSeen = null;
    });
  }
}

// !==!==!===== DISPLAY UTILITIES !==!==!=====
export function displayErrorIndex(): void {
  console.log('\n📚 **ERROR CODE INDEX & REFERENCE** 📚\n');
  console.log('='.repeat(80));

  // Display categories
  console.log('\n🏷️ **ERROR CATEGORIES**');
  console.log('-'.repeat(80));

  Object.entries(ERROR_CATEGORIES).forEach(([key, category]) => {
    console.log(
      `${category.color}${category.prefix}xxx${color('#ffffff', 'css')} | ${category.name.padEnd(20)} | Range: ${category.range}`
    );
    console.log(`       ${category.description}\n`);
  });

  // Display all errors
  console.log('📋 **COMPLETE ERROR INDEX**');
  console.log('-'.repeat(80));

  Object.entries(ERROR_CATEGORIES).forEach(([categoryKey, category]) => {
    const categoryErrors = Object.values(ERROR_INDEX).filter(
      error => error.category === categoryKey
    );

    if (categoryErrors.length > 0) {
      console.log(`\n${category.color}${category.name.toUpperCase()}${color('#ffffff', 'css')}`);
      console.log('-'.repeat(40));

      categoryErrors.forEach(error => {
        console.log(`${category.color}${error.code}${color('#ffffff', 'css')} | ${error.name}`);
        console.log(`       ${error.message}`);
        console.log(
          `       Severity: ${color('#fbbf24', 'css')}${error.severity}${color('#ffffff', 'css')}`
        );
        console.log(`       Solutions: ${error.solutions.length} available`);
        console.log(`       Links: ${error.links.length} documentation links`);
        if (error.occurrences > 0) {
          console.log(
            `       ${color('#ef4444', 'css')}Occurrences: ${error.occurrences}${color('#ffffff', 'css')}`
          );
        }
        console.log();
      });
    }
  });
}

// !==!==!===== EXPORTS !==!==!=====
export const errorTracker = ErrorTracker.getInstance();

// !==!==!===== CLI DEMO !==!==!=====
if (import.meta.main) {
  // Display error index
  displayErrorIndex();

  // Demo error tracking
  console.log('\n🔥 **ERROR TRACKING DEMO** 🔥');
  console.log('='.repeat(80));

  // Simulate some errors
  const testErrors = ['E1001', 'E2001', 'E3001', 'E4001', 'E1001', 'E2001', 'E3002'];

  testErrors.forEach(code => {
    errorTracker.trackError(code);
  });

  // Generate report
  const report = errorTracker.generateReport();

  console.log('\n📊 **ERROR REPORT**');
  console.log('-'.repeat(80));
  console.log(
    `Total Errors: ${color('#ef4444', 'css')}${report.totalErrors}${color('#ffffff', 'css')}`
  );

  console.log('\n🏷️ **Errors by Category:**');
  Object.entries(report.categoryCounts).forEach(([category, count]) => {
    console.log(
      `${category.padEnd(15)}: ${color('#ef4444', 'css')}${count}${color('#ffffff', 'css')}`
    );
  });

  console.log('\n⚠️ **Errors by Severity:**');
  Object.entries(report.severityCounts).forEach(([severity, count]) => {
    console.log(
      `${severity.padEnd(15)}: ${color('#f59e0b', 'css')}${count}${color('#ffffff', 'css')}`
    );
  });

  console.log('\n🔥 **Top 5 Errors:**');
  report.topErrors.forEach((error, index) => {
    if (error.occurrences > 0) {
      console.log(
        `${index + 1}. ${color('#ef4444', 'css')}${error.code}${color('#ffffff', 'css')} - ${error.message} (${color('#fbbf24', 'css')}${error.occurrences}${color('#ffffff', 'css')} times)`
      );
    }
  });

  console.log('\n' + '='.repeat(80));
  console.log('Error index and tracking system ready!');
}

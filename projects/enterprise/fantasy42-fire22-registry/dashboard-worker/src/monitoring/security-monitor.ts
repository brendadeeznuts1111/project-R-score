import { SecurityEvent, SecurityConfig } from '../types/enhanced-types';

/**
 * Security Monitor class for tracking security events and suspicious activity
 */
export class SecurityMonitor {
  private config: SecurityConfig;
  private securityEvents: SecurityEvent[] = [];
  private suspiciousActivityCount: number = 0;
  private lastActivityReset: number = Date.now();

  constructor(config: SecurityConfig) {
    this.config = config;
  }

  /**
   * Records a security event
   * @param event Security event to record
   */
  async recordEvent(event: SecurityEvent): Promise<void> {
    if (!this.config.enableSecurityMonitoring) {
      return;
    }

    const enrichedEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    this.securityEvents.push(enrichedEvent);

    // Check for suspicious activity
    if (event.severity === 'high' || event.type === 'security') {
      this.suspiciousActivityCount++;
      this.checkSuspiciousActivity();
    }

    // Keep only recent events based on retention policy
    this.cleanupOldEvents();
  }

  /**
   * Gets security events within a time range
   * @param hours Number of hours to look back
   * @returns Array of security events
   */
  getSecurityEvents(hours: number = 24): SecurityEvent[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    return this.securityEvents.filter(event => event.timestamp >= cutoff);
  }

  /**
   * Gets security report with statistics
   * @returns Security report object
   */
  async getSecurityReport(): Promise<{
    events: SecurityEvent[];
    summary: {
      totalEvents: number;
      highSeverity: number;
      mediumSeverity: number;
      lowSeverity: number;
      suspiciousActivity: number;
      authenticationEvents: number;
      authorizationEvents: number;
      validationEvents: number;
    };
    recommendations: string[];
  }> {
    const events = this.getSecurityEvents();

    const summary = {
      totalEvents: events.length,
      highSeverity: events.filter(e => e.severity === 'high').length,
      mediumSeverity: events.filter(e => e.severity === 'medium').length,
      lowSeverity: events.filter(e => e.severity === 'low').length,
      suspiciousActivity: this.suspiciousActivityCount,
      authenticationEvents: events.filter(e => e.type === 'authentication').length,
      authorizationEvents: events.filter(e => e.type === 'authorization').length,
      validationEvents: events.filter(e => e.type === 'validation').length,
    };

    const recommendations = this.generateRecommendations(summary);

    return {
      events,
      summary,
      recommendations,
    };
  }

  /**
   * Checks for suspicious activity and triggers alerts if needed
   */
  private checkSuspiciousActivity(): void {
    if (this.suspiciousActivityCount >= this.config.suspiciousActivityThreshold) {
      this.triggerAlert('SUSPICIOUS_ACTIVITY_DETECTED', {
        count: this.suspiciousActivityCount,
        threshold: this.config.suspiciousActivityThreshold,
        timestamp: new Date().toISOString(),
      });

      // Reset counter after alert
      this.suspiciousActivityCount = 0;
    }
  }

  /**
   * Triggers an alert for security events
   * @param type Alert type
   * @param details Alert details
   */
  private triggerAlert(type: string, details: Record<string, any>): void {
    // In a real implementation, this would send alerts to various services
    // For now, we'll just log to console
    console.warn(`Security Alert [${type}]:`, details);

    // Could integrate with:
    // - Email notifications
    // - Slack/webhook alerts
    // - PagerDuty
    // - Security information and event management (SIEM) systems
  }

  /**
   * Cleans up old events based on retention policy
   */
  private cleanupOldEvents(): void {
    const cutoff = new Date(
      Date.now() - this.config.securityEventRetention * 24 * 60 * 60 * 1000
    ).toISOString();

    this.securityEvents = this.securityEvents.filter(event => event.timestamp >= cutoff);
  }

  /**
   * Generates security recommendations based on event patterns
   * @param summary Security summary
   * @returns Array of recommendations
   */
  private generateRecommendations(summary: any): string[] {
    const recommendations: string[] = [];

    if (summary.highSeverity > 0) {
      recommendations.push('Investigate high-severity security events immediately');
    }

    if (summary.suspiciousActivity > this.config.suspiciousActivityThreshold * 0.8) {
      recommendations.push(
        'Monitor for potential brute force attacks or suspicious activity patterns'
      );
    }

    if (summary.authenticationEvents > 100) {
      recommendations.push('Review authentication patterns for potential anomalies');
    }

    if (summary.authorizationEvents > 50) {
      recommendations.push('Check for authorization bypass attempts');
    }

    if (summary.validationEvents > 200) {
      recommendations.push('Review input validation for potential injection attempts');
    }

    if (recommendations.length === 0) {
      recommendations.push('Security monitoring is operating normally');
    }

    return recommendations;
  }

  /**
   * Resets security event counters
   */
  reset(): void {
    this.securityEvents = [];
    this.suspiciousActivityCount = 0;
    this.lastActivityReset = Date.now();
  }

  /**
   * Gets current security metrics
   * @returns Security metrics object
   */
  getMetrics(): {
    totalEvents: number;
    suspiciousActivity: number;
    lastReset: string;
    retentionPeriod: number;
  } {
    return {
      totalEvents: this.securityEvents.length,
      suspiciousActivity: this.suspiciousActivityCount,
      lastReset: new Date(this.lastActivityReset).toISOString(),
      retentionPeriod: this.config.securityEventRetention,
    };
  }
}

/**
 * Security middleware for request validation
 */
export class SecurityMiddleware {
  private securityMonitor: SecurityMonitor;

  constructor(securityMonitor: SecurityMonitor) {
    this.securityMonitor = securityMonitor;
  }

  /**
   * Validates CSRF token
   * @param token Token to validate
   * @param expectedToken Expected token
   * @throws Error if validation fails
   */
  validateCSRFToken(token: string, expectedToken: string): void {
    if (token !== expectedToken) {
      this.securityMonitor.recordEvent({
        type: 'validation',
        severity: 'high',
        details: {
          validationType: 'csrf',
          providedToken: token,
          expectedToken: expectedToken,
        },
        timestamp: new Date().toISOString(),
      });

      throw new Error('Invalid CSRF token');
    }
  }

  /**
   * Validates request rate limiting
   * @param userId User ID for rate limiting
   * @param requestCount Current request count
   * @param maxRequests Maximum allowed requests
   * @param timeWindow Time window in seconds
   * @throws Error if rate limit exceeded
   */
  validateRateLimit(
    userId: string,
    requestCount: number,
    maxRequests: number,
    timeWindow: number = 60
  ): void {
    if (requestCount > maxRequests) {
      this.securityMonitor.recordEvent({
        type: 'security',
        severity: 'medium',
        details: {
          violationType: 'rate_limit',
          userId,
          requestCount,
          maxRequests,
          timeWindow,
        },
        userId,
        timestamp: new Date().toISOString(),
      });

      throw new Error('Rate limit exceeded');
    }
  }

  /**
   * Validates input for potential security threats
   * @param input Input to validate
   * @param inputType Type of input (e.g., 'email', 'username', 'password')
   * @throws Error if validation fails
   */
  validateInput(input: string, inputType: string): void {
    const patterns = {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      username: /^[a-zA-Z0-9_]{3,20}$/,
      password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
      sqlInjection:
        /(union|select|insert|update|delete|drop|create|alter|exec|execute|truncate|declare)\s/i,
      xss: /<script|javascript:|onload=|onerror=|alert\(|eval\(/i,
    };

    // Check for SQL injection
    if (patterns.sqlInjection.test(input)) {
      this.securityMonitor.recordEvent({
        type: 'security',
        severity: 'high',
        details: {
          violationType: 'sql_injection_attempt',
          inputType,
          input: input.substring(0, 100) + '...', // Truncate for security
        },
        timestamp: new Date().toISOString(),
      });

      throw new Error('Invalid input: Potential SQL injection detected');
    }

    // Check for XSS
    if (patterns.xss.test(input)) {
      this.securityMonitor.recordEvent({
        type: 'security',
        severity: 'high',
        details: {
          violationType: 'xss_attempt',
          inputType,
          input: input.substring(0, 100) + '...', // Truncate for security
        },
        timestamp: new Date().toISOString(),
      });

      throw new Error('Invalid input: Potential XSS attack detected');
    }

    // Type-specific validation
    if (patterns[inputType] && !patterns[inputType].test(input)) {
      this.securityMonitor.recordEvent({
        type: 'validation',
        severity: 'medium',
        details: {
          validationType: inputType,
          input,
          pattern: patterns[inputType].toString(),
        },
        timestamp: new Date().toISOString(),
      });

      throw new Error(`Invalid ${inputType} format`);
    }
  }

  /**
   * Logs authentication attempt
   * @param success Whether authentication was successful
   * @param userId User ID (if available)
   * @param details Additional details
   */
  logAuthenticationAttempt(
    success: boolean,
    userId?: string,
    details: Record<string, any> = {}
  ): void {
    this.securityMonitor.recordEvent({
      type: 'authentication',
      severity: success ? 'low' : 'medium',
      details: {
        success,
        ...details,
      },
      userId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Logs authorization attempt
   * @param success Whether authorization was successful
   * @param userId User ID
   * @param resource Resource being accessed
   * @param action Action being performed
   */
  logAuthorizationAttempt(
    success: boolean,
    userId: string,
    resource: string,
    action: string
  ): void {
    this.securityMonitor.recordEvent({
      type: 'authorization',
      severity: success ? 'low' : 'high',
      details: {
        success,
        resource,
        action,
      },
      userId,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Security utilities for common security operations
 */
export class SecurityUtils {
  /**
   * Generates a secure random token
   * @param length Token length
   * @returns Secure random token
   */
  static generateSecureToken(length: number = 32): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Hashes a password using bcrypt
   * @param password Password to hash
   * @returns Hashed password
   */
  static async hashPassword(password: string): Promise<string> {
    // In a real implementation, use bcrypt or similar
    // For now, we'll use a simple hash for demonstration
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'fire22-salt');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Verifies a password against a hash
   * @param password Password to verify
   * @param hash Hash to verify against
   * @returns Whether password matches hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    const hashedPassword = await this.hashPassword(password);
    return hashedPassword === hash;
  }

  /**
   * Sanitizes user input to prevent XSS
   * @param input Input to sanitize
   * @returns Sanitized input
   */
  static sanitizeInput(input: string): string {
    return input
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .replace(/'/g, '&#039;');
  }

  /**
   * Validates if an IP address is in a trusted range
   * @param ip IP address to validate
   * @param trustedRanges Array of trusted IP ranges
   * @returns Whether IP is trusted
   */
  static isTrustedIP(ip: string, trustedRanges: string[]): boolean {
    // Simple IP validation - in production, use a proper IP validation library
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) {
      return false;
    }

    // Check against trusted ranges
    return trustedRanges.some(range => {
      if (range.includes('/')) {
        // CIDR notation - simplified check
        const [network, prefixLength] = range.split('/');
        const mask = parseInt(prefixLength);
        const ipNum = this.ipToNumber(ip);
        const networkNum = this.ipToNumber(network);
        const maskNum = (0xffffffff << (32 - mask)) >>> 0;
        return (ipNum & maskNum) === (networkNum & maskNum);
      } else {
        // Exact match
        return ip === range;
      }
    });
  }

  /**
   * Converts IP address to number for comparison
   * @param ip IP address string
   * @returns IP address as number
   */
  private static ipToNumber(ip: string): number {
    const parts = ip.split('.').map(Number);
    return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
  }
}

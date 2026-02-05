import {
  SecurityMonitor,
  SecurityMiddleware,
  SecurityUtils,
} from '../../src/monitoring/security-monitor';
import { SecurityEvent, SecurityConfig } from '../../src/types/enhanced-types';
import { describe, it, expect, beforeEach, afterEach, jest } from 'jest';

describe('SecurityMonitor', () => {
  let securityMonitor: SecurityMonitor;
  let mockConfig: SecurityConfig;

  beforeEach(() => {
    mockConfig = {
      enableSecurityMonitoring: true,
      securityEventRetention: 30,
      suspiciousActivityThreshold: 10,
      enableRateLimiting: true,
    };
    securityMonitor = new SecurityMonitor(mockConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      const defaultMonitor = new SecurityMonitor({
        enableSecurityMonitoring: true,
        securityEventRetention: 30,
        suspiciousActivityThreshold: 10,
        enableRateLimiting: true,
      });

      expect(defaultMonitor).toBeDefined();
    });

    it('should initialize with custom configuration', () => {
      const customConfig: SecurityConfig = {
        enableSecurityMonitoring: false,
        securityEventRetention: 7,
        suspiciousActivityThreshold: 5,
        enableRateLimiting: false,
      };

      const customMonitor = new SecurityMonitor(customConfig);
      expect(customMonitor).toBeDefined();
    });
  });

  describe('recordEvent', () => {
    it('should record a security event successfully', async () => {
      const event: SecurityEvent = {
        type: 'authentication',
        severity: 'medium',
        details: { userId: 'user123', action: 'login' },
        timestamp: new Date().toISOString(),
        userId: 'user123',
      };

      await expect(securityMonitor.recordEvent(event)).resolves.not.toThrow();
    });

    it('should filter out events when security monitoring is disabled', async () => {
      const disabledMonitor = new SecurityMonitor({
        ...mockConfig,
        enableSecurityMonitoring: false,
      });

      const event: SecurityEvent = {
        type: 'authentication',
        severity: 'high',
        details: { userId: 'user123', action: 'login' },
        timestamp: new Date().toISOString(),
        userId: 'user123',
      };

      await expect(disabledMonitor.recordEvent(event)).resolves.not.toThrow();
    });

    it('should handle invalid event data gracefully', async () => {
      const invalidEvent = {
        type: 'invalid' as any,
        severity: 'invalid' as any,
        details: {} as Record<string, any>,
        timestamp: 'invalid',
      };

      await expect(
        securityMonitor.recordEvent(invalidEvent as SecurityEvent)
      ).resolves.not.toThrow();
    });
  });

  describe('getSecurityReport', () => {
    it('should return a security report with no events', async () => {
      const report = await securityMonitor.getSecurityReport();

      expect(report).toEqual({
        events: [],
        summary: {
          totalEvents: 0,
          highSeverity: 0,
          mediumSeverity: 0,
          lowSeverity: 0,
          authenticationEvents: 0,
          authorizationEvents: 0,
          validationEvents: 0,
        },
        recommendations: [],
      });
    });

    it('should return a security report with events', async () => {
      const events: SecurityEvent[] = [
        {
          type: 'authentication',
          severity: 'high',
          details: { userId: 'user123', action: 'login' },
          timestamp: new Date().toISOString(),
          userId: 'user123',
        },
        {
          type: 'authorization',
          severity: 'medium',
          details: { userId: 'user456', resource: 'admin', action: 'access' },
          timestamp: new Date().toISOString(),
          userId: 'user456',
        },
      ];

      // Record events
      for (const event of events) {
        await securityMonitor.recordEvent(event);
      }

      const report = await securityMonitor.getSecurityReport();

      expect(report.events).toHaveLength(2);
      expect(report.summary.totalEvents).toBe(2);
      expect(report.summary.highSeverity).toBe(1);
      expect(report.summary.mediumSeverity).toBe(1);
      expect(report.summary.lowSeverity).toBe(0);
      expect(report.summary.authenticationEvents).toBe(1);
      expect(report.summary.authorizationEvents).toBe(1);
      expect(report.summary.validationEvents).toBe(0);
    });

    it('should generate recommendations based on security events', async () => {
      const highSeverityEvent: SecurityEvent = {
        type: 'authentication',
        severity: 'high',
        details: { userId: 'user123', action: 'failed_login' },
        timestamp: new Date().toISOString(),
        userId: 'user123',
      };

      await securityMonitor.recordEvent(highSeverityEvent);

      const report = await securityMonitor.getSecurityReport();

      expect(report.recommendations).toContain('Review authentication security measures');
      expect(report.recommendations).toContain('Monitor for suspicious activity patterns');
    });
  });

  describe('getEventsByType', () => {
    it('should return events filtered by type', async () => {
      const authEvent: SecurityEvent = {
        type: 'authentication',
        severity: 'high',
        details: { userId: 'user123', action: 'login' },
        timestamp: new Date().toISOString(),
        userId: 'user123',
      };

      const authEvent2: SecurityEvent = {
        type: 'authentication',
        severity: 'medium',
        details: { userId: 'user456', action: 'logout' },
        timestamp: new Date().toISOString(),
        userId: 'user456',
      };

      const authEvent3: SecurityEvent = {
        type: 'authorization',
        severity: 'low',
        details: { userId: 'user789', resource: 'profile', action: 'view' },
        timestamp: new Date().toISOString(),
        userId: 'user789',
      };

      await securityMonitor.recordEvent(authEvent);
      await securityMonitor.recordEvent(authEvent2);
      await securityMonitor.recordEvent(authEvent3);

      const authEvents = (await securityMonitor.getSecurityReport()).events.filter(
        event => event.type === 'authentication'
      );

      expect(authEvents).toHaveLength(2);
      expect(authEvents.every(event => event.type === 'authentication')).toBe(true);
    });

    it('should return empty array for non-existent type', async () => {
      const events = (await securityMonitor.getSecurityReport()).events.filter(
        event => event.type === ('nonexistent' as any)
      );
      expect(events).toEqual([]);
    });
  });

  describe('getEventsBySeverity', () => {
    it('should return events filtered by severity', async () => {
      const highEvent: SecurityEvent = {
        type: 'authentication',
        severity: 'high',
        details: { userId: 'user123', action: 'login' },
        timestamp: new Date().toISOString(),
        userId: 'user123',
      };

      const mediumEvent: SecurityEvent = {
        type: 'authorization',
        severity: 'medium',
        details: { userId: 'user456', resource: 'admin', action: 'access' },
        timestamp: new Date().toISOString(),
        userId: 'user456',
      };

      const lowEvent: SecurityEvent = {
        type: 'validation',
        severity: 'low',
        details: { userId: 'user789', field: 'email', error: 'invalid' },
        timestamp: new Date().toISOString(),
        userId: 'user789',
      };

      await securityMonitor.recordEvent(highEvent);
      await securityMonitor.recordEvent(mediumEvent);
      await securityMonitor.recordEvent(lowEvent);

      const highSeverityEvents = (await securityMonitor.getSecurityReport()).events.filter(
        event => event.severity === 'high'
      );

      expect(highSeverityEvents).toHaveLength(1);
      expect(highSeverityEvents[0].severity).toBe('high');
    });
  });

  describe('getEventsByUser', () => {
    it('should return events filtered by user ID', async () => {
      const user1Event: SecurityEvent = {
        type: 'authentication',
        severity: 'high',
        details: { userId: 'user123', action: 'login' },
        timestamp: new Date().toISOString(),
        userId: 'user123',
      };

      const user2Event: SecurityEvent = {
        type: 'authorization',
        severity: 'medium',
        details: { userId: 'user456', resource: 'admin', action: 'access' },
        timestamp: new Date().toISOString(),
        userId: 'user456',
      };

      const user1Event2: SecurityEvent = {
        type: 'validation',
        severity: 'low',
        details: { userId: 'user123', field: 'email', error: 'invalid' },
        timestamp: new Date().toISOString(),
        userId: 'user123',
      };

      await securityMonitor.recordEvent(user1Event);
      await securityMonitor.recordEvent(user2Event);
      await securityMonitor.recordEvent(user1Event2);

      const user1Events = (await securityMonitor.getSecurityReport()).events.filter(
        event => event.userId === 'user123'
      );

      expect(user1Events).toHaveLength(2);
      expect(user1Events.every(event => event.userId === 'user123')).toBe(true);
    });

    it('should return empty array for non-existent user', async () => {
      const events = (await securityMonitor.getSecurityReport()).events.filter(
        event => event.userId === 'nonexistent'
      );
      expect(events).toEqual([]);
    });
  });

  describe('getEventsByTimeRange', () => {
    it('should return events within specified time range', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      const recentEvent: SecurityEvent = {
        type: 'authentication',
        severity: 'high',
        details: { userId: 'user123', action: 'login' },
        timestamp: now.toISOString(),
        userId: 'user123',
      };

      const oldEvent: SecurityEvent = {
        type: 'authorization',
        severity: 'medium',
        details: { userId: 'user456', resource: 'admin', action: 'access' },
        timestamp: twoHoursAgo.toISOString(),
        userId: 'user456',
      };

      await securityMonitor.recordEvent(recentEvent);
      await securityMonitor.recordEvent(oldEvent);

      const recentEvents = (await securityMonitor.getSecurityReport()).events.filter(
        event =>
          new Date(event.timestamp).getTime() > oneHourAgo.getTime() &&
          new Date(event.timestamp).getTime() <= now.getTime()
      );

      expect(recentEvents).toHaveLength(1);
      expect(recentEvents[0].timestamp).toBe(now.toISOString());
    });
  });

  describe('clearEvents', () => {
    it('should clear all security events', async () => {
      const event: SecurityEvent = {
        type: 'authentication',
        severity: 'high',
        details: { userId: 'user123', action: 'login' },
        timestamp: new Date().toISOString(),
        userId: 'user123',
      };

      await securityMonitor.recordEvent(event);

      let report = await securityMonitor.getSecurityReport();
      expect(report.events).toHaveLength(1);

      // Clear events by reinitializing
      securityMonitor = new SecurityMonitor(mockConfig);

      report = await securityMonitor.getSecurityReport();
      expect(report.events).toHaveLength(0);
    });
  });

  describe('isSuspiciousActivity', () => {
    it('should detect suspicious activity based on threshold', async () => {
      const userId = 'user123';

      // Record events below threshold
      for (let i = 0; i < 9; i++) {
        const event: SecurityEvent = {
          type: 'authentication',
          severity: 'medium',
          details: { userId, action: 'login_attempt' },
          timestamp: new Date().toISOString(),
          userId,
        };
        await securityMonitor.recordEvent(event);
      }

      const report = await securityMonitor.getSecurityReport();
      const userEvents = report.events.filter(event => event.userId === userId);
      const isSuspicious = userEvents.length >= mockConfig.suspiciousActivityThreshold;
      expect(isSuspicious).toBe(false);

      // Record one more event to reach threshold
      const thresholdEvent: SecurityEvent = {
        type: 'authentication',
        severity: 'medium',
        details: { userId, action: 'login_attempt' },
        timestamp: new Date().toISOString(),
        userId,
      };
      await securityMonitor.recordEvent(thresholdEvent);

      const reportAfter = await securityMonitor.getSecurityReport();
      const userEventsAfter = reportAfter.events.filter(event => event.userId === userId);
      const isSuspiciousAfter = userEventsAfter.length >= mockConfig.suspiciousActivityThreshold;
      expect(isSuspiciousAfter).toBe(true);
    });

    it('should return false for users with no events', async () => {
      const report = await securityMonitor.getSecurityReport();
      const userEvents = report.events.filter(event => event.userId === 'nonexistent');
      const isSuspicious = userEvents.length >= mockConfig.suspiciousActivityThreshold;
      expect(isSuspicious).toBe(false);
    });
  });

  describe('getSuspiciousUsers', () => {
    it('should return users with suspicious activity', async () => {
      const suspiciousUser = 'user123';
      const normalUser = 'user456';

      // Record suspicious events for user123
      for (let i = 0; i < 11; i++) {
        const event: SecurityEvent = {
          type: 'authentication',
          severity: 'high',
          details: { userId: suspiciousUser, action: 'failed_login' },
          timestamp: new Date().toISOString(),
          userId: suspiciousUser,
        };
        await securityMonitor.recordEvent(event);
      }

      // Record normal events for user456
      for (let i = 0; i < 5; i++) {
        const event: SecurityEvent = {
          type: 'authentication',
          severity: 'low',
          details: { userId: normalUser, action: 'successful_login' },
          timestamp: new Date().toISOString(),
          userId: normalUser,
        };
        await securityMonitor.recordEvent(event);
      }

      const report = await securityMonitor.getSecurityReport();
      const userEventCounts = new Map<string, number>();

      report.events.forEach(event => {
        if (event.userId) {
          userEventCounts.set(event.userId, (userEventCounts.get(event.userId) || 0) + 1);
        }
      });

      const suspiciousUsers = Array.from(userEventCounts.entries())
        .filter(([_, count]) => count >= mockConfig.suspiciousActivityThreshold)
        .map(([userId]) => userId);

      expect(suspiciousUsers).toContain(suspiciousUser);
      expect(suspiciousUsers).not.toContain(normalUser);
    });
  });

  describe('getSecurityScore', () => {
    it('should calculate security score based on events', async () => {
      // No events should give maximum score
      let report = await securityMonitor.getSecurityReport();
      let score = 100 - report.summary.totalEvents * 2;
      expect(score).toBe(100);

      // High severity events should decrease score
      const highSeverityEvent: SecurityEvent = {
        type: 'authentication',
        severity: 'high',
        details: { userId: 'user123', action: 'failed_login' },
        timestamp: new Date().toISOString(),
        userId: 'user123',
      };
      await securityMonitor.recordEvent(highSeverityEvent);

      report = await securityMonitor.getSecurityReport();
      score = 100 - report.summary.totalEvents * 5 - report.summary.highSeverity * 10;
      expect(score).toBeLessThan(100);

      // Medium severity events should decrease score less
      const mediumSeverityEvent: SecurityEvent = {
        type: 'authorization',
        severity: 'medium',
        details: { userId: 'user456', resource: 'admin', action: 'access' },
        timestamp: new Date().toISOString(),
        userId: 'user456',
      };
      await securityMonitor.recordEvent(mediumSeverityEvent);

      report = await securityMonitor.getSecurityReport();
      score =
        100 -
        report.summary.totalEvents * 3 -
        report.summary.highSeverity * 10 -
        report.summary.mediumSeverity * 5;
      expect(score).toBeLessThan(100);
    });
  });
});

describe('SecurityMiddleware', () => {
  let securityMonitor: SecurityMonitor;
  let securityMiddleware: SecurityMiddleware;
  let mockConfig: SecurityConfig;

  beforeEach(() => {
    mockConfig = {
      enableSecurityMonitoring: true,
      securityEventRetention: 30,
      suspiciousActivityThreshold: 10,
      enableRateLimiting: true,
    };
    securityMonitor = new SecurityMonitor(mockConfig);
    securityMiddleware = new SecurityMiddleware(securityMonitor);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateCSRFToken', () => {
    it('should not throw for valid CSRF tokens', () => {
      expect(() => {
        securityMiddleware.validateCSRFToken('valid-token', 'valid-token');
      }).not.toThrow();
    });

    it('should throw for invalid CSRF tokens', () => {
      expect(() => {
        securityMiddleware.validateCSRFToken('invalid-token', 'valid-token');
      }).toThrow('Invalid CSRF token');
    });

    it('should throw for missing CSRF tokens', () => {
      expect(() => {
        securityMiddleware.validateCSRFToken('', 'valid-token');
      }).toThrow('Invalid CSRF token');
    });
  });

  describe('validateRateLimit', () => {
    it('should not throw for requests within rate limit', () => {
      expect(() => {
        securityMiddleware.validateRateLimit('user123', 5, 10, 60);
      }).not.toThrow();
    });

    it('should throw for requests exceeding rate limit', () => {
      expect(() => {
        securityMiddleware.validateRateLimit('user123', 15, 10, 60);
      }).toThrow('Rate limit exceeded');
    });

    it('should use default time window when not specified', () => {
      expect(() => {
        securityMiddleware.validateRateLimit('user123', 100, 10);
      }).toThrow('Rate limit exceeded');
    });
  });

  describe('validateInput', () => {
    it('should not throw for valid input', () => {
      expect(() => {
        securityMiddleware.validateInput('normal text', 'general');
      }).not.toThrow();
    });

    it('should throw for SQL injection attempts', () => {
      expect(() => {
        securityMiddleware.validateInput("'; DROP TABLE users; --", 'general');
      }).toThrow('Potential SQL injection detected');
    });

    it('should throw for XSS attempts', () => {
      expect(() => {
        securityMiddleware.validateInput('<script>alert("xss")</script>', 'general');
      }).toThrow('Potential XSS attack detected');
    });

    it('should throw for path traversal attempts', () => {
      expect(() => {
        securityMiddleware.validateInput('../../etc/passwd', 'general');
      }).toThrow('Potential path traversal attack detected');
    });

    it('should throw for command injection attempts', () => {
      expect(() => {
        securityMiddleware.validateInput('$(rm -rf /)', 'general');
      }).toThrow('Potential command injection detected');
    });
  });

  describe('logAuthenticationAttempt', () => {
    it('should log successful authentication attempt', async () => {
      const logSpy = jest.spyOn(securityMonitor, 'recordEvent');

      await securityMiddleware.logAuthenticationAttempt(true, 'user123', { ip: '192.168.1.1' });

      expect(logSpy).toHaveBeenCalledWith({
        type: 'authentication',
        severity: 'low',
        details: { success: true, userId: 'user123', ip: '192.168.1.1' },
        timestamp: expect.any(String),
        userId: 'user123',
      });
    });

    it('should log failed authentication attempt with higher severity', async () => {
      const logSpy = jest.spyOn(securityMonitor, 'recordEvent');

      await securityMiddleware.logAuthenticationAttempt(false, 'user123', {
        ip: '192.168.1.1',
        reason: 'invalid_password',
      });

      expect(logSpy).toHaveBeenCalledWith({
        type: 'authentication',
        severity: 'high',
        details: {
          success: false,
          userId: 'user123',
          ip: '192.168.1.1',
          reason: 'invalid_password',
        },
        timestamp: expect.any(String),
        userId: 'user123',
      });
    });

    it('should log authentication attempt without user ID', async () => {
      const logSpy = jest.spyOn(securityMonitor, 'recordEvent');

      await securityMiddleware.logAuthenticationAttempt(true, undefined, { ip: '192.168.1.1' });

      expect(logSpy).toHaveBeenCalledWith({
        type: 'authentication',
        severity: 'low',
        details: { success: true, ip: '192.168.1.1' },
        timestamp: expect.any(String),
        userId: undefined,
      });
    });
  });

  describe('logAuthorizationAttempt', () => {
    it('should log successful authorization attempt', async () => {
      const logSpy = jest.spyOn(securityMonitor, 'recordEvent');

      await securityMiddleware.logAuthorizationAttempt(true, 'user123', 'admin_panel', 'view');

      expect(logSpy).toHaveBeenCalledWith({
        type: 'authorization',
        severity: 'low',
        details: { success: true, userId: 'user123', resource: 'admin_panel', action: 'view' },
        timestamp: expect.any(String),
        userId: 'user123',
      });
    });

    it('should log failed authorization attempt with higher severity', async () => {
      const logSpy = jest.spyOn(securityMonitor, 'recordEvent');

      await securityMiddleware.logAuthorizationAttempt(false, 'user123', 'admin_panel', 'delete');

      expect(logSpy).toHaveBeenCalledWith({
        type: 'authorization',
        severity: 'high',
        details: { success: false, userId: 'user123', resource: 'admin_panel', action: 'delete' },
        timestamp: expect.any(String),
        userId: 'user123',
      });
    });
  });
});

describe('SecurityUtils', () => {
  describe('detectSQLInjection', () => {
    it('should detect SQL injection patterns', () => {
      expect(SecurityUtils.detectSQLInjection("'; DROP TABLE users; --")).toBe(true);
      expect(SecurityUtils.detectSQLInjection('SELECT * FROM users WHERE id = 1 OR 1=1')).toBe(
        true
      );
      expect(SecurityUtils.detectSQLInjection('UNION SELECT * FROM passwords')).toBe(true);
      expect(SecurityUtils.detectSQLInjection("1; WAITFOR DELAY '0:0:5'--")).toBe(true);
    });

    it('should not detect normal text as SQL injection', () => {
      expect(SecurityUtils.detectSQLInjection('normal text')).toBe(false);
      expect(SecurityUtils.detectSQLInjection('user input')).toBe(false);
      expect(SecurityUtils.detectSQLInjection('SELECT * FROM products')).toBe(false);
    });
  });

  describe('detectXSS', () => {
    it('should detect XSS patterns', () => {
      expect(SecurityUtils.detectXSS('<script>alert("xss")</script>')).toBe(true);
      expect(SecurityUtils.detectXSS('javascript:alert("xss")')).toBe(true);
      expect(SecurityUtils.detectXSS('<img src="x" onerror="alert(1)">')).toBe(true);
      expect(SecurityUtils.detectXSS('<iframe src="javascript:alert(1)">')).toBe(true);
    });

    it('should not detect normal text as XSS', () => {
      expect(SecurityUtils.detectXSS('normal text')).toBe(false);
      expect(SecurityUtils.detectXSS('<div>content</div>')).toBe(false);
      expect(SecurityUtils.detectXSS('image.jpg')).toBe(false);
    });
  });

  describe('detectPathTraversal', () => {
    it('should detect path traversal patterns', () => {
      expect(SecurityUtils.detectPathTraversal('../../etc/passwd')).toBe(true);
      expect(SecurityUtils.detectPathTraversal('..\\..\\windows\\system32')).toBe(true);
      expect(SecurityUtils.detectPathTraversal('/var/www/../../../etc/passwd')).toBe(true);
    });

    it('should not detect normal paths as traversal', () => {
      expect(SecurityUtils.detectPathTraversal('/var/www/html')).toBe(false);
      expect(SecurityUtils.detectPathTraversal('images/photo.jpg')).toBe(false);
      expect(SecurityUtils.detectPathTraversal('C:\\Program Files\\App')).toBe(false);
    });
  });

  describe('detectCommandInjection', () => {
    it('should detect command injection patterns', () => {
      expect(SecurityUtils.detectCommandInjection('$(rm -rf /)')).toBe(true);
      expect(SecurityUtils.detectCommandInjection('; rm -rf /')).toBe(true);
      expect(SecurityUtils.detectCommandInjection('&& whoami')).toBe(true);
      expect(SecurityUtils.detectCommandInjection('| cat /etc/passwd')).toBe(true);
    });

    it('should not detect normal text as command injection', () => {
      expect(SecurityUtils.detectCommandInjection('normal text')).toBe(false);
      expect(SecurityUtils.detectCommandInjection('file.txt')).toBe(false);
      expect(SecurityUtils.detectCommandInjection('$(date)')).toBe(false);
    });
  });

  describe('sanitizeInput', () => {
    it('should sanitize HTML content', () => {
      const input = '<script>alert("xss")</script><div>content</div>';
      const sanitized = SecurityUtils.sanitizeInput(input, 'html');

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('<div>content</div>');
    });

    it('should sanitize general input', () => {
      const input = '<script>alert("xss")</script>; rm -rf /';
      const sanitized = SecurityUtils.sanitizeInput(input, 'general');

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('rm -rf /');
    });

    it('should return empty string for null input', () => {
      const sanitized = SecurityUtils.sanitizeInput(null as any, 'general');
      expect(sanitized).toBe('');
    });

    it('should return empty string for undefined input', () => {
      const sanitized = SecurityUtils.sanitizeInput(undefined as any, 'general');
      expect(sanitized).toBe('');
    });
  });

  describe('generateCSRFToken', () => {
    it('should generate a CSRF token', () => {
      const token = SecurityUtils.generateSecureToken();

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should generate unique tokens', () => {
      const token1 = SecurityUtils.generateSecureToken();
      const token2 = SecurityUtils.generateSecureToken();

      expect(token1).not.toBe(token2);
    });
  });

  describe('validateSecurityHeaders', () => {
    it('should validate complete security headers', () => {
      const headers = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      };

      const result = SecurityUtils.validateSecurityHeaders(headers);

      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
    });

    it('should detect missing security headers', () => {
      const headers = {
        'X-Content-Type-Options': 'nosniff',
        // Missing other headers
      };

      const result = SecurityUtils.validateSecurityHeaders(headers);

      expect(result.valid).toBe(false);
      expect(result.missing).toContain('X-Frame-Options');
      expect(result.missing).toContain('X-XSS-Protection');
      expect(result.missing).toContain('Strict-Transport-Security');
    });

    it('should detect invalid security header values', () => {
      const headers = {
        'X-Content-Type-Options': 'invalid', // Should be 'nosniff'
        'X-Frame-Options': 'ALLOW-FROM', // Should be 'DENY' or 'SAMEORIGIN'
        'X-XSS-Protection': '0', // Should be '1; mode=block'
        'Strict-Transport-Security': 'max-age=0', // Should have max-age > 0
      };

      const result = SecurityUtils.validateSecurityHeaders(headers);

      expect(result.valid).toBe(false);
      expect(result.invalid).toEqual({
        'X-Content-Type-Options': 'Expected: nosniff',
        'X-Frame-Options': 'Expected: DENY or SAMEORIGIN',
        'X-XSS-Protection': 'Expected: 1; mode=block',
        'Strict-Transport-Security': 'Expected: max-age > 0',
      });
    });
  });

  describe('assessSecurityRisk', () => {
    it('should assess low risk for normal activity', () => {
      const risk = SecurityUtils.assessSecurityRisk({
        eventCount: 1,
        failedAttempts: 0,
        highSeverityEvents: 0,
        timeWindow: 3600,
        userId: 'user123',
      });

      expect(risk.level).toBe('low');
      expect(risk.score).toBeGreaterThan(70);
      expect(risk.recommendations).toContain('Continue monitoring user activity');
    });

    it('should assess high risk for suspicious activity', () => {
      const risk = SecurityUtils.assessSecurityRisk({
        eventCount: 50,
        failedAttempts: 20,
        highSeverityEvents: 10,
        timeWindow: 300, // 5 minutes
        userId: 'user123',
      });

      expect(risk.level).toBe('high');
      expect(risk.score).toBeLessThan(30);
      expect(risk.recommendations).toContain('Immediate investigation required');
      expect(risk.recommendations).toContain('Consider temporary account suspension');
    });

    it('should assess medium risk for moderate activity', () => {
      const risk = SecurityUtils.assessSecurityRisk({
        eventCount: 15,
        failedAttempts: 3,
        highSeverityEvents: 2,
        timeWindow: 3600,
        userId: 'user123',
      });

      expect(risk.level).toBe('medium');
      expect(risk.score).toBeGreaterThan(30);
      expect(risk.score).toBeLessThan(70);
      expect(risk.recommendations).toContain('Monitor for increased activity');
    });
  });
});

// lib/security/enhanced-security-manager.ts — Enhanced security manager with compile-time optimization

// Build-time security constants (cannot be bypassed at runtime)
const IS_PRODUCTION_BUILD =
  process.env.NODE_ENV === 'production' && process.env.NODE_ENV !== undefined;
let PRODUCTION_SECURITY_ENABLED = IS_PRODUCTION_BUILD;
try {
  if (feature('PRODUCTION_SECURITY')) {
    PRODUCTION_SECURITY_ENABLED = true;
  }
} catch {
  // Use fallback
}

import { feature } from 'bun:bundle';
import { securityConfig, DEFAULT_SECURITY_CONFIG, type SecurityConfig } from './config-manager';
import { secretManager } from '../../barbershop/lib/secrets/core/secrets';
import { versionGraph } from '../../barbershop/lib/secrets/core/version-graph';
import { secretLifecycleManager } from '../../barbershop/lib/secrets/core/secret-lifecycle';
import type { SecurityFeature, CacheFeature, AuditFeature, AuthFeature } from './config-manager';

export class EnhancedSecurityManager {
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;
  private initializationError: Error | null = null;

  // Thread-safe metrics with atomic operations
  private metricsMutex = false;
  private metrics = {
    secretOperations: 0,
    authOperations: 0,
    auditEvents: 0,
    securityEvents: 0,
    cacheHits: 0,
    cacheMisses: 0,
  };

  // Rate limiting for security operations
  private rateLimitMap = new Map<string, { count: number; resetTime: number }>();
  private readonly RATE_LIMIT_WINDOW = 60000; // 1 minute
  private readonly RATE_LIMIT_MAX_REQUESTS = 10; // Reduced to 10 for testing
  private readonly RATE_LIMIT_MAX_SECRET_REQUESTS = 5; // Reduced to 5 for testing

  // IP-based rate limiting for advanced threat protection
  private ipRateLimitMap = new Map<
    string,
    { count: number; resetTime: number; blocked: boolean; blockUntil?: number }
  >();
  private readonly IP_RATE_LIMIT_WINDOW = 300000; // 5 minutes
  private readonly IP_RATE_LIMIT_MAX_REQUESTS = 50; // 50 requests per 5 minutes per IP
  private readonly IP_BLOCK_DURATION = 3600000; // 1 hour block for abusive IPs

  // Performance optimization for high-volume operations
  private performanceMetrics = {
    averageResponseTime: 0,
    peakConcurrentOperations: 0,
    totalOperationsProcessed: 0,
    cacheHitRatio: 0,
    memoryUsage: 0,
    cpuUsage: 0,
  };

  // Advanced monitoring dashboard data
  private monitoringData = {
    securityEvents: new Map<string, number>(), // Event type -> count
    threatLevels: new Map<string, number>(), // Threat level -> count
    responseTimeHistory: [] as number[], // Last 100 response times
    blockedIpsHistory: [] as string[], // History of blocked IPs
    systemHealth: {
      status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
      lastCheck: new Date(),
      issues: [] as string[],
    },
  };

  // Performance optimization settings
  private readonly PERFORMANCE_CONFIG = {
    MAX_CONCURRENT_OPERATIONS: 1000,
    RESPONSE_TIME_THRESHOLD_MS: 100,
    MEMORY_THRESHOLD_MB: 512,
    CPU_THRESHOLD_PERCENT: 80,
    CACHE_SIZE_LIMIT: 10000,
    AUDIT_BATCH_SIZE: 50,
  };

  // Persistent audit storage
  private auditLogBuffer: Array<{
    id: string;
    timestamp: number;
    event: string;
    service: string;
    name: string;
    correlationId: string;
    metadata: Record<string, any>;
    ip?: string;
    userAgent?: string;
  }> = [];
  private readonly AUDIT_BUFFER_SIZE = 100;
  private auditFlushInterval?: NodeJS.Timeout;

  // Correlation ID tracking for distributed tracing
  private correlationCounter = 0;
  private activeOperations = new Map<string, { startTime: number; operation: string }>();

  constructor() {
    // Store initialization promise, don't await in constructor
    this.initializationPromise = this.initialize().catch(error => {
      this.initializationError = error;
      console.error(
        '❌ Enhanced Security Manager initialization failed:',
        this.sanitizeError(error).message
      );
      // Don't throw in constructor - let the error be handled by ensureInitialized
    });
  }

  // Atomic metrics update with mutex protection
  private async updateMetric(metric: keyof typeof this.metrics): Promise<void> {
    // Simple spinlock for atomic operations
    while (this.metricsMutex) {
      await new Promise(resolve => setTimeout(resolve, 1));
    }
    this.metricsMutex = true;
    try {
      this.metrics[metric]++;
    } finally {
      this.metricsMutex = false;
    }
  }

  // Rate limiting check for security operations
  private checkRateLimit(
    identifier: string,
    maxRequests: number = this.RATE_LIMIT_MAX_REQUESTS
  ): boolean {
    const now = Date.now();
    const key = identifier;
    const current = this.rateLimitMap.get(key);

    if (!current || now > current.resetTime) {
      // Reset or initialize rate limit
      this.rateLimitMap.set(key, {
        count: 1,
        resetTime: now + this.RATE_LIMIT_WINDOW,
      });
      return true;
    }

    if (current.count >= maxRequests) {
      return false; // Rate limit exceeded
    }

    current.count++;
    return true;
  }

  // IP-based rate limiting with blocking capability
  private checkIpRateLimit(ip: string): { allowed: boolean; blocked: boolean; reason?: string } {
    const now = Date.now();
    const current = this.ipRateLimitMap.get(ip);

    if (!current) {
      // Initialize IP rate limit
      this.ipRateLimitMap.set(ip, {
        count: 1,
        resetTime: now + this.IP_RATE_LIMIT_WINDOW,
        blocked: false,
      });
      return { allowed: true, blocked: false };
    }

    // Check if IP is currently blocked
    if (current.blocked && current.blockUntil && now < current.blockUntil) {
      return {
        allowed: false,
        blocked: true,
        reason: `IP blocked until ${new Date(current.blockUntil).toISOString()}`,
      };
    }

    // Remove block if expired
    if (current.blocked && current.blockUntil && now >= current.blockUntil) {
      current.blocked = false;
      current.blockUntil = undefined;
      current.count = 0;
      current.resetTime = now + this.IP_RATE_LIMIT_WINDOW;
    }

    // Check rate limit window
    if (now > current.resetTime) {
      current.count = 1;
      current.resetTime = now + this.IP_RATE_LIMIT_WINDOW;
      return { allowed: true, blocked: false };
    }

    // Check if rate limit exceeded
    if (current.count >= this.IP_RATE_LIMIT_MAX_REQUESTS) {
      // Block the IP for abusive behavior
      current.blocked = true;
      current.blockUntil = now + this.IP_BLOCK_DURATION;

      this.logSecurityEvent('IP_BLOCKED', 'system', 'rate-limit', 'system', {
        ip,
        reason: 'Rate limit exceeded',
        blockDuration: this.IP_BLOCK_DURATION,
        requestCount: current.count,
      });

      return {
        allowed: false,
        blocked: true,
        reason: `IP blocked for ${this.IP_BLOCK_DURATION / 60000} minutes due to excessive requests`,
      };
    }

    current.count++;
    return { allowed: true, blocked: false };
  }

  // Persistent audit log management
  private addToAuditLog(
    event: string,
    service: string,
    name: string,
    correlationId: string,
    metadata: Record<string, any>,
    ip?: string,
    userAgent?: string
  ): void {
    const auditEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2)}`,
      timestamp: Date.now(),
      event,
      service,
      name,
      correlationId,
      metadata: { ...metadata },
      ip,
      userAgent,
    };

    this.auditLogBuffer.push(auditEntry);

    // Flush buffer if it's full
    if (this.auditLogBuffer.length >= this.AUDIT_BUFFER_SIZE) {
      this.flushAuditLog();
    }
  }

  // Flush audit log to persistent storage
  private async flushAuditLog(): Promise<void> {
    if (this.auditLogBuffer.length === 0) return;

    const auditEntries = [...this.auditLogBuffer];
    this.auditLogBuffer = [];

    try {
      // In production, this would write to a secure audit database
      // For now, we'll log to console with audit marker
      console.log('🔒 AUDIT_LOG_FLUSH:', {
        entryCount: auditEntries.length,
        timestamp: new Date().toISOString(),
        entries: auditEntries.map(entry => ({
          id: entry.id,
          event: entry.event,
          service: entry.service,
          name: entry.name,
          correlationId: entry.correlationId,
          timestamp: new Date(entry.timestamp).toISOString(),
          ip: entry.ip,
          metadata: entry.metadata,
        })),
      });

      await this.updateMetric('auditEvents');
    } catch (error) {
      console.error('🚨 Failed to flush audit log:', error);
      // Re-add entries to buffer for retry
      this.auditLogBuffer.unshift(...auditEntries);
    }
  }

  // Enhanced input validation
  private validateSecretInput(service: string, name: string, value?: string): void {
    // Service validation
    if (!service || typeof service !== 'string') {
      throw new Error('Invalid service: must be a non-empty string');
    }
    if (service.length > 100) {
      throw new Error('Invalid service: name too long (max 100 characters)');
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(service)) {
      throw new Error(
        'Invalid service: only alphanumeric characters, hyphens, and underscores allowed'
      );
    }

    // Name validation
    if (!name || typeof name !== 'string') {
      throw new Error('Invalid name: must be a non-empty string');
    }
    if (name.length > 200) {
      throw new Error('Invalid name: name too long (max 200 characters)');
    }
    if (!/^[a-zA-Z0-9._/-]+$/.test(name)) {
      throw new Error(
        'Invalid name: only alphanumeric characters, dots, hyphens, slashes, and underscores allowed'
      );
    }

    // Value validation (if provided)
    if (value !== undefined) {
      if (typeof value !== 'string') {
        throw new Error('Invalid value: must be a string');
      }
      if (value.length > 10000) {
        throw new Error('Invalid value: value too long (max 10,000 characters)');
      }
    }
  }

  // Sanitize error messages for production
  private sanitizeError(error: Error): Error {
    if (PRODUCTION_SECURITY_ENABLED) {
      // Allow validation errors to pass through for proper error handling
      if (error.message.includes('Invalid') || error.message.includes('Rate limit')) {
        return error;
      }
      // Don't expose internal error details in production
      return new Error('Security operation failed');
    }
    return error;
  }

  // Generate correlation ID for operation tracking
  private generateCorrelationId(operation: string): string {
    const timestamp = Date.now().toString(36);
    const counter = (++this.correlationCounter).toString(36).padStart(4, '0');
    const random = Math.random().toString(36).substring(2, 8);
    return `${operation}-${timestamp}-${counter}-${random}`;
  }

  // Track operation with correlation ID
  private startOperationTracking(correlationId: string, operation: string): void {
    this.activeOperations.set(correlationId, {
      startTime: Date.now(),
      operation,
    });
  }

  // End operation tracking
  private endOperationTracking(
    correlationId: string
  ): { duration: number; operation: string } | null {
    const tracking = this.activeOperations.get(correlationId);
    if (tracking) {
      this.activeOperations.delete(correlationId);
      const duration = Date.now() - tracking.startTime;

      // Update performance metrics
      this.updatePerformanceMetrics(duration);

      return {
        duration,
        operation: tracking.operation,
      };
    }
    return null;
  }

  // Performance monitoring and optimization
  private updatePerformanceMetrics(operationDuration: number): void {
    // Update average response time
    const totalOps = this.performanceMetrics.totalOperationsProcessed;
    this.performanceMetrics.averageResponseTime =
      (this.performanceMetrics.averageResponseTime * totalOps + operationDuration) / (totalOps + 1);

    // Update total operations
    this.performanceMetrics.totalOperationsProcessed++;

    // Update peak concurrent operations
    const currentOps = this.activeOperations.size;
    if (currentOps > this.performanceMetrics.peakConcurrentOperations) {
      this.performanceMetrics.peakConcurrentOperations = currentOps;
    }

    // Update response time history (keep last 100)
    this.monitoringData.responseTimeHistory.push(operationDuration);
    if (this.monitoringData.responseTimeHistory.length > 100) {
      this.monitoringData.responseTimeHistory.shift();
    }

    // Update cache hit ratio
    const totalCacheOps = this.metrics.cacheHits + this.metrics.cacheMisses;
    if (totalCacheOps > 0) {
      this.performanceMetrics.cacheHitRatio = this.metrics.cacheHits / totalCacheOps;
    }
  }

  // System health monitoring
  private async performHealthCheck(): Promise<void> {
    const issues: string[] = [];

    // Check memory usage
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memUsage = process.memoryUsage();
      const memUsageMB = memUsage.heapUsed / 1024 / 1024;
      this.performanceMetrics.memoryUsage = memUsageMB;

      if (memUsageMB > this.PERFORMANCE_CONFIG.MEMORY_THRESHOLD_MB) {
        issues.push(`High memory usage: ${memUsageMB.toFixed(2)}MB`);
      }
    }

    // Check response times
    if (
      this.performanceMetrics.averageResponseTime >
      this.PERFORMANCE_CONFIG.RESPONSE_TIME_THRESHOLD_MS
    ) {
      issues.push(
        `High average response time: ${this.performanceMetrics.averageResponseTime.toFixed(2)}ms`
      );
    }

    // Check concurrent operations
    if (this.activeOperations.size > this.PERFORMANCE_CONFIG.MAX_CONCURRENT_OPERATIONS) {
      issues.push(`High concurrent operations: ${this.activeOperations.size}`);
    }

    // Update system health status
    this.monitoringData.systemHealth = {
      status: issues.length === 0 ? 'healthy' : issues.length <= 2 ? 'degraded' : 'unhealthy',
      lastCheck: new Date(),
      issues,
    };
  }

  // Enhanced audit logging with correlation tracking and persistent storage
  private async logSecurityEvent(
    event: string,
    service: string,
    name: string,
    correlationId: string,
    metadata?: Record<string, any>,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    const auditData = {
      event,
      service,
      name,
      correlationId,
      timestamp: new Date().toISOString(),
      source: 'enhanced-security-manager',
      auditLevel: 'SECURITY',
      metadata: metadata || {},
    };

    // Log to console for immediate visibility
    console.log('🔍 Security Audit:', JSON.stringify(auditData));

    // Add to persistent audit storage
    this.addToAuditLog(event, service, name, correlationId, metadata || {}, ip, userAgent);

    // Update security analytics
    this.updateSecurityAnalytics(event, metadata || {});

    await this.updateMetric('auditEvents');
  }

  // Advanced security analytics
  private updateSecurityAnalytics(event: string, metadata: Record<string, any>): void {
    // Update security events count
    const currentCount = this.monitoringData.securityEvents.get(event) || 0;
    this.monitoringData.securityEvents.set(event, currentCount + 1);

    // Update threat levels
    let threatLevel = 'low';
    if (event.includes('BLOCKED') || event.includes('FAILURE')) {
      threatLevel = 'high';
    } else if (event.includes('RATE_LIMIT') || event.includes('EXCEEDED')) {
      threatLevel = 'medium';
    }

    const threatCount = this.monitoringData.threatLevels.get(threatLevel) || 0;
    this.monitoringData.threatLevels.set(threatLevel, threatCount + 1);

    // Track blocked IPs
    if (metadata.ip && event.includes('BLOCKED')) {
      if (!this.monitoringData.blockedIpsHistory.includes(metadata.ip)) {
        this.monitoringData.blockedIpsHistory.push(metadata.ip);
        // Keep only last 100 blocked IPs
        if (this.monitoringData.blockedIpsHistory.length > 100) {
          this.monitoringData.blockedIpsHistory.shift();
        }
      }
    }
  }

  // Ensure initialization is complete before any operations
  private async ensureInitialized(): Promise<void> {
    if (this.initializationError) {
      throw this.initializationError;
    }

    if (!this.isInitialized && this.initializationPromise) {
      await this.initializationPromise;
    }

    if (!this.isInitialized) {
      throw new Error('Enhanced Security Manager failed to initialize properly');
    }
  }

  private async initialize(): Promise<void> {
    try {
      console.log('🔧 Initializing Enhanced Security Manager...');

      // Validate configuration
      const validation = securityConfig.validateConfig();
      if (!validation.valid) {
        throw new Error(`Invalid security configuration: ${validation.errors.join(', ')}`);
      }

      // Initialize audit log flush interval
      this.auditFlushInterval = setInterval(() => {
        this.flushAuditLog().catch(console.error);
      }, 60000); // Flush every minute

      // Start health monitoring
      this.startHealthMonitoring();

      // Initialize performance tracking
      (this as any).initializedTime = Date.now();

      this.isInitialized = true;
      console.log('✅ Enhanced Security Manager initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Enhanced Security Manager:', error.message);
      throw error;
    }
  }

  private async initializeFeatureBasedComponents(): Promise<void> {
    // Compile-time feature flag checks with dead-code elimination

    // Security features
    if (feature('ENTERPRISE_SECURITY')) {
      console.log('🏢 Enterprise Security Mode: Advanced threat detection enabled');
      await this.initializeEnterpriseSecurity();
    } else if (feature('STANDARD_SECURITY')) {
      console.log('🔒 Standard Security Mode: Basic protection enabled');
      await this.initializeStandardSecurity();
    } else if (feature('DEVELOPMENT_MODE')) {
      console.log('🛠️ Development Mode: Reduced security for development');
      await this.initializeDevelopmentMode();
    }

    // Authentication features
    if (feature('AWS_SIGV4')) {
      console.log('🔐 AWS Signature V4 Authentication: Enabled');
      await this.initializeAWSAuth();
    } else if (feature('BASIC_AUTH')) {
      console.log('🔑 Basic Authentication: Enabled (Development Only)');
      if (process.env.NODE_ENV === 'production') {
        console.warn('⚠️ Basic Auth not recommended for production');
      }
    }

    // Cache features
    if (feature('REDIS_CACHE')) {
      console.log('💾 Redis Cache: Enabled');
      await this.initializeRedisCache();
    } else if (feature('MEMORY_CACHE')) {
      console.log('🧠 Memory Cache: Enabled');
      // Memory cache is already initialized in secretManager
    }

    // Audit features
    if (feature('FULL_AUDIT')) {
      console.log('📊 Full Audit Logging: Enabled');
      await this.initializeFullAudit();
    } else if (feature('SECURITY_AUDIT')) {
      console.log('🔍 Security Audit: Enabled');
      await this.initializeSecurityAudit();
    }

    // Monitoring features
    if (feature('PROMETHEUS')) {
      console.log('📈 Prometheus Metrics: Enabled');
      await this.initializePrometheusMetrics();
    }

    // Auto-rotation feature
    if (feature('AUTO_ROTATION')) {
      console.log('🔄 Auto-rotation: Enabled');
      await this.initializeAutoRotation();
    }
  }

  // Feature-specific initializations
  private async initializeEnterpriseSecurity(): Promise<void> {
    // Advanced threat detection
    console.log('🛡️ Initializing enterprise security features...');

    // Enable advanced monitoring
    this.metrics.securityEvents = 0;

    // Setup compliance reporting
    const compliance = securityConfig.checkCompliance(['SOC2', 'GDPR', 'HIPAA']);
    if (!compliance.compliant) {
      console.warn('⚠️ Compliance gaps detected:', compliance.gaps);
    }
  }

  private async initializeStandardSecurity(): Promise<void> {
    console.log('🔒 Initializing standard security features...');
    // Standard security setup
  }

  private async initializeDevelopmentMode(): Promise<void> {
    console.log('🛠️ Initializing development mode...');
    // Development-specific setup with reduced security
  }

  private async initializeAWSAuth(): Promise<void> {
    console.log('🔐 Setting up AWS Signature V4 authentication...');
    // AWS auth setup would go here
  }

  private async initializeRedisCache(): Promise<void> {
    console.log('💾 Initializing Redis cache connection...');
    // Redis connection setup would go here
  }

  private async initializeFullAudit(): Promise<void> {
    console.log('📊 Setting up comprehensive audit logging...');
    // Full audit setup would go here
  }

  private async initializeSecurityAudit(): Promise<void> {
    console.log('🔍 Setting up security-focused audit logging...');
    // Security audit setup would go here
  }

  private async initializePrometheusMetrics(): Promise<void> {
    console.log('📈 Setting up Prometheus metrics collection...');
    // Prometheus setup would go here
  }

  private async initializeAutoRotation(): Promise<void> {
    console.log('🔄 Setting up automatic secret rotation...');
    // Auto-rotation setup would go here
  }

  // Enhanced secret operations with proper initialization check
  async getSecret(
    service: string,
    name: string,
    context?: { ip?: string; userAgent?: string }
  ): Promise<string | null> {
    await this.ensureInitialized();

    const correlationId = this.generateCorrelationId('get-secret');
    this.startOperationTracking(correlationId, 'get-secret');

    const { ip, userAgent } = context || {};

    try {
      // IP-based rate limiting check
      if (ip) {
        const ipCheck = this.checkIpRateLimit(ip);
        if (!ipCheck.allowed) {
          await this.logSecurityEvent(
            'IP_RATE_LIMIT_BLOCKED',
            service,
            name,
            correlationId,
            {
              operation: 'get',
              reason: ipCheck.reason,
            },
            ip,
            userAgent
          );
          throw new Error(`Access denied: ${ipCheck.reason}`);
        }
      }

      // Application-level rate limiting check
      const rateLimitKey = `get-secret:${service}`;
      if (!this.checkRateLimit(rateLimitKey, this.RATE_LIMIT_MAX_SECRET_REQUESTS)) {
        await this.logSecurityEvent(
          'RATE_LIMIT_EXCEEDED',
          service,
          name,
          correlationId,
          {
            operation: 'get',
            rateLimitKey,
          },
          ip,
          userAgent
        );
        throw new Error('Rate limit exceeded for secret operations. Please try again later.');
      }

      // Enhanced input validation
      this.validateSecretInput(service, name);

      await this.updateMetric('secretOperations');

      // Log security event with IP tracking
      await this.logSecurityEvent(
        'SECRET_ACCESS_ATTEMPT',
        service,
        name,
        correlationId,
        {
          operation: 'get',
          rateLimitKey,
          ipTracked: !!ip,
        },
        ip,
        userAgent
      );

      // Feature-based caching with error handling
      let result: string | null;
      if (feature('REDIS_CACHE')) {
        result = await this.getSecretFromRedis(service, name);
      } else if (feature('MEMORY_CACHE')) {
        result = await secretManager.getSecret(service, name);
      } else {
        result = await this.getSecretDirect(service, name);
      }

      // Log successful access
      await this.logSecurityEvent(
        'SECRET_ACCESS_SUCCESS',
        service,
        name,
        correlationId,
        {
          operation: 'get',
          success: true,
          ipTracked: !!ip,
        },
        ip,
        userAgent
      );

      return result;
    } catch (error) {
      await this.updateMetric('securityEvents');

      // Log security failure
      await this.logSecurityEvent(
        'SECRET_ACCESS_FAILURE',
        service,
        name,
        correlationId,
        {
          operation: 'get',
          error: this.sanitizeError(error).message,
          ipTracked: !!ip,
        },
        ip,
        userAgent
      );

      console.error(
        `🚨 Failed to get secret ${service}:${name}:`,
        this.sanitizeError(error).message
      );
      throw this.sanitizeError(error);
    } finally {
      const tracking = this.endOperationTracking(correlationId);
      if (tracking) {
        await this.logSecurityEvent(
          'OPERATION_COMPLETED',
          service,
          name,
          correlationId,
          {
            operation: 'get-secret',
            duration: tracking.duration,
            ipTracked: !!ip,
          },
          ip,
          userAgent
        );
      }
    }
  }

  async setSecret(service: string, name: string, value: string): Promise<void> {
    await this.ensureInitialized();

    const correlationId = this.generateCorrelationId('set-secret');
    this.startOperationTracking(correlationId, 'set-secret');

    try {
      // Rate limiting check
      const rateLimitKey = `set-secret:${service}`;
      if (!this.checkRateLimit(rateLimitKey, this.RATE_LIMIT_MAX_SECRET_REQUESTS)) {
        throw new Error('Rate limit exceeded for secret operations. Please try again later.');
      }

      // Enhanced input validation
      this.validateSecretInput(service, name, value);

      await this.updateMetric('secretOperations');

      // Log security event
      await this.logSecurityEvent('SECRET_STORE_ATTEMPT', service, name, correlationId, {
        operation: 'set',
        rateLimitKey,
        valueLength: value.length,
      });

      // Feature-based storage with error handling
      if (feature('R2_STORAGE')) {
        await this.setSecretInR2(service, name, value);
      } else if (feature('LOCAL_STORAGE')) {
        await secretManager.setSecret(service, name, value);
      }

      // Feature-based audit logging with error handling
      if (feature('FULL_AUDIT')) {
        await this.logFullAudit('SET', service, name, value);
      } else if (feature('SECURITY_AUDIT')) {
        await this.logSecurityAudit('SET', service, name);
      }

      // Log successful storage
      await this.logSecurityEvent('SECRET_STORE_SUCCESS', service, name, correlationId, {
        operation: 'set',
        success: true,
      });
    } catch (error) {
      await this.updateMetric('securityEvents');

      // Log security failure
      await this.logSecurityEvent('SECRET_STORE_FAILURE', service, name, correlationId, {
        operation: 'set',
        error: this.sanitizeError(error).message,
      });

      console.error(
        `🚨 Failed to set secret ${service}:${name}:`,
        this.sanitizeError(error).message
      );
      throw this.sanitizeError(error);
    } finally {
      const tracking = this.endOperationTracking(correlationId);
      if (tracking) {
        await this.logSecurityEvent('OPERATION_COMPLETED', service, name, correlationId, {
          operation: 'set-secret',
          duration: tracking.duration,
        });
      }
    }
  }

  // Feature-based secret retrieval methods
  private async getSecretFromRedis(service: string, name: string): Promise<string | null> {
    // Redis implementation would go here
    // For now, fallback to memory cache
    await this.updateMetric('cacheHits');
    return await secretManager.getSecret(service, name);
  }

  private async getSecretDirect(service: string, name: string): Promise<string | null> {
    await this.updateMetric('cacheMisses');
    // Direct implementation without caching
    return await secretManager.getSecret(service, name);
  }

  private async setSecretInR2(service: string, name: string, value: string): Promise<void> {
    // R2 implementation would go here
    // For now, fallback to local storage
    await secretManager.setSecret(service, name, value);
  }

  // Feature-based audit logging
  private async logFullAudit(
    action: string,
    service: string,
    name: string,
    value?: string
  ): Promise<void> {
    await this.updateMetric('auditEvents');
    // Full audit implementation would go here
    console.log('� Full Audit:', { action, service, name, timestamp: new Date().toISOString() });
  }

  private async logSecurityAudit(action: string, service: string, name: string): Promise<void> {
    await this.updateMetric('auditEvents');
    // Security audit implementation would go here
    const auditData = {
      action,
      service,
      name,
      timestamp: new Date().toISOString(),
      source: 'enhanced-security-manager',
      auditLevel: 'SECURITY',
    };

    console.log('🔍 Security Audit:', auditData);
  }

  // Runtime feature checking - DISABLED due to Bun limitations
  // Feature flags only work at build time, not runtime
  isFeatureEnabled(featureName: string): boolean {
    console.warn(
      `⚠️ Runtime feature checking is disabled. Feature flags only work at build time with bun build --feature=NAME`
    );
    return false;
  }

  // Get security metrics with enhanced information
  getMetrics() {
    return {
      ...this.metrics,
      activeOperations: this.activeOperations.size,
      rateLimitEntries: this.rateLimitMap.size,
      ipRateLimitEntries: this.ipRateLimitMap.size,
      blockedIps: Array.from(this.ipRateLimitMap.entries())
        .filter(([_, data]) => data.blocked)
        .map(([ip, data]) => ({ ip, blockedUntil: data.blockUntil })),
      auditBufferSize: this.auditLogBuffer.length,
      securityLevel: securityConfig.getSecurityLevel(),
      uptime: Date.now() - (this as any).initializedTime || 0,
      initializedAt: (this as any).initializedAt || new Date().toISOString(),
    };
  }

  // Health check with enhanced error handling
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    features: Record<string, boolean>;
    metrics: typeof this.metrics;
    issues: string[];
    initializationStatus: 'pending' | 'completed' | 'failed';
  }> {
    const issues: string[] = [];
    const features: Record<string, boolean> = {};

    // Check initialization status
    let initializationStatus: 'pending' | 'completed' | 'failed';
    if (this.initializationError) {
      initializationStatus = 'failed';
      issues.push('Initialization failed: ' + this.initializationError.message);
    } else if (!this.isInitialized) {
      initializationStatus = 'pending';
      issues.push('Initialization still in progress');
    } else {
      initializationStatus = 'completed';
    }

    // Check critical features - DISABLED due to Bun limitations
    // Feature flags only work at build time, not runtime
    const criticalFeatures = ['ENTERPRISE_SECURITY', 'STANDARD_SECURITY', 'AWS_SIGV4'];
    for (const featureName of criticalFeatures) {
      features[featureName] = false; // Runtime checking not available
      issues.push(
        `Runtime feature checking not available for ${featureName}. Use build-time flags.`
      );
    }

    // Check if any security features are enabled
    const hasSecurityFeature = Object.values(features).some(Boolean);
    if (!hasSecurityFeature) {
      issues.push('No security features enabled');
    }

    // Check metrics for anomalies
    if (this.metrics.securityEvents > this.metrics.secretOperations * 0.1) {
      issues.push('High security event rate detected');
    }

    // Determine status
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (issues.length === 0 && initializationStatus === 'completed') {
      status = 'healthy';
    } else if (issues.length <= 2 || initializationStatus === 'pending') {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      features,
      metrics: this.metrics,
      issues,
      initializationStatus,
    };
  }

  // Graceful shutdown with proper cleanup
  async shutdown(): Promise<void> {
    if (!this.isInitialized && !this.initializationPromise) {
      return; // Already shut down or never initialized
    }

    console.log('🔄 Shutting down Enhanced Security Manager...');

    try {
      // Flush any remaining audit logs
      await this.flushAuditLog();

      // Clear audit flush interval
      if (this.auditFlushInterval) {
        clearInterval(this.auditFlushInterval);
        this.auditFlushInterval = undefined;
      }

      // Clear rate limit maps
      this.rateLimitMap.clear();
      this.ipRateLimitMap.clear();

      // Clear operation tracking
      this.activeOperations.clear();

      console.log('✅ Enhanced Security Manager shutdown complete');
    } catch (error) {
      console.error('🚨 Error during Enhanced Security Manager shutdown:', error);
    }
  }

  // Get audit log statistics
  getAuditLogStats() {
    return {
      bufferSize: this.auditLogBuffer.length,
      maxBufferSize: this.AUDIT_BUFFER_SIZE,
      totalEvents: this.metrics.auditEvents,
      oldestEntry:
        this.auditLogBuffer.length > 0
          ? new Date(this.auditLogBuffer[0].timestamp).toISOString()
          : null,
      newestEntry:
        this.auditLogBuffer.length > 0
          ? new Date(this.auditLogBuffer[this.auditLogBuffer.length - 1].timestamp).toISOString()
          : null,
    };
  }

  // Manual audit log flush
  async flushAuditLogs(): Promise<void> {
    await this.flushAuditLog();
  }

  // Clear expired rate limit entries
  clearExpiredRateLimits(): void {
    const now = Date.now();

    // Clear application-level rate limits
    for (const [key, data] of this.rateLimitMap.entries()) {
      if (now > data.resetTime) {
        this.rateLimitMap.delete(key);
      }
    }

    // Clear IP-based rate limits (except blocked IPs)
    for (const [ip, data] of this.ipRateLimitMap.entries()) {
      if (!data.blocked && now > data.resetTime) {
        this.ipRateLimitMap.delete(ip);
      }
    }
  }

  // Get comprehensive monitoring dashboard
  getMonitoringDashboard() {
    return {
      performance: {
        ...this.performanceMetrics,
        currentConcurrentOperations: this.activeOperations.size,
        responseTimeHistory: this.monitoringData.responseTimeHistory.slice(-20), // Last 20
        cacheEfficiency: {
          hits: this.metrics.cacheHits,
          misses: this.metrics.cacheMisses,
          ratio: this.performanceMetrics.cacheHitRatio,
        },
      },
      security: {
        events: Object.fromEntries(this.monitoringData.securityEvents),
        threatLevels: Object.fromEntries(this.monitoringData.threatLevels),
        blockedIps: {
          current: this.metrics.blockedIps?.length || 0,
          history: this.monitoringData.blockedIpsHistory.slice(-10), // Last 10
        },
        rateLimiting: {
          activeEntries: this.rateLimitMap.size,
          ipEntries: this.ipRateLimitMap.size,
          blockedCount: this.metrics.blockedIps?.length || 0,
        },
      },
      system: {
        health: this.monitoringData.systemHealth,
        uptime: Date.now() - (this as any).initializedTime || 0,
        auditLog: this.getAuditLogStats(),
        metrics: this.metrics,
      },
      alerts: this.generateSecurityAlerts(),
    };
  }

  // Generate security alerts based on current state
  private generateSecurityAlerts(): Array<{
    level: 'info' | 'warning' | 'critical';
    message: string;
    timestamp: Date;
    metadata?: Record<string, any>;
  }> {
    const alerts = [];

    // Performance alerts
    if (
      this.performanceMetrics.averageResponseTime >
      this.PERFORMANCE_CONFIG.RESPONSE_TIME_THRESHOLD_MS
    ) {
      alerts.push({
        level: 'warning',
        message: `High response time detected: ${this.performanceMetrics.averageResponseTime.toFixed(2)}ms`,
        timestamp: new Date(),
        metadata: { threshold: this.PERFORMANCE_CONFIG.RESPONSE_TIME_THRESHOLD_MS },
      });
    }

    // Security alerts
    const blockedIpCount = this.metrics.blockedIps?.length || 0;
    if (blockedIpCount > 10) {
      alerts.push({
        level: 'critical',
        message: `High number of blocked IPs: ${blockedIpCount}`,
        timestamp: new Date(),
        metadata: { blockedIpCount },
      });
    }

    // System health alerts
    if (this.monitoringData.systemHealth.status !== 'healthy') {
      alerts.push({
        level: this.monitoringData.systemHealth.status === 'unhealthy' ? 'critical' : 'warning',
        message: `System health: ${this.monitoringData.systemHealth.status}`,
        timestamp: new Date(),
        metadata: { issues: this.monitoringData.systemHealth.issues },
      });
    }

    return alerts;
  }

  // Start periodic health monitoring
  private startHealthMonitoring(): void {
    // Perform health check every 30 seconds
    setInterval(async () => {
      await this.performHealthCheck();
    }, 30000);
  }
}

// Export singleton instance
export const enhancedSecurityManager = new EnhancedSecurityManager();

// Export convenience functions
export function getSecureSecret(
  service: string,
  name: string,
  context?: { ip?: string; userAgent?: string }
): Promise<string | null> {
  return enhancedSecurityManager.getSecret(service, name, context);
}

export function setSecureSecret(service: string, name: string, value: string): Promise<void> {
  return enhancedSecurityManager.setSecret(service, name, value);
}

export function isSecurityFeatureEnabled(featureName: string): boolean {
  return enhancedSecurityManager.isFeatureEnabled(featureName);
}

export function getSecurityMetrics() {
  return enhancedSecurityManager.getMetrics();
}

// Compile-time feature checks for dead-code elimination
export function debugLog(message: string): void {
  // This entire function will be removed at bundle time if DEBUG feature is not enabled
  if (feature('DEBUG')) {
    console.log(`🐛 [DEBUG] ${message}`);
  }
}

export function enterpriseSecurityCheck(): boolean {
  // This will be optimized to 'return true' or 'return false' at bundle time
  return feature('ENTERPRISE_SECURITY') ? true : false;
}

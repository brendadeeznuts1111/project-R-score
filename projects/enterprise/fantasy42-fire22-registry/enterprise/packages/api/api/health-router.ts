/**
 * Comprehensive Health Check API Router
 * Crystal Clear Architecture - Health Monitoring System
 *
 * Provides extensive health monitoring endpoints covering:
 * - System resources (CPU, memory, disk)
 * - Database connectivity and performance
 * - External service dependencies
 * - Application-specific health metrics
 * - Performance monitoring
 * - Security status
 * - Cache health
 */

import { Router } from 'express';
import { SystemHealthService } from '../services/health/system-health.service';
import { DatabaseHealthService } from '../services/health/database-health.service';
import { ExternalServicesHealthService } from '../services/health/external-services-health.service';
import { ApplicationHealthService } from '../services/health/application-health.service';
import { PerformanceHealthService } from '../services/health/performance-health.service';
import { SecurityHealthService } from '../services/health/security-health.service';
import { CacheHealthService } from '../services/health/cache-health.service';

const router = Router();

// Initialize health services
const systemHealth = new SystemHealthService();
const databaseHealth = new DatabaseHealthService();
const externalServicesHealth = new ExternalServicesHealthService();
const applicationHealth = new ApplicationHealthService();
const performanceHealth = new PerformanceHealthService();
const securityHealth = new SecurityHealthService();
const cacheHealth = new CacheHealthService();

// !==!==!==!==!==!==!==!==!==!==!==!==!==!===
// BASIC HEALTH CHECKS
// !==!==!==!==!==!==!==!==!==!==!==!==!==!===

/**
 * GET /health
 * Basic health check endpoint
 * Returns overall system health status
 */
router.get('/', async (req, res) => {
  try {
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };

    res.json(healthData);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /health/ping
 * Simple ping/pong health check
 */
router.get('/ping', (req, res) => {
  res.json({
    status: 'pong',
    timestamp: new Date().toISOString(),
    server: 'Crystal Clear API',
  });
});

/**
 * GET /health/status
 * Detailed system status
 */
router.get('/status', async (req, res) => {
  try {
    const systemStatus = await systemHealth.getSystemStatus();
    const databaseStatus = await databaseHealth.getDatabaseStatus();

    const overallStatus =
      systemStatus.status === 'healthy' && databaseStatus.status === 'healthy'
        ? 'healthy'
        : 'degraded';

    res.json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services: {
        system: systemStatus,
        database: databaseStatus,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: 'Status check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

// !==!==!==!==!==!==!==!==!==!==!==!==!==!===
// SYSTEM HEALTH ENDPOINTS
// !==!==!==!==!==!==!==!==!==!==!==!==!==!===

/**
 * GET /health/system
 * Comprehensive system health information
 */
router.get('/system', async (req, res) => {
  try {
    const systemHealthData = await systemHealth.getDetailedSystemHealth();
    res.json(systemHealthData);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: 'System health check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /health/system/cpu
 * CPU usage and information
 */
router.get('/system/cpu', async (req, res) => {
  try {
    const cpuData = await systemHealth.getCPUHealth();
    res.json(cpuData);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: 'CPU health check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /health/system/memory
 * Memory usage and statistics
 */
router.get('/system/memory', async (req, res) => {
  try {
    const memoryData = await systemHealth.getMemoryHealth();
    res.json(memoryData);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: 'Memory health check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /health/system/disk
 * Disk usage and filesystem information
 */
router.get('/system/disk', async (req, res) => {
  try {
    const diskData = await systemHealth.getDiskHealth();
    res.json(diskData);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: 'Disk health check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /health/system/network
 * Network interface and connectivity information
 */
router.get('/system/network', async (req, res) => {
  try {
    const networkData = await systemHealth.getNetworkHealth();
    res.json(networkData);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: 'Network health check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

// !==!==!==!==!==!==!==!==!==!==!==!==!==!===
// DATABASE HEALTH ENDPOINTS
// !==!==!==!==!==!==!==!==!==!==!==!==!==!===

/**
 * GET /health/database
 * Database connectivity and performance health
 */
router.get('/database', async (req, res) => {
  try {
    const dbHealth = await databaseHealth.getDetailedDatabaseHealth();
    res.json(dbHealth);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: 'Database health check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /health/database/connection
 * Database connection pool status
 */
router.get('/database/connection', async (req, res) => {
  try {
    const connectionHealth = await databaseHealth.getConnectionHealth();
    res.json(connectionHealth);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: 'Database connection check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /health/database/performance
 * Database performance metrics
 */
router.get('/database/performance', async (req, res) => {
  try {
    const performanceData = await databaseHealth.getPerformanceMetrics();
    res.json(performanceData);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: 'Database performance check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /health/database/migrations
 * Database migration status
 */
router.get('/database/migrations', async (req, res) => {
  try {
    const migrationStatus = await databaseHealth.getMigrationStatus();
    res.json(migrationStatus);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: 'Migration status check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

// !==!==!==!==!==!==!==!==!==!==!==!==!==!===
// EXTERNAL SERVICES HEALTH ENDPOINTS
// !==!==!==!==!==!==!==!==!==!==!==!==!==!===

/**
 * GET /health/external
 * External service dependencies health
 */
router.get('/external', async (req, res) => {
  try {
    const externalHealth = await externalServicesHealth.getAllServicesHealth();
    res.json(externalHealth);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: 'External services health check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /health/external/:service
 * Individual external service health
 */
router.get('/external/:service', async (req, res) => {
  try {
    const { service } = req.params;
    const serviceHealth = await externalServicesHealth.getServiceHealth(service);
    res.json(serviceHealth);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: `External service health check failed for ${req.params.service}`,
      timestamp: new Date().toISOString(),
    });
  }
});

// !==!==!==!==!==!==!==!==!==!==!==!==!==!===
// APPLICATION HEALTH ENDPOINTS
// !==!==!==!==!==!==!==!==!==!==!==!==!==!===

/**
 * GET /health/application
 * Application-specific health metrics
 */
router.get('/application', async (req, res) => {
  try {
    const appHealth = await applicationHealth.getApplicationHealth();
    res.json(appHealth);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: 'Application health check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /health/application/domains
 * Domain-specific health status
 */
router.get('/application/domains', async (req, res) => {
  try {
    const domainHealth = await applicationHealth.getDomainHealth();
    res.json(domainHealth);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: 'Domain health check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /health/application/tasks
 * Background task processing health
 */
router.get('/application/tasks', async (req, res) => {
  try {
    const taskHealth = await applicationHealth.getTaskProcessingHealth();
    res.json(taskHealth);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: 'Task processing health check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

// !==!==!==!==!==!==!==!==!==!==!==!==!==!===
// PERFORMANCE HEALTH ENDPOINTS
// !==!==!==!==!==!==!==!==!==!==!==!==!==!===

/**
 * GET /health/performance
 * Performance metrics and monitoring
 */
router.get('/performance', async (req, res) => {
  try {
    const performanceData = await performanceHealth.getPerformanceMetrics();
    res.json(performanceData);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: 'Performance health check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /health/performance/response-times
 * API response time metrics
 */
router.get('/performance/response-times', async (req, res) => {
  try {
    const responseTimeData = await performanceHealth.getResponseTimeMetrics();
    res.json(responseTimeData);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: 'Response time metrics failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /health/performance/throughput
 * System throughput metrics
 */
router.get('/performance/throughput', async (req, res) => {
  try {
    const throughputData = await performanceHealth.getThroughputMetrics();
    res.json(throughputData);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: 'Throughput metrics failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /health/performance/error-rates
 * Error rate monitoring
 */
router.get('/performance/error-rates', async (req, res) => {
  try {
    const errorRateData = await performanceHealth.getErrorRateMetrics();
    res.json(errorRateData);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: 'Error rate metrics failed',
      timestamp: new Date().toISOString(),
    });
  }
});

// !==!==!==!==!==!==!==!==!==!==!==!==!==!===
// CACHE HEALTH ENDPOINTS
// !==!==!==!==!==!==!==!==!==!==!==!==!==!===

/**
 * GET /health/cache
 * Cache health and performance metrics
 */
router.get('/cache', async (req, res) => {
  try {
    const cacheHealthData = await cacheHealth.getCacheHealth();
    res.json(cacheHealthData);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: 'Cache health check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /health/cache/hit-rates
 * Cache hit rate metrics
 */
router.get('/cache/hit-rates', async (req, res) => {
  try {
    const hitRateData = await cacheHealth.getHitRateMetrics();
    res.json(hitRateData);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: 'Cache hit rate metrics failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /health/cache/clear
 * Clear cache (admin only)
 */
router.post('/cache/clear', async (req, res) => {
  try {
    // Add authentication check here for production
    const clearResult = await cacheHealth.clearCache();
    res.json({
      success: true,
      message: 'Cache cleared successfully',
      ...clearResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Cache clear failed',
      timestamp: new Date().toISOString(),
    });
  }
});

// !==!==!==!==!==!==!==!==!==!==!==!==!==!===
// SECURITY HEALTH ENDPOINTS
// !==!==!==!==!==!==!==!==!==!==!==!==!==!===

/**
 * GET /health/security
 * Security status and compliance checks
 */
router.get('/security', async (req, res) => {
  try {
    const securityData = await securityHealth.getSecurityStatus();
    res.json(securityData);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: 'Security health check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /health/security/auth
 * Authentication system health
 */
router.get('/security/auth', async (req, res) => {
  try {
    const authHealth = await securityHealth.getAuthenticationHealth();
    res.json(authHealth);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: 'Authentication health check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /health/security/ssl
 * SSL/TLS certificate status
 */
router.get('/security/ssl', async (req, res) => {
  try {
    const sslHealth = await securityHealth.getSSLHealth();
    res.json(sslHealth);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: 'SSL health check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

// !==!==!==!==!==!==!==!==!==!==!==!==!==!===
// COMPREHENSIVE HEALTH CHECKS
// !==!==!==!==!==!==!==!==!==!==!==!==!==!===

/**
 * GET /health/comprehensive
 * All-in-one comprehensive health check
 */
router.get('/comprehensive', async (req, res) => {
  try {
    const [
      systemHealthData,
      databaseHealthData,
      externalHealthData,
      applicationHealthData,
      performanceData,
      cacheData,
      securityData,
    ] = await Promise.all([
      systemHealth.getDetailedSystemHealth(),
      databaseHealth.getDetailedDatabaseHealth(),
      externalServicesHealth.getAllServicesHealth(),
      applicationHealth.getApplicationHealth(),
      performanceHealth.getPerformanceMetrics(),
      cacheHealth.getCacheHealth(),
      securityHealth.getSecurityStatus(),
    ]);

    // Calculate overall health status
    const services = [
      systemHealthData,
      databaseHealthData,
      externalHealthData,
      applicationHealthData,
      performanceData,
      cacheData,
      securityData,
    ];

    const unhealthyServices = services.filter(service => service.status !== 'healthy');
    const overallStatus =
      unhealthyServices.length === 0
        ? 'healthy'
        : unhealthyServices.length === services.length
          ? 'critical'
          : 'degraded';

    const comprehensiveHealth = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      summary: {
        totalServices: services.length,
        healthyServices: services.length - unhealthyServices.length,
        unhealthyServices: unhealthyServices.length,
        degradedServices: unhealthyServices.filter(s => s.status === 'degraded').length,
        criticalServices: unhealthyServices.filter(s => s.status === 'critical').length,
      },
      services: {
        system: systemHealthData,
        database: databaseHealthData,
        external: externalHealthData,
        application: applicationHealthData,
        performance: performanceData,
        cache: cacheData,
        security: securityData,
      },
      alerts: unhealthyServices.map(service => ({
        service: service.name || 'Unknown',
        status: service.status,
        message: service.message || 'Service is not healthy',
        timestamp: new Date().toISOString(),
      })),
    };

    // Set appropriate HTTP status code
    const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503; // Service Unavailable for critical

    res.status(statusCode).json(comprehensiveHealth);
  } catch (error) {
    res.status(500).json({
      status: 'critical',
      error: 'Comprehensive health check failed',
      timestamp: new Date().toISOString(),
      services: null,
      summary: null,
    });
  }
});

/**
 * GET /health/metrics
 * Prometheus-style metrics endpoint
 */
router.get('/metrics', async (req, res) => {
  try {
    const metrics = await performanceHealth.getPrometheusMetrics();
    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.send(metrics);
  } catch (error) {
    res.status(500).send('# Health metrics collection failed\n');
  }
});

export default router;

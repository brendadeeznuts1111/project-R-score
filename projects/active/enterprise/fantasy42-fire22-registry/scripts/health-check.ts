#!/usr/bin/env bun
/**
 * Fantasy42-Fire22 Registry Health Check Script
 * Comprehensive health checks for all system components
 */

import { createDatabaseConnection } from '../lib/database';
import { config, getConfigSummary } from '../config';

interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  message: string;
  details?: any;
}

async function runHealthChecks(): Promise<HealthCheckResult[]> {
  console.info('🏥 Running comprehensive health checks...');

  const results: HealthCheckResult[] = [];

  // Database health check
  results.push(await checkDatabaseHealth());

  // Configuration health check
  results.push(await checkConfigurationHealth());

  // File system health check
  results.push(await checkFileSystemHealth());

  // Memory usage check
  results.push(await checkMemoryHealth());

  // External services check
  results.push(await checkExternalServicesHealth());

  return results;
}

async function checkDatabaseHealth(): Promise<HealthCheckResult> {
  const startTime = Date.now();

  try {
    const { db, healthCheck } = createDatabaseConnection();

    const isHealthy = await healthCheck();
    const responseTime = Date.now() - startTime;

    // Additional database metrics
    const dbStats = db
      .prepare(
        `
      SELECT
        (SELECT COUNT(*) FROM packages) as packages,
        (SELECT COUNT(*) FROM package_versions) as versions,
        (SELECT COUNT(*) FROM sqlite_master WHERE type='table') as tables
    `
      )
      .get();

    db.close();

    return {
      service: 'database',
      status: isHealthy ? 'healthy' : 'unhealthy',
      responseTime,
      message: isHealthy ? 'Database is healthy' : 'Database health check failed',
      details: {
        packages: dbStats.packages,
        versions: dbStats.versions,
        tables: dbStats.tables,
        connectionTime: responseTime,
      },
    };
  } catch (error) {
    return {
      service: 'database',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      message: `Database health check failed: ${error.message}`,
      details: { error: error.message },
    };
  }
}

async function checkConfigurationHealth(): Promise<HealthCheckResult> {
  const startTime = Date.now();

  try {
    // Validate configuration
    const configSummary = getConfigSummary();
    const responseTime = Date.now() - startTime;

    // Check critical configuration values
    const issues: string[] = [];

    if (!config.DATABASE_URL || config.DATABASE_URL === ':memory:') {
      issues.push('Database URL not properly configured');
    }

    if (config.FIRE22_SECURITY_LEVEL === 'standard' && !config.isDevelopment) {
      issues.push('Security level too low for production environment');
    }

    const status = issues.length === 0 ? 'healthy' : 'degraded';

    return {
      service: 'configuration',
      status,
      responseTime,
      message: status === 'healthy' ? 'Configuration is valid' : 'Configuration has issues',
      details: {
        environment: configSummary.environment,
        database: configSummary.database,
        security: configSummary.security,
        issues: issues.length > 0 ? issues : undefined,
      },
    };
  } catch (error) {
    return {
      service: 'configuration',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      message: `Configuration check failed: ${error.message}`,
      details: { error: error.message },
    };
  }
}

async function checkFileSystemHealth(): Promise<HealthCheckResult> {
  const startTime = Date.now();

  try {
    // Check critical files exist
    const criticalFiles = ['package.json', 'src/index.ts', 'schema.sql'];

    const missingFiles: string[] = [];

    for (const file of criticalFiles) {
      const exists = await Bun.file(file).exists();
      if (!exists) {
        missingFiles.push(file);
      }
    }

    // Check database file if using persistent storage
    if (config.DATABASE_URL.startsWith('file:')) {
      const dbPath = config.DATABASE_URL.replace('file:', '');
      const dbExists = await Bun.file(dbPath).exists();
      if (!dbExists) {
        missingFiles.push(`Database file: ${dbPath}`);
      }
    }

    const responseTime = Date.now() - startTime;
    const status = missingFiles.length === 0 ? 'healthy' : 'degraded';

    return {
      service: 'filesystem',
      status,
      responseTime,
      message: status === 'healthy' ? 'File system is healthy' : 'Missing critical files',
      details: {
        missingFiles: missingFiles.length > 0 ? missingFiles : undefined,
      },
    };
  } catch (error) {
    return {
      service: 'filesystem',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      message: `File system check failed: ${error.message}`,
      details: { error: error.message },
    };
  }
}

async function checkMemoryHealth(): Promise<HealthCheckResult> {
  const startTime = Date.now();

  try {
    // Get memory usage
    const memUsage = process.memoryUsage();
    const responseTime = Date.now() - startTime;

    // Convert bytes to MB
    const usedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const totalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const externalMB = Math.round(memUsage.external / 1024 / 1024);

    // Check memory thresholds
    const memoryPressure = usedMB > totalMB * 0.8; // Over 80% usage
    const status = memoryPressure ? 'degraded' : 'healthy';

    return {
      service: 'memory',
      status,
      responseTime,
      message: status === 'healthy' ? 'Memory usage is normal' : 'High memory usage detected',
      details: {
        heapUsed: `${usedMB} MB`,
        heapTotal: `${totalMB} MB`,
        external: `${externalMB} MB`,
        usagePercent: Math.round((usedMB / totalMB) * 100),
      },
    };
  } catch (error) {
    return {
      service: 'memory',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      message: `Memory check failed: ${error.message}`,
      details: { error: error.message },
    };
  }
}

async function checkExternalServicesHealth(): Promise<HealthCheckResult> {
  const startTime = Date.now();

  try {
    // Check external service connectivity
    const services: { name: string; url?: string; check: () => Promise<boolean> }[] = [];

    // Redis check (if configured)
    if (config.REDIS_URL) {
      services.push({
        name: 'redis',
        url: config.REDIS_URL,
        check: async () => {
          // Simple connectivity check (would need redis client in real implementation)
          return true; // Placeholder
        },
      });
    }

    // Run service checks
    const serviceResults: { name: string; healthy: boolean; error?: string }[] = [];

    for (const service of services) {
      try {
        const healthy = await service.check();
        serviceResults.push({ name: service.name, healthy });
      } catch (error) {
        serviceResults.push({
          name: service.name,
          healthy: false,
          error: error.message,
        });
      }
    }

    const unhealthyServices = serviceResults.filter(s => !s.healthy);
    const responseTime = Date.now() - startTime;
    const status = unhealthyServices.length === 0 ? 'healthy' : 'degraded';

    return {
      service: 'external-services',
      status,
      responseTime,
      message:
        status === 'healthy'
          ? 'External services are healthy'
          : 'Some external services are unhealthy',
      details: {
        services: serviceResults,
      },
    };
  } catch (error) {
    return {
      service: 'external-services',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      message: `External services check failed: ${error.message}`,
      details: { error: error.message },
    };
  }
}

function displayHealthResults(results: HealthCheckResult[]): void {
  console.info('\n🏥 Health Check Results');
  console.info('======================');

  const statusCounts = {
    healthy: 0,
    degraded: 0,
    unhealthy: 0,
  };

  results.forEach(result => {
    statusCounts[result.status]++;

    const statusIcon =
      result.status === 'healthy' ? '✅' : result.status === 'degraded' ? '⚠️' : '❌';

    console.info(`${statusIcon} ${result.service}: ${result.message}`);
    console.info(`   Response time: ${result.responseTime}ms`);

    if (result.details) {
      console.info(`   Details: ${JSON.stringify(result.details, null, 2)}`);
    }
    console.info('');
  });

  // Summary
  const totalServices = results.length;
  const healthyPercent = Math.round((statusCounts.healthy / totalServices) * 100);

  console.info('📊 Summary');
  console.info('=========');
  console.info(`Total services: ${totalServices}`);
  console.info(`Healthy: ${statusCounts.healthy}`);
  console.info(`Degraded: ${statusCounts.degraded}`);
  console.info(`Unhealthy: ${statusCounts.unhealthy}`);
  console.info(`Overall health: ${healthyPercent}%`);

  if (healthyPercent === 100) {
    console.info('🎉 All systems are healthy!');
  } else if (healthyPercent >= 80) {
    console.info('⚠️ System is mostly healthy with minor issues');
  } else {
    console.info('❌ System has significant health issues');
  }
}

// CLI interface
const args = process.argv.slice(2);
const command = args[0];

if (import.meta.main) {
  if (command === 'json') {
    // Output JSON for monitoring systems
    runHealthChecks()
      .then(results => {
        console.info(
          JSON.stringify(
            {
              timestamp: new Date().toISOString(),
              overall_health: results.every(r => r.status === 'healthy')
                ? 'healthy'
                : results.some(r => r.status === 'unhealthy')
                  ? 'unhealthy'
                  : 'degraded',
              services: results,
            },
            null,
            2
          )
        );
      })
      .catch(error => {
        console.error(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            overall_health: 'error',
            error: error.message,
          })
        );
        process.exit(1);
      });
  } else {
    // Human-readable output
    runHealthChecks()
      .then(displayHealthResults)
      .catch(error => {
        console.error('❌ Health check failed:', error);
        process.exit(1);
      });
  }
}

export {
  runHealthChecks,
  checkDatabaseHealth,
  checkConfigurationHealth,
  checkFileSystemHealth,
  checkMemoryHealth,
  checkExternalServicesHealth,
};

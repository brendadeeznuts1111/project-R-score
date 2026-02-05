// src/api/status-server.ts
/**
 * 🏭 Factory-Wager Status API Server
 * 
 * HTTP server exposing domain and DNS monitoring endpoints
 * with real-time health checks and performance metrics.
 */

import { Elysia } from 'elysia';
import { statusAPI } from './status-api.ts';
import { cors } from '@elysiajs/cors';

const app = new Elysia()
  .use(cors())
  .get('/', () => ({
    service: 'Factory-Wager Status API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      status: '/status',
      domains: '/domains',
      domain: '/domains/:domain',
      metrics: '/metrics',
      report: '/report'
    }
  }))
  .get('/health', () => {
    const health = statusAPI.getOverallHealth();
    return {
      status: health.status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      checks: {
        database: 'healthy',
        redis: 'healthy',
        external_apis: 'healthy'
      }
    };
  })
  .get('/status', () => {
    return statusAPI.getOverallHealth();
  })
  .get('/domains', () => {
    const domains = statusAPI.getStatus() as Map<string, any>;
    return Array.from(domains.entries()).map(([domain, status]) => ({
      domain,
      status: status.status,
      uptime: status.uptime,
      responseTime: status.responseTime,
      lastCheck: status.lastCheck,
      sslDaysUntilExpiry: status.sslStatus.daysUntilExpiry,
      ttfb: status.performance.ttfb,
      endpointsUp: status.endpoints.filter((e: any) => e.status === 'up').length,
      endpointsTotal: status.endpoints.length
    }));
  })
  .get('/domains/:domain', ({ params }) => {
    const status = statusAPI.getStatus(params.domain);
    if (!status) {
      return { error: 'Domain not found' };
    }
    return status;
  })
  .get('/metrics', () => {
    const health = statusAPI.getOverallHealth();
    const domains = statusAPI.getStatus() as Map<string, any>;
    
    // Prometheus-style metrics
    const metrics = [
      `# HELP factory_wager_domain_status Domain health status`,
      `# TYPE factory_wager_domain_status gauge`,
      ...Array.from(domains.entries()).map(([domain, status]) => 
        `factory_wager_domain_status{domain="${domain}",status="${status.status}"} 1`
      ),
      '',
      `# HELP factory_wager_domain_uptime Domain uptime percentage`,
      `# TYPE factory_wager_domain_uptime gauge`,
      ...Array.from(domains.entries()).map(([domain, status]) => 
        `factory_wager_domain_uptime{domain="${domain}"} ${status.uptime}`
      ),
      '',
      `# HELP factory_wager_domain_response_time Domain response time in milliseconds`,
      `# TYPE factory_wager_domain_response_time gauge`,
      ...Array.from(domains.entries()).map(([domain, status]) => 
        `factory_wager_domain_response_time{domain="${domain}"} ${status.responseTime}`
      ),
      '',
      `# HELP factory_wager_ssl_days_until_expiry SSL certificate days until expiry`,
      `# TYPE factory_wager_ssl_days_until_expiry gauge`,
      ...Array.from(domains.entries()).map(([domain, status]) => 
        `factory_wager_ssl_days_until_expiry{domain="${domain}"} ${status.sslStatus.daysUntilExpiry}`
      ),
      '',
      `# HELP factory_wager_overall_health Overall system health`,
      `# TYPE factory_wager_overall_health gauge`,
      `factory_wager_overall_health{status="${health.status}"} 1`,
      '',
      `# HELP factory_wager_monitored_domains Total number of monitored domains`,
      `# TYPE factory_wager_monitored_domains gauge`,
      `factory_wager_monitored_domains ${health.totalDomains}`,
      '',
      `# HELP factory_wager_healthy_domains Number of healthy domains`,
      `# TYPE factory_wager_healthy_domains gauge`,
      `factory_wager_healthy_domains ${health.healthyDomains}`,
      '',
      `# HELP factory_wager_warning_domains Number of domains with warnings`,
      `# TYPE factory_wager_warning_domains gauge`,
      `factory_wager_warning_domains ${health.warningDomains}`,
      '',
      `# HELP factory_wager_critical_domains Number of critical domains`,
      `# TYPE factory_wager_critical_domains gauge`,
      `factory_wager_critical_domains ${health.criticalDomains}`
    ];

    return metrics.join('\n');
  })
  .get('/report', () => {
    return {
      report: statusAPI.generateStatusReport(),
      timestamp: new Date().toISOString(),
      format: 'text'
    };
  })
  .get('/dashboard', () => {
    const health = statusAPI.getOverallHealth();
    const domains = statusAPI.getStatus() as Map<string, any>;
    
    return {
      summary: health,
      domains: Array.from(domains.entries()).map(([domain, status]) => ({
        domain,
        status: status.status,
        uptime: status.uptime,
        responseTime: status.responseTime,
        lastCheck: status.lastCheck,
        ssl: {
          status: status.sslStatus.status,
          daysUntilExpiry: status.sslStatus.daysUntilExpiry,
          issuer: status.sslStatus.issuer
        },
        performance: {
          ttfb: status.performance.ttfb,
          dnsLookup: status.performance.dnsLookup,
          totalResponseTime: status.performance.totalResponseTime
        },
        endpoints: status.endpoints.map((e: any) => ({
          url: e.url,
          status: e.status,
          responseTime: e.responseTime,
          statusCode: e.statusCode
        })),
        dns: {
          status: status.dnsStatus.status,
          recordCount: status.dnsStatus.records.length,
          issues: status.dnsStatus.issues
        }
      }))
    };
  })
  .post('/domains/:domain/check', async ({ params }) => {
    await statusAPI.checkDomainHealth(params.domain);
    const status = statusAPI.getStatus(params.domain);
    return status;
  })
  .get('/health/live', () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  })
  .get('/health/ready', () => {
    const health = statusAPI.getOverallHealth();
    return {
      status: health.status === 'healthy' ? 'ok' : 'not_ready',
      timestamp: new Date().toISOString(),
      checks: health
    };
  })
  .listen(3000);

console.log('🏭 Factory-Wager Status API Server running on http://localhost:3000');
console.log('📊 Available endpoints:');
console.log('  GET  /              - API information');
console.log('  GET  /health        - Health check');
console.log('  GET  /status        - Overall status');
console.log('  GET  /domains       - All domains status');
console.log('  GET  /domains/:domain - Specific domain');
console.log('  GET  /metrics       - Prometheus metrics');
console.log('  GET  /report        - Text report');
console.log('  GET  /dashboard     - Dashboard data');
console.log('  POST /domains/:domain/check - Force domain check');

export default app;

#!/usr/bin/env bun

/**
 * Health Check Field Validator
 * Ensures all required fields are present in health check responses
 */

interface HealthCheckResponse {
  status: string;
  timestamp: string;
  system: any;
  infrastructure: any;
  performance: any;
  resources: any;
  connections: any;
  security: any;
  cache: any;
  requests: any;
  statistics: any;
  build: any;
  dependencies: any;
  capabilities: any;
  lattice: any;
  issues: any[];
  warnings: string[];
  actions_taken: string[];
  indicators: any;
}

class HealthFieldValidator {
  private requiredFields = [
    'status',
    'timestamp',
    'system',
    'infrastructure',
    'performance',
    'resources',
    'connections',
    'security',
    'cache',
    'requests',
    'statistics',
    'build',
    'dependencies',
    'capabilities',
    'lattice',
    'issues',
    'warnings',
    'actions_taken',
    'indicators'
  ];

  private requiredSystemFields = [
    'service',
    'version',
    'tier',
    'runtime',
    'region',
    'environment'
  ];

  private requiredPerformanceFields = [
    'last_check',
    'performance_health',
    'response_time_p95',
    'throughput_current',
    'error_rate_percent',
    'status',
    'memory_health',
    'connection_health',
    'socket_efficiency_percent'
  ];

  private requiredResourceFields = [
    'memory',
    'cpu',
    'uptime_seconds',
    'uptime_formatted',
    'process_id',
    'node_version',
    'platform',
    'architecture'
  ];

  validateHealthResponse(response: any): { valid: boolean; missing: string[]; issues: string[] } {
    const missing: string[] = [];
    const issues: string[] = [];

    // Check top-level fields
    for (const field of this.requiredFields) {
      if (!(field in response)) {
        missing.push(`Root field: ${field}`);
      }
    }

    // Check system fields
    if (response.system) {
      for (const field of this.requiredSystemFields) {
        if (!(field in response.system)) {
          missing.push(`System field: ${field}`);
        }
      }
    }

    // Check performance fields
    if (response.performance) {
      for (const field of this.requiredPerformanceFields) {
        if (!(field in response.performance)) {
          missing.push(`Performance field: ${field}`);
        }
      }
    }

    // Check resource fields
    if (response.resources) {
      for (const field of this.requiredResourceFields) {
        if (!(field in response.resources)) {
          missing.push(`Resource field: ${field}`);
        }
      }
    }

    // Validate data types and ranges
    if (response.performance?.response_time_p95 !== undefined) {
      if (typeof response.performance.response_time_p95 !== 'number' || response.performance.response_time_p95 < 0) {
        issues.push('Performance response_time_p95 must be a positive number');
      }
    }

    if (response.resources?.memory?.utilization_percent !== undefined) {
      if (typeof response.resources.memory.utilization_percent !== 'number' ||
          response.resources.memory.utilization_percent < 0 ||
          response.resources.memory.utilization_percent > 100) {
        issues.push('Memory utilization_percent must be between 0 and 100');
      }
    }

    if (response.statistics?.error_rate_percent !== undefined) {
      if (typeof response.statistics.error_rate_percent !== 'number' ||
          response.statistics.error_rate_percent < 0 ||
          response.statistics.error_rate_percent > 100) {
        issues.push('Error rate percent must be between 0 and 100');
      }
    }

    return {
      valid: missing.length === 0 && issues.length === 0,
      missing,
      issues
    };
  }

  generateFieldCoverageReport(response: any): string {
    const validation = this.validateHealthResponse(response);

    let report = '🏥 HEALTH CHECK FIELD COVERAGE REPORT\n';
    report += '='.repeat(50) + '\n\n';

    report += `✅ VALID: ${validation.valid ? 'YES' : 'NO'}\n\n`;

    if (validation.missing.length > 0) {
      report += `❌ MISSING FIELDS (${validation.missing.length}):\n`;
      validation.missing.forEach(field => {
        report += `   - ${field}\n`;
      });
      report += '\n';
    }

    if (validation.issues.length > 0) {
      report += `⚠️  DATA VALIDATION ISSUES (${validation.issues.length}):\n`;
      validation.issues.forEach(issue => {
        report += `   - ${issue}\n`;
      });
      report += '\n';
    }

    // Field presence summary
    const totalFields = this.requiredFields.length +
                       this.requiredSystemFields.length +
                       this.requiredPerformanceFields.length +
                       this.requiredResourceFields.length;

    const presentFields = totalFields - validation.missing.length;

    report += `📊 FIELD COVERAGE SUMMARY:\n`;
    report += `   Present: ${presentFields}/${totalFields} (${Math.round((presentFields/totalFields)*100)}%)\n`;
    report += `   Missing: ${validation.missing.length}\n`;
    report += `   Issues: ${validation.issues.length}\n\n`;

    // Detailed field breakdown
    report += `🔍 FIELD BREAKDOWN:\n`;
    report += `   Root Fields: ${this.requiredFields.filter(f => f in response).length}/${this.requiredFields.length}\n`;
    report += `   System Fields: ${this.requiredSystemFields.filter(f => f in (response.system || {})).length}/${this.requiredSystemFields.length}\n`;
    report += `   Performance Fields: ${this.requiredPerformanceFields.filter(f => f in (response.performance || {})).length}/${this.requiredPerformanceFields.length}\n`;
    report += `   Resource Fields: ${this.requiredResourceFields.filter(f => f in (response.resources || {})).length}/${this.requiredResourceFields.length}\n\n`;

    if (validation.valid) {
      report += '🎉 ALL REQUIRED FIELDS PRESENT AND VALID!\n';
    } else {
      report += '⚠️  ACTION REQUIRED: Missing fields must be added to health check response.\n';
    }

    return report;
  }
}

// Test the validator with sample health response
if (import.meta.main) {
  // Sample health response structure
  const sampleHealthResponse = {
    status: "warning",
    timestamp: "2025-12-20T01:55:24.182Z",
    system: {
      service: "registry-powered-mcp",
      version: "2.4.1",
      tier: "hardened",
      runtime: "bun-1.3.6_STABLE",
      region: "NODE_ORD_01",
      environment: "production"
    },
    infrastructure: {
      lattice_status: "synchronized",
      topology_verified: true,
      active_pop_count: 300,
      total_pop_count: 300,
      registry_status: "operational"
    },
    performance: {
      last_check: "2025-12-20T01:55:24.182Z",
      performance_health: "warning",
      response_time_p95: 16.58,
      throughput_current: 251,
      error_rate_percent: 1,
      status: "needs_attention",
      memory_health: "warning",
      connection_health: "excellent",
      socket_efficiency_percent: 100
    },
    resources: {
      memory: {
        used_mb: 2,
        total_mb: 10,
        external_mb: 0,
        rss_mb: 25,
        utilization_percent: 20,
        array_buffers_mb: 0
      },
      cpu: {
        usage_percent: 0,
        load_average: 0
      },
      uptime_seconds: 3,
      uptime_formatted: "3s",
      process_id: 12345,
      parent_process_id: null,
      node_version: "1.3.6_STABLE",
      platform: "darwin",
      architecture: "arm64",
      hostname: "unknown"
    },
    connections: {
      http_agent: {
        active_sockets: 0,
        free_sockets: 0,
        total_sockets: 0
      },
      https_agent: {
        active_sockets: 0,
        free_sockets: 0,
        total_sockets: 0
      }
    },
    security: {
      url_validation: "active",
      connection_pooling: "enabled",
      proxy_headers: "not_configured",
      cookie_security: "chips_enabled",
      parameter_validation: "enhanced",
      kqueue_protection: "active",
      request_limiting: "enabled",
      ssl_tls: "optional"
    },
    cache: {
      header_cache_size: 1,
      response_cache_size: 0,
      cookie_cache_size: 0,
      total_cached_items: 1,
      cache_hit_ratio_estimate: "high"
    },
    requests: {
      active_connections: 1,
      max_connections: 100,
      connection_utilization_percent: 1,
      rate_limit_window_seconds: 60,
      rate_limit_max_requests: 1000,
      total_routes: 4,
      total_servers: 2
    },
    statistics: {
      total_requests: 1,
      successful_requests: 1,
      failed_requests: 0,
      error_rate_percent: 0,
      average_response_time_ms: 0,
      success_rate_percent: 100
    },
    build: {
      git_commit: "unknown",
      build_timestamp: "2025-12-20T01:55:24.182Z",
      environment: "production",
      region: "NODE_ORD_01",
      cluster: "default",
      deployment_id: "local"
    },
    dependencies: {
      redis_cache: "not_configured",
      proxy_service: "not_configured",
      metrics_backend: "internal",
      logging_service: "internal",
      health_checks: "enabled"
    },
    capabilities: {
      url_pattern_matching: "enhanced",
      health_monitoring: "comprehensive",
      security_validation: "enterprise",
      connection_pooling: "optimized",
      memory_management: "advanced",
      telemetry_collection: "real-time",
      error_handling: "robust",
      rate_limiting: "enabled"
    },
    lattice: {
      servers: 2,
      routes: 4,
      route_patterns: [
        {
          pattern: "/mcp/health",
          method: "GET",
          complexity: "optimized"
        },
        {
          pattern: "/mcp/metrics",
          method: "GET",
          complexity: "optimized"
        },
        {
          pattern: "/mcp/registry/:scope?/:name",
          method: "GET",
          complexity: "optimized"
        },
        {
          pattern: "/",
          method: "GET",
          complexity: "optimized"
        }
      ]
    },
    issues: [],
    warnings: [
      "WARNING: High memory usage: 75% of heap utilized (2MB)",
      "NOTICE: Elevated P95 latency: 16.58ms",
      "SYSTEM STARTUP: Very recently started - metrics may be inaccurate",
      "RECOMMENDATIONS: Monitor: Check for memory leaks, consider GC tuning | Optimize: Consider caching strategies for frequent requests | Wait: Allow 5+ minutes for system warmup and metric stabilization"
    ],
    actions_taken: [
      "Warmup period: Using conservative thresholds"
    ],
    indicators: {
      memory_ok: false,
      performance_ok: true,
      connections_ok: true,
      security_ok: true
    }
  };

  const validator = new HealthFieldValidator();
  const report = validator.generateFieldCoverageReport(sampleHealthResponse);
  console.log(report);
}
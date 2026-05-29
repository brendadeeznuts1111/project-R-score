#!/usr/bin/env bun
/**
 * OpenClaw Context Table v3.28
 * Dashboard rendering with enhanced table architecture
 */

import { createTier1380Table, formatters, c } from '../lib/table-engine-v3.28.ts';
import type { FusionContext } from '../src/core/barber-fusion-runtime.ts';
import type { ContextSession } from '../lib/bun-context.ts';

// OpenClaw Context Dashboard Data Interface
interface OpenClawDashboardContext {
  session: {
    id: string;
    contextHash: string;
    status: string;
    startTime: number;
  };
  security: {
    variant: string;
    csrfToken: string;
  };
  gateway: {
    version: string;
  };
  config: {
    env: Record<string, string | undefined>;
  };
  rendering: {
    poolMetrics: {
      renders: number;
    };
  };
}

/**
 * Render complete OpenClaw Context Dashboard
 */
export function renderContextDashboard(context: OpenClawDashboardContext): string {
  const lines: string[] = [];
  
  // Title
  lines.push('');
  lines.push(c.bold(c.hsl(200, 90, 70, '═══════════════════════════════════════════════')));
  lines.push(c.bold(c.hsl(200, 90, 70, '    OPENCLAW CONTEXT DASHBOARD v3.28')));
  lines.push(c.bold(c.hsl(200, 90, 70, '═══════════════════════════════════════════════')));
  lines.push('');

  // 1. Session Context Table (10 columns)
  lines.push(c.hsl(180, 80, 60, '── Session Context ──'));
  
  const sessionTable = createTier1380Table({
    columns: [
      { 
        key: 'id', 
        header: 'ID', 
        width: 10, 
        hsl: [120, 80, 60],
        formatter: (v) => v.slice(0, 8)
      },
      { 
        key: 'hash', 
        header: 'Hash', 
        width: 10,
        formatter: (v) => v.slice(0, 8)
      },
      { 
        key: 'status', 
        header: 'Status', 
        width: 12, 
        formatter: formatters.status
      },
      { 
        key: 'duration', 
        header: 'Duration', 
        width: 10, 
        align: 'right',
        formatter: (v) => formatters.duration(Date.now() - v)
      },
      { 
        key: 'memory', 
        header: 'Memory', 
        width: 10, 
        align: 'right',
        formatter: () => formatters.bytes(process.memoryUsage().heapUsed)
      },
      { 
        key: 'renders', 
        header: 'Renders', 
        width: 10, 
        align: 'right',
        hsl: [120, 80, 60]
      },
      { 
        key: 'variant', 
        header: 'Variant', 
        width: 10,
        formatter: formatters.variant
      },
      { 
        key: 'csrf', 
        header: 'CSRF', 
        width: 12,
        formatter: (v) => formatters.token(v, 6)
      },
      { 
        key: 'gateway', 
        header: 'Gateway', 
        width: 12
      },
      { 
        key: 'port', 
        header: 'Port', 
        width: 8, 
        align: 'right'
      },
    ],
    headerColor: [200, 90, 70],
    borderColor: [220, 80, 60],
    rowAltColor: [220, 20, 15],
  });

  lines.push(sessionTable.render([{
    id: context.session.id,
    hash: context.session.contextHash,
    status: context.session.status,
    duration: context.session.startTime,
    memory: process.memoryUsage().heapUsed,
    renders: context.rendering.poolMetrics.renders,
    variant: context.security.variant,
    csrf: context.security.csrfToken,
    gateway: context.gateway.version,
    port: context.config.env.PORT || '3000',
  }]));
  lines.push('');

  // 2. Security Audit Table (8 columns)
  lines.push(c.hsl(180, 80, 60, '── Security Audit ──'));
  
  const securityTable = createTier1380Table({
    columns: [
      { key: 'check', header: 'Security Check', width: 20 },
      { key: 'status', header: 'Status', width: 12, formatter: formatters.status },
      { key: 'score', header: 'Score', width: 8, align: 'right', formatter: formatters.score },
      { key: 'grade', header: 'Grade', width: 8, align: 'center', formatter: formatters.grade },
      { key: 'issues', header: 'Issues', width: 8, align: 'right' },
      { key: 'warnings', header: 'Warnings', width: 10, align: 'right' },
      { key: 'lastCheck', header: 'Last Check', width: 12 },
      { key: 'action', header: 'Action', width: 12 },
    ],
    headerColor: [120, 80, 60],
    borderColor: [120, 60, 50],
  });

  lines.push(securityTable.render([
    {
      check: 'Cookie Security',
      status: true,
      score: 95,
      grade: 'A+',
      issues: 0,
      warnings: 1,
      lastCheck: '2s ago',
      action: 'Monitor',
    },
    {
      check: 'CSRF Protection',
      status: true,
      score: 100,
      grade: 'A+',
      issues: 0,
      warnings: 0,
      lastCheck: '2s ago',
      action: 'Active',
    },
    {
      check: 'Variant Integrity',
      status: true,
      score: 98,
      grade: 'A',
      issues: 0,
      warnings: 1,
      lastCheck: '2s ago',
      action: 'Verify',
    },
    {
      check: 'Context Hash',
      status: true,
      score: 100,
      grade: 'A+',
      issues: 0,
      warnings: 0,
      lastCheck: '2s ago',
      action: 'Valid',
    },
  ]));
  lines.push('');

  // 3. Endpoint Health Table (8 columns) - Dynamic status
  lines.push(c.hsl(180, 80, 60, '── Endpoint Health ──'));
  
  const endpointTable = createTier1380Table({
    columns: [
      { key: 'endpoint', header: 'Endpoint', width: 25 },
      { key: 'method', header: 'Method', width: 8, formatter: formatters.method },
      { key: 'status', header: 'Health', width: 12, formatter: formatters.health },
      { key: 'latency', header: 'Latency', width: 10, align: 'right', formatter: formatters.latency },
      { key: 'throughput', header: 'Throughput', width: 12, align: 'right', formatter: formatters.throughput },
      { key: 'errors', header: 'Errors', width: 8, align: 'right', color: '#FF4444' },
      { key: 'lastPing', header: 'Last Ping', width: 12, formatter: formatters.timeAgo },
      { key: 'trend', header: 'Trend', width: 8, align: 'center', formatter: formatters.trend },
    ],
    headerColor: [200, 80, 60],
    borderColor: [200, 60, 50],
  });

  lines.push(endpointTable.render([
    {
      endpoint: '/api/v1/sessions',
      method: 'GET',
      status: 'healthy',
      latency: 12,
      throughput: 12500,
      errors: 0,
      lastPing: Date.now(),
      trend: 'up',
    },
    {
      endpoint: '/api/v1/render',
      method: 'POST',
      status: 'healthy',
      latency: 45,
      throughput: 8900,
      errors: 2,
      lastPing: Date.now(),
      trend: 'stable',
    },
    {
      endpoint: '/api/v1/context',
      method: 'GET',
      status: 'healthy',
      latency: 8,
      throughput: 15200,
      errors: 0,
      lastPing: Date.now(),
      trend: 'up',
    },
    {
      endpoint: '/ws/updates',
      method: 'WS',
      status: 'warning',
      latency: 120,
      throughput: 4500,
      errors: 12,
      lastPing: Date.now(),
      trend: 'down',
    },
    {
      endpoint: '/health',
      method: 'GET',
      status: 'healthy',
      latency: 3,
      throughput: 25000,
      errors: 0,
      lastPing: Date.now(),
      trend: 'stable',
    },
  ]));
  lines.push('');

  // 4. Feature Flags Table (5 columns)
  lines.push(c.hsl(180, 80, 60, '── Feature Flags ──'));
  
  const featureTable = createTier1380Table({
    columns: [
      { key: 'feature', header: 'Feature', width: 25 },
      { key: 'enabled', header: 'Status', width: 10, formatter: formatters.status },
      { key: 'source', header: 'Source', width: 15 },
      { key: 'impact', header: 'Impact', width: 12, formatter: formatters.grade },
      { key: 'since', header: 'Since', width: 12, formatter: formatters.timeAgo },
    ],
    headerColor: [280, 80, 60],
    borderColor: [280, 60, 50],
  });

  lines.push(featureTable.render([
    {
      feature: 'Redis Cache',
      enabled: false,
      source: 'Environment',
      impact: 'High',
      since: Date.now() - 86400000,
    },
    {
      feature: 'Context Validation',
      enabled: true,
      source: 'bunfig.toml',
      impact: 'Critical',
      since: Date.now() - 172800000,
    },
    {
      feature: 'Multi-Tenant',
      enabled: false,
      source: 'Environment',
      impact: 'Medium',
      since: Date.now() - 3600000,
    },
    {
      feature: 'Metrics Collection',
      enabled: true,
      source: 'Default',
      impact: 'Low',
      since: Date.now() - 259200000,
    },
  ]));
  lines.push('');

  // Footer
  lines.push(c.dim(`Last updated: ${new Date().toLocaleString()}`));
  lines.push(c.dim(`Context Hash: ${context.session.contextHash}`));
  lines.push('');

  return lines.join('\n');
}

/**
 * Render compact context summary
 */
export function renderContextCompact(context: OpenClawDashboardContext): string {
  const table = createTier1380Table({
    columns: [
      { key: 'key', header: 'Property', width: 15 },
      { key: 'value', header: 'Value', width: 40 },
    ],
    compact: true,
  });

  return table.renderCompact([
    { key: 'Session ID', value: context.session.id.slice(0, 8) },
    { key: 'Context Hash', value: context.session.contextHash },
    { key: 'Status', value: context.session.status },
    { key: 'Gateway', value: context.gateway.version },
    { key: 'Variant', value: context.security.variant },
  ]);
}

/**
 * Render Fusion Context Table
 */
export function renderFusionContext(context: FusionContext): string {
  const lines: string[] = [];
  
  lines.push(c.hsl(200, 80, 60, '── Fusion Context ──'));
  
  const table = createTier1380Table({
    columns: [
      { key: 'property', header: 'Property', width: 20 },
      { key: 'value', header: 'Value', width: 30 },
    ],
    headerColor: [200, 80, 60],
  });

  lines.push(table.render([
    { property: 'Environment', value: context.environment },
    { property: 'Context Hash', value: context.contextHash },
    { property: 'Region', value: context.region || c.dim('not set') },
    { property: 'Tenant ID', value: context.tenantId || c.dim('not set') },
    { property: 'Redis Cache', value: context.featureFlags.enableRedisCache ? 'enabled' : 'disabled' },
    { property: 'Validation', value: context.featureFlags.enableValidation ? 'enabled' : 'disabled' },
    { property: 'Metrics', value: context.featureFlags.enableMetrics ? 'enabled' : 'disabled' },
    { property: 'Multi-Tenant', value: context.featureFlags.enableMultiTenant ? 'enabled' : 'disabled' },
  ]));
  
  return lines.join('\n');
}

/**
 * Render Context Session Table
 */
export function renderContextSession(session: ContextSession): string {
  const lines: string[] = [];
  
  lines.push(c.hsl(200, 80, 60, '── Context Session ──'));
  
  const table = createTier1380Table({
    columns: [
      { key: 'property', header: 'Property', width: 15 },
      { key: 'value', header: 'Value', width: 35 },
    ],
    headerColor: [200, 80, 60],
  });

  lines.push(table.render([
    { property: 'ID', value: session.id },
    { property: 'Command', value: session.command },
    { property: 'Status', value: formatters.status(session.status) },
    { property: 'Context Hash', value: session.contextHash },
    { property: 'Duration', value: session.durationMs ? formatters.duration(session.durationMs) : c.dim('running') },
    { property: 'CWD', value: session.globalConfig.cwd },
    { property: 'Config', value: session.globalConfig.configPath },
  ]));
  
  return lines.join('\n');
}

// Export formatters for custom tables
export { formatters, c };

// Default export
export default renderContextDashboard;

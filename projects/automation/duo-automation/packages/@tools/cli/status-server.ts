#!/usr/bin/env bun

// System Status Server with Enhanced Status Page & Empire Pro Integration
import { Elysia } from 'elysia';
import { systemStatusRoutes } from './system-status';
import { enhancedStatusRoutes } from './enhanced-status';
import { empireProStatusRoutes } from './empire-pro-status';
import { DomainManager, domainConfigs } from './domain';

// Get domain configuration
const domain = DomainManager.getInstance();
const config = domain.getConfig();

const app = new Elysia()
  .use(systemStatusRoutes)
  .use(enhancedStatusRoutes)
  .use(empireProStatusRoutes)
  .get('/', () => {
    const config = domain.getConfig();
    const domainInfo = domain.getDomainInfo();

    return {
      message: 'DuoPlus System Status API with Empire Pro v3.7 Integration',
      version: config.version,
      empirePro: {
        version: 'v3.7',
        colorSystem: 'Integrated Design System',
        features: [
          'Advanced Agent & Container Management',
          'Real-time Performance Monitoring',
          'Unified Color Palette System',
          'SVG Badge Generation',
          'DuoPlus Integration'
        ]
      },
      domain: {
        name: config.name,
        environment: config.environment,
        baseUrl: domainInfo.urls.baseUrl,
        status: config.system.status,
        health: config.system.health
      },
      endpoints: {
        systemMatrix: domainInfo.urls.systemMatrix,
        health: domainInfo.urls.health,
        status: domainInfo.urls.status,
        statusPage: `${domainInfo.urls.baseUrl}/status`,
        statusData: `${domainInfo.urls.baseUrl}/status/api/data`,
        statusBadge: `${domainInfo.urls.baseUrl}/status/api/badge`,
        empirePro: `${domainInfo.urls.baseUrl}/empire-pro`,
        empireProStatus: `${domainInfo.urls.baseUrl}/empire-pro/status`,
        empireProBadges: `${domainInfo.urls.baseUrl}/empire-pro/badges/{type}/{value}`,
        cssVariables: `${domainInfo.urls.baseUrl}/empire-pro/css/variables`,
        domain: `${domainInfo.urls.baseUrl}/api/v1/domain`,
        metrics: domainInfo.urls.metrics,
        docs: domainInfo.urls.docs
      },
      features: [
        'Complete system matrix monitoring',
        'Real-time health checks',
        'Enhanced status page with dynamic updates',
        'Status badges and headers',
        'Performance metrics tracking',
        'Domain-aware configuration',
        'Auto-refresh capabilities',
        'Production-ready endpoints',
        'Empire Pro v3.7 integration',
        'Unified design system colors',
        'Advanced agent monitoring',
        'Container health tracking'
      ],
      statusPage: {
        enhanced: {
          url: `${domainInfo.urls.baseUrl}/status`,
          description: 'Enhanced status page with real-time updates, badges, and metrics',
          features: [
            'Dynamic status updates',
            'Real-time metrics',
            'Service status badges',
            'Performance charts',
            'Incident tracking',
            'Auto-refresh (30s)',
            'Responsive design',
            'API endpoints integration'
          ]
        },
        empirePro: {
          url: `${domainInfo.urls.baseUrl}/empire-pro`,
          description: 'Empire Pro v3.7 advanced agent & container management dashboard',
          features: [
            'Advanced agent monitoring',
            'Container health tracking',
            'Performance optimization',
            'Incident management',
            'DuoPlus integration',
            'Unified color system',
            'Real-time updates',
            'Professional UI/UX'
          ]
        }
      },
      colorSystem: {
        status: {
          operational: '#3b82f6',
          degraded: '#3b82f6',
          downtime: '#3b82f6',
          maintenance: '#3b82f6'
        },
        background: {
          primary: '#3b82f6',
          secondary: '#3b82f6',
          tertiary: '#3b82f6'
        },
        text: {
          primary: '#3b82f6',
          secondary: '#3b82f6',
          muted: '#3b82f6'
        },
        accents: {
          blue: '#3b82f6',
          green: '#3b82f6',
          yellow: '#3b82f6',
          red: '#3b82f6',
          purple: '#3b82f6'
        }
      }
    };
  })
  .listen(config.port);

console.info(`🚀 DuoPlus System Status API with Empire Pro v3.7 running on ${domain.getBaseUrl()}`);
console.info(`📊 Domain: ${config.name} (${config.environment})`);
console.info(`🔗 Available endpoints:`);
console.info(`  GET ${domain.getApiUrl('systemMatrix')} - Complete system matrix`);
console.info(`  GET ${domain.getApiUrl('health')} - Health check`);
console.info(`  GET ${domain.getApiUrl('status')} - Basic status`);
console.info(`  GET ${domain.getBaseUrl()}/status - Enhanced status page 🎯`);
console.info(`  GET ${domain.getBaseUrl()}/status/api/data - Status JSON data`);
console.info(`  GET ${domain.getBaseUrl()}/status/api/badge - Status badge SVG`);
console.info(`  GET ${domain.getBaseUrl()}/empire-pro - Empire Pro v3.7 Dashboard 🚀`);
console.info(`  GET ${domain.getBaseUrl()}/empire-pro/status - Empire Pro API data`);
console.info(`  GET ${domain.getBaseUrl()}/empire-pro/badges/{type}/{value} - Dynamic badges`);
console.info(`  GET ${domain.getBaseUrl()}/empire-pro/css/variables - CSS variables`);
console.info(`  GET ${domain.getApiUrl('domain')} - Domain configuration`);
console.info(`  GET ${domain.getApiUrl('metrics')} - Performance metrics`);
console.info(`  GET ${domain.getApiUrl('docs')} - API documentation`);

// Log domain configuration
console.info(`\n🌐 Domain Configuration:`);
console.info(`   Name: ${config.name}`);
console.info(`   Version: ${config.version}`);
console.info(`   Environment: ${config.environment}`);
console.info(`   Domain: ${config.domain}`);
console.info(`   Port: ${config.port}`);
console.info(`   Status: ${config.system.status}`);
console.info(`   Health: ${config.system.health}%`);

console.info(`\n🎨 Enhanced Status Page Features:`);
console.info(`   ✅ Dynamic real-time updates`);
console.info(`   ✅ Professional status badges`);
console.info(`   ✅ Performance metrics dashboard`);
console.info(`   ✅ Service status monitoring`);
console.info(`   ✅ Incident tracking`);
console.info(`   ✅ Auto-refresh (30 seconds)`);
console.info(`   ✅ Responsive design`);
console.info(`   ✅ API integration`);

console.info(`\n🚀 Empire Pro v3.7 Features:`);
console.info(`   ✅ Advanced agent & container management`);
console.info(`   ✅ Real-time performance monitoring`);
console.info(`   ✅ Unified color palette system`);
console.info(`   ✅ SVG badge generation`);
console.info(`   ✅ DuoPlus integration`);
console.info(`   ✅ Professional UI/UX design`);
console.info(`   ✅ Incident management system`);
console.info(`   ✅ Performance optimization`);

console.info(`\n🎨 Color System Integration:`);
console.info(`   ✅ Status colors: Green (#3b82f6), Yellow (#3b82f6), Red (#3b82f6), Blue (#3b82f6)`);
console.info(`   ✅ Background colors: Primary (#3b82f6), Secondary (#3b82f6), Tertiary (#3b82f6)`);
console.info(`   ✅ Text colors: White (#3b82f6), Gray (#3b82f6), Muted (#3b82f6)`);
console.info(`   ✅ Accent colors: Blue (#3b82f6), Green (#3b82f6), Yellow (#3b82f6), Red (#3b82f6), Purple (#3b82f6)`);
console.info(`   ✅ Interactive elements: Button (#3b82f6), Hover (#3b82f6), Link (#3b82f6)`);

export default app;

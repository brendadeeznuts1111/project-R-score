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

console.log(`🚀 DuoPlus System Status API with Empire Pro v3.7 running on ${domain.getBaseUrl()}`);
console.log(`📊 Domain: ${config.name} (${config.environment})`);
console.log(`🔗 Available endpoints:`);
console.log(`  GET ${domain.getApiUrl('systemMatrix')} - Complete system matrix`);
console.log(`  GET ${domain.getApiUrl('health')} - Health check`);
console.log(`  GET ${domain.getApiUrl('status')} - Basic status`);
console.log(`  GET ${domain.getBaseUrl()}/status - Enhanced status page 🎯`);
console.log(`  GET ${domain.getBaseUrl()}/status/api/data - Status JSON data`);
console.log(`  GET ${domain.getBaseUrl()}/status/api/badge - Status badge SVG`);
console.log(`  GET ${domain.getBaseUrl()}/empire-pro - Empire Pro v3.7 Dashboard 🚀`);
console.log(`  GET ${domain.getBaseUrl()}/empire-pro/status - Empire Pro API data`);
console.log(`  GET ${domain.getBaseUrl()}/empire-pro/badges/{type}/{value} - Dynamic badges`);
console.log(`  GET ${domain.getBaseUrl()}/empire-pro/css/variables - CSS variables`);
console.log(`  GET ${domain.getApiUrl('domain')} - Domain configuration`);
console.log(`  GET ${domain.getApiUrl('metrics')} - Performance metrics`);
console.log(`  GET ${domain.getApiUrl('docs')} - API documentation`);

// Log domain configuration
console.log(`\n🌐 Domain Configuration:`);
console.log(`   Name: ${config.name}`);
console.log(`   Version: ${config.version}`);
console.log(`   Environment: ${config.environment}`);
console.log(`   Domain: ${config.domain}`);
console.log(`   Port: ${config.port}`);
console.log(`   Status: ${config.system.status}`);
console.log(`   Health: ${config.system.health}%`);

console.log(`\n🎨 Enhanced Status Page Features:`);
console.log(`   ✅ Dynamic real-time updates`);
console.log(`   ✅ Professional status badges`);
console.log(`   ✅ Performance metrics dashboard`);
console.log(`   ✅ Service status monitoring`);
console.log(`   ✅ Incident tracking`);
console.log(`   ✅ Auto-refresh (30 seconds)`);
console.log(`   ✅ Responsive design`);
console.log(`   ✅ API integration`);

console.log(`\n🚀 Empire Pro v3.7 Features:`);
console.log(`   ✅ Advanced agent & container management`);
console.log(`   ✅ Real-time performance monitoring`);
console.log(`   ✅ Unified color palette system`);
console.log(`   ✅ SVG badge generation`);
console.log(`   ✅ DuoPlus integration`);
console.log(`   ✅ Professional UI/UX design`);
console.log(`   ✅ Incident management system`);
console.log(`   ✅ Performance optimization`);

console.log(`\n🎨 Color System Integration:`);
console.log(`   ✅ Status colors: Green (#3b82f6), Yellow (#3b82f6), Red (#3b82f6), Blue (#3b82f6)`);
console.log(`   ✅ Background colors: Primary (#3b82f6), Secondary (#3b82f6), Tertiary (#3b82f6)`);
console.log(`   ✅ Text colors: White (#3b82f6), Gray (#3b82f6), Muted (#3b82f6)`);
console.log(`   ✅ Accent colors: Blue (#3b82f6), Green (#3b82f6), Yellow (#3b82f6), Red (#3b82f6), Purple (#3b82f6)`);
console.log(`   ✅ Interactive elements: Button (#3b82f6), Hover (#3b82f6), Link (#3b82f6)`);

export default app;

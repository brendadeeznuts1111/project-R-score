#!/usr/bin/env bun
/**
 * 📊 Monitoring Service for URL Structure Migration
 * 
 * Real-time monitoring of metrics, error rates, and user satisfaction
 * during the URL structure migration with feature flags
 */

import { serve } from "bun";

/**
 * 🚀 Prefetch Optimizations
 * 
 * This file includes prefetch hints for optimal performance:
 * - DNS prefetching for external domains
 * - Preconnect for faster handshakes
 * - Resource preloading for critical assets
 * 
 * Generated automatically by optimize-examples-prefetch.ts
 */

// Configuration
const MONITORING_CONFIG = {
  port: 3002,
  alertThresholds: {
    errorRate: 5.0, // 5%
    responseTime: 500, // 500ms
    userSatisfaction: 4.0, // 4.0/5
    redirectFailureRate: 2.0 // 2%
  },
  metricsWindow: 300000, // 5 minutes
  checkInterval: 60000 // 1 minute
};

// Metrics storage
const metrics = {
  requests: [] as Array<{
    timestamp: number;
    method: string;
    url: string;
    statusCode: number;
    responseTime: number;
    userAgent: string;
    userId?: string;
    variant?: string;
  }>,
  errors: [] as Array<{
    timestamp: number;
    error: string;
    url: string;
    statusCode: number;
    userId?: string;
    variant?: string;
  }>,
  redirects: [] as Array<{
    timestamp: number;
    from: string;
    to: string;
    statusCode: number;
    success: boolean;
  }>,
  satisfaction: [] as Array<{
    timestamp: number;
    rating: number;
    userId?: string;
    variant?: string;
    feedback?: string;
  }>,
  alerts: [] as Array<{
    timestamp: number;
    type: 'error' | 'warning' | 'info';
    message: string;
    metric: string;
    value: number;
    threshold: number;
  }>
};

// Feature flag status
let featureFlags = {
  'direct-urls-enabled': false,
  'fragment-redirects': false,
  'ab-testing-active': false,
  'canary-deployment': false
};

// Calculate metrics
function calculateMetrics() {
  const now = Date.now();
  const windowStart = now - MONITORING_CONFIG.metricsWindow;
  
  // Filter metrics within time window
  const recentRequests = metrics.requests.filter(r => r.timestamp >= windowStart);
  const recentErrors = metrics.errors.filter(e => e.timestamp >= windowStart);
  const recentRedirects = metrics.redirects.filter(r => r.timestamp >= windowStart);
  const recentSatisfaction = metrics.satisfaction.filter(s => s.timestamp >= windowStart);
  
  // Calculate rates
  const totalRequests = recentRequests.length;
  const totalErrors = recentErrors.length;
  const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;
  
  const avgResponseTime = recentRequests.length > 0
    ? recentRequests.reduce((sum, r) => sum + r.responseTime, 0) / recentRequests.length
    : 0;
  
  const successfulRedirects = recentRedirects.filter(r => r.success).length;
  const redirectSuccessRate = recentRedirects.length > 0 
    ? (successfulRedirects / recentRedirects.length) * 100 
    : 0;
  
  const avgSatisfaction = recentSatisfaction.length > 0
    ? recentSatisfaction.reduce((sum, s) => sum + s.rating, 0) / recentSatisfaction.length
    : 0;
  
  // Calculate by variant
  const variantMetrics = {
    control: { requests: 0, errors: 0, avgResponseTime: 0, satisfaction: 0 },
    treatment: { requests: 0, errors: 0, avgResponseTime: 0, satisfaction: 0 }
  };
  
  recentRequests.forEach(req => {
    if (req.variant) {
      variantMetrics[req.variant as keyof typeof variantMetrics].requests++;
    }
  });
  
  recentErrors.forEach(error => {
    if (error.variant) {
      variantMetrics[error.variant as keyof typeof variantMetrics].errors++;
    }
  });
  
  // Calculate variant-specific metrics
  Object.keys(variantMetrics).forEach(variant => {
    const variantRequests = recentRequests.filter(r => r.variant === variant);
    const variantSatisfaction = recentSatisfaction.filter(s => s.variant === variant);
    
    variantMetrics[variant as keyof typeof variantMetrics].avgResponseTime = 
      variantRequests.length > 0 
        ? variantRequests.reduce((sum, r) => sum + r.responseTime, 0) / variantRequests.length
        : 0;
    
    variantMetrics[variant as keyof typeof variantMetrics].satisfaction = 
      variantSatisfaction.length > 0
        ? variantSatisfaction.reduce((sum, s) => sum + s.rating, 0) / variantSatisfaction.length
        : 0;
  });
  
  return {
    timestamp: now,
    window: MONITORING_CONFIG.metricsWindow,
    total: {
      requests: totalRequests,
      errors: totalErrors,
      errorRate,
      avgResponseTime,
      redirectSuccessRate,
      avgSatisfaction
    },
    byVariant: variantMetrics,
    featureFlags
  };
}

// Check for alerts
function checkAlerts() {
  const currentMetrics = calculateMetrics();
  const alerts = [];
  
  // Error rate alert
  if (currentMetrics.total.errorRate > MONITORING_CONFIG.alertThresholds.errorRate) {
    alerts.push({
      timestamp: Date.now(),
      type: 'error' as const,
      message: `High error rate detected: ${currentMetrics.total.errorRate.toFixed(2)}%`,
      metric: 'errorRate',
      value: currentMetrics.total.errorRate,
      threshold: MONITORING_CONFIG.alertThresholds.errorRate
    });
  }
  
  // Response time alert
  if (currentMetrics.total.avgResponseTime > MONITORING_CONFIG.alertThresholds.responseTime) {
    alerts.push({
      timestamp: Date.now(),
      type: 'warning' as const,
      message: `Slow response time: ${currentMetrics.total.avgResponseTime.toFixed(0)}ms`,
      metric: 'responseTime',
      value: currentMetrics.total.avgResponseTime,
      threshold: MONITORING_CONFIG.alertThresholds.responseTime
    });
  }
  
  // User satisfaction alert
  if (currentMetrics.total.avgSatisfaction > 0 && 
      currentMetrics.total.avgSatisfaction < MONITORING_CONFIG.alertThresholds.userSatisfaction) {
    alerts.push({
      timestamp: Date.now(),
      type: 'warning' as const,
      message: `Low user satisfaction: ${currentMetrics.total.avgSatisfaction.toFixed(2)}/5`,
      metric: 'userSatisfaction',
      value: currentMetrics.total.avgSatisfaction,
      threshold: MONITORING_CONFIG.alertThresholds.userSatisfaction
    });
  }
  
  // Redirect failure alert
  if (currentMetrics.total.redirectSuccessRate < (100 - MONITORING_CONFIG.alertThresholds.redirectFailureRate)) {
    alerts.push({
      timestamp: Date.now(),
      type: 'error' as const,
      message: `High redirect failure rate: ${(100 - currentMetrics.total.redirectSuccessRate).toFixed(2)}%`,
      metric: 'redirectFailureRate',
      value: 100 - currentMetrics.total.redirectSuccessRate,
      threshold: MONITORING_CONFIG.alertThresholds.redirectFailureRate
    });
  }
  
  // Store alerts
  alerts.forEach(alert => {
    if (!metrics.alerts.some(existing => 
      existing.metric === alert.metric && 
      (Date.now() - existing.timestamp) < 60000 // Avoid duplicate alerts within 1 minute
    )) {
      metrics.alerts.push(alert);
      console.log(`🚨 ALERT [${alert.type.toUpperCase()}]: ${alert.message}`);
    }
  });
  
  // Keep only recent alerts
  metrics.alerts = metrics.alerts.filter(a => Date.now() - a.timestamp < 3600000); // 1 hour
}

// Start monitoring server
const server = serve({
  port: MONITORING_CONFIG.port,
  async fetch(req) {
    const url = new URL(req.url);
    
    try {
      // CORS headers
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-ID, X-Variant',
      };
      
      if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
      }
      
      // Health check
      if (url.pathname === '/health') {
        return Response.json({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime()
        }, { headers: corsHeaders });
      }
      
      // Get current metrics
      if (url.pathname === '/metrics' && req.method === 'GET') {
        const currentMetrics = calculateMetrics();
        const recentAlerts = metrics.alerts.slice(-10); // Last 10 alerts
        
        return Response.json({
          ...currentMetrics,
          alerts: recentAlerts,
          thresholds: MONITORING_CONFIG.alertThresholds
        }, { headers: corsHeaders });
      }
      
      // Track request
      if (url.pathname === '/track' && req.method === 'POST') {
        const body = await req.json();
        
        const request = {
          timestamp: Date.now(),
          method: body.method || 'GET',
          url: body.url,
          statusCode: body.statusCode || 200,
          responseTime: body.responseTime || 0,
          userAgent: req.headers.get('User-Agent') || '',
          userId: req.headers.get('X-User-ID') || undefined,
          variant: req.headers.get('X-Variant') || undefined
        };
        
        metrics.requests.push(request);
        
        // Track error if status code indicates error
        if (request.statusCode >= 400) {
          metrics.errors.push({
            timestamp: Date.now(),
            error: `HTTP ${request.statusCode}`,
            url: request.url,
            statusCode: request.statusCode,
            userId: request.userId,
            variant: request.variant
          });
        }
        
        return Response.json({ success: true }, { headers: corsHeaders });
      }
      
      // Track redirect
      if (url.pathname === '/redirect' && req.method === 'POST') {
        const body = await req.json();
        
        const redirect = {
          timestamp: Date.now(),
          from: body.from,
          to: body.to,
          statusCode: body.statusCode || 301,
          success: body.success !== false
        };
        
        metrics.redirects.push(redirect);
        
        return Response.json({ success: true }, { headers: corsHeaders });
      }
      
      // Track satisfaction
      if (url.pathname === '/satisfaction' && req.method === 'POST') {
        const body = await req.json();
        
        const satisfaction = {
          timestamp: Date.now(),
          rating: body.rating,
          userId: req.headers.get('X-User-ID') || undefined,
          variant: req.headers.get('X-Variant') || undefined,
          feedback: body.feedback
        };
        
        metrics.satisfaction.push(satisfaction);
        
        return Response.json({ success: true }, { headers: corsHeaders });
      }
      
      // Update feature flags
      if (url.pathname === '/feature-flags' && req.method === 'POST') {
        const body = await req.json();
        
        if (body.flags) {
          featureFlags = { ...featureFlags, ...body.flags };
        }
        
        return Response.json({ 
          success: true, 
          flags: featureFlags 
        }, { headers: corsHeaders });
      }
      
      // Get alerts
      if (url.pathname === '/alerts' && req.method === 'GET') {
        const recentAlerts = metrics.alerts.slice(-20); // Last 20 alerts
        
        return Response.json({
          alerts: recentAlerts,
          total: metrics.alerts.length
        }, { headers: corsHeaders });
      }
      
      // Dashboard endpoint
      if (url.pathname === '/dashboard' && req.method === 'GET') {
        const currentMetrics = calculateMetrics();
        const recentAlerts = metrics.alerts.filter(a => 
          Date.now() - a.timestamp < 3600000 // Last hour
        );
        
        const dashboard = {
          status: currentMetrics.total.errorRate < MONITORING_CONFIG.alertThresholds.errorRate &&
                 currentMetrics.total.avgResponseTime < MONITORING_CONFIG.alertThresholds.responseTime &&
                 currentMetrics.total.avgSatisfaction >= MONITORING_CONFIG.alertThresholds.userSatisfaction
            ? 'healthy' : 'warning',
          metrics: currentMetrics,
          recentAlerts: recentAlerts.slice(-5),
          featureFlags,
          uptime: process.uptime(),
          lastUpdated: new Date().toISOString()
        };
        
        return Response.json(dashboard, { headers: corsHeaders });
      }
      
      return Response.json({ 
        error: 'Endpoint not found' 
      }, { 
        status: 404, 
        headers: corsHeaders 
      });
      
    } catch (error) {
      console.error('Monitoring Service Error:', error);
      return Response.json({ 
        error: 'Internal server error' 
      }, { 
        status: 500, 
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-ID, X-Variant',
        }
      });
    }
  }
});

// Start background monitoring
setInterval(() => {
  checkAlerts();
  
  // Clean old metrics
  const cutoff = Date.now() - MONITORING_CONFIG.metricsWindow * 4; // Keep 4x window
  metrics.requests = metrics.requests.filter(r => r.timestamp >= cutoff);
  metrics.errors = metrics.errors.filter(e => e.timestamp >= cutoff);
  metrics.redirects = metrics.redirects.filter(r => r.timestamp >= cutoff);
  metrics.satisfaction = metrics.satisfaction.filter(s => s.timestamp >= cutoff);
  
  console.log(`📊 Metrics: ${metrics.requests.length} requests, ${metrics.errors.length} errors, ${metrics.alerts.length} alerts`);
}, MONITORING_CONFIG.checkInterval);

console.log('📊 Monitoring Service running on http://example.com');
console.log('Endpoints:');
console.log('  GET  /health - Health check');
console.log('  GET  /metrics - Current metrics');
console.log('  POST /track - Track request metrics');
console.log('  POST /redirect - Track redirect metrics');
console.log('  POST /satisfaction - Track user satisfaction');
console.log('  POST /feature-flags - Update feature flags');
console.log('  GET  /alerts - Get recent alerts');
console.log('  GET  /dashboard - Dashboard data');
console.log(`\n📈 Monitoring every ${MONITORING_CONFIG.checkInterval/1000}s with ${MONITORING_CONFIG.metricsWindow/1000}s window`);

/**
 * 💡 Performance Tip: For better performance, consider:
 * 1. Using preconnect for frequently accessed domains
 * 2. Adding resource hints to your HTML head
 * 3. Implementing request caching
 * 4. Using the native fetch API with keep-alive
 */
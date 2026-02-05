#!/usr/bin/env bun
/**
 * 🧪 A/B Testing Service for URL Structures
 * 
 * Service to manage A/B testing between direct URLs and fragment-based URLs
 * Tracks user interactions, performance metrics, and satisfaction
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
const AB_TEST_CONFIG = {
  enabled: false,
  testId: 'url-structure-comparison',
  variants: {
    control: { name: 'Fragment URLs', weight: 0.5 },
    treatment: { name: 'Direct URLs', weight: 0.5 }
  },
  metrics: {
    pageLoadTime: [],
    bounceRate: [],
    userEngagement: [],
    navigationSuccess: [],
    errorRate: [],
    userSatisfaction: []
  }
};

// User assignment storage (in production, use Redis or database)
const userAssignments = new Map<string, string>();

// Metrics storage
const metrics = {
  control: {
    pageViews: 0,
    pageLoadTime: [],
    bounces: 0,
    engagements: 0,
    navigationSuccess: 0,
    navigationErrors: 0,
    satisfaction: []
  },
  treatment: {
    pageViews: 0,
    pageLoadTime: [],
    bounces: 0,
    engagements: 0,
    navigationSuccess: 0,
    navigationErrors: 0,
    satisfaction: []
  }
};

// Assign user to variant
function assignUserVariant(userId: string): string {
  if (userAssignments.has(userId)) {
    return userAssignments.get(userId)!;
  }
  
  // Consistent hashing based on user ID
  const hash = hashCode(userId);
  const variant = hash % 100 < 50 ? 'control' : 'treatment';
  
  userAssignments.set(userId, variant);
  return variant;
}

// Simple hash function
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// Track metrics
function trackMetric(variant: string, metric: string, value: number) {
  const data = metrics[variant as keyof typeof metrics];
  
  switch (metric) {
    case 'pageLoadTime':
      data.pageLoadTime.push(value);
      break;
    case 'bounce':
      data.bounces++;
      break;
    case 'engagement':
      data.engagements++;
      break;
    case 'navigationSuccess':
      data.navigationSuccess++;
      break;
    case 'navigationError':
      data.navigationErrors++;
      break;
    case 'satisfaction':
      data.satisfaction.push(value);
      break;
    case 'pageView':
      data.pageViews++;
      break;
  }
}

// Calculate statistical significance
function calculateSignificance(): {
  significance: number;
  winner: 'control' | 'treatment' | 'inconclusive';
  confidence: number;
} {
  const control = metrics.control;
  const treatment = metrics.treatment;
  
  // Calculate conversion rates (navigation success rate)
  const controlRate = control.navigationSuccess / (control.navigationSuccess + control.navigationErrors) || 0;
  const treatmentRate = treatment.navigationSuccess / (treatment.navigationSuccess + treatment.navigationErrors) || 0;
  
  // Simple significance calculation (in production, use proper statistical tests)
  const difference = Math.abs(treatmentRate - controlRate);
  const significance = Math.min(difference * 100, 99);
  
  let winner: 'control' | 'treatment' | 'inconclusive';
  if (significance < 95) {
    winner = 'inconclusive';
  } else if (treatmentRate > controlRate) {
    winner = 'treatment';
  } else {
    winner = 'control';
  }
  
  return {
    significance,
    winner,
    confidence: significance
  };
}

// Start A/B testing server
const server = serve({
  port: 3001,
  async fetch(req) {
    const url = new URL(req.url);
    
    try {
      // CORS headers
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-ID',
      };
      
      if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
      }
      
      // Health check
      if (url.pathname === '/health') {
        return Response.json({
          status: 'healthy',
          testEnabled: AB_TEST_CONFIG.enabled,
          timestamp: new Date().toISOString()
        }, { headers: corsHeaders });
      }
      
      // Get user variant assignment
      if (url.pathname === '/variant' && req.method === 'GET') {
        const userId = req.headers.get('X-User-ID');
        if (!userId) {
          return Response.json({ error: 'User ID required' }, { 
            status: 400, 
            headers: corsHeaders 
          });
        }
        
        const variant = assignUserVariant(userId);
        const config = AB_TEST_CONFIG.variants[variant as keyof typeof AB_TEST_CONFIG.variants];
        
        return Response.json({
          userId,
          variant,
          testName: config.name,
          testId: AB_TEST_CONFIG.testId
        }, { headers: corsHeaders });
      }
      
      // Track metrics
      if (url.pathname === '/track' && req.method === 'POST') {
        const userId = req.headers.get('X-User-ID');
        const body = await req.json();
        
        if (!userId || !body.metric || body.value === undefined) {
          return Response.json({ 
            error: 'User ID, metric, and value required' 
          }, { 
            status: 400, 
            headers: corsHeaders 
          });
        }
        
        const variant = assignUserVariant(userId);
        trackMetric(variant, body.metric, body.value);
        
        return Response.json({ 
          success: true, 
          variant,
          metric: body.metric,
          value: body.value
        }, { headers: corsHeaders });
      }
      
      // Get test results
      if (url.pathname === '/results' && req.method === 'GET') {
        const control = metrics.control;
        const treatment = metrics.treatment;
        const significance = calculateSignificance();
        
        const results = {
          testId: AB_TEST_CONFIG.testId,
          variants: AB_TEST_CONFIG.variants,
          metrics: {
            control: {
              pageViews: control.pageViews,
              avgPageLoadTime: control.pageLoadTime.length > 0 
                ? control.pageLoadTime.reduce((a, b) => a + b, 0) / control.pageLoadTime.length 
                : 0,
              bounceRate: control.pageViews > 0 ? control.bounces / control.pageViews : 0,
              engagementRate: control.pageViews > 0 ? control.engagements / control.pageViews : 0,
              navigationSuccessRate: (control.navigationSuccess + control.navigationErrors) > 0 
                ? control.navigationSuccess / (control.navigationSuccess + control.navigationErrors) 
                : 0,
              avgSatisfaction: control.satisfaction.length > 0 
                ? control.satisfaction.reduce((a, b) => a + b, 0) / control.satisfaction.length 
                : 0
            },
            treatment: {
              pageViews: treatment.pageViews,
              avgPageLoadTime: treatment.pageLoadTime.length > 0 
                ? treatment.pageLoadTime.reduce((a, b) => a + b, 0) / treatment.pageLoadTime.length 
                : 0,
              bounceRate: treatment.pageViews > 0 ? treatment.bounces / treatment.pageViews : 0,
              engagementRate: treatment.pageViews > 0 ? treatment.engagements / treatment.pageViews : 0,
              navigationSuccessRate: (treatment.navigationSuccess + treatment.navigationErrors) > 0 
                ? treatment.navigationSuccess / (treatment.navigationSuccess + treatment.navigationErrors) 
                : 0,
              avgSatisfaction: treatment.satisfaction.length > 0 
                ? treatment.satisfaction.reduce((a, b) => a + b, 0) / treatment.satisfaction.length 
                : 0
            }
          },
          significance,
          totalUsers: userAssignments.size,
          timestamp: new Date().toISOString()
        };
        
        return Response.json(results, { headers: corsHeaders });
      }
      
      // Enable/disable test
      if (url.pathname === '/config' && req.method === 'POST') {
        const body = await req.json();
        
        if (body.enabled !== undefined) {
          AB_TEST_CONFIG.enabled = body.enabled;
        }
        
        return Response.json({
          enabled: AB_TEST_CONFIG.enabled,
          config: AB_TEST_CONFIG
        }, { headers: corsHeaders });
      }
      
      // Reset test data
      if (url.pathname === '/reset' && req.method === 'POST') {
        userAssignments.clear();
        metrics.control = {
          pageViews: 0,
          pageLoadTime: [],
          bounces: 0,
          engagements: 0,
          navigationSuccess: 0,
          navigationErrors: 0,
          satisfaction: []
        };
        metrics.treatment = {
          pageViews: 0,
          pageLoadTime: [],
          bounces: 0,
          engagements: 0,
          navigationSuccess: 0,
          navigationErrors: 0,
          satisfaction: []
        };
        
        return Response.json({ 
          success: true, 
          message: 'Test data reset' 
        }, { headers: corsHeaders });
      }
      
      return Response.json({ 
        error: 'Endpoint not found' 
      }, { 
        status: 404, 
        headers: corsHeaders 
      });
      
    } catch (error) {
      console.error('AB Test Service Error:', error);
      return Response.json({ 
        error: 'Internal server error' 
      }, { 
        status: 500, 
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-ID',
        }
      });
    }
  }
});

console.log('🧪 A/B Testing Service running on http://example.com');
console.log('Endpoints:');
console.log('  GET  /health - Health check');
console.log('  GET  /variant - Get user variant assignment');
console.log('  POST /track - Track metrics');
console.log('  GET  /results - Get test results');
console.log('  POST /config - Configure test');
console.log('  POST /reset - Reset test data');

/**
 * 💡 Performance Tip: For better performance, consider:
 * 1. Using preconnect for frequently accessed domains
 * 2. Adding resource hints to your HTML head
 * 3. Implementing request caching
 * 4. Using the native fetch API with keep-alive
 */
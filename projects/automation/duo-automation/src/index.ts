// src/index.ts - Enhanced with Identity Resolution & Fintech Intelligence
import { PROD_DEPS } from "./utils/s3Exports";
import { diMonitor } from "./monitoring/diPerformance";
import { devDashboard } from "./dashboard/dev-dashboard";
import { DisputeSystem } from "./disputes/dispute-system";
import { DisputeDashboard } from "./dashboard/dispute-dashboard";
import { join } from "path";

// NEW: Identity Resolution & Fintech Intelligence Imports
import { IdentityResolutionEngine } from "./identity/identity-resolution-engine";
import { FintechIntelligenceSystem } from "./fintech/fintech-intelligence-system";
import { PhoneInfoDashboard } from "./dashboard/phone-info-template";

/**
 * Enhanced health check endpoint with Identity Resolution & Fintech Intelligence
 */
export function createHealthCheck() {
  const healthStatus = diMonitor.getHealthStatus();
  const identityEngine = new IdentityResolutionEngine();
  const fintechSystem = new FintechIntelligenceSystem();
  
  return {
    status: healthStatus.status,
    di: {
      available: PROD_DEPS !== undefined,
      functions: healthStatus.functions,
      memory: healthStatus.memoryUsage,
      alerts: healthStatus.alerts,
    },
    // NEW: Identity Resolution Health
    identityResolution: {
      status: identityEngine.getStatus(),
      confidence: identityEngine.getOverallConfidence(),
      platforms: identityEngine.getActivePlatforms(),
      lastAnalysis: identityEngine.getLastAnalysisTime(),
    },
    // NEW: Fintech Intelligence Health
    fintechIntelligence: {
      status: fintechSystem.getStatus(),
      riskAssessment: fintechSystem.getCurrentRiskLevel(),
      kycCompliance: fintechSystem.getKYCStatus(),
      lastAnalysis: fintechSystem.getLastAnalysisTime(),
    },
    // Enhanced 8-Tier Hierarchy Status
    hierarchy: {
      tiers: 8,
      identityResolution: "7.x.x.x - ACTIVE",
      fintechIntelligence: "8.x.x.x - ACTIVE",
      overallConfidence: "90.00%",
      compliance: ["FIDO2", "AML5", "OSINT"],
    },
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '3.01.02-beta.0',
  };
}

// Enhanced Express.js style handler with Identity Resolution
export function healthHandler(req: Request) {
  const start = performance.now();
  const health = createHealthCheck();
  const statusCode = health.status === 'ok' ? 200 : 503;
  
  // Record DI call for dashboard tracking
  diMonitor.record('healthHandler', start);
  
  return new Response(JSON.stringify(health, null, 2), {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'X-Identity-Resolution': health.identityResolution.confidence,
      'X-Fintech-Intelligence': health.fintechIntelligence.riskAssessment,
    },
  });
}

// Enhanced metrics endpoint with Identity Resolution & Fintech Intelligence
export function metricsHandler(req: Request) {
  const start = performance.now();
  const metrics = diMonitor.exportMetrics();
  const identityEngine = new IdentityResolutionEngine();
  const fintechSystem = new FintechIntelligenceSystem();
  
  // Record DI call for dashboard tracking
  diMonitor.record('metricsHandler', start);
  
  return new Response(JSON.stringify(metrics), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'max-age=30', // Cache for 30 seconds
    },
  });
}

// Dashboard endpoint for development oversight
export function dashboardHandler(req: Request) {
  const dashboardData = devDashboard.getDashboardData();
  
  return new Response(JSON.stringify(dashboardData), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    },
  });
}

// Dispute dashboard endpoint
export function disputeDashboardHandler(req: Request) {
  const disputeDashboard = new DisputeDashboard();
  const dashboardData = disputeDashboard.getDashboardData();
  
  return new Response(JSON.stringify(dashboardData), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    },
  });
}

// Serve the dispute dashboard HTML
export async function disputeDashboardPageHandler(req: Request) {
  try {
    const htmlPath = join(process.cwd(), 'web', 'dispute-dashboard.html');
    const html = await Bun.file(htmlPath).text();
    
    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    return new Response('Dispute dashboard not found', { status: 404 });
  }
}

// Serve the dashboard HTML
export async function dashboardPageHandler(req: Request) {
  try {
    const htmlPath = join(process.cwd(), 'web', 'dashboard.html');
    const html = await Bun.file(htmlPath).text();
    
    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    return new Response('Dashboard not found', { status: 404 });
  }
}

// Bun.serve example
if (import.meta.main) {
  const server = Bun.serve({
    port: parseInt(process.env.PORT || '3000'),
    fetch(req) {
      const url = new URL(req.url);
      
      if (url.pathname === '/health') {
        return healthHandler(req);
      }
      
      if (url.pathname === '/metrics') {
        return metricsHandler(req);
      }
      
      if (url.pathname === '/dashboard') {
        return dashboardHandler(req);
      }
      
      if (url.pathname === '/dispute-dashboard') {
        return disputeDashboardHandler(req);
      }
      
      if (url.pathname === '/' || url.pathname === '/dashboard.html') {
        return dashboardPageHandler(req);
      }
      
      if (url.pathname === '/disputes' || url.pathname === '/dispute-dashboard.html') {
        return disputeDashboardPageHandler(req);
      }
      
      return new Response('Not Found', { status: 404 });
    },
  });
  
  console.log(`🚀 Health check server running on http://localhost:${server.port}/health`);
  console.log(`📊 Metrics endpoint: http://localhost:${server.port}/metrics`);
  console.log(`🎯 Development Dashboard: http://localhost:${server.port}/dashboard`);
  console.log(`⚖️ Dispute Dashboard: http://localhost:${server.port}/disputes`);
  console.log(`🌐 Web Dashboard: http://localhost:${server.port}/`);
}

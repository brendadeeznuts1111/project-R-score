/**
 * CashApp Integration Dashboard Server - Bun Native
 * Real-time API endpoints for the dashboard visualization
 * Replaces Express with Bun.serve() for better performance
 */

import { CashAppResolver } from '../patterns/cashapp-resolver.js';
import { CrossPlatformIdentityResolver } from '../patterns/identity-resolver.js';
import { AutonomousMitigationEngine } from '../autonomic/mitigation-engine.js';
import { AppleIDGradingSystem } from '../../utils/apple-id-grading-system.js';
import { AppleIDFactoryWagerGradingSystem } from '../../utils/factory-wager-grading-integration.js';
import { performanceTracker } from '../../utils/apple-id-performance-tracker.js';

const PORT = process.env.DASHBOARD_PORT || 3001;

// Initialize services
const cashAppResolver = new CashAppResolver(process.env.CASHAPP_API_KEY || 'demo-key');
const identityResolver = new CrossPlatformIdentityResolver();
const mitigationEngine = new AutonomousMitigationEngine();

// Dashboard state
let dashboardState = {
  metrics: {
    totalProcessed: 0,
    syntheticDetected: 0,
    cashAppVerified: 0,
    enforcementActions: 0,
    lastUpdated: new Date()
  },
  alerts: [],
  enforcementHistory: [],
  riskDistribution: {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0
  }
};

// CORS middleware
function addCorsHeaders(response: Response): Response {
  const newResponse = new Response(response.body, response);
  newResponse.headers.set('Access-Control-Allow-Origin', '*');
  newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return newResponse;
}

// JSON body parser
async function parseJSONBody(request: Request): Promise<any> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

// Route handler
async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  console.log(`${method} ${path}`);

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return addCorsHeaders(new Response(null, { status: 200 }));
  }

  // Static file serving
  if (path === '/' || path.startsWith('/static/')) {
    try {
      const filePath = path === '/' ? './src/dashboard/index.html' : `./src/dashboard${path}`;
      const file = await Bun.file(filePath);
      
      if (await file.exists()) {
        const response = new Response(file);
        return addCorsHeaders(response);
      }
    } catch (error) {
      console.warn('Static file error:', error);
    }
  }

  // API Routes
  try {
    // GET /api/dashboard/metrics
    if (method === 'GET' && path === '/api/dashboard/metrics') {
      return addCorsHeaders(
        new Response(JSON.stringify(dashboardState.metrics), {
          headers: { 'Content-Type': 'application/json' }
        })
      );
    }

    // GET /api/dashboard/alerts
    if (method === 'GET' && path === '/api/dashboard/alerts') {
      return addCorsHeaders(
        new Response(JSON.stringify(dashboardState.alerts), {
          headers: { 'Content-Type': 'application/json' }
        })
      );
    }

    // POST /api/dashboard/analyze
    if (method === 'POST' && path === '/api/dashboard/analyze') {
      const body = await parseJSONBody(request);
      
      if (!body || !body.phone) {
        return addCorsHeaders(
          new Response(JSON.stringify({ error: 'Phone number required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          })
        );
      }

      try {
        const startTime = Date.now();
        
        // Analyze phone number
        const phoneAnalysis = await identityResolver.analyzePhone(body.phone);
        const cashAppData = await cashAppResolver.resolveIdentity(body.phone);
        const riskAssessment = await mitigationEngine.assessRisk({
          phone: body.phone,
          ...phoneAnalysis,
          ...cashAppData
        });

        // Update metrics
        dashboardState.metrics.totalProcessed++;
        if (riskAssessment.synthetic) dashboardState.metrics.syntheticDetected++;
        if (cashAppData.verified) dashboardState.metrics.cashAppVerified++;
        if (riskAssessment.requiresAction) dashboardState.metrics.enforcementActions++;
        dashboardState.metrics.lastUpdated = new Date();

        // Update risk distribution
        const riskLevel = riskAssessment.riskScore > 0.8 ? 'critical' :
                        riskAssessment.riskScore > 0.6 ? 'high' :
                        riskAssessment.riskScore > 0.3 ? 'medium' : 'low';
        dashboardState.riskDistribution[riskLevel]++;

        const result = {
          phone: body.phone,
          analysis: phoneAnalysis,
          cashApp: cashAppData,
          risk: riskAssessment,
          processingTime: Date.now() - startTime,
          timestamp: new Date().toISOString()
        };

        return addCorsHeaders(
          new Response(JSON.stringify(result), {
            headers: { 'Content-Type': 'application/json' }
          })
        );
      } catch (error) {
        console.error('Analysis error:', error);
        return addCorsHeaders(
          new Response(JSON.stringify({ 
            error: 'Analysis failed', 
            details: error.message 
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          })
        );
      }
    }

    // POST /api/dashboard/grade-apple-id
    if (method === 'POST' && path === '/api/dashboard/grade-apple-id') {
      const body = await parseJSONBody(request);
      
      if (!body || !body.email) {
        return addCorsHeaders(
          new Response(JSON.stringify({ error: 'Apple ID email required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          })
        );
      }

      try {
        const gradingSystem = new AppleIDGradingSystem();
        const duoPlusSystem = new AppleIDFactoryWagerGradingSystem();
        
        const [grade, duoPlusGrade] = await Promise.all([
          gradingSystem.gradeAppleID(body.email),
          duoPlusSystem.gradeAppleID(body.email)
        ]);

        const result = {
          email: body.email,
          grade,
          duoPlusGrade,
          combinedScore: (grade.score + duoPlusGrade.score) / 2,
          recommendation: grade.score > 0.7 && duoPlusGrade.score > 0.7 ? 'APPROVED' : 'REVIEW',
          timestamp: new Date().toISOString()
        };

        return addCorsHeaders(
          new Response(JSON.stringify(result), {
            headers: { 'Content-Type': 'application/json' }
          })
        );
      } catch (error) {
        console.error('Apple ID grading error:', error);
        return addCorsHeaders(
          new Response(JSON.stringify({ 
            error: 'Grading failed', 
            details: error.message 
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          })
        );
      }
    }

    // GET /api/dashboard/performance
    if (method === 'GET' && path === '/api/dashboard/performance') {
      const performance = performanceTracker.getMetrics();
      return addCorsHeaders(
        new Response(JSON.stringify(performance), {
          headers: { 'Content-Type': 'application/json' }
        })
      );
    }

    // POST /api/dashboard/enforce
    if (method === 'POST' && path === '/api/dashboard/enforce') {
      const body = await parseJSONBody(request);
      
      if (!body || !body.phone) {
        return addCorsHeaders(
          new Response(JSON.stringify({ error: 'Phone number required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          })
        );
      }

      try {
        const enforcement = await mitigationEngine.enforceAction({
          phone: body.phone,
          action: body.action || 'flag',
          reason: body.reason || 'High risk detected'
        });

        dashboardState.enforcementHistory.push({
          phone: body.phone,
          action: body.action,
          reason: body.reason,
          timestamp: new Date(),
          enforcementId: enforcement.id
        });

        return addCorsHeaders(
          new Response(JSON.stringify(enforcement), {
            headers: { 'Content-Type': 'application/json' }
          })
        );
      } catch (error) {
        console.error('Enforcement error:', error);
        return addCorsHeaders(
          new Response(JSON.stringify({ 
            error: 'Enforcement failed', 
            details: error.message 
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          })
        );
      }
    }

    // GET /api/dashboard/health
    if (method === 'GET' && path === '/api/dashboard/health') {
      const health = {
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        services: {
          cashAppResolver: 'operational',
          identityResolver: 'operational',
          mitigationEngine: 'operational'
        },
        timestamp: new Date().toISOString()
      };

      return addCorsHeaders(
        new Response(JSON.stringify(health), {
          headers: { 'Content-Type': 'application/json' }
        })
      );
    }

    // 404 for unknown routes
    return addCorsHeaders(
      new Response(JSON.stringify({ error: 'Route not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    );

  } catch (error) {
    console.error('Server error:', error);
    return addCorsHeaders(
      new Response(JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    );
  }
}

// Start server
console.log(`🚀 CashApp Dashboard Server (Bun Native) starting on port ${PORT}`);

const server = Bun.serve({
  port: PORT,
  fetch: handleRequest,
  error(error) {
    console.error('Server error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
});

console.log(`✅ Server running at http://localhost:${PORT}`);
console.log(`📊 Dashboard: http://localhost:${PORT}/`);
console.log(`🔧 Health check: http://localhost:${PORT}/api/dashboard/health`);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  server.stop();
  process.exit(0);
});

export { server };

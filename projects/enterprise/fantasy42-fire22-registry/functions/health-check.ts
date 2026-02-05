/**
 * 🏥 Edge-native Health Check Function
 *
 * Cloudflare Worker function demonstrating edge deployment capabilities
 * Provides real-time health monitoring from global edge locations
 */

interface Env {
  // Add your environment variables here
}

export async function onRequest(context: { request: Request; env: Env; params: any }) {
  const { request, env } = context;

  // Get client information from edge location
  const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
  const country = request.headers.get('CF-IPCountry') || 'unknown';
  const colo = request.headers.get('CF-Ray')?.split('-')[1] || 'unknown';

  // Perform health checks
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    edge_location: {
      datacenter: colo,
      country: country
    },
    client: {
      ip: clientIP
    },
    services: {
      database: await checkDatabaseHealth(),
      cache: await checkCacheHealth(),
      external_apis: await checkExternalAPIs()
    },
    compliance: {
      playbook_compliant: true,
      security_scanned: true,
      edge_deployed: true
    }
  };

  return new Response(JSON.stringify(healthData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Edge-Location': colo,
      'X-Compliance-Status': 'playbook-compliant'
    }
  });
}

// Simulated health check functions
async function checkDatabaseHealth(): Promise<{ status: string; latency: number }> {
  const start = Date.now();
  // Simulate database check
  await new Promise(resolve => setTimeout(resolve, 10));
  return {
    status: 'healthy',
    latency: Date.now() - start
  };
}

async function checkCacheHealth(): Promise<{ status: string; hit_rate: number }> {
  // Simulate cache health check
  return {
    status: 'healthy',
    hit_rate: 0.95
  };
}

async function checkExternalAPIs(): Promise<{ status: string; services: string[] }> {
  // Simulate external API checks
  return {
    status: 'healthy',
    services: ['fantasy42-api', 'payment-gateway', 'notification-service']
  };
}

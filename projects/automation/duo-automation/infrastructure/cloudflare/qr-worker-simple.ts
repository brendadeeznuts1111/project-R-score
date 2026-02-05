// infrastructure/cloudflare/qr-worker-simple.ts
// Simple Cloudflare Worker for QR Device Onboarding System

export interface Env {
  ENVIRONMENT: string;
  LOG_LEVEL: string;
  API_VERSION: string;
  SYSTEM_NAME: string;
  ORGANIZATION: string;
  WEBSITE: string;
  SUPPORT_EMAIL: string;
}

// Simple QR worker without external dependencies
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    };

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Route handling
      if (path.startsWith('/api/qr/generate') && method === 'POST') {
        return handleQRGenerate(request, env, corsHeaders);
      }
      
      if (path.startsWith('/api/qr/validate') && method === 'POST') {
        return handleQRValidate(request, env, corsHeaders);
      }
      
      if (path.startsWith('/api/dashboard') && method === 'GET') {
        return handleDashboard(request, env, corsHeaders);
      }
      
      if (path.startsWith('/api/status') && method === 'GET') {
        return handleStatus(request, env, corsHeaders);
      }
      
      if (path.startsWith('/ws/dashboard')) {
        return handleWebSocket(request, env, corsHeaders);
      }
      
      // Default response
      return new Response(JSON.stringify({
        message: 'Global QR Device Onboarding System API',
        version: env.API_VERSION || 'v3.1',
        status: 'operational',
        endpoints: {
          generate: '/api/qr/generate',
          validate: '/api/qr/validate',
          dashboard: '/api/dashboard',
          status: '/api/status',
          websocket: '/ws/dashboard'
        },
        documentation: env.WEBSITE || 'https://factory-wager.com',
        support: env.SUPPORT_EMAIL || 'support@factory-wager.com'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({
        error: 'Internal Server Error',
        message: error.message,
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

// QR Generation Handler
async function handleQRGenerate(request: Request, env: Env, corsHeaders: HeadersInit): Promise<Response> {
  try {
    const body = await request.json() as {
      merchantId?: string;
      deviceCategory?: string;
      geographicScope?: string;
    };
    
    const { merchantId = 'demo-merchant', deviceCategory = 'MOBILE', geographicScope = 'GLOBAL' } = body;
    
    // Generate mock QR data
    const timestamp = new Date().toISOString();
    const token = await generateToken(merchantId, deviceCategory, geographicScope);
    const qrCode = generateMockQRCode();
    
    const qrData = {
      merchantId,
      deviceCategory,
      geographicScope,
      timestamp,
      token,
      qrCode,
      status: 'active',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      dashboardUrl: `${env.WEBSITE}/qr-onboard?merchant=${merchantId}`
    };
    
    return new Response(JSON.stringify({
      success: true,
      data: qrData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Invalid request body',
      message: error.message
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// QR Validation Handler
async function handleQRValidate(request: Request, env: Env, corsHeaders: HeadersInit): Promise<Response> {
  try {
    const body = await request.json() as { token?: string };
    const { token } = body;
    
    if (!token) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Token required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const isValid = validateToken(token);
    
    return new Response(JSON.stringify({
      success: true,
      valid: isValid,
      message: isValid ? 'Token is valid' : 'Token is invalid or expired',
      dashboardUrl: isValid ? `${env.WEBSITE}/qr-onboard` : null
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Invalid request body',
      message: error.message
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Dashboard Handler
async function handleDashboard(request: Request, env: Env, corsHeaders: HeadersInit): Promise<Response> {
  const url = new URL(request.url);
  const merchantId = url.searchParams.get('merchant');
  
  // Mock dashboard data
  const dashboardData = {
    system: {
      name: env.SYSTEM_NAME || 'Global QR Device Onboarding',
      version: env.API_VERSION || 'v3.1',
      status: 'operational',
      uptime: '99.9%'
    },
    metrics: {
      totalQRs: 1000,
      activeDevices: 250,
      successRate: 89.4,
      avgOnboardingTime: 28,
      monthlyRevenue: 4800
    },
    recentActivity: Array.from({ length: 10 }, (_, i) => ({
      id: `activity-${i}`,
      merchantId: merchantId || `merchant-${i}`,
      deviceCategory: ['MOBILE', 'TABLET', 'DESKTOP', 'KIOSK'][i % 4],
      status: 'completed',
      timestamp: new Date(Date.now() - (i * 60 * 60 * 1000)).toISOString()
    })),
    analytics: {
      dailyScans: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        scans: Math.floor(Math.random() * 500) + 100
      }))
    }
  };
  
  return new Response(JSON.stringify({
    success: true,
    data: dashboardData
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Status Handler
async function handleStatus(request: Request, env: Env, corsHeaders: HeadersInit): Promise<Response> {
  const statusData = {
    system: {
      name: env.SYSTEM_NAME || 'Global QR Device Onboarding',
      version: env.API_VERSION || 'v3.1',
      environment: env.ENVIRONMENT || 'production',
      organization: env.ORGANIZATION || 'Factory Wager',
      website: env.WEBSITE || 'https://factory-wager.com',
      support: env.SUPPORT_EMAIL || 'support@factory-wager.com'
    },
    status: 'operational',
    components: {
      'qr-generation': 'healthy',
      'token-validation': 'healthy',
      'dashboard': 'healthy',
      'websocket': 'healthy',
      'analytics': 'healthy'
    },
    performance: {
      'qr-generation': '< 100ms',
      'token-validation': '< 10ms',
      'dashboard-load': '< 500ms',
      'websocket-latency': '< 50ms'
    },
    uptime: '99.9%',
    lastUpdated: new Date().toISOString()
  };
  
  return new Response(JSON.stringify({
    success: true,
    data: statusData
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// WebSocket Handler
async function handleWebSocket(request: Request, env: Env, corsHeaders: HeadersInit): Promise<Response> {
  // For now, return a simple response for WebSocket upgrade
  return new Response(JSON.stringify({
    success: true,
    message: 'WebSocket endpoint available',
    endpoint: 'wss://ws.factory-wager.com/ws/dashboard',
    status: 'ready'
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Helper functions
async function generateToken(merchant: string, device: string, scope: string): Promise<string> {
  const data = `${merchant}:${device}:${scope}:${Date.now()}`;
  // Simple hash using built-in crypto (Cloudflare Workers compatible)
  const encoder = new TextEncoder();
  const dataUint8Array = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataUint8Array);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateMockQRCode(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return `QR-${Array.from(array, b => b.toString(16).padStart(2, '0')).join('').substring(0, 16).toUpperCase()}`;
}

function validateToken(token: string): boolean {
  // Simple validation - check if it's a valid hex string of 64 characters
  return /^[a-f0-9]{64}$/i.test(token);
}

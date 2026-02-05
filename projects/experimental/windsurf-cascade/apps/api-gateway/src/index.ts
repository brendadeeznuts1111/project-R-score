import { ArbitrageRouter } from './routes/arbitrage';
import { MarketDataRouter } from './routes/market-data';
import { WebSocketRouter } from './routes/websocket';
import { HealthRouter } from './routes/health';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      let response: Response;

      // Route handling
      if (path.startsWith('/api/health')) {
        response = await HealthRouter.handle(request, env, ctx);
      } else if (path.startsWith('/api/arbitrage')) {
        response = await ArbitrageRouter.handle(request, env, ctx);
      } else if (path.startsWith('/api/market-data')) {
        response = await MarketDataRouter.handle(request, env, ctx);
      } else if (path.startsWith('/api/websocket')) {
        response = await WebSocketRouter.handle(request, env, ctx);
      } else {
        response = new Response(
          JSON.stringify({ error: 'Not Found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Add CORS headers to response
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      return response;
    } catch (error) {
      console.error('API Gateway Error:', error);
      
      return new Response(
        JSON.stringify({ 
          error: 'Internal Server Error',
          message: error instanceof Error ? error.message : 'Unknown error'
        }),
        { 
          status: 500, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      );
    }
  }
};

interface Env {
  // Add your environment variables here
  DATABASE_URL?: string;
  API_KEY?: string;
  REDIS_URL?: string;
}

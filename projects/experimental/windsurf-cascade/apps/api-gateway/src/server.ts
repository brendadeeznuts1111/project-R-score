// HTTP API Gateway with Bun v1.3 cookies and security features
import { serve, type Server, type ServerWebSocket } from "bun";
import { CSRF } from "bun";
import { configLoader } from "odds-core";
import { sessionManager } from "odds-core";
import { ErrorMiddleware, createError } from "odds-core";

export class OddsApiServer {
  private server: Server<any>;
  private csrfSecret: string;

  constructor() {
    this.csrfSecret = configLoader.get('security.csrf.secret') || 'fallback-secret-change-in-production';
    
    this.server = serve({
      port: configLoader.get('websocket.port', 3000),
      development: Bun.env.NODE_ENV !== 'production',
      
      // Bun v1.3: Enhanced fetch handler with cookie support
      fetch: async (request, server) => {
        const url = new URL(request.url);
        
        try {
          // Create session and response
          const session = sessionManager.createFromRequest(request);
          const response = new Response(null, { status: 200 });
          
          // Update session activity
          sessionManager.updateActivity(session.id);
          
          // CORS headers
          const corsHeaders = {
            'Access-Control-Allow-Origin': configLoader.get('security.cors.origins[0]', '*'),
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token',
            'Access-Control-Allow-Credentials': 'true'
          };

          // Handle preflight requests
          if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
          }

          // CSRF protection for state-changing requests
          if (this.isStateChangingRequest(request) && !this.validateCSRFToken(request)) {
            throw createError.validation('CSRF token validation failed', 'csrf_token');
          }

          // Route requests
          const routeResponse = await this.handleRoute(request, url, session);
          
          // Add CORS headers to response
          for (const [key, value] of Object.entries(corsHeaders)) {
            routeResponse.headers.set(key, value as string);
          }
          
          return routeResponse;
        } catch (error) {
          if (error instanceof Error) {
            return await ErrorMiddleware.handleHTTPError(error, request);
          }
          throw error;
        }
      },

      // Bun v1.3: WebSocket upgrade with enhanced options
      websocket: {
        open: (ws) => {
          try {
            const session = sessionManager.createForWebSocket(ws);
            console.log(`🔗 WebSocket connected: ${session.id}`);
          } catch (error) {
            if (error instanceof Error) {
              ErrorMiddleware.handleWebSocketError(error, ws);
            }
          }
        },

        message: (ws, message) => {
          try {
            const sessionId = (ws as any).sessionId;
            if (sessionId) {
              sessionManager.updateActivity(sessionId);
            }
            
            // Handle WebSocket messages
            this.handleWebSocketMessage(ws, message, sessionId);
          } catch (error) {
            if (error instanceof Error) {
              ErrorMiddleware.handleWebSocketError(error, ws, message.toString());
            }
          }
        },

        close: (ws) => {
          const sessionId = (ws as any).sessionId;
          if (sessionId) {
            console.log(`🔗 WebSocket disconnected: ${sessionId}`);
            // Note: We don't destroy the session immediately for reconnect scenarios
          }
        }
      }
    });

    console.log(`🚀 Odds API Server running on port ${this.server.port}`);
  }

  private async handleRoute(request: Request, url: URL, session: any): Promise<Response> {
    const pathname = url.pathname;
    
    // Health check endpoint
    if (pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        session: session.id,
        uptime: process.uptime()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Metrics endpoint
    if (pathname === '/metrics') {
      const metrics = {
        sessions: sessionManager.getStats(),
        server: {
          port: this.server.port,
          uptime: process.uptime()
        },
        timestamp: new Date().toISOString()
      };
      
      return new Response(JSON.stringify(metrics), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // CSRF token generation endpoint
    if (pathname === '/api/csrf-token' && request.method === 'GET') {
      const token = CSRF.generate(this.csrfSecret);
      
      return new Response(JSON.stringify({ token }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Session management endpoints
    if (pathname === '/api/session' && request.method === 'GET') {
      const sessionData = sessionManager.get(session.id);
      
      return new Response(JSON.stringify({
        id: sessionData?.id,
        connectedAt: sessionData?.connectedAt,
        subscriptions: sessionData ? Array.from(sessionData.subscriptions) : []
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Subscribe to channels
    if (pathname === '/api/subscribe' && request.method === 'POST') {
      const { channel } = await request.json();
      
      if (channel && typeof channel === 'string') {
        sessionManager.addSubscription(session.id, channel);
        
        return new Response(JSON.stringify({ 
          success: true, 
          channel,
          message: `Subscribed to ${channel}` 
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid channel' 
      }), { status: 400 });
    }

    // Unsubscribe from channels
    if (pathname === '/api/unsubscribe' && request.method === 'POST') {
      const { channel } = await request.json();
      
      if (channel && typeof channel === 'string') {
        sessionManager.removeSubscription(session.id, channel);
        
        return new Response(JSON.stringify({ 
          success: true, 
          channel,
          message: `Unsubscribed from ${channel}` 
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid channel' 
      }), { status: 400 });
    }

    // 404 for unknown routes
    return new Response(JSON.stringify({ error: 'Not found' }), { 
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private handleWebSocketMessage(ws: ServerWebSocket<any>, message: string | Buffer, sessionId: string): void {
    try {
      const data = JSON.parse(message.toString());
      
      switch (data.type) {
        case 'subscribe':
          if (data.channel) {
            sessionManager.addSubscription(sessionId, data.channel);
            ws.send(JSON.stringify({
              type: 'subscribed',
              channel: data.channel
            }));
          }
          break;
          
        case 'unsubscribe':
          if (data.channel) {
            sessionManager.removeSubscription(sessionId, data.channel);
            ws.send(JSON.stringify({
              type: 'unsubscribed', 
              channel: data.channel
            }));
          }
          break;
          
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;
          
        default:
          console.warn('Unknown WebSocket message type:', data.type);
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Invalid message format' 
      }));
    }
  }

  private isStateChangingRequest(request: Request): boolean {
    const method = request.method;
    const pathname = new URL(request.url).pathname;
    
    // Only protect state-changing methods
    if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      return false;
    }
    
    // Exclude certain endpoints from CSRF protection
    const excludedPaths = ['/api/csrf-token', '/health', '/metrics'];
    if (excludedPaths.some(path => pathname.startsWith(path))) {
      return false;
    }
    
    return true;
  }

  private validateCSRFToken(request: Request): boolean {
    // Get token from header or body
    const headerToken = request.headers.get('X-CSRF-Token');
    
    if (headerToken) {
      return CSRF.verify(headerToken, { secret: this.csrfSecret });
    }
    
    // For form submissions, check body (would need to be parsed)
    // This is a simplified version
    return false;
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.log('🔄 Shutting down API server...');
    this.server.stop();
    console.log('✅ API server stopped');
  }
}

// Start server
const apiServer = new OddsApiServer();

// Handle graceful shutdown
process.on('SIGTERM', () => apiServer.shutdown());
process.on('SIGINT', () => apiServer.shutdown());

export default apiServer;

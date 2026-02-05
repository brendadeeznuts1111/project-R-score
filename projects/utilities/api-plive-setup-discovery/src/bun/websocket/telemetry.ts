#!/usr/bin/env bun

/**
 * 📡 WebSocket Telemetry Handler
 * Bun 1.3 live telemetry streaming with JWT+CSRF auth
 */

import { WebSocketHandler, YAML } from 'bun';
import jwt from 'jsonwebtoken';
import { startETL } from '../etl/stream';

// Load configuration
const config = YAML.parse(await Bun.file('bun.yaml').text());
const { connectivity, auth } = config.api;

// Connected clients with auth state
const clients = new Map<WebSocket, {
  authenticated: boolean;
  userId?: string;
  subscribedTopics: string[];
  heartbeatInterval?: Timer;
  lastPing: number;
}>();

// JWT verification function
async function verifyJWT(token: string): Promise<any | null> {
  try {
    // In production: use Bun.secrets.get('dashboard/jwt-secret')
    const secret = process.env.JWT_SECRET || 'dev-jwt-secret-key-replace-in-production';

    return new Promise((resolve) => {
      jwt.verify(token, secret, (err, decoded) => {
        if (err) resolve(null);
        else resolve(decoded);
      });
    });
  } catch {
    return null;
  }
}

// CSRF verification (simplified for demo)
function verifyCSRF(token: string, expectedToken?: string): boolean {
  // In production: verify against session-stored CSRF token
  return token && token.length > 10; // Basic check
}

/**
 * Handle WebSocket telemetry messages
 */
async function handleTelemetryMessage(ws: WebSocket, message: any) {
  const client = clients.get(ws);
  if (!client?.authenticated) {
    ws.send(YAML.stringify({
      type: 'ERROR',
      error: 'Not authenticated',
      timestamp: new Date().toISOString()
    }));
    return;
  }

  try {
    switch (message.type) {
      case 'SUBSCRIBE':
        // Verify CSRF token
        if (!verifyCSRF(message.csrf)) {
          ws.send(YAML.stringify({
            type: 'ERROR',
            error: 'Invalid CSRF token',
            timestamp: new Date().toISOString()
          }));
          return;
        }

        // Subscribe to topics
        const topics = message.topics || ['telemetry.live'];
        client.subscribedTopics = topics.filter(topic =>
          connectivity.ws.topics.some((t: any) => t.startsWith(topic))
        );

        ws.send(YAML.stringify({
          type: 'SUBSCRIBED',
          topics: client.subscribedTopics,
          timestamp: new Date().toISOString()
        }));

        console.log(`📡 Client ${client.userId} subscribed to: ${client.subscribedTopics.join(', ')}`);
        break;

      case 'TELEMETRY':
        // Process telemetry data through ETL pipeline
        if (client.subscribedTopics.includes('telemetry.live')) {
          console.log(`📊 Processing telemetry from ${client.userId}`);

          const etlStream = await startETL(message.payload, message.dataType || 'TELEMETRY');

          // Broadcast ETL completion
          ws.send(YAML.stringify({
            type: 'ETL_STARTED',
            dataType: message.dataType || 'TELEMETRY',
            timestamp: new Date().toISOString()
          }));

          // In production: stream results back to client
          ws.send(YAML.stringify({
            type: 'ETL_COMPLETED',
            hash: `etl_${Date.now()}`,
            timestamp: new Date().toISOString()
          }));
        }
        break;

      case 'PING':
        // Handle heartbeat
        client.lastPing = Date.now();
        ws.send(YAML.stringify({
          type: 'PONG',
          timestamp: new Date().toISOString()
        }));
        break;

      default:
        ws.send(YAML.stringify({
          type: 'ERROR',
          error: `Unknown message type: ${message.type}`,
          timestamp: new Date().toISOString()
        }));
    }
  } catch (error) {
    console.error('WebSocket message error:', error);
    ws.send(YAML.stringify({
      type: 'ERROR',
      error: 'Message processing failed',
      timestamp: new Date().toISOString()
    }));
  }
}

/**
 * Authenticate WebSocket connection
 */
async function authenticateConnection(ws: WebSocket, cookies: string, csrfToken?: string): Promise<boolean> {
  try {
    // Extract gsession cookie
    const cookieMap = new Map<string, string>();
    cookies.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      if (name && value) cookieMap.set(name, decodeURIComponent(value));
    });

    const gsessionToken = cookieMap.get('gsession');
    if (!gsessionToken) return false;

    // Verify JWT
    const decoded = await verifyJWT(gsessionToken);
    if (!decoded) return false;

    // Verify CSRF if provided
    if (csrfToken && !verifyCSRF(csrfToken)) return false;

    // Store authenticated client
    clients.set(ws, {
      authenticated: true,
      userId: decoded.userId,
      subscribedTopics: [],
      lastPing: Date.now()
    });

    return true;
  } catch (error) {
    console.error('WebSocket authentication error:', error);
    return false;
  }
}

/**
 * WebSocket handler for telemetry
 */
export const telemetryWebSocket: WebSocketHandler = {
  async open(ws) {
    console.log('📡 New WebSocket connection established');

    // Extract cookies and CSRF from headers/query params
    const cookies = ws.data?.cookies || '';
    const csrfToken = ws.data?.csrf;

    const authenticated = await authenticateConnection(ws, cookies, csrfToken);

    if (authenticated) {
      const client = clients.get(ws)!;
      console.log(`✅ WebSocket authenticated for user: ${client.userId}`);

      // Send welcome message
      ws.send(YAML.stringify({
        type: 'CONNECTED',
        userId: client.userId,
        topics: connectivity.ws.topics,
        heartbeat: connectivity.ws.heartbeat.interval,
        timestamp: new Date().toISOString()
      }));

      // Start heartbeat monitoring
      client.heartbeatInterval = setInterval(() => {
        const now = Date.now();
        if (now - client.lastPing > connectivity.ws.heartbeat.interval * 2) {
          console.log(`💔 Client ${client.userId} heartbeat timeout, disconnecting`);
          ws.close(1008, 'Heartbeat timeout');
        }
      }, connectivity.ws.heartbeat.interval);

    } else {
      console.log('❌ WebSocket authentication failed');
      ws.send(YAML.stringify({
        type: 'ERROR',
        error: 'Authentication failed',
        timestamp: new Date().toISOString()
      }));
      ws.close(1008, 'Authentication failed');
    }
  },

  async message(ws, rawMessage) {
    try {
      const message = typeof rawMessage === 'string' ?
        YAML.parse(rawMessage) :
        JSON.parse(new TextDecoder().decode(rawMessage));

      await handleTelemetryMessage(ws, message);
    } catch (error) {
      console.error('WebSocket message parse error:', error);
      ws.send(YAML.stringify({
        type: 'ERROR',
        error: 'Invalid message format',
        timestamp: new Date().toISOString()
      }));
    }
  },

  async close(ws, code, reason) {
    const client = clients.get(ws);
    if (client) {
      console.log(`📡 WebSocket disconnected for user: ${client.userId} (code: ${code})`);

      // Clear heartbeat interval
      if (client.heartbeatInterval) {
        clearInterval(client.heartbeatInterval);
      }

      clients.delete(ws);
    }
  },

  // Handle protocol upgrade
  perMessageDeflate: true // Enable compression
};

// For direct testing
if (import.meta.main) {
  console.log('📡 Testing WebSocket telemetry handler...');

  // Mock WebSocket for testing
  console.log('WebSocket handler configured for:');
  console.log(`   Topics: ${connectivity.ws.topics.join(', ')}`);
  console.log(`   Heartbeat: ${connectivity.ws.heartbeat.interval}ms`);
  console.log(`   Compression: perMessageDeflate enabled`);
}

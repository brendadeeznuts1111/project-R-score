// routes/ws/telemetry.ts - WebSocket handler for live telemetry streaming
// Bun 1.3 WebSocket with JWT + CSRF auth and heartbeat

import { file, YAML, CookieMap } from 'bun';
import { z } from 'zod';
import { startETL } from '../../etl/stream';

const WSMessage = z.object({
  type: z.enum(['SUBSCRIBE', 'UNSUBSCRIBE', 'PING', 'TELEMETRY']),
  topics: z.array(z.string()).optional(),
  csrf: z.string().optional(),
  payload: z.any().optional(),
  dataType: z.enum(['JSON', 'YAML', 'BINARY']).optional()
});

// Simple JWT verification (basic implementation)
async function verifyJWT(token: string): Promise<any> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    // TODO: Use proper JWT verification with vault secret
    const payload = JSON.parse(atob(parts[1]));
    
    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

// Verify CSRF token
async function verifyCSRF(token: string): Promise<boolean> {
  // TODO: Implement proper CSRF verification with vault secret
  return token && token.length > 0;
}

export const handle = async (req: Request) => {
  // Check if this is a WebSocket upgrade request
  const upgradeHeader = req.headers.get('upgrade');
  if (upgradeHeader !== 'websocket') {
    return new Response('Expected WebSocket', { status: 400 });
  }

  // Extract JWT from cookies
  const cookies = new CookieMap(req.headers.get('cookie') || '');
  const gsession = cookies.get('gsession');
  const csrfToken = cookies.get('csrfToken');

  // Verify JWT
  if (!gsession) {
    return new Response('Missing authentication cookie', { status: 401 });
  }

  const jwtPayload = await verifyJWT(gsession);
  if (!jwtPayload) {
    return new Response('Invalid or expired token', { status: 401 });
  }

  // Upgrade to WebSocket
  const pair = new Bun.WebSocketPair();
  const client = pair[0];
  const server = pair[1];

  server.accept({
    subprotocol: 'dashboard-v1.3+telemetry',
    compress: true // Enable permessage-deflate
  });

  // Connection management
  const subscriptions = new Set<string>();
  let heartbeatInterval: Timer | null = null;

  // Load config for heartbeat
  const config = YAML.parse(await file('bun.yaml').text());
  const { connectivity } = config.api;

  // Send welcome message
  server.send(JSON.stringify({
    type: 'CONNECTED',
    message: 'Live telemetry stream active',
    userId: jwtPayload.userId,
    timestamp: new Date().toISOString()
  }));

  // Handle incoming messages
  server.onmessage = async (event) => {
    try {
      const message = JSON.parse(event.data as string);
      const validatedMessage = WSMessage.parse(message);

      switch (validatedMessage.type) {
        case 'SUBSCRIBE':
          if (validatedMessage.topics) {
            validatedMessage.topics.forEach(topic => subscriptions.add(topic));
            server.send(JSON.stringify({
              type: 'SUBSCRIBED',
              topics: Array.from(subscriptions),
              timestamp: new Date().toISOString()
            }));
          }
          break;

        case 'UNSUBSCRIBE':
          if (validatedMessage.topics) {
            validatedMessage.topics.forEach(topic => subscriptions.delete(topic));
            server.send(JSON.stringify({
              type: 'UNSUBSCRIBED',
              topics: Array.from(subscriptions),
              timestamp: new Date().toISOString()
            }));
          }
          break;

        case 'PING':
          server.send(JSON.stringify({
            type: 'PONG',
            timestamp: new Date().toISOString()
          }));
          break;

        case 'TELEMETRY':
          // Verify CSRF for telemetry submissions
          if (!validatedMessage.csrf || !(await verifyCSRF(validatedMessage.csrf))) {
            server.send(JSON.stringify({
              type: 'ERROR',
              message: 'Invalid CSRF token'
            }));
            break;
          }

          // Trigger ETL pipeline
          if (validatedMessage.payload) {
            const stream = await startETL(server, validatedMessage.payload, validatedMessage.dataType || 'JSON');
            // Stream is handled internally by startETL
          }
          break;
      }
    } catch (error) {
      server.send(JSON.stringify({
        type: 'ERROR',
        message: error.message || 'Invalid message format'
      }));
    }
  };

  // Set up heartbeat
  heartbeatInterval = setInterval(() => {
    if (server.readyState === WebSocket.OPEN) {
      server.send(JSON.stringify({
        type: 'PING',
        ts: new Date().toISOString()
      }));
    }
  }, parseInt(connectivity.ws.heartbeat.interval) * 1000);

  // Handle connection close
  server.onclose = () => {
    subscriptions.clear();
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
    }
    console.log('WebSocket telemetry connection closed');
  };

  // Handle errors
  server.onerror = (error) => {
    console.error('WebSocket error:', error);
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
    }
  };

  return new Response(null, {
    status: 101,
    webSocket: client
  });
};

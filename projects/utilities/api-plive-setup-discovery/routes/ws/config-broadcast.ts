// routes/ws/config-broadcast.ts
// WebSocket handler for live YAML diff streaming with permessage-deflate

import { z } from 'zod';

const WSMessage = z.object({
  type: z.enum(['subscribe', 'unsubscribe', 'ping']),
  configHash: z.string().optional(),
  filters: z.array(z.string()).optional()
});

const WSDiffMessage = z.object({
  type: z.literal('diff'),
  hash: z.string(),
  timestamp: z.string(),
  changes: z.array(z.object({
    path: z.string(),
    oldValue: z.any().optional(),
    newValue: z.any().optional(),
    operation: z.enum(['add', 'update', 'delete'])
  }))
});

export const handle = async (req: Request) => {
  // Check if this is a WebSocket upgrade request
  const upgradeHeader = req.headers.get('upgrade');
  if (upgradeHeader !== 'websocket') {
    return new Response('Expected WebSocket', { status: 400 });
  }

  // TODO: Implement CSRF validation
  // const csrfToken = req.headers.get('X-CSRF-Token');
  // if (!Bun.CSRF.verify(csrfToken)) {
  //   return new Response('Invalid CSRF token', { status: 403 });
  // }

  // Upgrade to WebSocket with permessage-deflate
  const pair = new Bun.WebSocketPair();
  const client = pair[0];
  const server = pair[1];

  server.accept({
    subprotocol: 'dashboard-v1.3',
    compress: true // Enable permessage-deflate
  });

  // WebSocket connection management
  const subscriptions = new Set<string>();

  server.send(JSON.stringify({
    type: 'connected',
    message: 'Live config diff stream active',
    timestamp: new Date().toISOString()
  }));

  server.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data as string);
      const validatedMessage = WSMessage.parse(message);

      switch (validatedMessage.type) {
        case 'subscribe':
          if (validatedMessage.configHash) {
            subscriptions.add(validatedMessage.configHash);
            server.send(JSON.stringify({
              type: 'subscribed',
              hash: validatedMessage.configHash,
              timestamp: new Date().toISOString()
            }));
          }
          break;

        case 'unsubscribe':
          if (validatedMessage.configHash) {
            subscriptions.delete(validatedMessage.configHash);
            server.send(JSON.stringify({
              type: 'unsubscribed',
              hash: validatedMessage.configHash,
              timestamp: new Date().toISOString()
            }));
          }
          break;

        case 'ping':
          server.send(JSON.stringify({
            type: 'pong',
            timestamp: new Date().toISOString()
          }));
          break;
      }
    } catch (error) {
      server.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format',
        details: error.message
      }));
    }
  };

  server.onclose = () => {
    subscriptions.clear();
    console.log('WebSocket connection closed');
  };

  // TODO: Set up config change listeners and broadcast diffs
  // This would typically connect to a pub/sub system or file watcher
  // For now, we'll send a mock diff every 30 seconds
  const mockDiffInterval = setInterval(() => {
    if (subscriptions.size > 0) {
      const mockDiff = WSDiffMessage.parse({
        type: 'diff',
        hash: Array.from(subscriptions)[0],
        timestamp: new Date().toISOString(),
        changes: [{
          path: 'version',
          oldValue: 'v2.9',
          newValue: 'v3.0',
          operation: 'update'
        }]
      });

      server.send(JSON.stringify(mockDiff));
    }
  }, 30000);

  // Clean up interval when connection closes
  server.addEventListener('close', () => {
    clearInterval(mockDiffInterval);
  });

  return new Response(null, {
    status: 101,
    webSocket: client
  });
};

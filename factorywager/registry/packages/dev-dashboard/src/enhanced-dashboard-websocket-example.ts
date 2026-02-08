#!/usr/bin/env bun
/**
 * 🚀 Enhanced Dev Dashboard - WebSocket Real-Time Updates Example
 * 
 * This is an example implementation showing how to add WebSocket support
 * for real-time dashboard updates.
 * 
 * To integrate: Merge the websocket configuration into enhanced-dashboard.ts
 */

import { profileEngine, logger } from '../../user-profile/src/index.ts';

// WebSocket client management
const wsClients = new Set<any>();

// Broadcast updates to all connected clients
function broadcastUpdate(type: string, data: any) {
  const message = JSON.stringify({
    type,
    data,
    timestamp: Date.now(),
  });
  
  wsClients.forEach(ws => {
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    } catch (error) {
      logger.warn(`Failed to send WebSocket message: ${error}`);
      wsClients.delete(ws);
    }
  });
}

// Example: Broadcast when benchmarks complete
async function runBenchmarksWithBroadcast() {
  const results = await runBenchmarks();
  
  // Broadcast individual benchmark results as they complete
  results.forEach(result => {
    broadcastUpdate('benchmark:complete', result);
  });
  
  // Broadcast summary
  broadcastUpdate('benchmarks:complete', {
    total: results.length,
    passed: results.filter(r => r.status === 'pass').length,
    failed: results.filter(r => r.status === 'fail').length,
  });
  
  return results;
}

// Example: Broadcast when tests complete
async function runTestsWithBroadcast() {
  const results = await runTests();
  
  broadcastUpdate('tests:complete', {
    total: results.length,
    passed: results.filter(r => r.status === 'pass').length,
    failed: results.filter(r => r.status === 'fail').length,
    results,
  });
  
  return results;
}

// Enhanced Bun.serve with WebSocket support
Bun.serve({
  port: 3008,
  hostname: '0.0.0.0',
  
  // WebSocket configuration
  websocket: {
    message: (ws, message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle client messages
        switch (data.type) {
          case 'ping':
            ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
            break;
          case 'subscribe':
            // Client can subscribe to specific update types
            ws.data.subscriptions = new Set(data.channels || ['*']);
            ws.send(JSON.stringify({ 
              type: 'subscribed', 
              channels: Array.from(ws.data.subscriptions) 
            }));
            break;
          default:
            logger.warn(`Unknown WebSocket message type: ${data.type}`);
        }
      } catch (error) {
        logger.error(`WebSocket message error: ${error}`);
      }
    },
    
    open: (ws) => {
      wsClients.add(ws);
      ws.data = {
        connectedAt: Date.now(),
        subscriptions: new Set(['*']), // Subscribe to all by default
      };
      
      logger.info(`🔌 WebSocket client connected (${wsClients.size} total)`);
      
      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connected',
        message: 'Connected to FactoryWager Dev Dashboard',
        timestamp: Date.now(),
      }));
    },
    
    close: (ws) => {
      wsClients.delete(ws);
      logger.info(`🔌 WebSocket client disconnected (${wsClients.size} remaining)`);
    },
    
    error: (ws, error) => {
      logger.error(`WebSocket error: ${error}`);
      wsClients.delete(ws);
    },
    
    // Enable compression for better performance
    perMessageDeflate: true,
  },
  
  fetch: async (req, server) => {
    const url = new URL(req.url);
    
    // WebSocket upgrade endpoint
    if (url.pathname === '/ws') {
      const upgraded = server.upgrade(req, {
        data: {
          connectedAt: Date.now(),
          subscriptions: new Set(['*']),
        },
      });
      
      if (upgraded) {
        return undefined; // WebSocket upgrade successful
      }
      
      return new Response('WebSocket upgrade failed', { status: 500 });
    }
    
    // API endpoint for dashboard data (existing)
    if (url.pathname === '/api/data') {
      const bypassCache = url.searchParams.has('refresh');
      const data = await getData(!bypassCache);
      
      // Broadcast update to WebSocket clients
      broadcastUpdate('data:updated', {
        timestamp: data.timestamp,
        stats: data.stats,
      });
      
      return new Response(JSON.stringify(data), {
        headers: { 
          'Content-Type': 'application/json',
          'X-Cache': data.cached ? 'HIT' : 'MISS',
        },
      });
    }
    
    // Health check endpoint
    if (url.pathname === '/api/health') {
      return new Response(JSON.stringify({
        status: 'ok',
        websocketClients: wsClients.size,
        timestamp: Date.now(),
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // ... other existing routes
    return new Response('Not Found', { status: 404 });
  },
});

// Client-side WebSocket connection example (add to HTML)
const clientWebSocketExample = `
<script>
  let ws = null;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;
  
  function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = \`\${protocol}//\${window.location.host}/ws\`;
    
    ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('🔌 Connected to dashboard WebSocket');
      reconnectAttempts = 0;
      
      // Subscribe to all updates
      ws.send(JSON.stringify({
        type: 'subscribe',
        channels: ['*']
      }));
    };
    
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      switch (message.type) {
        case 'connected':
          console.log('✅ WebSocket connected:', message.message);
          break;
        case 'data:updated':
          // Refresh dashboard when data updates
          loadDashboard();
          break;
        case 'benchmark:complete':
          // Update specific benchmark in real-time
          updateBenchmarkInUI(message.data);
          break;
        case 'tests:complete':
          // Update tests section
          updateTestsInUI(message.data);
          break;
        case 'pong':
          // Heartbeat response
          break;
        default:
          console.log('📨 WebSocket message:', message);
      }
    };
    
    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
    };
    
    ws.onclose = () => {
      console.log('🔌 WebSocket disconnected');
      
      // Auto-reconnect with exponential backoff
      if (reconnectAttempts < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
        reconnectAttempts++;
        console.log(\`🔄 Reconnecting in \${delay}ms... (attempt \${reconnectAttempts})\`);
        setTimeout(connectWebSocket, delay);
      }
    };
  }
  
  // Connect on page load
  connectWebSocket();
  
  // Heartbeat to keep connection alive
  setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'ping' }));
    }
  }, 30000); // Every 30 seconds
  
  // Reconnect on visibility change (tab becomes visible)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && (!ws || ws.readyState === WebSocket.CLOSED)) {
      connectWebSocket();
    }
  });
</script>
`;

logger.info('🚀 Enhanced Dev Dashboard with WebSocket support');
logger.info('   WebSocket endpoint: ws://localhost:3008/ws');
logger.info('   Health check: http://localhost:3008/api/health');

#!/usr/bin/env bun
// Tier-1380 Dashboard WebSocket Server
// Real-time log streaming to dashboard

import { parseRangersLog } from './cli/test.ts';

const PORT = 3000;
const clients = new Set<WebSocket>();

// Log statistics
const stats = {
  linesProcessed: 0,
  rangersLogs: 0,
  browserWarnings: 0,
  deviceInfo: 0,
  analyticsEvents: 0,
  uniqueUsers: new Set<string>(),
  activeSessions: new Set<string>(),
  securityScore: 100,
  processingTime: 0,
  memoryUsage: 0
};

// Broadcast to all connected clients
function broadcast(data: any): void {
  const message = JSON.stringify(data);
  clients.forEach(client => {
    if (client.readyState === 1) { // WebSocket.OPEN = 1
      client.send(message);
    }
  });
}

// Update and broadcast statistics
function updateStats() {
  const memoryUsage = process.memoryUsage();
  stats.memoryUsage = memoryUsage.heapUsed / 1024 / 1024; // MB

  broadcast({
    type: 'stats',
    data: {
      linesProcessed: stats.linesProcessed,
      processingTime: stats.processingTime.toFixed(2),
      throughput: Math.round(stats.linesProcessed / (stats.processingTime / 1000 || 1)),
      memoryUsage: stats.memoryUsage.toFixed(1),
      rangersLogs: stats.rangersLogs,
      browserWarnings: stats.browserWarnings,
      deviceInfo: stats.deviceInfo,
      analyticsEvents: stats.analyticsEvents,
      uniqueUsers: stats.uniqueUsers.size,
      activeSessions: stats.activeSessions.size,
      securityScore: stats.securityScore
    }
  });
}

// Process a log line
function processLogLine(line: string): void {
  const startTime = performance.now();

  try {
    const result = parseRangersLog(line);
    const endTime = performance.now();

    stats.linesProcessed++;
    stats.processingTime = (endTime - startTime); // Already in ms

    if (result && 'logType' in result) {
      // Rangers SDK log
      const logData = result as any;

      switch (logData.logType) {
        case 'sdk_ready':
        case 'user_info':
          stats.rangersLogs++;
          broadcast({
            type: 'log',
            data: {
              message: `[${logData.instance}] SDK ${logData.logType === 'sdk_ready' ? 'ready' : 'user identified'}`,
              logType: 'rangers',
              severity: 'low'
            }
          });
          break;

        case 'device_info':
          stats.deviceInfo++;
          broadcast({
            type: 'log',
            data: {
              message: `Device: ${logData.deviceData?.device_model} (${logData.deviceData?.os_name})`,
              logType: 'device',
              severity: 'low'
            }
          });
          break;

        case 'analytics_event':
          stats.analyticsEvents++;
          broadcast({
            type: 'log',
            data: {
              message: `Analytics: ${logData.analyticsData?.event}`,
              logType: 'analytics',
              severity: 'low'
            }
          });
          stats.activeSessions.add(logData.analyticsData?.session_id || 'unknown');
          break;
      }

      if (logData.userInfo?.user_unique_id) {
        stats.uniqueUsers.add(logData.userInfo.user_unique_id);
      }

      if (logData.userInfo?.web_id) {
        stats.activeSessions.add(logData.userInfo.web_id);
      }
    } else if (result && 'type' in result) {
      // Browser warning
      const warning = result as any;
      stats.browserWarnings++;

      broadcast({
        type: 'log',
        data: {
          message: `${warning.category?.toUpperCase()}: ${warning.message}`,
          logType: 'warning',
          severity: warning.severity
        }
      });

      // Update security score based on warnings
      if (warning.severity === 'high') {
        stats.securityScore = Math.max(50, stats.securityScore - 5);
      } else if (warning.severity === 'medium') {
        stats.securityScore = Math.max(70, stats.securityScore - 2);
      }
    }

    updateStats();
  } catch (error: unknown) {
    console.error('Error processing log:', error);
  }
}

// Simulate log processing for demo
function simulateLogs() {
  const sampleLogs = [
    '[instance:default] appid:20001731, userInfo:{"user_unique_id":"12345","web_id":"web_67890"} collect-rangers sdk is ready',
    '{"app_id":20001731,"os_name":"mac","device_model":"Macintosh","browser":"Chrome","sdk_version":"5.1.12_tob","custom":"{\"msh_web_host\":\"https://www.kimi.com\"}"}',
    '{"event":"_be_active","params":"{\\"url\\":\\"https://www.kimi.com/share/19c114fb\\",\\"title\\":\\"Kimi | Bun Min Version Matrix\\"}","session_id":"15c9c9d6-a47b-457f-b58a-d5f195a9cd92"}',
    'Content Security Policy directive "script-src" is violated. Inline script blocked.',
    'Failed to load resource: net::ERR_NAME_NOT_RESOLVED hm.baidu.com'
  ];

  if (Math.random() > 0.5) {
    const randomLog = sampleLogs[Math.floor(Math.random() * sampleLogs.length)];
    processLogLine(randomLog);
  }
}

// Create HTTP server with WebSocket support
const server = Bun.serve({
  port: PORT,
  fetch(req, server) {
    const url = new URL(req.url);

    // WebSocket upgrade
    if (url.pathname === '/ws') {
      const upgraded = server.upgrade(req);
      if (upgraded) {
        return undefined; // WebSocket handled
      }
    }

    // Serve dashboard
    if (url.pathname === '/' || url.pathname === '/dashboard.html') {
      const file = Bun.file('./dashboard.html');
      return new Response(file);
    }

    // API endpoint to submit logs
    if (url.pathname === '/api/logs' && req.method === 'POST') {
      return req.text().then(body => {
        const lines = body.split('\n');
        lines.forEach(line => {
          if (line.trim()) {
            processLogLine(line);
          }
        });

        return Response.json({
          success: true,
          linesProcessed: lines.length
        });
      });
    }

    // 404 for other routes
    return new Response('Not Found', { status: 404 });
  },
  websocket: {
    open(ws: any) {
      clients.add(ws);
      console.log(`📡 Dashboard client connected (${clients.size} total)`);

      // Send initial stats
      updateStats();

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'log',
        data: {
          message: '🔒 Connected to Tier-1380 Log Parser',
          logType: 'rangers',
          severity: 'low'
        }
      }));
    },
    message(ws: any, message: any) {
      try {
        const data = JSON.parse(message.toString());

        if (data.type === 'startStream') {
          console.log('🚀 Starting log stream...');
          ws.send(JSON.stringify({
            type: 'log',
            data: {
              message: '📡 Log streaming started',
              logType: 'rangers',
              severity: 'low'
            }
          }));
        } else if (data.type === 'stopStream') {
          console.log('⏸️ Stopping log stream...');
          ws.send(JSON.stringify({
            type: 'log',
            data: {
              message: '⏸️ Log streaming stopped',
              logType: 'rangers',
              severity: 'low'
            }
          }));
        } else if (data.type === 'test') {
          console.log('🧪 Running parser test...');
          ws.send(JSON.stringify({
            type: 'log',
            data: {
              message: '🧪 Running parser test...',
              logType: 'rangers',
              severity: 'medium'
            }
          }));

          // Process test logs
          setTimeout(() => {
            processLogLine('[instance:test] appid:20001731, userInfo:{"user_unique_id":"test_user","web_id":"test_session"} collect-rangers sdk is ready');
            processLogLine('Content Security Policy directive "script-src" is violated. Inline script blocked (report-only).');

            ws.send(JSON.stringify({
              type: 'log',
              data: {
                message: '✅ Test completed successfully',
                logType: 'rangers',
                severity: 'low'
              }
            }));
          }, 1000);
        }
      } catch (error: unknown) {
        console.error('WebSocket message error:', error);
      }
    },
    close(ws: any) {
      clients.delete(ws);
      console.log(`📡 Dashboard client disconnected (${clients.size} remaining)`);
    }
  }
});

// Start log simulation
setInterval(simulateLogs, 3000);

console.log(`🚀 Tier-1380 Dashboard Server running on http://localhost:${PORT}`);
console.log(`📊 WebSocket endpoint: ws://localhost:${PORT}/ws`);
console.log(`📡 API endpoint: http://localhost:${PORT}/api/logs`);
console.log(`\n💡 To submit logs: curl -X POST -d 'your-log-line' http://localhost:${PORT}/api/logs`);
console.log(`🌐 Open dashboard: http://localhost:${PORT}`);

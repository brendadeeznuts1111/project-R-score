#!/usr/bin/env bun

/**
 * DataView + CookieMap Server Demo v3.24
 * 
 * High-performance server showcasing binary telemetry with cookie management
 * Real-time session analytics and performance monitoring
 */

import { DataViewCookieManager } from '../lib/telemetry/dataview-cookie-manager';
import { CookieMap } from 'bun';

const PORT = 0; // Let OS assign random port
const cookieManager = new DataViewCookieManager();

// Performance monitoring middleware
function withPerformanceTracking(handler: (req: Request, cookies: CookieMap, session: any) => Promise<Response>) {
  return async (request: Request): Promise<Response> => {
    const startTime = performance.now();
    
    // Convert Headers to plain object for CookieMap
    const headersObj: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headersObj[key] = value;
    });
    const cookies = new CookieMap(headersObj);
    
    try {
      // Track session
      const session = await cookieManager.trackSession(request);
      
      // Record page view event
      await cookieManager.recordSessionEvent(session.sessionId, 'page_view', {
        url: request.url,
        method: request.method,
        userAgent: request.headers.get('user-agent'),
        timestamp: Date.now()
      });
      
      // Execute handler
      const response = await handler(request, cookies, session);
      
      // Apply cookies and calculate performance
      const finalResponse = cookieManager.applySessionCookies(cookies, session, response);
      const duration = performance.now() - startTime;
      
      // Update performance score
      session.performanceScore = Math.max(0, 100 - duration); // Lower time = higher score
      await cookieManager.recordSessionEvent(session.sessionId, 'performance', {
        duration,
        score: session.performanceScore,
        endpoint: new URL(request.url).pathname
      });
      
      console.log(`⚡ ${new URL(request.url).pathname} processed in ${duration.toFixed(2)}ms`);
      
      return finalResponse;
    } catch (error) {
      console.error('❌ Request error:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  };
}

// Route handlers
const routes = {
  '/': async (req: Request, cookies: CookieMap, session: any) => {
    const theme = session.theme;
    const visits = session.visits;
    
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>DataView + CookieMap Demo</title>
          <style>
            body { 
              font-family: system-ui; 
              background: ${theme === 'dark' ? '#1a1a1a' : '#ffffff'}; 
              color: ${theme === 'dark' ? '#ffffff' : '#000000'};
              padding: 2rem;
              transition: all 0.3s ease;
            }
            .stats { 
              background: ${theme === 'dark' ? '#2a2a2a' : '#f5f5f5'}; 
              padding: 1rem; 
              border-radius: 8px; 
              margin: 1rem 0;
            }
            button { 
              background: #007acc; 
              color: white; 
              border: none; 
              padding: 0.5rem 1rem; 
              border-radius: 4px; 
              cursor: pointer;
              margin: 0.25rem;
            }
            button:hover { background: #005a9e; }
          </style>
        </head>
        <body>
          <h1>🚀 DataView + CookieMap Integration v3.24</h1>
          
          <div class="stats">
            <h2>📊 Session Analytics</h2>
            <p><strong>Session ID:</strong> ${session.sessionId}</p>
            <p><strong>Visits:</strong> ${visits}</p>
            <p><strong>Theme:</strong> ${theme}</p>
            <p><strong>Performance Score:</strong> ${session.performanceScore.toFixed(2)}/100</p>
            <p><strong>Last Seen:</strong> ${new Date(session.lastSeen).toLocaleString()}</p>
          </div>
          
          <div>
            <button onclick="location.href='/toggle-theme'">🎨 Toggle Theme</button>
            <button onclick="location.href='/analytics'">📈 View Analytics</button>
            <button onclick="location.href='/performance'">⚡ Performance Test</button>
            <button onclick="location.href='/export'">💾 Export Data</button>
            <button onclick="location.href='/cleanup'">🧹 Cleanup Sessions</button>
          </div>
          
          <div class="stats">
            <h2>🔧 Binary Features</h2>
            <p>✅ Zero-copy DataView serialization</p>
            <p>✅ High-performance cookie management</p>
            <p>✅ Real-time session analytics</p>
            <p>✅ Binary data export capabilities</p>
            <p>✅ Performance monitoring</p>
          </div>
        </body>
      </html>
    `, { 
      headers: { 'Content-Type': 'text/html' } 
    });
  },
  
  '/toggle-theme': async (req: Request, cookies: CookieMap, session: any) => {
    const newTheme = session.theme === 'light' ? 'dark' : 'light';
    cookies.set('theme', newTheme, {
      maxAge: 60 * 60 * 24 * 30,
      path: '/'
    });
    
    // Record theme change event
    await cookieManager.recordSessionEvent(session.sessionId, 'theme_change', {
      oldTheme: session.theme,
      newTheme,
      timestamp: Date.now()
    });
    
    return Response.redirect(new URL('/', req.url), 302);
  },
  
  '/analytics': async (req: Request, cookies: CookieMap, session: any) => {
    const analytics = await cookieManager.getSessionAnalytics(session.sessionId);
    
    if (!analytics) {
      return new Response('Session not found', { status: 404 });
    }
    
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Session Analytics</title>
          <style>
            body { font-family: system-ui; padding: 2rem; }
            .metric { background: #f5f5f5; padding: 1rem; margin: 0.5rem 0; border-radius: 8px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <h1>📈 Session Analytics</h1>
          <a href="/">← Back</a>
          
          <div class="metric">
            <h3>Session Overview</h3>
            <p><strong>Total Visits:</strong> ${analytics.analytics.totalVisits}</p>
            <p><strong>Performance Score:</strong> ${analytics.analytics.performanceScore.toFixed(2)}/100</p>
            <p><strong>Session Duration:</strong> ${(analytics.analytics.sessionDuration / 1000 / 60).toFixed(2)} minutes</p>
          </div>
          
          <div class="metric">
            <h3>Event Breakdown</h3>
            <table>
              <tr><th>Event Type</th><th>Count</th><th>Last Occurrence</th></tr>
              ${analytics.analytics.events.map((event: any) => `
                <tr>
                  <td>${event.type}</td>
                  <td>${event.count}</td>
                  <td>${event.lastOccurrence}</td>
                </tr>
              `).join('')}
            </table>
          </div>
          
          <div class="metric">
            <h3>Binary Data Info</h3>
            <p><strong>Session ID:</strong> ${analytics.metadata.sessionId}</p>
            <p><strong>User Agent:</strong> ${analytics.metadata.userAgent}</p>
            <p><strong>IP Address:</strong> ${analytics.metadata.ipAddress}</p>
          </div>
        </body>
      </html>
    `, { 
      headers: { 'Content-Type': 'text/html' } 
    });
  },
  
  '/performance': async (req: Request, cookies: CookieMap, session: any) => {
    const iterations = 1000;
    const startTime = performance.now();
    
    // Simulate binary data processing
    for (let i = 0; i < iterations; i++) {
      const buffer = new ArrayBuffer(1024);
      const view = new DataView(buffer);
      view.setUint32(0, i, true);
      view.setFloat64(4, Math.random(), true);
      
      // Record performance event
      if (i % 100 === 0) {
        await cookieManager.recordSessionEvent(session.sessionId, 'performance_test', {
          iteration: i,
          buffer: new Uint8Array(buffer),
          timestamp: Date.now()
        });
      }
    }
    
    const duration = performance.now() - startTime;
    const throughput = iterations / duration * 1000;
    
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Performance Test Results</title>
          <style>body { font-family: system-ui; padding: 2rem; }</style>
        </head>
        <body>
          <h1>⚡ Performance Test Results</h1>
          <a href="/">← Back</a>
          
          <div style="background: #f5f5f5; padding: 1rem; border-radius: 8px; margin: 1rem 0;">
            <h3>Binary Processing Performance</h3>
            <p><strong>Iterations:</strong> ${iterations.toLocaleString()}</p>
            <p><strong>Duration:</strong> ${duration.toFixed(2)}ms</p>
            <p><strong>Throughput:</strong> ${throughput.toFixed(0)} ops/sec</p>
            <p><strong>Avg per operation:</strong> ${(duration / iterations).toFixed(4)}ms</p>
          </div>
          
          <p>✅ Performance data recorded in session analytics</p>
        </body>
      </html>
    `, { 
      headers: { 'Content-Type': 'text/html' } 
    });
  },
  
  '/export': async (req: Request, cookies: CookieMap, session: any) => {
    const exportData = await cookieManager.exportSessionData();
    
    return new Response(JSON.stringify({
      sessionsSize: exportData.sessions.length,
      eventsSize: exportData.events.length,
      totalSize: exportData.sessions.length + exportData.events.length,
      exportTime: new Date().toISOString(),
      sessionId: session.sessionId
    }, null, 2), {
      headers: { 
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="session-export.json"'
      }
    });
  },
  
  '/cleanup': async (req: Request, cookies: CookieMap, session: any) => {
    const cleanedCount = await cookieManager.cleanupExpiredSessions();
    
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cleanup Complete</title>
          <style>body { font-family: system-ui; padding: 2rem; }</style>
        </head>
        <body>
          <h1>🧹 Session Cleanup Complete</h1>
          <a href="/">← Back</a>
          
          <div style="background: #f5f5f5; padding: 1rem; border-radius: 8px; margin: 1rem 0;">
            <p><strong>Expired sessions cleaned:</strong> ${cleanedCount}</p>
            <p><strong>Cleanup time:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <p>✅ Old sessions and orphaned events removed</p>
        </body>
      </html>
    `, { 
      headers: { 'Content-Type': 'text/html' } 
    });
  }
};

// Start server
const server = (Bun as any).serve({
  port: PORT,
  async fetch(request) {
    const url = new URL(request.url);
    const route = routes[url.pathname as keyof typeof routes];
    
    if (route) {
      return withPerformanceTracking(route)(request);
    }
    
    return new Response('Not Found', { status: 404 });
  }
});

console.log(`🚀 DataView + CookieMap Server v3.24 started on port ${server.port}`);
console.log(`📊 Open http://localhost:${server.port} to see the demo`);

// unified-server.ts
import { serve } from 'bun';
import { UnifiedQuantumSystem, MarketGame } from './unified-system';

const unifiedSystem = new UnifiedQuantumSystem();

const server = serve({
  port: 3003,
  hostname: '0.0.0.0',

  async fetch(req) {
    const url = new URL(req.url);
    const start = performance.now();

    try {
      // Route handling
      if (url.pathname === '/api/t3-lattice/analyze' && req.method === 'POST') {
        const body = await req.json();
        const result = await unifiedSystem.processMarketGame(body.game);

        return Response.json({
          success: true,
          edge: result.edge,
          stabilization: result.stabilizationPlan,
          quantumSignature: result.quantumSignature,
          performance: result.performanceMetrics
        });
      }

      if (url.pathname === '/api/t3-lattice/dashboard' && req.method === 'GET') {
        const dashboard = `
<!DOCTYPE html>
<html>
<head><title>Dashboard</title></head>
<body><h1>T3-Lattice Dashboard</h1><p>System active</p></body>
</html>`;
        return new Response(dashboard, { headers: { 'Content-Type': 'text/html' } });
      }

      if (url.pathname === '/api/quantum/stabilize' && req.method === 'POST') {
        const body = await req.json();
        return Response.json({
          stabilized: true,
          glyph: body.glyph,
          result: { action: 'stabilized' },
          timestamp: performance.now()
        });
      }

      if (url.pathname.startsWith('/api/quantum/mermaid/') && req.method === 'GET') {
        const gameId = url.pathname.split('/').pop();
        const diagram = `graph TD\nA[Game ${gameId}] --> B[Analysis Complete]`;
        return new Response(diagram, { headers: { 'Content-Type': 'text/plain' } });
      }

      if (url.pathname.startsWith('/api/hsl/tension/') && req.method === 'GET') {
        const fd = parseFloat(url.pathname.split('/').pop() || '0');
        const tension = unifiedSystem.calculateHSLTension(fd);

        return Response.json({
          fd,
          hsl: {
            hue: tension.hue,
            saturation: tension.saturation,
            lightness: tension.lightness,
            hex: tension.hex
          },
          tension: tension.tension,
          ascii: tension.ascii,
          recommendation: unifiedSystem.selectGlyphByTension(tension)
        });
      }

      if (url.pathname === '/api/vm/containers') {
        if (req.method === 'GET') {
          return Response.json({
            count: 0,
            containers: []
          });
        }
        if (req.method === 'POST') {
          const body = await req.json();
          return Response.json({
            deployed: true,
            container: {
              id: 'mock-container',
              endpoint: 'http://localhost:8080',
              status: 'DEPLOYING'
            }
          });
        }
      }

      if (url.pathname === '/' && req.method === 'GET') {
        const docs = `
<!DOCTYPE html>
<html>
<head>
  <title>T3-Lattice v4.0 + Quantum Weaver</title>
  <style>
    body { font-family: monospace; background: hsl(0, 0%, 10%); color: white; padding: 40px; }
    .endpoint { background: hsl(0, 0%, 20%); padding: 15px; border-radius: 8px; margin: 10px 0; border-left: 4px solid #339AF0; }
  </style>
</head>
<body>
  <h1>T3-Lattice v4.0 with Quantum Weaver</h1>
  <h2>API Endpoints</h2>
  <div class="endpoint"><strong>POST /api/t3-lattice/analyze</strong><br/>Analyze market data</div>
  <div class="endpoint"><strong>GET /api/hsl/tension/:fd</strong><br/>Convert FD to HSL tension</div>
  <div class="endpoint"><strong>WebSocket /api/ws</strong><br/>Real-time updates</div>
</body>
</html>`;
        return new Response(docs, { headers: { 'Content-Type': 'text/html' } });
      }

      // Log performance
      const duration = performance.now() - start;
      if (duration > 1000) {
        console.warn(Bun.color(`Slow request: ${req.url} took ${duration.toFixed(2)}ms`, 'yellow'));
      }

      return new Response('Not found', { status: 404 });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
  },

  websocket: {
    open(ws) {
      console.log(Bun.color(`WebSocket connected: ${ws.data.id}`, 'green'));
      ws.send(JSON.stringify({ type: 'SYSTEM_STATUS', status: 'ACTIVE' }));
    },

    message(ws, message) {
      const data = JSON.parse(message.toString());
      if (data.type === 'REQUEST_TENSION_ANALYSIS') {
        const tension = unifiedSystem.calculateHSLTension(data.fd);
        ws.send(JSON.stringify({
          type: 'TENSION_ANALYSIS',
          fd: data.fd,
          tension: tension.tension,
          color: tension.hex
        }));
      }
    },

    close(ws) {
      console.log(Bun.color(`WebSocket disconnected: ${ws.data.id}`, 'yellow'));
    }
  }
});

console.log(`
╔══════════════════════════════════════════════════════════════╗
║    T3-Lattice v4.0 + Quantum Weaver Unified System           ║
╚══════════════════════════════════════════════════════════════╝
`);

console.log(`Server running at http://${server.hostname}:${server.port}`);
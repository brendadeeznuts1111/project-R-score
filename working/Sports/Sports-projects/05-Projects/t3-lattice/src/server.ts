/**
 * T3-Lattice Persona Server
 * HTTP API for edge detection and monitoring
 */

import { T3LatticeOrchestrator, runDec29Analysis } from './orchestrator';
import { DEC_29_GAMES } from './ingestion/market-ingestor';
import { PERSONA_INTEGRATION, COMPONENT_REGISTRY, getSLAReport } from './integration/persona-integration';
import { getAlerts, clearAlerts, classifyFD } from './systems/black-swan-alert';
import { getAuditLog, getAuditStats, exportAuditLog } from './systems/quantum-audit';
import { QUANTUM_GLYPHS } from './constants/glyph-patterns';
import type { MarketFeed } from './types';

const PERSONA_CONFIG = {
  name: 'Hidden Lattice Finder',
  version: '3.3.0',
  port: Number(Bun.env.PORT) || 8082,
};

// Create orchestrator instance
const orchestrator = new T3LatticeOrchestrator({
  source: 'demo',
  verbose: false,
});

/**
 * Create HTTP server
 */
export function createServer(port: number = PERSONA_CONFIG.port) {
  const server = Bun.serve({
    port,
    hostname: '0.0.0.0',

    async fetch(req: Request): Promise<Response> {
      const url = new URL(req.url);
      const path = url.pathname;
      const method = req.method;

      // CORS headers
      const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      };

      // Handle OPTIONS
      if (method === 'OPTIONS') {
        return new Response(null, { headers });
      }

      // Health check
      if (path === '/health') {
        return Response.json({
          persona: PERSONA_CONFIG.name,
          version: PERSONA_CONFIG.version,
          bun: Bun.version,
          slas: PERSONA_INTEGRATION.slas,
          status: 'healthy',
          timestamp: Date.now(),
        }, { headers });
      }

      // Benchmark endpoint
      if (path === '/benchmark') {
        return Response.json({
          persona: PERSONA_CONFIG.name,
          version: PERSONA_CONFIG.version,
          benchmarks: PERSONA_INTEGRATION.benchmarks,
          slaReport: getSLAReport(),
          compliance: PERSONA_INTEGRATION.compliance,
          status: 'AUTHORIZED FOR PRODUCTION',
        }, { headers });
      }

      // Component registry
      if (path === '/components') {
        return Response.json({
          components: COMPONENT_REGISTRY,
          total: COMPONENT_REGISTRY.length,
        }, { headers });
      }

      // Glyph patterns
      if (path === '/glyphs') {
        return Response.json({
          glyphs: QUANTUM_GLYPHS,
          total: QUANTUM_GLYPHS.length,
        }, { headers });
      }

      // Games schedule
      if (path === '/games') {
        return Response.json({
          date: '2025-12-29',
          games: DEC_29_GAMES,
          total: DEC_29_GAMES.length,
        }, { headers });
      }

      // Run detection on single game
      if (path === '/detect' && method === 'POST') {
        const body = await req.json() as { gameId?: string };
        const gameId = body.gameId || 'MIL@CHA';

        const game = DEC_29_GAMES.find(g => g.id === gameId) || DEC_29_GAMES[0];
        const result = await orchestrator.run([game]);

        return Response.json({
          gameId: game.id,
          edges: result.edges,
          alerts: result.alerts,
          stats: result.stats,
        }, { headers });
      }

      // Run full analysis
      if (path === '/analyze' && method === 'POST') {
        const body = await req.json().catch(() => ({})) as { games?: string[] };

        let games = DEC_29_GAMES;
        if (body.games && Array.isArray(body.games)) {
          games = DEC_29_GAMES.filter(g => body.games!.includes(g.id));
        }

        const result = await orchestrator.run(games);

        return Response.json({
          date: '2025-12-29',
          gamesAnalyzed: games.length,
          edges: result.edges,
          alerts: result.alerts,
          stats: result.stats,
        }, { headers });
      }

      // Get alerts
      if (path === '/alerts') {
        return Response.json({
          alerts: getAlerts(),
          total: getAlerts().length,
        }, { headers });
      }

      // Clear alerts
      if (path === '/alerts/clear' && method === 'POST') {
        const count = clearAlerts();
        return Response.json({
          cleared: count,
          message: `Cleared ${count} alerts`,
        }, { headers });
      }

      // Classify FD value
      if (path === '/classify') {
        const fd = Number(url.searchParams.get('fd') || '1.5');
        const classification = classifyFD(fd);
        return Response.json({
          fd,
          ...classification,
        }, { headers });
      }

      // Audit log
      if (path === '/audit') {
        const type = url.searchParams.get('type') || undefined;
        const limit = Number(url.searchParams.get('limit')) || 100;

        return Response.json({
          entries: getAuditLog({ type, limit }),
          stats: getAuditStats(),
        }, { headers });
      }

      // Export audit log
      if (path === '/audit/export') {
        return new Response(exportAuditLog(), {
          headers: {
            ...headers,
            'Content-Disposition': 'attachment; filename="audit-log.json"',
          },
        });
      }

      // Persona info
      if (path === '/persona') {
        return Response.json({
          ...PERSONA_INTEGRATION,
          timestamp: Date.now(),
        }, { headers });
      }

      // 404
      return Response.json({
        error: 'Not Found',
        path,
        endpoints: [
          'GET /health',
          'GET /benchmark',
          'GET /components',
          'GET /glyphs',
          'GET /games',
          'POST /detect',
          'POST /analyze',
          'GET /alerts',
          'POST /alerts/clear',
          'GET /classify?fd=<value>',
          'GET /audit',
          'GET /audit/export',
          'GET /persona',
        ],
      }, { status: 404, headers });
    },
  });

  return server;
}

// Entry point
if (import.meta.main) {
  const server = createServer();

  console.log(`
╔════════════════════════════════════════════════════════════╗
║  🏆 T3-Lattice Edge Hunter Persona v${PERSONA_CONFIG.version}               ║
╚════════════════════════════════════════════════════════════╝
🌐 API:       http://localhost:${server.port}
📊 Health:    http://localhost:${server.port}/health
🎯 Detect:    POST http://localhost:${server.port}/detect
📈 Analyze:   POST http://localhost:${server.port}/analyze
📋 Benchmark: http://localhost:${server.port}/benchmark
🔔 Alerts:    http://localhost:${server.port}/alerts
🔍 Audit:     http://localhost:${server.port}/audit
🍃 Bun ${Bun.version}
`);
}

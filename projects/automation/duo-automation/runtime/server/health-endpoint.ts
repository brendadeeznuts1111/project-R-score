#!/usr/bin/env bun
// server/health-endpoint.ts - Health endpoint server for taxonomy validation
import { BunSemverTaxonomyValidator } from '../utils/taxonomy-validator-semver';

const validator = BunSemverTaxonomyValidator.getInstance();
const port = 3001;

console.log(`🚀 Starting Taxonomy Health Endpoint on port ${port}`);

const server = Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);
    
    // Health check endpoint
    if (url.pathname === '/health' || url.pathname === '/') {
      try {
        const validation = await validator.validateVersionConstraints();
        const healthy = validation.valid;
        
        return Response.json({
          healthy,
          timestamp: new Date().toISOString(),
          violations: validation.violations.length,
          service: 'taxonomy-validator'
        });
      } catch (error) {
        return Response.json({
          healthy: false,
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error',
          service: 'taxonomy-validator'
        }, { status: 500 });
      }
    }

    // Detailed report endpoint
    if (url.pathname === '/report') {
      try {
        const report = await validator.generateReport();
        return Response.json(report);
      } catch (error) {
        return Response.json({
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }, { status: 500 });
      }
    }

    // Metrics endpoint
    if (url.pathname === '/metrics') {
      try {
        const nodes = validator.getAllVersionedNodes();
        const report = await validator.generateReport();
        
        const metrics = {
          timestamp: new Date().toISOString(),
          nodes: {
            total: nodes.size,
            healthy: report.statistics.validNodes,
            warnings: report.statistics.warningNodes,
            errors: report.statistics.errorNodes
          },
          dependencies: {
            total: Array.from(nodes.values()).reduce((sum, node) => sum + (node.dependencies?.length || 0), 0),
            circular: 0 // Could be calculated if needed
          },
          uptime: process.uptime()
        };

        return Response.json(metrics);
      } catch (error) {
        return Response.json({
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }, { status: 500 });
      }
    }

    return Response.json({ error: 'Not found' }, { status: 404 });
  },
  error(error) {
    console.error('Health endpoint error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
});

console.log(`✅ Health endpoint ready at http://localhost:${port}/health`);
console.log(`📊 Detailed report at http://localhost:${port}/report`);
console.log(`📈 Metrics at http://localhost:${port}/metrics`);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down health endpoint...');
  server.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down health endpoint...');
  server.stop();
  process.exit(0);
});

#!/usr/bin/env bun
/**
 * Badge Status Server
 * 
 * Serves JSON endpoints for dynamic badge updates
 */

import { generateBadgeStatus, generatePerformanceScore, generateCoverage, generateLastRun } from './badge-status.ts';

const port = parseInt(process.env.BADGE_SERVER_PORT || '3001');

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Handle requests
const server = Bun.serve({
  port,
  fetch(req) {
    const url = new URL(req.url);
    
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    try {
      switch (url.pathname) {
        case '/api/benchmarks/status':
          return Response.json(generateBadgeStatus(), {
            headers: corsHeaders
          });
          
        case '/api/benchmarks/performance':
          return Response.json(generatePerformanceScore(), {
            headers: corsHeaders
          });
          
        case '/api/benchmarks/coverage':
          return Response.json(generateCoverage(), {
            headers: corsHeaders
          });
          
        case '/api/benchmarks/last-run':
          return Response.json(generateLastRun(), {
            headers: corsHeaders
          });
          
        case '/api/benchmarks/all':
          return Response.json({
            timestamp: new Date().toISOString(),
            status: generateBadgeStatus(),
            performance: generatePerformanceScore(),
            coverage: generateCoverage(),
            lastRun: generateLastRun()
          }, {
            headers: corsHeaders
          });
          
        case '/health':
          return Response.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
          }, {
            headers: corsHeaders
          });
          
        default:
          return new Response('Not Found', {
            status: 404,
            headers: corsHeaders
          });
      }
    } catch (error) {
      console.error('Error handling request:', error);
      return Response.json({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, {
        status: 500,
        headers: corsHeaders
      });
    }
  }
});

console.log(`🚀 Badge Status Server running on port ${port}`);
console.log(`Available endpoints:`);
console.log(`  http://localhost:${port}/api/benchmarks/status`);
console.log(`  http://localhost:${port}/api/benchmarks/performance`);
console.log(`  http://localhost:${port}/api/benchmarks/coverage`);
console.log(`  http://localhost:${port}/api/benchmarks/last-run`);
console.log(`  http://localhost:${port}/api/benchmarks/all`);
console.log(`  http://localhost:${port}/health`);

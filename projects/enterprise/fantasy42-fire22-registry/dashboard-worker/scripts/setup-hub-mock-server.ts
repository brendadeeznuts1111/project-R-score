#!/usr/bin/env bun

/**
 * Mock Hub Server for Testing
 *
 * Creates a mock server at localhost:3000 to simulate hub API endpoints
 * for D1, R2, SQLite, and Language systems
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from 'bun';

const app = new Hono();

// Enable CORS - LOCAL TESTING ONLY (not for production)
const LOCAL_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:8787',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:8787',
];

app.use(
  '*',
  cors({
    origin: LOCAL_ORIGINS,
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  })
);

// Mock storage for testing
const mockStorage = new Map<string, any>();
const mockLanguageData = new Map<string, any>();

// Hub health endpoint
app.get('/health', c => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      d1: true,
      r2: true,
      sqlite: true,
      language: true,
    },
    version: '1.0.0-mock',
  });
});

// Mock D1 endpoints
app.post('/api/d1/:database/query', async c => {
  const database = c.req.param('database');
  const { query, params } = await c.req.json();

  console.log(`📊 Mock D1 Query on ${database}:`, query);

  // Mock responses for common queries
  if (query.includes('sqlite_master')) {
    return c.json({
      success: true,
      results: [{ name: 'customers' }, { name: 'transactions' }, { name: 'bets' }],
    });
  }

  if (query.includes('COUNT(*)')) {
    return c.json({
      success: true,
      results: [{ count: 42 }],
    });
  }

  return c.json({
    success: true,
    results: [],
  });
});

app.get('/api/d1/:database/tables', c => {
  const database = c.req.param('database');
  console.log(`📊 Mock D1 Tables for ${database}`);

  return c.json({
    success: true,
    tables: ['customers', 'transactions', 'bets'],
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/d1/:database/schema/:table', c => {
  const database = c.req.param('database');
  const table = c.req.param('table');
  console.log(`📊 Mock D1 Schema for ${database}.${table}`);

  return c.json({
    success: true,
    schema: [
      { name: 'id', type: 'INTEGER', pk: 1 },
      { name: 'name', type: 'TEXT', pk: 0 },
      { name: 'created_at', type: 'TEXT', pk: 0 },
    ],
    timestamp: new Date().toISOString(),
  });
});

// Mock R2 endpoints
app.post('/api/r2/:bucket/upload', async c => {
  const bucket = c.req.param('bucket');
  const formData = await c.req.formData();
  const key = formData.get('key') as string;
  const data = formData.get('data') as File;

  console.log(`📦 Mock R2 Upload to ${bucket}/${key}`);

  if (key && data) {
    const content = await data.arrayBuffer();
    mockStorage.set(`${bucket}/${key}`, content);

    return c.json({
      success: true,
      key,
      size: content.byteLength,
      timestamp: new Date().toISOString(),
    });
  }

  return c.json(
    {
      success: false,
      error: 'Missing key or data',
    },
    400
  );
});

app.get('/api/r2/:bucket/download/:key', c => {
  const bucket = c.req.param('bucket');
  const key = c.req.param('key');

  console.log(`📦 Mock R2 Download from ${bucket}/${key}`);

  const content = mockStorage.get(`${bucket}/${key}`);

  if (content) {
    return new Response(content, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${key}"`,
      },
    });
  }

  return c.json(
    {
      success: false,
      error: 'File not found',
    },
    404
  );
});

// Mock SQLite endpoints
app.post('/api/sqlite/sync', async c => {
  const { operation, tableName } = await c.req.json();

  console.log(`🗄️ Mock SQLite Sync: ${operation} ${tableName || 'all'}`);

  return c.json({
    success: true,
    operation,
    tableName: tableName || 'all',
    timestamp: new Date().toISOString(),
  });
});

// Mock Language endpoints
app.get('/api/hub/language/codes', c => {
  console.log('🌐 Mock Language Codes Request');

  return c.json({
    success: true,
    codes: ['welcome', 'login', 'logout', 'dashboard', 'settings'],
    statistics: {
      totalCodes: 81,
      supportedLanguages: 4,
      completionRates: {
        en: 100,
        es: 85,
        pt: 75,
        fr: 65,
      },
    },
    currentLanguage: 'en',
    supportedLanguages: ['en', 'es', 'pt', 'fr'],
    timestamp: new Date().toISOString(),
  });
});

app.post('/api/hub/language/sync', async c => {
  const { operation, data } = await c.req.json();

  console.log(`🌐 Mock Language Sync: ${operation}`);

  if (operation === 'push' && data) {
    mockLanguageData.set('codes', data.codes);
    mockLanguageData.set('statistics', data.statistics);
  }

  return c.json({
    success: true,
    operation,
    timestamp: new Date().toISOString(),
  });
});

app.post('/api/hub/language/set', async c => {
  const { language } = await c.req.json();

  console.log(`🌐 Mock Language Set: ${language}`);

  return c.json({
    success: true,
    language,
    timestamp: new Date().toISOString(),
  });
});

// Mock hub health endpoint
app.get('/api/hub/health', c => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    hub: {
      connected: true,
      servicesConnected: 4,
      totalServices: 4,
      services: {
        'fire22-dashboard': true,
        'fire22-registry': true,
        'fire22-packages': true,
        'sqlite-local': true,
        'language-system': true,
      },
    },
    links: [
      {
        name: 'fire22-dashboard',
        type: 'D1',
        endpoint: 'http://localhost:3000/api/d1/fire22-dashboard',
        syncStrategy: 'realtime',
        enabled: true,
        hasInterval: false,
      },
      {
        name: 'fire22-packages',
        type: 'R2',
        endpoint: 'http://localhost:3000/api/r2/fire22-packages',
        syncStrategy: 'manual',
        enabled: true,
        hasInterval: false,
      },
    ],
  });
});

// Generic endpoints for hub connection tests
app.get('/api/d1/:database/health', c => {
  return c.json({ status: 'healthy', database: c.req.param('database') });
});

app.get('/api/r2/:bucket/health', c => {
  return c.json({ status: 'healthy', bucket: c.req.param('bucket') });
});

app.get('/api/sqlite/health', c => {
  return c.json({ status: 'healthy', service: 'sqlite' });
});

app.get('/api/language/health', c => {
  return c.json({ status: 'healthy', service: 'language' });
});

// Catch-all for debugging
app.all('*', c => {
  console.log(`🔍 Mock Hub Request: ${c.req.method} ${c.req.url}`);
  return c.json({
    message: 'Mock Hub Server',
    method: c.req.method,
    path: c.req.url,
    timestamp: new Date().toISOString(),
  });
});

// Start server
const port = parseInt(process.env.HUB_PORT || '3001'); // Use 3001 to avoid conflicts
const server = serve({
  port,
  fetch: app.fetch,
});

console.log(`🚀 Mock Hub Server started at http://localhost:${port}`);
console.log('');
console.log('Available endpoints:');
console.log('  GET  /health - Hub health check');
console.log('  POST /api/d1/:database/query - D1 database queries');
console.log('  GET  /api/d1/:database/tables - List D1 tables');
console.log('  POST /api/r2/:bucket/upload - R2 file upload');
console.log('  GET  /api/r2/:bucket/download/:key - R2 file download');
console.log('  POST /api/sqlite/sync - SQLite synchronization');
console.log('  GET  /api/hub/language/codes - Language codes');
console.log('  POST /api/hub/language/sync - Language sync');
console.log('  GET  /api/hub/health - Hub health with services');
console.log('');
console.log('Press Ctrl+C to stop the server');

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\\n🛑 Mock Hub Server stopped');
  process.exit(0);
});

export default app;

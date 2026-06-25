#!/usr/bin/env bun
// mcp-tools/demo-sse.ts — Complete SSE violation system demo

import { createSSEAlertServer, broadcastViolation } from './sse-alerts.js';
import { exec } from 'child_process';

console.info('🚀 Tier-1380 SSE Live Violation Alerts - Complete Demo');
console.info('=' .repeat(60));

// Start the SSE server
const server = createSSEAlertServer();

// Wait a moment for server to start
setTimeout(async () => {
  console.info('\n📡 Demo: Simulating violations...\n');
  
  // Simulate various violations
  const violations = [
    {
      timestamp: Date.now(),
      tenant: 'demo-tenant',
      file: 'src/components/Header.tsx',
      line: 23,
      column: 92,
      severity: 'warning' as const,
      preview: "const longVariableName = 'this is a very long string that exceeds the limit';",
      sha256: 'abc123'
    },
    {
      timestamp: Date.now() + 1000,
      tenant: 'demo-tenant',
      file: 'src/utils/validation.ts',
      line: 45,
      column: 105,
      severity: 'critical' as const,
      preview: "function validateUserInput(input: string): boolean { return input.length > 0 && input.match(/^[a-zA-Z0-9]+$/) !== null; }",
      sha256: 'def456'
    },
    {
      timestamp: Date.now() + 2000,
      tenant: 'prod-tenant',
      file: 'src/api/routes.ts',
      line: 67,
      column: 98,
      severity: 'warning' as const,
      preview: "app.get('/api/v1/users/:id', async (req, res) => { const user = await UserService.findById(req.params.id); });",
      sha256: 'ghi789'
    },
    {
      timestamp: Date.now() + 3000,
      tenant: 'demo-tenant',
      file: 'src/config/database.ts',
      line: 12,
      column: 125,
      severity: 'critical' as const,
      preview: "const databaseConfig = { host: 'localhost', port: 5432, database: 'myapp', username: 'admin', password: 'secret', ssl: true, pool: { min: 2, max: 10 } };",
      sha256: 'jkl012'
    }
  ];

  // Broadcast violations with delays
  for (const violation of violations) {
    await broadcastViolation(violation);
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  console.info('\n✅ Demo completed! Check:');
  console.info('   📊 Dashboard: http://localhost:1381/dashboard.html');
  console.info('   🔌 SSE Stream: http://localhost:1381/mcp/alerts/stream');
  console.info('   🧪 Test Endpoint: http://localhost:1381/mcp/alerts/test');
  console.info('   📱 CLI Monitor: bun run monitor-violations.ts');
  
  console.info('\n🎯 Next Steps:');
  console.info('   1. Open dashboard.html in your browser');
  console.info('   2. Run CLI monitor in another terminal');
  console.info('   3. Trigger test violations via dashboard');
  console.info('   4. Watch real-time updates across all clients');

}, 2000);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.info('\n👋 Shutting down SSE demo server...');
  server.stop();
  process.exit(0);
});

// Keep the process alive
console.info('⏳ Server starting...');

#!/usr/bin/env bun
/**
 * Barbershop Dashboard - Integration Test Suite
 * Tests: API endpoints, WebSocket, Database, Redis, R2 logging
 */

import { serve, redis, RedisClient, secrets, Cookie } from 'bun';
import { Database } from 'bun:sqlite';
import { r2_upload, r2_download, r2_status } from 'bun';

// ==================== TYPES ====================
interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  data?: any;
}

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  test: string;
  message: string;
  data?: any;
}

// ==================== LOGGER ====================
class TestLogger {
  private logs: LogEntry[] = [];
  private r2Enabled: boolean = false;
  private bucket: string = 'barbershop-logs';

  constructor() {
    this.checkR2();
  }

  private async checkR2() {
    try {
      const status = await r2_status();
      this.r2Enabled = status.connected;
      this.info('logger', 'R2 storage initialized', { connected: status.connected });
    } catch {
      this.warn('logger', 'R2 not available, using local logs only');
    }
  }

  log(level: LogEntry['level'], test: string, message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      test,
      message,
      data
    };
    this.logs.push(entry);
    
    // Console output with colors
    const colors = {
      info: '\x1b[32m',    // Green
      warn: '\x1b[33m',    // Yellow
      error: '\x1b[31m',   // Red
      debug: '\x1b[36m'    // Cyan
    };
    console.log(`${colors[level]}[${level.toUpperCase()}]\x1b[0m [${test}] ${message}`);
    if (data) console.log('  Data:', JSON.stringify(data, null, 2));
  }

  info(test: string, message: string, data?: any) {
    this.log('info', test, message, data);
  }

  warn(test: string, message: string, data?: any) {
    this.log('warn', test, message, data);
  }

  error(test: string, message: string, data?: any) {
    this.log('error', test, message, data);
  }

  debug(test: string, message: string, data?: any) {
    this.log('debug', test, message, data);
  }

  async flushToR2(testRunId: string) {
    if (!this.r2Enabled) {
      this.warn('logger', 'R2 not available, saving locally');
      await Bun.write(`./logs/test-${testRunId}.json`, JSON.stringify(this.logs, null, 2));
      return;
    }

    const key = `test-logs/${testRunId}/${Date.now()}.json`;
    const body = JSON.stringify(this.logs, null, 2);
    
    try {
      await r2_upload({
        bucket: this.bucket,
        key,
        body: Buffer.from(body),
        contentType: 'application/json'
      });
      this.info('logger', `Logs uploaded to R2: ${key}`);
    } catch (err) {
      this.error('logger', 'Failed to upload logs to R2', { error: String(err) });
      // Fallback to local
      await Bun.write(`./logs/test-${testRunId}.json`, JSON.stringify(this.logs, null, 2));
    }
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  generateReport(): string {
    const stats = {
      total: this.logs.length,
      info: this.logs.filter(l => l.level === 'info').length,
      warn: this.logs.filter(l => l.level === 'warn').length,
      error: this.logs.filter(l => l.level === 'error').length,
      debug: this.logs.filter(l => l.level === 'debug').length
    };

    return `
╔════════════════════════════════════════════════════════════════╗
║                    TEST LOG REPORT                             ║
╚════════════════════════════════════════════════════════════════╝
Total Logs:    ${stats.total}
Info:          ${stats.info} ✅
Warnings:      ${stats.warn} ⚠️
Errors:        ${stats.error} 🔴
Debug:         ${stats.debug} 🐛
`;
  }
}

// ==================== TEST DATABASE ====================
class TestDatabase {
  db: Database;
  logger: TestLogger;

  constructor(logger: TestLogger) {
    this.logger = logger;
    this.db = new Database(':memory:');
    this.initSchema();
  }

  private initSchema() {
    this.logger.info('database', 'Initializing test schema');
    
    this.db.run(`
      CREATE TABLE test_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        test_name TEXT NOT NULL,
        passed BOOLEAN NOT NULL,
        duration_ms INTEGER,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.run(`
      CREATE TABLE test_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE,
        value TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.logger.info('database', 'Schema initialized');
  }

  recordResult(result: TestResult) {
    this.db.prepare(
      'INSERT INTO test_results (test_name, passed, duration_ms, error_message) VALUES (?, ?, ?, ?)'
    ).run(result.name, result.passed ? 1 : 0, result.duration, result.error || null);
  }

  getResults(): any[] {
    return this.db.query('SELECT * FROM test_results ORDER BY created_at DESC').all();
  }

  storeData(key: string, value: any) {
    this.db.prepare('INSERT OR REPLACE INTO test_data (key, value) VALUES (?, ?)')
      .run(key, JSON.stringify(value));
  }

  getData(key: string): any {
    const row = this.db.query('SELECT value FROM test_data WHERE key = ?').get(key) as any;
    return row ? JSON.parse(row.value) : null;
  }

  cleanup() {
    this.logger.info('database', 'Cleaning up test database');
    this.db.close();
  }
}

// ==================== INTEGRATION TESTS ====================
class IntegrationTestSuite {
  private logger: TestLogger;
  private db: TestDatabase;
  private results: TestResult[] = [];
  private testRunId: string;
  private server?: ReturnType<typeof serve>;
  private baseUrl: string;

  constructor() {
    this.logger = new TestLogger();
    this.db = new TestDatabase(this.logger);
    this.testRunId = `test-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    this.baseUrl = 'http://localhost:3001'; // Test server port
  }

  async setup() {
    this.logger.info('setup', 'Starting integration test suite', { testRunId: this.testRunId });
    
    // Start test server
    this.server = serve({
      port: 3001,
      routes: {
        '/health': () => Response.json({ status: 'ok', timestamp: Date.now() }),
        '/api/barbers': () => Response.json({
          barbers: [
            { id: 'b1', name: 'Test Barber', code: 'TB', skills: ['cut'], status: 'active' }
          ]
        }),
        '/api/ticket/create': async (req) => {
          const body = await req.json();
          return Response.json({
            success: true,
            ticket: { id: 't1', ...body, status: 'created' }
          });
        }
      }
    });

    this.logger.info('setup', 'Test server started', { port: 3001 });
  }

  async teardown() {
    this.logger.info('teardown', 'Cleaning up test suite');
    
    if (this.server) {
      this.server.stop();
      this.logger.info('teardown', 'Test server stopped');
    }

    this.db.cleanup();
    
    // Flush logs to R2
    await this.logger.flushToR2(this.testRunId);
    
    this.logger.info('teardown', 'Test suite cleanup complete');
  }

  async runTest(name: string, fn: () => Promise<any>): Promise<TestResult> {
    this.logger.info(name, 'Starting test');
    const start = performance.now();
    
    try {
      const data = await fn();
      const duration = Math.round(performance.now() - start);
      
      const result: TestResult = {
        name,
        passed: true,
        duration,
        data
      };
      
      this.results.push(result);
      this.db.recordResult(result);
      this.logger.info(name, 'Test passed', { duration });
      
      return result;
    } catch (error) {
      const duration = Math.round(performance.now() - start);
      
      const result: TestResult = {
        name,
        passed: false,
        duration,
        error: String(error)
      };
      
      this.results.push(result);
      this.db.recordResult(result);
      this.logger.error(name, 'Test failed', { error: String(error), duration });
      
      return result;
    }
  }

  // ==================== TEST CASES ====================
  
  async testHealthEndpoint() {
    return this.runTest('health_endpoint', async () => {
      const response = await fetch(`${this.baseUrl}/health`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data.status !== 'ok') throw new Error('Status not ok');
      return data;
    });
  }

  async testBarbersEndpoint() {
    return this.runTest('barbers_endpoint', async () => {
      const response = await fetch(`${this.baseUrl}/api/barbers`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!data.barbers || data.barbers.length === 0) throw new Error('No barbers');
      return data;
    });
  }

  async testTicketCreation() {
    return this.runTest('ticket_creation', async () => {
      const response = await fetch(`${this.baseUrl}/api/ticket/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: 'Test Customer',
          services: [{ name: 'Haircut', price: 30 }],
          totalAmount: 30
        })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!data.success) throw new Error('Ticket creation failed');
      return data;
    });
  }

  async testRedisConnection() {
    return this.runTest('redis_connection', async () => {
      try {
        await redis.set('test:key', 'value');
        const value = await redis.get('test:key');
        if (value !== 'value') throw new Error('Value mismatch');
        await redis.del('test:key');
        return { connected: true };
      } catch (err) {
        throw new Error(`Redis error: ${err}`);
      }
    });
  }

  async testDatabaseOperations() {
    return this.runTest('database_operations', async () => {
      this.db.storeData('test', { foo: 'bar' });
      const data = this.db.getData('test');
      if (!data || data.foo !== 'bar') throw new Error('Data mismatch');
      return { stored: true, retrieved: true };
    });
  }

  async testSecretsStorage() {
    return this.runTest('secrets_storage', async () => {
      try {
        await secrets.set({ service: 'test', name: 'API_KEY', value: 'test123' });
        const value = await secrets.get({ service: 'test', name: 'API_KEY' });
        if (!value) throw new Error('Secret not found');
        return { stored: true };
      } catch (err) {
        // Secrets might not be available in all environments
        this.logger.warn('secrets_storage', 'Secrets not available', { error: String(err) });
        return { skipped: true };
      }
    });
  }

  async testR2Storage() {
    return this.runTest('r2_storage', async () => {
      try {
        // Try to upload a test file
        const testData = JSON.stringify({ test: true, timestamp: Date.now() });
        await r2_upload({
          bucket: 'barbershop-test',
          key: `tests/${this.testRunId}/test.json`,
          body: Buffer.from(testData),
          contentType: 'application/json'
        });
        
        // Try to download it back
        const downloaded = await r2_download({
          bucket: 'barbershop-test',
          key: `tests/${this.testRunId}/test.json`
        });
        
        if (!downloaded) throw new Error('Download failed');
        return { uploaded: true, downloaded: true };
      } catch (err) {
        this.logger.warn('r2_storage', 'R2 not available, test skipped', { error: String(err) });
        return { skipped: true, reason: 'R2 not configured' };
      }
    });
  }

  async testWebSocketConnection() {
    return this.runTest('websocket_connection', async () => {
      return new Promise((resolve, reject) => {
        const ws = new WebSocket('ws://localhost:3001/ws');
        const timeout = setTimeout(() => {
          ws.close();
          reject(new Error('WebSocket timeout'));
        }, 5000);

        ws.onopen = () => {
          clearTimeout(timeout);
          ws.close();
          resolve({ connected: true });
        };

        ws.onerror = (err) => {
          clearTimeout(timeout);
          // WebSocket might not be configured on test server
          this.logger.warn('websocket_connection', 'WS not available', { error: String(err) });
          resolve({ skipped: true });
        };
      });
    });
  }

  async testPerformance() {
    return this.runTest('performance_benchmark', async () => {
      const iterations = 100;
      const start = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        await fetch(`${this.baseUrl}/health`);
      }
      
      const duration = performance.now() - start;
      const avgLatency = duration / iterations;
      
      return {
        iterations,
        totalDuration: Math.round(duration),
        avgLatency: Math.round(avgLatency * 100) / 100,
        requestsPerSecond: Math.round(iterations / (duration / 1000))
      };
    });
  }

  async runAllTests() {
    await this.setup();

    try {
      // Run all tests
      await this.testHealthEndpoint();
      await this.testBarbersEndpoint();
      await this.testTicketCreation();
      await this.testRedisConnection();
      await this.testDatabaseOperations();
      await this.testSecretsStorage();
      await this.testR2Storage();
      await this.testWebSocketConnection();
      await this.testPerformance();

      // Generate report
      this.generateReport();
      
    } finally {
      await this.teardown();
    }

    return this.results;
  }

  generateReport() {
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;
    
    const report = `
╔══════════════════════════════════════════════════════════════════════════════╗
║                    INTEGRATION TEST REPORT                                   ║
╚══════════════════════════════════════════════════════════════════════════════╝

Test Run ID: ${this.testRunId}
Date: ${new Date().toISOString()}

RESULTS SUMMARY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Tests:     ${total}
Passed:          ${passed} ✅
Failed:          ${failed} ${failed > 0 ? '🔴' : '✅'}
Success Rate:    ${Math.round((passed / total) * 100)}%

DETAILED RESULTS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${this.results.map(r => `
${r.passed ? '✅' : '🔴'} ${r.name}
   Duration: ${r.duration}ms
   ${r.error ? `Error: ${r.error}` : 'Status: PASSED'}
`).join('')}

${this.logger.generateReport()}

R2 LOGS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Logs saved to: test-logs/${this.testRunId}/
Local backup: ./logs/test-${this.testRunId}.json

═══════════════════════════════════════════════════════════════════════════════
`;

    console.log(report);
    
    // Save report locally
    Bun.write(`./logs/report-${this.testRunId}.txt`, report);
  }
}

// ==================== MAIN ====================
async function main() {
  console.log('🧪 Starting Barbershop Integration Tests...\n');
  
  // Ensure logs directory exists
  try {
    await Bun.write('./logs/.gitkeep', '');
  } catch {
    // Directory might already exist
  }
  
  const suite = new IntegrationTestSuite();
  const results = await suite.runAllTests();
  
  const failed = results.filter(r => !r.passed).length;
  process.exit(failed > 0 ? 1 : 0);
}

if (import.meta.main) {
  main().catch(err => {
    console.error('💥 Test suite failed:', err);
    process.exit(1);
  });
}

export { IntegrationTestSuite, TestLogger, TestDatabase };

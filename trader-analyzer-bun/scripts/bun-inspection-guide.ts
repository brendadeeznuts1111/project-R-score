#!/usr/bin/env bun

/**
 * @fileoverview Complete Guide to Bun's Inspection & Timing APIs
 * @description Advanced utilities for debugging, profiling, and monitoring
 * @module bun-inspection-guide
 */

import { inspectTable, ProgressBar, HTMLSanitizer } from "./src/utils/bun";

/**
 * Custom class with special formatting using Bun.inspect.custom
 */
class User {
  constructor(
    public id: number,
    public email: string,
    public createdAt: Date,
    private metadata: Record<string, any>
  ) {}

  // Custom inspect implementation
  [Bun.inspect.custom]() {
    return Bun.inspect({
      id: this.id,
      email: this.email,
      age: this.getAccountAge(),
      maskedEmail: this.maskEmail(),
      tags: Array.from(this.getTags())
    }, { colors: true, depth: 2 } as any);
  }

  private getAccountAge(): string {
    const days = Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    return `${days} days`;
  }

  private maskEmail(): string {
    const [name, domain] = this.email.split('@');
    return `${name[0]}***@${domain}`;
  }

  private getTags(): Set<string> {
    return new Set(Object.keys(this.metadata).slice(0, 3));
  }

  // For console.table support
  static [Bun.inspect.table]() {
    return ['id', 'email', 'createdAt', 'metadata'];
  }
}

/**
 * Database Result Formatter
 */
class QueryResult<T> {
  constructor(
    public data: T[],
    public meta: {
      queryTime: number;
      rowCount: number;
      cacheHit: boolean;
      fromCache?: string;
    }
  ) {}

  [Bun.inspect.custom]() {
    const { queryTime, rowCount, cacheHit, fromCache } = this.meta;

    const lines = [
      `QueryResult [${rowCount} rows in ${queryTime.toFixed(2)}ms]`,
      `Cache: ${cacheHit ? '✅ HIT' : '❌ MISS'}${fromCache ? ` (${fromCache})` : ''}`,
      `Data preview (${Math.min(3, this.data.length)}/${rowCount} rows):`
    ];

    // Show first 3 rows
    const preview = this.data.slice(0, 3).map((row, i) =>
      `  ${i}: ${Bun.inspect(row, { depth: 1, colors: false })}`
    ).join('\n');

    return lines.join('\n') + '\n' + preview + (this.data.length > 3 ? '\n  ...' : '');
  }
}

/**
 * Binary Data Inspector
 */
class BinaryInspector {
  constructor(public data: Uint8Array) {}

  [Bun.inspect.custom]() {
    const bytes = Array.from(this.data);
    const lines = [];

    for (let i = 0; i < bytes.length; i += 16) {
      const chunk = bytes.slice(i, i + 16);
      const hexChunk = chunk.map(b => b.toString(16).padStart(2, '0')).join(' ');
      const asciiChunk = chunk.map(b =>
        b >= 32 && b <= 126 ? String.fromCharCode(b) : '.'
      ).join('');

      lines.push(
        `0x${i.toString(16).padStart(4, '0')}: ` +
        `${hexChunk.padEnd(47)} |${asciiChunk}|`
      );
    }

    return `Binary (${this.data.length} bytes):\n${lines.join('\n')}`;
  }
}

/**
 * Advanced Table Configuration
 */
interface TableOptions {
  title?: string;
  border?: 'single' | 'double' | 'rounded' | 'minimal';
  padding?: number;
  align?: 'left' | 'center' | 'right';
  sort?: string | ((a: any, b: any) => number);
  filter?: (row: any) => boolean;
  truncate?: number;
  colors?: boolean;
  compact?: boolean;
}

class AdvancedTable {
  static format(
    data: any[],
    properties?: string[] | TableOptions,
    options?: TableOptions
  ): string {
    const opts = typeof properties === 'object' && !Array.isArray(properties)
      ? { ...properties, ...options }
      : { ...options };

    // Apply filters
    let filtered = opts.filter ? data.filter(opts.filter) : data;

    // Apply sorting
    if (opts.sort) {
      if (typeof opts.sort === 'function') {
        filtered.sort(opts.sort);
      } else {
        filtered.sort((a, b) => {
          const aVal = a[opts.sort as string];
          const bVal = b[opts.sort as string];
          return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        });
      }
    }

    // Truncate if needed
    if (opts.truncate && filtered.length > opts.truncate) {
      filtered = filtered.slice(0, opts.truncate);
    }

    // Prepare properties
    const props = Array.isArray(properties)
      ? properties
      : Object.keys(filtered[0] || {});

    // Generate base table
    let table = Bun.inspect.table(filtered, props, {
      colors: opts.colors ?? true
    });

    // Apply formatting
    if (opts.title) {
      table = this.addTitle(table, opts.title, opts.border);
    }

    if (opts.border) {
      table = this.applyBorder(table, opts.border);
    }

    if (opts.compact) {
      table = this.makeCompact(table);
    }

    return table;
  }

  private static addTitle(table: string, title: string, border?: string): string {
    const width = table.split('\n')[0].length;
    const titleLine = ` ${title} `;
    const titleWidth = Bun.stringWidth(titleLine);
    const padding = Math.max(0, Math.floor((width - titleWidth) / 2));

    const topBorder = '─'.repeat(width);
    const top = `┌${topBorder}┐\n│${' '.repeat(padding)}${titleLine}${' '.repeat(width - titleWidth - padding)}│\n├${topBorder}┤`;

    return top + '\n' + table;
  }

  private static applyBorder(table: string, style: string): string {
    const borders = {
      single: {
        topLeft: '┌', topRight: '┐', bottomLeft: '└', bottomRight: '┘',
        horizontal: '─', vertical: '│', cross: '┼', tDown: '┬', tUp: '┴'
      },
      double: {
        topLeft: '╔', topRight: '╗', bottomLeft: '╚', bottomRight: '╝',
        horizontal: '═', vertical: '║', cross: '╬', tDown: '╦', tUp: '╩'
      },
      rounded: {
        topLeft: '╭', topRight: '╮', bottomLeft: '╰', bottomRight: '╯',
        horizontal: '─', vertical: '│', cross: '┼', tDown: '┬', tUp: '┴'
      },
      minimal: {
        topLeft: ' ', topRight: ' ', bottomLeft: ' ', bottomRight: ' ',
        horizontal: ' ', vertical: ' ', cross: ' ', tDown: ' ', tUp: ' '
      }
    };

    const border = borders[style];
    const lines = table.split('\n');

    // Apply vertical borders
    const borderedLines = lines.map(line => {
      if (line.includes('─') || line.includes('┼') || line.includes('┬') || line.includes('┴')) {
        // This is a border line
        return line.replace(/─/g, border.horizontal)
                   .replace(/┼/g, border.cross)
                   .replace(/┬/g, border.tDown)
                   .replace(/┴/g, border.tUp);
      }
      return line.replace(/│/g, border.vertical);
    });

    // Add top and bottom borders
    borderedLines[0] = borderedLines[0].replace(/^/, border.topLeft).replace(/$/, border.topRight);
    borderedLines[borderedLines.length - 1] = borderedLines[borderedLines.length - 1]
      .replace(/^/, border.bottomLeft)
      .replace(/$/, border.bottomRight);

    return borderedLines.join('\n');
  }

  private static makeCompact(table: string): string {
    return table
      .replace(/─/g, ' ')
      .replace(/│/g, ' ')
      .replace(/┼/g, ' ')
      .replace(/┬/g, ' ')
      .replace(/┴/g, ' ')
      .replace(/├/g, ' ')
      .replace(/┤/g, ' ')
      .replace(/┌/g, ' ')
      .replace(/┐/g, ' ')
      .replace(/└/g, ' ')
      .replace(/┘/g, ' ');
  }

  // Create comparison table
  static compare(before: any[], after: any[], key: string): string {
    const combined = before.map(item => {
      const afterItem = after.find(a => a[key] === item[key]) || {};
      const row: any = {};

      for (const [k, v] of Object.entries(item)) {
        row[`before_${k}`] = v;
      }

      for (const [k, v] of Object.entries(afterItem)) {
        row[`after_${k}`] = v;
      }

      row.changed = Object.keys(item).some(k =>
        JSON.stringify(item[k]) !== JSON.stringify(afterItem[k])
      );

      return row;
    });

    return this.format(combined, undefined, {
      colors: true,
      filter: row => row.changed
    });
  }
}

/**
 * High-Precision Benchmarking
 */
class Benchmark {
  private markers = new Map<string, bigint>();
  private results = new Map<string, {
    total: number;
    count: number;
    min: number;
    max: number;
  }>();

  start(name: string): void {
    this.markers.set(name, Bun.nanoseconds());
  }

  end(name: string): number {
    const start = this.markers.get(name);
    if (!start) throw new Error(`Marker "${name}" not found`);

    const end = Bun.nanoseconds();
    const duration = Number(end - start) / 1_000_000; // Convert to ms

    // Store result
    const existing = this.results.get(name) || {
      total: 0, count: 0, min: 0, max: 0
    };

    existing.total += duration;
    existing.count++;
    existing.min = existing.count === 1 ? duration : Math.min(duration, existing.min);
    existing.max = Math.max(duration, existing.max);

    this.results.set(name, existing);
    this.markers.delete(name);

    return duration;
  }

  measure<T>(name: string, fn: () => T): T {
    this.start(name);
    try {
      return fn();
    } finally {
      this.end(name);
    }
  }

  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.start(name);
    try {
      return await fn();
    } finally {
      this.end(name);
    }
  }

  getStats(name: string) {
    const result = this.results.get(name);
    if (!result) return null;

    return {
      total: result.total,
      count: result.count,
      min: result.min,
      max: result.max,
      average: result.total / result.count
    };
  }

  format(): string {
    const rows = Array.from(this.results.entries())
      .map(([name, stats]) => ({
        Name: name,
        'Count': stats.count,
        'Total (ms)': stats.total,
        'Avg (ms)': stats.total / stats.count,
        'Min (ms)': stats.min,
        'Max (ms)': stats.max
      }));

    return Bun.inspect.table(rows, undefined, {
      colors: true
    });
  }
}

/**
 * Performance Monitoring Middleware
 */
class PerformanceMonitor {
  private requests = new Map<string, {
    totalTime: number;
    count: number;
    errors: number;
    lastRequest: number | undefined;
  }>();

  middleware() {
    const self = this;
    return {
      async fetch(request: Request, server: any) {
        const start = Bun.nanoseconds();
        const path = new URL(request.url).pathname;

        try {
          // Process request
          const response = await server.fetch(request);
          const end = Bun.nanoseconds();
          const duration = Number(end - start) / 1_000_000; // Convert to ms

          self.recordRequest(path, duration, false);
          self.logRequest(request, response, duration);

          return response;
        } catch (error) {
          const end = Bun.nanoseconds();
          const duration = Number(end - start) / 1_000_000; // Convert to ms
          self.recordRequest(path, duration, true);
          throw error;
        }
      }
    };
  }

  private recordRequest(path: string, duration: number, isError: boolean) {
    const existing = this.requests.get(path);
    const stats = existing || {
      totalTime: 0,
      count: 0,
      errors: 0,
      lastRequest: undefined as number | undefined
    };

    stats.totalTime += duration;
    stats.count++;
    if (isError) stats.errors++;
    stats.lastRequest = Date.now();

    this.requests.set(path, stats);
  }

  private logRequest(request: Request, response: Response, duration: number) {
    const ms = duration;
    const status = response.status;
    const method = request.method;
    const path = new URL(request.url).pathname;

    const color = status >= 500 ? '\x1b[31m' : // red for 5xx
                  status >= 400 ? '\x1b[33m' : // yellow for 4xx
                  status >= 300 ? '\x1b[36m' : // cyan for 3xx
                  '\x1b[32m';                  // green for 2xx

    console.log(
      `${color}${method} ${path} ${status} - ${ms.toFixed(2)}ms\x1b[0m`
    );
  }

  getMetrics() {
    const metrics = Array.from(this.requests.entries()).map(([path, stats]) => ({
      path,
      requests: stats.count,
      errors: stats.errors,
      'avg_time_ms': stats.totalTime / stats.count,
      'error_rate': (stats.errors / stats.count) * 100,
      'last_request': stats.lastRequest ?
        ((Date.now() - stats.lastRequest) / 1000).toFixed(1) + 's ago' :
        'N/A'
    }));

    return {
      summary: this.getSummary(),
      details: metrics
    };
  }

  private getSummary() {
    let totalRequests = 0;
    let totalTime = 0;
    let totalErrors = 0;

    for (const stats of this.requests.values()) {
      totalRequests += stats.count;
      totalTime += stats.totalTime;
      totalErrors += stats.errors;
    }

    return {
      total_requests: totalRequests,
      total_errors: totalErrors,
      avg_response_time_ms: totalTime / totalRequests,
      error_rate: (totalErrors / totalRequests) * 100
    };
  }

  formatReport(): string {
    const metrics = this.getMetrics();

    const summaryTable = Bun.inspect.table([metrics.summary], undefined, {
      colors: true
    });

    const detailsTable = Bun.inspect.table(metrics.details, undefined, {
      colors: true
    });

    return summaryTable + '\n\n' + detailsTable;
  }
}

/**
 * Database Query Profiler
 */
class QueryProfiler {
  private queries: Array<{
    sql: string;
    duration: number;
    timestamp: number;
    params?: any[];
    error?: Error;
  }> = [];

  private slowQueryThreshold = 100; // 100ms in milliseconds

  profile<T>(sql: string, params?: any[], executor: () => T): T {
    const start = Bun.nanoseconds();

    try {
      const result = executor();
      const end = Bun.nanoseconds();
      const duration = Number(end - start) / 1_000_000; // Convert to ms
      this.recordQuery(sql, params, duration, null);

      // Check if slow
      if (duration > this.slowQueryThreshold / 1_000_000) {
        this.logSlowQuery(sql, params, duration);
      }

      return result;
    } catch (error) {
      const end = Bun.nanoseconds();
      const duration = Number(end - start) / 1_000_000; // Convert to ms
      this.recordQuery(sql, params, duration, error as Error);
      throw error;
    }
  }

  async profileAsync<T>(sql: string, params?: any[], executor: () => Promise<T>): Promise<T> {
    const start = Bun.nanoseconds();

    try {
      const result = await executor();
      const end = Bun.nanoseconds();
      const duration = Number(end - start) / 1_000_000; // Convert to ms
      this.recordQuery(sql, params, duration, null);

      if (duration > this.slowQueryThreshold / 1_000_000) {
        this.logSlowQuery(sql, params, duration);
      }

      return result;
    } catch (error) {
      const end = Bun.nanoseconds();
      const duration = Number(end - start) / 1_000_000; // Convert to ms
      this.recordQuery(sql, params, duration, error as Error);
      throw error;
    }
  }

  private recordQuery(sql: string, params: any[] | undefined, duration: number, error: Error | null) {
    this.queries.push({
      sql,
      params,
      duration,
      timestamp: Date.now(),
      error: error || undefined
    });

    // Keep only last 1000 queries
    if (this.queries.length > 1000) {
      this.queries.shift();
    }
  }

  private logSlowQuery(sql: string, params: any[] | undefined, duration: number) {
    const ms = duration;
    const truncatedSql = sql.length > 100 ? sql.substring(0, 100) + '...' : sql;

    console.warn(`\x1b[33m[SLOW QUERY] ${ms.toFixed(2)}ms: ${truncatedSql}\x1b[0m`);
    if (params) {
      console.warn(`  Params: ${Bun.inspect(params, { depth: 1 })}`);
    }
  }

  getStats() {
    const successful = this.queries.filter(q => !q.error);
    const failed = this.queries.filter(q => q.error);

    const totalDuration = successful.reduce((sum, q) => sum + q.duration, 0);
    const avgDuration = successful.length > 0 ? totalDuration / successful.length : 0;

    const slowQueries = successful.filter(q => q.duration > this.slowQueryThreshold);

    return {
      total_queries: this.queries.length,
      successful: successful.length,
      failed: failed.length,
      slow_queries: slowQueries.length,
      avg_duration_ms: avgDuration,
      failure_rate: (failed.length / this.queries.length) * 100,
      slow_query_rate: (slowQueries.length / successful.length) * 100
    };
  }

  formatReport(): string {
    const stats = this.getStats();
    const recentQueries = this.queries.slice(-10).map(q => ({
      sql: q.sql.length > 50 ? q.sql.substring(0, 50) + '...' : q.sql,
      duration_ms: q.duration,
      timestamp: new Date(q.timestamp).toISOString(),
      status: q.error ? '❌' : '✅'
    }));

    const statsTable = Bun.inspect.table([stats], undefined, {
      colors: true
    });

    const queriesTable = Bun.inspect.table(recentQueries, undefined, {
      colors: true
    });

    return statsTable + '\n\n' + queriesTable;
  }
}

/**
 * Complete Development Utilities Package
 */
class DevToolsClass {
  // Inspection utilities
  static inspect = Bun.inspect;
  static inspectTable = Bun.inspect.table;

  // Timing utilities
  static now = Bun.nanoseconds;

  // Create a debug context
  static createDebugContext(name: string) {
    const startTime = Bun.nanoseconds();
    const logs: string[] = [];

    return {
      log(...args: any[]) {
        const time = Number(Bun.nanoseconds() - startTime) / 1_000_000;
        const message = args.map(arg =>
          typeof arg === 'object' ? Bun.inspect(arg, { colors: true }) : arg
        ).join(' ');

        const entry = `[${time.toFixed(2)}ms] ${message}`;
        logs.push(entry);
        console.log(entry);
      },

      table(data: any[], properties?: string[]) {
        console.log(DevToolsClass.inspectTable(data, properties, { colors: true }));
      },

      time(label: string) {
        const marker = Bun.nanoseconds();
        return {
          end() {
            const duration = Number(Bun.nanoseconds() - marker) / 1_000_000;
            console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
            return duration;
          }
        };
      },

      getSummary() {
        const totalTime = Number(Bun.nanoseconds() - startTime) / 1_000_000;
        return {
          name,
          duration_ms: totalTime,
          log_count: logs.length,
          logs: logs.slice(-10) // Last 10 logs
        };
      }
    };
  }

  // Performance assertion
  static assertPerformance<T>(
    name: string,
    fn: () => T,
    maxMs: number
  ): T {
    const start = Bun.nanoseconds();
    const result = fn();
    const duration = Number(Bun.nanoseconds() - start) / 1_000_000;

    if (duration > maxMs) {
      console.warn(`⚠️  Performance warning: ${name} took ${duration.toFixed(2)}ms (max: ${maxMs}ms)`);
    } else {
      console.log(`✅ ${name}: ${duration.toFixed(2)}ms`);
    }

    return result;
  }
}

/**
 * Demo function showcasing all utilities
 */
async function demo() {
  console.log('🚀 Bun Inspection & Timing APIs Demo\n');

  // 1. Basic object inspection
  console.log('📊 Basic Object Inspection:');
  const obj = {
    foo: "bar",
    nested: { array: [1, 2, 3] },
    date: new Date(),
    regex: /test/gi,
    map: new Map([['key', 'value']]),
    set: new Set([1, 2, 3]),
    buffer: Buffer.from("hello"),
    uint8: new Uint8Array([1, 2, 3]),
    bigint: 123n,
    symbol: Symbol("test"),
    undefined: undefined,
    null: null,
    function: () => console.log("test")
  };
  console.log(Bun.inspect(obj, { colors: true }));
  console.log();

  // 2. Custom formatters
  console.log('👤 Custom User Formatter:');
  const user = new User(1, 'alice@example.com', new Date('2023-01-01'), {
    plan: 'premium',
    visits: 150,
    tags: ['developer', 'opensource']
  });
  console.log(user);
  console.log();

  console.log('🗄️  Query Result Formatter:');
  const result = new QueryResult(
    [
      { id: 1, name: 'Alice', age: 30 },
      { id: 2, name: 'Bob', age: 25 },
      { id: 3, name: 'Charlie', age: 35 },
      { id: 4, name: 'Diana', age: 28 }
    ],
    { queryTime: 45.67, rowCount: 4, cacheHit: true, fromCache: 'redis' }
  );
  console.log(result);
  console.log();

  console.log('🔍 Binary Data Inspector:');
  const binary = new BinaryInspector(
    new Uint8Array([
      0x48, 0x65, 0x6C, 0x6C, 0x6F, 0x20, 0x57, 0x6F,
      0x72, 0x6C, 0x64, 0x21, 0x00, 0xFF, 0xFE, 0xFD,
      0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08
    ])
  );
  console.log(binary);
  console.log();

  // 3. Advanced table formatting
  console.log('📋 Advanced Table with Custom Formatting:');
  const users = [
    { id: 1, name: 'Alice', score: 95, active: true },
    { id: 2, name: 'Bob', score: 87, active: false },
    { id: 3, name: 'Charlie', score: 92, active: true },
    { id: 4, name: 'Diana', score: 78, active: true }
  ];

  console.log(AdvancedTable.format(users, ['name', 'score'], {
    title: 'User Scores',
    border: 'rounded',
    sort: (a, b) => b.score - a.score,
    colors: true
  }));
  console.log();

  // 4. Benchmarking
  console.log('⏱️  Performance Benchmarking:');
  const bench = new Benchmark();

  // Sync benchmark
  bench.measure('array_operation', () => {
    const arr = Array.from({ length: 100000 }, (_, i) => i);
    return arr.map(x => x * 2).filter(x => x % 3 === 0).reduce((a, b) => a + b, 0);
  });

  // Async benchmark
  await bench.measureAsync('http_request', async () => {
    await fetch('https://api.github.com/users/oven-sh');
  });

  console.log(bench.format());
  console.log();

  // 5. DevTools context
  console.log('🔧 DevTools Debug Context:');
  const debug = DevTools.createDebugContext('DemoSession');

  debug.log('Starting demo operations');
  const timer = debug.time('processing');

  // Simulate some work
  await Bun.sleep(50);

  debug.table([
    { id: 1, name: 'Alice', processed: true },
    { id: 2, name: 'Bob', processed: false }
  ]);

  timer.end();
  debug.log('Demo operations complete');

  console.log('Session Summary:', DevToolsClass.inspect(debug.getSummary(), { colors: true }));
  console.log();

  console.log('✨ Demo complete! These utilities provide production-ready solutions for debugging, profiling, and monitoring.');
}

// Run demo if executed directly
if (import.meta.main) {
  demo().catch(console.error);
}

export {
  User,
  QueryResult,
  BinaryInspector,
  AdvancedTable,
  Benchmark,
  PerformanceMonitor,
  QueryProfiler
};

export const DevTools = DevToolsClass;
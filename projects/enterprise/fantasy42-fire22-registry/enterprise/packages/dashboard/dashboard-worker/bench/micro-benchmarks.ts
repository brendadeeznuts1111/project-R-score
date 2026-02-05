#!/usr/bin/env bun

/**
 * 🎯 Fire22 Micro-Benchmarks
 *
 * Precision microbenchmarking for critical functions
 * Custom implementation optimized for Bun runtime
 */

import { $ } from 'bun';
import BenchmarkSuite from './benchmark-suite';
import MemoryProfiler from './memory-profiler';

interface MicroBenchmarkResult {
  name: string;
  samples: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  stdDev: number;
  opsPerSecond: number;
  confidence: number;
}

export class MicroBenchmarks {
  private suite: BenchmarkSuite;
  private profiler: MemoryProfiler;

  constructor() {
    this.suite = new BenchmarkSuite('Fire22 Micro-Benchmarks');
    this.profiler = new MemoryProfiler('Micro-Benchmark Memory');
  }

  /**
   * Run microbenchmark with statistical analysis
   */
  async microBenchmark(
    name: string,
    fn: () => void | Promise<void>,
    options: {
      samples?: number;
      minTime?: number;
      maxTime?: number;
    } = {}
  ): Promise<MicroBenchmarkResult> {
    const { samples = 1000, minTime = 0.05, maxTime = 5 } = options;

    console.log(`\n🎯 Microbenchmark: ${name}`);
    console.log(`   Target samples: ${samples}`);

    const timings: number[] = [];
    let iterations = 1;
    let totalTime = 0;

    // Warmup phase
    console.log('   Warming up...');
    for (let i = 0; i < 100; i++) {
      await fn();
    }

    // Auto-calibrate iterations
    const calibrateStart = Bun.nanoseconds();
    await fn();
    const calibrateEnd = Bun.nanoseconds();
    const singleRunTime = Number(calibrateEnd - calibrateStart) / 1_000_000_000;

    if (singleRunTime < minTime) {
      iterations = Math.ceil(minTime / singleRunTime);
      console.log(`   Calibrated to ${iterations} iterations per sample`);
    }

    // Collect samples
    process.stdout.write('   Collecting samples...');
    for (let i = 0; i < samples; i++) {
      const start = Bun.nanoseconds();

      for (let j = 0; j < iterations; j++) {
        await fn();
      }

      const end = Bun.nanoseconds();
      const time = Number(end - start) / iterations;
      timings.push(time);

      if (i % Math.floor(samples / 10) === 0) {
        process.stdout.write('.');
      }

      totalTime += time / 1_000_000_000;
      if (totalTime > maxTime) {
        console.log(` (stopped at ${i} samples due to time limit)`);
        break;
      }
    }
    console.log(' ✅');

    // Statistical analysis
    const sorted = [...timings].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const median = sorted[Math.floor(sorted.length / 2)];
    const mean = timings.reduce((sum, t) => sum + t, 0) / timings.length;

    // Standard deviation
    const variance =
      timings.reduce((sum, t) => {
        const diff = t - mean;
        return sum + diff * diff;
      }, 0) / timings.length;
    const stdDev = Math.sqrt(variance);

    // Confidence interval (95%)
    const confidence = 1.96 * (stdDev / Math.sqrt(timings.length));

    const result: MicroBenchmarkResult = {
      name,
      samples: timings.length,
      min,
      max,
      mean,
      median,
      stdDev,
      opsPerSecond: Math.floor(1_000_000_000 / mean),
      confidence,
    };

    this.printResult(result);
    return result;
  }

  /**
   * Benchmark API handlers
   */
  async benchmarkApiHandlers(): Promise<void> {
    console.log('\n🌐 API Handler Benchmarks');
    console.log('='.repeat(50));

    // Mock request/response objects
    const mockRequest = () =>
      new Request('http://localhost/api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: 'data' }),
      });

    await this.microBenchmark('Request Parsing', async () => {
      const req = mockRequest();
      await req.json();
    });

    await this.microBenchmark('Response Creation', () => {
      new Response(JSON.stringify({ status: 'ok' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    });

    await this.microBenchmark('URL Parsing', () => {
      const url = new URL('http://localhost/api/test?param=value');
      url.searchParams.get('param');
    });

    await this.microBenchmark('Headers Processing', () => {
      const headers = new Headers();
      headers.set('Content-Type', 'application/json');
      headers.set('Authorization', 'Bearer token');
      headers.get('Content-Type');
    });
  }

  /**
   * Benchmark database operations
   */
  async benchmarkDatabaseOps(): Promise<void> {
    console.log('\n💾 Database Operation Benchmarks');
    console.log('='.repeat(50));

    // SQL query generation benchmarks
    await this.microBenchmark('SQL Query Building', () => {
      const table = 'users';
      const fields = ['id', 'name', 'email'];
      const where = { active: true, role: 'admin' };

      const query = `SELECT ${fields.join(', ')} FROM ${table} WHERE ${Object.entries(where)
        .map(([k, v]) => `${k} = '${v}'`)
        .join(' AND ')}`;
    });

    await this.microBenchmark('Parameterized Query', () => {
      const params = ['user123', true, Date.now()];
      const query = 'INSERT INTO logs (user_id, success, timestamp) VALUES (?, ?, ?)';
      const prepared = { query, params };
    });

    await this.microBenchmark('Result Processing', () => {
      const rows = Array(100)
        .fill(null)
        .map((_, i) => ({
          id: i,
          name: `User ${i}`,
          email: `user${i}@example.com`,
          metadata: JSON.stringify({ created: Date.now() }),
        }));

      rows.map(row => ({
        ...row,
        metadata: JSON.parse(row.metadata),
      }));
    });
  }

  /**
   * Benchmark data transformations
   */
  async benchmarkDataTransformations(): Promise<void> {
    console.log('\n🔄 Data Transformation Benchmarks');
    console.log('='.repeat(50));

    const sampleData = {
      users: Array(100)
        .fill(null)
        .map((_, i) => ({
          id: i,
          firstName: `First${i}`,
          lastName: `Last${i}`,
          email: `user${i}@example.com`,
          age: 20 + (i % 50),
        })),
    };

    await this.microBenchmark('Object Mapping', () => {
      sampleData.users.map(user => ({
        fullName: `${user.firstName} ${user.lastName}`,
        contact: user.email,
        ageGroup: user.age < 30 ? 'young' : user.age < 50 ? 'middle' : 'senior',
      }));
    });

    await this.microBenchmark('Filtering & Sorting', () => {
      sampleData.users
        .filter(user => user.age >= 25)
        .sort((a, b) => a.lastName.localeCompare(b.lastName));
    });

    await this.microBenchmark('Grouping', () => {
      const grouped = sampleData.users.reduce(
        (acc, user) => {
          const ageGroup = Math.floor(user.age / 10) * 10;
          if (!acc[ageGroup]) acc[ageGroup] = [];
          acc[ageGroup].push(user);
          return acc;
        },
        {} as Record<number, typeof sampleData.users>
      );
    });

    await this.microBenchmark('Deep Clone', () => {
      JSON.parse(JSON.stringify(sampleData));
    });

    await this.microBenchmark('Structured Clone', () => {
      structuredClone(sampleData);
    });
  }

  /**
   * Benchmark string operations
   */
  async benchmarkStringOps(): Promise<void> {
    console.log('\n📝 String Operation Benchmarks');
    console.log('='.repeat(50));

    const shortString = 'The quick brown fox';
    const longString = 'Lorem ipsum dolor sit amet, '.repeat(100);
    const template = 'Hello {{name}}, welcome to {{place}}!';

    await this.microBenchmark('String Concatenation', () => {
      let result = '';
      for (let i = 0; i < 10; i++) {
        result += shortString;
      }
    });

    await this.microBenchmark('Template Literals', () => {
      const name = 'User';
      const place = 'Fire22';
      `Hello ${name}, welcome to ${place}!`;
    });

    await this.microBenchmark('String Replace', () => {
      template.replace('{{name}}', 'User').replace('{{place}}', 'Fire22');
    });

    await this.microBenchmark('Regex Replace', () => {
      template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        const values: Record<string, string> = { name: 'User', place: 'Fire22' };
        return values[key] || match;
      });
    });

    await this.microBenchmark('String Split & Join', () => {
      longString
        .split(' ')
        .map(word => word.toUpperCase())
        .join(' ');
    });
  }

  /**
   * Benchmark crypto operations
   */
  async benchmarkCryptoOps(): Promise<void> {
    console.log('\n🔐 Crypto Operation Benchmarks');
    console.log('='.repeat(50));

    const data = 'The quick brown fox jumps over the lazy dog';
    const encoder = new TextEncoder();
    const bytes = encoder.encode(data);

    await this.microBenchmark('SHA-256 (Bun)', () => {
      const hasher = new Bun.CryptoHasher('sha256');
      hasher.update(data);
      hasher.digest();
    });

    await this.microBenchmark('SHA-512 (Bun)', () => {
      const hasher = new Bun.CryptoHasher('sha512');
      hasher.update(data);
      hasher.digest();
    });

    await this.microBenchmark('MD5 (Bun)', () => {
      const hasher = new Bun.CryptoHasher('md5');
      hasher.update(data);
      hasher.digest();
    });

    await this.microBenchmark('Base64 Encode', () => {
      Buffer.from(bytes).toString('base64');
    });

    await this.microBenchmark('Base64 Decode', () => {
      const b64 = 'VGhlIHF1aWNrIGJyb3duIGZveCBqdW1wcyBvdmVyIHRoZSBsYXp5IGRvZw==';
      Buffer.from(b64, 'base64');
    });

    await this.microBenchmark('Random UUID', () => {
      crypto.randomUUID();
    });

    await this.microBenchmark('Random Bytes', () => {
      crypto.getRandomValues(new Uint8Array(32));
    });
  }

  /**
   * Benchmark validation operations
   */
  async benchmarkValidation(): Promise<void> {
    console.log('\n✅ Validation Benchmarks');
    console.log('='.repeat(50));

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;

    await this.microBenchmark('Email Validation', () => {
      emailRegex.test('user@example.com');
    });

    await this.microBenchmark('Phone Validation', () => {
      phoneRegex.test('+12125551234');
    });

    await this.microBenchmark('JSON Schema Validation', () => {
      const data = { id: 1, name: 'Test', email: 'test@example.com' };
      const valid =
        typeof data.id === 'number' &&
        typeof data.name === 'string' &&
        typeof data.email === 'string' &&
        emailRegex.test(data.email);
    });

    await this.microBenchmark('Type Guards', () => {
      const value: unknown = { id: 1, name: 'Test' };
      const isUser = (v: unknown): v is { id: number; name: string } => {
        return (
          typeof v === 'object' &&
          v !== null &&
          'id' in v &&
          'name' in v &&
          typeof (v as any).id === 'number' &&
          typeof (v as any).name === 'string'
        );
      };
      isUser(value);
    });
  }

  /**
   * Print formatted result
   */
  private printResult(result: MicroBenchmarkResult): void {
    console.log(`\n   ✅ ${result.name}`);
    console.log(`      Samples: ${result.samples}`);
    console.log(
      `      Mean: ${this.formatNanoseconds(result.mean)} ± ${this.formatNanoseconds(result.confidence)}`
    );
    console.log(`      Median: ${this.formatNanoseconds(result.median)}`);
    console.log(
      `      Min/Max: ${this.formatNanoseconds(result.min)} / ${this.formatNanoseconds(result.max)}`
    );
    console.log(`      StdDev: ${this.formatNanoseconds(result.stdDev)}`);
    console.log(`      Ops/sec: ${result.opsPerSecond.toLocaleString()}`);
  }

  /**
   * Format nanoseconds
   */
  private formatNanoseconds(ns: number): string {
    if (ns < 1000) return `${ns.toFixed(2)}ns`;
    if (ns < 1_000_000) return `${(ns / 1000).toFixed(2)}μs`;
    if (ns < 1_000_000_000) return `${(ns / 1_000_000).toFixed(2)}ms`;
    return `${(ns / 1_000_000_000).toFixed(2)}s`;
  }

  /**
   * Run all microbenchmarks
   */
  async runAll(): Promise<void> {
    console.log('🎯 Fire22 Micro-Benchmarks Suite');
    console.log('='.repeat(50));
    console.log(`Bun Version: ${process.versions.bun}`);
    console.log(`Started: ${new Date().toISOString()}`);

    await this.benchmarkApiHandlers();
    await this.benchmarkDatabaseOps();
    await this.benchmarkDataTransformations();
    await this.benchmarkStringOps();
    await this.benchmarkCryptoOps();
    await this.benchmarkValidation();

    console.log('\n' + '='.repeat(50));
    console.log('✅ All microbenchmarks completed!');
  }
}

// Run if executed directly
if (import.meta.main) {
  const benchmarks = new MicroBenchmarks();
  await benchmarks.runAll();
}

export default MicroBenchmarks;

/**
 * @fileoverview Security CLI integration tests
 * @module test/security-cli
 */

import { afterEach, test, expect, describe } from 'bun:test';
import { runBun, runCli, tempDir } from './harness';

// Cleanup: Ensure no hanging processes
afterEach(() => {
	// Bun test automatically handles cleanup, but we can add explicit cleanup if needed
});

describe('Security CLI', () => {
  describe('--help', () => {
    test('displays help message', async () => {
      const result = await runCli('security', ['--help'], { timeout: 5000 });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('NEXUS Security Testing CLI');
      expect(result.stdout).toContain('pentest web');
      expect(result.stdout).toContain('headers analyze');
      expect(result.stdout).toContain('sri generate');
    }, 5000); // 5 second timeout (Bun default)

    test('displays help with -h flag', async () => {
      const result = await runCli('security', ['-h']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('NEXUS Security Testing CLI');
    });

    test('displays help when no command provided', async () => {
      const result = await runCli('security', []);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('COMMANDS:');
    });
  });

  describe('sri hash', () => {
    test('generates SHA-384 hash for a file', async () => {
      await using dir = await tempDir('sri-test', {
        'test.js': 'console.log("hello");',
      });

      const result = await runBun(
        ['run', 'src/cli/security.ts', 'sri', 'hash', `--file=${dir.file('test.js')}`],
        { cwd: process.cwd(), timeout: 5000 }
      );

      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toMatch(/^sha384-[A-Za-z0-9+/]+=*$/);
    }, 5000); // 5 second timeout (Bun default)

    test('generates SHA-256 hash with algorithm flag', async () => {
      await using dir = await tempDir('sri-test', {
        'test.js': 'console.log("hello");',
      });

      const result = await runBun(
        ['run', 'src/cli/security.ts', 'sri', 'hash', `--file=${dir.file('test.js')}`, '--algorithm=sha256'],
        { cwd: process.cwd() }
      );

      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toMatch(/^sha256-[A-Za-z0-9+/]+=*$/);
    });

    test('outputs JSON with --json flag', async () => {
      await using dir = await tempDir('sri-test', {
        'test.js': 'console.log("hello");',
      });

      const result = await runBun(
        ['run', 'src/cli/security.ts', 'sri', 'hash', `--file=${dir.file('test.js')}`, '--json'],
        { cwd: process.cwd() }
      );

      expect(result.exitCode).toBe(0);
      const json = JSON.parse(result.stdout);
      expect(json).toHaveProperty('file');
      expect(json).toHaveProperty('integrity');
      expect(json).toHaveProperty('algorithm', 'sha384');
    });

    test('fails for non-existent file', async () => {
      const result = await runBun(
        ['run', 'src/cli/security.ts', 'sri', 'hash', '--file=/nonexistent/file.js'],
        { cwd: process.cwd() }
      );

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Error');
    });

    test('fails without --file argument', async () => {
      const result = await runBun(
        ['run', 'src/cli/security.ts', 'sri', 'hash'],
        { cwd: process.cwd() }
      );

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('--file is required');
    });
  });

  describe('sri generate', () => {
    test('generates hashes for multiple files', async () => {
      await using dir = await tempDir('sri-gen', {
        'app.js': 'const app = {};',
        'util.js': 'export const util = {};',
        'style.css': 'body { margin: 0; }',
      });

      const result = await runBun(
        ['run', 'src/cli/security.ts', 'sri', 'generate', `--files=${dir}/*.js,${dir}/*.css`],
        { cwd: process.cwd() }
      );

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Generated');
      expect(result.stdout).toContain('sha384-');
    });

    test('creates manifest file', async () => {
      await using dir = await tempDir('sri-manifest', {
        'app.js': 'const app = {};',
      });

      const manifestPath = dir.file('sri-manifest.json');

      const result = await runBun(
        ['run', 'src/cli/security.ts', 'sri', 'generate', `--files=${dir}/*.js`, `--output=${manifestPath}`],
        { cwd: process.cwd() }
      );

      expect(result.exitCode).toBe(0);
      expect(await dir.exists('sri-manifest.json')).toBe(true);

      const manifest = JSON.parse(await dir.readFile('sri-manifest.json'));
      expect(manifest).toHaveProperty('generated');
      expect(manifest).toHaveProperty('algorithm', 'sha384');
      expect(manifest).toHaveProperty('files');
    });
  });

  describe('sri verify', () => {
    test('verifies files against manifest', async () => {
      await using dir = await tempDir('sri-verify', {
        'app.js': 'const app = {};',
      });

      // First generate
      await runBun(
        ['run', 'src/cli/security.ts', 'sri', 'generate', `--files=${dir}/*.js`, `--output=${dir.file('sri-manifest.json')}`],
        { cwd: process.cwd() }
      );

      // Then verify
      const result = await runBun(
        ['run', 'src/cli/security.ts', 'sri', 'verify', `--manifest=${dir.file('sri-manifest.json')}`],
        { cwd: process.cwd() }
      );

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('verified successfully');
    });

    test('fails when file content changed', async () => {
      await using dir = await tempDir('sri-verify-fail', {
        'app.js': 'const app = {};',
      });

      // Generate manifest
      await runBun(
        ['run', 'src/cli/security.ts', 'sri', 'generate', `--files=${dir}/*.js`, `--output=${dir.file('sri-manifest.json')}`],
        { cwd: process.cwd() }
      );

      // Modify file
      await dir.writeFiles({ 'app.js': 'const app = { modified: true };' });

      // Verify should fail
      const result = await runBun(
        ['run', 'src/cli/security.ts', 'sri', 'verify', `--manifest=${dir.file('sri-manifest.json')}`],
        { cwd: process.cwd() }
      );

      expect(result.exitCode).toBe(1);
      expect(result.stdout).toContain('integrity mismatch');
    });
  });
});

describe('Headers Analyzer', () => {
  // Test HeadersAnalyzer class directly
  test('analyzes security headers', async () => {
    const { HeadersAnalyzer } = await import('../src/security/headers');

    // Create mock fetch for testing
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response('OK', {
      headers: {
        'Content-Type': 'text/html',
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
      },
    });

    try {
      const analyzer = new HeadersAnalyzer({ url: 'http://test.local' });
      const report = await analyzer.analyze();

      expect(report.url).toBe('http://test.local');
      expect(report.overallGrade).toBeTruthy();
      expect(report.score).toBeGreaterThanOrEqual(0);
      expect(report.headers.length).toBeGreaterThan(0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('identifies missing headers', async () => {
    const { HeadersAnalyzer } = await import('../src/security/headers');

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response('OK', {
      headers: { 'Content-Type': 'text/html' },
    });

    try {
      const analyzer = new HeadersAnalyzer({ url: 'http://test.local' });
      const report = await analyzer.analyze();

      expect(report.missing.length).toBeGreaterThan(0);
      expect(report.missing).toContain('Content-Security-Policy');
      expect(report.missing).toContain('Strict-Transport-Security');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('grades headers correctly', async () => {
    // Test the grading logic directly with a mock report
    const { HeadersAnalyzer } = await import('../src/security/headers');

    // Test with empty headers (worst case) - should get F
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response('OK', {
      headers: { 'Content-Type': 'text/html' },
    });

    try {
      const analyzer = new HeadersAnalyzer({ url: 'http://test.local' });
      const report = await analyzer.analyze();

      // With no security headers, should get F grade
      expect(report.overallGrade).toBe('F');
      expect(report.score).toBeLessThanOrEqual(50);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('CLI fails without --url argument', async () => {
    const result = await runBun(
      ['run', 'src/cli/security.ts', 'headers', 'analyze'],
      { cwd: process.cwd() }
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('--url is required');
  });
});

describe('Headers Optimizer', () => {
  test('generates optimized headers', async () => {
    const { HeadersAnalyzer } = await import('../src/security/headers');

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response('<html><body>Test</body></html>', {
      headers: { 'Content-Type': 'text/html' },
    });

    try {
      const analyzer = new HeadersAnalyzer({ url: 'http://test.local', generateCsp: true });
      await analyzer.analyze();
      const optimized = analyzer.getOptimizedHeaders();

      // Optimized headers should include security recommendations
      expect(typeof optimized).toBe('object');
      // At minimum, should have some headers recommended
      expect(Object.keys(optimized).length).toBeGreaterThan(0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe('Headers Implementation', () => {
  // Test the generateImplementation function directly instead of via CLI
  // (CLI tests would need a persistent server across process boundaries)

  test('generates nginx config', async () => {
    const { generateImplementation } = await import('../src/security/headers');
    const headers = {
      'Content-Security-Policy': "default-src 'self'",
      'X-Frame-Options': 'DENY',
    };
    const code = generateImplementation(headers, 'nginx');

    expect(code).toContain('add_header');
    expect(code).toContain('Content-Security-Policy');
    expect(code).toContain('X-Frame-Options');
  });

  test('generates hono middleware', async () => {
    const { generateImplementation } = await import('../src/security/headers');
    const headers = {
      'X-Content-Type-Options': 'nosniff',
    };
    const code = generateImplementation(headers, 'hono');

    expect(code).toContain('createMiddleware');
    expect(code).toContain("c.header(");
    expect(code).toContain('X-Content-Type-Options');
  });

  test('generates express middleware', async () => {
    const { generateImplementation } = await import('../src/security/headers');
    const headers = {
      'Strict-Transport-Security': 'max-age=31536000',
    };
    const code = generateImplementation(headers, 'express');

    expect(code).toContain('app.use');
    expect(code).toContain('res.setHeader');
    expect(code).toContain('Strict-Transport-Security');
  });

  test('generates apache config', async () => {
    const { generateImplementation } = await import('../src/security/headers');
    const headers = {
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    };
    const code = generateImplementation(headers, 'apache');

    expect(code).toContain('Header always set');
    expect(code).toContain('Referrer-Policy');
  });
});

describe('Pentest Quick', () => {
  test('WebPentester scans target', async () => {
    const { WebPentester } = await import('../src/security/pentest');

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url: string | URL | Request, opts?: RequestInit) => {
      return new Response('<html><body>Test</body></html>', {
        headers: {
          'Content-Type': 'text/html',
          'Access-Control-Allow-Origin': '*',
        },
      });
    };

    try {
      const pentester = new WebPentester({
        target: 'http://test.local',
        depth: 'quick',
        maxRequests: 10,
        checks: ['headers', 'cors'],
      });

      const result = await pentester.scan();

      expect(result.target).toBe('http://test.local');
      expect(result.summary).toHaveProperty('total');
      expect(result.coverage).toHaveProperty('urlsTested');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('CLI fails without --target argument', async () => {
    const result = await runBun(
      ['run', 'src/cli/security.ts', 'pentest', 'quick'],
      { cwd: process.cwd() }
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('--target is required');
  });
});

describe('Unknown Commands', () => {
  test('shows error for unknown command group', async () => {
    const result = await runBun(
      ['run', 'src/cli/security.ts', 'foobar'],
      { cwd: process.cwd() }
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Unknown command');
  });

  test('shows error for unknown pentest action', async () => {
    const result = await runBun(
      ['run', 'src/cli/security.ts', 'pentest', 'foobar'],
      { cwd: process.cwd() }
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Unknown pentest action');
  });

  test('shows error for unknown headers action', async () => {
    const result = await runBun(
      ['run', 'src/cli/security.ts', 'headers', 'foobar'],
      { cwd: process.cwd() }
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Unknown headers action');
  });

  test('shows error for unknown sri action', async () => {
    const result = await runBun(
      ['run', 'src/cli/security.ts', 'sri', 'foobar'],
      { cwd: process.cwd() }
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Unknown sri action');
  });
});

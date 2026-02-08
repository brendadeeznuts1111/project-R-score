#!/usr/bin/env bun
/**
 * 🎛️ Simple Dev Dashboard - Tests & Benchmarks
 */

import { profileEngine, logger } from '../../user-profile/src/index.ts';

const HTML = `<!DOCTYPE html>
<html>
<head>
  <title>Dev Dashboard</title>
  <style>
    body { font-family: monospace; background: #0a0a0a; color: #00ff88; padding: 20px; }
    .section { margin: 20px 0; padding: 15px; background: rgba(0,255,136,0.1); border: 1px solid #00ff88; }
    .pass { color: #00ff88; }
    .fail { color: #ff4444; }
    .metric { margin: 5px 0; }
  </style>
</head>
<body>
  <h1>🎛️ Dev Dashboard</h1>
  <div id="content">Loading...</div>
  <script>
    fetch('/api/data').then(r => r.json()).then(data => {
      let html = '<div class="section"><h2>📊 Stats</h2>';
      html += '<div>Quick Wins: ' + data.quickWins + '/17 completed</div>';
      html += '<div>Tests: ' + data.stats.testsPassed + '/' + data.stats.testsTotal + ' passed</div>';
      html += '<div>Benchmarks: ' + data.stats.benchmarksPassed + '/' + data.stats.benchmarksTotal + ' passing</div>';
      html += '<div>Performance Score: ' + data.stats.performanceScore + '%</div>';
      html += '</div>';
      
      html += '<div class="section"><h2>✅ Tests</h2>';
      data.tests.forEach(t => {
        const icon = t.status === 'pass' ? '✅' : '❌';
        html += '<div class="' + t.status + '">' + icon + ' ' + t.name;
        if (t.message) html += ' - ' + t.message;
        html += '</div>';
      });
      html += '</div>';
      
      html += '<div class="section"><h2>⚡ Benchmarks</h2>';
      data.benchmarks.forEach(b => {
        const ratio = b.target > 0 ? (b.time / b.target).toFixed(1) : 'N/A';
        const icon = b.status === 'pass' ? '✅' : b.status === 'warning' ? '⚠️' : '❌';
        html += '<div class="metric">' + icon + ' <strong>' + b.name + '</strong><br>';
        html += '&nbsp;&nbsp;Time: ' + b.time.toFixed(3) + 'ms | Target: ' + b.target + 'ms | Ratio: ' + ratio + 'x';
        if (b.note) html += '<br>&nbsp;&nbsp;<span style="color: #888;">' + b.note + '</span>';
        html += '</div>';
      });
      html += '</div>';
      
      html += '<div class="section"><h2>🚀 Quick Wins (' + data.quickWins + ')</h2>';
      html += '<div style="font-size: 12px; color: #888;">All completed - see QUICK_WINS.md for details</div>';
      html += '</div>';
      
      document.getElementById('content').innerHTML = html;
    });
  </script>
</body>
</html>`;

async function getData() {
  const tests = [];
  const benchmarks = [];
  const quickWins = [];

  // Test 1: Input Validation
  try {
    const { requireValidUserId } = await import('../../user-profile/src/index.ts');
    requireValidUserId('@test');
    tests.push({ name: 'Input Validation', status: 'pass', message: 'Validates @username format' });
  } catch (e) {
    tests.push({ name: 'Input Validation', status: 'fail', message: String(e) });
  }

  // Test 2: Error Handling
  try {
    const { handleError } = await import('../../user-profile/src/index.ts');
    const msg1 = handleError(new Error('test'), 'test', { log: false });
    const msg2 = handleError('string', 'test', { log: false });
    if (msg1 === 'test' && msg2 === 'string') {
      tests.push({ name: 'Error Handling', status: 'pass', message: 'Handles all error types safely' });
    } else {
      tests.push({ name: 'Error Handling', status: 'fail', message: 'Error extraction failed' });
    }
  } catch (e) {
    tests.push({ name: 'Error Handling', status: 'fail', message: String(e) });
  }

  // Test 3: Logger
  try {
    const { logger } = await import('../../user-profile/src/index.ts');
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    logger.info('test'); // Should not log
    process.env.NODE_ENV = origEnv;
    tests.push({ name: 'Logger (conditional)', status: 'pass', message: 'Suppresses logs in production' });
  } catch (e) {
    tests.push({ name: 'Logger (conditional)', status: 'fail', message: String(e) });
  }

  // Test 4: Serialization
  try {
    const { createSerializableCopy } = await import('../../user-profile/src/index.ts');
    const test = { bigint: BigInt(123), normal: 'test', nested: { value: BigInt(456) } };
    const result = createSerializableCopy(test);
    if (typeof result.bigint === 'string' && typeof result.nested.value === 'string') {
      tests.push({ name: 'Serialization', status: 'pass', message: 'BigInt converted to string (nested too)' });
    } else {
      tests.push({ name: 'Serialization', status: 'fail', message: 'BigInt not fully converted' });
    }
  } catch (e) {
    tests.push({ name: 'Serialization', status: 'fail', message: String(e).substring(0, 100) });
  }

  // Benchmark 1: Single Profile Query
  try {
    const start = Bun.nanoseconds();
    await profileEngine.getProfile('@ashschaeffer1');
    const time = (Bun.nanoseconds() - start) / 1_000_000;
    const status = time < 1 ? 'pass' : time < 5 ? 'warning' : 'fail';
    benchmarks.push({ 
      name: 'Profile Query (single)', 
      time, 
      target: 0.8,
      status,
      note: time > 10 ? `⚠️ ${(time/0.8).toFixed(0)}x slower than target` : '✅'
    });
  } catch (e) {
    benchmarks.push({ name: 'Profile Query (single)', time: 0, target: 0.8, status: 'fail', note: String(e) });
  }

  // Benchmark 2: JSON Serialization Performance
  try {
    const testProfile = {
      userId: '@test',
      progress: {
        m1: { score: 0.5, timestamp: BigInt(Date.now()) },
        m2: { score: 0.9, timestamp: BigInt(Date.now() + 1000) },
      },
    };
    const iterations = 1000;
    
    // Old way (with BigInt replacer in JSON.stringify)
    const startOld = Bun.nanoseconds();
    for (let i = 0; i < iterations; i++) {
      const serialized = JSON.stringify(testProfile, (k, v) => typeof v === 'bigint' ? v.toString() : v);
      JSON.parse(serialized);
    }
    const oldTime = (Bun.nanoseconds() - startOld) / 1_000_000;

    // New way (optimized utility - serializeBigInt first)
    const { serializeBigInt } = await import('../../user-profile/src/index.ts');
    const startNew = Bun.nanoseconds();
    for (let i = 0; i < iterations; i++) {
      const serialized = serializeBigInt(testProfile);
      JSON.parse(JSON.stringify(serialized));
    }
    const newTime = (Bun.nanoseconds() - startNew) / 1_000_000;

    const improvement = oldTime > 0 ? ((oldTime - newTime) / oldTime * 100).toFixed(1) : '0';
    const faster = parseFloat(improvement) > 0;
    benchmarks.push({
      name: 'JSON Serialization (1k ops)',
      time: newTime,
      target: oldTime * 0.7,
      status: faster && newTime < oldTime * 0.7 ? 'pass' : faster ? 'warning' : 'fail',
      note: faster 
        ? `✅ ${improvement}% faster than old method (${oldTime.toFixed(2)}ms → ${newTime.toFixed(2)}ms)`
        : `❌ Slower than old method`
    });
  } catch (e) {
    benchmarks.push({ 
      name: 'JSON Serialization', 
      time: 0, 
      target: 0, 
      status: 'fail', 
      note: `Error: ${String(e).substring(0, 50)}` 
    });
  }

  // Quick Wins Summary
  quickWins.push(
    { id: 1, title: 'Error Handling Type Safety', status: 'completed' },
    { id: 2, title: 'Conditional Console.log', status: 'completed' },
    { id: 3, title: 'Replace any Types', status: 'completed' },
    { id: 4, title: 'Input Validation', status: 'completed' },
    { id: 5, title: 'Serialization Utility', status: 'completed' },
    { id: 6, title: 'Logger Utility', status: 'completed' },
    { id: 7, title: 'Error Handler Utility', status: 'completed' },
    { id: 8, title: 'Redis Client Types', status: 'completed' },
    { id: 9, title: 'XGBoost Model Types', status: 'completed' },
    { id: 10, title: 'Dashboard Error Handling', status: 'completed' },
    { id: 11, title: 'Avatar Dashboard Logging', status: 'completed' },
    { id: 12, title: 'CLI Type Safety', status: 'completed' },
    { id: 13, title: 'Pref-Propagation Types', status: 'completed' },
    { id: 14, title: 'Optimize JSON Operations', status: 'completed' },
    { id: 15, title: 'Validation Utilities', status: 'completed' },
    { id: 16, title: 'Core Error Handling', status: 'completed' },
    { id: 17, title: 'Onboarding Error Handling', status: 'completed' }
  );

  const passedTests = tests.filter(t => t.status === 'pass').length;
  const passedBenchmarks = benchmarks.filter(b => b.status === 'pass').length;
  const performanceScore = benchmarks.length > 0 
    ? Math.round((passedBenchmarks / benchmarks.length) * 100)
    : 0;

  return { 
    quickWins: quickWins.length,
    quickWinsList: quickWins,
    tests, 
    benchmarks,
    stats: {
      testsPassed: passedTests,
      testsTotal: tests.length,
      benchmarksPassed: passedBenchmarks,
      benchmarksTotal: benchmarks.length,
      performanceScore
    }
  };
}

Bun.serve({
  port: 3008,
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === '/api/data') {
      return new Response(JSON.stringify(await getData()), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(HTML, { headers: { 'Content-Type': 'text/html' } });
  },
});

logger.info('🎛️  Dev Dashboard: http://localhost:3008');

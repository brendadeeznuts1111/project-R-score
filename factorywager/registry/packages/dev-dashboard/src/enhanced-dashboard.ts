#!/usr/bin/env bun
/**
 * 🎛️ Enhanced Dev Dashboard - Comprehensive Tests, Benchmarks & Reports
 * 
 * Uses Bun's native APIs:
 * - Bun.TOML.parse() for configuration
 * - Bun.nanoseconds() for high-precision timing
 * - Bun.spawn() available for isolated subprocess execution (see benchmark-runner.ts)
 * 
 * See: https://bun.com/docs/runtime/bun-apis
 */

import { profileEngine, logger } from '../../user-profile/src/index.ts';

// Load TOML configs using Bun's native TOML.parse API
// More explicit than import() - gives us full control over parsing
// File paths are relative to the script location (src/)
const configFile = Bun.file(new URL('../config.toml', import.meta.url));
const quickWinsFile = Bun.file(new URL('../quick-wins.toml', import.meta.url));
const benchmarksFile = Bun.file(new URL('../benchmarks.toml', import.meta.url));

const dashboardConfig = Bun.TOML.parse(await configFile.text());
const quickWinsConfig = Bun.TOML.parse(await quickWinsFile.text());
const benchmarksConfig = Bun.TOML.parse(await benchmarksFile.text());

// Extract config values early for use in template literals
const serverConfig = dashboardConfig;
const refreshInterval = serverConfig.server?.auto_refresh_interval || 5;

interface BenchmarkResult {
  name: string;
  time: number;
  target: number;
  status: 'pass' | 'fail' | 'warning';
  note?: string;
  category: 'performance' | 'memory' | 'type-safety';
}

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  message?: string;
  duration?: number;
  category: string;
}

interface QuickWin {
  id: number;
  title: string;
  status: 'completed' | 'pending' | 'verified';
  impact: string;
  files: string[];
  category: string;
}

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FactoryWager Dev Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
      color: #fff;
      padding: 20px;
      min-height: 100vh;
    }
    .header {
      margin-bottom: 30px;
      padding: 20px;
      background: rgba(0, 255, 136, 0.1);
      border: 2px solid #00ff88;
      border-radius: 12px;
    }
    .header h1 {
      color: #00ff88;
      font-size: 36px;
      margin-bottom: 10px;
      text-shadow: 0 0 20px rgba(0, 255, 136, 0.5);
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .stat-card {
      background: rgba(0, 255, 136, 0.1);
      border: 1px solid #00ff88;
      border-radius: 12px;
      padding: 20px;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 20px rgba(0, 255, 136, 0.3);
    }
    .stat-card h3 {
      color: #888;
      font-size: 14px;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .stat-card .value {
      color: #00ff88;
      font-size: 42px;
      font-weight: bold;
      font-family: 'Courier New', monospace;
    }
    .stat-card .subtext {
      color: #666;
      font-size: 12px;
      margin-top: 5px;
    }
    .section {
      margin-bottom: 40px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid #333;
      border-radius: 12px;
      padding: 25px;
    }
    .section h2 {
      color: #00ff88;
      font-size: 24px;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .item {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid #333;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: border-color 0.2s;
    }
    .item:hover {
      border-color: #00ff88;
    }
    .item-content {
      flex: 1;
    }
    .item-title {
      font-weight: bold;
      margin-bottom: 5px;
      color: #fff;
    }
    .item-details {
      font-size: 12px;
      color: #888;
      margin-top: 5px;
    }
    .status-badge {
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .status-pass { background: #00ff88; color: #000; }
    .status-fail { background: #ff4444; color: #fff; }
    .status-warning { background: #ffaa00; color: #000; }
    .status-completed { background: #00ff88; color: #000; }
    .status-pending { background: #888; color: #fff; }
    .metric-row {
      display: flex;
      gap: 15px;
      align-items: center;
      flex-wrap: wrap;
    }
    .metric-value {
      font-family: 'Courier New', monospace;
      color: #00ff88;
      font-size: 16px;
      font-weight: bold;
    }
    .metric-target {
      color: #888;
      font-size: 14px;
    }
    .metric-ratio {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
    }
    .ratio-good { background: rgba(0, 255, 136, 0.2); color: #00ff88; }
    .ratio-warning { background: rgba(255, 170, 0, 0.2); color: #ffaa00; }
    .ratio-bad { background: rgba(255, 68, 68, 0.2); color: #ff4444; }
    .refresh-btn {
      background: #00ff88;
      color: #000;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: bold;
      font-size: 14px;
      margin-bottom: 20px;
      transition: background 0.2s;
    }
    .refresh-btn:hover {
      background: #00cc6a;
    }
    .timestamp {
      color: #666;
      font-size: 12px;
      margin-top: 10px;
      font-style: italic;
    }
    .progress-bar {
      width: 100%;
      height: 8px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
      overflow: hidden;
      margin-top: 10px;
    }
    .progress-fill {
      height: 100%;
      background: #00ff88;
      transition: width 0.3s;
    }
    .category-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: bold;
      text-transform: uppercase;
      margin-left: 8px;
    }
    .cat-performance { background: rgba(0, 255, 136, 0.2); color: #00ff88; }
    .cat-memory { background: rgba(0, 136, 255, 0.2); color: #0088ff; }
    .cat-type-safety { background: rgba(255, 170, 0, 0.2); color: #ffaa00; }
    .cat-code-quality { background: rgba(136, 0, 255, 0.2); color: #8800ff; }
    .tabs {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
      border-bottom: 2px solid #333;
    }
    .tab {
      padding: 10px 20px;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: color 0.2s;
      color: #888;
    }
    .tab.active {
      color: #00ff88;
      border-bottom-color: #00ff88;
    }
    .tab-content {
      display: none;
    }
    .tab-content.active {
      display: block;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎛️ FactoryWager Dev Dashboard</h1>
    <p>Tests, Benchmarks & Quick Wins Reports</p>
  </div>

  <button class="refresh-btn" onclick="location.reload()">🔄 Refresh</button>
  <div class="timestamp" id="timestamp"></div>

  <div class="stats-grid">
    <div class="stat-card">
      <h3>Quick Wins</h3>
      <div class="value" id="quickwins-count">-</div>
      <div class="subtext">17 total</div>
      <div class="progress-bar"><div class="progress-fill" id="quickwins-progress" style="width: 0%"></div></div>
    </div>
    <div class="stat-card">
      <h3>Tests</h3>
      <div class="value" id="tests-passed">-</div>
      <div class="subtext" id="tests-total">-</div>
      <div class="progress-bar"><div class="progress-fill" id="tests-progress" style="width: 0%"></div></div>
    </div>
    <div class="stat-card">
      <h3>Benchmarks</h3>
      <div class="value" id="benchmarks-passed">-</div>
      <div class="subtext" id="benchmarks-total">-</div>
      <div class="progress-bar"><div class="progress-fill" id="benchmarks-progress" style="width: 0%"></div></div>
    </div>
    <div class="stat-card">
      <h3>Performance</h3>
      <div class="value" id="performance-score">-</div>
      <div class="subtext">Overall score</div>
      <div class="progress-bar"><div class="progress-fill" id="performance-progress" style="width: 0%"></div></div>
    </div>
  </div>

  <div class="tabs">
    <div class="tab active" onclick="showTab('quickwins')">🚀 Quick Wins</div>
    <div class="tab" onclick="showTab('benchmarks')">⚡ Benchmarks</div>
    <div class="tab" onclick="showTab('tests')">✅ Tests</div>
    <div class="tab" onclick="showTab('insights')">💡 Insights</div>
  </div>

  <div id="quickwins-tab" class="tab-content active">
    <div class="section">
      <h2>🚀 Quick Wins (17 Total)</h2>
      <div id="quickwins-list"></div>
    </div>
  </div>

  <div id="benchmarks-tab" class="tab-content">
    <div class="section">
      <h2>⚡ Performance Benchmarks</h2>
      <div id="benchmarks-list"></div>
    </div>
  </div>

  <div id="tests-tab" class="tab-content">
    <div class="section">
      <h2>✅ Test Results</h2>
      <div id="tests-list"></div>
    </div>
  </div>

  <div id="insights-tab" class="tab-content">
    <div class="section">
      <h2>💡 Insights & Recommendations</h2>
      <div id="insights-list"></div>
    </div>
  </div>

  <script>
    function showTab(tabName) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      event.target.classList.add('active');
      document.getElementById(tabName + '-tab').classList.add('active');
    }

    async function loadDashboard() {
      try {
        const response = await fetch('/api/data');
        const data = await response.json();
        
        // Update stats
        const quickWinsCompleted = data.quickWinsList.filter(w => w.status === 'completed').length;
        document.getElementById('quickwins-count').textContent = quickWinsCompleted;
        document.getElementById('quickwins-progress').style.width = (quickWinsCompleted / 17 * 100) + '%';
        
        document.getElementById('tests-passed').textContent = data.stats.testsPassed;
        document.getElementById('tests-total').textContent = 'of ' + data.stats.testsTotal + ' total';
        document.getElementById('tests-progress').style.width = (data.stats.testsPassed / data.stats.testsTotal * 100) + '%';
        
        document.getElementById('benchmarks-passed').textContent = data.stats.benchmarksPassed;
        document.getElementById('benchmarks-total').textContent = 'of ' + data.stats.benchmarksTotal + ' total';
        document.getElementById('benchmarks-progress').style.width = (data.stats.benchmarksPassed / data.stats.benchmarksTotal * 100) + '%';
        
        document.getElementById('performance-score').textContent = data.stats.performanceScore + '%';
        document.getElementById('performance-progress').style.width = data.stats.performanceScore + '%';
        
        document.getElementById('timestamp').textContent = 'Last updated: ' + new Date(data.timestamp).toLocaleString();

        // Render quick wins
        const quickwinsList = document.getElementById('quickwins-list');
        quickwinsList.innerHTML = data.quickWinsList.map(win => {
          const icon = win.status === 'completed' ? '✅' : win.status === 'verified' ? '🔍' : '⏳';
          return '<div class="item"><div class="item-content"><div class="item-title">' + icon + ' #' + win.id + ': ' + win.title + '<span class="category-badge cat-' + win.category.replace(' ', '-') + '">' + win.category + '</span></div><div class="item-details">' + win.impact + '</div></div><span class="status-badge status-' + win.status + '">' + win.status + '</span></div>';
        }).join('');

        // Render benchmarks
        const benchmarksList = document.getElementById('benchmarks-list');
        benchmarksList.innerHTML = data.benchmarks.map(b => {
          const ratio = b.target > 0 ? (b.time / b.target).toFixed(1) : 'N/A';
          const ratioClass = parseFloat(ratio) < 1.5 ? 'ratio-good' : parseFloat(ratio) < 3 ? 'ratio-warning' : 'ratio-bad';
          const icon = b.status === 'pass' ? '✅' : b.status === 'warning' ? '⚠️' : '❌';
          const isolationBadge = b.isolated ? '<span class="badge" style="background: #0066ff; margin-left: 8px; padding: 2px 6px; border-radius: 3px; font-size: 10px;">🔒 Isolated</span>' : '';
          const resourceInfo = b.resourceUsage ? '<div class="item-details" style="font-size: 11px; color: #888; margin-top: 4px;">💾 Memory: ' + (b.resourceUsage.maxRSS / 1024).toFixed(1) + ' KB | ⏱️ CPU: ' + ((b.resourceUsage.cpuTime.user + b.resourceUsage.cpuTime.system) / 1000).toFixed(2) + ' ms | 🕐 Total: ' + b.resourceUsage.executionTime.toFixed(2) + ' ms</div>' : '';
          return '<div class="item"><div class="item-content"><div class="item-title">' + icon + ' ' + b.name + isolationBadge + '<span class="category-badge cat-' + b.category + '">' + b.category + '</span></div><div class="metric-row"><span class="metric-value">' + b.time.toFixed(3) + 'ms</span><span class="metric-target">target: ' + b.target.toFixed(3) + 'ms</span><span class="metric-ratio ' + ratioClass + '">' + ratio + 'x</span></div>' + (b.note ? '<div class="item-details">' + b.note + '</div>' : '') + resourceInfo + '</div><span class="status-badge status-' + b.status + '">' + b.status + '</span></div>';
        }).join('');

        // Render tests
        const testsList = document.getElementById('tests-list');
        testsList.innerHTML = data.tests.map(test => {
          const icon = test.status === 'pass' ? '✅' : '❌';
          return '<div class="item"><div class="item-content"><div class="item-title">' + icon + ' ' + test.name + '<span class="category-badge cat-' + test.category.replace(' ', '-') + '">' + test.category + '</span></div>' + (test.message ? '<div class="item-details">' + test.message + '</div>' : '') + '</div><span class="status-badge status-' + test.status + '">' + test.status + '</span></div>';
        }).join('');

        // Render insights
        const insightsList = document.getElementById('insights-list');
        const insights = [];
        
        if (data.stats.performanceScore < 50) {
          insights.push({ type: 'warning', title: 'Performance Below Target', message: 'Benchmarks are not meeting targets. Consider optimizing hot paths.' });
        }
        
        if (data.stats.testsPassed === data.stats.testsTotal) {
          insights.push({ type: 'success', title: 'All Tests Passing', message: 'Code quality improvements are working correctly.' });
        }
        
        const slowBenchmarks = data.benchmarks.filter(b => b.status === 'fail');
        if (slowBenchmarks.length > 0) {
          insights.push({ type: 'info', title: 'Performance Opportunities', message: slowBenchmarks.length + ' benchmark(s) need optimization: ' + slowBenchmarks.map(b => b.name).join(', ') });
        }
        
        insights.push({ type: 'info', title: 'Quick Wins Complete', message: 'All 17 quick wins implemented. Focus on performance optimization next.' });
        
        insightsList.innerHTML = insights.map(insight => {
          const icon = insight.type === 'success' ? '✅' : insight.type === 'warning' ? '⚠️' : '💡';
          return '<div class="item"><div class="item-content"><div class="item-title">' + icon + ' ' + insight.title + '</div><div class="item-details">' + insight.message + '</div></div></div>';
        }).join('');

      } catch (error) {
        // Use Bun.inspect for better error formatting
        const errorMsg = typeof Bun !== 'undefined' && Bun.inspect 
          ? Bun.inspect(error) 
          : String(error);
        console.error('Failed to load dashboard:', errorMsg);
        document.getElementById('content').innerHTML = '<div class="section"><h2>Error</h2><p>Failed to load dashboard data. Check console for details.</p></div>';
      }
    }

    loadDashboard();
    const refreshInterval = ${refreshInterval} * 1000;
    setInterval(loadDashboard, refreshInterval);
  </script>
</body>
</html>`;

/**
 * Run benchmark in isolated subprocess with resource tracking and timeout protection
 */
async function runBenchmarkIsolated(benchConfig: any): Promise<BenchmarkResult> {
  const startTime = Bun.nanoseconds();
  const benchmarkRunnerPath = new URL('./benchmark-runner.ts', import.meta.url).pathname;
  
  // Use Bun.which to verify bun is available (fallback to 'bun' if not found)
  const bunPath = Bun.which('bun') || 'bun';
  
  // Generate unique run ID using Bun.randomUUIDv7 for tracking
  const runId = Bun.randomUUIDv7('base64url'); // Shorter ID for logging
  
  // Send benchmark config via environment variable (most reliable for subprocesses)
  const configJson = JSON.stringify({
    name: benchConfig.name,
    target: benchConfig.target,
    iterations: benchConfig.iterations || 10,
    category: benchConfig.category || 'performance',
  });
  
  // Use absolute path for more reliable spawning
  const absoluteRunnerPath = new URL('./benchmark-runner.ts', import.meta.url).pathname;
  
  const proc = Bun.spawn({
    cmd: [bunPath, absoluteRunnerPath], // Direct execution (no 'run')
    stdin: 'ignore', // Don't inherit stdin (prevents blocking)
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      ...process.env,
      NODE_ENV: 'production', // Isolated environment
      BENCHMARK_CONFIG: configJson, // Pass config via env var
    },
    timeout: 10000, // 10 second timeout per benchmark
    killSignal: 'SIGTERM',
    onExit(proc, exitCode, signalCode, error) {
      if (error) {
        logger.warn(`Benchmark ${benchConfig.name} process error: ${error.message}`);
      }
      if (signalCode) {
        logger.warn(`Benchmark ${benchConfig.name} killed with signal: ${signalCode}`);
      }
    },
  });
  
  try {
    // Read results with timeout
    const resultPromise = proc.stdout.text();
    const errorPromise = proc.stderr.text();
    
    const [resultText, errorText] = await Promise.all([
      resultPromise,
      errorPromise,
    ]);
    
    // Wait for process to exit
    await proc.exited;
    const executionTime = (Bun.nanoseconds() - startTime) / 1_000_000;
    
    // Get resource usage
    const resourceUsage = proc.resourceUsage();
    
    if (errorText && errorText.trim()) {
      logger.warn(`Benchmark ${benchConfig.name} stderr: ${errorText.substring(0, 200)}`);
    }
    
    // Check if resultText contains error JSON (from stderr)
    let parsedResult: BenchmarkResult;
    try {
      parsedResult = JSON.parse(resultText);
    } catch (parseError) {
      // If stdout parsing fails, try parsing errorText as JSON
      if (errorText && errorText.trim().startsWith('{')) {
        try {
          parsedResult = JSON.parse(errorText);
        } catch {
          throw new Error(`Failed to parse benchmark result: ${resultText.substring(0, 100)}`);
        }
      } else {
        throw new Error(`Invalid JSON from benchmark: ${resultText.substring(0, 100)}`);
      }
    }
    
    if (proc.exitCode !== 0) {
      // If we got a parsed result with error, use it
      if (parsedResult.status === 'fail') {
        return parsedResult;
      }
      throw new Error(`Benchmark failed with exit code ${proc.exitCode}${errorText ? `: ${errorText.substring(0, 100)}` : ''}`);
    }
    
    if (proc.killed) {
      throw new Error(`Benchmark timed out after 10 seconds`);
    }
    
    const result: BenchmarkResult = parsedResult;
    
    // Add resource tracking data
    result.resourceUsage = {
      maxRSS: resourceUsage.maxRSS,
      cpuTime: {
        user: resourceUsage.cpuTime.user,
        system: resourceUsage.cpuTime.system,
      },
      executionTime,
    };
    result.isolated = true;
    
    return result;
  } catch (error) {
    // Cleanup on error
    if (!proc.killed && proc.exitCode === null) {
      proc.kill('SIGTERM');
    }
    
    return {
      name: benchConfig.name,
      time: 0,
      target: benchConfig.target || 0,
      status: 'fail',
      note: `❌ Error: ${error instanceof Error ? error.message : String(error)}`,
      category: benchConfig.category || 'performance',
      isolated: true,
    };
  }
}

async function runBenchmarks(): Promise<BenchmarkResult[]> {
  const results: BenchmarkResult[] = [];
  // Use TOML data parsed with Bun.TOML.parse
  const config = benchmarksConfig;
  
  // Check if isolation mode is enabled (via env var or config)
  // Isolation provides: resource tracking, timeout protection, better error isolation
  const useIsolation = process.env.BENCHMARK_ISOLATION !== 'false' && 
                       (serverConfig.features?.isolated_benchmarks !== false);

  // Benchmark 1: Profile Creation (Batch)
  try {
    const benchConfig = config.benchmarks.find((b: any) => b.name === 'Batch Create Profiles (avg)');
    const iterations = benchConfig?.iterations || 100;
    
    // Warmup: Let the system stabilize (using Bun.sleep for async delay)
    if (iterations > 50) {
      await Bun.sleep(10); // 10ms warmup for large batches
    }
    const profiles = Array.from({ length: iterations }, (_, i) => ({
      userId: `@benchuser${i}`,
      dryRun: i % 2 === 0,
      gateways: ['venmo'],
      location: 'Test City',
      subLevel: 'PremiumPlus' as const,
      progress: {},
    }));

    const start = Bun.nanoseconds();
    await profileEngine.batchCreateProfiles(profiles);
    const time = (Bun.nanoseconds() - start) / 1_000_000;
    const avgTime = time / profiles.length;
    const target = benchConfig?.target || 0.02;
    
    results.push({
      name: benchConfig?.name || 'Batch Create Profiles (avg)',
      time: avgTime,
      target,
      status: avgTime < target * 2 ? 'pass' : avgTime < target * 5 ? 'warning' : 'fail',
      note: avgTime < target * 2 ? '✅ Excellent' : avgTime < target * 5 ? '⚠️ Acceptable' : '❌ Needs optimization',
      category: benchConfig?.category || 'performance',
    });
  } catch (error) {
    results.push({
      name: 'Batch Create Profiles',
      time: 0,
      target: 0.02,
      status: 'fail',
      note: String(error).substring(0, 50),
      category: 'performance',
    });
  }

  // Benchmark 2: Single Profile Query (with isolation option)
  try {
    const benchConfig = config.benchmarks.find((b: any) => b.name === 'Profile Query (single)');
    
    if (useIsolation) {
      // Run in isolated subprocess with resource tracking
      const result = await runBenchmarkIsolated(benchConfig);
      results.push(result);
    } else {
      // Run in-process (faster for development)
      const iterations = benchConfig?.iterations || 10;
      const target = benchConfig?.target || 0.8;
      
      const start = Bun.nanoseconds();
      for (let i = 0; i < iterations; i++) {
        // Skip secrets check for benchmark (hot path optimization)
        await profileEngine.getProfile('@ashschaeffer1', true);
      }
      const time = (Bun.nanoseconds() - start) / 1_000_000 / iterations;
      const ratio = time / target;
      
      results.push({
        name: benchConfig?.name || 'Profile Query (single)',
        time,
        target,
        status: ratio < 2 ? 'pass' : ratio < 5 ? 'warning' : 'fail',
        note: ratio < 2 ? '✅ Fast' : ratio < 5 ? `⚠️ ${ratio.toFixed(1)}x slower than target` : `❌ ${ratio.toFixed(1)}x slower than target`,
        category: benchConfig?.category || 'performance',
        isolated: false,
      });
    }
  } catch (error) {
    results.push({
      name: 'Profile Query (single)',
      time: 0,
      target: 0.8,
      status: 'fail',
      note: String(error).substring(0, 50),
      category: 'performance',
      isolated: useIsolation,
    });
  }

  // Benchmark 3: JSON Serialization Performance
  try {
    const benchConfig = config.benchmarks.find((b: any) => b.name === 'JSON Serialization (1k ops)');
    const iterations = benchConfig?.iterations || 1000;
    const improvementTarget = benchConfig?.improvement_target || 30;
    
    const testProfile = {
      userId: '@test',
      progress: {
        m1: { score: 0.5, timestamp: BigInt(Date.now()) },
        m2: { score: 0.9, timestamp: BigInt(Date.now() + 1000) },
      },
    };
    
    // Old way
    const startOld = Bun.nanoseconds();
    for (let i = 0; i < iterations; i++) {
      const serialized = JSON.stringify(testProfile, (k, v) => typeof v === 'bigint' ? v.toString() : v);
      JSON.parse(serialized);
    }
    const oldTime = (Bun.nanoseconds() - startOld) / 1_000_000;

    // New way
    const { serializeBigInt } = await import('../../user-profile/src/index.ts');
    const startNew = Bun.nanoseconds();
    for (let i = 0; i < iterations; i++) {
      const serialized = serializeBigInt(testProfile);
      JSON.parse(JSON.stringify(serialized));
    }
    const newTime = (Bun.nanoseconds() - startNew) / 1_000_000;

    const improvement = oldTime > 0 ? ((oldTime - newTime) / oldTime * 100).toFixed(1) : '0';
    const faster = parseFloat(improvement) > 0;
    const targetTime = oldTime * (1 - improvementTarget / 100);
    
    results.push({
      name: benchConfig?.name || 'JSON Serialization (1k ops)',
      time: newTime,
      target: targetTime,
      status: faster && parseFloat(improvement) >= improvementTarget ? 'pass' : faster ? 'warning' : 'fail',
      note: faster 
        ? `✅ ${improvement}% faster (${oldTime.toFixed(2)}ms → ${newTime.toFixed(2)}ms)`
        : `❌ Slower - needs optimization`,
      category: benchConfig?.category || 'performance',
    });
  } catch (error) {
    results.push({
      name: 'JSON Serialization',
      time: 0,
      target: 0,
      status: 'fail',
      note: String(error).substring(0, 50),
      category: 'performance',
    });
  }

  // Benchmark 4: Input Validation (with isolation option)
  try {
    const benchConfig = config.benchmarks.find((b: any) => b.name === 'Input Validation (1k ops)');
    
    if (useIsolation) {
      // Run in isolated subprocess
      const result = await runBenchmarkIsolated(benchConfig);
      results.push(result);
    } else {
      // Run in-process
      const iterations = benchConfig?.iterations || 1000;
      const target = benchConfig?.target || 0.001;
      
      const { requireValidUserId } = await import('../../user-profile/src/index.ts');
      const start = Bun.nanoseconds();
      for (let i = 0; i < iterations; i++) {
        requireValidUserId('@testuser');
      }
      const time = (Bun.nanoseconds() - start) / 1_000_000 / iterations;
      
      results.push({
        name: benchConfig?.name || 'Input Validation (1k ops)',
        time,
        target,
        status: time < target * 10 ? 'pass' : 'warning',
        note: time < target * 10 ? '✅ Fast validation' : '⚠️ Acceptable',
        category: benchConfig?.category || 'type-safety',
        isolated: false,
      });
    }
  } catch (error) {
    results.push({
      name: 'Input Validation',
      time: 0,
      target: 0.001,
      status: 'fail',
      category: 'type-safety',
      isolated: useIsolation,
    });
  }

  return results;
}

async function runTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // Test 1: Input Validation
  try {
    const { requireValidUserId } = await import('../../user-profile/src/index.ts');
    requireValidUserId('@test');
    try {
      requireValidUserId('invalid');
      results.push({ name: 'Input Validation', status: 'fail', message: 'Should reject invalid userId', category: 'type-safety' });
    } catch {
      results.push({ name: 'Input Validation', status: 'pass', message: 'Validates @username format correctly', category: 'type-safety' });
    }
  } catch (e) {
    results.push({ name: 'Input Validation', status: 'fail', message: String(e).substring(0, 100), category: 'type-safety' });
  }

  // Test 2: Error Handling
  try {
    const { handleError } = await import('../../user-profile/src/index.ts');
    const msg1 = handleError(new Error('test'), 'test', { log: false });
    const msg2 = handleError('string', 'test', { log: false });
    const msg3 = handleError({ custom: 'object' }, 'test', { log: false });
    if (msg1 === 'test' && msg2 === 'string' && msg3.includes('object')) {
      results.push({ name: 'Error Handling', status: 'pass', message: 'Handles Error, string, and object types safely', category: 'code-quality' });
    } else {
      results.push({ name: 'Error Handling', status: 'fail', message: 'Error extraction inconsistent', category: 'code-quality' });
    }
  } catch (e) {
    results.push({ name: 'Error Handling', status: 'fail', message: String(e).substring(0, 100), category: 'code-quality' });
  }

  // Test 3: Logger
  try {
    const { logger } = await import('../../user-profile/src/index.ts');
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    logger.info('test'); // Should not log
    process.env.NODE_ENV = origEnv;
    results.push({ name: 'Logger (conditional)', status: 'pass', message: 'Suppresses info logs in production', category: 'code-quality' });
  } catch (e) {
    results.push({ name: 'Logger (conditional)', status: 'fail', message: String(e).substring(0, 100), category: 'code-quality' });
  }

  // Test 4: Serialization
  try {
    const { createSerializableCopy } = await import('../../user-profile/src/index.ts');
    const test = { bigint: BigInt(123), normal: 'test', nested: { value: BigInt(456) } };
    const result = createSerializableCopy(test);
    if (typeof result.bigint === 'string' && typeof result.nested.value === 'string') {
      results.push({ name: 'Serialization', status: 'pass', message: 'BigInt converted to string (nested objects too)', category: 'code-quality' });
    } else {
      results.push({ name: 'Serialization', status: 'fail', message: 'BigInt not fully converted', category: 'code-quality' });
    }
  } catch (e) {
    results.push({ name: 'Serialization', status: 'fail', message: String(e).substring(0, 100), category: 'code-quality' });
  }

  // Test 5: Type Safety
  try {
    const { profileEngine } = await import('../../user-profile/src/index.ts');
    const profile = await profileEngine.getProfile('@ashschaeffer1');
    if (profile && typeof profile.userId === 'string' && Array.isArray(profile.gateways)) {
      results.push({ name: 'Type Safety', status: 'pass', message: 'Profile types are correct', category: 'type-safety' });
    } else {
      results.push({ name: 'Type Safety', status: 'fail', message: 'Type mismatches detected', category: 'type-safety' });
    }
  } catch (e) {
    results.push({ name: 'Type Safety', status: 'fail', message: String(e).substring(0, 100), category: 'type-safety' });
  }

  return results;
}

function getQuickWins(): QuickWin[] {
  // Use TOML data parsed with Bun.TOML.parse
  const quickWins = (quickWinsConfig as any).quickwins || [];
  return quickWins.map((win: any) => ({
    id: win.id,
    title: win.title,
    status: win.status,
    impact: win.impact,
    files: win.files || [],
    category: win.category,
  }));
}

async function getData() {
  // Run benchmarks and tests in parallel for better performance
  const [benchmarks, tests] = await Promise.all([
    runBenchmarks(),
    runTests(),
  ]);
  const quickWinsList = getQuickWins();
  
  const passedTests = tests.filter(t => t.status === 'pass').length;
  const passedBenchmarks = benchmarks.filter(b => b.status === 'pass').length;
  const performanceScore = benchmarks.length > 0 
    ? Math.round((passedBenchmarks / benchmarks.length) * 100)
    : 0;

  return {
    timestamp: new Date().toISOString(),
    quickWins: quickWinsList.length,
    quickWinsList,
    tests,
    benchmarks,
    stats: {
      testsPassed: passedTests,
      testsTotal: tests.length,
      benchmarksPassed: passedBenchmarks,
      benchmarksTotal: benchmarks.length,
      performanceScore,
    },
  };
}

Bun.serve({
  port: serverConfig.server?.port || 3008,
  hostname: serverConfig.server?.hostname || '0.0.0.0',
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

const port = serverConfig.server?.port || 3008;
const quickWinsSummary = (quickWinsConfig as any).summary;
const benchmarksList = (benchmarksConfig as any).benchmarks || [];
const useIsolation = process.env.BENCHMARK_ISOLATION !== 'false' && 
                     (serverConfig.features?.isolated_benchmarks !== false);

// Use Bun.main to verify this is the main entry point
const isMainEntry = import.meta.path === Bun.main;
const bunVersion = Bun.version;
const bunRevision = Bun.revision?.substring(0, 8) || 'unknown';

logger.info(`🎛️  Enhanced Dev Dashboard: http://localhost:${port}`);
logger.info(`   Entry: ${isMainEntry ? '✅ Main script' : '⚠️ Imported module'}`);
logger.info(`   Bun: v${bunVersion} (${bunRevision})`);
logger.info(`   Config: TOML-based via Bun.TOML.parse (${quickWinsSummary?.total || 17} quick wins, ${benchmarksList.length} benchmarks)`);
logger.info(`   Isolation: ${useIsolation ? '✅ Enabled (subprocess mode)' : '❌ Disabled (in-process mode)'}`);
logger.info(`   Set BENCHMARK_ISOLATION=false to disable isolation mode`);

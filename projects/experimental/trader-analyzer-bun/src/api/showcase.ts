/**
 * @fileoverview NEXUS Interactive Showcase UI
 * @module [API][SHOWCASE][BUN:1.3]{interactive,demo}
 * @description Interactive HTML UI for demonstrating all NEXUS API capabilities
 */

import { Hono } from 'hono';

const showcase = new Hono();

const SHOWCASE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NEXUS - Trading Intelligence Platform</title>
  <style>
    :root {
      --bg-primary: #0d1117;
      --bg-secondary: #161b22;
      --bg-tertiary: #21262d;
      --text-primary: #f0f6fc;
      --text-secondary: #8b949e;
      --accent-cyan: #58a6ff;
      --accent-green: #3fb950;
      --accent-yellow: #d29922;
      --accent-red: #f85149;
      --accent-purple: #a371f7;
      --border: #30363d;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
      background: var(--bg-primary);
      color: var(--text-primary);
      min-height: 100vh;
      padding: 2rem;
    }

    .container { max-width: 1400px; margin: 0 auto; }

    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--border);
    }

    .logo {
      font-size: 2rem;
      font-weight: bold;
      color: var(--accent-cyan);
    }

    .logo span { color: var(--text-secondary); font-weight: normal; font-size: 1rem; }

    .status-badge {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: var(--bg-secondary);
      border-radius: 8px;
      border: 1px solid var(--border);
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--accent-green);
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 1.5rem;
    }

    .card {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.5rem;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .card-title {
      font-size: 1.1rem;
      color: var(--accent-cyan);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .card-badge {
      font-size: 0.7rem;
      padding: 0.2rem 0.5rem;
      background: var(--bg-tertiary);
      border-radius: 4px;
      color: var(--text-secondary);
    }

    .endpoint-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .endpoint {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      background: var(--bg-tertiary);
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .endpoint:hover {
      background: var(--bg-primary);
      border-left: 3px solid var(--accent-cyan);
    }

    .method {
      font-size: 0.7rem;
      padding: 0.2rem 0.5rem;
      border-radius: 3px;
      font-weight: bold;
    }

    .method-get { background: var(--accent-green); color: #000; }
    .method-post { background: var(--accent-yellow); color: #000; }
    .method-delete { background: var(--accent-red); color: #fff; }

    .endpoint-path { color: var(--text-primary); font-size: 0.85rem; }

    .result-panel {
      margin-top: 1.5rem;
      padding: 1rem;
      background: var(--bg-primary);
      border-radius: 8px;
      border: 1px solid var(--border);
      max-height: 300px;
      overflow: auto;
    }

    .result-panel pre {
      font-size: 0.75rem;
      line-height: 1.5;
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    .result-panel .json-key { color: var(--accent-purple); }
    .result-panel .json-string { color: var(--accent-green); }
    .result-panel .json-number { color: var(--accent-yellow); }
    .result-panel .json-boolean { color: var(--accent-cyan); }
    .result-panel .json-null { color: var(--accent-red); }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
      margin-top: 1rem;
    }

    .stat-item {
      text-align: center;
      padding: 1rem;
      background: var(--bg-tertiary);
      border-radius: 8px;
    }

    .stat-value {
      font-size: 1.5rem;
      font-weight: bold;
      color: var(--accent-cyan);
    }

    .stat-label {
      font-size: 0.75rem;
      color: var(--text-secondary);
      margin-top: 0.25rem;
    }

    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      color: var(--text-secondary);
    }

    .loading::after {
      content: '';
      width: 16px;
      height: 16px;
      border: 2px solid var(--border);
      border-top-color: var(--accent-cyan);
      border-radius: 50%;
      margin-left: 0.5rem;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .tag {
      font-size: 0.65rem;
      padding: 0.15rem 0.4rem;
      border-radius: 3px;
      margin-left: 0.25rem;
    }

    .tag-bun { background: #fbf0df; color: #f472b6; }
    .tag-ws { background: #2d333b; color: var(--accent-purple); }
    .tag-live { background: #1c4532; color: var(--accent-green); }

    footer {
      margin-top: 3rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border);
      text-align: center;
      color: var(--text-secondary);
      font-size: 0.8rem;
    }

    footer a { color: var(--accent-cyan); text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="logo">NEXUS <span>Unified Trading Intelligence</span></div>
      <div class="status-badge">
        <div class="status-dot"></div>
        <span id="runtime">Bun 1.3.3</span>
        <span style="color: var(--text-secondary);">|</span>
        <span id="uptime">--</span>
      </div>
    </header>

    <div class="grid">
      <!-- System Status -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">System Status</div>
          <span class="card-badge">LIVE</span>
        </div>
        <div class="stats-grid" id="system-stats">
          <div class="stat-item">
            <div class="stat-value" id="heap-used">--</div>
            <div class="stat-label">Heap Used</div>
          </div>
          <div class="stat-item">
            <div class="stat-value" id="heap-total">--</div>
            <div class="stat-label">Heap Total</div>
          </div>
          <div class="stat-item">
            <div class="stat-value" id="rss">--</div>
            <div class="stat-label">RSS Memory</div>
          </div>
        </div>
        <div class="result-panel">
          <pre id="health-result"><span class="loading">Fetching health...</span></pre>
        </div>
      </div>

      <!-- Crypto Markets -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">Crypto Options <span class="tag tag-live">DERIBIT</span></div>
          <span class="card-badge">BTC/ETH</span>
        </div>
        <div class="endpoint-list">
          <div class="endpoint" onclick="callEndpoint('/api/deribit/index/btc', 'deribit-result')">
            <span class="method method-get">GET</span>
            <span class="endpoint-path">/deribit/index/btc</span>
          </div>
          <div class="endpoint" onclick="callEndpoint('/api/deribit/expirations/BTC', 'deribit-result')">
            <span class="method method-get">GET</span>
            <span class="endpoint-path">/deribit/expirations/BTC</span>
          </div>
        </div>
        <div class="result-panel">
          <pre id="deribit-result"><span style="color: var(--text-secondary)">Click an endpoint to test...</span></pre>
        </div>
      </div>

      <!-- ORCA Sports Betting -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">ORCA Sports <span class="tag tag-bun">UUIDv5</span></div>
          <span class="card-badge">13+ BOOKMAKERS</span>
        </div>
        <div class="endpoint-list">
          <div class="endpoint" onclick="callEndpoint('/api/orca/stats', 'orca-result')">
            <span class="method method-get">GET</span>
            <span class="endpoint-path">/orca/stats</span>
          </div>
          <div class="endpoint" onclick="callEndpoint('/api/orca/sports', 'orca-result')">
            <span class="method method-get">GET</span>
            <span class="endpoint-path">/orca/sports</span>
          </div>
          <div class="endpoint" onclick="callEndpoint('/api/orca/bookmakers', 'orca-result')">
            <span class="method method-get">GET</span>
            <span class="endpoint-path">/orca/bookmakers</span>
          </div>
        </div>
        <div class="result-panel">
          <pre id="orca-result"><span style="color: var(--text-secondary)">Click an endpoint to test...</span></pre>
        </div>
      </div>

      <!-- Prediction Markets -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">Prediction Markets</div>
          <span class="card-badge">POLYMARKET / KALSHI</span>
        </div>
        <div class="endpoint-list">
          <div class="endpoint" onclick="callEndpoint('/api/polymarket/markets?limit=5', 'prediction-result')">
            <span class="method method-get">GET</span>
            <span class="endpoint-path">/polymarket/markets</span>
          </div>
          <div class="endpoint" onclick="callEndpoint('/api/kalshi/markets?limit=5', 'prediction-result')">
            <span class="method method-get">GET</span>
            <span class="endpoint-path">/kalshi/markets</span>
          </div>
        </div>
        <div class="result-panel">
          <pre id="prediction-result"><span style="color: var(--text-secondary)">Click an endpoint to test...</span></pre>
        </div>
      </div>

      <!-- Arbitrage Scanner -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">Arbitrage Scanner <span class="tag tag-ws">REALTIME</span></div>
          <span class="card-badge">CROSS-MARKET</span>
        </div>
        <div class="endpoint-list">
          <div class="endpoint" onclick="callEndpoint('/api/arbitrage/status', 'arb-result')">
            <span class="method method-get">GET</span>
            <span class="endpoint-path">/arbitrage/status</span>
          </div>
          <div class="endpoint" onclick="callEndpoint('/api/arbitrage/crypto/stats', 'arb-result')">
            <span class="method method-get">GET</span>
            <span class="endpoint-path">/arbitrage/crypto/stats</span>
          </div>
          <div class="endpoint" onclick="postEndpoint('/api/arbitrage/crypto/extract', {question: 'Will Bitcoin reach $150000 by end of 2025?'}, 'arb-result')">
            <span class="method method-post">POST</span>
            <span class="endpoint-path">/arbitrage/crypto/extract</span>
          </div>
        </div>
        <div class="result-panel">
          <pre id="arb-result"><span style="color: var(--text-secondary)">Click an endpoint to test...</span></pre>
        </div>
      </div>

      <!-- Cache & Debug -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">Cache & Debug <span class="tag tag-bun">BUN 1.3</span></div>
          <span class="card-badge">SQLITE + REDIS</span>
        </div>
        <div class="endpoint-list">
          <div class="endpoint" onclick="callEndpoint('/api/cache/stats', 'cache-result')">
            <span class="method method-get">GET</span>
            <span class="endpoint-path">/cache/stats</span>
          </div>
          <div class="endpoint" onclick="callEndpoint('/api/debug/memory', 'cache-result')">
            <span class="method method-get">GET</span>
            <span class="endpoint-path">/debug/memory</span>
          </div>
          <div class="endpoint" onclick="callEndpoint('/api/debug/runtime', 'cache-result')">
            <span class="method method-get">GET</span>
            <span class="endpoint-path">/debug/runtime</span>
          </div>
        </div>
        <div class="result-panel">
          <pre id="cache-result"><span style="color: var(--text-secondary)">Click an endpoint to test...</span></pre>
        </div>
      </div>

      <!-- Canonical Identity -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">Canonical Identity <span class="tag tag-bun">UUIDv5</span></div>
          <span class="card-badge">CROSS-EXCHANGE</span>
        </div>
        <div class="endpoint-list">
          <div class="endpoint" onclick="callEndpoint('/api/canonical/exchanges', 'canonical-result')">
            <span class="method method-get">GET</span>
            <span class="endpoint-path">/canonical/exchanges</span>
          </div>
          <div class="endpoint" onclick="callEndpoint('/api/canonical/uuid/polymarket:BTC-100K-2025', 'canonical-result')">
            <span class="method method-get">GET</span>
            <span class="endpoint-path">/canonical/uuid/:slug</span>
          </div>
          <div class="endpoint" onclick="callEndpoint('/api/canonical/validate/550e8400-e29b-41d4-a716-446655440000', 'canonical-result')">
            <span class="method method-get">GET</span>
            <span class="endpoint-path">/canonical/validate/:uuid</span>
          </div>
        </div>
        <div class="result-panel">
          <pre id="canonical-result"><span style="color: var(--text-secondary)">Click an endpoint to test...</span></pre>
        </div>
      </div>

      <!-- Tick Processing -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">Tick Processing</div>
          <span class="card-badge">HIGH-FREQUENCY</span>
        </div>
        <div class="endpoint-list">
          <div class="endpoint" onclick="postEndpoint('/api/ticks/init', {enableProfiling: true, enableStorage: true}, 'tick-result')">
            <span class="method method-post">POST</span>
            <span class="endpoint-path">/ticks/init</span>
          </div>
          <div class="endpoint" onclick="postEndpoint('/api/ticks/benchmark', {iterations: 1000, ticksPerBatch: 10}, 'tick-result')">
            <span class="method method-post">POST</span>
            <span class="endpoint-path">/ticks/benchmark</span>
          </div>
        </div>
        <div class="result-panel">
          <pre id="tick-result"><span style="color: var(--text-secondary)">Click an endpoint to test...</span></pre>
        </div>
      </div>
    </div>

    <footer>
      NEXUS v1.0.0 | Powered by <a href="https://bun.sh">Bun</a> |
      <a href="/docs">API Docs</a> | <a href="/docs/openapi.json">OpenAPI Spec</a>
    </footer>
  </div>

  <script>
    // Syntax highlight JSON
    function syntaxHighlight(json) {
      if (typeof json !== 'string') {
        json = JSON.stringify(json, null, 2);
      }
      return json.replace(/("(\\\\u[a-zA-Z0-9]{4}|\\\\[^u]|[^\\\\"])*"(\\s*:)?|\\b(true|false|null)\\b|-?\\d+(?:\\.\\d*)?(?:[eE][+\\-]?\\d+)?)/g, function (match) {
        let cls = 'json-number';
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = 'json-key';
          } else {
            cls = 'json-string';
          }
        } else if (/true|false/.test(match)) {
          cls = 'json-boolean';
        } else if (/null/.test(match)) {
          cls = 'json-null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
      });
    }

    async function callEndpoint(path, resultId) {
      const el = document.getElementById(resultId);
      el.innerHTML = '<span class="loading">Fetching...</span>';

      try {
        const res = await fetch(path);
        const data = await res.json();
        el.innerHTML = syntaxHighlight(data);
      } catch (err) {
        el.innerHTML = '<span style="color: var(--accent-red)">Error: ' + err.message + '</span>';
      }
    }

    async function postEndpoint(path, body, resultId) {
      const el = document.getElementById(resultId);
      el.innerHTML = '<span class="loading">Fetching...</span>';

      try {
        const res = await fetch(path, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const data = await res.json();
        el.innerHTML = syntaxHighlight(data);
      } catch (err) {
        el.innerHTML = '<span style="color: var(--accent-red)">Error: ' + err.message + '</span>';
      }
    }

    // Load initial data
    async function init() {
      // Health check
      try {
        const health = await fetch('/api/health').then(r => r.json());
        document.getElementById('health-result').innerHTML = syntaxHighlight(health);
      } catch (e) {}

      // Memory stats
      try {
        const mem = await fetch('/api/debug/memory').then(r => r.json());
        document.getElementById('heap-used').textContent = mem.heapUsed;
        document.getElementById('heap-total').textContent = mem.heapTotal;
        document.getElementById('rss').textContent = mem.rss;
      } catch (e) {}

      // Runtime info
      try {
        const runtime = await fetch('/api/debug/runtime').then(r => r.json());
        document.getElementById('runtime').textContent = 'Bun ' + runtime.bunVersion;
        document.getElementById('uptime').textContent = runtime.uptime;
      } catch (e) {}
    }

    init();

    // Refresh stats every 10s
    setInterval(async () => {
      try {
        const mem = await fetch('/api/debug/memory').then(r => r.json());
        document.getElementById('heap-used').textContent = mem.heapUsed;
        document.getElementById('heap-total').textContent = mem.heapTotal;
        document.getElementById('rss').textContent = mem.rss;

        const runtime = await fetch('/api/debug/runtime').then(r => r.json());
        document.getElementById('uptime').textContent = runtime.uptime;
      } catch (e) {}
    }, 10000);
  </script>
</body>
</html>`;

// Main showcase route
showcase.get('/', (c) => {
  return c.html(SHOWCASE_HTML);
});

export default showcase;

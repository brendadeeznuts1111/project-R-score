#!/usr/bin/env bun

import { safeStringify } from '../profile-fix/serialize.ts';

const PORT = Number(Bun.env.PROFILE_DASH_PORT ?? 3006);

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>FactoryWager Profile Dashboard v10</title>
  <style>
    :root {
      --bg-1: #0b0f1a;
      --bg-2: #0f1a2b;
      --bg-3: #101b35;
      --ink: #e8f2ff;
      --muted: #9fb3c8;
      --accent: #51f6d6;
      --accent-2: #ffb86b;
      --accent-3: #8c7bff;
      --glass: rgba(12, 22, 38, 0.72);
      --border: rgba(148, 176, 220, 0.2);
      --glow: rgba(81, 246, 214, 0.4);
      --shadow: rgba(7, 10, 18, 0.6);
    }

    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: var(--ink);
      font-family: "Space Grotesk", "IBM Plex Sans", "Segoe UI", sans-serif;
      background: radial-gradient(1200px 700px at 10% 10%, #16213d, transparent 60%),
                  radial-gradient(800px 600px at 90% 20%, #18234b, transparent 60%),
                  linear-gradient(160deg, var(--bg-1), var(--bg-2) 45%, var(--bg-3));
      min-height: 100vh;
      overflow-x: hidden;
    }

    body::before,
    body::after {
      content: "";
      position: fixed;
      width: 420px;
      height: 420px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(81, 246, 214, 0.18), transparent 60%);
      filter: blur(10px);
      opacity: 0.6;
      z-index: 0;
    }

    body::before {
      top: -120px;
      right: -80px;
    }

    body::after {
      bottom: -140px;
      left: -60px;
      background: radial-gradient(circle, rgba(140, 123, 255, 0.2), transparent 60%);
    }

    .noise {
      pointer-events: none;
      position: fixed;
      inset: 0;
      background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="7"/></filter><rect width="120" height="120" filter="url(%23n)" opacity="0.12"/></svg>');
      mix-blend-mode: soft-light;
      z-index: 1;
    }

    header {
      position: relative;
      z-index: 2;
      padding: 36px clamp(20px, 4vw, 52px) 16px;
    }

    .title {
      font-size: clamp(24px, 3.3vw, 44px);
      letter-spacing: -0.02em;
      margin: 0 0 6px;
      display: flex;
      gap: 12px;
      align-items: center;
      text-transform: uppercase;
    }

    .pulse {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: var(--accent);
      box-shadow: 0 0 20px var(--glow), 0 0 40px rgba(81, 246, 214, 0.25);
      animation: pulse 2.1s ease-in-out infinite;
    }

    .subtitle {
      color: var(--muted);
      margin: 0;
      font-size: clamp(13px, 1.2vw, 16px);
    }

    main {
      position: relative;
      z-index: 2;
      padding: 16px clamp(20px, 4vw, 52px) 64px;
      display: grid;
      gap: 24px;
      grid-template-columns: minmax(280px, 360px) minmax(320px, 1fr);
      align-items: stretch;
    }

    .panel {
      background: var(--glass);
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 18px 18px 16px;
      box-shadow: 0 20px 40px var(--shadow);
      backdrop-filter: blur(16px);
      position: relative;
      overflow: hidden;
      animation: panelIn 0.7s ease both;
    }

    .panel h2 {
      margin: 0 0 12px;
      font-size: 16px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--accent);
    }

    .panel::after {
      content: "";
      position: absolute;
      inset: auto 16px 16px auto;
      width: 120px;
      height: 120px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(255, 184, 107, 0.18), transparent 60%);
      opacity: 0.35;
      pointer-events: none;
    }

    .stat-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .stat {
      padding: 12px;
      border-radius: 14px;
      border: 1px solid rgba(148, 176, 220, 0.25);
      background: rgba(12, 22, 38, 0.65);
    }

    .stat label {
      font-size: 12px;
      color: var(--muted);
      display: block;
      margin-bottom: 6px;
    }

    .stat strong {
      font-size: 20px;
      color: var(--ink);
    }

    .stream {
      margin-top: 14px;
      border-top: 1px dashed rgba(148, 176, 220, 0.25);
      padding-top: 12px;
      max-height: 220px;
      overflow: hidden;
    }

    .stream-item {
      font-size: 12px;
      color: var(--muted);
      padding: 8px 10px;
      margin: 6px 0;
      border-radius: 10px;
      border: 1px solid rgba(148, 176, 220, 0.18);
      background: rgba(7, 12, 24, 0.6);
      display: flex;
      justify-content: space-between;
      gap: 10px;
    }

    .stream-item span {
      color: var(--accent-2);
    }

    .controls {
      margin-top: 14px;
      display: grid;
      gap: 10px;
      font-size: 12px;
      color: var(--muted);
    }

    .controls button {
      background: rgba(81, 246, 214, 0.16);
      color: var(--ink);
      border: 1px solid rgba(81, 246, 214, 0.4);
      padding: 8px 12px;
      border-radius: 10px;
      cursor: pointer;
      font-weight: 600;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      box-shadow: 0 0 0 rgba(81, 246, 214, 0.0);
    }

    .controls button:hover {
      transform: translateY(-1px);
      box-shadow: 0 12px 28px rgba(81, 246, 214, 0.2);
    }

    .controls label {
      display: inline-flex;
      gap: 8px;
      align-items: center;
    }

    .controls input[type="range"] {
      width: 140px;
    }

    .filters {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .filters label {
      padding: 6px 8px;
      border-radius: 999px;
      border: 1px solid rgba(148, 176, 220, 0.24);
      background: rgba(12, 22, 38, 0.55);
    }

    .badge-row {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .badge {
      padding: 6px 10px;
      border-radius: 999px;
      border: 1px solid rgba(255, 184, 107, 0.35);
      background: rgba(31, 22, 12, 0.5);
      color: var(--accent-2);
      font-weight: 600;
    }

    .fusion-table {
      margin-top: 18px;
      display: grid;
      gap: 14px;
    }

    .fusion-table h3 {
      margin: 0;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--accent-3);
    }

    .fusion-table table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      color: var(--muted);
      background: rgba(6, 9, 18, 0.55);
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid rgba(148, 176, 220, 0.2);
      display: block;
      overflow-x: auto;
    }

    .fusion-table th,
    .fusion-table td {
      padding: 10px 12px;
      border-bottom: 1px solid rgba(148, 176, 220, 0.12);
      vertical-align: top;
    }

    .fusion-table th {
      text-align: left;
      color: var(--ink);
      font-weight: 600;
      background: rgba(12, 22, 38, 0.7);
    }

    .fusion-table tr:last-child td {
      border-bottom: none;
    }

    .fusion-table td:first-child {
      color: var(--accent);
      font-weight: 600;
      white-space: nowrap;
    }

    .tabs {
      display: flex;
      gap: 10px;
      padding: 8px clamp(20px, 4vw, 52px) 0;
      position: relative;
      z-index: 2;
    }

    .tab-btn {
      background: rgba(12, 22, 38, 0.7);
      border: 1px solid rgba(148, 176, 220, 0.25);
      color: var(--muted);
      padding: 8px 14px;
      border-radius: 999px;
      cursor: pointer;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      transition: all 0.2s ease;
    }

    .tab-btn.active {
      color: var(--ink);
      border-color: rgba(81, 246, 214, 0.45);
      box-shadow: 0 10px 24px rgba(81, 246, 214, 0.2);
    }

    .tab-panel {
      display: none;
    }

    .tab-panel.active {
      display: block;
    }

    .profile-json {
      margin-top: 10px;
      padding: 12px;
      background: rgba(6, 9, 18, 0.6);
      border: 1px solid rgba(148, 176, 220, 0.2);
      border-radius: 12px;
      font-family: "JetBrains Mono", ui-monospace, monospace;
      font-size: 12px;
      color: var(--ink);
      max-height: 320px;
      overflow: auto;
      white-space: pre-wrap;
    }

    .safety-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      color: var(--muted);
      background: rgba(6, 9, 18, 0.55);
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid rgba(148, 176, 220, 0.2);
      margin-top: 10px;
    }

    .safety-table th,
    .safety-table td {
      padding: 10px 12px;
      border-bottom: 1px solid rgba(148, 176, 220, 0.12);
      vertical-align: top;
    }

    .safety-table th {
      text-align: left;
      color: var(--ink);
      font-weight: 600;
      background: rgba(12, 22, 38, 0.7);
    }

    .safety-table tr:last-child td {
      border-bottom: none;
    }

    .viz {
      position: relative;
      min-height: 520px;
      overflow: hidden;
    }

    #viz {
      width: 100%;
      height: 520px;
      display: block;
      border-radius: 16px;
      border: 1px solid rgba(148, 176, 220, 0.2);
      background: radial-gradient(circle at 20% 20%, rgba(140, 123, 255, 0.18), transparent 60%),
                  radial-gradient(circle at 80% 40%, rgba(81, 246, 214, 0.12), transparent 55%),
                  rgba(6, 9, 18, 0.6);
      box-shadow: inset 0 0 40px rgba(6, 9, 18, 0.7);
    }

    .viz-overlay {
      position: absolute;
      top: 18px;
      left: 18px;
      right: 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      color: var(--muted);
      pointer-events: none;
    }

    @keyframes panelIn {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .viz-fallback {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--muted);
      font-size: 13px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      background: radial-gradient(circle at 50% 40%, rgba(81, 246, 214, 0.08), transparent 55%);
      pointer-events: none;
    }

    .viz-chip {
      padding: 6px 10px;
      border-radius: 999px;
      border: 1px solid rgba(148, 176, 220, 0.22);
      background: rgba(12, 22, 38, 0.7);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .footer {
      margin-top: 14px;
      font-size: 12px;
      color: var(--muted);
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.35); opacity: 0.6; }
    }

    @media (max-width: 980px) {
      main {
        grid-template-columns: 1fr;
      }
      #viz {
        height: 420px;
      }
    }
  </style>
</head>
<body>
  <div class="noise"></div>
  <header>
    <h1 class="title"><span class="pulse"></span>FactoryWager Profile Dashboard v10</h1>
    <p class="subtitle">Real-time profile fusion stream with 3D preference topology</p>
  </header>

  <div class="tabs" role="tablist">
    <button class="tab-btn active" data-tab="overview" type="button">Overview</button>
    <button class="tab-btn" data-tab="profile" type="button">Profile</button>
    <button class="tab-btn" data-tab="fusion" type="button">Fusion Map</button>
    <button class="tab-btn" data-tab="payments" type="button">Payments</button>
  </div>

  <main>
    <section class="tab-panel active" data-tab="overview">
      <section class="panel">
      <h2>Profile Signal</h2>
      <div class="stat-grid">
        <div class="stat">
          <label>User</label>
          <strong id="userId">@ashschaeffer1</strong>
        </div>
        <div class="stat">
          <label>Score</label>
          <strong id="score">0.9991</strong>
        </div>
        <div class="stat">
          <label>Gateway</label>
          <strong id="gateway">VENMO</strong>
        </div>
        <div class="stat">
          <label>Pref Drift</label>
          <strong id="drift">0.0021</strong>
        </div>
      </div>
  <div class="stream" id="stream"></div>
  <div class="footer">WebSocket stream: <span id="wsStatus">connecting</span></div>
  <div class="footer" id="openStatus">Auto-open: armed</div>

      <div class="controls">
    <button id="pauseBtn" type="button">Pause Stream</button>
    <label>Rate
      <input id="rateInput" type="range" min="200" max="2000" step="100" value="1200" />
      <span id="rateValue">1200ms</span>
    </label>
    <div class="filters">
      <label><input type="checkbox" value="PROFILE_FUSE" checked /> PROFILE_FUSE</label>
      <label><input type="checkbox" value="PREF_DRIFT" checked /> PREF_DRIFT</label>
      <label><input type="checkbox" value="PROGRESS_SYNC" checked /> PROGRESS_SYNC</label>
      <label><input type="checkbox" value="PUBSUB" checked /> PUBSUB</label>
      <label><input type="checkbox" value="XGB_SCORE" checked /> XGB_SCORE</label>
    </div>
    <div class="badge-row" id="badgeRow"></div>
  </div>
      </section>

      <section class="panel viz">
      <canvas id="viz"></canvas>
      <div class="viz-overlay">
        <div class="viz-chip">3D Profile Topology</div>
        <div>Latency <span id="latency">0.6ms</span></div>
      </div>
      </section>
    </section>

    <section class="tab-panel" data-tab="profile">
      <section class="panel">
        <h2>Profile Details</h2>
        <div class="controls">
          <label>User
            <input id="profileInput" type="text" value="@ashschaeffer1" />
          </label>
          <button id="profileFetchBtn" type="button">Fetch Profile</button>
        </div>
        <pre id="profileJson" class="profile-json">{}</pre>
      </section>
    </section>

    <section class="tab-panel" data-tab="fusion">
      <section class="panel">
      <h2>Fusion Data Map</h2>
      <div class="fusion-table">
        <h3>Fusion Data Map (Venmo/PayPal)</h3>
        <table>
          <thead>
            <tr>
              <th>Data Category</th>
              <th>Key Fields</th>
              <th>Why Fuse?</th>
              <th>Endpoint Example</th>
              <th>Vectorization Tip</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Profile (Core Identity)</td>
              <td>user.id, display_name, username, email, phone, profile_picture_url, date_joined</td>
              <td>Exact match (e.g., @ashschaeffer1). High stability.</td>
              <td>GET /me</td>
              <td>Embed profile JSON via SentenceTransformer: encode(name + email + phone)</td>
            </tr>
            <tr>
              <td>Transactions (Behavioral Gold)</td>
              <td>payment.id, amount, note, audience, created_time, actor.display_name, transactions[].target.user.id</td>
              <td>Spending habits, social graph (friends). Drift: txn velocity.</td>
              <td>GET /payments?limit=100</td>
              <td>Embed [amount, time_delta, recipient_vec], categorize via NLP on note</td>
            </tr>
            <tr>
              <td>Balance &amp; Statements</td>
              <td>current_balance, pending_balance, available_balance</td>
              <td>Financial health/risk.</td>
              <td>GET /me?access_statements</td>
              <td>Scalar → vec: [balance, pending_ratio]</td>
            </tr>
            <tr>
              <td>Friends/Network</td>
              <td>user.id, mutual (shared contacts)</td>
              <td>Social proof (cross-check PayPal).</td>
              <td>GET /users/{id}/friends</td>
              <td>Graph embedding (Node2Vec) on friend graph</td>
            </tr>
            <tr>
              <td>Device/Session (Indirect)</td>
              <td>client_id (from auth), last created_time</td>
              <td>Login patterns.</td>
              <td>Headers in API calls</td>
              <td>Append device fingerprint if app-integrated</td>
            </tr>
          </tbody>
        </table>
        <h3>Fusion Data Map (Square/Cash App Pay)</h3>
        <table>
          <thead>
            <tr>
              <th>Data Category</th>
              <th>Key Fields</th>
              <th>Why Fuse?</th>
              <th>Endpoint Example (Square/Cash App Pay)</th>
              <th>Vectorization Tip</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Profile (Limited)</td>
              <td>merchant_id, business_name, location_id, created_at</td>
              <td>Biz identity (personal via Plaid).</td>
              <td>GET /v2/merchants/{id}</td>
              <td>Embed name + ID: Matches Venmo username</td>
            </tr>
            <tr>
              <td>Transactions</td>
              <td>payment.id, amount_money, created_at, buyer_email_address, source_type, note</td>
              <td>P2P patterns (e.g., $Cashtag boosts).</td>
              <td>GET /v2/payments?location_id={id}</td>
              <td>Embed [amount, category (note), time] – high drift signal</td>
            </tr>
            <tr>
              <td>Balance</td>
              <td>available_balance, reserved_balance</td>
              <td>Liquidity/risk.</td>
              <td>Plaid /balance/get (proxy)</td>
              <td>[balance, txn_count_last_30d]</td>
            </tr>
            <tr>
              <td>Cashtags/Contacts</td>
              <td>cashtag (e.g., $ashschaeffer), recipient handles</td>
              <td>Social/P2P graph.</td>
              <td>In txn buyer_email_address or Plaid</td>
              <td>Network vec from recipients</td>
            </tr>
            <tr>
              <td>Boosts/Rewards (Unique)</td>
              <td>boost.name, percentage_discount</td>
              <td>Spending prefs (e.g., groceries).</td>
              <td>Square Orders API</td>
              <td>Categorical embedding: intent classifier</td>
            </tr>
          </tbody>
        </table>
      </div>
      </div>
      </section>
    </section>

    <section class="tab-panel" data-tab="payments">
      <section class="panel">
      <h2>Payments Impact (Read-Only)</h2>
      <p class="subtitle" style="margin-top: 4px;">
        Short answer: Super-profile fusion is read-only and should not affect receiving payments when using approved, read-only scopes.
      </p>
      <table class="safety-table">
        <thead>
          <tr>
            <th>API</th>
            <th>Scopes Used</th>
            <th>Read-Only?</th>
            <th>Payment Effect</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>PayPal</td>
            <td>openid, reporting scopes (as configured)</td>
            <td>Yes (reporting-only)</td>
            <td>Receiving payouts/orders unchanged</td>
          </tr>
          <tr>
            <td>Venmo</td>
            <td>Partner-approved read scopes (if available)</td>
            <td>Yes</td>
            <td>P2P receiving unchanged</td>
          </tr>
          <tr>
            <td>Plaid (Cash App)</td>
            <td>Transactions/Balance read (if supported by institution)</td>
            <td>Yes</td>
            <td>Account linking does not pause txns</td>
          </tr>
        </tbody>
      </table>
      <div class="controls">
        <div class="badge-row">
          <div class="badge">No write scopes</div>
          <div class="badge">No account modifications</div>
          <div class="badge">Async fuse after webhook</div>
        </div>
      </div>
      <div class="stream" style="margin-top: 8px;">
        <div class="stream-item">
          <div>User pays → webhook → optional fetch → fuse → risk OK → deposit</div>
          <span>SAFE FLOW</span>
        </div>
      </div>
      </section>
    </section>
  </main>

  <script type="module">
    const streamEl = document.getElementById('stream');
    const scoreEl = document.getElementById('score');
    const driftEl = document.getElementById('drift');
    const gatewayEl = document.getElementById('gateway');
    const wsStatusEl = document.getElementById('wsStatus');
    const openStatusEl = document.getElementById('openStatus');
    const pauseBtn = document.getElementById('pauseBtn');
    const rateInput = document.getElementById('rateInput');
    const rateValue = document.getElementById('rateValue');
    const badgeRow = document.getElementById('badgeRow');
    const filterChecks = Array.from(document.querySelectorAll('.filters input'));
    let paused = false;
    let ws = null;
    const latencyEl = document.getElementById('latency');
    const tabButtons = Array.from(document.querySelectorAll('.tab-btn'));
    const tabPanels = Array.from(document.querySelectorAll('.tab-panel'));
    const profileInput = document.getElementById('profileInput');
    const profileFetchBtn = document.getElementById('profileFetchBtn');
    const profileJson = document.getElementById('profileJson');

    function pushStream(event) {
      const item = document.createElement('div');
      item.className = 'stream-item';
      const left = document.createElement('div');
      left.textContent = event.message;
      const right = document.createElement('span');
      right.textContent = event.tag;
      item.append(left, right);
      streamEl.prepend(item);
      while (streamEl.children.length > 6) streamEl.removeChild(streamEl.lastChild);
    }

    function connect() {
      const scheme = location.protocol === 'https:' ? 'wss' : 'ws';
      ws = new WebSocket(scheme + '://' + location.host + '/ws/telemetry-3d');
      wsStatusEl.textContent = 'connecting';

      ws.addEventListener('open', () => {
        wsStatusEl.textContent = 'live';
      });

      ws.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);
          if (paused) return;
          const enabledTags = new Set(filterChecks.filter(c => c.checked).map(c => c.value));
          if (!enabledTags.has(data.tag)) return;
          scoreEl.textContent = data.score.toFixed(4);
          driftEl.textContent = data.drift.toFixed(4);
          gatewayEl.textContent = data.gateway.toUpperCase();
          latencyEl.textContent = data.latency + 'ms';
          pushStream({ message: data.message, tag: data.tag });
          updateBadges(data);
          if (data.open === true) {
            openStatusEl.textContent = 'Auto-open: triggered';
            const target = '/profile/' + encodeURIComponent(data.userId ?? 'ashschaeffer1');
            // Browsers may block popups without user interaction; we still attempt once per session.
            if (!window.__fwOpened) {
              window.__fwOpened = true;
              window.open(target, '_blank', 'noopener');
            }
          }
        } catch (err) {
          pushStream({ message: 'stream decode error', tag: 'WARN' });
        }
      });

      ws.addEventListener('close', () => {
        wsStatusEl.textContent = 'reconnecting';
        setTimeout(connect, 1500);
      });
    }

    function updateBadges(data) {
      if (!badgeRow) return;
      badgeRow.innerHTML = '';
      const badges = [
        { label: 'Anomaly', value: data.anomaly ?? 'NO_DRIFT' },
        { label: 'Fix Score', value: data.score.toFixed(4) },
        { label: 'Gateway', value: data.gateway.toUpperCase() }
      ];
      badges.forEach((b) => {
        const el = document.createElement('div');
        el.className = 'badge';
        el.textContent = b.label + ': ' + b.value;
        badgeRow.appendChild(el);
      });
    }

    pauseBtn.addEventListener('click', () => {
      paused = !paused;
      pauseBtn.textContent = paused ? 'Resume Stream' : 'Pause Stream';
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'pause', value: paused }));
      }
    });

    rateInput.addEventListener('input', () => {
      rateValue.textContent = rateInput.value + 'ms';
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'rate', value: Number(rateInput.value) }));
      }
    });

    connect();

    tabButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-tab');
        tabButtons.forEach((b) => b.classList.toggle('active', b === btn));
        tabPanels.forEach((p) => p.classList.toggle('active', p.getAttribute('data-tab') === target));
      });
    });

    async function fetchProfile() {
      const value = profileInput.value.trim() || '@ashschaeffer1';
      const res = await fetch('/profile/' + encodeURIComponent(value));
      const data = await res.json();
      profileJson.textContent = JSON.stringify(data, null, 2);
    }

    profileFetchBtn.addEventListener('click', fetchProfile);
    fetchProfile().catch(() => {});

    // Minimal WebGL2 profile topology
    const canvas = document.getElementById('viz');
    const gl = canvas.getContext('webgl2', { antialias: true, alpha: true });
    if (!gl) {
      pushStream({ message: 'WebGL2 not available, using fallback view', tag: 'FALLBACK' });
      const fallback = document.createElement('div');
      fallback.className = 'viz-fallback';
      fallback.textContent = 'WebGL2 unavailable — fallback view';
      canvas.parentElement?.appendChild(fallback);
    } else {
      const vertexSource = [
        '#version 300 es',
        'precision highp float;',
        'layout(location = 0) in vec3 aPosition;',
        'layout(location = 1) in vec3 aColor;',
        'uniform mat4 uProjection;',
        'uniform mat4 uView;',
        'uniform mat4 uModel;',
        'out vec3 vColor;',
        'void main() {',
        '  vColor = aColor;',
        '  gl_PointSize = 3.5;',
        '  gl_Position = uProjection * uView * uModel * vec4(aPosition, 1.0);',
        '}'
      ].join('\\n');

      const fragmentSource = [
        '#version 300 es',
        'precision highp float;',
        'in vec3 vColor;',
        'out vec4 outColor;',
        'void main() {',
        '  outColor = vec4(vColor, 0.95);',
        '}'
      ].join('\\n');

      function compileShader(type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          const info = gl.getShaderInfoLog(shader);
          console.error(info);
          const fallback = document.createElement('div');
          fallback.className = 'viz-fallback';
          fallback.textContent = 'Shader compile failed — see console';
          canvas.parentElement?.appendChild(fallback);
        }
        return shader;
      }

      const program = gl.createProgram();
      gl.attachShader(program, compileShader(gl.VERTEX_SHADER, vertexSource));
      gl.attachShader(program, compileShader(gl.FRAGMENT_SHADER, fragmentSource));
      gl.linkProgram(program);
      let programReady = true;
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const info = gl.getProgramInfoLog(program);
        console.error(info);
        const fallback = document.createElement('div');
        fallback.className = 'viz-fallback';
        fallback.textContent = 'WebGL link failed — see console';
        canvas.parentElement?.appendChild(fallback);
        programReady = false;
      }
      if (!programReady) {
        // Skip WebGL setup if link failed
      } else {
        gl.useProgram(program);
        gl.enable(gl.PROGRAM_POINT_SIZE);

      const nodeCount = 120;
      const nodes = [];
      const edges = [];
      for (let i = 0; i < nodeCount; i++) {
        const radius = 1.6 + Math.random() * 1.6;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi) * Math.sin(theta);
        const z = radius * Math.cos(phi);
        const c = [0.2 + Math.random() * 0.8, 0.4 + Math.random() * 0.6, 0.5 + Math.random() * 0.5];
        nodes.push({ x, y, z, c });
      }
      for (let i = 0; i < nodeCount; i++) {
        const target = Math.floor(Math.random() * nodeCount);
        if (target !== i) edges.push([i, target]);
      }

        const vertices = new Float32Array(nodes.length * 6);
      nodes.forEach((n, idx) => {
        const base = idx * 6;
        vertices[base] = n.x;
        vertices[base + 1] = n.y;
        vertices[base + 2] = n.z;
        vertices[base + 3] = n.c[0];
        vertices[base + 4] = n.c[1];
        vertices[base + 5] = n.c[2];
      });

        const lineVertices = new Float32Array(edges.length * 2 * 6);
      edges.forEach((edge, i) => {
        const a = nodes[edge[0]];
        const b = nodes[edge[1]];
        const base = i * 12;
        lineVertices[base] = a.x;
        lineVertices[base + 1] = a.y;
        lineVertices[base + 2] = a.z;
        lineVertices[base + 3] = a.c[0];
        lineVertices[base + 4] = a.c[1];
        lineVertices[base + 5] = a.c[2];
        lineVertices[base + 6] = b.x;
        lineVertices[base + 7] = b.y;
        lineVertices[base + 8] = b.z;
        lineVertices[base + 9] = b.c[0];
        lineVertices[base + 10] = b.c[1];
        lineVertices[base + 11] = b.c[2];
      });

        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);

        const vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        const stride = 6 * 4;
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, 0);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, stride, 3 * 4);

        const lineVao = gl.createVertexArray();
        gl.bindVertexArray(lineVao);
        const lineVbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, lineVbo);
        gl.bufferData(gl.ARRAY_BUFFER, lineVertices, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, 0);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, stride, 3 * 4);

        const uProjection = gl.getUniformLocation(program, 'uProjection');
        const uView = gl.getUniformLocation(program, 'uView');
        const uModel = gl.getUniformLocation(program, 'uModel');

      function perspective(fovy, aspect, near, far) {
        const f = 1.0 / Math.tan(fovy / 2);
        const nf = 1 / (near - far);
        return [
          f / aspect, 0, 0, 0,
          0, f, 0, 0,
          0, 0, (far + near) * nf, -1,
          0, 0, (2 * far * near) * nf, 0
        ];
      }

      function lookAt(eye, center, up) {
        const [ex, ey, ez] = eye;
        const [cx, cy, cz] = center;
        const [ux, uy, uz] = up;
        let zx = ex - cx;
        let zy = ey - cy;
        let zz = ez - cz;
        const zLen = Math.hypot(zx, zy, zz);
        zx /= zLen; zy /= zLen; zz /= zLen;
        let xx = uy * zz - uz * zy;
        let xy = uz * zx - ux * zz;
        let xz = ux * zy - uy * zx;
        const xLen = Math.hypot(xx, xy, xz);
        xx /= xLen; xy /= xLen; xz /= xLen;
        const yx = zy * xz - zz * xy;
        const yy = zz * xx - zx * xz;
        const yz = zx * xy - zy * xx;
        return [
          xx, yx, zx, 0,
          xy, yy, zy, 0,
          xz, yz, zz, 0,
          -(xx * ex + xy * ey + xz * ez),
          -(yx * ex + yy * ey + yz * ez),
          -(zx * ex + zy * ey + zz * ez),
          1
        ];
      }

      function multiply(a, b) {
        const out = new Array(16).fill(0);
        for (let i = 0; i < 4; i++) {
          for (let j = 0; j < 4; j++) {
            out[i * 4 + j] = a[i * 4 + 0] * b[0 * 4 + j]
              + a[i * 4 + 1] * b[1 * 4 + j]
              + a[i * 4 + 2] * b[2 * 4 + j]
              + a[i * 4 + 3] * b[3 * 4 + j];
          }
        }
        return out;
      }

      function rotationY(angle) {
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        return [
          c, 0, -s, 0,
          0, 1, 0, 0,
          s, 0, c, 0,
          0, 0, 0, 1
        ];
      }

      function rotationX(angle) {
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        return [
          1, 0, 0, 0,
          0, c, s, 0,
          0, -s, c, 0,
          0, 0, 0, 1
        ];
      }

      function resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = canvas.clientWidth * dpr;
        canvas.height = canvas.clientHeight * dpr;
        gl.viewport(0, 0, canvas.width, canvas.height);
      }

        let lastTime = performance.now();
        let yaw = 0;
        let pitch = 0;
        let distance = 6.5;
        let dragging = false;
        let lastX = 0;
        let lastY = 0;

        canvas.addEventListener('mousedown', (e) => {
          dragging = true;
          lastX = e.clientX;
          lastY = e.clientY;
        });
        window.addEventListener('mouseup', () => { dragging = false; });
        window.addEventListener('mousemove', (e) => {
          if (!dragging) return;
          const dx = (e.clientX - lastX) * 0.005;
          const dy = (e.clientY - lastY) * 0.005;
          yaw += dx;
          pitch = Math.max(-1.2, Math.min(1.2, pitch + dy));
          lastX = e.clientX;
          lastY = e.clientY;
        });
        canvas.addEventListener('wheel', (e) => {
          distance = Math.max(3.5, Math.min(10, distance + e.deltaY * 0.01));
        });
        function render(now) {
          const dt = (now - lastTime) / 1000;
          lastTime = now;
          resize();
          gl.clearColor(0.03, 0.05, 0.09, 1.0);
          gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
          gl.enable(gl.DEPTH_TEST);
          gl.enable(gl.BLEND);
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

          const aspect = canvas.width / canvas.height;
          const projection = perspective(Math.PI / 3.5, aspect, 0.1, 100);
          const eye = [
            Math.sin(yaw) * Math.cos(pitch) * distance,
            Math.sin(pitch) * distance,
            Math.cos(yaw) * Math.cos(pitch) * distance
          ];
          const view = lookAt(eye, [0, 0, 0], [0, 1, 0]);
          const angle = now * 0.00025;
          const model = multiply(rotationY(angle), rotationX(angle * 0.5));

          gl.uniformMatrix4fv(uProjection, false, new Float32Array(projection));
          gl.uniformMatrix4fv(uView, false, new Float32Array(view));
          gl.uniformMatrix4fv(uModel, false, new Float32Array(model));

          gl.bindVertexArray(lineVao);
          gl.lineWidth(1);
          gl.drawArrays(gl.LINES, 0, lineVertices.length / 6);
          gl.bindVertexArray(vao);
          gl.drawArrays(gl.POINTS, 0, nodes.length);

          requestAnimationFrame(render);
        }

        requestAnimationFrame(render);
      }
    }
  </script>
</body>
</html>`;

function randomEvent() {
  const gateways = ['venmo', 'paypal', 'cashapp'];
  const tags = ['PROFILE_FUSE', 'PREF_DRIFT', 'PROGRESS_SYNC', 'PUBSUB', 'XGB_SCORE'];
  const gateway = gateways[Math.floor(Math.random() * gateways.length)];
  const tag = tags[Math.floor(Math.random() * tags.length)];
  const score = 0.9985 + Math.random() * 0.0014;
  const drift = Math.random() * 0.0045;
  const latency = (0.4 + Math.random() * 1.4).toFixed(1);
  return {
    gateway,
    tag,
    score,
    drift,
    latency,
    anomaly: score >= 0.999 ? 'NO_DRIFT' : 'PREF_DRIFT',
    message: 'Signal ' + tag + ' :: ' + gateway + ' profile vector stabilized'
  };
}

function safeStringify(value: unknown) {
  return JSON.stringify(value, (_key, v) => (typeof v === 'bigint' ? v.toString() : v), 2);
}

const server = Bun.serve({
  port: PORT,
  async fetch(req, server) {
    const url = new URL(req.url);

    if (url.pathname === '/ws/telemetry-3d') {
      if (server.upgrade(req, { data: { timer: null } })) return;
      return new Response('Upgrade required', { status: 426 });
    }

    if (url.pathname.startsWith('/profile/')) {
      const raw = url.pathname.split('/').pop() ?? 'unknown';
      const userId = decodeURIComponent(raw);
      const now = Date.now();
      const payload = {
        userId,
        score: 0.9991,
        drift: 0.0021,
        gateway: 'venmo',
        updatedAtMs: now,
        updatedAt: new Date(now).toISOString(),
        risk: 'low',
        status: 'active',
        version: 'v10.1.1',
        source: 'dashboard-profile',
        customer: {
          type: 'new',
          payments: 12,
          netIn: 4820.55,
          netOut: 2310.12
        },
        contact: {
          phoneNumber: '+1******1234',
          cashtag: '$ashschaeffer',
          venmotag: '@ashschaeffer1'
        },
        rating: 0.987,
        safeToSendTo: true,
        routingInformation: {
          bankName: 'unknown',
          routingNumberMasked: '*****6789',
          accountMasked: '****4321',
          source: 'not_looked_up'
        },
        lookup: {
          performed: false,
          sources: [],
          missing: ['routingInformation']
        }
      };
      return new Response(safeStringify(payload), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (url.pathname === '/api/profile/fix') {
      const sample = {
        profileId: 'FWP-ASH-001',
        createdAt: BigInt(Date.now() - 60000),
        updatedAt: BigInt(Date.now()),
        progress: { score: 0.9999, timestamp: BigInt(Date.now()) }
      };
      return new Response(safeStringify(sample), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (url.pathname === '/api/profile/open' && req.method === 'POST') {
      if (Bun.env.ALLOW_PROFILE_OPEN !== 'true') {
        return new Response('Open not enabled. Set ALLOW_PROFILE_OPEN=true', { status: 403 });
      }
      let body: any = {};
      try {
        body = await req.json();
      } catch {}
      const userId = body.userId ?? 'ashschaeffer1';
      const target = body.url ?? `http://localhost:${PORT}/profile/${encodeURIComponent(userId)}`;
      const proc = Bun.spawn(['open', target]);
      await proc.exited;
      return new Response(safeStringify({ opened: true, target }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (url.pathname === '/') {
      return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    return new Response('Not Found', { status: 404 });
  },
  websocket: {
    open(ws) {
      ws.send(safeStringify({ ...randomEvent(), userId: '@ashschaeffer1', open: false }));
      ws.data.timer = setInterval(() => {
        const event = randomEvent();
        const open = event.score >= 0.9990;
        ws.send(safeStringify({ ...event, userId: '@ashschaeffer1', open }));
      }, 1200);
    },
    message(ws, message) {
      let payload: any;
      try {
        payload = JSON.parse(message.toString());
      } catch {
        return;
      }
      if (payload.type === 'pause') {
        if (ws.data.timer) clearInterval(ws.data.timer);
        if (!payload.value) {
          ws.data.timer = setInterval(() => {
            const event = randomEvent();
            const open = event.score >= 0.9990;
            ws.send(safeStringify({ ...event, userId: '@ashschaeffer1', open }));
          }, 1200);
        }
      }
      if (payload.type === 'rate') {
        const next = Math.max(200, Math.min(5000, Number(payload.value) || 1200));
        if (ws.data.timer) clearInterval(ws.data.timer);
        ws.data.timer = setInterval(() => {
          const event = randomEvent();
          const open = event.score >= 0.9990;
          ws.send(safeStringify({ ...event, userId: '@ashschaeffer1', open }));
        }, next);
      }
    },
    close(ws) {
      if (ws.data.timer) clearInterval(ws.data.timer);
    }
  }
});

console.log('Profile dashboard running on http://localhost:' + server.port);

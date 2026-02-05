#!/usr/bin/env bun
/**
 * FactoryWager Profile Dashboard v10 - INTEGRATED
 * 
 * Now wired to payment server Redis channels:
 * - DEPOSIT_SUCCESS: Real deposit events from webhooks
 * - FRAUD_ALERT: High-risk transaction alerts
 * - PROFILE_FUSE: Profile fusion events
 */

import { safeStringify } from '../profile-fix/serialize.ts';
import Redis from 'ioredis';

const PORT = Number(Bun.env.PROFILE_DASH_PORT ?? 3006);
const REDIS_URL = Bun.env.REDIS_URL ?? 'redis://localhost:6379';

// Redis subscriber for payment events
const redisSub = new Redis(REDIS_URL);

// Connected WebSocket clients
const clients = new Set<any>();

// Subscribe to payment server channels
redisSub.subscribe('DEPOSIT_SUCCESS', 'FRAUD_ALERT', 'PROFILE_FUSE', 'HABITS_CLASSIFIED', 'PERSONALIZED_DEPOSIT', 'P2P_PAYMENT', (err) => {
  if (err) {
    console.error('Redis subscription error:', err);
  } else {
    console.log('✅ Subscribed to payment channels');
  }
});

// Forward Redis messages to all WebSocket clients
redisSub.on('message', (channel, message) => {
  console.log(`📡 Redis [${channel}]: ${message.slice(0, 100)}...`);
  
  const data = JSON.parse(message);
  
  // Format for dashboard
  const event = formatPaymentEvent(channel, data);
  
  // Broadcast to all connected clients
  clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(safeStringify(event));
    }
  });
});

function formatPaymentEvent(channel: string, data: any) {
  const base = {
    userId: data.userId ?? '@unknown',
    gateway: data.source ?? 'system',
    latency: '0.5ms',
    open: false,
  };
  
  switch (channel) {
    case 'DEPOSIT_SUCCESS':
      return {
        ...base,
        tag: 'PROFILE_FUSE',
        score: 0.9995,
        drift: 0.0005,
        anomaly: 'NO_DRIFT',
        message: `💰 Deposit $${data.amount} → ${data.userId} (auto-approved)`,
      };
      
    case 'FRAUD_ALERT':
      return {
        ...base,
        tag: 'XGB_SCORE',
        score: 0.85,
        drift: data.risk?.profile?.drift ?? 0.08,
        anomaly: 'HIGH_DRIFT',
        message: `🚨 FRAUD: ${data.userId} - ${data.risk?.reason}`,
      };
      
    case 'PROFILE_FUSE':
      return {
        ...base,
        tag: 'PROFILE_FUSE',
        score: data.risk?.profile?.score ?? 0.97,
        drift: data.risk?.profile?.drift ?? 0.003,
        anomaly: data.status === 'risk_ok' ? 'NO_DRIFT' : 'REVIEW',
        message: `Signal PROFILE_FUSE :: ${data.status} for ${data.userId}`,
      };
    
    case 'HABITS_CLASSIFIED':
      const tier = data.habits?.tier ?? 'unknown';
      const tierEmoji = { whale: '🐋', 'high-volume': '⚡', active: '🎯', casual: '👤' }[tier] ?? '👤';
      return {
        ...base,
        tag: 'PREF_DRIFT',
        score: 0.98,
        drift: 0.002,
        anomaly: 'HABITS_UPDATED',
        message: `${tierEmoji} ${data.userId} classified as ${tier.toUpperCase()} (${data.habits?.txnCount} txns)`,
        tier,
      };
    
    case 'PERSONALIZED_DEPOSIT':
      const bonusTier = data.tier ?? 'unknown';
      const bonusEmoji = { whale: '🐋', 'high-volume': '⚡', active: '🎯', casual: '👤' }[bonusTier] ?? '👤';
      return {
        ...base,
        tag: 'PROFILE_FUSE',
        score: 0.995,
        drift: 0.001,
        anomaly: 'BONUS_APPLIED',
        message: `${bonusEmoji} $${data.amount} + $${data.bonus?.toFixed(2) ?? 0} bonus → ${data.userId} (${bonusTier})`,
        tier: bonusTier,
        bonus: data.bonus,
      };
    
    case 'P2P_PAYMENT':
      const p2pTier = data.tier ?? 'unknown';
      const p2pEmoji = { whale: '🐋', 'high-volume': '⚡', active: '🎯', casual: '👤' }[p2pTier] ?? '💈';
      return {
        ...base,
        tag: 'PUBSUB',
        score: 0.99,
        drift: 0.002,
        anomaly: 'P2P_RECEIVED',
        message: `${p2pEmoji} P2P ${data.provider}: $${data.amount} + $${data.bonus?.toFixed(2)} → ${data.userId.slice(0, 8)}`,
        provider: data.provider,
        tier: p2pTier,
      };
      
    default:
      return { ...base, tag: 'PUBSUB', score: 0.99, drift: 0.001, message: 'Unknown event' };
  }
}

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>FactoryWager Profile Dashboard v10 - LIVE</title>
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
      --success: #4ade80;
      --warning: #fbbf24;
      --danger: #f87171;
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
      padding: 32px clamp(20px, 4vw, 52px) 12px;
    }

    .title {
      font-size: clamp(24px, 3.3vw, 44px);
      letter-spacing: -0.02em;
      margin: 0 0 6px;
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .pulse {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: var(--accent);
      box-shadow: 0 0 20px var(--glow), 0 0 40px rgba(81, 246, 214, 0.25);
      animation: pulse 2.1s ease-in-out infinite;
    }

    .pulse.live {
      background: var(--success);
      box-shadow: 0 0 20px rgba(74, 222, 128, 0.4);
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
    }

    .panel h2 {
      margin: 0 0 12px;
      font-size: 16px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--accent);
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
      max-height: 280px;
      overflow-y: auto;
    }

    .stream-item {
      font-size: 12px;
      color: var(--muted);
      padding: 10px 12px;
      margin: 6px 0;
      border-radius: 10px;
      border: 1px solid rgba(148, 176, 220, 0.18);
      background: rgba(7, 12, 24, 0.6);
      display: flex;
      justify-content: space-between;
      gap: 10px;
      animation: slideIn 0.3s ease;
    }

    @keyframes slideIn {
      from { opacity: 0; transform: translateX(-10px); }
      to { opacity: 1; transform: translateX(0); }
    }

    .stream-item.deposit {
      border-color: rgba(74, 222, 128, 0.4);
      background: rgba(20, 40, 30, 0.6);
    }

    .stream-item.fraud {
      border-color: rgba(248, 113, 113, 0.4);
      background: rgba(40, 20, 20, 0.6);
    }

    .stream-item span {
      color: var(--accent-2);
      font-weight: 600;
    }

    .stream-item.deposit span { color: var(--success); }
    .stream-item.fraud span { color: var(--danger); }

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
    }

    .controls button:hover {
      background: rgba(81, 246, 214, 0.24);
    }

    .filters {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .filters label {
      padding: 6px 10px;
      border-radius: 999px;
      border: 1px solid rgba(148, 176, 220, 0.24);
      background: rgba(12, 22, 38, 0.55);
      cursor: pointer;
      font-size: 11px;
    }

    .filters label:hover {
      background: rgba(12, 22, 38, 0.75);
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
      font-size: 11px;
    }

    .footer {
      margin-top: 14px;
      font-size: 12px;
      color: var(--muted);
    }

    .connection-status {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 999px;
      background: rgba(12, 22, 38, 0.8);
      font-size: 11px;
    }

    .connection-status::before {
      content: '';
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--muted);
    }

    .connection-status.connected::before {
      background: var(--success);
      box-shadow: 0 0 8px var(--success);
    }

    .connection-status.error::before {
      background: var(--danger);
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.35); opacity: 0.6; }
    }

    @media (max-width: 980px) {
      main {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="noise"></div>
  <header>
    <h1 class="title">
      <span class="pulse live"></span>
      FactoryWager Profile Dashboard v10
    </h1>
    <p class="subtitle">
      🔴 LIVE — Connected to Payment Webhooks | 
      <span class="connection-status" id="wsStatus">connecting...</span>
    </p>
  </header>

  <main>
    <section class="panel">
      <h2>Live Payment Stream</h2>
      <div class="stat-grid">
        <div class="stat">
          <label>Latest User</label>
          <strong id="userId">--</strong>
        </div>
        <div class="stat">
          <label>Risk Score</label>
          <strong id="score">--</strong>
        </div>
        <div class="stat">
          <label>Gateway</label>
          <strong id="gateway">--</strong>
        </div>
        <div class="stat">
          <label>Drift</label>
          <strong id="drift">--</strong>
        </div>
      </div>
      
      <div class="stream" id="stream"></div>
      
      <div class="footer">
        WebSocket: <span id="wsDetail">connecting...</span> | 
        Events: <span id="eventCount">0</span>
      </div>

      <div class="controls">
        <button id="pauseBtn" type="button">Pause Stream</button>
        <div class="filters">
          <label><input type="checkbox" value="PROFILE_FUSE" checked /> ✅ DEPOSITS</label>
          <label><input type="checkbox" value="XGB_SCORE" checked /> 🚨 FRAUD</label>
          <label><input type="checkbox" value="PREF_DRIFT" checked /> 🎯 HABITS</label>
          <label><input type="checkbox" value="PUBSUB" checked /> 💈 P2P</label>
        </div>
        <div class="badge-row" id="badgeRow"></div>
      </div>
    </section>

    <section class="panel">
      <h2>Payment Flow Integration</h2>
      <div style="font-size: 13px; color: var(--muted); line-height: 1.6;">
        <p><strong>Flow:</strong> User Pays → Webhook → Super-Profile Query → Risk Check → Deposit/Alert</p>
        
        <div style="margin-top: 16px; padding: 16px; background: rgba(6, 9, 18, 0.6); border-radius: 12px;">
          <h3 style="margin: 0 0 12px; color: var(--accent); font-size: 12px; text-transform: uppercase;">Redis Channels</h3>
          <div style="display: grid; gap: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <code style="color: var(--success);">PERSONALIZED_DEPOSIT</code>
              <span>Deposits with bonuses</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <code style="color: #ffd700;">HABITS_CLASSIFIED</code>
              <span>User tier updates</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <code style="color: var(--danger);">FRAUD_ALERT</code>
              <span>High-risk blocked</span>
            </div>
          </div>
        </div>

        <div style="margin-top: 16px; padding: 16px; background: rgba(6, 9, 18, 0.6); border-radius: 12px;">
          <h3 style="margin: 0 0 12px; color: var(--accent); font-size: 12px; text-transform: uppercase;">Habits Tiers & Bonuses</h3>
          <div style="display: grid; gap: 8px; font-size: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span>🐋 WHALE</span>
              <span style="color: #ffd700;">100+ txns, $100+ avg → 20% bonus</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span>⚡ HIGH-VOLUME</span>
              <span style="color: #c084fc;">50+ txns → 10% bonus</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span>🎯 ACTIVE</span>
              <span style="color: #60a5fa;">20-50 txns → 5% bonus</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span>👤 CASUAL</span>
              <span style="color: #9ca3af;">&lt;20 txns → No bonus</span>
            </div>
          </div>
        </div>

        <div style="margin-top: 16px; padding: 16px; background: rgba(6, 9, 18, 0.6); border-radius: 12px;">
          <h3 style="margin: 0 0 12px; color: var(--accent); font-size: 12px; text-transform: uppercase;">Risk Thresholds</h3>
          <ul style="margin: 0; padding-left: 18px;">
            <li><strong style="color: var(--success);">Auto-approve:</strong> Score &gt; 0.95 AND Drift &lt; 0.01</li>
            <li><strong style="color: var(--warning);">Review:</strong> Medium score/drift</li>
            <li><strong style="color: var(--danger);">Block:</strong> Drift &gt; 0.05 (takeover?)</li>
          </ul>
        </div>
      </div>
    </section>
  </main>

  <script type="module">
    const streamEl = document.getElementById('stream');
    const scoreEl = document.getElementById('score');
    const driftEl = document.getElementById('drift');
    const gatewayEl = document.getElementById('gateway');
    const userIdEl = document.getElementById('userId');
    const wsStatusEl = document.getElementById('wsStatus');
    const wsDetailEl = document.getElementById('wsDetail');
    const eventCountEl = document.getElementById('eventCount');
    const pauseBtn = document.getElementById('pauseBtn');
    const badgeRow = document.getElementById('badgeRow');
    const filterChecks = Array.from(document.querySelectorAll('.filters input'));
    
    let paused = false;
    let ws = null;
    let eventCount = 0;
    let reconnectTimer = null;

    function pushStream(event) {
      const item = document.createElement('div');
      item.className = 'stream-item';
      
      // Style based on event type
      if (event.message?.includes('💰')) item.classList.add('deposit');
      if (event.message?.includes('🚨')) item.classList.add('fraud');
      
      const left = document.createElement('div');
      left.textContent = event.message;
      left.style.flex = '1';
      left.style.overflow = 'hidden';
      left.style.textOverflow = 'ellipsis';
      
      const right = document.createElement('span');
      right.textContent = event.tag;
      right.style.whiteSpace = 'nowrap';
      
      item.append(left, right);
      streamEl.prepend(item);
      
      // Keep only last 20 items
      while (streamEl.children.length > 20) {
        streamEl.removeChild(streamEl.lastChild);
      }
      
      eventCount++;
      eventCountEl.textContent = eventCount;
    }

    function connect() {
      const scheme = location.protocol === 'https:' ? 'wss' : 'ws';
      const url = scheme + '://' + location.host + '/ws/telemetry-3d';
      
      wsStatusEl.textContent = 'connecting...';
      wsStatusEl.className = 'connection-status';
      wsDetailEl.textContent = url;
      
      ws = new WebSocket(url);

      ws.addEventListener('open', () => {
        wsStatusEl.textContent = 'connected';
        wsStatusEl.className = 'connection-status connected';
        wsDetailEl.textContent = 'Receiving live events';
        console.log('✅ WebSocket connected');
      });

      ws.addEventListener('message', (event) => {
        if (paused) return;
        
        try {
          const data = JSON.parse(event.data);
          const enabledTags = new Set(filterChecks.filter(c => c.checked).map(c => c.value));
          
          if (!enabledTags.has(data.tag)) return;
          
          // Update stats
          userIdEl.textContent = data.userId ?? '--';
          scoreEl.textContent = typeof data.score === 'number' ? data.score.toFixed(4) : '--';
          driftEl.textContent = typeof data.drift === 'number' ? data.drift.toFixed(4) : '--';
          gatewayEl.textContent = (data.gateway ?? '--').toUpperCase();
          
          pushStream(data);
          updateBadges(data);
          
        } catch (err) {
          console.error('Parse error:', err);
        }
      });

      ws.addEventListener('close', () => {
        wsStatusEl.textContent = 'reconnecting...';
        wsStatusEl.className = 'connection-status error';
        wsDetailEl.textContent = 'Connection lost';
        
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(connect, 2000);
      });

      ws.addEventListener('error', (err) => {
        console.error('WebSocket error:', err);
        wsStatusEl.textContent = 'error';
        wsStatusEl.className = 'connection-status error';
      });
    }

    function updateBadges(data) {
      if (!badgeRow) return;
      badgeRow.innerHTML = '';
      
      const badges = [
        { label: 'Score', value: typeof data.score === 'number' ? data.score.toFixed(4) : '--' },
        { label: 'Drift', value: typeof data.drift === 'number' ? data.drift.toFixed(4) : '--' },
        { label: 'Gateway', value: (data.gateway ?? '--').toUpperCase() }
      ];
      
      if (data.anomaly) {
        badges.push({ label: 'Status', value: data.anomaly });
      }
      
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
    });

    // Start connection
    connect();
  </script>
</body>
</html>`;

const server = Bun.serve({
  port: PORT,
  async fetch(req, server) {
    const url = new URL(req.url);

    if (url.pathname === '/ws/telemetry-3d') {
      if (server.upgrade(req)) return;
      return new Response('Upgrade required', { status: 426 });
    }

    if (url.pathname === '/api/status') {
      return new Response(safeStringify({
        status: 'ok',
        clients: clients.size,
        redis: redisSub.status,
        timestamp: new Date().toISOString(),
      }), {
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
      clients.add(ws);
      console.log(`👤 Client connected (${clients.size} total)`);
      
      // Send welcome message
      ws.send(safeStringify({
        userId: '@system',
        gateway: 'dashboard',
        tag: 'PUBSUB',
        score: 1.0,
        drift: 0,
        latency: '0ms',
        anomaly: 'CONNECTED',
        message: '🟢 Connected to live payment stream',
      }));
    },
    message(ws, message) {
      // Handle client messages if needed
      console.log('Client message:', message.toString());
    },
    close(ws) {
      clients.delete(ws);
      console.log(`👤 Client disconnected (${clients.size} remaining)`);
    }
  }
});

console.log('');
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  🦘 FactoryWager Profile Dashboard v10 — INTEGRATED        ║');
console.log('╠════════════════════════════════════════════════════════════╣');
console.log(`║  Dashboard: http://localhost:${PORT}                        ║`);
console.log('║  WebSocket: /ws/telemetry-3d                               ║');
console.log('╠════════════════════════════════════════════════════════════╣');
console.log('║  Redis Channels (subscribed):                              ║');
console.log('║    • DEPOSIT_SUCCESS  → 💰 Deposit events                  ║');
console.log('║    • FRAUD_ALERT      → 🚨 High-risk alerts                ║');
console.log('║    • PROFILE_FUSE     → 🔗 Profile fusion                  ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('');
console.log('Start the payment server: bun run start:payments');
console.log('');

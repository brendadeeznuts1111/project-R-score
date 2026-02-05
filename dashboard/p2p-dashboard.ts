#!/usr/bin/env bun
/**
 * Real-Time P2P Dashboard
 * WebSocket-based live payment monitoring
 */

import Redis from 'ioredis';
import { serve } from 'bun';

const PORT = Number(process.env.DASHBOARD_PORT ?? 3003);
const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

// Redis subscriber
const redisSub = new Redis(REDIS_URL);

// Connected WebSocket clients
const clients = new Set<any>();

// Subscribe to payment events
redisSub.subscribe('p2p:payment', 'PERSONALIZED_DEPOSIT', 'receipt:created', (err) => {
  if (err) {
    console.error('Redis subscription error:', err);
  } else {
    console.log('✅ Subscribed to payment channels');
  }
});

// Forward events to all clients
redisSub.on('message', (channel, message) => {
  const data = JSON.parse(message);
  
  clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: channel,
        timestamp: Date.now(),
        ...data,
      }));
    }
  });
});

// HTML Dashboard
const dashboardHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>P2P Payment Dashboard</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'SF Mono', Monaco, monospace;
      background: #0f172a;
      color: #e2e8f0;
      min-height: 100vh;
    }
    .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 0;
      border-bottom: 1px solid #334155;
      margin-bottom: 30px;
    }
    .header h1 {
      font-size: 24px;
      color: #f59e0b;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .connection-status {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 999px;
      font-size: 12px;
      background: #1e293b;
    }
    .connection-status::before {
      content: '';
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #ef4444;
    }
    .connection-status.connected::before { background: #10b981; }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .stat-card {
      background: #1e293b;
      padding: 24px;
      border-radius: 12px;
      border: 1px solid #334155;
    }
    .stat-card h3 {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #94a3b8;
      margin-bottom: 8px;
    }
    .stat-value {
      font-size: 36px;
      font-weight: bold;
      color: #f59e0b;
    }
    .stat-change {
      font-size: 12px;
      color: #10b981;
      margin-top: 4px;
    }
    
    .payments-section {
      background: #1e293b;
      border-radius: 12px;
      border: 1px solid #334155;
      overflow: hidden;
    }
    .payments-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      border-bottom: 1px solid #334155;
    }
    .payments-header h2 { font-size: 18px; }
    .filter-buttons {
      display: flex;
      gap: 8px;
    }
    .filter-btn {
      padding: 6px 12px;
      border-radius: 6px;
      border: 1px solid #475569;
      background: transparent;
      color: #94a3b8;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .filter-btn:hover, .filter-btn.active {
      background: #334155;
      color: #e2e8f0;
    }
    
    .payments-list {
      max-height: 500px;
      overflow-y: auto;
    }
    .payment-item {
      display: grid;
      grid-template-columns: 80px 120px 100px 80px 100px 1fr;
      gap: 16px;
      padding: 16px 20px;
      border-bottom: 1px solid #334155;
      align-items: center;
      animation: slideIn 0.3s ease;
    }
    @keyframes slideIn {
      from { opacity: 0; transform: translateX(-20px); }
      to { opacity: 1; transform: translateX(0); }
    }
    .payment-item.new {
      background: rgba(16, 185, 129, 0.1);
    }
    .provider {
      font-size: 11px;
      font-weight: bold;
      padding: 4px 8px;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .provider.cashapp { background: #00D632; color: #000; }
    .provider.venmo { background: #008cff; color: #fff; }
    .provider.paypal { background: #003087; color: #fff; }
    
    .user-id {
      font-family: monospace;
      font-size: 12px;
      color: #94a3b8;
    }
    .amount {
      font-weight: bold;
      font-size: 14px;
    }
    .bonus {
      color: #10b981;
      font-size: 12px;
    }
    .tier {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 999px;
      background: #334155;
    }
    .tier.whale { background: #f59e0b; color: #000; }
    .tier.high-volume { background: #8b5cf6; color: #fff; }
    .tier.active { background: #3b82f6; color: #fff; }
    
    .time {
      font-size: 11px;
      color: #64748b;
    }
    
    .empty-state {
      padding: 60px 20px;
      text-align: center;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💈 P2P Payment Dashboard</h1>
      <div class="connection-status" id="connectionStatus">
        Connecting...
      </div>
    </div>
    
    <div class="stats-grid">
      <div class="stat-card">
        <h3>Today's Revenue</h3>
        <div class="stat-value" id="todayRevenue">$0.00</div>
        <div class="stat-change">+0% vs yesterday</div>
      </div>
      <div class="stat-card">
        <h3>Total Bonuses</h3>
        <div class="stat-value" id="totalBonuses">$0.00</div>
      </div>
      <div class="stat-card">
        <h3>Active Users</h3>
        <div class="stat-value" id="activeUsers">0</div>
      </div>
      <div class="stat-card">
        <h3>Transactions</h3>
        <div class="stat-value" id="txnCount">0</div>
      </div>
    </div>
    
    <div class="payments-section">
      <div class="payments-header">
        <h2>Live Payments</h2>
        <div class="filter-buttons">
          <button class="filter-btn active" data-filter="all">All</button>
          <button class="filter-btn" data-filter="cashapp">CashApp</button>
          <button class="filter-btn" data-filter="venmo">Venmo</button>
          <button class="filter-btn" data-filter="paypal">PayPal</button>
        </div>
      </div>
      <div class="payments-list" id="paymentsList">
        <div class="empty-state">Waiting for payments...</div>
      </div>
    </div>
  </div>
  
  <script>
    const ws = new WebSocket('ws://' + window.location.host + '/ws');
    const connectionStatus = document.getElementById('connectionStatus');
    const paymentsList = document.getElementById('paymentsList');
    
    let stats = {
      todayRevenue: 0,
      totalBonuses: 0,
      activeUsers: new Set(),
      txnCount: 0
    };
    
    ws.onopen = () => {
      connectionStatus.textContent = 'Connected';
      connectionStatus.classList.add('connected');
    };
    
    ws.onclose = () => {
      connectionStatus.textContent = 'Disconnected';
      connectionStatus.classList.remove('connected');
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'p2p:payment' || data.type === 'PERSONALIZED_DEPOSIT') {
        // Update stats
        stats.todayRevenue += data.amount || 0;
        stats.totalBonuses += data.bonus || 0;
        stats.activeUsers.add(data.stealthId);
        stats.txnCount++;
        
        // Update DOM
        document.getElementById('todayRevenue').textContent = '$' + stats.todayRevenue.toFixed(2);
        document.getElementById('totalBonuses').textContent = '$' + stats.totalBonuses.toFixed(2);
        document.getElementById('activeUsers').textContent = stats.activeUsers.size;
        document.getElementById('txnCount').textContent = stats.txnCount;
        
        // Add payment to list
        addPayment(data);
      }
    };
    
    function addPayment(data) {
      // Remove empty state
      const emptyState = paymentsList.querySelector('.empty-state');
      if (emptyState) emptyState.remove();
      
      const item = document.createElement('div');
      item.className = 'payment-item new';
      item.innerHTML = \`
        <span class="provider \${data.provider}">\${data.provider}</span>
        <span class="user-id">\${data.stealthId?.substring(0, 12) || 'unknown'}...</span>
        <span class="amount">$\${data.amount?.toFixed(2) || '0.00'}</span>
        <span class="bonus">+ $\${data.bonus?.toFixed(2) || '0.00'}</span>
        <span class="tier \${data.tier}">\${data.tier}</span>
        <span class="time">\${new Date().toLocaleTimeString()}</span>
      \`;
      
      paymentsList.insertBefore(item, paymentsList.firstChild);
      
      // Keep only last 50 items
      while (paymentsList.children.length > 50) {
        paymentsList.removeChild(paymentsList.lastChild);
      }
      
      // Remove 'new' class after animation
      setTimeout(() => item.classList.remove('new'), 3000);
    }
    
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        // Filter logic would go here
      });
    });
  </script>
</body>
</html>`;

// Bun Server with WebSocket
const server = serve({
  port: PORT,
  async fetch(req, server) {
    const url = new URL(req.url);
    
    // WebSocket upgrade
    if (url.pathname === '/ws') {
      const success = server.upgrade(req);
      return success ? undefined : new Response('WebSocket upgrade failed', { status: 400 });
    }
    
    // Dashboard HTML
    if (url.pathname === '/' || url.pathname === '/dashboard') {
      return new Response(dashboardHTML, {
        headers: { 'Content-Type': 'text/html' },
      });
    }
    
    // Health
    return new Response(JSON.stringify({
      status: 'ok',
      clients: clients.size,
      timestamp: new Date().toISOString(),
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  },
  
  websocket: {
    open(ws) {
      clients.add(ws);
      console.log(`👤 Client connected (${clients.size} total)`);
      
      // Send welcome
      ws.send(JSON.stringify({
        type: 'connected',
        message: 'Welcome to P2P Dashboard',
        timestamp: Date.now(),
      }));
    },
    message(ws, message) {
      // Handle client messages
      console.log('Client message:', message);
    },
    close(ws) {
      clients.delete(ws);
      console.log(`👤 Client disconnected (${clients.size} remaining)`);
    },
  },
});

console.log('');
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  📊 P2P Real-Time Dashboard                                ║');
console.log('╠════════════════════════════════════════════════════════════╣');
console.log(`║  URL: http://localhost:${PORT}/dashboard                        ║`);
console.log(`║  WebSocket: ws://localhost:${PORT}/ws                           ║`);
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('');

export default server;

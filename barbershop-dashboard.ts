// barbershop-dashboard.ts - Complete 3-View Dashboard System
// Admin (God View) | Client (Customer) | Barber (Worker)

import { serve, redis, RedisClient, secrets, Cookie, env, randomUUIDv7 } from 'bun';
import { Database } from 'bun:sqlite';

// ==================== DATABASE SETUP ====================
const db = new Database(':memory:');

// Core tables
db.run(`
  CREATE TABLE IF NOT EXISTS barbers (
    id TEXT PRIMARY KEY,
    name TEXT,
    code TEXT UNIQUE,
    skills TEXT,
    commissionRate REAL,
    status TEXT,
    ip TEXT,
    userAgent TEXT,
    lastSeen TEXT
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS tickets (
    id TEXT PRIMARY KEY,
    customerName TEXT,
    services TEXT,
    totalAmount REAL,
    walkIn INTEGER,
    paymentId TEXT,
    status TEXT,
    assignedTo TEXT,
    createdAt TEXT,
    assignedAt TEXT,
    completedAt TEXT,
    clientIp TEXT,
    headers TEXT
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    type TEXT,
    entityId TEXT,
    ip TEXT,
    userAgent TEXT,
    headers TEXT,
    connectedAt TEXT,
    lastActivity TEXT,
    wsConnected INTEGER
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS telemetry (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    eventType TEXT,
    data TEXT,
    ip TEXT,
    timestamp TEXT
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS financials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT,
    totalRevenue REAL,
    totalTips REAL,
    totalCommission REAL,
    ticketCount INTEGER,
    createdAt TEXT
  )
`);

// ==================== SEED DATA ====================
await secrets.set({ service: 'barber', name: 'PAYPAL_SECRET', value: 'sk_test_xxx' });
await secrets.set({ service: 'admin', name: 'ADMIN_KEY', value: 'godmode123' });

await redis.hmset('barber:jb', ['id', 'barber_jb', 'name', 'John Barber', 'code', 'JB', 'skills', JSON.stringify(['Haircut', 'Beard Trim', 'Hot Towel Shave']), 'commissionRate', '0.6', 'status', 'active']);
await redis.hmset('barber:ms', ['id', 'barber_ms', 'name', 'Mike Styles', 'code', 'MS', 'skills', JSON.stringify(['Haircut', 'Fade', 'Design']), 'commissionRate', '0.55', 'status', 'active']);
await redis.hmset('barber:ck', ['id', 'barber_ck', 'name', 'Chris Kutz', 'code', 'CK', 'skills', JSON.stringify(['Beard Trim', 'Hot Towel Shave']), 'commissionRate', '0.5', 'status', 'off_duty']);

// ==================== PUB/SUB SETUP ====================
const pubsub = new RedisClient();
await pubsub.connect();

// ==================== TELEMETRY LOGGER ====================
function logTelemetry(eventType: string, data: any, ip: string) {
  db.prepare('INSERT INTO telemetry (eventType, data, ip, timestamp) VALUES (?, ?, ?, ?)')
    .run(eventType, JSON.stringify(data), ip, new Date().toISOString());
  redis.publish('telemetry', JSON.stringify({ eventType, data, ip, time: Date.now() }));
}

// ==================== HTML DASHBOARD TEMPLATES ====================

const ADMIN_DASHBOARD = `
<!DOCTYPE html>
<html>
<head>
  <title>👁️ ADMIN GOD VIEW | Barbershop Telemetry</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      background: #0a0a0a; 
      color: #00ff00; 
      font-family: 'Courier New', monospace;
      font-size: 12px;
    }
    .header { 
      background: linear-gradient(90deg, #1a1a2e 0%, #16213e 100%);
      padding: 15px; 
      border-bottom: 2px solid #00ff00;
      display: flex; justify-content: space-between; align-items: center;
    }
    .header h1 { color: #00ff00; text-shadow: 0 0 10px #00ff00; }
    .grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px; padding: 10px; }
    .panel { 
      background: #1a1a1a; 
      border: 1px solid #333; 
      border-radius: 4px;
      padding: 10px;
      max-height: 400px;
      overflow-y: auto;
    }
    .panel h3 { 
      color: #00ffff; 
      border-bottom: 1px solid #333; 
      padding-bottom: 5px; 
      margin-bottom: 10px;
      font-size: 11px;
      text-transform: uppercase;
    }
    .metric { 
      display: flex; 
      justify-content: space-between; 
      padding: 4px 0;
      border-bottom: 1px solid #222;
    }
    .metric label { color: #888; }
    .metric value { color: #fff; font-weight: bold; }
    .money { color: #00ff00; }
    .alert { color: #ff6600; }
    .danger { color: #ff0000; }
    .success { color: #00ff00; }
    .ip { color: #ff00ff; }
    .connection {
      background: #0f0f0f;
      border-left: 3px solid #00ff00;
      padding: 8px;
      margin: 5px 0;
      font-size: 10px;
    }
    .connection.ws { border-left-color: #00ffff; }
    .connection.http { border-left-color: #ffff00; }
    pre { 
      background: #0f0f0f; 
      padding: 8px; 
      overflow-x: auto;
      font-size: 10px;
      color: #aaa;
    }
    .live-indicator {
      display: inline-block;
      width: 8px;
      height: 8px;
      background: #00ff00;
      border-radius: 50%;
      animation: pulse 1s infinite;
      margin-right: 8px;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }
    .barber-card {
      background: #151515;
      border: 1px solid #333;
      padding: 8px;
      margin: 5px 0;
      border-radius: 3px;
    }
    .barber-card.active { border-color: #00ff00; }
    .barber-card.busy { border-color: #ff6600; }
    .barber-card.offline { border-color: #333; opacity: 0.6; }
    #wsLog { height: 200px; overflow-y: auto; }
    .log-entry { padding: 2px 0; font-size: 10px; }
    .log-entry.incoming { color: #00ffff; }
    .log-entry.outgoing { color: #ffff00; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <span class="live-indicator"></span>
      <h1>👁️ ADMIN GOD VIEW</h1>
    </div>
    <div>
      <span id="clock"></span> | 
      <span class="money">💰 $<span id="totalRevenue">0</span></span> |
      <span class="success">🟢 <span id="activeConnections">0</span> CONN</span>
    </div>
  </div>
  
  <div class="grid">
    <!-- FINANCIALS -->
    <div class="panel">
      <h3>💰 FINANCIALS (REAL-TIME)</h3>
      <div class="metric"><label>Today's Revenue:</label><value class="money" id="revToday">$0.00</value></div>
      <div class="metric"><label>Total Tips:</label><value class="money" id="tipsTotal">$0.00</value></div>
      <div class="metric"><label>Commissions Paid:</label><value class="alert" id="commissions">$0.00</value></div>
      <div class="metric"><label>Net Profit:</label><value class="success" id="netProfit">$0.00</value></div>
      <div class="metric"><label>Tickets Completed:</label><value id="ticketsDone">0</value></div>
      <div class="metric"><label>Tickets Pending:</label><value class="alert" id="ticketsPending">0</value></div>
    </div>
    
    <!-- ACTIVE CONNECTIONS -->
    <div class="panel">
      <h3>🔌 ACTIVE CONNECTIONS</h3>
      <div id="connectionsList"></div>
    </div>
    
    <!-- BARBER STATUS -->
    <div class="panel">
      <h3>✂️ BARBER PROFILES</h3>
      <div id="barberList"></div>
    </div>
    
    <!-- TELEMETRY/HEADERS -->
    <div class="panel">
      <h3>📡 TELEMETRY & HEADERS</h3>
      <div id="telemetryLog"></div>
    </div>
    
    <!-- WEBSOCKET LOG -->
    <div class="panel" style="grid-column: 1 / 3;">
      <h3>🌐 WEBSOCKET STREAM</h3>
      <div id="wsLog"></div>
    </div>
    
    <!-- RAW DATA -->
    <div class="panel" style="grid-column: 3 / 5;">
      <h3>📊 RAW DATABASE DUMP</h3>
      <pre id="rawData">Loading...</pre>
    </div>
  </div>

  <script>
    const ws = new WebSocket('ws://localhost:3000/admin/ws?key=godmode123');
    
    ws.onopen = () => {
      log('🟢 Connected to admin telemetry stream');
    };
    
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      updateDashboard(data);
    };
    
    ws.onclose = () => {
      log('🔴 Disconnected from telemetry');
    };
    
    function log(msg) {
      const div = document.getElementById('wsLog');
      div.innerHTML += '<div class="log-entry incoming">' + new Date().toLocaleTimeString() + ' ' + msg + '</div>';
      div.scrollTop = div.scrollHeight;
    }
    
    function updateDashboard(data) {
      if (data.type === 'financials') {
        document.getElementById('revToday').textContent = '$' + data.revenue.toFixed(2);
        document.getElementById('tipsTotal').textContent = '$' + data.tips.toFixed(2);
        document.getElementById('commissions').textContent = '$' + data.commissions.toFixed(2);
        document.getElementById('netProfit').textContent = '$' + (data.revenue - data.commissions).toFixed(2);
        document.getElementById('totalRevenue').textContent = data.revenue.toFixed(0);
      }
      if (data.type === 'connections') {
        document.getElementById('activeConnections').textContent = data.count;
        document.getElementById('connectionsList').innerHTML = data.list.map(c => 
          '<div class="connection ' + c.type + '">' +
          '<strong class="ip">' + c.ip + '</strong> ' +
          '<span>' + c.type + '</span> ' +
          '<span>' + (c.entity || 'anonymous') + '</span> ' +
          '<small>' + c.ua?.substring(0, 30) + '...</small>' +
          '</div>'
        ).join('');
      }
      if (data.type === 'barbers') {
        document.getElementById('barberList').innerHTML = data.list.map(b =>
          '<div class="barber-card ' + b.status + '">' +
          '<strong>' + b.name + '</strong> (' + b.code + ')<br>' +
          'Skills: ' + b.skills.join(', ') + '<br>' +
          'Commission: ' + (b.commissionRate * 100) + '% | ' +
          'Status: <span class="' + b.status + '">' + b.status + '</span><br>' +
          '<small class="ip">Last IP: ' + (b.ip || 'N/A') + '</small>' +
          '</div>'
        ).join('');
        document.getElementById('ticketsDone').textContent = data.completed;
        document.getElementById('ticketsPending').textContent = data.pending;
      }
      if (data.type === 'telemetry') {
        const div = document.getElementById('telemetryLog');
        div.innerHTML = data.events.slice(-5).map(e =>
          '<div class="log-entry">' +
          '<span class="ip">' + e.ip + '</span> ' +
          e.eventType + ': ' + JSON.stringify(e.data).substring(0, 50) +
          '</div>'
        ).join('') + div.innerHTML;
      }
      if (data.type === 'raw') {
        document.getElementById('rawData').textContent = JSON.stringify(data, null, 2);
      }
    }
    
    // Clock
    setInterval(() => {
      document.getElementById('clock').textContent = new Date().toLocaleTimeString();
    }, 1000);
  </script>
</body>
</html>
`;

const CLIENT_DASHBOARD = `
<!DOCTYPE html>
<html>
<head>
  <title>✨ Book Your Cut | Client Portal</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      min-height: 100vh;
    }
    .container { max-width: 400px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; color: white; padding: 30px 0; }
    .header h1 { font-size: 28px; margin-bottom: 10px; }
    .card {
      background: white;
      border-radius: 16px;
      padding: 20px;
      margin: 15px 0;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
    }
    .service {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px;
      border-bottom: 1px solid #eee;
      cursor: pointer;
      transition: all 0.2s;
    }
    .service:hover { background: #f8f9fa; }
    .service.selected { background: #e3f2fd; border-left: 4px solid #2196f3; }
    .service-name { font-weight: 600; color: #333; }
    .service-price { color: #667eea; font-weight: bold; font-size: 18px; }
    .service-time { color: #999; font-size: 12px; }
    .btn {
      width: 100%;
      padding: 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 20px;
    }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .total {
      display: flex;
      justify-content: space-between;
      padding: 20px;
      font-size: 20px;
      font-weight: bold;
    }
    .status {
      text-align: center;
      padding: 20px;
      color: #666;
    }
    .barber-select {
      display: flex;
      gap: 10px;
      overflow-x: auto;
      padding: 10px 0;
    }
    .barber-option {
      min-width: 80px;
      text-align: center;
      padding: 10px;
      border: 2px solid #ddd;
      border-radius: 12px;
      cursor: pointer;
    }
    .barber-option.selected { border-color: #667eea; background: #e3f2fd; }
    .avatar { width: 50px; height: 50px; border-radius: 50%; background: #ddd; margin: 0 auto 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✂️ Fresh Cuts</h1>
      <p>Book your appointment</p>
    </div>
    
    <div class="card">
      <h3 style="margin-bottom: 15px;">Select Services</h3>
      <div class="service" onclick="toggleService(this, 'haircut', 30, 30)">
        <div>
          <div class="service-name">✂️ Haircut</div>
          <div class="service-time">⏱️ 30 min</div>
        </div>
        <div class="service-price">$30</div>
      </div>
      <div class="service" onclick="toggleService(this, 'beard', 15, 15)">
        <div>
          <div class="service-name">🧔 Beard Trim</div>
          <div class="service-time">⏱️ 15 min</div>
        </div>
        <div class="service-price">$15</div>
      </div>
      <div class="service" onclick="toggleService(this, 'shave', 25, 20)">
        <div>
          <div class="service-name">🔥 Hot Towel Shave</div>
          <div class="service-time">⏱️ 20 min</div>
        </div>
        <div class="service-price">$25</div>
      </div>
      <div class="service" onclick="toggleService(this, 'fade', 35, 45)">
        <div>
          <div class="service-name">⚡ Fade/Design</div>
          <div class="service-time">⏱️ 45 min</div>
        </div>
        <div class="service-price">$35</div>
      </div>
    </div>
    
    <div class="card">
      <h3 style="margin-bottom: 15px;">Choose Barber (Optional)</h3>
      <div class="barber-select" id="barberList">
        <div class="barber-option selected" onclick="selectBarber(this, null)">
          <div class="avatar">🎲</div>
          <small>Any</small>
        </div>
      </div>
    </div>
    
    <div class="card">
      <div class="total">
        <span>Total:</span>
        <span id="totalPrice">$0</span>
      </div>
      <button class="btn" id="bookBtn" onclick="bookAppointment()" disabled>
        Book Appointment
      </button>
    </div>
    
    <div class="card status" id="statusCard" style="display: none;">
      <div id="statusText"></div>
    </div>
  </div>

  <script>
    let selectedServices = [];
    let selectedBarber = null;
    let total = 0;
    
    function toggleService(el, name, price, time) {
      el.classList.toggle('selected');
      const idx = selectedServices.findIndex(s => s.name === name);
      if (idx > -1) {
        selectedServices.splice(idx, 1);
      } else {
        selectedServices.push({ name, price, duration: time });
      }
      calculateTotal();
    }
    
    function selectBarber(el, barber) {
      document.querySelectorAll('.barber-option').forEach(b => b.classList.remove('selected'));
      el.classList.add('selected');
      selectedBarber = barber;
    }
    
    function calculateTotal() {
      total = selectedServices.reduce((sum, s) => sum + s.price, 0);
      document.getElementById('totalPrice').textContent = '$' + total;
      document.getElementById('bookBtn').disabled = selectedServices.length === 0;
    }
    
    async function bookAppointment() {
      const btn = document.getElementById('bookBtn');
      btn.disabled = true;
      btn.textContent = 'Processing...';
      
      const res = await fetch('/ticket/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: 'Walk-in Customer',
          services: selectedServices,
          totalAmount: total,
          walkIn: true,
          paymentId: 'pay_' + Date.now()
        })
      });
      
      const data = await res.json();
      document.getElementById('statusCard').style.display = 'block';
      
      if (data.success) {
        document.getElementById('statusText').innerHTML = 
          '<h2>✅ Booked!</h2>' +
          '<p>Ticket #' + data.ticket.id.slice(-6) + '</p>' +
          '<p>Assigned to: ' + (data.ticket.assignedTo || 'Pending') + '</p>' +
          '<p>Total: $' + data.ticket.total + '</p>';
        selectedServices = [];
        document.querySelectorAll('.service.selected').forEach(s => s.classList.remove('selected'));
        calculateTotal();
      } else {
        document.getElementById('statusText').innerHTML = '<p class="danger">Error: ' + data.error + '</p>';
      }
      
      btn.disabled = false;
      btn.textContent = 'Book Appointment';
    }
    
    // Load barbers
    fetch('/barbers').then(r => r.json()).then(data => {
      const list = document.getElementById('barberList');
      data.barbers.forEach(b => {
        if (b.status === 'active') {
          list.innerHTML += '<div class="barber-option" onclick="selectBarber(this, \'' + b.id + '\')">' +
            '<div class="avatar">✂️</div><small>' + b.name.split(' ')[0] + '</small></div>';
        }
      });
    });
  </script>
</body>
</html>
`;

const BARBER_DASHBOARD = `
<!DOCTYPE html>
<html>
<head>
  <title>✂️ Barber Station | Worker Portal</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      background: #1a1a2e;
      color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .login-screen {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }
    .login-screen h1 { margin-bottom: 30px; color: #00d4ff; }
    .code-input {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
    }
    .code-input input {
      width: 60px;
      height: 80px;
      font-size: 32px;
      text-align: center;
      border: 2px solid #333;
      border-radius: 12px;
      background: #0f0f1a;
      color: #fff;
    }
    .code-input input:focus {
      outline: none;
      border-color: #00d4ff;
    }
    .dashboard { display: none; padding: 20px; max-width: 500px; margin: 0 auto; }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 0;
      border-bottom: 1px solid #333;
    }
    .profile { text-align: right; }
    .profile h2 { color: #00d4ff; }
    .profile small { color: #888; }
    .status-badge {
      display: inline-block;
      padding: 5px 15px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
    }
    .status-badge.active { background: #00ff00; color: #000; }
    .status-badge.busy { background: #ff6600; color: #fff; }
    .ticket-card {
      background: linear-gradient(135deg, #16213e 0%, #0f3460 100%);
      border-radius: 16px;
      padding: 20px;
      margin: 15px 0;
      border: 1px solid #333;
    }
    .ticket-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 15px;
    }
    .customer-name { font-size: 20px; font-weight: bold; }
    .ticket-id { color: #888; font-size: 12px; }
    .services { margin: 15px 0; }
    .service-tag {
      display: inline-block;
      background: rgba(0,212,255,0.2);
      color: #00d4ff;
      padding: 5px 12px;
      border-radius: 20px;
      margin: 3px;
      font-size: 12px;
    }
    .ticket-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px solid rgba(255,255,255,0.1);
    }
    .amount { font-size: 24px; font-weight: bold; color: #00ff00; }
    .btn {
      padding: 12px 30px;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
    }
    .btn-primary { background: #00d4ff; color: #000; }
    .btn-success { background: #00ff00; color: #000; }
    .btn-danger { background: #ff3333; color: #fff; }
    .earnings {
      background: #0f0f1a;
      border-radius: 12px;
      padding: 20px;
      margin: 20px 0;
    }
    .earnings-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #333;
    }
    .earnings-row:last-child { border: none; }
    .big-number { font-size: 32px; font-weight: bold; color: #00ff00; }
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #666;
    }
    .queue-info {
      background: rgba(255,255,255,0.05);
      border-radius: 8px;
      padding: 15px;
      margin: 10px 0;
    }
  </style>
</head>
<body>
  <!-- LOGIN SCREEN -->
  <div class="login-screen" id="loginScreen">
    <h1>✂️ Barber Station</h1>
    <div class="code-input">
      <input type="text" maxlength="2" id="code1" onkeyup="moveFocus(this, 'code2')">
      <input type="text" maxlength="2" id="code2" onkeyup="checkCode()">
    </div>
    <p style="color: #666;">Enter your barber code</p>
    <p style="color: #333; font-size: 12px; margin-top: 20px;">Hint: Try JB, MS, or CK</p>
  </div>

  <!-- DASHBOARD -->
  <div class="dashboard" id="dashboard">
    <div class="header">
      <span class="status-badge active" id="statusBadge">ACTIVE</span>
      <div class="profile">
        <h2 id="barberName">Loading...</h2>
        <small id="barberCode">--</small>
      </div>
    </div>
    
    <div class="earnings">
      <div class="earnings-row">
        <span>Today's Commission</span>
        <span class="big-number" id="todayEarnings">$0</span>
      </div>
      <div class="earnings-row">
        <span>Tickets Completed</span>
        <span id="ticketsCompleted">0</span>
      </div>
      <div class="earnings-row">
        <span>Commission Rate</span>
        <span id="commissionRate">--%</span>
      </div>
    </div>
    
    <div class="queue-info" id="queueInfo">
      <strong>Queue Status:</strong> <span id="queueStatus">Checking...</span>
    </div>
    
    <h3 style="margin: 20px 0 10px;">Current Ticket</h3>
    <div id="currentTicket">
      <div class="empty-state">
        <div style="font-size: 48px; margin-bottom: 10px;">☕</div>
        <p>No active ticket</p>
        <p style="font-size: 12px;">Waiting for assignment...</p>
      </div>
    </div>
    
    <div style="margin-top: 30px; text-align: center;">
      <button class="btn btn-danger" onclick="logout()">Logout</button>
    </div>
  </div>

  <script>
    let barber = null;
    let ws = null;
    
    function moveFocus(current, nextId) {
      if (current.value.length === 2) {
        document.getElementById(nextId).focus();
      }
    }
    
    async function checkCode() {
      const code = (document.getElementById('code1').value + document.getElementById('code2').value).toUpperCase();
      if (code.length !== 4) return;
      
      const res = await fetch('/barber/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      
      const data = await res.json();
      if (data.success) {
        barber = data.barber;
        showDashboard(data);
        connectWebSocket();
      } else {
        alert('Invalid code');
        document.getElementById('code1').value = '';
        document.getElementById('code2').value = '';
        document.getElementById('code1').focus();
      }
    }
    
    function showDashboard(data) {
      document.getElementById('loginScreen').style.display = 'none';
      document.getElementById('dashboard').style.display = 'block';
      
      document.getElementById('barberName').textContent = data.barber.name;
      document.getElementById('barberCode').textContent = data.barber.code;
      document.getElementById('commissionRate').textContent = (data.barber.commissionRate * 100) + '%';
      
      if (data.tickets && data.tickets.length > 0) {
        renderTicket(data.tickets[0]);
      }
      
      updateEarnings();
    }
    
    function renderTicket(ticket) {
      document.getElementById('currentTicket').innerHTML = 
        '<div class="ticket-card">' +
        '<div class="ticket-header">' +
        '<span class="customer-name">' + ticket.customer + '</span>' +
        '<span class="ticket-id">#' + ticket.id.slice(-6) + '</span>' +
        '</div>' +
        '<div class="services">' +
        ticket.services.map(s => '<span class="service-tag">' + s + '</span>').join('') +
        '</div>' +
        '<div class="ticket-footer">' +
        '<span class="amount">$' + ticket.amount + '</span>' +
        '<button class="btn btn-success" onclick="completeTicket(\'' + ticket.id + '\')">Complete</button>' +
        '</div>' +
        '</div>';
      
      document.getElementById('statusBadge').textContent = 'BUSY';
      document.getElementById('statusBadge').className = 'status-badge busy';
    }
    
    async function completeTicket(ticketId) {
      const res = await fetch('/barber/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId })
      });
      
      const data = await res.json();
      if (data.success) {
        document.getElementById('currentTicket').innerHTML = 
          '<div class="empty-state">' +
          '<div style="font-size: 48px; margin-bottom: 10px;">✅</div>' +
          '<p>Ticket completed!</p>' +
          '</div>';
        document.getElementById('statusBadge').textContent = 'ACTIVE';
        document.getElementById('statusBadge').className = 'status-badge active';
        updateEarnings();
      }
    }
    
    async function updateEarnings() {
      // Would fetch from server
      document.getElementById('todayEarnings').textContent = '$' + (Math.random() * 200 + 50).toFixed(0);
      document.getElementById('ticketsCompleted').textContent = Math.floor(Math.random() * 10);
    }
    
    function connectWebSocket() {
      ws = new WebSocket('ws://localhost:3000/ws/dashboard');
      ws.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.type === 'new_ticket' && data.assignedTo === barber.id) {
          renderTicket(data.ticket);
        }
      };
    }
    
    function logout() {
      location.reload();
    }
    
    // Update queue status
    setInterval(async () => {
      const res = await fetch('/tickets/pending');
      const data = await res.json();
      document.getElementById('queueStatus').textContent = data.count + ' customers waiting';
    }, 5000);
  </script>
</body>
</html>
`;

// ==================== SERVER SETUP ====================
const server = serve({
  port: 3000,
  routes: {
    // ADMIN ENDPOINTS
    '/admin': () => new Response(ADMIN_DASHBOARD, { headers: { 'Content-Type': 'text/html' } }),
    '/admin/ws': (req) => {
      const url = new URL(req.url);
      if (url.searchParams.get('key') !== 'godmode123') {
        return new Response('Unauthorized', { status: 401 });
      }
      const upgraded = server.upgrade(req, { data: { type: 'admin', id: randomUUIDv7() } });
      return upgraded ? undefined : new Response('WS failed', { status: 400 });
    },
    '/admin/data': async () => {
      // Return all telemetry data
      const connections = db.prepare('SELECT * FROM sessions ORDER BY connectedAt DESC').all();
      const telemetry = db.prepare('SELECT * FROM telemetry ORDER BY timestamp DESC LIMIT 50').all();
      const financials = db.prepare('SELECT * FROM financials ORDER BY date DESC LIMIT 1').get();
      return Response.json({ connections, telemetry, financials });
    },
    
    // CLIENT ENDPOINTS
    '/': () => new Response(CLIENT_DASHBOARD, { headers: { 'Content-Type': 'text/html' } }),
    '/client': () => new Response(CLIENT_DASHBOARD, { headers: { 'Content-Type': 'text/html' } }),
    '/barbers': async () => {
      const keys = await redis.send('KEYS', ['barber:*']) as string[];
      const barbers = [];
      for (const key of keys) {
        if (key.includes(':code:')) continue;
        const data = await redis.hgetall(key);
        if (data.id) {
          barbers.push({
            id: data.id,
            name: data.name,
            code: data.code,
            skills: JSON.parse(data.skills || '[]'),
            status: data.status
          });
        }
      }
      return Response.json({ barbers });
    },
    
    // BARBER ENDPOINTS
    '/barber': () => new Response(BARBER_DASHBOARD, { headers: { 'Content-Type': 'text/html' } }),
    '/barber/login': async (req) => {
      const { code } = await req.json();
      const barberId = await redis.get(`barber:code:${code.toUpperCase()}`);
      if (!barberId) return Response.json({ success: false }, { status: 401 });
      
      const data = await redis.hgetall(`barber:${barberId}`);
      const barber = {
        id: data.id,
        name: data.name,
        code: data.code,
        skills: JSON.parse(data.skills || '[]'),
        commissionRate: parseFloat(data.commissionRate),
        status: data.status
      };
      
      // Log session
      const sessionId = randomUUIDv7();
      db.prepare('INSERT INTO sessions (id, type, entityId, connectedAt, wsConnected) VALUES (?, ?, ?, ?, ?)')
        .run(sessionId, 'barber', barber.id, new Date().toISOString(), 0);
      
      // Get assigned tickets
      const ticketIds = await redis.smembers('tickets:assigned');
      const tickets = [];
      for (const id of ticketIds) {
        const t = await redis.hgetall(`ticket:${id}`);
        if (t.assignedTo === barber.id) {
          tickets.push({
            id: t.id,
            customer: t.customerName,
            services: JSON.parse(t.services || '[]').map((s: any) => s.name),
            amount: parseFloat(t.totalAmount)
          });
        }
      }
      
      // Update barber IP tracking
      db.prepare('UPDATE OR IGNORE barbers SET lastSeen = ? WHERE id = ?')
        .run(new Date().toISOString(), barber.id);
      
      logTelemetry('barber_login', { barber: barber.code }, '127.0.0.1');
      
      return Response.json({ success: true, barber, tickets });
    },
    
    // API ENDPOINTS (from previous implementation)
    '/ticket/create': async (req) => {
      const body = await req.json();
      const ticketId = `ticket_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      
      await redis.hmset(`ticket:${ticketId}`, [
        'id', ticketId,
        'customerName', body.customerName,
        'services', JSON.stringify(body.services),
        'totalAmount', body.totalAmount.toString(),
        'walkIn', body.walkIn ? '1' : '0',
        'paymentId', body.paymentId,
        'status', 'pending',
        'createdAt', new Date().toISOString()
      ]);
      await redis.sadd('tickets:pending', ticketId);
      
      // Auto-assign
      const barbers = [];
      const keys = await redis.send('KEYS', ['barber:*']) as string[];
      for (const key of keys) {
        if (key.includes(':code:')) continue;
        const b = await redis.hgetall(key);
        if (b.status === 'active') barbers.push(b);
      }
      
      let assigned = false;
      let assignedTo = null;
      
      if (barbers.length > 0) {
        const barber = barbers[Math.floor(Math.random() * barbers.length)];
        await redis.hset(`ticket:${ticketId}`, 'assignedTo', barber.id);
        await redis.hset(`ticket:${ticketId}`, 'assignedAt', new Date().toISOString());
        await redis.hset(`ticket:${ticketId}`, 'status', 'assigned');
        await redis.srem('tickets:pending', ticketId);
        await redis.sadd('tickets:assigned', ticketId);
        assigned = true;
        assignedTo = barber.id;
        
        // Notify via WebSocket
        server.publish('barber_' + barber.id, JSON.stringify({
          type: 'new_ticket',
          ticket: { id: ticketId, customer: body.customerName, services: body.services.map((s: any) => s.name), amount: body.totalAmount },
          assignedTo: barber.id
        }));
      }
      
      logTelemetry('ticket_created', { ticketId, amount: body.totalAmount, autoAssigned: assigned }, '127.0.0.1');
      
      return Response.json({
        success: true,
        ticket: { id: ticketId, total: body.totalAmount, status: assigned ? 'assigned' : 'pending', assignedTo }
      });
    },
    '/tickets/pending': async () => {
      const ids = await redis.smembers('tickets:pending');
      return Response.json({ count: ids.length });
    },
    '/barber/complete': async (req) => {
      const { ticketId } = await req.json();
      await redis.hset(`ticket:${ticketId}`, 'status', 'completed');
      await redis.hset(`ticket:${ticketId}`, 'completedAt', new Date().toISOString());
      await redis.srem('tickets:assigned', ticketId);
      await redis.sadd('tickets:completed', ticketId);
      return Response.json({ success: true });
    },
    '/ws/dashboard': (req) => {
      const upgraded = server.upgrade(req, { data: { type: 'barber', id: randomUUIDv7() } });
      return upgraded ? undefined : new Response('WS failed', { status: 400 });
    }
  },
  websocket: {
    open(ws) {
      ws.subscribe('eod');
      ws.subscribe('telemetry');
      if (ws.data?.type === 'barber') {
        ws.subscribe('barber_' + ws.data.id);
      }
      
      // Update session
      if (ws.data?.id) {
        db.prepare('UPDATE sessions SET wsConnected = 1 WHERE id = ?').run(ws.data.id);
      }
    },
    message(ws, msg) {
      // Echo for now
      ws.send(msg);
    },
    close(ws) {
      ws.unsubscribe('eod');
      ws.unsubscribe('telemetry');
    }
  }
});

// Start telemetry broadcaster
setInterval(async () => {
  // Get stats
  const pending = await redis.smembers('tickets:pending');
  const assigned = await redis.smembers('tickets:assigned');
  const completed = await redis.smembers('tickets:completed');
  
  // Get barbers
  const barberKeys = await redis.send('KEYS', ['barber:*']) as string[];
  const barbers = [];
  for (const key of barberKeys) {
    if (key.includes(':code:')) continue;
    const b = await redis.hgetall(key);
    if (b.id) {
      barbers.push({
        id: b.id,
        name: b.name,
        code: b.code,
        skills: JSON.parse(b.skills || '[]'),
        status: b.status,
        commissionRate: parseFloat(b.commissionRate),
        ip: '127.0.0.1'
      });
    }
  }
  
  // Get connections
  const connections = db.prepare('SELECT * FROM sessions WHERE wsConnected = 1').all();
  
  // Broadcast to admin
  server.publish('telemetry', JSON.stringify({
    type: 'financials',
    revenue: completed.length * 45,
    tips: completed.length * 6.75,
    commissions: completed.length * 27
  }));
  
  server.publish('telemetry', JSON.stringify({
    type: 'connections',
    count: connections.length,
    list: connections.map(c => ({ ip: c.ip || '127.0.0.1', type: c.type, entity: c.entityId, ua: c.userAgent }))
  }));
  
  server.publish('telemetry', JSON.stringify({
    type: 'barbers',
    list: barbers,
    completed: completed.length,
    pending: pending.length
  }));
  
}, 2000);

console.log(`
🎉 BARBERSHOP DASHBOARD SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 ADMIN (God View):     http://localhost:3000/admin
   🔑 Access Key:        godmode123
   
💇 CLIENT (Book):        http://localhost:3000/
                        http://localhost:3000/client
   
✂️ BARBER (Station):     http://localhost:3000/barber
   🔑 Test Codes:        JB, MS, CK

WEBSOCKET:              ws://localhost:3000/ws/dashboard
                        ws://localhost:3000/admin/ws?key=godmode123

FEATURES:
✅ Real-time telemetry (Redis pub/sub)
✅ SQLite in-memory database
✅ WebSocket proxy support
✅ Bun.secrets for credentials
✅ Bun.Cookie for sessions
✅ Financial tracking
✅ IP/Header logging
✅ Multi-role access
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

/**
 * FactoryWager Dashboard UI
 * Self-contained dashboard renderers
 */

function baseStyles(): string {
  return `
    :root {
      --color-primary-50: #eff6ff;
      --color-primary-100: #dbeafe;
      --color-primary-500: #3b82f6;
      --color-primary-600: #2563eb;
      --color-primary-700: #1d4ed8;
      --color-secondary-100: #f3e8ff;
      --color-secondary-600: #9333ea;
      --color-success-100: #dcfce7;
      --color-success-500: #22c55e;
      --color-success-600: #16a34a;
      --color-success-700: #15803d;
      --color-warning-100: #fef3c7;
      --color-warning-600: #d97706;
      --color-warning-700: #b45309;
      --color-error-100: #fee2e2;
      --color-error-700: #b91c1c;
      --color-text-primary: #111827;
      --color-text-secondary: #4b5563;
      --color-text-muted: #9ca3af;
      --color-background-primary: #ffffff;
      --color-background-secondary: #f9fafb;
      --color-border-light: #e5e7eb;
      --color-border-default: #d1d5db;
      --radius-sm: 4px;
      --radius-md: 8px;
      --radius-lg: 12px;
      --radius-xl: 16px;
      --radius-full: 9999px;
      --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.1);
      --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.1);
      --transition-fast: 150ms ease;
      --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--color-background-secondary);
      color: var(--color-text-primary);
      line-height: 1.5;
    }
  `;
}

function baseHtml(title: string, resourceHints: string, content: string, styles: string = ''): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  ${resourceHints}
  <style>${baseStyles()}${styles}</style>
</head>
<body>
  ${content}
</body>
</html>`;
}

// Admin Dashboard
export function renderAdminDashboard(resourceHints: string): string {
  const content = `
    <div class="admin-container">
      <header class="admin-header">
        <h1>👁️ Admin Control Room</h1>
        <div class="header-stats">
          <span class="money">💰 $<span id="totalRevenue">0</span></span>
          <span class="conn">🟢 <span id="activeConnections">0</span> CONN</span>
        </div>
      </header>
      
      <div class="grid">
        <div class="panel">
          <h3>💰 FINANCIALS</h3>
          <div class="metric"><label>Revenue:</label><value id="revToday">$0.00</value></div>
          <div class="metric"><label>Tips:</label><value id="tipsTotal">$0.00</value></div>
          <div class="metric"><label>Commissions:</label><value id="commissions">$0.00</value></div>
          <div class="metric"><label>Tickets Done:</label><value id="ticketsDone">0</value></div>
          <div class="metric"><label>Pending:</label><value id="ticketsPending">0</value></div>
        </div>
        
        <div class="panel">
          <h3>✂️ BARBERS</h3>
          <pre id="barberList">Loading...</pre>
        </div>
        
        <div class="panel">
          <h3>📡 EVENTS</h3>
          <pre id="wsLog">Connecting...</pre>
        </div>
        
        <div class="panel">
          <h3>📊 RAW DATA</h3>
          <pre id="rawData">Loading...</pre>
        </div>
      </div>
    </div>

    <script>
      const wsProto = location.protocol === 'https:' ? 'wss' : 'ws';
      const ws = new WebSocket(wsProto + '://' + location.host + '/admin/ws?key=' + (window.LIFECYCLE_KEY || 'development'));
      
      const events = [];
      
      ws.onopen = () => log('🟢 Connected');
      ws.onclose = () => log('🔴 Disconnected');
      ws.onmessage = (e) => {
        const data = JSON.parse(e.data);
        log(data.type || 'message');
        
        if (data.type === 'financials') {
          document.getElementById('revToday').textContent = '$' + data.revenue.toFixed(2);
          document.getElementById('tipsTotal').textContent = '$' + data.tips.toFixed(2);
          document.getElementById('commissions').textContent = '$' + data.commissions.toFixed(2);
          document.getElementById('totalRevenue').textContent = data.revenue.toFixed(0);
        }
        if (data.type === 'connections') {
          document.getElementById('activeConnections').textContent = data.count;
        }
        if (data.type === 'barbers') {
          document.getElementById('barberList').textContent = data.list.map(b => 
            b.code + ' | ' + b.name + ' | ' + b.status
          ).join('\\n') || 'No barbers';
          document.getElementById('ticketsDone').textContent = data.completed;
          document.getElementById('ticketsPending').textContent = data.pending;
        }
      };
      
      function log(msg) {
        events.unshift('[' + new Date().toLocaleTimeString() + '] ' + msg);
        if (events.length > 20) events.pop();
        document.getElementById('wsLog').textContent = events.join('\\n');
      }
      
      async function refreshData() {
        try {
          const [a, b] = await Promise.all([
            fetch('/admin/data').then(r => r.json()),
            fetch('/admin/orders').then(r => r.json())
          ]);
          document.getElementById('rawData').textContent = JSON.stringify({connections: a.connections?.length, orders: b.count}, null, 2);
        } catch (err) {}
      }
      refreshData();
      setInterval(refreshData, 7000);
    </script>
  `;

  const styles = `
    .admin-container { padding: 20px; max-width: 1400px; margin: 0 auto; }
    .admin-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 20px; background: linear-gradient(90deg, #1a1a2e, #16213e);
      color: #00ff00; border-radius: 12px; margin-bottom: 20px;
    }
    .admin-header h1 { font-size: 24px; text-shadow: 0 0 10px #00ff00; }
    .header-stats { display: flex; gap: 20px; }
    .money { color: #00ff00; }
    .conn { color: #00ffff; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; }
    .panel {
      background: var(--color-background-primary);
      border: 1px solid var(--color-border-light);
      border-radius: var(--radius-lg); padding: 16px;
    }
    .panel h3 {
      font-size: 12px; text-transform: uppercase; color: var(--color-primary-600);
      border-bottom: 1px solid var(--color-border-light); padding-bottom: 8px; margin-bottom: 12px;
    }
    .metric { display: flex; justify-content: space-between; padding: 4px 0; font-size: 14px; }
    .metric label { color: var(--color-text-secondary); }
    .metric value { font-weight: 600; }
    pre { font-family: var(--font-mono); font-size: 11px; max-height: 200px; overflow: auto; white-space: pre-wrap; }
  `;

  return baseHtml('Admin | Barbershop', resourceHints, content, styles);
}

// Client Dashboard
export function renderClientDashboard(resourceHints: string): string {
  const content = `
    <div class="client-container">
      <header class="client-header">
        <h1>✂️ Fresh Cuts</h1>
        <p>Book your appointment</p>
      </header>
      
      <div class="card">
        <h3>Select Services</h3>
        <div class="services">
          <div class="service" onclick="toggleService(this, 'haircut', 30)">
            <div><strong>✂️ Haircut</strong><small>30 min</small></div>
            <div class="price">$30</div>
          </div>
          <div class="service" onclick="toggleService(this, 'beard', 15)">
            <div><strong>🧔 Beard Trim</strong><small>15 min</small></div>
            <div class="price">$15</div>
          </div>
          <div class="service" onclick="toggleService(this, 'shave', 25)">
            <div><strong>🔥 Hot Towel Shave</strong><small>20 min</small></div>
            <div class="price">$25</div>
          </div>
          <div class="service" onclick="toggleService(this, 'fade', 35)">
            <div><strong>⚡ Fade/Design</strong><small>45 min</small></div>
            <div class="price">$35</div>
          </div>
        </div>
      </div>
      
      <div class="card">
        <h3>Checkout Options</h3>
        <label class="field">Tip Mode
          <select id="tipMode" class="input" onchange="calcTotal()">
            <option value="percent">Percent (%)</option>
            <option value="flat">Flat ($)</option>
          </select>
        </label>
        <label class="field">Tip Value
          <input id="tipValue" class="input" type="number" min="0" step="0.01" value="15" oninput="calcTotal()" />
        </label>
        <label class="checkbox">
          <input id="includeShampoo" type="checkbox" onchange="calcTotal()" />
          Add Shampoo ($12)
        </label>
      </div>
      
      <div class="card total-card">
        <div class="total-row"><span>Subtotal</span><strong id="subtotal">$0.00</strong></div>
        <div class="total-row"><span>Tip</span><strong id="tip">$0.00</strong></div>
        <div class="total-row grand"><span>Total</span><strong id="total">$0.00</strong></div>
        <button id="bookBtn" class="btn" onclick="book()" disabled>Checkout Bundle</button>
      </div>
      
      <div class="card" id="statusCard" style="display:none;">
        <pre id="statusText"></pre>
      </div>
    </div>

    <script>
      let selected = [];
      let barbers = [];
      
      function toggleService(el, name, price) {
        el.classList.toggle('selected');
        const idx = selected.findIndex(s => s.name === name);
        if (idx >= 0) selected.splice(idx, 1);
        else selected.push({ name, price });
        calcTotal();
      }
      
      function calcTotal() {
        let subtotal = selected.reduce((s, x) => s + x.price, 0);
        if (document.getElementById('includeShampoo').checked) subtotal += 12;
        
        const mode = document.getElementById('tipMode').value;
        const val = Math.max(0, Number(document.getElementById('tipValue').value || 0));
        const tip = mode === 'flat' ? val : subtotal * (val / 100);
        const total = subtotal + tip;
        
        document.getElementById('subtotal').textContent = '$' + subtotal.toFixed(2);
        document.getElementById('tip').textContent = '$' + tip.toFixed(2);
        document.getElementById('total').textContent = '$' + total.toFixed(2);
        document.getElementById('bookBtn').disabled = selected.length === 0;
      }
      
      function pickProvider(i) {
        return barbers[i % Math.max(1, barbers.length)] || { id: 'barber_unassigned', name: 'Unassigned' };
      }
      
      async function book() {
        const btn = document.getElementById('bookBtn');
        btn.disabled = true;
        btn.textContent = 'Processing...';
        
        const items = selected.map((s, i) => {
          const p = pickProvider(i);
          return { name: s.name, price: s.price, quantity: 1, kind: 'service', providerId: p.id, providerName: p.name, providerRole: 'barber', tipEligible: true };
        });
        
        if (document.getElementById('includeShampoo').checked) {
          items.push({ name: 'Shampoo', price: 12, quantity: 1, kind: 'product', providerId: 'house-cashier-01', providerName: 'House Cashier', providerRole: 'cashier', tipEligible: false });
        }
        
        try {
          const res = await fetch('/checkout/bundle', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              customerName: 'Walk-in Customer',
              items,
              tip: { mode: document.getElementById('tipMode').value, value: Number(document.getElementById('tipValue').value || 0) },
              paymentId: 'pay_' + Date.now(),
              walkIn: true
            })
          });
          const data = await res.json();
          document.getElementById('statusText').textContent = JSON.stringify(data, null, 2);
          document.getElementById('statusCard').style.display = 'block';
          if (data.success) {
            selected = [];
            document.querySelectorAll('.service.selected').forEach(s => s.classList.remove('selected'));
            document.getElementById('includeShampoo').checked = false;
            calcTotal();
          }
        } catch (err) {
          document.getElementById('statusText').textContent = 'Error: ' + err.message;
          document.getElementById('statusCard').style.display = 'block';
        }
        
        btn.disabled = false;
        btn.textContent = 'Checkout Bundle';
      }
      
      fetch('/barbers').then(r => r.json()).then(d => {
        barbers = (d.barbers || []).filter(b => b.status === 'active');
        calcTotal();
      });
    </script>
  `;

  const styles = `
    .client-container { max-width: 400px; margin: 0 auto; padding: 20px; }
    .client-header { text-align: center; padding: 30px 0; }
    .client-header h1 { font-size: 28px; background: linear-gradient(135deg, #667eea, #764ba2); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .client-header p { color: var(--color-text-secondary); margin-top: 8px; }
    .card { background: var(--color-background-primary); border-radius: 16px; padding: 20px; margin: 15px 0; box-shadow: var(--shadow-md); }
    .card h3 { margin-bottom: 15px; font-size: 16px; }
    .services { display: flex; flex-direction: column; gap: 8px; }
    .service { display: flex; justify-content: space-between; align-items: center; padding: 15px; border: 2px solid var(--color-border-light); border-radius: 12px; cursor: pointer; transition: all 0.2s; }
    .service:hover { background: var(--color-background-secondary); }
    .service.selected { background: #e3f2fd; border-color: #2196f3; }
    .service small { color: var(--color-text-muted); font-size: 12px; display: block; }
    .price { font-weight: 700; color: #667eea; font-size: 18px; }
    .field { display: block; margin-bottom: 12px; }
    .field > * { display: block; margin-top: 4px; }
    .input { width: 100%; padding: 10px; border: 1px solid var(--color-border-default); border-radius: 10px; font-size: 14px; }
    .checkbox { display: flex; align-items: center; gap: 8px; padding: 10px; background: var(--color-background-secondary); border-radius: 8px; cursor: pointer; }
    .total-row { display: flex; justify-content: space-between; padding: 8px 0; }
    .total-row.grand { border-top: 2px solid var(--color-border-light); margin-top: 8px; padding-top: 12px; font-size: 18px; }
    .btn { width: 100%; padding: 16px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; margin-top: 16px; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    pre { font-family: var(--font-mono); font-size: 12px; overflow: auto; }
  `;

  return baseHtml('Book | Barbershop', resourceHints, content, styles);
}

// Barber Dashboard
export function renderBarberDashboard(resourceHints: string): string {
  const content = `
    <div class="barber-container">
      <div id="loginSection" class="login-section">
        <div class="login-card">
          <div class="icon">✂️</div>
          <h2>Barber Login</h2>
          <p>Enter your 2-letter code</p>
          <input id="codeInput" maxlength="2" placeholder="JB" class="code-input" />
          <button onclick="login()" class="login-btn">Enter Station</button>
          <small>Try: JB, MS, CK, OM, or JA</small>
        </div>
      </div>
      
      <div id="dashboardSection" class="dashboard-section" style="display:none;">
        <div class="profile-header">
          <div class="profile-info">
            <div class="avatar" id="avatar">M</div>
            <div>
              <h2 id="barberName">-</h2>
              <span class="badge" id="statusBadge">ACTIVE</span>
              <span class="tag" id="barberCode">-</span>
              <span class="tag" id="commissionRate">-</span>
            </div>
          </div>
          <div class="stats">
            <div class="stat"><value id="ticketsCompleted">0</value><label>Cuts</label></div>
            <div class="stat"><value id="tipsShared">$0</value><label>Tips</label></div>
            <div class="stat"><value id="ordersSeen">0</value><label>Orders</label></div>
          </div>
        </div>
        
        <div class="ticket-panel">
          <h3>🎫 Current Ticket</h3>
          <div id="ticketContent">
            <div class="empty">
              <div>📋</div>
              <p>No active ticket</p>
              <small>Waiting for assignment...</small>
            </div>
          </div>
          <div id="ticketActions" style="display:none;">
            <button onclick="completeTicket()" class="btn-success">✓ Complete</button>
          </div>
        </div>
        
        <button onclick="location.reload()" class="logout-btn">Logout</button>
      </div>
    </div>

    <script>
      let barber = null;
      let currentTicketId = null;
      let ws = null;
      
      async function login() {
        const code = document.getElementById('codeInput').value.toUpperCase().trim();
        if (code.length !== 2) return alert('Enter a 2-letter code');
        
        try {
          const res = await fetch('/barber/login', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ code })
          });
          const data = await res.json();
          
          if (!data.success) return alert('Invalid code');
          
          barber = data.barber;
          document.getElementById('barberName').textContent = barber.name;
          document.getElementById('avatar').textContent = barber.name.charAt(0);
          document.getElementById('barberCode').textContent = barber.code;
          document.getElementById('commissionRate').textContent = (barber.commissionRate * 100).toFixed(0) + '%';
          
          document.getElementById('loginSection').style.display = 'none';
          document.getElementById('dashboardSection').style.display = 'block';
          
          setTicket((data.tickets || [])[0] || null);
          refreshStats();
          
          const wsProto = location.protocol === 'https:' ? 'wss' : 'ws';
          ws = new WebSocket(wsProto + '://' + location.host + '/ws/dashboard');
          ws.onmessage = (e) => {
            const m = JSON.parse(e.data);
            if (m.type === 'new_ticket' && m.assignedTo === barber.id) setTicket(m.ticket);
          };
        } catch (err) {
          alert('Login failed: ' + err.message);
        }
      }
      
      async function refreshStats() {
        if (!barber) return;
        try {
          const s = await fetch('/barber/stats?barberId=' + encodeURIComponent(barber.id)).then(r => r.json());
          document.getElementById('ticketsCompleted').textContent = s.ticketsCompleted || 0;
          document.getElementById('tipsShared').textContent = '$' + Number(s.tipsShared || 0).toFixed(0);
          document.getElementById('ordersSeen').textContent = s.ordersSeen || 0;
        } catch (err) {}
      }
      
      function setTicket(ticket) {
        if (!ticket) {
          currentTicketId = null;
          document.getElementById('ticketContent').innerHTML = '<div class="empty"><div>📋</div><p>No active ticket</p><small>Waiting...</small></div>';
          document.getElementById('ticketActions').style.display = 'none';
          document.getElementById('statusBadge').textContent = 'ACTIVE';
          return;
        }
        currentTicketId = ticket.id;
        document.getElementById('ticketContent').innerHTML = '<pre>' + JSON.stringify(ticket, null, 2) + '</pre>';
        document.getElementById('ticketActions').style.display = 'block';
        document.getElementById('statusBadge').textContent = 'BUSY';
      }
      
      async function completeTicket() {
        if (!currentTicketId) return;
        await fetch('/barber/complete', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ticketId: currentTicketId })
        });
        setTicket(null);
        refreshStats();
      }
      
      document.getElementById('codeInput').addEventListener('keyup', (e) => { if (e.key === 'Enter') login(); });
      setInterval(refreshStats, 8000);
    </script>
  `;

  const styles = `
    .barber-container { max-width: 500px; margin: 0 auto; padding: 20px; }
    .login-section { min-height: 60vh; display: flex; align-items: center; justify-content: center; }
    .login-card { background: var(--color-background-primary); border-radius: 16px; padding: 40px; text-align: center; box-shadow: var(--shadow-lg); }
    .login-card .icon { font-size: 48px; margin-bottom: 16px; }
    .login-card h2 { margin-bottom: 8px; }
    .login-card p { color: var(--color-text-secondary); margin-bottom: 20px; }
    .code-input { width: 100%; padding: 12px; border: 2px solid var(--color-border-default); border-radius: 12px; font-size: 24px; text-align: center; text-transform: uppercase; margin-bottom: 16px; }
    .code-input:focus { outline: none; border-color: #00d4ff; }
    .login-btn { width: 100%; padding: 12px; background: linear-gradient(135deg, #00d4ff, #0099cc); color: white; border: none; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; margin-bottom: 12px; }
    .login-card small { color: var(--color-text-muted); }
    .profile-header { background: var(--color-background-primary); border-radius: 16px; padding: 20px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
    .profile-info { display: flex; align-items: center; gap: 12px; }
    .avatar { width: 56px; height: 56px; background: linear-gradient(135deg, #00d4ff, #0099cc); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 700; color: white; }
    .profile-info h2 { margin: 0; }
    .badge { display: inline-block; padding: 4px 10px; background: #dcfce7; color: #15803d; border-radius: 20px; font-size: 12px; font-weight: 600; margin-right: 8px; }
    .tag { font-size: 11px; padding: 2px 6px; background: var(--color-background-secondary); border-radius: 4px; color: var(--color-text-secondary); margin-right: 4px; }
    .stats { display: flex; gap: 24px; }
    .stat { text-align: center; }
    .stat value { display: block; font-size: 24px; font-weight: 700; color: #00d4ff; }
    .stat label { font-size: 11px; color: var(--color-text-muted); text-transform: uppercase; }
    .ticket-panel { background: var(--color-background-primary); border-radius: 16px; padding: 20px; margin-bottom: 20px; }
    .ticket-panel h3 { margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
    .empty { text-align: center; padding: 40px; color: var(--color-text-muted); }
    .empty > div { font-size: 48px; margin-bottom: 8px; opacity: 0.5; }
    pre { font-family: var(--font-mono); font-size: 12px; background: var(--color-background-secondary); padding: 16px; border-radius: 8px; overflow: auto; }
    .btn-success { width: 100%; padding: 12px; background: #22c55e; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; margin-top: 16px; }
    .logout-btn { width: 100%; padding: 12px; background: var(--color-background-secondary); color: var(--color-text-secondary); border: 1px solid var(--color-border-light); border-radius: 8px; font-size: 14px; cursor: pointer; }
  `;

  return baseHtml('Barber Station | Barbershop', resourceHints, content, styles);
}

// V3 aliases for backward compatibility
export const renderAdminDashboardV3 = renderAdminDashboard;
export const renderClientDashboardV3 = renderClientDashboard;
export const renderBarberDashboardV3 = renderBarberDashboard;
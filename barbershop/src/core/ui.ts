/**
 * FactoryWager Dashboard UI v3
 * Enhanced dashboards with shared header/footer components
 * Theme-aware, responsive, and accessible
 */

import {
  renderLayout,
  adminHeaderConfig,
  clientHeaderConfig,
  barberHeaderConfig,
  defaultFooterConfig,
  generateThemeCSS,
  generateLayoutCSS,
} from './ui-components';

// Admin Dashboard with new component system
export function renderAdminDashboardV3(resourceHints: string): string {
  const content = `
    <div class="dashboard-container">
      <!-- Stats Row -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">💰</div>
          <div class="stat-content">
            <div class="stat-value" id="revenue">$0.00</div>
            <div class="stat-label">Revenue</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background: var(--color-success-100); color: var(--color-success-700);">💵</div>
          <div class="stat-content">
            <div class="stat-value" id="tips" style="color: var(--color-success-600);">$0.00</div>
            <div class="stat-label">Tips</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background: var(--color-warning-100); color: var(--color-warning-700);">📊</div>
          <div class="stat-content">
            <div class="stat-value" id="commissions" style="color: var(--color-warning-600);">$0.00</div>
            <div class="stat-label">Commissions</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background: var(--color-secondary-100); color: var(--color-secondary-700);">👥</div>
          <div class="stat-content">
            <div class="stat-value" id="connections">0</div>
            <div class="stat-label">Connections</div>
          </div>
        </div>
      </div>

      <!-- Main Dashboard Grid -->
      <div class="dashboard-grid">
        <!-- Left Column -->
        <div class="dashboard-column">
          <div class="panel">
            <div class="panel-header">
              <h3>📊 Barber Status</h3>
              <span class="badge badge-success">Live</span>
            </div>
            <div class="panel-content">
              <pre id="barbers" class="data-pre">Waiting for stream...</pre>
            </div>
          </div>

          <div class="panel">
            <div class="panel-header">
              <h3>📡 Stream Events</h3>
              <button class="btn btn-sm btn-secondary" onclick="clearEvents()">Clear</button>
            </div>
            <div class="panel-content">
              <pre id="events" class="data-pre">Waiting for stream...</pre>
            </div>
          </div>
        </div>

        <!-- Right Column -->
        <div class="dashboard-column">
          <div class="panel">
            <div class="panel-header">
              <h3>📸 Admin Snapshot</h3>
              <span class="text-muted text-sm">Updates every 7s</span>
            </div>
            <div class="panel-content">
              <pre id="snapshot" class="data-pre">Loading /admin/data ...</pre>
            </div>
          </div>

          <div class="panel">
            <div class="panel-header">
              <h3>🛒 Bundled Orders</h3>
              <span class="text-muted text-sm">Real-time</span>
            </div>
            <div class="panel-content">
              <pre id="orders" class="data-pre">Loading /admin/orders ...</pre>
            </div>
          </div>
        </div>
      </div>
    </div>

    <style>
      .dashboard-container {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
      }

      .stat-card {
        background: var(--color-background-primary);
        border: 1px solid var(--color-border-light);
        border-radius: var(--radius-lg);
        padding: 1.25rem;
        display: flex;
        align-items: center;
        gap: 1rem;
        transition: transform var(--transition-fast), box-shadow var(--transition-fast);
      }

      .stat-card:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
      }

      .stat-icon {
        width: 48px;
        height: 48px;
        background: var(--color-primary-100);
        color: var(--color-primary-700);
        border-radius: var(--radius-md);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.5rem;
      }

      .stat-content {
        flex: 1;
      }

      .stat-value {
        font-size: 1.75rem;
        font-weight: 700;
        color: var(--color-primary-600);
        line-height: 1.2;
      }

      .stat-label {
        font-size: 0.875rem;
        color: var(--color-text-secondary);
        margin-top: 0.25rem;
      }

      .dashboard-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
        gap: 1.5rem;
      }

      .dashboard-column {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .panel {
        background: var(--color-background-primary);
        border: 1px solid var(--color-border-light);
        border-radius: var(--radius-lg);
        overflow: hidden;
      }

      .panel-header {
        padding: 1rem 1.25rem;
        border-bottom: 1px solid var(--color-border-light);
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .panel-header h3 {
        font-size: 1rem;
        font-weight: 600;
        margin: 0;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .panel-content {
        padding: 1.25rem;
      }

      .data-pre {
        margin: 0;
        font-family: var(--font-mono);
        font-size: 0.75rem;
        line-height: 1.6;
        color: var(--color-text-secondary);
        max-height: 280px;
        overflow: auto;
        white-space: pre-wrap;
        word-break: break-word;
      }

      .badge {
        display: inline-flex;
        align-items: center;
        padding: 0.25rem 0.625rem;
        border-radius: var(--radius-full);
        font-size: 0.75rem;
        font-weight: 500;
      }

      .badge-success {
        background: var(--color-success-100);
        color: var(--color-success-700);
      }

      .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 0.625rem 1rem;
        border: none;
        border-radius: var(--radius-md);
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all var(--transition-fast);
      }

      .btn-sm {
        padding: 0.375rem 0.75rem;
        font-size: 0.75rem;
      }

      .btn-secondary {
        background: var(--color-background-secondary);
        color: var(--color-text-secondary);
        border: 1px solid var(--color-border-light);
      }

      .btn-secondary:hover {
        background: var(--color-background-tertiary);
        color: var(--color-text-primary);
      }

      .text-muted {
        color: var(--color-text-muted);
      }

      .text-sm {
        font-size: 0.75rem;
      }

      @media (max-width: 768px) {
        .dashboard-grid {
          grid-template-columns: 1fr;
        }
        .stats-grid {
          grid-template-columns: repeat(2, 1fr);
        }
      }
    </style>

    <script>
      const wsProto = location.protocol === 'https:' ? 'wss' : 'ws';
      const ws = new WebSocket(wsProto + '://' + location.host + '/admin/ws?key=' + (window.LIFECYCLE_KEY || 'development'));
      const events = [];
      
      const pushEvent = (evt) => {
        events.unshift('[' + new Date().toLocaleTimeString() + '] ' + evt);
        if (events.length > 30) events.pop();
        document.getElementById('events').textContent = events.join('\\n');
      };

      function clearEvents() {
        events.length = 0;
        document.getElementById('events').textContent = 'Events cleared';
      }

      ws.onopen = () => pushEvent('Connected to admin stream');
      ws.onclose = () => pushEvent('Disconnected from admin stream');
      ws.onmessage = (e) => {
        const data = JSON.parse(e.data);
        pushEvent(data.type || 'message');
        if (data.type === 'financials') {
          document.getElementById('revenue').textContent = '$' + data.revenue.toFixed(2);
          document.getElementById('tips').textContent = '$' + data.tips.toFixed(2);
          document.getElementById('commissions').textContent = '$' + data.commissions.toFixed(2);
        }
        if (data.type === 'connections') {
          document.getElementById('connections').textContent = String(data.count);
        }
        if (data.type === 'barbers') {
          const lines = data.list.map((b) => b.code + ' | ' + b.name + ' | ' + b.status);
          document.getElementById('barbers').textContent = lines.join('\\n') || 'No barbers online';
        }
      };

      async function refreshAdminData() {
        try {
          const [a, b] = await Promise.all([
            fetch('/admin/data').then(r => r.json()),
            fetch('/admin/orders').then(r => r.json())
          ]);
          document.getElementById('snapshot').textContent = JSON.stringify(a, null, 2);
          document.getElementById('orders').textContent = JSON.stringify(b, null, 2);
        } catch (err) {
          console.error('Failed to refresh admin data:', err);
        }
      }
      
      refreshAdminData();
      setInterval(refreshAdminData, 7000);
    </script>
  `;

  return renderLayout({
    title: 'Admin Control Room | FactoryWager',
    header: adminHeaderConfig,
    footer: defaultFooterConfig,
    content,
    resourceHints,
  });
}

// Client Dashboard with new component system
export function renderClientDashboardV3(resourceHints: string): string {
  const content = `
    <div class="client-dashboard">
      <!-- Hero Section -->
      <div class="hero-section">
        <h1>Welcome to Your Barbershop</h1>
        <p class="hero-subtitle">Book appointments, manage your history, and earn rewards</p>
      </div>

      <!-- Services Selection -->
      <div class="services-section">
        <h2>Select Services</h2>
        <div class="services-grid" id="services">
          <!-- Services rendered by JS -->
        </div>
      </div>

      <!-- Checkout Panel -->
      <div class="checkout-panel">
        <div class="checkout-header">
          <h3>Order Summary</h3>
          <span class="item-count" id="itemCount">0 items</span>
        </div>

        <div class="tip-section">
          <label class="tip-label">Tip Amount</label>
          <div class="tip-controls">
            <select id="tipMode" class="tip-select">
              <option value="percent">Percentage</option>
              <option value="flat">Flat Amount</option>
            </select>
            <input id="tipValue" type="number" min="0" step="0.01" value="15" class="tip-input" />
            <span id="tipUnit" class="tip-unit">%</span>
          </div>
        </div>

        <label class="addon-label">
          <input id="includeShampoo" type="checkbox" />
          <span>Add premium shampoo (+$12)</span>
        </label>

        <div class="summary-rows">
          <div class="summary-row">
            <span>Subtotal</span>
            <strong id="subtotal">$0.00</strong>
          </div>
          <div class="summary-row">
            <span>Tip</span>
            <strong id="tip">$0.00</strong>
          </div>
          <div class="summary-row total">
            <span>Total</span>
            <strong id="total">$0.00</strong>
          </div>
        </div>

        <button class="checkout-btn" id="checkoutBtn" disabled>
          <span>Complete Booking</span>
          <span class="checkout-arrow">→</span>
        </button>

        <div class="response-section" id="responseSection" style="display: none;">
          <h4>Confirmation</h4>
          <pre id="out"></pre>
        </div>
      </div>
    </div>

    <style>
      .client-dashboard {
        max-width: 900px;
        margin: 0 auto;
      }

      .hero-section {
        text-align: center;
        padding: 2rem 0 3rem;
      }

      .hero-section h1 {
        font-size: 2.5rem;
        font-weight: 700;
        margin: 0 0 0.5rem;
        background: linear-gradient(135deg, var(--color-primary-600), var(--color-secondary-600));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }

      .hero-subtitle {
        font-size: 1.125rem;
        color: var(--color-text-secondary);
        margin: 0;
      }

      .services-section {
        margin-bottom: 2rem;
      }

      .services-section h2 {
        font-size: 1.25rem;
        margin-bottom: 1rem;
      }

      .services-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1rem;
      }

      .service-card {
        background: var(--color-background-primary);
        border: 2px solid var(--color-border-light);
        border-radius: var(--radius-lg);
        padding: 1.25rem;
        cursor: pointer;
        transition: all var(--transition-fast);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .service-card:hover {
        border-color: var(--color-primary-300);
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
      }

      .service-card.selected {
        border-color: var(--color-primary-500);
        background: var(--color-primary-50);
      }

      .service-info h4 {
        margin: 0 0 0.25rem;
        font-size: 1rem;
      }

      .service-meta {
        font-size: 0.875rem;
        color: var(--color-text-muted);
      }

      .service-price {
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--color-primary-600);
      }

      .checkout-panel {
        background: var(--color-background-primary);
        border: 1px solid var(--color-border-light);
        border-radius: var(--radius-lg);
        padding: 1.5rem;
      }

      .checkout-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.25rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid var(--color-border-light);
      }

      .checkout-header h3 {
        margin: 0;
        font-size: 1.125rem;
      }

      .item-count {
        font-size: 0.875rem;
        color: var(--color-text-muted);
      }

      .tip-section {
        margin-bottom: 1rem;
      }

      .tip-label {
        display: block;
        font-size: 0.875rem;
        font-weight: 500;
        margin-bottom: 0.5rem;
      }

      .tip-controls {
        display: flex;
        gap: 0.5rem;
        align-items: center;
      }

      .tip-select, .tip-input {
        padding: 0.5rem 0.75rem;
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-md);
        font-size: 0.875rem;
        background: var(--color-background-primary);
      }

      .tip-select {
        width: 120px;
      }

      .tip-input {
        width: 80px;
        text-align: right;
      }

      .tip-unit {
        font-size: 0.875rem;
        color: var(--color-text-muted);
      }

      .addon-label {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem;
        background: var(--color-background-secondary);
        border-radius: var(--radius-md);
        margin-bottom: 1.25rem;
        cursor: pointer;
        font-size: 0.875rem;
      }

      .addon-label input {
        width: 18px;
        height: 18px;
        accent-color: var(--color-primary-500);
      }

      .summary-rows {
        margin-bottom: 1.25rem;
      }

      .summary-row {
        display: flex;
        justify-content: space-between;
        padding: 0.5rem 0;
        font-size: 0.875rem;
      }

      .summary-row.total {
        border-top: 2px solid var(--color-border-light);
        margin-top: 0.5rem;
        padding-top: 1rem;
        font-size: 1.125rem;
        font-weight: 600;
      }

      .checkout-btn {
        width: 100%;
        padding: 1rem 1.5rem;
        background: linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600));
        color: white;
        border: none;
        border-radius: var(--radius-md);
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all var(--transition-fast);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .checkout-btn:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: var(--shadow-lg);
      }

      .checkout-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .checkout-arrow {
        transition: transform var(--transition-fast);
      }

      .checkout-btn:hover:not(:disabled) .checkout-arrow {
        transform: translateX(4px);
      }

      .response-section {
        margin-top: 1.5rem;
        padding-top: 1.5rem;
        border-top: 1px solid var(--color-border-light);
      }

      .response-section h4 {
        margin: 0 0 0.75rem;
        font-size: 0.875rem;
      }

      .response-section pre {
        margin: 0;
        padding: 1rem;
        background: var(--color-background-secondary);
        border-radius: var(--radius-md);
        font-family: var(--font-mono);
        font-size: 0.75rem;
        overflow: auto;
      }

      @media (max-width: 640px) {
        .hero-section h1 {
          font-size: 1.75rem;
        }
        .services-grid {
          grid-template-columns: 1fr;
        }
      }
    </style>

    <script>
      const catalog = [
        { name: 'Classic Haircut', price: 30, duration: 30 },
        { name: 'Beard Trim', price: 15, duration: 15 },
        { name: 'Hot Towel Shave', price: 25, duration: 20 },
        { name: 'Full Service', price: 45, duration: 50 },
      ];
      
      let barbers = [];
      let selected = [];
      
      const servicesEl = document.getElementById('services');
      const tipModeEl = document.getElementById('tipMode');
      const tipValueEl = document.getElementById('tipValue');
      const tipUnitEl = document.getElementById('tipUnit');
      const shampooEl = document.getElementById('includeShampoo');
      const checkoutBtn = document.getElementById('checkoutBtn');

      function renderServices() {
        servicesEl.innerHTML = catalog.map((s) => {
          const isSelected = selected.find((x) => x.name === s.name);
          return \`
            <div class="service-card \${isSelected ? 'selected' : ''}" data-name="\${s.name}">
              <div class="service-info">
                <h4>\${s.name}</h4>
                <div class="service-meta">\${s.duration} minutes</div>
              </div>
              <div class="service-price">$\${s.price}</div>
            </div>
          \`;
        }).join('');

        servicesEl.querySelectorAll('.service-card').forEach((el) => {
          el.onclick = () => {
            const name = el.dataset.name;
            const item = catalog.find((c) => c.name === name);
            const idx = selected.findIndex((s) => s.name === name);
            if (idx >= 0) selected.splice(idx, 1);
            else selected.push(item);
            renderServices();
            computeTotals();
          };
        });

        checkoutBtn.disabled = selected.length === 0;
        document.getElementById('itemCount').textContent = selected.length + ' item' + (selected.length !== 1 ? 's' : '');
      }

      function computeTotals() {
        let subtotal = selected.reduce((s, x) => s + x.price, 0);
        if (shampooEl.checked) subtotal += 12;
        
        const mode = tipModeEl.value;
        const value = Math.max(0, Number(tipValueEl.value || 0));
        const tip = mode === 'flat' ? value : subtotal * (value / 100);
        const total = subtotal + tip;
        
        document.getElementById('subtotal').textContent = '$' + subtotal.toFixed(2);
        document.getElementById('tip').textContent = '$' + tip.toFixed(2);
        document.getElementById('total').textContent = '$' + total.toFixed(2);
        tipUnitEl.textContent = mode === 'percent' ? '%' : '$';
      }

      function pickProvider(index) {
        return barbers[index % Math.max(1, barbers.length)] || { id: 'barber_unassigned', name: 'Unassigned' };
      }

      tipModeEl.addEventListener('change', computeTotals);
      tipValueEl.addEventListener('input', computeTotals);
      shampooEl.addEventListener('change', computeTotals);

      checkoutBtn.onclick = async () => {
        const items = selected.map((s, i) => {
          const p = pickProvider(i);
          return { 
            name: s.name, 
            price: s.price, 
            quantity: 1, 
            kind: 'service', 
            providerId: p.id, 
            providerName: p.name, 
            providerRole: 'barber', 
            tipEligible: true 
          };
        });
        
        if (shampooEl.checked) {
          items.push({ 
            name: 'Premium Shampoo', 
            price: 12, 
            quantity: 1, 
            kind: 'product', 
            providerId: 'house-cashier-01', 
            providerName: 'House Cashier', 
            providerRole: 'cashier', 
            tipEligible: false 
          });
        }

        checkoutBtn.disabled = true;
        checkoutBtn.innerHTML = '<span>Processing...</span>';
        
        try {
          const res = await fetch('/checkout/bundle', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              customerName: 'Walk-in Customer',
              items,
              tip: { mode: tipModeEl.value, value: Number(tipValueEl.value || 0) },
              paymentId: 'pay_' + Date.now(),
              walkIn: true
            })
          });
          const json = await res.json();
          document.getElementById('out').textContent = JSON.stringify(json, null, 2);
          document.getElementById('responseSection').style.display = 'block';
        } catch (err) {
          document.getElementById('out').textContent = 'Error: ' + err.message;
          document.getElementById('responseSection').style.display = 'block';
        } finally {
          checkoutBtn.disabled = false;
          checkoutBtn.innerHTML = '<span>Complete Booking</span><span class="checkout-arrow">→</span>';
        }
      };

      async function init() {
        try {
          const b = await fetch('/barbers').then((r) => r.json());
          barbers = (b.barbers || []).filter((x) => x.status === 'active');
        } catch (err) {
          console.error('Failed to load barbers:', err);
        }
        renderServices();
        computeTotals();
      }

      init();
    </script>
  `;

  return renderLayout({
    title: 'Book Appointment | FactoryWager',
    header: clientHeaderConfig,
    footer: defaultFooterConfig,
    content,
    resourceHints,
  });
}

// Barber Dashboard with new component system
export function renderBarberDashboardV3(resourceHints: string): string {
  const content = `
    <div class="barber-dashboard">
      <!-- Login Section -->
      <div id="loginSection" class="login-section">
        <div class="login-card">
          <div class="login-icon">✂️</div>
          <h2>Barber Login</h2>
          <p>Enter your 2-letter code to access your station</p>
          <div class="login-form">
            <input id="codeInput" maxlength="2" placeholder="JB" class="code-input" />
            <button id="loginBtn" class="login-btn">Enter Station</button>
          </div>
          <div class="login-hint">Try: JB, MS, CK, OM, or JA</div>
        </div>
      </div>

      <!-- Dashboard Section (hidden initially) -->
      <div id="dashboardSection" class="dashboard-section" style="display: none;">
        <!-- Profile Header -->
        <div class="profile-header">
          <div class="profile-info">
            <div class="profile-avatar" id="profileAvatar">M</div>
            <div class="profile-details">
              <h2 id="barberName">-</h2>
              <div class="profile-meta">
                <span class="badge badge-primary" id="statusBadge">ACTIVE</span>
                <span class="code-tag" id="barberCode">-</span>
                <span class="commission-tag" id="commissionRate">-</span>
              </div>
            </div>
          </div>
          <div class="profile-stats">
            <div class="mini-stat">
              <div class="mini-stat-value" id="ticketsCompleted">0</div>
              <div class="mini-stat-label">Cuts Today</div>
            </div>
            <div class="mini-stat">
              <div class="mini-stat-value" id="tipsShared">$0</div>
              <div class="mini-stat-label">Tips</div>
            </div>
            <div class="mini-stat">
              <div class="mini-stat-value" id="ordersSeen">0</div>
              <div class="mini-stat-label">Orders</div>
            </div>
          </div>
        </div>

        <!-- Current Ticket Panel -->
        <div class="ticket-panel" id="ticketPanel">
          <div class="panel-header">
            <h3>🎫 Current Ticket</h3>
            <span class="live-indicator">
              <span class="live-dot"></span>
              Live
            </span>
          </div>
          <div class="ticket-content" id="ticketContent">
            <div class="empty-state">
              <div class="empty-icon">📋</div>
              <p>No active ticket</p>
              <p class="empty-hint">Waiting for next assignment...</p>
            </div>
          </div>
          <div class="ticket-actions" id="ticketActions" style="display: none;">
            <button id="completeBtn" class="btn btn-success">
              <span>✓</span>
              <span>Complete Service</span>
            </button>
            <button id="noShowBtn" class="btn btn-error">
              <span>✕</span>
              <span>No Show</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <style>
      .barber-dashboard {
        max-width: 720px;
        margin: 0 auto;
      }

      .login-section {
        min-height: 60vh;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .login-card {
        background: var(--color-background-primary);
        border: 1px solid var(--color-border-light);
        border-radius: var(--radius-xl);
        padding: 3rem;
        text-align: center;
        max-width: 400px;
        width: 100%;
      }

      .login-icon {
        font-size: 3rem;
        margin-bottom: 1rem;
      }

      .login-card h2 {
        margin: 0 0 0.5rem;
        font-size: 1.5rem;
      }

      .login-card p {
        color: var(--color-text-secondary);
        margin: 0 0 1.5rem;
      }

      .login-form {
        display: flex;
        gap: 0.75rem;
        margin-bottom: 1rem;
      }

      .code-input {
        flex: 1;
        padding: 0.875rem 1rem;
        border: 2px solid var(--color-border-default);
        border-radius: var(--radius-md);
        font-size: 1.25rem;
        font-weight: 600;
        text-align: center;
        text-transform: uppercase;
        background: var(--color-background-primary);
        color: var(--color-text-primary);
        transition: border-color var(--transition-fast);
      }

      .code-input:focus {
        outline: none;
        border-color: var(--color-primary-500);
      }

      .login-btn {
        padding: 0.875rem 1.5rem;
        background: linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600));
        color: white;
        border: none;
        border-radius: var(--radius-md);
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: transform var(--transition-fast), box-shadow var(--transition-fast);
      }

      .login-btn:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
      }

      .login-hint {
        font-size: 0.75rem;
        color: var(--color-text-muted);
      }

      .dashboard-section {
        animation: fadeIn 0.3s ease;
      }

      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .profile-header {
        background: var(--color-background-primary);
        border: 1px solid var(--color-border-light);
        border-radius: var(--radius-lg);
        padding: 1.5rem;
        margin-bottom: 1.5rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1.5rem;
        flex-wrap: wrap;
      }

      .profile-info {
        display: flex;
        align-items: center;
        gap: 1rem;
      }

      .profile-avatar {
        width: 56px;
        height: 56px;
        background: linear-gradient(135deg, var(--color-primary-500), var(--color-secondary-500));
        border-radius: var(--radius-full);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.5rem;
        font-weight: 700;
        color: white;
      }

      .profile-details h2 {
        margin: 0 0 0.25rem;
        font-size: 1.25rem;
      }

      .profile-meta {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-wrap: wrap;
      }

      .badge {
        display: inline-flex;
        align-items: center;
        padding: 0.25rem 0.625rem;
        border-radius: var(--radius-full);
        font-size: 0.75rem;
        font-weight: 500;
      }

      .badge-primary {
        background: var(--color-primary-100);
        color: var(--color-primary-700);
      }

      .code-tag, .commission-tag {
        font-size: 0.75rem;
        padding: 0.25rem 0.5rem;
        background: var(--color-background-secondary);
        border-radius: var(--radius-sm);
        color: var(--color-text-secondary);
        font-family: var(--font-mono);
      }

      .profile-stats {
        display: flex;
        gap: 1.5rem;
      }

      .mini-stat {
        text-align: center;
      }

      .mini-stat-value {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--color-primary-600);
      }

      .mini-stat-label {
        font-size: 0.75rem;
        color: var(--color-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .ticket-panel {
        background: var(--color-background-primary);
        border: 1px solid var(--color-border-light);
        border-radius: var(--radius-lg);
        overflow: hidden;
      }

      .panel-header {
        padding: 1rem 1.25rem;
        border-bottom: 1px solid var(--color-border-light);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .panel-header h3 {
        margin: 0;
        font-size: 1rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .live-indicator {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        font-size: 0.75rem;
        color: var(--color-success-600);
        font-weight: 500;
      }

      .live-dot {
        width: 8px;
        height: 8px;
        background: var(--color-success-500);
        border-radius: var(--radius-full);
        animation: pulse 2s infinite;
      }

      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
      }

      .ticket-content {
        padding: 1.5rem;
        min-height: 200px;
      }

      .empty-state {
        text-align: center;
        padding: 2rem;
        color: var(--color-text-muted);
      }

      .empty-icon {
        font-size: 3rem;
        margin-bottom: 0.5rem;
        opacity: 0.5;
      }

      .empty-state p {
        margin: 0;
      }

      .empty-hint {
        font-size: 0.875rem;
        margin-top: 0.25rem;
      }

      .ticket-data {
        background: var(--color-background-secondary);
        border-radius: var(--radius-md);
        padding: 1rem;
        font-family: var(--font-mono);
        font-size: 0.75rem;
        overflow: auto;
        max-height: 200px;
      }

      .ticket-actions {
        display: flex;
        gap: 0.75rem;
        padding: 1rem 1.25rem;
        border-top: 1px solid var(--color-border-light);
      }

      .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 0.75rem 1.25rem;
        border: none;
        border-radius: var(--radius-md);
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        transition: all var(--transition-fast);
        flex: 1;
      }

      .btn-success {
        background: var(--color-success-500);
        color: white;
      }

      .btn-success:hover {
        background: var(--color-success-600);
      }

      .btn-error {
        background: var(--color-error-100);
        color: var(--color-error-700);
      }

      .btn-error:hover {
        background: var(--color-error-200);
      }

      @media (max-width: 640px) {
        .login-card {
          padding: 2rem;
        }
        .profile-header {
          flex-direction: column;
          text-align: center;
        }
        .profile-stats {
          width: 100%;
          justify-content: center;
        }
      }
    </style>

    <script>
      let barber = null;
      let currentTicketId = null;
      let ws = null;

      const loginSection = document.getElementById('loginSection');
      const dashboardSection = document.getElementById('dashboardSection');
      const ticketContent = document.getElementById('ticketContent');
      const ticketActions = document.getElementById('ticketActions');
      const completeBtn = document.getElementById('completeBtn');
      const noShowBtn = document.getElementById('noShowBtn');

      async function refreshStats() {
        if (!barber) return;
        try {
          const s = await fetch('/barber/stats?barberId=' + encodeURIComponent(barber.id)).then((r) => r.json());
          document.getElementById('ticketsCompleted').textContent = String(s.ticketsCompleted || 0);
          document.getElementById('tipsShared').textContent = '$' + Number(s.tipsShared || 0).toFixed(0);
          document.getElementById('ordersSeen').textContent = String(s.ordersSeen || 0);
        } catch (err) {
          console.error('Failed to refresh stats:', err);
        }
      }

      function setTicket(ticket) {
        if (!ticket) {
          currentTicketId = null;
          ticketContent.innerHTML = \`
            <div class="empty-state">
              <div class="empty-icon">📋</div>
              <p>No active ticket</p>
              <p class="empty-hint">Waiting for next assignment...</p>
            </div>
          \`;
          ticketActions.style.display = 'none';
          document.getElementById('statusBadge').textContent = 'ACTIVE';
          document.getElementById('statusBadge').className = 'badge badge-primary';
          return;
        }
        
        currentTicketId = ticket.id;
        ticketContent.innerHTML = '<pre class="ticket-data">' + JSON.stringify(ticket, null, 2) + '</pre>';
        ticketActions.style.display = 'flex';
        document.getElementById('statusBadge').textContent = 'BUSY';
        document.getElementById('statusBadge').className = 'badge';
        document.getElementById('statusBadge').style.cssText = 'background: var(--color-warning-100); color: var(--color-warning-700);';
      }

      async function login() {
        const code = document.getElementById('codeInput').value.toUpperCase().trim();
        if (code.length !== 2) return alert('Please enter a 2-letter code');
        
        try {
          const res = await fetch('/barber/login', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ code })
          });
          const data = await res.json();
          
          if (!data.success) {
            alert('Invalid code. Try: JB, MS, CK, OM, or JA');
            return;
          }
          
          barber = data.barber;
          
          // Update UI
          document.getElementById('barberName').textContent = barber.name;
          document.getElementById('profileAvatar').textContent = barber.name.charAt(0).toUpperCase();
          document.getElementById('barberCode').textContent = barber.code;
          document.getElementById('commissionRate').textContent = (barber.commissionRate * 100).toFixed(0) + '%';
          
          // Show dashboard
          loginSection.style.display = 'none';
          dashboardSection.style.display = 'block';
          
          setTicket((data.tickets || [])[0] ? data.tickets[0] : null);
          refreshStats();

          // Connect WebSocket
          const wsProto = location.protocol === 'https:' ? 'wss' : 'ws';
          ws = new WebSocket(wsProto + '://' + location.host + '/ws/dashboard');
          ws.onmessage = (e) => {
            const m = JSON.parse(e.data);
            if (m.type === 'new_ticket' && m.assignedTo === barber.id) {
              setTicket(m.ticket);
            }
          };
        } catch (err) {
          alert('Login failed: ' + err.message);
        }
      }

      async function completeTicket() {
        if (!currentTicketId) return;
        try {
          const res = await fetch('/barber/complete', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ ticketId: currentTicketId })
          });
          const data = await res.json();
          if (!data.success) throw new Error('Completion failed');
          setTicket(null);
          refreshStats();
        } catch (err) {
          alert('Error: ' + err.message);
        }
      }

      document.getElementById('loginBtn').onclick = login;
      completeBtn.onclick = completeTicket;
      noShowBtn.onclick = () => {
        if (confirm('Mark this ticket as no-show?')) {
          completeTicket();
        }
      };
      
      document.getElementById('codeInput').addEventListener('keyup', (e) => {
        if (e.key === 'Enter') login();
      });
      
      setInterval(refreshStats, 8000);
    </script>
  `;

  return renderLayout({
    title: 'Barber Station | FactoryWager',
    header: barberHeaderConfig,
    footer: defaultFooterConfig,
    content,
    resourceHints,
  });
}

// Re-export original functions for backward compatibility
export { renderAdminDashboard, renderClientDashboard, renderBarberDashboard } from './ui-v2';

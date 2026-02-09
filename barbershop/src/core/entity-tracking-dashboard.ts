/**
 * Entity Tracking Dashboard
 * ========================
 * 
 * Comprehensive analytics dashboard for tracking events by:
 * - Email (hashed, domain-level)
 * - Phone (hashed, area code-level)
 * - Payment IDs
 * - Location (city, zipcode, geocode)
 * - Customer IDs
 * - Barber IDs
 * 
 * Features:
 * - Real-time entity analytics
 * - Cross-entity relationship visualization
 * - Geographic distribution maps
 * - Time-series charts
 * - Export capabilities
 */

/**
 * Generate the entity tracking dashboard HTML page
 */
export function generateEntityTrackingDashboard(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Entity Tracking Dashboard - Analytics</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    :root {
      --primary: #00ff88;
      --secondary: #00d4ff;
      --danger: #ff3366;
      --warning: #ffaa00;
      --bg: #0a0a0f;
      --panel: #111118;
      --border: #22222a;
      --text: #e0e0e0;
    }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: 'SF Mono', Monaco, monospace;
      font-size: 14px;
      padding: 20px;
    }
    .header {
      background: linear-gradient(90deg, #0f0f16 0%, #1a1a25 100%);
      padding: 20px;
      border-bottom: 2px solid var(--primary);
      margin-bottom: 30px;
      border-radius: 8px;
    }
    .header h1 {
      color: var(--primary);
      font-size: 24px;
      margin-bottom: 10px;
    }
    .tabs {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
      border-bottom: 1px solid var(--border);
      padding-bottom: 10px;
    }
    .tab {
      padding: 10px 20px;
      background: transparent;
      border: none;
      color: var(--text);
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }
    .tab:hover {
      color: var(--primary);
    }
    .tab.active {
      color: var(--primary);
      border-bottom-color: var(--primary);
    }
    .tab-content {
      display: none;
    }
    .tab-content.active {
      display: block;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .card {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 20px;
    }
    .card h3 {
      color: var(--secondary);
      font-size: 16px;
      margin-bottom: 15px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .stat-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid var(--border);
    }
    .stat-row:last-child {
      border-bottom: none;
    }
    .stat-label {
      color: #666;
      font-size: 12px;
    }
    .stat-value {
      color: var(--primary);
      font-weight: bold;
      font-size: 16px;
    }
    .entity-list {
      max-height: 400px;
      overflow-y: auto;
    }
    .entity-item {
      background: #16161f;
      border-left: 3px solid var(--primary);
      padding: 12px;
      margin-bottom: 10px;
      border-radius: 4px;
      font-size: 12px;
    }
    .entity-item-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .entity-name {
      color: var(--text);
      font-weight: bold;
    }
    .entity-count {
      color: var(--primary);
    }
    .entity-meta {
      color: #666;
      font-size: 11px;
      margin-top: 4px;
    }
    .chart-container {
      position: relative;
      height: 300px;
      margin-top: 20px;
    }
    .search-box {
      width: 100%;
      background: #16161f;
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 10px;
      color: var(--text);
      font-family: inherit;
      margin-bottom: 20px;
    }
    .search-box:focus {
      outline: none;
      border-color: var(--primary);
    }
    .btn {
      padding: 8px 16px;
      background: var(--primary);
      color: #000;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
      font-size: 12px;
      transition: all 0.2s;
    }
    .btn:hover {
      background: #00cc6f;
      transform: translateY(-1px);
    }
    .btn-secondary {
      background: var(--secondary);
    }
    .btn-secondary:hover {
      background: #00b8e6;
    }
    .relationship-matrix {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
    }
    .relationship-card {
      background: #16161f;
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 15px;
    }
    .relationship-label {
      color: #666;
      font-size: 11px;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .relationship-value {
      color: var(--primary);
      font-size: 18px;
      font-weight: bold;
    }
    .loading {
      text-align: center;
      color: #666;
      padding: 40px;
    }
    @media (max-width: 768px) {
      .grid {
        grid-template-columns: 1fr;
      }
      .tabs {
        overflow-x: auto;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 Entity Tracking Dashboard</h1>
    <p style="color: #666; font-size: 12px;">Track events by Email, Phone, Payment, Location, Customer, and Barber</p>
  </div>
  
  <div class="tabs">
    <button class="tab active" onclick="switchTab('overview')">Overview</button>
    <button class="tab" onclick="switchTab('email')">📧 Email</button>
    <button class="tab" onclick="switchTab('phone')">📱 Phone</button>
    <button class="tab" onclick="switchTab('payment')">💳 Payment</button>
    <button class="tab" onclick="switchTab('location')">📍 Location</button>
    <button class="tab" onclick="switchTab('customer')">👤 Customer</button>
    <button class="tab" onclick="switchTab('barber')">✂️ Barber</button>
    <button class="tab" onclick="switchTab('relationships')">🔗 Relationships</button>
  </div>
  
  <!-- Overview Tab -->
  <div id="overview-tab" class="tab-content active">
    <div class="grid">
      <div class="card">
        <h3>📧 Email Analytics</h3>
        <div id="emailOverview" class="loading">Loading...</div>
      </div>
      <div class="card">
        <h3>📱 Phone Analytics</h3>
        <div id="phoneOverview" class="loading">Loading...</div>
      </div>
      <div class="card">
        <h3>💳 Payment Analytics</h3>
        <div id="paymentOverview" class="loading">Loading...</div>
      </div>
      <div class="card">
        <h3>📍 Location Analytics</h3>
        <div id="locationOverview" class="loading">Loading...</div>
      </div>
    </div>
    <div class="card">
      <h3>Activity Timeline</h3>
      <div class="chart-container">
        <canvas id="overviewChart"></canvas>
      </div>
    </div>
  </div>
  
  <!-- Email Tab -->
  <div id="email-tab" class="tab-content">
    <input type="text" class="search-box" id="emailSearch" placeholder="Search by email domain..." onkeyup="filterEntities('email')">
    <div class="card">
      <h3>Top Email Domains</h3>
      <div id="emailList" class="entity-list loading">Loading...</div>
    </div>
    <div class="card">
      <h3>Email Activity Chart</h3>
      <div class="chart-container">
        <canvas id="emailChart"></canvas>
      </div>
    </div>
  </div>
  
  <!-- Phone Tab -->
  <div id="phone-tab" class="tab-content">
    <input type="text" class="search-box" id="phoneSearch" placeholder="Search by area code..." onkeyup="filterEntities('phone')">
    <div class="card">
      <h3>Top Area Codes</h3>
      <div id="phoneList" class="entity-list loading">Loading...</div>
    </div>
    <div class="card">
      <h3>Phone Activity Chart</h3>
      <div class="chart-container">
        <canvas id="phoneChart"></canvas>
      </div>
    </div>
  </div>
  
  <!-- Payment Tab -->
  <div id="payment-tab" class="tab-content">
    <input type="text" class="search-box" id="paymentSearch" placeholder="Search payment IDs..." onkeyup="filterEntities('payment')">
    <div class="card">
      <h3>Payment Activity</h3>
      <div id="paymentList" class="entity-list loading">Loading...</div>
    </div>
  </div>
  
  <!-- Location Tab -->
  <div id="location-tab" class="tab-content">
    <input type="text" class="search-box" id="locationSearch" placeholder="Search locations..." onkeyup="filterEntities('location')">
    <div class="card">
      <h3>Top Locations</h3>
      <div id="locationList" class="entity-list loading">Loading...</div>
    </div>
    <div class="card">
      <h3>Geographic Distribution</h3>
      <div id="locationMap" class="loading">Map visualization coming soon...</div>
    </div>
  </div>
  
  <!-- Customer Tab -->
  <div id="customer-tab" class="tab-content">
    <input type="text" class="search-box" id="customerSearch" placeholder="Search customer IDs..." onkeyup="filterEntities('customer')">
    <div class="card">
      <h3>Customer Activity</h3>
      <div id="customerList" class="entity-list loading">Loading...</div>
    </div>
  </div>
  
  <!-- Barber Tab -->
  <div id="barber-tab" class="tab-content">
    <input type="text" class="search-box" id="barberSearch" placeholder="Search barber IDs..." onkeyup="filterEntities('barber')">
    <div class="card">
      <h3>Barber Activity</h3>
      <div id="barberList" class="entity-list loading">Loading...</div>
    </div>
    <div class="card">
      <h3>Barber Performance Chart</h3>
      <div class="chart-container">
        <canvas id="barberChart"></canvas>
      </div>
    </div>
  </div>
  
  <!-- Relationships Tab -->
  <div id="relationships-tab" class="tab-content">
    <div class="card">
      <h3>Entity Relationships</h3>
      <div style="margin-bottom: 20px;">
        <select id="relEntity1" class="search-box" style="width: auto; display: inline-block; margin-right: 10px;">
          <option value="customer">Customer</option>
          <option value="barber">Barber</option>
          <option value="email">Email</option>
          <option value="phone">Phone</option>
        </select>
        <span style="color: #666;">↔</span>
        <select id="relEntity2" class="search-box" style="width: auto; display: inline-block; margin-left: 10px;">
          <option value="barber">Barber</option>
          <option value="customer">Customer</option>
          <option value="location">Location</option>
          <option value="payment">Payment</option>
        </select>
        <button class="btn" onclick="loadRelationships()" style="margin-left: 15px;">Load Relationships</button>
      </div>
      <div id="relationshipsList" class="relationship-matrix loading">Click "Load Relationships" to view</div>
    </div>
  </div>
  
  <script>
    let charts = {};
    
    function switchTab(tabName) {
      // Hide all tabs
      document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
      });
      document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
      });
      
      // Show selected tab
      document.getElementById(tabName + '-tab').classList.add('active');
      event.target.classList.add('active');
      
      // Load data for the tab
      loadTabData(tabName);
    }
    
    async function loadTabData(tabName) {
      switch(tabName) {
        case 'overview':
          await loadOverview();
          break;
        case 'email':
          await loadEmailAnalytics();
          break;
        case 'phone':
          await loadPhoneAnalytics();
          break;
        case 'payment':
          await loadPaymentAnalytics();
          break;
        case 'location':
          await loadLocationAnalytics();
          break;
        case 'customer':
          await loadCustomerAnalytics();
          break;
        case 'barber':
          await loadBarberAnalytics();
          break;
      }
    }
    
    async function loadOverview() {
      try {
        const [email, phone, payment, location] = await Promise.all([
          fetch('/elite/tracking/email/analytics?limit=5').then(r => r.json()),
          fetch('/elite/tracking/phone/analytics?limit=5').then(r => r.json()),
          fetch('/elite/tracking/payment/analytics?limit=5').then(r => r.json()),
          fetch('/elite/tracking/location/analytics?limit=5').then(r => r.json()),
        ]);
        
        document.getElementById('emailOverview').innerHTML = renderOverviewStats(email.analytics || []);
        document.getElementById('phoneOverview').innerHTML = renderOverviewStats(phone.analytics || []);
        document.getElementById('paymentOverview').innerHTML = renderOverviewStats(payment.analytics || []);
        document.getElementById('locationOverview').innerHTML = renderOverviewStats(location.analytics || []);
        
        // Create overview chart
        createOverviewChart([email, phone, payment, location]);
      } catch (err) {
        console.error('Failed to load overview:', err);
      }
    }
    
    function renderOverviewStats(analytics) {
      if (!analytics || analytics.length === 0) {
        return '<div style="color:#666;text-align:center;padding:20px;">No data</div>';
      }
      
      const total = analytics.reduce((sum, a) => sum + (a.eventCount || 0), 0);
      const top = analytics[0];
      
      return \`
        <div class="stat-row">
          <span class="stat-label">Total Events</span>
          <span class="stat-value">\${total}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Top Entity</span>
          <span class="stat-value" style="font-size:12px;">\${top.entityValue || 'N/A'}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Unique Entities</span>
          <span class="stat-value">\${analytics.length}</span>
        </div>
      \`;
    }
    
    function createOverviewChart(data) {
      const ctx = document.getElementById('overviewChart');
      if (charts.overview) charts.overview.destroy();
      
      charts.overview = new Chart(ctx, {
        type: 'line',
        data: {
          labels: ['Email', 'Phone', 'Payment', 'Location'],
          datasets: [{
            label: 'Total Events',
            data: data.map(d => (d.analytics || []).reduce((sum, a) => sum + (a.eventCount || 0), 0)),
            borderColor: 'rgb(0, 255, 136)',
            backgroundColor: 'rgba(0, 255, 136, 0.1)',
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: '#e0e0e0' } }
          },
          scales: {
            x: { ticks: { color: '#666' }, grid: { color: '#22222a' } },
            y: { ticks: { color: '#666' }, grid: { color: '#22222a' } }
          }
        }
      });
    }
    
    async function loadEmailAnalytics() {
      try {
        const res = await fetch('/elite/tracking/email/analytics?limit=50');
        const data = await res.json();
        const analytics = (data.analytics || []).map(a => ({
          ...a,
          emailDomain: a.entityValue || 'unknown'
        }));
        renderEntityList('emailList', analytics, 'emailDomain');
        
        // Create email chart
        createEntityChart('emailChart', analytics, 'Email Domains');
      } catch (err) {
        console.error('Failed to load email analytics:', err);
        document.getElementById('emailList').innerHTML = '<div style="color:#ff3366;">Error loading data</div>';
      }
    }
    
    async function loadPhoneAnalytics() {
      try {
        const res = await fetch('/elite/tracking/phone/analytics?limit=50');
        const data = await res.json();
        const analytics = (data.analytics || []).map(a => ({
          ...a,
          phoneArea: a.entityValue || 'unknown'
        }));
        renderEntityList('phoneList', analytics, 'phoneArea');
        
        createEntityChart('phoneChart', analytics, 'Area Codes');
      } catch (err) {
        console.error('Failed to load phone analytics:', err);
      }
    }
    
    async function loadPaymentAnalytics() {
      try {
        const res = await fetch('/elite/tracking/payment/analytics?limit=50');
        const data = await res.json();
        renderEntityList('paymentList', data.analytics || []);
      } catch (err) {
        console.error('Failed to load payment analytics:', err);
      }
    }
    
    async function loadLocationAnalytics() {
      try {
        const res = await fetch('/elite/tracking/location/analytics?limit=50');
        const data = await res.json();
        renderEntityList('locationList', data.analytics || []);
      } catch (err) {
        console.error('Failed to load location analytics:', err);
      }
    }
    
    async function loadCustomerAnalytics() {
      try {
        const res = await fetch('/elite/tracking/customer/analytics?limit=50');
        const data = await res.json();
        renderEntityList('customerList', data.analytics || []);
      } catch (err) {
        console.error('Failed to load customer analytics:', err);
      }
    }
    
    async function loadBarberAnalytics() {
      try {
        const res = await fetch('/elite/tracking/barber/analytics?limit=50');
        const data = await res.json();
        renderEntityList('barberList', data.analytics || []);
        
        createEntityChart('barberChart', data.analytics || [], 'Barber Activity');
      } catch (err) {
        console.error('Failed to load barber analytics:', err);
      }
    }
    
    function renderEntityList(containerId, analytics, displayField = 'entityValue') {
      const container = document.getElementById(containerId);
      
      if (!analytics || analytics.length === 0) {
        container.innerHTML = '<div style="color:#666;text-align:center;padding:20px;">No data available</div>';
        return;
      }
      
      container.innerHTML = analytics.map(entity => {
        const displayValue = entity[displayField] || entity.entityValue || 'Unknown';
        const firstSeen = entity.firstSeen ? new Date(entity.firstSeen).toLocaleDateString() : 'N/A';
        const lastSeen = entity.lastSeen ? new Date(entity.lastSeen).toLocaleDateString() : 'N/A';
        
        return \`
          <div class="entity-item">
            <div class="entity-item-header">
              <span class="entity-name">\${displayValue}</span>
              <span class="entity-count">\${entity.eventCount || 0} events</span>
            </div>
            <div class="entity-meta">
              Event Types: \${entity.eventTypes || 0} | 
              Unique IPs: \${entity.uniqueIPs || 0}<br>
              First: \${firstSeen} | Last: \${lastSeen}
            </div>
          </div>
        \`;
      }).join('');
    }
    
    function createEntityChart(canvasId, data, label) {
      const ctx = document.getElementById(canvasId);
      if (charts[canvasId]) charts[canvasId].destroy();
      
      const top10 = data.slice(0, 10);
      
      charts[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: top10.map(d => (d.entityValue || 'Unknown').substring(0, 20)),
          datasets: [{
            label: label,
            data: top10.map(d => d.eventCount || 0),
            backgroundColor: 'rgba(0, 255, 136, 0.8)',
            borderColor: 'rgb(0, 255, 136)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: '#e0e0e0' } }
          },
          scales: {
            x: { ticks: { color: '#666', maxRotation: 45 }, grid: { color: '#22222a' } },
            y: { ticks: { color: '#666' }, grid: { color: '#22222a' } }
          }
        }
      });
    }
    
    async function loadRelationships() {
      const entity1 = document.getElementById('relEntity1').value;
      const entity2 = document.getElementById('relEntity2').value;
      
      try {
        const res = await fetch(\`/elite/tracking/relationships?entity1=\${entity1}&entity2=\${entity2}&limit=20\`);
        const data = await res.json();
        
        const container = document.getElementById('relationshipsList');
        if (!data.relationships || data.relationships.length === 0) {
          container.innerHTML = '<div style="color:#666;text-align:center;padding:20px;">No relationships found</div>';
          return;
        }
        
        container.innerHTML = data.relationships.map(rel => \`
          <div class="relationship-card">
            <div class="relationship-label">\${rel.entity1} ↔ \${rel.entity2}</div>
            <div class="relationship-value">\${rel.interactionCount || 0}</div>
            <div style="color:#666;font-size:11px;margin-top:8px;">
              Events: \${rel.eventTypes || 'N/A'}<br>
              First: \${rel.firstInteraction ? new Date(rel.firstInteraction).toLocaleDateString() : 'N/A'}<br>
              Last: \${rel.lastInteraction ? new Date(rel.lastInteraction).toLocaleDateString() : 'N/A'}
            </div>
          </div>
        \`).join('');
      } catch (err) {
        console.error('Failed to load relationships:', err);
        document.getElementById('relationshipsList').innerHTML = '<div style="color:#ff3366;">Error loading relationships</div>';
      }
    }
    
    function filterEntities(type) {
      const searchTerm = document.getElementById(type + 'Search').value.toLowerCase();
      const items = document.querySelectorAll('#' + type + 'List .entity-item');
      
      items.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(searchTerm) ? 'block' : 'none';
      });
    }
    
    // Load overview on page load
    loadOverview();
    
    // Auto-refresh every 30 seconds
    setInterval(() => {
      const activeTab = document.querySelector('.tab-content.active');
      if (activeTab) {
        const tabName = activeTab.id.replace('-tab', '');
        loadTabData(tabName);
      }
    }, 30000);
  </script>
</body>
</html>`;
}

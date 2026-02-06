#!/usr/bin/env bun

// scripts/serve-dashboard.ts

import { factoryWagerSecurityCitadel } from '../lib/security/factorywager-security-citadel';
import { secretLifecycleManager } from '../lib/security/secret-lifecycle';
import { BUN_DOCS } from '../lib/docs/urls';

interface DashboardOptions {
  port?: number;
  liveUpdates?: boolean;
  refreshInterval?: number;
  theme?: 'light' | 'dark' | 'auto';
}

function parseArgs(): DashboardOptions {
  const options: DashboardOptions = {
    port: 8080,
    liveUpdates: true,
    refreshInterval: 5000,
    theme: 'auto'
  };
  
  for (let i = 1; i < Bun.argv.length; i++) {
    const arg = Bun.argv[i];
    
    if (arg === '--port' && Bun.argv[i + 1]) {
      options.port = parseInt(Bun.argv[++i]);
    }
    if (arg === '--live-updates') options.liveUpdates = true;
    if (arg === '--no-live-updates') options.liveUpdates = false;
    if (arg === '--refresh-interval' && Bun.argv[i + 1]) {
      options.refreshInterval = parseInt(Bun.argv[++i]);
    }
    if (arg === '--theme' && Bun.argv[i + 1]) {
      options.theme = Bun.argv[++i] as 'light' | 'dark' | 'auto';
    }
    if (arg === '--help' || arg === '-h') {
      showHelp();
      process.exit(0);
    }
  }
  
  return options;
}

function showHelp() {
  console.log('🌐 Visual Dashboard Server');
  console.log('==========================');
  console.log();
  console.log('Serve a web dashboard for secrets management.');
  console.log();
  console.log('Options:');
  console.log('  --port <number>       Server port (default: 8080)');
  console.log('  --live-updates        Enable live updates (default)');
  console.log('  --no-live-updates     Disable live updates');
  console.log('  --refresh-interval <ms>  Update interval (default: 5000)');
  console.log('  --theme <theme>       Theme: light, dark, auto (default: auto)');
  console.log('  --help, -h            Show this help');
  console.log();
  console.log('Environment Variables:');
  console.log('  R2_BUCKET             R2 bucket name for storage');
  console.log();
  console.log('Examples:');
  console.log('  R2_BUCKET=secrets-dashboard bun serve-dashboard.ts --port 8080 --live-updates');
  console.log('  bun serve-dashboard.ts --port 3000 --theme dark');
  console.log('  bun serve-dashboard.ts --no-live-updates --refresh-interval 10000');
}

function styled(text: string, type: 'success' | 'warning' | 'error' | 'info' | 'primary' | 'accent' | 'muted'): string {
  const colors = {
    success: '\x1b[32m',
    warning: '\x1b[33m',
    error: '\x1b[31m',
    info: '\x1b[36m',
    primary: '\x1b[34m',
    accent: '\x1b[35m',
    muted: '\x1b[90m'
  };
  const reset = '\x1b[0m';
  return `${colors[type]}${text}${reset}`;
}

class SecretsDashboard {
  private options: DashboardOptions;
  private r2Bucket: string;
  
  constructor(options: DashboardOptions) {
    this.options = options;
    this.r2Bucket = process.env.R2_BUCKET || 'bun-executables';
  }
  
  async start(): Promise<void> {
    console.log(styled('🌐 Starting Secrets Dashboard', 'primary'));
    console.log(styled('============================', 'muted'));
    console.log();
    
    console.log(styled('Configuration:', 'info'));
    console.log(styled(`   Port: ${this.options.port}`, 'muted'));
    console.log(styled(`   Live updates: ${this.options.liveUpdates ? 'enabled' : 'disabled'}`, 'muted'));
    console.log(styled(`   Refresh interval: ${this.options.refreshInterval}ms`, 'muted'));
    console.log(styled(`   Theme: ${this.options.theme}`, 'muted'));
    console.log(styled(`   R2 bucket: ${this.r2Bucket}`, 'muted'));
    console.log();
    
    // Create server
    const server = Bun.serve({
      port: this.options.port,
      fetch: async (request) => this.handleRequest(request),
      error: (error) => {
        console.error(styled('Server error:', 'error'), error.message);
        return new Response('Internal Server Error', { status: 500 });
      }
    });
    
    console.log(styled('🚀 Dashboard server started!', 'success'));
    console.log(styled(`   URL: http://localhost:${this.options.port}`, 'primary'));
    console.log(styled('   Press Ctrl+C to stop the server', 'muted'));
    console.log();
    
    if (this.options.liveUpdates) {
      console.log(styled('🔄 Live updates enabled', 'info'));
      console.log(styled(`   Refreshing every ${this.options.refreshInterval}ms`, 'muted'));
    }
    
    console.log(styled('📊 Available endpoints:', 'accent'));
    console.log(styled('   GET  /                    - Dashboard home', 'muted'));
    console.log(styled('   GET  /api/status          - System status', 'muted'));
    console.log(styled('   GET  /api/secrets         - Secrets list', 'muted'));
    console.log(styled('   GET  /api/secrets/:key    - Secret details', 'muted'));
    console.log(styled('   GET  /api/graphs/:key     - Version graphs', 'muted'));
    console.log(styled('   GET  /api/expirations     - Expiration monitoring', 'muted'));
    console.log(styled('   GET  /api/audit           - Audit data', 'muted'));
    console.log();
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log(styled('\n🛑 Shutting down dashboard...', 'warning'));
      server.stop();
      process.exit(0);
    });
  }
  
  private async handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    
    try {
      // API endpoints
      if (path.startsWith('/api/')) {
        return await this.handleApiRequest(path);
      }
      
      // Static assets
      if (path.startsWith('/static/')) {
        return await this.handleStaticRequest(path);
      }
      
      // Main dashboard
      if (path === '/' || path === '/index.html') {
        return await this.serveDashboard();
      }
      
      // 404
      return new Response('Not Found', { status: 404 });
      
    } catch (error) {
      console.error(styled('Request error:', 'error'), error.message);
      return new Response('Internal Server Error', { status: 500 });
    }
  }
  
  private async handleApiRequest(path: string): Promise<Response> {
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
      'Access-Control-Allow-Headers': 'Content-Type'
    };
    
    switch (path) {
      case '/api/status':
        const status = await factoryWagerSecurityCitadel.getDashboardStats();
        return new Response(JSON.stringify(status), { headers });
        
      case '/api/secrets':
        const secrets = await this.getSecretsList();
        return new Response(JSON.stringify(secrets), { headers });
        
      case '/api/expirations':
        const expirations = await secretLifecycleManager.checkExpirations();
        return new Response(JSON.stringify(expirations), { headers });
        
      case '/api/audit':
        const auditData = await this.getAuditData();
        return new Response(JSON.stringify(auditData), { headers });
        
      default:
        // Secret-specific endpoints
        if (path.startsWith('/api/secrets/')) {
          const key = path.split('/').pop();
          if (key) {
            const secretData = await this.getSecretDetails(key);
            return new Response(JSON.stringify(secretData), { headers });
          }
        }
        
        // Graph endpoints
        if (path.startsWith('/api/graphs/')) {
          const key = path.split('/').pop();
          if (key) {
            const graphData = await factoryWagerSecurityCitadel.generateVisualGraph(key);
            return new Response(JSON.stringify(graphData), { headers });
          }
        }
        
        return new Response('API endpoint not found', { status: 404, headers });
    }
  }
  
  private async handleStaticRequest(path: string): Promise<Response> {
    // In a real implementation, serve static files from a directory
    // For now, return a simple CSS file
    if (path === '/static/dashboard.css') {
      const css = await this.generateDashboardCSS();
      return new Response(css, {
        headers: { 'Content-Type': 'text/css' }
      });
    }
    
    if (path === '/static/dashboard.js') {
      const js = await this.generateDashboardJS();
      return new Response(js, {
        headers: { 'Content-Type': 'application/javascript' }
      });
    }
    
    return new Response('Static file not found', { status: 404 });
  }
  
  private async serveDashboard(): Promise<Response> {
    const html = await this.generateDashboardHTML();
    return new Response(html, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
  
  private async generateDashboardHTML(): Promise<string> {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🏰 FactoryWager Security Citadel Dashboard</title>
    <link rel="stylesheet" href="/static/dashboard.css">
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏰</text></svg>">
</head>
<body data-theme="${this.options.theme}">
    <div class="dashboard">
        <header class="header">
            <div class="header-content">
                <h1>🏰 FactoryWager Security Citadel</h1>
                <p class="subtitle">Enterprise Secrets Management Dashboard v5.1</p>
            </div>
            <div class="header-controls">
                <button id="refresh-btn" class="btn btn-primary">🔄 Refresh</button>
                <button id="theme-toggle" class="btn btn-secondary">🌓 Theme</button>
            </div>
        </header>
        
        <main class="main">
            <div class="stats-grid">
                <div class="stat-card">
                    <h3>🔑 Total Secrets</h3>
                    <div class="stat-value" id="total-secrets">-</div>
                    <div class="stat-change" id="secrets-change">-</div>
                </div>
                
                <div class="stat-card">
                    <h3>📜 Total Versions</h3>
                    <div class="stat-value" id="total-versions">-</div>
                    <div class="stat-change" id="versions-change">-</div>
                </div>
                
                <div class="stat-card">
                    <h3>🤖 Active Automations</h3>
                    <div class="stat-value" id="active-automations">-</div>
                    <div class="stat-change" id="automations-change">-</div>
                </div>
                
                <div class="stat-card">
                    <h3>⚠️ Expiring Soon</h3>
                    <div class="stat-value" id="expiring-soon">-</div>
                    <div class="stat-change" id="expiring-change">-</div>
                </div>
                
                <div class="stat-card">
                    <h3>📈 Compliance Score</h3>
                    <div class="stat-value" id="compliance-score">-</div>
                    <div class="stat-progress">
                        <div class="progress-bar" id="compliance-progress"></div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <h3>🕐 Last Update</h3>
                    <div class="stat-value" id="last-update">-</div>
                    <div class="live-indicator ${this.options.liveUpdates ? 'live' : ''}" id="live-indicator">
                        <span class="dot"></span>
                        ${this.options.liveUpdates ? 'Live' : 'Static'}
                    </div>
                </div>
            </div>
            
            <div class="content-grid">
                <section class="card">
                    <h2>🔐 Secrets Overview</h2>
                    <div class="table-container">
                        <table id="secrets-table">
                            <thead>
                                <tr>
                                    <th>Secret</th>
                                    <th>Versions</th>
                                    <th>Last Activity</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="secrets-tbody">
                                <tr>
                                    <td colspan="5" class="loading">Loading...</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>
                
                <section class="card">
                    <h2>⏰ Expiration Monitor</h2>
                    <div id="expiration-alerts" class="alerts-container">
                        <div class="loading">Loading expiration data...</div>
                    </div>
                </section>
                
                <section class="card full-width">
                    <h2>📊 Version Graphs</h2>
                    <div class="graph-controls">
                        <select id="secret-select" class="select">
                            <option value="">Select a secret...</option>
                        </select>
                        <button id="generate-graph" class="btn btn-primary">Generate Graph</button>
                    </div>
                    <div id="graph-container" class="graph-container">
                        <div class="placeholder">Select a secret to view its version graph</div>
                    </div>
                </section>
            </div>
        </main>
        
        <footer class="footer">
            <p>FactoryWager Security Citadel v5.1 | R2 Bucket: ${this.r2Bucket}</p>
            <p>Live updates: ${this.options.liveUpdates ? 'Enabled' : 'Disabled'} | Refresh: ${this.options.refreshInterval}ms</p>
        </footer>
    </div>
    
    <script src="/static/dashboard.js"></script>
</body>
</html>
    `;
  }
  
  private async generateDashboardCSS(): Promise<string> {
    return `
:root {
  --primary-color: #3b82f6;
  --success-color: #10b981;
  --warning-color: #f59e0b;
  --error-color: #ef4444;
  --background: #ffffff;
  --surface: #f9fafb;
  --text: #111827;
  --text-muted: #6b7280;
  --border: #e5e7eb;
  --shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

[data-theme="dark"] {
  --background: #111827;
  --surface: #1f2937;
  --text: #f9fafb;
  --text-muted: #9ca3af;
  --border: #374151;
  --shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--background);
  color: var(--text);
  line-height: 1.6;
}

.dashboard {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-content h1 {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--primary-color);
}

.subtitle {
  color: var(--text-muted);
  font-size: 0.875rem;
}

.header-controls {
  display: flex;
  gap: 0.5rem;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-secondary {
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
}

.btn-secondary:hover {
  background: var(--border);
}

.main {
  flex: 1;
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  padding: 1.5rem;
  box-shadow: var(--shadow);
}

.stat-card h3 {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-muted);
  margin-bottom: 0.5rem;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 0.5rem;
}

.stat-change {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.stat-progress {
  margin-top: 0.5rem;
  height: 0.25rem;
  background: var(--border);
  border-radius: 0.125rem;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: var(--success-color);
  transition: width 0.3s ease;
}

.live-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.live-indicator.live .dot {
  width: 0.5rem;
  height: 0.5rem;
  background: var(--success-color);
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.content-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2rem;
  margin-bottom: 2rem;
}

.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  padding: 1.5rem;
  box-shadow: var(--shadow);
}

.card h2 {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: var(--text);
}

.full-width {
  grid-column: 1 / -1;
}

.table-container {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--border);
}

th {
  font-weight: 600;
  color: var(--text-muted);
  font-size: 0.875rem;
}

.loading {
  text-align: center;
  color: var(--text-muted);
  font-style: italic;
}

.alerts-container {
  max-height: 300px;
  overflow-y: auto;
}

.alert {
  padding: 0.75rem;
  border-radius: 0.375rem;
  margin-bottom: 0.5rem;
  border-left: 4px solid;
}

.alert.critical {
  background: #fee;
  border-left-color: var(--error-color);
}

.alert.warning {
  background: #fef3c7;
  border-left-color: var(--warning-color);
}

.graph-controls {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  align-items: center;
}

.select {
  padding: 0.5rem;
  border: 1px solid var(--border);
  border-radius: 0.375rem;
  background: var(--background);
  color: var(--text);
  font-size: 0.875rem;
}

.graph-container {
  min-height: 400px;
  background: var(--background);
  border: 1px solid var(--border);
  border-radius: 0.375rem;
  padding: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder {
  color: var(--text-muted);
  font-style: italic;
}

.footer {
  background: var(--surface);
  border-top: 1px solid var(--border);
  padding: 1rem 2rem;
  text-align: center;
  font-size: 0.875rem;
  color: var(--text-muted);
}

@media (max-width: 768px) {
  .header {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }
  
  .main {
    padding: 1rem;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .content-grid {
    grid-template-columns: 1fr;
  }
}
    `;
  }
  
  private async generateDashboardJS(): Promise<string> {
    return `
class SecretsDashboard {
  constructor() {
    this.refreshInterval = ${this.options.refreshInterval};
    this.liveUpdates = ${this.options.liveUpdates};
    this.init();
  }
  
  init() {
    this.bindEvents();
    this.loadInitialData();
    
    if (this.liveUpdates) {
      this.startLiveUpdates();
    }
  }
  
  bindEvents() {
    document.getElementById('refresh-btn').addEventListener('click', () => {
      this.refreshData();
    });
    
    document.getElementById('theme-toggle').addEventListener('click', () => {
      this.toggleTheme();
    });
    
    document.getElementById('generate-graph').addEventListener('click', () => {
      this.generateGraph();
    });
  }
  
  async loadInitialData() {
    await Promise.all([
      this.loadStatus(),
      this.loadSecrets(),
      this.loadExpirations()
    ]);
  }
  
  async loadStatus() {
    try {
      const response = await fetch('/api/status');
      const status = await response.json();
      
      document.getElementById('total-secrets').textContent = status.totalSecrets;
      document.getElementById('total-versions').textContent = status.totalVersions;
      document.getElementById('active-automations').textContent = status.activeAutomations;
      document.getElementById('expiring-soon').textContent = status.recentActivity;
      document.getElementById('compliance-score').textContent = status.complianceScore + '%';
      
      const progressBar = document.getElementById('compliance-progress');
      progressBar.style.width = status.complianceScore + '%';
      
      if (status.complianceScore >= 90) {
        progressBar.style.background = 'var(--success-color)';
      } else if (status.complianceScore >= 70) {
        progressBar.style.background = 'var(--warning-color)';
      } else {
        progressBar.style.background = 'var(--error-color)';
      }
      
      this.updateLastUpdate();
    } catch (error) {
      console.error('Failed to load status:', error);
    }
  }
  
  async loadSecrets() {
    try {
      const response = await fetch('/api/secrets');
      const secrets = await response.json();
      
      const tbody = document.getElementById('secrets-tbody');
      const select = document.getElementById('secret-select');
      
      tbody.innerHTML = '';
      select.innerHTML = '<option value="">Select a secret...</option>';
      
      secrets.forEach(secret => {
        // Add to table
        const row = document.createElement('tr');
        row.innerHTML = \`
          <td><strong>\${secret.key}</strong></td>
          <td>\${secret.versions}</td>
          <td>\${new Date(secret.lastActivity).toLocaleDateString()}</td>
          <td><span class="status status-\${secret.status}">\${secret.status}</span></td>
          <td>
            <button class="btn btn-sm" onclick="dashboard.viewSecret('\${secret.key}')">View</button>
          </td>
        \`;
        tbody.appendChild(row);
        
        // Add to select
        const option = document.createElement('option');
        option.value = secret.key;
        option.textContent = secret.key;
        select.appendChild(option);
      });
    } catch (error) {
      console.error('Failed to load secrets:', error);
    }
  }
  
  async loadExpirations() {
    try {
      const response = await fetch('/api/expirations');
      const expirations = await response.json();
      
      const container = document.getElementById('expiration-alerts');
      container.innerHTML = '';
      
      if (expirations.length === 0) {
        container.innerHTML = '<div class="success">No secrets expiring soon</div>';
        return;
      }
      
      expirations.forEach(secret => {
        const alert = document.createElement('div');
        const severity = secret.daysLeft <= 3 ? 'critical' : 'warning';
        alert.className = \`alert \${severity}\`;
        alert.innerHTML = \`
          <strong>\${secret.key}</strong><br>
          \${secret.daysLeft} days left
        \`;
        container.appendChild(alert);
      });
    } catch (error) {
      console.error('Failed to load expirations:', error);
    }
  }
  
  async generateGraph() {
    const select = document.getElementById('secret-select');
    const selectedKey = select.value;
    
    if (!selectedKey) {
      alert('Please select a secret first');
      return;
    }
    
    try {
      const response = await fetch(\`/api/graphs/\${selectedKey}\`);
      const graphData = await response.json();
      
      const container = document.getElementById('graph-container');
      container.innerHTML = \`
        <div style="width: 100%; height: 100%;">
          <h4>Terminal Visualization</h4>
          <pre style="background: var(--surface); padding: 1rem; border-radius: 0.375rem; overflow-x: auto;">\${graphData.terminal}</pre>
          
          <h4>Version Timeline</h4>
          <div style="max-height: 200px; overflow-y: auto;">
            \${graphData.timeline.map(item => \`
              <div style="padding: 0.5rem; border-left: 3px solid var(--primary-color); margin-bottom: 0.5rem;">
                <strong>\${item.version}</strong> - \${new Date(item.timestamp).toLocaleDateString()}<br>
                <small>\${item.action} by \${item.author}</small>
              </div>
            \`).join('')}
          </div>
        </div>
      \`;
    } catch (error) {
      console.error('Failed to generate graph:', error);
      document.getElementById('graph-container').innerHTML = '<div class="error">Failed to generate graph</div>';
    }
  }
  
  async refreshData() {
    const btn = document.getElementById('refresh-btn');
    btn.disabled = true;
    btn.textContent = '🔄 Refreshing...';
    
    await this.loadInitialData();
    
    btn.disabled = false;
    btn.textContent = '🔄 Refresh';
  }
  
  startLiveUpdates() {
    setInterval(() => {
      this.refreshData();
    }, this.refreshInterval);
  }
  
  updateLastUpdate() {
    const now = new Date();
    document.getElementById('last-update').textContent = now.toLocaleTimeString();
  }
  
  toggleTheme() {
    const body = document.body;
    const currentTheme = body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  }
  
  viewSecret(key) {
    // In a real implementation, this would show a modal or navigate to a detail page
    alert(\`Viewing details for: \${key}\`);
  }
}

// Initialize dashboard
const dashboard = new SecretsDashboard();

// Load saved theme
const savedTheme = localStorage.getItem('theme') || 'auto';
if (savedTheme !== 'auto') {
  document.body.setAttribute('data-theme', savedTheme);
}
    `;
  }
  
  private async getSecretsList(): Promise<Array<{
    key: string;
    versions: number;
    lastActivity: string;
    status: string;
  }>> {
    // Mock data - in real implementation, fetch from actual system
    return [
      {
        key: 'api:github_token',
        versions: 5,
        lastActivity: new Date().toISOString(),
        status: 'active'
      },
      {
        key: 'database:password',
        versions: 3,
        lastActivity: new Date(Date.now() - 86400000).toISOString(),
        status: 'active'
      },
      {
        key: 'jwt:secret',
        versions: 2,
        lastActivity: new Date(Date.now() - 172800000).toISOString(),
        status: 'warning'
      },
      {
        key: 'stripe:webhook_secret',
        versions: 4,
        lastActivity: new Date().toISOString(),
        status: 'active'
      },
      {
        key: 'redis:auth',
        versions: 1,
        lastActivity: new Date(Date.now() - 259200000).toISOString(),
        status: 'stale'
      }
    ];
  }
  
  private async getSecretDetails(key: string): Promise<any> {
    const timeline = await factoryWagerSecurityCitadel.getSecretTimeline(key, 10);
    return {
      key,
      timeline,
      lastUpdate: new Date().toISOString()
    };
  }
  
  private async getAuditData(): Promise<any> {
    return {
      lastAudit: new Date().toISOString(),
      totalAudits: 156,
      criticalIssues: 2,
      highIssues: 5,
      complianceScore: 94.2
    };
  }
}

async function main() {
  const options = parseArgs();
  
  const dashboard = new SecretsDashboard(options);
  await dashboard.start();
}

// Run the dashboard server
main().catch(console.error);

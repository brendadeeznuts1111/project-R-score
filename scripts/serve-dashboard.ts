#!/usr/bin/env bun

/**
 * 📊 FactoryWager Secrets Dashboard v5.1
 *
 * Visual dashboard for secret management with live updates
 *
 * @version 5.1
 */

import { VersionedSecretManager } from '../lib/security/versioned-secrets.ts';
import { SecretLifecycleManager } from '../lib/security/secret-lifecycle.ts';
import { styled } from '../lib/theme/colors.ts';
import { refs } from '../lib/reference-manager.ts';

const versionedManager = new VersionedSecretManager(refs);
const lifecycleManager = new SecretLifecycleManager();

async function main() {
  const args = Bun.argv.slice(2);
  const port = parseInt(args.find(arg => arg.startsWith('--port='))?.split('=')[1] || '8080');
  const liveUpdates = args.includes('--live-updates');

  console.log(styled('📊 FactoryWager Secrets Dashboard v5.1', 'accent'));
  console.log(styled('=========================================', 'muted'));
  console.log('');

  console.log(styled(`🌐 Starting dashboard on port ${port}`, 'primary'));
  console.log(styled(`🔄 Live updates: ${liveUpdates ? 'enabled' : 'disabled'}`, 'muted'));
  console.log('');

  const server = Bun.serve({
    port,
    async fetch(req) {
      const url = new URL(req.url);

      // API endpoints
      if (url.pathname.startsWith('/api/')) {
        return handleAPI(req, url);
      }

      // Static dashboard
      if (url.pathname === '/' || url.pathname === '/dashboard') {
        return new Response(dashboardHTML, {
          headers: { 'Content-Type': 'text/html' }
        });
      }

      // Static assets
      if (url.pathname.startsWith('/static/')) {
        return handleStatic(url.pathname);
      }

      return new Response('Not Found', { status: 404 });
    }
  });

  console.log(styled(`✅ Dashboard running at http://localhost:${port}`, 'success'));
  console.log(styled(`📖 Visit the dashboard to view secret analytics`, 'primary'));
  console.log('');

  if (liveUpdates) {
    console.log(styled('🔄 Live updates enabled - dashboard will refresh automatically', 'success'));
  }
}

async function handleAPI(req: Request, url: URL): Promise<Response> {
  const path = url.pathname.replace('/api', '');

  try {
    switch (path) {
      case '/secrets/overview': {
        const secrets = await getSecretsOverview();
        return Response.json(secrets);
      }

      case '/secrets/expirations': {
        const expiring = await lifecycleManager.checkExpirations();
        return Response.json(expiring);
      }

      case '/secrets/history': {
        const key = url.searchParams.get('key');
        if (!key) return Response.json({ error: 'Key required' }, { status: 400 });

        const history = await versionedManager.getHistory(key, 20);
        return Response.json(history);
      }

      case '/secrets/visualize': {
        const key = url.searchParams.get('key');
        if (!key) return Response.json({ error: 'Key required' }, { status: 400 });

        const { mermaidUrl, d3Url, nodeCount } = await versionedManager.visualize(key);
        return Response.json({ mermaidUrl, d3Url, nodeCount });
      }

      case '/health': {
        return Response.json({
          status: 'healthy',
          version: '5.1',
          timestamp: new Date().toISOString()
        });
      }

      default:
        return Response.json({ error: 'Unknown endpoint' }, { status: 404 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function handleStatic(pathname: string): Promise<Response> {
  // Serve static assets (CSS, JS, images)
  const assetPath = pathname.replace('/static/', '');

  // Mock static file serving - in real implementation, serve actual files
  if (assetPath.endsWith('.css')) {
    return new Response(dashboardCSS, {
      headers: { 'Content-Type': 'text/css' }
    });
  }

  if (assetPath.endsWith('.js')) {
    return new Response(dashboardJS, {
      headers: { 'Content-Type': 'application/javascript' }
    });
  }

  return new Response('Asset not found', { status: 404 });
}

async function getSecretsOverview() {
  // Mock implementation - replace with actual data collection
  return {
    totalSecrets: 15,
    versionedSecrets: 12,
    expiringSoon: 3,
    lastAudit: new Date().toISOString(),
    version: '5.1'
  };
}

const dashboardHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FactoryWager Secrets Dashboard v5.1</title>
  <link rel="stylesheet" href="/static/dashboard.css">
</head>
<body>
  <div class="dashboard">
    <header>
      <h1>🔐 FactoryWager Secrets Dashboard v5.1</h1>
      <p>Temporal-security continuum with versioning & rollback</p>
    </header>

    <div class="metrics-grid">
      <div class="metric-card">
        <h3>Total Secrets</h3>
        <div class="metric-value" id="total-secrets">-</div>
      </div>

      <div class="metric-card">
        <h3>Versioned</h3>
        <div class="metric-value" id="versioned-secrets">-</div>
      </div>

      <div class="metric-card warning">
        <h3>Expiring Soon</h3>
        <div class="metric-value" id="expiring-secrets">-</div>
      </div>

      <div class="metric-card">
        <h3>Last Audit</h3>
        <div class="metric-value" id="last-audit">-</div>
      </div>
    </div>

    <div class="sections">
      <section>
        <h2>⏰ Expiring Secrets</h2>
        <div id="expirations-list">Loading...</div>
      </section>

      <section>
        <h2>📜 Recent Changes</h2>
        <div id="recent-changes">Loading...</div>
      </section>

      <section>
        <h2>📊 Version Graph</h2>
        <div id="version-graph">Select a secret to view its version history</div>
      </section>
    </div>

    <footer>
      <p>FactoryWager SECRETS v5.1 | Temporal-security continuum</p>
      <p><a href="https://bun.com/docs/runtime/secrets/versioning">Documentation</a></p>
    </footer>
  </div>

  <script src="/static/dashboard.js"></script>
</body>
</html>`;

const dashboardCSS = `
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #333;
  min-height: 100vh;
}

.dashboard {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

header {
  text-align: center;
  color: white;
  margin-bottom: 30px;
}

header h1 {
  font-size: 2.5rem;
  margin-bottom: 10px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.metric-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.metric-card.warning {
  border-left: 4px solid #ffc107;
}

.metric-value {
  font-size: 2rem;
  font-weight: bold;
  color: #667eea;
  margin-top: 10px;
}

.sections {
  display: grid;
  gap: 30px;
}

section {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

section h2 {
  margin-bottom: 20px;
  color: #333;
}

footer {
  text-align: center;
  color: white;
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}

footer a {
  color: white;
  text-decoration: underline;
}
`;

const dashboardJS = `
async function loadDashboard() {
  try {
    // Load overview metrics
    const overview = await fetch('/api/secrets/overview').then(r => r.json());
    document.getElementById('total-secrets').textContent = overview.totalSecrets;
    document.getElementById('versioned-secrets').textContent = overview.versionedSecrets;
    document.getElementById('expiring-secrets').textContent = overview.expiringSoon;
    document.getElementById('last-audit').textContent = new Date(overview.lastAudit).toLocaleDateString();

    // Load expiring secrets
    const expirations = await fetch('/api/secrets/expirations').then(r => r.json());
    const expList = document.getElementById('expirations-list');

    if (expirations.length === 0) {
      expList.innerHTML = '<p style="color: #28a745;">✅ No secrets expiring soon</p>';
    } else {
      expList.innerHTML = expirations.map(exp => \`
        <div style="padding: 10px; border-left: 4px solid \${exp.daysLeft <= 3 ? '#dc3545' : '#ffc107'}; margin-bottom: 10px;">
          <strong>\${exp.key}</strong><br>
          <small>Expires in \${exp.daysLeft} days</small>
        </div>
      \`).join('');
    }

    // Mock recent changes (replace with real API call)
    document.getElementById('recent-changes').innerHTML = '<p>Recent version changes will appear here</p>';

    console.log('Dashboard loaded successfully');
  } catch (error) {
    console.error('Failed to load dashboard:', error);
  }
}

// Load dashboard on page load
loadDashboard();

// Refresh every 30 seconds if live updates enabled
setInterval(loadDashboard, 30000);
`;

main().catch(error => {
  console.error(styled(`❌ Failed to start dashboard: ${error.message}`, 'error'));
  process.exit(1);
});
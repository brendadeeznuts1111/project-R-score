/**
 * Error Page Generation Utilities
 * 
 * Provides HTML error page generation for browser display.
 */

/**
 * Escape HTML entities for safe display
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Generate HTML error page for browser display
 */
export function generateErrorPage(
  error: Error,
  context?: { path?: string; id?: string },
  isDev: boolean = false
): string {
  const timestamp = new Date().toISOString();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard Exception</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: #e0e0e0;
      font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
      min-height: 100vh;
      padding: 2rem;
    }
    .container { max-width: 900px; margin: 0 auto; }
    .header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #333;
    }
    .icon { font-size: 3rem; }
    h1 { color: #ff4444; font-size: 1.5rem; }
    .subtitle { color: #888; font-size: 0.9rem; margin-top: 0.5rem; }
    .card {
      background: rgba(255,255,255,0.05);
      border: 1px solid #333;
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 1rem;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    .badge {
      background: #ff4444;
      color: white;
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      font-size: 0.75rem;
      text-transform: uppercase;
    }
    .message {
      background: #0d1117;
      border-left: 3px solid #ff4444;
      padding: 1rem;
      font-size: 1rem;
      color: #ff6b6b;
      overflow-x: auto;
    }
    details { margin-top: 1rem; }
    summary {
      cursor: pointer;
      color: #888;
      padding: 0.5rem 0;
    }
    summary:hover { color: #aaa; }
    pre {
      background: #0d1117;
      padding: 1rem;
      border-radius: 4px;
      overflow-x: auto;
      font-size: 0.85rem;
      line-height: 1.6;
      color: #8b949e;
    }
    .meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; }
    .meta-item { background: rgba(0,0,0,0.2); padding: 1rem; border-radius: 4px; }
    .meta-label { color: #666; font-size: 0.75rem; text-transform: uppercase; }
    .meta-value { color: #fff; margin-top: 0.25rem; }
    .actions { margin-top: 2rem; display: flex; gap: 1rem; }
    .btn {
      padding: 0.75rem 1.5rem;
      border-radius: 4px;
      border: none;
      cursor: pointer;
      font-family: inherit;
      font-size: 0.9rem;
    }
    .btn-primary { background: #0066ff; color: white; }
    .btn-secondary { background: #333; color: #ccc; }
    .btn:hover { filter: brightness(1.1); }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="icon">✖</div>
      <div>
        <h1>Dashboard Exception</h1>
        <div class="subtitle">An error occurred while processing your request</div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <span>Error Details</span>
        <span class="badge">Exception</span>
      </div>
      <div class="message">${escapeHtml(error.message)}</div>
      ${isDev && error.stack ? `
      <details>
        <summary>View Stack Trace</summary>
        <pre>${escapeHtml(error.stack)}</pre>
      </details>
      ` : ""}
    </div>

    <div class="meta">
      <div class="meta-item">
        <div class="meta-label">Exception ID</div>
        <div class="meta-value">${context?.id || "N/A"}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Path</div>
        <div class="meta-value">${context?.path || "/"}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Timestamp</div>
        <div class="meta-value">${timestamp}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Environment</div>
        <div class="meta-value">${isDev ? "Development" : "Production"}</div>
      </div>
    </div>

    <div class="actions">
      <button class="btn btn-primary" onclick="location.reload()">Retry Request</button>
      <button class="btn btn-secondary" onclick="location.href='/'">Go to Dashboard</button>
    </div>
  </div>
</body>
</html>`;
}

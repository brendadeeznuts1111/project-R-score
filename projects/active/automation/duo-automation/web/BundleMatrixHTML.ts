// ──────────────────────────────
// 3. BUNDLE MATRIX HTML RENDERER
// ──────────────────────────────

// renderers/BundleMatrixHTML.ts
import { BundleMatrix, BundleNode } from "../analyzers/BundleMatrix.js";

export class BundleMatrixHTML {
  static render(matrix: BundleMatrix): string {
    const nodes = Object.values(matrix.inputs);
    const outputs = Object.entries(matrix.outputs);
    
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>📦 DuoPlus Bundle Matrix</title>
  <style>
    :root {
      --excellent: #3b82f6;
      --good: #3b82f6;
      --fair: #eab308;
      --poor: #3b82f6;
      --critical: #3b82f6;
      --bg-primary: #3b82f6;
      --bg-secondary: #3b82f6;
      --bg-tertiary: #3b82f6;
      --text-primary: #3b82f6;
      --border: #3b82f6;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'JetBrains Mono', monospace;
      background: var(--bg-primary);
      color: var(--text-primary);
      padding: 20px;
      line-height: 1.6;
    }
    
    .container {
      max-width: 100%;
      overflow-x: auto;
    }
    
    .header {
      background: linear-gradient(135deg, #3b82f6, #3b82f6);
      padding: 30px;
      border-radius: 12px;
      margin-bottom: 20px;
      border: 1px solid var(--border);
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin: 20px 0;
    }
    
    .stat-card {
      background: var(--bg-tertiary);
      padding: 20px;
      border-radius: 8px;
      text-align: center;
    }
    
    .stat-value {
      font-size: 32px;
      font-weight: bold;
      margin: 10px 0;
    }
    
    .stat-label {
      font-size: 12px;
      opacity: 0.7;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .matrix-table {
      width: 100%;
      border-collapse: collapse;
      background: var(--bg-secondary);
      border-radius: 8px;
      overflow: hidden;
      margin: 20px 0;
      border: 1px solid var(--border);
    }
    
    .matrix-table th {
      background: var(--bg-tertiary);
      padding: 12px 16px;
      text-align: left;
      font-weight: 600;
      position: sticky;
      top: 0;
      z-index: 10;
      border-bottom: 2px solid var(--border);
    }
    
    .matrix-table td {
      padding: 10px 12px;
      border-bottom: 1px solid var(--border);
      vertical-align: middle;
    }
    
    .matrix-table tr:hover td {
      background: rgba(0, 212, 170, 0.05);
    }
    
    .tension-bar {
      height: 8px;
      border-radius: 4px;
      background: var(--bg-tertiary);
      overflow: hidden;
      position: relative;
    }
    
    .tension-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.3s ease;
    }
    
    .health-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }
    
    .health-excellent { background: rgba(0, 255, 136, 0.1); color: var(--excellent); border: 1px solid var(--excellent); }
    .health-good { background: rgba(170, 255, 0, 0.1); color: var(--good); border: 1px solid var(--good); }
    .health-fair { background: rgba(255, 255, 0, 0.1); color: var(--fair); border: 1px solid var(--fair); }
    .health-poor { background: rgba(255, 170, 0, 0.1); color: var(--poor); border: 1px solid var(--poor); }
    .health-critical { background: rgba(255, 71, 87, 0.1); color: var(--critical); border: 1px solid var(--critical); }
    
    .color-preview {
      display: inline-block;
      width: 20px;
      height: 20px;
      border-radius: 4px;
      margin-right: 8px;
      vertical-align: middle;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    
    .file-path {
      font-family: 'SF Mono', monospace;
      font-size: 12px;
      opacity: 0.8;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 300px;
    }
    
    .controls {
      display: flex;
      gap: 10px;
      margin: 20px 0;
      flex-wrap: wrap;
    }
    
    select, input, button {
      padding: 8px 16px;
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      border-radius: 6px;
      color: var(--text-primary);
      font-family: inherit;
    }
    
    button {
      background: linear-gradient(135deg, #3b82f6, #3b82f6);
      border: none;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    button:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 212, 170, 0.3);
    }
    
    .export-options {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
      margin-top: 20px;
    }
    
    .circular-warning {
      color: #3b82f6;
      animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📦 DuoPlus Bundle Matrix Analyzer</h1>
      <p>Real-time bundle analysis with tension metrics and health scoring</p>
      
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Total Files</div>
          <div class="stat-value">${matrix.summary.totalFiles}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Bundle Size</div>
          <div class="stat-value">${this.formatBytes(matrix.summary.totalBytes)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Bundle Health</div>
          <div class="stat-value" style="color: ${this.getHealthColor(matrix.summary.bundleHealth)}">
            ${Math.round(matrix.summary.bundleHealth)}%
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Circular Deps</div>
          <div class="stat-value">${matrix.summary.circularDeps}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Duplicated</div>
          <div class="stat-value">${matrix.summary.duplicatedFiles}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">External Imports</div>
          <div class="stat-value">${matrix.summary.externalImports}</div>
        </div>
      </div>
    </div>
    
    <div class="controls">
      <select id="sort-by">
        <option value="tension:desc">Tension (High → Low)</option>
        <option value="tension:asc">Tension (Low → High)</option>
        <option value="bytes:desc">Size (Large → Small)</option>
        <option value="bytes:asc">Size (Small → Large)</option>
        <option value="depth:desc">Depth (Deep → Shallow)</option>
        <option value="health:desc">Health (Good → Bad)</option>
      </select>
      
      <select id="filter-health">
        <option value="">All Health</option>
        <option value="excellent">Excellent</option>
        <option value="good">Good</option>
        <option value="fair">Fair</option>
        <option value="poor">Poor</option>
        <option value="critical">Critical</option>
      </select>
      
      <input type="text" id="search-files" placeholder="Search files...">
      
      <button onclick="refreshAnalysis()">🔄 Refresh</button>
      <button onclick="exportAnalysis()">📥 Export JSON</button>
      <button onclick="showDependencyGraph()">📊 Show Graph</button>
    </div>
    
    <div class="matrix-table-container">
      <table class="matrix-table">
        <thead>
          <tr>
            <th>File</th>
            <th>Size</th>
            <th>Tension</th>
            <th>Health</th>
            <th>Depth</th>
            <th>Imports</th>
            <th>Exports</th>
            <th>Color</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${this.renderTableRows(nodes)}
        </tbody>
      </table>
    </div>
    
    <div class="export-options">
      <button onclick="takeScreenshot()">📸 Screenshot</button>
      <button onclick="printReport()">🖨️ Print Report</button>
      <button onclick="copyCSV()">📋 Copy CSV</button>
    </div>
  </div>

  <script>
    const matrix = ${JSON.stringify(matrix)};
    let sortedNodes = ${JSON.stringify(nodes)};
    
    function sortTable() {
      const sortBy = document.getElementById('sort-by').value;
      const [key, direction] = sortBy.split(':');
      
      sortedNodes.sort((a, b) => {
        let aVal = a[key];
        let bVal = b[key];
        
        if (key === 'health') {
          const healthOrder = { excellent: 0, good: 1, fair: 2, poor: 3, critical: 4 };
          aVal = healthOrder[a.health];
          bVal = healthOrder[b.health];
        }
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return direction === 'asc' ? aVal - bVal : bVal - aVal;
        }
        
        return 0;
      });
      
      renderTable();
    }
    
    function filterTable() {
      const healthFilter = document.getElementById('filter-health').value;
      const searchTerm = document.getElementById('search-files').value.toLowerCase();
      
      const rows = document.querySelectorAll('.matrix-table tbody tr');
      rows.forEach(row => {
        const health = row.getAttribute('data-health');
        const path = row.querySelector('.file-path').textContent.toLowerCase();
        
        const healthMatch = !healthFilter || health === healthFilter;
        const searchMatch = !searchTerm || path.includes(searchTerm);
        
        row.style.display = healthMatch && searchMatch ? '' : 'none';
      });
    }
    
    function renderTable() {
      const tbody = document.querySelector('.matrix-table tbody');
      tbody.innerHTML = '';
      
      sortedNodes.forEach(node => {
        tbody.innerHTML += \`
          <tr data-health="\${node.health}">
            <td>
              <div class="file-path" title="\${node.path}">\${node.path}</div>
            </td>
            <td>\${formatBytes(node.bytes)}</td>
            <td>
              <div class="tension-bar">
                <div class="tension-fill" 
                     style="width: \${node.tension}%; background: \${node.hsl}"></div>
              </div>
              <span>\${node.tension}%</span>
            </td>
            <td>
              <span class="health-badge health-\${node.health}">
                \${node.health.charAt(0).toUpperCase() + node.health.slice(1)}
              </span>
            </td>
            <td>\${node.depth}</td>
            <td>\${node.imports.length}</td>
            <td>\${node.exports.length}</td>
            <td>
              <div class="color-preview" style="background: \${node.hex}" 
                   title="HSL: \${node.hsl}, HEX: \${node.hex}"></div>
            </td>
            <td>
              \${node.circular ? '<span class="circular-warning" title="Circular dependency">⚠️</span>' : ''}
              \${node.duplicated ? '<span title="Duplicated file">📄×2</span>' : ''}
              \${node.sideEffects ? '<span title="Has side effects">⚡</span>' : ''}
            </td>
          </tr>
        \`;
      });
    }
    
    function formatBytes(bytes) {
      const units = ['B', 'KB', 'MB', 'GB'];
      let size = bytes;
      let unitIndex = 0;
      while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
      }
      return \`\${size.toFixed(2)} \${units[unitIndex]}\`;
    }
    
    function refreshAnalysis() {
      fetch('/api/bundle/analyze')
        .then(r => r.json())
        .then(data => {
          location.reload();
        });
    }
    
    function exportAnalysis() {
      const data = {
        matrix,
        exportedAt: new Date().toISOString(),
        summary: matrix.summary
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'duoplus-bundle-analysis.json';
      a.click();
    }
    
    function showDependencyGraph() {
      // Open dependency visualization
      window.open('/bundle-graph', '_blank');
    }
    
    function takeScreenshot() {
      html2canvas(document.querySelector('.container')).then(canvas => {
        const link = document.createElement('a');
        link.download = 'duoplus-bundle-matrix.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
      });
    }
    
    function copyCSV() {
      const headers = ['File', 'Size', 'Tension', 'Health', 'Depth', 'Imports', 'Exports', 'Color'];
      const csv = [
        headers.join(','),
        ...sortedNodes.map(node => [
          \`"\${node.path}"\`,
          node.bytes,
          node.tension,
          node.health,
          node.depth,
          node.imports.length,
          node.exports.length,
          node.hex
        ].join(','))
      ].join('\\n');
      
      navigator.clipboard.writeText(csv).then(() => {
        alert('CSV copied to clipboard!');
      });
    }
    
    // Initialize
    document.getElementById('sort-by').addEventListener('change', sortTable);
    document.getElementById('filter-health').addEventListener('change', filterTable);
    document.getElementById('search-files').addEventListener('input', filterTable);
    
    // Auto-refresh every 30 seconds
    setInterval(refreshAnalysis, 30000);
  </script>
  
  <script src="https://html2canvas.hertzen.com/dist/html2canvas.min.js"></script>
</body>
</html>
    `;
  }
  
  private static renderTableRows(nodes: BundleNode[]): string {
    return nodes.map(node => `
      <tr data-health="${node.health}">
        <td>
          <div class="file-path" title="${node.path}">${this.truncatePath(node.path)}</div>
        </td>
        <td>${this.formatBytes(node.bytes)}</td>
        <td>
          <div class="tension-bar">
            <div class="tension-fill" 
                 style="width: ${node.tension}%; background: ${node.hsl}"></div>
          </div>
          <span>${node.tension}%</span>
        </td>
        <td>
          <span class="health-badge health-${node.health}">
            ${node.health.charAt(0).toUpperCase() + node.health.slice(1)}
          </span>
        </td>
        <td>${node.depth}</td>
        <td>${node.imports.length}</td>
        <td>${node.exports.length}</td>
        <td>
          <div class="color-preview" style="background: ${node.hex}" 
               title="HSL: ${node.hsl}, HEX: ${node.hex}"></div>
        </td>
        <td>
          ${node.circular ? '<span class="circular-warning" title="Circular dependency">⚠️</span>' : ''}
          ${node.duplicated ? '<span title="Duplicated file">📄×2</span>' : ''}
          ${node.sideEffects ? '<span title="Has side effects">⚡</span>' : ''}
        </td>
      </tr>
    `).join('');
  }
  
  private static formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
  
  private static truncatePath(path: string, maxLength = 40): string {
    if (path.length <= maxLength) return path;
    const start = path.substring(0, maxLength / 2 - 3);
    const end = path.substring(path.length - maxLength / 2 + 3);
    return `${start}...${end}`;
  }
  
  private static getHealthColor(health: number): string {
    if (health >= 80) return '#3b82f6';
    if (health >= 60) return '#3b82f6';
    if (health >= 40) return '#eab308';
    if (health >= 20) return '#3b82f6';
    return '#3b82f6';
  }
}

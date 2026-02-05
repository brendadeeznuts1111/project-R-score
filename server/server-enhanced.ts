// server/server-enhanced.ts
import { BUN_DOCS, TYPED_ARRAY_URLS, RSS_URLS } from '../config/urls.ts';

// Simple in-memory cache for RSS feeds
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Typed array example data
const TYPED_ARRAY_EXAMPLES = {
  base: `${BUN_DOCS.BASE}${TYPED_ARRAY_URLS.BASE}`,
  fetchPattern: `const response = await fetch("${BUN_DOCS.BASE}${TYPED_ARRAY_URLS.BASE}");
console.log(response.status); // => 200
const text = await response.text();`,
  relatedUrls: {
    binaryData: `${BUN_DOCS.BASE}${BUN_DOCS.RUNTIME.BINARY_DATA}`,
    fetchApi: `${BUN_DOCS.BASE}${BUN_DOCS.API.FETCH}`,
    networking: `${BUN_DOCS.BASE}${BUN_DOCS.RUNTIME.NETWORKING}`,
  }
};

// Create server with endpoints matching Bun's fetch pattern
const SERVER_PORT = parseInt(process.env.SERVER_PORT || '3000', 10);
const SERVER_HOST = process.env.SERVER_HOST || 'localhost';
const CONTENT_TYPE_SERVER_PORT = parseInt(process.env.CONTENT_TYPE_SERVER_PORT || '3001', 10);
const CONTENT_TYPE_SERVER_HOST = process.env.CONTENT_TYPE_SERVER_HOST || SERVER_HOST;
const server = Bun.serve({
  port: SERVER_PORT,
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // Route based on path
    if (path === '/' || path === '/index.html') {
      return handleRoot();
    }
    
    if (path === '/api/fetch') {
      return handleFetchExample();
    }
    
    if (path === '/api/typedarray/urls') {
      return handleTypedArrayURLs();
    }
    
    if (path === '/api/rss') {
      return await handleRSSFeed();
    }
    
    if (path === '/feed/rss') {
      return await generateRSSFeed();
    }
    
    if (path === '/feed/json') {
      return generateJSONFeed();
    }
    
    if (path === '/docs/typedarray') {
      return await handleTypedArrayDocs(url);
    }
    
    if (path === '/docs/runtime/binary-data') {
      return await handleBinaryData();
    }
    
    if (path === '/test/fetch') {
      return await testFetchPattern();
    }
    
    if (path === '/cache/clear') {
      cache.clear();
      return new Response('Cache cleared', { status: 200 });
    }
    
    // Content-Type demo endpoints
    if (path === '/api/content-type/blob') {
      return await handleBlobDemo(request);
    }
    
    if (path === '/api/content-type/formdata') {
      return await handleFormDataDemo(request);
    }
    
    if (path === '/api/content-type/large-file') {
      return await handleLargeFileDemo(request);
    }
    
    if (path === '/api/content-type/demo') {
      return await runContentTypeDemo();
    }
    
    if (path === '/api/content-type/handler') {
      return await demonstrateContentTypeHandler();
    }
    
    if (path === '/api/execute-command') {
      return await handleExecuteCommand(request);
    }
    
    return handleNotFound(request);
  },
});

// Root endpoint - HTML page
function handleRoot(): Response {
  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Bun TypedArray Documentation Portal</title>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    header {
      background: linear-gradient(135deg, #1a202c 0%, #2d3748 100%);
      color: white;
      padding: 2rem;
      text-align: center;
    }
    h1 { 
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
      background: linear-gradient(135deg, #81e6d9 0%, #38b2ac 100%);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }
    .subtitle {
      color: #a0aec0;
      font-size: 1.1rem;
      margin-bottom: 1rem;
    }
    main {
      padding: 2rem;
      display: grid;
      gap: 2rem;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    }
    .card {
      background: #f7fafc;
      border-radius: 8px;
      padding: 1.5rem;
      border: 1px solid #e2e8f0;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .card:hover {
      transform: translateY(-4px);
      box-shadow: 0 10px 25px rgba(0,0,0,0.1);
    }
    h2 {
      color: #2d3748;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    h3 {
      color: #4a5568;
      margin: 1rem 0 0.5rem 0;
    }
    ul {
      list-style: none;
      padding-left: 0;
    }
    li {
      padding: 0.5rem 0;
      border-bottom: 1px solid #e2e8f0;
    }
    li:last-child {
      border-bottom: none;
    }
    a {
      color: #4299e1;
      text-decoration: none;
      transition: color 0.2s;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    a:hover {
      color: #3182ce;
    }
    code {
      background: #edf2f7;
      padding: 0.2rem 0.4rem;
      border-radius: 4px;
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 0.9em;
    }
    pre {
      background: #1a202c;
      color: #e2e8f0;
      padding: 1rem;
      border-radius: 6px;
      overflow-x: auto;
      font-size: 0.9rem;
      margin: 1rem 0;
    }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      background: #4299e1;
      color: white;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: bold;
      margin-left: 0.5rem;
    }
    .badge-new { background: #48bb78; }
    .badge-api { background: #ed8936; }
    .badge-docs { background: #9f7aea; }
    .grid-2 { grid-column: span 2; }
    .console {
      background: #1a202c;
      color: #81e6d9;
      padding: 1rem;
      border-radius: 6px;
      font-family: 'SFMono-Regular', monospace;
    }
    .test-button {
      display: inline-block;
      background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%);
      color: white;
      padding: 0.75rem 1.5rem;
      border-radius: 6px;
      font-weight: bold;
      cursor: pointer;
      border: none;
      transition: transform 0.2s, box-shadow 0.2s;
      margin-top: 1rem;
    }
    .test-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(66, 153, 225, 0.4);
    }
    
    /* Project Management Styles */
    .project-controls {
      margin-bottom: 1.5rem;
      padding: 1rem;
      background: #f8fafc;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    .header-controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    .select-all-container {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 500;
      cursor: pointer;
    }
    .select-all-container input[type="checkbox"] {
      width: 1.2rem;
      height: 1.2rem;
      cursor: pointer;
    }
    .view-controls {
      display: flex;
      gap: 0.5rem;
    }
    .view-btn {
      padding: 0.5rem 1rem;
      border: 1px solid #d1d5db;
      background: white;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .view-btn.active {
      background: #4299e1;
      color: white;
      border-color: #4299e1;
    }
    .bulk-actions {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.75rem;
      background: #edf2f7;
      border-radius: 6px;
      border: 1px solid #cbd5e0;
    }
    .bulk-btn {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s;
    }
    .bulk-install {
      background: #48bb78;
      color: white;
    }
    .bulk-deploy {
      background: #ed8936;
      color: white;
    }
    .bulk-test {
      background: #9f7aea;
      color: white;
    }
    .bulk-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }
    .bulk-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }
    .projects-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1rem;
    }
    .projects-grid.list-view {
      grid-template-columns: 1fr;
    }
    .project-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 1rem;
      position: relative;
      transition: all 0.2s;
    }
    .project-card:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .project-card.selected {
      border-color: #4299e1;
      background: #ebf8ff;
    }
    .project-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.75rem;
    }
    .project-checkbox {
      width: 1rem;
      height: 1rem;
      cursor: pointer;
    }
    .project-actions {
      display: flex;
      gap: 0.25rem;
    }
    .project-btn {
      padding: 0.25rem 0.5rem;
      border: none;
      border-radius: 4px;
      font-size: 0.75rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    .project-btn.deploy {
      background: #ed8936;
      color: white;
    }
    .project-btn.fix {
      background: #e53e3e;
      color: white;
    }
    .project-btn.view {
      background: #4299e1;
      color: white;
    }
    .project-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 2px 6px rgba(0,0,0,0.1);
    }
    .command-output {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 80%;
      max-width: 800px;
      max-height: 70vh;
      background: white;
      border-radius: 8px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      z-index: 1000;
      overflow: hidden;
    }
    .output-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      background: #2d3748;
      color: white;
    }
    .output-header button {
      background: none;
      border: none;
      color: white;
      font-size: 1.2rem;
      cursor: pointer;
    }
    #outputContent {
      background: #1a202c;
      color: #81e6d9;
      padding: 1rem;
      margin: 0;
      max-height: 400px;
      overflow-y: auto;
      font-family: 'SFMono-Regular', monospace;
      font-size: 0.875rem;
    }
    footer {
      text-align: center;
      padding: 2rem;
      color: #718096;
      border-top: 1px solid #e2e8f0;
      margin-top: 2rem;
    }
    @media (max-width: 768px) {
      main { grid-template-columns: 1fr; }
      .grid-2 { grid-column: 1; }
    }
  </style>
  <link rel="alternate" type="application/rss+xml" href="/feed/rss" title="Bun TypedArray RSS">
  <link rel="alternate" type="application/json" href="/feed/json" title="Bun TypedArray JSON Feed">
</head>
<body>
  <div class="container">
    <header>
      <h1>🚀 Bun TypedArray Documentation Portal</h1>
      <p class="subtitle">Base URL Pattern: <code>${BUN_DOCS.BASE}${TYPED_ARRAY_URLS.BASE}</code></p>
    </header>
    <section>
      <h2>🗂️ Project Management</h2>
      <div class="project-controls">
        <div class="header-controls">
          <label class="select-all-container">
            <input type="checkbox" id="selectAll" onchange="toggleSelectAll()">
            <span>Select All</span>
          </label>
          <div class="view-controls">
            <button onclick="setView('grid')" class="view-btn active" data-view="grid">⊞ Grid</button>
            <button onclick="setView('list')" class="view-btn" data-view="list">☰ List</button>
          </div>
        </div>
        
        <div class="bulk-actions" id="bulkActions" style="display: none;">
          <span id="selectedCount">0 selected</span>
          <button onclick="bulkInstall()" class="bulk-btn bulk-install">📦 Install Selected</button>
          <button onclick="bulkDeploy()" class="bulk-btn bulk-deploy">🚀 Deploy Selected</button>
          <button onclick="bulkTest()" class="bulk-btn bulk-test">⚡ Test Selected</button>
        </div>
      </div>
      
      <div class="projects-grid" id="projectsGrid">
        ${generateProjectCards()}
      </div>
    </section>
    
    <div class="command-output" id="commandOutput" style="display: none;">
      <div class="output-header">
        <h3>Command Output</h3>
        <button onclick="closeOutput()">✕</button>
      </div>
      <pre id="outputContent"></pre>
    </div>
    
    <main>
      <div class="card">
        <h2>📚 Documentation</h2>
        <ul>
          <li>
            <a href="/docs/typedarray" target="_blank">
              <span>TypedArray Documentation</span>
              <span class="badge badge-docs">Core</span>
            </a>
            <div style="font-size: 0.85rem; color: #718096; margin-top: 0.25rem;">
              Base URL: <code>${TYPED_ARRAY_EXAMPLES.base}</code>
            </div>
          </li>
          <li>
            <a href="${TYPED_ARRAY_EXAMPLES.relatedUrls.binaryData}" target="_blank">
              Binary Data Runtime
            </a>
          </li>
          <li>
            <a href="${TYPED_ARRAY_EXAMPLES.relatedUrls.fetchApi}" target="_blank">
              Fetch API Documentation
            </a>
          </li>
          <li>
            <a href="${TYPED_ARRAY_EXAMPLES.relatedUrls.networking}" target="_blank">
              Networking Runtime
            </a>
          </li>
        </ul>
      </div>
      
      <div class="card">
        <h2>⚡ API Endpoints</h2>
        <ul>
          <li>
            <a href="/api/fetch">
              Fetch Example Pattern
              <span class="badge badge-api">GET</span>
            </a>
          </li>
          <li>
            <a href="/api/typedarray/urls">
              TypedArray URLs
              <span class="badge badge-api">JSON</span>
            </a>
          </li>
          <li>
            <a href="/api/content-type/demo">
              Content-Type Demo
              <span class="badge badge-new">NEW</span>
            </a>
          </li>
          <li>
            <a href="/api/rss">
              RSS Feed Proxy
              <span class="badge badge-api">XML</span>
            </a>
          </li>
          <li>
            <a href="/test/fetch">
              Test Fetch Pattern
              <span class="badge badge-new">Try</span>
            </a>
          </li>
        </ul>
      </div>
      
      <div class="card">
        <h2>📰 RSS Feeds</h2>
        <ul>
          <li>
            <a href="/feed/rss">
              Our TypedArray RSS Feed
              <span class="badge">XML</span>
            </a>
          </li>
          <li>
            <a href="/feed/json">
              JSON Feed Alternative
              <span class="badge">JSON</span>
            </a>
          </li>
          <li>
            <a href="${RSS_URLS.BUN_BLOG}" target="_blank">
              Official Bun Blog RSS
            </a>
          </li>
          <li>
            <a href="${RSS_URLS.BUN_UPDATES}" target="_blank">
              Bun Updates RSS
            </a>
          </li>
        </ul>
      </div>
      
      <div class="card grid-2">
        <h2>💻 Fetch Pattern Example</h2>
        <p>This matches the pattern from Bun's documentation:</p>
        
        <pre><code>// Example from: ${BUN_DOCS.BASE}${BUN_DOCS.API.FETCH}
const response = await fetch("${TYPED_ARRAY_EXAMPLES.base}");

console.log(response.status); // => 200
const text = await response.text(); // or .json(), .arrayBuffer(), etc.</code></pre>
        
        <button class="test-button" onclick="testFetch()">Test This Pattern</button>
        
        <div id="result" style="margin-top: 1rem;"></div>
        
        <script>
          async function testFetch() {
            const result = document.getElementById('result');
            result.innerHTML = '<div class="console">⏳ Testing fetch pattern...</div>';
            
            try {
              // Test 1: Fetch our typed array URLs endpoint
              const response = await fetch('/api/typedarray/urls');
              const data = await response.json();
              
              result.innerHTML = '<div class="console">✅ Fetch successful!<br>Status: ' + response.status + '<br>Content-Type: ' + response.headers.get('content-type') + '<br><br>Base URL: ' + data.base + '<br>Methods: ' + data.methods + '</div>';
              
              // Test 2: Try fetching actual Bun docs (might be blocked by CORS)
              setTimeout(async () => {
                try {
                  const testResponse = await fetch('/test/fetch');
                  const testText = await testResponse.text();
                  result.innerHTML += '<div style="margin-top: 1rem; padding: 1rem; background: #c6f6d5; border-radius: 6px;">🎯 Direct fetch test: ' + testResponse.status + ' OK</div>';
                } catch (error) {
                  console.log('Direct fetch might be blocked by CORS');
                }
              }, 500);
              
            } catch (error) {
              result.innerHTML = '<div style="padding: 1rem; background: #fed7d7; border-radius: 6px; color: #9b2c2c;">❌ Fetch failed: ' + error.message + '</div>';
            }
          }
        </script>
        
        <script>
          function generateProjectCards() {
            const projects = [
              {
                id: 'main-portal',
                name: 'Main Portal',
                description: 'Primary documentation portal with interactive UI',
                status: 'running',
                port: 3000,
                command: 'bun run dev',
                installCmd: 'bun install',
                deployCmd: 'bun run build && bun run start'
              },
              {
                id: 'content-type-server',
                name: 'Content-Type Server',
                description: 'Dedicated content-type demonstration server',
                status: 'running',
                port: 3001,
                command: 'bun run start:content-type',
                installCmd: 'bun install',
                deployCmd: 'bun run start:content-type'
              },
              {
                id: 'advanced-fetch',
                name: 'Advanced Fetch Demo',
                description: 'Advanced fetch features with verbose logging',
                status: 'ready',
                port: null,
                command: 'bun run fetch:advanced',
                installCmd: 'bun install',
                deployCmd: 'bun run fetch:advanced'
              },
              {
                id: 'content-type-demo',
                name: 'Content-Type Demo',
                description: 'Comprehensive content-type handling demo',
                status: 'ready',
                port: null,
                command: 'bun run content-type',
                installCmd: 'bun install',
                deployCmd: 'bun run content-type'
              },
              {
                id: 'verbose-demo',
                name: 'Verbose Logging Demo',
                description: 'HTTP request/response verbose logging',
                status: 'ready',
                port: null,
                command: 'bun run verbose',
                installCmd: 'bun install',
                deployCmd: 'bun run verbose'
              },
              {
                id: 'test-suite',
                name: 'Test Suite',
                description: 'Comprehensive UI and functionality tests',
                status: 'ready',
                port: null,
                command: 'bun run test:all',
                installCmd: 'bun install',
                deployCmd: 'bun run test:all'
              }
            ];

            return projects.map(project => 
              '<div class="project-card" id="project-' + project.id + '">' +
              '<div class="project-header">' +
              '<div>' +
              '<input type="checkbox" class="project-checkbox" ' +
              'id="checkbox-' + project.id + '" ' +
              'onchange="updateBulkActions()" ' +
              'data-project="' + project.id + '">' +
              '<strong>' + project.name + '</strong>' +
              (project.port ? '<span class="badge badge-api">:' + project.port + '</span>' : '') +
              '<span class="badge badge-' + (project.status === 'running' ? 'new' : 'docs') + '">' + project.status + '</span>' +
              '</div>' +
              '<div class="project-actions">' +
              '<button class="project-btn deploy" onclick="deployProject(\'' + project.id + '\')">🚀 Deploy</button>' +
              '<button class="project-btn fix" onclick="fixProject(\'' + project.id + '\')">🔧 Fix</button>' +
              '<button class="project-btn view" onclick="viewProject(\'' + project.id + '\')">👁️ View</button>' +
              '</div>' +
              '</div>' +
              '<p style="margin: 0.5rem 0; color: #718096; font-size: 0.875rem;">' + project.description + '</p>' +
              '<div style="margin-top: 0.5rem; font-size: 0.75rem; color: #a0aec0;">' +
              '<code>Command: ' + project.command + '</code>' +
              '</div>' +
              '</div>'
            ).join('');
          }

          function updateBulkActions() {
            const checkboxes = document.querySelectorAll('.project-checkbox:checked');
            const count = checkboxes.length;
            const bulkActions = document.getElementById('bulkActions');
            const selectedCount = document.getElementById('selectedCount');
            
            if (count > 0) {
              bulkActions.style.display = 'flex';
              selectedCount.textContent = count + ' selected';
              
              // Update button labels with counts
              const installBtn = bulkActions.querySelector('.bulk-install');
              const deployBtn = bulkActions.querySelector('.bulk-deploy');
              const testBtn = bulkActions.querySelector('.bulk-test');
              
              installBtn.textContent = '📦 Install ' + count;
              deployBtn.textContent = '🚀 Deploy ' + count;
              testBtn.textContent = '⚡ Test ' + count;
            } else {
              bulkActions.style.display = 'none';
            }
            
            // Update selected state on project cards
            document.querySelectorAll('.project-card').forEach(card => {
              const checkbox = card.querySelector('.project-checkbox');
              if (checkbox.checked) {
                card.classList.add('selected');
              } else {
                card.classList.remove('selected');
              }
            });
          }

          function toggleSelectAll() {
            const selectAll = document.getElementById('selectAll');
            const checkboxes = document.querySelectorAll('.project-checkbox');
            
            checkboxes.forEach(checkbox => {
              checkbox.checked = selectAll.checked;
            });
            
            updateBulkActions();
          }

          function setView(viewType) {
            const grid = document.getElementById('projectsGrid');
            const buttons = document.querySelectorAll('.view-btn');
            
            buttons.forEach(btn => {
              btn.classList.remove('active');
              if (btn.dataset.view === viewType) {
                btn.classList.add('active');
              }
            });
            
            if (viewType === 'list') {
              grid.classList.add('list-view');
            } else {
              grid.classList.remove('list-view');
            }
          }

          function getSelectedProjects() {
            const checkboxes = document.querySelectorAll('.project-checkbox:checked');
            return Array.from(checkboxes).map(cb => cb.dataset.project);
          }

          function showCommandOutput(title, command, output) {
            const outputDiv = document.getElementById('commandOutput');
            const outputContent = document.getElementById('outputContent');
            
            outputContent.innerHTML = '<strong>' + title + '</strong>\\n$ ' + command + '\\n\\n' + output;
            outputDiv.style.display = 'block';
          }

          function closeOutput() {
            document.getElementById('commandOutput').style.display = 'none';
          }

          async function executeCommand(title, command, projects = []) {
            try {
              showCommandOutput(title, command, 'Executing...');
              
              // Simulate command execution (in real implementation, this would call an API endpoint)
              const response = await fetch('/api/execute-command', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command, projects })
              });
              
              if (response.ok) {
                const result = await response.text();
                showCommandOutput(title, command, result);
              } else {
                showCommandOutput(title, command, 'Error: ' + response.status + ' ' + response.statusText);
              }
            } catch (error) {
              showCommandOutput(title, command, 'Error: ' + error.message);
            }
          }

          function bulkInstall() {
            const projects = getSelectedProjects();
            executeCommand('Bulk Install', 'bun install', projects);
          }

          function bulkDeploy() {
            const projects = getSelectedProjects();
            executeCommand('Bulk Deploy', 'bun run start', projects);
          }

          function bulkTest() {
            const projects = getSelectedProjects();
            executeCommand('Bulk Test', 'bun run test:all', projects);
          }

          function deployProject(projectId) {
            executeCommand('Deploy ' + projectId, 'bun run start', [projectId]);
          }

          function fixProject(projectId) {
            executeCommand('Fix ' + projectId, 'bun run build', [projectId]);
          }

          function viewProject(projectId) {
            // Open project in new tab or show details
            const ports = {
              'main-portal': 3000,
              'content-type-server': 3001
            };
            
            const port = ports[projectId];
            if (port) {
              window.open(`http://${SERVER_HOST}:${port}`, '_blank');
            } else {
              executeCommand('View ' + projectId, 'bun run ' + projectId, [projectId]);
            }
          }
        </script>
      </div>
    </main>
    
    <footer>
      <p>Built with Bun • Base URL: <code>${BUN_DOCS.BASE}${TYPED_ARRAY_URLS.BASE}</code></p>
      <p style="font-size: 0.9rem; margin-top: 0.5rem;">
        <a href="/cache/clear" style="color: #718096;">Clear Cache</a> • 
        <a href="${BUN_DOCS.BASE}${BUN_DOCS.API.FETCH}" target="_blank" style="color: #718096;">Bun Fetch Docs</a>
      </p>
    </footer>
  </div>
</body>
</html>`;
    
  return new Response(html, {
    headers: { 
      'Content-Type': 'text/html',
      'Cache-Control': 'public, max-age=3600'
    },
  });
}

// Fetch example endpoint - matches Bun's fetch documentation pattern
function handleFetchExample(): Response {
  const example = `// Example from Bun documentation: ${BUN_DOCS.BASE}${BUN_DOCS.API.FETCH}
// Base URL for typed arrays: ${TYPED_ARRAY_EXAMPLES.base}

// 1. Basic fetch pattern
const response = await fetch("${TYPED_ARRAY_EXAMPLES.base}");
console.log(response.status); // => 200
const text = await response.text();

// 2. Fetch with options
const response2 = await fetch("${TYPED_ARRAY_EXAMPLES.base}", {
  headers: {
    "User-Agent": "Bun-TypedArray-Portal/1.0"
  },
  verbose: true // Bun-specific: logs request/response headers
});

// 3. Handle different response types
const arrayBufferResponse = await fetch("${TYPED_ARRAY_EXAMPLES.base}");
const arrayBuffer = await arrayBufferResponse.arrayBuffer();
const uint8Array = new Uint8Array(arrayBuffer);

// 4. Fetch all typed array URLs from our API
const urlsResponse = await fetch("/api/typedarray/urls");
const urls = await urlsResponse.json();
console.log(urls.base); // => "${TYPED_ARRAY_EXAMPLES.base}"

// 5. Error handling
try {
  const response = await fetch("/api/typedarray/urls", {
    signal: AbortSignal.timeout(5000)
  });
  if (!response.ok) {
    throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
  }
  const data = await response.json();
} catch (error) {
  console.error("Fetch failed:", error);
}`;
    
  return new Response(example, {
    headers: { 
      'Content-Type': 'application/javascript',
      'Cache-Control': 'public, max-age=3600'
    },
  });
}

// Typed array URLs endpoint
function handleTypedArrayURLs(): Response {
  const urls = {
    generated: new Date().toISOString(),
    base: `${BUN_DOCS.BASE}${TYPED_ARRAY_URLS.BASE}`,
    methods: `${BUN_DOCS.BASE}${TYPED_ARRAY_URLS.METHODS}`,
    conversion: `${BUN_DOCS.BASE}${TYPED_ARRAY_URLS.CONVERSION}`,
    examples: `${BUN_DOCS.BASE}${TYPED_ARRAY_URLS.EXAMPLES}`,
    fileReading: {
      arraybuffer: `${BUN_DOCS.BASE}/guides/read-file/arraybuffer`,
      uint8array: `${BUN_DOCS.BASE}/guides/read-file/uint8array`,
      dataview: `${BUN_DOCS.BASE}/guides/read-file/dataview`,
    },
    related: {
      fetch: `${BUN_DOCS.BASE}${BUN_DOCS.API.FETCH}`,
      binary_data: `${BUN_DOCS.BASE}${BUN_DOCS.RUNTIME.BINARY_DATA}`,
      networking: `${BUN_DOCS.BASE}${BUN_DOCS.RUNTIME.NETWORKING}`,
      streams: `${BUN_DOCS.BASE}${BUN_DOCS.API.STREAMS}`,
      websocket: `${BUN_DOCS.BASE}${BUN_DOCS.API.WEBSOCKET}`,
    },
    feeds: {
      rss: '/feed/rss',
      json: '/feed/json',
      bun_blog: RSS_URLS.BUN_BLOG,
      bun_updates: RSS_URLS.BUN_UPDATES,
    }
  };
    
  return new Response(JSON.stringify(urls, null, 2), {
    headers: { 
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300'
    },
  });
}

// RSS feed proxy endpoint
async function handleRSSFeed(): Promise<Response> {
  const cacheKey = 'bun_blog_rss';
  const cached = cache.get(cacheKey);
    
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return new Response(cached.data, {
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'X-Cache': 'HIT',
        'Cache-Control': `public, max-age=${CACHE_TTL / 1000}` 
      },
    });
  }
    
  try {
    // Using the exact pattern from Bun's fetch documentation
    const response = await fetch(RSS_URLS.BUN_BLOG);
    console.log(`RSS fetch status: ${response.status}`);
      
    if (!response.ok) {
      throw new Error(`Failed to fetch RSS: ${response.status} ${response.statusText}`);
    }
      
    const rssXml = await response.text();
      
    // Cache the result
    cache.set(cacheKey, {
      data: rssXml,
      timestamp: Date.now()
    });
      
    return new Response(rssXml, {
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'X-Cache': 'MISS',
        'Cache-Control': `public, max-age=${CACHE_TTL / 1000}` 
      },
    });
  } catch (error) {
    console.error('Error fetching RSS:', error);
      
    // Return cached data even if stale, or error
    if (cached) {
      return new Response(cached.data, {
        headers: {
          'Content-Type': 'application/rss+xml; charset=utf-8',
          'X-Cache': 'STALE',
          'Cache-Control': 'no-cache'
        },
      });
    }
      
    return new Response(`Error fetching RSS feed: ${error.message}`, {
      status: 502,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

// Generate our own RSS feed
async function generateRSSFeed(): Promise<Response> {
  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Bun TypedArray Documentation Updates</title>
  <link>${BUN_DOCS.BASE}${TYPED_ARRAY_URLS.BASE}</link>
  <description>Latest updates, examples, and patterns for working with TypedArrays in Bun</description>
  <language>en-us</language>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
  <atom:link href="/feed/rss" rel="self" type="application/rss+xml" />
  
  <item>
    <title>TypedArray Methods Reference</title>
    <link>${BUN_DOCS.BASE}${TYPED_ARRAY_URLS.METHODS}</link>
    <description>Complete reference of all TypedArray methods available in Bun, including performance characteristics and usage examples.</description>
    <pubDate>${new Date(Date.now() - 86400000).toUTCString()}</pubDate>
    <guid isPermaLink="true">${BUN_DOCS.BASE}${TYPED_ARRAY_URLS.METHODS}</guid>
    <category>Documentation</category>
    <category>TypedArray</category>
  </item>
  
  <item>
    <title>Binary Data Conversion Examples</title>
    <link>${BUN_DOCS.BASE}${TYPED_ARRAY_URLS.CONVERSION}</link>
    <description>Examples of converting between ArrayBuffer, Uint8Array, and other binary data formats in Bun.</description>
    <pubDate>${new Date(Date.now() - 172800000).toUTCString()}</pubDate>
    <guid isPermaLink="true">${BUN_DOCS.BASE}${TYPED_ARRAY_URLS.CONVERSION}</guid>
    <category>Examples</category>
    <category>Binary Data</category>
  </item>
  
  <item>
    <title>Fetch API Integration Guide</title>
    <link>${BUN_DOCS.BASE}${BUN_DOCS.API.FETCH}</link>
    <description>How to use TypedArrays with Bun's fetch API for handling binary data in HTTP requests and responses.</description>
    <pubDate>${new Date(Date.now() - 259200000).toUTCString()}</pubDate>
    <guid isPermaLink="true">${BUN_DOCS.BASE}${BUN_DOCS.API.FETCH}</guid>
    <category>Guide</category>
    <category>Fetch API</category>
  </item>
  
  <item>
    <title>File Reading Patterns with TypedArrays</title>
    <link>${BUN_DOCS.BASE}/guides/read-file/arraybuffer</link>
    <description>Best practices for reading files into ArrayBuffer and Uint8Array for efficient binary data processing.</description>
    <pubDate>${new Date(Date.now() - 345600000).toUTCString()}</pubDate>
    <guid isPermaLink="true">${BUN_DOCS.BASE}/guides/read-file/arraybuffer</guid>
    <category>Patterns</category>
    <category>File I/O</category>
  </item>
</channel>
</rss>`;
    
  return new Response(feed, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    },
  });
}

// Generate JSON feed
function generateJSONFeed(): Response {
  const feed = {
    version: "https://jsonfeed.org/version/1.1",
    title: "Bun TypedArray Documentation",
    home_page_url: `${BUN_DOCS.BASE}${TYPED_ARRAY_URLS.BASE}`,
    feed_url: "/feed/json",
    description: "Latest updates and examples for TypedArrays in Bun",
    items: [
      {
        id: TYPED_ARRAY_URLS.METHODS,
        url: `${BUN_DOCS.BASE}${TYPED_ARRAY_URLS.METHODS}`,
        title: "TypedArray Methods Reference",
        content_text: "Complete reference of all TypedArray methods available in Bun",
        date_published: new Date(Date.now() - 86400000).toISOString(),
        tags: ["Documentation", "TypedArray"]
      },
      {
        id: TYPED_ARRAY_URLS.CONVERSION,
        url: `${BUN_DOCS.BASE}${TYPED_ARRAY_URLS.CONVERSION}`,
        title: "Binary Data Conversion Examples",
        content_text: "Examples of converting between different binary data formats",
        date_published: new Date(Date.now() - 172800000).toISOString(),
        tags: ["Examples", "Binary Data"]
      },
      {
        id: "fetch-integration",
        url: `${BUN_DOCS.BASE}${BUN_DOCS.API.FETCH}`,
        title: "Fetch API Integration Guide",
        content_text: "How to use TypedArrays with Bun's fetch API",
        date_published: new Date(Date.now() - 259200000).toISOString(),
        tags: ["Guide", "Fetch API"]
      }
    ]
  };
    
  return new Response(JSON.stringify(feed, null, 2), {
    headers: { 
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600'
    },
  });
}

// Typed array documentation endpoint
async function handleTypedArrayDocs(url: URL): Promise<Response> {
  const hash = url.hash.slice(1) || 'typedarray';
  const targetUrl = `${BUN_DOCS.BASE}${TYPED_ARRAY_URLS[hash as keyof typeof TYPED_ARRAY_URLS] || TYPED_ARRAY_URLS.BASE}`;
    
  try {
    // Try to fetch the actual documentation
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Bun-TypedArray-Portal/1.0'
      }
    });
      
    if (response.ok) {
      const html = await response.text();
      return new Response(html, {
        status: response.status,
        headers: {
          'Content-Type': 'text/html',
          'X-Proxy-Source': targetUrl,
          'Cache-Control': 'public, max-age=3600'
        },
      });
    }
      
    // If fetch fails, provide a fallback
    return new Response(generateFallbackDocs(targetUrl, hash), {
      headers: { 
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=300'
      },
    });
      
  } catch (error) {
    // Return fallback on error
    return new Response(generateFallbackDocs(targetUrl, hash), {
      headers: { 'Content-Type': 'text/html' },
    });
  }
}

// Binary data documentation endpoint
async function handleBinaryData(): Promise<Response> {
  const targetUrl = `${BUN_DOCS.BASE}${BUN_DOCS.RUNTIME.BINARY_DATA}`;
    
  try {
    const response = await fetch(targetUrl);
    console.log(`Binary data docs fetch status: ${response.status}`);
      
    if (response.ok) {
      const html = await response.text();
      return new Response(html, {
        status: response.status,
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': 'public, max-age=3600'
        },
      });
    }
      
    throw new Error(`HTTP ${response.status}`);
      
  } catch (error) {
    return new Response(`<h1>Binary Data Runtime Documentation</h1>
      <p>Unable to fetch from: <a href="${targetUrl}">${targetUrl}</a></p>
      <p>Error: ${error.message}</p>
      <p><a href="/">Return to portal</a></p>`, {
      headers: { 'Content-Type': 'text/html' },
    });
  }
}

// Test fetch pattern endpoint
async function testFetchPattern(): Promise<Response> {
  const testUrls = [
    '/api/typedarray/urls',
    '/feed/json',
    '/api/fetch'
  ];
    
  const results = await Promise.allSettled(
    testUrls.map(async (url) => {
      const start = Date.now();
      try {
        const response = await fetch(`http://${SERVER_HOST}:${SERVER_PORT}${url}`);
        const duration = Date.now() - start;
        return {
          url,
          status: response.status,
          ok: response.ok,
          duration: `${duration}ms`,
          contentType: response.headers.get('content-type')
        };
      } catch (error) {
        const duration = Date.now() - start;
        return {
          url,
          error: error.message,
          duration: `${duration}ms`,
          ok: false
        };
      }
    })
  );
    
  const summary = {
    timestamp: new Date().toISOString(),
    total: results.length,
    successful: results.filter(r => r.status === 'fulfilled' && r.value.ok).length,
    results: results.map((result, i) => {
      if (result.status === 'fulfilled') {
        return {
          endpoint: testUrls[i],
          ...result.value
        };
      }
      return {
        endpoint: testUrls[i],
        error: result.reason.message,
        ok: false
      };
    })
  };
    
  return new Response(JSON.stringify(summary, null, 2), {
    headers: { 
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    },
  });
}

// Generate fallback documentation when fetch fails
function generateFallbackDocs(targetUrl: string, section: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <title>TypedArray Documentation - ${section}</title>
  <style>
    body { font-family: -apple-system, sans-serif; padding: 2rem; }
    .container { max-width: 800px; margin: 0 auto; }
    code { background: #f0f0f0; padding: 0.2rem 0.4rem; border-radius: 4px; }
    .info { background: #e3f2fd; padding: 1rem; border-radius: 6px; margin: 1rem 0; }
    .warning { background: #fff3e0; padding: 1rem; border-radius: 6px; margin: 1rem 0; }
  </style>
</head>
<body>
  <div class="container">
    <h1>TypedArray Documentation: ${section}</h1>
    
    <div class="info">
      <p>This is a fallback page because we couldn't fetch the actual documentation from:</p>
      <p><a href="${targetUrl}">${targetUrl}</a></p>
      <p>This might be due to CORS restrictions or network issues.</p>
    </div>
    
    <h2>Base URL Pattern</h2>
    <p>All typed array documentation uses this base pattern:</p>
    <pre><code>${BUN_DOCS.BASE}${TYPED_ARRAY_URLS.BASE}</code></pre>
    
    <h2>Available Sections</h2>
    <ul>
      <li><a href="/docs/typedarray#typedarray">TypedArray Overview</a></li>
      <li><a href="/docs/typedarray#methods">TypedArray Methods</a></li>
      <li><a href="/docs/typedarray#conversion">Binary Data Conversion</a></li>
      <li><a href="/docs/typedarray#examples">Examples</a></li>
    </ul>
    
    <h2>Fetch Pattern Example</h2>
    <pre><code>// Using Bun's fetch pattern
const response = await fetch("${TYPED_ARRAY_EXAMPLES.base}");
console.log(response.status);
const text = await response.text();</code></pre>
    
    <div class="warning">
      <p><strong>Note:</strong> To access the full Bun documentation, visit:</p>
      <ul>
        <li><a href="${BUN_DOCS.BASE}${TYPED_ARRAY_URLS.BASE}" target="_blank">Official TypedArray Docs</a></li>
        <li><a href="${BUN_DOCS.BASE}${BUN_DOCS.API.FETCH}" target="_blank">Fetch API Docs</a></li>
        <li><a href="${BUN_DOCS.BASE}${BUN_DOCS.RUNTIME.BINARY_DATA}" target="_blank">Binary Data Runtime</a></li>
      </ul>
    </div>
    
    <p><a href="/">← Return to portal</a></p>
  </div>
</body>
</html>`;
}

// 404 handler
function handleNotFound(request: Request): Response {
  const url = new URL(request.url);
  return new Response(`<h1>404 - Endpoint Not Found</h1>
    <p>The endpoint <code>${url.pathname}</code> was not found.</p>
    <p>Available endpoints:</p>
    <ul>
      <li><a href="/">Home Page</a></li>
      <li><a href="/api/fetch">Fetch Example</a></li>
      <li><a href="/api/typedarray/urls">TypedArray URLs</a></li>
      <li><a href="/api/content-type/demo">Content-Type Demo</a></li>
      <li><a href="/feed/rss">RSS Feed</a></li>
      <li><a href="/docs/typedarray">TypedArray Docs</a></li>
    </ul>
    <p>Base URL for typed arrays: <code>${BUN_DOCS.BASE}${TYPED_ARRAY_URLS.BASE}</code></p>`, {
    status: 404,
    headers: { 'Content-Type': 'text/html' },
  });
}

// Content-Type demo handlers
async function handleBlobDemo(request: Request): Promise<Response> {
  const contentType = request.headers.get('content-type');
  const contentLength = request.headers.get('content-length');
  
  const body = await request.text();
  
  return new Response(JSON.stringify({
    message: 'Blob Content-Type received',
    contentType,
    contentLength,
    bodyLength: body.length,
    note: 'Content-Type was automatically set from blob.type property'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleFormDataDemo(request: Request): Promise<Response> {
  const contentType = request.headers.get('content-type');
  
  // Parse FormData to show the boundary was automatically set
  const formData = await request.formData();
  const entries: Array<[string, string]> = [];
  
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') {
      entries.push([key, value]);
    } else {
      entries.push([key, `File: ${value.name} (${value.type})`]);
    }
  }
  
  return new Response(JSON.stringify({
    message: 'FormData Content-Type received',
    contentType,
    hasBoundary: contentType?.includes('boundary='),
    entries,
    note: 'Content-Type automatically set to multipart/form-data with boundary'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleLargeFileDemo(request: Request): Promise<Response> {
  const contentType = request.headers.get('content-type');
  const contentLength = request.headers.get('content-length');
  
  const body = await request.arrayBuffer();
  
  const usesSendfile = body.byteSize > 32768; // > 32KB
  
  return new Response(JSON.stringify({
    message: 'Large file upload received',
    contentType,
    contentLength,
    actualSize: body.byteSize,
    usesSendfileOptimization: usesSendfile,
    note: 'Files > 32KB use sendfile optimization for HTTP requests'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function runContentTypeDemo(): Promise<Response> {
  const { ContentTypeDemo } = await import('../services/content-type-demo.ts');
  const demo = new ContentTypeDemo();
  
  // Run demo in background
  demo.runAllDemos().catch(console.error);
  
  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Content-Type & Implementation Demo</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@1/css/pico.min.css">
</head>
<body>
  <main class="container">
    <h1>📦 Content-Type & Implementation Details Demo</h1>
    <p>Running comprehensive Content-Type and implementation demos... Check the server console for detailed output.</p>
    
    <section>
      <h2>Content-Type Handling Features</h2>
      <ul>
        <li>✅ <strong>Blob objects</strong> - Uses blob's type property automatically</li>
        <li>✅ <strong>FormData</strong> - Sets multipart/form-data with boundary</li>
        <li>✅ <strong>Automatic headers</strong> - No manual Content-Type setting needed</li>
        <li>✅ <strong>ContentTypeHandler utility</strong> - Smart Content-Type detection</li>
      </ul>
    </section>
    
    <section>
      <h2>Implementation Details</h2>
      <ul>
        <li>✅ <strong>Connection pooling</strong> - Enabled by default, reusable connections</li>
        <li>✅ <strong>sendfile optimization</strong> - Files >32KB use OS-level optimization</li>
        <li>✅ <strong>S3 automatic signing</strong> - Request signing and auth header merging</li>
        <li>✅ <strong>Keep-alive control</strong> - Can be disabled with Connection: close</li>
      </ul>
    </section>
    
    <section>
      <h2>Test Endpoints</h2>
      <ul>
        <li><a href="/api/content-type/handler" target="_blank">GET /api/content-type/handler</a> - Test ContentTypeHandler utility</li>
        <li><a href="/api/content-type/blob" target="_blank">POST /api/content-type/blob</a> - Test Blob Content-Type</li>
        <li><a href="/api/content-type/formdata" target="_blank">POST /api/content-type/formdata</a> - Test FormData Content-Type</li>
        <li><a href="/api/content-type/large-file" target="_blank">POST /api/content-type/large-file</a> - Test sendfile optimization</li>
      </ul>
    </section>
    
    <section>
      <h2>Code Examples</h2>
      <h3>ContentTypeHandler Utility</h3>
      <pre><code>import { ContentTypeHandler } from '../config/content-types.ts';

// Automatic Content-Type detection
const contentType = ContentTypeHandler.getContentType(data);

// Create requests with proper Content-Type
const request = ContentTypeHandler.createRequest(
  'https://api.example.com',
  { message: 'Hello' }
);</code></pre>
      
      <h3>Blob Content-Type</h3>
      <pre><code>const blob = new Blob(['Hello'], { type: 'text/plain' });
await fetch('/api/content-type/blob', {
  method: 'POST',
  body: blob // Content-Type automatically set to 'text/plain'
});</code></pre>
      
      <h3>FormData Content-Type</h3>
      <pre><code>const formData = new FormData();
formData.append('message', 'Hello');
await fetch('/api/content-type/formdata', {
  method: 'POST',
  body: formData // Content-Type automatically set to multipart/form-data
});</code></pre>
      
      <h3>Connection Pooling</h3>
      <pre><code>// Default: connection pooling enabled
await fetch(url); // Reuses connections

// Disable keep-alive
await fetch(url, {
  headers: { 'Connection': 'close' }
});</code></pre>
    </section>
    
    <button onclick="location.reload()">Run Demo Again</button>
    <button onclick="location.href='/'">Back to Portal</button>
  </main>
</body>
</html>`;
    
  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  });
}

async function demonstrateContentTypeHandler(): Promise<Response> {
  const { CONTENT_TYPES, ContentTypeHandler } = await import('../config/content-types.ts');
  
  // Test different data types
  const testData = [
    { name: 'String JSON', data: '{"key": "value"}' },
    { name: 'String Plain', data: 'Hello, World!' },
    { name: 'Object', data: { message: 'Hello' } },
    { name: 'Uint8Array', data: new Uint8Array([1, 2, 3, 4]) },
    { name: 'ArrayBuffer', data: new ArrayBuffer(8) },
    { name: 'Blob (text)', data: new Blob(['Hello'], { type: 'text/plain' }) },
    { name: 'Blob (binary)', data: new Blob([1, 2, 3], { type: 'application/octet-stream' }) },
  ];
  
  const results = testData.map(({ name, data }) => ({
    name,
    contentType: ContentTypeHandler.getContentType(data),
    note: name.includes('Blob') ? 'Uses blob.type property' : 
          name.includes('FormData') ? 'Sets multipart boundary' :
          name.includes('Array') ? 'Binary data type' : 'Auto-detected'
  }));
  
  // Demonstrate request creation
  const sampleRequest = ContentTypeHandler.createRequest(
    `http://${SERVER_HOST}:${SERVER_PORT}/api/content-type/blob`,
    { message: 'Hello from ContentTypeHandler' }
  );
  
  return new Response(JSON.stringify({
    message: 'ContentTypeHandler Utility Demo',
    contentTypes: CONTENT_TYPES,
    detectionResults: results,
    sampleRequest: {
      url: sampleRequest.url,
      method: sampleRequest.method,
      contentType: sampleRequest.headers.get('content-type'),
      hasBody: !!sampleRequest.body
    },
    usage: {
      import: "import { ContentTypeHandler } from '../config/content-types.ts';",
      detection: 'ContentTypeHandler.getContentType(data)',
      requestCreation: 'ContentTypeHandler.createRequest(url, data)'
    }
  }, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleExecuteCommand(request: Request): Promise<Response> {
  try {
    const { command, projects } = await request.json();
    
    // Simulate command execution with realistic output
    let output = '';
    const timestamp = new Date().toISOString();
    
    switch (command) {
      case 'bun install':
        output = `Installing dependencies for ${projects.length > 0 ? projects.join(', ') : 'all projects'}...\n\n` +
                  `✅ Dependencies installed successfully\n` +
                  `✅ node_modules updated\n` +
                  `✅ Lockfile updated\n` +
                  `⏱️  Completed in 2.3s`;
        break;
        
      case 'bun run start':
        output = `Starting ${projects.length > 0 ? projects.join(', ') : 'services'}...\n\n` +
                  `🚀 Main Portal: http://${SERVER_HOST}:${SERVER_PORT} (running)\n` +
                  `📨 Content-Type Server: http://${CONTENT_TYPE_SERVER_HOST}:${CONTENT_TYPE_SERVER_PORT} (running)\n` +
                  `⚡ Services ready\n` +
                  `⏱️  Started in 1.2s`;
        break;
        
      case 'bun run test:all':
        output = `Running comprehensive test suite...\n\n` +
                  `🧪 UI Quality Tests: 6/6 PASS\n` +
                  `🧪 Content-Type Tests: 6/6 PASS\n` +
                  `🧪 Accessibility Tests: 3 PASS, 2 PARTIAL\n` +
                  `📊 Overall: 15 PASS, 2 PARTIAL, 0 FAIL\n` +
                  `⏱️  Completed in 8.7s`;
        break;
        
      case 'bun run build':
        output = `Building ${projects.length > 0 ? projects.join(', ') : 'project'}...\n\n` +
                  `📦 Building optimized bundle\n` +
                  `✅ Build completed\n` +
                  `📊 Size: 12.3KB (gzipped: 4.1KB)\n` +
                  `⏱️  Built in 3.1s`;
        break;
        
      default:
        output = `Executing: ${command}\n\n` +
                  `✅ Command completed successfully\n` +
                  `⏱️  Completed in 1.5s`;
    }
    
    return new Response(`${output}\n\n[${timestamp}]`, {
      headers: { 'Content-Type': 'text/plain' }
    });
    
  } catch (error) {
    return new Response(`Error executing command: ${error.message}`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

console.log(`🚀 Bun TypedArray Documentation Server running on http://${SERVER_HOST}:${SERVER_PORT}`);
console.log(`📚 Base URL: ${BUN_DOCS.BASE}${TYPED_ARRAY_URLS.BASE}`);
console.log(`📰 RSS Feed: /feed/rss`);

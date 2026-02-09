// Bun v1.3.9 Browser Playground - Frontend

let currentDemo = null;
let demos = [];

// Initialize
async function init() {
  // Get Bun version info from server
  try {
    const response = await fetch('/api/info');
    const info = await response.json();
    document.getElementById('bun-version').textContent = `v${info.bunVersion}`;
    document.getElementById('platform').textContent = `${info.platform} (${info.arch})`;
  } catch (error) {
    console.error('Failed to load Bun info:', error);
    document.getElementById('bun-version').textContent = 'v1.3.9+';
    document.getElementById('platform').textContent = navigator.platform;
  }
  
  // Load demos
  await loadDemos();
  
  // Set up event listeners
  setupEventListeners();
}

async function loadDemos() {
  try {
    const response = await fetch('/api/demos');
    const data = await response.json();
    demos = data.demos;
    renderDemoList();
  } catch (error) {
    console.error('Failed to load demos:', error);
    document.getElementById('demo-list').innerHTML = 
      '<div class="error">Failed to load demos</div>';
  }
}

function renderDemoList() {
  const list = document.getElementById('demo-list');
  
  // Group by category
  const categories = {};
  demos.forEach(demo => {
    if (!categories[demo.category]) {
      categories[demo.category] = [];
    }
    categories[demo.category].push(demo);
  });
  
  let html = '';
  Object.entries(categories).forEach(([category, categoryDemos]) => {
    html += `<div class="category-header">${category}</div>`;
    categoryDemos.forEach(demo => {
      html += `
        <div class="demo-item" data-id="${demo.id}">
          <h3>${demo.name}</h3>
          <p>${demo.description}</p>
          <div class="category">${demo.category}</div>
        </div>
      `;
    });
  });
  
  list.innerHTML = html;
  
  // Add click handlers
  list.querySelectorAll('.demo-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.dataset.id;
      selectDemo(id);
    });
  });
}

async function selectDemo(id) {
  // Update active state
  document.querySelectorAll('.demo-item').forEach(item => {
    item.classList.toggle('active', item.dataset.id === id);
  });
  
  // Load demo details
  try {
    const response = await fetch(`/api/demo/${id}`);
    const demo = await response.json();
    currentDemo = demo;
    renderDemo(demo);
  } catch (error) {
    console.error('Failed to load demo:', error);
    document.getElementById('demo-content').innerHTML = 
      '<div class="error">Failed to load demo</div>';
  }
}

function renderDemo(demo) {
  const content = document.getElementById('demo-content');
  const brandGatePanel = demo.id === 'brand-bench-gate'
    ? `
      <div class="code-block" style="margin-top: 1rem;">
        <button class="run-btn" onclick="refreshBrandGateStatus()">
          ↻ Refresh Gate Status
        </button>
        <div id="brand-gate-status" class="output" style="display: block; margin-top: 0.75rem;">Loading gate status...</div>
      </div>
    `
    : '';
  
  content.innerHTML = `
    <div class="demo-header">
      <span class="category">${demo.category}</span>
      <h2>${demo.name}</h2>
      <p>${demo.description}</p>
    </div>
    
    <div class="code-block">
      <button class="copy-btn" onclick="copyCode(this)">Copy</button>
      <pre><code>${escapeHtml(demo.code)}</code></pre>
    </div>
    
    <button class="run-btn" onclick="runDemo('${demo.id}')">
      ▶ Run Demo
    </button>
    
    <div id="demo-output" class="output" style="display: none;"></div>
    ${brandGatePanel}
  `;

  if (demo.id === 'brand-bench-gate') {
    refreshBrandGateStatus();
  }
}

async function runDemo(id) {
  const outputDiv = document.getElementById('demo-output');
  const runBtn = document.querySelector('.run-btn');
  
  // Show loading state
  outputDiv.style.display = 'block';
  outputDiv.className = 'output loading';
  outputDiv.innerHTML = '<span class="spinner"></span>Running demo...';
  runBtn.disabled = true;
  runBtn.textContent = '⏳ Running...';
  
  try {
    const response = await fetch(`/api/run/${id}`);
    const result = await response.json();
    
    if (result.success) {
      outputDiv.className = 'output success';
      outputDiv.textContent = result.output || 'Demo completed successfully!';
    } else {
      outputDiv.className = 'output error';
      outputDiv.textContent = result.error || result.output || 'Demo failed';
    }
  } catch (error) {
    outputDiv.className = 'output error';
    outputDiv.textContent = `Error: ${error.message}`;
  } finally {
    runBtn.disabled = false;
    runBtn.textContent = '▶ Run Demo';
  }
}

function copyCode(btn) {
  const codeBlock = btn.nextElementSibling;
  const code = codeBlock.textContent;
  
  navigator.clipboard.writeText(code).then(() => {
    const originalText = btn.textContent;
    btn.textContent = '✓ Copied!';
    setTimeout(() => {
      btn.textContent = originalText;
    }, 2000);
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function setupEventListeners() {
  // Make functions globally available
  window.runDemo = runDemo;
  window.copyCode = copyCode;
  window.refreshBrandGateStatus = refreshBrandGateStatus;
}

async function refreshBrandGateStatus() {
  const statusDiv = document.getElementById('brand-gate-status');
  if (!statusDiv) return;

  statusDiv.className = 'output loading';
  statusDiv.textContent = 'Loading canonical brand gate status...';

  try {
    const response = await fetch('/api/brand/status');
    const data = await response.json();

    const lines = [
      `latestRunId: ${data.latest?.runId ?? 'n/a'}`,
      `baselineRunId: ${data.baseline?.baselineRunId ?? 'n/a'}`,
      `warnGate: ${data.warnGate?.status ?? 'n/a'} (ok=${String(data.warnGate?.ok)}) violations=${data.warnGate?.violations ?? 'n/a'} exit=${data.exits?.warn ?? 'n/a'}`,
      `strictGate: ${data.strictGate?.status ?? 'n/a'} (ok=${String(data.strictGate?.ok)}) violations=${data.strictGate?.violations ?? 'n/a'} exit=${data.exits?.strict ?? 'n/a'}`,
      `latestPath: ${data.paths?.latestPath ?? 'n/a'}`,
      `baselinePath: ${data.paths?.baselinePath ?? 'n/a'}`,
    ];

    statusDiv.className = data.warnGate?.ok ? 'output success' : 'output error';
    statusDiv.textContent = lines.join('\n');
  } catch (error) {
    statusDiv.className = 'output error';
    statusDiv.textContent = `Failed to load gate status: ${error.message}`;
  }
}

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

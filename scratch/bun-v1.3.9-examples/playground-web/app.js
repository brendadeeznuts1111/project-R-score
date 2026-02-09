// Bun v1.3.9 Browser Playground - Frontend

let currentDemo = null;
let demos = [];
let runtimeInfo = null;
let brandGateSummary = null;
let governanceSummary = null;

// Initialize
async function init() {
  await refreshHeaderState();
  
  // Load demos
  await loadDemos();
  
  // Set up event listeners
  setupEventListeners();
}

async function refreshHeaderState() {
  const [infoResult, gateResult, governanceResult] = await Promise.allSettled([
    fetch('/api/info').then(r => r.json()),
    fetch('/api/brand/status').then(r => r.json()),
    fetch('/api/control/governance-status').then(r => r.json()),
  ]);

  if (infoResult.status === 'fulfilled') {
    runtimeInfo = infoResult.value;
    document.getElementById('bun-version').textContent = `v${runtimeInfo.bunVersion}`;
    document.getElementById('platform').textContent = `${runtimeInfo.platform} (${runtimeInfo.arch})`;
  } else {
    console.error('Failed to load Bun info:', infoResult.reason);
    document.getElementById('bun-version').textContent = 'v1.3.9+';
    document.getElementById('platform').textContent = navigator.platform;
  }

  if (gateResult.status === 'fulfilled') {
    brandGateSummary = gateResult.value;
  } else {
    console.error('Failed to load brand gate summary:', gateResult.reason);
    brandGateSummary = null;
  }

  if (governanceResult.status === 'fulfilled') {
    governanceSummary = governanceResult.value;
  } else {
    governanceSummary = null;
  }

  renderHeaderBadges();
}

function renderHeaderBadges() {
  const badgesEl = document.getElementById('header-badges');
  if (!badgesEl) return;

  const badges = [];

  if (runtimeInfo?.runtime) {
    badges.push({
      text: `Pool ${runtimeInfo.runtime.maxConcurrentRequests} req`,
      cls: 'success',
    });
    badges.push({
      text: `Workers ${runtimeInfo.runtime.maxCommandWorkers}`,
      cls: 'success',
    });
    badges.push({
      text: `Port ${runtimeInfo.runtime.dedicatedPort} (${runtimeInfo.runtime.portRange})`,
      cls: 'warn',
    });
  }

  if (runtimeInfo?.controlPlane) {
    const cp = runtimeInfo.controlPlane;
    badges.push({
      text: `Prefetch ${cp.prefetchEnabled ? 'ON' : 'OFF'}`,
      cls: cp.prefetchEnabled ? 'success' : 'warn',
    });
    badges.push({
      text: `Preconnect ${cp.preconnectEnabled ? 'ON' : 'OFF'}`,
      cls: cp.preconnectEnabled ? 'success' : 'warn',
    });
  }

  if (brandGateSummary?.warnGate) {
    badges.push({
      text: `Gate(warn): ${brandGateSummary.warnGate.status}`,
      cls: badgeClassForStatus(brandGateSummary.warnGate.status),
    });
  }

  if (brandGateSummary?.strictGate) {
    badges.push({
      text: `Gate(strict): ${brandGateSummary.strictGate.status}`,
      cls: badgeClassForStatus(brandGateSummary.strictGate.status),
    });
  }

  if (governanceSummary?.decision) {
    badges.push({
      text: `Decision: ${governanceSummary.decision.status}`,
      cls: governanceSummary.decision.status === 'APPROVED' ? 'success' : 'warn',
    });
    badges.push({
      text: `Evidence: ${governanceSummary.decision.hasT1T2 ? 'T1+T2' : 'Missing T1/T2'}`,
      cls: governanceSummary.decision.hasT1T2 ? 'success' : 'error',
    });
  }

  if (governanceSummary?.benchmarkGate) {
    const gate = governanceSummary.benchmarkGate;
    const modeLabel = gate.mode === 'strict'
      ? 'STRICT'
      : `WARN CYCLE ${gate.warnCycle}/${gate.warnCyclesTotal}`;
    badges.push({
      text: `Bench Gate: ${modeLabel}`,
      cls: gate.mode === 'strict' ? 'error' : 'warn',
    });
  }

  if (governanceSummary?.impact) {
    badges.push({
      text: `Impact: ${governanceSummary.impact}`,
      cls: governanceSummary.impact === 'Low' ? 'success' : governanceSummary.impact === 'Medium' ? 'warn' : 'error',
    });
  }

  if (badges.length === 0) {
    badgesEl.innerHTML = '<span class="badge error">Header telemetry unavailable</span>';
    return;
  }

  badgesEl.innerHTML = badges
    .map(({ text, cls }) => `<span class="badge ${cls}">${escapeHtml(text)}</span>`)
    .join('');
}

function badgeClassForStatus(status) {
  if (status === 'ok') return 'success';
  if (status === 'warn') return 'warn';
  return 'error';
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
    if (id === 'brand-bench-gate' || id === 'control-plane') {
      await refreshHeaderState();
    }
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
    brandGateSummary = data;
    renderHeaderBadges();

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
    brandGateSummary = null;
    renderHeaderBadges();
  }
}

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

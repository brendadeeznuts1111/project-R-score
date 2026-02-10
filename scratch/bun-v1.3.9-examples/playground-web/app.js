// Bun v1.3.9 Browser Playground - Frontend

let currentDemo = null;
let demos = [];
let runtimeInfo = null;
let brandGateSummary = null;
let governanceSummary = null;
const shortcutState = {
  pendingLeader: null,
  pendingAt: 0,
};

// Toast notification system
function showToast(message, type = 'success', duration = 3000) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ'}</span>
    <span>${escapeHtml(message)}</span>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Copy to clipboard - exposed globally
window.copyToClipboard = async function(elementId) {
  console.log('Copy triggered for:', elementId);
  
  const element = document.getElementById(elementId);
  if (!element) {
    console.error('Element not found:', elementId);
    showToast('Element not found', 'error');
    return;
  }
  
  const text = element.textContent?.trim() || '';
  console.log('Text to copy:', text);
  
  if (!text || text === '...' || text === 'v' || text.includes('skeleton') || text === 'unset' || text === 'unknown') {
    showToast('Wait for data to load first', 'error');
    return;
  }
  
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.cssText = 'position:fixed;left:-9999px;opacity:0;';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (!success) throw new Error('execCommand failed');
    }
    
    // Find and update button
    const btn = element.parentElement.querySelector('.copy-btn');
    if (btn) {
      btn.textContent = '✓';
      btn.style.opacity = '1';
      setTimeout(() => btn.textContent = '📋', 1500);
    }
    
    showToast(`Copied: ${text.slice(0, 40)}${text.length > 40 ? '...' : ''}`);
  } catch (err) {
    console.error('Copy error:', err);
    showToast('Copy failed - try Ctrl+C', 'error');
  }
};

// Update connection status
function updateConnectionStatus(online) {
  const dot = document.getElementById('connection-status');
  if (dot) {
    dot.className = 'status-dot ' + (online ? 'online' : 'offline');
  }
}

// Initialize
async function init() {
  // Set up keyboard shortcuts
  setupKeyboardShortcuts();
  
  await refreshHeaderState();
  
  // Load demos
  await loadDemos();
  
  // Set up event listeners
  setupEventListeners();
  
  // Mark as online
  updateConnectionStatus(true);
  
  // Show welcome toast
  showToast('Bun Playground loaded! Press ? for shortcuts', 'success', 5000);
}

// Keyboard shortcuts
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (isTypingContext(e)) return;

    const key = e.key.toLowerCase();
    const withMeta = e.ctrlKey || e.metaKey;
    const withAlt = e.altKey;
    const now = Date.now();

    if (shortcutState.pendingLeader && now - shortcutState.pendingAt > 1200) {
      shortcutState.pendingLeader = null;
    }

    // Cmd/Ctrl+K opens command palette
    if (withMeta && !e.shiftKey && key === 'k') {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (isPaletteOpen()) {
        closeCommandPalette();
      } else {
        openCommandPalette();
      }
      return;
    }

    if (isPaletteOpen()) return;

    // Cmd/Ctrl+R refreshes runtime and governance data
    if (withMeta && key === 'r') {
      e.preventDefault();
      refreshHeaderState();
      showToast('Refreshed!', 'success');
      return;
    }

    // Cmd/Ctrl+Enter runs current demo
    if (withMeta && key === 'enter') {
      e.preventDefault();
      runCurrentDemo();
      return;
    }

    // Cmd/Ctrl+Shift+C copies current demo code
    if (withMeta && e.shiftKey && key === 'c') {
      e.preventDefault();
      copyCurrentCodeBlock();
      return;
    }

    // Keep Alt+P free for perf monitor (defined in micro-polish.js)
    if (withAlt) return;

    if (shortcutState.pendingLeader === 'g') {
      shortcutState.pendingLeader = null;
      if (key === 'h') {
        e.preventDefault();
        closeAnyModal();
        if (typeof window.goHome === 'function') window.goHome();
        return;
      }
      if (key === 'r') {
        e.preventDefault();
        refreshHeaderState();
        showToast('Header data refreshed', 'success');
        return;
      }
      if (key === 'd') {
        e.preventDefault();
        if (typeof window.toggleMiniDash === 'function') window.toggleMiniDash();
        return;
      }
    }

    switch (key) {
      case '?':
        e.preventDefault();
        showShortcutsHelp();
        break;
      case '/':
        e.preventDefault();
        focusDemoSearch();
        break;
      case 'escape':
        closeAnyModal();
        break;
      case 'g':
        shortcutState.pendingLeader = 'g';
        shortcutState.pendingAt = now;
        break;
      case 'j':
      case ']':
        e.preventDefault();
        navigateDemoByOffset(1);
        break;
      case 'k':
      case '[':
        e.preventDefault();
        navigateDemoByOffset(-1);
        break;
      case '.':
        e.preventDefault();
        runCurrentDemo();
        break;
      case 'm':
        e.preventDefault();
        if (typeof window.toggleMiniDash === 'function') window.toggleMiniDash();
        break;
      case 't':
        e.preventDefault();
        if (typeof window.toggleTheme === 'function') window.toggleTheme();
        break;
      case 'y':
        e.preventDefault();
        copyCurrentCodeBlock();
        break;
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
        const demoIndex = parseInt(e.key) - 1;
        selectDemoByIndex(demoIndex);
        break;
    }
  });
}

function isTypingContext(e) {
  const target = e.target;
  if (!target) return false;
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return true;
  if (target.isContentEditable) return true;
  return Boolean(target.closest && target.closest('.command-palette.active'));
}

function isPaletteOpen() {
  return Boolean(document.querySelector('.command-palette-overlay.active'));
}

function openCommandPalette() {
  if (window.commandPalette && typeof window.commandPalette.open === 'function') {
    window.commandPalette.open();
  } else {
    showToast('Command palette not ready', 'error');
  }
}

function closeCommandPalette() {
  if (window.commandPalette && typeof window.commandPalette.close === 'function') {
    window.commandPalette.close();
  }
}

function getDemoItems() {
  return Array.from(document.querySelectorAll('.demo-item'));
}

function navigateDemoByOffset(offset) {
  const items = getDemoItems();
  if (items.length === 0) return;
  const currentIndex = items.findIndex((item) => item.classList.contains('active'));
  const nextIndex = currentIndex === -1
    ? (offset > 0 ? 0 : items.length - 1)
    : (currentIndex + offset + items.length) % items.length;
  const next = items[nextIndex];
  next.click();
  next.focus();
  next.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function runCurrentDemo() {
  if (!currentDemo || !currentDemo.id) {
    showToast('Select a demo first', 'error');
    return;
  }
  runDemo(currentDemo.id);
}

function copyCurrentCodeBlock() {
  const code = document.querySelector('#demo-content pre code');
  if (!code) {
    showToast('No demo code selected', 'error');
    return;
  }
  navigator.clipboard.writeText(code.textContent || '').then(() => {
    showToast('Demo code copied');
  }).catch(() => {
    showToast('Copy failed - try Cmd/Ctrl+C', 'error');
  });
}

function showShortcutsHelp() {
  const help = `
Keyboard Shortcuts:
  ?              Show this help
  /              Focus search
  Cmd/Ctrl+K     Open command palette
  Cmd/Ctrl+R     Refresh control-plane data
  Cmd/Ctrl+Enter Run current demo
  Cmd/Ctrl+Shift+C Copy current demo code
  1-6            Jump to quick demos
  J / K          Next / previous demo
  ] / [          Next / previous demo (alt nav)
  .              Run current demo
  Y              Copy current demo code
  M              Toggle mini dashboard
  T              Toggle theme
  G then H       Go home
  G then R       Refresh header telemetry
  G then D       Toggle mini dashboard
  Alt+P          Toggle performance monitor
  Esc            Clear selection / close
  `;
  alert(help);
}

function focusDemoSearch() {
  const search = document.querySelector('.demo-search');
  if (search) search.focus();
}

function closeAnyModal() {
  // Close any open modals or clear selection
  document.querySelectorAll('.demo-item').forEach(item => item.classList.remove('active'));
}

function selectDemoByIndex(index) {
  const items = document.querySelectorAll('.demo-item');
  if (items[index]) {
    items[index].click();
    items[index].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

async function refreshHeaderState() {
  // Set skeleton loading state
  const skeleton = '<span class="skeleton" style="display: inline-block; width: 60px; height: 1em;"></span>';
  const skeletonLong = '<span class="skeleton" style="display: inline-block; width: 100px; height: 1em;"></span>';
  document.getElementById('bun-version').innerHTML = skeleton;
  document.getElementById('bun-revision').innerHTML = skeletonLong;
  document.getElementById('git-commit-hash').innerHTML = skeletonLong;
  
  const [infoResult, gateResult, governanceResult] = await Promise.allSettled([
    fetch('/api/info').then(r => r.json()),
    fetch('/api/brand/status').then(r => r.json()),
    fetch('/api/control/governance-status').then(r => r.json()),
  ]);

  if (infoResult.status === 'fulfilled') {
    runtimeInfo = infoResult.value;
    document.getElementById('bun-version').textContent = `v${runtimeInfo.bunVersion}`;
    document.getElementById('bun-revision').textContent = `${runtimeInfo.bunRevision || 'unknown'}`;
    document.getElementById('git-commit-hash').textContent = `${runtimeInfo.gitCommitHash || 'unset'}`;
    document.getElementById('git-commit-hash-source').textContent = `${runtimeInfo.gitCommitHashSource || 'unknown'}`;
    document.getElementById('platform').textContent = `${runtimeInfo.platform} (${runtimeInfo.arch})`;
    updateConnectionStatus(true);
  } else {
    console.error('Failed to load Bun info:', infoResult.reason);
    document.getElementById('bun-version').textContent = 'v1.3.9+';
    document.getElementById('bun-revision').textContent = 'unknown';
    document.getElementById('git-commit-hash').textContent = 'unset';
    document.getElementById('git-commit-hash-source').textContent = 'unknown';
    document.getElementById('platform').textContent = navigator.platform;
    updateConnectionStatus(false);
    showToast('Failed to load runtime info', 'error');
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
    badges.push({
      text: `Rev ${String(runtimeInfo.bunRevision || 'unknown').slice(0, 8)}`,
      cls: 'success',
    });
    badges.push({
      text: `Git ${String(runtimeInfo.gitCommitHash || 'unset').slice(0, 12)}`,
      cls: runtimeInfo.gitCommitHash && runtimeInfo.gitCommitHash !== 'unset' ? 'success' : 'warn',
    });
    badges.push({
      text: `GitSrc ${runtimeInfo.gitCommitHashSource || 'unknown'}`,
      cls: runtimeInfo.gitCommitHashSource === 'env' ? 'warn' : 'success',
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
    badges.push({
      text: `Gov Depth ${cp.searchGovernanceFetchDepth ?? 'n/a'}`,
      cls: 'warn',
    });
    if (cp.sigillCaveat) {
      badges.push({
        text: cp.sigillCaveat,
        cls: (runtimeInfo.platform === 'linux' && runtimeInfo.arch === 'arm64') ? 'success' : 'warn',
      });
    }
  }

  if (brandGateSummary?.warnGate) {
    badges.push({
      text: `Gate(warn): ${brandGateSummary.warnGate.status}`,
      cls: badgeClassForStatus(brandGateSummary.warnGate.status),
    });
  }

  if (brandGateSummary?.strictGate) {
    const strictState = brandGateSummary.governance?.strictProbeEnabled
      ? brandGateSummary.strictGate.status
      : 'disabled';
    badges.push({
      text: `Gate(strict): ${strictState}`,
      cls: strictState === 'disabled' ? 'warn' : badgeClassForStatus(strictState),
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

function renderDemoList(filter = '') {
  const list = document.getElementById('demo-list');
  
  // Group by category
  const categories = {};
  demos.forEach(demo => {
    // Filter if search term provided
    if (filter && !demo.name.toLowerCase().includes(filter.toLowerCase()) && 
        !demo.description.toLowerCase().includes(filter.toLowerCase())) {
      return;
    }
    if (!categories[demo.category]) {
      categories[demo.category] = [];
    }
    categories[demo.category].push(demo);
  });
  
  let html = '';
  
  // Add search input
  html += `<input type="text" class="demo-search" placeholder="🔍 Search demos... (press / to focus)" oninput="renderDemoList(this.value)">`;
  
  // Show count
  const totalDemos = Object.values(categories).flat().length;
  if (filter) {
    html += `<div style="font-size: 0.8em; color: var(--text-secondary); margin-bottom: 10px;">${totalDemos} demo${totalDemos !== 1 ? 's' : ''} found</div>`;
  }
  
  Object.entries(categories).forEach(([category, categoryDemos]) => {
    html += `<div class="category-header">${category} <span style="opacity: 0.6;">(${categoryDemos.length})</span></div>`;
    categoryDemos.forEach((demo, idx) => {
      const shortcut = idx < 6 ? `<kbd>${idx + 1}</kbd>` : '';
      html += `
        <div class="demo-item" data-id="${demo.id}" tabindex="0">
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

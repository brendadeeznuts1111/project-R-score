// Bun v1.3.9 Browser Playground - Frontend

let currentDemo = null;
let demos = [];
let runtimeInfo = null;
let brandGateSummary = null;
let governanceSummary = null;
let orchestrationSummary = null;
let demoSearchQuery = '';
let trendSummaryTimer = null;
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

    // Cmd/Ctrl+L focuses demo search
    if (withMeta && key === 'l') {
      e.preventDefault();
      focusDemoSearch();
      return;
    }

    // Alt+/ quickly focuses demo search
    if (withAlt && key === '/') {
      e.preventDefault();
      focusDemoSearch();
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

    // Cmd/Ctrl+Shift+O runs orchestration full loop and refreshes badges
    if (withMeta && e.shiftKey && key === 'o') {
      e.preventDefault();
      runOrchestrationFullLoop();
      refreshHeaderState();
      showToast('Orchestration full loop triggered', 'success');
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
      if (key === 's') {
        e.preventDefault();
        focusDemoSearch();
        return;
      }
      if (key === 'k') {
        e.preventDefault();
        openCommandPalette();
        return;
      }
      if (key === 'o') {
        e.preventDefault();
        if (typeof window.loadDemo === 'function') {
          window.loadDemo('script-orchestration-control');
        }
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
  Cmd/Ctrl+L     Focus search
  Cmd/Ctrl+K     Open command palette
  Cmd/Ctrl+R     Refresh control-plane data
  Cmd/Ctrl+Shift+O Run orchestration full loop
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
  G then S       Focus search
  G then K       Open command palette
  G then O       Open orchestration control
  Alt+P          Toggle performance monitor
  Alt+/          Focus search
  Esc            Clear selection / close
  `;
  alert(help);
}

function focusDemoSearch() {
  const search = document.querySelector('.demo-search');
  if (search) {
    search.focus();
    search.select();
  }
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
  
  const [infoResult, gateResult, governanceResult, orchestrationStatusResult] = await Promise.allSettled([
    fetch('/api/info').then(r => r.json()),
    fetch('/api/brand/status').then(r => r.json()),
    fetch('/api/control/governance-status').then(r => r.json()),
    fetch('/api/control/script-orchestration/status').then(r => r.json()),
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

  if (orchestrationStatusResult.status === 'fulfilled') {
    orchestrationSummary = orchestrationStatusResult.value;
  } else {
    orchestrationSummary = null;
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
    badges.push({
      text: `Resilience: ${String(cp.resilienceProfile || 'unknown').toUpperCase()}`,
      cls: cp.resilienceProfile === 'production' ? 'error' : cp.resilienceProfile === 'staging' ? 'warn' : 'success',
    });
    const dnsActive = Boolean(cp.prefetchEnabled || cp.preconnectEnabled);
    badges.push({
      text: `DNS Warmup: ${dnsActive ? 'ON' : 'OFF'}`,
      cls: dnsActive ? 'success' : 'warn',
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

  if (orchestrationSummary?.summary) {
    const s = orchestrationSummary.summary;
    const pass = Boolean(s.failFast && s.noExitKeepsRunning && s.sequentialOrdered && s.filterDependencyAware);
    badges.push({
      text: `Orchestration: ${pass ? 'PASS' : 'FAIL'}`,
      cls: pass ? 'success' : 'error',
    });
    if (orchestrationSummary?.cache?.ageMs != null) {
      const ageSec = Math.round(Number(orchestrationSummary.cache.ageMs) / 1000);
      badges.push({
        text: `Orch Age: ${ageSec}s`,
        cls: ageSec <= 15 ? 'success' : ageSec <= 60 ? 'warn' : 'error',
      });
    }
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
  demoSearchQuery = filter;
  const list = document.getElementById('demo-list');
  
  // Group by category
  const categories = {};
  demos.forEach(demo => {
    // Broader search: id, name, description, category, and code snippet
    const q = filter.trim().toLowerCase();
    if (q) {
      const haystack = [
        demo.id || '',
        demo.name || '',
        demo.description || '',
        demo.category || '',
        demo.code || '',
      ].join(' ').toLowerCase();
      if (!haystack.includes(q)) {
        return;
      }
    }
    if (!categories[demo.category]) {
      categories[demo.category] = [];
    }
    categories[demo.category].push(demo);
  });

  let html = '';
  
  // Add search input
  html += `<input type="text" class="demo-search" placeholder="🔍 Search demos... (/ or ⌘L, ⌘K palette, g then s)" value="${escapeHtml(filter)}" oninput="renderDemoList(this.value)">`;
  
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
  if (!id || id === 'undefined' || id === 'null') {
    showToast('Invalid demo selection', 'error');
    return;
  }
  // Update active state
  document.querySelectorAll('.demo-item').forEach(item => {
    item.classList.toggle('active', item.dataset.id === id);
  });
  
  // Load demo details
  try {
    const response = await fetch(`/api/demo/${id}`);
    const demo = await response.json();
    if (!response.ok) {
      const msg = demo?.error || `Demo '${id}' is not available on this server`;
      throw new Error(msg);
    }
    if (!demo || !demo.id || !demo.name || !demo.code) {
      throw new Error(`Demo payload for '${id}' is incomplete`);
    }
    currentDemo = demo;
    renderDemo(demo);
  } catch (error) {
    console.error('Failed to load demo:', error);
    showToast(`Failed to load demo: ${error.message}`, 'error');
    document.getElementById('demo-content').innerHTML = 
      `<div class="error">Failed to load demo: ${escapeHtml(error.message || 'unknown error')}</div>`;
  }
}

function renderDemo(demo) {
  const content = document.getElementById('demo-content');
  const language = String(demo.language || 'text');
  const defaultsJson = JSON.stringify(demo.defaults || {}, null, 2);
  const flags = Array.isArray(demo.flags) ? demo.flags : [];
  const benchCommand = String(demo.benchCommand || '');
  const testCommand = String(demo.testCommand || '');
  const demoContractPanel = `
    <div class="code-block" style="margin-top: 1rem;">
      <div class="demo-contract-head">
        <span class="demo-contract-chip">lang: ${escapeHtml(language)}</span>
        <span class="demo-contract-chip">flags: ${flags.length}</span>
        <span id="demo-contract-status-chip" class="demo-contract-chip">status: unknown</span>
      </div>
      <div class="demo-contract-actions">
        <button class="run-btn" onclick="runDemoContractValidate('${demo.id}')">✅ Validate Module</button>
        <button class="run-btn" onclick="runDemoContractBench('${demo.id}')">📈 Bench Module</button>
        <button class="run-btn" onclick="runDemoContractFullLoop('${demo.id}')">🔁 Full Loop</button>
      </div>
      <div class="demo-contract-grid">
        <div>
          <div class="demo-contract-label">Defaults</div>
          <pre><code>${escapeHtml(defaultsJson)}</code></pre>
        </div>
        <div>
          <div class="demo-contract-label">Flags</div>
          <pre><code>${escapeHtml(flags.join('\n') || '(none)')}</code></pre>
        </div>
      </div>
      <div class="demo-contract-grid">
        <div>
          <div class="demo-contract-label">testCommand</div>
          <pre><code>${escapeHtml(testCommand || '(missing)')}</code></pre>
        </div>
        <div>
          <div class="demo-contract-label">benchCommand</div>
          <pre><code>${escapeHtml(benchCommand || '(missing)')}</code></pre>
        </div>
      </div>
      <div id="demo-contract-output" class="output" style="display:none; margin-top:0.75rem;"></div>
    </div>
  `;
  const trendSummaryBlock = `
    <div class="trend-summary-card">
      <div class="trend-summary-header">
        <strong>SQLite Trend Summary</strong>
        <button class="run-btn trend-summary-refresh" onclick="refreshMainTrendSummary()">↻ Refresh</button>
      </div>
      <div id="main-trend-summary" class="trend-summary-body">Loading trend summary...</div>
    </div>
  `;
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
  const featureMatrixPanel = demo.id === 'feature-matrix'
    ? `
      <div class="code-block" style="margin-top: 1rem;">
        <button class="run-btn" onclick="refreshFeatureMatrixStatus()">
          ↻ Refresh Feature Matrix
        </button>
        <div id="feature-matrix-status" class="output" style="display: block; margin-top: 0.75rem;">Loading feature matrix...</div>
      </div>
    `
    : '';
  const componentStatusPanel = demo.id === 'component-status-matrix'
    ? `
      <div class="code-block" style="margin-top: 1rem;">
        <button class="run-btn" onclick="refreshComponentStatusMatrix()">
          ↻ Refresh Component Status
        </button>
        <div id="component-status-matrix-output" class="output" style="display: block; margin-top: 0.75rem;">Loading component status matrix...</div>
      </div>
    `
    : '';
  const deploymentReadinessPanel = demo.id === 'deployment-readiness-matrix'
    ? `
      <div class="code-block" style="margin-top: 1rem;">
        <button class="run-btn" onclick="refreshDeploymentReadinessMatrix()">
          ↻ Refresh Deployment Readiness
        </button>
        <div id="deployment-readiness-output" class="output" style="display: block; margin-top: 0.75rem;">Loading deployment readiness matrix...</div>
      </div>
    `
    : '';
  const performanceImpactPanel = demo.id === 'performance-impact-matrix'
    ? `
      <div class="code-block" style="margin-top: 1rem;">
        <button class="run-btn" onclick="refreshPerformanceImpactMatrix()">
          ↻ Refresh Performance Impact
        </button>
        <div id="performance-impact-output" class="output" style="display: block; margin-top: 0.75rem;">Loading performance impact matrix...</div>
      </div>
    `
    : '';
  const securityPosturePanel = demo.id === 'security-posture-report'
    ? `
      <div class="code-block" style="margin-top: 1rem;">
        <button class="run-btn" onclick="refreshSecurityPostureReport()">
          ↻ Refresh Security Posture
        </button>
        <div id="security-posture-output" class="output" style="display: block; margin-top: 0.75rem;">Loading security posture report...</div>
      </div>
    `
    : '';
  const domainTopologyPanel = demo.id === 'domain-topology'
    ? `
      <div class="code-block" style="margin-top: 1rem;">
        <div style="display:flex; flex-wrap:wrap; gap:8px; align-items:center;">
          <label for="domain-topology-select">Domain:</label>
          <select id="domain-topology-select">
            <option value="full">full</option>
            <option value="presentation">presentation</option>
            <option value="orchestration">orchestration</option>
            <option value="protocol">protocol</option>
            <option value="security">security</option>
            <option value="performance">performance</option>
            <option value="observability">observability</option>
          </select>
          <button class="run-btn" onclick="refreshDomainTopologyGraph()">
            ↻ Refresh Domain Graph
          </button>
        </div>
        <div id="domain-topology-output" class="output" style="display: block; margin-top: 0.75rem;">Loading domain topology graph...</div>
      </div>
    `
    : '';
  const historicalTrendsPanel = demo.id === 'historical-sqlite-trends'
    ? `
      <div class="code-block" style="margin-top: 1rem;">
        <div style="display:flex; flex-wrap:wrap; gap:8px; align-items:center;">
          <label for="historical-trends-minutes">Window (minutes):</label>
          <input id="historical-trends-minutes" type="number" min="1" max="1440" value="60" style="width:96px;" />
          <label for="historical-trends-limit">Limit:</label>
          <input id="historical-trends-limit" type="number" min="1" max="10000" value="120" style="width:96px;" />
          <button class="run-btn" onclick="refreshHistoricalTrends()">
            ↻ Refresh Historical Trends
          </button>
        </div>
        <div id="historical-trends-output" class="output" style="display: block; margin-top: 0.75rem;">Loading historical SQLite trend summary...</div>
      </div>
    `
    : '';
  const bundleMetafilePanel = demo.id === 'build-metafile'
    ? `
      <div class="code-block" style="margin-top: 1rem;">
        <div style="display:flex; flex-wrap:wrap; gap:8px; align-items:center;">
          <label for="bundle-analyze-entry">Entry:</label>
          <input id="bundle-analyze-entry" type="text" value="scratch/bun-v1.3.9-examples/playground-web/server.ts" style="width:min(720px,100%);" />
          <button class="run-btn" onclick="refreshBundleMetafileAnalysis()">
            ↻ Analyze Bundle Metafile
          </button>
        </div>
        <div id="bundle-metafile-summary" class="bundle-summary-card">Loading bundle budget...</div>
        <div id="bundle-metafile-output" class="output" style="display: block; margin-top: 0.75rem;">Loading bundle metafile analysis...</div>
      </div>
    `
    : '';
  const protocolMatrixPanel = demo.id === 'protocol-matrix'
    ? `
      <div class="code-block" style="margin-top: 1rem;">
        <button class="run-btn" onclick="refreshProtocolMatrixStatus()">
          ↻ Refresh Protocol + Pool Matrix
        </button>
        <div id="protocol-matrix-status" class="output" style="display: block; margin-top: 0.75rem;">Loading protocol + pool matrix...</div>
      </div>
    `
    : '';
  const http2RuntimePanel = demo.id === 'http2-runtime-control'
    ? `
      <div class="code-block" style="margin-top: 1rem;">
        <div style="display:flex; flex-wrap:wrap; gap:8px;">
          <button class="run-btn" onclick="executeHttp2RuntimeAction('start')">▶ Start HTTP/2 Runtime</button>
          <button class="run-btn" onclick="executeHttp2RuntimeAction('full-loop')">⟳ Full Loop</button>
          <button class="run-btn" onclick="executeHttp2RuntimeAction('probe')">🧪 Probe Runtime</button>
          <button class="run-btn" onclick="refreshHttp2RuntimeStatus()">↻ Refresh Status</button>
          <button class="run-btn" onclick="executeHttp2RuntimeAction('stop')">■ Stop Runtime</button>
        </div>
        <div id="http2-runtime-status" class="output" style="display:block; margin-top:0.75rem;">Loading HTTP/2 runtime status...</div>
      </div>
    `
    : '';
  const orchestrationPanel = demo.id === 'script-orchestration-control'
    ? `
      <div class="code-block" style="margin-top: 1rem;">
        <div style="display:flex; flex-wrap:wrap; gap:8px;">
          <button class="run-btn" onclick="refreshOrchestrationStatus()">↻ Refresh Panel</button>
          <button class="run-btn" onclick="runOrchestrationFullLoop()">⟳ Full Loop</button>
          <button class="run-btn" onclick="executeOrchestrationMode('parallel')">▶ Parallel (fail-fast)</button>
          <button class="run-btn" onclick="executeOrchestrationMode('parallel-no-exit')">▶ Parallel (--no-exit-on-error)</button>
          <button class="run-btn" onclick="executeOrchestrationMode('sequential')">▶ Sequential</button>
          <button class="run-btn" onclick="executeOrchestrationMode('filter')">▶ --filter (dep-order)</button>
        </div>
        <div id="orchestration-status" class="output" style="display:block; margin-top:0.75rem;">Loading orchestration status...</div>
      </div>
    `
    : '';
  
  content.innerHTML = `
    <div class="demo-header">
      <span class="category">${demo.category}</span>
      <h2>${demo.name}</h2>
      <p>${demo.description}</p>
    </div>
    ${trendSummaryBlock}
    ${demoContractPanel}
    
    <div class="code-block">
      <button class="copy-btn" onclick="copyCode(this)">Copy</button>
      <pre><code class="language-${escapeHtml(language)}">${escapeHtml(demo.code)}</code></pre>
    </div>
    
    <button id="demo-run-btn" class="run-btn" onclick="runDemo('${demo.id}')">
      ▶ Run Demo
    </button>
    
    <div id="demo-output" class="output" style="display: none;"></div>
    ${brandGatePanel}
    ${featureMatrixPanel}
    ${componentStatusPanel}
    ${deploymentReadinessPanel}
    ${performanceImpactPanel}
    ${securityPosturePanel}
    ${domainTopologyPanel}
    ${bundleMetafilePanel}
    ${historicalTrendsPanel}
    ${protocolMatrixPanel}
    ${http2RuntimePanel}
    ${orchestrationPanel}
  `;

  if (demo.id === 'brand-bench-gate') {
    refreshBrandGateStatus();
  }
  if (demo.id === 'feature-matrix') {
    refreshFeatureMatrixStatus();
  }
  if (demo.id === 'component-status-matrix') {
    refreshComponentStatusMatrix();
  }
  if (demo.id === 'deployment-readiness-matrix') {
    refreshDeploymentReadinessMatrix();
  }
  if (demo.id === 'performance-impact-matrix') {
    refreshPerformanceImpactMatrix();
  }
  if (demo.id === 'security-posture-report') {
    refreshSecurityPostureReport();
  }
  if (demo.id === 'domain-topology') {
    refreshDomainTopologyGraph();
  }
  if (demo.id === 'historical-sqlite-trends') {
    refreshHistoricalTrends();
  }
  if (demo.id === 'build-metafile') {
    refreshBundleMetafileAnalysis();
  }
  if (demo.id === 'protocol-matrix') {
    refreshProtocolMatrixStatus();
  }
  if (demo.id === 'http2-runtime-control') {
    refreshHttp2RuntimeStatus();
  }
  if (demo.id === 'script-orchestration-control') {
    refreshOrchestrationStatus();
  }
  refreshMainTrendSummary();
  startMainTrendSummaryAutoRefresh();
}

async function runDemo(id) {
  if (!id || id === 'undefined' || id === 'null') {
    showToast('No valid demo selected', 'error');
    return;
  }
  const outputDiv = document.getElementById('demo-output');
  const runBtn = document.getElementById('demo-run-btn') || document.querySelector('.run-btn');
  
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
    if (id === 'brand-bench-gate' || id === 'control-plane' || id === 'script-orchestration-control') {
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
  window.refreshFeatureMatrixStatus = refreshFeatureMatrixStatus;
  window.refreshComponentStatusMatrix = refreshComponentStatusMatrix;
  window.refreshDeploymentReadinessMatrix = refreshDeploymentReadinessMatrix;
  window.refreshPerformanceImpactMatrix = refreshPerformanceImpactMatrix;
  window.refreshSecurityPostureReport = refreshSecurityPostureReport;
  window.refreshDomainTopologyGraph = refreshDomainTopologyGraph;
  window.refreshBundleMetafileAnalysis = refreshBundleMetafileAnalysis;
  window.refreshHistoricalTrends = refreshHistoricalTrends;
  window.refreshHttp2RuntimeStatus = refreshHttp2RuntimeStatus;
  window.executeHttp2RuntimeAction = executeHttp2RuntimeAction;
  window.refreshOrchestrationStatus = refreshOrchestrationStatus;
  window.executeOrchestrationMode = executeOrchestrationMode;
  window.runOrchestrationFullLoop = runOrchestrationFullLoop;
  window.refreshMainTrendSummary = refreshMainTrendSummary;
  window.runDemoContractValidate = runDemoContractValidate;
  window.runDemoContractBench = runDemoContractBench;
  window.runDemoContractFullLoop = runDemoContractFullLoop;
  window.refreshHeaderState = refreshHeaderState;
  window.loadDemo = (id) => {
    selectDemo(id);
  };
  window.focusDemoSearch = focusDemoSearch;
}

async function runDemoContractAction(path) {
  const out = document.getElementById('demo-contract-output');
  const statusChip = document.getElementById('demo-contract-status-chip');
  if (!out) return;
  out.style.display = 'block';
  out.className = 'output loading';
  out.textContent = 'Running contract action...';
  if (statusChip) statusChip.textContent = 'status: running';
  try {
    const response = await fetch(path);
    const data = await response.json();
    const ok = Boolean(data?.ok);
    out.className = ok ? 'output success' : 'output error';
    out.textContent = data?.output || data?.error || JSON.stringify(data, null, 2);
    if (statusChip) statusChip.textContent = `status: ${ok ? 'pass' : 'fail'}`;
  } catch (error) {
    out.className = 'output error';
    out.textContent = `Contract action failed: ${error.message}`;
    if (statusChip) statusChip.textContent = 'status: fail';
  }
}

async function runDemoContractValidate(id) {
  await runDemoContractAction(`/api/control/demo-module/validate?id=${encodeURIComponent(id)}`);
}

async function runDemoContractBench(id) {
  await runDemoContractAction(`/api/control/demo-module/bench?id=${encodeURIComponent(id)}`);
}

async function runDemoContractFullLoop(id) {
  const out = document.getElementById('demo-contract-output');
  const statusChip = document.getElementById('demo-contract-status-chip');
  if (!out) return;
  out.style.display = 'block';
  out.className = 'output loading';
  out.textContent = 'Running full loop (validate + bench + demo run)...';
  if (statusChip) statusChip.textContent = 'status: running';
  try {
    const response = await fetch(`/api/control/demo-module/full-loop?id=${encodeURIComponent(id)}`);
    const data = await response.json();
    const ok = Boolean(data?.ok);
    const steps = data?.steps || {};
    out.className = ok ? 'output success' : 'output error';
    out.textContent = [
      `id=${data?.id || id}`,
      `ok=${String(ok)} durationMs=${data?.durationMs ?? 'n/a'}`,
      `validate: ok=${String(steps?.validate?.ok)} exit=${steps?.validate?.exitCode ?? 'n/a'}`,
      `bench: ok=${String(steps?.bench?.ok)} exit=${steps?.bench?.exitCode ?? 'n/a'}`,
      `run: ok=${String(steps?.run?.ok)} exit=${steps?.run?.exitCode ?? 'n/a'}`,
      '',
      String(steps?.run?.output || steps?.run?.error || ''),
    ].join('\n');
    if (statusChip) statusChip.textContent = `status: ${ok ? 'pass' : 'fail'}`;
    if (ok) {
      await refreshHeaderState();
    }
  } catch (error) {
    out.className = 'output error';
    out.textContent = `Full loop failed: ${error.message}`;
    if (statusChip) statusChip.textContent = 'status: fail';
  }
}

function startMainTrendSummaryAutoRefresh() {
  if (trendSummaryTimer) {
    clearInterval(trendSummaryTimer);
    trendSummaryTimer = null;
  }
  trendSummaryTimer = setInterval(() => {
    refreshMainTrendSummary();
  }, 10000);
}

async function refreshMainTrendSummary() {
  const statusDiv = document.getElementById('main-trend-summary');
  if (!statusDiv) return;

  statusDiv.textContent = 'Loading trend summary...';
  statusDiv.className = 'trend-summary-body';

  try {
    const response = await fetch('/api/dashboard/trends/summary?minutes=60&limit=120');
    const data = await response.json();
    const summary = data.summary || {};
    const severityCounts = summary.severityCounts || {};
    const deltaLoad = Number(summary.deltaLoadMaxPct || 0);
    const failCount = Number(severityCounts.fail || 0);
    const count = Number(summary.count || 0);
    const failRatePct = count > 0 ? Number(((failCount / count) * 100).toFixed(1)) : 0;
    const driftArrow = deltaLoad > 0 ? '↑' : deltaLoad < 0 ? '↓' : '→';
    const driftLoadClass =
      deltaLoad > 50 ? 'drift-badge drift-fail' :
      deltaLoad >= 20 ? 'drift-badge drift-warn' :
      'drift-badge drift-ok';
    const failClass =
      failCount >= 3 || failRatePct >= 20 ? 'drift-badge drift-fail' :
      failCount > 0 ? 'drift-badge drift-warn' :
      'drift-badge drift-ok';
    const coveragePct = Number(summary.windowCoveragePct || 0);
    const coverageClass =
      coveragePct < 70 ? 'drift-badge drift-fail' :
      coveragePct <= 90 ? 'drift-badge drift-warn' :
      'drift-badge drift-ok';
    const bottleneckChanges = Number(summary.bottleneckChanges || 0);
    const bottleneckClass =
      bottleneckChanges > 5 ? 'drift-badge drift-fail' :
      bottleneckChanges >= 3 ? 'drift-badge drift-warn' :
      'drift-badge drift-ok';
    const loadSpark = String(summary.sparklineLoad || '').trim() || '..........';
    const capSpark = String(summary.sparklineCapacity || '').trim() || '..........';
    const requestedMinutes = Number(data?.window?.minutes || 60);

    statusDiv.innerHTML = `
      <div class="trend-summary-row">
        <span>Load</span>
        <code>${escapeHtml(loadSpark)}</code>
      </div>
      <div class="trend-summary-row">
        <span>Capacity</span>
        <code>${escapeHtml(capSpark)}</code>
      </div>
      <div class="trend-summary-alerts">
        <span class="${driftLoadClass}">Drift ${driftArrow} ${deltaLoad > 0 ? '+' : ''}${deltaLoad.toFixed(2)}%</span>
        <span class="${failClass}">Fail ${failCount}/${count} (${failRatePct}%)</span>
        <span class="${coverageClass}">Window ${coveragePct.toFixed(1)}% of ${requestedMinutes}m</span>
        <span class="${bottleneckClass}">Bottleneck flips ${bottleneckChanges}</span>
      </div>
    `;
  } catch (error) {
    statusDiv.classList.add('trend-summary-error');
    statusDiv.textContent = `Trend summary unavailable: ${error.message}`;
  }
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

async function refreshFeatureMatrixStatus() {
  const statusDiv = document.getElementById('feature-matrix-status');
  if (!statusDiv) return;

  statusDiv.className = 'output loading';
  statusDiv.textContent = 'Loading Bun v1.3.9 feature matrix...';

  try {
    const response = await fetch('/api/control/feature-matrix');
    const data = await response.json();

    const runtime = data.runtime || {};
    const summary = data.summary || {};
    const rows = Array.isArray(data.rows) ? data.rows : [];
    const spotlightFeatures = new Set([
      'RegExp SIMD Prefix Search',
      'RegExp Fixed-Count Parentheses JIT',
      'String.startsWith Intrinsic',
      'Set/Map.size Intrinsic',
      'String.trim Intrinsic',
      'Object.defineProperty Intrinsic',
      'String.replace Rope Return',
      'node:http2 Rare Crash Fixes',
      'Bun.stringWidth Thai/Lao Fix',
      'Proxy Keep-Alive Absolute-URL Fix',
      'HTTP Chunked Parser Smuggling Fix',
      'CompileTarget SIMD Type Fix',
      'CompileTarget Baseline/Modern Type Fix',
      'Socket.reload Type Fix',
    ]);
    const header = [
      `version: ${data.version || 'unknown'}`,
      `runtime: ${runtime.platform || 'unknown'}/${runtime.arch || 'unknown'} bun=${runtime.bunVersion || 'unknown'}`,
      `active: ${summary.activeCount ?? 0}/${summary.rowCount ?? rows.length}`,
      `sigill: ${runtime.sigillCaveat || 'n/a'}`,
      '',
      'spotlight:',
    ];

    const spotlightRows = rows
      .filter((row) => spotlightFeatures.has(String(row.feature || '')))
      .slice(0, 12)
      .map((row) => {
        const mark = row.active ? 'ON ' : 'OFF';
        return `${mark} | ${row.feature} | impact=${row.performanceImpact} | ready=${row.productionReady}`;
      });

    const topRowsHeader = [
      '',
      'matrix top rows:',
    ];
    const topRows = rows
      .slice(0, 10)
      .map((row) => {
        const mark = row.active ? 'ON ' : 'OFF';
        return `${mark} | ${row.feature} | applied=${row.appliedValue} | mem=${row.memoryImpact || 'n/a'} | prod=${row.productionReady || 'n/a'}`;
      });

    statusDiv.className = 'output success';
    statusDiv.textContent = header.concat(spotlightRows, topRowsHeader, topRows).join('\n');
  } catch (error) {
    statusDiv.className = 'output error';
    statusDiv.textContent = `Failed to load feature matrix: ${error.message}`;
  }
}

async function refreshComponentStatusMatrix() {
  const statusDiv = document.getElementById('component-status-matrix-output');
  if (!statusDiv) return;

  statusDiv.className = 'output loading';
  statusDiv.textContent = 'Loading component status matrix...';

  try {
    const response = await fetch('/api/control/component-status');
    const data = await response.json();
    const summary = data.summary || {};
    const rows = Array.isArray(data.rows) ? data.rows : [];

    const header = [
      `generatedAt: ${data.generatedAt || 'unknown'}`,
      `stable: ${summary.stableCount ?? 0}/${summary.rowCount ?? rows.length}`,
      `beta: ${summary.betaCount ?? 0}`,
      '',
    ];

    const topRows = rows.slice(0, 12).map((row) => {
      const mark = row.stable ? 'STABLE' : 'BETA';
      return `${mark} | ${row.component} | cov=${row.testCoverage} | budget=${row.performanceBudget} | sec=${row.securityReview} | prod=${row.production}`;
    });

    statusDiv.className = (summary.betaCount ?? 0) > 0 ? 'output success' : 'output success';
    statusDiv.textContent = header.concat(topRows).join('\n');
  } catch (error) {
    statusDiv.className = 'output error';
    statusDiv.textContent = `Failed to load component status matrix: ${error.message}`;
  }
}

async function refreshDeploymentReadinessMatrix() {
  const statusDiv = document.getElementById('deployment-readiness-output');
  if (!statusDiv) return;

  statusDiv.className = 'output loading';
  statusDiv.textContent = 'Loading deployment readiness matrix...';

  try {
    const response = await fetch('/api/control/deployment-readiness');
    const data = await response.json();
    const summary = data.summary || {};
    const ready = Array.isArray(data.matrix?.productionReady) ? data.matrix.productionReady : [];
    const beta = Array.isArray(data.matrix?.betaStaging) ? data.matrix.betaStaging : [];

    const lines = [
      `generatedAt: ${data.generatedAt || 'unknown'}`,
      `productionReady: ${summary.productionReadyCount ?? ready.length} | betaStaging: ${summary.betaStagingCount ?? beta.length}`,
      `avgReady: ${summary.averageProductionReadiness ?? 'n/a'} | avgBeta: ${summary.averageBetaReadiness ?? 'n/a'} | overall: ${summary.overallReadiness ?? 'n/a'}`,
      '',
      'production:',
      ...ready.slice(0, 8).map((row) => `  ${row.component} | readiness=${row.readiness} | ${row.deploymentPlan.strategy} | regions=${(row.deploymentPlan.regions || []).length}`),
      '',
      'beta:',
      ...beta.slice(0, 4).map((row) => `  ${row.component} | readiness=${row.readiness} | blockers=${(row.blockers || []).length}`),
    ];

    statusDiv.className = beta.length > 0 ? 'output success' : 'output success';
    statusDiv.textContent = lines.join('\n');
  } catch (error) {
    statusDiv.className = 'output error';
    statusDiv.textContent = `Failed to load deployment readiness matrix: ${error.message}`;
  }
}

async function refreshPerformanceImpactMatrix() {
  const statusDiv = document.getElementById('performance-impact-output');
  if (!statusDiv) return;

  statusDiv.className = 'output loading';
  statusDiv.textContent = 'Loading performance impact matrix...';

  try {
    const response = await fetch('/api/control/performance-impact');
    const data = await response.json();
    const overall = data.overall || {};
    const summary = data.summary || {};
    const components = Array.isArray(data.components) ? data.components : [];

    const lines = [
      `generatedAt: ${data.generatedAt || 'unknown'}`,
      `source: ${data.source || 'unknown'}`,
      `overall: ${overall.before || 'n/a'} -> ${overall.after || 'n/a'} (${overall.improvement || 'n/a'})`,
      `components: ${summary.componentCount ?? components.length} | topGain: ${summary.topGain || 'n/a'}`,
      '',
      ...components.slice(0, 10).map((row) => {
        return `${row.name} | ${row.metric} | ${row.before} -> ${row.after} | gain=${row.gain}`;
      }),
    ];

    statusDiv.className = 'output success';
    statusDiv.textContent = lines.join('\n');
  } catch (error) {
    statusDiv.className = 'output error';
    statusDiv.textContent = `Failed to load performance impact matrix: ${error.message}`;
  }
}

async function refreshSecurityPostureReport() {
  const statusDiv = document.getElementById('security-posture-output');
  if (!statusDiv) return;

  statusDiv.className = 'output loading';
  statusDiv.textContent = 'Loading security posture report...';

  try {
    const response = await fetch('/api/control/security-posture');
    const data = await response.json();
    const summary = data.summary || {};
    const totals = data.totals || {};
    const components = Array.isArray(data.components) ? data.components : [];

    const lines = [
      `generatedAt: ${data.generatedAt || 'unknown'}`,
      `source: ${data.source || 'unknown'}`,
      `reviewed: ${summary.reviewed ?? 0} | pending: ${summary.pending ?? 0} | reviewedPct: ${totals.reviewedPct ?? 0}%`,
      `issues: critical=${summary.criticalIssues ?? 0} high=${summary.highIssues ?? 0} medium=${summary.mediumIssues ?? 0}`,
      '',
      ...components.slice(0, 10).map((row) => {
        const findingsCount = Array.isArray(row.findings) ? row.findings.length : 0;
        const blockersCount = Array.isArray(row.blockers) ? row.blockers.length : 0;
        return `${row.file} | review=${row.reviewDate || 'pending'} | findings=${findingsCount} | blockers=${blockersCount}`;
      }),
    ];

    statusDiv.className = 'output success';
    statusDiv.textContent = lines.join('\n');
  } catch (error) {
    statusDiv.className = 'output error';
    statusDiv.textContent = `Failed to load security posture report: ${error.message}`;
  }
}

async function refreshDomainTopologyGraph() {
  const statusDiv = document.getElementById('domain-topology-output');
  if (!statusDiv) return;

  const select = document.getElementById('domain-topology-select');
  const domain = select && typeof select.value === 'string' ? select.value : 'full';

  statusDiv.className = 'output loading';
  statusDiv.textContent = `Loading domain graph (${domain})...`;

  try {
    const response = await fetch(`/api/control/domain-graph?domain=${encodeURIComponent(domain)}`);
    const data = await response.json();
    const available = Array.isArray(data.availableDomains) ? data.availableDomains.join(', ') : 'n/a';

    const lines = [
      `generatedAt: ${data.generatedAt || 'unknown'}`,
      `source: ${data.source || 'unknown'}`,
      `domain: ${data.domain || domain}`,
      `available: ${available}`,
      '',
      String(data.mermaid || ''),
    ];

    statusDiv.className = 'output success';
    statusDiv.textContent = lines.join('\n');
  } catch (error) {
    statusDiv.className = 'output error';
    statusDiv.textContent = `Failed to load domain topology graph: ${error.message}`;
  }
}

async function refreshBundleMetafileAnalysis() {
  const statusDiv = document.getElementById('bundle-metafile-output');
  const summaryDiv = document.getElementById('bundle-metafile-summary');
  if (!statusDiv) return;

  const entryEl = document.getElementById('bundle-analyze-entry');
  const entry = String(entryEl?.value || '').trim();
  const query = entry ? `?entry=${encodeURIComponent(entry)}` : '';

  statusDiv.className = 'output loading';
  statusDiv.textContent = `Analyzing bundle metafile${entry ? ` (${entry})` : ''}...`;
  if (summaryDiv) {
    summaryDiv.textContent = 'Computing budget status...';
  }

  try {
    const response = await fetch(`/api/control/bundle/analyze${query}`);
    const data = await response.json();
    const traceId = response.headers.get('x-trace-id') || 'n/a';
    if (!response.ok || data?.ok === false) {
      statusDiv.className = 'output error';
      statusDiv.textContent = `Bundle analyze failed: ${data?.error || `status=${response.status}`}`;
      if (summaryDiv) {
        summaryDiv.innerHTML = `<span class="drift-badge drift-fail">budget: fail</span><span>bundle analysis unavailable</span><span class="drift-badge drift-warn">trace ${escapeHtml(traceId)}</span>`;
      }
      return;
    }

    const summary = data.summary || {};
    const inputs = Array.isArray(data.largestInputs) ? data.largestInputs : [];
    const outputs = Array.isArray(data.largestOutputs) ? data.largestOutputs : [];
    const externals = Array.isArray(data.externalDependencies) ? data.externalDependencies : [];
    const outputBytes = Number(summary.outputBytes || 0);
    const outputKb = Number((outputBytes / 1024).toFixed(2));
    const outputMb = Number((outputBytes / (1024 * 1024)).toFixed(3));
    const budgetClass = outputBytes > 1024 * 1024
      ? 'drift-badge drift-fail'
      : outputBytes > 512 * 1024
        ? 'drift-badge drift-warn'
        : 'drift-badge drift-ok';
    const budgetLabel = outputBytes > 1024 * 1024 ? 'budget: fail' : outputBytes > 512 * 1024 ? 'budget: warn' : 'budget: ok';
    if (summaryDiv) {
      summaryDiv.innerHTML = `
        <span class="${budgetClass}">${budgetLabel}</span>
        <span>output ${outputKb} KB (${outputMb} MB)</span>
        <span class="drift-badge drift-ok">ratio ${summary.compressionRatio ?? 'n/a'}</span>
        <span class="drift-badge drift-warn">trace ${escapeHtml(traceId)}</span>
      `;
    }

    const lines = [
      `generatedAt: ${data.generatedAt || 'unknown'}`,
      `source: ${data.source || 'unknown'}`,
      `entrypoint: ${data.entrypoint || 'n/a'}`,
      `inputs=${summary.inputCount ?? 0} outputs=${summary.outputCount ?? 0}`,
      `bytes: in=${summary.inputBytes ?? 0} out=${summary.outputBytes ?? 0} ratio=${summary.compressionRatio ?? 'n/a'}`,
      `externalDependencyCount=${summary.externalDependencyCount ?? externals.length}`,
      '',
      'largest inputs:',
      ...inputs.slice(0, 5).map((row) => `  ${row.path} | ${row.bytes} bytes`),
      '',
      'largest outputs:',
      ...outputs.slice(0, 5).map((row) => `  ${row.path} | ${row.bytes} bytes`),
      '',
      'externals:',
      ...(externals.length > 0 ? externals.slice(0, 10).map((dep) => `  ${dep}`) : ['  (none)']),
    ];

    statusDiv.className = 'output success';
    statusDiv.textContent = lines.join('\n');
  } catch (error) {
    statusDiv.className = 'output error';
    statusDiv.textContent = `Failed to analyze bundle metafile: ${error.message}`;
    if (summaryDiv) {
      summaryDiv.innerHTML = `<span class="drift-badge drift-fail">budget: fail</span><span>${escapeHtml(error.message)}</span>`;
    }
  }
}

async function refreshHistoricalTrends() {
  const statusDiv = document.getElementById('historical-trends-output');
  if (!statusDiv) return;

  const minutesEl = document.getElementById('historical-trends-minutes');
  const limitEl = document.getElementById('historical-trends-limit');
  const minutes = Math.max(1, Math.min(1440, Number(minutesEl?.value || 60)));
  const limit = Math.max(1, Math.min(10000, Number(limitEl?.value || 120)));

  statusDiv.className = 'output loading';
  statusDiv.textContent = `Loading historical trends (minutes=${minutes}, limit=${limit})...`;

  try {
    const response = await fetch(`/api/dashboard/trends?minutes=${encodeURIComponent(minutes)}&limit=${encodeURIComponent(limit)}`);
    const data = await response.json();
    const summary = data.summary || {};
    const severityCounts = summary.severityCounts || {};
    const points = Array.isArray(data.points) ? data.points : [];

    const lines = [
      `generatedAt: ${data.generatedAt || 'unknown'}`,
      `source: ${data.source || 'unknown'} | initialized: ${String(data.initialized)}`,
      `window: minutes=${data.window?.minutes ?? minutes} limit=${data.window?.limit ?? limit} coverage=${summary.windowCoveragePct ?? 0}%`,
      `count=${summary.count ?? points.length} avgLoad=${summary.avgLoadMaxPct ?? 'n/a'} avgCap=${summary.avgCapacityPct ?? 'n/a'} deltaLoad=${summary.deltaLoadMaxPct ?? 0} deltaCap=${summary.deltaCapacityPct ?? 0}`,
      `severityCounts: ok=${severityCounts.ok ?? 0} warn=${severityCounts.warn ?? 0} fail=${severityCounts.fail ?? 0} unknown=${severityCounts.unknown ?? 0}`,
      `bottleneckChanges: ${summary.bottleneckChanges ?? 0}`,
      '',
      'latest points:',
      ...points.slice(0, 8).map((p) => `${p.createdAt} | load=${p.loadMaxPct}% | ${p.capacitySummary} | bottleneck=${p.bottleneck}`),
    ];

    statusDiv.className = 'output success';
    statusDiv.textContent = lines.join('\n');
  } catch (error) {
    statusDiv.className = 'output error';
    statusDiv.textContent = `Failed to load historical trends: ${error.message}`;
  }
}

function formatPct(value) {
  const num = Number(value || 0);
  return `${Math.round(num * 100)}%`;
}

async function refreshProtocolMatrixStatus() {
  const statusDiv = document.getElementById('protocol-matrix-status');
  if (!statusDiv) return;

  statusDiv.className = 'output loading';
  statusDiv.textContent = 'Loading protocol matrix and live pool state...';

  try {
    const response = await fetch('/api/control/protocol-matrix');
    const data = await response.json();

    const protocols = Array.isArray(data.protocols) ? data.protocols : [];
    const pooling = data.pooling?.live || {};
    const connections = pooling.connections || {};
    const workers = pooling.workers || {};
    const capacity = pooling.capacity || {};
    const header = [
      `generatedAt: ${data.generatedAt || 'unknown'}`,
      `source: ${data.source || 'unknown'}`,
      `protocols: ${protocols.length}`,
      '',
      `connections: ${connections.inFlight ?? 0}/${connections.max ?? 0} | util=${formatPct(connections.utilization)} | status=${connections.status || 'unknown'} | perWorker=${connections.loadPerWorker ?? 0}`,
      `workers: ${workers.active ?? 0}/${workers.max ?? 0} | util=${formatPct(workers.utilization)} | status=${workers.status || 'unknown'} | perConnection=${workers.loadPerConnection ?? 0}`,
      `headroom: connections=${capacity.headroom?.connections ?? 0} workers=${capacity.headroom?.workers ?? 0} | bottleneck=${capacity.bottleneck || 'n/a'}`,
      '',
      'protocols:',
    ];

    const rows = protocols.slice(0, 8).map((row) => {
      return `${row.protocol} | ${row.scheme} | ${row.useCase}`;
    });

    statusDiv.className = 'output success';
    statusDiv.textContent = header.concat(rows).join('\n');
  } catch (error) {
    statusDiv.className = 'output error';
    statusDiv.textContent = `Failed to load protocol matrix: ${error.message}`;
  }
}

async function refreshHttp2RuntimeStatus() {
  const statusDiv = document.getElementById('http2-runtime-status');
  if (!statusDiv) return;

  statusDiv.className = 'output loading';
  statusDiv.textContent = 'Loading HTTP/2 runtime status...';

  try {
    const response = await fetch('/api/control/http2-upgrade/status');
    const data = await response.json();
    const lines = [
      `status: ${data.status || 'unknown'}`,
      `endpoint: ${data.endpoint || 'n/a'}`,
      `streams: ${data.streamCount ?? 0}`,
      `uptimeSec: ${data.uptimeSec ?? 0}`,
      `lastProbeOk: ${String(data.lastProbeOk ?? false)}`,
      `lastProbeLatencyMs: ${data.lastProbeLatencyMs ?? 'n/a'}`,
      `lastProbeError: ${data.lastProbeError || 'none'}`,
    ];
    statusDiv.className = data.status === 'running' ? 'output success' : 'output error';
    statusDiv.textContent = lines.join('\n');
  } catch (error) {
    statusDiv.className = 'output error';
    statusDiv.textContent = `Failed to load HTTP/2 runtime status: ${error.message}`;
  }
}

async function executeHttp2RuntimeAction(action) {
  const statusDiv = document.getElementById('http2-runtime-status');
  if (!statusDiv) return;

  const pathMap = {
    start: '/api/control/http2-upgrade/start',
    'full-loop': '/api/control/http2-upgrade/full-loop?iterations=3&delayMs=120',
    probe: '/api/control/http2-upgrade/probe',
    stop: '/api/control/http2-upgrade/stop',
  };
  const path = pathMap[action];
  if (!path) return;

  statusDiv.className = 'output loading';
  statusDiv.textContent = `Executing HTTP/2 action: ${action}...`;

  try {
    const method = action === 'probe' ? 'GET' : 'POST';
    const response = await fetch(path, { method });
    const data = await response.json();

    const ok = action === 'probe' ? Boolean(data.ok) : (action === 'stop' ? Boolean(data.stopped) : Boolean(data.started));
    statusDiv.className = ok ? 'output success' : 'output error';
    statusDiv.textContent = JSON.stringify(data, null, 2);
    await refreshHttp2RuntimeStatus();
  } catch (error) {
    statusDiv.className = 'output error';
    statusDiv.textContent = `HTTP/2 action failed (${action}): ${error.message}`;
  }
}

async function refreshOrchestrationStatus() {
  const statusDiv = document.getElementById('orchestration-status');
  if (!statusDiv) return;

  statusDiv.className = 'output loading';
  statusDiv.textContent = 'Loading script orchestration panel...';

  try {
    const [panelRes, statusRes] = await Promise.all([
      fetch('/api/control/script-orchestration-panel'),
      fetch('/api/control/script-orchestration/status'),
    ]);
    const data = await panelRes.json();
    const statusData = await statusRes.json();

    const root = data.rootPackage || {};
    const notes = Array.isArray(data.notes) ? data.notes.slice(0, 4) : [];
    const commands = Array.isArray(data.recommendedCommands) ? data.recommendedCommands.slice(0, 5) : [];
    const packageRows = Array.isArray(data.workspacePackages) ? data.workspacePackages.slice(0, 8) : [];
    const summary = statusData.summary || {};
    const pass = Boolean(statusData.pass);
    const ageSec = Math.round(Number(statusData?.cache?.ageMs || 0) / 1000);

    const lines = [
      `orchestration: ${pass ? 'PASS' : 'FAIL'} (age=${ageSec}s)`,
      `checks: failFast=${String(summary.failFast)} noExit=${String(summary.noExitKeepsRunning)} sequential=${String(summary.sequentialOrdered)} filter=${String(summary.filterDependencyAware)}`,
      '',
      `root: ${root.name || 'unknown'} (${root.path || 'package.json'})`,
      `workspaces: ${(root.workspacePatterns || []).join(', ') || '(none)'}`,
      `scriptCount: ${root.scriptCount ?? 0}`,
      `keyScripts: ${(root.keyScripts || []).slice(0, 8).join(', ') || '(none)'}`,
      '',
      'recommended:',
      ...commands.map((cmd) => `  ${cmd}`),
      '',
      'workspacePackages:',
      ...packageRows.map((pkg) => `  ${pkg.name} (${pkg.path}) scripts=${(pkg.scripts || []).length}`),
      '',
      'notes:',
      ...notes.map((note) => `  - ${note}`),
    ];

    statusDiv.className = pass ? 'output success' : 'output error';
    statusDiv.textContent = lines.join('\n');
  } catch (error) {
    statusDiv.className = 'output error';
    statusDiv.textContent = `Failed to load script orchestration panel: ${error.message}`;
  }
}

async function executeOrchestrationMode(mode) {
  const statusDiv = document.getElementById('orchestration-status');
  if (!statusDiv) return;

  statusDiv.className = 'output loading';
  statusDiv.textContent = `Running orchestration simulation: ${mode}...`;

  try {
    const response = await fetch(`/api/control/script-orchestration-simulate?mode=${encodeURIComponent(mode)}`, {
      method: 'POST',
    });
    const data = await response.json();

    const lines = [
      `mode: ${data.mode || mode}`,
      `semantics: ${data.semantics || 'n/a'}`,
      `behavior: ${data.behavior || 'n/a'}`,
      `exitCode: ${data.exitCode ?? 'n/a'}`,
      '',
      ...((Array.isArray(data.lines) ? data.lines : []).map((line) => String(line))),
    ];

    const ok = Number(data.exitCode ?? 1) === 0;
    statusDiv.className = ok ? 'output success' : 'output error';
    statusDiv.textContent = lines.join('\n');
  } catch (error) {
    statusDiv.className = 'output error';
    statusDiv.textContent = `Orchestration simulation failed: ${error.message}`;
  }
}

async function runOrchestrationFullLoop() {
  const statusDiv = document.getElementById('orchestration-status');
  if (!statusDiv) return;

  statusDiv.className = 'output loading';
  statusDiv.textContent = 'Running orchestration full loop...';

  try {
    const response = await fetch('/api/control/script-orchestration/full-loop', { method: 'POST' });
    const data = await response.json();
    const summary = data.summary || {};

    const lines = [
      `source: ${data.source || 'n/a'}`,
      `generatedAt: ${data.generatedAt || 'n/a'}`,
      `failFast: ${String(summary.failFast)}`,
      `noExitKeepsRunning: ${String(summary.noExitKeepsRunning)}`,
      `sequentialOrdered: ${String(summary.sequentialOrdered)}`,
      `filterDependencyAware: ${String(summary.filterDependencyAware)}`,
      '',
      'parallel:',
      ...((data.simulations?.parallel?.lines || []).map((line) => `  ${line}`)),
      '',
      'parallel-no-exit:',
      ...((data.simulations?.parallelNoExit?.lines || []).map((line) => `  ${line}`)),
    ];

    statusDiv.className = 'output success';
    statusDiv.textContent = lines.join('\n');
  } catch (error) {
    statusDiv.className = 'output error';
    statusDiv.textContent = `Orchestration full loop failed: ${error.message}`;
  }
}

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

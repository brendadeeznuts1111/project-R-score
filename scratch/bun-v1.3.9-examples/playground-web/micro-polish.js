// Micro-Polish Features JavaScript

// Theme Toggle
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  document.getElementById('theme-btn').textContent = next === 'light' ? '☀️' : '🌙';
}

// Load saved theme
const savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
document.getElementById('theme-btn').textContent = savedTheme === 'light' ? '☀️' : '🌙';

// Mini Dashboard Toggle
function toggleMiniDash() {
  const dash = document.getElementById('mini-dash');
  dash.classList.toggle('collapsed');
  localStorage.setItem('miniDashCollapsed', dash.classList.contains('collapsed') ? '1' : '0');
}

const miniDashState = {
  runtimeInfo: null,
  governance: null,
  orchestration: null,
  dashboardMini: null,
  orchestrationTrend: [],
  loadTrend: [],
  capacityTrend: [],
  lastSyncMs: 0,
  lastFetchLatencyMs: 0,
  consecutiveFailures: 0,
};

function setBar(elId, used, max) {
  const el = document.getElementById(elId);
  if (!el) return;
  const safeMax = Math.max(1, Number(max || 0));
  const pct = Math.max(0, Math.min(100, Math.round((Number(used || 0) / safeMax) * 100)));
  el.style.width = `${pct}%`;
  if (pct >= 90) {
    el.style.backgroundColor = 'var(--error)';
  } else if (pct >= 65) {
    el.style.backgroundColor = 'var(--warning)';
  } else {
    el.style.backgroundColor = 'var(--accent)';
  }
}

function setValueSeverity(el, pctUsed) {
  if (!el) return;
  el.classList.remove('mini-value-ok', 'mini-value-warn', 'mini-value-fail');
  if (pctUsed >= 90) {
    el.classList.add('mini-value-fail');
  } else if (pctUsed >= 65) {
    el.classList.add('mini-value-warn');
  } else {
    el.classList.add('mini-value-ok');
  }
}

function setValueSeverityByLabel(el, severity) {
  if (!el) return;
  if (severity === 'fail') {
    setValueSeverity(el, 100);
    return;
  }
  if (severity === 'warn') {
    setValueSeverity(el, 70);
    return;
  }
  setValueSeverity(el, 10);
}

function renderGovernanceChip(governance) {
  const chip = document.getElementById('mini-gov');
  if (!chip) return;
  if (!governance || !governance.decision) {
    chip.className = 'mini-chip mini-chip-pending';
    chip.textContent = 'Gov: ...';
    return;
  }
  const decision = String(governance.decision.status || 'UNKNOWN').toUpperCase();
  const gate = String(governance?.benchmarkGate?.warnStatus || governance?.benchmarkGate?.strictStatus || 'unknown').toLowerCase();
  if (decision === 'APPROVED' && gate === 'ok') {
    chip.className = 'mini-chip mini-chip-ok';
    chip.textContent = 'Gov: PASS';
    return;
  }
  if (decision === 'APPROVED') {
    chip.className = 'mini-chip mini-chip-warn';
    chip.textContent = 'Gov: WARN';
    return;
  }
  chip.className = 'mini-chip mini-chip-fail';
  chip.textContent = 'Gov: REVIEW';
}

function renderPoolHealthChip(loadPct, failures, poolStatus, bottleneck) {
  const chip = document.getElementById('mini-health');
  if (!chip) return;
  chip.classList.add('mini-chip-tight');
  if (failures > 0) {
    chip.className = 'mini-chip mini-chip-fail mini-chip-tight';
    chip.textContent = `Pool: DEGRADED`;
    return;
  }
  if (poolStatus === 'saturated' || loadPct >= 90) {
    chip.className = 'mini-chip mini-chip-fail mini-chip-tight';
    chip.textContent = `Pool: HOT (${bottleneck || 'n/a'})`;
    return;
  }
  if (poolStatus === 'high' || loadPct >= 65) {
    chip.className = 'mini-chip mini-chip-warn mini-chip-tight';
    chip.textContent = `Pool: WARM (${bottleneck || 'n/a'})`;
    return;
  }
  chip.className = 'mini-chip mini-chip-ok mini-chip-tight';
  chip.textContent = `Pool: HEALTHY (${bottleneck || 'n/a'})`;
}

function renderLatencyChip(latencyMs, failures) {
  const chip = document.getElementById('mini-latency');
  if (!chip) return;
  chip.classList.add('mini-chip-tight');
  if (!Number.isFinite(latencyMs) || latencyMs <= 0) {
    chip.className = 'mini-chip mini-chip-pending mini-chip-tight';
    chip.textContent = 'API: --ms';
    return;
  }
  if (failures > 0) {
    chip.className = 'mini-chip mini-chip-fail mini-chip-tight';
    chip.textContent = `API: ${latencyMs}ms`;
    return;
  }
  if (latencyMs > 700) {
    chip.className = 'mini-chip mini-chip-fail mini-chip-tight';
  } else if (latencyMs > 250) {
    chip.className = 'mini-chip mini-chip-warn mini-chip-tight';
  } else {
    chip.className = 'mini-chip mini-chip-ok mini-chip-tight';
  }
  chip.textContent = `API: ${latencyMs}ms`;
}

function renderOrchestrationChip(orchestration) {
  const chip = document.getElementById('mini-orch');
  if (!chip) return;
  chip.classList.add('mini-chip-tight');
  const summary = orchestration?.summary;
  if (!summary) {
    chip.className = 'mini-chip mini-chip-pending mini-chip-tight';
    chip.textContent = 'Orch: ...';
    return;
  }
  const pass = Boolean(
    summary.failFast &&
    summary.noExitKeepsRunning &&
    summary.sequentialOrdered &&
    summary.filterDependencyAware
  );
  chip.className = pass
    ? 'mini-chip mini-chip-ok mini-chip-tight'
    : 'mini-chip mini-chip-fail mini-chip-tight';
  const ageMs = Number(orchestration?.cache?.ageMs || 0);
  const ageSec = Math.max(0, Math.round(ageMs / 1000));
  chip.textContent = `Orch: ${pass ? 'PASS' : 'FAIL'} (${ageSec}s)`;
}

function renderDnsChip(runtimeInfo) {
  const chip = document.getElementById('mini-dns');
  if (!chip) return;
  chip.classList.add('mini-chip-tight');
  const cp = runtimeInfo?.controlPlane;
  if (!cp) {
    chip.className = 'mini-chip mini-chip-pending mini-chip-tight';
    chip.textContent = 'DNS: ...';
    return;
  }
  const enabled = Boolean(cp.prefetchEnabled || cp.preconnectEnabled);
  chip.className = enabled ? 'mini-chip mini-chip-ok mini-chip-tight' : 'mini-chip mini-chip-warn mini-chip-tight';
  chip.textContent = `DNS: ${enabled ? 'ON' : 'OFF'}`;
}

function renderResilienceChip(runtimeInfo) {
  const chip = document.getElementById('mini-resilience');
  if (!chip) return;
  chip.classList.add('mini-chip-tight');
  const cp = runtimeInfo?.controlPlane;
  const profile = cp?.resilienceProfile;
  if (!profile) {
    chip.className = 'mini-chip mini-chip-pending mini-chip-tight';
    chip.textContent = 'Res: ...';
    return;
  }
  const styleClass = profile === 'production' ? 'mini-chip-fail' : profile === 'staging' ? 'mini-chip-warn' : 'mini-chip-ok';
  chip.className = `mini-chip ${styleClass} mini-chip-tight`;
  chip.textContent = `Res: ${String(profile).toUpperCase()}`;
}

function renderOrchestrationTrend() {
  const trend = document.getElementById('mini-orch-trend');
  if (!trend) return;
  const values = miniDashState.orchestrationTrend;
  if (!Array.isArray(values) || values.length === 0) {
    trend.textContent = '..........';
    return;
  }
  trend.textContent = values.map((v) => (v ? '●' : '○')).join('');
}

function sparkChar(valuePct) {
  const bars = '▁▂▃▄▅▆▇█';
  const pct = Math.max(0, Math.min(100, Number(valuePct || 0)));
  const idx = Math.min(bars.length - 1, Math.floor((pct / 100) * (bars.length - 1)));
  return bars[idx];
}

function renderPercentTrend(elId, values) {
  const el = document.getElementById(elId);
  if (!el) return;
  if (!Array.isArray(values) || values.length === 0) {
    el.textContent = '..........';
    return;
  }
  const spark = values.map((v) => sparkChar(v)).join('');
  el.textContent = spark.padStart(10, '·').slice(-10);
}

// Update mini dashboard metrics
async function updateMiniDash() {
  const fetchStarted = performance.now();
  // Fetch fresh runtime and governance snapshots
  try {
    const [infoRes, govRes, orchRes, miniRes] = await Promise.allSettled([
      fetch('/api/info').then((r) => r.json()),
      fetch('/api/control/governance-status').then((r) => r.json()),
      fetch('/api/control/script-orchestration/status').then((r) => r.json()),
      fetch('/api/dashboard/mini').then((r) => r.json()),
    ]);
    if (infoRes.status === 'fulfilled' && infoRes.value?.runtime) {
      miniDashState.runtimeInfo = infoRes.value;
    }
    if (govRes.status === 'fulfilled') {
      miniDashState.governance = govRes.value;
    }
    if (orchRes && orchRes.status === 'fulfilled') {
      miniDashState.orchestration = orchRes.value;
      const pass = Boolean(orchRes.value?.pass);
      miniDashState.orchestrationTrend.push(pass);
      if (miniDashState.orchestrationTrend.length > 10) {
        miniDashState.orchestrationTrend.shift();
      }
    }
    if (miniRes && miniRes.status === 'fulfilled') {
      miniDashState.dashboardMini = miniRes.value;
    }
    miniDashState.consecutiveFailures = 0;
    miniDashState.lastSyncMs = Date.now();
    miniDashState.lastFetchLatencyMs = Math.max(1, Math.round(performance.now() - fetchStarted));
  } catch (e) {
    // Silent fail - use cached data
    miniDashState.consecutiveFailures += 1;
    miniDashState.lastFetchLatencyMs = Math.max(1, Math.round(performance.now() - fetchStarted));
  }
  
  if (!miniDashState.runtimeInfo?.runtime) return;
  
  const rt = miniDashState.runtimeInfo.runtime;
  const miniSnapshot = miniDashState.dashboardMini || {};
  const livePool = miniSnapshot?.pooling?.live;
  const liveConnections = livePool?.connections || {};
  const liveWorkers = livePool?.workers || {};
  const inFlight = liveConnections.inFlight ?? rt.inFlightRequests ?? 0;
  const maxRequests = liveConnections.max ?? rt.maxConcurrentRequests ?? 1;
  const activeWorkers = liveWorkers.active ?? rt.activeCommands ?? 0;
  const maxWorkers = liveWorkers.max ?? rt.maxCommandWorkers ?? 1;
  const reqPct = Math.round((Math.max(0, inFlight) / Math.max(1, maxRequests)) * 100);
  const workerPct = Math.round((Math.max(0, activeWorkers) / Math.max(1, maxWorkers)) * 100);
  const reqCapPct = miniSnapshot?.capacity?.connectionsPct ?? Math.max(0, 100 - reqPct);
  const workerCapPct = miniSnapshot?.capacity?.workersPct ?? Math.max(0, 100 - workerPct);
  const loadPct = Math.max(reqPct, workerPct);
  const bottleneck = miniSnapshot?.bottleneck?.kind || livePool?.capacity?.bottleneck || (reqPct >= workerPct ? 'connection-pool' : 'worker-pool');
  const connectionHeadroom = miniSnapshot?.headroom?.connections?.available ?? livePool?.capacity?.headroom?.connections ?? Math.max(0, maxRequests - inFlight);
  const workerHeadroom = miniSnapshot?.headroom?.workers?.available ?? livePool?.capacity?.headroom?.workers ?? Math.max(0, maxWorkers - activeWorkers);
  const connectionHeadroomPct = miniSnapshot?.headroom?.connections?.pct ?? Math.round((Math.max(0, connectionHeadroom) / Math.max(1, maxRequests)) * 100);
  const workerHeadroomPct = miniSnapshot?.headroom?.workers?.pct ?? Math.round((Math.max(0, workerHeadroom) / Math.max(1, maxWorkers)) * 100);
  const bottleneckSeverity = miniSnapshot?.bottleneck?.severity;
  const capacitySeverity = miniSnapshot?.capacity?.severity;
  const headroomConnSeverity = miniSnapshot?.headroom?.connections?.severity;
  const headroomWorkersSeverity = miniSnapshot?.headroom?.workers?.severity;
  const poolStatus =
    reqPct >= 100 || workerPct >= 100 ? 'saturated' :
    reqPct >= 75 || workerPct >= 75 ? 'high' : 'healthy';
  const capPct = Math.min(reqCapPct, workerCapPct);

  miniDashState.loadTrend.push(loadPct);
  if (miniDashState.loadTrend.length > 10) miniDashState.loadTrend.shift();
  miniDashState.capacityTrend.push(capPct);
  if (miniDashState.capacityTrend.length > 10) miniDashState.capacityTrend.shift();
  
  document.getElementById('mini-pool').textContent = `${inFlight} / ${maxRequests}`;
  document.getElementById('mini-workers').textContent = `${activeWorkers} / ${maxWorkers}`;
  document.getElementById('mini-load').textContent = `${loadPct}%`;
  const bottleneckEl = document.getElementById('mini-bottleneck');
  if (bottleneckEl) {
    bottleneckEl.textContent = bottleneck;
    setValueSeverityByLabel(bottleneckEl, bottleneckSeverity);
  }
  const capacityEl = document.getElementById('mini-capacity');
  if (capacityEl) {
    capacityEl.textContent = miniSnapshot?.capacity?.summary || `C${reqCapPct}% W${workerCapPct}%`;
    setValueSeverityByLabel(capacityEl, capacitySeverity);
  }
  const headroomConnEl = document.getElementById('mini-headroom-connections');
  if (headroomConnEl) {
    headroomConnEl.textContent = `${connectionHeadroom} (${connectionHeadroomPct}%)`;
    setValueSeverityByLabel(headroomConnEl, headroomConnSeverity);
  }
  const headroomWorkersEl = document.getElementById('mini-headroom-workers');
  if (headroomWorkersEl) {
    headroomWorkersEl.textContent = `${workerHeadroom} (${workerHeadroomPct}%)`;
    setValueSeverityByLabel(headroomWorkersEl, headroomWorkersSeverity);
  }
  document.getElementById('mini-port').textContent = rt.dedicatedPort;
  setBar('mini-pool-bar', inFlight, maxRequests);
  setBar('mini-worker-bar', activeWorkers, maxWorkers);
  renderGovernanceChip(miniDashState.governance);
  renderPoolHealthChip(loadPct, miniDashState.consecutiveFailures, poolStatus, bottleneck);
  renderLatencyChip(miniDashState.lastFetchLatencyMs, miniDashState.consecutiveFailures);
  renderOrchestrationChip(miniDashState.orchestration);
  renderDnsChip(miniDashState.runtimeInfo);
  renderResilienceChip(miniDashState.runtimeInfo);
  renderOrchestrationTrend();
  renderPercentTrend('mini-load-trend', miniDashState.loadTrend);
  renderPercentTrend('mini-capacity-trend', miniDashState.capacityTrend);
  
  // Update uptime from server
  if (rt.uptimeMs) {
    const uptime = Math.floor(rt.uptimeMs / 1000);
    const mins = Math.floor(uptime / 60);
    const secs = uptime % 60;
    const hours = Math.floor(mins / 60);
    if (hours > 0) {
      document.getElementById('mini-uptime').textContent = `${hours}h ${mins % 60}m`;
    } else if (mins > 0) {
      document.getElementById('mini-uptime').textContent = `${mins}m ${secs}s`;
    } else {
      document.getElementById('mini-uptime').textContent = `${secs}s`;
    }
  }

  const syncEl = document.getElementById('mini-sync');
  if (syncEl) {
    syncEl.textContent = new Date().toLocaleTimeString([], { hour12: false });
  }
  const freshnessEl = document.getElementById('mini-freshness');
  if (freshnessEl) {
    if (!miniDashState.lastSyncMs) {
      freshnessEl.textContent = '--';
    } else {
      const ageSec = Math.max(0, Math.round((Date.now() - miniDashState.lastSyncMs) / 1000));
      freshnessEl.textContent = ageSec <= 1 ? 'live' : `${ageSec}s ago`;
    }
  }
}

// Breadcrumbs
function updateBreadcrumbs(category, demo) {
  const bc = document.getElementById('breadcrumbs');
  if (!demo) {
    bc.innerHTML = `
      <span class="breadcrumb-item" onclick="goHome()">🏠 Playground</span>
      <span class="breadcrumb-separator">›</span>
      <span class="breadcrumb-item active">Home</span>
    `;
  } else {
    bc.innerHTML = `
      <span class="breadcrumb-item" onclick="goHome()">🏠 Playground</span>
      <span class="breadcrumb-separator">›</span>
      <span class="breadcrumb-item" onclick="filterCategory('${category}')">${category}</span>
      <span class="breadcrumb-separator">›</span>
      <span class="breadcrumb-item active">${demo}</span>
    `;
  }
}

function goHome() {
  showWelcome();
  updateBreadcrumbs();
}

function filterCategory(category) {
  renderDemoList();
  // Would filter by category
}

// Performance Monitor
let perfEnabled = false;
let frameCount = 0;
let lastTime = performance.now();

function togglePerfMonitor() {
  perfEnabled = !perfEnabled;
  const monitor = document.getElementById('perf-monitor');
  monitor.style.display = perfEnabled ? 'flex' : 'none';
  if (perfEnabled) updatePerf();
}

function updatePerf() {
  if (!perfEnabled) return;
  
  frameCount++;
  const now = performance.now();
  
  if (now - lastTime >= 1000) {
    document.getElementById('fps').textContent = frameCount;
    frameCount = 0;
    lastTime = now;
    
    // Memory (if available)
    if (performance.memory) {
      const used = Math.round(performance.memory.usedJSHeapSize / 1048576);
      document.getElementById('memory').textContent = `${used}MB`;
    }
  }
  
  requestAnimationFrame(updatePerf);
}

// Confetti Effect (subtle)
function showConfetti() {
  const colors = ['#00d9ff', '#00ff88', '#ff00ff', '#ffff00'];
  for (let i = 0; i < 30; i++) {
    setTimeout(() => {
      const el = document.createElement('div');
      el.style.cssText = `
        position: fixed;
        width: 8px;
        height: 8px;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        left: ${Math.random() * 100}vw;
        top: -10px;
        border-radius: 50%;
        pointer-events: none;
        z-index: 9999;
        animation: confetti-fall ${1 + Math.random()}s ease-out forwards;
      `;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 2000);
    }, i * 50);
  }
}

// Add confetti animation
const style = document.createElement('style');
style.textContent = `
  @keyframes confetti-fall {
    to {
      transform: translateY(100vh) rotate(720deg);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// Keyboard shortcut for perf monitor
document.addEventListener('keydown', (e) => {
  if (e.key === 'p' && e.altKey) {
    e.preventDefault();
    togglePerfMonitor();
  }
});

// Initialize mini dashboard immediately - it fetches its own data
document.addEventListener('DOMContentLoaded', () => {
  const dash = document.getElementById('mini-dash');
  if (dash && localStorage.getItem('miniDashCollapsed') === '1') {
    dash.classList.add('collapsed');
  }
  // Initial update
  updateMiniDash();
  // Update every 3 seconds for smoother live state
  setInterval(updateMiniDash, 3000);
});

// Also hook into app init if available for sync with app data
if (typeof init !== 'undefined') {
  const originalInit = init;
  init = async function() {
    await originalInit();
    updateMiniDash();
  };
}

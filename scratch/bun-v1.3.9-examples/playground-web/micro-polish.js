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
}

// Update mini dashboard metrics
async function updateMiniDash() {
  // Fetch fresh runtime info
  try {
    const res = await fetch('/api/info');
    const freshInfo = await res.json();
    if (freshInfo?.runtime) {
      runtimeInfo = freshInfo; // Update global runtimeInfo
    }
  } catch (e) {
    // Silent fail - use cached data
  }
  
  if (!runtimeInfo?.runtime) return;
  
  const rt = runtimeInfo.runtime;
  const inFlight = rt.inFlightRequests ?? 0;
  const activeWorkers = rt.activeCommands ?? 0;
  
  document.getElementById('mini-pool').textContent = `${inFlight} / ${rt.maxConcurrentRequests}`;
  document.getElementById('mini-workers').textContent = `${activeWorkers} / ${rt.maxCommandWorkers}`;
  document.getElementById('mini-port').textContent = rt.dedicatedPort;
  
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

// Add to init
const originalInit = init;
init = async function() {
  await originalInit();
  // Wait for runtimeInfo to be populated
  let attempts = 0;
  const waitForRuntime = setInterval(() => {
    if (runtimeInfo?.runtime || attempts > 20) {
      clearInterval(waitForRuntime);
      updateMiniDash();
      setInterval(updateMiniDash, 5000);
    }
    attempts++;
  }, 100);
};

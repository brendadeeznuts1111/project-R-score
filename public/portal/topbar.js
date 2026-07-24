/**
 * Shared topbar — health dot (portal:data) + lazy tenant sidebar bootstrap.
 */

import { startDataService } from './data.js';
import {
  loadTenantManifest,
  resolveTenantId,
  renderSidebar,
  tenantRegistryPaths,
} from './components/sidebar.js';
import './components/notification.js';

let pendingHealthRaf = 0;
let sidebarBootstrapped = false;

function scheduleHealthUpdate(status, staleHint) {
  if (pendingHealthRaf) cancelAnimationFrame(pendingHealthRaf);
  pendingHealthRaf = requestAnimationFrame(() => {
    pendingHealthRaf = 0;
    applyHealthDot(status, staleHint);
  });
}

/**
 * @param {string} status ok|degraded|fail|unknown|offline
 * @param {boolean} [staleHint]
 */
function applyHealthDot(status, staleHint = false) {
  const dot = document.getElementById('health-dot');
  const label = document.getElementById('health-label');
  const link = document.querySelector('.topbar-health-link');
  if (!dot) return;

  const klass = status === 'offline' ? 'fail' : status;
  dot.className = `health-dot ${klass}`;
  if (label) {
    const suffix = staleHint ? ' (cached)' : '';
    label.textContent = `${status}${suffix}`;
  }
  if (link) {
    link.setAttribute('role', 'status');
    link.setAttribute('aria-live', 'polite');
    link.setAttribute('aria-label', `System health: ${status}${suffixFromHint(staleHint)}`);
  }
}

function suffixFromHint(staleHint) {
  return staleHint ? ', showing cached status' : '';
}

document.addEventListener('portal:data', e => {
  const { status, data, error } = e.detail || {};
  if (status === 'loading') return;

  if (status === 'ok' || status === 'stale') {
    const healthStatus = data?.status === 'degraded' ? 'degraded' : data?.status === 'ok' ? 'ok' : 'degraded';
    scheduleHealthUpdate(healthStatus, status === 'stale');
    return;
  }

  if (status === 'error') {
    const cached = data?.status;
    if (cached) {
      scheduleHealthUpdate(cached === 'ok' ? 'ok' : 'degraded', true);
    } else {
      scheduleHealthUpdate('offline', false);
    }
    if (error) console.warn('[portal:topbar] health error:', error);
  }
});

/**
 * Lazy-init tenant sidebar when visible (Registry page).
 */
async function bootstrapSidebar() {
  if (sidebarBootstrapped) return;
  const nav = document.getElementById('tenant-sidebar');
  if (!nav) return;

  const run = async () => {
    if (sidebarBootstrapped) return;
    sidebarBootstrapped = true;
    try {
      const tenants = await loadTenantManifest();
      const tenantId = resolveTenantId();
      renderSidebar(tenants, tenantId, id => {
        const params = new URLSearchParams(location.search);
        params.set('tenant', id);
        history.replaceState(null, '', `${location.pathname}?${params.toString()}${location.hash}`);
        document.dispatchEvent(new CustomEvent('portal:tenant', { detail: { tenantId: id, tenants } }));
        const nc = document.querySelector('notification-center');
        nc?.start?.(id);
      });
      document.querySelector('notification-center')?.start?.(tenantId);
      document.dispatchEvent(
        new CustomEvent('portal:tenant', { detail: { tenantId, tenants, initial: true } })
      );
    } catch (err) {
      console.warn('[portal:topbar] tenant sidebar failed:', err);
      sidebarBootstrapped = false;
    }
  };

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      if (entries.some(en => en.isIntersecting)) {
        io.disconnect();
        run();
      }
    });
    io.observe(nav);
    if (nav.offsetParent !== null) run();
  } else {
    run();
  }
}

if (!window.__portalDataStarted) {
  startDataService();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrapSidebar);
} else {
  bootstrapSidebar();
}

export { tenantRegistryPaths, resolveTenantId };

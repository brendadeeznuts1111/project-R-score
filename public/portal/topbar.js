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
import { markCurrentNavigation } from './navigation.js';
import { bootstrapNavBadges } from './nav-badges.js';
import { bootGlossaryUx } from './components/glossary-ux.js';
import { bootstrapDomainLanes } from './components/domain-lanes.js';
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
    label.setAttribute('role', 'status');
    label.setAttribute('aria-live', 'polite');
  }
  if (link) {
    link.dataset.status = klass;
    link.dataset.source = staleHint ? 'cache' : 'live';
    link.setAttribute('aria-label', `System health: ${status}${suffixFromHint(staleHint)}`);
  }
  document.documentElement.dataset.healthSignal = klass;
  document.dispatchEvent(
    new CustomEvent('portal:health-signal', {
      detail: { status: klass, source: staleHint ? 'cache' : 'live' },
    })
  );
}

function suffixFromHint(staleHint) {
  return staleHint ? ', showing cached status' : '';
}

document.addEventListener('portal:data', e => {
  const { status, data, error } = e.detail || {};
  if (status === 'loading') return;

  if (status === 'ok' || status === 'stale') {
    const healthStatus =
      data?.status === 'degraded' ? 'degraded' : data?.status === 'ok' ? 'ok' : 'degraded';
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
        document.dispatchEvent(
          new CustomEvent('portal:tenant', { detail: { tenantId: id, tenants } })
        );
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

/** Priority-nav overflow (⋯) — click toggle + outside close. */
function bootstrapNavOverflow() {
  document.querySelectorAll('.nav-overflow').forEach(wrap => {
    const btn = wrap.querySelector('.nav-more');
    if (!btn || btn.dataset.bound === '1') return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const open = wrap.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });
  document.addEventListener('click', () => {
    document.querySelectorAll('.nav-overflow.open').forEach(wrap => {
      wrap.classList.remove('open');
      wrap.querySelector('.nav-more')?.setAttribute('aria-expanded', 'false');
    });
  });
}

function normalizeBrandChrome() {
  document.documentElement.dataset.brand = 'factorywager';
  document.querySelectorAll('.logo-icon').forEach(mark => {
    mark.setAttribute('aria-hidden', 'true');
    mark.textContent = '';
  });

  const wordmark = document.querySelector('.brand-wordmark');
  if (wordmark) wordmark.textContent = 'FactoryWager';

  const title = document.title.trim();
  if (title && !title.includes('FactoryWager')) {
    document.title = `${title.split(' · ')[0]} · FactoryWager`;
  }
}

async function bootstrapGlossarySurface() {
  try {
    await bootGlossaryUx();
  } catch (error) {
    console.warn('[portal:topbar] glossary surface unavailable:', error);
  }
}

if (!window.__portalDataStarted) {
  startDataService();
}

function onReady() {
  normalizeBrandChrome();
  const navigation = markCurrentNavigation();
  if (navigation) {
    document.dispatchEvent(new CustomEvent('portal:navigation', { detail: navigation }));
  }
  bootstrapSidebar();
  bootstrapNavOverflow();
  bootstrapNavBadges();
  bootstrapDomainLanes();
  void bootstrapGlossarySurface();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', onReady);
} else {
  onReady();
}

export { tenantRegistryPaths, resolveTenantId };

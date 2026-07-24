/**
 * Tenant sidebar — switch registry context (WebP icons + SVG fallback).
 */

export async function loadTenantManifest() {
  const res = await fetch('/tenants/manifest.json', { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error('Tenant manifest unavailable');
  const data = await res.json();
  return data.tenants ?? [];
}

export function resolveTenantId() {
  const params = new URLSearchParams(location.search);
  const fromQuery = params.get('tenant');
  if (fromQuery) return fromQuery;
  const hash = location.hash.replace(/^#\/?/, '');
  if (hash && !hash.includes('=')) return hash.split('/')[0];
  return 'factory';
}

function tenantIconHtml(t) {
  const webp = t.iconSrc || `/icons/${t.id}/mark-32.webp`;
  const svg = t.iconSvg || `/icons/${t.id}/mark.svg`;
  const srcset =
    t.iconSrcset ||
    `/icons/${t.id}/mark-16.webp 16w, /icons/${t.id}/mark-32.webp 32w, /icons/${t.id}/mark-64.webp 64w`;
  // WebP + srcset; SVG fallback. Legacy emoji only if icon is non-id.
  if (t.iconSrc || t.iconSvg || /^[a-z][a-z0-9_-]*$/i.test(String(t.icon || ''))) {
    return `<img class="tenant-icon-img" src="${webp}" srcset="${srcset}" sizes="20px" alt="" width="20" height="20" loading="eager" decoding="async" onerror="this.onerror=null;this.removeAttribute('srcset');this.src='${svg}'" />`;
  }
  return `<span class="tenant-icon">${t.icon ?? ''}</span>`;
}

export function renderSidebar(tenants, activeId, onSelect) {
  const nav = document.getElementById('tenant-sidebar');
  if (!nav) return;
  nav.innerHTML = '';
  for (const t of tenants) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `tenant-btn${t.id === activeId ? ' active' : ''}`;
    btn.title = t.name;
    btn.dataset.tenant = t.id;
    btn.setAttribute('role', 'button');
    btn.setAttribute('tabindex', '0');
    btn.setAttribute('aria-pressed', t.id === activeId ? 'true' : 'false');
    if (t.color) btn.style.setProperty('--tenant-color', t.color);
    btn.innerHTML = `${tenantIconHtml(t)}<span class="tenant-name">${t.name}</span>`;
    const select = () => {
      const prev = nav.querySelector('.tenant-btn.active');
      prev?.classList.remove('active');
      prev?.setAttribute('aria-pressed', 'false');
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      onSelect(t.id);
    };
    btn.addEventListener('click', select);
    btn.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        select();
      }
    });
    nav.appendChild(btn);
  }
}

export function tenantRegistryPaths(tenantId, tenants) {
  const t = tenants.find(x => x.id === tenantId) ?? tenants[0];
  if (!t) {
    return {
      proxy: '/api/registry/registry.json',
      static: '/registry/registry.json',
    };
  }
  const key = `tenants/${tenantId}/registry.json`;
  return {
    proxy: `/api/registry/${key}`,
    static: t.staticRegistryPath,
  };
}

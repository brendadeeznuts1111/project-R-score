/**
 * Domain lane rail — partner desk first.
 * Hydrates from /registry/portal-chrome.json domainLanes[] when present.
 *
 * Mount targets:
 *   [data-domain-lanes]  — full chip rail (partners / account / limits boards)
 *   .nav-dropdown        — optional filter chips above overflow groups
 *
 * @see lib/portal/chrome-catalog.ts PORTAL_DOMAIN_LANE_META
 * @see docs/harness/tenants/partner-domain-map.md
 */

const CHROME_URL = '/registry/portal-chrome.json';

/** @type {{ id: string, label: string, description?: string, doc?: string, boardIds?: string[] }[] | null} */
let cachedLanes = null;

/**
 * @returns {Promise<{ id: string, label: string, description?: string, doc?: string, boardIds?: string[] }[]>}
 */
async function loadDomainLanes() {
  if (cachedLanes) return cachedLanes;
  try {
    const res = await fetch(CHROME_URL, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const cat = await res.json();
    if (Array.isArray(cat.domainLanes) && cat.domainLanes.length) {
      cachedLanes = cat.domainLanes;
      return cachedLanes;
    }
  } catch {
    /* offline bake */
  }
  return [];
}

/**
 * Sister boards for the active domain (from boardCoverage + domain field).
 * @param {string} domainId
 * @param {{ id: string, href: string, domain?: string, label?: string, tier?: string }[]} coverage
 */
function sisterBoards(domainId, coverage) {
  return coverage.filter(b => b.domain === domainId && b.tier !== 'unlisted' && b.href);
}

/**
 * @param {ParentNode} [root]
 */
export async function mountDomainLanes(root = document) {
  const hosts = root.querySelectorAll('[data-domain-lanes]');
  if (!hosts.length) return;

  const lanes = await loadDomainLanes();
  if (!lanes.length) return;

  let coverage = [];
  try {
    const res = await fetch(CHROME_URL, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const cat = await res.json();
      coverage = Array.isArray(cat.boardCoverage) ? cat.boardCoverage : [];
    }
  } catch {
    /* ignore */
  }

  const path = location.pathname.replace(/\/+$/, '') + '/';
  const activeBoard = coverage.find(
    b => b.href && (path === b.href || path.startsWith(b.href.replace(/\/+$/, '') + '/'))
  );
  const activeDomain =
    activeBoard?.domain || hosts[0]?.getAttribute('data-domain-lanes') || 'partner';

  for (const host of hosts) {
    const focus = host.getAttribute('data-domain-lanes') || activeDomain || 'partner';
    const lane = lanes.find(l => l.id === focus) || lanes[0];
    if (!lane) continue;

    const sisters = sisterBoards(lane.id, coverage).filter(b => b.href !== activeBoard?.href);
    const chips = sisters
      .slice(0, 8)
      .map(b => {
        const current =
          activeBoard?.id === b.id
            ? ' aria-current="page" class="domain-lane-chip is-current"'
            : ' class="domain-lane-chip"';
        return `<a href="${b.href}"${current}>${b.label || b.id}</a>`;
      })
      .join('');

    host.innerHTML = `
      <div class="domain-lane-rail" data-domain="${lane.id}">
        <div class="domain-lane-head">
          <span class="domain-lane-label">${lane.label}</span>
          <span class="domain-lane-desc">${lane.description || ''}</span>
        </div>
        <div class="domain-lane-chips" role="navigation" aria-label="${lane.label} boards">
          ${chips}
        </div>
      </div>`;
    host.hidden = false;
  }
}

/**
 * Filter overflow menu by domain when chip clicked (⋯ menu).
 * @param {ParentNode} [root]
 */
export async function mountOverflowDomainFilter(root = document) {
  const dropdowns = root.querySelectorAll('.nav-dropdown');
  if (!dropdowns.length) return;

  const lanes = await loadDomainLanes();
  if (!lanes.length) return;

  for (const dropdown of dropdowns) {
    if (dropdown.querySelector('.domain-filter')) continue;
    const filter = document.createElement('div');
    filter.className = 'domain-filter';
    filter.setAttribute('role', 'toolbar');
    filter.setAttribute('aria-label', 'Filter by domain');
    filter.innerHTML = [
      `<button type="button" class="domain-filter-chip is-active" data-domain-filter="all">All</button>`,
      ...lanes
        .filter(l => (l.boardIds?.length ?? 0) > 0)
        .map(
          l =>
            `<button type="button" class="domain-filter-chip" data-domain-filter="${l.id}" title="${(l.description || '').replace(/"/g, '&quot;')}">${l.label}</button>`
        ),
    ].join('');
    dropdown.insertBefore(filter, dropdown.firstChild);

    filter.addEventListener('click', e => {
      const btn = e.target.closest('[data-domain-filter]');
      if (!btn) return;
      const domain = btn.getAttribute('data-domain-filter');
      filter.querySelectorAll('.domain-filter-chip').forEach(el => {
        el.classList.toggle('is-active', el === btn);
      });
      dropdown.querySelectorAll('.nav-group').forEach(group => {
        const links = group.querySelectorAll('.nav-link[data-domain], .nav-link');
        let visible = 0;
        links.forEach(link => {
          const d = link.getAttribute('data-domain');
          const show = domain === 'all' || !d || d === domain;
          link.hidden = !show;
          if (show) visible += 1;
        });
        // hide empty groups
        const label = group.querySelector('.nav-group-label');
        const anyVisible = [...links].some(l => !l.hidden);
        group.hidden = !anyVisible;
        if (label) label.hidden = !anyVisible;
        void visible;
      });
    });
  }
}

export function bootstrapDomainLanes() {
  const run = () => {
    void mountDomainLanes();
    void mountOverflowDomainFilter();
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
}

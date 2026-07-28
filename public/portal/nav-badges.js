/**
 * Nav badges — client-side counts from baked registry JSON (no pass-cli, no secrets).
 * Targets overflow/priority links by href; sets data-badge + .nav-badge span.
 *
 * Sources:
 *   Failures  → /registry/failures.json totals.failures
 *   Vault     → /registry/vault-health.json summary.activeItems (or referencedOk)
 *   Packages  → /registry/packages-graph-map.json packages.length
 *   Health    → /registry/monorepo-health.json score (optional)
 *
 * @see lib/portal/chrome-catalog.ts data-cli / data-group
 */

const BADGE_SPECS = [
  {
    href: '/portal/failures/',
    source: '/registry/failures.json',
    pick: data => {
      const n = data?.totals?.failures;
      return typeof n === 'number' ? n : data?.failures?.length ?? null;
    },
    tone: n => (n > 0 ? 'bad' : 'ok'),
  },
  {
    href: '/portal/vault/',
    source: '/registry/vault-health.json',
    pick: data => {
      const s = data?.summary;
      if (typeof s?.activeItems === 'number') return s.activeItems;
      if (Array.isArray(data?.vaults)) {
        return data.vaults.reduce((a, v) => a + (v.active ?? 0), 0);
      }
      return null;
    },
    tone: n => (n === 0 ? 'warn' : 'ok'),
  },
  {
    href: '/portal/packages/',
    source: '/registry/packages-graph-map.json',
    pick: data => {
      if (Array.isArray(data?.packages)) return data.packages.length;
      if (Array.isArray(data?.map?.packages)) return data.map.packages.length;
      return data?.map?.summary?.packageCount ?? null;
    },
    tone: () => 'neutral',
  },
  {
    href: '/portal/health/',
    source: '/registry/monorepo-health.json',
    pick: data => {
      const score = data?.score ?? data?.summary?.score;
      return typeof score === 'number' ? score : null;
    },
    tone: n => (n >= 80 ? 'ok' : n >= 50 ? 'warn' : 'bad'),
    format: n => String(n),
  },
];

/**
 * @param {string} href
 * @param {string|number} text
 * @param {string} tone
 */
function applyBadge(href, text, tone) {
  const links = document.querySelectorAll(`.topbar-nav a[href="${href}"]`);
  for (const a of links) {
    a.dataset.badge = String(text);
    let span = a.querySelector(':scope > .nav-badge');
    if (!span) {
      span = document.createElement('span');
      span.className = 'nav-badge';
      span.setAttribute('aria-hidden', 'true');
      a.appendChild(span);
    }
    span.textContent = String(text);
    span.dataset.tone = tone;
    span.className = `nav-badge nav-badge--${tone}`;
  }
}

/**
 * @param {string} url
 */
async function fetchJson(url) {
  try {
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function applyNavBadges() {
  await Promise.all(
    BADGE_SPECS.map(async spec => {
      const data = await fetchJson(spec.source);
      if (!data) return;
      const n = spec.pick(data);
      if (n == null || Number.isNaN(n)) return;
      const text = spec.format ? spec.format(n) : String(n);
      applyBadge(spec.href, text, spec.tone(n));
    })
  );
  document.dispatchEvent(new CustomEvent('portal:nav-badges', { detail: { ok: true } }));
}

export function bootstrapNavBadges() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      void applyNavBadges();
    });
  } else {
    void applyNavBadges();
  }
}

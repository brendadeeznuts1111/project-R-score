/**
 * Shared portal footer — hydrate from /registry/portal-chrome.json when available.
 * @see docs/portal-foundation.md
 * @see public/registry/portal-chrome.json
 */

const FALLBACK_LINKS = [
  { label: 'Ops', href: '/portal/ops/' },
  { label: 'TOC', href: '/portal/toc/' },
  { label: 'Packages', href: '/portal/packages/' },
  { label: 'Health', href: '/portal/health/' },
  { label: 'Compliance', href: '/portal/compliance/' },
  { label: 'Monorepo health', href: '/registry/monorepo-health.json' },
  {
    label: 'GitHub',
    href: 'https://github.com/brendadeeznuts1111/project-R-score',
    external: true,
  },
];

/**
 * @param {Array<{label:string,href:string,external?:boolean}>} links
 */
function footerInnerHtml(links) {
  const parts = links.map(l => {
    const ext = l.external ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `<a href="${l.href}"${ext}>${l.label}</a>`;
  });
  return `<p>
      <strong>FactoryWager</strong> ·
      ${parts.join(' ·\n      ')}
    </p>
    <p class="footer-meta">
      project-R-score · chrome <a href="/registry/portal-chrome.json"><code>portal-chrome.json</code></a>
      · <span data-footer-ts></span>
    </p>`;
}

/**
 * Ensure a footer exists and is hydrated.
 * @param {ParentNode} [root]
 */
export async function mountPortalFooter(root = document) {
  let footer = root.querySelector('footer.footer');
  if (!footer) {
    footer = document.createElement('footer');
    footer.className = 'footer';
    footer.dataset.portalChrome = 'footer';
    const body = root.body || document.body;
    body?.appendChild(footer);
  }
  footer.dataset.portalChrome = 'footer';

  let links = FALLBACK_LINKS;
  try {
    const res = await fetch('/registry/portal-chrome.json', {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (res.ok) {
      const cat = await res.json();
      if (Array.isArray(cat.footerLinks) && cat.footerLinks.length) {
        links = cat.footerLinks;
      }
    }
  } catch {
    /* offline / missing bake */
  }

  footer.innerHTML = footerInnerHtml(links);
  const ts = footer.querySelector('[data-footer-ts]');
  if (ts) ts.textContent = new Date().toISOString().slice(0, 19) + 'Z';
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      void mountPortalFooter();
    });
  } else {
    void mountPortalFooter();
  }
}

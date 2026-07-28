/**
 * Shared portal navigation state.
 *
 * HTML shells provide stable hrefs; this module owns runtime current-page
 * semantics so trailing slashes and index documents cannot drift the signal.
 */

const NAVIGATION_BASE = 'https://portal.invalid';

export function canonicalNavigationPath(value) {
  let pathname;
  try {
    pathname = new URL(value || '/', NAVIGATION_BASE).pathname;
  } catch {
    pathname = '/';
  }

  pathname = pathname.replace(/\/{2,}/g, '/').replace(/\/index(?:\.html)?$/i, '');
  if (pathname.length > 1) pathname = pathname.replace(/\/+$/, '');
  return pathname || '/';
}

export function resolveCurrentNavigationHref(pathname, hrefs, origin = NAVIGATION_BASE) {
  const currentPath = canonicalNavigationPath(pathname);
  const currentOrigin = new URL(origin, NAVIGATION_BASE).origin;

  for (const href of hrefs) {
    try {
      const candidate = new URL(href, currentOrigin);
      if (candidate.origin !== currentOrigin) continue;
      if (canonicalNavigationPath(candidate.pathname) === currentPath) return href;
    } catch {
      // Invalid hrefs are ignored here and remain visible to the static verifier.
    }
  }

  return null;
}

export function markCurrentNavigation(root = document, locationLike = window.location) {
  const nav = root.querySelector('.topbar-nav');
  if (!nav) return null;

  const links = [...nav.querySelectorAll('a.nav-link[href]')];
  const hrefs = links.map(link => link.getAttribute('href') || '');
  const currentHref = resolveCurrentNavigationHref(
    locationLike.pathname,
    hrefs,
    locationLike.origin
  );
  const currentPath = canonicalNavigationPath(locationLike.pathname);
  let currentLink = null;

  for (const link of links) {
    const active = currentLink === null && link.getAttribute('href') === currentHref;
    link.classList.toggle('active', active);
    if (active) {
      link.setAttribute('aria-current', 'page');
      currentLink = link;
    } else {
      link.removeAttribute('aria-current');
    }
  }

  nav.dataset.currentPath = currentPath;
  nav.dataset.currentHref = currentHref || '';

  return {
    path: currentPath,
    href: currentHref,
    label: currentLink?.textContent?.trim() || null,
  };
}

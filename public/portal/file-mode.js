/**
 * Friendly handoff for portal HTML opened directly from disk.
 *
 * The real portal remains HTTP-only: root-relative assets, APIs, Access, and
 * registry fetches need an origin. This classic relative script still loads
 * under file:// and replaces the broken-looking shell with actionable routes.
 *
 * @see https://bun.com/blog/bun-v1.3.4#urlpattern-api — URLPattern component routing
 * @see https://bun.com/blog/bun-v1.3.12#urlpattern-is-up-to-2-3x-faster — test/exec fast path
 */
(function installFileModeHandoff() {
  if (location.protocol !== 'file:') return;

  const LOCAL_PORTAL_ORIGIN = 'http://localhost:3000';
  const DEPLOYED_PORTAL_ORIGIN = 'https://score.factory-wager.com';
  const portalDestinationPatterns =
    typeof URLPattern === 'function'
      ? {
          local: new URLPattern({
            protocol: 'http',
            hostname: 'localhost',
            port: '3000',
            pathname: '/portal/:surface(.*)',
          }),
          deployed: new URLPattern({
            protocol: 'https',
            hostname: 'score.factory-wager.com',
            pathname: '/portal/:surface(.*)',
          }),
        }
      : null;

  document.documentElement.dataset.portalRuntime = 'file';

  function portalRoute() {
    const path = location.pathname;
    const publicMarker = '/public/';
    const markerAt = path.lastIndexOf(publicMarker);
    if (markerAt < 0) return '/portal/';

    let route = `/${path.slice(markerAt + publicMarker.length)}`;
    route = route.replace(/\/index\.html$/, '/');
    return route;
  }

  function portalUrl(origin, destination) {
    let target = new URL(portalRoute(), origin);
    const pattern = portalDestinationPatterns?.[destination];
    const matches = pattern
      ? pattern.test(target)
      : target.origin === origin && target.pathname.startsWith('/portal/');

    if (!matches) target = new URL('/portal/', origin);

    // Hashes are client-side semantic routes. Queries are intentionally not
    // forwarded because they cross the HTTP boundary and require allowlisting.
    target.hash = location.hash;
    return target;
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function action(label, href, primary, origin) {
    const link = element('a', primary ? 'file-mode-action primary' : 'file-mode-action', label);
    link.href = href;
    link.referrerPolicy = 'no-referrer';
    link.rel = 'noreferrer';
    link.dataset.portalOrigin = origin;
    return link;
  }

  function mount() {
    if (!document.body || document.querySelector('.file-mode-guard')) return;

    const localUrl = portalUrl(LOCAL_PORTAL_ORIGIN, 'local');
    const deployedUrl = portalUrl(DEPLOYED_PORTAL_ORIGIN, 'deployed');
    const guard = element('main', 'file-mode-guard');
    guard.setAttribute('aria-labelledby', 'file-mode-title');

    const panel = element('section', 'file-mode-panel');
    panel.append(element('span', 'file-mode-badge', 'Local file · HTTP handoff'));

    const title = element('h1', '', 'Open this portal through an origin');
    title.id = 'file-mode-title';
    panel.append(title);
    panel.append(
      element(
        'p',
        'file-mode-lead',
        'This disk copy is intact. Its styles, registry evidence, and health APIs require the local Bun server or the deployed Cloudflare origin.'
      )
    );

    const actions = element('nav', 'file-mode-actions');
    actions.setAttribute('aria-label', 'Portal origins');
    actions.append(
      action('Open local portal', localUrl.href, true, 'local'),
      action('Open deployed portal', deployedUrl.href, false, 'deployed')
    );
    panel.append(actions);

    const command = element('div', 'file-mode-command');
    command.append(
      element('span', '', 'Start locally'),
      element('code', '', 'bun run serve:public:hot')
    );
    panel.append(command);

    const boundary = element('div', 'file-mode-boundary');
    boundary.append(
      element('strong', '', 'Why the handoff?'),
      element(
        'p',
        '',
        'Browser file mode has no HTTP origin. Paths such as /portal/style.css and /api/health cannot resolve to this repository’s public root.'
      ),
      element('strong', '', 'Deployed security'),
      element(
        'p',
        '',
        'Cloudflare Access handles authorized sign-in and the edge session before the deployed portal loads. Authentication responses stay private and no-store; portal assets retain their explicit cache policy.'
      )
    );
    panel.append(boundary);

    guard.append(panel);
    document.body.prepend(guard);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else {
    mount();
  }
})();

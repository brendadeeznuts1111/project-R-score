/**
 * Friendly handoff for portal HTML opened directly from disk.
 *
 * The real portal remains HTTP-only: root-relative assets, APIs, Access, and
 * registry fetches need an origin. This classic relative script still loads
 * under file:// and replaces the broken-looking shell with actionable routes.
 */
(function installFileModeHandoff() {
  if (location.protocol !== 'file:') return;

  document.documentElement.dataset.portalRuntime = 'file';

  function portalRoute() {
    const path = decodeURIComponent(location.pathname);
    const publicMarker = '/public/';
    const markerAt = path.lastIndexOf(publicMarker);
    if (markerAt < 0) return '/portal/';

    let route = `/${path.slice(markerAt + publicMarker.length)}`;
    route = route.replace(/\/index\.html$/, '/');
    return route.startsWith('/portal/') ? route : '/portal/';
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function action(label, href, primary) {
    const link = element('a', primary ? 'file-mode-action primary' : 'file-mode-action', label);
    link.href = href;
    return link;
  }

  function mount() {
    if (!document.body || document.querySelector('.file-mode-guard')) return;

    const route = portalRoute();
    const localUrl = new URL(route, 'http://localhost:3000');
    const deployedUrl = new URL(route, 'https://project-r-score.pages.dev');
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
      action('Open local portal', localUrl.href, true),
      action('Open deployed portal', deployedUrl.href, false)
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

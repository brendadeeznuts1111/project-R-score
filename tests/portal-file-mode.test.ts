// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';

type FakeElement = {
  readonly tagName: string;
  readonly children: FakeElement[];
  readonly attributes: Record<string, string>;
  readonly dataset: Record<string, string>;
  className: string;
  href: string;
  id: string;
  referrerPolicy: string;
  rel: string;
  textContent: string;
  append: (...children: FakeElement[]) => void;
  prepend: (...children: FakeElement[]) => void;
  setAttribute: (name: string, value: string) => void;
};

function fakeElement(tagName: string): FakeElement {
  const children: FakeElement[] = [];
  const attributes: Record<string, string> = {};
  return {
    tagName,
    children,
    attributes,
    dataset: {},
    className: '',
    href: '',
    id: '',
    referrerPolicy: '',
    rel: '',
    textContent: '',
    append: (...nodes) => children.push(...nodes),
    prepend: (...nodes) => children.unshift(...nodes),
    setAttribute: (name, value) => {
      attributes[name] = value;
    },
  };
}

async function renderFileModeHandoff(pathname: string, hash = '', search = '') {
  const script = await Bun.file('public/portal/file-mode.js').text();
  const links: FakeElement[] = [];
  let mount: (() => void) | undefined;
  const body = fakeElement('body');
  const documentElement = fakeElement('html');
  const document = {
    body,
    documentElement,
    readyState: 'loading',
    querySelector: () => null,
    createElement: (tagName: string) => {
      const node = fakeElement(tagName);
      if (tagName === 'a') links.push(node);
      return node;
    },
    addEventListener: (_event: string, listener: () => void) => {
      mount = listener;
    },
  };
  const location = { protocol: 'file:', pathname, hash, search };
  const execute = new Function('location', 'document', 'URL', 'URLPattern', script);

  execute(location, document, URL, URLPattern);
  mount?.();

  return { body, documentElement, links };
}

describe('portal file-mode handoff', () => {
  test('health and the page template load the relative handoff before root assets', async () => {
    const [health, template] = await Promise.all([
      Bun.file('public/portal/health/index.html').text(),
      Bun.file('public/portal/_page-template.html').text(),
    ]);

    for (const html of [health, template]) {
      expect(html).toContain('href="../file-mode.css"');
      expect(html).toContain('src="../file-mode.js"');
      expect(html.indexOf('../file-mode.js')).toBeLessThan(html.indexOf('/portal/style.css'));
    }
  });

  test('file mode preserves the portal route across local and canonical deployed origins', async () => {
    const script = await Bun.file('public/portal/file-mode.js').text();

    expect(script).toContain("location.protocol !== 'file:'");
    expect(script).toContain("const publicMarker = '/public/'");
    expect(script).toContain("route.replace(/\\/index\\.html$/, '/')");
    expect(script).toContain("const LOCAL_PORTAL_ORIGIN = 'http://localhost:3000'");
    expect(script).toContain(
      "const DEPLOYED_PORTAL_ORIGIN = 'https://score.factory-wager.com'"
    );
    expect(script).toContain("pathname: '/portal/:surface(.*)'");
    expect(script).toContain("hostname: 'score.factory-wager.com'");
    expect(script).toContain('pattern.test(target)');
    expect(script).toContain("target.hash = location.hash");
    expect(script).not.toContain("'https://project-r-score.pages.dev'");
    expect(script).toContain('bun run serve:public:hot');
    expect(script).not.toContain('location.replace(');
  });

  test('executed handoff preserves glossary hashes while omitting file query strings', async () => {
    const { documentElement, links } = await renderFileModeHandoff(
      '/Users/operator/Projects/public/portal/glossary/index.html',
      '#glossary:ops.view.account_net',
      '?debug=local-only'
    );

    expect(documentElement.dataset.portalRuntime).toBe('file');
    expect(
      links.map(link => ({
        href: link.href,
        origin: link.dataset.portalOrigin,
        referrerPolicy: link.referrerPolicy,
        rel: link.rel,
      }))
    ).toEqual([
      {
        href: 'http://localhost:3000/portal/glossary/#glossary:ops.view.account_net',
        origin: 'local',
        referrerPolicy: 'no-referrer',
        rel: 'noreferrer',
      },
      {
        href: 'https://score.factory-wager.com/portal/glossary/#glossary:ops.view.account_net',
        origin: 'deployed',
        referrerPolicy: 'no-referrer',
        rel: 'noreferrer',
      },
    ]);
  });

  test('URLPattern checks the normalized destination before falling back to portal root', async () => {
    const { links } = await renderFileModeHandoff(
      '/Users/operator/Projects/public/portal/%2e%2e/account/index.html',
      '#book/book-dk-nj'
    );

    expect(links.map(link => link.href)).toEqual([
      'http://localhost:3000/portal/#book/book-dk-nj',
      'https://score.factory-wager.com/portal/#book/book-dk-nj',
    ]);
  });

  test('origin actions suppress referrers and explain the Cloudflare Access boundary', async () => {
    const script = await Bun.file('public/portal/file-mode.js').text();

    expect(script).toContain("link.referrerPolicy = 'no-referrer'");
    expect(script).toContain("link.rel = 'noreferrer'");
    expect(script).toContain('link.dataset.portalOrigin = origin');
    expect(script).toContain("action('Open local portal', localUrl.href, true, 'local')");
    expect(script).toContain("action('Open deployed portal', deployedUrl.href, false, 'deployed')");
    expect(script).toContain('Cloudflare Access handles authorized sign-in and the edge session');
    expect(script).toContain('Authentication responses stay private and no-store');
  });

  test('critical file-mode styling hides the broken shell and keeps the handoff visible', async () => {
    const css = await Bun.file('public/portal/file-mode.css').text();

    expect(css).toContain('html[data-portal-runtime="file"]');
    expect(css).toContain("body > :not(.file-mode-guard)");
    expect(css).toContain('display: none !important');
    expect(css).toContain('html[data-portal-runtime="file"] .file-mode-guard');
  });
});

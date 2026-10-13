import { expect, test } from 'bun:test';
import { runInNewContext } from 'node:vm';
import {
  rssBrowserRendererSource,
  rssBrowserUrlParserSource,
} from '../lib/rss/rss-browser-renderer.ts';

class TestNode {
  children: TestNode[] = [];
  ownText = '';
  className = '';
  style: Record<string, string> = {};
  dataset: Record<string, string> = {};
  href = '';
  rel = '';
  target = '';
  type = '';
  scope = '';
  events = new Map<string, () => void>();
  constructor(
    readonly tag: string,
    readonly ownerDocument: TestDocument
  ) {}
  set innerHTML(_value: string) {
    throw new Error('HTML sink used');
  }
  set textContent(value: string) {
    this.ownText = value;
    this.children = [];
  }
  get textContent(): string {
    return this.ownText + this.children.map(child => child.textContent).join('');
  }
  append(...children: TestNode[]) {
    this.children.push(...children);
  }
  replaceChildren(...children: TestNode[]) {
    this.ownText = '';
    this.children = children;
  }
  addEventListener(event: string, callback: () => void) {
    this.events.set(event, callback);
  }
  all(tag: string): TestNode[] {
    return this.children.flatMap(child => [
      ...(child.tag === tag ? [child] : []),
      ...child.all(tag),
    ]);
  }
}
class TestDocument {
  createElement(tag: string) {
    return new TestNode(tag, this);
  }
  createTextNode(text: string) {
    const node = new TestNode('#text', this);
    node.textContent = text;
    return node;
  }
}

// XML parsing is a fixture adapter; the browser boundary uses DOMParser, never Bun.XML.
class FixtureParser {
  parseFromString(xml: string) {
    let channel: { title?: string; item?: Record<string, string> | Record<string, string>[] };
    try {
      channel = (Bun.XML.parse(xml) as { rss: { channel: typeof channel } }).rss.channel;
    } catch {
      return { querySelector: () => ({}), querySelectorAll: () => [] };
    }
    const entries = channel.item
      ? Array.isArray(channel.item)
        ? channel.item
        : [channel.item]
      : [];
    return {
      querySelector: (selector: string) =>
        selector === 'channel > title' ? { textContent: channel.title } : null,
      querySelectorAll: () =>
        entries.map(item => ({
          querySelector: (selector: string) => ({ textContent: item[selector] || '' }),
        })),
    };
  }
}
function harness(Parser = FixtureParser) {
  const document = new TestDocument(),
    root = document.createElement('div');
  const copies: string[] = [];
  const context = { DOMParser: Parser, URL, Error, document, root, copies };
  const render = runInNewContext(`${rssBrowserRendererSource()}`, context) as (
    root: TestNode,
    xml: string | null,
    source: string,
    meta: { rssUrl?: string; rssKey?: string; bucket?: string; error?: string } | null,
    age: (date: Date) => string,
    copy: (value: string) => void,
    parse: (url: string, field: string) => string
  ) => string | null;
  const parseUrl = runInNewContext(rssBrowserUrlParserSource(), context);
  return {
    root,
    copies,
    render: (xml: string | null, source = 'local', meta = {}) =>
      render(
        root,
        xml,
        source,
        meta,
        () => 'just now',
        value => copies.push(value),
        parseUrl
      ),
  };
}
const hostile = `'"><img src=x onerror=alert(1)><script>alert(2)</script>`;
function feed(link: string, extraItems = '') {
  return `<rss><channel><title><![CDATA[${hostile}]]></title><item><title><![CDATA[${hostile}]]></title><pubDate><![CDATA[${hostile}]]></pubDate><guid><![CDATA[${hostile}]]></guid><link><![CDATA[${link}]]></link></item>${extraItems}</channel></rss>`;
}

test('generated browser renderer keeps hostile decoded fields as text and binds safe actions', () => {
  const h = harness(),
    url = `https://example.com/path?q=${encodeURIComponent(hostile)}`;
  expect(
    h.render(feed(url), hostile, { rssUrl: url, bucket: hostile, rssKey: 'prefix/' + hostile })
  ).toBe(hostile);
  expect(h.root.textContent).toContain(hostile);
  expect(h.root.textContent).toContain('📦 ' + hostile);
  expect(h.root.textContent).toContain('📄 ' + hostile.split('/').pop());
  expect(h.root.all('img')).toHaveLength(0);
  expect(h.root.all('script')).toHaveLength(0);
  expect(h.root.all('span').some(node => node.dataset.tooltip === hostile)).toBe(true);
  const anchors = h.root.all('a');
  expect(anchors.map(node => node.href)).toEqual([
    '/api/rss?source=' + encodeURIComponent(hostile),
    new URL(url).href,
  ]);
  for (const anchor of anchors) expect(anchor.rel).toBe('noopener noreferrer');
  expect(h.copies).toEqual([]);
  for (const button of h.root.all('button')) button.events.get('click')?.();
  expect(h.copies).toEqual([new URL(url).href, new URL(url).href]);
  expect(rssBrowserRendererSource()).not.toMatch(/innerHTML|onclick|Bun\.XML/);
});

test('unsafe or absent URLs have no item open/copy or feed copy actions', () => {
  for (const url of [
    'javascript:alert(1)',
    'data:text/html,boom',
    'file:///secret',
    '//example.com',
    'https://user:password@example.com/',
    '',
    '#',
  ]) {
    const h = harness();
    h.render(feed(url), 'local', { rssUrl: url });
    expect(h.root.all('a').map(node => node.href)).toEqual(['/api/rss?source=local']);
    expect(h.root.all('button')).toHaveLength(0);
    expect(h.root.textContent).toContain('Link unavailable');
  }
  const http = harness();
  http.render(feed('http://example.com/'));
  expect(http.root.all('a')[1]?.href).toBe('http://example.com/');
});

test('parsererror and thrown errors clear old rows without updating the GUID or creating markup', () => {
  const h = harness();
  h.render(feed('https://example.com/'));
  expect(h.render('<rss><item></rss>')).toBeNull();
  expect(h.root.textContent).toContain('RSS Parse Error');
  expect(h.root.all('table')).toHaveLength(0);
  expect(h.render(null)).toBeNull();
  expect(h.root.textContent).toContain('RSS Feed Unavailable');
  class ThrowingParser extends FixtureParser {
    parseFromString(_xml: string): ReturnType<FixtureParser['parseFromString']> {
      throw new Error(hostile);
    }
  }
  const thrown = harness(ThrowingParser);
  expect(thrown.render('<rss/>', 'local', { error: hostile })).toBeNull();
  expect(thrown.root.textContent).toContain(hostile);
  expect(thrown.root.all('img')).toHaveLength(0);
});

test('ten-item layout and GUID fallback remain intact and dashboard embeds canonical browser functions', async () => {
  const h = harness();
  const items = Array.from(
    { length: 12 },
    (_, i) =>
      `<item><title>${i}</title><link>https://example.com/${i}</link><pubDate>Mon, 12 Oct 2026 12:00:00 GMT</pubDate></item>`
  ).join('');
  expect(h.render(`<rss><channel><title>Feed</title>${items}</channel></rss>`)).toBe(
    'https://example.com/0'
  );
  expect(h.root.all('tbody')[0]?.all('tr')).toHaveLength(10);
  expect(h.root.all('th').map(node => node.scope)).toEqual(['col', 'col', 'col']);
  expect(h.root.textContent).toContain('just now');
  const source = await Bun.file(
    new URL('../scripts/search-benchmark-dashboard.ts', import.meta.url)
  ).text();
  expect(source).toContain('const renderRssDom = ${rssBrowserRendererSource()}');
  expect(source).toContain('const parseRssLink = ${rssBrowserUrlParserSource()}');
  expect(source).toContain('if (latestGuid && !currentRssGuid) currentRssGuid = latestGuid');
  expect(source).toContain('if (latestGuid && !knownRssGuid) knownRssGuid = latestGuid');
  expect(source).toContain("if (doc.querySelector('parsererror')) return null");
});

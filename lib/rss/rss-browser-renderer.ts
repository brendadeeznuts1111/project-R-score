import { absoluteHttpUrl } from './rss-xml-validation.ts';

type RssBrowserMeta = { rssUrl?: string | null; bucket?: string; rssKey?: string; error?: string };

/** Browser-only DOM renderer. Serialized below so tests exercise the shipped function. */
export function renderRssBrowser(
  root: HTMLElement,
  xmlText: string | null,
  source: string,
  meta: RssBrowserMeta | null,
  timeAgo: (date: Date) => string,
  copyToClipboard: (value: string, button: HTMLButtonElement) => void,
  parseUrl: typeof absoluteHttpUrl
): string | null {
  const document = root.ownerDocument;
  const element = <K extends keyof HTMLElementTagNameMap>(
    tag: K,
    text?: string,
    className?: string
  ) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  const safeUrl = (value: string | null | undefined) => {
    try {
      return parseUrl(value || '', 'RSS link');
    } catch {
      return null;
    }
  };
  const copyButton = (value: string, label: string) => {
    const button = element('button', label, 'copy-btn');
    button.type = 'button';
    button.addEventListener('click', () => copyToClipboard(value, button));
    return button;
  };
  root.replaceChildren();
  if (!xmlText || typeof xmlText !== 'string') {
    const empty = element('div', undefined, 'empty-state');
    const heading = element('div');
    heading.append(element('strong', 'RSS Feed Unavailable'));
    const description = element('div', 'No feed data or source not configured');
    description.style.marginTop = '4px';
    empty.append(element('span', '📡', 'empty-icon'), heading, description);
    root.append(empty);
    return null;
  }
  try {
    const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
    if (doc.querySelector('parsererror')) throw new Error('Invalid feed content');
    const items = Array.from(doc.querySelectorAll('item')).slice(0, 10);
    const latestGuid =
      items[0]?.querySelector('guid')?.textContent ||
      items[0]?.querySelector('link')?.textContent ||
      null;
    const header = element('div');
    header.style.cssText =
      'display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px';
    const titleGroup = element('div');
    const title = element('div', doc.querySelector('channel > title')?.textContent || 'RSS Feed');
    title.style.cssText = 'font-size:16px;font-weight:600;margin-bottom:4px';
    const subtitle = element('div', undefined, 'meta');
    subtitle.append(
      document.createTextNode(items.length + ' items · source: '),
      element('code', source)
    );
    titleGroup.append(title, subtitle);
    const actions = element('div', undefined, 'pill-row');
    actions.style.margin = '0';
    const feedUrl = safeUrl(meta?.rssUrl);
    if (feedUrl) actions.append(copyButton(feedUrl, '📋 Copy Feed URL'));
    const raw = element('a', 'View Raw ↗', 'badge status-neutral');
    raw.href = '/api/rss?source=' + encodeURIComponent(source);
    raw.target = '_blank';
    raw.rel = 'noopener noreferrer';
    raw.style.textDecoration = 'none';
    actions.append(raw);
    header.append(titleGroup, actions);
    root.append(header);
    if (meta && !meta.error) {
      const info = element('div');
      info.style.cssText =
        'display:flex;gap:16px;flex-wrap:wrap;margin-bottom:16px;font-size:12px;color:var(--muted)';
      const bucket = element('span', '📦 ' + (meta.bucket || 'n/a'));
      bucket.dataset.tooltip = 'Storage bucket';
      const key = element('span', '📄 ' + ((meta.rssKey || 'n/a').split('/').pop() || 'n/a'));
      key.dataset.tooltip = 'RSS file path';
      info.append(bucket, key);
      root.append(info);
    }
    const scroll = element('div', undefined, 'table-scroll');
    const table = element('table'),
      head = element('thead'),
      headings = element('tr');
    for (const label of ['Title', 'When', 'Actions']) {
      const cell = element('th', label);
      cell.scope = 'col';
      headings.append(cell);
    }
    head.append(headings);
    const body = element('tbody');
    items.forEach((item, index) => {
      const row = element('tr');
      if (index === 0) row.style.background = 'rgba(79,209,197,0.05)';
      const titleCell = element('td'),
        itemTitle = element('span', item.querySelector('title')?.textContent || 'untitled');
      itemTitle.style.fontWeight = index === 0 ? '600' : '400';
      titleCell.append(itemTitle);
      if (index === 0)
        titleCell.append(
          document.createTextNode(' '),
          element('span', 'latest', 'badge status-good')
        );
      const date = item.querySelector('pubDate')?.textContent || 'n/a',
        parsed = new Date(date);
      const when = element('span', Number.isNaN(parsed.getTime()) ? 'unknown' : timeAgo(parsed));
      when.dataset.tooltip = date;
      const whenCell = element('td');
      whenCell.append(when);
      const links = element('td'),
        url = safeUrl(item.querySelector('link')?.textContent);
      if (url) {
        const open = element('a', 'open ↗');
        open.href = url;
        open.target = '_blank';
        open.rel = 'noopener noreferrer';
        open.style.marginRight = '8px';
        links.append(open, copyButton(url, 'copy'));
      } else links.append(element('span', 'Link unavailable'));
      row.append(titleCell, whenCell, links);
      body.append(row);
    });
    table.append(head, body);
    scroll.append(table);
    root.append(scroll);
    return latestGuid;
  } catch (error) {
    const box = element('div', undefined, 'info-box error');
    const detail = element('div', error instanceof Error ? error.message : 'Invalid feed content');
    detail.style.fontSize = '12px';
    box.append(element('div', '❌ RSS Parse Error', 'info-box-title'), detail);
    root.replaceChildren(box);
    return null;
  }
}

export function rssBrowserRendererSource(): string {
  return `(${renderRssBrowser.toString()})`;
}

export function rssBrowserUrlParserSource(): string {
  return `(${absoluteHttpUrl.toString()})`;
}

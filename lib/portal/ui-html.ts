/**
 * Portal UI HTML builders — pure strings for boards and bakes.
 *
 * Browser twin: `public/portal/components/portal-ui.js` (keep API aligned).
 * CSS SSOT: `public/portal/style.css` (Board primitives · `.portal-table`).
 *
 * @see docs/portal-foundation.md
 */

export type PortalTone = 'ok' | 'warn' | 'bad' | 'muted' | 'neutral' | '';

export type PortalStatItem = {
  label: string;
  value: string | number;
  hint?: string;
  tone?: PortalTone;
  /** When set, rendered as `<button class="portal-stat">` for filters. */
  button?: boolean;
  active?: boolean;
  disabled?: boolean;
  attrs?: Record<string, string>;
};

export type PortalTableColumn = {
  key: string;
  label: string;
  /** Optional th class list */
  className?: string;
};

export type PortalTableCell =
  | string
  | number
  | null
  | undefined
  | {
      html: string;
      className?: string;
    };

export type PortalTableRowOpts = {
  emptyMessage?: string;
  /**
   * Full empty-state markup (must be `<tr>…</tr>` fragment(s)).
   * When set, overrides `emptyMessage`.
   */
  emptyHtml?: string;
  rowClass?: (rowIndex: number) => string | undefined;
  /** Extra attributes on each `<tr>` (id, data-*, aria-*). Values are escaped. */
  rowAttrs?: (rowIndex: number) => Record<string, string> | undefined;
};

export type PortalTableOpts = PortalTableRowOpts & {
  density?: 'compact' | 'default';
  zebra?: boolean;
  tone?: 'accent' | 'warn' | 'bad';
  className?: string;
  /** Extra attributes on the `<table>` element (e.g. aria-label, id). */
  tableAttrs?: Record<string, string>;
};

export function escHtml(value: string | number | boolean | null | undefined): string {
  return String(value ?? '').replace(
    /[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
  );
}

function attrsHtml(attrs: Record<string, string> | undefined): string {
  if (!attrs) return '';
  return Object.entries(attrs)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => ` ${escHtml(k)}="${escHtml(v)}"`)
    .join('');
}

/** Status / tone chip — uses shared `.tone-chip` contract. */
export function renderToneChip(label: string, tone: PortalTone = 'neutral'): string {
  const t = tone && tone !== 'muted' ? tone : 'neutral';
  return `<span class="tone-chip tone-${escHtml(t)}">${escHtml(label)}</span>`;
}

/** Compact chip (links or plain). Prefer over per-board `.chip`. */
export function renderPortalChip(
  label: string,
  opts: { href?: string; muted?: boolean; className?: string } = {}
): string {
  const cls = ['portal-chip', opts.muted ? 'portal-chip--muted' : '', opts.className ?? '']
    .filter(Boolean)
    .join(' ');
  if (opts.href) {
    return `<a class="${cls}" href="${escHtml(opts.href)}">${escHtml(label)}</a>`;
  }
  return `<span class="${cls}">${escHtml(label)}</span>`;
}

/**
 * Metric card nodes — `.portal-stat` only.
 * Callers wrap with `.portal-stat-grid` when they own the host element.
 */
export function renderPortalStatGrid(items: readonly PortalStatItem[]): string {
  return items
    .map(item => {
      const tone = item.tone && item.tone !== 'neutral' ? item.tone : 'muted';
      const active = item.active ? ' active' : '';
      const cls = `portal-stat ${tone}${active}`;
      const attrs = attrsHtml(item.attrs);
      const body =
        `<span class="kicker">${escHtml(item.label)}</span>` +
        `<span class="v">${escHtml(item.value)}</span>` +
        (item.hint != null && item.hint !== ''
          ? `<span class="hint">${escHtml(item.hint)}</span>`
          : '');
      if (item.button) {
        const disabled = item.disabled ? ' disabled' : '';
        return `<button type="button" class="${cls}"${disabled}${attrs}>${body}</button>`;
      }
      return `<div class="${cls}"${attrs}>${body}</div>`;
    })
    .join('');
}

export type PortalBannerTone = 'ok' | 'warn' | 'bad' | '';

/** Status strip — `.portal-banner` + tone + title/meta. */
export function renderPortalBanner(opts: {
  title: string;
  meta?: string;
  tone?: PortalBannerTone;
  /** Pre-escaped trailing HTML (actions). */
  trailingHtml?: string;
}): string {
  const tone = opts.tone ?? '';
  const cls = tone ? `portal-banner ${tone}` : 'portal-banner';
  const meta =
    opts.meta != null && opts.meta !== '' ? `<div class="meta">${escHtml(opts.meta)}</div>` : '';
  const trailing = opts.trailingHtml != null && opts.trailingHtml !== '' ? opts.trailingHtml : '';
  return (
    `<div class="${escHtml(cls)}" role="status">` +
    `<span class="dot" aria-hidden="true"></span>` +
    `<div><div class="title">${escHtml(opts.title)}</div>${meta}</div>` +
    trailing +
    `</div>`
  );
}

/** In-page title row — `.portal-hero` or raised `.portal-hero--card`. */
export function renderPortalHero(opts: {
  title: string;
  sub?: string;
  eyebrow?: string;
  /** Pre-escaped meta row (gates / links). */
  metaHtml?: string;
  card?: boolean;
  titleTag?: 'h1' | 'h2';
}): string {
  const tag = opts.titleTag ?? (opts.card ? 'h2' : 'h1');
  const cls = opts.card ? 'portal-hero portal-hero--card' : 'portal-hero';
  const eyebrow =
    opts.eyebrow != null && opts.eyebrow !== ''
      ? `<p class="portal-eyebrow">${escHtml(opts.eyebrow)}</p>`
      : '';
  const sub =
    opts.sub != null && opts.sub !== '' ? `<p class="hero-sub">${escHtml(opts.sub)}</p>` : '';
  const meta =
    opts.metaHtml != null && opts.metaHtml !== ''
      ? `<div class="portal-hero-meta">${opts.metaHtml}</div>`
      : '';
  return (
    `<header class="${cls}">` +
    eyebrow +
    `<${tag} class="portal-hero__title">${escHtml(opts.title)}</${tag}>` +
    sub +
    meta +
    `</header>`
  );
}

export type PortalPillKind = 'accent' | 'rest' | 'webview' | 'ok' | 'seat' | 'warn' | '';

/** Soft category pill — `.portal-pill` (+ `--*` kind). Complements chips. */
export function renderPortalPill(
  label: string,
  opts: { kind?: PortalPillKind; className?: string } = {}
): string {
  const kind = opts.kind ? `portal-pill--${opts.kind}` : '';
  const cls = ['portal-pill', kind, opts.className ?? ''].filter(Boolean).join(' ');
  return `<span class="${escHtml(cls)}">${escHtml(label)}</span>`;
}

export type PortalToolbarOpts = {
  ariaLabel?: string;
  className?: string;
};

/** Filter-control grid — `.portal-toolbar`; `controlsHtml` is pre-escaped markup. */
export function renderPortalToolbar(controlsHtml: string, opts: PortalToolbarOpts = {}): string {
  const cls = ['portal-toolbar', opts.className ?? ''].filter(Boolean).join(' ');
  const ariaLabel = opts.ariaLabel ? ` aria-label="${escHtml(opts.ariaLabel)}"` : '';
  return `<div class="${escHtml(cls)}"${ariaLabel}>${controlsHtml}</div>`;
}

/** Table row rail class for `renderPortalTableRows` `rowClass`. */
export function portalRowToneClass(tone: 'ok' | 'warn' | 'bad' | '' | undefined): string {
  if (tone === 'ok') return 'row-ok';
  if (tone === 'warn') return 'row-warn';
  if (tone === 'bad') return 'row-bad';
  return '';
}

function cellHtml(cell: PortalTableCell): { html: string; className: string } {
  if (cell == null) return { html: '<span class="dim">—</span>', className: '' };
  if (typeof cell === 'object' && cell !== null && 'html' in cell) {
    return { html: cell.html, className: cell.className ?? '' };
  }
  return { html: escHtml(cell), className: '' };
}

function resolveCells(
  columns: readonly PortalTableColumn[],
  row: readonly PortalTableCell[] | Record<string, PortalTableCell>
): PortalTableCell[] {
  return Array.isArray(row)
    ? [...row]
    : columns.map(c => (row as Record<string, PortalTableCell>)[c.key]);
}

/**
 * `<tr>` fragments for boards that keep a static thead and fill tbody.
 * Prefer this over hand-rolled row HTML on dynamic boards.
 */
export function renderPortalTableRows(
  columns: readonly PortalTableColumn[],
  rows: readonly (readonly PortalTableCell[] | Record<string, PortalTableCell>)[],
  opts: PortalTableRowOpts = {}
): string {
  if (!rows.length) {
    if (opts.emptyHtml != null && opts.emptyHtml !== '') return opts.emptyHtml;
    const msg = opts.emptyMessage ?? 'No rows';
    return `<tr><td colspan="${columns.length}" class="dim">${escHtml(msg)}</td></tr>`;
  }
  return rows
    .map((row, ri) => {
      const cells = resolveCells(columns, row);
      const rowCls = opts.rowClass?.(ri);
      const clsAttr = rowCls ? ` class="${escHtml(rowCls)}"` : '';
      const extra = attrsHtml(opts.rowAttrs?.(ri));
      const tds = columns
        .map((c, ci) => {
          const { html, className } = cellHtml(cells[ci]);
          const tdCls = className ? ` class="${escHtml(className)}"` : '';
          return `<td${tdCls}>${html}</td>`;
        })
        .join('');
      return `<tr${clsAttr}${extra}>${tds}</tr>`;
    })
    .join('');
}

/**
 * Canonical dark data table (wrap + thead + tbody).
 * For static thead + dynamic body, use `renderPortalTableRows` instead.
 */
export function renderPortalTable(
  columns: readonly PortalTableColumn[],
  rows: readonly (readonly PortalTableCell[] | Record<string, PortalTableCell>)[],
  opts: PortalTableOpts = {}
): string {
  const classes = ['portal-table', opts.className ?? ''].filter(Boolean).join(' ');
  const dataAttrs = [
    opts.density === 'compact' ? ' data-density="compact"' : '',
    opts.zebra ? ' data-zebra' : '',
    opts.tone ? ` data-tone="${escHtml(opts.tone)}"` : '',
    attrsHtml(opts.tableAttrs),
  ].join('');

  const thead =
    '<thead><tr>' +
    columns
      .map(c => {
        const thCls = c.className ? ` class="${escHtml(c.className)}"` : '';
        return `<th${thCls}>${escHtml(c.label)}</th>`;
      })
      .join('') +
    '</tr></thead>';

  const tbody = `<tbody>${renderPortalTableRows(columns, rows, opts)}</tbody>`;
  return `<div class="table-wrap"><table class="${classes}"${dataAttrs}>${thead}${tbody}</table></div>`;
}

/** Section panel using shared `.portal-panel`. */
export function renderPortalPanel(
  title: string,
  bodyHtml: string,
  opts: { desc?: string } = {}
): string {
  const desc = opts.desc ? `<p class="portal-panel-desc">${escHtml(opts.desc)}</p>` : '';
  return (
    `<section class="portal-panel">` +
    `<div class="portal-panel-head"><h2>${escHtml(title)}</h2>${desc}</div>` +
    bodyHtml +
    `</section>`
  );
}

export type PortalErrorOpts = {
  title: string;
  message: string;
  /** Machine / HTTP code shown under the message */
  code?: string;
  /** Pre-escaped action row HTML (buttons / links). */
  actionsHtml?: string;
  /** Extra pre-escaped body (CLI hints, etc.). */
  footerHtml?: string;
};

/** Actionable failure card — `.portal-error`. */
export function renderPortalError(opts: PortalErrorOpts): string {
  const code =
    opts.code != null && opts.code !== ''
      ? `<p class="portal-error-code"><code>${escHtml(opts.code)}</code></p>`
      : '';
  const actions =
    opts.actionsHtml != null && opts.actionsHtml !== ''
      ? `<div class="portal-error-actions">${opts.actionsHtml}</div>`
      : '';
  const footer = opts.footerHtml != null && opts.footerHtml !== '' ? opts.footerHtml : '';
  return (
    `<div class="portal-error" role="alert">` +
    `<h3>${escHtml(opts.title)}</h3>` +
    `<p>${escHtml(opts.message)}</p>` +
    code +
    actions +
    footer +
    `</div>`
  );
}

/** Shimmer placeholders for stat grids / panels. */
export function renderPortalSkeleton(count = 4): string {
  const n = Math.max(0, Math.min(24, Math.floor(count)));
  return Array.from({ length: n }, () => `<div class="portal-skeleton"></div>`).join('');
}

/** Bake/audit gate pill — `.portal-gate` + tone. */
export function renderPortalGate(
  label: string,
  tone: 'ok' | 'warn' | 'bad' | 'drift' | '' = 'ok'
): string {
  const cls = tone ? `portal-gate ${tone}` : 'portal-gate';
  return (
    `<span class="${escHtml(cls)}">` +
    `<span class="dot" aria-hidden="true"></span>${escHtml(label)}` +
    `</span>`
  );
}

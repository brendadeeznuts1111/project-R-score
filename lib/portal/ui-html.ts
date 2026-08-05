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

export function escHtml(value: string | number | boolean | null | undefined): string {
  return String(value ?? '').replace(
    /[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
  );
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

/** Metric cards — `.portal-stat-grid` + `.portal-stat`. */
export function renderPortalStatGrid(items: readonly PortalStatItem[]): string {
  return items
    .map(item => {
      const tone = item.tone && item.tone !== 'neutral' ? item.tone : 'muted';
      const active = item.active ? ' active' : '';
      const cls = `portal-stat ${tone}${active}`;
      const attrs = Object.entries(item.attrs ?? {})
        .map(([k, v]) => ` ${escHtml(k)}="${escHtml(v)}"`)
        .join('');
      const body =
        `<span class="k">${escHtml(item.label)}</span>` +
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

function cellHtml(cell: PortalTableCell): { html: string; className: string } {
  if (cell == null) return { html: '<span class="dim">—</span>', className: '' };
  if (typeof cell === 'object' && cell !== null && 'html' in cell) {
    return { html: cell.html, className: cell.className ?? '' };
  }
  return { html: escHtml(cell), className: '' };
}

/**
 * Canonical dark data table.
 * @param columns header defs
 * @param rows array of cells aligned to columns (or Record keyed by column.key)
 */
export function renderPortalTable(
  columns: readonly PortalTableColumn[],
  rows: readonly (readonly PortalTableCell[] | Record<string, PortalTableCell>)[],
  opts: {
    density?: 'compact' | 'default';
    zebra?: boolean;
    tone?: 'accent' | 'warn' | 'bad';
    className?: string;
    emptyMessage?: string;
    rowClass?: (rowIndex: number) => string | undefined;
  } = {}
): string {
  const classes = ['portal-table', opts.className ?? ''].filter(Boolean).join(' ');
  const dataAttrs = [
    opts.density === 'compact' ? ' data-density="compact"' : '',
    opts.zebra ? ' data-zebra' : '',
    opts.tone ? ` data-tone="${escHtml(opts.tone)}` + '"' : '',
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

  let tbody: string;
  if (!rows.length) {
    const msg = opts.emptyMessage ?? 'No rows';
    tbody = `<tbody><tr><td colspan="${columns.length}" class="dim">${escHtml(msg)}</td></tr></tbody>`;
  } else {
    tbody =
      '<tbody>' +
      rows
        .map((row, ri) => {
          const cells: PortalTableCell[] = Array.isArray(row)
            ? [...row]
            : columns.map(c => (row as Record<string, PortalTableCell>)[c.key]);
          const rowCls = opts.rowClass?.(ri);
          const trAttr = rowCls ? ` class="${escHtml(rowCls)}"` : '';
          const tds = columns
            .map((c, ci) => {
              const { html, className } = cellHtml(cells[ci]);
              const tdCls = className ? ` class="${escHtml(className)}"` : '';
              return `<td${tdCls}>${html}</td>`;
            })
            .join('');
          return `<tr${trAttr}>${tds}</tr>`;
        })
        .join('') +
      '</tbody>';
  }

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

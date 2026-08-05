/**
 * Shared portal UI builders (browser).
 * Keep API aligned with `lib/portal/ui-html.ts`.
 *
 * @see docs/portal-foundation.md
 * @see public/portal/style.css — Board primitives · .portal-table
 */

/** @param {unknown} value */
export function escHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );
}

/**
 * @param {string} label
 * @param {'ok'|'warn'|'bad'|'muted'|'neutral'|''} [tone]
 */
export function renderToneChip(label, tone = 'neutral') {
  const t = tone && tone !== 'muted' ? tone : 'neutral';
  return `<span class="tone-chip tone-${escHtml(t)}">${escHtml(label)}</span>`;
}

/**
 * @param {string} label
 * @param {{ href?: string, muted?: boolean, className?: string }} [opts]
 */
export function renderPortalChip(label, opts = {}) {
  const cls = ['portal-chip', opts.muted ? 'portal-chip--muted' : '', opts.className || '']
    .filter(Boolean)
    .join(' ');
  if (opts.href) {
    return `<a class="${cls}" href="${escHtml(opts.href)}">${escHtml(label)}</a>`;
  }
  return `<span class="${cls}">${escHtml(label)}</span>`;
}

/**
 * @param {Array<{
 *   label: string,
 *   value: string|number,
 *   hint?: string,
 *   tone?: string,
 *   button?: boolean,
 *   active?: boolean,
 *   disabled?: boolean,
 *   attrs?: Record<string,string>
 * }>} items
 */
export function renderPortalStatGrid(items) {
  return (items || [])
    .map(item => {
      const tone = item.tone && item.tone !== 'neutral' ? item.tone : 'muted';
      const active = item.active ? ' active' : '';
      const cls = `portal-stat ${tone}${active}`;
      const attrs = Object.entries(item.attrs || {})
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

/**
 * @param {Array<{ key: string, label: string, className?: string }>} columns
 * @param {Array<Array<unknown>|Record<string, unknown>>} rows
 * @param {{ density?: string, zebra?: boolean, tone?: string, className?: string, emptyMessage?: string, rowClass?: (i:number)=>string|undefined }} [opts]
 */
export function renderPortalTable(columns, rows, opts = {}) {
  const classes = ['portal-table', opts.className || ''].filter(Boolean).join(' ');
  const dataAttrs = [
    opts.density === 'compact' ? ' data-density="compact"' : '',
    opts.zebra ? ' data-zebra' : '',
    opts.tone ? ` data-tone="${escHtml(opts.tone)}"` : '',
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

  /** @param {unknown} cell */
  function cellHtml(cell) {
    if (cell == null) return { html: '<span class="dim">—</span>', className: '' };
    if (typeof cell === 'object' && cell !== null && 'html' in cell) {
      return {
        html: /** @type {{html:string, className?:string}} */ (cell).html,
        className: /** @type {{html:string, className?:string}} */ (cell).className || '',
      };
    }
    return { html: escHtml(cell), className: '' };
  }

  let tbody;
  if (!rows || !rows.length) {
    const msg = opts.emptyMessage || 'No rows';
    tbody = `<tbody><tr><td colspan="${columns.length}" class="dim">${escHtml(msg)}</td></tr></tbody>`;
  } else {
    tbody =
      '<tbody>' +
      rows
        .map((row, ri) => {
          const cells = Array.isArray(row)
            ? row
            : columns.map(c => /** @type {Record<string,unknown>} */ (row)[c.key]);
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

/**
 * @param {string} title
 * @param {string} bodyHtml
 * @param {{ desc?: string }} [opts]
 */
export function renderPortalPanel(title, bodyHtml, opts = {}) {
  const desc = opts.desc
    ? `<p class="portal-panel-desc">${escHtml(opts.desc)}</p>`
    : '';
  return (
    `<section class="portal-panel">` +
    `<div class="portal-panel-head"><h2>${escHtml(title)}</h2>${desc}</div>` +
    bodyHtml +
    `</section>`
  );
}

/** Escape user-controlled strings for Telegram HTML parse_mode. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function code(value: string): string {
  return `<code>${escapeHtml(value)}</code>`;
}

export function bold(value: string): string {
  return `<b>${escapeHtml(value)}</b>`;
}

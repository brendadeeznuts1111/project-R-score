const PARTNER_CODE_RE = /^[A-Z]{3,6}$/;
const OUT_ID_RE = /^out-[A-Z0-9-]+$/;
const BOOK_ID_RE = /^book-[a-z0-9-]+$/;
const TELEGRAM_TOPICS = new Set(['general', 'ops', 'alerts', 'liquidity', 'accounting']);

const PARTNER_PATTERNS = {
  list: new URLPattern({ hash: 'partners' }),
  out: new URLPattern({ hash: 'partner/:code/out/:outId' }),
  accounting: new URLPattern({ hash: 'partner/:code/accounting' }),
  telegram: new URLPattern({ hash: 'partner/:code/telegram/:topic' }),
  partner: new URLPattern({ hash: 'partner/:code' }),
  book: new URLPattern({ hash: 'book/:bookId' }),
};

function decode(value) {
  try {
    return decodeURIComponent(value || '');
  } catch {
    return '';
  }
}

function partnerCode(value) {
  const code = decode(value).trim().toUpperCase();
  return PARTNER_CODE_RE.test(code) ? code : null;
}

/** Parse the governed partners-board fragment grammar. */
export function parsePartnerHash(hash) {
  const clean = String(hash || '').replace(/^#/, '');
  if (PARTNER_PATTERNS.list.test({ hash: clean })) return { type: 'list' };

  const out = PARTNER_PATTERNS.out.exec({ hash: clean });
  if (out) {
    const code = partnerCode(out.hash.groups.code);
    const outId = decode(out.hash.groups.outId);
    if (code && OUT_ID_RE.test(outId) && outId.startsWith(`out-${code}-`)) {
      return { type: 'out', code, outId };
    }
  }

  const accounting = PARTNER_PATTERNS.accounting.exec({ hash: clean });
  if (accounting) {
    const code = partnerCode(accounting.hash.groups.code);
    if (code) return { type: 'accounting', code };
  }

  const telegram = PARTNER_PATTERNS.telegram.exec({ hash: clean });
  if (telegram) {
    const code = partnerCode(telegram.hash.groups.code);
    const topic = decode(telegram.hash.groups.topic).toLowerCase();
    if (code && TELEGRAM_TOPICS.has(topic)) return { type: 'telegram', code, topic };
  }

  const partner = PARTNER_PATTERNS.partner.exec({ hash: clean });
  if (partner) {
    const code = partnerCode(partner.hash.groups.code);
    if (code) return { type: 'partner', code };
  }

  const book = PARTNER_PATTERNS.book.exec({ hash: clean });
  if (book) {
    const bookId = decode(book.hash.groups.bookId).toLowerCase();
    if (BOOK_ID_RE.test(bookId)) return { type: 'book', bookId };
  }

  return null;
}

export function partnerHash(code) {
  const normalized = partnerCode(code);
  return normalized ? `#partner/${normalized}` : '#partners';
}

export function partnerOutHash(code, outId) {
  const normalized = partnerCode(code);
  const normalizedOut = decode(outId);
  if (
    !normalized ||
    !OUT_ID_RE.test(normalizedOut) ||
    !normalizedOut.startsWith(`out-${normalized}-`)
  ) {
    return '#partners';
  }
  return `#partner/${normalized}/out/${encodeURIComponent(normalizedOut)}`;
}

export function partnerAccountingHash(code) {
  const normalized = partnerCode(code);
  return normalized ? `#partner/${normalized}/accounting` : '#partners';
}

export function partnerTelegramHash(code, topic) {
  const normalized = partnerCode(code);
  const normalizedTopic = decode(topic).toLowerCase();
  if (!normalized || !TELEGRAM_TOPICS.has(normalizedTopic)) return '#partners';
  return `#partner/${normalized}/telegram/${normalizedTopic}`;
}

export function partnerBookHash(bookId) {
  const id = decode(bookId).toLowerCase();
  return BOOK_ID_RE.test(id) ? `#book/${id}` : '#partners';
}

export function partnerDomId(code) {
  const normalized = partnerCode(code);
  return normalized ? `partner-detail-${normalized}` : 'partner-panel';
}

/**
 * t.me deep link with compact base64url start payload (`CODE:topic`).
 * Payload is a routing hint only — bot must still authorize the user.
 */
export function telegramDeepLink(botUsername, code, topic) {
  const username = String(botUsername || '')
    .replace(/^@/, '')
    .trim();
  const normalized = partnerCode(code);
  const normalizedTopic = decode(topic).toLowerCase();
  if (!/^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(username)) return '';
  if (!normalized || !TELEGRAM_TOPICS.has(normalizedTopic)) return '';
  const payload = btoa(`${normalized}:${normalizedTopic}`)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
  return `https://t.me/${username}?start=${payload}`;
}

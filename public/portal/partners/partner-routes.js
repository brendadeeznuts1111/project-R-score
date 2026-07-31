const PARTNER_CODE_RE = /^[A-Z]{3,6}$/;
const OUT_ID_RE = /^out-[A-Z0-9-]+$/;
const TELEGRAM_TOPICS = new Set(['general', 'ops', 'alerts', 'liquidity', 'accounting']);

const PARTNER_PATTERNS = {
  list: new URLPattern({ hash: 'partners' }),
  out: new URLPattern({ hash: 'partner/:code/out/:outId' }),
  accounting: new URLPattern({ hash: 'partner/:code/accounting' }),
  telegram: new URLPattern({ hash: 'partner/:code/telegram/:topic' }),
  partner: new URLPattern({ hash: 'partner/:code' }),
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

export function partnerDomId(code) {
  const normalized = partnerCode(code);
  return normalized ? `partner-detail-${normalized}` : 'partner-panel';
}

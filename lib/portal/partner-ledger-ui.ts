// lib/portal/partner-ledger-ui.ts — ledger row chrome via partner-ops color kernel.
// @see lib/telegram/partner-ops-color-kernel.ts
// @see lib/telegram/partner-ops-glossary.ts

import {
  partnerOpsConceptColorWire,
  type PartnerOpsColorKey,
  type PartnerOpsColorWire,
} from '../telegram/partner-ops-color-kernel.ts';

export type LedgerRowStyle = {
  colorKey: PartnerOpsColorKey;
  hex: string;
  css: string;
  token: PartnerOpsColorWire['token'];
  /** CSS custom properties for board/row chrome */
  style: {
    '--row-color': string;
    '--row-fg': string;
  };
  'data-color-key': PartnerOpsColorKey;
  'data-glossary-concept': string; // brand-ok — glossary concept key
};

/** WCAG-ish foreground for a hex background (light text on dark colors). */
export function foregroundForHex(hex: string): string {
  const h = hex.replace('#', '');
  const full =
    h.length === 3
      ? h
          .split('')
          .map(c => c + c)
          .join('')
      : h;
  const n = Number.parseInt(full, 16);
  if (!Number.isFinite(n)) return '#e6edf3';
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  // relative luminance threshold
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return lum > 0.55 ? '#0d1117' : '#e6edf3';
}

/**
 * Row style for a partner_ledger type via accounting.<type> concept color.
 * Unknown types fall back to kernel `unknown` (partnerOpsConceptColorWire default).
 */
export function getLedgerRowStyle(type: string): LedgerRowStyle {
  const glossaryId = `accounting.${type}`; // brand-ok — glossary concept key
  const wire = partnerOpsConceptColorWire(glossaryId);
  return {
    colorKey: wire.colorKey,
    hex: wire.hex,
    css: wire.css,
    token: wire.token,
    style: {
      '--row-color': wire.hex,
      '--row-fg': foregroundForHex(wire.hex),
    },
    'data-color-key': wire.colorKey,
    'data-glossary-concept': glossaryId,
  };
}

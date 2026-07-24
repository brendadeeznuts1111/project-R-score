/**
 * Telegram message templates — registry + renderForNode.
 */
export { escapeHtml, code, bold } from './escape.ts';
export {
  buildTemplateContext,
  getPartnerMessageProfile,
  getPhoneForSeat,
  mergeProfileMessageMetadata,
  parseProfileMessageTemplates,
  type PartnerMessageProfile,
  type SeatPhoneAsset,
} from './context.ts';
export { DEFAULT_MESSAGE_TEMPLATES, renderTemplate } from './registry.ts';
export { renderForNode, resolveTemplateIdForCard } from './render.ts';
export type {
  ProfileMessageTemplates,
  RenderedMessage,
  TemplateContext,
  TemplateId,
} from './types.ts';

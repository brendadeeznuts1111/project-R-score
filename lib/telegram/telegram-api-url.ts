// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
const DEFAULT_TELEGRAM_API_BASE_URL = 'https://api.telegram.org';

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}

export function telegramBotApiUrl(
  token: string,
  method: string,
  baseUrl = Bun.env.TELEGRAM_API_BASE_URL ?? DEFAULT_TELEGRAM_API_BASE_URL
): string {
  return `${normalizeBaseUrl(baseUrl)}/bot${token}/${method.replace(/^\/+/, '')}`;
}

export function telegramFileApiUrl(
  token: string,
  path: string,
  baseUrl = Bun.env.TELEGRAM_API_BASE_URL ?? DEFAULT_TELEGRAM_API_BASE_URL
): string {
  return `${normalizeBaseUrl(baseUrl)}/file/bot${token}/${path.replace(/^\/+/, '')}`;
}

// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Load ~/.reasonix/.env into process (missing keys only) — cron + research agents.
 * Telegram factory keys always prefer Reasonix when present (SSOT over project .env).
 */
const REASONIX_TELEGRAM_KEYS = [
  'TELEGRAM_SURFACES',
  'TELEGRAM_OPS_CHAT_ID',
  'TELEGRAM_ACCOUNTING_CHAT_ID',
  'TELEGRAM_BOT_FACTORY',
  'TELEGRAM_BOT_TOKEN',
] as const;

export async function loadReasonixEnv(): Promise<{ loaded: boolean; path: string }> {
  const path = `${Bun.env.HOME}/.reasonix/.env`;
  try {
    const text = await Bun.file(path).text();
    const reasonixValues = new Map<string, string>();
    for (const line of text.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i < 1) continue;
      const k = t.slice(0, i).trim();
      let v = t.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      reasonixValues.set(k, v);
    }
    for (const [k, v] of reasonixValues) {
      const force = (REASONIX_TELEGRAM_KEYS as readonly string[]).includes(k);
      if (force || !Bun.env[k]) Bun.env[k] = v;
    }
    return { loaded: true, path };
  } catch {
    return { loaded: false, path };
  }
}

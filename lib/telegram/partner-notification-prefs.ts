// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/glob — Bun.Glob
// lib/telegram/partner-notification-prefs.ts — per-partner notification opt-in
// loaded from partner profiles (config/partner-profiles/*.toml →
// `partner.telegram.preferences`).

import { parsePartnerProfileToml } from '../partner-profile/parse.ts';
import type { TelegramNotificationPreferences } from './partner-notifications.ts';

/**
 * Load `telegram.preferences` for every partner profile. Malformed /
 * non-profile TOML files are skipped. Missing prefs → empty (all-on defaults).
 */
export async function loadPartnerNotificationPrefs(
  profilesDir = 'config/partner-profiles'
): Promise<Record<string, TelegramNotificationPreferences>> {
  const out: Record<string, TelegramNotificationPreferences> = {};
  const glob = new Bun.Glob('*.toml');
  for await (const rel of glob.scan(profilesDir)) {
    const code = rel.replace(/\.toml$/i, '').toUpperCase();
    try {
      const text = await Bun.file(`${profilesDir}/${rel}`).text();
      const profile = parsePartnerProfileToml(text, code);
      if (profile.telegram?.preferences) out[code] = profile.telegram.preferences;
    } catch {
      /* skip malformed or non-partner TOML */
    }
  }
  return out;
}

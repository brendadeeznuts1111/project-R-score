// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/glob — Bun.Glob
// lib/telegram/partner-notification-prefs.ts — per-partner notification opt-in
// loaded from partner profiles (config/partner-profiles/*.toml →
// `partner.telegram.preferences`).

import { parsePartnerProfileToml } from '../partner-profile/parse.ts';
import type { TelegramNotificationPreferences } from './partner-notifications.ts';

export type PartnerNotificationSettings = {
  preferences: TelegramNotificationPreferences;
  commissionPct?: number;
};

/** Load notification preferences and report metadata from valid partner profiles. */
export async function loadPartnerNotificationSettings(
  profilesDir = 'config/partner-profiles'
): Promise<Record<string, PartnerNotificationSettings>> {
  const out: Record<string, PartnerNotificationSettings> = {};
  const glob = new Bun.Glob('*.toml');
  for await (const rel of glob.scan(profilesDir)) {
    const code = rel.replace(/\.toml$/i, '').toUpperCase();
    try {
      const text = await Bun.file(`${profilesDir}/${rel}`).text();
      const profile = parsePartnerProfileToml(text, code);
      const commissionPct = profile.settlement?.commissionPct;
      out[code] = {
        preferences: profile.telegram?.preferences ?? {},
        ...(commissionPct !== undefined ? { commissionPct } : {}),
      };
    } catch {
      /* skip malformed or non-partner TOML */
    }
  }
  return out;
}

/**
 * Load `telegram.preferences` for every partner profile. Malformed /
 * non-profile TOML files are skipped. Missing prefs → empty (all-on defaults).
 */
export async function loadPartnerNotificationPrefs(
  profilesDir = 'config/partner-profiles'
): Promise<Record<string, TelegramNotificationPreferences>> {
  const settings = await loadPartnerNotificationSettings(profilesDir);
  return Object.fromEntries(
    Object.entries(settings).map(([code, value]) => [code, value.preferences])
  );
}

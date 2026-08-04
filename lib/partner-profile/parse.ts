// @see https://bun.com/reference/bun/TOML/parse — Bun.TOML.parse
// lib/partner-profile/parse.ts — TOML → validated PartnerProfile.
// @see https://bun.com/docs/runtime/toml — Bun TOML loader

import { validatePartnerProfile, type PartnerProfile } from './schema';

/**
 * Parse a profile TOML document and validate it against the v0 schema.
 * The identity.code is asserted against the file's expected code (the profile
 * must declare the CODE it lives under).
 */
export function parsePartnerProfileToml(text: string, expectedCode: string): PartnerProfile {
  const raw = Bun.TOML.parse(text) as unknown;
  const result = validatePartnerProfile(raw);
  if (!result.valid) {
    throw new Error(`invalid profile:\n  ${result.issues.join('\n  ')}`);
  }
  const profile = result.profile;
  if (profile.identity.code !== expectedCode) {
    throw new Error(
      `identity.code "${profile.identity.code}" does not match file code "${expectedCode}"`
    );
  }
  return profile;
}

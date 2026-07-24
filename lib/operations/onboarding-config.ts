// @see https://bun.com/docs/runtime/bun-apis — Bun.mmap
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/toml#bun-toml-parse — Bun.TOML
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
/**
 * Load partner onboarding defaults from config/onboarding-defaults.toml.
 */
import type { Database } from 'bun:sqlite';
import { asPartnerTemplateId, type PartnerTemplateId } from '../types/branded/operations.ts';

/** Slug for default onboarding template (mirrors partner-profile-bridge DEFAULT_TEMPLATE_ID). */
const DEFAULT_TEMPLATE_SLUG = 'default-prospect';

export const ONBOARDING_DEFAULTS_PATH = 'config/onboarding-defaults.toml';

export type OnboardingDefaults = {
  defaultExpertId: string | null; // brand-ok — opaque experts.id from TOML
  defaultExpertSport: string;
  defaultParentId: string | null; // brand-ok — opaque tree_nodes.id from TOML
  defaultCutPercentage: number;
  defaultTemplateBySource: Record<string, string>;
};

let cachedDefaults: OnboardingDefaults | null = null;

export function loadOnboardingDefaultsSync(): OnboardingDefaults {
  if (cachedDefaults) return cachedDefaults;

  const fallback: OnboardingDefaults = {
    defaultExpertId: null,
    defaultExpertSport: 'NBA',
    defaultParentId: null,
    defaultCutPercentage: 10,
    defaultTemplateBySource: {
      referral: DEFAULT_TEMPLATE_SLUG,
      portal: DEFAULT_TEMPLATE_SLUG,
      telegram: DEFAULT_TEMPLATE_SLUG,
      promoted: 'partner-active',
    },
  };

  try {
    const file = Bun.file(ONBOARDING_DEFAULTS_PATH);
    if (file.size > 0) {
      const raw = Bun.TOML.parse(
        new TextDecoder().decode(Bun.mmap(ONBOARDING_DEFAULTS_PATH))
      ) as Record<string, unknown>;
      const bySource =
        raw.default_template_by_source && typeof raw.default_template_by_source === 'object'
          ? (raw.default_template_by_source as Record<string, string>)
          : fallback.defaultTemplateBySource;

      cachedDefaults = {
        defaultExpertId:
          typeof raw.default_expert_id === 'string' && raw.default_expert_id.trim()
            ? raw.default_expert_id.trim()
            : null,
        defaultExpertSport:
          typeof raw.default_expert_sport === 'string' && raw.default_expert_sport.trim()
            ? raw.default_expert_sport.trim()
            : fallback.defaultExpertSport,
        defaultParentId:
          typeof raw.default_parent_id === 'string' && raw.default_parent_id.trim()
            ? raw.default_parent_id.trim()
            : null,
        defaultCutPercentage: Number(raw.default_cut_percentage ?? fallback.defaultCutPercentage),
        defaultTemplateBySource: bySource,
      };
      return cachedDefaults;
    }
  } catch {
    /* use fallback */
  }

  cachedDefaults = fallback;
  return cachedDefaults;
}

/** Clear config cache (tests). */
export function resetOnboardingDefaultsCache(): void {
  cachedDefaults = null;
}

export function templateIdForOnboardingSource(source?: string): PartnerTemplateId {
  const cfg = loadOnboardingDefaultsSync();
  const key = source?.trim().toLowerCase() ?? 'portal';
  const slug =
    cfg.defaultTemplateBySource[key] ?? cfg.defaultTemplateBySource.portal ?? DEFAULT_TEMPLATE_SLUG;
  return asPartnerTemplateId(slug);
}

/** Resolve expert id: explicit config id, else first active expert for sport. */
export function resolveDefaultExpertId(
  db: Database,
  preferredExpertId?: string // brand-ok — opaque experts.id prefer
): string | null {
  // brand-ok — opaque experts.id
  if (preferredExpertId?.trim()) {
    const row = db
      .query('SELECT id FROM experts WHERE id = $id AND active = 1')
      .get({ $id: preferredExpertId.trim() }) as { id: string } | null; // brand-ok
    if (row) return row.id;
  }

  const cfg = loadOnboardingDefaultsSync();
  if (cfg.defaultExpertId) {
    const row = db
      .query('SELECT id FROM experts WHERE id = $id AND active = 1')
      .get({ $id: cfg.defaultExpertId }) as { id: string } | null; // brand-ok
    if (row) return row.id;
  }

  const bySport = db
    .query(
      'SELECT id FROM experts WHERE sport = $sport AND active = 1 ORDER BY edge_score DESC LIMIT 1'
    )
    .get({ $sport: cfg.defaultExpertSport }) as { id: string } | null; // brand-ok
  if (bySport) return bySport.id;

  const any = db
    .query('SELECT id FROM experts WHERE active = 1 ORDER BY edge_score DESC LIMIT 1')
    .get() as { id: string } | null; // brand-ok
  return any?.id ?? null;
}

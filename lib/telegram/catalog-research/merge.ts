// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/shell#getting-started — Bun.$
/**
 * Catalog overrides — applied enhancements merged into buildHandshakeCatalog export.
 */
import type { HandshakeCatalog } from '../handshake-catalog.ts';
import type { ForumTopicIconSuggestion } from './types.ts';

export const CATALOG_OVERRIDES_SCHEMA = 'factorywager.telegram-catalog-overrides.v1' as const;
export const CATALOG_OVERRIDES_REL = 'reports/telegram/catalog-overrides.json';

export type CatalogOverrides = {
  schema: typeof CATALOG_OVERRIDES_SCHEMA;
  updatedAt: string;
  /** mapKey → icon (partner package forums). */
  partnerTopicIcons: Record<string, ForumTopicIconSuggestion>;
  /** `${surfaceSlug}:${topicSlug}` → icon. */
  houseTopicIcons: Record<string, ForumTopicIconSuggestion>;
  /** e.g. partner:accounting → template ref. */
  pinnedMessageTemplates: Record<string, { templateId: string; builder?: string }>; // brand-ok — template slug wire
  /** house surface slug → About description. */
  groupDescriptions: Record<string, string>;
  /** documentBehavior notes keyed by proposal id (write-only; no Telegram mutation). */
  behaviorNotes: Record<string, { title: string; reason: string; evidence: string[] }>;
  appliedChangeIds: string[];
};

export function emptyCatalogOverrides(): CatalogOverrides {
  return {
    schema: CATALOG_OVERRIDES_SCHEMA,
    updatedAt: new Date(0).toISOString(),
    partnerTopicIcons: {},
    houseTopicIcons: {},
    pinnedMessageTemplates: {},
    groupDescriptions: {},
    behaviorNotes: {},
    appliedChangeIds: [],
  };
}

export async function loadCatalogOverrides(root = process.cwd()): Promise<CatalogOverrides> {
  const abs = root.endsWith('/')
    ? `${root}${CATALOG_OVERRIDES_REL}`
    : `${root}/${CATALOG_OVERRIDES_REL}`;
  const file = Bun.file(abs);
  if (!(await file.exists())) return emptyCatalogOverrides();
  try {
    const raw = (await file.json()) as CatalogOverrides;
    if (raw.schema !== CATALOG_OVERRIDES_SCHEMA) return emptyCatalogOverrides();
    return {
      ...emptyCatalogOverrides(),
      ...raw,
      partnerTopicIcons: raw.partnerTopicIcons ?? {},
      houseTopicIcons: raw.houseTopicIcons ?? {},
      pinnedMessageTemplates: raw.pinnedMessageTemplates ?? {},
      groupDescriptions: raw.groupDescriptions ?? {},
      behaviorNotes: raw.behaviorNotes ?? {},
      appliedChangeIds: raw.appliedChangeIds ?? [],
    };
  } catch {
    return emptyCatalogOverrides();
  }
}

export async function saveCatalogOverrides(
  overrides: CatalogOverrides,
  root = process.cwd()
): Promise<string> {
  const abs = root.endsWith('/')
    ? `${root}${CATALOG_OVERRIDES_REL}`
    : `${root}/${CATALOG_OVERRIDES_REL}`;
  const dir = abs.slice(0, abs.lastIndexOf('/'));
  if (dir) await Bun.$`mkdir -p ${dir}`.quiet();
  const next: CatalogOverrides = { ...overrides, updatedAt: new Date().toISOString() };
  await Bun.write(abs, `${JSON.stringify(next, null, 2)}\n`);
  return abs;
}

/** Merge overrides into catalog snapshot for export / research. */
export function applyOverridesToCatalog(
  catalog: HandshakeCatalog,
  overrides: CatalogOverrides
): HandshakeCatalog {
  const rows = catalog.packageForumTopics.rows.map(row => {
    const icon = overrides.partnerTopicIcons[row.mapKey];
    return icon ? { ...row, icon } : row;
  });

  const surfaces = Object.fromEntries(
    Object.entries(catalog.houseForumTopics.surfaces).map(([slug, surface]) => {
      const topicIcons = Object.fromEntries(
        surface.topicSlugs
          .map(topicSlug => {
            const icon = overrides.houseTopicIcons[`${slug}:${topicSlug}`];
            return icon ? [topicSlug, icon] : [topicSlug, undefined];
          })
          .filter(([, v]) => v != null)
      );
      const groupDescription = overrides.groupDescriptions[slug];
      return [
        slug,
        {
          ...surface,
          ...(groupDescription ? { groupDescription } : {}),
          ...(Object.keys(topicIcons).length ? { topicIcons } : {}),
        },
      ];
    })
  );

  return {
    ...catalog,
    packageForumTopics: {
      ...catalog.packageForumTopics,
      rows,
    },
    houseForumTopics: {
      ...catalog.houseForumTopics,
      surfaces,
    },
    seatDeskTemplates: {
      ...catalog.seatDeskTemplates,
      pinnedTemplateRefs: {
        ...(catalog.seatDeskTemplates.pinnedTemplateRefs ?? {}),
        ...overrides.pinnedMessageTemplates,
      },
    },
  };
}

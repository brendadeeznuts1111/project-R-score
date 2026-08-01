// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
/**
 * Load handshake catalog + live forum metadata for research agents.
 */
import { joinPath } from '../../path-bun.ts';
import { buildHandshakeCatalog, type HandshakeCatalog } from '../handshake-catalog.ts';
import { loadHouseForumMetadata, HOUSE_FORUMS_META_DIR } from '../house-forum-metadata.ts';
import {
  loadPackageGroupForumMetadata,
  PACKAGE_GROUP_FORUM_TOPICS,
  PACKAGE_GROUP_FORUMS_META_DIR,
  packageGroupTopicsThreadMap,
} from '../package-group-forum.ts';
import { loadSeatIntakeForPartner } from '../partner-forum-accounting.ts';
import { listPackageGroupRegistry } from '../package-group-registry.ts';
import { ALL_ACCOUNTING_SURFACE_SLUG } from '../surfaces.ts';
import {
  buildSeatDeskViewModel,
  normalizeSeatIntake,
  resolveFundStatus,
} from '../seat-capital-desk.ts';
import type { Database } from 'bun:sqlite';
import type { CatalogResearchContext } from './types.ts';

export const CATALOG_ENHANCEMENTS_REL = 'reports/telegram/catalog-enhancements.json';

export type LoadCatalogResearchContextOpts = {
  db?: Database;
  forumsMetaDir?: string;
  houseForumsMetaDir?: string;
  /** Registry partner codes when db omitted (tests). */
  partnerCodes?: readonly string[];
};

export async function loadHandshakeCatalogSnapshot(): Promise<HandshakeCatalog> {
  return buildHandshakeCatalog();
}

export async function loadCatalogResearchContext(
  opts: LoadCatalogResearchContextOpts = {}
): Promise<{ catalog: HandshakeCatalog; context: CatalogResearchContext }> {
  const catalog = await loadHandshakeCatalogSnapshot();
  const forumsMetaDir = opts.forumsMetaDir ?? PACKAGE_GROUP_FORUMS_META_DIR;
  const houseForumsMetaDir = opts.houseForumsMetaDir ?? HOUSE_FORUMS_META_DIR;

  const partnerCodes =
    opts.partnerCodes ?? (opts.db ? listPackageGroupRegistry(opts.db).map(r => r.partnerCode) : []);

  const forumMetaByPartner = new Map<
    string,
    CatalogResearchContext['forumMetaByPartner'] extends Map<string, infer V> ? V : never
  >();

  const houseMetaBySurface = new Map<
    string,
    CatalogResearchContext['houseMetaBySurface'] extends Map<string, infer V> ? V : never
  >();

  for (const slug of ['hq', ALL_ACCOUNTING_SURFACE_SLUG, 'sandbox'] as const) {
    const meta = await loadHouseForumMetadata(slug, { rootDir: houseForumsMetaDir });
    houseMetaBySurface.set(slug, {
      chatId: meta?.chatId?.trim() ?? null,
      welcomePromptPosted: Boolean(meta?.welcomePromptMessageId),
    });
  }

  const allAccountingPromptPosted = Boolean(
    houseMetaBySurface.get(ALL_ACCOUNTING_SURFACE_SLUG)?.welcomePromptPosted
  );

  const seatCapitalByPartner = new Map<
    string,
    CatalogResearchContext['seatCapitalByPartner'] extends Map<string, infer V> ? V : never
  >();

  for (const code of partnerCodes) {
    const meta = await loadPackageGroupForumMetadata(code, { rootDir: forumsMetaDir });
    const map = meta?.topicsThreadMap ?? (meta ? packageGroupTopicsThreadMap(meta.topics) : {});
    const missingTopics = PACKAGE_GROUP_FORUM_TOPICS.filter(t => {
      if (t === 'General') return false;
      const key = t.toLowerCase();
      const id = map[key];
      return id == null || id <= 0;
    });
    const accountingId = map.accounting;
    const intake = await loadSeatIntakeForPartner(code, { forumsMetaDir });
    forumMetaByPartner.set(code, {
      topicsComplete: meta != null && missingTopics.length === 0,
      accountingThreadId: accountingId != null && accountingId > 0 ? accountingId : null,
      accountingPromptPosted: Boolean(meta?.accountingPromptMessageId),
      seatDeskPosted: Boolean(intake?.desk?.messageId),
      missingTopics,
      liquidityThreadId:
        map['liquidity/outs'] != null && map['liquidity/outs']! > 0 ? map['liquidity/outs']! : null,
    });

    if (intake?.desk?.messageId) {
      const normalized = normalizeSeatIntake(intake);
      const vm = buildSeatDeskViewModel(normalized);
      const fund = resolveFundStatus(normalized);
      seatCapitalByPartner.set(code, {
        callSign: intake.callSign,
        fundStatus: fund.status,
        fundDetail: fund.detail,
        incompleteOuts: vm.incompleteOuts,
      });
    }
  }

  return {
    catalog,
    context: {
      catalogPath: 'public/registry/telegram-handshake-catalog.json',
      forumsMetaDir,
      partnerCodes,
      forumMetaByPartner,
      houseMetaBySurface,
      seatCapitalByPartner,
      allAccountingPromptPosted,
    },
  };
}

export function catalogEnhancementsPath(root = process.cwd()): string {
  return joinPath(root, CATALOG_ENHANCEMENTS_REL);
}

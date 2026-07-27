// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/shell#getting-started — Bun.$
/**
 * House forum metadata — hq, all-accounting, sandbox, …
 *
 * Partner package forums use `package-group-forum.ts`; house surfaces persist here.
 */
import { joinPath } from '../path-bun.ts';
import { ALL_ACCOUNTING_SURFACE_SLUG } from './surfaces.ts';

export const HOUSE_FORUMS_META_DIR = 'reports/telegram/house';

export type HouseForumTopicMeta = {
  title: string;
  messageThreadId: number | null;
};

export type HouseForumMetadata = {
  surfaceSlug: string;
  title: string;
  chatId: string; // brand-ok
  chatRef: string;
  topics: HouseForumTopicMeta[];
  topicsThreadMap: Record<string, number>;
  welcomePromptMessageId?: number;
  welcomePromptPostedAt?: string;
  topicsComplete: boolean;
  createdAt: string;
  updatedAt: string;
};

export function houseForumMetadataPath(
  surfaceSlug: string,
  rootDir = HOUSE_FORUMS_META_DIR
): string {
  return joinPath(rootDir, `${surfaceSlug.toLowerCase().trim()}.json`);
}

function topicSlugFromTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, '-');
}

export function houseTopicsThreadMap(
  topics: readonly HouseForumTopicMeta[]
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const t of topics) {
    if (t.messageThreadId == null || t.messageThreadId <= 0) continue;
    const key = t.title.toLowerCase() === 'general' ? 'general' : topicSlugFromTitle(t.title);
    out[key] = t.messageThreadId;
  }
  if (!out.general) out.general = 1;
  return out;
}

export async function loadHouseForumMetadata(
  surfaceSlug: string,
  opts?: { rootDir?: string }
): Promise<HouseForumMetadata | null> {
  const path = houseForumMetadataPath(surfaceSlug, opts?.rootDir);
  const file = Bun.file(path);
  if (!(await file.exists())) return null;
  try {
    return (await file.json()) as HouseForumMetadata;
  } catch {
    return null;
  }
}

export async function saveHouseForumMetadata(
  meta: HouseForumMetadata,
  opts?: { rootDir?: string }
): Promise<string> {
  const rootDir = opts?.rootDir ?? HOUSE_FORUMS_META_DIR;
  const path = houseForumMetadataPath(meta.surfaceSlug, rootDir);
  const dir = path.slice(0, path.lastIndexOf('/'));
  if (dir) await Bun.$`mkdir -p ${dir}`.quiet();
  const next: HouseForumMetadata = {
    ...meta,
    topicsThreadMap: houseTopicsThreadMap(meta.topics),
    updatedAt: new Date().toISOString(),
  };
  await Bun.write(path, `${JSON.stringify(next, null, 2)}\n`);
  return path;
}

/** Default house surface slug for accounting rollup channel. */
export const DEFAULT_ACCOUNTING_SURFACE = ALL_ACCOUNTING_SURFACE_SLUG;

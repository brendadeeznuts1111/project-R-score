// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
/**
 * Bot API package-group forum enhance — icon + Ops/Alerts/Liquidity/Accounting topics (no MTProto).
 *
 * General stays implicit thread 1 — never createForumTopic for it.
 */
import type { Database } from 'bun:sqlite';
import { createForumTopic, setChatPhotoJpeg } from './branding.ts';
import { generatePackageGroupIconJpeg } from './package-group-icon.ts';
import {
  formatPackageGroupTopicsHandoff,
  generalForumTopicMeta,
  loadPackageGroupForumMetadata,
  PACKAGE_GROUP_FORUM_TOPICS_MTProto,
  PACKAGE_GROUP_FORUMS_META_DIR,
  packageGroupTopicsThreadMap,
  savePackageGroupForumMetadata,
  type PackageGroupForumMetadata,
  type PackageGroupForumTopicMeta,
} from './package-group-forum.ts';
import { getPackageGroupRegistry } from './package-group-registry.ts';
import { getChat, getChatMember, getBotMe } from './telegram-api.ts';

export type EnhancePackageGroupForumOpts = {
  db: Database;
  token: string;
  partnerCode: string;
  forumsMetaDir?: string;
  icon?: boolean;
  ensureTopics?: boolean;
  dryRun?: boolean;
};

export type EnhancePackageGroupForumResult = {
  partnerCode: string;
  chatId: string; // brand-ok
  ok: boolean;
  iconUploaded: boolean;
  iconError?: string;
  topics: PackageGroupForumTopicMeta[];
  topicsComplete: boolean;
  metadataPath: string | null;
  handoff: string[];
  errors: string[];
};

function mergeTopicPlan(
  existing: readonly PackageGroupForumTopicMeta[] | undefined
): PackageGroupForumTopicMeta[] {
  const byTitle = new Map((existing ?? []).map(t => [t.title.toLowerCase(), t] as const));
  return [
    byTitle.get('general') ?? generalForumTopicMeta(),
    ...PACKAGE_GROUP_FORUM_TOPICS_MTProto.map(title => {
      const prev = byTitle.get(title.toLowerCase());
      return prev ?? { title, messageThreadId: null };
    }),
  ];
}

export async function enhancePackageGroupForum(
  opts: EnhancePackageGroupForumOpts
): Promise<EnhancePackageGroupForumResult> {
  const forumsMetaDir = opts.forumsMetaDir ?? PACKAGE_GROUP_FORUMS_META_DIR;
  const code = opts.partnerCode.toUpperCase().trim();
  const reg = getPackageGroupRegistry(opts.db, code);
  const errors: string[] = [];

  if (!reg) {
    return {
      partnerCode: code,
      chatId: '',
      ok: false,
      iconUploaded: false,
      topics: [],
      topicsComplete: false,
      metadataPath: null,
      handoff: [],
      errors: [`No package_group_registry row for ${code}`],
    };
  }

  const live = await getChat(opts.token, reg.chatId);
  if (!live.ok) {
    errors.push(live.description ?? 'getChat failed');
  } else if (!live.chat.is_forum) {
    errors.push('chat is not a forum supergroup');
  }

  let topics = mergeTopicPlan(
    (await loadPackageGroupForumMetadata(code, { rootDir: forumsMetaDir }))?.topics
  );

  let iconUploaded = false;
  let iconError: string | undefined;

  const me = await getBotMe(opts.token);
  let canManageTopics: boolean | null = null;
  if (me) {
    const member = await getChatMember(opts.token, reg.chatId, me.id);
    if (member.ok) {
      canManageTopics =
        typeof member.member.can_manage_topics === 'boolean'
          ? member.member.can_manage_topics
          : member.member.status === 'creator' || member.member.status === 'administrator'
            ? true
            : null;
    }
  }

  if (opts.icon) {
    if (opts.dryRun) {
      iconUploaded = false;
    } else {
      try {
        const jpeg = await generatePackageGroupIconJpeg(code);
        const photo = await setChatPhotoJpeg(opts.token, reg.chatId, jpeg);
        if (photo.ok) {
          iconUploaded = true;
        } else {
          iconError = photo.description ?? 'setChatPhoto failed';
          errors.push(iconError);
        }
      } catch (err) {
        iconError = err instanceof Error ? err.message : String(err);
        errors.push(iconError);
      }
    }
  }

  if (opts.ensureTopics) {
    if (canManageTopics === false) {
      errors.push('bot lacks can_manage_topics — promote bot in group admin settings');
    } else {
      for (const title of PACKAGE_GROUP_FORUM_TOPICS_MTProto) {
        const idx = topics.findIndex(t => t.title.toLowerCase() === title.toLowerCase());
        if (idx >= 0 && topics[idx]!.messageThreadId != null) continue;

        if (opts.dryRun) continue;

        const created = await createForumTopic(opts.token, reg.chatId, title);
        if (!created.ok || created.messageThreadId <= 0) {
          const msg = created.error ?? `createForumTopic ${title} failed`;
          errors.push(msg);
          continue;
        }

        if (idx >= 0) {
          topics[idx] = { title, messageThreadId: created.messageThreadId };
        } else {
          topics.push({ title, messageThreadId: created.messageThreadId });
        }
      }
    }
  }

  topics = mergeTopicPlan(topics);
  const topicsComplete = topics.every(t => t.messageThreadId != null && t.messageThreadId > 0);

  const existingMeta = await loadPackageGroupForumMetadata(code, { rootDir: forumsMetaDir });
  const meta: PackageGroupForumMetadata = {
    partnerCode: code,
    title: reg.title,
    displayName: existingMeta?.displayName ?? code,
    chatId: reg.chatId,
    chatRef: existingMeta?.chatRef ?? `tg:chat:${reg.chatId}`,
    inviteLink: reg.inviteLink ?? existingMeta?.inviteLink ?? '',
    topics,
    iconUploaded: opts.icon ? iconUploaded : (existingMeta?.iconUploaded ?? false),
    iconError: opts.icon ? iconError : existingMeta?.iconError,
    backfilled: existingMeta?.backfilled,
    topicsComplete,
    topicsThreadMap: packageGroupTopicsThreadMap(topics),
    accountingPromptMessageId: existingMeta?.accountingPromptMessageId,
    accountingPromptPostedAt: existingMeta?.accountingPromptPostedAt,
    createdAt: existingMeta?.createdAt ?? new Date().toISOString(),
  };

  let metadataPath: string | null = null;
  if (!opts.dryRun) {
    metadataPath = await savePackageGroupForumMetadata(meta, { rootDir: forumsMetaDir });
  }

  return {
    partnerCode: code,
    chatId: reg.chatId,
    ok: errors.length === 0,
    iconUploaded,
    iconError,
    topics,
    topicsComplete,
    metadataPath,
    handoff: formatPackageGroupTopicsHandoff(meta),
    errors,
  };
}

// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/utils#bun-sleep — Bun.sleep
/**
 * Partner forum Accounting topic — auto ensure + pinned prompt for all package groups.
 *
 * @see docs/harness/tenants/seat-capital-desk.md
 */
import type { Database } from 'bun:sqlite';
import { postSeatDeskAccountingThreadMessage } from './seat-desk-forum-post.ts';
import { loadSeatIntake, SEAT_INTAKE_DIR, type SeatIntakeRecord } from './seat-intake.ts';
import { enhancePackageGroupForum } from './enhance-package-group-forum.ts';
import {
  loadPackageGroupForumMetadata,
  PACKAGE_GROUP_ACCOUNTING_TOPIC_KEY,
  PACKAGE_GROUP_FORUMS_META_DIR,
  savePackageGroupForumMetadata,
} from './package-group-forum.ts';
import { listPackageGroupRegistry } from './package-group-registry.ts';
import {
  buildPartnerAccountingTopicPrompt,
  buildSeatDeskAccountingTopicPrompt,
} from './seat-desk-partner-message.ts';

export type EnsurePartnerForumAccountingOpts = {
  db: Database;
  token: string;
  partnerCode: string;
  forumsMetaDir?: string;
  intakeDir?: string;
  /** Create missing forum topics via Bot API (default true). */
  ensureTopics?: boolean;
  /** Post accounting prompt when topic exists and not yet posted (default true). */
  postPrompt?: boolean;
  /** Optional call-sign intake — else scan seat-intake dir for matching partner. */
  callSign?: string;
  dryRun?: boolean;
};

export type EnsurePartnerForumAccountingResult = {
  partnerCode: string;
  ok: boolean;
  topicsComplete: boolean;
  accountingThreadId: number | null;
  promptPosted: boolean;
  promptMessageId?: number;
  errors: string[];
};

export async function loadSeatIntakeForPartner(
  partnerCode: string,
  opts?: { intakeDir?: string; callSign?: string }
): Promise<SeatIntakeRecord | null> {
  const code = partnerCode.toUpperCase().trim();
  if (opts?.callSign) {
    const direct = await loadSeatIntake(opts.callSign.toUpperCase(), opts.intakeDir);
    if (direct && direct.partnerCode.toUpperCase() === code) return direct;
  }

  const dir = opts?.intakeDir ?? SEAT_INTAKE_DIR;
  const glob = new Bun.Glob('*.json');
  let fallback: SeatIntakeRecord | null = null;
  for await (const file of glob.scan({ cwd: dir, onlyFiles: true })) {
    const callSign = file.replace(/\.json$/i, '');
    const record = await loadSeatIntake(callSign, dir);
    if (!record || record.partnerCode.toUpperCase() !== code) continue;
    if (record.desk?.messageId) return record;
    if (!fallback) fallback = record;
  }
  return fallback;
}

function accountingThreadId(
  meta: Awaited<ReturnType<typeof loadPackageGroupForumMetadata>>
): number | null {
  if (!meta) return null;
  const map = meta.topicsThreadMap ?? {};
  const id = map[PACKAGE_GROUP_ACCOUNTING_TOPIC_KEY];
  return id != null && id > 0 ? id : null;
}

/** Ensure Accounting topic exists and post partner prompt once (non-throwing aggregate). */
export async function ensurePartnerForumAccounting(
  opts: EnsurePartnerForumAccountingOpts
): Promise<EnsurePartnerForumAccountingResult> {
  const forumsMetaDir = opts.forumsMetaDir ?? PACKAGE_GROUP_FORUMS_META_DIR;
  const code = opts.partnerCode.toUpperCase().trim();
  const errors: string[] = [];
  let topicsComplete = false;
  let threadId: number | null = null;
  let promptPosted = false;
  let promptMessageId: number | undefined;

  if (opts.ensureTopics !== false && !opts.dryRun) {
    const enhanced = await enhancePackageGroupForum({
      db: opts.db,
      token: opts.token,
      partnerCode: code,
      forumsMetaDir,
      ensureTopics: true,
    });
    topicsComplete = enhanced.topicsComplete;
    errors.push(...enhanced.errors);
    threadId =
      enhanced.topics.find(t => t.title.toLowerCase() === 'accounting')?.messageThreadId ?? null;
  }

  const meta = await loadPackageGroupForumMetadata(code, { rootDir: forumsMetaDir });
  threadId = threadId ?? accountingThreadId(meta);
  topicsComplete = meta?.topicsComplete === true || (threadId != null && threadId > 0);

  if (opts.postPrompt !== false && threadId && !meta?.accountingPromptMessageId && !opts.dryRun) {
    const intake =
      (await loadSeatIntakeForPartner(code, {
        intakeDir: opts.intakeDir,
        callSign: opts.callSign,
      })) ??
      ({
        partnerCode: code,
        callSign: `${code}-001`,
        outs: [],
      } satisfies SeatIntakeRecord);

    const deskPin = intake.desk?.messageId ? `#${intake.desk.messageId}` : 'pinned desk';
    const text = intake.outs?.length
      ? buildSeatDeskAccountingTopicPrompt(intake)
      : buildPartnerAccountingTopicPrompt(code, { deskPin });

    const sent = await postSeatDeskAccountingThreadMessage({
      token: opts.token,
      record: intake,
      text,
      forumsMetaDir,
    });
    if (sent.ok && sent.messageId != null) {
      promptPosted = true;
      promptMessageId = sent.messageId;
      if (meta) {
        await savePackageGroupForumMetadata(
          {
            ...meta,
            accountingPromptMessageId: sent.messageId,
            accountingPromptPostedAt: new Date().toISOString(),
          },
          { rootDir: forumsMetaDir }
        );
      }
    } else {
      errors.push(sent.description ?? 'accounting prompt post failed');
    }
  } else if (meta?.accountingPromptMessageId) {
    promptMessageId = meta.accountingPromptMessageId;
  }

  return {
    partnerCode: code,
    ok: errors.length === 0,
    topicsComplete,
    accountingThreadId: threadId,
    promptPosted,
    promptMessageId,
    errors,
  };
}

export async function ensureAllPartnersForumAccounting(opts: {
  db: Database;
  token: string;
  forumsMetaDir?: string;
  intakeDir?: string;
  postPrompt?: boolean;
  dryRun?: boolean;
}): Promise<EnsurePartnerForumAccountingResult[]> {
  const rows = listPackageGroupRegistry(opts.db);
  const results: EnsurePartnerForumAccountingResult[] = [];
  for (const row of rows) {
    results.push(
      await ensurePartnerForumAccounting({
        db: opts.db,
        token: opts.token,
        partnerCode: row.partnerCode,
        forumsMetaDir: opts.forumsMetaDir,
        intakeDir: opts.intakeDir,
        postPrompt: opts.postPrompt,
        dryRun: opts.dryRun,
      })
    );
    await Bun.sleep(350);
  }
  return results;
}

// @see https://bun.com/docs/runtime/shell#getting-started — Bun.$
// @see https://bun.com/docs/runtime/sqlite
/**
 * Rename partner package-group CODE (registry + tree seats + forum metadata + JSONL acks).
 *
 * Does not rewrite JSONL history — appends new-code lines mirroring wired/linked state.
 */
import type { Database } from 'bun:sqlite';
import { setChatTitle } from './branding.ts';
import { enhancePackageGroupForum } from './enhance-package-group-forum.ts';
import {
  appendAckDmSeatDesignated,
  appendAckPackageGroupLinked,
  appendAckPackageGroupWired,
  appendPendingPackageGroupArtifact,
  getPackageGroupRegistry,
  PENDING_PACKAGE_GROUPS_JSONL,
  upsertPackageGroupRegistry,
  type PackageGroupCreateArtifact,
} from './package-group-registry.ts';
import {
  loadPackageGroupForumMetadata,
  packageGroupForumMetadataPath,
  savePackageGroupForumMetadata,
  PACKAGE_GROUP_FORUMS_META_DIR,
} from './package-group-forum.ts';
import { assertPartnerCodeArg } from './handshake-ref.ts';
import { upsertKnownChat } from './known-chats.ts';
import { getChat } from './telegram-api.ts';

export type RenamePartnerPackageGroupOpts = {
  db: Database;
  fromCode: string;
  toCode: string;
  jsonlPath?: string;
  forumsMetaDir?: string;
  token?: string | null;
  dryRun?: boolean;
};

export type RenamePartnerPackageGroupResult = {
  fromCode: string;
  toCode: string;
  chatId: string | null; // brand-ok
  displayName: string;
  title: string;
  seatsRenamed: number;
  jsonlAppended: string[];
  telegramTitleOk: boolean;
  telegramIconOk: boolean;
  errors: string[];
};

function renameTreeCallSigns(db: Database, from: string, to: string): number {
  let n = 0;
  const seats = db
    .query(
      `SELECT call_sign, name FROM tree_nodes WHERE call_sign LIKE $pfx ORDER BY call_sign DESC`
    )
    .all({ $pfx: `${from}-%` }) as Array<{ call_sign: string; name: string }>;
  for (const row of seats) {
    const newCs = row.call_sign.replace(`${from}-`, `${to}-`);
    db.run(`UPDATE tree_nodes SET call_sign = $new, name = $newName WHERE call_sign = $old`, {
      $new: newCs,
      $newName: row.name.replace(row.call_sign, newCs),
      $old: row.call_sign,
    });
    n += 1;
  }
  const parent = db
    .query(`SELECT 1 AS ok FROM tree_nodes WHERE call_sign = $from LIMIT 1`)
    .get({ $from: from }) as { ok: number } | null;
  if (parent) {
    db.run(`UPDATE tree_nodes SET call_sign = $to WHERE call_sign = $from`, {
      $to: to,
      $from: from,
    });
    n += 1;
  }
  return n;
}

export async function renamePartnerPackageGroup(
  opts: RenamePartnerPackageGroupOpts
): Promise<RenamePartnerPackageGroupResult> {
  const from = assertPartnerCodeArg(opts.fromCode);
  const to = assertPartnerCodeArg(opts.toCode);
  const jsonlPath = opts.jsonlPath ?? PENDING_PACKAGE_GROUPS_JSONL;
  const forumsMetaDir = opts.forumsMetaDir ?? PACKAGE_GROUP_FORUMS_META_DIR;
  const errors: string[] = [];
  const jsonlAppended: string[] = [];

  if (from === to) throw new Error('from and to codes must differ');

  const oldReg = getPackageGroupRegistry(opts.db, from);
  if (!oldReg) throw new Error(`No package_group_registry row for ${from}`);
  if (getPackageGroupRegistry(opts.db, to)) {
    throw new Error(`Target code ${to} already has a registry row`);
  }

  const oldMeta = await loadPackageGroupForumMetadata(from, { rootDir: forumsMetaDir });
  const displayName = oldMeta?.displayName ?? oldReg.title.split(' · ').pop() ?? to;
  const requestedBy = oldReg.requestedBy?.replace(new RegExp(`^${from}-`), `${to}-`) ?? `${to}-001`;
  const title = `TOC Ops · ${to} · ${displayName}`;

  if (opts.dryRun) {
    return {
      fromCode: from,
      toCode: to,
      chatId: oldReg.chatId,
      displayName,
      title,
      seatsRenamed: 0,
      jsonlAppended: ['(dry-run)'],
      telegramTitleOk: false,
      telegramIconOk: false,
      errors: [],
    };
  }

  const seatsRenamed = renameTreeCallSigns(opts.db, from, to);

  upsertPackageGroupRegistry(opts.db, {
    partnerCode: to,
    chatId: oldReg.chatId,
    displayName,
    inviteLink: oldReg.inviteLink,
    requestedBy,
    now: oldReg.linkedAt,
  });
  opts.db.run(`DELETE FROM package_group_registry WHERE partner_code = $c`, { $c: from });
  const newReg = getPackageGroupRegistry(opts.db, to)!;

  if (opts.token) {
    const live = await getChat(opts.token, oldReg.chatId);
    if (live.ok) {
      upsertKnownChat(opts.db, {
        chat: { ...live.chat, title: newReg.title },
        source: 'manual',
        surfaceSlug: `${to.toLowerCase()}-prod`,
      });
    }
  } else {
    opts.db.run(
      `UPDATE ops_telegram_known_chats SET title = $t, surface_slug = $slug WHERE chat_id = $id`,
      { $t: newReg.title, $slug: `${to.toLowerCase()}-prod`, $id: oldReg.chatId }
    );
  }

  if (oldMeta) {
    await savePackageGroupForumMetadata(
      { ...oldMeta, partnerCode: to, title: newReg.title, displayName },
      { rootDir: forumsMetaDir }
    );
    const oldPath = packageGroupForumMetadataPath(from, { rootDir: forumsMetaDir });
    try {
      await Bun.$`rm -f ${oldPath}`.quiet();
    } catch {
      /* best-effort */
    }
  }

  const seatNode = opts.db
    .query(`SELECT id FROM tree_nodes WHERE call_sign = $cs LIMIT 1`)
    .get({ $cs: requestedBy }) as { id: string } | null; // brand-ok

  const createArtifact: PackageGroupCreateArtifact = {
    action: 'create_package_group',
    partner_code: to,
    display_name: displayName,
    suggested_title: newReg.title,
    requested_by: requestedBy,
    tree_node_id: seatNode?.id ?? '',
    timestamp: new Date().toISOString(),
  };
  await appendPendingPackageGroupArtifact(createArtifact);
  jsonlAppended.push('create_package_group');

  const wired = await appendAckPackageGroupWired({
    partnerCode: to,
    chatId: oldReg.chatId,
    telegramRef: `tg:chat:${oldReg.chatId}`,
    path: jsonlPath,
  });
  if (wired.appended) jsonlAppended.push('ack_package_group_wired');

  const linked = await appendAckPackageGroupLinked({
    partnerCode: to,
    chatId: oldReg.chatId,
    registryTitle: newReg.title,
    path: jsonlPath,
  });
  if (linked.appended) jsonlAppended.push('ack_package_group_linked');

  const dm = await appendAckDmSeatDesignated({
    partnerCode: to,
    callSign: requestedBy,
    path: jsonlPath,
  });
  if (dm.appended) jsonlAppended.push('ack_dm_seat_designated');

  let telegramTitleOk = false;
  let telegramIconOk = false;
  if (opts.token) {
    const titleRes = await setChatTitle(opts.token, oldReg.chatId, newReg.title);
    telegramTitleOk = titleRes.ok;
    if (!titleRes.ok) errors.push(`setChatTitle: ${titleRes.description ?? 'failed'}`);

    const enhanced = await enhancePackageGroupForum({
      db: opts.db,
      token: opts.token,
      partnerCode: to,
      forumsMetaDir,
      icon: true,
    });
    telegramIconOk = enhanced.iconUploaded;
    if (enhanced.errors.length) errors.push(...enhanced.errors);
  }

  return {
    fromCode: from,
    toCode: to,
    chatId: oldReg.chatId,
    displayName,
    title: newReg.title,
    seatsRenamed,
    jsonlAppended,
    telegramTitleOk,
    telegramIconOk,
    errors,
  };
}

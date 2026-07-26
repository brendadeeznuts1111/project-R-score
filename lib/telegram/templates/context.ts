// @see https://bun.com/docs/runtime/sqlite
/**
 * Assemble TemplateContext from profile + seat Soft + optional phone asset.
 */
import type { Database } from 'bun:sqlite';
import type { TreeNodeId } from '../../types/branded/operations.ts';
import { getBalancesSnapshot } from '../flows/balances-snapshot.ts';
import { resolveLocale } from '../flows/i18n.ts';
import type { FlowLocale } from '../flows/types.ts';
import { DEFAULT_MESSAGE_TEMPLATES } from './registry.ts';
import type { ProfileMessageTemplates, TemplateContext, TemplateId } from './types.ts';

export type SeatPhoneAsset = {
  phoneId: string; // brand-ok — phones.id
  displayName: string;
  carrier: string | null;
  status: string;
  activeJurisdiction?: string;
  activeSportsbook?: string;
};

export type PartnerMessageProfile = {
  treeNodeId: TreeNodeId;
  callSign: string | null;
  displayName: string;
  parentName: string | null;
  expertName: string | null;
  partnerTemplate: string | null; // brand-ok — PartnerTemplateId slug
  templates: ProfileMessageTemplates;
};

const TEMPLATE_IDS = new Set<string>([
  'partner.welcome.v1',
  'status.v1',
  'balances.v1',
  'accounts.v1',
  'plays.v1',
  'tree.v1',
  'play.ack.v1',
  'onboard.complete.v1',
  'limit.stale.v1',
  'gate.blocked.v1',
  'menu.v1',
]);

// eslint-disable-next-line harness/no-unknown-function-param -- metadata_json wire leaf
function asTemplateId(raw: unknown, fallback: TemplateId): TemplateId {
  return typeof raw === 'string' && TEMPLATE_IDS.has(raw) ? (raw as TemplateId) : fallback;
}

/** Parse message-template prefs from partner_profile_bindings.metadata_json. */
export function parseProfileMessageTemplates(metadataJson: string | null): ProfileMessageTemplates {
  if (!metadataJson) return { ...DEFAULT_MESSAGE_TEMPLATES };
  try {
    const raw = JSON.parse(metadataJson) as Record<string, unknown>;
    return {
      locale: resolveLocale(typeof raw.locale === 'string' ? raw.locale : null),
      welcomeTemplate: asTemplateId(raw.welcomeTemplate, DEFAULT_MESSAGE_TEMPLATES.welcomeTemplate),
      balancesTemplate: asTemplateId(
        raw.balancesTemplate,
        DEFAULT_MESSAGE_TEMPLATES.balancesTemplate
      ),
      statusTemplate: asTemplateId(raw.statusTemplate, DEFAULT_MESSAGE_TEMPLATES.statusTemplate),
    };
  } catch {
    return { ...DEFAULT_MESSAGE_TEMPLATES };
  }
}

/** Merge message-template fields into existing metadata_json (preserves opsec etc.). */
export function mergeProfileMessageMetadata(
  existingJson: string | null,
  patch: Partial<ProfileMessageTemplates> & { phoneLabel?: string }
): string {
  let base: Record<string, unknown> = {};
  if (existingJson) {
    try {
      base = JSON.parse(existingJson) as Record<string, unknown>;
    } catch {
      base = {};
    }
  }
  const defaults = parseProfileMessageTemplates(existingJson);
  return JSON.stringify({
    ...base,
    locale: patch.locale ?? defaults.locale,
    welcomeTemplate: patch.welcomeTemplate ?? defaults.welcomeTemplate,
    balancesTemplate: patch.balancesTemplate ?? defaults.balancesTemplate,
    statusTemplate: patch.statusTemplate ?? defaults.statusTemplate,
    ...(patch.phoneLabel != null ? { phoneLabel: patch.phoneLabel } : {}),
  });
}

export function getPhoneForSeat(
  db: Database,
  opts: { treeNodeId?: TreeNodeId; callSign?: string | null }
): SeatPhoneAsset | null {
  const node = opts.treeNodeId
    ? (db
        .query('SELECT id, phone_id, call_sign FROM tree_nodes WHERE id = $id')
        .get({ $id: opts.treeNodeId as string }) as {
        id: string; // brand-ok
        phone_id: string | null; // brand-ok
        call_sign: string | null;
      } | null)
    : opts.callSign
      ? (db
          .query(
            'SELECT id, phone_id, call_sign FROM tree_nodes WHERE call_sign = $cs AND active = 1 LIMIT 1'
          )
          .get({ $cs: opts.callSign }) as {
          id: string; // brand-ok
          phone_id: string | null; // brand-ok
          call_sign: string | null;
        } | null)
      : null;
  if (!node) return null;

  let phone = node.phone_id
    ? (db
        .query(`SELECT id, model, carrier, status FROM phones WHERE id = $id`)
        .get({ $id: node.phone_id }) as {
        id: string; // brand-ok
        model: string | null;
        carrier: string | null;
        status: string;
      } | null)
    : null;

  if (!phone) {
    phone = db
      .query(
        `SELECT id, model, carrier, status FROM phones
         WHERE assigned_to = $nid ORDER BY issued_at DESC LIMIT 1`
      )
      .get({ $nid: node.id }) as {
      id: string; // brand-ok
      model: string | null;
      carrier: string | null;
      status: string;
    } | null;
  }

  if (!phone) return null;

  const displayName = phone.model?.trim() || phone.carrier?.trim() || phone.id;
  return {
    phoneId: phone.id,
    displayName,
    carrier: phone.carrier,
    status: phone.status,
  };
}

export function getPartnerMessageProfile(
  db: Database,
  treeNodeId: TreeNodeId
): PartnerMessageProfile | null {
  const row = db
    .query(
      `SELECT n.id, n.call_sign, n.name,
              p.name AS parent_name,
              COALESCE(e.sport, e.name) AS expert_label,
              b.template_id, b.metadata_json
       FROM tree_nodes n
       LEFT JOIN tree_nodes p ON p.id = n.parent_id
       LEFT JOIN experts e ON e.id = n.expert_id
       LEFT JOIN partner_profile_bindings b ON b.tree_node_id = n.id
       WHERE n.id = $id`
    )
    .get({ $id: treeNodeId as string }) as {
    id: string; // brand-ok
    call_sign: string | null;
    name: string;
    parent_name: string | null;
    expert_label: string | null;
    template_id: string | null; // brand-ok
    metadata_json: string | null;
  } | null;

  if (!row) return null;

  return {
    treeNodeId,
    callSign: row.call_sign,
    displayName: row.name,
    parentName: row.parent_name,
    expertName: row.expert_label,
    partnerTemplate: row.template_id,
    templates: parseProfileMessageTemplates(row.metadata_json),
  };
}

export type BuildTemplateContextOpts = {
  locale?: FlowLocale;
  gateReason?: string;
  playId?: string; // brand-ok
  taskId?: string; // brand-ok
  accountsCount?: number;
  placedCount?: number;
  pnl?: number;
  treeHint?: string;
  menuTitle?: string;
  menuSubtitle?: string;
  menuHint?: string;
  detailLines?: string[];
  emptyHint?: string;
};

/** Build full TemplateContext for a tree node (seat Soft + phone + profile). */
export function buildTemplateContext(
  db: Database,
  treeNodeId: TreeNodeId,
  opts?: BuildTemplateContextOpts
): TemplateContext | null {
  const profile = getPartnerMessageProfile(db, treeNodeId);
  if (!profile) return null;

  const seat = getBalancesSnapshot(db, {
    treeNodeId,
    callSign: profile.callSign,
  });
  const phone = getPhoneForSeat(db, { treeNodeId, callSign: profile.callSign });

  let phoneLabel = phone?.displayName;
  const meta = db
    .query('SELECT metadata_json FROM partner_profile_bindings WHERE tree_node_id = $id')
    .get({ $id: treeNodeId as string }) as { metadata_json: string | null } | null;
  if (meta?.metadata_json) {
    try {
      const parsed = JSON.parse(meta.metadata_json) as { phoneLabel?: string };
      if (parsed.phoneLabel?.trim()) phoneLabel = parsed.phoneLabel.trim();
    } catch {
      /* ignore */
    }
  }

  return {
    locale: opts?.locale ?? profile.templates.locale,
    callSign: profile.callSign ?? undefined,
    displayName: profile.displayName,
    parentName: profile.parentName ?? undefined,
    expertName: profile.expertName ?? undefined,
    soft: seat.soft,
    principalOut: seat.principalOut,
    hard: seat.hard,
    pending: seat.pending,
    treeNodeId: treeNodeId as string,
    phoneLabel,
    jurisdiction: phone?.activeJurisdiction,
    sportsbook: phone?.activeSportsbook,
    partnerTemplate: profile.partnerTemplate ?? undefined,
    gateReason: opts?.gateReason,
    playId: opts?.playId,
    taskId: opts?.taskId,
    accountsCount: opts?.accountsCount,
    placedCount: opts?.placedCount,
    pnl: opts?.pnl,
    treeHint: opts?.treeHint,
    menuTitle: opts?.menuTitle,
    menuSubtitle: opts?.menuSubtitle,
    menuHint: opts?.menuHint,
    detailLines: opts?.detailLines,
    emptyHint: opts?.emptyHint,
  };
}

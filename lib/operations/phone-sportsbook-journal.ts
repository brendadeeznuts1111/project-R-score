// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
/**
 * Phone inventory + sportsbook geo journal for partner onboarding gates.
 *
 * Soft Balance / MessageLog stay in toc-ops-repo. This module only journals
 * Factory phone assets and active sportsbook geo evidence.
 *
 * @see docs/harness/tenants/partner-onboarding-package.md
 */
import type { Database } from 'bun:sqlite';
import {
  asSportsbookId,
  asStateCode,
  type SportsbookId,
  type StateCode,
} from '../types/branded.ts';

export type PhoneSportsbookStatus = 'active' | 'inactive' | 'blocked';

export type PhoneSportsbookRow = {
  id: string; // brand-ok — journal row pk
  phoneId: string; // brand-ok — phones.id (no PhoneId brand yet)
  sportsbook: SportsbookId;
  jurisdiction: StateCode;
  status: PhoneSportsbookStatus;
  evidenceNote: string | null;
  observedAt: string;
  createdAt: string;
};

function mintId(prefix: string): string {
  return `${prefix}_${Bun.randomUUIDv7()}`;
}

export type AddPhoneResult = {
  phoneId: string; // brand-ok — phones.id (no PhoneId brand yet)
  created: boolean;
};

/** Add a phone into inventory (idempotent on id). */
export function addPhone(
  db: Database,
  opts: {
    id?: string; // brand-ok — optional phones.id
    model?: string;
    imei?: string;
    carrier?: string;
    dataPlan?: string;
  }
): AddPhoneResult {
  const phoneId = opts.id?.trim() || mintId('phone');
  const existing = db.query('SELECT id FROM phones WHERE id = $id').get({ $id: phoneId }) as {
    id: string; // brand-ok — phones.id
  } | null;
  if (existing) return { phoneId, created: false };
  db.run(
    `INSERT INTO phones (id, model, imei, carrier, data_plan, status)
     VALUES ($id, $model, $imei, $carrier, $plan, 'inventory')`,
    {
      $id: phoneId,
      $model: opts.model?.trim() || null,
      $imei: opts.imei?.trim() || null,
      $carrier: opts.carrier?.trim() || null,
      $plan: opts.dataPlan?.trim() || null,
    }
  );
  return { phoneId, created: true };
}

/** Journal sportsbook geo evidence for a phone. */
export function addPhoneSportsbook(
  db: Database,
  opts: {
    phoneId: string; // brand-ok — phones.id
    sportsbook: string;
    jurisdiction: string;
    status?: PhoneSportsbookStatus;
    evidenceNote?: string;
    observedAt?: string;
  }
): PhoneSportsbookRow {
  const sportsbook = asSportsbookId(opts.sportsbook);
  const jurisdiction = asStateCode(opts.jurisdiction);
  const status: PhoneSportsbookStatus = opts.status ?? 'active';
  const observedAt = opts.observedAt ?? new Date().toISOString();
  const createdAt = new Date().toISOString();
  const id = mintId('psb');

  const existing = db
    .query(
      `SELECT id FROM phone_sportsbooks
       WHERE phone_id = $phone AND sportsbook = $book AND jurisdiction = $jur`
    )
    .get({
      $phone: opts.phoneId,
      $book: sportsbook as string,
      $jur: jurisdiction as string,
    }) as { id: string } | null; // brand-ok — journal row pk

  if (existing) {
    db.run(
      `UPDATE phone_sportsbooks
       SET status = $status, evidence_note = $note, observed_at = $obs
       WHERE id = $id`,
      {
        $id: existing.id,
        $status: status,
        $note: opts.evidenceNote?.trim() || null,
        $obs: observedAt,
      }
    );
  } else {
    db.run(
      `INSERT INTO phone_sportsbooks
         (id, phone_id, sportsbook, jurisdiction, status, evidence_note, observed_at, created_at)
       VALUES ($id, $phone, $book, $jur, $status, $note, $obs, $created)`,
      {
        $id: id,
        $phone: opts.phoneId,
        $book: sportsbook as string,
        $jur: jurisdiction as string,
        $status: status,
        $note: opts.evidenceNote?.trim() || null,
        $obs: observedAt,
        $created: createdAt,
      }
    );
  }

  const row = db
    .query(
      `SELECT id, phone_id, sportsbook, jurisdiction, status, evidence_note, observed_at, created_at
       FROM phone_sportsbooks
       WHERE phone_id = $phone AND sportsbook = $book AND jurisdiction = $jur`
    )
    .get({
      $phone: opts.phoneId,
      $book: sportsbook as string,
      $jur: jurisdiction as string,
    }) as {
    id: string; // brand-ok — journal row pk
    phone_id: string; // brand-ok — phones.id
    sportsbook: string;
    jurisdiction: string;
    status: PhoneSportsbookStatus;
    evidence_note: string | null;
    observed_at: string;
    created_at: string;
  };

  return {
    id: row.id,
    phoneId: row.phone_id,
    sportsbook: asSportsbookId(row.sportsbook),
    jurisdiction: asStateCode(row.jurisdiction),
    status: row.status,
    evidenceNote: row.evidence_note,
    observedAt: row.observed_at,
    createdAt: row.created_at,
  };
}

/** Active geo sportsbook evidence for a phone (hard-gate input). */
export function listActivePhoneSportsbooks(
  db: Database,
  phoneId: string // brand-ok — phones.id
): PhoneSportsbookRow[] {
  const rows = db
    .query(
      `SELECT id, phone_id, sportsbook, jurisdiction, status, evidence_note, observed_at, created_at
       FROM phone_sportsbooks
       WHERE phone_id = $phone AND status = 'active'
       ORDER BY observed_at DESC`
    )
    .all({ $phone: phoneId }) as Array<{
    id: string; // brand-ok — journal row pk
    phone_id: string; // brand-ok — phones.id
    sportsbook: string;
    jurisdiction: string;
    status: PhoneSportsbookStatus;
    evidence_note: string | null;
    observed_at: string;
    created_at: string;
  }>;

  return rows.map(row => ({
    id: row.id,
    phoneId: row.phone_id,
    sportsbook: asSportsbookId(row.sportsbook),
    jurisdiction: asStateCode(row.jurisdiction),
    status: row.status,
    evidenceNote: row.evidence_note,
    observedAt: row.observed_at,
    createdAt: row.created_at,
  }));
}

export function phoneHasActiveGeoEvidence(
  db: Database,
  phoneId: string // brand-ok — phones.id
): boolean {
  return listActivePhoneSportsbooks(db, phoneId).length > 0;
}

/** Env / opts gate — when true, welcome requires active phone sportsbook geo evidence. */
export function isOnboardPhoneGeoHardGateEnabled(opts?: { hardGatePhoneGeo?: boolean }): boolean {
  if (opts?.hardGatePhoneGeo === true) return true;
  if (opts?.hardGatePhoneGeo === false) return false;
  const env = Bun.env.ONBOARD_PHONE_GEO_HARD_GATE?.trim().toLowerCase();
  return env === '1' || env === 'true' || env === 'yes';
}

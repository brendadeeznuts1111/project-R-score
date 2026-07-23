// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
/**
 * Unified provisioning queue — manual ops + automated_test sandbox path.
 */
import type { Database } from 'bun:sqlite';
import { ensureProvisioningSchema } from './schema.ts';

export type ProvisionMode = 'manual' | 'automated_test';
export type ProvisionStep = 'pending' | 'in_progress' | 'completed' | 'failed';

export type ProvisioningTask = {
  id: string; // brand-ok — UUIDv7
  platform_id: string; // brand-ok — platforms.id
  partner_id: string; // brand-ok — tree_nodes.id
  mode: ProvisionMode;
  step: ProvisionStep;
  assigned_to: string | null;
  kyc_dod_id: string | null; // brand-ok — dod_submissions.id
  credentials_encrypted: string | null;
  opened_at: string | null;
  completed_at: string | null;
  notes: string | null;
  experiment_id: string | null; // brand-ok
  variant_id: string | null; // brand-ok
  retry_count: number;
  last_error: string | null;
  created_at: string;
};

export type EnqueueOpts = {
  platformId: string; // brand-ok
  partnerId: string; // brand-ok
  mode: ProvisionMode;
  notes?: string;
  experimentId?: string; // brand-ok
  variantId?: string; // brand-ok
};

export function enqueueTask(db: Database, opts: EnqueueOpts): ProvisioningTask {
  ensureProvisioningSchema(db);
  const id = Bun.randomUUIDv7();
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO provisioning_tasks
       (id, platform_id, partner_id, mode, step, notes, experiment_id, variant_id, created_at, opened_at)
     VALUES ($id, $plat, $partner, $mode, 'pending', $notes, $exp, $var, $now, $now)`,
    {
      $id: id,
      $plat: opts.platformId,
      $partner: opts.partnerId,
      $mode: opts.mode,
      $notes: opts.notes ?? null,
      $exp: opts.experimentId ?? null,
      $var: opts.variantId ?? null,
      $now: now,
    }
  );
  return getTask(db, id)!;
}

export function getTask(db: Database, taskId: string): ProvisioningTask | null {
  // brand-ok — task PK
  ensureProvisioningSchema(db);
  return db
    .query(`SELECT * FROM provisioning_tasks WHERE id = $id`)
    .get({ $id: taskId }) as ProvisioningTask | null;
}

/** Claim next pending task (optionally filter by mode). Returns null if empty. */
export function claimNextTask(
  db: Database,
  assignedTo: string,
  mode?: ProvisionMode
): ProvisioningTask | null {
  ensureProvisioningSchema(db);
  const row = (
    mode
      ? db
          .query(
            `SELECT id FROM provisioning_tasks
             WHERE step = 'pending' AND mode = $m
             ORDER BY created_at ASC LIMIT 1`
          )
          .get({ $m: mode })
      : db
          .query(
            `SELECT id FROM provisioning_tasks
             WHERE step = 'pending'
             ORDER BY created_at ASC LIMIT 1`
          )
          .get()
  ) as { id: string } | null; // brand-ok — opaque DB primary key
  if (!row) return null;

  const now = new Date().toISOString();
  const updated = db.run(
    `UPDATE provisioning_tasks
     SET step = 'in_progress', assigned_to = $who, opened_at = COALESCE(opened_at, $now)
     WHERE id = $id AND step = 'pending'`,
    { $who: assignedTo, $now: now, $id: row.id }
  );
  if (updated.changes !== 1) return null;
  return getTask(db, row.id);
}

export function claimTask(
  db: Database,
  taskId: string, // brand-ok
  assignedTo: string
): ProvisioningTask {
  ensureProvisioningSchema(db);
  const task = getTask(db, taskId);
  if (!task) throw new Error(`Task not found: ${taskId}`);
  if (task.step !== 'pending') throw new Error(`Task ${taskId} is ${task.step}, expected pending`);
  const now = new Date().toISOString();
  db.run(
    `UPDATE provisioning_tasks
     SET step = 'in_progress', assigned_to = $who, opened_at = COALESCE(opened_at, $now)
     WHERE id = $id`,
    { $who: assignedTo, $now: now, $id: taskId }
  );
  return getTask(db, taskId)!;
}

export function completeTask(
  db: Database,
  taskId: string, // brand-ok
  opts?: { credentialsEncrypted?: string; kycDodId?: string; notes?: string } // brand-ok — DOD ID in provisioning context
): ProvisioningTask {
  ensureProvisioningSchema(db);
  const task = getTask(db, taskId);
  if (!task) throw new Error(`Task not found: ${taskId}`);
  if (task.step !== 'in_progress' && task.step !== 'pending') {
    throw new Error(`Task ${taskId} cannot complete from ${task.step}`);
  }
  const now = new Date().toISOString();
  db.run(
    `UPDATE provisioning_tasks SET
       step = 'completed',
       completed_at = $now,
       credentials_encrypted = COALESCE($cred, credentials_encrypted),
       kyc_dod_id = COALESCE($kyc, kyc_dod_id),
       notes = COALESCE($notes, notes),
       last_error = NULL
     WHERE id = $id`,
    {
      $now: now,
      $cred: opts?.credentialsEncrypted ?? null,
      $kyc: opts?.kycDodId ?? null,
      $notes: opts?.notes ?? null,
      $id: taskId,
    }
  );
  return getTask(db, taskId)!;
}

export function failTask(
  db: Database,
  taskId: string, // brand-ok
  error: string
): ProvisioningTask {
  ensureProvisioningSchema(db);
  const task = getTask(db, taskId);
  if (!task) throw new Error(`Task not found: ${taskId}`);
  db.run(
    `UPDATE provisioning_tasks SET
       step = 'failed',
       last_error = $err,
       retry_count = retry_count + 1,
       completed_at = $now
     WHERE id = $id`,
    { $err: error, $now: new Date().toISOString(), $id: taskId }
  );
  return getTask(db, taskId)!;
}

export function listTasks(
  db: Database,
  filter?: { step?: ProvisionStep; mode?: ProvisionMode; limit?: number }
): ProvisioningTask[] {
  ensureProvisioningSchema(db);
  const limit = filter?.limit ?? 50;
  if (filter?.step && filter?.mode) {
    return db
      .query(
        `SELECT * FROM provisioning_tasks WHERE step = $s AND mode = $m
         ORDER BY created_at DESC LIMIT $n`
      )
      .all({ $s: filter.step, $m: filter.mode, $n: limit }) as ProvisioningTask[];
  }
  if (filter?.step) {
    return db
      .query(
        `SELECT * FROM provisioning_tasks WHERE step = $s
         ORDER BY created_at DESC LIMIT $n`
      )
      .all({ $s: filter.step, $n: limit }) as ProvisioningTask[];
  }
  if (filter?.mode) {
    return db
      .query(
        `SELECT * FROM provisioning_tasks WHERE mode = $m
         ORDER BY created_at DESC LIMIT $n`
      )
      .all({ $m: filter.mode, $n: limit }) as ProvisioningTask[];
  }
  return db
    .query(`SELECT * FROM provisioning_tasks ORDER BY created_at DESC LIMIT $n`)
    .all({ $n: limit }) as ProvisioningTask[];
}

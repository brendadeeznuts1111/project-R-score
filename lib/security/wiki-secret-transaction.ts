// lib/security/wiki-secret-transaction.ts — Multi-secret transactional writes with rollback

import { VersionedSecretManager, type VersionMetadata } from './versioned-secrets';
import { Mutex } from '../core/safe-concurrency';

interface SecretWrite {
  key: string;
  value: string;
  metadata?: VersionMetadata;
}

interface TransactionResult {
  success: boolean;
  committed: string[];
  error?: string;
}

const txMutex = new Mutex();

/**
 * Atomic multi-secret transaction. Add writes, then commit.
 * On failure, rolls back all already-committed keys.
 */
export class WikiSecretTransaction {
  private writes: SecretWrite[] = [];
  private committed: string[] = [];
  private manager = new VersionedSecretManager();

  /** Queue a secret write for the transaction. */
  add(key: string, value: string, metadata?: VersionMetadata): this {
    this.writes.push({ key, value, metadata });
    return this;
  }

  /**
   * Commit all queued writes atomically.
   * Holds a mutex to prevent concurrent transactions.
   * Rolls back on any failure.
   */
  async commit(): Promise<TransactionResult> {
    if (this.writes.length === 0) {
      return { success: true, committed: [] };
    }

    return txMutex.withLock(async () => {
      // Snapshot previous versions for rollback
      const snapshots = new Map<string, string | undefined>();

      for (const write of this.writes) {
        try {
          const current = await this.manager.getWithVersion(write.key);
          snapshots.set(write.key, current?.version);
        } catch {
          // No previous version — first write for this key
          snapshots.set(write.key, undefined);
        }
      }

      // Attempt all writes
      for (const write of this.writes) {
        try {
          await this.manager.set(write.key, write.value, write.metadata);
          this.committed.push(write.key);
        } catch (err) {
          const error = err instanceof Error ? err.message : 'Unknown error';
          await this.rollback(snapshots);
          return { success: false, committed: [...this.committed], error };
        }
      }

      return { success: true, committed: [...this.committed] };
    });
  }

  /** Roll back committed keys to their previous versions. */
  private async rollback(snapshots: Map<string, string | undefined>): Promise<void> {
    for (const key of this.committed) {
      const previousVersion = snapshots.get(key);
      if (previousVersion) {
        try {
          await this.manager.rollback(key, previousVersion, {
            confirm: false,
            reason: 'Transaction rollback',
          });
        } catch {
          // Best-effort rollback — log but don't throw
          console.error(`Rollback failed for key: ${key}`);
        }
      }
    }
  }
}

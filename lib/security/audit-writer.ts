// lib/security/audit-writer.ts — General-purpose audit log writer

import { SecretAuditLogger } from './secret-audit-logger';

export interface AuditEntry {
  action: string;
  resource: string;
  actor?: string;
  success: boolean;
  detail?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Write one or more audit entries via the SecretAuditLogger singleton.
 * Maps the general-purpose AuditEntry shape to the logger's AuditEvent format.
 */
export async function writeAuditLog(entries: AuditEntry | AuditEntry[]): Promise<void> {
  const list = Array.isArray(entries) ? entries : [entries];
  const logger = SecretAuditLogger.getInstance();

  for (const entry of list) {
    await logger.logSecretAccess(
      mapAction(entry.action),
      entry.resource,
      entry.actor ?? 'system',
      entry.success,
      {},                   // security context — caller can extend later
      undefined,            // duration
      entry.success ? undefined : (entry.detail ?? 'unknown_error'),
      entry.metadata as Record<string, any> | undefined,
    );
  }
}

/** Map a free-form action string to the logger's operation union. */
function mapAction(action: string): 'read' | 'write' | 'delete' | 'rotate' | 'access_attempt' {
  const lower = action.toLowerCase();
  if (lower.includes('read') || lower.includes('get') || lower.includes('fetch')) return 'read';
  if (lower.includes('delete') || lower.includes('remove')) return 'delete';
  if (lower.includes('rotate') || lower.includes('renew')) return 'rotate';
  if (lower.includes('write') || lower.includes('set') || lower.includes('create') || lower.includes('update')) return 'write';
  return 'access_attempt';
}

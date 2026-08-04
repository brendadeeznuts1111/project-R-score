/**
 * Format ESLint/guard messages from the Bun DX catalog.
 */
import { formatBunMessage, getBunDxEntry, type BunDxEntry } from '../../bun-dx-catalog.ts';

export function lintMessage(entryId: string, prefix?: string): string {
  return formatBunMessage(entryId, prefix);
}

export function importPathMessage(moduleName: string): string {
  const entry = getBunDxEntry(
    moduleName.includes('child_process')
      ? 'spawn.exec'
      : moduleName.includes('fs')
        ? 'file.read'
        : moduleName === 'crypto' || moduleName === 'node:crypto'
          ? 'crypto.hash'
          : moduleName === 'axios'
            ? 'http.fetch'
            : moduleName.includes('zlib')
              ? 'zlib.compress'
              : moduleName.includes('http')
                ? 'http.serve'
                : 'file.read'
  );
  if (!entry) {
    return `Prefer Bun-native APIs instead of "${moduleName}". Docs: https://bun.sh/docs`;
  }
  return formatBunMessage(entry.id, `Avoid "${moduleName}".`);
}

export function syntaxMessage(entryId: string, detail: string): string {
  const entry = getBunDxEntry(entryId);
  if (!entry) return detail;
  return formatBunMessage(entryId, detail);
}

export type { BunDxEntry };

// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
/**
 * Phase 6 crypto rewrites for bun-migrate apply.
 *
 * @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
 * @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
 * @see https://bun.com/docs/runtime/hashing#bun-password — Bun.password
 */
import { resolve } from 'node:path';
import { VALIDATE_WHITELIST, type UsageHit } from '../bun-migrate.ts';

const REPO_ROOT = resolve(import.meta.dir, '../..');

/** Tool / catalog files — never rewrite (shared with validate:integrity). */
export const CRYPTO_APPLY_SKIP = VALIDATE_WHITELIST;

export type CryptoApplyResult = {
  file: string;
  changes: string[];
  before: string;
  after: string;
  skipped?: string;
};

function isCatalogLine(line: string): boolean {
  const t = line.trim();
  if (/pattern:\s*['"]/.test(line)) return true;
  if (/^\s*['"].*\b(createHash|randomUUID|createHmac|randomBytes)\b/.test(line)) return true;
  if (/\bexampleCode\b|\boneLiner:\s*`/.test(line)) return true;
  if (/^\s*(?:export\s+)?function\s+randomBytes\b/.test(line)) return true;
  if (/^\s*(?:export\s+)?(?:async\s+)?function\s+\w+.*randomBytes/.test(line)) return true;
  return false;
}

function mapCodeLines(source: string, map: (line: string) => string): string {
  return source
    .split('\n')
    .map(line => (isCatalogLine(line) ? line : map(line)))
    .join('\n');
}

/** Mechanical Node crypto → Bun-native replacements. */
export function applyCryptoTransforms(source: string): { text: string; changes: string[] } {
  let text = source;
  const changes: string[] = [];

  {
    const before = text;
    text = mapCodeLines(text, line =>
      line
        .replace(/\bcrypto\.randomUUID\s*\(\s*\)/g, 'Bun.randomUUIDv7()')
        .replace(/(?<!\.)\brandomUUID\s*\(\s*\)/g, 'Bun.randomUUIDv7()')
    );
    if (text !== before) changes.push('randomUUID→Bun.randomUUIDv7');
  }

  {
    const before = text;
    text = mapCodeLines(text, line =>
      line
        .replace(/\bcrypto\.createHash\s*\(/g, 'new Bun.CryptoHasher(')
        .replace(/(?<!\.)\bcreateHash\s*\(/g, 'new Bun.CryptoHasher(')
    );
    if (text !== before) changes.push('createHash→Bun.CryptoHasher');
  }

  {
    const before = text;
    text = mapCodeLines(text, line =>
      line
        .replace(/\bcrypto\.createHmac\s*\(/g, 'new Bun.CryptoHasher(')
        .replace(/(?<!\.)\bcreateHmac\s*\(/g, 'new Bun.CryptoHasher(')
    );
    if (text !== before) changes.push('createHmac→Bun.CryptoHasher');
  }

  {
    const before = text;
    const hasLocalRandomBytes = /function\s+randomBytes\b/.test(text);
    text = mapCodeLines(text, line => {
      if (
        hasLocalRandomBytes &&
        /\brandomBytes\s*\(/.test(line) &&
        !/\bcrypto\.randomBytes/.test(line)
      ) {
        return line;
      }
      return line.replace(
        /\bcrypto\.randomBytes\s*\(\s*([^)]+?)\s*\)/g,
        '(() => { const _b = new Uint8Array($1); crypto.getRandomValues(_b); return _b; })()'
      );
    });
    if (text !== before) changes.push('randomBytes→getRandomValues');
  }

  {
    const before = text;
    text = mapCodeLines(text, line =>
      line
        .replace(/\bbcrypt\.hashSync\s*\(/g, 'Bun.password.hashSync(')
        .replace(/\bbcrypt\.hash\s*\(/g, 'Bun.password.hash(')
        .replace(/\bbcrypt\.compareSync\s*\(/g, 'Bun.password.verifySync(')
        .replace(/\bbcrypt\.compare\s*\(/g, 'Bun.password.verify(')
        .replace(/\bargon2\.hash\s*\(/g, 'Bun.password.hash(')
        .replace(/\bargon2\.verify\s*\(/g, 'Bun.password.verify(')
    );
    if (text !== before) changes.push('bcrypt/argon2→Bun.password');
  }

  {
    const before = text;
    text = text.replace(/(?<!crypto\.)\btimingSafeEqual\s*\(/g, 'crypto.timingSafeEqual(');
    if (text !== before) changes.push('timingSafeEqual→crypto.timingSafeEqual');
  }

  text = stripUnusedCryptoImports(text);
  if (text !== source && !changes.includes('strip-crypto-imports')) {
    if (
      !/from\s+['"](?:node:)?crypto['"]/.test(text) &&
      /from\s+['"](?:node:)?crypto['"]/.test(source)
    ) {
      changes.push('strip-crypto-imports');
    }
  }

  text = ensureCryptoSee(text, changes);

  return { text, changes };
}

function symbolStillUsed(rest: string, symbol: string): boolean {
  if (symbol === 'timingSafeEqual') {
    return /(?<!\.)\btimingSafeEqual\b/.test(rest);
  }
  return new RegExp(`\\b${symbol}\\b`).test(rest);
}

function stripUnusedCryptoImports(text: string): string {
  const dropIfUnused = new Set([
    'createHash',
    'createHmac',
    'randomUUID',
    'randomBytes',
    'timingSafeEqual',
  ]);

  let out = text.replace(
    /^import\s*\{([^}]+)\}\s*from\s*['"](?:node:)?crypto['"]\s*;?\s*$/gm,
    (full, body: string) => {
      const kept = body
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .filter(n => {
          const base = n.replace(/\s+as\s+\w+$/, '').trim();
          if (!dropIfUnused.has(base)) return true;
          const rest = text.replace(full, '');
          return symbolStillUsed(rest, base);
        });
      if (kept.length === 0) return '';
      return `import { ${kept.join(', ')} } from 'node:crypto';`;
    }
  );

  if (!/\bfrom\s+['"](?:node:)?crypto['"]/.test(out)) {
    out = out
      .replace(/^import\s+[^;{\n]*\s+from\s+['"](?:node:)?crypto['"]\s*;?\s*\n/gm, '')
      .replace(/^import\s*\*\s*as\s+crypto\s+from\s+['"](?:node:)?crypto['"]\s*;?\s*\n/gm, '');
  }

  return out;
}

function ensureCryptoSee(text: string, changes: string[]): string {
  const needsHasher =
    changes.some(c => c.includes('CryptoHasher')) && !text.includes('bun-cryptohasher');
  const needsUuid =
    changes.some(c => c.includes('randomUUID')) && !text.includes('bun-randomuuidv7');
  const needsPassword =
    changes.some(c => c.includes('Bun.password')) && !text.includes('bun-password');

  const newLines: string[] = [];
  if (needsHasher) {
    newLines.push(
      '// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher'
    );
  }
  if (needsUuid) {
    newLines.push('// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7');
  }
  if (needsPassword) {
    newLines.push('// @see https://bun.com/docs/runtime/hashing#bun-password — Bun.password');
  }
  if (newLines.length === 0) return text;

  const lines = text.split('\n');
  let start = 0;
  if (lines[0]?.startsWith('#!')) start = 1;
  let end = start;
  while (end < lines.length && /^\s*(?:\/\/|\/\*|\*|$)/.test(lines[end] ?? '')) end++;
  lines.splice(end, 0, ...newLines);
  return lines.join('\n');
}

export async function applyCryptoSection(opts: {
  hits: UsageHit[];
  write: boolean;
}): Promise<CryptoApplyResult[]> {
  const byFile = new Map<string, UsageHit[]>();
  for (const h of opts.hits) {
    if (h.migrateSection !== 'crypto') continue;
    if (CRYPTO_APPLY_SKIP.has(h.file)) continue;
    const list = byFile.get(h.file) ?? [];
    list.push(h);
    byFile.set(h.file, list);
  }

  const results: CryptoApplyResult[] = [];

  for (const [file, fileHits] of [...byFile.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const abs = resolve(REPO_ROOT, file);
    const before = await Bun.file(abs).text();
    const { text: after, changes } = applyCryptoTransforms(before);

    if (changes.length === 0) {
      results.push({
        file,
        changes: [],
        before,
        after: before,
        skipped: `no-safe-rewrite (${fileHits.map(h => h.nodePattern).join(', ')})`,
      });
      continue;
    }

    if (after === before) {
      results.push({
        file,
        changes,
        before,
        after,
        skipped: 'transform-no-op',
      });
      continue;
    }

    if (opts.write) {
      await Bun.write(abs, after);
    }

    results.push({ file, changes, before, after });
  }

  return results;
}

export { PHASE_SECTION } from './migrate-phases.ts';

import type { SkillRatingFinding } from './rating-types.ts';
import { addFinding, hasExplicitPlatformBoundary } from './rating-static-support.ts';

export function checkPlatformRules(content: string, findings: SkillRatingFinding[]): void {
  const portableShell =
    /import\s*\{[^}]*\$[^}]*\}\s*from\s*['"]bun['"]/.test(content) ||
    /\bBun\.\$\s*`/.test(content) ||
    /Bun Shell/i.test(content);
  const shellIsms = /(^|\n)\s*(?:\$\s*)?(?:rm|cp|mkdir)\s+(?:-[^\n]+\s+)?[^\n]+/m.test(content);
  if (shellIsms && !portableShell && !hasExplicitPlatformBoundary(content)) {
    addFinding(
      findings,
      'shell-portability',
      -8,
      'POSIX rm/cp/mkdir guidance lacks Bun.$/imported Bun Shell `$` usage or an explicit platform boundary'
    );
  }

  const fsImport = /from\s*['"](?:node:)?fs(?:\/promises)?['"]|require\(['"](?:node:)?fs/.test(
    content
  );
  if (
    fsImport &&
    !/Bun\.(?:file|write|Glob)\b/.test(content) &&
    !/justif(?:y|ied)/i.test(content)
  ) {
    addFinding(
      findings,
      'node-fs-substitution',
      -6,
      'Node fs import has no Bun.file/Bun.write/Bun.Glob alternative or explicit justification'
    );
  }

  const pathImport = /from\s*['"](?:node:)?path['"]|require\(['"](?:node:)?path/.test(content);
  if (pathImport && !/path-bun|BunPath|explicit(?:ly)? justified/i.test(content)) {
    addFinding(
      findings,
      'node-path-substitution',
      0,
      'review Node path usage for a repository adapter; Bun does not provide a general Bun.path replacement'
    );
  }

  const cryptoImport = /from\s*['"](?:node:)?crypto['"]|require\(['"](?:node:)?crypto/.test(
    content
  );
  const bunCrypto = /Bun\.(?:password|CryptoHasher|hash|randomUUIDv7)\b|crypto\.subtle\b/.test(
    content
  );
  if (cryptoImport && !bunCrypto && !/justif(?:y|ied)/i.test(content)) {
    addFinding(
      findings,
      'node-crypto-substitution',
      -6,
      'Node crypto import has no Bun/Web Crypto alternative or explicit justification'
    );
  }

  const installs = content
    .split(/\r?\n/)
    .filter(line => /(?:^\s*(?:\$\s*)?bun install(?=\s|$)|`bun install(?=\s|`))/i.test(line));
  if (
    installs.some(
      context =>
        /\b(?:CI|pipeline|deploy|production)\b/i.test(context) &&
        !/--frozen-lockfile\b/.test(context)
    )
  ) {
    addFinding(
      findings,
      'install-frozen-lockfile',
      -5,
      'CI/deployment bun install guidance omits --frozen-lockfile'
    );
  }
  if (
    installs.some(
      context =>
        /\b(?:Worker|serverless|production deploy|deployment image)\b/i.test(context) &&
        !/--production\b|--omit(?:=|\s+)dev\b/.test(context)
    )
  ) {
    addFinding(
      findings,
      'install-production',
      -4,
      'Worker/serverless production install guidance omits --production or --omit dev'
    );
  }

  const dotenvUsage =
    /from\s*['"]dotenv['"]|require\(['"]dotenv['"]\)|dotenv\.config\s*\(|(?:npm|bun)\s+(?:install|add)\s+dotenv/.test(
      content
    );
  if (dotenvUsage && !/Bun\.env\b|--env-file\b|--no-env-file\b/.test(content)) {
    addFinding(
      findings,
      'environment-loading',
      -5,
      'dotenv usage does not acknowledge Bun.env or Bun automatic/explicit env-file loading'
    );
  }
  if (
    /\bprocess\.env\b/.test(content) &&
    /(?:environment (?:configuration|variables)|## Env(?:ironment)?\b|configuration steps?)/i.test(
      content
    ) &&
    !/\bBun\.env\b|--env-file\b|--no-env-file\b/.test(content)
  ) {
    addFinding(
      findings,
      'environment-accessor',
      -5,
      'configuration guidance uses process.env without establishing Bun.env or Bun env-file behavior as the primary boundary'
    );
  }

  const nodeNetworkImport =
    /from\s*['"](?:node:)?(?:net|stream)['"]|require\(['"](?:node:)?(?:net|stream)['"]\)/.test(
      content
    );
  if (
    nodeNetworkImport &&
    !/Bun\.(?:connect|listen)\b|ReadableStream|WritableStream/.test(content)
  ) {
    addFinding(
      findings,
      'node-network-review',
      0,
      'review Node net/stream usage for Bun sockets or Web Streams; retain compatibility imports when semantics require them'
    );
  }

  if (/^#!\/usr\/bin\/env\s+node\b/m.test(content)) {
    addFinding(findings, 'node-shebang', -4, 'Node shebang should be Bun or explicitly justified');
  }
  const nodeBackedScript = /"[^"]+"\s*:\s*"[^"]*\bnode\s+/.test(content);
  if (nodeBackedScript && /\bbun run\b/.test(content) && !/\bbun run\s+--bun\b/.test(content)) {
    addFinding(
      findings,
      'bun-runtime-enforcement',
      -4,
      'bun run invokes a Node-backed package script without documenting bun run --bun'
    );
  }

  const sqlitePackage =
    /from\s*['"](?:better-sqlite3|sqlite3)['"]|require\(['"](?:better-sqlite3|sqlite3)['"]\)|"(?:better-sqlite3|sqlite3)"\s*:|(?:npm|bun)\s+(?:install|add)\s+(?:better-sqlite3|sqlite3)\b/.test(
      content
    );
  if (sqlitePackage && !/bun:sqlite\b|explicit(?:ly)? justified/i.test(content)) {
    addFinding(
      findings,
      'sqlite-native',
      -7,
      'third-party SQLite package lacks a bun:sqlite alternative or explicit justification'
    );
  }
}

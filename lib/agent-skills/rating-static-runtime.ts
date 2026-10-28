import { bunVersionAtLeast } from '../harness/skill-health-version.ts';
import type { SkillRatingFinding } from './rating-types.ts';
import { addFinding, hasExplicitPackageManagerBoundary } from './rating-static-support.ts';

export function checkRuntimeRules(
  content: string,
  findings: SkillRatingFinding[],
  runtimeVersion: string
): void {
  const bunXml =
    /\bBun\.XML\.(?:parse|stringify)\s*\(|import\s*\{[^}]*\bXML\b[^}]*\}\s*from\s*['"]bun['"]/.test(
      content
    );
  const xmlPackage =
    /from\s*['"](?:fast-xml-parser|xml2js|@xmldom\/xmldom|txml)['"]|require\(['"](?:fast-xml-parser|xml2js|@xmldom\/xmldom|txml)['"]\)|"(?:fast-xml-parser|xml2js|@xmldom\/xmldom|txml)"\s*:|(?:npm|bun)\s+(?:install|add)\s+(?:fast-xml-parser|xml2js|@xmldom\/xmldom|txml)\b/.test(
      content
    );
  const xmlVersionBoundary = /(?:Bun\s*(?:v|version)?\s*1\.4|>=\s*1\.4|1\.4\.0\s+required)/i.test(
    content
  );
  if (!bunVersionAtLeast(runtimeVersion, '1.4.0') && bunXml && !xmlVersionBoundary) {
    addFinding(
      findings,
      'unsupported-bun-xml',
      -8,
      `Bun.XML first ships in Bun 1.4; runtime ${runtimeVersion} guidance needs an explicit version boundary`
    );
  }
  if (
    bunVersionAtLeast(runtimeVersion, '1.4.0') &&
    xmlPackage &&
    !bunXml &&
    !/justif(?:y|ied)|schema validation|DOM semantics|streaming SAX/i.test(content)
  ) {
    addFinding(
      findings,
      'xml-native',
      -7,
      'third-party XML parser lacks a Bun.XML alternative or an explicit semantic justification'
    );
  }

  const externalFetch = /\bfetch\s*\(\s*[`'"]https?:\/\//.test(content);
  if (
    externalFetch &&
    !/(?:AbortSignal\.timeout|AbortController|\bsignal\s*:|\btimeout\b)/i.test(content)
  ) {
    addFinding(
      findings,
      'fetch-timeout',
      -6,
      'external fetch example lacks AbortSignal/AbortController timeout handling'
    );
  }

  const serverRuntime = /\bBun\.(?:serve|listen)\s*\(|\bserve\s*\(\s*\{/.test(content);
  if (serverRuntime && !/--watch\b|--hot\b/.test(content)) {
    addFinding(
      findings,
      'server-reload',
      -5,
      'long-running Bun server guidance omits an appropriate --watch or --hot development command'
    );
  }

  if (/\bBun\.watch\s*\(/.test(content)) {
    addFinding(
      findings,
      'unsupported-bun-watch',
      -8,
      'Bun.watch is not available; use bun --watch/--hot or node:fs watch APIs'
    );
  }
  if (
    /from\s*['"]bun:lock['"]|import\s*\{[^}]*\bLock\b[^}]*\}\s*from\s*['"]bun['"]/.test(content)
  ) {
    addFinding(
      findings,
      'unsupported-bun-lock',
      -8,
      'bun:lock/Lock is not an available Bun API; use an owned atomic-write or lock strategy'
    );
  }

  const scheduledSpawn = /\bBun\.cron\s*\([\s\S]*?\bBun\.spawn\s*\(/.test(content);
  if (
    scheduledSpawn &&
    !/(?:\.kill\s*\(|AbortSignal\.timeout|AbortController|\btimeout\b)/i.test(content)
  ) {
    addFinding(
      findings,
      'scheduled-child-timeout',
      -6,
      'Bun.cron child-process guidance lacks an absolute timeout or termination path'
    );
  }

  const versionSensitive =
    /Bun\.cron\s*\(|Bun\.zstd\b|Bun\.XML\.(?:parse|stringify)\s*\(|\bcatalog:\s*|import\s*\{[^}]*\$[^}]*\}\s*from\s*['"]bun['"]/.test(
      content
    );
  if (versionSensitive && !/\bbun --version\b|\bBun\.version\b/.test(content)) {
    addFinding(
      findings,
      'runtime-version',
      -6,
      'version-sensitive Bun feature lacks an operational bun --version or Bun.version check'
    );
  }

  if (/\bbun x\b/.test(content)) {
    addFinding(findings, 'canonical-bun-x', 2, 'uses the canonical bun x subcommand');
  }

  const legacyPackageCommands = content
    .split(/\r?\n/)
    .filter(
      line =>
        /(?:^\s*(?:\$\s*)?(?:npx\s+\S+|npm\s+(?:install|run|exec|test)\b)|`(?:npx\s+\S+|npm\s+(?:install|run|exec|test)\b))/.test(
          line
        ) && !/\b(?:do not|never|avoid|does not exist|instead of|rejects?)\b/i.test(line)
    );
  if (legacyPackageCommands.length > 0 && !hasExplicitPackageManagerBoundary(content)) {
    addFinding(
      findings,
      'node-package-command',
      -6,
      'operational npm/npx guidance should use repository-owned Bun commands or document a compatibility requirement'
    );
  }
}

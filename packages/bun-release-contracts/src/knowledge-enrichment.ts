import { cleanInlineMarkdown } from './knowledge-markdown.ts';
import type {
  ExampleStability,
  KnowledgeCatalogEntry,
  MarkdownCodeExample,
} from './knowledge-types.ts';

type RawCatalogEntry = {
  name?: unknown;
  stability?: unknown;
  docsUrl?: unknown;
  description?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

export function parseKnowledgeCatalog(input: unknown): KnowledgeCatalogEntry[] {
  if (!isRecord(input) || !Array.isArray(input.entries)) {
    throw new Error('Bun docs catalog must contain an entries array');
  }
  return input.entries.map((value, index): KnowledgeCatalogEntry => {
    if (!isRecord(value)) throw new Error(`Bun docs catalog entry ${index} must be an object`);
    const raw = value as RawCatalogEntry;
    if (typeof raw.name !== 'string' || !raw.name.trim()) {
      throw new Error(`Bun docs catalog entry ${index} has no name`);
    }
    const stability = raw.stability;
    if (stability !== 'stable' && stability !== 'experimental' && stability !== 'deprecated') {
      throw new Error(`Bun docs catalog entry ${raw.name} has invalid stability`);
    }
    return {
      name: raw.name,
      stability,
      docsUrl: typeof raw.docsUrl === 'string' && URL.canParse(raw.docsUrl) ? raw.docsUrl : null,
      description: typeof raw.description === 'string' ? raw.description : null,
    };
  });
}

function mentionedEntries(
  example: MarkdownCodeExample,
  catalog: readonly KnowledgeCatalogEntry[]
): KnowledgeCatalogEntry[] {
  const haystack = `${example.featureSection}\n${example.section}\n${example.code}`;
  const direct = catalog.filter(entry => {
    const escaped = entry.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const left = /^[A-Za-z0-9_$]/.test(entry.name) ? '(?<![A-Za-z0-9_$])' : '';
    const right = /[A-Za-z0-9_$]$/.test(entry.name) ? '(?![A-Za-z0-9_$])' : '';
    return new RegExp(`${left}${escaped}${right}`).test(haystack);
  });
  const specific = direct.filter(
    entry =>
      !direct.some(
        other =>
          other.name !== entry.name &&
          other.name.length > entry.name.length &&
          (other.name.endsWith(`.${entry.name}`) || other.name.endsWith(entry.name))
      )
  );
  const roots = specific.filter(entry => !entry.name.includes(' '));
  const inferred = catalog.filter(entry => {
    const parent = roots.find(root => entry.name.startsWith(`${root.name}.`));
    const leaf = parent ? entry.name.slice(parent.name.length + 1).split(/[.(]/, 1)[0] : null;
    return Boolean(
      leaf && new RegExp(`\\.${leaf.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(example.code)
    );
  });
  return [...new Map([...specific, ...inferred].map(entry => [entry.name, entry])).values()].sort(
    (left, right) => left.name.localeCompare(right.name)
  );
}

function dependencies(code: string): string[] {
  const values = new Set<string>();
  for (const pattern of [
    /\bfrom\s+['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ]) {
    for (const match of code.matchAll(pattern)) if (match[1]) values.add(match[1]);
  }
  return [...values].sort();
}

function setupRequirements(example: MarkdownCodeExample): string[] {
  const values = new Set<string>();
  const add = (pattern: RegExp, label: string) => {
    if (pattern.test(example.code)) values.add(label);
  };
  if (!/^(?:js|jsx|ts|tsx|mjs|cjs|javascript|typescript)$/.test(example.language)) {
    values.add('non-javascript-runtime');
  }
  add(/\b(?:Bun\.file|Bun\.write|readFile|writeFile)\s*\(/, 'filesystem-fixtures');
  add(/\b(?:cert|key|ca):\s*['"]|\.pem\b/, 'tls-material');
  add(/\b(?:upload|buf|imageBuffer|existingServer)\b/, 'external-bindings');
  add(/\bcleanup\s*\(/, 'external-bindings');
  add(/^\s*return\b/m, 'embedding-context');
  add(/\bBun\.serve\s*\(/, 'long-running-server');
  add(/\bfs\.watch\s*\(/, 'long-running-watcher');
  add(/\b(?:fetch|tls\.connect|Bun\.connect)\s*\(/, 'network-access');
  add(/\bprocess\.execve\s*\(/, 'process-replacement');
  add(/\.\.\.|<your-|<path>|YOUR_[A-Z_]+/, 'placeholders');
  return [...values].sort();
}

function stabilityFor(
  example: MarkdownCodeExample,
  entries: readonly KnowledgeCatalogEntry[]
): ExampleStability {
  const context = `${example.featureSection} ${example.section} ${example.context}`.toLowerCase();
  if (context.includes('highly experimental')) return 'highly-experimental';
  if (context.includes('experimental')) return 'experimental';
  if (context.includes('deprecated')) return 'deprecated';
  if (entries.length > 0 && entries.every(entry => entry.stability === 'stable')) return 'stable';
  if (entries.some(entry => entry.stability === 'experimental')) return 'experimental';
  if (entries.some(entry => entry.stability === 'deprecated')) return 'deprecated';
  return 'unknown';
}

export function enrichKnowledgeExample(
  example: MarkdownCodeExample,
  catalog: readonly KnowledgeCatalogEntry[]
) {
  const entries = mentionedEntries(example, catalog);
  const api = entries.map(entry => entry.name);
  const sectionApis = api
    .filter(name => example.featureSection.includes(name) || example.section.includes(name))
    .sort((left, right) => right.length - left.length);
  const feature =
    api.find(name => /^Bun\.[A-Z]/.test(name)) ??
    sectionApis.find(name => /^(?:Bun|process|fs)\.[A-Za-z_$]/.test(name)) ??
    [...api]
      .sort((left, right) => right.length - left.length)
      .find(name => /^(?:Bun|process|fs)\.[A-Za-z_$]/.test(name)) ??
    api.find(name => name.startsWith('--')) ??
    cleanInlineMarkdown(example.featureSection);
  const requiresSetup = setupRequirements(example);
  return {
    api,
    feature,
    purpose:
      example.context.slice(0, 240) ||
      entries.find(entry => entry.description)?.description?.slice(0, 240) ||
      example.section,
    stability: stabilityFor(example, entries),
    dependencies: dependencies(example.code),
    runnable: requiresSetup.length === 0,
    requiresSetup,
    docsLinks: [
      ...new Set(entries.flatMap(entry => (entry.docsUrl ? [entry.docsUrl] : []))),
    ].sort(),
  };
}

#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/runtime/glob — Bun.Glob
/**
 * Scan portal board HTML/JS for glossary concept usage and verify each
 * resolved id is covered by the board surface map ∪ shared field maps ∪
 * domain-glossary bake.
 *
 * Catches: new UI chrome wired to a concept missing from the surface
 * allowlist (or unknown to the glossary entirely).
 *
 *   bun run validate:surface-coverage
 *   bun run validate:surface-coverage -- --json
 *
 * Note: partner-history collapses labels onto shared ops.limits.* /
 * ui.filter.* owners (see glossary-map.js). Parallel ops.metric.* ids are
 * inventory on PARTNER_HISTORY_SURFACE_CONCEPTS, not HTML attributes — that
 * inventory is gated by partners:integration:validate.
 */
import { colorize, jsonOut, logTable } from '../lib/console-depth.ts';
import {
  ACCOUNT_DOSSIER_SURFACE_CONCEPTS,
  HEALTH_FIELD_CONCEPTS,
  LIMIT_FIELD_CONCEPTS,
  LIMIT_SURFACE_CONCEPTS,
  PARTNER_HISTORY_SURFACE_CONCEPTS,
  PARTNERS_SURFACE_CONCEPTS,
  PORTAL_SEMANTIC_CONCEPT_KEYS,
  type PortalSemanticConceptKey,
} from '../lib/portal/semantic-vocabulary.ts';
import { ACCOUNT_DOSSIER_GLOSSARY } from '../public/portal/account/glossary-map.js';
import { PARTNER_HISTORY_GLOSSARY } from '../public/portal/partner-history/glossary-map.js';

type BoardId = 'partner-history' | 'partners' | 'limits' | 'account';

type Orphan = {
  board: BoardId;
  file: string;
  concept: string;
  via: string;
};

const ROOT = `${import.meta.dir}/..`;
const REGISTRY_PATH = `${ROOT}/public/registry/domain-glossary.json`;

/** Cross-board field/section maps boards may legally reference. */
const SHARED_PORTAL_IDS = new Set<string>([
  ...Object.values(LIMIT_FIELD_CONCEPTS),
  ...Object.values(LIMIT_SURFACE_CONCEPTS),
  ...Object.values(HEALTH_FIELD_CONCEPTS),
  ...Object.values(PARTNERS_SURFACE_CONCEPTS),
  ...Object.values(ACCOUNT_DOSSIER_SURFACE_CONCEPTS),
  ...Object.values(PARTNER_HISTORY_SURFACE_CONCEPTS),
]);

const PORTAL_KEY_SET = new Set<string>(PORTAL_SEMANTIC_CONCEPT_KEYS);

/** Any portal key registered on at least one surface map, plus all page.* keys. */
const ANY_SURFACE_IDS = new Set<string>([
  ...SHARED_PORTAL_IDS,
  ...PORTAL_SEMANTIC_CONCEPT_KEYS.filter(id => id.startsWith('page.')),
]);

type BoardConfig = {
  id: BoardId;
  dirs: readonly string[];
  surface: Readonly<Record<string, PortalSemanticConceptKey>>;
  /** Optional chrome maps whose property refs resolve to concept ids. */
  maps?: ReadonlyArray<{
    name: string;
    aliases: readonly string[];
    values: Readonly<Record<string, string>>;
  }>;
};

const BOARDS: readonly BoardConfig[] = [
  {
    id: 'partner-history',
    dirs: [
      `${ROOT}/public/portal/partner-history`,
      `${ROOT}/public/portal/components/limit-changes-card.js`,
    ],
    surface: PARTNER_HISTORY_SURFACE_CONCEPTS,
    maps: [
      {
        name: 'PARTNER_HISTORY_GLOSSARY',
        aliases: ['PARTNER_HISTORY_GLOSSARY', 'G'],
        values: PARTNER_HISTORY_GLOSSARY as Record<string, string>,
      },
    ],
  },
  {
    id: 'partners',
    dirs: [`${ROOT}/public/portal/partners`],
    surface: PARTNERS_SURFACE_CONCEPTS,
  },
  {
    id: 'limits',
    dirs: [`${ROOT}/public/portal/limits`],
    surface: LIMIT_SURFACE_CONCEPTS,
  },
  {
    id: 'account',
    dirs: [`${ROOT}/public/portal/account`],
    surface: ACCOUNT_DOSSIER_SURFACE_CONCEPTS,
    maps: [
      {
        name: 'ACCOUNT_DOSSIER_GLOSSARY',
        aliases: ['ACCOUNT_DOSSIER_GLOSSARY', 'G'],
        values: ACCOUNT_DOSSIER_GLOSSARY as Record<string, string>,
      },
    ],
  },
];

const KNOWN_MAP_ALIASES = new Set(
  BOARDS.flatMap(board => (board.maps ?? []).flatMap(map => [...map.aliases]))
);

const LITERAL_ATTR = /data-glossary-concept\s*=\s*"([^"${][^"]*)"/g;
const TEMPLATE_ATTR = /data-glossary-concept\s*=\s*"\$\{([A-Za-z_][\w]*)\.([A-Za-z_][\w]*)\}"/g;
const HREF_LITERAL = /#glossary:([A-Za-z0-9._-]+)/g;

async function collectFiles(entry: string): Promise<string[]> {
  if (entry.endsWith('.html') || entry.endsWith('.js')) {
    return (await Bun.file(entry).exists()) ? [entry] : [];
  }
  const out: string[] = [];
  const glob = new Bun.Glob('**/*.{html,js}');
  for await (const rel of glob.scan({ cwd: entry, onlyFiles: true })) {
    out.push(`${entry}/${rel}`);
  }
  return out;
}

function resolveMapRef(
  board: BoardConfig,
  objName: string,
  key: string
): { concept: string; via: string } | null {
  for (const map of board.maps ?? []) {
    if (!map.aliases.includes(objName)) continue;
    const concept = map.values[key];
    if (typeof concept === 'string' && concept.length > 0) {
      return { concept, via: `${map.name}.${key}` };
    }
  }
  return null;
}

function extractUsages(
  board: BoardConfig,
  file: string,
  text: string
): Array<{ concept: string; via: string }> {
  const found: Array<{ concept: string; via: string }> = [];

  for (const match of text.matchAll(LITERAL_ATTR)) {
    const concept = match[1]?.trim();
    if (concept) found.push({ concept, via: 'literal@data-glossary-concept' });
  }

  for (const match of text.matchAll(TEMPLATE_ATTR)) {
    const objName = match[1] ?? '';
    const key = match[2] ?? '';
    // Dynamic bindings (book.typeGlossaryId, sl.sportConcept, …) are not chrome maps.
    if (!KNOWN_MAP_ALIASES.has(objName)) continue;
    const resolved = resolveMapRef(board, objName, key);
    if (resolved) found.push(resolved);
    else found.push({ concept: `${objName}.${key}`, via: 'unresolved-template' });
  }

  for (const match of text.matchAll(HREF_LITERAL)) {
    const concept = match[1]?.trim();
    if (concept) found.push({ concept, via: 'literal@glossary-href' });
  }

  // Mapped property references even when not inside data-glossary-concept=
  // (e.g. glossaryHref(PARTNER_HISTORY_GLOSSARY.raises))
  for (const map of board.maps ?? []) {
    for (const alias of map.aliases) {
      const re = new RegExp(`\\b${alias}\\.([A-Za-z_][\\w]*)`, 'g');
      for (const match of text.matchAll(re)) {
        const key = match[1] ?? '';
        const concept = map.values[key];
        if (typeof concept === 'string' && concept.length > 0) {
          found.push({ concept, via: `${map.name}.${key}` });
        }
      }
    }
  }

  return found;
}

async function loadDomainIds(): Promise<Set<string>> {
  const registry = (await Bun.file(REGISTRY_PATH).json()) as {
    concepts?: Array<{ id?: unknown }>;
  };
  return new Set((registry.concepts ?? []).map(c => String(c.id)).filter(id => id.length > 0));
}

async function main(): Promise<void> {
  const wantJson = Bun.argv.includes('--json');
  const domainIds = await loadDomainIds();
  const orphanKeys = new Set<string>();
  const orphans: Orphan[] = [];
  const scanned: Array<{ board: BoardId; files: number; usages: number }> = [];

  const pushOrphan = (orphan: Orphan) => {
    const key = `${orphan.board}|${orphan.file}|${orphan.concept}|${orphan.via}`;
    if (orphanKeys.has(key)) return;
    orphanKeys.add(key);
    orphans.push(orphan);
  };

  for (const board of BOARDS) {
    const files = (await Promise.all(board.dirs.map(dir => collectFiles(dir)))).flat();
    let usages = 0;

    for (const file of files) {
      const text = await Bun.file(file).text();
      const hits = extractUsages(board, file, text);
      usages += hits.length;
      const rel = file.startsWith(ROOT) ? file.slice(ROOT.length + 1) : file;

      for (const hit of hits) {
        if (hit.via === 'unresolved-template') {
          pushOrphan({
            board: board.id,
            file: rel,
            concept: hit.concept,
            via: hit.via,
          });
          continue;
        }
        // Unknown to domain glossary bake → hard fail.
        if (!domainIds.has(hit.concept)) {
          pushOrphan({
            board: board.id,
            file: rel,
            concept: hit.concept,
            via: hit.via,
          });
          continue;
        }
        // Portal-keyed concepts must be registered on a board surface map.
        // Domain-only ids (telegram.*, scrape.*, accounting.*, …) are bake-owned.
        if (PORTAL_KEY_SET.has(hit.concept) && !ANY_SURFACE_IDS.has(hit.concept)) {
          pushOrphan({
            board: board.id,
            file: rel,
            concept: hit.concept,
            via: `${hit.via}+missing-surface`,
          });
        }
      }
    }

    scanned.push({ board: board.id, files: files.length, usages });
  }

  // Inventory: every surface value must be a known portal semantic key.
  const inventoryMisses: string[] = [];
  for (const board of BOARDS) {
    for (const [name, id] of Object.entries(board.surface)) {
      if (!PORTAL_KEY_SET.has(id)) {
        inventoryMisses.push(`${board.id}.${name} -> ${id}`);
      }
    }
  }

  if (wantJson) {
    jsonOut({
      ok: orphans.length === 0 && inventoryMisses.length === 0,
      scanned,
      orphans,
      inventoryMisses,
    });
  } else {
    logTable(
      scanned.map(row => ({
        board: row.board,
        files: row.files,
        usages: row.usages,
      })),
      ['board', 'files', 'usages']
    );
    if (orphans.length === 0 && inventoryMisses.length === 0) {
      console.log(colorize('✅ Surface coverage: PASS', '#3fb950'));
    } else {
      console.error(
        colorize(
          `❌ Surface coverage: FAIL (${orphans.length} orphans, ${inventoryMisses.length} inventory)`,
          '#f85149'
        )
      );
      for (const o of orphans) {
        console.error(`  ✗ ORPHAN_CONCEPT: "${o.concept}" in ${o.file} (${o.via}) [${o.board}]`);
      }
      for (const miss of inventoryMisses) {
        console.error(`  ✗ SURFACE_INVENTORY: ${miss}`);
      }
    }
  }

  if (orphans.length > 0 || inventoryMisses.length > 0) process.exit(1);
}

if (import.meta.main) {
  await main();
}

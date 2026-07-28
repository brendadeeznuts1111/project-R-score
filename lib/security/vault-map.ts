// @see https://bun.com/reference/bun/TOML/parse — Bun.TOML.parse
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/color#flexible-input — Bun.color
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/toml#bun-toml-parse — Bun.TOML.parse
// @see https://bun.com/docs/bundler/loaders#toml — import with { type: "toml" }
/**
 * Vault map — display metadata for env keys + merge with env.template pass:// refs.
 *
 * SSOT for machine path: env.template `KEY={{ pass://vault/item/field }}`
 * SSOT for label/color/icon: config/vault-map.toml (optional; additive)
 *   load: `import map from "../config/vault-map.toml" with { type: "toml" }`
 *   or:   `Bun.TOML.parse(await Bun.file(path).text())`
 * Legacy: config/vault-map.json (fallback only)
 *
 * Never embeds secret values — only names, refs, and UI chrome.
 */
import { joinPath } from '../path-bun.ts';
import { parseEnvTemplate } from '../../scripts/lib/env-defaults-scan.ts';

export type VaultSecretType =
  | 'token'
  | 'secret'
  | 'hmac'
  | 'key'
  | 'ssh'
  | 'url'
  | 'note'
  | 'pat'
  | string;

/** Optional display fields in config/vault-map.toml envMap entries. */
export type VaultMapDisplay = {
  /** Override vault when not yet in env.template (rare). */
  vault?: string;
  /** Override item title when not yet in env.template. */
  item?: string;
  /** Field to extract (password, username, note, …). */
  key?: string;
  type?: VaultSecretType;
  label?: string;
  /** Hex or CSS color for badges / terminal (e.g. #2DA44E). */
  color?: string;
  /** Repo-relative icon path (SVG/PNG) for portal cards. */
  icon?: string;
  /** Unicode / Nerd Font glyph for terminal when icon path is not used. */
  glyph?: string;
  note?: string;
};

export type VaultMapFile = {
  schemaVersion: number;
  kind: 'vault-map';
  description?: string;
  envMap: Record<string, VaultMapDisplay>;
};

/** Fully resolved entry for dashboards / autofill status (no secret values). */
export type VaultMapEntry = {
  envKey: string;
  vault: string | null;
  item: string | null;
  field: string | null;
  passRef: string | null;
  type: VaultSecretType | null;
  label: string;
  color: string | null;
  icon: string | null;
  glyph: string | null;
  note: string | null;
  /** Present in env.template as a live pass:// line. */
  inTemplate: boolean;
  /** Bun.env[envKey] non-empty in this process (boolean only). */
  runtimePresent: boolean;
};

export type VaultMapBundle = {
  schemaVersion: 1;
  kind: 'vault-map-bundle';
  generatedAt: string;
  sourceMap: string;
  template: string;
  entries: VaultMapEntry[];
  summary: {
    entryCount: number;
    withPassRef: number;
    withColor: number;
    withIcon: number;
    runtimePresent: number;
  };
};

const ROOT = joinPath(import.meta.dir, '..', '..');
/** Preferred SSOT (Bun TOML loader / Bun.TOML.parse). */
export const VAULT_MAP_TOML_PATH = joinPath(ROOT, 'config', 'vault-map.toml');
/** Legacy JSON fallback. */
export const VAULT_MAP_JSON_PATH = joinPath(ROOT, 'config', 'vault-map.json');
/** @deprecated use VAULT_MAP_TOML_PATH — kept as alias for callers. */
export const VAULT_MAP_PATH = VAULT_MAP_TOML_PATH;
export const ENV_TEMPLATE_PATH = joinPath(ROOT, 'env.template');

/**
 * Normalize either legacy JSON `{ kind, envMap }` or TOML SSOT
 * `{ metadata, env }` (import with { type: "toml" }) into VaultMapFile.
 */
export function normalizeVaultMapRaw(raw: unknown): VaultMapFile | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;

  // Legacy JSON / earlier TOML: kind + envMap
  if (o.kind === 'vault-map' && o.envMap && typeof o.envMap === 'object') {
    return o as VaultMapFile;
  }

  // Bun type: "toml" SSOT: [metadata] + [env.KEY]
  const env =
    (o.env && typeof o.env === 'object' ? o.env : null) ??
    (o.envMap && typeof o.envMap === 'object' ? o.envMap : null);
  if (!env || typeof env !== 'object') return null;

  const meta =
    o.metadata && typeof o.metadata === 'object' ? (o.metadata as Record<string, unknown>) : {};
  const version =
    typeof meta.version === 'number'
      ? meta.version
      : typeof o.schemaVersion === 'number'
        ? o.schemaVersion
        : 1;
  const description =
    (typeof meta.description === 'string' && meta.description) ||
    (typeof o.description === 'string' && o.description) ||
    undefined;

  const envMap: Record<string, VaultMapDisplay> = {};
  for (const [key, val] of Object.entries(env as Record<string, unknown>)) {
    if (!val || typeof val !== 'object') continue;
    const e = val as Record<string, unknown>;
    const display: VaultMapDisplay = {};
    if (typeof e.vault === 'string') display.vault = e.vault;
    if (typeof e.item === 'string') display.item = e.item;
    // TOML uses `field`; VaultMapDisplay uses `key` for the Pass field name
    if (typeof e.field === 'string') display.key = e.field;
    else if (typeof e.key === 'string') display.key = e.key;
    if (typeof e.type === 'string') display.type = e.type;
    if (typeof e.label === 'string') display.label = e.label;
    if (typeof e.color === 'string') display.color = e.color;
    if (typeof e.icon === 'string') display.icon = e.icon;
    if (typeof e.glyph === 'string') display.glyph = e.glyph;
    if (typeof e.note === 'string') display.note = e.note;
    envMap[key] = display;
  }

  if (Object.keys(envMap).length === 0) return null;

  return {
    schemaVersion: version,
    kind: 'vault-map',
    ...(description ? { description } : {}),
    envMap,
  };
}

/**
 * Load vault-map via Bun import attribute `with { type: "toml" }`.
 * Prefer for static paths; falls back to null on failure.
 */
export async function loadVaultMapTomlImport(
  path: string = VAULT_MAP_TOML_PATH
): Promise<VaultMapFile | null> {
  try {
    // Bun: import "./x.toml" with { type: "toml" } → default export is the table
    const mod = (await import(path, { with: { type: 'toml' } })) as {
      default?: unknown;
    };
    const raw = mod.default ?? mod;
    return normalizeVaultMapRaw(raw);
  } catch {
    return null;
  }
}

/** Parse vault-map TOML text with Bun.TOML.parse. */
export function parseVaultMapToml(text: string): VaultMapFile | null {
  try {
    const raw = Bun.TOML.parse(text) as unknown;
    return normalizeVaultMapRaw(raw);
  } catch {
    return null;
  }
}

const DEFAULT_COLOR_BY_TYPE: Record<string, string> = {
  token: '#3B82F6',
  secret: '#A855F7',
  hmac: '#A855F7',
  key: '#8B5CF6',
  ssh: '#FF6B35',
  url: '#E01E5A',
  note: '#8B949E',
  pat: '#2DA44E',
};

const DEFAULT_GLYPH_BY_TYPE: Record<string, string> = {
  token: '🔑',
  secret: '🔏',
  hmac: '🔏',
  key: '🔑',
  ssh: '🔐',
  url: '🔗',
  note: '📝',
  pat: '🐙',
};

/** Parse `pass://vault/item[/field]` — item may contain spaces and colons. */
export function parsePassUri(
  ref: string
): { vault: string; item: string; field: string | null } | null {
  const t = ref.trim();
  if (!t.startsWith('pass://')) return null;
  const body = t.slice('pass://'.length);
  const parts = body.split('/').filter(p => p.length > 0);
  if (parts.length < 2) return null;
  const vault = parts[0]!;
  if (parts.length === 2) {
    return { vault, item: parts[1]!, field: null };
  }
  const field = parts[parts.length - 1]!;
  const item = parts.slice(1, -1).join('/');
  return { vault, item, field };
}

export function defaultColorForType(type: string | null | undefined): string | null {
  if (!type) return null;
  return DEFAULT_COLOR_BY_TYPE[type] ?? null;
}

export function defaultGlyphForType(type: string | null | undefined): string | null {
  if (!type) return null;
  return DEFAULT_GLYPH_BY_TYPE[type] ?? '•';
}

/**
 * Colorize a string for STDERR status lines.
 * Autofill prints JSON to stdout and status lines to stderr, so the
 * stdout-based auto-detection inside Bun.color(x, 'ansi') can't gate this —
 * stderr must be detected explicitly: plain text when stderr is not a TTY,
 * NO_COLOR is set, or TERM=dumb; FORCE_COLOR=1 overrides. Depth: 24-bit on
 * truecolor terminals, 256 otherwise (explicit formats, since 'ansi' only
 * inspects stdout).
 */
export function colorize(text: string, color: string | null | undefined): string {
  if (!color || !text) return text;
  if (Bun.env.FORCE_COLOR == null) {
    if (!process.stderr.isTTY || Bun.env.NO_COLOR != null || Bun.env.TERM === 'dumb') {
      return text;
    }
  }
  const truecolor = Bun.env.COLORTERM === 'truecolor' || Bun.env.COLORTERM === '24bit';
  const open = Bun.color(color, truecolor ? 'ansi-16m' : 'ansi-256') || Bun.color(color, 'ansi-16');
  if (!open) return text;
  return `${open}${text}\x1b[0m`;
}

/** One-line autofill / status row — never includes secret values. */
export function formatVaultStatusLine(
  entry: Pick<VaultMapEntry, 'label' | 'envKey' | 'color' | 'glyph'>,
  present: boolean
): string {
  const status = present ? '✓' : '✗';
  const glyph = entry.glyph ? `${entry.glyph} ` : '';
  const name = entry.label || entry.envKey;
  const tail = present ? 'set' : 'missing';
  const body = `${status} ${glyph}${name}: ${tail}`;
  if (!entry.color) return `  ${body}`;
  // Color only the status mark so labels stay readable on light/dark terminals
  const mark = colorize(status, present ? entry.color : '#f85149');
  return `  ${mark} ${glyph}${name}: ${tail}`;
}

/**
 * Load vault-map from path.
 * - `.toml` → `import with { type: "toml" }`, then `Bun.TOML.parse`
 * - `.json` → `Bun.file().json()`
 * - default path → try TOML SSOT then JSON fallback
 */
export async function loadVaultMapFile(
  path: string = VAULT_MAP_TOML_PATH
): Promise<VaultMapFile | null> {
  const tryToml = async (p: string): Promise<VaultMapFile | null> => {
    const viaImport = await loadVaultMapTomlImport(p);
    if (viaImport) return viaImport;
    try {
      const text = await Bun.file(p).text();
      return parseVaultMapToml(text);
    } catch {
      return null;
    }
  };

  const tryJson = async (p: string): Promise<VaultMapFile | null> => {
    try {
      const raw = await Bun.file(p).json();
      return normalizeVaultMapRaw(raw);
    } catch {
      return null;
    }
  };

  // Explicit path (toml preferred; sibling .json if toml missing)
  if (path.endsWith('.toml')) {
    return (await tryToml(path)) ?? (await tryJson(path.replace(/\.toml$/i, '.json')));
  }
  if (path.endsWith('.json')) {
    return (await tryJson(path)) ?? (await tryToml(path.replace(/\.json$/i, '.toml')));
  }

  // Default resolution: TOML SSOT → JSON legacy
  return (await tryToml(VAULT_MAP_TOML_PATH)) ?? (await tryJson(VAULT_MAP_JSON_PATH));
}

export async function loadTemplateVaultRefs(
  templatePath: string = ENV_TEMPLATE_PATH
): Promise<Array<{ key: string; ref: string }>> {
  try {
    const text = await Bun.file(templatePath).text();
    return parseEnvTemplate(text).vaultRefs;
  } catch {
    return [];
  }
}

/**
 * Merge config/vault-map.toml display fields with env.template pass:// paths.
 * Template refs win for vault/item/field; display map wins for label/color/icon.
 */
export async function buildVaultMapBundle(opts?: {
  root?: string;
  mapPath?: string;
  templatePath?: string;
  env?: NodeJS.ProcessEnv;
}): Promise<VaultMapBundle> {
  const root = opts?.root ?? ROOT;
  const mapPath = opts?.mapPath ?? joinPath(root, 'config', 'vault-map.toml');
  const templatePath = opts?.templatePath ?? joinPath(root, 'env.template');
  const env = opts?.env ?? Bun.env;

  const [file, templateRefs] = await Promise.all([
    loadVaultMapFile(mapPath),
    loadTemplateVaultRefs(templatePath),
  ]);

  const display = file?.envMap ?? {};
  const byKey = new Map<string, VaultMapEntry>();

  // 1) Live template refs first (machine truth for paths)
  for (const { key, ref } of templateRefs) {
    const parsed = parsePassUri(ref);
    const d = display[key] ?? {};
    const type = d.type ?? null;
    byKey.set(key, {
      envKey: key,
      vault: parsed?.vault ?? d.vault ?? null,
      item: parsed?.item ?? d.item ?? null,
      field: parsed?.field ?? d.key ?? null,
      passRef: ref,
      type,
      label: d.label ?? key,
      color: d.color ?? defaultColorForType(type),
      icon: d.icon ?? null,
      glyph: d.glyph ?? defaultGlyphForType(type),
      note: d.note ?? null,
      inTemplate: true,
      runtimePresent: !!env[key]?.trim(),
    });
  }

  // 2) Display-only keys (documented gaps / commented template lines)
  for (const [key, d] of Object.entries(display)) {
    if (byKey.has(key)) continue;
    const type = d.type ?? null;
    const vault = d.vault ?? null;
    const item = d.item ?? null;
    const field = d.key ?? null;
    const passRef = vault && item ? `pass://${vault}/${item}${field ? `/${field}` : ''}` : null;
    byKey.set(key, {
      envKey: key,
      vault,
      item,
      field,
      passRef,
      type,
      label: d.label ?? key,
      color: d.color ?? defaultColorForType(type),
      icon: d.icon ?? null,
      glyph: d.glyph ?? defaultGlyphForType(type),
      note: d.note ?? null,
      inTemplate: false,
      runtimePresent: !!env[key]?.trim(),
    });
  }

  const entries = [...byKey.values()].sort((a, b) => a.envKey.localeCompare(b.envKey));
  return {
    schemaVersion: 1,
    kind: 'vault-map-bundle',
    generatedAt: new Date().toISOString(),
    sourceMap: mapPath.startsWith(root) ? mapPath.slice(root.length + 1) : mapPath,
    template: templatePath.startsWith(root) ? templatePath.slice(root.length + 1) : templatePath,
    entries,
    summary: {
      entryCount: entries.length,
      withPassRef: entries.filter(e => e.passRef).length,
      withColor: entries.filter(e => e.color).length,
      withIcon: entries.filter(e => e.icon).length,
      runtimePresent: entries.filter(e => e.runtimePresent).length,
    },
  };
}

/** Lookup by env key (exact). */
export function entryByEnvKey(bundle: VaultMapBundle, envKey: string): VaultMapEntry | undefined {
  return bundle.entries.find(e => e.envKey === envKey);
}

/**
 * Match a vault item title to a map entry (for autofill status lines).
 * Prefer exact item title, then env name derived from title.
 */
export function entryForVaultItem(
  bundle: VaultMapBundle,
  vault: string,
  itemTitle: string,
  envNameFromTitle: (title: string) => string
): VaultMapEntry | undefined {
  const inVault = bundle.entries.filter(e => e.vault === vault);
  const byItem = inVault.find(e => e.item === itemTitle);
  if (byItem) return byItem;
  const envKey = envNameFromTitle(itemTitle);
  return inVault.find(e => e.envKey === envKey) ?? bundle.entries.find(e => e.envKey === envKey);
}

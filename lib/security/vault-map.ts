// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/color#flexible-input — Bun.color
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Vault map — display metadata for env keys + merge with env.template pass:// refs.
 *
 * SSOT for machine path: env.template `KEY={{ pass://vault/item/field }}`
 * SSOT for label/color/icon: config/vault-map.json (optional; additive)
 *
 * Never embeds secret values — only names, refs, and UI chrome.
 */
import { joinPath } from '../path-bun.ts';
import { parseEnvTemplate } from '../../scripts/lib/env-defaults-scan.ts';

export type VaultSecretType = 'token' | 'secret' | 'hmac' | 'key' | 'ssh' | 'url' | 'note' | string;

/** Optional display fields in config/vault-map.json envMap entries. */
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
export const VAULT_MAP_PATH = joinPath(ROOT, 'config', 'vault-map.json');
export const ENV_TEMPLATE_PATH = joinPath(ROOT, 'env.template');

const DEFAULT_COLOR_BY_TYPE: Record<string, string> = {
  token: '#3B82F6',
  secret: '#A855F7',
  hmac: '#A855F7',
  key: '#8B5CF6',
  ssh: '#FF6B35',
  url: '#E01E5A',
  note: '#8B949E',
};

const DEFAULT_GLYPH_BY_TYPE: Record<string, string> = {
  token: '🔑',
  secret: '🔏',
  hmac: '🔏',
  key: '🔑',
  ssh: '🔐',
  url: '🔗',
  note: '📝',
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
 * Colorize a string with Bun.color → ansi-16m (truecolor).
 * `ansi` alone returns empty for many hex inputs; prefer ansi-16m.
 */
export function colorize(text: string, color: string | null | undefined): string {
  if (!color || !text) return text;
  const open = Bun.color(color, 'ansi-16m');
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

export async function loadVaultMapFile(
  path: string = VAULT_MAP_PATH
): Promise<VaultMapFile | null> {
  try {
    const raw = await Bun.file(path).json();
    if (!raw || typeof raw !== 'object') return null;
    const file = raw as VaultMapFile;
    if (file.kind !== 'vault-map' || !file.envMap || typeof file.envMap !== 'object') {
      return null;
    }
    return file;
  } catch {
    return null;
  }
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
 * Merge config/vault-map.json display fields with env.template pass:// paths.
 * Template refs win for vault/item/field; display map wins for label/color/icon.
 */
export async function buildVaultMapBundle(opts?: {
  root?: string;
  mapPath?: string;
  templatePath?: string;
  env?: NodeJS.ProcessEnv;
}): Promise<VaultMapBundle> {
  const root = opts?.root ?? ROOT;
  const mapPath = opts?.mapPath ?? joinPath(root, 'config', 'vault-map.json');
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

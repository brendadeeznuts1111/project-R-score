// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Merge Telegram env keys into a dotenv file (Reasonix / project .env).
 */
import { ALL_ACCOUNTING_SURFACE_SLUG } from './surfaces.ts';

export function parseEnvFile(content: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    map.set(trimmed.slice(0, eq).trim(), trimmed.slice(eq + 1));
  }
  return map;
}

export function serializeEnvFile(original: string, updates: Map<string, string>): string {
  const seen = new Set<string>();
  const lines = original.split('\n');
  const out: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      out.push(line);
      continue;
    }
    const eq = trimmed.indexOf('=');
    if (eq <= 0) {
      out.push(line);
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    if (updates.has(key)) {
      out.push(`${key}=${updates.get(key)!}`);
      seen.add(key);
    } else {
      out.push(line);
    }
  }

  for (const [key, value] of updates) {
    if (seen.has(key)) continue;
    out.push(`${key}=${value}`);
  }

  return out.join('\n').replace(/\n?$/, '\n');
}

export function mergeTelegramSurfacesJson(
  raw: string | undefined,
  slug: string,
  chatId: string // brand-ok — Telegram chat_id wire
): string {
  let map: Record<string, string> = {};
  if (raw?.trim()) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        map = Object.fromEntries(
          Object.entries(parsed as Record<string, unknown>)
            .filter(([, v]) => typeof v === 'string' || typeof v === 'number')
            .map(([k, v]) => [k, String(v)])
        );
      }
    } catch {
      map = {};
    }
  }
  map[slug] = chatId;
  return JSON.stringify(map);
}

export type BindAccountingChatOpts = {
  chatId: string; // brand-ok
  envPath: string;
};

export type BindAccountingChatResult = {
  envPath: string;
  chatId: string; // brand-ok
  surfacesJson: string;
};

export type BindHouseSurfaceOpts = {
  surfaceSlug: string;
  chatId: string; // brand-ok
  envPath: string;
};

export type BindHouseSurfaceResult = {
  envPath: string;
  chatId: string; // brand-ok
  surfaceSlug: string;
  surfacesJson: string;
};

/** Merge house surface slug into TELEGRAM_SURFACES (+ accounting / ops env pins). */
export async function bindHouseSurfaceInEnvFile(
  opts: BindHouseSurfaceOpts
): Promise<BindHouseSurfaceResult> {
  const chatId = opts.chatId.trim();
  const surfaceSlug = opts.surfaceSlug.trim();
  const file = Bun.file(opts.envPath);
  const prior = (await file.exists()) ? await file.text() : '';
  const map = parseEnvFile(prior);
  const surfacesJson = mergeTelegramSurfacesJson(map.get('TELEGRAM_SURFACES'), surfaceSlug, chatId);
  map.set('TELEGRAM_SURFACES', surfacesJson);
  if (surfaceSlug === ALL_ACCOUNTING_SURFACE_SLUG) {
    map.set('TELEGRAM_ACCOUNTING_CHAT_ID', chatId);
  }
  if (surfaceSlug === 'hq') {
    map.set('TELEGRAM_OPS_CHAT_ID', chatId);
  }
  await Bun.write(opts.envPath, serializeEnvFile(prior, map));
  return { envPath: opts.envPath, chatId, surfaceSlug, surfacesJson };
}

/** Set TELEGRAM_ACCOUNTING_CHAT_ID + merge all-accounting into TELEGRAM_SURFACES. */
export async function bindAccountingChatInEnvFile(
  opts: BindAccountingChatOpts
): Promise<BindAccountingChatResult> {
  const bound = await bindHouseSurfaceInEnvFile({
    surfaceSlug: ALL_ACCOUNTING_SURFACE_SLUG,
    chatId: opts.chatId,
    envPath: opts.envPath,
  });
  return { envPath: bound.envPath, chatId: bound.chatId, surfacesJson: bound.surfacesJson };
}

export function defaultReasonixEnvPath(): string {
  return `${Bun.env.HOME ?? ''}/.reasonix/.env`.replace(/\/+/g, '/');
}

export type SyncTelegramEnvOpts = {
  surfaces: Record<string, string>;
  envPath?: string;
  opsChatId?: string | null; // brand-ok — Telegram ops chat_id wire
  accountingChatId?: string | null; // brand-ok — Telegram accounting chat_id wire
};

/** Merge live surface map + ops/accounting pins into Reasonix `.env`. */
export async function syncTelegramEnvToReasonix(
  opts: SyncTelegramEnvOpts
): Promise<{ envPath: string; surfacesJson: string }> {
  const envPath = opts.envPath ?? defaultReasonixEnvPath();
  const file = Bun.file(envPath);
  const prior = (await file.exists()) ? await file.text() : '';
  const map = parseEnvFile(prior);
  const surfacesJson = JSON.stringify(opts.surfaces);
  map.set('TELEGRAM_SURFACES', surfacesJson);
  if (opts.opsChatId?.trim()) map.set('TELEGRAM_OPS_CHAT_ID', opts.opsChatId.trim());
  if (opts.accountingChatId?.trim()) {
    map.set('TELEGRAM_ACCOUNTING_CHAT_ID', opts.accountingChatId.trim());
  }
  await Bun.write(envPath, serializeEnvFile(prior, map));
  return { envPath, surfacesJson };
}

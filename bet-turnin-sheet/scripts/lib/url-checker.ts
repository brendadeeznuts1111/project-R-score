import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { UrlClassification } from "../refs-schema";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 10;
const CONCURRENCY = 8;

export interface UrlCheckResult {
  id: string;
  url: string;
  classification: UrlClassification;
  httpStatus: number | null;
  finalUrl: string | null;
  cached: boolean;
  error: string | null;
}

interface CacheEntry {
  status: number | null;
  finalUrl: string | null;
  classification: UrlClassification;
  checkedAt: string;
}

interface CacheFile {
  entries: Record<string, CacheEntry>;
}

const TRANSIENT = new Set([502, 503, 429]);
const TRANSIENT_CLASS = new Set(["timeout", "network", "server_error"]);

function rootDir(): string {
  return join(import.meta.dir, "..", "..");
}

function cachePath(): string {
  return join(rootDir(), ".cache", "url-checks.json");
}

async function loadCache(): Promise<CacheFile> {
  try {
    const file = Bun.file(cachePath());
    if (!(await file.exists())) return { entries: {} };
    return (await file.json()) as CacheFile;
  } catch {
    return { entries: {} };
  }
}

async function saveCache(cache: CacheFile): Promise<void> {
  await mkdir(join(rootDir(), ".cache"), { recursive: true });
  await Bun.write(cachePath(), JSON.stringify(cache, null, 2));
}

function isFresh(entry: CacheEntry): boolean {
  return Date.now() - new Date(entry.checkedAt).getTime() < CACHE_TTL_MS;
}

function classifyStatus(status: number): UrlClassification {
  if (status >= 200 && status < 300) return "ok";
  if (status >= 300 && status < 400) return "redirect";
  if (status === 404) return "not_found";
  if (status === 403) return "blocked";
  if (status === 405) return "method_not_allowed";
  if (status >= 400 && status < 500) return "client_error";
  if (status >= 500) return "server_error";
  return "unknown";
}

function classifyError(err: unknown): UrlClassification {
  const msg = err instanceof Error ? err.message : String(err);
  const name = err instanceof Error ? err.name : "";
  if (name === "AbortError" || msg.includes("timeout")) return "timeout";
  if (msg.includes("ENOTFOUND") || msg.includes("getaddrinfo")) return "dns";
  if (msg.includes("redirect")) return "redirect_loop";
  return "network";
}

async function fetchWithRedirects(
  url: string,
  method: "HEAD" | "GET"
): Promise<{ status: number; finalUrl: string }> {
  let current = url;
  for (let i = 0; i < MAX_REDIRECTS; i++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(current, {
        method,
        redirect: "manual",
        signal: controller.signal,
        headers: { "User-Agent": "bet-turnin-sheet-audit/1.0" },
      });
      clearTimeout(timer);
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        if (!loc) return { status: res.status, finalUrl: current };
        current = new URL(loc, current).href;
        continue;
      }
      return { status: res.status, finalUrl: current };
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  }
  throw new Error("redirect loop");
}

async function checkOneUrl(url: string): Promise<Omit<UrlCheckResult, "id" | "cached">> {
  const attempt = async (method: "HEAD" | "GET") => {
    const { status, finalUrl } = await fetchWithRedirects(url, method);
    let classification = classifyStatus(status);
    if (classification === "method_not_allowed" && method === "HEAD") {
      return null;
    }
    if (classification === "blocked" && method === "HEAD") {
      return null;
    }
    return { classification, httpStatus: status, finalUrl, error: null };
  };

  for (let retry = 0; retry <= 2; retry++) {
    try {
      let result = await attempt("HEAD");
      if (!result) result = await attempt("GET");
      if (result) return { url, ...result };
    } catch (err) {
      const classification = classifyError(err);
      if (retry < 2 && TRANSIENT_CLASS.has(classification)) {
        await Bun.sleep(retry === 0 ? 500 : 1500);
        continue;
      }
      return {
        url,
        classification,
        httpStatus: null,
        finalUrl: null,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  return {
    url,
    classification: "unknown",
    httpStatus: null,
    finalUrl: null,
    error: "Exhausted retries",
  };
}

async function pool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]!);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker())
  );
  return results;
}

export async function checkUrls(
  targets: Array<{ id: string; url: string }>,
  options: { noCache?: boolean } = {}
): Promise<UrlCheckResult[]> {
  const cache = options.noCache ? { entries: {} } : await loadCache();
  const toFetch: Array<{ id: string; url: string }> = [];
  const results: UrlCheckResult[] = [];

  for (const t of targets) {
    const hit = cache.entries[t.url];
    if (hit && isFresh(hit) && !options.noCache) {
      results.push({
        id: t.id,
        url: t.url,
        classification: hit.classification,
        httpStatus: hit.status,
        finalUrl: hit.finalUrl,
        cached: true,
        error: null,
      });
    } else {
      toFetch.push(t);
    }
  }

  const fetched = await pool(toFetch, CONCURRENCY, async (t) => {
    const r = await checkOneUrl(t.url);
    cache.entries[t.url] = {
      status: r.httpStatus,
      finalUrl: r.finalUrl,
      classification: r.classification,
      checkedAt: new Date().toISOString(),
    };
    return { id: t.id, cached: false, ...r };
  });

  if (!options.noCache && fetched.length > 0) {
    await saveCache(cache);
  }

  return [...results, ...fetched];
}

export function isUrlCheckSuccess(classification: UrlClassification): boolean {
  return classification === "ok" || classification === "redirect";
}

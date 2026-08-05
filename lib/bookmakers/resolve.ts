/**
 * Resolve a bookmaker from the public v0.4 (or v0.3) registry mirror.
 * Shared by partner registration CLI and portal consumers.
 *
 * @see public/registry/bookmakers.json
 */

export interface BookmakerRegistryEntry {
  id: string; // brand-ok — registry id / route slug
  slug?: string;
  label?: string;
  domain?: string;
  skin?: string;
  brandGroup?: string;
  urls?: { web?: string | null; api?: string | null };
  [key: string]: unknown;
}

/** Host from v0.3 domain or v0.4 urls.web. */
export function bookmakerHost(entry: BookmakerRegistryEntry): string {
  if (entry.domain) return String(entry.domain).replace(/^https?:\/\//i, '').replace(/\/$/, '');
  const web = entry.urls?.web;
  if (typeof web === 'string' && web) {
    try {
      return new URL(web).host;
    } catch {
      return web.replace(/^https?:\/\//i, '').replace(/\/$/, '');
    }
  }
  return '';
}

/** Resolve --bookmaker query: id/slug, label, skin, host, partial. */
export function resolveBookmakerEntry(
  registry: Record<string, BookmakerRegistryEntry>,
  query: string
): BookmakerRegistryEntry | undefined {
  const q = query.trim().toLowerCase();
  if (!q) return undefined;
  if (registry[q]) return registry[q];

  const values = Object.values(registry);
  const byId = values.find(
    b => b.id?.toLowerCase() === q || (b.slug && String(b.slug).toLowerCase() === q)
  );
  if (byId) return byId;

  const exact = values.find(b => {
    const host = bookmakerHost(b).toLowerCase();
    return (
      b.label?.toLowerCase() === q ||
      b.skin?.toLowerCase() === q ||
      b.brandGroup?.toLowerCase() === q ||
      host === q ||
      host.replace(/^www\./, '') === q
    );
  });
  if (exact) return exact;

  return values.find(b => {
    const host = bookmakerHost(b).toLowerCase();
    return (
      b.label?.toLowerCase().includes(q) ||
      b.id.toLowerCase().includes(q) ||
      (b.slug && String(b.slug).toLowerCase().includes(q)) ||
      b.skin?.toLowerCase().includes(q) ||
      host.includes(q)
    );
  });
}

export async function loadBookmakerRegistry(
  path = 'public/registry/bookmakers.json'
): Promise<Record<string, BookmakerRegistryEntry>> {
  const body = JSON.parse(await Bun.file(path).text()) as {
    bookmakers?: Record<string, BookmakerRegistryEntry>;
  };
  return body.bookmakers ?? {};
}

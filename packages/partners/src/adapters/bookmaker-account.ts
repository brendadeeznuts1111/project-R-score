import { parseSportsbookId } from '../core/identifiers.ts';
import type { PartnerOutCapabilitySnapshot } from '../core/out-capabilities.ts';
import type { SportsbookId } from '../core/types.ts';
import type { BookmakerCatalogEntry } from './bookmakers.ts';

export type BookmakerAccountResolution =
  | {
      status: 'resolved';
      sportsbook: PartnerOutCapabilitySnapshot['sportsbook'];
    }
  | {
      status: 'manual_review';
      accountEntrypointUrl: string;
      host: string;
      reason: 'unregistered_host';
    };

export type ResolveBookmakerAccountInput = {
  accountEntrypointUrl: string;
  registry: Readonly<Record<string, BookmakerCatalogEntry>>;
  /** Explicit host-to-SportsbookId aliases owned by the bookmaker adapter. */
  hostAliases?: Readonly<Record<string, unknown>>;
  /** Explicit operator choice; never inferred from a partial host match. */
  manualSportsbookId?: unknown;
};

function parseAccountEntrypointUrl(value: string): { value: string; host: string } {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new TypeError('accountEntrypointUrl must be an absolute URL');
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new TypeError('accountEntrypointUrl protocol must be https or http');
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new TypeError(
      'accountEntrypointUrl must not contain credentials, query parameters, or fragments'
    );
  }
  return { value: parsed.toString(), host: normalizeHost(parsed.hostname) };
}

function normalizeHost(value: string): string {
  return value.trim().toLowerCase().replace(/\.$/, '');
}

function comparableHost(value: string): string {
  return normalizeHost(value).replace(/^www\./, '');
}

function catalogHost(entry: BookmakerCatalogEntry, key: string): string {
  const source = entry.urls.web;
  try {
    const parsed = new URL(source.includes('://') ? source : `https://${source}`);
    return normalizeHost(parsed.hostname);
  } catch {
    throw new TypeError(`bookmaker registry entry ${key} has an invalid web host`);
  }
}

function findBySportsbookId(
  registry: Readonly<Record<string, BookmakerCatalogEntry>>,
  sportsbookId: SportsbookId
): BookmakerCatalogEntry {
  const matches = Object.values(registry).filter(entry => entry.id === sportsbookId);
  if (matches.length !== 1) {
    throw new TypeError(
      matches.length === 0
        ? `sportsbook ${sportsbookId} is not registered`
        : `sportsbook ${sportsbookId} is registered more than once`
    );
  }
  return matches[0]!;
}

function resolved(
  entry: BookmakerCatalogEntry,
  id: SportsbookId,
  account: { value: string; host: string },
  resolutionMethod: 'exact' | 'alias' | 'manual'
): BookmakerAccountResolution {
  return {
    status: 'resolved',
    sportsbook: {
      sportsbookId: id,
      accountEntrypointUrl: account.value,
      host: account.host,
      ...(entry.skin ? { skinLabel: entry.skin } : {}),
      ...(entry.brandGroup ? { brandGroup: entry.brandGroup } : {}),
      resolutionMethod,
    },
  };
}

/**
 * Resolves a submitted partner account URL against bookmaker authority.
 * Unknown hosts stop at manual review; no substring or eTLD guess is accepted.
 */
export function resolveBookmakerAccount(
  input: ResolveBookmakerAccountInput
): BookmakerAccountResolution {
  const account = parseAccountEntrypointUrl(input.accountEntrypointUrl);
  const exactMatches = Object.entries(input.registry).filter(([key, entry]) => {
    const host = catalogHost(entry, key);
    return comparableHost(host) === comparableHost(account.host);
  });
  const exactIds = new Set(exactMatches.map(([, entry]) => entry.id));
  if (exactIds.size > 1) {
    throw new TypeError(`account host ${account.host} matches multiple registered sportsbooks`);
  }
  if (exactMatches[0]) {
    const [, entry] = exactMatches[0];
    return resolved(entry, entry.id, account, 'exact');
  }

  const aliasEntries = Object.entries(input.hostAliases ?? {}).filter(
    ([host]) => comparableHost(host) === comparableHost(account.host)
  );
  const aliasIds = new Set(aliasEntries.map(([, id]) => String(id)));
  if (aliasIds.size > 1) {
    throw new TypeError(`account host ${account.host} has conflicting aliases`);
  }
  const aliasId = aliasEntries[0]?.[1];
  if (aliasId !== undefined) {
    const parsedId = parseSportsbookId(aliasId);
    return resolved(findBySportsbookId(input.registry, parsedId), parsedId, account, 'alias');
  }

  if (input.manualSportsbookId !== undefined) {
    const parsedId = parseSportsbookId(input.manualSportsbookId);
    return resolved(findBySportsbookId(input.registry, parsedId), parsedId, account, 'manual');
  }

  return {
    status: 'manual_review',
    accountEntrypointUrl: account.value,
    host: account.host,
    reason: 'unregistered_host',
  };
}

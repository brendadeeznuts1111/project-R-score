export const FACTORY_WAGER_NPM_READ_URL =
  'https://registry.factory-wager.com/api/npm' as const;
export const FACTORY_WAGER_NPM_READ_ENV = 'FACTORY_WAGER_NPM_REGISTRY_URL' as const;
export const FACTORY_WAGER_LOCAL_WRITE_ENV =
  'FACTORY_WAGER_LOCAL_REGISTRY_WRITE_URL' as const;
export const LEGACY_REGISTRY_URL_ENV = 'REGISTRY_URL' as const;

declare const registryReadUrlBrand: unique symbol;
declare const localRegistryWriteUrlBrand: unique symbol;

export type RegistryReadUrl = string & { readonly [registryReadUrlBrand]: true };
export type LocalRegistryWriteUrl = string & {
  readonly [localRegistryWriteUrlBrand]: true;
};

export interface RegistryPlaneEnvironment {
  readonly FACTORY_WAGER_NPM_REGISTRY_URL?: string;
  readonly FACTORY_WAGER_LOCAL_REGISTRY_WRITE_URL?: string;
  readonly REGISTRY_URL?: string;
}

export interface RegistryPlaneSelection {
  readonly explicit?: unknown;
  readonly legacyExplicit?: unknown;
  readonly env?: RegistryPlaneEnvironment;
  readonly warn?: (message: string) => void;
}

const CREDENTIAL_HEADERS = new Set(['authorization', 'cookie', 'proxy-authorization']);

function stringValue(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function withoutTrailingSlash(url: URL): string {
  return url.toString().replace(/\/+$/, '');
}

function isLoopbackHostname(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '::1' ||
    hostname === '[::1]' ||
    /^127(?:\.\d{1,3}){3}$/.test(hostname)
  );
}

function reportIgnoredLegacy(
  legacyExplicit: unknown,
  env: RegistryPlaneEnvironment,
  warn: (message: string) => void
): void {
  if (stringValue(legacyExplicit) || stringValue(env.REGISTRY_URL)) {
    warn(
      'REGISTRY_URL/--registry is ambiguous and was ignored; use the plane-specific read or local-write setting'
    );
  }
}

/** Parse the public FactoryWager npm read plane or an HTTP loopback development read. */
export function parseRegistryReadUrl(value: unknown): RegistryReadUrl {
  const candidate = stringValue(value);
  if (!candidate) throw new Error('Registry read URL is required');

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error('Registry read URL must be a valid URL');
  }

  if (url.username || url.password) {
    throw new Error('Registry read URL must not contain credentials');
  }

  const normalized = withoutTrailingSlash(url);
  if (normalized === FACTORY_WAGER_NPM_READ_URL) {
    return normalized as RegistryReadUrl;
  }
  if (url.protocol === 'http:' && isLoopbackHostname(url.hostname)) {
    return normalized as RegistryReadUrl;
  }

  throw new Error(
    `Registry read URL must be ${FACTORY_WAGER_NPM_READ_URL} or an HTTP loopback URL`
  );
}

/** Resolve reads without allowing the legacy shared variable to select a destination. */
export function resolveRegistryReadUrl(options: RegistryPlaneSelection = {}): RegistryReadUrl {
  const env = options.env ?? (Bun.env as RegistryPlaneEnvironment);
  const warn = options.warn ?? console.warn;
  reportIgnoredLegacy(options.legacyExplicit, env, warn);
  return parseRegistryReadUrl(
    stringValue(options.explicit) ??
      stringValue(env.FACTORY_WAGER_NPM_REGISTRY_URL) ??
      FACTORY_WAGER_NPM_READ_URL
  );
}

/** Parse an explicitly selected local SDK/native-registry write destination. */
export function parseLocalRegistryWriteUrl(value: unknown): LocalRegistryWriteUrl {
  const candidate = stringValue(value);
  if (!candidate) {
    throw new Error(
      `Local registry writes require --write-registry or ${FACTORY_WAGER_LOCAL_WRITE_ENV}`
    );
  }

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error('Local registry write URL must be a valid HTTP loopback URL');
  }

  if (
    url.protocol !== 'http:' ||
    !isLoopbackHostname(url.hostname) ||
    url.username ||
    url.password
  ) {
    throw new Error('Local registry write URL must use credential-free HTTP loopback');
  }

  return withoutTrailingSlash(url) as LocalRegistryWriteUrl;
}

/** Resolve writes without a default and without accepting the legacy shared variable. */
export function resolveLocalRegistryWriteUrl(
  options: RegistryPlaneSelection = {}
): LocalRegistryWriteUrl {
  const env = options.env ?? (Bun.env as RegistryPlaneEnvironment);
  const warn = options.warn ?? console.warn;
  reportIgnoredLegacy(options.legacyExplicit, env, warn);
  return parseLocalRegistryWriteUrl(
    stringValue(options.explicit) ?? stringValue(env.FACTORY_WAGER_LOCAL_REGISTRY_WRITE_URL)
  );
}

/** Validate the write destination before invoking a credential reader. */
export function prepareLocalRegistryWrite<T>(
  options: RegistryPlaneSelection,
  readCredentials: () => T
): { readonly url: LocalRegistryWriteUrl; readonly credentials: T } {
  const url = resolveLocalRegistryWriteUrl(options);
  return { url, credentials: readCredentials() };
}

/** Build a GET/HEAD request that cannot carry ambient or explicit credentials. */
export function tokenlessRegistryReadInit(init: RequestInit = {}): RequestInit {
  if (init.credentials && init.credentials !== 'omit') {
    throw new Error('Registry reads must use credentials: omit');
  }

  const headers = new Headers(init.headers);
  for (const header of CREDENTIAL_HEADERS) {
    if (headers.has(header)) {
      throw new Error(`Registry reads must not forward ${header} credentials`);
    }
  }
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');

  return { ...init, credentials: 'omit', headers };
}

export function fetchRegistryReadTokenless(
  input: string | URL,
  init: RequestInit = {},
  fetcher: typeof fetch = fetch
): Promise<Response> {
  const url = input instanceof URL ? input : new URL(input);
  if (url.username || url.password) {
    throw new Error('Registry reads must not forward URL credentials');
  }
  return fetcher(url, tokenlessRegistryReadInit(init));
}

export function registryPackageUrl(baseUrl: RegistryReadUrl, packageName: string): string {
  return `${baseUrl}/${packageName}`;
}

// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/environment-variables — Bun.env
/** Bun.env accessors shared across registry modules. */

export function registryHost(): string {
  return Bun.env.REGISTRY_HOST || Bun.env.SERVER_HOST || Bun.env.HOST || 'localhost';
}

export function registryPublicUrl(fallback = 'https://registry.factory-wager.com'): string {
  return Bun.env.REGISTRY_URL || fallback;
}

export function npmRegistryUrl(): string {
  return Bun.env.NPM_REGISTRY || 'https://registry.npmjs.org';
}

export function registryHomeDir(): string {
  return Bun.env.HOME || '';
}

export function syncUserId(): string {
  return Bun.env.USER_ID || 'anonymous';
}

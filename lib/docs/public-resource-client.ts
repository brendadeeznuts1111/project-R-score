/**
 * Documentation-facing access to the canonical hardened public-resource client.
 * Packages coupled to `lib/docs` use this bridge without owning HTTP policy.
 */
export { fetchPublicResource } from '../http/public-resource-client.ts';

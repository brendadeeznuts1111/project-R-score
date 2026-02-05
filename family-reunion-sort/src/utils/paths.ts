import { STORAGE_PREFIX } from "../config/scope.config";

export function getScopedKey(property: string): string {
  return `${STORAGE_PREFIX}${property}`;
}

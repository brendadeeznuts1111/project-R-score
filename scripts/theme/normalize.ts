// Normalize theme object: resolve $ref-like aliases (var(--...)) and detect cycles.
export function normalize(theme: any): any {
  // Minimal: return theme as-is; $ref resolution handled by sync consumer.
  return theme;
}

export function hasCycle(obj: any, seen = new Set<any>()): boolean {
  if (obj && typeof obj === "object") {
    if (seen.has(obj)) return true;
    seen.add(obj);
    for (const v of Object.values(obj)) {
      if (hasCycle(v, seen)) return true;
    }
    seen.delete(obj);
  }
  return false;
}
/** Canonical registry link helpers — SSOT for href format in audit tooling. */

export function registryHref(ref: { anchor: string }): string {
  return `REFS.md#${ref.anchor}`;
}

export function expectedNavAttrs(ref: { id: string; anchor: string }) {
  return { href: registryHref(ref), dataRef: ref.id };
}

export function anchorFromRefId(id: string): string {
  return `ref-${id.toLowerCase()}`;
}

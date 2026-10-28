export interface SubprocessInventoryIdentity {
  readonly id: string; // brand-ok — deterministic structural inventory identity
  readonly authority: string;
}

export interface SubprocessInventoryComparison {
  readonly additions: readonly string[];
  readonly removals: readonly string[];
  readonly classificationChanges: readonly string[];
}

/** Bidirectional comparison: discovery and review manifest must match exactly. */
export function compareSubprocessInventory(
  discovered: readonly SubprocessInventoryIdentity[],
  reviewed: readonly SubprocessInventoryIdentity[]
): SubprocessInventoryComparison {
  const discoveredById = new Map(discovered.map(row => [row.id, row]));
  const reviewedById = new Map(reviewed.map(row => [row.id, row]));
  return {
    additions: discovered.filter(row => !reviewedById.has(row.id)).map(row => row.id),
    removals: reviewed.filter(row => !discoveredById.has(row.id)).map(row => row.id),
    classificationChanges: discovered.flatMap(row => {
      const prior = reviewedById.get(row.id);
      return prior && prior.authority !== row.authority
        ? [`${row.id}: ${prior.authority} -> ${row.authority}`]
        : [];
    }),
  };
}

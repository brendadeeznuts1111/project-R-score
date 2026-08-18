import type {
  ExampleStability,
  ReleaseKnowledge,
  ReleaseKnowledgeDiff,
  ReleaseKnowledgeExample,
  ReleaseKnowledgeSearchHit,
} from './knowledge-types.ts';

function terms(value: string): string[] {
  return [...new Set(value.toLowerCase().match(/[a-z0-9][a-z0-9_.:-]*/g) ?? [])];
}

export function searchReleaseKnowledge(
  knowledge: ReleaseKnowledge | readonly ReleaseKnowledge[],
  query: string,
  limit = 5
): ReleaseKnowledgeSearchHit[] {
  if (!Number.isSafeInteger(limit) || limit <= 0) throw new Error('Search limit must be positive');
  const queryTerms = terms(query);
  if (queryTerms.length === 0) throw new Error('Search query must contain a searchable term');
  const releases = Array.isArray(knowledge) ? knowledge : [knowledge];
  return releases
    .flatMap(release => release.examples)
    .map(example => {
      const fields: Array<[string, number]> = [
        [example.feature, 8],
        [example.api.join(' '), 6],
        [example.section, 4],
        [example.purpose, 3],
        [example.code, 1],
      ];
      const score = fields.reduce(
        (sum, [value, weight]) =>
          sum + queryTerms.filter(term => value.toLowerCase().includes(term)).length * weight,
        0
      );
      return { ...example, score };
    })
    .filter(example => example.score > 0)
    .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id))
    .slice(0, limit);
}

export function diffReleaseKnowledge(
  previous: ReleaseKnowledge,
  current: ReleaseKnowledge
): ReleaseKnowledgeDiff {
  const previousBySlot = new Map(previous.examples.map(example => [example.slot, example]));
  const currentBySlot = new Map(current.examples.map(example => [example.slot, example]));
  const previousFeatures = new Set(previous.examples.map(example => example.feature));
  const currentFeatures = new Set(current.examples.map(example => example.feature));
  return {
    from: previous.releaseVersion,
    to: current.releaseVersion,
    addedFeatures: [...currentFeatures].filter(feature => !previousFeatures.has(feature)).sort(),
    removedFeatures: [...previousFeatures].filter(feature => !currentFeatures.has(feature)).sort(),
    addedExamples: [...currentBySlot.keys()].filter(slot => !previousBySlot.has(slot)).sort(),
    removedExamples: [...previousBySlot.keys()].filter(slot => !currentBySlot.has(slot)).sort(),
    changedExamples: [...currentBySlot]
      .flatMap(([slot, after]) => {
        const before = previousBySlot.get(slot);
        return before && before.code !== after.code
          ? [{ slot, before: before.id, after: after.id }]
          : [];
      })
      .sort((left, right) => left.slot.localeCompare(right.slot)),
  };
}

export function adoptionMatrixRows(knowledge: ReleaseKnowledge): Array<{
  feature: string;
  stability: ExampleStability;
  examples: number;
  runnable: number;
  documented: number;
}> {
  const rank: Record<ExampleStability, number> = {
    'highly-experimental': 5,
    experimental: 4,
    deprecated: 3,
    unknown: 2,
    stable: 1,
  };
  const groups = new Map<string, ReleaseKnowledgeExample[]>();
  for (const example of knowledge.examples) {
    const group = groups.get(example.feature) ?? [];
    group.push(example);
    groups.set(example.feature, group);
  }
  return [...groups]
    .map(([feature, examples]) => ({
      feature,
      stability: [...examples].sort((a, b) => rank[b.stability] - rank[a.stability])[0]!.stability,
      examples: examples.length,
      runnable: examples.filter(example => example.runnable).length,
      documented: examples.filter(example => example.docsLinks.length > 0).length,
    }))
    .sort(
      (left, right) =>
        rank[right.stability] - rank[left.stability] || left.feature.localeCompare(right.feature)
    );
}

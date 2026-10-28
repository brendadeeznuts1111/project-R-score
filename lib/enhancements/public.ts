import type { EnhancementSnapshot } from './types.ts';

export interface PublicEnhancementItem {
  id: string; // brand-ok — validated registry identifier
  name: string;
  kind: string;
  status: string;
  available: boolean;
  enabled: boolean | null;
  minimumBunVersion: string;
  bunVersionRange: string | null;
  featureFlag: string | null;
  docs: string;
  intro: string | null;
  target: string;
  reason: string;
}

export function publicEnhancementSnapshot(snapshot: EnhancementSnapshot): {
  version: string;
  environment: string;
  runtime: EnhancementSnapshot['runtime'];
  generatedAt: string;
  items: PublicEnhancementItem[];
} {
  return {
    version: snapshot.version,
    environment: snapshot.environment,
    runtime: snapshot.runtime,
    generatedAt: snapshot.generatedAt,
    items: snapshot.items.map(item => ({
      id: item.id,
      name: item.name,
      kind: item.kind,
      status: item.status,
      available: item.available,
      enabled: item.enabled,
      minimumBunVersion: item.minimumBunVersion,
      bunVersionRange: item.bunVersionRange,
      featureFlag: item.featureFlag,
      docs: item.docs,
      intro: item.intro,
      target: item.target,
      reason: item.reason,
    })),
  };
}

export type EnhancementStatus =
  'proposed' | 'experimental' | 'beta' | 'stable' | 'deprecated' | 'removed';

export type EnhancementEnvironment = 'development' | 'staging' | 'production' | 'test';

export type EnhancementKind =
  'guarded-feature' | 'runtime-capability' | 'cli-capability' | 'compatibility-lane';

export interface PromotionCriteria {
  minimumDays: number;
  noCriticalErrors: true;
  minimumPerformanceRatio: number;
}

export interface EnhancementItem {
  id: string; // brand-ok — registry key validated at the JSONC boundary
  name: string;
  kind: EnhancementKind;
  status: EnhancementStatus;
  featureFlag: string | null;
  minimumBunVersion: string;
  bunVersionRange: string | null;
  introducedIn: string | null;
  docs: string;
  intro: string | null;
  release: string | null;
  replaces: string | null;
  target: string;
  evidence: string[];
  promotionCriteria: PromotionCriteria | null;
}

export interface EnhancementRegistry {
  $schema?: string;
  version: string;
  items: EnhancementItem[];
}

export interface ResolvedEnhancement extends EnhancementItem {
  available: boolean;
  enabled: boolean | null;
  defaultEnabled: boolean | null;
  overridden: boolean;
  reason: string;
}

export interface EnhancementSnapshot {
  version: string;
  environment: EnhancementEnvironment;
  runtime: { name: 'bun'; version: string; revision: string | null };
  generatedAt: string;
  items: ResolvedEnhancement[];
}

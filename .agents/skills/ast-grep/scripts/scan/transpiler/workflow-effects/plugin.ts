import type { NetworkBaseline } from "../network-baseline.ts";
import type {
  WorkflowDrift,
  WorkflowEffectDeps,
  WorkflowScannerResult,
} from "../workflow-loop.ts";
import type { Severity } from "../types.ts";
import type { BunDriftInfo, BunRuntimeInfo, WorkflowTlsOptions } from "./runtime.ts";

export type EffectContext = {
  domain: string;
  skillRoot: string;
  repo: string;
  results: WorkflowScannerResult[];
  drift: WorkflowDrift | null;
  seedState: NetworkBaseline | null;
  dryRun?: boolean;
  failOnSeverity?: Severity;
  options: Record<string, unknown>;
  deps: WorkflowEffectDeps;
  bun: BunRuntimeInfo;
  bunDrift: BunDriftInfo | null;
  tls?: WorkflowTlsOptions;
  includeBunVersion: boolean;
};

export interface EffectPlugin {
  id: string;
  name: string;
  description: string;
  run(ctx: EffectContext): Promise<void>;
  condition?: (ctx: EffectContext) => boolean;
}

export type EffectConfig = {
  enabled: boolean;
  params?: Record<string, unknown>;
};
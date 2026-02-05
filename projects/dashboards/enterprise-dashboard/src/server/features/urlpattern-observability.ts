#!/usr/bin/env bun

// URLPattern Observability Module
// Barrel: re-exports from urlpattern/ (logger, constants, types, pattern-registry, analyzer, cli).

// Re-export types for backwards compatibility
export type {
  PatternAnalysis,
  BunURLPatternMetrics,
  ExecAnalysis,
  ProxyAnalysis,
  AgentAnalysis,
} from "./urlpattern/types";

export { URLPatternUltimateAnalyzer } from "./urlpattern/analyzer";
export { CLI } from "./urlpattern/cli";

if (typeof import.meta !== "undefined" && (import.meta as any).main) {
  const { CLI } = await import("./urlpattern/cli");
  const cli = new CLI();
  const args = Bun.argv.slice(2);
  if (args.length === 0) cli.showEnhancedHelp();
  else cli.run(args).catch(console.error);
}

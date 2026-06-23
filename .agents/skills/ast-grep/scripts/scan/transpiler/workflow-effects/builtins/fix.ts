import { applyWorkflowFixes } from "../actions.ts";
import type { EffectPlugin } from "../plugin.ts";

export const FixEffect: EffectPlugin = {
  id: "fix",
  name: "Fix",
  description: "Attempts to automatically fix semver violations (respects dry-run)",
  condition(ctx) {
    return ctx.results.some((r) =>
      (r.scannerId === "semver" || r.scannerId === "packages") && r.issues.length > 0,
    );
  },
  async run(ctx) {
    if (ctx.dryRun) {
      console.error(`[${ctx.domain}] fix: dry-run mode — listing commands only`);
    }
    const cmds = await applyWorkflowFixes(ctx.domain, ctx.results, {
      repo: ctx.repo,
      dryRun: ctx.dryRun,
      minSeverity: ctx.failOnSeverity ?? "high",
      deps: ctx.deps,
    });
    if (cmds.length) {
      const prefix = ctx.dryRun ? "fix (dry-run)" : "fix";
      console.error(`[${ctx.domain}] ${prefix}: ${cmds.join("; ")}`);
    }
  },
};
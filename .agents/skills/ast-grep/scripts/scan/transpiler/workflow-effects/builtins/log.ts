import { formatBunRuntimeLine } from "../runtime.ts";
import type { EffectPlugin } from "../plugin.ts";

export const LogEffect: EffectPlugin = {
  id: "log",
  name: "Log",
  description: "Logs drift, issues, and optional Bun runtime metadata to stderr",
  condition(ctx) {
    return Boolean(ctx.drift?.hasDrift)
      || ctx.results.some((r) => r.issues.length > 0)
      || Boolean(ctx.bunDrift?.drift);
  },
  async run(ctx) {
    if (ctx.includeBunVersion) {
      console.error(`[${ctx.domain}] runtime: ${formatBunRuntimeLine(ctx.bun)}`);
      if (ctx.bunDrift?.drift) {
        console.error(`[${ctx.domain}] bun drift: ${ctx.bunDrift.versionDelta ?? "version changed"}`);
      }
    }
    if (ctx.drift?.hasDrift) {
      console.error(`[${ctx.domain}] drift:`, JSON.stringify(ctx.drift, null, 2));
    }
    for (const result of ctx.results) {
      if (result.issues.length > 0) {
        console.error(`[${ctx.domain}] ${result.scannerId}: ${result.issues.length} issue(s)`);
      }
    }
  },
};
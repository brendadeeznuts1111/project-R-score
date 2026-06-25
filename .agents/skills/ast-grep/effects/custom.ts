import type { EffectPlugin } from "../scripts/scan/transpiler/workflow-effects/plugin.ts";

const CustomEffect: EffectPlugin = {
  id: "custom",
  name: "Custom Effect",
  description: "Logs a custom message when issues are detected",
  condition(ctx) {
    return ctx.results.some((r) => r.issues.length > 0);
  },
  async run(ctx) {
    const count = ctx.results.reduce((n, r) => n + r.issues.length, 0);
    console.error(`[${ctx.domain}] custom effect: ${count} issue(s) detected`);
  },
};

export default CustomEffect;
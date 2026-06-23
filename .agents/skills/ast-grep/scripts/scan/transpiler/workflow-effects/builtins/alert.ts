import { sendWorkflowAlert } from "../actions.ts";
import type { WorkflowTlsOptions } from "../runtime.ts";
import type { EffectPlugin } from "../plugin.ts";

function resolveAlertTls(ctx: Parameters<EffectPlugin["run"]>[0]): WorkflowTlsOptions | undefined {
  if (ctx.tls) return ctx.tls;
  const optTls = ctx.options.tls;
  if (optTls && typeof optTls === "object") return optTls as WorkflowTlsOptions;
  return ctx.deps.tls;
}

export const AlertEffect: EffectPlugin = {
  id: "alert",
  name: "Alert",
  description: "Sends a webhook notification (TLS-configurable)",
  condition(ctx) {
    return ctx.results.some((r) => r.issues.length > 0) || Boolean(ctx.drift?.hasDrift);
  },
  async run(ctx) {
    const webhookUrl = String(ctx.options.url ?? "");
    if (!webhookUrl) {
      console.error(`[${ctx.domain}] alert: missing url parameter`);
      return;
    }
    const tls = resolveAlertTls(ctx);
    try {
      await sendWorkflowAlert(
        ctx.domain,
        ctx.results,
        ctx.drift,
        webhookUrl,
        { ...ctx.deps, tls },
        {
          tls,
          bun: ctx.bun,
          bunDrift: ctx.bunDrift,
          includeBunVersion: ctx.includeBunVersion,
        },
      );
      console.error(`[${ctx.domain}] alert sent to ${webhookUrl}`);
    } catch (err) {
      console.error(`[${ctx.domain}] alert failed:`, err);
    }
  },
};
import { generateWorkflowReport } from "../actions.ts";
import type { EffectPlugin } from "../plugin.ts";

export const ReportEffect: EffectPlugin = {
  id: "report",
  name: "Report",
  description: "Generates a Markdown report including Bun runtime metadata",
  async run(ctx) {
    const reportPath = String(ctx.options.path ?? `reports/${ctx.domain}-workflow.md`);
    const written = await generateWorkflowReport(
      ctx.domain,
      ctx.results,
      ctx.drift,
      reportPath,
      ctx.deps,
      {
        bun: ctx.bun,
        bunDrift: ctx.bunDrift,
        includeBunVersion: ctx.includeBunVersion,
      },
    );
    console.error(`[${ctx.domain}] report written to ${written}`);
  },
};
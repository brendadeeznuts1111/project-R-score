import { getLogger, VERSION } from "@bun-toml/core";

export class Profiler {
	private logger = getLogger();

	profile() {
		this.logger.info("Profiling started");
		return { cpu: 0, memory: 0 };
	}
}

export const V137ProfileRssIntegration = class {
	formatMetricsTable(metrics: any[]) {
		return metrics.map((m) => `${m.name}: ${m.value}`).join("\n");
	}
};

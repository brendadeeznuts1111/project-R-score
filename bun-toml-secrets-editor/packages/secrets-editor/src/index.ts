import { getLogger, VERSION } from "@bun-toml/core";
import { RSSFeedMonitor } from "@bun-toml/rss";

export class SecretsEditor {
	private logger = getLogger();
	private rss = new RSSFeedMonitor({ maxFeeds: 10 });

	start() {
		this.logger.success(`Bun TOML Secrets Editor v${VERSION} started`);
	}
}

console.log("Main entry stub loaded");

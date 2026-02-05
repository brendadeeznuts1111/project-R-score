import { getLogger } from "@bun-toml/core";
import { RSSFeedMonitor, RSSFeed } from "@bun-toml/rss";
import { createHotReloadManager } from "./hot-reload-manager";

export class GodViewDashboard {
	private logger = getLogger();
	private rss = new RSSFeedMonitor({
		maxFeeds: 50,
		maxItemsPerFeed: 100,
		defaultInterval: 300000,
		userAgent: "GodView-Dashboard/1.0"
	});
	private hotReload = createHotReloadManager({
		acceptSelf: true,
		onDispose: () => {
			this.logger.info("Dashboard disposing resources");
		},
		onData: (data) => {
			data.startTime = data.startTime || Date.now();
		}
	});

	constructor() {
		this.setupHotReloadCallbacks();
	}

	private setupHotReloadCallbacks() {
		// Reload RSS feeds when dashboard updates
		this.hotReload.onCallback("rss-reload", () => {
			this.logger.info("🔥 Reloading RSS feeds");
			this.rss = new RSSFeedMonitor({
				maxFeeds: 50,
				maxItemsPerFeed: 100,
				defaultInterval: 300000,
				userAgent: "GodView-Dashboard/1.0"
			});
		});

		// Log hot reload events
		this.hotReload.onEvent("vite:beforeUpdate", () => {
			this.logger.info("🔥 Hot reload update detected");
		});
	}

	start(port: number): { port: number; feeds: RSSFeed[]; hotReload: boolean } {
		const data = this.hotReload.getData();
		const uptime = Date.now() - (data.startTime || Date.now());
		
		this.logger.info(`Dashboard starting on port ${port} (uptime: ${uptime}ms)`);
		
		if (this.hotReload.isHotReloadAvailable()) {
			this.logger.info("🔥 Hot reload enabled");
		}

		return { 
			port, 
			feeds: this.rss.getAllFeeds(),
			hotReload: this.hotReload.isHotReloadAvailable()
		};
	}
}

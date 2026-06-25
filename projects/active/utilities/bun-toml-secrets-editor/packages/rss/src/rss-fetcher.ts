import { getLogger, isInternalIP, SecurityError } from "@bun-toml/core";

export class RSSFetcher {
	private logger = getLogger();

	async fetch(url: string, options: { userAgent?: string } = {}) {
		if (isInternalIP(url)) {
			throw new SecurityError(`SSRF blocked: ${url}`);
		}

		this.logger.info("Fetching RSS", { url });

		try {
			const response = await fetch(url, {
				headers: {
					"User-Agent": options.userAgent || "Bun-RSS/1.0",
					Accept: "application/rss+xml, application/atom+xml",
				},
			});

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}

			return await response.text();
		} catch (error) {
			this.logger.error("Fetch failed", { url, error });
			throw error;
		}
	}
}

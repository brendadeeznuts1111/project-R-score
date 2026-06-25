/**
 * @dynamic-spy/kit v4.2 - OddsPortal Scraper
 * 
 * Historical odds scrapers for real data collection
 */

export interface ScrapedOdds {
	timestamp: number;
	bookie: string;
	market: string;
	league: string;
	home: string;
	away: string;
	homeOdds: number;
	drawOdds?: number;
	awayOdds: number;
	line?: number;
	url: string;
}

export class OddsPortalScraper {
	private readonly baseUrl = 'https://www.oddsportal.com';
	private readonly userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

	/**
	 * Scrape market odds from OddsPortal
	 * 
	 * @param bookie - Bookie name (e.g., 'pinnacle', 'fonbet')
	 * @param market - Market identifier (e.g., 'MANUTD-VS-LIV')
	 * @param date - Date to scrape
	 * @returns Scraped odds data
	 */
	async scrapeMarket(bookie: string, market: string, date: Date): Promise<ScrapedOdds | null> {
		try {
			// Format URL for OddsPortal
			const url = this.formatOddsPortalUrl(market, date);

			const res = await fetch(url, {
				headers: {
					'User-Agent': this.userAgent,
					'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
					'Accept-Language': 'en-US,en;q=0.9',
					'Referer': this.baseUrl
				}
			});

			if (!res.ok) {
				console.warn(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
				return null;
			}

			const html = await res.text();
			return this.parseOddsPortal(html, bookie, market, date, url);
		} catch (error: any) {
			console.error(`Error scraping ${bookie} ${market}:`, error.message);
			return null;
		}
	}

	/**
	 * Format OddsPortal URL from market identifier
	 * 
	 * @param market - Market identifier (e.g., 'MANUTD-VS-LIV')
	 * @param date - Date
	 * @returns Formatted URL
	 */
	private formatOddsPortalUrl(market: string, date: Date): string {
		// Convert market format: MANUTD-VS-LIV -> manchester-united-liverpool
		const formatted = market
			.toLowerCase()
			.replace(/-vs-/g, '-')
			.replace(/manutd/g, 'manchester-united')
			.replace(/liv/g, 'liverpool')
			.replace(/ars/g, 'arsenal')
			.replace(/che/g, 'chelsea')
			.replace(/mci/g, 'manchester-city')
			.replace(/tot/g, 'tottenham');

		const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '/');
		return `${this.baseUrl}/matches/soccer/${formatted}-${dateStr}/`;
	}

	/**
	 * Parse OddsPortal HTML to extract odds data
	 * 
	 * @param html - HTML content
	 * @param bookie - Bookie name
	 * @param market - Market identifier
	 * @param date - Date
	 * @param url - Source URL
	 * @returns Parsed odds data
	 */
	private parseOddsPortal(
		html: string,
		bookie: string,
		market: string,
		date: Date,
		url: string
	): ScrapedOdds | null {
		try {
			// Extract odds from HTML (simplified - in production would use proper HTML parsing)
			// OddsPortal typically embeds data in JSON-LD or data attributes
			
			// Try to find JSON-LD structured data
			const jsonLdMatch = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
			if (jsonLdMatch) {
				try {
					const data = JSON.parse(jsonLdMatch[1]);
					return this.extractFromJsonLd(data, bookie, market, date, url);
				} catch {
					// Fall through to regex parsing
				}
			}

			// Fallback: Extract from HTML using regex patterns
			return this.extractFromHtml(html, bookie, market, date, url);
		} catch (error: any) {
			console.error('Parse error:', error.message);
			return null;
		}
	}

	/**
	 * Extract odds from JSON-LD structured data
	 */
	private extractFromJsonLd(
		data: any,
		bookie: string,
		market: string,
		date: Date,
		url: string
	): ScrapedOdds | null {
		// Parse JSON-LD structure (simplified)
		if (data['@type'] === 'SportsEvent') {
			const homeTeam = data.homeTeam?.name || market.split('-VS-')[0];
			const awayTeam = data.awayTeam?.name || market.split('-VS-')[1];

			// Extract odds from offers array
			const offers = data.offers || [];
			const bookieOffer = offers.find((o: any) => 
				o.seller?.name?.toLowerCase().includes(bookie.toLowerCase())
			);

			if (bookieOffer) {
				return {
					timestamp: date.getTime(),
					bookie,
					market,
					league: data.sport?.name || 'Unknown',
					home: homeTeam,
					away: awayTeam,
					homeOdds: bookieOffer.price || 0,
					drawOdds: bookieOffer.drawPrice,
					awayOdds: bookieOffer.awayPrice || 0,
					line: bookieOffer.line,
					url
				};
			}
		}

		return null;
	}

	/**
	 * Extract odds from HTML using regex patterns (fallback)
	 */
	private extractFromHtml(
		html: string,
		bookie: string,
		market: string,
		date: Date,
		url: string
	): ScrapedOdds | null {
		// Extract team names from market
		const [home, away] = market.split('-VS-');

		// Try to find odds table for the bookie
		// This is a simplified parser - production would need more robust HTML parsing
		const bookiePattern = new RegExp(`${bookie}[^>]*>([^<]+)</`, 'i');
		const oddsMatch = html.match(bookiePattern);

		if (oddsMatch) {
			// Parse odds string (format: "1.95 3.40 2.10")
			const oddsParts = oddsMatch[1].trim().split(/\s+/).map(parseFloat).filter(n => !isNaN(n));

			if (oddsParts.length >= 2) {
				return {
					timestamp: date.getTime(),
					bookie,
					market,
					league: 'Unknown',
					home: home,
					away: away,
					homeOdds: oddsParts[0] || 0,
					drawOdds: oddsParts.length > 2 ? oddsParts[1] : undefined,
					awayOdds: oddsParts[oddsParts.length - 1] || 0,
					url
				};
			}
		}

		return null;
	}

	/**
	 * Scrape multiple markets for a date range
	 * 
	 * @param bookie - Bookie name
	 * @param markets - Array of market identifiers
	 * @param startDate - Start date
	 * @param endDate - End date
	 * @returns Array of scraped odds
	 */
	async scrapeDateRange(
		bookie: string,
		markets: string[],
		startDate: Date,
		endDate: Date
	): Promise<ScrapedOdds[]> {
		const results: ScrapedOdds[] = [];
		const currentDate = new Date(startDate);

		while (currentDate <= endDate) {
			for (const market of markets) {
				const odds = await this.scrapeMarket(bookie, market, new Date(currentDate));
				if (odds) {
					results.push(odds);
				}

				// Rate limiting: wait 1 second between requests
				await Bun.sleep(1000);
			}

			currentDate.setDate(currentDate.getDate() + 1);
		}

		return results;
	}

	/**
	 * Scrape with retry logic
	 * 
	 * @param bookie - Bookie name
	 * @param market - Market identifier
	 * @param date - Date
	 * @param maxRetries - Maximum retry attempts
	 * @returns Scraped odds or null
	 */
	async scrapeWithRetry(
		bookie: string,
		market: string,
		date: Date,
		maxRetries: number = 3
	): Promise<ScrapedOdds | null> {
		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			const result = await this.scrapeMarket(bookie, market, date);

			if (result) {
				return result;
			}

			if (attempt < maxRetries) {
				// Exponential backoff
				await Bun.sleep(1000 * Math.pow(2, attempt));
			}
		}

		return null;
	}
}




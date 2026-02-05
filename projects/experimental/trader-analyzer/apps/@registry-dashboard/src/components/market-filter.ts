/**
 * Market Filter Component
 * Provides filtering by market type, sub-market, pattern, and confidence
 */

import { MARKET_FILTERS } from "@graph/types/market";

export function renderMarketFilter(): string {
	return `
    <div class="market-filter-bar" style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
      <h3 style="margin-top: 0; color: #333;">🔍 Market Filters</h3>
      
      <!-- Market Type Filter -->
      <div class="filter-group">
        <label>Market Type:</label>
        <select id="market-type-filter" onchange="applyMarketFilter()">
          <option value="">All Markets</option>
          <option value="moneyline">Moneyline</option>
          <option value="spread">Point Spread</option>
          <option value="over_under">Over/Under</option>
          <option value="props">Player Props</option>
        </select>
      </div>
      
      <!-- Sub-Market Filter -->
      <div class="filter-group">
        <label>Sub-Market:</label>
        <select id="submarket-filter" onchange="applyMarketFilter()">
          <option value="">All Sub-Markets</option>
          <optgroup label="Soccer">
            <option value="soccer:premier_league">Premier League</option>
            <option value="soccer:bundesliga">Bundesliga</option>
            <option value="soccer:la_liga">La Liga</option>
            <option value="soccer:champions_league">Champions League</option>
          </optgroup>
          <optgroup label="Basketball">
            <option value="basketball:nba">NBA</option>
            <option value="basketball:euroleague">EuroLeague</option>
          </optgroup>
        </select>
      </div>
      
      <!-- Pattern Filter -->
      <div class="filter-group">
        <label>Anomaly Pattern:</label>
        <select id="pattern-filter" onchange="applyMarketFilter()">
          <option value="">All Patterns</option>
          <option value="volume_spike">Volume Spike</option>
          <option value="odds_flip">Odds Flip</option>
          <option value="market_suspension">Market Suspension</option>
          <option value="correlation_chain">Correlation Chain</option>
          <option value="temporal_pattern">Temporal Pattern</option>
          <option value="cross_sport_anomaly">Cross-Sport Anomaly</option>
        </select>
      </div>
      
      <!-- Confidence Range -->
      <div class="filter-group">
        <label>Min Confidence: <span id="confidence-value">0.5</span></label>
        <input type="range" id="confidence-filter" min="0" max="1" step="0.1" value="0.5" oninput="updateConfidenceValue(this.value); applyMarketFilter()">
      </div>
      
      <button class="clear-filters-btn" onclick="clearMarketFilters()">Clear All</button>
      <button class="apply-filters-btn" onclick="applyMarketFilter()">Apply Filters</button>
      
      <div class="filter-results" id="filter-results-count" style="text-align: right; color: #666; margin-top: 10px;">
        All packages visible
      </div>
    </div>
  `;
}

/**
 * Apply all market filters and update UI
 */
export function applyMarketFilter() {
	const marketType = (
		document.getElementById("market-type-filter") as HTMLSelectElement
	).value;
	const subMarket = (
		document.getElementById("submarket-filter") as HTMLSelectElement
	).value;
	const pattern = (
		document.getElementById("pattern-filter") as HTMLSelectElement
	).value;
	const minConfidence = parseFloat(
		(document.getElementById("confidence-filter") as HTMLInputElement).value,
	);

	// Get all package cards
	const cards = document.querySelectorAll<HTMLElement>(".package-card");

	let visibleCount = 0;

	cards.forEach((card) => {
		const packageName = card.getAttribute("data-package");
		if (!packageName) return;

		// Check if package supports these filters
		let visible = true;

		// Check market type
		if (marketType) {
			const supportedTypes = card
				.getAttribute("data-market-types")
				?.split(",") || [];
			if (!supportedTypes.includes(marketType)) {
				visible = false;
			}
		}

		// Check sub-market
		if (subMarket && visible) {
			const supportedSubMarkets = card
				.getAttribute("data-sub-markets")
				?.split(",") || [];
			if (!supportedSubMarkets.includes(subMarket)) {
				visible = false;
			}
		}

		// Check pattern
		if (pattern && visible) {
			const supportedPatterns = card
				.getAttribute("data-patterns")
				?.split(",") || [];
			if (!supportedPatterns.includes(pattern)) {
				visible = false;
			}
		}

		// Check confidence
		if (visible) {
			const confidenceText = card.querySelector(".confidence-indicator")
				?.textContent;
			if (confidenceText) {
				const confidence = parseFloat(confidenceText.replace("%", "")) / 100;
				if (confidence < minConfidence) {
					visible = false;
				}
			}
		}

		// Show/hide based on filters
		if (visible) {
			card.classList.add("visible");
			card.classList.remove("hidden");
			visibleCount++;
		} else {
			card.classList.remove("visible");
			card.classList.add("hidden");
		}
	});

	// Update results count
	const resultsElement = document.getElementById("filter-results-count");
	if (resultsElement) {
		resultsElement.textContent = `${visibleCount} packages visible`;
	}

	// Notify Telegram topic
	const activeTeam = document
		.querySelector(".filter-tab.active")
		?.textContent?.trim();
	if (activeTeam) {
		const teamName = activeTeam.split(" ")[1]; // Extract "Sports" from "🏀 Sports"
		notifyTelegramFilterApplied(teamName, {
			marketType,
			subMarket,
			pattern,
			minConfidence,
		});
	}
}

/**
 * Update confidence value display
 */
export function updateConfidenceValue(value: string) {
	const element = document.getElementById("confidence-value");
	if (element) {
		element.textContent = value;
	}
}

/**
 * Clear all market filters
 */
export function clearMarketFilters() {
	(
		document.getElementById("market-type-filter") as HTMLSelectElement
	).value = "";
	(document.getElementById("submarket-filter") as HTMLSelectElement).value = "";
	(document.getElementById("pattern-filter") as HTMLSelectElement).value = "";
	(document.getElementById("confidence-filter") as HTMLInputElement).value = "0.5";
	updateConfidenceValue("0.5");

	// Show all packages
	document.querySelectorAll<HTMLElement>(".package-card").forEach((card) => {
		card.classList.add("visible");
		card.classList.remove("hidden");
	});

	const resultsElement = document.getElementById("filter-results-count");
	if (resultsElement) {
		resultsElement.textContent = "All packages visible";
	}
}

/**
 * Notify Telegram when filters are applied
 */
async function notifyTelegramFilterApplied(
	teamName: string,
	filters: {
		marketType?: string;
		subMarket?: string;
		pattern?: string;
		minConfidence: number;
	},
) {
	const message =
		`🔍 **Market Filters Applied**\n\n` +
		`👥 **Team:** ${teamName}\n` +
		(filters.marketType ? `📊 **Market:** ${filters.marketType}\n` : "") +
		(filters.subMarket ? `🏆 **Sub-Market:** ${filters.subMarket}\n` : "") +
		(filters.pattern ? `📈 **Pattern:** ${filters.pattern}\n` : "") +
		`🎯 **Min Confidence:** ${(filters.minConfidence * 100).toFixed(0)}%\n\n` +
		`[View in Registry](https://registry.internal.yourcompany.com/dashboard)`;

	try {
		await fetch("/api/telegram/notify", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				topic: "releases",
				message,
			}),
		});
	} catch (error) {
		console.error("Failed to notify Telegram:", error);
	}
}

// Make functions available globally
if (typeof window !== "undefined") {
	(window as any).applyMarketFilter = applyMarketFilter;
	(window as any).updateConfidenceValue = updateConfidenceValue;
	(window as any).clearMarketFilters = clearMarketFilters;
}

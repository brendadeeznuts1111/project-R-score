/**
 * @fileoverview Market Filter Component
 * @description Filter packages by market type, sub-market, pattern, and confidence
 * @module apps/registry-dashboard/src/components/market-filter
 */

import { getTopicInfo, notifyTopic } from '@graph/telegram';
import { MARKET_FILTERS } from '@graph/types/market';

/**
 * Render market filter bar HTML
 */
export function renderMarketFilter(): string {
	const filterHtml = `
    <div class="market-filter-bar" style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h3 style="margin-top: 0; color: #333;">🔍 Market Filters</h3>
      
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 15px;">
        <!-- Market Type Filter -->
        <div class="filter-group">
          <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #333;">Market Type:</label>
          <select id="market-type-filter" onchange="applyMarketFilter()" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 6px;">
            <option value="">All Markets</option>
            <option value="moneyline">Moneyline</option>
            <option value="spread">Point Spread</option>
            <option value="over_under">Over/Under</option>
            <option value="props">Player Props</option>
          </select>
        </div>
        
        <!-- Sub-Market Filter -->
        <div class="filter-group">
          <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #333;">Sub-Market:</label>
          <select id="submarket-filter" onchange="applyMarketFilter()" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 6px;">
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
          <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #333;">Anomaly Pattern:</label>
          <select id="pattern-filter" onchange="applyMarketFilter()" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 6px;">
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
          <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #333;">
            Min Confidence: <span id="confidence-value" style="color: #007bff;">0.5</span>
          </label>
          <input 
            type="range" 
            id="confidence-filter" 
            min="0" 
            max="1" 
            step="0.1" 
            value="0.5" 
            oninput="updateConfidenceValue(this.value); applyMarketFilter()"
            style="width: 100%;"
          />
        </div>
      </div>
      
      <div style="display: flex; gap: 10px; margin-top: 15px;">
        <button class="clear-filters-btn" onclick="clearMarketFilters()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer;">
          Clear All
        </button>
        <button class="apply-filters-btn" onclick="applyMarketFilter()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 6px; cursor: pointer;">
          Apply Filters
        </button>
        <span id="filter-results-count" style="margin-left: auto; padding: 10px; color: #666; align-self: center;"></span>
      </div>
    </div>
  `;

	return filterHtml;
}

/**
 * Apply all market filters and update UI
 */
export function applyMarketFilter(): void {
	if (typeof window === 'undefined') return;

	const marketType = (document.getElementById('market-type-filter') as HTMLSelectElement)?.value || '';
	const subMarket = (document.getElementById('submarket-filter') as HTMLSelectElement)?.value || '';
	const pattern = (document.getElementById('pattern-filter') as HTMLSelectElement)?.value || '';
	const minConfidence = parseFloat(
		(document.getElementById('confidence-filter') as HTMLInputElement)?.value || '0.5'
	);

	// Get all package cards
	const cards = document.querySelectorAll<HTMLElement>('.package-card');

	let visibleCount = 0;

	cards.forEach((card) => {
		const packageName = card.getAttribute('data-package');
		if (!packageName) return;

		// Check if package supports these filters
		let supportsMarket = true;
		let supportsSubMarket = true;
		let supportsPattern = true;

		if (marketType) {
			const marketConfig = MARKET_FILTERS.types[marketType as keyof typeof MARKET_FILTERS.types];
			supportsMarket = marketConfig?.packages.includes(packageName) || false;
		}

		if (subMarket) {
			const [sport, league] = subMarket.split(':');
			const sportMarkets = MARKET_FILTERS.subMarkets[sport as keyof typeof MARKET_FILTERS.subMarkets];
			if (sportMarkets) {
				const leagueConfig = sportMarkets[league as keyof typeof sportMarkets];
				supportsSubMarket = leagueConfig?.packages.includes(packageName) || false;
			} else {
				supportsSubMarket = false;
			}
		}

		if (pattern) {
			const patternConfig = MARKET_FILTERS.patterns[pattern as keyof typeof MARKET_FILTERS.patterns];
			supportsPattern = patternConfig?.packages.includes(packageName) || false;
		}

		// Show/hide based on filters
		if (supportsMarket && supportsSubMarket && supportsPattern) {
			card.style.display = 'block';
			card.style.opacity = '1';
			visibleCount++;
		} else {
			card.style.display = 'none';
			card.style.opacity = '0';
		}

		// Update confidence indicator if exists
		const confidenceBadge = card.querySelector('.confidence-indicator');
		if (confidenceBadge) {
			confidenceBadge.textContent = `${(minConfidence * 100).toFixed(0)}%`;
			const badge = confidenceBadge as HTMLElement;
			badge.style.background =
				minConfidence > 0.7 ? '#28a745' : minConfidence > 0.5 ? '#ffc107' : '#dc3545';
		}
	});

	// Update results count
	const resultsCountEl = document.getElementById('filter-results-count');
	if (resultsCountEl) {
		const totalCount = cards.length;
		resultsCountEl.textContent = `${visibleCount} of ${totalCount} packages visible`;
	}

	// Notify Telegram topic (optional, async)
	const activeTeam = document.querySelector('.filter-tab.active')?.textContent?.trim();
	if (activeTeam) {
		const teamName = activeTeam.split(' ').slice(1).join(' '); // Extract team name
		notifyTelegramFilterApplied(teamName, { marketType, subMarket, pattern, minConfidence }).catch(
			console.error
		);
	}
}

/**
 * Update confidence value display
 */
export function updateConfidenceValue(value: string): void {
	if (typeof window === 'undefined') return;
	const confidenceValueEl = document.getElementById('confidence-value');
	if (confidenceValueEl) {
		confidenceValueEl.textContent = value;
	}
}

/**
 * Clear all market filters
 */
export function clearMarketFilters(): void {
	if (typeof window === 'undefined') return;

	const marketTypeEl = document.getElementById('market-type-filter') as HTMLSelectElement;
	const subMarketEl = document.getElementById('submarket-filter') as HTMLSelectElement;
	const patternEl = document.getElementById('pattern-filter') as HTMLSelectElement;
	const confidenceEl = document.getElementById('confidence-filter') as HTMLInputElement;

	if (marketTypeEl) marketTypeEl.value = '';
	if (subMarketEl) subMarketEl.value = '';
	if (patternEl) patternEl.value = '';
	if (confidenceEl) {
		confidenceEl.value = '0.5';
		updateConfidenceValue('0.5');
	}

	// Show all packages
	document.querySelectorAll<HTMLElement>('.package-card').forEach((card) => {
		card.style.display = 'block';
		card.style.opacity = '1';
	});

	const resultsCountEl = document.getElementById('filter-results-count');
	if (resultsCountEl) {
		const totalCount = document.querySelectorAll('.package-card').length;
		resultsCountEl.textContent = `${totalCount} packages visible`;
	}
}

/**
 * Notify Telegram when filters are applied
 */
async function notifyTelegramFilterApplied(
	teamName: string,
	filters: { marketType?: string; subMarket?: string; pattern?: string; minConfidence: number }
): Promise<void> {
	try {
		const message =
			`🔍 **Market Filters Applied**\n\n` +
			`👥 **Team:** ${teamName}\n` +
			(filters.marketType ? `📊 **Market:** ${filters.marketType}\n` : '') +
			(filters.subMarket ? `🏆 **Sub-Market:** ${filters.subMarket}\n` : '') +
			(filters.pattern ? `📈 **Pattern:** ${filters.pattern}\n` : '') +
			`🎯 **Min Confidence:** ${(filters.minConfidence * 100).toFixed(0)}%\n\n` +
			`[View in Registry](https://registry.internal.yourcompany.com/packages)`;

		// Use releases topic for filter notifications
		const topicInfo = getTopicInfo('releases' as any);
		if (topicInfo?.topicId) {
			await notifyTopic(topicInfo.topicId, message);
		}
	} catch (error) {
		console.error('Failed to notify Telegram:', error);
	}
}

/**
 * Initialize market filter component
 */
export function initMarketFilter(): void {
	if (typeof window === 'undefined') return;

	// Make functions available globally for onclick handlers
	(window as any).applyMarketFilter = applyMarketFilter;
	(window as any).updateConfidenceValue = updateConfidenceValue;
	(window as any).clearMarketFilters = clearMarketFilters;

	// Initialize filter results count
	const resultsCountEl = document.getElementById('filter-results-count');
	if (resultsCountEl) {
		const totalCount = document.querySelectorAll('.package-card').length;
		resultsCountEl.textContent = `${totalCount} packages visible`;
	}
}

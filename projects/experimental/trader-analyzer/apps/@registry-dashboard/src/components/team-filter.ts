/**
 * @fileoverview Team Filter Component for Registry Dashboard
 * @description Filter packages by team with Telegram integration
 * @module apps/registry-dashboard/src/components/team-filter
 */

// Telegram supergroup ID - import from @graph/telegram/topics when available
// For browser context, this will be provided via window or inline script
const getTelegramSupergroupId = (): number => {
	if (typeof window !== 'undefined' && (window as any).TELEGRAM_SUPERGROUP_ID) {
		return (window as any).TELEGRAM_SUPERGROUP_ID;
	}
	// Default fallback
	return -1001234567890;
};

// Team data mapping with Telegram topics
const TEAM_DATA = {
	'sports-correlation': {
		name: 'Sports Correlation',
		emoji: '🏀',
		packages: ['@graph/layer4', '@graph/layer3'],
		teamLead: 'alex.chen@yourcompany.com',
		telegramTopicId: 1,
		color: '#667eea',
	},
	'market-analytics': {
		name: 'Market Analytics',
		emoji: '📊',
		packages: ['@graph/layer2', '@graph/layer1'],
		teamLead: 'sarah.kumar@yourcompany.com',
		telegramTopicId: 3,
		color: '#f093fb',
	},
	'platform-tools': {
		name: 'Platform & Tools',
		emoji: '🔧',
		packages: [
			'@graph/algorithms',
			'@graph/storage',
			'@graph/streaming',
			'@graph/utils',
			'@bench/*',
		],
		teamLead: 'mike.rodriguez@yourcompany.com',
		telegramTopicId: 5,
		color: '#4facfe',
	},
} as const;

type TeamKey = keyof typeof TEAM_DATA;

/**
 * Filter team packages and render UI
 */
export function filterTeam(team: TeamKey | 'all'): void {
	if (team === 'all') {
		// Show all packages
		const teamPackages = document.querySelectorAll('.package-card');
		teamPackages.forEach((card) => {
			(card as HTMLElement).style.display = 'block';
		});

		// Update active filter button
		document.querySelectorAll('.filter-tab').forEach((btn) => {
			btn.classList.remove('active');
		});
		document.querySelector(`[data-team="all"]`)?.classList.add('active');

		// Clear team info panel
		const panel = document.getElementById('team-info-panel');
		if (panel) {
			panel.innerHTML = '';
		}

		return;
	}

	const teamInfo = TEAM_DATA[team];
	if (!teamInfo) {
		console.error(`Unknown team: ${team}`);
		return;
	}

	// Filter packages
	const teamPackages = document.querySelectorAll('.package-card');
	teamPackages.forEach((card) => {
		const packageName = card.getAttribute('data-package');
		if (
			packageName &&
			teamInfo.packages.some((p) => {
				// Handle wildcard packages like @bench/*
				if (p.endsWith('/*')) {
					const prefix = p.slice(0, -2);
					return packageName.startsWith(prefix);
				}
				return packageName.startsWith(p);
			})
		) {
			(card as HTMLElement).style.display = 'block';
		} else {
			(card as HTMLElement).style.display = 'none';
		}
	});

	// Update active filter button
	document.querySelectorAll('.filter-tab').forEach((btn) => {
		btn.classList.remove('active');
	});
	const activeBtn = document.querySelector(`[data-team="${team}"]`);
	if (activeBtn) {
		activeBtn.classList.add('active');
	}

	// Update team info panel
	updateTeamInfoPanel(teamInfo);

	// Notify Telegram (optional: log filter action)
	console.log(`Filtered to ${teamInfo.name} team`);
}

/**
 * Update team info panel
 */
function updateTeamInfoPanel(teamInfo: (typeof TEAM_DATA)[TeamKey]): void {
	const panel = document.getElementById('team-info-panel');
	if (!panel) return;

	const telegramUrl = `https://t.me/c/${Math.abs(getTelegramSupergroupId())}/${teamInfo.telegramTopicId}`;
	const firstPackage = teamInfo.packages[0];

	panel.innerHTML = `
    <div class="team-header" style="background: ${teamInfo.color}; color: white; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
      <h2>${teamInfo.emoji} ${teamInfo.name}</h2>
      <p><strong>Team Lead:</strong> ${teamInfo.teamLead}</p>
      <p><strong>Packages:</strong> ${teamInfo.packages.length}</p>
    </div>
    
    <div class="team-actions" style="display: flex; flex-direction: column; gap: 10px;">
      <a href="${telegramUrl}" 
         target="_blank" 
         class="telegram-btn"
         style="background: #0088cc; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; text-align: center; display: inline-block;">
        💬 Open Telegram Topic
      </a>
      
      <button class="benchmark-btn" onclick="runTeamBenchmark('${firstPackage}')"
              style="background: #28a745; color: white; padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;">
        🏃 Run Team Benchmark
      </button>
      
      <button class="rfc-btn" onclick="createRFC('${firstPackage}')"
              style="background: #6c757d; color: white; padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;">
        📝 Submit Team RFC
      </button>
    </div>
  `;
}

/**
 * Run benchmark for first package in team
 */
export async function runTeamBenchmark(packageName: string): Promise<void> {
	try {
		const response = await fetch('/api/benchmark/run', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ package: packageName }),
		});

		const result = await response.json();

		if (result.success) {
			alert(`✅ Benchmark started for ${packageName}!\nJob ID: ${result.jobId}`);
		} else {
			alert(`❌ Benchmark failed: ${result.error || 'Unknown error'}`);
		}
	} catch (error) {
		console.error('Benchmark error:', error);
		alert(`❌ Benchmark failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
}

/**
 * Create RFC for package
 */
export function createRFC(packageName: string): void {
	if (typeof window === 'undefined') {
		console.warn('createRFC called outside browser context');
		return;
	}
	
	// Use relative URL for same-origin
	const url = `/rfcs/new?package=${encodeURIComponent(packageName)}`;
	window.open(url, '_blank');
}

/**
 * Initialize team filter component
 */
export function initTeamFilter(): void {
	// Make functions available globally for onclick handlers
	(window as any).filterTeam = filterTeam;
	(window as any).runTeamBenchmark = runTeamBenchmark;
	(window as any).createRFC = createRFC;

	// Set default to 'all'
	filterTeam('all');
}

// Export team data for use in other components
export { TEAM_DATA };
export type { TeamKey };


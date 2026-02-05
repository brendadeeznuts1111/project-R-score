/**
 * @fileoverview Dashboard Client Entry Point
 * @description Main dashboard client application
 * @module apps/dashboard/src/client
 */

import { DashboardClient } from './dashboard-client';

/**
 * Initialize dashboard client when DOM is ready
 */
function initDashboard(): void {
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', () => {
			const client = new DashboardClient();
			client.init();
		});
	} else {
		const client = new DashboardClient();
		client.init();
	}
}

// Start dashboard
initDashboard();

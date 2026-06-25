/**
 * @dynamic-spy/kit v5.0 - API Endpoints
 * 
 * Complete endpoint definitions
 */

export const ENDPOINTS = {
	DASHBOARD: '/dashboard',
	TICKS: '/ticks/:market/:bookie',
	BACKWORK: '/backwork',
	BACKFILL: '/backfill/:months/:bookie',
	MODELS: '/models',
	DEPLOY_MODEL: '/deploy-model',
	R2_STATS: '/r2-stats',
	HEALTH: '/health'
} as const;

export interface EndpointResponse<T = any> {
	data?: T;
	error?: string;
	status: number;
}




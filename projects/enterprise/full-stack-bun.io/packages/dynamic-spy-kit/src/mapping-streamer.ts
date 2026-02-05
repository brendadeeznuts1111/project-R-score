/**
 * @dynamic-spy/kit v3.2 - Mapping Streamer
 * 
 * Stream mappings from private registry
 */

import { spawnSync } from "bun";
import { MappingEngine, SportsMappingData } from "./mapping-engine";

export class MappingStreamer {
	private registryUrl: string;
	private token: string;

	constructor(registryUrl: string = 'https://registry.yourarb.com', token?: string) {
		this.registryUrl = registryUrl;
		this.token = token || process.env.BUN_REGISTRY_TOKEN || '';
	}

	/**
	 * Stream mapping data from private registry
	 */
	async streamFromPrivateRegistry(sport: string = 'ALL'): Promise<SportsMappingData> {
		try {
			// Try to fetch from private registry
			const response = await fetch(`${this.registryUrl}/@yourorg/sports-data/${sport}`, {
				headers: {
					'Authorization': `Bearer ${this.token}`,
					'Accept': 'application/json'
				}
			});

			if (response.ok) {
				return await response.json();
			}
		} catch (error) {
			console.warn('Private registry unavailable, using fallback');
		}

		// Fallback: Use Bun.spawn to call CLI tool
		return this.streamFromCLI(sport);
	}

	/**
	 * Stream from CLI tool (@yourorg/sports-data)
	 */
	private async streamFromCLI(sport: string): Promise<SportsMappingData> {
		try {
			const result = spawnSync({
				cmd: ['bunx', '@yourorg/sports-data', 'dump', '--sport', sport],
				stdout: 'pipe',
				stderr: 'pipe'
			});

			if (result.success && result.stdout) {
				const output = new TextDecoder().decode(result.stdout);
				return JSON.parse(output);
			}
		} catch (error) {
			console.warn('CLI tool unavailable, using bundled data');
		}

		// Final fallback: Use bundled mapping
		const mappingEngine = new MappingEngine();
		return {
			...mappingEngine.getStats(),
			FOOTBALL: mappingEngine.getSport('FOOTBALL')!,
			BASKETBALL: mappingEngine.getSport('BASKETBALL')!,
			BASEBALL: mappingEngine.getSport('BASEBALL')!
		} as SportsMappingData;
	}

	/**
	 * Sync all mappings from private registry
	 */
	async syncAll(): Promise<SportsMappingData> {
		return this.streamFromPrivateRegistry('ALL');
	}

	/**
	 * Sync specific sport
	 */
	async syncSport(sport: string): Promise<SportsMappingData> {
		return this.streamFromPrivateRegistry(sport);
	}
}




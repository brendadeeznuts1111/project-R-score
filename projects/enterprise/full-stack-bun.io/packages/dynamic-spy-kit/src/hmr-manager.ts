/**
 * @dynamic-spy/kit v7.0 - HMR Manager
 * 
 * Hot Module Replacement for dynamic pattern updates
 */

export class HMRManager {
	private updateCallbacks: Set<() => void> = new Set();
	private lastUpdate: Date = new Date();
	private updateCount: number = 0;

	/**
	 * Register HMR callback
	 */
	onUpdate(callback: () => void): () => void {
		this.updateCallbacks.add(callback);
		return () => this.updateCallbacks.delete(callback);
	}

	/**
	 * Trigger HMR update
	 */
	triggerUpdate(region?: string): void {
		this.lastUpdate = new Date();
		this.updateCount++;
		
		console.log(`HMR triggered${region ? ` for region: ${region}` : ''}`);
		
		this.updateCallbacks.forEach(callback => {
			try {
				callback();
			} catch (e) {
				console.error('HMR callback error:', e);
			}
		});
	}

	/**
	 * Get HMR status
	 */
	getStatus(): {
		lastUpdate: string;
		updateCount: number;
		activeCallbacks: number;
		hmrTriggered: boolean;
	} {
		return {
			lastUpdate: this.lastUpdate.toISOString(),
			updateCount: this.updateCount,
			activeCallbacks: this.updateCallbacks.size,
			hmrTriggered: this.updateCount > 0
		};
	}
}




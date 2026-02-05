/**
 * @fileoverview CPU-Intensive Worker Example
 * @description Worker script for CPU-intensive computations
 * @module workers/examples/cpu-worker
 */

self.onmessage = (event: MessageEvent) => {
	const { id, data } = event.data;

	try {
		// CPU-intensive computation
		const numbers = Array.isArray(data) ? data : [data];
		const result = numbers.map((x: number) => {
			let sum = 0;
			for (let i = 0; i < 10000; i++) {
				sum += Math.sqrt(x * i) * Math.sin(x);
			}
			return sum;
		});

		self.postMessage({ id, type: 'success', result });
	} catch (error) {
		self.postMessage({ 
			id, 
			type: 'error', 
			error: error instanceof Error ? error.message : String(error) 
		});
	}
};

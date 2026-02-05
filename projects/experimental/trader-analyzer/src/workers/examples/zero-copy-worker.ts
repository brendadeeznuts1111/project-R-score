/**
 * @fileoverview Zero-Copy Worker Example
 * @description Worker script for processing ArrayBuffers with zero-copy
 * @module workers/examples/zero-copy-worker
 */

self.onmessage = async (event: MessageEvent) => {
	const { id, buffer, type, length } = event.data;

	try {
		if (type === 'processBuffer') {
			// Process ArrayBuffer without copying
			const view = new Float64Array(buffer);
			for (let i = 0; i < view.length; i++) {
				view[i] = Math.sqrt(view[i]);
			}
			
			// Transfer back (still zero-copy)
			self.postMessage({ id, result: buffer }, [buffer]);
		}
		
		if (type === 'processShared') {
			// Process SharedArrayBuffer
			const view = new Float64Array(buffer);
			for (let i = 0; i < length; i++) {
				// Use Atomics for thread-safe operations
				const value = Atomics.YAML.parse(view, i);
				Atomics.store(view, i, Math.sqrt(value));
			}
			
			self.postMessage({ id, type: 'sharedDone' });
		}

		if (type === 'batchProcess') {
			// Process batch of buffers
			const view = new Float64Array(buffer);
			for (let i = 0; i < view.length; i++) {
				view[i] = view[i] * 2;
			}
			
			self.postMessage({ id, result: buffer }, [buffer]);
		}
	} catch (error) {
		self.postMessage({ 
			id, 
			error: error instanceof Error ? error.message : String(error) 
		});
	}
};

/**
 * @fileoverview Zero-Copy Worker Utilities
 * @description Optimized data transfer using transferable objects
 * @module workers/zero-copy
 */

export interface BufferMessage {
	id: number;
	buffer: ArrayBuffer;
	type: 'processBuffer' | 'processShared' | 'batchProcess';
	length?: number;
}

export interface BufferResponse {
	id: number;
	result?: ArrayBuffer;
	error?: string;
	type?: 'sharedDone';
}

/**
 * Zero-Copy Worker
 * 
 * Optimizes data transfer by using transferable objects (ArrayBuffer)
 * which transfer ownership without copying data.
 */
export class ZeroCopyWorker {
	private worker: Worker;
	private transferableBuffers = new WeakMap<ArrayBuffer, number>();

	constructor(script: string) {
		this.worker = new Worker(script);
	}

	/**
	 * Transfer ArrayBuffer ownership (zero-copy)
	 */
	transferBuffer(buffer: ArrayBuffer): Promise<ArrayBuffer> {
		return new Promise((resolve, reject) => {
			const id = Math.random();
			this.transferableBuffers.set(buffer, id);

			const messageHandler = (event: MessageEvent<BufferResponse>) => {
				if (event.data.id === id) {
					this.worker.removeEventListener('message', messageHandler);
					this.transferableBuffers.delete(buffer);
					
					if (event.data.error) {
						reject(new Error(event.data.error));
					} else {
						resolve(event.data.result!);
					}
				}
			};

			this.worker.addEventListener('message', messageHandler);
			
			// Second parameter transfers ownership of buffer (zero-copy)
			this.worker.postMessage(
				{ id, buffer, type: 'processBuffer' } as BufferMessage,
				[buffer]
			);
		});
	}

	/**
	 * Process large data with SharedArrayBuffer
	 * 
	 * Note: SharedArrayBuffer requires proper CORS headers and
	 * SharedArrayBuffer support in the runtime.
	 */
	async processLargeData(data: Float64Array): Promise<Float64Array> {
		// Create shared buffer for zero-copy between threads
		const sharedBuffer = new SharedArrayBuffer(data.byteLength);
		const sharedArray = new Float64Array(sharedBuffer);
		sharedArray.set(data);

		// Process in worker without copying
		await new Promise<void>((resolve) => {
			const messageHandler = (event: MessageEvent<BufferResponse>) => {
				if (event.data.type === 'sharedDone') {
					this.worker.removeEventListener('message', messageHandler);
					resolve();
				}
			};
			
			this.worker.addEventListener('message', messageHandler);
			this.worker.postMessage({
				type: 'processShared',
				buffer: sharedBuffer,
				length: data.length
			} as BufferMessage);
		});

		// Result is already in sharedArray
		return sharedArray;
	}

	/**
	 * Batch transfer for multiple buffers
	 */
	async transferMultiple(buffers: ArrayBuffer[]): Promise<ArrayBuffer[]> {
		const transfers = buffers.map(buffer => ({
			buffer,
			id: Math.random()
		}));

		const promises = transfers.map(({ buffer, id }) => 
			new Promise<ArrayBuffer>((resolve) => {
				this.worker.postMessage({ id, buffer, type: 'batchProcess' } as BufferMessage, [buffer]);
				
				const messageHandler = (event: MessageEvent<BufferResponse>) => {
					if (event.data.id === id) {
						this.worker.removeEventListener('message', messageHandler);
						resolve(event.data.result!);
					}
				};
				
				this.worker.addEventListener('message', messageHandler);
			})
		);

		return Promise.all(promises);
	}

	terminate() {
		this.worker.terminate();
	}
}

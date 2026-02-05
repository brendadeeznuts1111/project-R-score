/**
 * @fileoverview Event-Based Worker Example
 * @description Worker script for event-based communication
 * @module workers/examples/event-worker
 */

self.onmessage = async (event: MessageEvent) => {
	const { type, event, data } = event.data;

	if (type === 'event') {
		switch (event) {
			case 'startProcessing':
				await processFile(data.file);
				break;
			case 'calculate':
				const result = calculate(data);
				self.postMessage({
					type: 'event',
					event: `${event}:response`,
					data: { ...data, result }
				});
				break;
			default:
				console.log(`Unknown event: ${event}`);
		}
	}
};

async function processFile(file: string) {
	// Simulate file processing with progress updates
	for (let i = 0; i <= 100; i += 10) {
		await Bun.sleep(100);
		self.postMessage({
			type: 'event',
			event: 'progress',
			data: i
		});
	}

	self.postMessage({
		type: 'event',
		event: 'completed',
		data: { file, status: 'done' }
	});
}

function calculate(data: { numbers: number[]; requestId?: string }) {
	const sum = data.numbers.reduce((a, b) => a + b, 0);
	return { requestId: data.requestId, result: sum };
}

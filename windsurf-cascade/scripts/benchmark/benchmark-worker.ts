#!/usr/bin/env bun
// scripts/benchmark-worker.ts - Worker for postMessage benchmarks

(self as any).onmessage = (event: MessageEvent) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'small-string':
      // Echo back the small string
      (self as any).postMessage({ type: 'echo', data });
      break;
      
    case 'large-json':
      // Process the large JSON and echo back
      const processed = {
        count: data.ticks.length,
        sample: data.ticks[0],
        processed: true
      };
      (self as any).postMessage({ type: 'echo', data: processed });
      break;
      
    default:
      (self as any).postMessage({ type: 'error', data: 'Unknown message type' });
  }
};

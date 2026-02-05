import { afterEach } from 'bun:test';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Add global test configuration
afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

// Mocking some common APIs
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock fetch globally
const mockFetch = (data: any) => {
    return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(data)
    });
};

global.fetch = mockFetch as any;

// Mock WebSocket
class MockWebSocket {
    onopen = null;
    onmessage = null;
    onclose = null;
    onerror = null;
    constructor(url: string) {}
    send(data: string) {}
    close() {}
}

global.WebSocket = MockWebSocket as any;

import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { startServer } from '../barber-server';

const PORT = 3123;
let server: { stop: () => void } | null = null;

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Integration smoke: HTTP + WS upgrade

describe('barber-server integration', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'development';
    process.env.MANAGER_KEY = 'secret';
    server = await startServer({ port: PORT });
    await wait(50);
  });

  afterAll(() => {
    server?.stop();
    server = null;
  });

  test('telemetry endpoint responds', async () => {
    const res = await fetch(`http://localhost:${PORT}/telemetry`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('requests');
  });

  test('ws upgrade responds', async () => {
    const ws = new WebSocket(`ws://localhost:${PORT}/ws/dashboard`);
    const opened = await new Promise<boolean>(resolve => {
      ws.onopen = () => resolve(true);
      ws.onerror = () => resolve(false);
    });
    expect(opened).toBe(true);
    ws.close();
  });
});

import { describe, expect, test } from 'bun:test';
import { startServer } from '../barber-server';

const PORT = 3123;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Integration smoke: HTTP + WS upgrade

describe('barber-server integration', () => {
  test('telemetry endpoint responds', async () => {
    process.env.PORT = String(PORT);
    process.env.NODE_ENV = 'development';
    process.env.MANAGER_KEY = 'secret';

    await startServer();
    await wait(50);

    const res = await fetch(`http://localhost:${PORT}/telemetry`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('requests');
  });

  test('ws upgrade responds', async () => {
    const ws = new WebSocket(`ws://localhost:${PORT}/ws/dashboard`);
    const opened = await new Promise<boolean>((resolve) => {
      ws.onopen = () => resolve(true);
      ws.onerror = () => resolve(false);
    });
    expect(opened).toBe(true);
    ws.close();
  });
});

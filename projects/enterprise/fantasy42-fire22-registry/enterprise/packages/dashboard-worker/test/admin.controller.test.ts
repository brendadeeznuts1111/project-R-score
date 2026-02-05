// dashboard-worker/test/admin.controller.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { join } from 'path';
import { spawn } from 'child_process';

const SERVER_PATH = join(import.meta.dir, '..', 'serve-dashboard.ts');
const PORT = 8787; // Use the same port as integration tests
const BASE_URL = `http://localhost:${PORT}`;

let serverProcess: any;

describe('Admin Controller Integration Tests', () => {
  beforeAll(async () => {
    // Kill any process currently listening on the port
    try {
      await new Promise<void>((resolve, reject) => {
        const killProcess = Bun.spawn(['sh', '-c', `lsof -ti tcp:${PORT} | xargs kill`], {
          onExit: (proc, exitCode, signalCode, error) => {
            if (error) {
              console.error(`Error killing process on port ${PORT}:`, error);
            }
            resolve();
          },
          stderr: 'inherit',
          stdout: 'inherit',
        });
      });
      console.log(`Cleaned up any existing process on port ${PORT}`);
    } catch (error) {
      console.error(`Failed to clean up port ${PORT}:`, error);
    }

    // Start the server
    serverProcess = Bun.spawn(['bun', SERVER_PATH], {
      stdio: ['inherit', 'inherit', 'inherit'], // Inherit stdio to see server logs
    });

    // Wait for the server to start
    await new Promise<void>(resolve => {
      serverProcess.stdout?.on('data', (data: Buffer) => {
        if (data.toString().includes(`Dashboard server running at ${BASE_URL}`)) {
          resolve();
        }
      });
      serverProcess.stderr?.on('data', (data: Buffer) => {
        console.error(`Server stderr: ${data.toString()}`);
      });
    });
  }, 20000); // Increase timeout for server startup

  afterAll(() => {
    // Kill the server process
    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill('SIGTERM'); // Send SIGTERM to gracefully terminate
    }
  });

  it('should successfully bulk settle wagers with placeholder logic', async () => {
    const wagersToSettle = [
      { wagerId: 'wager123', result: 'win' },
      { wagerId: 'wager456', result: 'loss' },
    ];

    const response = await fetch(`${BASE_URL}/admin/bulk-settle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ wagers: wagersToSettle }),
    });

    const responseBody = await response.json();

    expect(response.status).toBe(200);
    expect(responseBody.success).toBeTrue();
    expect(responseBody.settled).toBe(wagersToSettle.length);
    expect(responseBody.message).toContain('Successfully processed');
    expect(responseBody.details).toEqual(wagersToSettle.map(w => w.wagerId));
  });
});

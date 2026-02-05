// dashboard-worker/test/e2e-integration.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { spawn, exec } from 'child_process';
import { join } from 'path';

const SERVER_PATH = join(import.meta.dir, '..', 'serve-dashboard.ts');
const PORT = 8787;
const BASE_URL = `http://localhost:${PORT}`;

let serverProcess: ReturnType<typeof spawn>;

describe('End-to-End Integration Tests', () => {
  beforeAll(async () => {
    // Kill any process currently listening on the port
    try {
      await new Promise<void>((resolve, reject) => {
        exec(`lsof -ti tcp:${PORT} | xargs kill`, (error, stdout, stderr) => {
          if (error) {
            // If no process is found, lsof returns an error, which is fine.
            // Only reject if there's a real issue killing a process.
            if (!stderr.includes('No such process')) {
              console.error(`Error killing process on port ${PORT}: ${stderr}`);
              // reject(error); // Don't reject, just log and continue
            }
          }
          resolve();
        });
      });
      console.log(`Cleaned up any existing process on port ${PORT}`);
    } catch (error) {
      console.error(`Failed to clean up port ${PORT}:`, error);
    }

    // Start the server
    serverProcess = spawn('bun', [SERVER_PATH], {
      stdio: 'inherit', // Inherit stdio to see server logs
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
      // Optionally, wait for the process to exit
      // await new Promise(resolve => serverProcess.on('exit', resolve));
    }
  });

  it('should return a healthy status from /api/health', async () => {
    const response = await fetch(`${BASE_URL}/api/health`);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.status).toBe('healthy');
    expect(data.server).toBe('Fire22 Dashboard Server');
  });

  let createdWagerNumber: number;

  it('should create a new wager via POST /api/wager/create', async () => {
    const sampleWagerRequest = {
      customerId: 'customer123',
      agentId: 'agent456',
      eventId: 'event789',
      betTypeId: 'betType101',
      selections: [
        { selectionId: 'sel001', odds: 150, line: -5.5 },
        { selectionId: 'sel002', odds: -110 },
      ],
      amountWagered: 100,
      betType: 'straight',
    };

    const response = await fetch(`${BASE_URL}/api/wager/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sampleWagerRequest),
    });

    expect(response.status).toBe(201);
    const newWager = await response.json();
    expect(newWager).toHaveProperty('wagerNumber');
    expect(newWager.customerId).toBe('customer123');
    createdWagerNumber = newWager.wagerNumber;
  });

  it('should retrieve a wager by number via GET /api/wager/get/:wagerNumber', async () => {
    expect(createdWagerNumber).toBeDefined(); // Ensure wager was created in previous test

    const response = await fetch(`${BASE_URL}/api/wager/get/${createdWagerNumber}`);
    expect(response.status).toBe(200);
    const retrievedWager = await response.json();
    expect(retrievedWager.wagerNumber).toBe(createdWagerNumber);
    expect(retrievedWager.customerId).toBe('customer123');
  });

  it('should return 404 for a non-existent wager', async () => {
    const nonExistentWagerNumber = 999999999;
    const response = await fetch(`${BASE_URL}/api/wager/get/${nonExistentWagerNumber}`);
    expect(response.status).toBe(404);
  });

  it('should return 405 for unsupported method on /api/wager/create', async () => {
    const response = await fetch(`${BASE_URL}/api/wager/create`, {
      method: 'GET', // Using GET instead of POST
    });
    expect(response.status).toBe(405);
  });

  it('should settle a wager via POST /api/wager/settle', async () => {
    expect(createdWagerNumber).toBeDefined();

    const settlementRequest = {
      wagerNumber: createdWagerNumber,
      settlementType: 'win',
      settlementAmount: 150, // Example amount
      settledBy: 'test_user',
    };

    const response = await fetch(`${BASE_URL}/api/wager/settle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settlementRequest),
    });

    expect(response.status).toBe(200);
    const settlementResult = await response.json();
    expect(settlementResult).toHaveProperty('success', true);
    expect(settlementResult.wagerNumber).toBe(createdWagerNumber);

    // Verify wager status changed
    const getResponse = await fetch(`${BASE_URL}/api/wager/get/${createdWagerNumber}`);
    const retrievedWager = await getResponse.json();
    expect(retrievedWager.status).toBe('settled');
    expect(retrievedWager.result).toBe('win');
  });

  it('should return 404 for settling a non-existent wager', async () => {
    const nonExistentWagerNumber = 999999998;
    const settlementRequest = {
      wagerNumber: nonExistentWagerNumber,
      settlementType: 'win',
      settlementAmount: 100,
      settledBy: 'test_user',
    };

    const response = await fetch(`${BASE_URL}/api/wager/settle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settlementRequest),
    });
    expect(response.status).toBe(404); // Wager not found error
  });

  it('should return 405 for unsupported method on /api/wager/settle', async () => {
    const response = await fetch(`${BASE_URL}/api/wager/settle`, {
      method: 'GET', // Using GET instead of POST
    });
    expect(response.status).toBe(405);
  });

  it('should validate an existing wager via GET /api/wager/validate/:wagerNumber', async () => {
    expect(createdWagerNumber).toBeDefined();

    const response = await fetch(`${BASE_URL}/api/wager/validate/${createdWagerNumber}`);
    expect(response.status).toBe(200);
    const validationResult = await response.json();
    expect(validationResult).toHaveProperty('isValid', true);
    expect(validationResult.wagerNumber).toBe(createdWagerNumber);
    expect(validationResult).toHaveProperty('status');
  });

  it('should return 404 for validating a non-existent wager', async () => {
    const nonExistentWagerNumber = 999999997;
    const response = await fetch(`${BASE_URL}/api/wager/validate/${nonExistentWagerNumber}`);
    expect(response.status).toBe(404);
  });

  it('should return 405 for unsupported method on /api/wager/validate', async () => {
    const response = await fetch(`${BASE_URL}/api/wager/validate/${createdWagerNumber}`, {
      method: 'POST', // Using POST instead of GET
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(response.status).toBe(405);
  });
});

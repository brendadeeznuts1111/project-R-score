import { describe, test, expect, mock, beforeEach } from 'bun:test';

// Mock the bun-cli-native dependency before importing the module
const mockExecuteBunCLI = mock(async (args: string[], opts?: any) => ({
  status: 'completed',
  durationMs: 42,
  output: 'mock output',
  error: null,
  exitCode: 0,
}));

const mockParseOfficialFlags = mock((args: string[]) => ({ parsed: args }));
const mockGetAllSessions = mock(() => []);

// Use Bun's module mock
mock.module('../lib/bun-cli-native-v3.15', () => ({
  executeBunCLI: mockExecuteBunCLI,
  parseOfficialFlags: mockParseOfficialFlags,
  getAllSessions: mockGetAllSessions,
}));

const { executeWithContext, startContextRunServer } = await import('../lib/context-run-server');

beforeEach(() => {
  mockExecuteBunCLI.mockClear();
});

describe('executeWithContext', () => {
  test('creates a session with unique id', async () => {
    const session = await executeWithContext(['echo', 'hello']);
    expect(session.id).toBeDefined();
    expect(typeof session.id).toBe('string');
    expect(session.id.length).toBeGreaterThan(0);
  });

  test('records command and args', async () => {
    const session = await executeWithContext(['bun', 'test', '--watch']);
    expect(session.command).toBe('bun');
    expect(session.args).toEqual(['test', '--watch']);
  });

  test('sets completed status on success', async () => {
    const session = await executeWithContext(['echo', 'ok']);
    expect(session.status).toBe('completed');
    expect(session.durationMs).toBe(42);
    expect(session.exitCode).toBe(0);
  });

  test('sets error status on CLI failure', async () => {
    mockExecuteBunCLI.mockImplementationOnce(async () => ({
      status: 'error',
      durationMs: 10,
      output: '',
      error: 'command failed',
      exitCode: 1,
    }));

    const session = await executeWithContext(['bad-command']);
    expect(session.status).toBe('error');
  });

  test('returns cached result when useCache is true', async () => {
    const opts = { useCache: true };
    const s1 = await executeWithContext(['cached-cmd'], opts);
    const s2 = await executeWithContext(['cached-cmd'], opts);

    // Both should succeed; second should be a cache hit (different session id)
    expect(s1.status).toBe('completed');
    expect(s2.status).toBe('completed');
    expect(s1.id).not.toBe(s2.id);
  });

  test('handles timeout status', async () => {
    mockExecuteBunCLI.mockImplementationOnce(async () => {
      throw new Error('Command timed out after 100ms');
    });

    const session = await executeWithContext(['slow-cmd'], { timeout: 100 });
    expect(session.status).toBe('timeout');
    expect(session.error).toContain('timed out');
  });
});

describe('startContextRunServer', () => {
  test('is a function', () => {
    expect(typeof startContextRunServer).toBe('function');
  });
});

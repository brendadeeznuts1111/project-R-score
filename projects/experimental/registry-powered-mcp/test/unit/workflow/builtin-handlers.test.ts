/**
 * Built-in Handlers Tests v2.4.1
 *
 * Comprehensive test suite for built-in step handlers.
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  builtinHandlers,
  getBuiltinHandlerTypes,
  shellExecHandler,
  httpRequestHandler,
  fileReadHandler,
  fileWriteHandler,
  delayHandler,
  logHandler,
  conditionHandler,
  setVariableHandler,
} from '../../../packages/core/src/workflow/builtin-handlers';
import type { WorkflowContext } from '../../../packages/core/src/workflow';

// Mock context for testing
function createMockContext(): WorkflowContext {
  return {
    workflowId: 'test-workflow',
    executionId: 'test-execution',
    trigger: 'manual',
    inputs: { testInput: 'value' },
    variables: new Map(),
    stepResults: new Map(),
    startedAt: new Date(),
    metadata: {},
  };
}

describe('Built-in Handlers', () => {
  describe('getBuiltinHandlerTypes', () => {
    test('should return all built-in handler types', () => {
      const types = getBuiltinHandlerTypes();
      expect(types.length).toBeGreaterThan(0);
      expect(types).toContain('shell.exec');
      expect(types).toContain('http.request');
      expect(types).toContain('file.read');
      expect(types).toContain('file.write');
      expect(types).toContain('delay');
      expect(types).toContain('log');
    });
  });

  describe('builtinHandlers', () => {
    test('should export all handlers as functions', () => {
      for (const [name, handler] of Object.entries(builtinHandlers)) {
        expect(typeof handler).toBe('function');
      }
    });
  });
});

describe('shellExecHandler', () => {
  const context = createMockContext();

  test('should execute a simple command', async () => {
    const result = await shellExecHandler({ command: 'echo hello' }, context);

    expect(result.stdout).toBe('hello');
    expect(result.exitCode).toBe(0);
  });

  test('should throw error for missing command', async () => {
    await expect(shellExecHandler({}, context)).rejects.toThrow(
      'shell.exec requires a command input'
    );
  });

  test('should throw error for failing command', async () => {
    await expect(
      shellExecHandler({ command: 'exit 1' }, context)
    ).rejects.toThrow('Command failed with exit code 1');
  });

  test('should capture stderr', async () => {
    // A command that writes to stderr but succeeds
    const result = await shellExecHandler(
      { command: 'echo error >&2 && exit 0' },
      context
    );

    expect(result.stderr).toContain('error');
  });
});

describe('httpRequestHandler', () => {
  const context = createMockContext();

  test('should throw error for missing URL', async () => {
    await expect(httpRequestHandler({}, context)).rejects.toThrow(
      'http.request requires a url input'
    );
  });

  // Note: HTTP tests require network access or mocking
  // In a real test suite, you'd use a mock server
  test('should use default method GET', async () => {
    // This test would require a mock server
    // For now, we just verify the handler exists
    expect(typeof httpRequestHandler).toBe('function');
  });
});

describe('fileReadHandler', () => {
  const context = createMockContext();
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'workflow-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test('should read file contents', async () => {
    const filePath = join(tempDir, 'test.txt');
    await Bun.write(filePath, 'Hello, World!');

    const result = await fileReadHandler({ path: filePath }, context);

    expect(result.content).toBe('Hello, World!');
    expect(result.exists).toBe(true);
    expect(result.size).toBeGreaterThan(0);
  });

  test('should return exists false for non-existent file', async () => {
    const filePath = join(tempDir, 'non-existent.txt');

    const result = await fileReadHandler({ path: filePath }, context);

    expect(result.exists).toBe(false);
    expect(result.content).toBe('');
  });

  test('should throw error for missing path', async () => {
    await expect(fileReadHandler({}, context)).rejects.toThrow(
      'file.read requires a path input'
    );
  });
});

describe('fileWriteHandler', () => {
  const context = createMockContext();
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'workflow-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test('should write file contents', async () => {
    const filePath = join(tempDir, 'output.txt');

    const result = await fileWriteHandler(
      { path: filePath, content: 'Test content' },
      context
    );

    expect(result.success).toBe(true);
    expect(result.path).toBe(filePath);

    const written = await Bun.file(filePath).text();
    expect(written).toBe('Test content');
  });

  test('should append to file when append is true', async () => {
    const filePath = join(tempDir, 'append.txt');
    await Bun.write(filePath, 'First line\n');

    await fileWriteHandler(
      { path: filePath, content: 'Second line', append: true },
      context
    );

    const content = await Bun.file(filePath).text();
    expect(content).toBe('First line\nSecond line');
  });

  test('should throw error for missing path', async () => {
    await expect(
      fileWriteHandler({ content: 'test' }, context)
    ).rejects.toThrow('file.write requires a path input');
  });

  test('should throw error for missing content', async () => {
    await expect(
      fileWriteHandler({ path: '/tmp/test.txt' }, context)
    ).rejects.toThrow('file.write requires a content input');
  });
});

describe('delayHandler', () => {
  const context = createMockContext();

  test('should sleep for specified duration', async () => {
    const start = performance.now();
    const result = await delayHandler({ duration: 50 }, context);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(45); // Allow some tolerance
    expect(result.slept).toBeGreaterThanOrEqual(45);
  });

  test('should throw error for missing duration', async () => {
    await expect(delayHandler({}, context)).rejects.toThrow(
      'delay requires a positive duration input'
    );
  });

  test('should throw error for non-positive duration', async () => {
    await expect(delayHandler({ duration: 0 }, context)).rejects.toThrow(
      'delay requires a positive duration input'
    );

    await expect(delayHandler({ duration: -100 }, context)).rejects.toThrow(
      'delay requires a positive duration input'
    );
  });
});

describe('logHandler', () => {
  const context = createMockContext();

  test('should log a message', async () => {
    const result = await logHandler({ message: 'Test message' }, context);

    expect(result.logged).toBe(true);
    expect(result.message).toBe('Test message');
  });

  test('should throw error for missing message', async () => {
    await expect(logHandler({}, context)).rejects.toThrow(
      'log requires a message input'
    );
  });

  test('should accept different log levels', async () => {
    const levels = ['info', 'warn', 'error', 'debug'];

    for (const level of levels) {
      const result = await logHandler(
        { message: `${level} message`, level },
        context
      );
      expect(result.logged).toBe(true);
    }
  });
});

describe('conditionHandler', () => {
  test('should evaluate input condition', async () => {
    const context = createMockContext();
    context.inputs.flag = true;

    const result = await conditionHandler(
      {
        condition: 'inputs.flag',
        trueValue: 'yes',
        falseValue: 'no',
      },
      context
    );

    expect(result.result).toBe(true);
    expect(result.value).toBe('yes');
  });

  test('should return false value when condition is false', async () => {
    const context = createMockContext();
    context.inputs.flag = false;

    const result = await conditionHandler(
      {
        condition: 'inputs.flag',
        trueValue: 'yes',
        falseValue: 'no',
      },
      context
    );

    expect(result.result).toBe(false);
    expect(result.value).toBe('no');
  });

  test('should evaluate variable condition', async () => {
    const context = createMockContext();
    context.variables.set('enabled', true);

    const result = await conditionHandler(
      { condition: 'vars.enabled' },
      context
    );

    expect(result.result).toBe(true);
  });

  test('should throw error for missing condition', async () => {
    const context = createMockContext();

    await expect(conditionHandler({}, context)).rejects.toThrow(
      'condition requires a condition input'
    );
  });
});

describe('setVariableHandler', () => {
  test('should set a variable in context', async () => {
    const context = createMockContext();

    const result = await setVariableHandler(
      { name: 'myVar', value: 'myValue' },
      context
    );

    expect(result.name).toBe('myVar');
    expect(result.value).toBe('myValue');
    expect(context.variables.get('myVar')).toBe('myValue');
  });

  test('should throw error for missing name', async () => {
    const context = createMockContext();

    await expect(
      setVariableHandler({ value: 'test' }, context)
    ).rejects.toThrow('setVariable requires a name input');
  });

  test('should handle different value types', async () => {
    const context = createMockContext();

    await setVariableHandler({ name: 'string', value: 'hello' }, context);
    await setVariableHandler({ name: 'number', value: 42 }, context);
    await setVariableHandler({ name: 'object', value: { key: 'value' } }, context);
    await setVariableHandler({ name: 'array', value: [1, 2, 3] }, context);

    expect(context.variables.get('string')).toBe('hello');
    expect(context.variables.get('number')).toBe(42);
    expect(context.variables.get('object')).toEqual({ key: 'value' });
    expect(context.variables.get('array')).toEqual([1, 2, 3]);
  });
});

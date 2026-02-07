/**
 * Optimized Secret Manager Tests
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { OptimizedSecretManager } from '../lib/secrets/core/optimized-secret-manager';
import { ProgressBar, Spinner, renderTable, createCLI, type CLIConfig } from '../lib/cli/framework';

describe('Optimized Secret Manager', () => {
  let manager: OptimizedSecretManager;

  beforeEach(() => {
    manager = new OptimizedSecretManager({
      cacheSize: 100,
      cacheTtl: 60000,
    });
  });

  test('manager initializes with correct options', () => {
    expect(manager).toBeInstanceOf(OptimizedSecretManager);
  });

  test('metrics start at zero', () => {
    const metrics = manager.getMetrics();
    expect(metrics.cacheHits).toBe(0);
    expect(metrics.cacheMisses).toBe(0);
    expect(metrics.hitRate).toBe(0);
  });

  test('clearCache resets cache', () => {
    manager.clearCache();
    const metrics = manager.getMetrics();
    expect(metrics.cacheHits).toBe(0);
  });

  test('printMetrics outputs without error', () => {
    // Just verify it doesn't throw
    manager.printMetrics();
  });

  test('shutdown stops audit queue', () => {
    // Just verify it doesn't throw
    manager.shutdown();
  });
});

describe('CLI Framework', () => {
  const testConfig: CLIConfig = {
    name: 'test-cli',
    version: '1.0.0',
    description: 'Test CLI',
    commands: [
      {
        name: 'hello',
        description: 'Say hello',
        handler: ctx => {
          console.log(`Hello, ${ctx.args.name || 'World'}!`);
        },
        arguments: [{ name: 'name', description: 'Name to greet' }],
      },
      {
        name: 'version',
        description: 'Show version',
        aliases: ['v'],
        handler: () => {
          console.log('v1.0.0');
        },
      },
    ],
    globalOptions: [
      { name: 'verbose', description: 'Verbose output', type: 'boolean', short: 'v' },
    ],
  };

  test('createCLI creates instance', () => {
    const cli = createCLI(testConfig);
    expect(cli).toBeDefined();
  });

  test('styled returns colored text', () => {
    const cli = createCLI(testConfig);
    const red = cli.styled('test', 'red');
    expect(red).toContain('\x1b[');
    expect(red).toContain('test');
  });

  test('log outputs message', () => {
    const cli = createCLI(testConfig);
    // Just verify it doesn't throw
    cli.log('test message');
  });
});

describe('Progress Bar', () => {
  test('creates progress bar', () => {
    const bar = new ProgressBar(100, 'Test');
    expect(bar).toBeInstanceOf(ProgressBar);
  });

  test('update changes progress', () => {
    const bar = new ProgressBar(100, 'Test');
    bar.update(50);
    // Progress updated without error
  });

  test('increment increases progress', () => {
    const bar = new ProgressBar(100, 'Test');
    bar.increment();
    bar.increment();
    // Progress incremented without error
  });

  test('finish completes progress', () => {
    const bar = new ProgressBar(10, 'Test');
    bar.finish();
    // Progress finished without error
  });
});

describe('Spinner', () => {
  test('creates spinner', () => {
    const spinner = new Spinner('Loading');
    expect(spinner).toBeInstanceOf(Spinner);
  });

  test('start and stop spinner', () => {
    const spinner = new Spinner('Test');
    spinner.start();
    spinner.stop('Done');
    // No error
  });

  test('fail spinner', () => {
    const spinner = new Spinner('Test');
    spinner.start();
    spinner.fail('Failed');
    // No error
  });
});

describe('Table Renderer', () => {
  test('renders simple table', () => {
    const table = renderTable(
      ['Name', 'Value'],
      [
        ['A', 1],
        ['B', 2],
      ]
    );
    expect(table).toContain('Name');
    expect(table).toContain('Value');
    expect(table).toContain('A');
    expect(table).toContain('1');
  });

  test('renders with alignment', () => {
    const table = renderTable(
      ['Item', 'Count'],
      [
        ['Apple', 5],
        ['Banana', 10],
      ],
      { align: ['left', 'right'] }
    );
    expect(table).toContain('Apple');
    expect(table).toContain('5');
  });
});

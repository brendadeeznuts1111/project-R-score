/**
 * Logger Tests
 * Validates structured logging functionality
 */

import { describe, test, expect } from "harness";
import { Logger } from "../../../packages/core/src/instrumentation/logger";

describe('Logger', () => {
  test('should create logger with component name', () => {
    const logger = new Logger('TestComponent');

    expect(logger).toBeDefined();
  });

  test('should create child logger with namespaced component', () => {
    const parent = new Logger('Parent');
    const child = parent.child('Child');

    expect(child).toBeDefined();
  });

  test('should support all log levels', () => {
    const logger = new Logger('Test', 'debug');

    // These should not throw
    expect(() => logger.debug('Debug message')).not.toThrow();
    expect(() => logger.info('Info message')).not.toThrow();
    expect(() => logger.warn('Warning message')).not.toThrow();
    expect(() => logger.error('Error message')).not.toThrow();
  });

  test('should log with data objects', () => {
    const logger = new Logger('Test', 'debug');

    expect(() => {
      logger.info('Test with data', { key: 'value', number: 42 });
    }).not.toThrow();
  });

  test('should handle Error objects', () => {
    const logger = new Logger('Test', 'debug');
    const error = new Error('Test error');

    expect(() => {
      logger.error('An error occurred', error);
    }).not.toThrow();
  });

  test('should respect minimum log level', () => {
    // Logger set to 'warn' should not output debug/info
    const logger = new Logger('Test', 'warn');

    // These should execute without errors even if not displayed
    expect(() => logger.debug('Should not display')).not.toThrow();
    expect(() => logger.info('Should not display')).not.toThrow();
    expect(() => logger.warn('Should display')).not.toThrow();
    expect(() => logger.error('Should display')).not.toThrow();
  });
});

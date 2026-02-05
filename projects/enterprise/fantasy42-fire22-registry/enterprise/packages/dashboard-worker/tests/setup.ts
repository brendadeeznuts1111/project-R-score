// Test setup file
// Set test environment
process.env.NODE_ENV = 'test';
process.env.TESTING = 'true';

// Simple mock for testing purposes
if (typeof global.console === 'undefined') {
  global.console = console;
}

/**
 * Fantasy42-Fire22 Preload Script
 * Global setup and configuration for Bun runtime
 */

// Global environment setup
if (typeof globalThis !== 'undefined') {
  // Ensure global environment variables are available
  globalThis.process = globalThis.process || {
    env: Bun.env,
    version: 'v20.0.0',
    platform: 'bun',
    arch: 'x64',
  };

  // Setup global console methods for better logging
  const originalConsole = globalThis.console;
  globalThis.console = {
    ...originalConsole,
    table: (data: any, properties?: string[], options?: any) => {
      if (Bun.inspect?.table) {
        Bun.inspect.table(data, properties, options);
      } else {
        originalConsole.table(data);
      }
    },
  };
}

// Export empty object for preload compatibility
export {};

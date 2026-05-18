#!/usr/bin/env bun

export {}; // Make this file a module to enable top-level await

/**
 * Environment Variables Examples
 *
 * This example demonstrates how to work with environment variables
 * in Bun using Bun.env and process.env, including reading, setting,
 * and inheriting from parent processes.
 */

console.info("🌍 Environment Variables Examples\n");

// Example 1: Reading environment variables
console.info("1. Reading environment variables:");
console.info(`  Current NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
console.info(`  Current PATH length: ${process.env.PATH?.length || 0} characters`);
console.info(`  Current HOME: ${process.env.HOME || 'undefined'}`);
console.info(`  Current USER: ${process.env.USER || 'undefined'}`);
console.info("");

// Example 2: Using Bun.env for Bun-specific environment handling
console.info("2. Using Bun.env:");
try {
  // Bun.env provides optimized access to environment variables
  console.info(`  Via Bun.env: ${Bun.env.NODE_ENV || 'undefined'}`);
  console.info(`  Via Bun.env.PATH length: ${Bun.env.PATH?.length || 0} characters`);
  console.info("  Bun.env is a special object with efficient access");
} catch (error) {
  console.info(`  Error accessing Bun.env: ${error.message}`);
}
console.info("");

// Example 3: Setting environment variables for child processes
console.info("3. Setting custom environment for child process:");
const proc1 = Bun.spawn(["env"], {
  env: {
    ...process.env,
    CUSTOM_VAR: "from_bun_example",
    BUN_ENV_EXAMPLE: "true",
    TEMP_SETTING: "temporary_value"
  }
});

await proc1.exited;
console.info("  Child process used custom environment variables");
console.info("");

// Example 4: Environment inheritance demonstration
console.info("4. Environment variable inheritance:");
try {
  // First set a variable and spawn a child that verifies it exists
  const uniqueVar = `BUN_TEST_${Date.now()}`;
  const proc2 = Bun.spawn(["sh", "-c", `echo "${uniqueVar} value: $BUN_TEST_VALUE"`], {
    env: {
      ...process.env,
      [uniqueVar]: "inherited_value",
      BUN_TEST_VALUE: "hello_world"
    }
  });

  await proc2.exited;
} catch (error) {
  console.info(`  Shell not available, but concept demonstrated above`);
}
console.info("");

// Example 5: Working with environment files
console.info("5. Simulating environment file loading:");
const mockEnvVars = {
  API_URL: "https://api.example.com",
  DEBUG_MODE: "true",
  MAX_RETRIES: "3",
  DATABASE_URL: "postgres://localhost:5432/mydb"
};

// Apply mock environment variables
const originalEnv = { ...process.env };
for (const [key, value] of Object.entries(mockEnvVars)) {
  process.env[key] = value;
}

console.info("  Applied mock environment variables:");
console.info(`    API_URL: ${process.env.API_URL}`);
console.info(`    DEBUG_MODE: ${process.env.DEBUG_MODE}`);
console.info(`    MAX_RETRIES: ${process.env.MAX_RETRIES}`);

// Spawn a process that can access these variables
const proc3 = Bun.spawn(["env"], {
  env: process.env
});

await proc3.exited;

// Restore original environment
Object.assign(process.env, originalEnv);
console.info("");

console.info("✅ Environment variables examples completed!");

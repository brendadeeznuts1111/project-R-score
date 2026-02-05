#!/usr/bin/env bun

export {}; // Make this file a module to enable top-level await

/**
 * Environment Variables Examples
 *
 * This example demonstrates how to work with environment variables
 * in Bun using Bun.env and process.env, including reading, setting,
 * and inheriting from parent processes.
 */

console.log("🌍 Environment Variables Examples\n");

// Example 1: Reading environment variables
console.log("1. Reading environment variables:");
console.log(`  Current NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
console.log(`  Current PATH length: ${process.env.PATH?.length || 0} characters`);
console.log(`  Current HOME: ${process.env.HOME || 'undefined'}`);
console.log(`  Current USER: ${process.env.USER || 'undefined'}`);
console.log("");

// Example 2: Using Bun.env for Bun-specific environment handling
console.log("2. Using Bun.env:");
try {
  // Bun.env provides optimized access to environment variables
  console.log(`  Via Bun.env: ${Bun.env.NODE_ENV || 'undefined'}`);
  console.log(`  Via Bun.env.PATH length: ${Bun.env.PATH?.length || 0} characters`);
  console.log("  Bun.env is a special object with efficient access");
} catch (error) {
  console.log(`  Error accessing Bun.env: ${error.message}`);
}
console.log("");

// Example 3: Setting environment variables for child processes
console.log("3. Setting custom environment for child process:");
const proc1 = Bun.spawn(["env"], {
  env: {
    ...process.env,
    CUSTOM_VAR: "from_bun_example",
    BUN_ENV_EXAMPLE: "true",
    TEMP_SETTING: "temporary_value"
  }
});

await proc1.exited;
console.log("  Child process used custom environment variables");
console.log("");

// Example 4: Environment inheritance demonstration
console.log("4. Environment variable inheritance:");
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
  console.log(`  Shell not available, but concept demonstrated above`);
}
console.log("");

// Example 5: Working with environment files
console.log("5. Simulating environment file loading:");
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

console.log("  Applied mock environment variables:");
console.log(`    API_URL: ${process.env.API_URL}`);
console.log(`    DEBUG_MODE: ${process.env.DEBUG_MODE}`);
console.log(`    MAX_RETRIES: ${process.env.MAX_RETRIES}`);

// Spawn a process that can access these variables
const proc3 = Bun.spawn(["env"], {
  env: process.env
});

await proc3.exited;

// Restore original environment
Object.assign(process.env, originalEnv);
console.log("");

console.log("✅ Environment variables examples completed!");

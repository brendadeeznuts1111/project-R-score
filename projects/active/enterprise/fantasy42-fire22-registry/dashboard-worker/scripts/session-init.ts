#!/usr/bin/env bun
/**
 * Session Initialization Script
 *
 * Automatically sets up registry authentication for the current session
 * with minimal friction. Run this once when starting work.
 */

import { secrets } from 'bun';
import { readFileSync, existsSync, writeFileSync, unlinkSync } from 'fs';
import { spawn } from 'child_process';

const SERVICE_NAME = 'fire22-dashboard-worker';
const TOKEN_NAME = 'registry-token';
const SESSION_MARKER = '.session-active';
const REGISTRY_URL = 'https://fire22-security-registry.nolarose1968-806.workers.dev/';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

async function printBanner() {
  console.info(colors.cyan + colors.bright);
  console.info('╔══════════════════════════════════════════════════════╗');
  console.info('║         🚀 Fire22 Dashboard Session Init 🚀          ║');
  console.info('╚══════════════════════════════════════════════════════╝');
  console.info(colors.reset);
}

async function checkExistingSession(): Promise<boolean> {
  if (existsSync(SESSION_MARKER)) {
    const sessionData = readFileSync(SESSION_MARKER, 'utf-8');
    const sessionTime = new Date(sessionData.trim());
    const hoursSinceStart = (Date.now() - sessionTime.getTime()) / (1000 * 60 * 60);

    if (hoursSinceStart < 24) {
      console.info(
        colors.green +
          '✓' +
          colors.reset +
          ' Active session found (started ' +
          colors.bright +
          Math.round(hoursSinceStart) +
          ' hours ago' +
          colors.reset +
          ')'
      );
      return true;
    }
  }
  return false;
}

async function getStoredToken(): Promise<string | null> {
  try {
    return await secrets.get({
      service: SERVICE_NAME,
      name: TOKEN_NAME,
    });
  } catch {
    return null;
  }
}

async function setupTokenFromEnv(): Promise<boolean> {
  // Check environment variable
  if (process.env.FIRE22_REGISTRY_TOKEN) {
    await secrets.set({
      service: SERVICE_NAME,
      name: TOKEN_NAME,
      value: process.env.FIRE22_REGISTRY_TOKEN,
    });
    console.info(colors.green + '✓' + colors.reset + ' Token configured from environment');
    return true;
  }

  // Check .env files
  const envFiles = ['.env', '.env.local', '.env.production'];
  for (const file of envFiles) {
    if (existsSync(file)) {
      const content = readFileSync(file, 'utf-8');
      const match = content.match(/FIRE22_REGISTRY_TOKEN=(.+)/);

      if (match && match[1]) {
        await secrets.set({
          service: SERVICE_NAME,
          name: TOKEN_NAME,
          value: match[1].trim(),
        });
        console.info(colors.green + '✓' + colors.reset + ` Token configured from ${file}`);
        return true;
      }
    }
  }

  return false;
}

async function testRegistryConnection(token: string): Promise<boolean> {
  try {
    const response = await fetch(`${REGISTRY_URL}health`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function promptForToken(): Promise<string | null> {
  console.info(colors.yellow + '\n⚠️  No registry token found' + colors.reset);
  console.info('\nOptions:');
  console.info(
    '1. Set token via environment: ' +
      colors.cyan +
      'FIRE22_REGISTRY_TOKEN=xxx bun run dev' +
      colors.reset
  );
  console.info(
    '2. Add to .env file: ' +
      colors.cyan +
      "echo 'FIRE22_REGISTRY_TOKEN=xxx' >> .env" +
      colors.reset
  );
  console.info('3. Continue without private registry (use npm only)');
  console.info('');

  // For now, return null to continue without token
  // In future, could add interactive prompt
  return null;
}

async function initializeSession() {
  await printBanner();

  // Check if session is already active
  if (await checkExistingSession()) {
    const token = await getStoredToken();
    if (token && (await testRegistryConnection(token))) {
      console.info(colors.green + '✓' + colors.reset + ' Registry authentication active');
      console.info(colors.blue + '\n📦 Ready to install private packages!' + colors.reset);
      return;
    }
  }

  console.info(colors.blue + '🔄 Initializing new session...' + colors.reset);

  // Try to get token from various sources
  let token = await getStoredToken();

  if (!token) {
    console.info(
      colors.yellow + '→' + colors.reset + ' No stored token found, checking environment...'
    );
    if (await setupTokenFromEnv()) {
      token = await getStoredToken();
    }
  }

  // Test the token if we have one
  if (token) {
    process.stdout.write(colors.yellow + '→' + colors.reset + ' Testing registry connection... ');
    if (await testRegistryConnection(token)) {
      console.info(colors.green + '✓ Success!' + colors.reset);

      // Create session marker
      writeFileSync(SESSION_MARKER, new Date().toISOString());

      // Export for current session
      process.env.FIRE22_REGISTRY_TOKEN = token;

      console.info(colors.green + '\n✅ Session initialized successfully!' + colors.reset);
      console.info(
        colors.blue + '📦 Private registry: ' + colors.bright + REGISTRY_URL + colors.reset
      );
      console.info(colors.blue + '🔐 Authentication: ' + colors.bright + 'Active' + colors.reset);
      console.info(
        colors.blue + '⏱️  Session duration: ' + colors.bright + '24 hours' + colors.reset
      );
    } else {
      console.info(colors.red + '✗ Failed!' + colors.reset);
      console.info(colors.yellow + '⚠️  Token appears to be invalid' + colors.reset);
      await promptForToken();
    }
  } else {
    await promptForToken();
    console.info(colors.yellow + '\n⚠️  Continuing without private registry access' + colors.reset);
    console.info(colors.yellow + '   Only public npm packages will be available' + colors.reset);
  }

  console.info(
    colors.cyan + '\n═══════════════════════════════════════════════════════' + colors.reset
  );
}

// Quick status check
async function showStatus() {
  const hasSession = existsSync(SESSION_MARKER);
  const token = await getStoredToken();
  const isConnected = token ? await testRegistryConnection(token) : false;

  console.info('\n' + colors.bright + 'Session Status:' + colors.reset);
  console.info(
    '├─ Session: ' + (hasSession ? colors.green + 'Active' : colors.red + 'Inactive') + colors.reset
  );
  console.info(
    '├─ Token: ' +
      (token ? colors.green + 'Configured' : colors.red + 'Not configured') +
      colors.reset
  );
  console.info(
    '├─ Registry: ' +
      (isConnected ? colors.green + 'Connected' : colors.red + 'Disconnected') +
      colors.reset
  );
  console.info('└─ URL: ' + colors.blue + REGISTRY_URL + colors.reset);
}

// Handle commands
const command = process.argv[2];

switch (command) {
  case 'status':
    await showStatus();
    break;

  case 'reset':
    if (existsSync(SESSION_MARKER)) {
      unlinkSync(SESSION_MARKER);
      console.info(colors.green + '✓' + colors.reset + ' Session reset');
    }
    await initializeSession();
    break;

  case 'clear':
    if (existsSync(SESSION_MARKER)) {
      unlinkSync(SESSION_MARKER);
    }
    await secrets
      .delete({
        service: SERVICE_NAME,
        name: TOKEN_NAME,
      })
      .catch(() => {});
    console.info(colors.green + '✓' + colors.reset + ' Session and credentials cleared');
    break;

  default:
    await initializeSession();
}

export { getStoredToken, SERVICE_NAME, TOKEN_NAME };

#!/usr/bin/env bun

/**
 * 🏭 Factory-Wager Admin CLI
 * 
 * Standalone command-line interface for admin dashboard operations
 * Usage: bun run admin-cli.ts [command] [options]
 */

import { AdminCLI } from './src/cli/admin-cli.ts';

console.log('🏭 Factory-Wager Admin CLI v1.0.0');
console.log('🌐 Domain Management System');
console.log('⚡ Powered by Cloudflare Workers');
console.log('');

// Create and run the CLI
const cli = new AdminCLI();
cli.run();

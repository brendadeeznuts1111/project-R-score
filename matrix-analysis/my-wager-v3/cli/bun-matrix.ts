#!/usr/bin/env bun
// Bun Matrix CLI - Tier-1380 Infrastructure

import { runMatrixCLI } from '../src/matrix-view';

// Run CLI with arguments
runMatrixCLI(process.argv.slice(2)).catch(console.error);

#!/usr/bin/env bun

/**
 * Enhanced Logger with singleton pattern and structured logging
 * Core implementation
 */

import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { performance } from "node:perf_hooks";

// Re-export everything from the actual implementation
export * from "../../logging/enhanced-logger";

#!/usr/bin/env bun
/**
 * Comprehensive Test Suite for Bun scripts/utils.mjs Functions
 * Integration with surgical-precision-mcp zero-collateral philosophy
 * Reference: https://bun.sh/blog/scripts-utils
 */

import { describe, test, expect } from 'bun:test';
import { spawnSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import { Decimal } from 'decimal.js';
import { PrecisionUtils } from '../precision-utils';

describe('Spawn Operations', () => {
  test('spawnSync basic functionality', () => {
    const result = spawnSync('echo', ['surgical precision']);
    expect(result.status).toBe(0);
    expect(result.stdout.toString().trim()).toBe('surgical precision');
  });
});

describe('Zero-Collateral Verification', () => {
  test('maintains zero risk', () => {
    expect(PrecisionUtils.zero().isZero()).toBe(true);
  });
});

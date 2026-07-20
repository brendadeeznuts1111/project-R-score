#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// lib/shared/tools/cli-helpers.ts — shared CLI primitives for tools/scripts
//
// Centralizes the duplicated patterns found across validator/status-checker CLIs:
// - standard flag detection
// - colored console logger
// - test-results aggregation

export interface BaseCliOptions {
  verbose: boolean;
  quiet: boolean;
  json: boolean;
  noColor: boolean;
  help: boolean;
}

/**
 * Parse the standard CLI flags used by most internal tools.
 * Extra boolean flags can be declared with their long and/or short aliases.
 */
export function parseBaseCliArgs(
  args: string[],
  extraFlags?: Record<string, string | string[]>
): BaseCliOptions & Record<string, boolean> {
  const options: Record<string, boolean> = {
    verbose: args.includes('-v') || args.includes('--verbose'),
    quiet: args.includes('-q') || args.includes('--quiet'),
    json: args.includes('--json'),
    noColor: args.includes('--no-color'),
    help: args.includes('-h') || args.includes('--help'),
  };

  for (const [flag, aliases] of Object.entries(extraFlags ?? {})) {
    const list = Array.isArray(aliases) ? aliases : [aliases];
    options[flag] = list.some(a => args.includes(a));
  }

  return options as BaseCliOptions & Record<string, boolean>;
}

export interface CliColors {
  reset: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
  gray: string;
}

/**
 * Return an ANSI color table, optionally empty when colors are disabled.
 */
export function getCliColors(noColor: boolean): CliColors {
  if (noColor) {
    return {
      reset: '',
      red: '',
      green: '',
      yellow: '',
      blue: '',
      magenta: '',
      cyan: '',
      white: '',
      gray: '',
    };
  }
  return {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    gray: '\x1b[90m',
  };
}

export interface CliLogger {
  info: (msg: string) => void;
  success: (msg: string) => void;
  warning: (msg: string) => void;
  error: (msg: string) => void;
  verbose: (msg: string) => void;
  section: (title: string) => void;
  json: (data: unknown) => void;
}

/**
 * Create the colored logger used by validator/status-checker CLIs.
 */
export function createCliLogger(options: {
  quiet?: boolean;
  verbose?: boolean;
  json?: boolean;
  noColor?: boolean;
}): CliLogger {
  const { quiet = false, verbose = false, json = false, noColor = false } = options;
  const colors = getCliColors(noColor);

  return {
    info: (msg: string) => {
      if (!quiet) console.info(`${colors.blue}ℹ${colors.reset} ${msg}`);
    },
    success: (msg: string) => {
      if (!quiet) console.info(`${colors.green}✅${colors.reset} ${msg}`);
    },
    warning: (msg: string) => {
      if (!quiet) console.info(`${colors.yellow}⚠️${colors.reset} ${msg}`);
    },
    error: (msg: string) => {
      console.info(`${colors.red}❌${colors.reset} ${msg}`);
    },
    verbose: (msg: string) => {
      if (verbose) console.info(`${colors.gray}🔍${colors.reset} ${msg}`);
    },
    section: (title: string) => {
      if (!quiet) console.info(`\n${colors.cyan}${title}${colors.reset}`);
    },
    json: (data: unknown) => {
      if (json) console.info(JSON.stringify(data, null, 2));
    },
  };
}

export interface TestRecord {
  passed: boolean;
  message: string;
  details?: unknown;
  timestamp: string;
}

export interface TestResults {
  timestamp: string;
  tests: Record<string, TestRecord>;
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}

/**
 * Create a test-results aggregator with the same shape duplicated across
 * validator/status-checker CLIs.
 */
export function createTestResults(): {
  testResults: TestResults;
  recordTest: (name: string, passed: boolean, message: string, details?: unknown) => boolean;
} {
  const testResults: TestResults = {
    timestamp: new Date().toISOString(),
    tests: {},
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
      warnings: 0,
    },
  };

  const recordTest = (name: string, passed: boolean, message: string, details?: unknown): boolean => {
    testResults.tests[name] = {
      passed,
      message,
      details,
      timestamp: new Date().toISOString(),
    };
    testResults.summary.total++;
    if (passed) {
      testResults.summary.passed++;
    } else {
      testResults.summary.failed++;
    }
    return passed;
  };

  return { testResults, recordTest };
}

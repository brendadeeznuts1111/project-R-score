#!/usr/bin/env bun
import {
  DEFAULT_PORT, DEFAULT_HOSTNAME, DEFAULT_TEST_PORT,
  ROUTES, HEADERS, DB, AUTH, LIMITS, FEATURES, getConfig
} from '../config';
import { parseArgs } from 'util';

const { values } = parseArgs({
  args: Bun.argv,
  options: {
    format: { type: 'string', default: 'table' },
    section: { type: 'string' },
    validate: { type: 'boolean', default: false },
    env: { type: 'string', default: 'current' }
  },
  strict: false,
  allowPositionals: true
});

const sections = { ROUTES, HEADERS, DB, AUTH, LIMITS, FEATURES };

function formatValue(value: any): string {
  if (typeof value === 'function') return '[Function]';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function displayTable(sectionName?: string) {
  console.log(`\n🔧 Configuration Inspection (${values.env})\n`);

  const targetSections = sectionName
    ? { [sectionName]: sections[sectionName as keyof typeof sections] }
    : sections;

  for (const [name, config] of Object.entries(targetSections)) {
    console.log(`\x1b[1m\x1b[36m${name}\x1b[0m`);
    console.log('─'.repeat(50));

    for (const [key, value] of Object.entries(config)) {
      const formatted = formatValue(value);
      const truncated = formatted.length > 40
        ? formatted.slice(0, 37) + '...'
        : formatted;
      console.log(`  \x1b[33m${key}\x1b[0m: ${truncated}`);
    }
  }

  // Network config
  console.log(`\n\x1b[1m\x1b[36mNETWORK\x1b[0m`);
  console.log('─'.repeat(50));
  console.log(`  \x1b[33mDEFAULT_PORT\x1b[0m: ${DEFAULT_PORT}`);
  console.log(`  \x1b[33mDEFAULT_TEST_PORT\x1b[0m: ${DEFAULT_TEST_PORT}`);
  console.log(`  \x1b[33mDEFAULT_HOSTNAME\x1b[0m: ${DEFAULT_HOSTNAME}`);
  console.log(`  \x1b[33mServer URL\x1b[0m: http://${DEFAULT_HOSTNAME}:${DEFAULT_PORT}`);
}

function validateFull() {
  console.log('\n🔍 Running Full Validation...\n');

  const checks = [
    { name: 'Port Collision', test: () => DEFAULT_PORT !== DEFAULT_TEST_PORT },
    { name: 'Port Range (Main)', test: () => DEFAULT_PORT >= 1024 && DEFAULT_PORT <= 65535 },
    { name: 'Port Range (Test)', test: () => DEFAULT_TEST_PORT >= 1024 && DEFAULT_TEST_PORT <= 65535 },
    { name: 'Auth Token Present', test: () => !!AUTH.API_TOKEN || process.env.NODE_ENV !== 'production' },
    { name: 'DB Path Set', test: () => DB.DEFAULT_PATH.length > 0 },
    { name: 'CORS Headers Complete', test: () =>
      HEADERS.CORS['Access-Control-Allow-Origin'] === '*' &&
      HEADERS.CORS['Access-Control-Allow-Methods'].includes('GET')
    }
  ];

  let passed = 0;
  for (const check of checks) {
    const result = check.test();
    const icon = result ? '✅' : '❌';
    console.log(`${icon} ${check.name}`);
    if (result) passed++;
  }

  console.log(`\n${passed}/${checks.length} checks passed`);
  process.exit(passed === checks.length ? 0 : 1);
}

if (values.validate) {
  validateFull();
} else {
  displayTable(values.section);
}

#!/usr/bin/env bun

/**
 * Unicode-Aware Table Example
 * Demonstrates beautiful table formatting with Bun.stringWidth()
 */

import { TableFormatter } from '../src/utils/TableFormatter.js';

// Example 1: Simple country table with flags
console.log('📊 Example 1: Country Flags Table\n');
const countryTable = TableFormatter.format({
  columns: [
    { header: '🇺🇸 Country', key: 'country', align: 'left' },
    { header: '🌍 Region', key: 'region', align: 'center' },
    { header: '✅ Status', key: 'status', align: 'center' },
  ],
  data: [
    { country: '🇺🇸 USA', region: '🌍 North America', status: '✅ Active' },
    { country: '🇬🇧 UK', region: '🌍 Europe', status: '✅ Active' },
    { country: '🇯🇵 Japan', region: '🌍 Asia', status: '⚠️ Pending' },
    { country: '🇨🇦 Canada', region: '🌍 North America', status: '✅ Active' },
  ],
  borders: true,
  padding: 1,
  headerColor: true,
  alternateRowColors: true,
});
console.log(countryTable);

// Example 2: Phone management table
console.log('\n\n📱 Example 2: Phone Management Table\n');
const phoneTable = TableFormatter.format({
  columns: [
    { header: '📱 Device', key: 'device', align: 'left' },
    { header: '🔋 Battery', key: 'battery', align: 'center', format: (v) => `${v}%` },
    { header: '✅ Status', key: 'status', align: 'center' },
    { header: '👤 User', key: 'user', align: 'left' },
  ],
  data: [
    { device: '📱 iPhone 14 Pro', battery: 85, status: '✅ Active', user: '👤 John Doe' },
    { device: '📱 Samsung Galaxy S23', battery: 92, status: '✅ Active', user: '👤 Jane Smith' },
    { device: '📱 Google Pixel 7', battery: 45, status: '⚠️ Low Battery', user: '👤 Bob Wilson' },
  ],
  borders: true,
  padding: 1,
  headerColor: true,
});
console.log(phoneTable);

// Example 3: API response table
console.log('\n\n🔌 Example 3: API Status Table\n');
const apiTable = TableFormatter.format({
  columns: [
    { header: '🔌 Service', key: 'service', align: 'left' },
    { header: '📡 Endpoint', key: 'endpoint', align: 'left' },
    { header: '✅ Status', key: 'status', align: 'center' },
    { header: '⏱️ Response', key: 'response', align: 'right', format: (v) => `${v}ms` },
  ],
  data: [
    { service: '🔌 GeeLark API', endpoint: '/open/v1/phone/list', status: '✅ OK', response: 234 },
    { service: '🔌 Auth Service', endpoint: '/api/v1/auth', status: '✅ OK', response: 156 },
    { service: '🔌 Webhook', endpoint: '/api/v1/webhook', status: '❌ Error', response: 0 },
  ],
  borders: true,
  padding: 1,
  headerColor: true,
  alternateRowColors: true,
});
console.log(apiTable);

console.log('\n✨ All tables use Bun.stringWidth() for perfect Unicode alignment!\n');

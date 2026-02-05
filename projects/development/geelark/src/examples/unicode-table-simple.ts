#!/usr/bin/env bun

/**
 * Simple Unicode-Aware Table Example
 * Using Bun.stringWidth() for perfect alignment with emojis and flags
 */

// Simple table with perfect Unicode alignment
console.log('┌─────────────────┬────────────────────┬──────────────┐');
console.log('│ Country         │ Region             │ Status       │');
console.log('├─────────────────┼────────────────────┼──────────────┤');

// Create rows with perfect alignment using Bun.stringWidth()
const rows = [
  { country: '🇺🇸 USA', region: '🌍 North America', status: '✅ Active' },
  { country: '🇬🇧 UK', region: '🌍 Europe', status: '✅ Active' },
  { country: '🇯🇵 Japan', region: '🌍 Asia', status: '⚠️ Pending' },
  { country: '🇨🇦 Canada', region: '🌍 North America', status: '✅ Active' },
];

rows.forEach((row) => {
  // Calculate padding needed: target width - actual display width
  // Target widths: 13, 18, 12 (matching header widths)
  const countryDisplayWidth = Bun.stringWidth(row.country);
  const regionDisplayWidth = Bun.stringWidth(row.region);
  const statusDisplayWidth = Bun.stringWidth(row.status);

  // Use padEnd with the actual display width difference
  const countryPadded = row.country + ' '.repeat(Math.max(0, 13 - countryDisplayWidth));
  const regionPadded = row.region + ' '.repeat(Math.max(0, 18 - regionDisplayWidth));
  const statusPadded = row.status + ' '.repeat(Math.max(0, 12 - statusDisplayWidth));

  console.log(`│ ${countryPadded} │ ${regionPadded} │ ${statusPadded} │`);
});

console.log('└─────────────────┴────────────────────┴──────────────┘');

// Simpler example - single row alignment
console.log('\n📊 Simple Alignment Example:\n');
console.log('│ ' + '🇺🇸 USA'.padEnd(Bun.stringWidth('🇺🇸 USA') + 5) + '│');
console.log('│ ' + '🇬🇧 UK'.padEnd(Bun.stringWidth('🇬🇧 UK') + 7) + '│');
console.log('│ ' + '🇯🇵 Japan'.padEnd(Bun.stringWidth('🇯🇵 Japan') + 4) + '│');
console.log('│ ' + '🇨🇦 Canada'.padEnd(Bun.stringWidth('🇨🇦 Canada') + 3) + '│');

// ✅ Perfect alignment with any Unicode!
console.log('\n✅ Perfect alignment with emojis, flags, and Unicode characters!');


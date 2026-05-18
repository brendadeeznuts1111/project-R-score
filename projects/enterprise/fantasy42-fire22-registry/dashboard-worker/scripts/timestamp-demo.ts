#!/usr/bin/env bun

/**
 * 🕐 Timestamp Utility Demo
 * Demonstrates the enhanced timestamp utilities with the user's timestamp
 */

import {
  TimestampUtils,
  parseTimestamp,
  validateTimestamp,
  formatTimestamp,
} from '../src/utils/timestamp-utils';

console.info('🕐 Fire22 Timestamp Utility Demo\n');

// Test with the user's timestamp
const userTimestamp = '2025-08-25 20:05:00.000';
console.info(`📅 Testing with timestamp: "${userTimestamp}"\n`);

// 1. Parse and analyze the timestamp
console.info('1️⃣ Parsing timestamp...');
const parsed = parseTimestamp(userTimestamp);
console.info('✅ Parsed successfully!');
console.info(`   Format detected: ${parsed.format}`);
console.info(`   Valid: ${parsed.isValid}`);
console.info(`   Date: ${parsed.parsed.toDateString()}`);
console.info(`   Time: ${parsed.parsed.toTimeString()}`);
console.info(`   Unix timestamp: ${parsed.unix}`);
console.info(`   ISO format: ${parsed.iso}`);
console.info(`   Human readable: ${parsed.humanReadable}`);
console.info(`   Relative: ${parsed.relative}`);
console.info(
  `   Components: ${parsed.components.year}-${parsed.components.month.toString().padStart(2, '0')}-${parsed.components.day.toString().padStart(2, '0')} ${parsed.components.hour.toString().padStart(2, '0')}:${parsed.components.minute.toString().padStart(2, '0')}:${parsed.components.second.toString().padStart(2, '0')}.${parsed.components.millisecond.toString().padStart(3, '0')}\n`
);

// 2. Validate the timestamp
console.info('2️⃣ Validating timestamp...');
const validation = validateTimestamp(userTimestamp);
console.info(`   Valid: ${validation.isValid}`);
console.info(`   Format: ${validation.format}`);
if (validation.errors.length > 0) {
  console.info(`   ❌ Errors: ${validation.errors.join(', ')}`);
}
if (validation.warnings.length > 0) {
  console.info(`   ⚠️  Warnings: ${validation.warnings.join(', ')}`);
}
if (validation.suggestions.length > 0) {
  console.info(`   💡 Suggestions: ${validation.suggestions.join(', ')}`);
}
console.info('');

// 3. Format in different output formats
console.info('3️⃣ Formatting in different formats...');
console.info(`   ISO: ${formatTimestamp(userTimestamp, 'iso')}`);
console.info(`   Human: ${formatTimestamp(userTimestamp, 'human')}`);
console.info(`   Custom: ${formatTimestamp(userTimestamp, 'custom')}`);
console.info(`   Unix: ${formatTimestamp(userTimestamp, 'unix')}`);
console.info(`   Relative: ${formatTimestamp(userTimestamp, 'relative')}\n`);

// 4. Convert to different formats
console.info('4️⃣ Converting to different formats...');
console.info(`   RFC2822: ${TimestampUtils.convertFormat(userTimestamp, 'rfc2822')}`);
console.info(`   Unix: ${TimestampUtils.convertFormat(userTimestamp, 'unix')}\n`);

// 5. Time calculations
console.info('5️⃣ Time calculations...');
const now = TimestampUtils.now();
console.info(`   Current time: ${now}`);
console.info(`   Is future: ${TimestampUtils.isFuture(userTimestamp)}`);
console.info(`   Is past: ${TimestampUtils.isPast(userTimestamp)}`);

const timeDiff = TimestampUtils.getTimeDifference(now, userTimestamp);
console.info(`   Time until timestamp: ${timeDiff.humanReadable}`);
console.info(`   Days: ${timeDiff.days}, Hours: ${timeDiff.hours}, Minutes: ${timeDiff.minutes}\n`);

// 6. Time manipulation
console.info('6️⃣ Time manipulation...');
const oneHourLater = TimestampUtils.addTime(userTimestamp, 1, 'hours');
console.info(`   One hour later: ${oneHourLater}`);
const oneDayLater = TimestampUtils.addTime(userTimestamp, 1, 'days');
console.info(`   One day later: ${oneDayLater}`);
const oneWeekLater = TimestampUtils.addTime(userTimestamp, 7, 'days');
console.info(`   One week later: ${oneWeekLater}\n`);

// 7. Business hours calculation
console.info('7️⃣ Business hours calculation...');
const businessHours = TimestampUtils.getBusinessHours(now, userTimestamp);
console.info(`   Business hours between now and timestamp: ${businessHours} hours\n`);

// 8. Test with other timestamp formats
console.info('8️⃣ Testing other timestamp formats...');
const testTimestamps = [
  '2025-08-25T20:05:00.000Z', // ISO
  '2025-08-25', // Date only
  '20:05:00.000', // Time only
  '1754004300', // Unix
  'Mon, 25 Aug 2025 20:05:00 +0000', // RFC2822
];

testTimestamps.forEach((ts, index) => {
  const info = parseTimestamp(ts);
  console.info(`   ${index + 1}. "${ts}" -> ${info.format} format, Valid: ${info.isValid}`);
});

console.info('\n🎉 Demo completed! The timestamp utility successfully parsed your timestamp:');
console.info(`   "${userTimestamp}" → ${parsed.relative}`);
console.info(
  `   This timestamp is ${parsed.isFuture ? 'in the future' : 'in the past'} and represents ${parsed.components.day} ${getMonthName(parsed.components.month)} ${parsed.components.year} at ${parsed.components.hour.toString().padStart(2, '0')}:${parsed.components.minute.toString().padStart(2, '0')} ${parsed.components.hour >= 12 ? 'PM' : 'AM'}`
);
console.info(
  `   It's ${timeDiff.days} days, ${timeDiff.hours} hours, and ${timeDiff.minutes} minutes from now.`
);

// Helper function for month names
function getMonthName(month: number): string {
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  return months[month - 1];
}

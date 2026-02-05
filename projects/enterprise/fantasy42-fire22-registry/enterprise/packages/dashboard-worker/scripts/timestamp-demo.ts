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

console.log('🕐 Fire22 Timestamp Utility Demo\n');

// Test with the user's timestamp
const userTimestamp = '2025-08-25 20:05:00.000';
console.log(`📅 Testing with timestamp: "${userTimestamp}"\n`);

// 1. Parse and analyze the timestamp
console.log('1️⃣ Parsing timestamp...');
const parsed = parseTimestamp(userTimestamp);
console.log('✅ Parsed successfully!');
console.log(`   Format detected: ${parsed.format}`);
console.log(`   Valid: ${parsed.isValid}`);
console.log(`   Date: ${parsed.parsed.toDateString()}`);
console.log(`   Time: ${parsed.parsed.toTimeString()}`);
console.log(`   Unix timestamp: ${parsed.unix}`);
console.log(`   ISO format: ${parsed.iso}`);
console.log(`   Human readable: ${parsed.humanReadable}`);
console.log(`   Relative: ${parsed.relative}`);
console.log(
  `   Components: ${parsed.components.year}-${parsed.components.month.toString().padStart(2, '0')}-${parsed.components.day.toString().padStart(2, '0')} ${parsed.components.hour.toString().padStart(2, '0')}:${parsed.components.minute.toString().padStart(2, '0')}:${parsed.components.second.toString().padStart(2, '0')}.${parsed.components.millisecond.toString().padStart(3, '0')}\n`
);

// 2. Validate the timestamp
console.log('2️⃣ Validating timestamp...');
const validation = validateTimestamp(userTimestamp);
console.log(`   Valid: ${validation.isValid}`);
console.log(`   Format: ${validation.format}`);
if (validation.errors.length > 0) {
  console.log(`   ❌ Errors: ${validation.errors.join(', ')}`);
}
if (validation.warnings.length > 0) {
  console.log(`   ⚠️  Warnings: ${validation.warnings.join(', ')}`);
}
if (validation.suggestions.length > 0) {
  console.log(`   💡 Suggestions: ${validation.suggestions.join(', ')}`);
}
console.log('');

// 3. Format in different output formats
console.log('3️⃣ Formatting in different formats...');
console.log(`   ISO: ${formatTimestamp(userTimestamp, 'iso')}`);
console.log(`   Human: ${formatTimestamp(userTimestamp, 'human')}`);
console.log(`   Custom: ${formatTimestamp(userTimestamp, 'custom')}`);
console.log(`   Unix: ${formatTimestamp(userTimestamp, 'unix')}`);
console.log(`   Relative: ${formatTimestamp(userTimestamp, 'relative')}\n`);

// 4. Convert to different formats
console.log('4️⃣ Converting to different formats...');
console.log(`   RFC2822: ${TimestampUtils.convertFormat(userTimestamp, 'rfc2822')}`);
console.log(`   Unix: ${TimestampUtils.convertFormat(userTimestamp, 'unix')}\n`);

// 5. Time calculations
console.log('5️⃣ Time calculations...');
const now = TimestampUtils.now();
console.log(`   Current time: ${now}`);
console.log(`   Is future: ${TimestampUtils.isFuture(userTimestamp)}`);
console.log(`   Is past: ${TimestampUtils.isPast(userTimestamp)}`);

const timeDiff = TimestampUtils.getTimeDifference(now, userTimestamp);
console.log(`   Time until timestamp: ${timeDiff.humanReadable}`);
console.log(`   Days: ${timeDiff.days}, Hours: ${timeDiff.hours}, Minutes: ${timeDiff.minutes}\n`);

// 6. Time manipulation
console.log('6️⃣ Time manipulation...');
const oneHourLater = TimestampUtils.addTime(userTimestamp, 1, 'hours');
console.log(`   One hour later: ${oneHourLater}`);
const oneDayLater = TimestampUtils.addTime(userTimestamp, 1, 'days');
console.log(`   One day later: ${oneDayLater}`);
const oneWeekLater = TimestampUtils.addTime(userTimestamp, 7, 'days');
console.log(`   One week later: ${oneWeekLater}\n`);

// 7. Business hours calculation
console.log('7️⃣ Business hours calculation...');
const businessHours = TimestampUtils.getBusinessHours(now, userTimestamp);
console.log(`   Business hours between now and timestamp: ${businessHours} hours\n`);

// 8. Test with other timestamp formats
console.log('8️⃣ Testing other timestamp formats...');
const testTimestamps = [
  '2025-08-25T20:05:00.000Z', // ISO
  '2025-08-25', // Date only
  '20:05:00.000', // Time only
  '1754004300', // Unix
  'Mon, 25 Aug 2025 20:05:00 +0000', // RFC2822
];

testTimestamps.forEach((ts, index) => {
  const info = parseTimestamp(ts);
  console.log(`   ${index + 1}. "${ts}" -> ${info.format} format, Valid: ${info.isValid}`);
});

console.log('\n🎉 Demo completed! The timestamp utility successfully parsed your timestamp:');
console.log(`   "${userTimestamp}" → ${parsed.relative}`);
console.log(
  `   This timestamp is ${parsed.isFuture ? 'in the future' : 'in the past'} and represents ${parsed.components.day} ${getMonthName(parsed.components.month)} ${parsed.components.year} at ${parsed.components.hour.toString().padStart(2, '0')}:${parsed.components.minute.toString().padStart(2, '0')} ${parsed.components.hour >= 12 ? 'PM' : 'AM'}`
);
console.log(
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

// scripts/verify-timezone-matrix.ts
import { $ } from 'bun';
import { TIMEZONE_MATRIX } from '../config/constants-v37';

export async function verifyTimezoneMatrix() {
  // Force UTC for reproducibility (like `bun test` does)
  process.env.TZ = 'UTC';
  
  const now = new Date();
  let failures = 0;
  
  console.log('🌍 Verifying TIMEZONE_MATRIX v3.7 baseline...\n');
  
  for (const [zone, expectedOffset] of Object.entries(TIMEZONE_MATRIX.BASELINE_OFFSETS)) {
    // Get timezone abbreviation/offset
    const localeString = now.toLocaleString('en-US', { 
      timeZone: zone, 
      timeZoneName: 'short' 
    });
    
    // Extract timezone name (last part of the string)
    const parts = localeString.split(' ');
    const timeZoneName = parts[parts.length - 1];
    
    // Normalize offset (GMT → ±, handle abbreviations and variety of toLocaleString outputs)
    let normalized = '';
    
    // 1. Try to extract explicit offset using regex: (GMT+01:00), (GMT-05), etc.
    const offsetMatch = timeZoneName.match(/([+-])(\d{1,2})(?::?(\d{2}))?/);
    if (offsetMatch) {
      const [_, sign, hours, minutes] = offsetMatch;
      normalized = `${sign}${hours.padStart(2, '0')}:${minutes || '00'}`;
    } else {
      // 2. Fallback to abbreviation mapping if no numeric offset found
      const abbreviationMap: Record<string, string> = {
        'EST': '-05:00',
        'CST': '-06:00', // America/Chicago (Standard)
        'MST': '-07:00',
        'PST': '-08:00',
        'GMT': '+00:00',
        'UTC': '+00:00',
        'BST': '+01:00',
        'CET': '+01:00',
        'JST': '+09:00',
        'HKT': '+08:00',
        'AEDT': '+11:00'
      };
      normalized = abbreviationMap[timeZoneName] || '+00:00';
    }
    
    if (normalized !== expectedOffset) {
      console.error(`❌ ${zone}: expected ${expectedOffset}, got ${normalized}`);
      failures++;
    } else {
      console.log(`✅ ${zone}: ${normalized}`);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  
  if (failures > 0) {
    throw new Error(`Timezone verification failed: ${failures} zones`);
  }
  
  console.log('🌍 TIMEZONE_MATRIX v3.7 baseline verified in UTC mode');
}

// Run with: TZ=UTC bun run scripts/verify-timezone-matrix.ts

// Run verification if called directly
if (import.meta.main) {
  verifyTimezoneMatrix().catch(console.error);
}
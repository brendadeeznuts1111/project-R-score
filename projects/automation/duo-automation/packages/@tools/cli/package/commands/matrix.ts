#!/usr/bin/env bun
// cli/commands/matrix.ts

import { DesignSystem } from '../../../terminal/src/design-system';
import { UnicodeTableFormatter, EmpireProDashboard } from '../../../terminal/src/enhanced-unicode-formatter';

async function main() {
  console.log(EmpireProDashboard.generateHeader(
    'DUOPLUS MATRIX - NATIVE UNICODE FORMATTER',
    'Using our native UnicodeTableFormatter with Empire Pro colors'
  ));

  // Use native test data instead of external parsing
  const data = [
    {
      Component: 'TimeSeries Aggregator',
      Status: 'operational',
      Version: '4.2.0',
      Health: '99.9%',
      Performance: '<30ms',
      Type: 'DuoPlus',
      Integration: 'Complete'
    },
    {
      Component: 'Agent Isolator',
      Status: 'operational',
      Version: '4.2.0',
      Health: '100%',
      Performance: '<25ms',
      Type: 'Empire Pro',
      Integration: 'Active'
    },
    {
      Component: 'Performance Tracker',
      Status: 'degraded',
      Version: '4.2.0-beta',
      Health: '95%',
      Performance: '~45ms',
      Type: 'Empire Pro',
      Integration: 'In Progress'
    },
    {
      Component: 'Container Manager',
      Status: 'operational',
      Version: '4.2.0',
      Health: '98%',
      Performance: '<35ms',
      Type: 'DuoPlus',
      Integration: 'Ready'
    }
  ];

  if (data.length === 0) {
    console.log(UnicodeTableFormatter.colorize('❌ No data available', DesignSystem.status.downtime));
    process.exit(1);
  }

  console.log(UnicodeTableFormatter.colorize(`📂 Generated ${data.length} entries with native UnicodeTableFormatter`, DesignSystem.text.accent.blue));
  
  // Display using our native UnicodeTableFormatter
  console.log(UnicodeTableFormatter.generateTable(data, { maxWidth: 120 }));
  
  console.log(EmpireProDashboard.generateFooter());
}

main().catch(err => {
  console.error(UnicodeTableFormatter.colorize(`❌ Fatal Error: ${err.message}`, DesignSystem.status.downtime));
  process.exit(1);
});

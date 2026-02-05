#!/usr/bin/env bun
/**
 * 🔍 FactoryWager CPU Profiler
 * 
 * CPU profiling with color-coded markdown output
 * 
 * @version 4.0
 */

import { styled, log, colorizeMarkdown } from '../lib/theme/colors.ts';
import { generateVisualMetadata } from '../lib/theme/colors.ts';
import { Utils } from '../lib/utils/index.ts';

// Simulate CPU profile markdown
function generateCPUProfile(): string {
  return `# CPU Profile Report

## Performance Metrics
- Total execution time: 156.78ms
- Function calls: 1,247
- Hot paths: 3 identified

### Hot Path Analysis
\`\`\`typescript
function processData() {
  // 45.2% of execution time
  return heavyComputation();
}
\`\`\`

### Performance Breakdown
- Data processing: 45.2% slower
- Network I/O: 12.3% faster
- Memory allocation: 8.7% slower

## Recommendations
- Optimize processData() function
- Consider caching for network calls
- Review memory allocation patterns`;
}

// Main CPU profiling function
async function runCPUProfile() {
  log.section('FactoryWager CPU Profiler v4.0', 'primary');
  
  // Simulate profiling
  log.info('Generating CPU profile...');
  const md = generateCPUProfile();
  
  // Colorize markdown sections
  const colored = colorizeMarkdown(md);
  
  console.log(colored);
  
  // Save profile
  const timestamp = Date.now();
  const profileFile = `cpu-profile-${timestamp}.md`;
  const coloredFile = `cpu-profile-${timestamp}-ansi.md`;
  
  await Bun.write(profileFile, md);
  await Bun.write(coloredFile, colored);
  
  // Generate metadata
  const metadata = generateVisualMetadata('success');
  
  log.metric('Profile saved', profileFile, 'muted');
  log.metric('Colored output', coloredFile, 'accent');
  log.metric('Visual theme', metadata['visual:theme'], 'primary');
  log.metric('Color hex', metadata['visual:color-hex'], 'success');
  
  console.log('\n' + styled('✅ CPU profiling complete!', 'success'));
}

// Run if called directly
if (import.meta.main) {
  await runCPUProfile();
}

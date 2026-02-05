// packages/odds-core/src/standards/rules/track-api-usage-rule.ts
import type { RuleViolation } from '../rule-enforcement.js';
import { createViolation } from './rule-helper.js';

export class TrackAPIUsageRule {
  name = 'Track API Usage';
  description = 'All Bun API calls should be tracked for monitoring and optimization';

  private readonly bunAPIs = [
    'Bun.serve',
    'Bun.SQL',
    'Bun.Redis',
    'Bun.YAML',
    'Bun.zstdCompress',
    'Bun.zstdDecompress',
    'Bun.CSRF',
    'Bun.hash.rapidhash',
    'Bun.stripANSI',
    'Bun.file',
    'Bun.build',
    'Bun.spawn',
    'Bun.gzipSync',
    'Bun.gunzipSync',
    'Bun.deflateSync',
    'Bun.inflateSync',
    'Bun.stringWidth',
    'Bun.escapeHTML',
    'Bun.deepEquals',
    'Bun.sleep',
    'Bun.peek'
  ];

  async validate(file: string, content: string): Promise<RuleViolation[]> {
    const violations: RuleViolation[] = [];
    const lines = content.split('\n');

    // Check if file has API tracker import
    const hasTrackerImport = content.includes('apiTracker') || 
                            content.includes('from \'../monitoring/api-tracker\'') ||
                            content.includes('from \'./monitoring/api-tracker\'');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      for (const api of this.bunAPIs) {
        if (line.includes(api) && !line.includes('apiTracker.track') && !line.includes('//') && !line.includes("'")) {
          violations.push(createViolation(
            this.name,
            file,
            `Untracked Bun API call: ${api}`,
            hasTrackerImport ? 'warning' : 'error',
            i + 1,
            `Wrap with apiTracker.track('${api}', () => { ... })` 
          ));
        }
      }
    }

    return violations;
  }
}

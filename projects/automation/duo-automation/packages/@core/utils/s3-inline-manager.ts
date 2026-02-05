// utils/s3-inline-manager.ts (New Accuracy - Grapheme/ANSI Dashboard Integration)
import { stringWidth } from 'bun';
import { emojiAlignedTable } from './super-table.ts';
import { BunR2AppleManager } from '../src/storage/r2-apple-manager.ts';

/**
 * Manages high-accuracy inline previews for the dashboard.
 * Verified: 🇺🇸=2, ZWJ=2, OSC 8 Hyperlinks supported.
 */
export class S3InlineManager {
  private manager: BunR2AppleManager;

  constructor() {
    this.manager = new BunR2AppleManager();
  }

  /**
   * Generates and displays a high-accuracy metadata preview.
   * Perfect alignment for Empire Pro dashboards.
   */
  async displayInlineDashboard() {
    console.log('\n🚀 Empire Inline Dashboard Status:');
    
    // Get demo metadata with emoji/links
    const metadata = this.manager.generateDemoMetadata();
    const publicDomain = Bun.env.R2_PUBLIC_DOMAIN || 'https://pub-dc0e1ef5dd2245be81d6670a9b7b1550.r2.dev';
    
    const tableData = [
      { Metric: 'Emoji Preview', Value: metadata.emoji_preview, Width: stringWidth(metadata.emoji_preview) },
      { Metric: 'Zero Width', Value: metadata.zero_width_test, Width: stringWidth(metadata.zero_width_test) },
      { Metric: 'Hyperlink', Value: metadata.ansi_hyperlink, Width: stringWidth('Click to R2') },
      { Metric: 'Performance', Value: `\u001b[32m${metadata.perf_gain}\u001b[0m`, Width: stringWidth(metadata.perf_gain) },
      { Metric: 'System Status', Value: metadata.status, Width: stringWidth(metadata.status) }
    ];

    emojiAlignedTable(tableData, ['Metric', 'Value', 'Width']);
    
    console.log('\n🔗 Dashboard OSC 8 Test:');
    console.log(`\u001b]8;;${publicDomain}\u001b\\Click to verify R2 Connection\u001b[0m`);
  }
}

// Small runner for standalone check
if (import.meta.main) {
  const inlineManager = new S3InlineManager();
  await inlineManager.displayInlineDashboard();
}

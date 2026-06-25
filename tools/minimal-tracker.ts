#!/usr/bin/env bun
// tools/minimal-tracker.ts — Minimal Bun plugin for file tracking

import { plugin } from 'bun';

plugin({
  name: 'minimal tracker',
  setup(build) {
    let fileCount = 0;

    // Count all files
    build.onLoad({ filter: /\.(ts|js)$/ }, () => {
      fileCount++;
      console.info(`📁 File #${fileCount} processed`);
      return undefined;
    });

    // Generate report using defer()
    build.onLoad({ filter: /report\.ts$/ }, async ({ defer }) => {
      console.info(`📊 Report requested - current count: ${fileCount}`);
      await defer();
      console.info(`✅ Defer resolved - final count: ${fileCount}`);

      return {
        contents: `
console.info('🎯 FINAL REPORT');
console.info('Total files processed:', ${fileCount});
        `,
        loader: 'ts',
      };
    });
  },
});

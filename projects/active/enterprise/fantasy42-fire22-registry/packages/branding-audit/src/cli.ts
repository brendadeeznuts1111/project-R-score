#!/usr/bin/env bun

/**
 * 🎨 Fire22 Branding Audit CLI
 *
 * Command-line interface for the Fire22 Branding Audit Toolkit
 */

import { BrandingAuditCLI } from './index';

const cli = new BrandingAuditCLI();

cli.run().catch((error: Error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});

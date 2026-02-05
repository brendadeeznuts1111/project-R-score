#!/usr/bin/env bun

/**
 * 🚀 Fire22 Registry R2 Upload Script
 *
 * Uploads audited dashboards and design artifacts to R2 registry
 * Generated from branding audit results
 */

import { BunR2Client } from './src/utils/bun-r2-client.ts';

const r2Client = new BunR2Client({
  endpoint: process.env.R2_ENDPOINT || '',
  accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  region: process.env.R2_REGION || 'auto',
  bucket: process.env.R2_BUCKET || 'fire22-registry',
});

const DASHBOARDS_TO_UPLOAD = [
  {
    file: 'dashboard-integration.html',
    key: 'dashboards/dashboard-integration.html',
    compliance: 40,
    criticalIssues: 1,
    metadata: {
      'compliance-score': '40',
      'audit-date': '2025-08-30T08:51:50.147Z',
      'critical-issues': '1',
      'branding-compliant': 'false',
    },
  },
  {
    file: 'src/index.html',
    key: 'dashboards/index.html',
    compliance: 60,
    criticalIssues: 0,
    metadata: {
      'compliance-score': '60',
      'audit-date': '2025-08-30T08:51:50.147Z',
      'critical-issues': '0',
      'branding-compliant': 'true',
    },
  },
  {
    file: 'analytics/index.html',
    key: 'dashboards/index.html',
    compliance: 60,
    criticalIssues: 1,
    metadata: {
      'compliance-score': '60',
      'audit-date': '2025-08-30T08:51:50.147Z',
      'critical-issues': '1',
      'branding-compliant': 'false',
    },
  },
  {
    file: 'analytics/test-initialization.html',
    key: 'dashboards/test-initialization.html',
    compliance: 40,
    criticalIssues: 0,
    metadata: {
      'compliance-score': '40',
      'audit-date': '2025-08-30T08:51:50.147Z',
      'critical-issues': '0',
      'branding-compliant': 'true',
    },
  },
  {
    file: 'analytics/performance-test-dashboard.html',
    key: 'dashboards/performance-test-dashboard.html',
    compliance: 40,
    criticalIssues: 1,
    metadata: {
      'compliance-score': '40',
      'audit-date': '2025-08-30T08:51:50.147Z',
      'critical-issues': '1',
      'branding-compliant': 'false',
    },
  },
  {
    file: 'analytics/test-security.html',
    key: 'dashboards/test-security.html',
    compliance: 60,
    criticalIssues: 0,
    metadata: {
      'compliance-score': '60',
      'audit-date': '2025-08-30T08:51:50.147Z',
      'critical-issues': '0',
      'branding-compliant': 'true',
    },
  },
  {
    file: 'analytics/performance-dashboard.html',
    key: 'dashboards/performance-dashboard.html',
    compliance: 80,
    criticalIssues: 0,
    metadata: {
      'compliance-score': '80',
      'audit-date': '2025-08-30T08:51:50.147Z',
      'critical-issues': '0',
      'branding-compliant': 'true',
    },
  },
  {
    file: 'testing/workbench/fantasy402-workbench.html',
    key: 'dashboards/fantasy402-workbench.html',
    compliance: 60,
    criticalIssues: 0,
    metadata: {
      'compliance-score': '60',
      'audit-date': '2025-08-30T08:51:50.147Z',
      'critical-issues': '0',
      'branding-compliant': 'true',
    },
  },
  {
    file: 'docs/index.html',
    key: 'dashboards/index.html',
    compliance: 40,
    criticalIssues: 1,
    metadata: {
      'compliance-score': '40',
      'audit-date': '2025-08-30T08:51:50.147Z',
      'critical-issues': '1',
      'branding-compliant': 'false',
    },
  },
  {
    file: 'docs/brand-style-guide.html',
    key: 'dashboards/brand-style-guide.html',
    compliance: 40,
    criticalIssues: 0,
    metadata: {
      'compliance-score': '40',
      'audit-date': '2025-08-30T08:51:50.147Z',
      'critical-issues': '0',
      'branding-compliant': 'true',
    },
  },
];

async function uploadDashboards() {
  console.log('🚀 Starting Fire22 Registry Upload...');
  console.log('📊 Dashboard Compliance Summary:');
  console.log('=====================================');

  console.log('📄 dashboard-integration.html: 40% (1 critical, 2 major, 0 minor)');
  console.log('📄 src/index.html: 60% (0 critical, 2 major, 0 minor)');
  console.log('📄 analytics/index.html: 60% (1 critical, 1 major, 0 minor)');
  console.log('📄 analytics/test-initialization.html: 40% (0 critical, 3 major, 0 minor)');
  console.log('📄 analytics/performance-test-dashboard.html: 40% (1 critical, 2 major, 0 minor)');
  console.log('📄 analytics/test-security.html: 60% (0 critical, 2 major, 0 minor)');
  console.log('📄 analytics/performance-dashboard.html: 80% (0 critical, 1 major, 0 minor)');
  console.log('📄 testing/workbench/fantasy402-workbench.html: 60% (0 critical, 2 major, 0 minor)');
  console.log('📄 docs/index.html: 40% (1 critical, 2 major, 0 minor)');
  console.log('📄 docs/brand-style-guide.html: 40% (0 critical, 2 major, 1 minor)');

  console.log('\n📤 Uploading dashboards to R2...');

  for (const dashboard of DASHBOARDS_TO_UPLOAD) {
    try {
      const content = await Bun.file(dashboard.file).arrayBuffer();
      const uploadResult = await r2Client.putObject(dashboard.key, content, {
        contentType: 'text/html',
        metadata: dashboard.metadata,
        cacheControl: 'public, max-age=3600',
      });

      if (uploadResult.ok) {
        console.log('✅ Uploaded:', dashboard.key);
      } else {
        console.log('❌ Failed to upload:', dashboard.key);
      }
    } catch (error) {
      console.error('❌ Upload error for', dashboard.key, ':', error.message);
    }
  }

  console.log('\n🎉 Registry upload complete!');
  console.log('🔗 Access your dashboards at: https://registry.fire22.dev/dashboards/');
}

uploadDashboards().catch(console.error);

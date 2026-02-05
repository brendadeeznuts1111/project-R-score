#!/usr/bin/env bun
/**
 * Security Scan Runner
 * Runs a security scan and generates log files for the security report generator
 */

import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';

interface SecurityScanData {
  metadata: {
    timestamp: string;
    environment: string;
    triggeredBy: string;
    scanDuration: number;
    bunVersion: string;
  };
  results: {
    summary: {
      totalPackages: number;
      fatalIssues: number;
      warningIssues: number;
    };
    issues: Array<{
      package: string;
      version: string;
      severity: string;
      description: string;
      cve?: string;
    }>;
  };
  compliance: boolean;
}

// Ensure logs directory exists
const logDir = './logs/security';
if (!existsSync(logDir)) {
  mkdirSync(logDir, { recursive: true });
}

// Generate sample security scan data
function generateSampleScanData(): SecurityScanData {
  const packages = [
    { name: 'react', version: '18.2.0', issues: [] },
    {
      name: 'lodash',
      version: '4.17.10',
      issues: [
        {
          severity: 'fatal',
          description: 'Prototype pollution vulnerability',
          cve: 'CVE-2020-8203',
        },
      ],
    },
    {
      name: 'axios',
      version: '0.20.0',
      issues: [{ severity: 'warn', description: 'SSRF vulnerability', cve: 'CVE-2020-28168' }],
    },
    { name: 'typescript', version: '5.0.0', issues: [] },
    { name: 'express', version: '4.18.2', issues: [] },
  ];

  const issues = [];
  let fatalCount = 0;
  let warningCount = 0;

  for (const pkg of packages) {
    for (const issue of pkg.issues) {
      issues.push({
        package: pkg.name,
        version: pkg.version,
        severity: issue.severity,
        description: issue.description,
        cve: issue.cve,
      });

      if (issue.severity === 'fatal') fatalCount++;
      if (issue.severity === 'warn') warningCount++;
    }
  }

  return {
    metadata: {
      timestamp: new Date().toISOString(),
      environment: 'enterprise',
      triggeredBy: process.env.USER || 'system',
      scanDuration: Math.floor(Math.random() * 1000) + 500,
      bunVersion: '1.0.0',
    },
    results: {
      summary: {
        totalPackages: packages.length,
        fatalIssues: fatalCount,
        warningIssues: warningCount,
      },
      issues,
    },
    compliance: fatalCount === 0,
  };
}

// Generate multiple scan files for different dates
async function generateScanHistory(): Promise<void> {
  console.log('🔍 Generating security scan history...');

  const today = new Date();
  const scanFiles = [];

  // Generate scans for the last 7 days
  for (let i = 0; i < 7; i++) {
    const scanDate = new Date(today);
    scanDate.setDate(today.getDate() - i);

    const scanData = generateSampleScanData();
    scanData.metadata.timestamp = scanDate.toISOString();

    const filename = `security-scan-${scanDate.toISOString().split('T')[0]}.json`;
    const filepath = join(logDir, filename);

    await Bun.write(filepath, JSON.stringify(scanData, null, 2));
    scanFiles.push(filepath);

    console.log(`   ✅ Generated: ${filename}`);
  }

  console.log(`\n📊 Generated ${scanFiles.length} security scan files in ${logDir}`);
}

// Run the security scan generation
if (import.meta.main) {
  await generateScanHistory();
  console.log('\n🎉 Security scan data generation complete!');
  console.log('   You can now run: bun run security-report');
}

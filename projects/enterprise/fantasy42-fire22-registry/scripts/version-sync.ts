#!/usr/bin/env bun

/**
 * Version Synchronization Script
 * Ensures all components use consistent versioning
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface VersionReport {
  main: string;
  dashboard: string;
  bunfig: {
    dashboard: string;
    domains: Record<string, string>;
    architecture: Record<string, string>;
  };
  conflicts: string[];
  recommendations: string[];
}

class VersionSyncManager {
  private mainPackagePath = join(process.cwd(), 'package.json');
  private dashboardPackagePath = join(process.cwd(), 'dashboard-worker/package.json');
  private bunfigPath = join(process.cwd(), 'bunfig.toml');

  async auditVersions(): Promise<VersionReport> {
    const report: VersionReport = {
      main: '',
      dashboard: '',
      bunfig: {
        dashboard: '',
        domains: {},
        architecture: {},
      },
      conflicts: [],
      recommendations: [],
    };

    try {
      // Read main package version
      const mainPkg = JSON.parse(readFileSync(this.mainPackagePath, 'utf-8'));
      report.main = mainPkg.version;

      // Read dashboard package version
      const dashboardPkg = JSON.parse(readFileSync(this.dashboardPackagePath, 'utf-8'));
      report.dashboard = dashboardPkg.version;

      // Read bunfig versions
      const bunfigContent = readFileSync(this.bunfigPath, 'utf-8');

      // Extract DASHBOARD_VERSION
      const dashboardMatch = bunfigContent.match(/DASHBOARD_VERSION\s*=\s*["']([^"']+)["']/);
      if (dashboardMatch) {
        report.bunfig.dashboard = dashboardMatch[1];
      }

      // Extract domain versions
      const domainSection = bunfigContent.match(/\[version\.domains\]([\s\S]*?)(?=\[|$)/);
      if (domainSection) {
        const domainMatches = domainSection[1].matchAll(/(\w+)\s*=\s*["']([^"']+)["']/g);
        for (const match of domainMatches) {
          report.bunfig.domains[match[1]] = match[2];
        }
      }

      // Extract architecture versions
      const archSection = bunfigContent.match(/\[version\.architecture\]([\s\S]*?)(?=\[|$)/);
      if (archSection) {
        const archMatches = archSection[1].matchAll(/(\w+)\s*=\s*["']([^"']+)["']/g);
        for (const match of archMatches) {
          report.bunfig.architecture[match[1]] = match[2];
        }
      }

      // Analyze conflicts
      this.analyzeConflicts(report);

      return report;
    } catch (error) {
      console.error('Error auditing versions:', error);
      throw error;
    }
  }

  private analyzeConflicts(report: VersionReport): void {
    // Check dashboard version mismatch
    if (report.dashboard !== report.main) {
      report.conflicts.push(
        `Dashboard worker version (${report.dashboard}) doesn't match main version (${report.main})`
      );
      report.recommendations.push(`Update dashboard-worker/package.json version to ${report.main}`);
    }

    // Check bunfig dashboard version
    if (report.bunfig.dashboard !== report.main) {
      report.conflicts.push(
        `Bunfig DASHBOARD_VERSION (${report.bunfig.dashboard}) doesn't match main version (${report.main})`
      );
      report.recommendations.push(`Update DASHBOARD_VERSION in bunfig.toml to ${report.main}`);
    }

    // Check domain versions
    for (const [domain, version] of Object.entries(report.bunfig.domains)) {
      if (version !== report.main && !version.includes('testing')) {
        report.conflicts.push(
          `Domain ${domain} version (${version}) doesn't match main version (${report.main})`
        );
      }
    }

    // Check architecture versions
    for (const [component, version] of Object.entries(report.bunfig.architecture)) {
      if (version !== report.main) {
        report.conflicts.push(
          `Architecture ${component} version (${version}) doesn't match main version (${report.main})`
        );
      }
    }
  }

  async syncVersions(targetVersion?: string): Promise<void> {
    const report = await this.auditVersions();

    if (targetVersion) {
      report.main = targetVersion;
    }

    console.log('🔄 Synchronizing versions to:', report.main);

    // Update dashboard package.json
    if (report.dashboard !== report.main) {
      const dashboardPkg = JSON.parse(readFileSync(this.dashboardPackagePath, 'utf-8'));
      dashboardPkg.version = report.main;
      writeFileSync(this.dashboardPackagePath, JSON.stringify(dashboardPkg, null, 2));
      console.log('✅ Updated dashboard-worker/package.json');
    }

    // Update bunfig.toml
    let bunfigContent = readFileSync(this.bunfigPath, 'utf-8');

    // Update DASHBOARD_VERSION
    bunfigContent = bunfigContent.replace(
      /DASHBOARD_VERSION\s*=\s*["'][^"']*["']/,
      `DASHBOARD_VERSION = "${report.main}"`
    );

    // Update domain versions (skip testing versions)
    for (const [domain, version] of Object.entries(report.bunfig.domains)) {
      if (!version.includes('testing')) {
        const regex = new RegExp(`${domain}\\s*=\\s*["'][^"']*["']`, 'g');
        bunfigContent = bunfigContent.replace(regex, `${domain} = "${report.main}"`);
      }
    }

    // Update architecture versions
    for (const [component] of Object.entries(report.bunfig.architecture)) {
      const regex = new RegExp(`${component}\\s*=\\s*["'][^"']*["']`, 'g');
      bunfigContent = bunfigContent.replace(regex, `${component} = "${report.main}"`);
    }

    writeFileSync(this.bunfigPath, bunfigContent);
    console.log('✅ Updated bunfig.toml');

    console.log('🎉 Version synchronization complete!');
  }

  async generateReport(): Promise<void> {
    const report = await this.auditVersions();

    console.log('\n📊 Version Audit Report');
    console.log('=======================');

    console.log(`Main Package: ${report.main}`);
    console.log(`Dashboard Worker: ${report.dashboard}`);
    console.log(`Bunfig Dashboard: ${report.bunfig.dashboard}`);

    console.log('\n📦 Domain Versions:');
    Object.entries(report.bunfig.domains).forEach(([domain, version]) => {
      console.log(`  ${domain}: ${version}`);
    });

    console.log('\n🏗️ Architecture Versions:');
    Object.entries(report.bunfig.architecture).forEach(([component, version]) => {
      console.log(`  ${component}: ${version}`);
    });

    if (report.conflicts.length > 0) {
      console.log('\n❌ Conflicts Found:');
      report.conflicts.forEach(conflict => console.log(`  • ${conflict}`));
    }

    if (report.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      report.recommendations.forEach(rec => console.log(`  • ${rec}`));
    }

    const status =
      report.conflicts.length === 0
        ? '✅ All versions synchronized'
        : '⚠️ Version conflicts detected';
    console.log(`\n${status}`);
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'report';

  const manager = new VersionSyncManager();

  switch (command) {
    case 'audit':
    case 'report':
      await manager.generateReport();
      break;

    case 'sync':
      const targetVersion = args[1];
      await manager.syncVersions(targetVersion);
      break;

    case 'fix':
      await manager.syncVersions();
      break;

    default:
      console.log('Usage:');
      console.log('  bun run scripts/version-sync.ts report  # Show version report');
      console.log('  bun run scripts/version-sync.ts sync [version]  # Sync to specific version');
      console.log('  bun run scripts/version-sync.ts fix     # Fix conflicts automatically');
      break;
  }
}

if (import.meta.main) {
  main().catch(console.error);
}

export { VersionSyncManager };

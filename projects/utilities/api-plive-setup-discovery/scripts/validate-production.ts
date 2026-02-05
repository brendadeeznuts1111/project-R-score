#!/usr/bin/env bun

/**
 * Production Readiness Validation Script
 * Validates that the deployment is ready for production
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

interface ValidationResult {
  category: string;
  check: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: string;
}

class ProductionValidator {
  private results: ValidationResult[] = [];

  private checkFile(filePath: string, description: string): void {
    const exists = existsSync(filePath);
    this.results.push({
      category: 'Configuration',
      check: `File exists: ${description}`,
      status: exists ? 'pass' : 'fail',
      message: exists ? `${description} found` : `${description} missing`,
      details: filePath,
    });
  }

  private checkDocker(): void {
    try {
      execSync('docker --version', { stdio: 'pipe' });
      execSync('docker-compose --version', { stdio: 'pipe' });
      this.results.push({
        category: 'Docker',
        check: 'Docker and Docker Compose available',
        status: 'pass',
        message: 'Docker environment ready',
      });
    } catch (error) {
      this.results.push({
        category: 'Docker',
        check: 'Docker and Docker Compose available',
        status: 'fail',
        message: 'Docker not available',
        details: 'Install Docker and Docker Compose',
      });
    }
  }

  private checkBunVersion(): void {
    try {
      const version = execSync('bun --version', { encoding: 'utf8' }).trim();
      const isValid = version.startsWith('1.3');
      this.results.push({
        category: 'Runtime',
        check: 'Bun 1.3.x installed',
        status: isValid ? 'pass' : 'fail',
        message: `Bun version: ${version}`,
        details: isValid ? 'Compatible version' : 'Requires Bun 1.3.x',
      });
    } catch (error) {
      this.results.push({
        category: 'Runtime',
        check: 'Bun 1.3.x installed',
        status: 'fail',
        message: 'Bun not found',
        details: 'Install Bun 1.3.x',
      });
    }
  }

  private checkSystemResources(): void {
    try {
      // Check CPU cores
      const cpuCores = parseInt(execSync('nproc', { encoding: 'utf8' }).trim());
      const cpuStatus = cpuCores >= 2 ? 'pass' : 'warning';
      this.results.push({
        category: 'System',
        check: 'CPU cores',
        status: cpuStatus,
        message: `${cpuCores} cores available`,
        details: cpuCores >= 2 ? 'Sufficient for production' : 'Consider upgrading for better performance',
      });

      // Check memory
      const memGb = parseFloat(execSync('free -g | awk \'NR==2{printf "%.0f", $2}\'', { encoding: 'utf8' }));
      const memStatus = memGb >= 4 ? 'pass' : 'warning';
      this.results.push({
        category: 'System',
        check: 'Memory',
        status: memStatus,
        message: `${memGb}GB RAM available`,
        details: memGb >= 4 ? 'Sufficient for production' : 'Consider adding more RAM',
      });

      // Check disk space
      const diskFree = parseFloat(execSync('df / | tail -1 | awk \'{print $4}\'', { encoding: 'utf8' })) / 1024 / 1024;
      const diskStatus = diskFree >= 10 ? 'pass' : 'warning';
      this.results.push({
        category: 'System',
        check: 'Disk space',
        status: diskStatus,
        message: `${diskFree.toFixed(1)}GB free space`,
        details: diskFree >= 10 ? 'Sufficient disk space' : 'Low disk space may cause issues',
      });
    } catch (error) {
      this.results.push({
        category: 'System',
        check: 'System resources',
        status: 'fail',
        message: 'Could not check system resources',
        details: error.message,
      });
    }
  }

  private checkNetworkConnectivity(): void {
    // This would check if required ports are available
    const ports = [3000, 8080, 9090, 5432, 6379, 3001, 9091];
    for (const port of ports) {
      try {
        execSync(`lsof -i :${port}`, { stdio: 'pipe' });
        this.results.push({
          category: 'Network',
          check: `Port ${port} availability`,
          status: 'warning',
          message: `Port ${port} may be in use`,
          details: 'Check if service is already running',
        });
      } catch (error) {
        this.results.push({
          category: 'Network',
          check: `Port ${port} availability`,
          status: 'pass',
          message: `Port ${port} is available`,
        });
      }
    }
  }

  private checkSecurity(): void {
    // Check if secrets directory exists
    const secretsDir = existsSync('secrets');
    this.results.push({
      category: 'Security',
      check: 'Secrets directory',
      status: secretsDir ? 'pass' : 'warning',
      message: secretsDir ? 'Secrets directory exists' : 'Secrets directory missing',
      details: secretsDir ? undefined : 'Run deployment script to generate secrets',
    });

    // Check environment file
    const envFile = existsSync('.env.production');
    this.results.push({
      category: 'Security',
      check: 'Production environment file',
      status: envFile ? 'pass' : 'warning',
      message: envFile ? 'Environment file exists' : 'Environment file missing',
      details: envFile ? undefined : 'Run deployment script to generate environment',
    });
  }

  private checkConfiguration(): void {
    // Check required configuration files
    const configFiles = [
      { path: 'docker-compose.production-validated.yml', desc: 'Docker Compose production config' },
      { path: 'Dockerfile.production-validated', desc: 'Production Dockerfile' },
      { path: 'nginx/nginx.conf', desc: 'Nginx configuration' },
      { path: 'monitoring/prometheus.yml', desc: 'Prometheus configuration' },
      { path: 'monitoring/grafana/dashboards/betting-platform-performance.json', desc: 'Grafana dashboard' },
    ];

    for (const file of configFiles) {
      this.checkFile(file.path, file.desc);
    }
  }

  public async validate(): Promise<ValidationResult[]> {
    console.log('🔍 Validating production readiness...');

    this.checkConfiguration();
    this.checkDocker();
    this.checkBunVersion();
    this.checkSystemResources();
    this.checkNetworkConnectivity();
    this.checkSecurity();

    return this.results;
  }

  public printResults(results: ValidationResult[]): void {
    const categories = [...new Set(results.map(r => r.category))];

    console.log('\n🏭 Production Readiness Validation Results');
    console.log('='.repeat(60));

    let totalChecks = 0;
    let passedChecks = 0;
    let warningChecks = 0;
    let failedChecks = 0;

    for (const category of categories) {
      console.log(`\n📂 ${category}:`);
      const categoryResults = results.filter(r => r.category === category);

      for (const result of categoryResults) {
        totalChecks++;
        let icon = '';
        switch (result.status) {
          case 'pass':
            icon = '✅';
            passedChecks++;
            break;
          case 'warning':
            icon = '⚠️ ';
            warningChecks++;
            break;
          case 'fail':
            icon = '❌';
            failedChecks++;
            break;
        }

        console.log(`  ${icon} ${result.check}: ${result.message}`);
        if (result.details) {
          console.log(`    💡 ${result.details}`);
        }
      }
    }

    console.log('\n📊 Summary:');
    console.log(`  Total checks: ${totalChecks}`);
    console.log(`  ✅ Passed: ${passedChecks}`);
    console.log(`  ⚠️  Warnings: ${warningChecks}`);
    console.log(`  ❌ Failed: ${failedChecks}`);

    const ready = failedChecks === 0 && warningChecks <= 2;
    console.log(`\n🎯 Production Ready: ${ready ? 'YES' : 'NO'}`);

    if (!ready) {
      console.log('\n🔧 Recommended actions:');
      results.filter(r => r.status !== 'pass').forEach(result => {
        console.log(`  - ${result.check}: ${result.details || result.message}`);
      });
    }
  }
}

async function main() {
  const validator = new ProductionValidator();
  const results = await validator.validate();
  validator.printResults(results);

  const failedChecks = results.filter(r => r.status === 'fail').length;
  process.exit(failedChecks > 0 ? 1 : 0);
}

export { ProductionValidator, ValidationResult };

if (import.meta.main) {
  main().catch(console.error);
}
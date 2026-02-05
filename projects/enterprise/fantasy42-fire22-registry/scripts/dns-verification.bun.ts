#!/usr/bin/env bun
/**
 * Fantasy42-Fire22 DNS Verification Suite
 * Comprehensive DNS record verification and health checking
 */

import { $ } from 'bun';

interface DNSRecord {
  type: string;
  name: string;
  expected: string;
  status?: '✅' | '❌' | '⏳';
  actual?: string;
  notes?: string;
}

interface VerificationResult {
  record: DNSRecord;
  success: boolean;
  responseTime: number;
  error?: string;
}

class DNSVerifier {
  private results: VerificationResult[] = [];

  async verifyRecord(record: DNSRecord): Promise<VerificationResult> {
    const startTime = Date.now();
    let success = false;
    let actual = '';
    let error = '';

    try {
      let command = '';
      let expectedValue = record.expected;

      switch (record.type) {
        case 'CNAME':
          command = `dig ${record.name} CNAME +short`;
          const cnameResult = await Bun.$`${command}`.quiet();
          actual = cnameResult.stdout?.toString().trim() || '';

          // Handle Cloudflare CNAME flattening for root domain
          if (record.name === 'apexodds.net' && record.expected.includes('pages.dev')) {
            success = actual.includes('github.io') || actual.includes('pages.dev');
          } else {
            success = actual === expectedValue;
          }
          break;

        case 'MX':
          command = `dig ${record.name} MX +short`;
          const mxResult = await Bun.$`${command}`.quiet();
          actual = mxResult.stdout?.toString().trim() || '';
          success = actual.includes(expectedValue.split(' ')[1]); // Check MX target
          break;

        case 'TXT':
          command = `dig ${record.name} TXT +short`;
          const txtResult = await Bun.$`${command}`.quiet();
          actual = txtResult.stdout?.toString().trim().replace(/"/g, '') || '';
          success = actual.includes(expectedValue.replace(/"/g, ''));
          break;

        case 'A':
          command = `dig ${record.name} A +short`;
          const aResult = await Bun.$`${command}`.quiet();
          actual = aResult.stdout?.toString().trim() || '';
          success = actual.length > 0; // Just check if we get any A record
          break;
      }

      if (!success && !error) {
        error = `Expected: ${expectedValue}, Got: ${actual || 'No response'}`;
      }
    } catch (err) {
      error = err.message;
      success = false;
    }

    const result: VerificationResult = {
      record: { ...record, status: success ? '✅' : '❌', actual },
      success,
      responseTime: Date.now() - startTime,
      error,
    };

    this.results.push(result);
    return result;
  }

  async verifyAllRecords(): Promise<void> {
    const records: DNSRecord[] = [
      // CNAME Records
      {
        type: 'CNAME',
        name: 'dev.apexodds.net',
        expected: 'fantasy42-fire22-dev.apexodds.workers.dev',
      },
      {
        type: 'CNAME',
        name: 'staging.apexodds.net',
        expected: 'fantasy42-fire22-staging.apexodds.workers.dev',
      },
      {
        type: 'CNAME',
        name: 'api.apexodds.net',
        expected: 'fantasy42-fire22-prod.apexodds.workers.dev',
      },
      {
        type: 'CNAME',
        name: 'registry.apexodds.net',
        expected: 'fantasy42-fire22-prod.apexodds.workers.dev',
      },
      { type: 'CNAME', name: 'docs.apexodds.net', expected: 'brendadeeznuts1111.github.io' },
      {
        type: 'CNAME',
        name: 'dashboard.apexodds.net',
        expected: 'fantasy42-fire22-prod.apexodds.workers.dev',
      },

      // MX Records
      { type: 'MX', name: 'apexodds.net', expected: 'route1.mx.cloudflare.net 58' },
      { type: 'MX', name: 'apexodds.net', expected: 'route2.mx.cloudflare.net 17' },
      { type: 'MX', name: 'apexodds.net', expected: 'route3.mx.cloudflare.net 91' },

      // TXT Records
      { type: 'TXT', name: 'apexodds.net', expected: 'v=spf1 include:_spf.mx.cloudflare.net ~all' },
      { type: 'TXT', name: '_dmarc.apexodds.net', expected: 'v=DMARC1; p=quarantine' },

      // Wildcard verification
      {
        type: 'CNAME',
        name: 'test-wildcard.apexodds.net',
        expected: 'fantasy42-fire22-prod.apexodds.workers.dev',
      },
    ];

    console.log(`🔍 Starting comprehensive DNS verification for apexodds.net`);
    console.log('═'.repeat(70));
    console.log(`Total records to verify: ${records.length}`);
    console.log('');

    for (const record of records) {
      console.log(`🔍 Verifying ${record.type} ${record.name}...`);
      const result = await this.verifyRecord(record);

      if (result.success) {
        console.log(`   ✅ ${record.type} ${record.name} - VERIFIED (${result.responseTime}ms)`);
        if (result.record.actual) {
          console.log(`      └─ ${result.record.actual}`);
        }
      } else {
        console.log(`   ❌ ${record.type} ${record.name} - FAILED (${result.responseTime}ms)`);
        console.log(`      ├─ Expected: ${record.expected}`);
        console.log(`      └─ Actual: ${result.record.actual || 'No response'}`);
        if (result.error) {
          console.log(`      └─ Error: ${result.error}`);
        }
      }
      console.log('');
    }

    this.printSummary();
  }

  async verifyHTTPConnectivity(): Promise<void> {
    console.log(`🌐 Verifying HTTP connectivity for subdomains`);
    console.log('═'.repeat(70));

    const subdomains = [
      'https://dev.apexodds.net',
      'https://staging.apexodds.net',
      'https://api.apexodds.net',
      'https://registry.apexodds.net',
      'https://docs.apexodds.net',
      'https://dashboard.apexodds.net',
    ];

    for (const url of subdomains) {
      try {
        console.log(`🔗 Testing ${url}...`);
        const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });

        if (response.ok) {
          console.log(`   ✅ ${url} - CONNECTED (${response.status})`);
          console.log(`      └─ Server: ${response.headers.get('server') || 'Unknown'}`);
        } else {
          console.log(`   ⚠️  ${url} - HTTP ${response.status}`);
        }
      } catch (error) {
        console.log(`   ❌ ${url} - FAILED`);
        console.log(`      └─ Error: ${error.message}`);
      }
      console.log('');
    }
  }

  async verifySSL(): Promise<void> {
    console.log(`🔒 Verifying SSL certificates`);
    console.log('═'.repeat(70));

    const domains = [
      'dev.apexodds.net',
      'staging.apexodds.net',
      'api.apexodds.net',
      'registry.apexodds.net',
      'docs.apexodds.net',
      'dashboard.apexodds.net',
    ];

    for (const domain of domains) {
      try {
        console.log(`🔐 Checking SSL for ${domain}...`);

        // Use openssl to check certificate
        const certCheck =
          await Bun.$`echo | openssl s_client -servername ${domain} -connect ${domain}:443 2>/dev/null | openssl x509 -noout -dates 2>/dev/null`.quiet();

        if (certCheck.stdout) {
          console.log(`   ✅ ${domain} - SSL VALID`);
          console.log(`      └─ Certificate details available`);
        } else {
          console.log(`   ⚠️  ${domain} - SSL check inconclusive`);
        }
      } catch (error) {
        console.log(`   ❌ ${domain} - SSL verification failed`);
        console.log(`      └─ Error: ${error.message}`);
      }
      console.log('');
    }
  }

  private printSummary(): void {
    console.log(`📊 DNS Verification Summary`);
    console.log('═'.repeat(70));

    const successful = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;
    const total = this.results.length;

    console.log(`Total Records: ${total}`);
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${((successful / total) * 100).toFixed(1)}%`);
    console.log('');

    if (failed > 0) {
      console.log(`❌ Failed Records:`);
      this.results
        .filter(r => !r.success)
        .forEach(result => {
          console.log(`   - ${result.record.type} ${result.record.name}`);
        });
      console.log('');
    }

    const avgResponseTime = this.results.reduce((sum, r) => sum + r.responseTime, 0) / total;
    console.log(`⏱️  Average Response Time: ${avgResponseTime.toFixed(0)}ms`);

    if (successful === total) {
      console.log(`\n🎉 All DNS records verified successfully!`);
      console.log(`🚀 Your domain apexodds.net is ready for production!`);
    } else {
      console.log(`\n⚠️  Some DNS records need attention.`);
      console.log(`💡 DNS changes may take up to 24 hours to propagate globally.`);
      console.log(`🔄 Run this verification again in a few hours if records were recently added.`);
    }
  }
}

async function showHelp() {
  console.log(`
🌐 Fantasy42-Fire22 DNS Verification Suite
Comprehensive DNS record verification and health checking

USAGE:
  bun run scripts/dns-verification.bun.ts <command>

COMMANDS:
  dns        Verify all DNS records
  http       Verify HTTP connectivity for all subdomains
  ssl        Verify SSL certificates for all domains
  all        Run complete verification (DNS + HTTP + SSL)
  help       Show this help

EXAMPLES:
  bun run scripts/dns-verification.bun.ts dns       # Verify DNS records
  bun run scripts/dns-verification.bun.ts http      # Check HTTP connectivity
  bun run scripts/dns-verification.bun.ts ssl       # Verify SSL certificates
  bun run scripts/dns-verification.bun.ts all       # Complete verification

VERIFICATION SCOPE:
- 6 CNAME records for subdomains
- 3 MX records for email routing
- 2 TXT records for email security
- 1 Wildcard CNAME verification
- HTTP connectivity for all subdomains
- SSL certificate validation

NOTES:
- DNS verification uses dig commands
- HTTP tests use fetch with 5-second timeout
- SSL verification uses openssl
- All tests are non-destructive and read-only
`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    await showHelp();
    return;
  }

  const verifier = new DNSVerifier();

  switch (command) {
    case 'dns':
      await verifier.verifyAllRecords();
      break;

    case 'http':
      await verifier.verifyHTTPConnectivity();
      break;

    case 'ssl':
      await verifier.verifySSL();
      break;

    case 'all':
      await verifier.verifyAllRecords();
      console.log('');
      await verifier.verifyHTTPConnectivity();
      console.log('');
      await verifier.verifySSL();
      break;

    default:
      console.error(`❌ Unknown command: ${command}`);
      await showHelp();
      break;
  }
}

// Run the verification suite
if (import.meta.main) {
  main().catch(console.error);
}

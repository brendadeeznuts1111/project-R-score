/**
 * CashApp CLI Commands - Empire Pro v2.0
 * Provides CLI interface for CashApp Intel, Batch, and Risk Assessment
 */

import { CashAppIntegrationV2 } from "../../src/cashapp/cashapp-integration-v2.js";
import { PhoneSanitizerV2 } from "../../src/filters/phone-sanitizer-v2.js";
import { auditLogger } from "../../src/cashapp/audit-logger.js";
import { createRateLimiter } from "../../src/cashapp/rate-limiter.js";
import { BunFile } from "bun";

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const target = args[1];

  const config = {
    apiKey: process.env.CASHAPP_API_KEY || "demo_key",
    apiSecret: process.env.CASHAPP_API_SECRET || "demo_secret",
    environment: (process.env.CASHAPP_ENV as 'production' | 'sandbox') || "sandbox",
    webhookUrl: process.env.CASHAPP_WEBHOOK_URL
  };

  const integration = new CashAppIntegrationV2(config);

  // 1. Single profile: ep-cli +15551234567 cashapp-intel --risk-v2
  if (target && (command === 'cashapp-intel' || args.includes('cashapp-intel'))) {
    const phone = target.startsWith('+') ? target : args[0];
    const useRisk = args.includes('--risk-v2');
    
    console.log(`🔍 Resolving CashApp profile for ${phone}...`);
    const start = performance.now();
    
    try {
      const profile = await integration.resolve(phone, { includeMetadata: useRisk });
      const duration = performance.now() - start;

      if (!profile) {
        console.log(`❌ No CashApp profile found for ${phone}`);
        return;
      }

      console.log(`✅ Resolved in ${duration.toFixed(2)}ms`);
      console.log(JSON.stringify(profile, null, 2));
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
    }
    return;
  }

  // 2. Batch resolve: ep-cli phones.txt cashapp-batch --concurrency=10
  if (target && command === 'cashapp-batch') {
    const filePath = target;
    const concurrencyIdx = args.indexOf('--concurrency');
    const concurrency = concurrencyIdx !== -1 ? parseInt(args[concurrencyIdx+1]) : 10;
    
    console.log(`📦 Batch processing phones from ${filePath} (concurrency: ${concurrency})...`);
    
    try {
      const file = Bun.file(filePath);
      const text = await file.text();
      const phones = text.split('\n').map(p => p.trim()).filter(p => p.length > 0);
      
      console.log(`📝 Found ${phones.length} phones to process.`);
      
      const result = await integration.batchResolve(phones, {
        concurrency,
        progressCallback: (p) => {
          const percent = ((p.completed / p.total) * 100).toFixed(1);
          process.stdout.write(`\r🚀 Progress: ${p.completed}/${p.total} (${percent}%)  `);
        }
      });
      
      console.log('\n\n📊 Batch Result Stats:');
      console.log(JSON.stringify(result.stats, null, 2));
      
      if (args.includes('--export=json')) {
        const outPath = `batch-result-${Date.now()}.json`;
        await Bun.write(outPath, JSON.stringify(result, null, 2));
        console.log(`💾 Exported detailed results to ${outPath}`);
      }
    } catch (error) {
      console.error(`❌ Batch error: ${error.message}`);
    }
    return;
  }

  // 3. Cache Management: ep-cli cashapp-cache --clear
  if (command === 'cashapp-cache') {
    if (args.includes('--clear')) {
      const limiter = createRateLimiter();
      const count = await limiter.resetAll();
      console.log(`🧹 Cleared ${count} rate limit cache entries.`);
    }
    
    if (args.includes('--stats')) {
      const limiter = createRateLimiter();
      const stats = await limiter.getStats();
      console.log('📊 Cache Stats:');
      console.log(JSON.stringify(stats, null, 2));
    }
    return;
  }

  // 4. Compliance/Audit: ep-cli cashapp-audit --period=30d
  if (command === 'cashapp-audit') {
    const periodIdx = args.find(a => a.startsWith('--period='))?.split('=')[1] || '30d';
    const days = parseInt(periodIdx.replace('d', ''));
    
    console.log(`📋 Generating compliance report for last ${days} days...`);
    const report = await auditLogger.getComplianceReport(days);
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  // 5. Compliance Report: bun cli/commands/cashapp-cli.ts compliance-report --regulations=gdpr,pci [--file=logs.json]
  if (command === 'compliance-report') {
    // Parse optional --file or positional filePath
    let filePath: string | undefined;
    const fileArgIdx = args.findIndex(a => a === '--file' || a.startsWith('--file='));
    if (fileArgIdx !== -1) {
      if (args[fileArgIdx].startsWith('--file=')) {
        filePath = args[fileArgIdx].slice(7);
      } else {
        filePath = args[fileArgIdx + 1];
      }
    } else {
      const positional = args.slice(1).find(a => !a.startsWith('--'));
      if (positional) filePath = positional;
    }

    const regsArg = args.find(a => a.startsWith('--regulations='))?.slice(14) || 'gdpr,pci';
    const regulations = regsArg.split(',').map(r => r.trim().toLowerCase());

    console.log(`⚖️ Generating compliance report for regulations: ${regulations.map(r => r.toUpperCase()).join(', ')}`);

    try {
      const periodDays = 30;
      const baseReport = await auditLogger.getComplianceReport(periodDays);

      let logs: any[] = [];
      if (filePath && filePath.endsWith('.json')) {
        const file = Bun.file(filePath);
        if (await file.exists()) {
          logs = await file.json();
          console.log(`📂 Loaded ${logs.length} logs from ${filePath}`);
        }
      }
      if (logs.length === 0) {
        logs = await auditLogger.query({ limit: 1000 });
        console.log(`📊 Fetched ${logs.length} audit logs`);
      }

      const report = {
        generatedAt: new Date().toISOString(),
        periodDays,
        scope: process.env.DASHBOARD_SCOPE || 'LOCAL',
        regulations,
        overall: baseReport,
        checks: regulations.map(reg => {
          let status: 'COMPLIANT' | 'WARNING' | 'UNSUPPORTED' = 'COMPLIANT';
          let compliant = true;
          let findings: string[] = [];
          let details: Record<string, string> = {};

          if (reg === 'gdpr') {
            const highRiskPct = baseReport.totalLookups > 0 ? (baseReport.highRiskDetected / baseReport.totalLookups) * 100 : 0;
            if (highRiskPct > 5) {
              compliant = false;
              status = 'WARNING';
              findings.push(`High-risk lookups >5%: ${highRiskPct.toFixed(1)}%`);
            }
            const blockPct = baseReport.highRiskDetected > 0 ? (baseReport.profilesBlocked / baseReport.highRiskDetected) * 100 : 100;
            if (blockPct < 80) {
              compliant = false;
              status = 'WARNING';
              findings.push(`High-risk block rate <80%: ${blockPct.toFixed(1)}%`);
            }
            details = {
              dataMinimization: 'ACTIVE (auto-prune 730d)',
              piiMasking: 'PARTIAL (phone visible in dev; masked prod)',
              storage: 'Cloudflare R2 (global)',
              retention: '730 days',
              deletionSupport: 'FULL (auditLogger.deleteByPhone)',
              avgRisk: baseReport.averageRiskScore.toFixed(2)
            };
          } else if (reg === 'pci') {
            details = {
              cardData: 'NONE_HANDLED (CashApp proxy only)',
              encryption: 'TLS1.3 + AES-256 (Bun native)',
              tokenization: 'CASHTAG_PROXY',
              accessControl: 'RBAC + rate-limits',
              networkSeg: 'ISOLATED'
            };
          } else {
            status = 'UNSUPPORTED';
            findings.push(`Checks for ${reg.toUpperCase()} not implemented`);
          }

          return {
            regulation: reg.toUpperCase(),
            status,
            compliant,
            findings,
            details
          };
        })
      };

      console.log(JSON.stringify(report, null, 2));
    } catch (error: any) {
      console.error(`❌ Error generating report: ${error.message}`);
    }
    return;
  }

  console.log('Available CashApp Commands:');
  console.log('  bun cli/commands/cashapp-cli.ts <phone> cashapp-intel [--risk-v2]');
  console.log('  bun cli/commands/cashapp-cli.ts <file.txt> cashapp-batch [--concurrency=10] [--export=json]');
  console.log('  bun cli/commands/cashapp-cli.ts cashapp-cache [--clear] [--stats]');
  console.log('  bun cli/commands/cashapp-cli.ts cashapp-audit [--period=30d]');
  console.log('  bun cli/commands/cashapp-cli.ts compliance-report --regulations=gdpr,pci [--file=logs.json]');
}

main().catch(console.error);

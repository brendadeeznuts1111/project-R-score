#!/usr/bin/env bun
// scripts/maintenance/perf-dashboard.ts - Empire Pro Performance Auditor
import { emojiAlignedTable } from '../../utils/super-table.js';

/**
 * Empire Perf Auditor: Counts sync I/O and other bottlenecks.
 */
async function runAuditor() {
  console.info('📊 Empire Perf Dashboard: Auditing codebase...');

  const getCount = (pattern: string) => {
    const res = Bun.spawnSync(['grep', '-r', '--exclude=perf-dashboard.ts', '--exclude=fix-sync-io.ts', pattern, 'src', 'utils', 'scripts']);
    const stdout = res.stdout.toString();
    return stdout ? stdout.trim().split('\n').filter(l => l.length > 0 && !l.includes('import {') && !l.includes('from \'fs\'')).length : 0;
  };

  const syncIO = getCount('readFileSync');
  const syncWrite = getCount('writeFileSync');
  const consoleLogs = getCount('console.log');
  const anyType = getCount(': any');

  const totalIssues = syncIO + syncWrite + anyType;

  const scope = process.env.DASHBOARD_SCOPE || 'Enterprise';

  const tableData = [
    { Indicator: 'Sync Read I/O', Value: syncIO, Impact: '🔴 High', Scope: scope, Recommendation: 'Use Bun.file().text()' },
    { Indicator: 'Sync Write I/O', Value: syncWrite, Impact: '🔴 High', Scope: scope, Recommendation: 'Use Bun.write()' },
    { Indicator: 'Console Noise', Value: consoleLogs, Impact: '🟡 Medium', Scope: scope, Recommendation: 'Use setVerbose(false)' },
    { Indicator: 'Type Safety (any)', Value: anyType, Impact: '🟠 Medium', Scope: scope, Recommendation: 'Use strict interfaces' },
  ];

  emojiAlignedTable(tableData, ['Indicator', 'Value', 'Impact', 'Scope', 'Recommendation']);

  console.info(`\n📈 Total Issues: ${totalIssues}`);
  console.info(totalIssues === 0 ? '✅ PERF BEST' : `⚠️ Found ${totalIssues} bottlenecks. Run mega-fixes.sh for quick wins.`);
}

runAuditor().catch(console.error);

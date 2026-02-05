#!/usr/bin/env bun

// [API][USERS-REPORT][SYNC][v2.15][ACTIVE]

import YAML from 'yaml';

const VAULT = process.cwd();

async function syncUsersReport(start = 0, limit = 100) {
  const body = new URLSearchParams({
    action: 'getUsersReport',
    start: start.toString(),
    limit: limit.toString(),
  });

  const res = await fetch('/manager-tools/ajax.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body,
  });
  const data = await res.json();
  const reports = data.r || [];

  // YAML + GOV
  const yaml = YAML.stringify({ reports });
  await Bun.write(`${VAULT}/data/users-report.yaml`, yaml);

  // Auto GOV rules
  for (const report of reports) {
    await createUserReportRule(report);
  }

  console.log(`✅ Synced ${reports.length} user reports`);
}

async function createUserReportRule(report: any) {
  // TODO: Implement GOV rule creation
  // This would create rules based on user activity patterns
}

syncUsersReport();

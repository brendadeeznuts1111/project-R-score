// @see https://bun.com/reference/bun/argv — Bun.argv
// tools/partner-health.ts — partner-domain runtime health.
//
//   bun run partner:health            # summary table
//   bun run partner:health -- --json # machine JSON
//
// Reports ops DB reachability, partner_profile_bindings / partner_ledger /
// partner_account_limits presence + row counts, parseable profile TOML count,
// and profile↔binding alignment. Exit 1 when any subsystem is degraded.

import { colorize, jsonOut, logTable } from '../lib/console-depth.ts';
import { runPartnerHealth } from '../lib/partner-profile/partner-health.ts';

const asJson = Bun.argv.includes('--json');

const report = await runPartnerHealth();

if (asJson) {
  jsonOut(report);
} else {
  logTable(
    [
      {
        opsDb: report.opsDb.ok ? 'ok' : '✗',
        bindings: `${report.bindings.count}`,
        ledger: `${report.ledger.count} (${report.ledger.partners} partners)`,
        capacityRows: `${report.capacity.count}`,
        profiles: `${report.profiles.count}`,
        unbound: report.alignment.profilesWithoutBinding.length,
        stale: report.alignment.bindingsWithoutProfile.length,
      },
    ],
    ['opsDb', 'bindings', 'ledger', 'capacityRows', 'profiles', 'unbound', 'stale']
  );

  if (!report.opsDb.ok) console.error(colorize(`  ✗ ops DB: ${report.opsDb.error}`, '#f85149'));
  if (report.bindings.error)
    console.error(colorize(`  ✗ bindings: ${report.bindings.error}`, '#f85149'));
  if (report.ledger.error) console.error(colorize(`  ✗ ledger: ${report.ledger.error}`, '#f85149'));
  if (report.capacity.error)
    console.error(colorize(`  ✗ capacity: ${report.capacity.error}`, '#f85149'));
  if (report.alignment.profilesWithoutBinding.length > 0) {
    console.log(
      colorize(
        `profiles without binding: ${report.alignment.profilesWithoutBinding.join(', ')}`,
        '#d29922'
      )
    );
  }
  if (report.alignment.bindingsWithoutProfile.length > 0) {
    console.log(
      colorize(
        `bindings without profile: ${report.alignment.bindingsWithoutProfile.join(', ')}`,
        '#d29922'
      )
    );
  }
  console.log(
    colorize(`partner:health · ${report.ok ? 'OK' : 'DEGRADED'}`, report.ok ? '#3fb950' : '#f85149')
  );
}

if (!report.ok) process.exit(1);

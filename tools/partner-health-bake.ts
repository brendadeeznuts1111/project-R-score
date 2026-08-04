// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/file-io — Bun.file
// tools/partner-health-bake.ts — bake the partner health board snapshot.
//
//   bun run partner:health:bake            # write public/registry/partner-health.json
//   bun run partner:health:bake:check      # exit 1 when the committed bake is stale
//   bun run partner:health:bake -- --out .tmp/partner-health.json

import { colorize, logTable } from '../lib/console-depth.ts';
import {
  bakePartnerHealth,
  partnerHealthBakeMatches,
  PARTNER_HEALTH_BAKE_PATH,
} from '../lib/partner-profile/partner-health-bake.ts';

function argValue(argv: readonly string[], flag: string): string | undefined {
  const eq = argv.find(a => a.startsWith(`${flag}=`));
  if (eq) return eq.slice(flag.length + 1);
  const i = argv.indexOf(flag);
  if (i !== -1) return argv[i + 1];
  return undefined;
}

const check = Bun.argv.includes('--check');
const outPath = argValue(Bun.argv, '--out') ?? PARTNER_HEALTH_BAKE_PATH;

if (check) {
  const live = await bakePartnerHealth(outPath).then(r => r.bake);
  const committedText = await Bun.file(PARTNER_HEALTH_BAKE_PATH).text();
  const committed = JSON.parse(committedText) as unknown;
  const matches = partnerHealthBakeMatches(live, committed);
  console.log(
    colorize(
      matches
        ? `partner:health:bake:check · committed snapshot is current`
        : `partner:health:bake:check · DRIFT — committed snapshot differs from live; run partner:health:bake`,
      matches ? '#3fb950' : '#f85149'
    )
  );
  if (!matches) process.exit(1);
} else {
  const { bake, path } = await bakePartnerHealth(outPath);
  logTable(
    [
      {
        healthOk: bake.health.ok ? 'yes' : 'no',
        bindings: bake.health.bindings.count,
        ledger: bake.health.ledger.count,
        capacity: bake.health.capacity.count,
        profiles: bake.health.profiles.count,
        outs: bake.outChecks.checked,
        degraded: bake.outChecks.degraded.length,
      },
    ],
    ['healthOk', 'bindings', 'ledger', 'capacity', 'profiles', 'outs', 'degraded']
  );
  console.log(colorize(`partner:health:bake · wrote ${path}`, '#3fb950'));
}

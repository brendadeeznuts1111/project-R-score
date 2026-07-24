#!/usr/bin/env bun
/**
 * Print portal CSS scores — static-fit (R/S/M/B) or Power UI pillars.
 *
 * Usage:
 *   bun tools/portal-css-score.ts
 *   bun tools/portal-css-score.ts --components
 *   bun tools/portal-css-score.ts --power
 *   bun tools/portal-css-score.ts --power --json
 *
 * @see lib/portal/css-enhancement-score.ts
 * @see lib/portal/power-ui-score.ts
 */
import { parseArgs } from 'util';
import {
  CSS_SCORE_WEIGHTS,
  PORTAL_COMPONENT_SCORES,
  PORTAL_CSS_ENHANCEMENTS,
  SCORE_STEP_FLOAT_AXIS,
  docsUrl,
  formatScore,
} from '../lib/portal/css-enhancement-score.ts';
import {
  POWER_UI_ENHANCEMENTS,
  POWER_UI_PORTAL_MAP,
  formatPowerScore,
} from '../lib/portal/power-ui-score.ts';

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    components: { type: 'boolean', default: false },
    power: { type: 'boolean', default: false },
    json: { type: 'boolean', default: false },
    all: { type: 'boolean', default: false },
  },
  strict: true,
  allowPositionals: false,
});

function pad(s: string, n: number): string {
  return (s + ' '.repeat(n)).slice(0, n);
}

function printStaticFit(): void {
  const rows =
    values.components && !values.all
      ? PORTAL_COMPONENT_SCORES
      : values.all
        ? [...PORTAL_CSS_ENHANCEMENTS, ...PORTAL_COMPONENT_SCORES].sort((a, b) => b.score - a.score)
        : PORTAL_CSS_ENHANCEMENTS;

  if (values.json) {
    console.log(
      JSON.stringify(
        {
          type: 'PortalCssScoreReport',
          mode: 'static-fit',
          weights: CSS_SCORE_WEIGHTS,
          step: SCORE_STEP_FLOAT_AXIS,
          displayDecimals: 3,
          rows: rows.map(r => ({
            ...r,
            scoreDisplay: formatScore(r.score),
            docs: docsUrl(r.docsAnchor),
          })),
        },
        null,
        2
      )
    );
    return;
  }

  console.log(
    `\n${values.components ? 'Portal components (static-fit R/S/M/B)' : 'Bun CSS enhancements (static-fit)'}`
  );
  console.log(
    `Weights: R=${CSS_SCORE_WEIGHTS.R} S=${CSS_SCORE_WEIGHTS.S} M=${CSS_SCORE_WEIGHTS.M} B=${CSS_SCORE_WEIGHTS.B}`
  );
  console.log(`Finest step (ΔR=0.1): ${SCORE_STEP_FLOAT_AXIS.toFixed(3)} · display 3 decimals\n`);
  console.log(
    pad('Pri', 10) +
      pad('Score', 8) +
      pad('R', 5) +
      pad('S', 5) +
      pad('M', 5) +
      pad('B', 5) +
      'Enhancement'
  );
  console.log('─'.repeat(74));
  for (const r of rows) {
    console.log(
      pad(r.priority, 10) +
        pad(formatScore(r.score), 8) +
        pad(r.R.toFixed(1), 5) +
        pad(r.S.toFixed(1), 5) +
        pad(r.M.toFixed(1), 5) +
        pad(r.B.toFixed(1), 5) +
        r.name
    );
  }
  if (!values.components) {
    console.log('\nPower UI pillars: bun tools/portal-css-score.ts --power');
    console.log('Components:         bun tools/portal-css-score.ts --components');
  }
}

function printPower(): void {
  if (values.json) {
    console.log(
      JSON.stringify(
        {
          type: 'PortalPowerUiScoreReport',
          mode: 'power-ui',
          formula: '(globalUx+performance+consistency+scalability+future)/5',
          displayDecimals: 2,
          rows: POWER_UI_ENHANCEMENTS.map(r => ({
            ...r,
            powerDisplay: formatPowerScore(r.power),
            docs: docsUrl(r.docsAnchor),
          })),
          portalMap: POWER_UI_PORTAL_MAP,
        },
        null,
        2
      )
    );
    return;
  }

  console.log('\nPower UI scores (equal pillar weights)');
  console.log(
    'Pillars: 🌍 Global UX · ⚡ Performance · 🎨 Consistency · 🧩 Scalability · 🔧 Future\n'
  );
  console.log(
    pad('Power', 7) +
      pad('G', 5) +
      pad('P', 5) +
      pad('C', 5) +
      pad('S', 5) +
      pad('F', 5) +
      'Enhancement'
  );
  console.log('─'.repeat(72));
  for (const r of POWER_UI_ENHANCEMENTS) {
    console.log(
      pad(formatPowerScore(r.power), 7) +
        pad(r.globalUx.toFixed(1), 5) +
        pad(r.performance.toFixed(1), 5) +
        pad(r.consistency.toFixed(1), 5) +
        pad(r.scalability.toFixed(1), 5) +
        pad(r.future.toFixed(1), 5) +
        r.name
    );
  }

  console.log('\nPortal section → enhancements');
  console.log('─'.repeat(72));
  for (const m of POWER_UI_PORTAL_MAP) {
    console.log(`• ${m.section}`);
    console.log(`  ${m.enhancementIds.join(' + ')}`);
    console.log(`  ${m.why}`);
  }
}

if (values.power) printPower();
else printStaticFit();

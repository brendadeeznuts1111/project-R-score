#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io — Bun.file

import { PARTNER_HISTORY_GLOSSARY } from '../public/portal/partner-history/glossary-map.js';

const REGISTRY_PATH = 'public/registry/domain-glossary.json';
const HISTORY_PATH = 'public/portal/partner-history/index.html';
const CARD_PATH = 'public/portal/components/limit-changes-card.js';

const [registry, historyHtml, cardSource] = await Promise.all([
  Bun.file(REGISTRY_PATH).json(),
  Bun.file(HISTORY_PATH).text(),
  Bun.file(CARD_PATH).text(),
]);

const conceptIds = new Set(
  (registry.concepts ?? []).map((concept: { id: unknown }) => String(concept.id))
);
const chromeSource = `${historyHtml}\n${cardSource}`;
const failures: string[] = [];

for (const concept of new Set(Object.values(PARTNER_HISTORY_GLOSSARY))) {
  if (!conceptIds.has(concept)) failures.push(`unknown canonical concept: ${concept}`);
}

for (const [key, concept] of Object.entries(PARTNER_HISTORY_GLOSSARY)) {
  const directMarker = `data-glossary-concept="${concept}"`;
  const mappedReference = `PARTNER_HISTORY_GLOSSARY.${key}`;
  const shortMapped = `G.${key}`;
  if (
    !chromeSource.includes(directMarker) &&
    !chromeSource.includes(mappedReference) &&
    !chromeSource.includes(shortMapped)
  ) {
    failures.push(`unwired chrome mapping: ${key} -> ${concept}`);
  }
}

const visibleContract = [
  ['Partner limit history', PARTNER_HISTORY_GLOSSARY.page],
  ['Limit overview', PARTNER_HISTORY_GLOSSARY.limitOverview],
  ['All accounts', PARTNER_HISTORY_GLOSSARY.allAccounts],
  ['All sportsbooks', PARTNER_HISTORY_GLOSSARY.allSportsbooks],
  ['Direction', PARTNER_HISTORY_GLOSSARY.directionFilter],
  ['30 days', PARTNER_HISTORY_GLOSSARY.window30d],
  ['Visible changes', PARTNER_HISTORY_GLOSSARY.visibleChanges],
  ['Data coverage', PARTNER_HISTORY_GLOSSARY.dataCoverage],
  ['Recent changes', PARTNER_HISTORY_GLOSSARY.recentChanges],
  ['Per account', PARTNER_HISTORY_GLOSSARY.perAccount],
  ['Opening baseline', PARTNER_HISTORY_GLOSSARY.openingBaseline],
  ['Export', PARTNER_HISTORY_GLOSSARY.export],
  ['CSV', PARTNER_HISTORY_GLOSSARY.csv],
  ['JSON', PARTNER_HISTORY_GLOSSARY.json],
  ['Prior limit', PARTNER_HISTORY_GLOSSARY.priorLimitColumn],
  ['Market type', PARTNER_HISTORY_GLOSSARY.marketTypeColumn],
  ['Structure / phase', PARTNER_HISTORY_GLOSSARY.structureColumn],
  ['Sportsbook', PARTNER_HISTORY_GLOSSARY.sportsbookColumn],
  ['Observed', PARTNER_HISTORY_GLOSSARY.observedColumn],
  ['Account', PARTNER_HISTORY_GLOSSARY.accountColumn],
] as const;

for (const [label, concept] of visibleContract) {
  if (!chromeSource.includes(label)) failures.push(`missing visible chrome: ${label}`);
  const directMarker = `data-glossary-concept="${concept}"`;
  const mappedMarker = Object.entries(PARTNER_HISTORY_GLOSSARY)
    .filter(([, value]) => value === concept)
    .some(
      ([key]) =>
        chromeSource.includes(`PARTNER_HISTORY_GLOSSARY.${key}`) ||
        chromeSource.includes(`G.${key}`)
    );
  if (!chromeSource.includes(directMarker) && !mappedMarker) {
    failures.push(`visible chrome is not governed: ${label} -> ${concept}`);
  }
}

// Parallel namespaces that would drift from the collapse map (trim plan).
const duplicateNamespaces = [
  'ops.field.',
  'ops.empty.',
  'ops.error.',
  'ops.toast.',
  'ops.shortcut.',
  'ops.sort.',
  'ops.panel.',
  'ops.filter.',
  'ops.metric.',
  'ops.table.',
  'ops.action.',
  'ui.action.refresh',
  'ui.action.export',
  'ui.export.csv',
  'ui.export.json',
  'ui.pagination.',
];
for (const prefix of duplicateNamespaces) {
  if (chromeSource.includes(prefix)) failures.push(`parallel glossary namespace used: ${prefix}`);
}

if (failures.length > 0) {
  console.error(`Partner History glossary coverage failed:\n- ${failures.join('\n- ')}`);
  process.exitCode = 1;
} else {
  console.log(
    `Partner History glossary coverage: PASS (${Object.keys(PARTNER_HISTORY_GLOSSARY).length} labels, ${new Set(Object.values(PARTNER_HISTORY_GLOSSARY)).size} canonical concepts)`
  );
}

#!/usr/bin/env bun
import { parseDataFormatAccessProof } from '../lib/data-format-access.ts';
import {
  assertDataFormatReport,
  buildDataFormatReport,
  loadDataFormatManifest,
} from '../lib/data-format-lab.ts';
import { joinPath } from '../lib/path-bun.ts';

const root = joinPath(import.meta.dir, '..');
const manifest = await loadDataFormatManifest(joinPath(root, 'config/data-format-lab.json'));
const surfaces = Bun.TOML.parse(await Bun.file(joinPath(root, 'config/surfaces.toml')).text());
const accessPolicy = Bun.YAML.parse(
  await Bun.file(joinPath(root, '.cloudflare-access.yml')).text()
);
const doctorState = await Bun.file(joinPath(root, 'public/registry/doctor-state.json')).json();
const report = buildDataFormatReport(
  manifest,
  parseDataFormatAccessProof(surfaces, accessPolicy, doctorState)
);
assertDataFormatReport(report);

const destination = joinPath(root, 'public/portal/registry/data-format-lab.json');
await Bun.write(destination, `${JSON.stringify(report, null, 2)}\n`);
console.info(
  `data-format lab ${report.mode}: ${report.summary.available} available · ${report.summary.gated} gated · ${report.summary.proofFailures} proof failures · Bun ${report.runtime.version}`
);

#!/usr/bin/env bun

import { parse } from 'yaml';
import { glob } from 'glob';

// Use glob for file discovery (reliable across environments)
const mdFiles = await glob('docs/*.md');

const paths: any = {};
const components: any = { schemas: {}, securitySchemes: {} };
let version = process.env.npm_package_version ?? '2.0.2';

// Helper function to deep merge objects
function deepMerge(target: any, source: any) {
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      target[key] = target[key] || {};
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

for (const file of mdFiles) {
  const txt = await Bun.file(file).text();

  // Extract version from markdown front-matter
  const versionMatch = txt.match(/^Version:\s*`([^`]+)`/m);
  if (versionMatch) {
    version = versionMatch[1];
  }

  const blocks = [...txt.matchAll(/```yaml\n(?<oas>.*?)```/gs)];

  for (const block of blocks) {
    const frag = parse(block.groups!.oas);
    if (frag.paths) deepMerge(paths, frag.paths);
    if (frag.components?.schemas) Object.assign(components.schemas, frag.components.schemas);
    if (frag.components?.securitySchemes) Object.assign(components.securitySchemes, frag.components.securitySchemes);
  }
}

const oas = {
  openapi: '3.1.0',
  info: { title: 'Plive API', version },
  servers: [{ url: 'https://plive.sportswidgets.pro' }],
  paths,
  components,
};

const outputPath = Bun.resolveSync('./docs/plive-api.yaml', process.cwd());
await Bun.write(outputPath, JSON.stringify(oas, null, 2));

console.log('✅ docs/plive-api.yaml written');

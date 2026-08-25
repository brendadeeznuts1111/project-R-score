import { fail } from './errors.ts';
import type {
  Bun14Capability,
  CapabilityAdoption,
  CapabilityChangeKind,
  CapabilityDomain,
} from './types.ts';

const DOMAINS = new Set<CapabilityDomain>([
  'runtime',
  'server',
  'network',
  'package-manager',
  'test-runner',
  'bundler',
  'observability',
  'platform',
]);
const CHANGES = new Set<CapabilityChangeKind>([
  'new',
  'release-window',
  'changed',
  'fixed',
  'compatibility',
  'performance',
]);
const ADOPTIONS = new Set<CapabilityAdoption>([
  'integrated',
  'contract',
  'candidate',
  'local-only',
  'upstream-claim',
]);

export function validateCapability(
  capability: Bun14Capability,
  assetIds: ReadonlySet<string>,
  seenIds: Set<string>,
  chapterIds: ReadonlySet<string>
): void {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(capability.id) || seenIds.has(capability.id)) {
    fail(`invalid or duplicate Bun 1.4 capability id: ${capability.id}`);
  }
  seenIds.add(capability.id);
  if (!DOMAINS.has(capability.domain)) fail(`invalid domain for ${capability.id}`);
  if (!CHANGES.has(capability.changeKind)) fail(`invalid change kind for ${capability.id}`);
  if (!ADOPTIONS.has(capability.adoption)) fail(`invalid adoption for ${capability.id}`);
  if (!capability.symbol || !capability.summary || !capability.boundary) {
    fail(`capability ${capability.id} is missing explanatory text`);
  }
  if (capability.chapterId && !chapterIds.has(capability.chapterId)) {
    fail(`capability ${capability.id} references unknown chapter ${capability.chapterId}`);
  }
  for (const url of [capability.releaseUrl, capability.docsUrl].filter(Boolean)) {
    if (!String(url).startsWith('https://bun.com/')) {
      fail(`capability ${capability.id} must use an official Bun URL`);
    }
  }
  const relationIds = new Set<string>();
  for (const assetId of capability.assetIds) {
    if (!assetIds.has(assetId)) fail(`capability ${capability.id} references ${assetId}`);
    if (relationIds.has(assetId)) fail(`capability ${capability.id} repeats ${assetId}`);
    relationIds.add(assetId);
  }
  for (const path of capability.contractFiles) {
    if (!/^tests\/[\w./-]+\.test\.ts$/.test(path)) {
      fail(`capability ${capability.id} has invalid contract path ${path}`);
    }
  }
  if (
    (capability.adoption === 'candidate' || capability.adoption === 'upstream-claim') &&
    capability.contractFiles.length
  ) {
    fail(`${capability.adoption} ${capability.id} cannot claim a local contract`);
  }
  if (
    (capability.adoption === 'integrated' || capability.adoption === 'contract') &&
    !capability.contractFiles.length
  ) {
    fail(`${capability.adoption} ${capability.id} requires executable contract evidence`);
  }
}

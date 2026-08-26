// @see https://bun.com/blog/bun-v1.4 — official release behavior and capability anchors
import { describe, expect, test } from 'bun:test';
import { parseReleaseKnowledge } from '../packages/bun-release-contracts/src/knowledge.ts';
import { capabilitiesByAsset, readCapabilityRegistry } from '../tools/bun-blog-assets/capabilities.ts';
import { readManifest } from '../tools/bun-blog-assets/storage.ts';

const FORBIDDEN_ASSET_FACTS = [
  'sourceUrl',
  'publicUrl',
  'localUrl',
  'mimeType',
  'byteSize',
  'sha256',
  'width',
  'height',
  'posterId',
  'caption',
  'alt',
];

const ATTACHMENT_CAPABILITY_IDS = [
  'cpu-profile-markdown',
  'heap-profile-markdown',
  'native-async-stack-traces',
  'bun-no-orphans',
  'bun-no-env-file',
  'bun-serve-http3-experimental',
  'fetch-http2-http3-experimental',
  'bun-serve-file-routes',
  'bun-serve-range-preconditions',
  'bun-serve-production-sourcemaps',
  'fetch-request-compression',
  'fetch-proxy-headers',
  'fetch-tls-session-resumption',
  'fetch-connection-reuse',
  'bun-json5-native',
  'bun-jsonl-native',
  'bun-jsonc-native',
  'bun-xml-native',
  'bun-toml-native',
  'bun-archive-native',
  'bun-ansi-layout-native',
  'bun-string-width',
  'urlpattern-native',
  'compression-streams-native',
  'response-text-stream',
  'process-memory-pressure',
  'post-quantum-webcrypto',
  'bun-spawn-cgroup',
  'bun-repl-native',
  'bun-markdown-cli',
] as const;

describe('Bun 1.4 normalized capability graph', () => {
  test('materializes the source AST and maps every asset, example, and behavior row', async () => {
    const manifest = await readManifest('public/registry/bun-1.4-assets.json');
    const registry = await readCapabilityRegistry(manifest);
    const knowledge = parseReleaseKnowledge(
      await Bun.file('packages/bun-release-contracts/knowledge/bun-v1.4.0.json').json()
    );
    const inventory = (await Bun.file(
      'packages/bun-release-contracts/contracts/bun-v1.4.0.json'
    ).json()) as { items: Array<{ key: string; section: string }> };
    expect(knowledge.schemaVersion).toBe(2);
    expect(knowledge.ast).toBeDefined();

    const nodes = knowledge.ast!.nodes;
    const codeNodes = nodes.filter(node => node.type === 'codeBlock');
    const headingNodes = nodes.filter(node => node.type === 'heading');
    expect(codeNodes).toHaveLength(knowledge.examples.length);
    expect(new Set(codeNodes.map(node => node.exampleId))).toEqual(
      new Set(knowledge.examples.map(example => example.id))
    );

    const markdownAssetIds = new Set(
      nodes.filter(node => node.type === 'asset').flatMap(node => node.assetIds)
    );
    const htmlOnlyAssetIds = new Set(['bun-1.4-image-pipeline-src', 'bun-1.4-og-image']);
    expect(
      new Set(manifest.assets.map(asset => asset.id).filter(id => !markdownAssetIds.has(id)))
    ).toEqual(htmlOnlyAssetIds);
    expect(
      new Set(registry.capabilities.flatMap(capability => capability.assetIds))
    ).toEqual(new Set(manifest.assets.map(asset => asset.id)));

    const mappingKey = (value: string): string =>
      value
        .toLowerCase()
        .replaceAll('_', '')
        .replace(/\{%[^}]+%\}/g, '')
        .replace(/v\d+\.\d+(?:\.\d+)?/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
    const headingsByKey = new Map(headingNodes.map(node => [mappingKey(node.text), node.id]));
    const behaviorMappings = inventory.items.map(item => ({
      behaviorKey: item.key,
      nodeId: headingsByKey.get(mappingKey(item.section)),
    }));
    expect(behaviorMappings).toHaveLength(1_901);
    expect(behaviorMappings.every(mapping => mapping.nodeId !== undefined)).toBe(true);
    expect(new Set(behaviorMappings.map(mapping => mapping.behaviorKey)).size).toBe(
      inventory.items.length
    );
  });

  test('keeps official facts separate from asset facts', async () => {
    const manifest = await readManifest('public/registry/bun-1.4-assets.json');
    const registry = await readCapabilityRegistry(manifest);
    expect(registry.schemaVersion).toBe(3);
    expect(registry.release).toBe('Bun 1.4');
    expect(registry.version).toBe('1.4.0');
    expect(registry.sourcePage).toBe('https://bun.com/blog/bun-v1.4');
    expect(registry.relationModel).toBe('capability-references-assets');
    expect(registry.migration).toEqual({
      breakingChangesUrl: 'https://github.com/oven-sh/bun/issues/28792',
      upgradeGuideUrl: 'https://github.com/oven-sh/bun/pull/36463',
      reconciledTag: 'bun-v1.4.0',
      underConsiderationShipped: false,
    });
    expect(registry.generatedAt).toBe(manifest.generatedAt);
    expect(registry.chapters.map(chapter => [chapter.id, chapter.releaseUrl])).toEqual([
      ['what-s-new', 'https://bun.com/blog/bun-v1.4#what-s-new'],
      ['bun-install', 'https://bun.com/blog/bun-v1.4#bun-install'],
      ['bun-test', 'https://bun.com/blog/bun-v1.4#bun-test'],
      ['bun-build', 'https://bun.com/blog/bun-v1.4#bun-build'],
      ['faster', 'https://bun.com/blog/bun-v1.4#faster'],
    ]);

    const serialized = registry.capabilities.map(capability => Object.keys(capability));
    for (const keys of serialized) {
      for (const forbidden of FORBIDDEN_ASSET_FACTS) expect(keys).not.toContain(forbidden);
    }
  });

  test('uses stable unique IDs, official URLs, valid relations and real contracts', async () => {
    const manifest = await readManifest('public/registry/bun-1.4-assets.json');
    const registry = await readCapabilityRegistry(manifest);
    const capabilityIds = new Set<string>();
    const manifestAssetIds = new Set(manifest.assets.map(asset => asset.id));
    const linkedAssetIds = new Set<string>();

    for (const capability of registry.capabilities) {
      expect(capability.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(capabilityIds.has(capability.id)).toBe(false);
      capabilityIds.add(capability.id);
      expect(capability.releaseUrl).toStartWith('https://bun.com/');
      if (capability.docsUrl) expect(capability.docsUrl).toStartWith('https://bun.com/');
      for (const assetId of capability.assetIds) {
        expect(manifestAssetIds.has(assetId)).toBe(true);
        linkedAssetIds.add(assetId);
      }
      for (const path of capability.contractFiles) expect(await Bun.file(path).exists()).toBe(true);
      if (capability.adoption === 'upstream-claim') expect(capability.contractFiles).toEqual([]);
    }
    expect(linkedAssetIds).toEqual(manifestAssetIds);
  });

  test('indexes assets deterministically without inventing capability channels', async () => {
    const manifest = await readManifest('public/registry/bun-1.4-assets.json');
    const registry = await readCapabilityRegistry(manifest);
    const index = capabilitiesByAsset(registry);
    expect(index.get('bun-1.4-bun-audit-fix')?.map(item => item.id)).toEqual(['bun-audit-fix']);
    expect(index.get('bun-1.4-spawn-cgroup')?.map(item => item.id)).toEqual(['bun-spawn-cgroup']);
    expect(index.get('bun-1.4-og-image')?.map(item => item.id)).toEqual(['bun-1-4-overview']);
    expect([...index.keys()].sort()).toEqual(manifest.assets.map(asset => asset.id).sort());
  });

  test('distinguishes changed behavior, integration, candidates and upstream claims', async () => {
    const manifest = await readManifest('public/registry/bun-1.4-assets.json');
    const registry = await readCapabilityRegistry(manifest);
    const byId = new Map(registry.capabilities.map(item => [item.id, item]));
    expect(byId.get('bun-xml-native')).toEqual(
      expect.objectContaining({ changeKind: 'new', adoption: 'integrated' })
    );
    expect(byId.get('fetch-redirect-error-statuses')).toEqual(
      expect.objectContaining({ changeKind: 'changed', adoption: 'contract' })
    );
    expect(byId.get('fetch-request-compression')).toEqual(
      expect.objectContaining({ changeKind: 'new', adoption: 'candidate' })
    );
    expect(byId.get('production-efficiency-claims')).toEqual(
      expect.objectContaining({ changeKind: 'performance', adoption: 'upstream-claim' })
    );
    expect(byId.get('ffi-performance-claim')?.chapterId).toBe('what-s-new');
    expect(byId.get('source-map-decoding-claim')?.chapterId).toBe('faster');
    expect(byId.get('bun-audit-fix')?.chapterId).toBe('bun-install');
    expect(byId.get('bun-test-timings')?.chapterId).toBe('bun-test');
    expect(byId.get('react-compiler-built-in')?.chapterId).toBe('bun-build');
  });

  test('covers the dev-tooling, protocol and built-in inventory without promoting experiments', async () => {
    const manifest = await readManifest('public/registry/bun-1.4-assets.json');
    const registry = await readCapabilityRegistry(manifest);
    const byId = new Map(registry.capabilities.map(item => [item.id, item]));

    expect(registry.capabilities).toHaveLength(60);
    for (const id of ATTACHMENT_CAPABILITY_IDS) expect(byId.has(id)).toBe(true);
    for (const id of [
      'bun-serve-http3-experimental',
      'fetch-http2-http3-experimental',
    ]) {
      expect(byId.get(id)).toEqual(
        expect.objectContaining({ adoption: 'candidate', chapterId: 'what-s-new' })
      );
      expect(byId.get(id)?.contractFiles).toEqual([]);
    }
    for (const id of ['fetch-tls-session-resumption', 'fetch-connection-reuse']) {
      expect(byId.get(id)).toEqual(
        expect.objectContaining({ adoption: 'upstream-claim', chapterId: 'what-s-new' })
      );
    }
    for (const capability of registry.capabilities) {
      if (capability.adoption === 'candidate' || capability.adoption === 'upstream-claim') {
        expect(capability.contractFiles, capability.id).toEqual([]);
      }
      if (capability.adoption === 'integrated' || capability.adoption === 'contract') {
        expect(capability.contractFiles.length, capability.id).toBeGreaterThan(0);
      }
    }
    expect(byId.get('bun-no-env-file')?.contractFiles).toContain(
      'tests/bun-env-loading.test.ts'
    );
    expect(byId.get('bun-archive-native')?.adoption).toBe('integrated');
  });
});

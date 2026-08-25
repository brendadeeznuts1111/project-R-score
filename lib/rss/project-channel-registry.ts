import {
  GITHUB_CASCADE,
  GITHUB_ORIGIN,
  type GitHubRemoteConstants,
  type GitHubRemoteSlot,
} from '../github-repository-ref.ts';
import {
  asFeedId,
  asProjectId,
  parseFeedId,
  parseProjectId,
  unbrand,
  type FeedId,
  type ProjectId,
} from '../types/branded.ts';

export const PROJECT_RSS_REGISTRY_SCHEMA_VERSION = 1 as const;
export const PROJECT_RSS_FEED_SCHEMA_VERSION = 1 as const;
export const PROJECT_RSS_ORIGIN = 'https://score.factory-wager.com' as const;
export const ROOT_RSS_PROJECT_ID = asProjectId('project-r-score');

export type ProjectRSSRepository = Pick<
  GitHubRemoteConstants,
  'remote' | 'host' | 'owner' | 'name' | 'ownerName' | 'url'
>;

export type ProjectRSSChannelRegistration = {
  id: FeedId;
  canonicalEndpoint: string;
  projectEndpoint: string;
  publisher: { name: 'Bun'; url: 'https://bun.com/' };
  sourceManifest: '/registry/bun-1.4-assets.json';
  archivePolicy: 'content-addressed-snapshot';
};

export type ProjectRSSProjectRegistration = {
  projectId: ProjectId;
  path: string;
  repositoryRelation: 'root' | 'contained';
  repositoryRemote: GitHubRemoteSlot;
  feedStatus: 'registered' | 'unregistered';
  reason?: 'no-authoritative-feed-registration';
  channels: ProjectRSSChannelRegistration[];
};

export type ProjectRSSChannelRegistry = {
  schemaVersion: typeof PROJECT_RSS_REGISTRY_SCHEMA_VERSION;
  feedSchemaVersion: typeof PROJECT_RSS_FEED_SCHEMA_VERSION;
  scope: 'root-and-active-projects';
  origin: typeof PROJECT_RSS_ORIGIN;
  inventorySource: 'tools/projects-root-check.ts';
  defaultPolicy: 'unregistered-no-fallback';
  repositories: Array<{
    repository: ProjectRSSRepository;
    authority: 'feed-host' | 'independent-no-feed';
    projectIds: ProjectId[];
    channelIds: FeedId[];
  }>;
  pendingIndependentProjects: Array<{
    projectId: ProjectId;
    repository: null;
    feedStatus: 'unregistered';
    reason: 'canonical-repository-unresolved';
  }>;
  projects: ProjectRSSProjectRegistration[];
};

const BUN_14_CHANNEL_ENDPOINTS = [
  ['bun-1.4:all', '/feeds/v1/all.xml'],
  ['bun-1.4:image', '/feeds/v1/images.xml'],
  ['bun-1.4:video', '/feeds/v1/videos.xml'],
  ['bun-1.4:embed', '/feeds/v1/embeds.xml'],
] as const;

const PENDING_INDEPENDENT_PROJECT_IDS = [
  asProjectId('kimiremote'),
  asProjectId('f402-openapi'),
  asProjectId('bet-ticker-worker-v1.1'),
] as const;

const INDEPENDENT_PROJECT_IDS = new Set([
  ...PENDING_INDEPENDENT_PROJECT_IDS.map(unbrand),
  'cascade-mover-v3',
]);

type UnknownRecord = Record<string, unknown>;

function parseRecord(value: unknown, label: string): UnknownRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`);
  }
  return value as UnknownRecord;
}

function exactKeys(value: UnknownRecord, keys: readonly string[], label: string): void {
  const expected = [...keys].sort();
  const actual = Object.keys(value).sort();
  if (actual.join('\0') !== expected.join('\0')) {
    throw new TypeError(`${label} keys must be exactly: ${expected.join(', ')}`);
  }
}

function parseLiteral<T>(value: unknown, expected: T, label: string): T {
  if (!Object.is(value, expected)) {
    throw new TypeError(`${label} must be ${JSON.stringify(expected)}`);
  }
  return expected;
}

function parseStringValue(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError(`${label} must be a non-empty string`);
  }
  return value;
}

function parseArrayValue(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new TypeError(`${label} must be an array`);
  return value;
}

function parseRssPath(value: unknown, label: string, kind: 'canonical' | 'project'): string {
  const path = parseStringValue(value, label);
  if (!path.startsWith('/feeds/v1/') || !path.endsWith('.xml')) {
    throw new TypeError(`${label} must be a feed-schema v1 XML path`);
  }
  if (path.includes('?') || path.includes('#') || path.includes('\\') || path.includes('//')) {
    throw new TypeError(`${label} must not contain a query, fragment, backslash, or empty segment`);
  }
  if (/%2f|%5c/i.test(path)) throw new TypeError(`${label} must not contain encoded separators`);
  const normalized = new URL(path, 'https://rss-registry.invalid').pathname;
  if (normalized !== path) throw new TypeError(`${label} must be a normalized URL path`);
  if (kind === 'canonical' && path.startsWith('/feeds/v1/projects/')) {
    throw new TypeError(`${label} must not be a project alias`);
  }
  if (kind === 'project' && !path.startsWith('/feeds/v1/projects/')) {
    throw new TypeError(`${label} must be a project-scoped alias`);
  }
  return path;
}

function activeProjectPath(value: string): string {
  if (!value.startsWith('projects/active/')) {
    throw new Error(`Active project path is outside projects/active: ${value}`);
  }
  if (value.includes('\\') || value.includes('//')) {
    throw new Error(`Active project path is not normalized: ${value}`);
  }
  const segments = value.split('/');
  if (segments.some(segment => !segment || segment === '.' || segment === '..')) {
    throw new Error(`Active project path is not normalized: ${value}`);
  }
  return value;
}

function repositoryRecord(repository: GitHubRemoteConstants): ProjectRSSRepository {
  return {
    remote: repository.remote,
    host: repository.host,
    owner: repository.owner,
    name: repository.name,
    ownerName: repository.ownerName,
    url: repository.url,
  };
}

function projectAliasEndpoint(projectId: ProjectId, canonicalEndpoint: string): string {
  const fileName = canonicalEndpoint.split('/').at(-1);
  if (!fileName) throw new Error(`Project RSS channel has invalid endpoint: ${canonicalEndpoint}`);
  return `/feeds/v1/projects/${encodeURIComponent(unbrand(projectId))}/bun-1.4/${fileName}`;
}

export const ROOT_BUN_14_CHANNELS: readonly ProjectRSSChannelRegistration[] =
  BUN_14_CHANNEL_ENDPOINTS.map(([id, canonicalEndpoint]) => ({
    id: asFeedId(id),
    canonicalEndpoint,
    projectEndpoint: projectAliasEndpoint(ROOT_RSS_PROJECT_ID, canonicalEndpoint),
    publisher: { name: 'Bun', url: 'https://bun.com/' },
    sourceManifest: '/registry/bun-1.4-assets.json',
    archivePolicy: 'content-addressed-snapshot',
  }));

function parseRepository(value: unknown, label: string): ProjectRSSRepository {
  const input = parseRecord(value, label);
  exactKeys(input, ['remote', 'host', 'owner', 'name', 'ownerName', 'url'], label);
  const remote = input.remote;
  if (remote !== 'origin' && remote !== 'cascade') {
    throw new TypeError(`${label}.remote must be origin or cascade`);
  }
  const expected = repositoryRecord(remote === 'origin' ? GITHUB_ORIGIN : GITHUB_CASCADE);
  for (const key of ['host', 'owner', 'name', 'ownerName', 'url'] as const) {
    if (input[key] !== expected[key]) {
      throw new TypeError(`${label}.${key} does not match canonical ${remote}`);
    }
  }
  return expected;
}

function parseChannel(
  value: unknown,
  projectId: ProjectId,
  label: string
): ProjectRSSChannelRegistration {
  const input = parseRecord(value, label);
  exactKeys(
    input,
    ['id', 'canonicalEndpoint', 'projectEndpoint', 'publisher', 'sourceManifest', 'archivePolicy'],
    label
  );
  const id = parseFeedId(input.id);
  const canonicalEndpoint = parseRssPath(
    input.canonicalEndpoint,
    `${label}.canonicalEndpoint`,
    'canonical'
  );
  const projectEndpoint = parseRssPath(
    input.projectEndpoint,
    `${label}.projectEndpoint`,
    'project'
  );
  const expectedAlias = projectAliasEndpoint(projectId, canonicalEndpoint);
  if (projectEndpoint !== expectedAlias) {
    throw new TypeError(`${label}.projectEndpoint must be ${expectedAlias}`);
  }
  if (projectEndpoint === canonicalEndpoint) {
    throw new TypeError(`${label}.projectEndpoint must differ from its canonical endpoint`);
  }
  const publisher = parseRecord(input.publisher, `${label}.publisher`);
  exactKeys(publisher, ['name', 'url'], `${label}.publisher`);
  parseLiteral(publisher.name, 'Bun', `${label}.publisher.name`);
  parseLiteral(publisher.url, 'https://bun.com/', `${label}.publisher.url`);
  parseLiteral(input.sourceManifest, '/registry/bun-1.4-assets.json', `${label}.sourceManifest`);
  parseLiteral(input.archivePolicy, 'content-addressed-snapshot', `${label}.archivePolicy`);
  return {
    id,
    canonicalEndpoint,
    projectEndpoint,
    publisher: { name: 'Bun', url: 'https://bun.com/' },
    sourceManifest: '/registry/bun-1.4-assets.json',
    archivePolicy: 'content-addressed-snapshot',
  };
}

function parseProject(value: unknown, label: string): ProjectRSSProjectRegistration {
  const input = parseRecord(value, label);
  const hasReason = Object.hasOwn(input, 'reason');
  exactKeys(
    input,
    [
      'projectId',
      'path',
      'repositoryRelation',
      'repositoryRemote',
      'feedStatus',
      ...(hasReason ? ['reason'] : []),
      'channels',
    ],
    label
  );
  const projectId = parseProjectId(input.projectId);
  const path = parseStringValue(input.path, `${label}.path`);
  const repositoryRelation = input.repositoryRelation;
  if (repositoryRelation !== 'root' && repositoryRelation !== 'contained') {
    throw new TypeError(`${label}.repositoryRelation must be root or contained`);
  }
  const repositoryRemote = input.repositoryRemote;
  if (repositoryRemote !== 'origin' && repositoryRemote !== 'cascade') {
    throw new TypeError(`${label}.repositoryRemote must be origin or cascade`);
  }
  const feedStatus = input.feedStatus;
  if (feedStatus !== 'registered' && feedStatus !== 'unregistered') {
    throw new TypeError(`${label}.feedStatus must be registered or unregistered`);
  }
  const channels = parseArrayValue(input.channels, `${label}.channels`).map((channel, index) =>
    parseChannel(channel, projectId, `${label}.channels[${index}]`)
  );
  if (feedStatus === 'registered') {
    if (hasReason || channels.length === 0) {
      throw new TypeError(`${label} registered projects require channels and no reason`);
    }
  } else {
    parseLiteral(input.reason, 'no-authoritative-feed-registration', `${label}.reason`);
    if (channels.length !== 0) {
      throw new TypeError(`${label} unregistered projects cannot have channels`);
    }
  }
  return {
    projectId,
    path,
    repositoryRelation,
    repositoryRemote,
    feedStatus,
    ...(feedStatus === 'unregistered'
      ? { reason: 'no-authoritative-feed-registration' as const }
      : {}),
    channels,
  };
}

export function parseProjectRSSChannelRegistry(value: unknown): ProjectRSSChannelRegistry {
  const input = parseRecord(value, 'project RSS registry');
  exactKeys(
    input,
    [
      'schemaVersion',
      'feedSchemaVersion',
      'scope',
      'origin',
      'inventorySource',
      'defaultPolicy',
      'repositories',
      'pendingIndependentProjects',
      'projects',
    ],
    'project RSS registry'
  );
  parseLiteral(
    input.schemaVersion,
    PROJECT_RSS_REGISTRY_SCHEMA_VERSION,
    'project RSS registry.schemaVersion'
  );
  parseLiteral(
    input.feedSchemaVersion,
    PROJECT_RSS_FEED_SCHEMA_VERSION,
    'project RSS registry.feedSchemaVersion'
  );
  parseLiteral(input.scope, 'root-and-active-projects', 'project RSS registry.scope');
  parseLiteral(input.origin, PROJECT_RSS_ORIGIN, 'project RSS registry.origin');
  parseLiteral(
    input.inventorySource,
    'tools/projects-root-check.ts',
    'project RSS registry.inventorySource'
  );
  parseLiteral(
    input.defaultPolicy,
    'unregistered-no-fallback',
    'project RSS registry.defaultPolicy'
  );

  const repositoryInputs = parseArrayValue(input.repositories, 'project RSS registry.repositories');
  const repositories = repositoryInputs.map((value, index) => {
    const label = `project RSS registry.repositories[${index}]`;
    const entry = parseRecord(value, label);
    exactKeys(entry, ['repository', 'authority', 'projectIds', 'channelIds'], label);
    const repository = parseRepository(entry.repository, `${label}.repository`);
    const rawAuthority = entry.authority;
    if (rawAuthority !== 'feed-host' && rawAuthority !== 'independent-no-feed') {
      throw new TypeError(`${label}.authority is invalid`);
    }
    const authority: 'feed-host' | 'independent-no-feed' = rawAuthority;
    return {
      repository,
      authority,
      projectIds: parseArrayValue(entry.projectIds, `${label}.projectIds`).map(item =>
        parseProjectId(item)
      ),
      channelIds: parseArrayValue(entry.channelIds, `${label}.channelIds`).map(item =>
        parseFeedId(item)
      ),
    };
  });
  const repositoryRemotes = new Set(repositories.map(entry => entry.repository.remote));
  if (
    repositoryRemotes.size !== repositories.length ||
    !repositoryRemotes.has('origin') ||
    !repositoryRemotes.has('cascade')
  ) {
    throw new TypeError('project RSS registry requires unique origin and cascade repositories');
  }

  const pendingIndependentProjects = parseArrayValue(
    input.pendingIndependentProjects,
    'project RSS registry.pendingIndependentProjects'
  ).map((value, index) => {
    const label = `project RSS registry.pendingIndependentProjects[${index}]`;
    const entry = parseRecord(value, label);
    exactKeys(entry, ['projectId', 'repository', 'feedStatus', 'reason'], label);
    parseLiteral(entry.repository, null, `${label}.repository`);
    parseLiteral(entry.feedStatus, 'unregistered', `${label}.feedStatus`);
    parseLiteral(entry.reason, 'canonical-repository-unresolved', `${label}.reason`);
    return {
      projectId: parseProjectId(entry.projectId),
      repository: null,
      feedStatus: 'unregistered' as const,
      reason: 'canonical-repository-unresolved' as const,
    };
  });
  const projects = parseArrayValue(input.projects, 'project RSS registry.projects').map(
    (value, index) => parseProject(value, `project RSS registry.projects[${index}]`)
  );

  const projectIds = projects.map(project => unbrand(project.projectId));
  const pendingIds = pendingIndependentProjects.map(project => unbrand(project.projectId));
  if (new Set(projectIds).size !== projectIds.length) {
    throw new TypeError('project RSS registry has duplicate project IDs');
  }
  if (new Set(pendingIds).size !== pendingIds.length) {
    throw new TypeError('project RSS registry has duplicate pending project IDs');
  }
  if (pendingIds.some(id => projectIds.includes(id))) {
    throw new TypeError('pending project IDs cannot also be registered projects');
  }
  const root = projects[0];
  if (
    !root ||
    root.projectId !== ROOT_RSS_PROJECT_ID ||
    root.path !== '.' ||
    root.repositoryRelation !== 'root' ||
    root.repositoryRemote !== 'origin' ||
    root.feedStatus !== 'registered'
  ) {
    throw new TypeError('project RSS registry requires the registered root project first');
  }
  if (projects.slice(1).some(project => project.feedStatus === 'registered')) {
    throw new TypeError(
      'project RSS registry currently allows only the root project to register feeds'
    );
  }
  const sortedContainedIds = [...projectIds.slice(1)].sort((a, b) => a.localeCompare(b));
  if (projectIds.slice(1).join('\0') !== sortedContainedIds.join('\0')) {
    throw new TypeError('project RSS contained projects must be sorted by project ID');
  }
  for (const project of projects.slice(1)) {
    const id = unbrand(project.projectId);
    activeProjectPath(project.path);
    if (
      project.repositoryRelation !== 'contained' ||
      project.repositoryRemote !== 'origin' ||
      project.path.split('/').at(-1) !== id ||
      INDEPENDENT_PROJECT_IDS.has(id)
    ) {
      throw new TypeError(`project RSS contained project ${id} has invalid ownership`);
    }
  }

  const channels = projects.flatMap(project => project.channels);
  const channelIds = channels.map(channel => unbrand(channel.id));
  const canonicalPaths = channels.map(channel => channel.canonicalEndpoint);
  const aliasPaths = channels.map(channel => channel.projectEndpoint);
  for (const [values, label] of [
    [channelIds, 'channel IDs'],
    [canonicalPaths, 'canonical endpoints'],
    [aliasPaths, 'project aliases'],
  ] as const) {
    if (new Set(values).size !== values.length) {
      throw new TypeError(`project RSS registry has duplicate ${label}`);
    }
  }
  if (aliasPaths.some(path => canonicalPaths.includes(path))) {
    throw new TypeError('project RSS aliases cannot collide with canonical endpoints');
  }
  if (
    channels.length !== ROOT_BUN_14_CHANNELS.length ||
    channels.some((channel, index) => {
      const expected = ROOT_BUN_14_CHANNELS[index];
      return (
        !expected ||
        channel.id !== expected.id ||
        channel.canonicalEndpoint !== expected.canonicalEndpoint ||
        channel.projectEndpoint !== expected.projectEndpoint
      );
    })
  ) {
    throw new TypeError('project RSS root channels must match the Bun 1.4 channel contract');
  }

  const origin = repositories.find(entry => entry.repository.remote === 'origin')!;
  const cascade = repositories.find(entry => entry.repository.remote === 'cascade')!;
  if (origin.authority !== 'feed-host' || cascade.authority !== 'independent-no-feed') {
    throw new TypeError('project RSS repository authorities do not match canonical roles');
  }
  if (origin.projectIds.map(unbrand).join('\0') !== projectIds.join('\0')) {
    throw new TypeError('origin project IDs must exactly match root and contained projects');
  }
  if (origin.channelIds.map(unbrand).join('\0') !== channelIds.join('\0')) {
    throw new TypeError('origin channel IDs must exactly match registered project channels');
  }
  if (cascade.channelIds.length !== 0) {
    throw new TypeError('cascade repository must not inherit channels');
  }
  if (cascade.projectIds.map(unbrand).join('\0') !== 'cascade-mover-v3') {
    throw new TypeError('cascade repository project identity is invalid');
  }
  if (pendingIds.join('\0') !== PENDING_INDEPENDENT_PROJECT_IDS.map(unbrand).join('\0')) {
    throw new TypeError(
      'pending independent project identities do not match the reviewed inventory'
    );
  }

  return {
    schemaVersion: PROJECT_RSS_REGISTRY_SCHEMA_VERSION,
    feedSchemaVersion: PROJECT_RSS_FEED_SCHEMA_VERSION,
    scope: 'root-and-active-projects',
    origin: PROJECT_RSS_ORIGIN,
    inventorySource: 'tools/projects-root-check.ts',
    defaultPolicy: 'unregistered-no-fallback',
    repositories,
    pendingIndependentProjects,
    projects,
  };
}

export function buildProjectRSSChannelRegistry(
  activeProjectLeaves: readonly { tier: 'active'; path: string }[]
): ProjectRSSChannelRegistry {
  const byId = new Map<string, ProjectRSSProjectRegistration>();
  for (const leaf of activeProjectLeaves) {
    if (leaf.tier !== 'active') throw new Error(`Project leaf must have active tier: ${leaf.path}`);
    const path = activeProjectPath(leaf.path);
    const name = path.split('/').at(-1);
    if (!name) throw new Error(`Active project path has no project ID: ${path}`);
    if (INDEPENDENT_PROJECT_IDS.has(name)) continue;
    const projectId = asProjectId(name);
    const prior = byId.get(name);
    if (prior && prior.path !== path) {
      throw new Error(`Duplicate project ID ${name} has paths ${prior.path} and ${path}`);
    }
    byId.set(name, {
      projectId,
      path,
      repositoryRelation: 'contained',
      repositoryRemote: 'origin',
      feedStatus: 'unregistered',
      reason: 'no-authoritative-feed-registration',
      channels: [],
    });
  }

  const root: ProjectRSSProjectRegistration = {
    projectId: ROOT_RSS_PROJECT_ID,
    path: '.',
    repositoryRelation: 'root',
    repositoryRemote: 'origin',
    feedStatus: 'registered',
    channels: [...ROOT_BUN_14_CHANNELS],
  };
  const projects = [
    root,
    ...[...byId.values()].sort((a, b) => unbrand(a.projectId).localeCompare(unbrand(b.projectId))),
  ];

  return parseProjectRSSChannelRegistry({
    schemaVersion: PROJECT_RSS_REGISTRY_SCHEMA_VERSION,
    feedSchemaVersion: PROJECT_RSS_FEED_SCHEMA_VERSION,
    scope: 'root-and-active-projects',
    origin: PROJECT_RSS_ORIGIN,
    inventorySource: 'tools/projects-root-check.ts',
    defaultPolicy: 'unregistered-no-fallback',
    repositories: [
      {
        repository: repositoryRecord(GITHUB_ORIGIN),
        authority: 'feed-host',
        projectIds: projects.map(project => project.projectId),
        channelIds: ROOT_BUN_14_CHANNELS.map(channel => channel.id),
      },
      {
        repository: repositoryRecord(GITHUB_CASCADE),
        authority: 'independent-no-feed',
        projectIds: [asProjectId('cascade-mover-v3')],
        channelIds: [],
      },
    ],
    pendingIndependentProjects: PENDING_INDEPENDENT_PROJECT_IDS.map(projectId => ({
      projectId,
      repository: null,
      feedStatus: 'unregistered',
      reason: 'canonical-repository-unresolved',
    })),
    projects,
  });
}

export function projectRSSAliasRedirects(
  channels: readonly ProjectRSSChannelRegistration[] = ROOT_BUN_14_CHANNELS
): ReadonlyMap<string, string> {
  const aliases = new Map<string, string>();
  for (const channel of channels) {
    const alias = parseRssPath(channel.projectEndpoint, `${channel.id}.projectEndpoint`, 'project');
    const canonical = parseRssPath(
      channel.canonicalEndpoint,
      `${channel.id}.canonicalEndpoint`,
      'canonical'
    );
    if (alias === canonical) throw new TypeError(`RSS alias ${alias} cannot target itself`);
    if (aliases.has(alias)) throw new TypeError(`Duplicate project RSS alias: ${alias}`);
    aliases.set(alias, canonical);
  }
  return aliases;
}

export function resolveProjectRSSAlias(
  pathname: string,
  channels: readonly ProjectRSSChannelRegistration[] = ROOT_BUN_14_CHANNELS
): string | undefined {
  return projectRSSAliasRedirects(channels).get(pathname);
}

export function projectRSSAliasRoutes(
  channels: readonly ProjectRSSChannelRegistration[] = ROOT_BUN_14_CHANNELS
): Record<string, (request: Request) => Response> {
  return Object.fromEntries(
    [...projectRSSAliasRedirects(channels)].map(([alias, canonical]) => [
      alias,
      (request: Request) => {
        if (request.method !== 'GET' && request.method !== 'HEAD') {
          return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } });
        }
        const search = new URL(request.url).search;
        return new Response(null, {
          status: 301,
          headers: { Location: `${canonical}${search}` },
        });
      },
    ])
  );
}

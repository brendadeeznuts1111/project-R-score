import { parseFeedId, parseProjectId } from '../types/branded.ts';
import {
  canonicalRepositoryRecord,
  projectAliasEndpoint,
} from './project-channel-registry-contract.ts';
import type {
  ProjectRSSChannelRegistration,
  ProjectRSSProjectRegistration,
  ProjectRSSRepository,
} from './project-channel-registry-types.ts';
import {
  exactKeys,
  parseArrayValue,
  parseLiteral,
  parseRecord,
  parseRssPath,
  parseStringValue,
} from './project-channel-registry-validation.ts';

export function parseRepository(value: unknown, label: string): ProjectRSSRepository {
  const input = parseRecord(value, label);
  exactKeys(input, ['remote', 'host', 'owner', 'name', 'ownerName', 'url'], label);
  const remote = input.remote;
  if (remote !== 'origin' && remote !== 'cascade') {
    throw new TypeError(`${label}.remote must be origin or cascade`);
  }
  const expected = canonicalRepositoryRecord(remote);
  for (const key of ['host', 'owner', 'name', 'ownerName', 'url'] as const) {
    if (input[key] !== expected[key]) {
      throw new TypeError(`${label}.${key} does not match canonical ${remote}`);
    }
  }
  return expected;
}

export function parseChannel(
  value: unknown,
  projectId: ProjectRSSProjectRegistration['projectId'],
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

export function parseProject(value: unknown, label: string): ProjectRSSProjectRegistration {
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

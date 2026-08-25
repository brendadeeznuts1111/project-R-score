import {
  GITHUB_CASCADE,
  GITHUB_ORIGIN,
  type GitHubRemoteConstants,
} from '../github-repository-ref.ts';
import { asFeedId, asProjectId, unbrand, type ProjectId } from '../types/branded.ts';
import {
  ROOT_RSS_PROJECT_ID,
  type ProjectRSSChannelRegistration,
  type ProjectRSSRepository,
} from './project-channel-registry-types.ts';

const BUN_14_CHANNEL_ENDPOINTS = [
  ['bun-1.4:all', '/feeds/v1/all.xml'],
  ['bun-1.4:image', '/feeds/v1/images.xml'],
  ['bun-1.4:video', '/feeds/v1/videos.xml'],
  ['bun-1.4:embed', '/feeds/v1/embeds.xml'],
] as const;

export const PENDING_INDEPENDENT_PROJECT_IDS = [
  asProjectId('kimiremote'),
  asProjectId('f402-openapi'),
  asProjectId('bet-ticker-worker-v1.1'),
] as const;

export const INDEPENDENT_PROJECT_IDS = new Set([
  ...PENDING_INDEPENDENT_PROJECT_IDS.map(unbrand),
  'cascade-mover-v3',
]);

export function activeProjectPath(value: string): string {
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

export function repositoryRecord(repository: GitHubRemoteConstants): ProjectRSSRepository {
  return {
    remote: repository.remote,
    host: repository.host,
    owner: repository.owner,
    name: repository.name,
    ownerName: repository.ownerName,
    url: repository.url,
  };
}

export function canonicalRepositoryRecord(remote: 'origin' | 'cascade') {
  return repositoryRecord(remote === 'origin' ? GITHUB_ORIGIN : GITHUB_CASCADE);
}

export function projectAliasEndpoint(projectId: ProjectId, canonicalEndpoint: string): string {
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

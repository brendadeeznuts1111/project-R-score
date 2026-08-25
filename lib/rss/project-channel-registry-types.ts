import type { GitHubRemoteConstants, GitHubRemoteSlot } from '../github-repository-ref.ts';
import { asProjectId, type FeedId, type ProjectId } from '../types/branded.ts';

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

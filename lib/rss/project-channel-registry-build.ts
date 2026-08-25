import { GITHUB_CASCADE, GITHUB_ORIGIN } from '../github-repository-ref.ts';
import { asProjectId, unbrand } from '../types/branded.ts';
import {
  activeProjectPath,
  INDEPENDENT_PROJECT_IDS,
  PENDING_INDEPENDENT_PROJECT_IDS,
  repositoryRecord,
  ROOT_BUN_14_CHANNELS,
} from './project-channel-registry-contract.ts';
import { parseProjectRSSChannelRegistry } from './project-channel-registry-parser.ts';
import {
  PROJECT_RSS_FEED_SCHEMA_VERSION,
  PROJECT_RSS_ORIGIN,
  PROJECT_RSS_REGISTRY_SCHEMA_VERSION,
  ROOT_RSS_PROJECT_ID,
  type ProjectRSSChannelRegistry,
  type ProjectRSSProjectRegistration,
} from './project-channel-registry-types.ts';

export function buildProjectRSSChannelRegistry(
  activeProjectLeaves: readonly { tier: 'active'; path: string }[]
): ProjectRSSChannelRegistry {
  const byId = new Map<string, ProjectRSSProjectRegistration>();
  for (const leaf of activeProjectLeaves) {
    if (leaf.tier !== 'active') {
      throw new Error(`Project leaf must have active tier: ${leaf.path}`);
    }
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

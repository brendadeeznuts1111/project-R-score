import { unbrand } from '../types/branded.ts';
import {
  activeProjectPath,
  INDEPENDENT_PROJECT_IDS,
  PENDING_INDEPENDENT_PROJECT_IDS,
  ROOT_BUN_14_CHANNELS,
} from './project-channel-registry-contract.ts';
import {
  ROOT_RSS_PROJECT_ID,
  type ProjectRSSChannelRegistry,
} from './project-channel-registry-types.ts';

type RegistryCollections = Pick<
  ProjectRSSChannelRegistry,
  'repositories' | 'pendingIndependentProjects' | 'projects'
>;

export function validateRegistryRelationships(registry: RegistryCollections): void {
  const { repositories, pendingIndependentProjects, projects } = registry;
  const repositoryRemotes = new Set(repositories.map(entry => entry.repository.remote));
  if (
    repositoryRemotes.size !== repositories.length ||
    !repositoryRemotes.has('origin') ||
    !repositoryRemotes.has('cascade')
  ) {
    throw new TypeError('project RSS registry requires unique origin and cascade repositories');
  }

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
  validateProjectOwnership(projects, projectIds);
  const channelIds = validateChannels(projects);
  validateRepositoryOwnership(registry, projectIds, channelIds, pendingIds);
}

function validateProjectOwnership(
  projects: ProjectRSSChannelRegistry['projects'],
  projectIds: string[]
): void {
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
  const containedIds = projectIds.slice(1);
  const sortedContainedIds = [...containedIds].sort((a, b) => a.localeCompare(b));
  if (containedIds.join('\0') !== sortedContainedIds.join('\0')) {
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
}

function validateChannels(projects: ProjectRSSChannelRegistry['projects']): string[] {
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
  return channelIds;
}

function validateRepositoryOwnership(
  registry: RegistryCollections,
  projectIds: string[],
  channelIds: string[],
  pendingIds: string[]
): void {
  const origin = registry.repositories.find(entry => entry.repository.remote === 'origin')!;
  const cascade = registry.repositories.find(entry => entry.repository.remote === 'cascade')!;
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
}

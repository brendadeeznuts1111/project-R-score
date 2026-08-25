import {
  parsePendingIndependentProjects,
  parseProjects,
  parseRepositories,
} from './project-channel-registry-collections.ts';
import { validateRegistryRelationships } from './project-channel-registry-relations.ts';
import {
  PROJECT_RSS_FEED_SCHEMA_VERSION,
  PROJECT_RSS_ORIGIN,
  PROJECT_RSS_REGISTRY_SCHEMA_VERSION,
  type ProjectRSSChannelRegistry,
} from './project-channel-registry-types.ts';
import { exactKeys, parseLiteral, parseRecord } from './project-channel-registry-validation.ts';

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

  const repositories = parseRepositories(input.repositories);
  const pendingIndependentProjects = parsePendingIndependentProjects(
    input.pendingIndependentProjects
  );
  const projects = parseProjects(input.projects);
  validateRegistryRelationships({ repositories, pendingIndependentProjects, projects });

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

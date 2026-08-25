import { parseFeedId, parseProjectId } from '../types/branded.ts';
import { parseProject, parseRepository } from './project-channel-registry-entries.ts';
import type { ProjectRSSChannelRegistry } from './project-channel-registry-types.ts';
import {
  exactKeys,
  parseArrayValue,
  parseLiteral,
  parseRecord,
} from './project-channel-registry-validation.ts';

export function parseRepositories(value: unknown): ProjectRSSChannelRegistry['repositories'] {
  return parseArrayValue(value, 'project RSS registry.repositories').map((item, index) => {
    const label = `project RSS registry.repositories[${index}]`;
    const entry = parseRecord(item, label);
    exactKeys(entry, ['repository', 'authority', 'projectIds', 'channelIds'], label);
    const repository = parseRepository(entry.repository, `${label}.repository`);
    const authority = entry.authority;
    if (authority !== 'feed-host' && authority !== 'independent-no-feed') {
      throw new TypeError(`${label}.authority is invalid`);
    }
    return {
      repository,
      authority,
      projectIds: parseArrayValue(entry.projectIds, `${label}.projectIds`).map(parseProjectId),
      channelIds: parseArrayValue(entry.channelIds, `${label}.channelIds`).map(parseFeedId),
    };
  });
}

export function parsePendingIndependentProjects(
  value: unknown
): ProjectRSSChannelRegistry['pendingIndependentProjects'] {
  return parseArrayValue(value, 'project RSS registry.pendingIndependentProjects').map(
    (item, index) => {
      const label = `project RSS registry.pendingIndependentProjects[${index}]`;
      const entry = parseRecord(item, label);
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
    }
  );
}

export function parseProjects(value: unknown): ProjectRSSChannelRegistry['projects'] {
  return parseArrayValue(value, 'project RSS registry.projects').map((item, index) =>
    parseProject(item, `project RSS registry.projects[${index}]`)
  );
}

import type {
  ProjectRSSChannelRegistration,
  ProjectRSSProjectRegistration,
  ProjectRSSRepository,
} from '../lib/rss/project-channel-registry.ts';
import {
  asFeedId,
  asPagesProjectId,
  asProjectId,
  type FeedId,
  type PagesProjectId,
  type ProjectId,
} from '../lib/types/branded.ts';

const projectId: ProjectId = asProjectId('project-r-score');
const feedId: FeedId = asFeedId('bun-1.4:all');
const pagesProjectId: PagesProjectId = asPagesProjectId('project-r-score');

const channelId: ProjectRSSChannelRegistration['id'] = feedId;
const registrationProjectId: ProjectRSSProjectRegistration['projectId'] = projectId;
const repositoryRemote: ProjectRSSProjectRegistration['repositoryRemote'] = 'origin';

// @ts-expect-error — channel identity cannot stand in for project ownership
const projectFromFeed: ProjectId = feedId;
// @ts-expect-error — project identity cannot stand in for a channel identity
const feedFromProject: FeedId = projectId;
// @ts-expect-error — Cloudflare Pages project identity is not operations ProjectId
const projectFromPages: ProjectId = pagesProjectId;
// @ts-expect-error — channel registration requires FeedId
const channelFromProject: ProjectRSSChannelRegistration['id'] = projectId;
// @ts-expect-error — repository authority is a closed remote slot
const inventedRemote: ProjectRSSProjectRegistration['repositoryRemote'] = 'package-name';
// @ts-expect-error — repository identity cannot be an owner/name string
const unstructuredRepository: ProjectRSSRepository = 'owner/repository';

void channelId;
void registrationProjectId;
void repositoryRemote;
void projectFromFeed;
void feedFromProject;
void projectFromPages;
void channelFromProject;
void inventedRemote;
void unstructuredRepository;

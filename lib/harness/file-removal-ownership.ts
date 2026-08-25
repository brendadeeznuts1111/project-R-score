// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
import { parseProjectRSSChannelRegistry } from '../rss/project-channel-registry.ts';
import { dirnamePath, joinPath, normalizePath } from '../path-bun.ts';
import type { FileRemovalOwnership } from './file-removal-types.ts';

const PROJECT_CHANNEL_REGISTRY = 'public/registry/project-rss-channels.json';

function contains(root: string, candidate: string): boolean {
  return root === '.' || candidate === root || candidate.startsWith(`${root}/`);
}

function nearestRoot(path: string, roots: readonly string[], floor: string): string {
  return (
    roots
      .filter(root => contains(floor, root) && contains(root, path))
      .sort((a, b) => b.length - a.length || a.localeCompare(b))[0] ?? floor
  );
}

export type FileRemovalOwnershipIndex = {
  forPath(path: string): FileRemovalOwnership;
};

export async function buildFileRemovalOwnershipIndex(
  root: string,
  allPaths: readonly string[]
): Promise<FileRemovalOwnershipIndex> {
  const registryFile = Bun.file(joinPath(root, PROJECT_CHANNEL_REGISTRY));
  const registry = parseProjectRSSChannelRegistry(await registryFile.json());
  const projects = [...registry.projects].sort(
    (a, b) =>
      b.path.length - a.path.length || String(a.projectId).localeCompare(String(b.projectId))
  );
  const packageRoots = allPaths
    .filter(path => path === 'package.json' || path.endsWith('/package.json'))
    .map(path => (path === 'package.json' ? '.' : normalizePath(dirnamePath(path))))
    .sort((a, b) => b.length - a.length || a.localeCompare(b));

  return {
    forPath(path: string): FileRemovalOwnership {
      const project = projects.find(entry => contains(entry.path, path));
      if (!project) {
        throw new Error(`No project RSS ownership entry covers ${path}`);
      }
      const packageRoot = nearestRoot(path, packageRoots, project.path);
      return {
        projectId: project.projectId,
        path: project.path,
        repositoryRelation: project.repositoryRelation,
        repositoryRemote: project.repositoryRemote,
        feedStatus: project.feedStatus,
        channelIds: project.channels.map(channel => channel.id),
        packageRoot,
        boundary: `${String(project.projectId)}:${packageRoot}`,
      };
    },
  };
}

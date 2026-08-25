import { ROOT_BUN_14_CHANNELS } from './project-channel-registry-contract.ts';
import type { ProjectRSSChannelRegistration } from './project-channel-registry-types.ts';
import { parseRssPath } from './project-channel-registry-validation.ts';

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

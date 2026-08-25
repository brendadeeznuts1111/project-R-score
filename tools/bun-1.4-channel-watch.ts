#!/usr/bin/env bun
// Bun --watch tracks imported files. Import both reviewed source registries so
// asset or project-ownership updates restart and rebuild every projection.
import manifestWatchRoot from '../public/registry/bun-1.4-assets.json' with { type: 'json' };
import projectChannelWatchRoot from '../public/registry/project-rss-channels.json' with { type: 'json' };
import { syncBun14ChannelRelease } from './bun-blog-assets/channel-release.ts';

void manifestWatchRoot;
void projectChannelWatchRoot;
await syncBun14ChannelRelease({ check: false, archive: true });

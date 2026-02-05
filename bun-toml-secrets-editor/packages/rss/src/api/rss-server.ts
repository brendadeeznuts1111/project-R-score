import { getLogger } from '@bun-toml/core';
import { RSSFeedMonitor } from '../rss-feed-monitor';

export const rssServer = {
  start: (port: number = 3000) => {
    const logger = getLogger();
    const monitor = new RSSFeedMonitor({ maxFeeds: 10 });
    
    logger.info(`RSS Server starting on port ${port}`);
    
    return {
      port,
      monitor,
      stop: () => logger.info('RSS Server stopped')
    };
  }
};

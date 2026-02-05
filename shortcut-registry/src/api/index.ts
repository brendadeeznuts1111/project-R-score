/**
 * API entry point - Start the HTTP server
 */

import server from './server';
import { logger } from '../utils/logger';

const port = server.port;

logger.info('Starting ShortcutRegistry API server', { port });

Bun.serve({
  port,
  fetch: server.fetch,
});

logger.info(`ShortcutRegistry API server running on http://localhost:${port}`);

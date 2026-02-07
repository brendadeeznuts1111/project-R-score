// lib/mcp/wiki-worker.ts - Bun Worker for multi-threaded wiki generation

import { MCPWikiGenerator } from './wiki-generator-mcp';

declare var self: Worker;

self.onmessage = async (event: MessageEvent) => {
  try {
    const { taskId, template, request } = event.data;

    if (!taskId || !template || !request) {
      throw new Error('Invalid worker message format');
    }

    const result = await MCPWikiGenerator.generateWikiContent(template, request);

    self.postMessage({ taskId, data: result });
  } catch (error) {
    self.postMessage({ taskId: event.data?.taskId, data: error });
  }
};

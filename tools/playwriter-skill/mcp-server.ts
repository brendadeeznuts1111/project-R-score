#!/usr/bin/env bun

/**
 * Playwriter MCP Server for Kimi CLI
 *
 * This provides MCP tool definitions for browser automation
 *
 * Usage:
 *   bun run mcp-server.ts
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { PlaywriterR2Integration } from './r2-integration';

// Check if R2 is configured
const R2_ENABLED = !!(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY);

// Tool definitions
const TOOLS = [
  {
    name: 'browser_execute',
    description: 'Execute Playwright code in the browser. Variables available: page, context, state, require',
    inputSchema: {
      type: 'object',
      properties: {
        session: {
          type: 'number',
          description: 'Session ID (create with browser_session_new)',
        },
        code: {
          type: 'string',
          description: 'JavaScript code to execute',
        },
      },
      required: ['session', 'code'],
    },
  },
  {
    name: 'browser_navigate',
    description: 'Navigate to a URL',
    inputSchema: {
      type: 'object',
      properties: {
        session: { type: 'number', description: 'Session ID' },
        url: { type: 'string', description: 'URL to navigate to' },
      },
      required: ['session', 'url'],
    },
  },
  {
    name: 'browser_click',
    description: 'Click an element on the page',
    inputSchema: {
      type: 'object',
      properties: {
        session: { type: 'number', description: 'Session ID' },
        selector: { type: 'string', description: 'Element selector (CSS, aria-ref, text)' },
      },
      required: ['session', 'selector'],
    },
  },
  {
    name: 'browser_fill',
    description: 'Fill a form field',
    inputSchema: {
      type: 'object',
      properties: {
        session: { type: 'number', description: 'Session ID' },
        selector: { type: 'string', description: 'Input selector' },
        value: { type: 'string', description: 'Value to fill' },
      },
      required: ['session', 'selector', 'value'],
    },
  },
  {
    name: 'browser_get_text',
    description: 'Extract text content from elements',
    inputSchema: {
      type: 'object',
      properties: {
        session: { type: 'number', description: 'Session ID' },
        selector: { type: 'string', description: 'Element selector' },
      },
      required: ['session', 'selector'],
    },
  },
  {
    name: 'browser_screenshot',
    description: 'Take a screenshot of the current page',
    inputSchema: {
      type: 'object',
      properties: {
        session: { type: 'number', description: 'Session ID' },
        path: { type: 'string', description: 'Path to save screenshot (optional)' },
        labels: { type: 'boolean', description: 'Add accessibility labels', default: true },
      },
      required: ['session'],
    },
  },
  {
    name: 'browser_session_new',
    description: 'Create a new browser session',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'browser_session_list',
    description: 'List active browser sessions',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'browser_screenshot_r2',
    description: R2_ENABLED
      ? 'Take a screenshot and upload to R2 storage'
      : 'Upload screenshot to R2 (R2 not configured - set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)',
    inputSchema: {
      type: 'object',
      properties: {
        session: { type: 'number', description: 'Session ID' },
        fullPage: { type: 'boolean', description: 'Capture full page', default: true },
        labels: { type: 'boolean', description: 'Add accessibility labels', default: false },
        bucket: { type: 'string', description: 'R2 bucket name (optional)' },
      },
      required: ['session'],
    },
  },
  {
    name: 'browser_snapshot_r2',
    description: R2_ENABLED
      ? 'Capture accessibility snapshot and upload to R2'
      : 'Upload snapshot to R2 (R2 not configured)',
    inputSchema: {
      type: 'object',
      properties: {
        session: { type: 'number', description: 'Session ID' },
        bucket: { type: 'string', description: 'R2 bucket name (optional)' },
      },
      required: ['session'],
    },
  },
  {
    name: 'browser_list_artifacts',
    description: R2_ENABLED
      ? 'List all artifacts stored in R2 for a session'
      : 'List artifacts (R2 not configured)',
    inputSchema: {
      type: 'object',
      properties: {
        session: { type: 'number', description: 'Session ID' },
        bucket: { type: 'string', description: 'R2 bucket name (optional)' },
      },
      required: ['session'],
    },
  },
];

// Execute playwriter command
async function executePlaywriter(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn(['playwriter', ...args], {
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;

  return { stdout, stderr, exitCode };
}

// Main server
const server = new Server(
  {
    name: 'playwriter-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

// Call tool
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'browser_session_new': {
        const result = await executePlaywriter(['session', 'new']);
        return {
          content: [
            { type: 'text', text: result.stdout || 'Session created' },
            { type: 'text', text: result.stderr },
          ],
        };
      }

      case 'browser_session_list': {
        const result = await executePlaywriter(['session', 'list']);
        return {
          content: [{ type: 'text', text: result.stdout || result.stderr }],
        };
      }

      case 'browser_navigate': {
        const { session, url } = args as { session: number; url: string };
        const code = `await page.goto('${url}'); console.log('Navigated to: ${url}');`;
        const result = await executePlaywriter(['-s', String(session), '-e', code]);
        return {
          content: [{ type: 'text', text: result.stdout || result.stderr }],
        };
      }

      case 'browser_click': {
        const { session, selector } = args as { session: number; selector: string };
        const code = `await page.locator('${selector}').click(); console.log('Clicked: ${selector}');`;
        const result = await executePlaywriter(['-s', String(session), '-e', code]);
        return {
          content: [{ type: 'text', text: result.stdout || result.stderr }],
        };
      }

      case 'browser_fill': {
        const { session, selector, value } = args as { session: number; selector: string; value: string };
        const code = `await page.locator('${selector}').fill('${value}'); console.log('Filled: ${selector}');`;
        const result = await executePlaywriter(['-s', String(session), '-e', code]);
        return {
          content: [{ type: 'text', text: result.stdout || result.stderr }],
        };
      }

      case 'browser_get_text': {
        const { session, selector } = args as { session: number; selector: string };
        const code = `const texts = await page.locator('${selector}').allTextContents(); console.log(JSON.stringify(texts, null, 2));`;
        const result = await executePlaywriter(['-s', String(session), '-e', code]);
        return {
          content: [{ type: 'text', text: result.stdout || result.stderr }],
        };
      }

      case 'browser_screenshot': {
        const { session, path, labels = true } = args as { session: number; path?: string; labels?: boolean };
        let code: string;
        if (labels) {
          code = `await screenshotWithAccessibilityLabels({ page }); console.log('Screenshot taken with labels');`;
        } else {
          const pathArg = path ? `'${path}'` : `'screenshot.png'`;
          code = `await page.screenshot({ path: ${pathArg} }); console.log('Screenshot saved to: ${pathArg}');`;
        }
        const result = await executePlaywriter(['-s', String(session), '-e', code]);
        return {
          content: [{ type: 'text', text: result.stdout || result.stderr }],
        };
      }

      case 'browser_execute': {
        const { session, code } = args as { session: number; code: string };
        const result = await executePlaywriter(['-s', String(session), '-e', code]);
        return {
          content: [
            { type: 'text', text: result.stdout || 'No output' },
            { type: 'text', text: result.stderr || '' },
          ],
        };
      }

      case 'browser_screenshot_r2': {
        if (!R2_ENABLED) {
          return {
            content: [{ type: 'text', text: 'R2 not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY' }],
            isError: true,
          };
        }

        const { session, fullPage = true, labels = false, bucket } = args as { session: number; fullPage?: boolean; labels?: boolean; bucket?: string };

        try {
          const r2 = new PlaywriterR2Integration({ sessionId: session, bucket });

          // Take screenshot via playwriter
          let code: string;
          if (labels) {
            code = `const buffer = await screenshotWithAccessibilityLabels({ page }); console.log('SCREENSHOT_BASE64:' + buffer.toString('base64'));`;
          } else {
            code = `const buffer = await page.screenshot({ fullPage: ${fullPage} }); console.log('SCREENSHOT_BASE64:' + buffer.toString('base64'));`;
          }

          const result = await executePlaywriter(['-s', String(session), '-e', code]);
          const match = result.stdout.match(/SCREENSHOT_BASE64:([A-Za-z0-9+/=]+)/);

          if (!match) {
            return {
              content: [{ type: 'text', text: 'Failed to capture screenshot' }],
              isError: true,
            };
          }

          const buffer = Buffer.from(match[1], 'base64');
          const url = await r2.uploadScreenshot(new Uint8Array(buffer), {
            url: 'captured via playwriter',
            timestamp: new Date().toISOString(),
            width: 1920,
            height: 1080,
            fullPage,
            labels,
          });

          return {
            content: [
              { type: 'text', text: `Screenshot uploaded to R2` },
              { type: 'text', text: `URL: ${url}` },
            ],
          };
        } catch (error) {
          return {
            content: [{ type: 'text', text: `R2 upload error: ${error instanceof Error ? error.message : String(error)}` }],
            isError: true,
          };
        }
      }

      case 'browser_snapshot_r2': {
        if (!R2_ENABLED) {
          return {
            content: [{ type: 'text', text: 'R2 not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY' }],
            isError: true,
          };
        }

        const { session, bucket } = args as { session: number; bucket?: string };

        try {
          const r2 = new PlaywriterR2Integration({ sessionId: session, bucket });

          // Get accessibility snapshot
          const code = `const snapshot = await accessibilitySnapshot({ page }); console.log('SNAPSHOT_JSON:' + JSON.stringify(snapshot));`;
          const result = await executePlaywriter(['-s', String(session), '-e', code]);
          const match = result.stdout.match(/SNAPSHOT_JSON:(.+)/);

          if (!match) {
            return {
              content: [{ type: 'text', text: 'Failed to capture snapshot' }],
              isError: true,
            };
          }

          const url = await r2.uploadSnapshot(match[1]);

          return {
            content: [
              { type: 'text', text: `Snapshot uploaded to R2` },
              { type: 'text', text: `URL: ${url}` },
            ],
          };
        } catch (error) {
          return {
            content: [{ type: 'text', text: `R2 upload error: ${error instanceof Error ? error.message : String(error)}` }],
            isError: true,
          };
        }
      }

      case 'browser_list_artifacts': {
        if (!R2_ENABLED) {
          return {
            content: [{ type: 'text', text: 'R2 not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY' }],
            isError: true,
          };
        }

        const { session, bucket } = args as { session: number; bucket?: string };

        try {
          const r2 = new PlaywriterR2Integration({ sessionId: session, bucket });
          const artifacts = await r2.listArtifacts();

          const formatted = artifacts.map(a =>
            `- ${a.key} (${(a.size / 1024).toFixed(2)} KB, ${a.lastModified.toISOString()})`
          ).join('\n');

          return {
            content: [
              { type: 'text', text: `Artifacts for session ${session}:` },
              { type: 'text', text: formatted || 'No artifacts found' },
            ],
          };
        } catch (error) {
          return {
            content: [{ type: 'text', text: `R2 list error: ${error instanceof Error ? error.message : String(error)}` }],
            isError: true,
          };
        }
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        { type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Playwriter MCP server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});

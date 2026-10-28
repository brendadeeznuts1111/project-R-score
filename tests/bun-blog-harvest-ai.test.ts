// @see https://bun.com/docs/test/index#run-tests — bun:test
// @see https://bun.com/docs/runtime/http/fetch — fetch
import { describe, expect, test } from 'bun:test';
import {
  buildHarvestAiRequest,
  parseHarvestAiCompletion,
  parseHarvestAiResponseBody,
  parseJsonPath,
  resolveHarvestAiConfig,
  requestHarvestAiSummary,
  type HarvestAiFetch,
} from '../lib/docs/blog-harvest-ai.ts';
import {
  DEFAULT_HARVEST_MAP_CONFIG,
  extractCodeBlocks,
  mapHarvestToBlogMarkdown,
  summarizeHarvestMap,
} from '../lib/docs/blog-codeblocks.ts';

describe('harvest AI config', () => {
  test('defaults match Ollama generate without embedding a key', () => {
    expect(DEFAULT_HARVEST_MAP_CONFIG.enableAI).toBe(true);
    expect(DEFAULT_HARVEST_MAP_CONFIG.aiProvider).toBe('ollama');
    expect(DEFAULT_HARVEST_MAP_CONFIG.aiEndpoint).toBe('http://localhost:11434/api/generate');
    expect(DEFAULT_HARVEST_MAP_CONFIG.aiModel).toBe('llama2');
    expect(DEFAULT_HARVEST_MAP_CONFIG.aiApiKey).toBe('');
    expect(DEFAULT_HARVEST_MAP_CONFIG.aiResponsePath).toBe('response');
    expect(DEFAULT_HARVEST_MAP_CONFIG.aiPrompt).toContain('{TEXT}');
  });

  test('openai provider fills the chat-completions path', () => {
    const config = resolveHarvestAiConfig({ aiProvider: 'openai' });
    expect(config.aiEndpoint).toBe('https://api.openai.com/v1/chat/completions');
    expect(config.aiResponsePath).toBe('choices[0].message.content');
  });
});

describe('harvest AI parse boundary', () => {
  test('parseHarvestAiCompletion reads SUMMARY and TOPICS', () => {
    expect(
      parseHarvestAiCompletion(
        'SUMMARY: Built-in markdown HTML, ANSI, and React. | TOPICS: Bun.markdown, html, render'
      )
    ).toEqual({
      summary: 'Built-in markdown HTML, ANSI, and React.',
      topics: ['Bun.markdown', 'html', 'render'],
    });
  });

  test('parseJsonPath walks dotted and indexed paths', () => {
    const payload = { choices: [{ message: { content: 'ok' } }] };
    expect(parseJsonPath(payload, 'choices[0].message.content')).toBe('ok');
  });

  test('parseHarvestAiResponseBody requires a string at the path', () => {
    expect(parseHarvestAiResponseBody({ response: 'hello' }, 'response')).toBe('hello');
    expect(() => parseHarvestAiResponseBody({ response: 1 }, 'response')).toThrow(/not a string/);
  });

  test('buildHarvestAiRequest interpolates the Ollama template', () => {
    const config = resolveHarvestAiConfig();
    const request = buildHarvestAiRequest(config, 'PROMPT-BODY');
    expect(request.url).toBe('http://localhost:11434/api/generate');
    expect(request.body).toMatchObject({
      model: 'llama2',
      prompt: 'PROMPT-BODY',
      stream: false,
    });
    expect(request.headers['content-type']).toBe('application/json');
    expect(JSON.stringify(request.headers)).not.toContain('Bearer');
  });
});

describe('harvest AI summarize', () => {
  test('requestHarvestAiSummary uses injected fetch and does not call the network', async () => {
    const fetchImpl: HarvestAiFetch = async (url, init) => {
      expect(url).toBe('http://localhost:11434/api/generate');
      const body = JSON.parse(init.body) as { prompt: string };
      expect(body.prompt).toContain('Bun.markdown');
      return {
        ok: true,
        status: 200,
        json: async () => ({
          response: 'SUMMARY: Markdown is built into Bun. | TOPICS: markdown, html',
        }),
        text: async () => '',
      };
    };
    const result = await requestHarvestAiSummary(
      'Bun.markdown.html("# Hello")',
      resolveHarvestAiConfig(),
      fetchImpl
    );
    expect(result.summary).toBe('Markdown is built into Bun.');
    expect(result.topics).toEqual(['markdown', 'html']);
  });

  test('summarizeHarvestMap attaches H2 summaries into the blog markdown map', async () => {
    const html = `
      <h2 id="what-s-new">What's new</h2>
      <h3 id="bun-markdown">Bun.markdown</h3>
      <div class="CodeBlock group/code"><pre><code>const html = Bun.markdown.html("# Hello **world**");</code></pre></div>`;
    const extracted = extractCodeBlocks(html);
    const fetchImpl: HarvestAiFetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        response: 'SUMMARY: What is new in Bun 1.4. | TOPICS: bun, markdown',
      }),
      text: async () => '',
    });
    const summaries = await summarizeHarvestMap(
      extracted,
      DEFAULT_HARVEST_MAP_CONFIG,
      fetchImpl
    );
    expect(summaries['what-s-new']?.summary).toBe('What is new in Bun 1.4.');
    const md = mapHarvestToBlogMarkdown(extracted, {
      sourceUrl: 'https://bun.com/blog/bun-v1.4',
      guideKey: 'blog/bun-v1.4',
      summaries,
    });
    expect(md).toContain('- summary: What is new in Bun 1.4.');
    expect(md).toContain('- topics: bun, markdown');
  });
});

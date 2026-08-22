// @see https://bun.com/docs/runtime/http/fetch — fetch
// @see https://bun.com/docs/runtime/http/fetch#timeouts — Request timeout
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Harvest AI summarisation — parse provider JSON once at this wire edge.
 * Keys are env-only (`HARVEST_AI_API_KEY` / provider env). Never log them.
 */

export type HarvestAiProvider = 'ollama' | 'openai' | 'anthropic' | 'gemini' | 'custom';

export type HarvestAiConfig = {
  enableAI: boolean;
  aiProvider: HarvestAiProvider;
  aiEndpoint: string;
  aiModel: string;
  /** Empty in source. Resolved from env at the call boundary. */
  aiApiKey: string;
  aiPrompt: string;
  aiTemperature: number;
  aiMaxTokens: number;
  aiHeaders: Record<string, string>;
  aiRequestTemplate: Record<string, string | number | boolean>;
  aiResponsePath: string;
  aiExtraBody: Record<string, string | number | boolean>;
};

export type HarvestAiSummary = {
  headingId: string; // brand-ok — Bun blog heading slug
  summary: string;
  topics: string[];
};

export const DEFAULT_HARVEST_AI_PROMPT =
  'Summarize the following text in one concise sentence (max 20 words) and extract 2-3 topic keywords. Format: SUMMARY: <your summary> | TOPICS: <comma-separated keywords>\n\nTEXT: {TEXT}';

export const DEFAULT_HARVEST_AI_CONFIG: HarvestAiConfig = {
  enableAI: true,
  aiProvider: 'ollama',
  aiEndpoint: 'http://localhost:11434/api/generate',
  aiModel: 'llama2',
  aiApiKey: '',
  aiPrompt: DEFAULT_HARVEST_AI_PROMPT,
  aiTemperature: 0.3,
  aiMaxTokens: 100,
  aiHeaders: {},
  aiRequestTemplate: {
    model: '{model}',
    prompt: '{PROMPT}',
    stream: false,
    temperature: '{temperature}',
    max_tokens: '{max_tokens}',
  },
  aiResponsePath: 'response',
  aiExtraBody: {},
};

const PROVIDER_ENDPOINTS: Record<HarvestAiProvider, string> = {
  ollama: 'http://localhost:11434/api/generate',
  openai: 'https://api.openai.com/v1/chat/completions',
  anthropic: 'https://api.anthropic.com/v1/messages',
  gemini: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
  custom: '',
};

const PROVIDER_RESPONSE_PATH: Record<HarvestAiProvider, string> = {
  ollama: 'response',
  openai: 'choices[0].message.content',
  anthropic: 'content[0].text',
  gemini: 'candidates[0].content.parts[0].text',
  custom: 'response',
};

export function resolveHarvestAiConfig(overrides?: Partial<HarvestAiConfig>): HarvestAiConfig {
  const merged = { ...DEFAULT_HARVEST_AI_CONFIG, ...overrides };
  const provider = merged.aiProvider;
  const endpoint =
    overrides?.aiEndpoint?.trim() ||
    PROVIDER_ENDPOINTS[provider].replaceAll('{model}', merged.aiModel);
  const responsePath =
    overrides?.aiResponsePath?.trim() || PROVIDER_RESPONSE_PATH[provider];
  return { ...merged, aiEndpoint: endpoint, aiResponsePath: responsePath };
}

/** API key from config (tests) or env. Never required for Ollama. */
export function resolveHarvestAiApiKey(config: HarvestAiConfig): string {
  const fromConfig = config.aiApiKey.trim();
  if (fromConfig) return fromConfig;
  const fromHarvest = Bun.env.HARVEST_AI_API_KEY?.trim();
  if (fromHarvest) return fromHarvest;
  if (config.aiProvider === 'openai') return Bun.env.OPENAI_API_KEY?.trim() ?? '';
  if (config.aiProvider === 'anthropic') return Bun.env.ANTHROPIC_API_KEY?.trim() ?? '';
  if (config.aiProvider === 'gemini') return Bun.env.GEMINI_API_KEY?.trim() ?? '';
  return '';
}

export function parseHarvestAiCompletion(raw: string): Omit<HarvestAiSummary, 'headingId'> {
  const text = raw.trim();
  const summaryMatch = /SUMMARY:\s*([^|]+)/i.exec(text);
  const topicsMatch = /TOPICS:\s*(.+)$/i.exec(text);
  const summary = (summaryMatch?.[1] ?? text).trim().replace(/\s+/g, ' ');
  const topics = (topicsMatch?.[1] ?? '')
    .split(',')
    .map(topic => topic.trim())
    .filter(Boolean)
    .slice(0, 3);
  return { summary, topics };
}

/** Walk a JSON path such as `choices[0].message.content`. */
export function parseJsonPath(root: unknown, path: string): unknown {
  const tokens = path.match(/[^.[\]]+/g) ?? [];
  let current: unknown = root;
  for (const token of tokens) {
    if (current == null || (typeof current !== 'object' && !Array.isArray(current))) {
      return undefined;
    }
    const index = /^\d+$/.test(token) ? Number.parseInt(token, 10) : token;
    current = (current as Record<string, unknown>)[index as string];
  }
  return current;
}

export function parseHarvestAiResponseBody(payload: unknown, responsePath: string): string {
  const value = parseJsonPath(payload, responsePath);
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`harvest AI response path ${JSON.stringify(responsePath)} was not a string`);
  }
  return value;
}

function interpolateTemplate(
  value: string | number | boolean,
  vars: Record<string, string>
): string | number | boolean {
  if (typeof value !== 'string') return value;
  let out = value;
  for (const [key, replacement] of Object.entries(vars)) {
    out = out.replaceAll(`{${key}}`, replacement);
  }
  if (out === vars.temperature || out === vars.max_tokens) {
    const numeric = Number(out);
    return Number.isFinite(numeric) ? numeric : out;
  }
  return out;
}

export function buildHarvestAiRequest(
  config: HarvestAiConfig,
  prompt: string
): { url: string; headers: Record<string, string>; body: unknown } {
  const key = resolveHarvestAiApiKey(config);
  const vars = {
    model: config.aiModel,
    PROMPT: prompt,
    prompt,
    temperature: String(config.aiTemperature),
    max_tokens: String(config.aiMaxTokens),
  };
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    ...config.aiHeaders,
  };

  if (config.aiProvider === 'openai') {
    if (key) headers.authorization = `Bearer ${key}`;
    return {
      url: config.aiEndpoint,
      headers,
      body: {
        model: config.aiModel,
        messages: [{ role: 'user', content: prompt }],
        temperature: config.aiTemperature,
        max_tokens: config.aiMaxTokens,
        ...config.aiExtraBody,
      },
    };
  }
  if (config.aiProvider === 'anthropic') {
    if (key) headers['x-api-key'] = key;
    headers['anthropic-version'] = headers['anthropic-version'] ?? '2023-06-01';
    return {
      url: config.aiEndpoint,
      headers,
      body: {
        model: config.aiModel,
        max_tokens: config.aiMaxTokens,
        temperature: config.aiTemperature,
        messages: [{ role: 'user', content: prompt }],
        ...config.aiExtraBody,
      },
    };
  }
  if (config.aiProvider === 'gemini') {
    const url = key
      ? `${config.aiEndpoint.replaceAll('{model}', config.aiModel)}?key=${encodeURIComponent(key)}`
      : config.aiEndpoint.replaceAll('{model}', config.aiModel);
    return {
      url,
      headers,
      body: {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: config.aiTemperature,
          maxOutputTokens: config.aiMaxTokens,
        },
        ...config.aiExtraBody,
      },
    };
  }

  const body: Record<string, string | number | boolean> = { ...config.aiExtraBody };
  for (const [field, template] of Object.entries(config.aiRequestTemplate)) {
    body[field] = interpolateTemplate(template, vars);
  }
  return { url: config.aiEndpoint, headers, body };
}

export type HarvestAiFetch = (
  input: string,
  init: { method: string; headers: Record<string, string>; body: string; signal?: AbortSignal }
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown>; text: () => Promise<string> }>;

export async function requestHarvestAiSummary(
  text: string,
  config: HarvestAiConfig,
  fetchImpl: HarvestAiFetch = fetch as HarvestAiFetch
): Promise<Omit<HarvestAiSummary, 'headingId'>> {
  const prompt = config.aiPrompt.replaceAll('{TEXT}', text);
  const request = buildHarvestAiRequest(config, prompt);
  const response = await fetchImpl(request.url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify(request.body),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`harvest AI HTTP ${response.status}: ${detail.slice(0, 200)}`);
  }
  const payload: unknown = await response.json();
  const completion = parseHarvestAiResponseBody(payload, config.aiResponsePath);
  return parseHarvestAiCompletion(completion);
}

export function harvestSectionText(title: string, codes: readonly string[], maxChars = 1500): string {
  const joined = [title, ...codes].filter(Boolean).join('\n\n');
  return joined.length <= maxChars ? joined : `${joined.slice(0, maxChars)}\n…`;
}

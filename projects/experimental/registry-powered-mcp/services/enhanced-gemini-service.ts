import {
  normalizeToolsForGemini,
  normalizeToolResultsFromGemini,
  hasFunctionTools,
  type OpenAITool,
  type GeminiTools,
  type OpenAIToolCall,
  type GeminiToolResult
} from './antigravity-tools';

/**
 * Antigravity Gemini Service with Tool Normalization
 * Provides seamless integration between OpenAI and Gemini tool formats
 */
export class AntigravityGeminiService {
  private apiKey: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Generate content with tool normalization
   * Automatically handles OpenAI ↔ Gemini format conversion
   */
  async generateContentWithTools(
    model: string,
    prompt: string,
    tools?: OpenAITool[],
    options?: {
      temperature?: number;
      maxTokens?: number;
      safetySettings?: any[];
    }
  ) {
    const url = `${this.baseUrl}/${model}:generateContent?key=${this.apiKey}`;

    // Normalize tools to Gemini format
    let geminiTools: GeminiTools | undefined;
    if (tools && hasFunctionTools(tools)) {
      geminiTools = normalizeToolsForGemini(tools);
    }

    const requestBody = {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: options?.temperature ?? 0.7,
        maxOutputTokens: options?.maxTokens ?? 2048,
      },
      safetySettings: options?.safetySettings,
      tools: geminiTools ? [geminiTools] : undefined,
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Check for tool calls and normalize back to OpenAI format
      const candidates = data.candidates || [];
      const toolCalls: OpenAIToolCall[] = [];

      for (const candidate of candidates) {
        if (candidate.content?.parts) {
          const toolResults: GeminiToolResult[] = [];

          for (const part of candidate.content.parts) {
            if (part.functionCall) {
              toolResults.push({ functionCall: part.functionCall });
            }
          }

          // Convert Gemini tool results to OpenAI format
          const normalizedCalls = normalizeToolResultsFromGemini(toolResults);
          toolCalls.push(...normalizedCalls);
        }
      }

      return {
        text: this.extractTextFromResponse(data),
        toolCalls,
        rawResponse: data,
      };

    } catch (error) {
      console.error('Antigravity Gemini Service error:', error);
      throw error;
    }
  }

  private extractTextFromResponse(data: any): string {
    const candidates = data.candidates || [];
    const texts: string[] = [];

    for (const candidate of candidates) {
      if (candidate.content?.parts) {
        for (const part of candidate.content.parts) {
          if (part.text) {
            texts.push(part.text);
          }
        }
      }
    }

    return texts.join('\n');
  }
}

// Antigravity Gemini Service exported
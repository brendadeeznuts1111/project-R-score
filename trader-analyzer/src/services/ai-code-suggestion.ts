#!/usr/bin/env bun
/**
 * AI Code Suggestion Service for MCP Scaffold Enhancement
 * Provides intelligent code suggestions using Claude/OpenAI APIs
 *
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-AI-CODE-SUGGESTION@1.3.4;instance-id=AI-CODE-SUGGESTION-001;version=1.3.4}][PROPERTIES:{service={value:"ai-code-suggestion";@root:"23.0.0.0.0.0.0";@chain:["BP-AI-INTEGRATION","BP-CODE-ENHANCEMENT"];@version:"1.3.4"}}][CLASS:AICodeSuggestionService][#REF:v-1.3.4.SERV.AICODESUGGESTION.PLAT.1.0.A.1.1.DOC.1.1]]
 *
 * @fileoverview [23.1.6.0.0.0.0] AI Code Suggestion Service for Intelligent Code Enhancement
 * @description Provides context-aware code suggestions and method stub generation using AI APIs
 * @module src/services/ai-code-suggestion
 * @author system@hyper-bun.ai
 * @created 2025-01-10T12:00:00.000Z
 * @team platform_tools
 * @version 1.3.4
 * @ref v-1.3.4.SERV.AICODESUGGESTION.PLAT.1.0.A.1.1.DOC.1.1
 */

import { z } from "zod"
import { logger } from "../utils/logger.js"

// AI Provider configuration
type AIProvider = "claude" | "openai" | "anthropic"

// AI suggestion request schema
const AISuggestionRequestSchema = z.object({
  type: z.enum(["component", "service", "interface", "enum", "mcp-tool", "script", "utility"]),
  name: z.string(),
  description: z.string(),
  aiContext: z.string().optional(),
  dependencies: z.array(z.string()).optional(),
  existingCode: z.string().optional(),
  templateVariant: z.string().optional(),
})

type AISuggestionRequest = z.infer<typeof AISuggestionRequestSchema>

// AI suggestion response schema
const AISuggestionResponseSchema = z.object({
  methodStubs: z.array(
    z.object({
      name: z.string(),
      signature: z.string(),
      description: z.string(),
      implementation: z.string(),
    })
  ),
  imports: z.array(z.string()),
  interfaces: z.array(z.string()),
  errorHandling: z.string().optional(),
  performanceOptimizations: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
})

type AISuggestionResponse = z.infer<typeof AISuggestionResponseSchema>

/**
 * AI Code Suggestion Service
 * Integrates with Claude/OpenAI APIs for intelligent code enhancement
 */
export class AICodeSuggestionService {
  private apiKey: string | null = null
  private provider: AIProvider = "claude"
  private initialized = false

  /**
   * Initialize the AI service with API credentials
   */
  async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      // Try to get API key from Bun.secrets
      this.apiKey = await this.getAPIKey()

      if (!this.apiKey) {
        logger.warn("No AI API key found, AI suggestions will be disabled")
        return
      }

      this.initialized = true
      logger.info("AI Code Suggestion Service initialized successfully")
    } catch (error) {
      logger.error("Failed to initialize AI service", error)
      throw error
    }
  }

  /**
   * Generate AI-enhanced code suggestions
   */
  async generateSuggestions(request: AISuggestionRequest): Promise<AISuggestionResponse> {
    if (!this.initialized || !this.apiKey) {
      // Return basic suggestions if AI is not available
      return this.generateFallbackSuggestions(request)
    }

    try {
      const prompt = this.buildPrompt(request)
      const response = await this.callAIAPI(prompt)
      return this.parseAIResponse(response, request)
    } catch (error) {
      logger.warn("AI suggestion failed, using fallback", error)
      return this.generateFallbackSuggestions(request)
    }
  }

  /**
   * Get API key from Bun.secrets
   */
  private async getAPIKey(): Promise<string | null> {
    try {
      // Try Claude API key first
      const claudeKey = await Bun.secrets.get({ service: "nexus", name: "claude.apiKey" })
      if (claudeKey) {
        this.provider = "claude"
        return claudeKey
      }

      // Try OpenAI API key
      const openaiKey = await Bun.secrets.get({ service: "nexus", name: "openai.apiKey" })
      if (openaiKey) {
        this.provider = "openai"
        return openaiKey
      }

      // Try Anthropic API key
      const anthropicKey = await Bun.secrets.get({ service: "nexus", name: "anthropic.apiKey" })
      if (anthropicKey) {
        this.provider = "anthropic"
        return anthropicKey
      }

      return null
    } catch {
      return null
    }
  }

  /**
   * Build AI prompt based on request
   */
  private buildPrompt(request: AISuggestionRequest): string {
    const { type, name, description, aiContext, dependencies, existingCode, templateVariant } =
      request

    let prompt = `You are an expert TypeScript developer working on a Hyper-Bun application. Generate intelligent code suggestions for a ${type} named "${name}".

Description: ${description}
`

    if (aiContext) {
      prompt += `AI Context: ${aiContext}\n`
    }

    if (dependencies && dependencies.length > 0) {
      prompt += `Dependencies: ${dependencies.join(", ")}\n`
    }

    if (templateVariant) {
      prompt += `Template Variant: ${templateVariant}\n`
    }

    if (existingCode) {
      prompt += `\nExisting Code:\n${existingCode}\n`
    }

    prompt += `
Please provide:
1. Method stubs with proper TypeScript signatures
2. Additional imports needed
3. Interface definitions if required
4. Error handling patterns
5. Performance optimizations
6. Confidence score (0-1)
7. Reasoning for suggestions

Format your response as JSON with this structure:
{
  "methodStubs": [{"name": "methodName", "signature": "methodSignature", "description": "description", "implementation": "implementation"}],
  "imports": ["import statements"],
  "interfaces": ["interface definitions"],
  "errorHandling": "error handling pattern",
  "performanceOptimizations": ["optimization suggestions"],
  "confidence": 0.85,
  "reasoning": "explanation"
}`

    return prompt
  }

  /**
   * Call AI API
   */
  private async callAIAPI(prompt: string): Promise<string> {
    const apiUrl = this.getAPIUrl()
    const headers = this.getAPIHeaders()
    const body = this.buildAPIRequest(prompt)

    const response = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error(`AI API call failed: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return this.extractAIResponse(data)
  }

  /**
   * Get API URL based on provider
   */
  private getAPIUrl(): string {
    switch (this.provider) {
      case "claude":
        return "https://api.anthropic.com/v1/messages"
      case "openai":
        return "https://api.openai.com/v1/chat/completions"
      case "anthropic":
        return "https://api.anthropic.com/v1/messages"
      default:
        throw new Error(`Unsupported AI provider: ${this.provider}`)
    }
  }

  /**
   * Get API headers
   */
  private getAPIHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    if (!this.apiKey) {
      throw new Error("No API key available")
    }

    switch (this.provider) {
      case "claude":
      case "anthropic":
        headers["x-api-key"] = this.apiKey
        headers["anthropic-version"] = "2023-06-01"
        break
      case "openai":
        headers["Authorization"] = `Bearer ${this.apiKey}`
        break
    }

    return headers
  }

  /**
   * Build API request body
   */
  private buildAPIRequest(prompt: string): any {
    switch (this.provider) {
      case "claude":
      case "anthropic":
        return {
          model: "claude-3-sonnet-20240229",
          max_tokens: 4000,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
        }
      case "openai":
        return {
          model: "gpt-4-turbo-preview",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: 4000,
          temperature: 0.7,
        }
      default:
        throw new Error(`Unsupported AI provider: ${this.provider}`)
    }
  }

  /**
   * Extract response from AI API
   */
  private extractAIResponse(data: any): string {
    switch (this.provider) {
      case "claude":
      case "anthropic":
        return data.content?.[0]?.text || ""
      case "openai":
        return data.choices?.[0]?.message?.content || ""
      default:
        throw new Error(`Unsupported AI provider: ${this.provider}`)
    }
  }

  /**
   * Parse AI response into structured format
   */
  private parseAIResponse(response: string, request: AISuggestionRequest): AISuggestionResponse {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return AISuggestionResponseSchema.parse(parsed)
      }

      // Fallback to basic parsing
      return this.generateFallbackSuggestions(request)
    } catch (error) {
      logger.warn("Failed to parse AI response, using fallback", error)
      return this.generateFallbackSuggestions(request)
    }
  }

  /**
   * Generate fallback suggestions when AI is unavailable
   */
  private generateFallbackSuggestions(request: AISuggestionRequest): AISuggestionResponse {
    const { type, name } = request

    const baseSuggestions: AISuggestionResponse = {
      methodStubs: [],
      imports: [],
      interfaces: [],
      performanceOptimizations: [],
      confidence: 0.3,
      reasoning: "AI service unavailable, using basic templates",
    }

    // Generate basic method stubs based on type
    switch (type) {
      case "component":
        baseSuggestions.methodStubs = [
          {
            name: "render",
            signature: `render(): JSX.Element`,
            description: "Render the component",
            implementation: `return <div>{this.props.displayName || '${name}'}</div>;`,
          },
          {
            name: "handleUpdate",
            signature: `handleUpdate(data: any): void`,
            description: "Handle data updates",
            implementation: `this.setState({ data });`,
          },
        ]
        baseSuggestions.imports = ["import { useState, useEffect } from 'preact/hooks';"]
        break

      case "service":
        baseSuggestions.methodStubs = [
          {
            name: "initialize",
            signature: `async initialize(): Promise<void>`,
            description: "Initialize the service",
            implementation: `// TODO: Implement service initialization\nthis.logger.info('Service initialized');`,
          },
          {
            name: "process",
            signature: `async process(input: any): Promise<any>`,
            description: "Process input data",
            implementation: `// TODO: Implement processing logic\nreturn { result: input };`,
          },
        ]
        baseSuggestions.imports = ["import { logger } from '../utils/logger.js';"]
        break

      case "mcp-tool":
        baseSuggestions.methodStubs = [
          {
            name: "execute",
            signature: `async execute(args: any): Promise<any>`,
            description: "Execute the MCP tool",
            implementation: `return { content: [{ type: 'text', text: 'Tool executed successfully' }] };`,
          },
        ]
        baseSuggestions.imports = ["import type { MCPTool } from '../server.js';"]
        break
    }

    return baseSuggestions
  }

  /**
   * Check if AI service is available
   */
  isAvailable(): boolean {
    return this.initialized && !!this.apiKey
  }

  /**
   * Get service status
   */
  getStatus(): { available: boolean; provider: AIProvider | null; initialized: boolean } {
    return {
      available: this.isAvailable(),
      provider: this.provider,
      initialized: this.initialized,
    }
  }
}

/**
 * Singleton instance
 */
let instance: AICodeSuggestionService | null = null

/**
 * Get singleton instance of AICodeSuggestionService
 */
export function getAICodeSuggestionService(): AICodeSuggestionService {
  if (!instance) {
    instance = new AICodeSuggestionService()
  }
  return instance
}

/**
 * Initialize AI service (convenience function)
 */
export async function initializeAIService(): Promise<void> {
  const service = getAICodeSuggestionService()
  await service.initialize()
}

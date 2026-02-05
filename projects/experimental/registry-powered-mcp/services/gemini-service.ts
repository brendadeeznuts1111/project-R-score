
import { GoogleGenAI } from "@google/genai";

export const generateAIResponse = async (prompt: string, context?: string, modelId: string = 'gemini-3-flash-preview'): Promise<string> => {
  try {
    // Fix: Move GoogleGenAI initialization inside the function to ensure the latest API_KEY is used per call
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const systemInstruction = `You are the AI System Administrator for the Bun MCP Registry Hub.
    Your role is to assist users with system metrics, status checks, and general technical inquiries about the platform.
    
    Technical Context (Bun v1.3.2+):
    - Support for --cpu-prof (CPU Profiling) is enabled.
    - Lockfile configVersion: 0 (Hoisted) or 1 (Isolated).
    - Hyper-Bun is the Federation Hub for UI Policies and Configs.
    - Syncing with AWS ECR and GCP AR for immutable binary containers is active.
    - Search speed is 175x faster than grep via KQueue engine.

    Current System Context:
    ${context ? context : 'System is operational. No specific context provided.'}
    
    Be concise, technical, and helpful. Use a professional but slightly cyberpunk tone. Always emphasize binary parity and immutability.`;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    return response.text || "No response received from the neural network.";
  } catch (error: any) {
    console.error("Gemini API Error Detail:", error);
    
    // Standardize error extraction from various possible error formats
    const status = error?.status || error?.error?.code || (error?.message?.match(/\d{3}/) ? parseInt(error.message.match(/\d{3}/)[0]) : null);
    const rawMessage = error?.message || error?.error?.message || "";
    
    // Specific Error Mapping
    const isQuotaError = status === 429 || rawMessage.includes('RESOURCE_EXHAUSTED') || rawMessage.includes('429');
    const isInvalidError = status === 400 || rawMessage.includes('INVALID_ARGUMENT') || rawMessage.includes('400');
    const isAuthError = status === 401 || status === 403 || rawMessage.includes('PERMISSION_DENIED') || rawMessage.includes('401') || rawMessage.includes('403');
    const isNotFoundError = status === 404 || rawMessage.includes('NOT_FOUND') || rawMessage.includes('404');

    if (isQuotaError) {
        return "⚠️ **NEURAL LINK OVERLOAD**: API Quota Exceeded.\n\nThe system has hit the rate limit for the inference engine. Please switch models via the dropdown or standby for a cooldown cycle.";
    }

    if (isInvalidError) {
        return "⚠️ **PROTOCOL ERROR**: Invalid Request Structure.\n\nThe neural gateway rejected the request. This may be due to safety filters or malformed context parameters.";
    }

    if (isAuthError) {
        return "⚠️ **ACCESS DENIED**: Authentication Breach.\n\nThe neural handshake failed. Access to the inference core is restricted. Verify system environment credentials.";
    }

    if (isNotFoundError) {
        return `⚠️ **MODEL MISSING**: Neural Core Not Found.\n\nThe model '${modelId}' is not registered in this region's deployment cluster.`;
    }

    if (status && status >= 500) {
        return "⚠️ **CORE INSTABILITY**: Neural Network Failure.\n\nThe remote inference cluster is experiencing a major malfunction (5xx). Uplink retry recommended.";
    }

    return `⚠️ **SYSTEM ANOMALY**: ${rawMessage || "Internal communication error in the AI subsystem. Check local console diagnostics for details."}`;
  }
};

/**
 * AIPlaygroundPage — Kimi AI Chat Interface
 *
 * Chat UI for interacting with Kimi AI API:
 *   - Message history with user/assistant bubbles
 *   - Input field with send button
 *   - Model selector
 *   - Streaming response display
 *   - Clear conversation button
 *   - Dark theme
 */

import React, { useState, useRef, useEffect, useCallback } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  model?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const AIPlaygroundPage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello! I'm Kimi AI, your sports betting risk analysis assistant. I can help you analyze player risk, interpret betting patterns, and answer questions about the system. How can I help?",
      timestamp: Date.now(),
      model: "kimi",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState("kimi");
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const MODELS = [
    { id: "kimi", name: "Kimi AI", description: "General purpose AI" },
    { id: "kimi-risk", name: "Kimi Risk", description: "Risk-specialized model" },
    { id: "kimi-code", name: "Kimi Code", description: "Code analysis" },
  ];

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/kimi/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify({
          message: userMessage.content,
          model: selectedModel,
          context: { conversationId: "playground" },
        }),
      });

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now()}_ai`,
        role: "assistant",
        content: data.message?.content || data.content || "No response from AI.",
        timestamp: Date.now(),
        model: selectedModel,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get response");
      const errorMessage: ChatMessage = {
        id: `msg_${Date.now()}_err`,
        role: "assistant",
        content: "⚠️ Sorry, I encountered an error processing your request. Please try again.",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [input, isLoading, selectedModel]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  const clearConversation = useCallback(() => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: "Conversation cleared. How can I help you?",
        timestamp: Date.now(),
        model: "kimi",
      },
    ]);
    setError(null);
  }, []);

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="ai-playground-page" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 140px)" }}>
      <div className="ai-playground-header">
        <h1>AI Playground</h1>
        <div className="ai-playground-controls">
          <select
            className="ai-model-select"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
          >
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <button className="btn btn-sm btn-clear" onClick={clearConversation} title="Clear conversation">
            Clear
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="ai-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`ai-message ${msg.role}`}>
            <div className="ai-message-avatar">
              {msg.role === "user" ? "👤" : "🤖"}
            </div>
            <div className="ai-message-content">
              <div className="ai-message-header">
                <span className="ai-message-role">{msg.role === "user" ? "You" : "Kimi AI"}</span>
                <span className="ai-message-time">{formatTime(msg.timestamp)}</span>
              </div>
              <div className="ai-message-text">{msg.content}</div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="ai-message assistant">
            <div className="ai-message-avatar">🤖</div>
            <div className="ai-message-content">
              <div className="ai-typing">
                <span className="ai-typing-dot" />
                <span className="ai-typing-dot" />
                <span className="ai-typing-dot" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="ai-input-area">
        {error && <div className="ai-error-banner">{error}</div>}
        <div className="ai-input-row">
          <textarea
            ref={inputRef}
            className="ai-textarea"
            placeholder="Type a message... (Shift+Enter for new line)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            disabled={isLoading}
          />
          <button
            className="btn btn-primary ai-send-btn"
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
          >
            {isLoading ? "..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIPlaygroundPage;

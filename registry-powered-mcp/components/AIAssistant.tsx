
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles, ChevronDown, CheckCircle2, Activity } from 'lucide-react';
import { generateAIResponse } from '../services/geminiService';
import { RegistryDashboardState } from '../types';

interface AIAssistantProps {
    data: RegistryDashboardState;
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

const MODELS = [
    { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash (Production)' },
    { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro (Inference)' },
];

export const AIAssistant: React.FC<AIAssistantProps> = ({ data }) => {
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedModel, setSelectedModel] = useState(MODELS[0].id);
    const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'init',
            role: 'assistant',
            content: `Neural Interface Established.

System: ${data.service}
Version: ${data.version}
Status: ${data.status.toUpperCase()}
Timestamp: ${data.timestamp}

Operations Overview:
- 300 Global locations active.
- Bun 175x grep multiplier confirmed.
- AI Subsystem: ${data.metrics.ai_model} (Edge Inference).
- Cold starts: ~0ms.

I am your Operations Assistant. How can I facilitate your registry audit or benchmark today?`,
            timestamp: new Date()
        }
    ]);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        const context = `
        Service: ${data.service}
        Status: ${data.status}
        Metrics: ${JSON.stringify(data.metrics)}
        Performance: ${JSON.stringify(data.performance)}
        Features: ${data.features.join(', ')}
        Deployment: ${data.deployment}
        `;
        
        const responseText = await generateAIResponse(userMsg.content, context, selectedModel);

        const aiMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: responseText,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, aiMsg]);
        setIsLoading(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className={`flex flex-col h-[600px] glass-panel rounded-xl border border-slate-200/50 dark:border-slate-800/50 overflow-hidden relative shadow-2xl transition-all duration-500 ${isLoading ? 'ai-halo' : ''}`}>
            {/* Header */}
            <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg transition-colors ${isLoading ? 'bg-indigo-500 text-white animate-pulse' : 'bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'}`}>
                        <Bot size={20} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-800 dark:text-slate-100 leading-tight">Hub Operations</h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <CheckCircle2 size={10} className="text-emerald-500" />
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wider uppercase">Context Synchronized</span>
                        </div>
                    </div>
                </div>

                <div className="relative">
                    <button 
                        onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-colors shadow-sm"
                    >
                        <Sparkles size={12} className="text-indigo-500" />
                        {MODELS.find(m => m.id === selectedModel)?.name}
                        <ChevronDown size={12} className={`text-slate-400 transition-transform ${isModelMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isModelMenuOpen && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setIsModelMenuOpen(false)}></div>
                            <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-20 py-1 overflow-hidden">
                                {MODELS.map(model => (
                                    <button
                                        key={model.id}
                                        onClick={() => {
                                            setSelectedModel(model.id);
                                            setIsModelMenuOpen(false);
                                        }}
                                        className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors ${
                                            selectedModel === model.id ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-300'
                                        }`}
                                    >
                                        {model.name}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30 dark:bg-slate-950/30">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
                    >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-slate-200 dark:bg-slate-700' : 'bg-indigo-100 dark:bg-indigo-900/50'}`}>
                            {msg.role === 'user' ? <User size={14} className="text-slate-600 dark:text-slate-200" /> : <Bot size={14} className="text-indigo-600 dark:text-indigo-300" />}
                        </div>
                        <div className={`p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                            msg.role === 'user' 
                            ? 'bg-indigo-600 text-white rounded-br-none' 
                            : 'bg-white dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 rounded-bl-none border border-slate-200 dark:border-slate-700/50'
                        }`}>
                            <div className="whitespace-pre-wrap font-sans leading-relaxed">{msg.content}</div>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex gap-3">
                         <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center flex-shrink-0">
                            <Bot size={14} className="text-indigo-600 dark:text-indigo-300" />
                        </div>
                        <div className="bg-white dark:bg-slate-800/50 p-3 rounded-2xl rounded-bl-none border border-slate-200 dark:border-slate-700/50 flex items-center gap-2 shadow-sm">
                            <Loader2 size={14} className="animate-spin text-slate-400" />
                            <span className="text-xs text-slate-500 dark:text-slate-400">Processing Inference...</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-200/50 dark:border-slate-800/50">
                {/* Thinking Stream Status */}
                {isLoading && (
                    <div className="mb-2 flex items-center gap-2 text-[10px] text-indigo-500 font-mono italic animate-pulse">
                        <Activity size={10} />
                        [MCP::AI] Scanning filesystem for context...
                    </div>
                )}
                
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={`Query Llama-powered Edge...`}
                        className="flex-1 bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-sm rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    />
                    <button
                        onClick={handleSend}
                        disabled={isLoading || !input.trim()}
                        className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors disabled:opacity-50 shadow-sm"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};


import React, { useState } from 'react';
import { Sparkles, Loader2, X, Brain, Lightbulb, AlertTriangle, CheckCircle } from 'lucide-react';

interface EnhanceWithAIButtonProps {
  /** Context data to send to AI for analysis */
  context: string;
  /** Title/label for what's being enhanced */
  title: string;
  /** Optional custom prompt for the AI */
  customPrompt?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Color variant */
  variant?: 'default' | 'primary' | 'subtle';
  /** Callback when AI generates a response */
  onEnhance?: (response: string) => void;
  /** Optional AI response generator (for custom implementations) */
  generateResponse?: (prompt: string, context: string) => Promise<string>;
}

interface AIInsight {
  type: 'suggestion' | 'warning' | 'optimization' | 'info';
  content: string;
}

const parseAIResponse = (response: string): AIInsight[] => {
  const insights: AIInsight[] = [];
  const lines = response.split('\n').filter(line => line.trim());

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('⚠️') || trimmed.toLowerCase().includes('warning')) {
      insights.push({ type: 'warning', content: trimmed.replace(/^[⚠️\-*•]+\s*/, '') });
    } else if (trimmed.startsWith('✅') || trimmed.toLowerCase().includes('optimiz')) {
      insights.push({ type: 'optimization', content: trimmed.replace(/^[✅\-*•]+\s*/, '') });
    } else if (trimmed.startsWith('💡') || trimmed.toLowerCase().includes('suggest')) {
      insights.push({ type: 'suggestion', content: trimmed.replace(/^[💡\-*•]+\s*/, '') });
    } else if (trimmed.length > 10) {
      insights.push({ type: 'info', content: trimmed.replace(/^[\-*•]+\s*/, '') });
    }
  }

  return insights.length > 0 ? insights : [{ type: 'info', content: response }];
};

const InsightIcon: React.FC<{ type: AIInsight['type'] }> = ({ type }) => {
  switch (type) {
    case 'warning':
      return <AlertTriangle size={14} className="text-amber-400" />;
    case 'optimization':
      return <CheckCircle size={14} className="text-emerald-400" />;
    case 'suggestion':
      return <Lightbulb size={14} className="text-sky-400" />;
    default:
      return <Brain size={14} className="text-purple-400" />;
  }
};

export const EnhanceWithAIButton: React.FC<EnhanceWithAIButtonProps> = ({
  context,
  title,
  customPrompt,
  size = 'md',
  variant = 'default',
  onEnhance,
  generateResponse,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [error, setError] = useState<string | null>(null);

  const sizeClasses = {
    sm: 'px-2 py-1 text-[10px] gap-1',
    md: 'px-3 py-1.5 text-xs gap-1.5',
    lg: 'px-4 py-2 text-sm gap-2',
  };

  const variantClasses = {
    default: 'bg-gradient-to-r from-purple-500/20 to-sky-500/20 hover:from-purple-500/30 hover:to-sky-500/30 border-purple-500/30 text-purple-300',
    primary: 'bg-gradient-to-r from-purple-600 to-sky-600 hover:from-purple-500 hover:to-sky-500 border-transparent text-white shadow-lg shadow-purple-500/25',
    subtle: 'bg-slate-800/50 hover:bg-slate-700/50 border-slate-700 text-slate-400 hover:text-purple-300',
  };

  const iconSize = size === 'sm' ? 12 : size === 'lg' ? 18 : 14;

  const handleEnhance = async () => {
    setIsLoading(true);
    setError(null);
    setShowPanel(true);

    try {
      const prompt = customPrompt || `Analyze this ${title} data and provide actionable insights, optimizations, and any warnings. Be concise and technical:

${context}

Provide your response as bullet points with clear categories (suggestions, warnings, optimizations).`;

      let response: string;

      if (generateResponse) {
        response = await generateResponse(prompt, context);
      } else {
        // Fallback: simulate AI response for demo purposes
        await new Promise(resolve => setTimeout(resolve, 1500));
        response = `💡 **Analysis Complete for ${title}**

✅ Performance is within acceptable thresholds
💡 Consider enabling caching for repeated queries
⚠️ Memory usage trending upward - monitor closely
✅ Latency metrics show consistent response times
💡 Batch operations could reduce overhead by ~15%
⚠️ Some endpoints approaching rate limits`;
      }

      const parsedInsights = parseAIResponse(response);
      setInsights(parsedInsights);
      onEnhance?.(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate AI insights');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleEnhance}
        disabled={isLoading}
        className={`
          inline-flex items-center font-bold uppercase tracking-wider
          rounded-lg border transition-all duration-300
          disabled:opacity-50 disabled:cursor-not-allowed
          hover:scale-105 active:scale-95
          ${sizeClasses[size]}
          ${variantClasses[variant]}
        `}
      >
        {isLoading ? (
          <Loader2 size={iconSize} className="animate-spin" />
        ) : (
          <Sparkles size={iconSize} className="animate-pulse" />
        )}
        <span>{isLoading ? 'Analyzing...' : 'Enhance with AI'}</span>
      </button>

      {/* AI Insights Panel */}
      {showPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-gradient-to-r from-purple-500/10 to-sky-500/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <Brain size={20} className="text-purple-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">AI Insights</h3>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">{title}</p>
                </div>
              </div>
              <button
                onClick={() => setShowPanel(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
                    <Sparkles size={24} className="absolute inset-0 m-auto text-purple-400 animate-pulse" />
                  </div>
                  <p className="text-sm text-slate-400">Generating AI insights...</p>
                </div>
              ) : error ? (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-rose-500/10 border border-rose-500/20">
                  <AlertTriangle size={20} className="text-rose-400 flex-shrink-0" />
                  <p className="text-sm text-rose-300">{error}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {insights.map((insight, index) => (
                    <div
                      key={index}
                      className={`
                        flex items-start gap-3 p-3 rounded-lg border transition-all duration-300
                        hover:scale-[1.02] cursor-default
                        ${insight.type === 'warning' ? 'bg-amber-500/5 border-amber-500/20' :
                          insight.type === 'optimization' ? 'bg-emerald-500/5 border-emerald-500/20' :
                          insight.type === 'suggestion' ? 'bg-sky-500/5 border-sky-500/20' :
                          'bg-purple-500/5 border-purple-500/20'}
                      `}
                    >
                      <div className="mt-0.5">
                        <InsightIcon type={insight.type} />
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed">{insight.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {!isLoading && !error && insights.length > 0 && (
              <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/50 flex items-center justify-between">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                  {insights.length} insight{insights.length !== 1 ? 's' : ''} generated
                </p>
                <button
                  onClick={handleEnhance}
                  className="text-[10px] font-bold text-purple-400 hover:text-purple-300 uppercase tracking-wider flex items-center gap-1"
                >
                  <Sparkles size={12} />
                  Regenerate
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default EnhanceWithAIButton;

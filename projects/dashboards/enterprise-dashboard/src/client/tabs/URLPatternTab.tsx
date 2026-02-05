import { useState, useEffect } from "react";
import { showGlobalToast } from "../hooks/useToast";
import type { URLPatternAnalysis, URLPatternTestResult, URLPatternAnalysisSummary, ApiResponse } from "../types";

export const URLPatternTab: React.FC = () => {
  const [analyses, setAnalyses] = useState<URLPatternAnalysis[]>([]);
  const [summary, setSummary] = useState<URLPatternAnalysisSummary | null>(null);
  const [testResults, setTestResults] = useState<URLPatternTestResult | null>(null);
  const [report, setReport] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState<URLPatternAnalysis | null>(null);

  const fetchPatterns = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/urlpattern/patterns");
      const data: ApiResponse<URLPatternAnalysis[]> = await response.json();
      if (data.data) {
        setAnalyses(data.data);
      }
    } catch (error: any) {
      showGlobalToast(`Failed to fetch patterns: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const analyzeAll = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/urlpattern/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analyzeAll: true }),
      });
      const data: ApiResponse<{ patterns: URLPatternAnalysis[]; summary: URLPatternAnalysisSummary }> = await response.json();
      if (data.data) {
        setAnalyses(data.data.patterns);
        setSummary(data.data.summary);
        showGlobalToast("Pattern analysis completed", "success");
      }
    } catch (error: any) {
      showGlobalToast(`Failed to analyze patterns: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const runTests = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/urlpattern/test");
      const data: ApiResponse<URLPatternTestResult> = await response.json();
      if (data.data) {
        setTestResults(data.data);
        showGlobalToast("Bun 1.3.4 feature tests completed", "success");
      }
    } catch (error: any) {
      showGlobalToast(`Failed to run tests: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/urlpattern/report");
      const data: ApiResponse<{ report: string; timestamp: string }> = await response.json();
      if (data.data) {
        setReport(data.data.report);
        showGlobalToast("Report generated", "success");
      }
    } catch (error: any) {
      showGlobalToast(`Failed to generate report: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Parallelize initial data loading
    Promise.all([fetchPatterns(), runTests()]).catch(console.error);
  }, []);

  const formatPattern = (pattern: string | URLPatternInit): string => {
    if (typeof pattern === "string") return pattern;
    const parts: string[] = [];
    if (pattern.protocol) parts.push(`protocol: ${pattern.protocol}`);
    if (pattern.hostname) parts.push(`hostname: ${pattern.hostname}`);
    if (pattern.pathname) parts.push(`pathname: ${pattern.pathname}`);
    return parts.join(", ") || JSON.stringify(pattern);
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">URLPattern Observability</h2>
        <div className="flex gap-2">
          <button
            onClick={analyzeAll}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Analyzing..." : "Analyze All Patterns"}
          </button>
          <button
            onClick={runTests}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Run Tests
          </button>
          <button
            onClick={generateReport}
            disabled={loading}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Generate Report
          </button>
        </div>
      </div>

      {/* Bun 1.3.4 Feature Tests */}
      {testResults && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Bun 1.3.4 Feature Tests</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Bun Version</div>
              <div className="text-lg font-semibold text-gray-800 dark:text-gray-200">{testResults.version}</div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">exec() Method</div>
              <div className={`text-lg font-semibold ${testResults.urlPattern.execMethod ? "text-green-600" : "text-red-600"}`}>
                {testResults.urlPattern.execMethod ? "✅ Supported" : "❌ Not Supported"}
              </div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">test() Method</div>
              <div className={`text-lg font-semibold ${testResults.urlPattern.testMethod ? "text-green-600" : "text-red-600"}`}>
                {testResults.urlPattern.testMethod ? "✅ Supported" : "❌ Not Supported"}
              </div>
            </div>
          </div>
          {testResults.recommendations.length > 0 && (
            <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded">
              <div className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-2">Recommendations:</div>
              <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
                {testResults.recommendations.map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Analysis Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Patterns</div>
              <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">{summary.totalPatterns}</div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Avg Complexity</div>
              <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">{summary.avgComplexity.toFixed(1)}</div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">exec() Support</div>
              <div className="text-2xl font-bold text-green-600">{summary.bun134Features.execMethod}</div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Proxy Support</div>
              <div className="text-2xl font-bold text-green-600">{summary.bun134Features.fetchProxy}</div>
            </div>
          </div>
        </div>
      )}

      {/* Report */}
      {report && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Comprehensive Report</h3>
          <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-x-auto text-sm font-mono whitespace-pre-wrap">
            {report}
          </pre>
        </div>
      )}

      {/* Pattern List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
            Router Patterns ({analyses.length})
          </h3>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {analyses.length === 0 && !loading && (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">
              No patterns analyzed yet. Click "Analyze All Patterns" to start.
            </div>
          )}
          {loading && (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">Loading...</div>
          )}
          {analyses.map((analysis, index) => (
            <div
              key={index}
              className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
              onClick={() => setSelectedPattern(selectedPattern === analysis ? null : analysis)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-mono text-sm text-gray-800 dark:text-gray-200 mb-2">
                    {formatPattern(analysis.pattern)}
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <span>Complexity: {analysis.complexity}</span>
                    <span>Groups: {analysis.groups.length}</span>
                    <span className={analysis.bunSpecific.supportsExecMethod ? "text-green-600" : "text-red-600"}>
                      exec(): {analysis.bunSpecific.supportsExecMethod ? "✅" : "❌"}
                    </span>
                    <span>Performance: {analysis.performance.opsPerSec.toFixed(0)} ops/s</span>
                  </div>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${selectedPattern === analysis ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              {selectedPattern === analysis && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500 dark:text-gray-400">WPT Compliance</div>
                      <div className={analysis.wptCompliance ? "text-green-600" : "text-red-600"}>
                        {analysis.wptCompliance ? "✅ Yes" : "❌ No"}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 dark:text-gray-400">Memory Delta</div>
                      <div className="text-gray-800 dark:text-gray-200">{analysis.memory.deltaKB.toFixed(2)} KB</div>
                    </div>
                    <div>
                      <div className="text-gray-500 dark:text-gray-400">exec() Time</div>
                      <div className="text-gray-800 dark:text-gray-200">{analysis.execAnalysis.execTime.toFixed(3)}ms</div>
                    </div>
                    <div>
                      <div className="text-gray-500 dark:text-gray-400">Performance Boost</div>
                      <div className="text-gray-800 dark:text-gray-200">{analysis.bunSpecific.performanceBoost.toFixed(2)}x</div>
                    </div>
                  </div>
                  {analysis.groups.length > 0 && (
                    <div className="mt-2">
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Groups:</div>
                      <div className="flex flex-wrap gap-2">
                        {analysis.groups.map((group, i) => (
                          <span
                            key={i}
                            className={`px-2 py-1 rounded text-xs ${
                              group.type === "dynamic"
                                ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                                : group.type === "wildcard"
                                ? "bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200"
                                : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                            }`}
                          >
                            {group.name} ({group.type})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

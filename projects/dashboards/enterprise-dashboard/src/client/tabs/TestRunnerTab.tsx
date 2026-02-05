import { useState, useEffect, useCallback } from "react";
import { showGlobalToast } from "../hooks/useToast";
import type { ApiResponse, TestResult, TestRunOptions } from "../types";

export function TestRunnerTab() {
  const [testFiles, setTestFiles] = useState<string[]>([]);
  const [results, setResults] = useState<TestResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [options, setOptions] = useState<TestRunOptions>({
    timeout: 5000,
    concurrent: false,
    coverage: false,
  });
  const [testSeed, setTestSeed] = useState<number | null>(null);
  const [useTestSeed, setUseTestSeed] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState<string>("");

  // Fetch test files
  const fetchTestFiles = useCallback(async () => {
    try {
      const res = await fetch("/api/tests/list");
      const data: ApiResponse<string[]> = await res.json();
      if (data.data) {
        setTestFiles(data.data);
      }
    } catch (error: any) {
      console.error("Failed to fetch test files:", error);
    }
  }, []);

  useEffect(() => {
    fetchTestFiles();
  }, [fetchTestFiles]);

  // Generate test seed (shared with benchmarks)
  const generateTestSeed = useCallback(async () => {
    try {
      const res = await fetch("/api/benchmarks/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data: ApiResponse<{ seed: number; generator: any }> = await res.json();
      if (data.data) {
        setTestSeed(data.data.seed);
        setUseTestSeed(true);
        showGlobalToast(`Test seed generated: ${data.data.seed}`, "success");
      }
    } catch (error: any) {
      showGlobalToast(`Failed to generate seed: ${error.message}`, "error");
    }
  }, []);

  // Run tests
  const runTests = useCallback(async () => {
    setIsRunning(true);
    setResults(null);

    try {
      const runOptions: TestRunOptions = { ...options };
      if (useTestSeed && testSeed !== null) {
        runOptions.seed = testSeed;
        runOptions.randomize = true; // --seed implies --randomize
      }
      if (selectedPattern) {
        runOptions.pattern = selectedPattern;
      }

      const res = await fetch("/api/tests/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(runOptions),
      });

      const data: ApiResponse<TestResult> = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }

      if (data.data) {
        setResults(data.data);
        if (data.data.success) {
          showGlobalToast(`Tests passed: ${data.data.passed} passed, ${data.data.failed} failed`, "success");
        } else {
          showGlobalToast(`Tests failed: ${data.data.failed} failed`, "error");
        }
      }
    } catch (error: any) {
      console.error("Test run failed:", error);
      showGlobalToast(`Test run failed: ${error.message}`, "error");
    } finally {
      setIsRunning(false);
    }
  }, [options, testSeed, useTestSeed, selectedPattern]);

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <section className="tab-content space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Test Runner</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={generateTestSeed}
            className="px-3 py-1.5 rounded bg-purple-600 hover:bg-purple-700 text-white text-sm transition-colors"
            title="Generate test seed for reproducible test runs"
          >
            🎲 Seed
          </button>
          {testSeed !== null && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-400">
                <input
                  type="checkbox"
                  checked={useTestSeed}
                  onChange={(e) => setUseTestSeed(e.target.checked)}
                  className="mr-1"
                />
                Use seed: {testSeed}
              </label>
            </div>
          )}
          <button
            onClick={runTests}
            disabled={isRunning}
            className={`px-4 py-2 rounded font-medium transition-colors ${
              isRunning
                ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700 text-white"
            }`}
          >
            {isRunning ? "Running..." : "▶ Run Tests"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Test Options */}
        <div className="lg:col-span-1">
          <div className="bg-gray-800 rounded-lg p-4 space-y-4">
            <h3 className="text-lg font-semibold mb-3">Test Options</h3>

            {/* Pattern Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">Test Pattern</label>
              <select
                value={selectedPattern}
                onChange={(e) => setSelectedPattern(e.target.value)}
                className="w-full px-3 py-2 rounded bg-gray-700 text-white text-sm border border-gray-600"
              >
                <option value="">All tests</option>
                {testFiles.slice(0, 20).map((file) => (
                  <option key={file} value={file}>
                    {file}
                  </option>
                ))}
              </select>
            </div>

            {/* Timeout */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Timeout (ms): {options.timeout || 5000}
              </label>
              <input
                type="range"
                min="1000"
                max="60000"
                step="1000"
                value={options.timeout || 5000}
                onChange={(e) => setOptions({ ...options, timeout: parseInt(e.target.value, 10) })}
                className="w-full"
              />
            </div>

            {/* Concurrent */}
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={options.concurrent || false}
                  onChange={(e) => setOptions({ ...options, concurrent: e.target.checked })}
                />
                <span className="text-sm">Concurrent execution</span>
              </label>
            </div>

            {/* Max Concurrency */}
            {options.concurrent && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Max Concurrency: {options.maxConcurrency || 20}
                </label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  step="1"
                  value={options.maxConcurrency || 20}
                  onChange={(e) => setOptions({ ...options, maxConcurrency: parseInt(e.target.value, 10) })}
                  className="w-full"
                />
              </div>
            )}

            {/* Coverage */}
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={options.coverage || false}
                  onChange={(e) => setOptions({ ...options, coverage: e.target.checked })}
                />
                <span className="text-sm">Generate coverage</span>
              </label>
            </div>

            {/* Bail */}
            <div>
              <label className="block text-sm font-medium mb-2">Bail after failures</label>
              <input
                type="number"
                min="0"
                max="100"
                value={options.bail || 0}
                onChange={(e) => setOptions({ ...options, bail: parseInt(e.target.value, 10) || undefined })}
                className="w-full px-3 py-2 rounded bg-gray-700 text-white text-sm border border-gray-600"
                placeholder="0 = no bail"
              />
            </div>

            {/* Randomize */}
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={options.randomize || false}
                  onChange={(e) => setOptions({ ...options, randomize: e.target.checked })}
                  disabled={useTestSeed && testSeed !== null}
                />
                <span className="text-sm">Randomize order</span>
              </label>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-4">
          {results && (
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4">Test Results</h3>

              {/* Summary */}
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="bg-gray-700 rounded p-3 text-center">
                  <div className="text-2xl font-bold text-green-400">{results.passed}</div>
                  <div className="text-xs text-gray-400">Passed</div>
                </div>
                <div className="bg-gray-700 rounded p-3 text-center">
                  <div className="text-2xl font-bold text-red-400">{results.failed}</div>
                  <div className="text-xs text-gray-400">Failed</div>
                </div>
                <div className="bg-gray-700 rounded p-3 text-center">
                  <div className="text-2xl font-bold text-yellow-400">{results.skipped}</div>
                  <div className="text-xs text-gray-400">Skipped</div>
                </div>
                <div className="bg-gray-700 rounded p-3 text-center">
                  <div className="text-2xl font-bold text-blue-400">{formatDuration(results.duration)}</div>
                  <div className="text-xs text-gray-400">Duration</div>
                </div>
              </div>

              {/* Coverage */}
              {results.coverage && (
                <div className="bg-gray-700 rounded p-3 mb-4">
                  <h4 className="text-sm font-semibold mb-2">Coverage</h4>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="text-gray-400">Lines:</span>{" "}
                      <span className="text-blue-400">{results.coverage.lines.toFixed(1)}%</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Functions:</span>{" "}
                      <span className="text-blue-400">{results.coverage.functions.toFixed(1)}%</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Branches:</span>{" "}
                      <span className="text-blue-400">{results.coverage.branches.toFixed(1)}%</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Statements:</span>{" "}
                      <span className="text-blue-400">{results.coverage.statements.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Seed */}
              {results.seed && (
                <div className="bg-gray-700 rounded p-2 mb-4 text-xs text-gray-400">
                  Test seed: <code className="text-purple-400">{results.seed}</code>
                </div>
              )}

              {/* Output */}
              <div className="bg-black rounded p-4 font-mono text-xs overflow-auto max-h-96">
                <pre 
                  className="text-gray-300 whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{
                    __html: results.output
                      .replace(/\x1b\[32m/g, '<span class="text-green-400">')
                      .replace(/\x1b\[31m/g, '<span class="text-red-400">')
                      .replace(/\x1b\[33m/g, '<span class="text-yellow-400">')
                      .replace(/\x1b\[34m/g, '<span class="text-blue-400">')
                      .replace(/\x1b\[0m/g, '</span>')
                      .replace(/\x1b\[1m/g, '<strong>')
                      .replace(/\x1b\[22m/g, '</strong>')
                  }}
                />
              </div>

              {/* Error */}
              {results.error && (
                <div className="bg-red-900/20 border border-red-500 rounded p-3 mt-4">
                  <div className="text-sm font-semibold text-red-400 mb-1">Error</div>
                  <div className="text-xs text-red-300">{results.error}</div>
                </div>
              )}
            </div>
          )}

          {!results && !isRunning && (
            <div className="bg-gray-800 rounded-lg p-8 text-center text-gray-400">
              Configure test options and click "Run Tests" to execute
            </div>
          )}

          {isRunning && (
            <div className="bg-gray-800 rounded-lg p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
              <div className="text-gray-400">Running tests...</div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

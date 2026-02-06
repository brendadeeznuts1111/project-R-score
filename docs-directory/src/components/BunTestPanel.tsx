import React from 'react';
import { TestTube, Play, Square, CheckCircle, XCircle, AlertCircle, Clock, BarChart3 } from 'lucide-react';
import { useBunTest } from '../hooks/useBunTest';

export default function BunTestPanel() {
  const { 
    isRunning, 
    testSuites, 
    currentTest, 
    coverage, 
    runTests, 
    runSingleTest, 
    generateCoverageReport, 
    clearResults 
  } = useBunTest();

  const totalTests = testSuites.reduce((sum, suite) => sum + suite.tests.length, 0);
  const totalPassed = testSuites.reduce((sum, suite) => sum + suite.passed, 0);
  const totalFailed = testSuites.reduce((sum, suite) => sum + suite.failed, 0);
  const totalSkipped = testSuites.reduce((sum, suite) => sum + suite.skipped, 0);

  const handleRunTests = async () => {
    await runTests();
  };

  const handleRunSingleTest = async (testId: string) => {
    await runSingleTest(testId);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'skipped':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getCoverageColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600 dark:text-green-400';
    if (percentage >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center space-x-2">
          <TestTube className="w-5 h-5 text-cloudflare-orange" />
          <span>Bun Test Runner</span>
        </h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleRunTests}
            disabled={isRunning}
            className="flex items-center space-x-2 px-3 py-2 bg-cloudflare-orange text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
          >
            {isRunning ? (
              <>
                <Play className="w-4 h-4 animate-pulse" />
                <span>Running...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Run Tests</span>
              </>
            )}
          </button>
          <button
            onClick={clearResults}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
          >
            <Square className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Current Test Status */}
      {currentTest && (
        <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center space-x-2">
            <Play className="w-4 h-4 text-blue-500 animate-pulse" />
            <span className="text-sm text-blue-700 dark:text-blue-300">{currentTest}</span>
          </div>
        </div>
      )}

      {/* Test Summary */}
      {testSuites.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Test Summary</h4>
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalTests}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Total</div>
            </div>
            <div className="bg-green-50 dark:bg-green-900 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{totalPassed}</div>
              <div className="text-xs text-green-600 dark:text-green-400">Passed</div>
            </div>
            <div className="bg-red-50 dark:bg-red-900 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{totalFailed}</div>
              <div className="text-xs text-red-600 dark:text-red-400">Failed</div>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{totalSkipped}</div>
              <div className="text-xs text-yellow-600 dark:text-yellow-400">Skipped</div>
            </div>
          </div>
        </div>
      )}

      {/* Coverage Report */}
      {coverage.lines > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Coverage Report</h4>
            <button
              onClick={generateCoverageReport}
              className="text-xs text-cloudflare-orange hover:text-orange-600 transition-colors"
            >
              Generate Report
            </button>
          </div>
          <div className="space-y-2">
            {Object.entries(coverage).map(([metric, value]) => (
              <div key={metric} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                  {metric}
                </span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        value >= 80 ? 'bg-green-500' : value >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${value}%` }}
                    ></div>
                  </div>
                  <span className={`text-sm font-medium ${getCoverageColor(value)}`}>
                    {value}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Test Results */}
      {testSuites.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Test Results</h4>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {testSuites.map((suite) => (
              <div key={suite.name} className="border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900 dark:text-gray-100">{suite.name}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      ({suite.passed}/{suite.tests.length})
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {suite.duration}ms
                    </span>
                  </div>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {suite.tests.map((test) => (
                    <div 
                      key={test.id}
                      className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(test.status)}
                        <span className="text-sm text-gray-700 dark:text-gray-300">{test.name}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {test.duration}ms
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {test.assertions} assertions
                        </span>
                        <button
                          onClick={() => handleRunSingleTest(test.id)}
                          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                        >
                          <Play className="w-3 h-3 text-gray-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {suite.tests.some(test => test.error) && (
                  <div className="p-3 bg-red-50 dark:bg-red-900 border-t border-red-200 dark:border-red-800">
                    <div className="text-sm text-red-700 dark:text-red-300">
                      {suite.tests.find(test => test.error)?.error}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bun Test Features */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-600 dark:text-gray-400">
          <div className="font-medium mb-2">Bun Test Features:</div>
          <ul className="space-y-1">
            <li>• Lightning-fast test execution with native performance</li>
            <li>• Built-in assertion library and test helpers</li>
            <li>• Code coverage reporting with Istanbul</li>
            <li>• Watch mode for continuous testing</li>
            <li>• Snapshot testing for UI components</li>
            <li>• Mock and spy utilities</li>
            <li>• TypeScript support out of the box</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { runEnhancedTableDemo } from '../../utils/EnhancedTableDemo';

export const Route = createFileRoute('/demo/enhanced-table')({
  component: EnhancedTableDemo,
});

function EnhancedTableDemo() {
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState('');

  const runDemo = async () => {
    setIsRunning(true);
    setOutput('🚀 Running EnhancedTable Demo...\n\n');

    try {
      // Capture console output
      const originalLog = console.log;
      const logs: string[] = [];

      console.log = (...args) => {
        logs.push(
          args
            .map(arg =>
              typeof arg === 'object'
                ? JSON.stringify(arg, null, 2)
                : String(arg)
            )
            .join(' ')
        );
        originalLog(...args);
      };

      runEnhancedTableDemo();

      // Restore console.log
      console.log = originalLog;

      setOutput(logs.join('\n'));
    } catch (error) {
      setOutput(`❌ Error running demo: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">EnhancedTable Demo</h1>
        <p className="text-gray-600 mb-6">
          Advanced table operations including comparison, HTML generation,
          validation, and phone profile visualization.
        </p>

        <button
          onClick={runDemo}
          disabled={isRunning}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isRunning ? '⏳ Running Demo...' : '🚀 Run EnhancedTable Demo'}
        </button>
      </div>

      {output && (
        <div className="bg-gray-900 text-green-400 p-6 rounded-lg overflow-x-auto">
          <h3 className="text-lg font-semibold mb-4 text-white">
            Demo Output:
          </h3>
          <pre className="whitespace-pre-wrap font-mono text-sm">{output}</pre>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">
            🔍 Table Comparison
          </h3>
          <p className="text-gray-600">
            Deep comparison of two datasets with visual diff highlighting. Shows
            added, removed, and modified rows with color-coded status
            indicators.
          </p>
          <ul className="mt-3 text-sm text-gray-500">
            <li>• Deep equality checking</li>
            <li>• Change visualization</li>
            <li>• Configurable diff options</li>
          </ul>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">
            🌐 HTML Generation
          </h3>
          <p className="text-gray-600">
            Generate HTML-safe tables with escaped content, perfect for web
            reports and email templates. Includes both terminal and HTML output.
          </p>
          <ul className="mt-3 text-sm text-gray-500">
            <li>• HTML escaping</li>
            <li>• Responsive tables</li>
            <li>• Dual output formats</li>
          </ul>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">
            ✅ Data Validation
          </h3>
          <p className="text-gray-600">
            Validate table data integrity with custom schemas and detailed error
            reporting. Perfect for data quality assurance.
          </p>
          <ul className="mt-3 text-sm text-gray-500">
            <li>• Custom validators</li>
            <li>• Detailed error reports</li>
            <li>• Summary statistics</li>
          </ul>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">
            📱 Phone Profiles
          </h3>
          <p className="text-gray-600">
            Specialized visualization for phone profile data with emoji icons
            and formatted display of device information.
          </p>
          <ul className="mt-3 text-sm text-gray-500">
            <li>• Emoji visualization</li>
            <li>• Device summaries</li>
            <li>• Sync status tracking</li>
          </ul>
        </div>
      </div>

      <div className="mt-8 bg-blue-50 p-6 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold mb-3 text-blue-800">
          📚 Usage Examples
        </h3>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-blue-700">Table Comparison:</h4>
            <code className="block bg-blue-100 p-2 rounded text-sm mt-1">
              {`EnhancedTable.compareTables(oldData, newData, 'id', { showOnlyDiffs: true })`}
            </code>
          </div>
          <div>
            <h4 className="font-medium text-blue-700">HTML Table:</h4>
            <code className="block bg-blue-100 p-2 rounded text-sm mt-1">
              {`const result = EnhancedTable.htmlTable(data, ['name', 'age'], { escapeHtml: true })`}
            </code>
          </div>
          <div>
            <h4 className="font-medium text-blue-700">Data Validation:</h4>
            <code className="block bg-blue-100 p-2 rounded text-sm mt-1">
              {`const validation = EnhancedTable.validateTable(data, schema)`}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}

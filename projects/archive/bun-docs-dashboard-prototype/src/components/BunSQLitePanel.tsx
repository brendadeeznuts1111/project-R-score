import { useState, useEffect } from 'react';
import { Database, Search, Plus, Trash2, Download, Upload, BarChart3 } from 'lucide-react';
import { useBunSQLite } from '../hooks/useBunSQLite';

export default function BunSQLitePanel() {
  const { 
    isConnected, 
    records, 
    insertRecord, 
    updateRecord, 
    deleteRecord, 
    getRecord,
    queryRecords 
  } = useBunSQLite();
  const [query, setQuery] = useState('');
  const [queryResults, setQueryResults] = useState<any[]>([]);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  useEffect(() => {
    if (isConnected) {
      loadSampleData();
    }
  }, [isConnected]);

  const loadSampleData = async () => {
    // Load some sample data
    await insertRecord('user_preferences', JSON.stringify({ theme: 'dark', language: 'en' }));
    await insertRecord('search_history', JSON.stringify(['api', 'workers', 'security']));
    await insertRecord('analytics', JSON.stringify({ views: 1250, favorites: 42 }));
  };

  const handleQuery = async () => {
    try {
      const results = await queryRecords(query);
      setQueryResults(results);
    } catch (error) {
      console.error('Query failed:', error);
    }
  };

  const handleInsert = async () => {
    if (newKey && newValue) {
      await insertRecord(newKey, newValue);
      setNewKey('');
      setNewValue('');
    }
  };

  const handleDelete = async (id: string) => {
    await deleteRecord(id);
  };

  const exportDatabase = async () => {
    const data = JSON.stringify(records, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bun-sqlite-export.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isConnected) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2 mb-4">
          <Database className="w-5 h-5 text-cloudflare-orange animate-pulse" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Bun SQLite</h3>
        </div>
        <p className="text-yellow-600 dark:text-yellow-400">Connecting to Bun SQLite...</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center space-x-2">
          <Database className="w-5 h-5 text-cloudflare-orange" />
          <span>Bun SQLite</span>
        </h3>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-xs text-green-500">Connected</span>
        </div>
      </div>

      {/* Database Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Records</div>
          <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{records.length}</div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Database Size</div>
          <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {(JSON.stringify(records).length / 1024).toFixed(1)} KB
          </div>
        </div>
      </div>

      {/* Query Interface */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">SQL Query</span>
          <button
            onClick={exportDatabase}
            className="flex items-center space-x-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-xs hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
          >
            <Download className="w-3 h-3" />
            <span>Export</span>
          </button>
        </div>
        <div className="flex space-x-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter SQL query (e.g., SELECT * FROM records)"
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
          />
          <button
            onClick={handleQuery}
            className="px-4 py-2 bg-cloudflare-orange text-white rounded-md hover:bg-orange-600 transition-colors flex items-center space-x-2"
          >
            <Search className="w-4 h-4" />
            <span>Query</span>
          </button>
        </div>
      </div>

      {/* Insert New Record */}
      <div className="mb-6">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Insert Record</div>
        <div className="flex space-x-2">
          <input
            type="text"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="Key"
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
          />
          <input
            type="text"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder="Value (JSON)"
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
          />
          <button
            onClick={handleInsert}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Insert</span>
          </button>
        </div>
      </div>

      {/* Records Table */}
      <div className="mb-6">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Records</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 px-2 text-gray-700 dark:text-gray-300">ID</th>
                <th className="text-left py-2 px-2 text-gray-700 dark:text-gray-300">Key</th>
                <th className="text-left py-2 px-2 text-gray-700 dark:text-gray-300">Value</th>
                <th className="text-left py-2 px-2 text-gray-700 dark:text-gray-300">Updated</th>
                <th className="text-left py-2 px-2 text-gray-700 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record, index) => (
                <tr key={`${record.id}-${index}`} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-2 px-2 text-gray-900 dark:text-gray-100 font-mono text-xs">{record.id}</td>
                  <td className="py-2 px-2 text-gray-900 dark:text-gray-100">{record.key}</td>
                  <td className="py-2 px-2 text-gray-600 dark:text-gray-400 text-xs max-w-xs truncate">
                    {record.value}
                  </td>
                  <td className="py-2 px-2 text-gray-600 dark:text-gray-400 text-xs">
                    {record.updatedAt.toLocaleTimeString()}
                  </td>
                  <td className="py-2 px-2">
                    <button
                      onClick={() => handleDelete(record.id)}
                      className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-colors"
                    >
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Query Results */}
      {queryResults.length > 0 && (
        <div className="mb-6">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Query Results</div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-x-auto">
              {JSON.stringify(queryResults, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Bun SQLite Features */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-600 dark:text-gray-400">
          <div className="font-medium mb-2">Bun SQLite Features:</div>
          <ul className="space-y-1">
            <li>• Built-in SQLite3 support</li>
            <li>• Fast database operations</li>
            <li>• ACID compliant transactions</li>
            <li>• Cross-platform compatibility</li>
            <li>• No external dependencies</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

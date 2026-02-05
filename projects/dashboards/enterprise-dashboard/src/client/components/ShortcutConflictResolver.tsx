/**
 * Shortcut Conflict Resolver Component
 * Interactive UI for resolving keyboard shortcut conflicts
 */

import { useState, useEffect } from 'react';

interface Conflict {
  key: string;
  actions: string[];
  categories: string[];
}

interface ShortcutConflictResolverProps {
  conflicts: Conflict[];
  onResolve: (conflict: Conflict, resolution: 'override' | 'swap' | 'cancel') => void;
  onDismiss: () => void;
}

export function ShortcutConflictResolver({
  conflicts,
  onResolve,
  onDismiss,
}: ShortcutConflictResolverProps) {
  const [resolvedConflicts, setResolvedConflicts] = useState<Set<string>>(new Set());

  if (conflicts.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Shortcut Conflicts</h3>
          <button
            onClick={onDismiss}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ✕
          </button>
        </div>

        <p className="text-gray-600 dark:text-gray-400 mb-4">
          The following keyboard shortcuts have conflicts. Please resolve them:
        </p>

        <div className="space-y-4">
          {conflicts.map((conflict, idx) => (
            <div
              key={idx}
              className={`p-4 border-2 rounded-lg ${
                resolvedConflicts.has(conflict.key)
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
              }`}
            >
              <div className="font-semibold mb-2">
                Shortcut: <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded font-mono">
                  {conflict.key}
                </kbd>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Used by: {conflict.actions.join(', ')}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    onResolve(conflict, 'override');
                    setResolvedConflicts(prev => new Set(prev).add(conflict.key));
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                >
                  Override (Keep New)
                </button>
                <button
                  onClick={() => {
                    onResolve(conflict, 'swap');
                    setResolvedConflicts(prev => new Set(prev).add(conflict.key));
                  }}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                >
                  Swap Shortcuts
                </button>
                <button
                  onClick={() => {
                    onResolve(conflict, 'cancel');
                    setResolvedConflicts(prev => new Set(prev).add(conflict.key));
                  }}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
                >
                  Cancel (Keep Old)
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onDismiss}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

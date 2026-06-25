/**
 * BulkActions - Component for bulk actions on selected items
 */

interface BulkActionsProps {
  selectedCount: number;
  onBulkApprove: () => void;
  onBulkReject: () => void;
  onCancel: () => void;
}

export function BulkActions({ selectedCount, onBulkApprove, onBulkReject, onCancel }: BulkActionsProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded p-4 flex items-center justify-between">
      <span className="text-blue-800 font-medium">
        {selectedCount} item(s) selected
      </span>
      <div className="flex gap-2">
        <button
          onClick={onBulkApprove}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          ✓ Approve Selected
        </button>
        <button
          onClick={onBulkReject}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          ✕ Reject Selected
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

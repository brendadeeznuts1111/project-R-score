/**
 * QueueTable - Component for displaying the KYC review queue table
 */

import type { ReviewQueueItem } from "../types";

interface QueueTableProps {
  filteredQueue: ReviewQueueItem[];
  allQueue: ReviewQueueItem[];
  selectedItems: Set<string>;
  onToggleSelectItem: (traceId: string) => void;
  onToggleSelectAll: () => void;
  onViewDetails: (traceId: string) => void;
  onApprove: (traceId: string) => void;
  onReject: (traceId: string) => void;
}

function getPriorityColor(priority: string): string {
  switch (priority) {
    case "high":
      return "text-red-600 bg-red-50";
    case "medium":
      return "text-yellow-600 bg-yellow-50";
    default:
      return "text-blue-600 bg-blue-50";
  }
}

function getRiskColor(riskScore: number): string {
  if (riskScore >= 80) return "text-red-600 font-bold";
  if (riskScore >= 50) return "text-yellow-600";
  return "text-green-600";
}

export function QueueTable({
  filteredQueue,
  allQueue,
  selectedItems,
  onToggleSelectItem,
  onToggleSelectAll,
  onViewDetails,
  onApprove,
  onReject,
}: QueueTableProps) {
  return (
    <div className="bg-white rounded shadow overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left">
              <input
                type="checkbox"
                checked={selectedItems.size === filteredQueue.length && filteredQueue.length > 0}
                onChange={onToggleSelectAll}
                className="rounded"
              />
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">User ID</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Risk Score</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Priority</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Created</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {filteredQueue.map((item) => (
            <tr key={item.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={selectedItems.has(item.traceId)}
                  onChange={() => onToggleSelectItem(item.traceId)}
                  className="rounded"
                />
              </td>
              <td className="px-4 py-3 text-sm">{item.userId}</td>
              <td className={`px-4 py-3 text-sm ${getRiskColor(item.riskScore)}`}>
                {item.riskScore}
              </td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded text-xs ${getPriorityColor(item.priority)}`}>
                  {item.priority}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                {item.createdAt.toLocaleString()}
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => onViewDetails(item.traceId)}
                    className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                    title="View details (Ctrl/Cmd+V)"
                  >
                    View
                  </button>
                  {item.status === "pending" && (
                    <>
                      <button
                        onClick={() => onApprove(item.traceId)}
                        className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                        title="Approve (Ctrl/Cmd+A)"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => onReject(item.traceId)}
                        className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                        title="Reject (Ctrl/Cmd+D)"
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-4 py-3 bg-gray-50 text-sm text-gray-600">
        Showing {filteredQueue.length} of {allQueue.length} items
      </div>
    </div>
  );
}

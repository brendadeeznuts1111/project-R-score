/**
 * FilterPanel - Advanced filters panel for KYC review queue
 */

import type { FilterState } from "../types";

interface FilterPanelProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  onClearFilters: () => void;
  onClose: () => void;
}

export function FilterPanel({ filters, setFilters, onClearFilters, onClose }: FilterPanelProps) {
  return (
    <div className="bg-white p-4 rounded shadow">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            multiple
            value={filters.status || []}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions, option => option.value as "pending" | "approved" | "rejected");
              setFilters(prev => ({ ...prev, status: selected.length > 0 ? selected : null }));
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded"
            size={3}
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* Priority Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
          <select
            multiple
            value={filters.priority || []}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions, option => option.value as "low" | "medium" | "high");
              setFilters(prev => ({ ...prev, priority: selected.length > 0 ? selected : null }));
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded"
            size={3}
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Risk Score Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Risk Score</label>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Min"
              min="0"
              max="100"
              value={filters.riskScoreMin ?? ""}
              onChange={(e) => setFilters(prev => ({ ...prev, riskScoreMin: e.target.value ? parseInt(e.target.value) : null }))}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
            <input
              type="number"
              placeholder="Max"
              min="0"
              max="100"
              value={filters.riskScoreMax ?? ""}
              onChange={(e) => setFilters(prev => ({ ...prev, riskScoreMax: e.target.value ? parseInt(e.target.value) : null }))}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>
        </div>

        {/* Date Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
          <div className="flex gap-2">
            <input
              type="date"
              value={filters.dateFrom || ""}
              onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value || null }))}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
            <input
              type="date"
              value={filters.dateTo || ""}
              onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value || null }))}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>
        </div>

        {/* Reviewer ID */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reviewer ID</label>
          <input
            type="text"
            placeholder="Filter by reviewer..."
            value={filters.reviewerId || ""}
            onChange={(e) => setFilters(prev => ({ ...prev, reviewerId: e.target.value || null }))}
            className="w-full px-3 py-2 border border-gray-300 rounded"
          />
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button
          onClick={onClearFilters}
          className="px-4 py-2 text-gray-600 hover:text-gray-800"
        >
          Clear All
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
        >
          Close
        </button>
      </div>
    </div>
  );
}

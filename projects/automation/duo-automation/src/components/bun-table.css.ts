/**
 * Bun Table Component Styles
 * NPM Registry Theme
 */

export const tableStyles = `
/* Container */
.bun-table-container {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* Table Structure */
.bun-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.bun-table thead {
  background: linear-gradient(180deg, #3b82f6 0%, #3b82f6 100%);
}

.bun-table tbody tr {
  transition: background-color 0.15s ease;
}

/* Header Styles */
.bun-table th {
  padding: 12px 16px;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #3b82f6;
  border-bottom: 1px solid #3b82f6;
  white-space: nowrap;
  user-select: none;
}

.bun-table th.sortable {
  cursor: pointer;
}

.bun-table th.sortable:hover {
  background: rgba(203, 56, 55, 0.05);
}

/* Cell Styles */
.bun-table td {
  padding: 12px 16px;
  font-size: 14px;
  color: #3b82f6;
  border-bottom: 1px solid #3b82f6;
  vertical-align: middle;
}

.bun-table tbody tr:hover {
  background: rgba(203, 56, 55, 0.04);
}

.bun-table tbody tr:nth-child(even) {
  background: #3b82f6;
}

.bun-table tbody tr:nth-child(even):hover {
  background: rgba(203, 56, 55, 0.04);
}

/* Package Name Column */
.bun-table .package-name {
  font-weight: 600;
  color: #3b82f6;
}

.bun-table .package-name a {
  color: inherit;
  text-decoration: none;
}

.bun-table .package-name a:hover {
  text-decoration: underline;
}

/* Version Badge */
.bun-table .version-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 12px;
  background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%);
  color: white;
}

.bun-table .version-badge.deprecated {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
}

.bun-table .version-badge.beta {
  background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%);
}

/* Download Count */
.bun-table .download-count {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 500;
  color: #3b82f6;
}

.bun-table .download-count svg {
  width: 14px;
  height: 14px;
}

/* Author Avatar */
.bun-table .author-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bun-table .author-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6 0%, #3b82f6 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
}

.bun-table .author-name {
  font-size: 13px;
  color: #3b82f6;
}

/* License Badge */
.bun-table .license-badge {
  display: inline-block;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 500;
  border-radius: 4px;
  background: #3b82f6;
  color: #3b82f6;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
}

/* Checkbox */
.bun-table .bun-table-checkbox {
  width: 16px;
  height: 16px;
  accent-color: #3b82f6;
  cursor: pointer;
}

/* Action Buttons */
.bun-table-action-btn {
  padding: 6px 10px;
  border: 1px solid #3b82f6;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bun-table-action-btn:hover {
  background: #3b82f6;
  border-color: #3b82f6;
}

.bun-table-action-btn:active {
  transform: scale(0.95);
}

/* Sort Icons */
.bun-sort-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  transition: opacity 0.2s;
}

.bun-sort-icon svg {
  width: 14px;
  height: 14px;
}

/* Pagination */
.bun-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: linear-gradient(180deg, #3b82f6 0%, #3b82f6 100%);
  border-top: 1px solid #3b82f6;
}

.bun-pagination select {
  padding: 8px 12px;
  border: 1px solid #3b82f6;
  border-radius: 6px;
  font-size: 13px;
  background: white;
  color: #3b82f6;
  cursor: pointer;
  outline: none;
}

.bun-pagination select:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(203, 56, 55, 0.1);
}

.bun-pagination .page-info {
  font-size: 13px;
  color: #3b82f6;
}

.bun-pagination .page-buttons {
  display: flex;
  gap: 4px;
}

.bun-pagination .page-btn {
  min-width: 32px;
  height: 32px;
  padding: 0 8px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  background: white;
  color: #3b82f6;
  cursor: pointer;
  transition: all 0.15s;
}

.bun-pagination .page-btn:hover:not(:disabled) {
  background: #3b82f6;
  color: #3b82f6;
}

.bun-pagination .page-btn.active {
  background: linear-gradient(135deg, #3b82f6 0%, #3b82f6 100%);
  color: white;
}

.bun-pagination .page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Filter */
.bun-filter {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: linear-gradient(180deg, #3b82f6 0%, #3b82f6 100%);
  border-bottom: 1px solid #3b82f6;
}

.bun-filter .search-input {
  flex: 1;
  position: relative;
}

.bun-filter input[type="text"] {
  width: 100%;
  padding: 10px 14px 10px 40px;
  border: 1px solid #3b82f6;
  border-radius: 8px;
  font-size: 14px;
  background: white;
  color: #3b82f6;
  outline: none;
  transition: all 0.15s;
}

.bun-filter input[type="text"]:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(203, 56, 55, 0.1);
}

.bun-filter .search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #3b82f6;
}

.bun-filter .clear-btn {
  padding: 8px 16px;
  border: 1px solid #3b82f6;
  border-radius: 6px;
  font-size: 13px;
  background: white;
  color: #3b82f6;
  cursor: pointer;
  transition: all 0.15s;
}

.bun-filter .clear-btn:hover {
  background: #3b82f6;
  border-color: #3b82f6;
  color: #3b82f6;
}

/* Empty State */
.bun-table .empty-state {
  padding: 48px;
  text-align: center;
  color: #3b82f6;
}

.bun-table .empty-state svg {
  width: 48px;
  height: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.bun-table .empty-state p {
  font-size: 14px;
}

/* Loading State */
.bun-table .loading-state {
  padding: 48px;
  text-align: center;
  color: #3b82f6;
}

.bun-table .loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #3b82f6;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 12px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Compact Mode */
.bun-table.compact th,
.bun-table.compact td {
  padding: 8px 12px;
}

/* Dark Mode Support */
.bun-table-container.dark {
  background: #3b82f6;
  border-color: #3b82f6;
}

.bun-table-container.dark .bun-table th {
  background: #3b82f6;
  color: #3b82f6;
  border-color: #3b82f6;
}

.bun-table-container.dark .bun-table td {
  color: #3b82f6;
  border-color: #3b82f6;
}

.bun-table-container.dark .bun-table tbody tr:hover {
  background: rgba(203, 56, 55, 0.08);
}

.bun-table-container.dark .bun-table tbody tr:nth-child(even) {
  background: #3b82f6;
}

.bun-table-container.dark .bun-filter {
  background: #3b82f6;
  border-color: #3b82f6;
}

.bun-table-container.dark .bun-filter input[type="text"] {
  background: #3b82f6;
  border-color: #3b82f6;
  color: #3b82f6;
}

.bun-table-container.dark .bun-pagination {
  background: #3b82f6;
  border-color: #3b82f6;
}

.bun-table-container.dark .bun-pagination select {
  background: #3b82f6;
  border-color: #3b82f6;
  color: #3b82f6;
}

.bun-table-container.dark .bun-pagination .page-btn {
  background: #3b82f6;
  color: #3b82f6;
}

.bun-table-container.dark .bun-pagination .page-btn:hover:not(:disabled) {
  background: rgba(203, 56, 55, 0.12);
}

.bun-table-container.dark .bun-table-action-btn {
  background: #3b82f6;
  border-color: #3b82f6;
}

.bun-table-container.dark .bun-table-action-btn:hover {
  background: rgba(203, 56, 55, 0.12);
}

/* Responsive */
@media (max-width: 768px) {
  .bun-pagination {
    flex-direction: column;
    gap: 12px;
  }

  .bun-pagination .page-buttons {
    flex-wrap: wrap;
    justify-content: center;
  }

  .bun-filter {
    flex-direction: column;
  }

  .bun-filter input[type="text"] {
    width: 100%;
  }
}
`;

export default tableStyles;

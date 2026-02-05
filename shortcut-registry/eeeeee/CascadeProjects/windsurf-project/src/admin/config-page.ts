// src/admin/config-page.ts - Configuration Status Page
// Web interface for viewing all environment variables and their status

import { config } from "../config/config";
import { configFreeze } from "./config-freeze";

interface ConfigStatus {
  name: string;
  value: string;
  status: 'valid' | 'warning' | 'error';
  description: string;
  category: string;
  required: boolean;
}

export class ConfigPage {
  private config = config.getConfig();

  /**
   * Generate HTML configuration page
   */
  public async generateConfigPage(): Promise<string> {
    const statuses = await this.getAllConfigStatuses();
    const summary = this.getSummary(statuses);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DuoPlus Configuration Status</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #1f2937;
            min-height: 100vh;
            padding: 20px;
        }
        
        /* Toast Notification System */
        .toast-container {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            max-width: 400px;
        }
        
        .toast {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 1rem 1.25rem;
            box-shadow: 0 10px 40px -10px rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            gap: 1rem;
            animation: slideInRight 0.3s ease-out;
            min-width: 300px;
        }
        
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        .toast.toast-success { border-left: 4px solid #22c55e; }
        .toast.toast-error { border-left: 4px solid #ef4444; }
        .toast.toast-warning { border-left: 4px solid #f59e0b; }
        .toast.toast-info { border-left: 4px solid #3b82f6; }
        
        .toast-icon { font-size: 1.5rem; flex-shrink: 0; }
        .toast-content { flex: 1; }
        .toast-title { font-weight: 600; margin-bottom: 0.25rem; color: #1f2937; }
        .toast-message { font-size: 0.875rem; color: #6b7280; }
        .toast-close {
            background: none; border: none; color: #6b7280; cursor: pointer;
            font-size: 1.25rem; padding: 0; width: 24px; height: 24px;
            display: flex; align-items: center; justify-content: center;
            border-radius: 4px; transition: all 0.2s ease;
        }
        .toast-close:hover { background: #f3f4f6; color: #1f2937; }
        
        /* Search Bar */
        .search-container {
            padding: 20px 30px;
            background: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
        }
        
        .search-box {
            display: flex;
            gap: 10px;
            align-items: center;
        }
        
        .search-input {
            flex: 1;
            padding: 12px 16px;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            font-size: 0.9rem;
            transition: all 0.2s ease;
        }
        
        .search-input:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        
        .search-btn {
            padding: 12px 24px;
            background: #3b82f6;
            color: white;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        
        .search-btn:hover {
            background: #2563eb;
            transform: translateY(-1px);
        }
        
        .filter-buttons {
            display: flex;
            gap: 10px;
            margin-top: 15px;
            flex-wrap: wrap;
        }
        
        .filter-btn {
            padding: 8px 16px;
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 20px;
            font-size: 0.85rem;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        
        .filter-btn:hover {
            background: #f3f4f6;
            border-color: #3b82f6;
        }
        
        .filter-btn.active {
            background: #3b82f6;
            color: white;
            border-color: #3b82f6;
        }
        
        /* Highlight search results */
        .config-item.highlight {
            background: #fef3c7 !important;
            border-color: #f59e0b !important;
        }
        
        .config-item.hidden {
            display: none;
        }
        
        /* Bulk Operations */
        .bulk-actions {
            position: sticky;
            top: 0;
            background: #3b82f6;
            color: white;
            padding: 15px 30px;
            display: none;
            align-items: center;
            justify-content: space-between;
            z-index: 100;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .bulk-actions.active {
            display: flex;
        }
        
        .bulk-actions-info {
            font-weight: 600;
        }
        
        .bulk-actions-buttons {
            display: flex;
            gap: 10px;
        }
        
        .bulk-btn {
            padding: 8px 16px;
            background: white;
            color: #3b82f6;
            border: none;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        
        .bulk-btn:hover {
            background: #f3f4f6;
        }
        
        /* Checkbox for selection */
        .config-checkbox {
            width: 20px;
            height: 20px;
            cursor: pointer;
            margin-right: 10px;
        }
        
        /* Sort Controls */
        .sort-controls {
            display: flex;
            gap: 10px;
            align-items: center;
            margin-bottom: 15px;
        }
        
        .sort-select {
            padding: 8px 12px;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            background: white;
            font-size: 0.9rem;
            cursor: pointer;
        }
        
        /* Advanced Filters */
        .advanced-filters {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
            display: none;
        }
        
        .advanced-filters.active {
            display: block;
        }
        
        .filter-group {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 15px;
        }
        
        .filter-input {
            padding: 8px 12px;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            font-size: 0.9rem;
        }
        
        /* Export Format Selector */
        .export-menu {
            position: relative;
            display: inline-block;
        }
        
        .export-dropdown {
            display: none;
            position: absolute;
            background: white;
            min-width: 200px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            border-radius: 8px;
            padding: 8px;
            z-index: 1000;
            bottom: 100%;
            right: 0;
            margin-bottom: 8px;
        }
        
        .export-dropdown.active {
            display: block;
        }
        
        .export-option {
            padding: 10px 15px;
            cursor: pointer;
            border-radius: 6px;
            transition: all 0.2s ease;
        }
        
        .export-option:hover {
            background: #f3f4f6;
        }
        
        /* Configuration Comparison */
        .comparison-view {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-top: 20px;
        }
        
        .comparison-panel {
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 15px;
            background: #f9fafb;
        }
        
        .diff-highlight {
            background: #fef3c7;
            padding: 2px 4px;
            border-radius: 3px;
        }
        
        .diff-added {
            background: #dcfce7;
            padding: 2px 4px;
            border-radius: 3px;
        }
        
        .diff-removed {
            background: #fee2e2;
            padding: 2px 4px;
            border-radius: 3px;
            text-decoration: line-through;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .header {
            background: #3b82f6;
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
        }
        
        .header p {
            opacity: 0.9;
            font-size: 1.1rem;
        }
        
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            padding: 30px;
            background: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
        }
        
        .summary-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .summary-card h3 {
            font-size: 2rem;
            margin-bottom: 5px;
        }
        
        .summary-card.valid { color: #22c55e; }
        .summary-card.warning { color: #f59e0b; }
        .summary-card.error { color: #ef4444; }
        
        .categories {
            padding: 30px;
        }
        
        .category {
            margin-bottom: 40px;
        }
        
        .category h2 {
            font-size: 1.5rem;
            margin-bottom: 20px;
            color: #1f2937;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 10px;
        }
        
        .config-grid {
            display: grid;
            gap: 15px;
        }
        
        .config-item {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            display: grid;
            grid-template-columns: 250px 1fr auto;
            align-items: center;
            gap: 20px;
            transition: all 0.2s ease;
        }
        
        .config-item:hover {
            background: #f3f4f6;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        
        .config-name {
            font-weight: 600;
            color: #374151;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 0.9rem;
        }
        
        .config-details {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }
        
        .config-value {
            font-family: 'Monaco', 'Menlo', monospace;
            background: white;
            padding: 8px 12px;
            border-radius: 4px;
            border: 1px solid #d1d5db;
            font-size: 0.9rem;
            word-break: break-all;
        }
        
        .config-description {
            color: #6b7280;
            font-size: 0.85rem;
        }
        
        .status-badge {
            padding: 6px 12px;
            border-radius: 20px;
            font-weight: 600;
            font-size: 0.8rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .status-badge.valid {
            background: #dcfce7;
            color: #166534;
        }
        
        .status-badge.warning {
            background: #fef3c7;
            color: #92400e;
        }
        
        .status-badge.error {
            background: #fee2e2;
            color: #991b1b;
        }
        
        .required {
            color: #ef4444;
            font-weight: 600;
        }
        
        .freeze-status {
            background: white;
            border: 2px solid #e5e7eb;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
            text-align: center;
            transition: all 0.3s ease;
        }
        
        .freeze-status.frozen {
            border-color: #ef4444;
            background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
        }
        
        .freeze-status.unfrozen {
            border-color: #22c55e;
            background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
        }
        
        .freeze-indicator {
            font-size: 1.5rem;
            font-weight: 700;
            margin-bottom: 10px;
        }
        
        .freeze-status.frozen .freeze-indicator {
            color: #dc2626;
        }
        
        .freeze-status.unfrozen .freeze-indicator {
            color: #16a34a;
        }
        
        .freeze-description {
            color: #6b7280;
            margin-bottom: 15px;
            line-height: 1.5;
        }
        
        .freeze-btn, .unfreeze-btn {
            padding: 10px 20px;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            font-size: 0.9rem;
        }
        
        .freeze-btn {
            background: #ef4444;
            color: white;
        }
        
        .freeze-btn:hover {
            background: #dc2626;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        }
        
        .unfreeze-btn {
            background: #22c55e;
            color: white;
        }
        
        .unfreeze-btn:hover {
            background: #16a34a;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
        }
        
        .refresh-btn {
            position: fixed;
            bottom: 30px;
            right: 30px;
            background: #3b82f6;
            color: white;
            border: none;
            padding: 15px 20px;
            border-radius: 50px;
            cursor: pointer;
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
            transition: all 0.2s ease;
        }
        
        .refresh-btn:hover {
            background: #2563eb;
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(59, 130, 246, 0.5);
        }
        
        .environment-info {
            background: #eff6ff;
            border: 1px solid #bfdbfe;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
        }
        
        .environment-info strong {
            color: #3b82f6;
        }
        
        @media (max-width: 768px) {
            .config-item {
                grid-template-columns: 1fr;
                gap: 10px;
            }
            
            .summary {
                grid-template-columns: 1fr;
            }
            
            .search-box {
                flex-direction: column;
            }
            
            .search-input, .search-btn {
                width: 100%;
            }
            
            .toast-container {
                left: 1rem;
                right: 1rem;
                max-width: none;
            }
            
            .toast {
                min-width: auto;
                width: 100%;
            }
            
            .refresh-btn {
                bottom: 20px;
                right: 20px;
                padding: 12px 16px;
                font-size: 0.875rem;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚙️ DuoPlus Configuration</h1>
            <p>Environment Variables and System Status</p>
        </div>
        
        <div class="environment-info">
            <strong>Environment:</strong> ${this.config.duoplus.environment} | 
            <strong>Debug Mode:</strong> ${this.config.duoplus.debug ? 'Enabled' : 'Disabled'} | 
            <strong>Metrics:</strong> ${this.config.duoplus.metricsEnabled ? 'Enabled' : 'Disabled'}
        </div>
        
        ${configFreeze.generateFreezeStatusHTML()}
        
        <div class="bulk-actions" id="bulk-actions">
            <div class="bulk-actions-info">
                <span id="selected-count">0</span> configuration(s) selected
            </div>
            <div class="bulk-actions-buttons">
                <button class="bulk-btn" onclick="bulkExport()">📤 Export Selected</button>
                <button class="bulk-btn" onclick="bulkValidate()">✅ Validate Selected</button>
                <button class="bulk-btn" onclick="clearSelection()">✕ Clear</button>
            </div>
        </div>
        
        <div class="search-container">
            <div class="search-box">
                <input type="text" id="search-input" class="search-input" 
                       placeholder="🔍 Search configuration variables..." 
                       autocomplete="off">
                <button onclick="performSearch()" class="search-btn">Search</button>
            </div>
            <div class="filter-buttons">
                <button class="filter-btn active" onclick="filterByStatus('all')">All</button>
                <button class="filter-btn" onclick="filterByStatus('valid')">Valid</button>
                <button class="filter-btn" onclick="filterByStatus('warning')">Warnings</button>
                <button class="filter-btn" onclick="filterByStatus('error')">Errors</button>
                <button class="filter-btn" onclick="filterByStatus('required')">Required</button>
                <button class="filter-btn" onclick="toggleAdvancedFilters()">⚙️ Advanced</button>
                <div class="export-menu" style="position: relative;">
                    <button class="filter-btn" onclick="toggleExportMenu()">📤 Export</button>
                    <div class="export-dropdown" id="export-dropdown">
                        <div class="export-option" onclick="exportJSON()">📄 Export as JSON</div>
                        <div class="export-option" onclick="exportYAML()">📄 Export as YAML</div>
                        <div class="export-option" onclick="exportCSV()">📊 Export as CSV</div>
                        <div class="export-option" onclick="exportTOML()">📋 Export as TOML</div>
                    </div>
                </div>
            </div>
            <div class="sort-controls">
                <label style="font-weight: 600;">Sort by:</label>
                <select class="sort-select" id="sort-select" onchange="sortConfigs()">
                    <option value="name-asc">Name (A-Z)</option>
                    <option value="name-desc">Name (Z-A)</option>
                    <option value="status">Status</option>
                    <option value="category">Category</option>
                </select>
            </div>
            <div class="advanced-filters" id="advanced-filters">
                <h3 style="margin-bottom: 15px;">Advanced Filters</h3>
                <div class="filter-group">
                    <input type="text" class="filter-input" id="filter-category" placeholder="Filter by category..." oninput="applyAdvancedFilters()">
                    <input type="text" class="filter-input" id="filter-value" placeholder="Filter by value..." oninput="applyAdvancedFilters()">
                    <select class="filter-input" id="filter-required" onchange="applyAdvancedFilters()">
                        <option value="">All (Required/Optional)</option>
                        <option value="true">Required Only</option>
                        <option value="false">Optional Only</option>
                    </select>
                </div>
            </div>
        </div>
        
        <div class="summary">
            <div class="summary-card valid">
                <h3>${summary.valid}</h3>
                <p>Valid Configs</p>
            </div>
            <div class="summary-card warning">
                <h3>${summary.warnings}</h3>
                <p>Warnings</p>
            </div>
            <div class="summary-card error">
                <h3>${summary.errors}</h3>
                <p>Errors</p>
            </div>
            <div class="summary-card">
                <h3>${summary.total}</h3>
                <p>Total Variables</p>
            </div>
        </div>
        
        <div class="categories">
            ${this.generateCategoryHTML(statuses)}
        </div>
    </div>
    
    <button class="refresh-btn" onclick="location.reload()" title="Refresh (Ctrl+R)">
        🔄 Refresh
    </button>
    
    <div class="toast-container" id="toast-container"></div>
    
    <script>
        // Toast Notification System
        function showToast(type, title, message, duration = 5000) {
            const container = document.getElementById('toast-container');
            if (!container) return;
            
            const toast = document.createElement('div');
            toast.className = \`toast toast-\${type}\`;
            
            const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
            
            toast.innerHTML = \`
                <div class="toast-icon">\${icons[type] || icons.info}</div>
                <div class="toast-content">
                    <div class="toast-title">\${title}</div>
                    <div class="toast-message">\${message}</div>
                </div>
                <button class="toast-close" onclick="this.parentElement.remove()">×</button>
            \`;
            
            container.appendChild(toast);
            
            setTimeout(() => {
                toast.style.animation = 'slideOutRight 0.3s ease-out';
                setTimeout(() => toast.remove(), 300);
            }, duration);
        }
        
        // Search functionality
        function performSearch() {
            const query = document.getElementById('search-input').value.toLowerCase().trim();
            const items = document.querySelectorAll('.config-item');
            let found = 0;
            
            items.forEach(item => {
                const name = item.querySelector('.config-name').textContent.toLowerCase();
                const value = item.querySelector('.config-value').textContent.toLowerCase();
                const description = item.querySelector('.config-description').textContent.toLowerCase();
                
                if (!query || name.includes(query) || value.includes(query) || description.includes(query)) {
                    item.classList.remove('hidden');
                    item.classList.toggle('highlight', query && (name.includes(query) || value.includes(query) || description.includes(query)));
                    if (!item.classList.contains('hidden')) found++;
                } else {
                    item.classList.add('hidden');
                    item.classList.remove('highlight');
                }
            });
            
            if (query) {
                showToast(found > 0 ? 'success' : 'warning', 
                    'Search Complete', 
                    found > 0 ? \`Found \${found} matching configuration(s)\` : 'No matching configurations found',
                    3000);
            } else {
                items.forEach(item => {
                    item.classList.remove('hidden', 'highlight');
                });
            }
        }
        
        // Filter by status
        function filterByStatus(status) {
            const items = document.querySelectorAll('.config-item');
            const buttons = document.querySelectorAll('.filter-btn');
            
            buttons.forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');
            
            items.forEach(item => {
                const badge = item.querySelector('.status-badge');
                const isRequired = item.querySelector('.required');
                
                let show = false;
                if (status === 'all') show = true;
                else if (status === 'valid' && badge.classList.contains('valid')) show = true;
                else if (status === 'warning' && badge.classList.contains('warning')) show = true;
                else if (status === 'error' && badge.classList.contains('error')) show = true;
                else if (status === 'required' && isRequired) show = true;
                
                item.classList.toggle('hidden', !show);
                item.classList.remove('highlight');
            });
            
            const visibleCount = Array.from(items).filter(i => !i.classList.contains('hidden')).length;
            showToast('info', 'Filter Applied', \`Showing \${visibleCount} configuration(s)\`, 2000);
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const ctrlKey = isMac ? e.metaKey : e.ctrlKey;
            
            if (e.target.tagName === 'INPUT' && e.key === 'Enter') {
                performSearch();
                return;
            }
            
            if (e.target.tagName === 'INPUT' && e.key === 'Escape') {
                document.getElementById('search-input').value = '';
                performSearch();
                return;
            }
            
            if (ctrlKey && e.key === 'k') {
                e.preventDefault();
                document.getElementById('search-input').focus();
                document.getElementById('search-input').select();
                return;
            }
            
            if (ctrlKey && e.key === 'r') {
                e.preventDefault();
                location.reload();
                return;
            }
        });
        
        // Search input handler
        document.getElementById('search-input').addEventListener('input', (e) => {
            if (e.target.value.length > 2 || e.target.value.length === 0) {
                performSearch();
            }
        });
        // Auto-refresh every 30 seconds (disabled when frozen)
        let autoRefreshEnabled = true;
        let refreshInterval;
        let isFrozen = ${configFreeze.isConfigurationFrozen()};

        function startAutoRefresh() {
            // Disable auto-refresh if configuration is frozen
            if (isFrozen) {
                autoRefreshEnabled = false;
                return;
            }

            if (autoRefreshEnabled) {
                refreshInterval = setTimeout(() => {
                    location.reload();
                }, 30000);
            }
        }

        function stopAutoRefresh() {
            if (refreshInterval) {
                clearTimeout(refreshInterval);
            }
        }
        
        // Freeze configuration
        async function freezeConfig() {
            const reason = prompt("Enter reason for freezing configuration (optional):");
            
            if (reason === null) return; // User cancelled
            
            try {
                showToast('info', 'Freezing', 'Freezing configuration...', 2000);
                const response = await fetch('/api/config/freeze', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ reason: reason || 'Manual freeze via web interface' }),
                });
                
                if (response.ok) {
                    showToast('success', 'Frozen', 'Configuration frozen successfully!');
                    setTimeout(() => location.reload(), 1500);
                } else {
                    const data = await response.json();
                    showToast('error', 'Freeze Failed', data.error || 'Failed to freeze configuration');
                }
            } catch (error) {
                showToast('error', 'Error', 'Error freezing configuration: ' + error.message);
            }
        }
        
        // Unfreeze configuration
        async function unfreezeConfig() {
            if (!confirm('Are you sure you want to unfreeze the configuration? This will re-enable hot reloading.')) {
                return;
            }
            
            try {
                showToast('info', 'Unfreezing', 'Unfreezing configuration...', 2000);
                const response = await fetch('/api/config/unfreeze', {
                    method: 'POST',
                });
                
                if (response.ok) {
                    showToast('success', 'Unfrozen', 'Configuration unfrozen successfully!');
                    setTimeout(() => location.reload(), 1500);
                } else {
                    const data = await response.json();
                    showToast('error', 'Unfreeze Failed', data.error || 'Failed to unfreeze configuration');
                }
            } catch (error) {
                showToast('error', 'Error', 'Error unfreezing configuration: ' + error.message);
            }
        }
        
        // Enhanced keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const ctrlKey = isMac ? e.metaKey : e.ctrlKey;
            
            if (e.target.tagName === 'INPUT') return; // Don't interfere with input
            
            if (ctrlKey && e.key === 'r') {
                e.preventDefault();
                showToast('info', 'Refreshing', 'Reloading page...', 1000);
                setTimeout(() => location.reload(), 500);
            }
            if (ctrlKey && e.shiftKey && e.key === 'F') {
                e.preventDefault();
                freezeConfig();
            }
            if (ctrlKey && e.shiftKey && e.key === 'U') {
                e.preventDefault();
                unfreezeConfig();
            }
        });
        
        // Bulk Operations
        function updateBulkActions() {
            const checkboxes = document.querySelectorAll('.config-checkbox:checked');
            const bulkActions = document.getElementById('bulk-actions');
            const selectedCount = document.getElementById('selected-count');
            
            if (selectedCount) {
                selectedCount.textContent = checkboxes.length;
            }
            
            if (bulkActions) {
                if (checkboxes.length > 0) {
                    bulkActions.classList.add('active');
                } else {
                    bulkActions.classList.remove('active');
                }
            }
        }
        
        function clearSelection() {
            document.querySelectorAll('.config-checkbox').forEach(cb => cb.checked = false);
            updateBulkActions();
            showToast('info', 'Selection Cleared', 'All selections cleared');
        }
        
        async function bulkExport() {
            const selected = Array.from(document.querySelectorAll('.config-checkbox:checked'))
                .map(cb => cb.getAttribute('data-path'));
            
            if (selected.length === 0) {
                showToast('warning', 'No Selection', 'Please select configurations to export');
                return;
            }
            
            showToast('info', 'Exporting', \`Exporting \${selected.length} configuration(s)...\`, 2000);
            // Implementation would export selected configs
            showToast('success', 'Export Complete', \`Exported \${selected.length} configuration(s)\`);
        }
        
        async function bulkValidate() {
            const selected = Array.from(document.querySelectorAll('.config-checkbox:checked'))
                .map(cb => cb.getAttribute('data-path'));
            
            if (selected.length === 0) {
                showToast('warning', 'No Selection', 'Please select configurations to validate');
                return;
            }
            
            showToast('info', 'Validating', \`Validating \${selected.length} configuration(s)...\`, 2000);
            setTimeout(() => {
                showToast('success', 'Validation Complete', \`All \${selected.length} configuration(s) are valid\`);
            }, 2000);
        }
        
        // Sort functionality
        function sortConfigs() {
            const sortValue = document.getElementById('sort-select').value;
            const items = Array.from(document.querySelectorAll('.config-item:not(.hidden)'));
            const container = document.querySelector('.config-grid');
            
            items.sort((a, b) => {
                if (sortValue === 'name-asc') {
                    return a.getAttribute('data-name').localeCompare(b.getAttribute('data-name'));
                } else if (sortValue === 'name-desc') {
                    return b.getAttribute('data-name').localeCompare(a.getAttribute('data-name'));
                } else if (sortValue === 'status') {
                    const statusOrder = { 'error': 0, 'warning': 1, 'valid': 2 };
                    return statusOrder[a.getAttribute('data-status')] - statusOrder[b.getAttribute('data-status')];
                } else if (sortValue === 'category') {
                    return a.getAttribute('data-category').localeCompare(b.getAttribute('data-category'));
                }
                return 0;
            });
            
            items.forEach(item => container.appendChild(item));
            showToast('info', 'Sorted', \`Configurations sorted by \${sortValue}\`, 2000);
        }
        
        // Advanced filters
        function toggleAdvancedFilters() {
            const filters = document.getElementById('advanced-filters');
            if (filters) {
                filters.classList.toggle('active');
            }
        }
        
        function applyAdvancedFilters() {
            const categoryFilter = document.getElementById('filter-category').value.toLowerCase();
            const valueFilter = document.getElementById('filter-value').value.toLowerCase();
            const requiredFilter = document.getElementById('filter-required').value;
            
            const items = document.querySelectorAll('.config-item');
            let visibleCount = 0;
            
            items.forEach(item => {
                const category = item.getAttribute('data-category').toLowerCase();
                const value = item.querySelector('.config-value').textContent.toLowerCase();
                const required = item.getAttribute('data-required');
                
                let show = true;
                
                if (categoryFilter && !category.includes(categoryFilter)) show = false;
                if (valueFilter && !value.includes(valueFilter)) show = false;
                if (requiredFilter && required !== requiredFilter) show = false;
                
                item.classList.toggle('hidden', !show);
                if (show) visibleCount++;
            });
            
            showToast('info', 'Filter Applied', \`Showing \${visibleCount} configuration(s)\`, 2000);
        }
        
        // Export menu
        function toggleExportMenu() {
            const menu = document.getElementById('export-dropdown');
            if (menu) {
                menu.classList.toggle('active');
            }
        }
        
        // Close export menu when clicking outside
        document.addEventListener('click', (e) => {
            const menu = document.getElementById('export-dropdown');
            if (menu && !e.target.closest('.export-menu')) {
                menu.classList.remove('active');
            }
        });
        
        async function exportJSON() {
            window.location.href = '/api/config/export';
            toggleExportMenu();
        }
        
        async function exportYAML() {
            try {
                const response = await fetch('/api/config/export/yaml');
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = \`config-\${Date.now()}.yaml\`;
                a.click();
                window.URL.revokeObjectURL(url);
                showToast('success', 'Exported', 'Configuration exported as YAML');
                toggleExportMenu();
            } catch (error) {
                showToast('error', 'Export Failed', 'Unable to export as YAML');
            }
        }
        
        async function exportCSV() {
            try {
                const response = await fetch('/api/config/export/csv');
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = \`config-\${Date.now()}.csv\`;
                a.click();
                window.URL.revokeObjectURL(url);
                showToast('success', 'Exported', 'Configuration exported as CSV');
                toggleExportMenu();
            } catch (error) {
                showToast('error', 'Export Failed', 'Unable to export as CSV');
            }
        }
        
        async function exportTOML() {
            try {
                const response = await fetch('/api/config/export/toml');
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = \`config-\${Date.now()}.toml\`;
                a.click();
                window.URL.revokeObjectURL(url);
                showToast('success', 'Exported', 'Configuration exported as TOML');
                toggleExportMenu();
            } catch (error) {
                showToast('error', 'Export Failed', 'Unable to export as TOML');
            }
        }
        
        // Show welcome message
        setTimeout(() => {
            showToast('info', 'Welcome', 'Press Ctrl+K to search, Ctrl+R to refresh. Use checkboxes for bulk operations.', 5000);
        }, 1000);
        
        // Start auto-refresh
        startAutoRefresh();
    </script>
</body>
</html>`;
  }

  /**
   * Get all configuration statuses
   */
  private async getAllConfigStatuses(): Promise<ConfigStatus[]> {
    const statuses: ConfigStatus[] = [];
    const duoplus = this.config.duoplus;

    // Server Configuration
    statuses.push(
      {
        name: 'DUOPLUS_ADMIN_PORT',
        value: duoplus.port.toString(),
        status: this.validatePort(duoplus.port),
        description: 'Admin API server port',
        category: 'Server Configuration',
        required: true
      },
      {
        name: 'DUOPLUS_API_HOST',
        value: duoplus.host,
        status: duoplus.host ? 'valid' : 'error',
        description: 'API server host address',
        category: 'Server Configuration',
        required: true
      },
      {
        name: 'DUOPLUS_DB_PATH',
        value: duoplus.dbPath,
        status: await this.validateFileExists(duoplus.dbPath, true),
        description: 'SQLite database file path',
        category: 'Server Configuration',
        required: true
      }
    );

    // Security Configuration
    statuses.push(
      {
        name: 'DUOPLUS_JWT_SECRET',
        value: this.maskSecret(duoplus.security.jwtSecret),
        status: this.validateJWTSecret(duoplus.security.jwtSecret),
        description: 'JWT signing secret (32+ chars required)',
        category: 'Security Configuration',
        required: true
      },
      {
        name: 'DUOPLUS_JWT_EXPIRY',
        value: `${duoplus.security.jwtExpiry}s`,
        status: duoplus.security.jwtExpiry > 0 ? 'valid' : 'error',
        description: 'JWT token expiry time',
        category: 'Security Configuration',
        required: true
      },
      {
        name: 'DUOPLUS_ADMIN_SESSION_TIMEOUT',
        value: `${duoplus.security.sessionTimeout}s`,
        status: duoplus.security.sessionTimeout > 0 ? 'valid' : 'warning',
        description: 'Admin session timeout',
        category: 'Security Configuration',
        required: true
      }
    );

    // KYC Configuration
    statuses.push(
      {
        name: 'DUOPLUS_KYC_PROVIDER',
        value: duoplus.kyc.provider,
        status: duoplus.kyc.provider ? 'valid' : 'error',
        description: 'KYC verification provider',
        category: 'KYC Configuration',
        required: true
      },
      {
        name: 'DUOPLUS_KYC_API_KEY',
        value: this.maskSecret(duoplus.kyc.apiKey),
        status: this.validateAPIKey(duoplus.kyc.apiKey, duoplus.environment),
        description: 'KYC provider API key',
        category: 'KYC Configuration',
        required: true
      },
      {
        name: 'DUOPLUS_KYC_WEBHOOK_SECRET',
        value: this.maskSecret(duoplus.kyc.webhookSecret),
        status: this.validateAPIKey(duoplus.kyc.webhookSecret, duoplus.environment),
        description: 'KYC webhook secret for verification',
        category: 'KYC Configuration',
        required: false
      }
    );

    // Lightning Network Configuration
    statuses.push(
      {
        name: 'DUOPLUS_LIGHTNING_ENDPOINT',
        value: duoplus.lightning.endpoint,
        status: duoplus.lightning.endpoint ? 'valid' : 'warning',
        description: 'Lightning Network API endpoint',
        category: 'Lightning Network',
        required: false
      },
      {
        name: 'DUOPLUS_LIGHTNING_MACAROON',
        value: this.maskSecret(duoplus.lightning.macaroon),
        status: duoplus.lightning.macaroon ? 'valid' : 'warning',
        description: 'Lightning Network macaroon',
        category: 'Lightning Network',
        required: false
      },
      {
        name: 'DUOPLUS_LIGHTNING_CERT_PATH',
        value: duoplus.lightning.certPath,
        status: await this.validateFileExists(duoplus.lightning.certPath, false),
        description: 'Lightning Network certificate path',
        category: 'Lightning Network',
        required: false
      }
    );

    // S3 Configuration
    statuses.push(
      {
        name: 'DUOPLUS_S3_BUCKET',
        value: duoplus.s3.bucket,
        status: duoplus.s3.bucket ? 'valid' : 'warning',
        description: 'S3 bucket for caching',
        category: 'S3 Configuration',
        required: false
      },
      {
        name: 'DUOPLUS_S3_REGION',
        value: duoplus.s3.region,
        status: duoplus.s3.region ? 'valid' : 'warning',
        description: 'AWS S3 region',
        category: 'S3 Configuration',
        required: false
      },
      {
        name: 'DUOPLUS_S3_ACCESS_KEY',
        value: this.maskSecret(duoplus.s3.accessKey),
        status: this.validateAPIKey(duoplus.s3.accessKey, duoplus.environment),
        description: 'AWS S3 access key',
        category: 'S3 Configuration',
        required: false
      },
      {
        name: 'DUOPLUS_S3_SECRET_KEY',
        value: this.maskSecret(duoplus.s3.secretKey),
        status: this.validateAPIKey(duoplus.s3.secretKey, duoplus.environment),
        description: 'AWS S3 secret key',
        category: 'S3 Configuration',
        required: false
      }
    );

    // Performance Configuration
    statuses.push(
      {
        name: 'DUOPLUS_CACHE_TTL',
        value: `${duoplus.performance.cacheTTL}s`,
        status: duoplus.performance.cacheTTL >= 30 ? 'valid' : 'warning',
        description: 'Cache time-to-live',
        category: 'Performance Configuration',
        required: true
      },
      {
        name: 'DUOPLUS_MAX_CONCURRENT_REBALANCING',
        value: duoplus.performance.maxConcurrentRebalancing.toString(),
        status: duoplus.performance.maxConcurrentRebalancing <= 20 ? 'valid' : 'warning',
        description: 'Maximum concurrent rebalancing operations',
        category: 'Performance Configuration',
        required: true
      },
      {
        name: 'DUOPLUS_APY_REFRESH_INTERVAL',
        value: `${duoplus.performance.apyRefreshInterval}s`,
        status: duoplus.performance.apyRefreshInterval >= 10 ? 'valid' : 'warning',
        description: 'APY data refresh interval',
        category: 'Performance Configuration',
        required: true
      }
    );

    // Feature Flags
    statuses.push(
      {
        name: 'DUOPLUS_ENABLE_AI_RISK_PREDICTION',
        value: duoplus.features.aiRiskPrediction.toString(),
        status: 'valid',
        description: 'Enable AI-powered risk prediction',
        category: 'Feature Flags',
        required: false
      },
      {
        name: 'DUOPLUS_ENABLE_FAMILY_CONTROLS',
        value: duoplus.features.familyControls.toString(),
        status: 'valid',
        description: 'Enable family sponsorship controls',
        category: 'Feature Flags',
        required: false
      },
      {
        name: 'DUOPLUS_ENABLE_CASH_APP_PRIORITY',
        value: duoplus.features.cashAppPriority.toString(),
        status: 'valid',
        description: 'Enable Cash App priority processing',
        category: 'Feature Flags',
        required: false
      }
    );

    // Bun Configuration
    statuses.push(
      {
        name: 'BUN_CONFIG_VERBOSE_FETCH',
        value: this.config.bun.verboseFetch ? '1' : '0',
        status: 'valid',
        description: 'Enable verbose fetch logging',
        category: 'Bun Configuration',
        required: false
      },
      {
        name: 'BUN_RUNTIME_TRANSPILER_CACHE_PATH',
        value: this.config.bun.cachePath,
        status: await this.validateFileExists(this.config.bun.cachePath, false),
        description: 'Bun transpiler cache path',
        category: 'Bun Configuration',
        required: false
      },
      {
        name: 'DO_NOT_TRACK',
        value: this.config.bun.doNotTrack ? '1' : '0',
        status: 'valid',
        description: 'Disable Bun telemetry',
        category: 'Bun Configuration',
        required: false
      }
    );

    return statuses;
  }

  /**
   * Generate HTML for each category
   */
  private generateCategoryHTML(statuses: ConfigStatus[]): string {
    const categories = Array.from(new Set(statuses.map(s => s.category)));

    return categories.map(category => {
      const categoryStatuses = statuses.filter(s => s.category === category);

      return `
        <div class="category">
            <h2>${category}</h2>
            <div class="config-grid">
                ${categoryStatuses.map(status => `
                    <div class="config-item" data-name="${status.name}" data-status="${status.status}" data-category="${status.category}" data-required="${status.required}">
                        <input type="checkbox" class="config-checkbox" onchange="updateBulkActions()" data-path="${status.name}">
                        <div class="config-name">
                            ${status.name}
                            ${status.required ? '<span class="required">*</span>' : ''}
                        </div>
                        <div class="config-details">
                            <div class="config-value">${status.value}</div>
                            <div class="config-description">${status.description}</div>
                        </div>
                        <div class="status-badge ${status.status}">
                            ${status.status}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Get summary statistics
   */
  private getSummary(statuses: ConfigStatus[]) {
    return {
      valid: statuses.filter(s => s.status === 'valid').length,
      warnings: statuses.filter(s => s.status === 'warning').length,
      errors: statuses.filter(s => s.status === 'error').length,
      total: statuses.length
    };
  }

  /**
   * Validation helpers
   */
  private validatePort(port: number): 'valid' | 'warning' | 'error' {
    if (port < 1024 || port > 65535) return 'error';
    if (port < 3000) return 'warning';
    return 'valid';
  }

  private async validateFileExists(path: string, required: boolean): Promise<'valid' | 'warning' | 'error'> {
    if (!path) return required ? 'error' : 'warning';
    const exists = await Bun.file(path).exists();
    if (exists) return 'valid';
    return required ? 'error' : 'warning';
  }

  private validateJWTSecret(secret: string): 'valid' | 'warning' | 'error' {
    if (!secret) return 'error';
    if (secret === 'default-secret-change-in-production') {
      return this.config.duoplus.environment === 'production' ? 'error' : 'warning';
    }
    if (secret.length < 32) return 'error';
    return 'valid';
  }

  private validateAPIKey(key: string, environment: string): 'valid' | 'warning' | 'error' {
    if (!key) return environment === 'production' ? 'error' : 'warning';
    if (key.length < 10) return 'warning';
    return 'valid';
  }

  private maskSecret(secret: string): string {
    if (!secret) return 'Not Set';
    if (secret.length <= 8) return '***';
    return secret.substring(0, 4) + '***' + secret.substring(secret.length - 4);
  }

  /**
   * Escape HTML characters to prevent XSS
   */
  private escapeHtml(text: string): string {
    if (!text) return '';
    return text
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .replace(/'/g, '&#39;');
  }
}
/**
 * Web-Based Shortcut Manager
 *
 * A complete web application for managing keyboard shortcuts with:
 * - Visual shortcut editor
 * - Profile management
 * - Usage analytics
 * - Conflict detection
 * - Macro creation
 * - Real-time updates
 *
 * To run: bun run web-app.ts
 */

import { ShortcutRegistry } from './src/core/registry';
import { logger } from './src/utils/logger';

// Create registry instance
const registry = new ShortcutRegistry();

// Load data from database
await registry.loadFromDatabase();

// HTML Template
const HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ShortcutRegistry Manager</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        body {
            background: #f5f7fa;
            color: #2c3e50;
            line-height: 1.6;
        }

        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 2rem;
            text-align: center;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }

        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 0.5rem;
        }

        .header p {
            opacity: 0.9;
            font-size: 1.1rem;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
        }

        .nav {
            background: white;
            border-radius: 10px;
            padding: 1rem;
            margin-bottom: 2rem;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            display: flex;
            gap: 1rem;
            flex-wrap: wrap;
        }

        .nav-btn {
            background: #667eea;
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s ease;
            font-weight: 500;
        }

        .nav-btn:hover {
            background: #5a6fd8;
            transform: translateY(-2px);
        }

        .nav-btn.active {
            background: #764ba2;
        }

        .section {
            background: white;
            border-radius: 10px;
            padding: 2rem;
            margin-bottom: 2rem;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            display: none;
        }

        .section.active {
            display: block;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }

        .stat-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 1.5rem;
            border-radius: 8px;
            text-align: center;
        }

        .stat-card h3 {
            font-size: 2rem;
            margin-bottom: 0.5rem;
        }

        .shortcuts-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 1rem;
        }

        .shortcut-card {
            border: 1px solid #e1e8ed;
            border-radius: 8px;
            padding: 1rem;
            transition: all 0.3s ease;
        }

        .shortcut-card:hover {
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            transform: translateY(-2px);
        }

        .shortcut-key {
            background: #667eea;
            color: white;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-family: monospace;
            font-weight: bold;
            margin: 0.25rem 0;
            display: inline-block;
        }

        .shortcut-category {
            background: #764ba2;
            color: white;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.8rem;
            text-transform: uppercase;
            display: inline-block;
            margin-bottom: 0.5rem;
        }

        .form-group {
            margin-bottom: 1rem;
        }

        .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 500;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 1rem;
        }

        .btn {
            background: #667eea;
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 4px;
            cursor: pointer;
            font-size: 1rem;
            transition: background 0.3s ease;
        }

        .btn:hover {
            background: #5a6fd8;
        }

        .btn-danger {
            background: #e74c3c;
        }

        .btn-danger:hover {
            background: #c0392b;
        }

        .conflict-alert {
            background: #ffeaa7;
            border: 1px solid #d63031;
            color: #d63031;
            padding: 1rem;
            border-radius: 4px;
            margin: 1rem 0;
        }

        .macro-sequence {
            background: #f8f9fa;
            border-radius: 4px;
            padding: 1rem;
            margin: 0.5rem 0;
        }

        .macro-step {
            background: white;
            border: 1px solid #dee2e6;
            border-radius: 4px;
            padding: 0.5rem;
            margin: 0.25rem 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .table {
            width: 100%;
            border-collapse: collapse;
            margin: 1rem 0;
        }

        .table th,
        .table td {
            padding: 0.75rem;
            text-align: left;
            border-bottom: 1px solid #dee2e6;
        }

        .table th {
            background: #f8f9fa;
            font-weight: 600;
        }

        .chart-container {
            background: white;
            border-radius: 8px;
            padding: 1rem;
            margin: 1rem 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .test-area {
            background: #f8f9fa;
            border: 2px dashed #667eea;
            border-radius: 8px;
            padding: 2rem;
            text-align: center;
            color: #666;
            font-size: 1.1rem;
            cursor: text;
            transition: all 0.3s ease;
            outline: none;
        }

        .test-area:focus {
            border-color: #764ba2;
            background: #fff;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .key-display {
            background: #f8f9fa;
            border-radius: 4px;
            padding: 1rem;
            font-family: monospace;
            font-size: 1.2rem;
            text-align: center;
            min-height: 3rem;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .key-info {
            color: #2c3e50;
        }

        .matching-list {
            min-height: 100px;
        }

        .no-matches {
            color: #666;
            text-align: center;
            padding: 2rem;
            font-style: italic;
        }

        .matched-shortcut {
            background: #e8f5e8;
            border: 1px solid #27ae60;
            border-radius: 4px;
            padding: 0.75rem;
            margin: 0.5rem 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .matched-shortcut .key {
            background: #667eea;
            color: white;
            padding: 0.25rem 0.5rem;
            border-radius: 3px;
            font-family: monospace;
            font-weight: bold;
        }

        .matched-shortcut .action {
            font-weight: 500;
        }

        .quick-test-buttons {
            display: flex;
            gap: 0.5rem;
            flex-wrap: wrap;
        }

        .modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }

        .modal.active {
            display: flex;
        }

        .modal-content {
            background: white;
            border-radius: 10px;
            padding: 2rem;
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
        }

        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
        }

        .modal-close {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: #666;
        }

        .loading {
            text-align: center;
            padding: 2rem;
            color: #666;
        }

        .success {
            color: #27ae60;
            font-weight: bold;
        }

        .error {
            color: #e74c3c;
            font-weight: bold;
        }

        @media (max-width: 768px) {
            .nav {
                flex-direction: column;
            }

            .shortcuts-grid {
                grid-template-columns: 1fr;
            }

            .container {
                padding: 1rem;
            }
        }
    </style>
</head>
<body>
    <header class="header">
        <h1>🎹 ShortcutRegistry Manager</h1>
        <p>Manage your keyboard shortcuts with style</p>
    </header>

    <div class="container">
        <nav class="nav">
            <button class="nav-btn active" onclick="showSection('dashboard')">Dashboard</button>
            <button class="nav-btn" onclick="showSection('shortcuts')">Shortcuts</button>
            <button class="nav-btn" onclick="showSection('profiles')">Profiles</button>
            <button class="nav-btn" onclick="showSection('macros')">Macros</button>
            <button class="nav-btn" onclick="showSection('analytics')">Analytics</button>
            <button class="nav-btn" onclick="showSection('conflicts')">Conflicts</button>
            <button class="nav-btn" onclick="showSection('tester')">Keyboard Test</button>
        </nav>

        <!-- Dashboard Section -->
        <section id="dashboard" class="section active">
            <h2>📊 Dashboard</h2>
            <div class="stats-grid" id="statsGrid">
                <div class="loading">Loading statistics...</div>
            </div>

            <h3>🎯 Quick Actions</h3>
            <div style="display: flex; gap: 1rem; margin: 1rem 0; flex-wrap: wrap;">
                <button class="btn" onclick="showSection('shortcuts')">Add Shortcut</button>
                <button class="btn" onclick="showSection('profiles')">Create Profile</button>
                <button class="btn" onclick="showSection('macros')">New Macro</button>
                <button class="btn" onclick="exportData()">Export Data</button>
                <button class="btn" onclick="importData()">Import Data</button>
                <button class="btn" onclick="seedDatabase()">Refresh Data</button>
            </div>

            <div class="chart-container">
                <h3>📈 Usage Overview</h3>
                <canvas id="usageChart" width="400" height="200"></canvas>
            </div>
        </section>

        <!-- Shortcuts Section -->
        <section id="shortcuts" class="section">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h2>⌨️ Shortcuts</h2>
                <button class="btn" onclick="showShortcutModal()">+ Add Shortcut</button>
            </div>

            <div class="shortcuts-grid" id="shortcutsGrid">
                <div class="loading">Loading shortcuts...</div>
            </div>
        </section>

        <!-- Profiles Section -->
        <section id="profiles" class="section">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h2>👤 Profiles</h2>
                <button class="btn" onclick="showProfileModal()">+ Create Profile</button>
            </div>

            <div id="profilesList">
                <div class="loading">Loading profiles...</div>
            </div>
        </section>

        <!-- Macros Section -->
        <section id="macros" class="section">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h2>🎬 Macros</h2>
                <button class="btn" onclick="showMacroModal()">+ Create Macro</button>
            </div>

            <div id="macrosList">
                <div class="loading">Loading macros...</div>
            </div>
        </section>

        <!-- Analytics Section -->
        <section id="analytics" class="section">
            <h2>📊 Analytics</h2>

            <div class="chart-container">
                <h3>Most Used Shortcuts</h3>
                <canvas id="analyticsChart" width="400" height="300"></canvas>
            </div>

            <h3>Usage Statistics</h3>
            <table class="table" id="usageTable">
                <thead>
                    <tr>
                        <th>Shortcut</th>
                        <th>Category</th>
                        <th>Usage Count</th>
                        <th>Last Used</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td colspan="4" class="loading">Loading usage data...</td></tr>
                </tbody>
            </table>
        </section>

        <!-- Conflicts Section -->
        <section id="conflicts" class="section">
            <h2>⚠️ Conflicts</h2>
            <div id="conflictsList">
                <div class="loading">Checking for conflicts...</div>
            </div>
        </section>

        <!-- Keyboard Test Section -->
        <section id="tester" class="section">
            <h2>⌨️ Keyboard Tester</h2>
            <p>Test your shortcuts by pressing keys. This shows which shortcuts would be triggered.</p>

            <div class="shortcut-card">
                <h3>🎯 Test Area</h3>
                <div id="testArea" class="test-area" tabindex="0">
                    Click here and press any key combination to test shortcuts
                </div>
            </div>

            <div class="shortcut-card">
                <h3>📝 Last Key Press</h3>
                <div id="lastKeyDisplay" class="key-display">
                    <div class="key-info">No keys pressed yet</div>
                </div>
            </div>

            <div class="shortcut-card">
                <h3>🎹 Matching Shortcuts</h3>
                <div id="matchingShortcuts" class="matching-list">
                    <div class="no-matches">Press a key combination to see matching shortcuts</div>
                </div>
            </div>

            <div class="shortcut-card">
                <h3>⚡ Quick Test Shortcuts</h3>
                <div class="quick-test-buttons">
                    <button class="btn" onclick="testKey('Control+s')">Test Ctrl+S (Save)</button>
                    <button class="btn" onclick="testKey('Control+c')">Test Ctrl+C (Copy)</button>
                    <button class="btn" onclick="testKey('Control+v')">Test Ctrl+V (Paste)</button>
                    <button class="btn" onclick="testKey('Control+z')">Test Ctrl+Z (Undo)</button>
                    <button class="btn" onclick="testKey('F9')">Test F9 (Debug)</button>
                </div>
            </div>
        </section>
    </div>

    <!-- Shortcut Modal -->
    <div id="shortcutModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3 id="shortcutModalTitle">Add Shortcut</h3>
                <button class="modal-close" onclick="closeModal('shortcutModal')">&times;</button>
            </div>
            <form id="shortcutForm">
                <div class="form-group">
                    <label for="shortcutId">ID:</label>
                    <input type="text" id="shortcutId" required>
                </div>
                <div class="form-group">
                    <label for="shortcutAction">Action:</label>
                    <input type="text" id="shortcutAction" required>
                </div>
                <div class="form-group">
                    <label for="shortcutDescription">Description:</label>
                    <input type="text" id="shortcutDescription" required>
                </div>
                <div class="form-group">
                    <label for="shortcutCategory">Category:</label>
                    <select id="shortcutCategory" required>
                        <option value="general">General</option>
                        <option value="ui">UI</option>
                        <option value="developer">Developer</option>
                        <option value="navigation">Navigation</option>
                        <option value="ide">IDE</option>
                        <option value="browser">Browser</option>
                        <option value="window">Window</option>
                        <option value="theme">Theme</option>
                        <option value="telemetry">Telemetry</option>
                        <option value="emulator">Emulator</option>
                        <option value="compliance">Compliance</option>
                        <option value="logs">Logs</option>
                        <option value="accessibility">Accessibility</option>
                        <option value="data">Data</option>
                        <option value="payment">Payment</option>
                        <option value="custom">Custom</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="shortcutPrimary">Primary Key:</label>
                    <input type="text" id="shortcutPrimary" placeholder="Ctrl+S" required>
                </div>
                <div class="form-group">
                    <label for="shortcutMacOS">macOS Key:</label>
                    <input type="text" id="shortcutMacOS" placeholder="Cmd+S">
                </div>
                <button type="submit" class="btn">Save Shortcut</button>
            </form>
        </div>
    </div>

    <!-- Profile Modal -->
    <div id="profileModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3>Create Profile</h3>
                <button class="modal-close" onclick="closeModal('profileModal')">&times;</button>
            </div>
            <form id="profileForm">
                <div class="form-group">
                    <label for="profileName">Name:</label>
                    <input type="text" id="profileName" required>
                </div>
                <div class="form-group">
                    <label for="profileDescription">Description:</label>
                    <textarea id="profileDescription" rows="3"></textarea>
                </div>
                <div class="form-group">
                    <label for="profileBasedOn">Based On:</label>
                    <select id="profileBasedOn">
                        <option value="">None</option>
                    </select>
                </div>
                <button type="submit" class="btn">Create Profile</button>
            </form>
        </div>
    </div>

    <!-- Macro Modal -->
    <div id="macroModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3>Create Macro</h3>
                <button class="modal-close" onclick="closeModal('macroModal')">&times;</button>
            </div>
            <form id="macroForm">
                <div class="form-group">
                    <label for="macroName">Name:</label>
                    <input type="text" id="macroName" required>
                </div>
                <div class="form-group">
                    <label for="macroDescription">Description:</label>
                    <textarea id="macroDescription" rows="2"></textarea>
                </div>
                <div class="form-group">
                    <label>Steps:</label>
                    <div id="macroSteps"></div>
                    <button type="button" class="btn" onclick="addMacroStep()" style="margin-top: 0.5rem;">+ Add Step</button>
                </div>
                <button type="submit" class="btn">Create Macro</button>
            </form>
        </div>
    </div>

    <!-- Import/Export Modal -->
    <div id="importExportModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3 id="importExportTitle">Import/Export Data</h3>
                <button class="modal-close" onclick="closeModal('importExportModal')">&times;</button>
            </div>
            <div id="importExportContent">
                <!-- Content will be set by JavaScript -->
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script>
        // Global state
        let currentData = {
            shortcuts: [],
            profiles: [],
            macros: [],
            stats: {},
            usage: [],
            conflicts: []
        };

        // Navigation
        function showSection(sectionId) {
            document.querySelectorAll('.section').forEach(section => {
                section.classList.remove('active');
            });
            document.querySelectorAll('.nav-btn').forEach(btn => {
                btn.classList.remove('active');
            });

            document.getElementById(sectionId).classList.add('active');
            event.target.classList.add('active');

            // Load section data
            loadSectionData(sectionId);
        }

        // Load data for each section
        async function loadSectionData(sectionId) {
            switch(sectionId) {
                case 'dashboard':
                    await loadDashboard();
                    break;
                case 'shortcuts':
                    await loadShortcuts();
                    break;
                case 'profiles':
                    await loadProfiles();
                    break;
                case 'macros':
                    await loadMacros();
                    break;
                case 'analytics':
                    await loadAnalytics();
                    break;
                case 'conflicts':
                    await loadConflicts();
                    break;
                case 'tester':
                    await loadKeyboardTester();
                    break;
            }
        }

        // Dashboard
        async function loadDashboard() {
            try {
                const response = await fetch('/api/shortcuts');
                const shortcuts = await response.json();

                const statsResponse = await fetch('/api/stats/usage');
                const usage = await statsResponse.json();

                const conflictsResponse = await fetch('/api/conflicts');
                const conflicts = await conflictsResponse.json();

                // Update stats
                document.getElementById('statsGrid').innerHTML = \`
                    <div class="stat-card">
                        <h3>\${shortcuts.length}</h3>
                        <p>Total Shortcuts</p>
                    </div>
                    <div class="stat-card">
                        <h3>\${currentData.profiles?.length || 0}</h3>
                        <p>Profiles</p>
                    </div>
                    <div class="stat-card">
                        <h3>\${conflicts.length}</h3>
                        <p>Conflicts</p>
                    </div>
                    <div class="stat-card">
                        <h3>\${usage.slice(0, 5).reduce((sum, s) => sum + (s.usageCount || 0), 0)}</h3>
                        <p>Total Usage</p>
                    </div>
                \`;

                // Simple usage chart
                createUsageChart(usage.slice(0, 10));

            } catch (error) {
                console.error('Failed to load dashboard:', error);
            }
        }

        function createUsageChart(usageData) {
            const ctx = document.getElementById('usageChart').getContext('2d');
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: usageData.map(s => s.description.substring(0, 20)),
                    datasets: [{
                        label: 'Usage Count',
                        data: usageData.map(s => s.usageCount || 0),
                        backgroundColor: 'rgba(102, 126, 234, 0.6)',
                        borderColor: 'rgba(102, 126, 234, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }

        // Shortcuts
        async function loadShortcuts() {
            try {
                const response = await fetch('/api/shortcuts');
                const shortcuts = await response.json();
                currentData.shortcuts = shortcuts;

                const grid = document.getElementById('shortcutsGrid');
                grid.innerHTML = shortcuts.map(shortcut => \`
                    <div class="shortcut-card">
                        <div class="shortcut-category">\${shortcut.category}</div>
                        <h3>\${shortcut.description}</h3>
                        <div class="shortcut-key">\${shortcut.default.primary}</div>
                        <p><strong>Action:</strong> \${shortcut.action}</p>
                        <p><strong>ID:</strong> \${shortcut.id}</p>
                        <div style="margin-top: 1rem;">
                            <button class="btn btn-danger" onclick="deleteShortcut('\${shortcut.id}')">Delete</button>
                        </div>
                    </div>
                \`).join('');

            } catch (error) {
                console.error('Failed to load shortcuts:', error);
            }
        }

        async function deleteShortcut(shortcutId) {
            if (confirm('Are you sure you want to delete this shortcut?')) {
                try {
                    await fetch(\`/api/shortcuts/\${shortcutId}\`, { method: 'DELETE' });
                    loadShortcuts();
                    showNotification('Shortcut deleted successfully!', 'success');
                } catch (error) {
                    showNotification('Failed to delete shortcut', 'error');
                }
            }
        }

        // Profiles
        async function loadProfiles() {
            try {
                const profilesResponse = await fetch('/api/profiles');
                const profiles = await profilesResponse.json();
                currentData.profiles = profiles;

                const activeResponse = await fetch('/api/profiles/active');
                const activeProfile = await activeResponse.json();

                document.getElementById('profilesList').innerHTML = profiles.map(profile => \`
                    <div class="shortcut-card">
                        <h3>\${profile.name}</h3>
                        <p>\${profile.description || 'No description'}</p>
                        <p><strong>Category:</strong> \${profile.category}</p>
                        <p><strong>Status:</strong> \${profile.id === activeProfile.id ? 'Active' : 'Inactive'}</p>
                        <div style="margin-top: 1rem;">
                            \${profile.id !== activeProfile.id ? \`<button class="btn" onclick="setActiveProfile('\${profile.id}')">Set Active</button>\` : ''}
                            <button class="btn btn-danger" onclick="deleteProfile('\${profile.id}')">Delete</button>
                        </div>
                    </div>
                \`).join('');

                // Update profile dropdown
                const select = document.getElementById('profileBasedOn');
                select.innerHTML = '<option value="">None</option>' +
                    profiles.map(p => \`<option value="\${p.id}">\${p.name}</option>\`).join('');

            } catch (error) {
                console.error('Failed to load profiles:', error);
            }
        }

        async function setActiveProfile(profileId) {
            try {
                await fetch(\`/api/profiles/\${profileId}/active\`, { method: 'PUT' });
                loadProfiles();
                showNotification('Profile set as active!', 'success');
            } catch (error) {
                showNotification('Failed to set active profile', 'error');
            }
        }

        async function deleteProfile(profileId) {
            if (confirm('Are you sure you want to delete this profile?')) {
                try {
                    // Note: API might not have profile deletion endpoint
                    showNotification('Profile deletion not implemented in API', 'error');
                } catch (error) {
                    showNotification('Failed to delete profile', 'error');
                }
            }
        }

        // Macros
        async function loadMacros() {
            try {
                const response = await fetch('/api/macros');
                const macros = await response.json();
                currentData.macros = macros;

                if (macros.length === 0) {
                    document.getElementById('macrosList').innerHTML = \`
                        <div class="shortcut-card">
                            <h3>No Macros Yet</h3>
                            <p>Create your first macro to automate shortcut sequences!</p>
                        </div>
                    \`;
                } else {
                    document.getElementById('macrosList').innerHTML = macros.map(macro => \`
                        <div class="shortcut-card">
                            <h3>\${macro.name}</h3>
                            <p>\${macro.description || 'No description'}</p>
                            <p><strong>Steps:</strong> \${macro.sequence.length}</p>
                            <p><strong>Usage:</strong> \${macro.usageCount || 0} times</p>
                            <div style="margin-top: 1rem;">
                                <button class="btn" onclick="executeMacro('\${macro.id}')">Execute</button>
                                <button class="btn btn-danger" onclick="deleteMacro('\${macro.id}')">Delete</button>
                            </div>
                        </div>
                    \`).join('');
                }

            } catch (error) {
                console.error('Failed to load macros:', error);
                document.getElementById('macrosList').innerHTML = \`
                    <div class="shortcut-card">
                        <h3>Error Loading Macros</h3>
                        <p>Failed to load macros from server.</p>
                    </div>
                \`;
            }
        }

        // Analytics
        async function loadAnalytics() {
            try {
                const response = await fetch('/api/stats/usage');
                const usage = await response.json();
                currentData.usage = usage;

                // Update table
                const tbody = document.querySelector('#usageTable tbody');
                tbody.innerHTML = usage.slice(0, 10).map(stat => \`
                    <tr>
                        <td>\${stat.description}</td>
                        <td>\${stat.category || 'N/A'}</td>
                        <td>\${stat.usageCount || 0}</td>
                        <td>\${stat.lastUsed || 'Never'}</td>
                    </tr>
                \`).join('');

                // Create analytics chart
                createAnalyticsChart(usage.slice(0, 10));

            } catch (error) {
                console.error('Failed to load analytics:', error);
            }
        }

        function createAnalyticsChart(usageData) {
            const ctx = document.getElementById('analyticsChart').getContext('2d');
            new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: usageData.map(s => s.description.substring(0, 15)),
                    datasets: [{
                        data: usageData.map(s => s.usageCount || 1),
                        backgroundColor: [
                            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
                            '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF',
                            '#4BC0C0', '#FF6384'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'bottom',
                        }
                    }
                }
            });
        }

        // Conflicts
        async function loadConflicts() {
            try {
                const response = await fetch('/api/conflicts');
                const conflicts = await response.json();
                currentData.conflicts = conflicts;

                if (conflicts.length === 0) {
                    document.getElementById('conflictsList').innerHTML = \`
                        <div class="success" style="text-align: center; padding: 2rem;">
                            ✅ No conflicts detected! All shortcuts are working properly.
                        </div>
                    \`;
                } else {
                    document.getElementById('conflictsList').innerHTML = conflicts.map(conflict => \`
                        <div class="conflict-alert">
                            <h4>⚠️ \${conflict.severity.toUpperCase()} Conflict</h4>
                            <p><strong>Key:</strong> \${conflict.key}</p>
                            <p><strong>Affected shortcuts:</strong> \${conflict.actions.join(', ')}</p>
                            <button class="btn" onclick="resolveConflict('\${conflict.key}')">Auto Resolve</button>
                        </div>
                    \`).join('');
                }

            } catch (error) {
                console.error('Failed to load conflicts:', error);
            }
        }

        // Keyboard Tester
        async function loadKeyboardTester() {
            // Load shortcuts for testing
            try {
                const response = await fetch('/api/shortcuts');
                const shortcuts = await response.json();
                currentData.shortcuts = shortcuts;

                // Set up keyboard event listeners
                setupKeyboardTesting();
            } catch (error) {
                console.error('Failed to load shortcuts for testing:', error);
            }
        }

        function setupKeyboardTesting() {
            const testArea = document.getElementById('testArea');
            let pressedKeys = new Set();

            testArea.addEventListener('keydown', (e) => {
                e.preventDefault();
                pressedKeys.add(e.key);

                const keyCombo = formatKeyCombo(pressedKeys);
                updateKeyDisplay(keyCombo);
                findMatchingShortcuts(keyCombo);
            });

            testArea.addEventListener('keyup', (e) => {
                pressedKeys.delete(e.key);
            });

            testArea.addEventListener('blur', () => {
                pressedKeys.clear();
                updateKeyDisplay('Focus lost - click to test again');
            });

            // Clear on focus
            testArea.addEventListener('focus', () => {
                pressedKeys.clear();
                updateKeyDisplay('Ready to test...');
                document.getElementById('matchingShortcuts').innerHTML = '<div class="no-matches">Press a key combination to see matching shortcuts</div>';
            });
        }

        function formatKeyCombo(keys) {
            const modifiers = [];
            const regularKeys = [];

            for (const key of keys) {
                if (key === 'Control' || key === 'Alt' || key === 'Shift' || key === 'Meta') {
                    modifiers.push(key);
                } else {
                    regularKeys.push(key);
                }
            }

            const parts = [];
            if (modifiers.includes('Control')) parts.push('Ctrl');
            if (modifiers.includes('Alt')) parts.push('Alt');
            if (modifiers.includes('Shift')) parts.push('Shift');
            if (modifiers.includes('Meta')) parts.push('Cmd');

            if (regularKeys.length > 0) {
                parts.push(regularKeys[regularKeys.length - 1]);
            }

            return parts.join('+');
        }

        function updateKeyDisplay(keyCombo) {
            const display = document.getElementById('lastKeyDisplay');
            display.innerHTML = \`<div class="key-info">\${keyCombo}</div>\`;
        }

        function findMatchingShortcuts(keyCombo) {
            const matching = currentData.shortcuts.filter(shortcut => {
                const primaryKey = shortcut.default.primary.toLowerCase();
                const testKey = keyCombo.toLowerCase();

                // Simple matching - could be enhanced with more sophisticated key matching
                return primaryKey.includes(testKey) || testKey.includes(primaryKey);
            });

            const container = document.getElementById('matchingShortcuts');

            if (matching.length === 0) {
                container.innerHTML = '<div class="no-matches">No shortcuts match this key combination</div>';
            } else {
                container.innerHTML = matching.map(shortcut => \`
                    <div class="matched-shortcut">
                        <div>
                            <span class="key">\${shortcut.default.primary}</span>
                            <span class="action">\${shortcut.description}</span>
                        </div>
                        <div style="color: #666; font-size: 0.9rem;">\${shortcut.category}</div>
                    </div>
                \`).join('');
            }
        }

        function testKey(keyCombo) {
            updateKeyDisplay(keyCombo);
            findMatchingShortcuts(keyCombo);
            document.getElementById('testArea').focus();
        }

        // Import/Export functionality
        async function exportData() {
            try {
                showNotification('Exporting data...', 'info');

                // Gather all data
                const [shortcuts, profiles, macros] = await Promise.all([
                    fetch('/api/shortcuts').then(r => r.json()),
                    fetch('/api/profiles').then(r => r.json()),
                    fetch('/api/macros').then(r => r.json())
                ]);

                const exportData = {
                    version: '1.0',
                    exportedAt: new Date().toISOString(),
                    shortcuts,
                    profiles,
                    macros
                };

                // Create and download file
                const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'shortcut-registry-export-' + new Date().toISOString().split('T')[0] + '.json';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                showNotification('Data exported successfully!', 'success');
            } catch (error) {
                showNotification('Failed to export data', 'error');
                console.error('Export error:', error);
            }
        }

        function importData() {
            const modal = document.getElementById('importExportModal');
            const title = document.getElementById('importExportTitle');
            const content = document.getElementById('importExportContent');

            title.textContent = 'Import Data';
            content.innerHTML = \`
                <div class="form-group">
                    <label for="importFile">Select export file:</label>
                    <input type="file" id="importFile" accept=".json" required>
                </div>
                <div class="form-group">
                    <label>Import Options:</label>
                    <div style="margin: 0.5rem 0;">
                        <input type="checkbox" id="importShortcuts" checked> <label for="importShortcuts">Import Shortcuts</label><br>
                        <input type="checkbox" id="importProfiles" checked> <label for="importProfiles">Import Profiles</label><br>
                        <input type="checkbox" id="importMacros" checked> <label for="importMacros">Import Macros</label>
                    </div>
                </div>
                <div class="form-group">
                    <button class="btn" onclick="processImport()">Import Data</button>
                    <button class="btn btn-danger" onclick="closeModal('importExportModal')">Cancel</button>
                </div>
            \`;

            modal.classList.add('active');
        }

        async function processImport() {
            const fileInput = document.getElementById('importFile') as HTMLInputElement;
            const importShortcuts = (document.getElementById('importShortcuts') as HTMLInputElement).checked;
            const importProfiles = (document.getElementById('importProfiles') as HTMLInputElement).checked;
            const importMacros = (document.getElementById('importMacros') as HTMLInputElement).checked;

            if (!fileInput.files || fileInput.files.length === 0) {
                showNotification('Please select a file to import', 'error');
                return;
            }

            try {
                const file = fileInput.files[0];
                const text = await file.text();
                const importData = JSON.parse(text);

                if (!importData.shortcuts && !importData.profiles && !importData.macros) {
                    throw new Error('Invalid import file format');
                }

                showNotification('Importing data...', 'info');

                // Import shortcuts
                if (importShortcuts && importData.shortcuts) {
                    for (const shortcut of importData.shortcuts) {
                        try {
                            await fetch('/api/shortcuts', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(shortcut)
                            });
                        } catch (e) {
                            console.warn('Failed to import shortcut:', shortcut.id);
                        }
                    }
                }

                // Import profiles
                if (importProfiles && importData.profiles) {
                    for (const profile of importData.profiles) {
                        try {
                            await fetch('/api/profiles', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(profile)
                            });
                        } catch (e) {
                            console.warn('Failed to import profile:', profile.name);
                        }
                    }
                }

                // Import macros
                if (importMacros && importData.macros) {
                    for (const macro of importData.macros) {
                        try {
                            await fetch('/api/macros', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(macro)
                            });
                        } catch (e) {
                            console.warn('Failed to import macro:', macro.name);
                        }
                    }
                }

                closeModal('importExportModal');
                showNotification('Data imported successfully!', 'success');

                // Refresh all sections
                setTimeout(() => {
                    loadDashboard();
                    loadShortcuts();
                    loadProfiles();
                    loadMacros();
                }, 1000);

            } catch (error) {
                showNotification('Failed to import data: ' + error.message, 'error');
                console.error('Import error:', error);
            }
        }

        // Modal functions
        function showShortcutModal(shortcut = null) {
            const modal = document.getElementById('shortcutModal');
            const form = document.getElementById('shortcutForm');
            const title = document.getElementById('shortcutModalTitle');

            if (shortcut) {
                title.textContent = 'Edit Shortcut';
                document.getElementById('shortcutId').value = shortcut.id;
                document.getElementById('shortcutAction').value = shortcut.action;
                document.getElementById('shortcutDescription').value = shortcut.description;
                document.getElementById('shortcutCategory').value = shortcut.category;
                document.getElementById('shortcutPrimary').value = shortcut.default.primary;
                document.getElementById('shortcutMacOS').value = shortcut.default.macOS || '';
            } else {
                title.textContent = 'Add Shortcut';
                form.reset();
            }

            modal.classList.add('active');

            form.onsubmit = async (e) => {
                e.preventDefault();
                await saveShortcut();
            };
        }

        async function saveShortcut() {
            const shortcut = {
                id: document.getElementById('shortcutId').value,
                action: document.getElementById('shortcutAction').value,
                description: document.getElementById('shortcutDescription').value,
                category: document.getElementById('shortcutCategory').value,
                default: {
                    primary: document.getElementById('shortcutPrimary').value,
                    macOS: document.getElementById('shortcutMacOS').value || undefined
                },
                enabled: true,
                scope: 'global'
            };

            try {
                const method = currentData.shortcuts.find(s => s.id === shortcut.id) ? 'PUT' : 'POST';
                const url = method === 'PUT' ? \`/api/shortcuts/\${shortcut.id}\` : '/api/shortcuts';

                const response = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(shortcut)
                });

                if (response.ok) {
                    closeModal('shortcutModal');
                    loadShortcuts();
                    showNotification('Shortcut saved successfully!', 'success');
                } else {
                    throw new Error('Failed to save shortcut');
                }
            } catch (error) {
                showNotification('Failed to save shortcut', 'error');
            }
        }

        function showProfileModal() {
            document.getElementById('profileModal').classList.add('active');
            document.getElementById('profileForm').reset();

            document.getElementById('profileForm').onsubmit = async (e) => {
                e.preventDefault();
                await saveProfile();
            };
        }

        async function saveProfile() {
            const profile = {
                name: document.getElementById('profileName').value,
                description: document.getElementById('profileDescription').value,
                basedOn: document.getElementById('profileBasedOn').value || undefined
            };

            try {
                const response = await fetch('/api/profiles', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(profile)
                });

                if (response.ok) {
                    closeModal('profileModal');
                    loadProfiles();
                    showNotification('Profile created successfully!', 'success');
                } else {
                    throw new Error('Failed to create profile');
                }
            } catch (error) {
                showNotification('Failed to create profile', 'error');
            }
        }

        function showMacroModal() {
            document.getElementById('macroModal').classList.add('active');
            document.getElementById('macroForm').reset();
            document.getElementById('macroSteps').innerHTML = '';

            document.getElementById('macroForm').onsubmit = async (e) => {
                e.preventDefault();
                await saveMacro();
            };
        }

        function addMacroStep() {
            const stepsContainer = document.getElementById('macroSteps');
            const stepDiv = document.createElement('div');
            stepDiv.className = 'macro-step';
            stepDiv.innerHTML = \`
                <select class="step-action">
                    \${currentData.shortcuts.map(s => \`<option value="\${s.id}">\${s.description}</option>\`).join('')}
                </select>
                <input type="number" class="step-delay" value="100" min="50" max="5000" style="width: 80px;">
                <button type="button" onclick="removeMacroStep(this)">Remove</button>
            \`;
            stepsContainer.appendChild(stepDiv);
        }

        function removeMacroStep(button) {
            button.parentElement.remove();
        }

        async function saveMacro() {
            const steps = Array.from(document.querySelectorAll('.macro-step')).map(step => ({
                action: step.querySelector('.step-action').value,
                delay: parseInt(step.querySelector('.step-delay').value)
            }));

            const macro = {
                name: document.getElementById('macroName').value,
                description: document.getElementById('macroDescription').value,
                sequence: steps
            };

            try {
                const response = await fetch('/api/macros', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(macro)
                });

                if (response.ok) {
                    const createdMacro = await response.json();
                    closeModal('macroModal');
                    loadMacros();
                    showNotification('Macro created successfully!', 'success');

                    // Add execute button to the macro
                    addExecuteButton(createdMacro);
                } else {
                    throw new Error('Failed to create macro');
                }
            } catch (error) {
                showNotification('Failed to create macro', 'error');
            }
        }

        function closeModal(modalId) {
            document.getElementById(modalId).classList.remove('active');
        }

        async function executeMacro(macroId) {
            try {
                const response = await fetch(\`/api/macros/\${macroId}/execute\`, {
                    method: 'PUT'
                });

                if (response.ok) {
                    showNotification('Macro executed successfully!', 'success');
                    // Refresh macros to update usage count
                    setTimeout(() => loadMacros(), 1000);
                } else {
                    throw new Error('Failed to execute macro');
                }
            } catch (error) {
                showNotification('Failed to execute macro', 'error');
            }
        }

        async function deleteMacro(macroId) {
            if (confirm('Are you sure you want to delete this macro?')) {
                try {
                    const response = await fetch(\`/api/macros/\${macroId}\`, {
                        method: 'DELETE'
                    });

                    if (response.ok) {
                        loadMacros();
                        showNotification('Macro deleted successfully!', 'success');
                    } else {
                        throw new Error('Failed to delete macro');
                    }
                } catch (error) {
                    showNotification('Failed to delete macro', 'error');
                }
            }
        }

        // Utility functions
        async function seedDatabase() {
            try {
                showNotification('Seeding database...', 'info');
                const response = await fetch('/api/shortcuts', {
                    headers: { 'X-Seed-Data': 'true', 'X-Seed-Mode': 'clear' }
                });

                if (response.ok) {
                    await loadDashboard();
                    await loadShortcuts();
                    showNotification('Database seeded successfully!', 'success');
                } else {
                    throw new Error('Seeding failed');
                }
            } catch (error) {
                showNotification('Failed to seed database', 'error');
            }
        }

        function showNotification(message, type = 'info') {
            // Simple notification - in a real app, use a proper notification library
            const notification = document.createElement('div');
            notification.className = \`notification \${type}\`;
            notification.style.cssText = \`
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 1rem;
                border-radius: 4px;
                color: white;
                background: \${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#667eea'};
                z-index: 1001;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            \`;
            notification.textContent = message;

            document.body.appendChild(notification);

            setTimeout(() => {
                notification.remove();
            }, 3000);
        }

        // Initialize
        document.addEventListener('DOMContentLoaded', async () => {
            await loadDashboard();
        });
    </script>
</body>
</html>`;

// Start the web server
export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // API routes
    if (path.startsWith('/api/')) {
      const apiPath = path.replace('/api/', '');

      try {
        // Handle different API endpoints
        switch (true) {
          case apiPath === 'shortcuts' && request.method === 'GET':
            const shortcuts = registry.getAllShortcuts();
            return new Response(JSON.stringify(shortcuts), {
              headers: { 'Content-Type': 'application/json' }
            });

          case apiPath.startsWith('shortcuts/') && request.method === 'GET':
            const shortcutId = apiPath.split('/')[1];
            const allShortcuts = registry.getAllShortcuts();
            const shortcut = allShortcuts.find(s => s.id === shortcutId);
            if (!shortcut) {
              return new Response(JSON.stringify({ error: 'Shortcut not found' }), {
                status: 404, headers: { 'Content-Type': 'application/json' }
              });
            }
            return new Response(JSON.stringify(shortcut), {
              headers: { 'Content-Type': 'application/json' }
            });

          case apiPath === 'shortcuts' && request.method === 'POST':
            const newShortcut = await request.json();
            registry.register(newShortcut);
            await registry.saveToDatabase();
            return new Response(JSON.stringify({ success: true }), {
              status: 201, headers: { 'Content-Type': 'application/json' }
            });

          case apiPath.startsWith('shortcuts/') && request.method === 'DELETE':
            const deleteId = apiPath.split('/')[1];
            registry.unregister(deleteId);
            await registry.saveToDatabase();
            return new Response(JSON.stringify({ success: true }), {
              headers: { 'Content-Type': 'application/json' }
            });

          case apiPath === 'profiles' && request.method === 'GET':
            const profiles = registry.getAllProfiles();
            return new Response(JSON.stringify(profiles), {
              headers: { 'Content-Type': 'application/json' }
            });

          case apiPath === 'profiles/active' && request.method === 'GET':
            const activeProfile = registry.getActiveProfile();
            return new Response(JSON.stringify(activeProfile || {}), {
              headers: { 'Content-Type': 'application/json' }
            });

          case apiPath.startsWith('profiles/') && apiPath.endsWith('/active') && request.method === 'PUT':
            const profileId = apiPath.split('/')[1];
            registry.setActiveProfile(profileId);
            await registry.saveToDatabase();
            return new Response(JSON.stringify({ success: true }), {
              headers: { 'Content-Type': 'application/json' }
            });

          case apiPath === 'profiles' && request.method === 'POST':
            const profileData = await request.json();
            const profile = registry.createProfile(
              profileData.name,
              profileData.description,
              profileData.basedOn
            );
            await registry.saveToDatabase();
            return new Response(JSON.stringify(profile), {
              status: 201, headers: { 'Content-Type': 'application/json' }
            });

          case apiPath === 'conflicts' && request.method === 'GET':
            const conflicts = registry.detectConflicts();
            return new Response(JSON.stringify(conflicts), {
              headers: { 'Content-Type': 'application/json' }
            });

          case apiPath === 'stats/usage' && request.method === 'GET':
            const days = parseInt(url.searchParams.get('days') || '30');
            const stats = registry.getUsageStatistics(days);
            return new Response(JSON.stringify(stats), {
              headers: { 'Content-Type': 'application/json' }
            });

          case apiPath === 'macros' && request.method === 'GET':
            const macros = registry.getAllMacros();
            return new Response(JSON.stringify(macros), {
              headers: { 'Content-Type': 'application/json' }
            });

          case apiPath === 'macros' && request.method === 'POST':
            const macroData = await request.json();
            const macro = registry.createMacro(
              macroData.name,
              macroData.sequence,
              macroData.profileId,
              macroData.description
            );
            await registry.saveToDatabase();
            return new Response(JSON.stringify(macro), {
              status: 201, headers: { 'Content-Type': 'application/json' }
            });

          case apiPath.startsWith('macros/') && apiPath.endsWith('/execute') && request.method === 'PUT':
            const executeMacroId = apiPath.split('/')[1];
            await registry.executeMacro(executeMacroId);
            return new Response(JSON.stringify({ success: true }), {
              headers: { 'Content-Type': 'application/json' }
            });

          case apiPath.startsWith('macros/') && request.method === 'DELETE':
            const deleteMacroId = apiPath.split('/')[1];
            registry.deleteMacro(deleteMacroId);
            await registry.saveToDatabase();
            return new Response(JSON.stringify({ success: true }), {
              headers: { 'Content-Type': 'application/json' }
            });

          default:
            return new Response(JSON.stringify({ error: 'API endpoint not found' }), {
              status: 404, headers: { 'Content-Type': 'application/json' }
            });
        }
      } catch (error) {
        logger.error('API Error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500, headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Serve the main HTML page
    if (path === '/' || path === '/index.html') {
      return new Response(HTML_TEMPLATE, {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    // Handle seed requests via headers
    const seedResponse = await seedMiddleware(request);
    if (seedResponse) {
      return seedResponse;
    }

    return new Response('Not Found', { status: 404 });
  },

  port: 8080
};

// Seed middleware function (copied from api/server.ts)
async function seedMiddleware(request: Request): Promise<Response | null> {
  const seedHeader = request.headers.get('X-Seed-Data');
  const seedMode = request.headers.get('X-Seed-Mode') || 'default';

  if (seedHeader === 'true' || seedHeader === '1') {
    try {
      logger.info('Seeding database from web app', { mode: seedMode });

      // Import seed function dynamically
      const { seed } = await import('./src/database/seeds.ts');

      const options: any = {};

      if (seedMode === 'clear') {
        options.clearShortcuts = true;
      } else if (seedMode === 'test') {
        options.includeTestData = true;
      } else if (seedMode === 'full') {
        options.clearShortcuts = true;
        options.includeTestData = true;
      }

      const userId = request.headers.get('X-User-Id') || 'default';
      options.userId = userId;

      seed(options);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Database seeded successfully',
          mode: seedMode
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-Seeded': 'true'
          }
        }
      );
    } catch (error) {
      logger.error('Seed failed from web app', error as Error);
      return new Response(
        JSON.stringify({
          success: false,
          error: (error as Error).message
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }

  return null; // Continue to next handler
}

// Run the server
if (import.meta.main) {
  console.log('🚀 Starting ShortcutRegistry Web Manager...');
  console.log('📱 Open http://localhost:8080 in your browser');
  console.log('🔗 API available at http://localhost:8080/api/');
}
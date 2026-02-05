<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fire22 Water Dashboard v4 - Enhanced</title>
    <link rel="stylesheet" href="/dist/output.css">
    <script src="https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js" defer></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns/dist/chartjs-adapter-date-fns.bundle.min.js"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        /* Deep Blue Color Scheme */
        :root {
            --primary-blue: #003d7a;
            --secondary-blue: #0056b3;
            --light-blue: #007bff;
            --dark-blue: #001f3f;
            --ocean-blue: #006994;
            --sky-blue: #87ceeb;
            --water-light: #b3e5fc;
            --bubble-color: rgba(255, 255, 255, 0.3);
            --success-color: #10b981;
            --warning-color: #f59e0b;
            --error-color: #ef4444;
            --text-primary: #e2e8f0;
            --text-secondary: #94a3b8;
        }

        /* Dark/Light Theme Variables */
        :root[data-theme="dark"] {
            --bg-primary: #0f172a;
            --bg-secondary: #1e293b;
            --bg-tertiary: #334155;
            --text-primary: #f1f5f9;
            --text-secondary: #cbd5e1;
        }

        :root[data-theme="light"] {
            --bg-primary: #f8fafc;
            --bg-secondary: #f1f5f9;
            --bg-tertiary: #e2e8f0;
            --text-primary: #0f172a;
            --text-secondary: #475569;
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            margin: 0;
            background: linear-gradient(135deg, var(--dark-blue) 0%, var(--primary-blue) 50%, var(--ocean-blue) 100%);
            color: var(--text-primary);
            min-height: 100vh;
            position: relative;
            overflow-x: hidden;
            transition: all 0.3s ease;
        }

        /* Theme-aware backgrounds */
        body[data-theme="dark"] {
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
        }

        body[data-theme="light"] {
            background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 50%, #7dd3fc 100%);
            color: var(--text-primary);
        }

        /* Water Effects - Animated Bubbles */
        .bubble {
            position: absolute;
            background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.8), var(--bubble-color));
            border-radius: 50%;
            opacity: 0.6;
            animation: float-up 8s infinite ease-in-out;
            pointer-events: none;
        }

        @keyframes float-up {
            0% {
                transform: translateY(100vh) scale(0);
                opacity: 0;
            }
            10% {
                opacity: 0.6;
                transform: translateY(90vh) scale(1);
            }
            90% {
                opacity: 0.6;
                transform: translateY(-10vh) scale(1);
            }
            100% {
                transform: translateY(-20vh) scale(0);
                opacity: 0;
            }
        }

        /* Water Gradient Effect at Bottom */
        .water-gradient {
            position: fixed;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 200px;
            background: linear-gradient(0deg, var(--ocean-blue) 0%, var(--primary-blue) 50%, transparent 100%);
            pointer-events: none;
            z-index: 1;
        }

        /* Flowing Blue Gradients for Borders */
        .water-border {
            border: 2px solid transparent;
            background: linear-gradient(var(--primary-blue), var(--secondary-blue)) padding-box,
                        linear-gradient(45deg, var(--light-blue), var(--sky-blue)) border-box;
            border-radius: 15px;
            position: relative;
        }

        .water-border::before {
            content: '';
            position: absolute;
            top: -2px;
            left: -2px;
            right: -2px;
            bottom: -2px;
            background: linear-gradient(45deg, var(--light-blue), var(--sky-blue), var(--light-blue));
            border-radius: 15px;
            z-index: -1;
            animation: flow-border 3s linear infinite;
        }

        @keyframes flow-border {
            0% { background-position: 0% 50%; }
            100% { background-position: 100% 50%; }
        }

        /* Smooth Box-Drawing Characters */
        .box-container {
            position: relative;
            background: rgba(0, 61, 122, 0.2);
            border: 2px solid var(--primary-blue);
            border-radius: 15px;
            padding: 20px;
            margin: 20px 0;
        }

        .box-header {
            display: flex;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid var(--primary-blue);
        }

        .box-title {
            font-size: 1.5rem;
            font-weight: 600;
            color: var(--sky-blue);
            text-shadow: 0 0 10px rgba(135, 206, 235, 0.5);
        }

        /* Subtle Text Shadows for Glowing Effect */
        .glow-text {
            text-shadow: 0 0 10px rgba(135, 206, 235, 0.5);
        }

        /* Enhanced Header with Water Theme */
        .header {
            background: linear-gradient(135deg, var(--primary-blue) 0%, var(--secondary-blue) 50%, var(--ocean-blue) 100%);
            padding: 1.5rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 4px 20px rgba(0, 61, 122, 0.3);
            border-bottom: 3px solid var(--light-blue);
            position: relative;
            z-index: 10;
        }

        .kpi-card {
            background: linear-gradient(135deg, rgba(0, 61, 122, 0.3) 0%, rgba(0, 86, 179, 0.3) 100%);
            backdrop-filter: blur(10px);
            padding: 1.5rem;
            border-radius: 15px;
            text-align: center;
            border: 1px solid var(--primary-blue);
            box-shadow: 0 10px 30px rgba(0, 61, 122, 0.2);
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }

        .kpi-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(135, 206, 235, 0.1), transparent);
            transition: left 0.5s ease;
        }

        .kpi-card:hover::before {
            left: 100%;
        }

        .kpi-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 40px rgba(0, 61, 122, 0.3);
            border-color: var(--light-blue);
        }

        .kpi-value {
            font-size: 2.5rem;
            font-weight: 800;
            background: linear-gradient(135deg, var(--sky-blue), var(--light-blue));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            text-shadow: 0 0 20px rgba(135, 206, 235, 0.3);
        }

        .kpi-label {
            font-size: 0.9rem;
            color: var(--sky-blue);
            font-weight: 500;
            margin-top: 0.5rem;
            text-shadow: 0 0 5px rgba(135, 206, 235, 0.3);
        }

        /* Enhanced Tab Navigation */
        .tab-button {
            padding: 0.75rem 1.5rem;
            border-radius: 0.75rem;
            cursor: pointer;
            transition: all 0.3s ease;
            font-weight: 500;
            border: 1px solid transparent;
            background: rgba(0, 61, 122, 0.3);
            color: var(--sky-blue);
            position: relative;
            overflow: hidden;
        }

        .tab-button::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(135, 206, 235, 0.1), transparent);
            transition: left 0.3s ease;
        }

        .tab-button:hover::before {
            left: 100%;
        }

        .tab-button:hover {
            background: rgba(0, 86, 179, 0.4);
            border-color: var(--light-blue);
            transform: translateY(-2px);
        }

        .tab-button.active {
            background: linear-gradient(135deg, var(--primary-blue), var(--secondary-blue));
            color: white;
            box-shadow: 0 4px 15px rgba(0, 119, 190, 0.4);
            border-color: var(--light-blue);
        }

        /* Enhanced Table Styles */
        .table-container {
            background: rgba(0, 61, 122, 0.2);
            border-radius: 15px;
            border: 1px solid var(--primary-blue);
            box-shadow: 0 10px 30px rgba(0, 61, 122, 0.2);
            overflow: hidden;
        }

        .table-header {
            background: linear-gradient(135deg, var(--primary-blue), var(--secondary-blue));
            border-bottom: 2px solid var(--light-blue);
        }

        .table-row:hover {
            background: rgba(0, 86, 179, 0.3);
            transform: scale(1.01);
            transition: all 0.2s ease;
        }

        /* Enhanced Input Styles */
        .input-field {
            background: rgba(0, 61, 122, 0.3);
            border: 1px solid var(--primary-blue);
            border-radius: 0.75rem;
            padding: 0.75rem 1rem;
            color: var(--sky-blue);
            transition: all 0.3s ease;
        }

        .input-field:focus {
            outline: none;
            border-color: var(--light-blue);
            box-shadow: 0 0 20px rgba(135, 206, 235, 0.3);
            background: rgba(0, 61, 122, 0.4);
        }

        .input-field::placeholder {
            color: rgba(135, 206, 235, 0.5);
        }

        /* Enhanced Button Styles */
        .btn-primary {
            background: linear-gradient(135deg, var(--primary-blue), var(--secondary-blue));
            color: white;
            border: none;
            border-radius: 0.75rem;
            padding: 0.75rem 1.5rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }

        .btn-primary::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
            transition: left 0.3s ease;
        }

        .btn-primary:hover::before {
            left: 100%;
        }

        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 25px rgba(0, 119, 190, 0.4);
        }

        .btn-secondary {
            background: rgba(0, 61, 122, 0.4);
            color: var(--sky-blue);
            border: 1px solid var(--primary-blue);
            border-radius: 0.75rem;
            padding: 0.75rem 1.5rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .btn-secondary:hover {
            background: rgba(0, 86, 179, 0.5);
            border-color: var(--light-blue);
            transform: translateY(-1px);
        }

        /* Status Badges */
        .status-badge {
            padding: 0.5rem 1rem;
            border-radius: 0.75rem;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .status-active {
            background: linear-gradient(135deg, var(--success-color), #059669);
            color: white;
            box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.3);
        }

        .status-restricted {
            background: linear-gradient(135deg, var(--warning-color), #d97706);
            color: white;
            box-shadow: 0 4px 6px -1px rgba(245, 158, 11, 0.3);
        }

        .status-inactive {
            background: linear-gradient(135deg, var(--error-color), #dc2626);
            color: white;
            box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.3);
        }

        /* Command Interface Styles */
        .command-interface {
            background: rgba(0, 30, 60, 0.85);
            border-radius: 10px;
            padding: 25px;
            box-shadow: 0 0 35px rgba(0, 120, 215, 0.4);
            border: 1px solid var(--primary-blue);
            position: relative;
            overflow: hidden;
            margin: 20px 0;
        }

        .command-interface::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 5px;
            background: linear-gradient(90deg, var(--light-blue), var(--primary-blue), var(--light-blue));
            z-index: 2;
        }

        .command-box {
            margin-bottom: 20px;
            position: relative;
        }

        .box {
            padding: 18px;
            background: rgba(0, 40, 80, 0.7);
            border-radius: 6px;
            margin-bottom: 8px;
            border: 1px solid var(--primary-blue);
            box-shadow: 0 3px 10px rgba(0, 0, 0, 0.3);
        }

        .command-text {
            color: var(--sky-blue);
            font-weight: bold;
            margin-bottom: 5px;
            text-shadow: 0 0 5px rgba(135, 206, 235, 0.4);
        }

        .description {
            color: var(--sky-blue);
            font-size: 14px;
            margin-top: 8px;
        }

        .connector {
            text-align: center;
            color: var(--sky-blue);
            margin: 5px 0;
            text-shadow: 0 0 5px rgba(135, 206, 235, 0.4);
        }

        .input-area {
            display: flex;
            margin-top: 25px;
            align-items: center;
            position: relative;
        }

        /* Command Suggestions */
        .suggestions-container {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: rgba(0, 30, 60, 0.95);
            border: 1px solid var(--primary-blue);
            border-radius: 8px;
            margin-top: 5px;
            max-height: 200px;
            overflow-y: auto;
            z-index: 100;
            box-shadow: 0 5px 15px rgba(0, 61, 122, 0.4);
        }

        .suggestion-item {
            padding: 10px 15px;
            color: var(--sky-blue);
            cursor: pointer;
            transition: all 0.2s ease;
            border-bottom: 1px solid rgba(0, 61, 122, 0.3);
        }

        .suggestion-item:last-child {
            border-bottom: none;
        }

        .suggestion-item:hover {
            background: rgba(0, 86, 179, 0.4);
            padding-left: 20px;
        }

        .suggestion-depth {
            font-size: 0.75rem;
            color: rgba(135, 206, 235, 0.6);
            margin-left: 8px;
        }

        .suggestion-highlight {
            color: var(--light-blue);
            font-weight: bold;
        }

        .prompt {
            color: var(--sky-blue);
            margin-right: 10px;
            font-weight: bold;
            text-shadow: 0 0 5px rgba(135, 206, 235, 0.4);
        }

        .output {
            margin-top: 25px;
            min-height: 150px;
            padding: 20px;
            background: rgba(0, 40, 80, 0.7);
            border-radius: 6px;
            white-space: pre-wrap;
            font-family: 'Courier New', monospace;
            line-height: 1.5;
            overflow-y: auto;
            max-height: 300px;
            border: 1px solid var(--primary-blue);
            box-shadow: inset 0 0 15px rgba(0, 0, 0, 0.3);
        }

        .success {
            color: var(--success-color);
        }

        .error {
            color: var(--error-color);
        }

        .info {
            color: var(--sky-blue);
        }

        .warning {
            color: var(--warning-color);
        }

        /* Notification System */
        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 1000;
            transform: translateX(400px);
            transition: transform 0.3s ease;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .notification.show {
            transform: translateX(0);
        }

        .notification.success {
            background: linear-gradient(135deg, var(--success-color), #059669);
        }

        .notification.error {
            background: linear-gradient(135deg, var(--error-color), #dc2626);
        }

        .notification.warning {
            background: linear-gradient(135deg, var(--warning-color), #d97706);
        }

        .notification.info {
            background: linear-gradient(135deg, var(--light-blue), var(--primary-blue));
        }

        /* Theme Toggle */
        .theme-toggle {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000;
        }

        .theme-toggle button {
            background: rgba(0, 61, 122, 0.3);
            border: 1px solid var(--primary-blue);
            color: var(--sky-blue);
            padding: 10px;
            border-radius: 50%;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .theme-toggle button:hover {
            background: rgba(0, 86, 179, 0.5);
            transform: scale(1.1);
        }

        /* Responsive Design */
        @media (max-width: 768px) {
            .header {
                flex-direction: column;
                gap: 20px;
            }

            .kpi-card {
                margin-bottom: 15px;
            }

            .tab-button {
                padding: 0.5rem 1rem;
                font-size: 0.9rem;
            }

            .input-area {
                flex-direction: column;
                align-items: stretch;
            }

            .prompt {
                margin-bottom: 10px;
                text-align: center;
            }
        }

        /* Enhanced Animations */
        @keyframes pulse-glow {
            0%, 100% {
                box-shadow: 0 0 20px rgba(135, 206, 235, 0.3);
            }
            50% {
                box-shadow: 0 0 30px rgba(135, 206, 235, 0.6);
            }
        }

        .pulse-glow {
            animation: pulse-glow 2s ease-in-out infinite;
        }

        /* Water Ripple Effect */
        .ripple {
            position: absolute;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(135, 206, 235, 0.3), transparent);
            transform: scale(0);
            animation: ripple-animation 2s ease-out;
            pointer-events: none;
        }

        @keyframes ripple-animation {
            to {
                transform: scale(4);
                opacity: 0;
            }
        }

        /* Depth-based glow effects */
        .surface { box-shadow: 0 0 15px rgba(77, 166, 255, 0.3); }
        .mid-water { box-shadow: 0 0 15px rgba(0, 119, 190, 0.4); }
        .deep-water { box-shadow: 0 0 15px rgba(0, 92, 153, 0.5); }
        .abyssal { box-shadow: 0 0 15px rgba(0, 61, 122, 0.6); }

        /* Animated depth transition */
        @keyframes descend {
            from { filter: brightness(1.2); }
            to { filter: brightness(0.8); }
        }

        .depth-transition {
            animation: descend 0.5s ease-in-out;
        }

        /* Loading Spinner */
        .loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid rgba(135, 206, 235, 0.3);
            border-radius: 50%;
            border-top-color: var(--sky-blue);
            animation: spin 1s ease-in-out infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        /* Chart Container */
        .chart-container {
            position: relative;
            height: 300px;
            margin: 20px 0;
        }

        /* Keyboard Shortcuts Help */
        .shortcuts-help {
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: rgba(0, 30, 60, 0.9);
            border: 1px solid var(--primary-blue);
            border-radius: 8px;
            padding: 15px;
            font-size: 12px;
            color: var(--sky-blue);
            z-index: 100;
        }

        .shortcuts-help h4 {
            margin: 0 0 10px 0;
            color: var(--light-blue);
        }

        .shortcuts-help div {
            margin: 5px 0;
        }

        .key {
            background: rgba(0, 61, 122, 0.5);
            padding: 2px 6px;
            border-radius: 4px;
            font-family: monospace;
            margin-right: 5px;
        }
    </style>

</head>
<body x-data="waterDashboard()" :data-theme="theme">
    <!-- Theme Toggle -->
    <div class="theme-toggle">
        <button @click="toggleTheme()" :title="theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'">
            <i :class="theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon'"></i>
        </button>
    </div>

    <!-- Animated Bubbles -->
    <div class="bubble" style="width: 20px; height: 20px; left: 10%; animation-duration: 15s; animation-delay: 0s;"></div>
    <div class="bubble" style="width: 15px; height: 15px; left: 30%; animation-duration: 12s; animation-delay: 2s;"></div>
    <div class="bubble" style="width: 25px; height: 25px; left: 60%; animation-duration: 18s; animation-delay: 4s;"></div>
    <div class="bubble" style="width: 10px; height: 10px; left: 80%; animation-duration: 10s; animation-delay: 1s;"></div>

    <!-- Water Gradient Effect -->
    <div class="water-gradient"></div>

    <!-- Notification Container -->
    <div x-show="notification.show"
         x-transition:enter="transition ease-out duration-300"
         x-transition:enter-start="transform translate-x-full opacity-0"
         x-transition:enter-end="transform translate-x-0 opacity-100"
         x-transition:leave="transition ease-in duration-200"
         x-transition:leave-start="transform translate-x-0 opacity-100"
         x-transition:leave-end="transform translate-x-full opacity-0"
         class="notification"
         :class="notification.type"
         x-text="notification.message">
    </div>

    <header class="header">
        <div class="flex items-center justify-between w-full">
            <!-- Enhanced Brand Section -->
            <div class="flex items-center space-x-4">
                <div class="brand-logo">
                    <div class="logo-icon text-4xl glow-text">🌊</div>
                    <div class="logo-text">
                        <h1 class="company-name glow-text">Fire22 Water</h1>
                        <span class="company-tagline">Deep Ocean Management System</span>
                    </div>
                </div>
            </div>

            <!-- Navigation Links -->
            <nav class="hidden md:flex items-center space-x-6">
                <a href="#" class="nav-link glow-text">📊 Dashboard</a>
                <a href="#" class="nav-link glow-text">🌊 Analytics</a>
                <a href="#" class="nav-link glow-text">⚙️ Settings</a>
                <a href="#" class="nav-link glow-text">🔧 Commands</a>
            </nav>

            <!-- Status Information -->
            <div class="flex items-center space-x-6">
                <div class="text-center">
                    <div class="text-sm text-gray-400">Current Agent</div>
                    <div class="text-lg font-semibold glow-text" x-text="currentAgent || 'All Agents'"></div>
                </div>
                <div class="text-center">
                    <div class="text-sm text-gray-400">Last Updated</div>
                    <div class="text-lg font-semibold glow-text" x-text="lastUpdated"></div>
                </div>
                <div class="text-center">
                    <div class="text-sm text-gray-400">Connection</div>
                    <div class="text-lg font-semibold" :class="connectionStatus === 'connected' ? 'text-green-400' : 'text-yellow-400'" x-text="connectionStatus"></div>
                </div>
            </div>
        </div>
    </header>

    <main class="p-8 max-w-7xl mx-auto relative z-10">
        <!-- Enhanced Tab Navigation -->
        <nav class="mb-8 flex space-x-3 border-b border-blue-700 pb-2">
            <button @click="activeTab = 'overview'" :class="{'tab-button active': activeTab === 'overview', 'tab-button': activeTab !== 'overview'}">
                <i class="fas fa-chart-line mr-2"></i>Overview
            </button>
            <button @click="activeTab = 'command-interface'" :class="{'tab-button active': activeTab === 'command-interface', 'tab-button': activeTab !== 'command-interface'}">
                <i class="fas fa-terminal mr-2"></i>Command Interface
            </button>
            <button @click="activeTab = 'analytics'" :class="{'tab-button active': activeTab === 'analytics', 'tab-button': activeTab !== 'analytics'}">
                <i class="fas fa-water mr-2"></i>Water Analytics
            </button>
            <button @click="activeTab = 'system-info'" :class="{'tab-button active': activeTab === 'system-info', 'tab-button': activeTab !== 'system-info'}">
                <i class="fas fa-info-circle mr-2"></i>System Info
            </button>
            <button @click="activeTab = 'alerts'" :class="{'tab-button active': activeTab === 'alerts', 'tab-button': activeTab !== 'alerts'}">
                <i class="fas fa-bell mr-2"></i>Alerts
            </button>
        </nav>

        <!-- Overview Tab Content -->
        <div x-show="activeTab === 'overview'" class="space-y-8">
            <section class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div class="kpi-card pulse-glow surface">
                  <div class="kpi-value" x-text="formatNumber(overviewData.totalAgents || 0)"></div>
                  <div class="kpi-label">Total Agents</div>
                </div>
                <div class="kpi-card mid-water">
                  <div class="kpi-value" x-text="formatNumber(overviewData.activeAgents || 0)"></div>
                  <div class="kpi-label">Active Agents</div>
                </div>
                <div class="kpi-card deep-water">
                  <div class="kpi-value" x-text="formatNumber(overviewData.totalPendingWagers || 0)"></div>
                  <div class="kpi-label">Pending Wagers</div>
                </div>
                <div class="kpi-card abyssal">
                  <div class="kpi-value" x-text="'$' + formatNumber(overviewData.totalPendingAmount || 0)"></div>
                  <div class="kpi-label">Pending Amount</div>
                </div>
            </section>

            <!-- Real-time Status Indicators -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="box-container">
                    <h3 class="box-title">System Health</h3>
                    <div class="p-4">
                        <div class="flex items-center justify-between mb-2">
                            <span>CPU Usage</span>
                            <span class="text-sm" :class="overviewData.cpuUsage > 80 ? 'text-red-400' : 'text-green-400'" x-text="overviewData.cpuUsage + '%'"></span>
                        </div>
                        <div class="w-full bg-gray-700 rounded-full h-2">
                            <div class="bg-blue-500 h-2 rounded-full transition-all duration-300" :style="'width: ' + overviewData.cpuUsage + '%'"></div>
                        </div>
                    </div>
                </div>
                <div class="box-container">
                    <h3 class="box-title">Memory Usage</h3>
                    <div class="p-4">
                        <div class="flex items-center justify-between mb-2">
                            <span>RAM</span>
                            <span class="text-sm" :class="overviewData.memoryUsage > 80 ? 'text-red-400' : 'text-green-400'" x-text="overviewData.memoryUsage + '%'"></span>
                        </div>
                        <div class="w-full bg-gray-700 rounded-full h-2">
                            <div class="bg-green-500 h-2 rounded-full transition-all duration-300" :style="'width: ' + overviewData.memoryUsage + '%'"></div>
                        </div>
                    </div>
                </div>
                <div class="box-container">
                    <h3 class="box-title">Network Status</h3>
                    <div class="p-4">
                        <div class="flex items-center justify-between mb-2">
                            <span>Latency</span>
                            <span class="text-sm" :class="overviewData.networkLatency > 100 ? 'text-yellow-400' : 'text-green-400'" x-text="overviewData.networkLatency + 'ms'"></span>
                        </div>
                        <div class="w-full bg-gray-700 rounded-full h-2">
                            <div class="bg-purple-500 h-2 rounded-full transition-all duration-300" :style="'width: ' + Math.min(overviewData.networkLatency, 100) + '%'"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Command Interface Tab Content -->
        <div x-show="activeTab === 'command-interface'" class="space-y-8">
            <div class="command-interface">
                <div class="command-box">
                    <div class="box">
                        <div class="command-text">╭─────────────────── SYSTEM INFO ───────────────────╮</div>
                        <div class="description">Display system information and status</div>
                    </div>
                    <div class="connector">│</div>
                    <div class="box">
                        <div class="command-text">├─────────────────── NETWORK ──────────────────────┤</div>
                        <div class="description">Show network configuration and connections</div>
                    </div>
                    <div class="connector">│</div>
                    <div class="box">
                        <div class="command-text">├─────────────────── PROCESSES ────────────────────┤</div>
                        <div class="description">List running processes and resource usage</div>
                    </div>
                    <div class="connector">│</div>
                    <div class="box">
                        <div class="command-text">├─────────────────── UTILITIES ────────────────────┤</div>
                        <div class="description">Various system utilities and tools</div>
                    </div>
                    <div class="connector">│</div>
                    <div class="box">
                        <div class="command-text">╰─────────────────── ADVANCED ─────────────────────╯</div>
                        <div class="description">Advanced system diagnostics and settings</div>
                    </div>
                </div>

                <div class="input-area">
                    <span class="prompt">╭─[user@water-system]</span>
                    <input type="text" x-model="currentCommand" @input="updateSuggestions()" @keydown.enter="executeCommand()" @keydown.up="navigateHistory(-1)" @keydown.down="navigateHistory(1)" @keydown.tab="selectSuggestion($event)" @blur="hideSuggestions()" placeholder="Type your command here..." class="input-field flex-grow">
                    <button @click="executeCommand()" class="execute-btn btn-primary">
                        <span x-show="!executingCommand">Execute</span>
                        <span x-show="executingCommand" class="loading"></span>
                    </button>

                    <!-- Command Suggestions Dropdown -->
                    <div x-show="showSuggestions" @click.away="hideSuggestions()" class="suggestions-container">
                        <template x-for="suggestion in suggestions" :key="suggestion.name">
                            <div class="suggestion-item" @click="selectSuggestion(suggestion)">
                                <span x-text="suggestion.name"></span>
                                <span class="suggestion-depth" x-text="'[' + suggestion.category + ']'"></span>
                            </div>
                        </template>
                    </div>
                </div>

                <div class="output" x-text="commandOutput">
                    <div>╭─────────────────────────────────────────────────────╮</div>
                    <div>│  Welcome to the Enhanced Water Command Interface!   │</div>
                    <div>│  Type a command or select from the options above.   │</div>
                    <div>│  Use ↑ and ↓ arrow keys to navigate history.        │</div>
                    <div>│  Press Ctrl+K for keyboard shortcuts.              │</div>
                    <div>╰─────────────────────────────────────────────────────╯</div>
                </div>
            </div>
        </div>

        <!-- Water Analytics Tab Content -->
        <div x-show="activeTab === 'analytics'" class="space-y-8">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div class="table-container water-border mid-water">
                    <h3 class="text-xl font-bold mb-4 px-6 pt-4 glow-text">Water Flow Analysis</h3>
                    <div class="p-6">
                        <div class="chart-container">
                            <canvas id="waterFlowChart"></canvas>
                        </div>
                    </div>
                </div>

                <div class="table-container water-border deep-water">
                    <h3 class="text-xl font-bold mb-4 px-6 pt-4 glow-text">Ocean Depth Metrics</h3>
                    <div class="p-6">
                        <div class="chart-container">
                            <canvas id="oceanDepthChart"></canvas>
                        </div>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div class="table-container water-border surface">
                    <h3 class="text-xl font-bold mb-4 px-6 pt-4 glow-text">Temperature Trends</h3>
                    <div class="p-6">
                        <div class="chart-container">
                            <canvas id="temperatureChart"></canvas>
                        </div>
                    </div>
                </div>

                <div class="table-container water-border mid-water">
                    <h3 class="text-xl font-bold mb-4 px-6 pt-4 glow-text">Pressure Analysis</h3>
                    <div class="p-6">
                        <div class="chart-container">
                            <canvas id="pressureChart"></canvas>
                        </div>
                    </div>
                </div>

                <div class="table-container water-border deep-water">
                    <h3 class="text-xl font-bold mb-4 px-6 pt-4 glow-text">Quality Metrics</h3>
                    <div class="p-6">
                        <div class="chart-container">
                            <canvas id="qualityChart"></canvas>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- System Info Tab Content -->
        <div x-show="activeTab === 'system-info'" class="space-y-8">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="kpi-card surface">
                    <div class="kpi-label">System Temperature</div>
                    <div class="kpi-value" x-text="getRandomValue(18, 24) + '°C'"></div>
                </div>
                <div class="kpi-card mid-water">
                    <div class="kpi-label">Water Pressure</div>
                    <div class="kpi-value" x-text="getRandomValue(100, 150) + ' PSI'"></div>
                </div>
                <div class="kpi-card deep-water">
                    <div class="kpi-label">Flow Rate</div>
                    <div class="kpi-value" x-text="getRandomValue(50, 100) + ' L/min'"></div>
                </div>
            </div>

            <div class="table-container water-border abyssal">
                <h3 class="text-xl font-bold mb-4 px-6 pt-4 glow-text">System Diagnostics</h3>
                <div class="p-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="box">
                            <div class="command-text">╭─ CPU Status ──────────────────────────────────────╮</div>
                            <div class="info" x-text="'Usage: ' + getRandomValue(20, 60) + '%'"></div>
                        </div>
                        <div class="box">
                            <div class="command-text">╭─ Memory Status ───────────────────────────────────╮</div>
                            <div class="info" x-text="'Usage: ' + getRandomValue(40, 80) + '%'"></div>
                        </div>
                        <div class="box">
                            <div class="command-text">╭─ Network Status ──────────────────────────────────╮</div>
                            <div class="info" x-text="'Latency: ' + getRandomValue(10, 50) + 'ms'"></div>
                        </div>
                        <div class="box">
                            <div class="command-text">╭─ Storage Status ──────────────────────────────────╮</div>
                            <div class="info" x-text="'Available: ' + getRandomValue(200, 500) + 'GB'"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Alerts Tab Content -->
        <div x-show="activeTab === 'alerts'" class="space-y-8">
            <div class="table-container water-border">
                <h3 class="text-xl font-bold mb-4 px-6 pt-4 glow-text">System Alerts</h3>
                <div class="p-6">
                    <div class="space-y-4">
                        <template x-for="alert in alerts" :key="alert.id">
                            <div class="box" :class="'border-l-4 ' + getAlertBorderColor(alert.type)">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <div class="font-semibold" x-text="alert.title"></div>
                                        <div class="text-sm text-gray-400" x-text="alert.message"></div>
                                        <div class="text-xs text-gray-500 mt-1" x-text="alert.timestamp"></div>
                                    </div>
                                    <div class="status-badge" :class="'status-' + alert.type.toLowerCase()" x-text="alert.type"></div>
                                </div>
                            </div>
                        </template>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <!-- Keyboard Shortcuts Help -->
    <div class="shortcuts-help" x-show="showShortcuts" @click.away="showShortcuts = false">
        <h4>Keyboard Shortcuts</h4>
        <div><span class="key">Ctrl</span><span class="key">K</span> Show shortcuts</div>
        <div><span class="key">Ctrl</span><span class="key">L</span> Clear terminal</div>
        <div><span class="key">Ctrl</span><span class="key">R</span> Refresh data</div>
        <div><span class="key">Ctrl</span><span class="key">S</span> Save settings</div>
        <div><span class="key">Tab</span> Autocomplete</div>
        <div><span class="key">↑</span><span class="key">↓</span> Navigate history</div>
    </div>

    <script>
        function waterDashboard() {
            return {
                activeTab: 'overview',
                theme: localStorage.getItem('theme') || 'dark',
                currentAgent: 'Water System',
                lastUpdated: 'Loading...',
                connectionStatus: 'connecting',
                executingCommand: false,
                showShortcuts: false,
                alerts: [
                    { id: 1, title: 'High CPU Usage', message: 'CPU usage exceeded 80%', type: 'warning', timestamp: '2 minutes ago' },
                    { id: 2, title: 'System Update', message: 'New version available', type: 'info', timestamp: '1 hour ago' },
                    { id: 3, title: 'Connection Lost', message: 'Backup system activated', type: 'error', timestamp: '3 hours ago' }
                ],
                overviewData: {
                    totalAgents: 0,
                    activeAgents: 0,
                    totalPendingWagers: 0,
                    totalPendingAmount: 0,
                    cpuUsage: 0,
                    memoryUsage: 0,
                    networkLatency: 0
                },
                currentCommand: '',
                commandHistory: [],
                historyIndex: -1,
                commandOutput: '',
                showSuggestions: false,
                suggestions: [],
                notification: {
                    show: false,
                    message: '',
                    type: 'info'
                },

                // Theme Management
                toggleTheme() {
                    this.theme = this.theme === 'dark' ? 'light' : 'dark';
                    localStorage.setItem('theme', this.theme);
                    document.body.setAttribute('data-theme', this.theme);
                    this.showNotification('Theme changed to ' + this.theme, 'info');
                },

                // Notification System
                showNotification(message, type = 'info') {
                    this.notification = { show: true, message, type };
                    setTimeout(() => {
                        this.notification.show = false;
                    }, 3000);
                },

                // Alert Management
                getAlertBorderColor(type) {
                    const colors = {
                        'error': 'border-red-500',
                        'warning': 'border-yellow-500',
                        'info': 'border-blue-500',
                        'success': 'border-green-500'
                    };
                    return colors[type] || 'border-gray-500';
                },

                // Command Suggestions Methods
                getCommandSuggestions(input) {
                    const commands = [
                        { name: 'system info', description: 'Display system information and status', category: 'system' },
                        { name: 'network', description: 'Show network configuration and connections', category: 'network' },
                        { name: 'processes', description: 'List running processes and resource usage', category: 'processes' },
                        { name: 'utilities', description: 'Various system utilities and tools', category: 'utilities' },
                        { name: 'advanced', description: 'Advanced system diagnostics and settings', category: 'advanced' },
                        { name: 'date', description: 'Show current date', category: 'utilities' },
                        { name: 'time', description: 'Show current time', category: 'utilities' },
                        { name: 'clear', description: 'Clear the terminal', category: 'utilities' },
                        { name: 'help', description: 'Show available commands', category: 'utilities' },
                        { name: 'status', description: 'Show system status', category: 'system' },
                        { name: 'config', description: 'Show configuration settings', category: 'advanced' },
                        { name: 'monitor', description: 'Start monitoring system', category: 'utilities' },
                        { name: 'stop', description: 'Stop monitoring system', category: 'utilities' },
                        { name: 'restart', description: 'Restart services', category: 'utilities' },
                        { name: 'logs', description: 'View system logs', category: 'advanced' },
                        { name: 'backup', description: 'Create system backup', category: 'utilities' },
                        { name: 'restore', description: 'Restore from backup', category: 'utilities' },
                        { name: 'update', description: 'Update system', category: 'utilities' },
                        { name: 'version', description: 'Show system version', category: 'system' },
                        { name: 'alerts', description: 'Show system alerts', category: 'system' },
                        { name: 'settings', description: 'Open settings panel', category: 'advanced' },
                        { name: 'export', description: 'Export data to file', category: 'utilities' },
                        { name: 'import', description: 'Import data from file', category: 'utilities' }
                    ];

                    if (!input.trim()) {
                        return commands.slice(0, 5); // Show first 5 commands if no input
                    }

                    const lowerInput = input.toLowerCase();
                    return commands
                        .filter(cmd => cmd.name.toLowerCase().includes(lowerInput) ||
                                     cmd.description.toLowerCase().includes(lowerInput))
                        .slice(0, 5); // Limit to 5 suggestions
                },

                updateSuggestions() {
                    this.suggestions = this.getCommandSuggestions(this.currentCommand);
                    this.showSuggestions = this.suggestions.length > 0 && this.currentCommand.length > 0;
                },

                selectSuggestion(suggestion) {
                    this.currentCommand = suggestion.name;
                    this.showSuggestions = false;
                    // Focus back on input field
                    this.$nextTick(() => {
                        const input = document.querySelector('input[x-model="currentCommand"]');
                        if (input) {
                            input.focus();
                        }
                    });
                },

                hideSuggestions() {
                    setTimeout(() => {
                        this.showSuggestions = false;
                    }, 200);
                },

                // Depth Gauge Functions
                applyDepthStyling(command) {
                    const commandLower = command.toLowerCase();
                    let depth, color, glow;

                    if (commandLower.includes('system') || commandLower.includes('info') || commandLower.includes('status') || commandLower.includes('version')) {
                        depth = 'Surface';
                        color = '#87ceeb'; // Sky blue
                        glow = '0 0 5px rgba(135, 206, 235, 0.5)';
                    } else if (commandLower.includes('network') || commandLower.includes('date') || commandLower.includes('time')) {
                        depth = 'Mid-Water';
                        color = '#0077be'; // Medium blue
                        glow = '0 0 5px rgba(0, 119, 190, 0.5)';
                    } else if (commandLower.includes('processes') || commandLower.includes('monitor') || commandLower.includes('utilities')) {
                        depth = 'Deep Water';
                        color = '#005c99'; // Deep blue
                        glow = '0 0 5px rgba(0, 92, 153, 0.5)';
                    } else if (commandLower.includes('advanced') || commandLower.includes('config') || commandLower.includes('logs') || commandLower.includes('backup') || commandLower.includes('restore') || commandLower.includes('update') || commandLower.includes('restart') || commandLower.includes('stop')) {
                        depth = 'Abyssal';
                        color = '#003d7a'; // Very deep blue
                        glow = '0 0 5px rgba(0, 61, 122, 0.5)';
                    } else {
                        depth = 'Unknown';
                        color = '#4da6ff'; // Default light blue
                        glow = '0 0 5px rgba(77, 166, 255, 0.5)';
                    }

                    return { depth, color, glow };
                },

                updateDepthGauge(command) {
                    const style = this.applyDepthStyling(command);
                    const gauge = document.createElement('div');
                    gauge.className = 'depth-gauge';
                    gauge.style.cssText = `
                        position: absolute;
                        right: 10px;
                        top: 10px;
                        padding: 5px 10px;
                        background: ${style.color}20;
                        border: 1px solid ${style.color};
                        border-radius: 15px;
                        font-size: 12px;
                        color: ${style.color};
                        text-shadow: ${style.glow};
                        z-index: 50;
                    `;
                    gauge.textContent = `Depth: ${style.depth}`;

                    // Remove existing gauge
                    document.querySelectorAll('.depth-gauge').forEach(el => el.remove());
                    const commandInterface = document.querySelector('.command-interface');
                    if (commandInterface) {
                        commandInterface.appendChild(gauge);
                    }
                },

                init() {
                    console.log('Enhanced Water Dashboard initialized');
                    this.setupKeyboardShortcuts();
                    this.fetchOverviewData();
                    this.initializeCharts();
                    this.startRealTimeUpdates();
                    this.checkConnectionStatus();
                },

                setupKeyboardShortcuts() {
                    document.addEventListener('keydown', (e) => {
                        if (e.ctrlKey && e.key === 'k') {
                            e.preventDefault();
                            this.showShortcuts = !this.showShortcuts;
                        } else if (e.ctrlKey && e.key === 'l') {
                            e.preventDefault();
                            this.commandOutput = '';
                            this.showNotification('Terminal cleared', 'info');
                        } else if (e.ctrlKey && e.key === 'r') {
                            e.preventDefault();
                            this.fetchOverviewData();
                            this.showNotification('Data refreshed', 'success');
                        } else if (e.ctrlKey && e.key === 's') {
                            e.preventDefault();
                            this.saveSettings();
                            this.showNotification('Settings saved', 'success');
                        }
                    });
                },

                saveSettings() {
                    const settings = {
                        theme: this.theme,
                        currentAgent: this.currentAgent,
                        preferences: {
                            autoRefresh: true,
                            notifications: true,
                            chartAnimations: true
                        }
                    };
                    localStorage.setItem('waterDashboardSettings', JSON.stringify(settings));
                },

                async checkConnectionStatus() {
                    // Simulate connection check
                    setTimeout(() => {
                        this.connectionStatus = 'connected';
                        this.showNotification('System connected successfully', 'success');
                    }, 2000);
                },

                async fetchOverviewData() {
                    this.showNotification('Fetching data...', 'info');

                    // Simulate API call
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    this.overviewData = {
                        totalAgents: getRandomValue(50, 100),
                        activeAgents: getRandomValue(40, 90),
                        totalPendingWagers: getRandomValue(100, 500),
                        totalPendingAmount: getRandomValue(10000, 50000),
                        cpuUsage: getRandomValue(20, 80),
                        memoryUsage: getRandomValue(30, 70),
                        networkLatency: getRandomValue(10, 150)
                    };

                    this.lastUpdated = new Date().toLocaleString();
                    this.showNotification('Data updated successfully', 'success');
                },

                formatNumber(num) {
                    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(num);
                },

                // Command Interface Methods
                async executeCommand() {
                    if (!this.currentCommand.trim()) return;

                    this.executingCommand = true;

                    // Update depth gauge before executing command
                    this.updateDepthGauge(this.currentCommand);

                    // Add to command history
                    this.commandHistory.push(this.currentCommand);
                    this.historyIndex = this.commandHistory.length;

                    // Add user command to output
                    this.commandOutput += `\n╭─[user@water-system]$ ${this.currentCommand}`;

                    // Process commands using switch statement
                    let response = '';

                    switch(this.currentCommand.toLowerCase()) {
                        case 'system info':
                        case 'info':
                            response = `\n╭─ SYSTEM INFO ───────────────────────────────────╮
                                       │  OS: Water Management System v4.0 Enhanced      │
                                       │  Time: ${new Date().toLocaleTimeString()}      │
                                       │  Date: ${new Date().toLocaleDateString()}      │
                                       │  Uptime: ${getRandomValue(0, 30)} days        │
                                       │  Memory: ${getRandomValue(3200, 4200)}/8192 MB │
                                       │  CPU: ${getRandomValue(5, 25)}%              │
                                       │  Theme: ${this.theme}                         │
                                       │  Connection: ${this.connectionStatus}        │
                                       ╰─────────────────────────────────────────────────╯`;
                            break;

                        case 'network':
                        case 'net':
                            response = `\n╭─ NETWORK ──────────────────────────────────────╮
                                       │  Interface: eth0                              │
                                       │  IP: ${generateRandomIP()}                     │
                                       │  Gateway: 192.168.1.1                          │
                                       │  DNS: 8.8.8.8, 8.8.4.4                        │
                                       │  Status: ${this.connectionStatus}              │
                                       │  Speed: ${getRandomValue(100, 1000)} Mbps      │
                                       │  Latency: ${this.overviewData.networkLatency}ms │
                                       ╰─────────────────────────────────────────────────╯`;
                            break;

                        case 'processes':
                        case 'ps':
                            response = `\n╭─ PROCESSES ────────────────────────────────────╮
                                       │  1. Water Flow: CPU ${getRandomValue(1, 5)}%, Memory ${getRandomValue(200, 400)}MB │
                                       │  2. Filter System: CPU ${getRandomValue(1, 3)}%, Memory ${getRandomValue(100, 200)}MB │
                                       │  3. Monitoring: CPU ${getRandomValue(3, 8)}%, Memory ${getRandomValue(300, 500)}MB │
                                       │  4. Analytics: CPU ${getRandomValue(0, 2)}%, Memory ${getRandomValue(100, 200)}MB │
                                       │  5. Security: CPU ${getRandomValue(2, 5)}%, Memory ${getRandomValue(200, 300)}MB │
                                       │  6. Theme Engine: CPU ${getRandomValue(0, 1)}%, Memory ${getRandomValue(50, 100)}MB │
                                       ╰─────────────────────────────────────────────────╯`;
                            break;

                        case 'clear':
                            this.commandOutput = '';
                            this.showNotification('Terminal cleared', 'info');
                            this.executingCommand = false;
                            return;

                        case 'help':
                        case '?':
                            response = `\n╭─ AVAILABLE COMMANDS ──────────────────────────╮
                                       │  system info - Show system information        │
                                       │  network    - Show network configuration      │
                                       │  processes  - List running processes          │
                                       │  date       - Show current date               │
                                       │  time       - Show current time               │
                                       │  clear      - Clear the terminal              │
                                       │  help       - Show this help message          │
                                       │  theme      - Toggle theme (dark/light)       │
                                       │  status     - Show system status              │
                                       │  alerts     - Show system alerts              │
                                       │  settings   - Open settings panel              │
                                       │  export     - Export data to file             │
                                       │  import     - Import data from file           │
                                       ╰─────────────────────────────────────────────────╯`;
                            break;

                        case 'date':
                            response = `\n╭─ DATE ────────────────────────────────────────╮
                                       │  Current date: ${new Date().toLocaleDateString()}  │
                                       ╰─────────────────────────────────────────────────────╯`;
                            break;

                        case 'time':
                            response = `\n╭─ TIME ────────────────────────────────────────╮
                                       │  Current time: ${new Date().toLocaleTimeString()}  │
                                       ╰─────────────────────────────────────────────────────╯`;
                            break;

                        case 'theme':
                            response = `\n╭─ THEME SETTINGS ──────────────────────────────╮
                                       │  Current theme: ${this.theme}                  │
                                       │  Available themes: dark, light                 │
                                       │  Use 'theme dark' or 'theme light' to change  │
                                       ╰─────────────────────────────────────────────────────╯`;
                            break;

                        case 'status':
                            response = `\n╭─ SYSTEM STATUS ───────────────────────────────╮
                                       │  Connection: ${this.connectionStatus}          │
                                       │  Agents: ${this.overviewData.totalAgents}     │
                                       │  Active: ${this.overviewData.activeAgents}    │
                                       │  CPU: ${this.overviewData.cpuUsage}%          │
                                       │  Memory: ${this.overviewData.memoryUsage}%    │
                                       │  Last Update: ${this.lastUpdated}             │
                                       ╰─────────────────────────────────────────────────────╯`;
                            break;

                        case 'alerts':
                            response = `\n╭─ SYSTEM ALERTS ───────────────────────────────╮
                                       │  Total Alerts: ${this.alerts.length}          │
                                       │  Warnings: ${this.alerts.filter(a => a.type === 'warning').length} │
                                       │  Errors: ${this.alerts.filter(a => a.type === 'error').length}    │
                                       │  Info: ${this.alerts.filter(a => a.type === 'info').length}      │
                                       ╰─────────────────────────────────────────────────────╯`;
                            break;

                        default:
                            response = `\n╭─ ERROR ───────────────────────────────────────────╮
                                       │  Command not found: ${this.currentCommand.padEnd(25)}      │
                                       │  Type 'help' for available commands.            │
                                       ╰───────────────────────────────────────────────────╯`;
                    }

                    this.commandOutput += response;
                    this.currentCommand = '';
                    this.executingCommand = false;
                    this.scrollToBottom();
                },

                navigateHistory(direction) {
                    if (this.commandHistory.length === 0) return;

                    if (direction === -1 && this.historyIndex > 0) {
                        this.historyIndex--;
                        this.currentCommand = this.commandHistory[this.historyIndex];
                    } else if (direction === 1 && this.historyIndex < this.commandHistory.length - 1) {
                        this.historyIndex++;
                        this.currentCommand = this.commandHistory[this.historyIndex];
                    } else if (direction === 1 && this.historyIndex === this.commandHistory.length - 1) {
                        this.historyIndex = this.commandHistory.length;
                        this.currentCommand = '';
                    }
                },

                scrollToBottom() {
                    setTimeout(() => {
                        const outputElement = document.querySelector('.output');
                        if (outputElement) {
                            outputElement.scrollTop = outputElement.scrollHeight;
                        }
                    }, 0);
                },

                initializeCharts() {
                    this.createWaterFlowChart();
                    this.createOceanDepthChart();
                    this.createTemperatureChart();
                    this.createPressureChart();
                    this.createQualityChart();
                },

                createWaterFlowChart() {
                    const ctx = document.getElementById('waterFlowChart');
                    if (ctx) {
                        new Chart(ctx, {
                            type: 'line',
                            data: {
                                labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
                                datasets: [{
                                    label: 'Water Flow Rate',
                                    data: [65, 59, 80, 81, 56, 85],
                                    borderColor: '#007bff',
                                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                                    tension: 0.4,
                                    fill: true
                                }]
                            },
                            options: {
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: {
                                        labels: { color: '#e2e8f0' }
                                    }
                                },
                                scales: {
                                    y: {
                                        ticks: { color: '#94a3b8' },
                                        grid: { color: '#475569' }
                                    },
                                    x: {
                                        ticks: { color: '#94a3b8' },
                                        grid: { color: '#475569' }
                                    }
                                }
                            }
                        });
                    }
                },

                createOceanDepthChart() {
                    const ctx = document.getElementById('oceanDepthChart');
                    if (ctx) {
                        new Chart(ctx, {
                            type: 'bar',
                            data: {
                                labels: ['Surface', '10m', '20m', '30m', '40m', '50m'],
                                datasets: [{
                                    label: 'Pressure (PSI)',
                                    data: [14.7, 29.4, 44.1, 58.8, 73.5, 88.2],
                                    backgroundColor: [
                                        'rgba(135, 206, 235, 0.8)',
                                        'rgba(0, 119, 190, 0.8)',
                                        'rgba(0, 86, 179, 0.8)',
                                        'rgba(0, 61, 122, 0.8)',
                                        'rgba(0, 35, 80, 0.8)',
                                        'rgba(0, 10, 40, 0.8)'
                                    ]
                                }]
                            },
                            options: {
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: {
                                        labels: { color: '#e2e8f0' }
                                    }
                                },
                                scales: {
                                    y: {
                                        ticks: { color: '#94a3b8' },
                                        grid: { color: '#475569' }
                                    },
                                    x: {
                                        ticks: { color: '#94a3b8' },
                                        grid: { color: '#475569' }
                                    }
                                }
                            }
                        });
                    }
                },

                createTemperatureChart() {
                    const ctx = document.getElementById('temperatureChart');
                    if (ctx) {
                        new Chart(ctx, {
                            type: 'line',
                            data: {
                                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                                datasets: [{
                                    label: 'Temperature (°C)',
                                    data: [22, 24, 26, 28, 30, 29],
                                    borderColor: '#ff6b6b',
                                    backgroundColor: 'rgba(255, 107, 107, 0.1)',
                                    tension: 0.4,
                                    fill: true
                                }]
                            },
                            options: {
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: {
                                        labels: { color: '#e2e8f0' }
                                    }
                                },
                                scales: {
                                    y: {
                                        ticks: { color: '#94a3b8' },
                                        grid: { color: '#475569' }
                                    },
                                    x: {
                                        ticks: { color: '#94a3b8' },
                                        grid: { color: '#475569' }
                                    }
                                }
                            }
                        });
                    }
                },

                createPressureChart() {
                    const ctx = document.getElementById('pressureChart');
                    if (ctx) {
                        new Chart(ctx, {
                            type: 'doughnut',
                            data: {
                                labels: ['Normal', 'High', 'Critical'],
                                datasets: [{
                                    data: [65, 25, 10],
                                    backgroundColor: [
                                        'rgba(16, 185, 129, 0.8)',
                                        'rgba(245, 158, 11, 0.8)',
                                        'rgba(239, 68, 68, 0.8)'
                                    ]
                                }]
                            },
                            options: {
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: {
                                        labels: { color: '#e2e8f0' }
                                    }
                                }
                            }
                        });
                    }
                },

                createQualityChart() {
                    const ctx = document.getElementById('qualityChart');
                    if (ctx) {
                        new Chart(ctx, {
                            type: 'radar',
                            data: {
                                labels: ['Clarity', 'Purity', 'pH', 'Oxygen', 'Temperature', 'Flow'],
                                datasets: [{
                                    label: 'Quality Metrics',
                                    data: [85, 92, 78, 88, 82, 90],
                                    borderColor: '#8b5cf6',
                                    backgroundColor: 'rgba(139, 92, 246, 0.2)',
                                    pointBackgroundColor: '#8b5cf6',
                                    pointBorderColor: '#fff',
                                    pointHoverBackgroundColor: '#fff',
                                    pointHoverBorderColor: '#8b5cf6'
                                }]
                            },
                            options: {
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: {
                                        labels: { color: '#e2e8f0' }
                                    }
                                },
                                scales: {
                                    r: {
                                        ticks: { color: '#94a3b8' },
                                        grid: { color: '#475569' },
                                        pointLabels: { color: '#e2e8f0' }
                                    }
                                }
                            }
                        });
                    }
                },

                startRealTimeUpdates() {
                    setInterval(() => {
                        this.fetchOverviewData();
                    }, 5000); // Update every 5 seconds
                }
            };
        }

        // Helper functions
        function getRandomValue(min, max) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }

        function generateRandomIP() {
            return `${getRandomValue(192, 223)}.${getRandomValue(0, 255)}.${getRandomValue(0, 255)}.${getRandomValue(1, 254)}`;
        }

        function getCommandColor(command) {
            const colors = {
                'system': '#4da6ff',    // Light blue - surface
                'network': '#0077be',   // Medium blue - mid-water
                'processes': '#005c99', // Deep blue - deeper water
                'utilities': '#003d7a', // Very deep - deepest water
                'error': '#ff6666',     // Red for danger/warning
                'success': '#00cc99'    // Teal for success
            };

            return colors[command] || '#4da6ff';
        }

        // Add ripple effect on click
        document.addEventListener('click', function(e) {
            if (e.target.closest('.command-interface') || e.target.closest('.kpi-card') || e.target.closest('.table-container')) {
                const ripple = document.createElement('div');
                ripple.className = 'ripple';
                ripple.style.width = ripple.style.height = '20px';
                ripple.style.left = e.offsetX - 10 + 'px';
                ripple.style.top = e.offsetY - 10 + 'px';
                e.target.closest('.command-interface, .kpi-card, .table-container').appendChild(ripple);

                setTimeout(() => {
                    ripple.remove();
                }, 2000);
            }
        });

        // Add color styling for command output
        const style = document.createElement('style');
        style.textContent = `
            .command-output {
                color: var(--sky-blue);
            }
            .command-output .system {
                color: #4da6ff;
                text-shadow: 0 0 5px rgba(77, 166, 255, 0.5);
            }
            .command-output .network {
                color: #0077be;
                text-shadow: 0 0 5px rgba(0, 119, 190, 0.5);
            }
            .command-output .processes {
                color: #005c99;
                text-shadow: 0 0 5px rgba(0, 92, 153, 0.5);
            }
            .command-output .utilities {
                color: #003d7a;
                text-shadow: 0 0 5px rgba(0, 61, 122, 0.5);
            }
            .command-output .error {
                color: #ff6666;
                text-shadow: 0 0 5px rgba(255, 102, 102, 0.5);
            }
            .command-output .success {
                color: #00cc99;
                text-shadow: 0 0 5px rgba(0, 204, 153, 0.5);
            }
        `;
        document.head.appendChild(style);
    </script>

    <!-- Enhanced Terminal-Style Footer -->
    <footer style="
        margin-top: 60px;
        padding: 40px 20px;
        background: linear-gradient(135deg, rgba(0, 31, 63, 0.9) 0%, rgba(0, 61, 122, 0.9) 100%);
        color: #e2e8f0;
        font-family: 'SF Mono', 'Monaco', 'Fira Code', monospace;
        position: relative;
        text-align: center;
        border-top: 2px solid var(--light-blue);
        border-radius: 15px;
        z-index: 10;
    ">
        <div style="color: var(--sky-blue); font-size: 14px; line-height: 1; overflow: hidden;">
            ╭────────────────────────────────────────────────────────────────────────╮
        </div>

        <div style="padding: 30px 0;">
            <div style="font-size: 3rem; color: var(--sky-blue); text-shadow: 0 0 20px rgba(135, 206, 235, 0.5); animation: pulse-glow 2s ease-in-out infinite;">🌊</div>
            <h2 style="font-size: 2rem; color: var(--sky-blue); margin: 10px 0; font-weight: 700; letter-spacing: 2px; text-shadow: 0 0 10px rgba(135, 206, 235, 0.5);">Fire22 Water Dashboard v4</h2>
            <p style="color: rgba(255, 255, 255, 0.8); font-size: 1.1rem; font-style: italic;">Enhanced Deep Ocean Management & Analytics System</p>
        </div>

        <div style="margin: 30px 0; padding: 20px 0; border-top: 1px solid var(--light-blue); border-bottom: 1px solid var(--light-blue);">
            <div style="color: var(--sky-blue); margin-bottom: 20px; font-size: 1.2px;">
                ├─── Enhanced Water Management Features ───┤
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; text-align: left; max-width: 1000px; margin: 0 auto;">
                <div style="color: rgba(255, 255, 255, 0.8); transition: color 0.3s;" onmouseover="this.style.color='var(--sky-blue)'" onmouseout="this.style.color='rgba(255, 255, 255, 0.8)'">
                    ├─ 🌊 Real-Time Water Flow Monitoring
                </div>
                <div style="color: rgba(255, 255, 255, 0.8); transition: color 0.3s;" onmouseover="this.style.color='var(--sky-blue)'" onmouseout="this.style.color='rgba(255, 255, 255, 0.8)'">
                    ├─ 📊 Advanced Ocean Analytics
                </div>
                <div style="color: rgba(255, 255, 255, 0.8); transition: color 0.3s;" onmouseover="this.style.color='var(--sky-blue)'" onmouseout="this.style.color='rgba(255, 255, 255, 0.8)'">
                    ├─ 🎯 Pressure & Temperature Control
                </div>
                <div style="color: rgba(255, 255, 255, 0.8); transition: color 0.3s;" onmouseover="this.style.color='var(--sky-blue)'" onmouseout="this.style.color='rgba(255, 255, 255, 0.8)'">
                    ╰─ ⚡ Enhanced Command Interface
                </div>
                <div style="color: rgba(255, 255, 255, 0.8); transition: color 0.3s;" onmouseover="this.style.color='var(--sky-blue)'" onmouseout="this.style.color='rgba(255, 255, 255, 0.8)'">
                    ├─ 🌙 Dark/Light Theme Support
                </div>
                <div style="color: rgba(255, 255, 255, 0.8); transition: color 0.3s;" onmouseover="this.style.color='var(--sky-blue)'" onmouseout="this.style.color='rgba(255, 255, 255, 0.8)'">
                    ├─ 🔔 Real-time Alert System
                </div>
                <div style="color: rgba(255, 255, 255, 0.8); transition: color 0.3s;" onmouseover="this.style.color='var(--sky-blue)'" onmouseout="this.style.color='rgba(255, 255, 255, 0.8)'">
                    ├─ ⌨️ Keyboard Shortcuts
                </div>
                <div style="color: rgba(255, 255, 255, 0.8); transition: color 0.3s;" onmouseover="this.style.color='var(--sky-blue)'" onmouseout="this.style.color='rgba(255, 255, 255, 0.8)'">
                    ╰─ 📱 Mobile Responsive Design
                </div>
            </div>
        </div>

        <div style="color: var(--sky-blue); font-size: 14px; line-height: 1; overflow: hidden;">
            ╰────────────────────────────────────────────────────────────────────────╯
        </div>
    </footer>

</body>
</html>

#!/usr/bin/env bun
// Unified Footer System Demonstration
// Shows how the unified footer works across different header types and contexts

import { unifiedFooter, FooterConfig, QuickAction } from './src/ui/unified-footer';

// Create a simple HTML page for demonstration
const createDemoHTML = (): string => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Unified Footer System Demo</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
            color: #f3f4f6;
            margin: 0;
            padding: 2rem;
            line-height: 1.6;
        }
        
        .demo-section {
            background: rgba(30, 41, 59, 0.8);
            border: 1px solid #374151;
            border-radius: 12px;
            padding: 2rem;
            margin: 2rem 0;
            backdrop-filter: blur(10px);
        }
        
        .demo-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
            margin: 2rem 0;
        }
        
        .demo-card {
            background: rgba(15, 23, 42, 0.6);
            border: 1px solid #4b5563;
            border-radius: 8px;
            padding: 1.5rem;
        }
        
        h1 {
            font-size: 2.5rem;
            font-weight: 700;
            background: linear-gradient(135deg, #3b82f6, #8b5cf6);
            background-clip: text;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 1rem;
        }
        
        h2 {
            font-size: 1.875rem;
            font-weight: 600;
            color: #e2e8f0;
            border-left: 4px solid #3b82f6;
            padding-left: 1rem;
            margin-bottom: 1rem;
        }
        
        h3 {
            font-size: 1.5rem;
            font-weight: 600;
            color: #d1d5db;
            margin-bottom: 0.5rem;
        }
        
        .controls {
            background: rgba(59, 130, 246, 0.1);
            border: 1px solid rgba(59, 130, 246, 0.3);
            border-radius: 8px;
            padding: 1rem;
            margin: 1rem 0;
        }
        
        button {
            background: #3b82f6;
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 6px;
            cursor: pointer;
            margin: 0.25rem;
            transition: all 0.2s ease;
        }
        
        button:hover {
            background: #2563eb;
            transform: translateY(-1px);
        }
        
        .metrics-display {
            font-family: 'Courier New', monospace;
            background: rgba(0, 0, 0, 0.3);
            padding: 1rem;
            border-radius: 6px;
            margin: 1rem 0;
        }
        
        .dashboard {
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            border: 1px solid #334155;
        }
    </style>
</head>
<body>
    <div class="demo-section">
        <h1>Unified Footer System Demonstration</h1>
        <p>This demo shows how the unified footer system automatically adds consistent footers to all H1 and H2 elements, with dashboard-specific enhancements.</p>
    </div>

    <div class="demo-section">
        <h2>System Overview</h2>
        <p>The unified footer system provides consistent styling and functionality across all headers in your application.</p>
        
        <div class="controls">
            <h3>Footer Controls</h3>
            <button onclick="toggleTheme()">Toggle Theme</button>
            <button onclick="toggleMetrics()">Toggle Metrics</button>
            <button onclick="toggleActions()">Toggle Actions</button>
            <button onclick="changeAnimation()">Change Animation</button>
            <button onclick="addDynamicHeader()">Add Dynamic Header</button>
        </div>
        
        <div class="metrics-display" id="metrics-display">
            <div>Current Metrics will appear here...</div>
        </div>
    </div>

    <div class="demo-section">
        <h2>Performance Dashboard</h2>
        <div class="demo-grid">
            <div class="demo-card">
                <h3>Real-time Metrics</h3>
                <p>Live performance monitoring with automatic updates.</p>
            </div>
            <div class="demo-card">
                <h3>System Health</h3>
                <p>Overall system status and health indicators.</p>
            </div>
        </div>
    </div>

    <div class="demo-section dashboard">
        <h2>Dashboard Enhanced Footer</h2>
        <p>This section demonstrates the dashboard-specific footer enhancements with special styling and additional features.</p>
        
        <div class="demo-grid">
            <div class="demo-card">
                <h3>Enhanced Styling</h3>
                <p>Dashboard sections get special visual treatment.</p>
            </div>
            <div class="demo-card">
                <h3>Additional Features</h3>
                <p>Extra functionality for dashboard contexts.</p>
            </div>
        </div>
    </div>

    <div class="demo-section">
        <h2>Configuration Section</h2>
        <p>Configuration management with pattern detection and analysis.</p>
        
        <h3>Sub-section Header</h3>
        <p>This H3 header won't get a footer (only H1 and H2 are supported).</p>
    </div>

    <div class="demo-section">
        <h2>API Documentation</h2>
        <p>Complete API reference and usage examples.</p>
    </div>

    <script type="module">
        // Import unified footer system
        import { unifiedFooter } from './src/ui/unified-footer.js';

        // Initialize the unified footer system
        unifiedFooter.initialize({
            showTimestamp: true,
            showSystemInfo: true,
            showQuickActions: true,
            showMetrics: true,
            theme: 'dark',
            position: 'bottom',
            animation: 'slide'
        });

        // Add custom quick actions
        unifiedFooter.addQuickAction({
            id: 'demo-action-1',
            label: 'Demo Action',
            icon: '🎯',
            action: () => alert('Demo action triggered!'),
            color: '#10b981'
        });

        unifiedFooter.addQuickAction({
            id: 'demo-action-2',
            label: 'Metrics',
            icon: '📊',
            action: () => updateMetricsDisplay(),
            color: '#f59e0b',
            badge: 'NEW'
        });

        // Demo control functions
        window.toggleTheme = () => {
            const currentConfig = unifiedFooter.getConfig();
            const newTheme = currentConfig.theme === 'dark' ? 'light' : 'dark';
            unifiedFooter.updateConfig({ theme: newTheme });
        };

        window.toggleMetrics = () => {
            const currentConfig = unifiedFooter.getConfig();
            unifiedFooter.updateConfig({ showMetrics: !currentConfig.showMetrics });
        };

        window.toggleActions = () => {
            const currentConfig = unifiedFooter.getConfig();
            unifiedFooter.updateConfig({ showQuickActions: !currentConfig.showQuickActions });
        };

        window.changeAnimation = () => {
            const animations = ['none', 'slide', 'fade', 'bounce'];
            const currentConfig = unifiedFooter.getConfig();
            const currentIndex = animations.indexOf(currentConfig.animation);
            const nextAnimation = animations[(currentIndex + 1) % animations.length];
            unifiedFooter.updateConfig({ animation: nextAnimation });
        };

        window.addDynamicHeader = () => {
            const section = document.createElement('div');
            section.className = 'demo-section';
            section.innerHTML = \`
                <h2>Dynamic Header \${Date.now()}</h2>
                <p>This header was added dynamically to demonstrate how the unified footer system automatically detects and adds footers to new headers.</p>
            \`;
            document.body.appendChild(section);
        };

        window.updateMetricsDisplay = () => {
            const metrics = unifiedFooter.getMetrics();
            const display = document.getElementById('metrics-display');
            display.innerHTML = \`
                <div><strong>Current Footer Metrics:</strong></div>
                <div>Total Operations: \${metrics.totalOperations.toLocaleString()}</div>
                <div>Average Latency: \${metrics.averageLatency}ms</div>
                <div>System Health: \${metrics.systemHealth}%</div>
                <div>Cache Efficiency: \${metrics.cacheEfficiency}%</div>
                <div>Uptime: \${metrics.uptime}s</div>
            \`;
        };

        // Update metrics display every 2 seconds
        setInterval(updateMetricsDisplay, 2000);
        
        // Initial metrics display
        setTimeout(updateMetricsDisplay, 1000);
    </script>
</body>
</html>
    `;
};

// Main demonstration function
async function runDemo(): Promise<void> {
    console.log('🦶 Starting Unified Footer System Demo...');
    
    try {
        // Create demo HTML file
        const demoHTML = createDemoHTML();
        await Bun.write('./unified-footer-demo.html', demoHTML);
        
        console.log('✅ Demo HTML created: unified-footer-demo.html');
        console.log('');
        console.log('🎯 Demo Features:');
        console.log('   • Automatic footer creation for all H1 and H2 elements');
        console.log('   • Dashboard-specific styling enhancements');
        console.log('   • Real-time metrics updates');
        console.log('   • Interactive controls for testing');
        console.log('   • Dynamic header addition demonstration');
        console.log('   • Theme switching and animations');
        console.log('');
        console.log('🌐 To run the demo:');
        console.log('   1. Open unified-footer-demo.html in your browser');
        console.log('   2. Interact with the controls to see footer behavior');
        console.log('   3. Try adding dynamic headers to see automatic footer creation');
        console.log('');
        console.log('🔧 Integration Options:');
        console.log('   • Import: import { unifiedFooter } from "./src/ui/unified-footer.js"');
        console.log('   • Initialize: unifiedFooter.initialize(config)');
        console.log('   • Update: unifiedFooter.updateConfig(updates)');
        console.log('   • Metrics: unifiedFooter.updateMetrics(metrics)');
        console.log('');
        console.log('🎨 Footer Features:');
        console.log('   • Real-time metrics display');
        console.log('   • Quick action buttons');
        console.log('   • Timestamp and system info');
        console.log('   • Dashboard-specific enhancements');
        console.log('   • Responsive design');
        console.log('   • Multiple themes and animations');
        console.log('');
        console.log('📊 Configuration Options:');
        console.log('   • showTimestamp: boolean');
        console.log('   • showSystemInfo: boolean');
        console.log('   • showQuickActions: boolean');
        console.log('   • showMetrics: boolean');
        console.log('   • theme: "light" | "dark" | "auto"');
        console.log('   • position: "bottom" | "fixed" | "sticky"');
        console.log('   • animation: "none" | "slide" | "fade" | "bounce"');
        
    } catch (error) {
        console.error('❌ Demo creation failed:', error);
        process.exit(1);
    }
}

// Run the demo
if (import.meta.main) {
    runDemo().catch(console.error);
}

export { runDemo };

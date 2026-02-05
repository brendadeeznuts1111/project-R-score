import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import keyboardJS from 'keyboardjs';
import { NetworkNode, tensionToHSL, FuelType } from './types';
import { TensionIntegration } from './tension-integration';

// Component Matrix
const SYSTEM_MATRIX = [
  { id: 'WR-001', type: 'THREE.Scene', domain: 'WEBGL_RENDERING', scope: 'SCENE', function: 'Background', tension: 0.0, ref: '#REF:BACKGROUND,AURORA_SHADER' },
  { id: 'WR-002', type: 'ParticleSystem', domain: 'WEBGL_RENDERING', scope: 'SCENE', function: 'Particle_Lattice', tension: 0.5, ref: '#REF:PARTICLES,VERTEX_SHADER' },
  { id: 'NV-001', type: 'NetworkNode', domain: 'NETWORK_VISUALIZATION', scope: 'SCENE', function: 'Neural_Node', tension: 0.8, ref: '#REF:NETWORK,HUB_NODES' },
  { id: 'NV-002', type: 'ConnectionLine', domain: 'NETWORK_VISUALIZATION', scope: 'SCENE', function: 'Data_Conduit', tension: 0.9, ref: '#REF:CONNECTIONS,LINE_MESH' },
  { id: 'UI-001', type: 'GlassCard', domain: 'USER_INTERFACE', scope: 'UI', function: 'Interface_Panel', tension: 0.3, ref: '#REF:RAY_CAST,MAGNETIC_ZONE' },
  { id: 'DP-001', type: 'DataStream', domain: 'DATA_PROCESSING', scope: 'DATA', function: 'Volume_Stream', tension: 0.6, ref: '#REF:API_ENDPOINT,VISUAL_OUTPUT' },
  { id: 'WR-003', type: 'ShaderUniform', domain: 'WEBGL_RENDERING', scope: 'SHADER', function: 'Time_Variable', tension: 0.9, ref: '#REF:JAVASCRIPT,GPU_SHADER' },
  { id: 'UI-002', type: 'Raycaster', domain: 'USER_INTERFACE', scope: 'INTERACTION', function: 'Mouse_Tracker', tension: 0.7, ref: '#REF:MOUSE,3D_ROTATION' }
];

const App: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const frameRef = useRef<number>(0);
  
  const [isAnimating, setIsAnimating] = useState(true);
  const [systemTension, setSystemTension] = useState(0.1);
  const [tensionIntegration, setTensionIntegration] = useState<TensionIntegration | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showMatrix, setShowMatrix] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [tensionMetrics] = useState({
    totalFuelInjections: 0,
    averageTension: 0.1,
    activeComponents: 0,
    systemUptime: 0,
    lastFuelType: 'None'
  });

  // Initialize Three.js scene
  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000010);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 50;
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Clock for animations
    const clock = new THREE.Clock();
    const uniforms = {
      uTime: { value: 0 },
      uVolume: { value: 0.1 }
    };

    // Particle system
    const particleCount = 5000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 100;
      positions[i3 + 1] = (Math.random() - 0.5) * 100;
      positions[i3 + 2] = (Math.random() - 0.5) * 100;
      
      const color = new THREE.Color(tensionToHSL(0.1, 1.0));
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // Network nodes
    const nodes: NetworkNode[] = [];
    const nodeMeshes: THREE.Mesh[] = [];
    
    for (let i = 0; i < 25; i++) {
      const node = new NetworkNode(`node-${i}`, new THREE.Vector3(
        (Math.random() - 0.5) * 40,
        (Math.random() - 0.5) * 40,
        (Math.random() - 0.5) * 20
      ));
      nodes.push(node);

      const geometry = new THREE.SphereGeometry(0.5, 16, 16);
      const material = new THREE.MeshBasicMaterial({ color: node.color });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(node.position);
      mesh.userData.nodeRef = node;
      scene.add(mesh);
      nodeMeshes.push(mesh);
    }

    // Connection lines
    const lineGeometry = new THREE.BufferGeometry();
    const linePositions = new Float32Array(25 * 3 * 2); // 25 connections * 2 points * 3 coordinates
    const lineColors = new Float32Array(25 * 3 * 2);

    for (let i = 0; i < 25; i++) {
      const i6 = i * 6;
      const node1 = nodes[i];
      const node2 = nodes[(i + 1) % 25];
      
      linePositions[i6] = node1.position.x;
      linePositions[i6 + 1] = node1.position.y;
      linePositions[i6 + 2] = node1.position.z;
      linePositions[i6 + 3] = node2.position.x;
      linePositions[i6 + 4] = node2.position.y;
      linePositions[i6 + 5] = node2.position.z;

      const lineColor = new THREE.Color(tensionToHSL(0.1, 1.0));
      for (let j = 0; j < 6; j++) {
        lineColors[i6 + j] = j % 3 === 0 ? lineColor.r : j % 3 === 1 ? lineColor.g : lineColor.b;
      }
    }

    lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    lineGeometry.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));

    const lineMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.3
    });

    const connections = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(connections);

    // Animation loop
    const animate = () => {
      if (!isAnimating) return;
      
      frameRef.current = requestAnimationFrame(animate);
      
      const elapsedTime = clock.getElapsedTime();
      uniforms.uTime.value = elapsedTime;
      
      // Update particles
      points.rotation.x = elapsedTime * 0.05 * (1 + uniforms.uVolume.value);
      
      // Update network
      connections.rotation.y = elapsedTime * 0.1;
      
      renderer.render(scene, camera);
    };

    animate();

    // Initialize tension integration
    const tension = new TensionIntegration({
      scene,
      points,
      connections,
      nodes,
      nodeMeshes,
      uniforms,
      setSystemTension
    });
    setTensionIntegration(tension);

    // Handle window resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      window.removeEventListener('resize', handleResize);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [isAnimating]);

  // Keyboard controls
  useEffect(() => {
    if (!tensionIntegration) return;

    console.log('🎹 Initializing keyboard controls...');

    // Space - Toggle animation
    keyboardJS.bind('space', (e?: KeyboardEvent) => {
      e?.preventDefault();
      setIsAnimating(prev => !prev);
      console.log(isAnimating ? '⏸️ Animation paused' : '▶️ Animation resumed');
    });

    // R - Reset view
    keyboardJS.bind('r', (e?: KeyboardEvent) => {
      e?.preventDefault();
      if (cameraRef.current) {
        cameraRef.current.position.set(0, 0, 50);
        cameraRef.current.rotation.set(0, 0, 0);
      }
      console.log('🔄 View reset');
    });

    // F - Toggle fullscreen
    keyboardJS.bind('f', (e?: KeyboardEvent) => {
      e?.preventDefault();
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
        console.log('🖥️ Fullscreen enabled');
      } else {
        document.exitFullscreen();
        console.log('🖥️ Fullscreen disabled');
      }
    });

    // 1-8 - Inject fuel
    const fuelTypes: FuelType[] = ['FPS_STREAM', 'DATA_HASH', 'DATABASE', 'LIVE_QUERY', 'HTTP_TRAFFIC', 'FS_EVENTS', 'HIGH_RES_TIME', 'PROCESS_OUTPUT'];
    
    for (let i = 1; i <= 8; i++) {
      keyboardJS.bind(String(i), (e?: KeyboardEvent) => {
        e?.preventDefault();
        const fuelType = fuelTypes[i - 1];
        
        if (tensionIntegration.isConnected) {
          tensionIntegration.injectFuel(fuelType, {
            source: 'keyboard',
            key: String(i),
            timestamp: Date.now()
          });
        } else {
          // Fallback effects
          tensionIntegration.injectFuelDirect(fuelType, { key: String(i) });
        }
        
        console.log(`⚡ Injected ${fuelType} via key ${i}`);
      });
    }

    // Arrow keys - Camera controls
    keyboardJS.bind('up', (e?: KeyboardEvent) => {
      e?.preventDefault();
      if (cameraRef.current) {
        cameraRef.current.position.y += 2;
        console.log('⬆️ Camera up');
      }
    });

    keyboardJS.bind('down', (e?: KeyboardEvent) => {
      e?.preventDefault();
      if (cameraRef.current) {
        cameraRef.current.position.y -= 2;
        console.log('⬇️ Camera down');
      }
    });

    keyboardJS.bind('left', (e?: KeyboardEvent) => {
      e?.preventDefault();
      if (cameraRef.current) {
        cameraRef.current.position.x -= 2;
        console.log('⬅️ Camera left');
      }
    });

    keyboardJS.bind('right', (e?: KeyboardEvent) => {
      e?.preventDefault();
      if (cameraRef.current) {
        cameraRef.current.position.x += 2;
        console.log('➡️ Camera right');
      }
    });

    // +/- - Zoom controls
    keyboardJS.bind(['+', '='], (e?: KeyboardEvent) => {
      e?.preventDefault();
      if (cameraRef.current) {
        cameraRef.current.position.z = Math.max(10, cameraRef.current.position.z - 5);
        console.log('🔍 Zoom in');
      }
    });

    keyboardJS.bind(['-', '_'], (e?: KeyboardEvent) => {
      e?.preventDefault();
      if (cameraRef.current) {
        cameraRef.current.position.z = Math.min(100, cameraRef.current.position.z + 5);
        console.log('🔍 Zoom out');
      }
    });

    // H - Show help
    keyboardJS.bind('h', (e?: KeyboardEvent) => {
      e?.preventDefault();
      setShowHelp(true);
      console.log('📋 Help displayed');
    });

    // ESC - Hide overlays
    keyboardJS.bind('escape', (e?: KeyboardEvent) => {
      e?.preventDefault();
      setShowHelp(false);
      setShowMatrix(false);
      setShowDashboard(false);
      console.log('🔄 Overlays hidden');
    });

    // M - Show matrix
    keyboardJS.bind('m', (e?: KeyboardEvent) => {
      e?.preventDefault();
      setShowMatrix(true);
      console.log('📊 Matrix displayed');
    });

    // D - Show dashboard
    keyboardJS.bind('d', (e?: KeyboardEvent) => {
      e?.preventDefault();
      setShowDashboard(true);
      console.log('📈 Dashboard displayed');
    });

    return () => {
      // keyboardJS doesn't have releaseAll, so we'll just let it cleanup naturally
    };
  }, [tensionIntegration, isAnimating]);

  return (
    <div className="relative w-full h-screen bg-slate-900 overflow-hidden">
      {/* Three.js Canvas Container */}
      <div ref={mountRef} className="absolute inset-0 z-0" />

      {/* Main Content */}
      <main className="relative z-10">
        {/* Hero Section */}
        <section className="h-screen flex items-center justify-center p-8">
          <div className="glass-card p-10 max-w-2xl transform transition-transform duration-500 hover:scale-105">
            <p className="lattice-text mb-2 text-green-500">System Status: Neural Nodes Synced</p>
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-500 to-green-500 bg-clip-text text-transparent">
              Quantum Cash Flow Lattice
            </h1>
            <p className="text-gray-400 text-lg leading-relaxed">
              Visualizing real-time financial synchronizations through a kinetic particle mesh. 
              Monitoring 5,000 active neural nodes across the digital aurora.
            </p>
            <div className="mt-6 flex gap-4">
              <button 
                onClick={() => setShowHelp(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Press H for Help
              </button>
              <button 
                onClick={() => setShowDashboard(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
              >
                Press D for Dashboard
              </button>
              <button 
                onClick={() => setShowMatrix(true)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
              >
                Press M for Matrix
              </button>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="h-screen flex items-center justify-end p-20">
          <div className="glass-card p-8 w-96">
            <h3 className="text-xl font-semibold mb-6 border-b border-blue-500/30 pb-2">Lattice Metrics</h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-400">Throughput</span>
                <span className="text-green-500 font-mono">
                  {Math.floor(systemTension * 5000).toLocaleString()} TX/S
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Latency</span>
                <span className="text-blue-500 font-mono">14ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Node Stability</span>
                <span className="text-blue-500 font-mono">99.98%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">System Tension</span>
                <span className="text-purple-500 font-mono">
                  {(systemTension * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Logs Section */}
        <section className="h-screen flex items-center justify-start p-20">
          <div className="glass-card p-8 w-96">
            <h3 className="text-xl font-semibold mb-4 border-b border-blue-500/30 pb-2">Lattice Synchronizations</h3>
            <div className="space-y-3 font-mono text-xs text-gray-400">
              <div className="flex gap-2">
                <span className="text-blue-500">[{new Date().toLocaleTimeString()}]</span>
                <span>TX_ID: 0x82...f32 SYNCED</span>
              </div>
              <div className="flex gap-2">
                <span className="text-blue-500">[{new Date().toLocaleTimeString()}]</span>
                <span>NODE_UP: n14 ESTABLISHED</span>
              </div>
              <div className="flex gap-2">
                <span className="text-blue-500">[{new Date().toLocaleTimeString()}]</span>
                <span>TX_ID: 0x11...a9b SYNCED</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Keyboard Hints */}
      <div className="fixed bottom-4 left-4 glass-card p-3 text-xs text-gray-400 z-20">
        <strong className="text-blue-500">🎹 Keyboard Controls:</strong><br />
        <kbd className="px-1 py-0.5 bg-blue-900 rounded">Space</kbd> Toggle | 
        <kbd className="px-1 py-0.5 bg-blue-900 rounded">R</kbd> Reset | 
        <kbd className="px-1 py-0.5 bg-blue-900 rounded">F</kbd> Fullscreen<br />
        <kbd className="px-1 py-0.5 bg-blue-900 rounded">1-8</kbd> Fuel | 
        <kbd className="px-1 py-0.5 bg-blue-900 rounded">↑↓←→</kbd> Camera | 
        <kbd className="px-1 py-0.5 bg-blue-900 rounded">+/-</kbd> Zoom<br />
        <kbd className="px-1 py-0.5 bg-blue-900 rounded">H</kbd> Help | 
        <kbd className="px-1 py-0.5 bg-blue-900 rounded">D</kbd> Dashboard | 
        <kbd className="px-1 py-0.5 bg-blue-900 rounded">M</kbd> Matrix | 
        <kbd className="px-1 py-0.5 bg-blue-900 rounded">ESC</kbd> Close
      </div>

      {/* Help Overlay */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="glass-card p-8 max-w-2xl w-full">
            <h2 className="text-2xl font-bold text-blue-500 mb-6">🎹 Keyboard Controls</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <h3 className="font-semibold text-green-500 mb-2">Animation Controls</h3>
                <div className="space-y-1">
                  <div><kbd className="px-2 py-1 bg-blue-900 rounded">Space</kbd> Toggle animation</div>
                  <div><kbd className="px-2 py-1 bg-blue-900 rounded">R</kbd> Reset view</div>
                  <div><kbd className="px-2 py-1 bg-blue-900 rounded">F</kbd> Toggle fullscreen</div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-green-500 mb-2">Fuel Injection</h3>
                <div className="space-y-1">
                  <div><kbd className="px-2 py-1 bg-blue-900 rounded">1-8</kbd> Inject fuel types</div>
                  <div><kbd className="px-2 py-1 bg-blue-900 rounded">↑↓←→</kbd> Camera movement</div>
                  <div><kbd className="px-2 py-1 bg-blue-900 rounded">+/-</kbd> Zoom in/out</div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-green-500 mb-2">Information</h3>
                <div className="space-y-1">
                  <div><kbd className="px-2 py-1 bg-blue-900 rounded">H</kbd> Show help</div>
                  <div><kbd className="px-2 py-1 bg-blue-900 rounded">D</kbd> Show dashboard</div>
                  <div><kbd className="px-2 py-1 bg-blue-900 rounded">M</kbd> Show matrix</div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-green-500 mb-2">System</h3>
                <div className="space-y-1">
                  <div><kbd className="px-2 py-1 bg-blue-900 rounded">ESC</kbd> Close overlays</div>
                  <div><kbd className="px-2 py-1 bg-blue-900 rounded">Tab</kbd> Cycle views</div>
                  <div><kbd className="px-2 py-1 bg-blue-900 rounded">0</kbd> Reset tension</div>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button 
                onClick={() => setShowHelp(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Overlay */}
      {showDashboard && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="glass-card p-8 max-w-6xl w-full max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-6 border-b border-blue-500/30 pb-4">
              <h2 className="text-2xl font-bold text-blue-500">📈 System Dashboard</h2>
              <button 
                onClick={() => setShowDashboard(false)}
                className="text-gray-500 hover:text-white transition-colors"
              >
                [CLOSE_X]
              </button>
            </div>

            {/* Metrics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="glass-card p-6 border border-green-500/30">
                <h3 className="text-green-500 font-semibold mb-2">System Performance</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Frame Rate:</span>
                    <span className="text-green-400 font-mono">60 FPS</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Memory Usage:</span>
                    <span className="text-green-400 font-mono">~75 MB</span>
                  </div>
                  <div className="flex justify-between">
                    <span>System Tension:</span>
                    <span className="text-green-400 font-mono">{(systemTension * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Animation:</span>
                    <span className={isAnimating ? "text-green-400" : "text-red-400"}>
                      {isAnimating ? "Running" : "Paused"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="glass-card p-6 border border-blue-500/30">
                <h3 className="text-blue-500 font-semibold mb-2">Fuel Injection Stats</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Injections:</span>
                    <span className="text-blue-400 font-mono">{tensionMetrics.totalFuelInjections}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Fuel Type:</span>
                    <span className="text-blue-400 font-mono">{tensionMetrics.lastFuelType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Tension:</span>
                    <span className="text-blue-400 font-mono">{tensionMetrics.averageTension.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Components:</span>
                    <span className="text-blue-400 font-mono">{tensionMetrics.activeComponents}/8</span>
                  </div>
                </div>
              </div>

              <div className="glass-card p-6 border border-purple-500/30">
                <h3 className="text-purple-500 font-semibold mb-2">Engine Status</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Tension Engine:</span>
                    <span className={tensionIntegration?.isConnected ? "text-green-400" : "text-yellow-400"}>
                      {tensionIntegration?.isConnected ? "Connected" : "Fallback"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>WebSocket:</span>
                    <span className="text-purple-400 font-mono">ws://localhost:3003</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Uptime:</span>
                    <span className="text-purple-400 font-mono">{Math.floor(tensionMetrics.systemUptime)}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Build:</span>
                    <span className="text-purple-400 font-mono">React + TS</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Component Status Table */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-blue-500 mb-4">Component Status Matrix</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="text-blue-500 border-b border-blue-900/50">
                      <th className="p-3 text-left">Component ID</th>
                      <th className="p-3 text-left">Type</th>
 <th className="p-3 text-left">Fuel Source</th>
                      <th className="p-3 text-center">Tension</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-left">Last Update</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { id: 'WR-001', type: 'THREE.Scene', fuel: 'FPS_STREAM', tension: 0.15, status: 'Active' },
                      { id: 'WR-002', type: 'ParticleSystem', fuel: 'DATA_HASH', tension: 0.35, status: 'Active' },
                      { id: 'NV-001', type: 'NetworkNode', fuel: 'DATABASE', tension: 0.65, status: 'Active' },
                      { id: 'NV-002', type: 'ConnectionLine', fuel: 'LIVE_QUERY', tension: 0.45, status: 'Active' },
                      { id: 'UI-001', type: 'GlassCard', fuel: 'HTTP_TRAFFIC', tension: 0.25, status: 'Idle' },
                      { id: 'DP-001', type: 'DataStream', fuel: 'FS_EVENTS', tension: 0.55, status: 'Active' },
                      { id: 'WR-003', type: 'ShaderUniform', fuel: 'HIGH_RES_TIME', tension: 0.75, status: 'Active' },
                      { id: 'UI-002', type: 'Raycaster', fuel: 'PROCESS_OUTPUT', tension: 0.40, status: 'Idle' }
                    ].map((component) => (
                      <tr key={component.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="p-3 text-blue-400 font-mono">{component.id}</td>
                        <td className="p-3 text-gray-300">{component.type}</td>
                        <td className="p-3 text-gray-400">{component.fuel}</td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center">
                            <div className="w-16 bg-gray-700 rounded-full h-2 mr-2">
                              <div 
                                className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full"
                                style={{ width: `${component.tension * 100}%` }}
                              />
                            </div>
                            <span className="text-green-400 font-mono text-xs">
                              {(component.tension * 100).toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-1 rounded text-xs ${
                            component.status === 'Active' 
                              ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                              : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                          }`}>
                            {component.status}
                          </span>
                        </td>
                        <td className="p-3 text-gray-400 font-mono text-xs">
                          {new Date().toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Fuel Injection History */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-blue-500 mb-4">Recent Fuel Injections</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="text-blue-500 border-b border-blue-900/50">
                      <th className="p-3 text-left">Timestamp</th>
                      <th className="p-3 text-left">Fuel Type</th>
                      <th className="p-3 text-center">Tension Impact</th>
                      <th className="p-3 text-left">Visual Effect</th>
                      <th className="p-3 text-left">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { time: '14:32:15', fuel: 'FPS_STREAM', impact: '+0.2', effect: 'Particle rotation', source: 'Keyboard (1)' },
                      { time: '14:32:10', fuel: 'DATA_HASH', impact: '+0.1', effect: 'Connection pulse', source: 'Keyboard (2)' },
                      { time: '14:32:05', fuel: 'DATABASE', impact: '+0.3', effect: 'Node tension', source: 'Keyboard (3)' },
                      { time: '14:32:00', fuel: 'LIVE_QUERY', impact: '+0.15', effect: 'Random scale', source: 'Keyboard (4)' },
                      { time: '14:31:55', fuel: 'HTTP_TRAFFIC', impact: '+0.1', effect: 'UI highlight', source: 'Keyboard (5)' }
                    ].map((injection, index) => (
                      <tr key={index} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="p-3 text-gray-400 font-mono">{injection.time}</td>
                        <td className="p-3 text-blue-400 font-mono">{injection.fuel}</td>
                        <td className="p-3 text-center">
                          <span className="text-green-400 font-mono">{injection.impact}</span>
                        </td>
                        <td className="p-3 text-gray-300">{injection.effect}</td>
                        <td className="p-3 text-purple-400">{injection.source}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Performance Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass-card p-6">
                <h3 className="text-blue-500 font-semibold mb-4">Tension Over Time</h3>
                <div className="h-32 flex items-end justify-between bg-gray-800/50 rounded p-2">
                  {[0.3, 0.5, 0.4, 0.7, 0.6, 0.8, 0.5, 0.9, 0.7, 0.6].map((height, i) => (
                    <div
                      key={i}
                      className="w-6 bg-gradient-to-t from-blue-600 to-green-400 rounded-t"
                      style={{ height: `${height * 100}%` }}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-2">
                  <span>-30s</span>
                  <span>-15s</span>
                  <span>Now</span>
                </div>
              </div>

              <div className="glass-card p-6">
                <h3 className="text-blue-500 font-semibold mb-4">Fuel Type Distribution</h3>
                <div className="space-y-2">
                  {[
                    { type: 'FPS_STREAM', count: 15, color: 'bg-blue-500' },
                    { type: 'DATA_HASH', count: 12, color: 'bg-green-500' },
                    { type: 'DATABASE', count: 8, color: 'bg-purple-500' },
                    { type: 'LIVE_QUERY', count: 6, color: 'bg-yellow-500' }
                  ].map((fuel) => (
                    <div key={fuel.type} className="flex items-center">
                      <div className={`w-3 h-3 ${fuel.color} rounded mr-2`} />
                      <span className="text-sm text-gray-300 flex-1">{fuel.type}</span>
                      <span className="text-sm font-mono text-gray-400">{fuel.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button 
                onClick={() => setShowDashboard(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Close Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Matrix Overlay */}
      {showMatrix && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="glass-card p-8 max-w-4xl w-full max-h-[80vh] overflow-auto">
            <div className="flex justify-between items-center mb-6 border-b border-blue-500/30 pb-4">
              <h2 className="text-2xl font-bold text-blue-500">COMPONENT_MATRIX_v1.0</h2>
              <button 
                onClick={() => setShowMatrix(false)}
                className="text-gray-500 hover:text-white transition-colors"
              >
                [CLOSE_X]
              </button>
            </div>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="text-blue-500 border-b border-blue-900/50">
                  <th className="p-2">ID</th>
                  <th className="p-2">Type</th>
                  <th className="p-2">Domain</th>
                  <th className="p-2">Scope</th>
                  <th className="p-2">Function</th>
                  <th className="p-2">Tension</th>
                </tr>
              </thead>
              <tbody>
                {SYSTEM_MATRIX.map((item) => (
                  <tr key={item.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-2 text-blue-400">{item.id}</td>
                    <td className="p-2">{item.type}</td>
                    <td className="p-2 text-gray-400">{item.domain}</td>
                    <td className="p-2 text-gray-400">{item.scope}</td>
                    <td className="p-2">{item.function}</td>
                    <td className="p-2 text-green-400">{item.tension.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;

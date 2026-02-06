import React, { useState, useEffect } from 'react';

interface HotReloadEvent {
  type: 'file_changed' | 'file_added' | 'file_removed';
  path: string;
  timestamp: Date;
}

interface DevServerConfig {
  port: number;
  host: string;
  https: boolean;
  open: boolean;
  hmr: boolean;
}

export function useBunDevServer() {
  const [isRunning, setIsRunning] = useState(false);
  const [config, setConfig] = useState<DevServerConfig>({
    port: 3000,
    host: 'localhost',
    https: false,
    open: true,
    hmr: true
  });
  const [events, setEvents] = useState<HotReloadEvent[]>([]);
  const [stats, setStats] = useState({
    requests: 0,
    reloads: 0,
    errors: 0,
    uptime: 0
  });

  useEffect(() => {
    if (isRunning) {
      const interval = setInterval(() => {
        setStats(prev => ({
          ...prev,
          uptime: prev.uptime + 1
        }));
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isRunning]);

  const startServer = async (serverConfig?: Partial<DevServerConfig>) => {
    const finalConfig = { ...config, ...serverConfig };
    setConfig(finalConfig);
    setIsRunning(true);

    try {
      // Simulate starting Bun's dev server
      // In real Bun: const server = Bun.serve({...})
      console.log(`Starting Bun dev server on ${finalConfig.https ? 'https' : 'http'}://${finalConfig.host}:${finalConfig.port}`);
      
      // Simulate hot reload events
      const mockEvents: HotReloadEvent[] = [
        {
          type: 'file_changed',
          path: '/src/App.tsx',
          timestamp: new Date()
        },
        {
          type: 'file_added',
          path: '/src/components/NewComponent.tsx',
          timestamp: new Date()
        },
        {
          type: 'file_changed',
          path: '/src/hooks/useBunPerformance.ts',
          timestamp: new Date()
        }
      ];

      // Simulate events happening over time
      mockEvents.forEach((event, index) => {
        setTimeout(() => {
          setEvents(prev => [event, ...prev].slice(0, 10));
          if (event.type === 'file_changed') {
            setStats(prev => ({ ...prev, reloads: prev.reloads + 1 }));
          }
        }, (index + 1) * 3000);
      });

      // Simulate requests
      const requestInterval = setInterval(() => {
        setStats(prev => ({ ...prev, requests: prev.requests + Math.floor(Math.random() * 5) + 1 }));
      }, 2000);

      return () => clearInterval(requestInterval);
    } catch (error) {
      console.error('Failed to start dev server:', error);
      setIsRunning(false);
    }
  };

  const stopServer = async () => {
    setIsRunning(false);
    setEvents([]);
    setStats({ requests: 0, reloads: 0, errors: 0, uptime: 0 });
  };

  const restartServer = async () => {
    await stopServer();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await startServer();
  };

  const triggerReload = async () => {
    if (!isRunning) return;

    const event: HotReloadEvent = {
      type: 'file_changed',
      path: '/src/App.tsx',
      timestamp: new Date()
    };

    setEvents(prev => [event, ...prev].slice(0, 10));
    setStats(prev => ({ ...prev, reloads: prev.reloads + 1 }));

    // Simulate browser reload
    console.log('Triggering hot reload...');
  };

  const updateConfig = (newConfig: Partial<DevServerConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  return {
    isRunning,
    config,
    events,
    stats,
    startServer,
    stopServer,
    restartServer,
    triggerReload,
    updateConfig,
    formatUptime
  };
}

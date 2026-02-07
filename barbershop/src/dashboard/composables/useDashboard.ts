/**
 * Dashboard Composition API
 * 
 * Composable for building reactive dashboards with:
 * - Real-time data synchronization
 * - Theme integration
 * - Widget management
 * - Auto-refresh capabilities
 */

import { type DashboardConfig, type WidgetConfig, type RealTimeUpdate, type UpdateType, createDashboardConfig, isStale } from '../types';
import type { ThemeName } from '../../../themes/config/index';

// Reactive state using Bun's signal-like pattern
interface ReactiveState<T> {
  value: T;
  subscribers: Set<(value: T) => void>;
}

function createState<T>(initialValue: T): ReactiveState<T> {
  return {
    value: initialValue,
    subscribers: new Set(),
  };
}

function setState<T>(state: ReactiveState<T>, value: T): void {
  state.value = value;
  state.subscribers.forEach(cb => cb(value));
}

function subscribe<T>(state: ReactiveState<T>, callback: (value: T) => void): () => void {
  state.subscribers.add(callback);
  return () => state.subscribers.delete(callback);
}

// ==================== Dashboard Store ====================

interface DashboardStore {
  config: ReactiveState<DashboardConfig>;
  widgets: ReactiveState<WidgetConfig[]>;
  data: ReactiveState<Map<string, unknown>>;
  isConnected: ReactiveState<boolean>;
  lastUpdate: ReactiveState<number>;
  error: ReactiveState<string | null>;
}

function createStore(initialConfig?: Partial<DashboardConfig>): DashboardStore {
  return {
    config: createState(createDashboardConfig(initialConfig)),
    widgets: createState<WidgetConfig[]>([]),
    data: createState<Map<string, unknown>>(new Map()),
    isConnected: createState(false),
    lastUpdate: createState(0),
    error: createState<string | null>(null),
  };
}

// ==================== WebSocket Manager ====================

interface WebSocketManager {
  connect: (url: string) => void;
  disconnect: () => void;
  subscribe: (types: UpdateType[]) => void;
  unsubscribe: (types: UpdateType[]) => void;
  send: (message: unknown) => void;
  onMessage: (callback: (update: RealTimeUpdate) => void) => () => void;
  isConnected: () => boolean;
}

function createWebSocketManager(): WebSocketManager {
  let ws: WebSocket | null = null;
  const messageHandlers = new Set<(update: RealTimeUpdate) => void>();
  let reconnectTimer: Timer | null = null;
  let reconnectAttempts = 0;
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 3000;

  const connect = (url: string): void => {
    if (ws?.readyState === WebSocket.OPEN) return;

    try {
      ws = new WebSocket(url);
      
      ws.onopen = () => {
        reconnectAttempts = 0;
        console.log('[Dashboard] WebSocket connected');
      };

      ws.onmessage = (event) => {
        try {
          const update = JSON.parse(event.data) as RealTimeUpdate;
          messageHandlers.forEach(handler => handler(update));
        } catch (err) {
          console.error('[Dashboard] Failed to parse WebSocket message:', err);
        }
      };

      ws.onclose = () => {
        console.log('[Dashboard] WebSocket disconnected');
        
        // Attempt reconnection
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts++;
          reconnectTimer = setTimeout(() => {
            console.log(`[Dashboard] Reconnecting... (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
            connect(url);
          }, RECONNECT_DELAY * reconnectAttempts);
        }
      };

      ws.onerror = (error) => {
        console.error('[Dashboard] WebSocket error:', error);
      };
    } catch (err) {
      console.error('[Dashboard] Failed to connect WebSocket:', err);
    }
  };

  const disconnect = (): void => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    ws?.close();
    ws = null;
  };

  const subscribe = (types: UpdateType[]): void => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'subscribe', types }));
    }
  };

  const unsubscribe = (types: UpdateType[]): void => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'unsubscribe', types }));
    }
  };

  const send = (message: unknown): void => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  };

  const onMessage = (callback: (update: RealTimeUpdate) => void): () => void => {
    messageHandlers.add(callback);
    return () => messageHandlers.delete(callback);
  };

  const isConnected = (): boolean => ws?.readyState === WebSocket.OPEN;

  return {
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    send,
    onMessage,
    isConnected,
  };
}

// ==================== Data Cache ====================

interface DataCache {
  get: <T>(key: string) => T | undefined;
  set: <T>(key: string, value: T, ttl?: number) => void;
  has: (key: string) => boolean;
  delete: (key: string) => void;
  clear: () => void;
  keys: () => string[];
  isStale: (key: string) => boolean;
}

interface CacheItem<T> {
  value: T;
  timestamp: number;
  ttl: number;
}

function createDataCache(): DataCache {
  const cache = new Map<string, CacheItem<unknown>>();

  const get = <T>(key: string): T | undefined => {
    const item = cache.get(key);
    if (!item) return undefined;
    if (isStale(item.timestamp, item.ttl)) {
      cache.delete(key);
      return undefined;
    }
    return item.value as T;
  };

  const set = <T>(key: string, value: T, ttl: number = 30000): void => {
    cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl,
    });
  };

  const has = (key: string): boolean => {
    const item = cache.get(key);
    if (!item) return false;
    if (isStale(item.timestamp, item.ttl)) {
      cache.delete(key);
      return false;
    }
    return true;
  };

  const deleteKey = (key: string): void => {
    cache.delete(key);
  };

  const clear = (): void => {
    cache.clear();
  };

  const keys = (): string[] => Array.from(cache.keys());

  const isStaleKey = (key: string): boolean => {
    const item = cache.get(key);
    return !item || isStale(item.timestamp, item.ttl);
  };

  return {
    get,
    set,
    has,
    delete: deleteKey,
    clear,
    keys,
    isStale: isStaleKey,
  };
}

// ==================== Auto Refresh ====================

interface AutoRefreshManager {
  start: (callback: () => void, interval?: number) => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  isActive: () => boolean;
}

function createAutoRefreshManager(): AutoRefreshManager {
  let timer: Timer | null = null;
  let callback: (() => void) | null = null;
  let interval = 5000;
  let isPaused = false;

  const start = (cb: () => void, int: number = 5000): void => {
    stop();
    callback = cb;
    interval = int;
    isPaused = false;
    timer = setInterval(() => {
      if (!isPaused && callback) {
        callback();
      }
    }, interval);
  };

  const stop = (): void => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    callback = null;
  };

  const pause = (): void => {
    isPaused = true;
  };

  const resume = (): void => {
    isPaused = false;
  };

  const isActive = (): boolean => timer !== null && !isPaused;

  return {
    start,
    stop,
    pause,
    resume,
    isActive,
  };
}

// ==================== Main Dashboard Composable ====================

export interface UseDashboardReturn {
  // State
  config: DashboardConfig;
  widgets: WidgetConfig[];
  isConnected: boolean;
  lastUpdate: number;
  error: string | null;
  
  // Actions
  setConfig: (config: Partial<DashboardConfig>) => void;
  setTheme: (theme: ThemeName) => void;
  addWidget: (widget: WidgetConfig) => void;
  removeWidget: (widgetId: string) => void;
  updateWidget: (widgetId: string, updates: Partial<WidgetConfig>) => void;
  connect: (url: string) => void;
  disconnect: () => void;
  refresh: () => Promise<void>;
  startAutoRefresh: (interval?: number) => void;
  stopAutoRefresh: () => void;
  
  // Data
  getData: <T>(key: string) => T | undefined;
  setData: <T>(key: string, value: T) => void;
  
  // Subscriptions
  onUpdate: (callback: (update: RealTimeUpdate) => void) => () => void;
  subscribe: (unsubscribe: () => void) => void;
}

export function useDashboard(initialConfig?: Partial<DashboardConfig>): UseDashboardReturn {
  const store = createStore(initialConfig);
  const wsManager = createWebSocketManager();
  const cache = createDataCache();
  const autoRefresh = createAutoRefreshManager();
  const unsubscribers: (() => void)[] = [];

  // Connect WebSocket on config change if live updates enabled
  const setupWebSocket = (): void => {
    const config = store.config.value;
    if (config.liveUpdates && config.features.websocket) {
      // URL would come from config in real implementation
      wsManager.connect('ws://localhost:3000/ws/dashboard');
    }
  };

  // Handle real-time updates
  wsManager.onMessage((update) => {
    setState(store.lastUpdate, Date.now());
    cache.set(`update:${update.type}`, update.data);
  });

  const setConfig = (config: Partial<DashboardConfig>): void => {
    const current = store.config.value;
    setState(store.config, { ...current, ...config });
    
    // Reconnect WebSocket if liveUpdates setting changed
    if (config.liveUpdates !== undefined) {
      if (config.liveUpdates) {
        setupWebSocket();
      } else {
        wsManager.disconnect();
      }
    }
  };

  const setTheme = (theme: ThemeName): void => {
    setConfig({ theme });
  };

  const addWidget = (widget: WidgetConfig): void => {
    const current = store.widgets.value;
    setState(store.widgets, [...current, widget]);
  };

  const removeWidget = (widgetId: string): void => {
    const current = store.widgets.value;
    setState(store.widgets, current.filter(w => w.id !== widgetId));
  };

  const updateWidget = (widgetId: string, updates: Partial<WidgetConfig>): void => {
    const current = store.widgets.value;
    setState(store.widgets, current.map(w => 
      w.id === widgetId ? { ...w, ...updates } : w
    ));
  };

  const connect = (url: string): void => {
    wsManager.connect(url);
    setState(store.isConnected, true);
  };

  const disconnect = (): void => {
    wsManager.disconnect();
    setState(store.isConnected, false);
    autoRefresh.stop();
  };

  const refresh = async (): Promise<void> => {
    try {
      setState(store.error, null);
      // In real implementation, this would fetch from API
      setState(store.lastUpdate, Date.now());
    } catch (err) {
      setState(store.error, err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const startAutoRefresh = (interval?: number): void => {
    const config = store.config.value;
    autoRefresh.start(() => {
      void refresh();
    }, interval || config.refreshInterval);
  };

  const stopAutoRefresh = (): void => {
    autoRefresh.stop();
  };

  const getData = <T>(key: string): T | undefined => {
    return cache.get<T>(key);
  };

  const setData = <T>(key: string, value: T): void => {
    cache.set(key, value);
    const current = store.data.value;
    current.set(key, value);
    setState(store.data, new Map(current));
  };

  const onUpdate = (callback: (update: RealTimeUpdate) => void): () => void => {
    return wsManager.onMessage(callback);
  };

  const subscribe = (unsubscribe: () => void): void => {
    unsubscribers.push(unsubscribe);
  };

  // Cleanup on dispose
  const dispose = (): void => {
    unsubscribers.forEach(unsub => unsub());
    disconnect();
    cache.clear();
  };

  return {
    // State (current values)
    get config() { return store.config.value; },
    get widgets() { return store.widgets.value; },
    get isConnected() { return store.isConnected.value; },
    get lastUpdate() { return store.lastUpdate.value; },
    get error() { return store.error.value; },
    
    // Actions
    setConfig,
    setTheme,
    addWidget,
    removeWidget,
    updateWidget,
    connect,
    disconnect,
    refresh,
    startAutoRefresh,
    stopAutoRefresh,
    
    // Data
    getData,
    setData,
    
    // Subscriptions
    onUpdate,
    subscribe,
  };
}

// ==================== Utility Hooks ====================

export function useMetrics(dashboard: UseDashboardReturn) {
  return {
    getMetric: <T>(key: string): T | undefined => dashboard.getData<T>(`metric:${key}`),
    setMetric: <T>(key: string, value: T): void => dashboard.setData(`metric:${key}`, value),
    getFinancials: () => dashboard.getData('financials'),
    getConnections: () => dashboard.getData('connections'),
    getBarbers: () => dashboard.getData('barbers'),
  };
}

export function useWidgets(dashboard: UseDashboardReturn) {
  return {
    add: dashboard.addWidget,
    remove: dashboard.removeWidget,
    update: dashboard.updateWidget,
    list: () => dashboard.widgets,
    findByType: (type: string) => dashboard.widgets.filter(w => w.type === type),
    findById: (id: string) => dashboard.widgets.find(w => w.id === id),
  };
}

export function useTheme(dashboard: UseDashboardReturn) {
  return {
    current: dashboard.config.theme,
    set: dashboard.setTheme,
    is: (theme: ThemeName) => dashboard.config.theme === theme,
  };
}

export default useDashboard;

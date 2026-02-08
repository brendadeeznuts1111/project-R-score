/**
 * FactoryWager Prefetch Manager
 * Handles DNS prefetching, resource hints, and intelligent preloading
 */

export interface PrefetchConfig {
  type: 'dns' | 'preconnect' | 'prefetch' | 'preload' | 'modulepreload';
  url: string;
  priority?: 'high' | 'low' | 'auto';
  as?: string;
  crossorigin?: string;
  integrity?: string;
}

export interface PrefetchStrategy {
  name: string;
  enabled: boolean;
  resources: PrefetchConfig[];
  conditions?: () => boolean;
}

export class PrefetchManager {
  private static instance: PrefetchManager;
  private strategies: Map<string, PrefetchStrategy> = new Map();
  private prefetchedResources: Set<string> = new Set();
  private observer: IntersectionObserver | null = null;

  constructor() {
    this.initializeStrategies();
    this.setupIntersectionObserver();
  }

  static getInstance(): PrefetchManager {
    if (!PrefetchManager.instance) {
      PrefetchManager.instance = new PrefetchManager();
    }
    return PrefetchManager.instance;
  }

  private initializeStrategies() {
    // DNS Prefetching Strategy
    this.strategies.set('dns_prefetch', {
      name: 'DNS Prefetching',
      enabled: true,
      resources: [
        { type: 'dns', url: 'https://registry.factory-wager.com' },
        { type: 'dns', url: 'https://registry.factory-wager.com' },
        { type: 'dns', url: 'https://cache.factory-wager.com' },
        { type: 'dns', url: 'https://metrics.factory-wager.com' },
        { type: 'dns', url: 'https://dashboard.factory-wager.com' },
        { type: 'dns', url: 'https://wiki.factory-wager.com' },
        { type: 'dns', url: 'https://client.factory-wager.com' },
        { type: 'dns', url: 'https://admin.factory-wager.com' },
        { type: 'dns', url: 'https://cdn.factory-wager.com' },
        { type: 'dns', url: 'https://fonts.googleapis.com' },
        { type: 'dns', url: 'https://fonts.gstatic.com' },
        { type: 'dns', url: 'https://cdn.jsdelivr.net' }
      ]
    });

    // Preconnect Strategy
    this.strategies.set('preconnect', {
      name: 'Preconnect Critical Resources',
      enabled: true,
      resources: [
        { 
          type: 'preconnect', 
          url: 'https://registry.factory-wager.com',
          priority: 'high'
        },
        { 
          type: 'preconnect', 
          url: 'https://metrics.factory-wager.com',
          priority: 'high'
        },
        { 
          type: 'preconnect', 
          url: 'https://fonts.googleapis.com',
          priority: 'low'
        }
      ]
    });

    // Prefetch Strategy for Navigation
    this.strategies.set('navigation_prefetch', {
      name: 'Navigation Prefetching',
      enabled: true,
      resources: [
        { type: 'prefetch', url: 'https://dashboard.factory-wager.com/' },
        { type: 'prefetch', url: 'https://wiki.factory-wager.com/' },
        { type: 'prefetch', url: 'https://client.factory-wager.com/' }
      ],
      conditions: () => {
        // Only prefetch on stable connections
        if (typeof navigator === 'undefined') return false;
        const connection = (navigator as any).connection;
        return !connection || (connection.effectiveType !== 'slow-2g' && connection.effectiveType !== '2g');
      }
    });

    // Preload Critical Resources
    this.strategies.set('critical_preload', {
      name: 'Critical Resource Preloading',
      enabled: true,
      resources: [
        {
          type: 'preload',
          url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
          as: 'style',
          priority: 'high',
          crossorigin: 'anonymous'
        },
        {
          type: 'preload',
          url: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2',
          as: 'font',
          priority: 'high',
          crossorigin: 'anonymous',
          integrity: 'sha384-1BmE4kWBq78iYhFldvKuhfTAU6auU8tT94WrHftjDbrCEXSU1oBoqyl2QvZ6jIW3'
        }
      ]
    });

    // Module Preload for JavaScript
    this.strategies.set('module_preload', {
      name: 'JavaScript Module Preloading',
      enabled: true,
      resources: [
        {
          type: 'modulepreload',
          url: 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
          priority: 'low'
        },
        {
          type: 'modulepreload',
          url: 'https://cdn.jsdelivr.net/npm/lucide@latest/dist/umd/lucide.js',
          priority: 'low'
        }
      ],
      conditions: () => {
        // Only on desktop with good connection
        if (typeof navigator === 'undefined') return false;
        const connection = (navigator as any).connection;
        return connection && connection.effectiveType === '4g';
      }
    });
  }

  private setupIntersectionObserver() {
    if (typeof IntersectionObserver === 'undefined') return;

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const element = entry.target as HTMLElement;
          const prefetchUrl = element.dataset.prefetch;
          const prefetchType = element.dataset.prefetchType || 'prefetch';
          
          if (prefetchUrl && !this.prefetchedResources.has(prefetchUrl)) {
            this.addResource({
              type: prefetchType as any,
              url: prefetchUrl,
              priority: 'low'
            });
          }
        }
      });
    }, {
      rootMargin: '50px'
    });
  }

  executeStrategy(strategyName: string): void {
    const strategy = this.strategies.get(strategyName);
    if (!strategy || !strategy.enabled) return;

    // Check conditions
    if (strategy.conditions && !strategy.conditions()) {
      console.log(`Skipping strategy ${strategy.name}: conditions not met`);
      return;
    }

    console.log(`Executing strategy: ${strategy.name}`);
    
    strategy.resources.forEach(resource => {
      this.addResource(resource);
    });
  }

  executeAllStrategies(): void {
    this.strategies.forEach((strategy, name) => {
      this.executeStrategy(name);
    });
  }

  addResource(config: PrefetchConfig): void {
    if (this.prefetchedResources.has(config.url)) {
      return; // Already prefetched
    }

    if (typeof document === 'undefined') return;

    let element: HTMLLinkElement;

    switch (config.type) {
      case 'dns':
        element = document.createElement('link');
        element.rel = 'dns-prefetch';
        element.href = config.url;
        break;

      case 'preconnect':
        element = document.createElement('link');
        element.rel = 'preconnect';
        element.href = config.url;
        if (config.crossorigin) {
          element.crossOrigin = config.crossorigin;
        }
        break;

      case 'prefetch':
        element = document.createElement('link');
        element.rel = 'prefetch';
        element.href = config.url;
        if (config.priority) {
          element.setAttribute('importance', config.priority);
        }
        break;

      case 'preload':
        element = document.createElement('link');
        element.rel = 'preload';
        element.href = config.url;
        if (config.as) {
          element.as = config.as;
        }
        if (config.crossorigin) {
          element.crossOrigin = config.crossorigin;
        }
        if (config.integrity) {
          element.integrity = config.integrity;
        }
        if (config.priority) {
          element.setAttribute('importance', config.priority);
        }
        break;

      case 'modulepreload':
        element = document.createElement('link');
        element.rel = 'modulepreload';
        element.href = config.url;
        if (config.crossorigin) {
          element.crossOrigin = config.crossorigin;
        }
        if (config.integrity) {
          element.integrity = config.integrity;
        }
        break;

      default:
        return;
    }

    document.head.appendChild(element);
    this.prefetchedResources.add(config.url);

    console.log(`Added ${config.type} for ${config.url}`);
  }

  observeElement(element: HTMLElement, url: string, type: 'prefetch' | 'preload' = 'prefetch'): void {
    if (!this.observer) return;

    element.dataset.prefetch = url;
    element.dataset.prefetchType = type;
    this.observer.observe(element);
  }

  unobserveElement(element: HTMLElement): void {
    if (!this.observer) return;
    this.observer.unobserve(element);
  }

  // Intelligent prefetching based on user behavior
  prefetchOnHover(element: HTMLElement, url: string, delay: number = 100): void {
    let timeoutId: NodeJS.Timeout;

    const handleMouseEnter = () => {
      timeoutId = setTimeout(() => {
        if (!this.prefetchedResources.has(url)) {
          this.addResource({
            type: 'prefetch',
            url: url,
            priority: 'high'
          });
        }
      }, delay);
    };

    const handleMouseLeave = () => {
      clearTimeout(timeoutId);
    };

    element.addEventListener('mouseenter', handleMouseEnter);
    element.addEventListener('mouseleave', handleMouseLeave);
  }

  // Prefetch based on scroll position
  prefetchOnScroll(elements: HTMLElement[], threshold: number = 200): void {
    const checkScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;

      elements.forEach(element => {
        const elementTop = element.offsetTop;
        const distance = elementTop - (scrollTop + windowHeight);

        if (distance < threshold && distance > -threshold) {
          const url = element.dataset.prefetch;
          const type = element.dataset.prefetchType || 'prefetch';
          
          if (url && !this.prefetchedResources.has(url)) {
            this.addResource({
              type: type as any,
              url: url,
              priority: 'low'
            });
          }
        }
      });
    };

    window.addEventListener('scroll', checkScroll, { passive: true });
    checkScroll(); // Initial check
  }

  // Network-aware prefetching
  adaptivePrefetch(): void {
    if (typeof navigator === 'undefined') return;

    const connection = (navigator as any).connection;
    
    if (!connection) {
      // No connection API, use conservative approach
      this.executeStrategy('dns_prefetch');
      this.executeStrategy('preconnect');
      return;
    }

    const { effectiveType, saveData, downlink } = connection;

    // Disable prefetching on slow connections or data saver mode
    if (saveData || effectiveType === 'slow-2g' || effectiveType === '2g') {
      console.log('Adaptive prefetching disabled: slow connection or data saver mode');
      return;
    }

    // Adjust strategy based on connection quality
    if (effectiveType === '3g') {
      this.executeStrategy('dns_prefetch');
      this.executeStrategy('preconnect');
    } else if (effectiveType === '4g') {
      this.executeStrategy('dns_prefetch');
      this.executeStrategy('preconnect');
      this.executeStrategy('navigation_prefetch');
      this.executeStrategy('critical_preload');
    }

    // High bandwidth connections get module preloading
    if (downlink > 5) {
      this.executeStrategy('module_preload');
    }
  }

  getPrefetchedResources(): string[] {
    return Array.from(this.prefetchedResources);
  }

  clearPrefetchedResources(): void {
    this.prefetchedResources.clear();
  }

  // Performance monitoring
  measurePrefetchPerformance(): void {
    if (typeof performance === 'undefined') return;

    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.name.includes('prefetch') || entry.name.includes('preload')) {
          console.log(`Prefetch performance for ${entry.name}:`, {
            duration: entry.duration,
            transferSize: entry.transferSize,
            encodedBodySize: entry.encodedBodySize
          });
        }
      });
    });

    observer.observe({ entryTypes: ['resource'] });
  }
}

export default PrefetchManager;

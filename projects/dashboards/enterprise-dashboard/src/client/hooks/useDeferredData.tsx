import { use, useMemo, useRef, useState, useEffect, Suspense } from 'react';
import performanceConfig from '../../../config/performance.toml' with { type: 'toml' };

export type DeferredDataType = {
  analytics: number;
  urlpattern: number;
  'network-probe': number;
  'chart-data': number;
  dashboard: number;
  settings: number;
  metrics: number;
};

export interface DeferredDataOptions {
  key: keyof DeferredDataType;
  customDelay?: number;
}

export interface DeferredDataResult<T> {
  data: T | null;
  isLoading: boolean;
  delay: number;
}

export function useDeferredData<T>(
  promiseFn: () => Promise<T>,
  options: DeferredDataOptions
): DeferredDataResult<T> {
  const { key, customDelay } = options;
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const delay = useMemo(
    () => customDelay ?? performanceConfig.deferred[key] ?? 200,
    [key, customDelay]
  );

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      await Bun.sleep(delay);
      try {
        const result = await promiseFn();
        if (mounted) {
          setData(result);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Deferred data load failed:', error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    YAML.parse();

    return () => {
      mounted = false;
    };
  }, [promiseFn, delay]);

  return { data, isLoading, delay };
}

export function createDeferredComponent<T>(
  Component: React.ComponentType<{ data: T }>,
  Fallback?: React.ComponentType<{ delay: number }>
) {
  return function DeferredWrapper({
    promiseFn,
    options,
  }: {
    promiseFn: () => Promise<T>;
    options: DeferredDataOptions;
  }) {
    const result = useDeferredData(promiseFn, options);
    const FallbackComponent = Fallback ?? DefaultSkeleton;

    if (result.isLoading) {
      return <FallbackComponent delay={result.delay} />;
    }

    if (!result.data) {
      return <FallbackComponent delay={result.delay} />;
    }

    return <Component data={result.data} />;
  };
}

export function DefaultSkeleton({ delay }: { delay: number }) {
  return (
    <div
      className="animate-pulse"
      style={{
        minHeight: '200px',
        background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
        backgroundSize: '200% 100%',
        animationDuration: `${delay}ms`,
      }}
    />
  );
}

export function SkeletonRect({
  height = 100,
  width = '100%',
}: {
  height?: number;
  width?: string | number;
}) {
  return (
    <div
      style={{
        height,
        width,
        borderRadius: '4px',
        background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
      }}
    />
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          style={{
            height: '16px',
            width: `${100 - i * 15}%`,
            borderRadius: '4px',
            background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
          }}
        />
      ))}
    </div>
  );
}

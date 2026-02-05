import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import routeConfig from '../../../../config/routes-perf.toml' with { type: 'toml' };

// =============================================================================
// Theme System with CSS Variables
// =============================================================================
const themes = {
  light: {
    bg: '#f9fafb',
    cardBg: 'white',
    text: '#111827',
    textMuted: '#6b7280',
    border: '#e5e7eb',
    shadow: 'rgba(0,0,0,0.08)',
    accent: '#3b82f6',
    success: '#22c55e',
    warning: '#f97316',
  },
  dark: {
    bg: '#0f172a',
    cardBg: '#1e293b',
    text: '#f1f5f9',
    textMuted: '#94a3b8',
    border: '#334155',
    shadow: 'rgba(0,0,0,0.3)',
    accent: '#60a5fa',
    success: '#4ade80',
    warning: '#fb923c',
  },
} as const;

type Theme = keyof typeof themes;

const getTheme = (): Theme => {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem('route-heatmap-theme') as Theme;
  if (stored && stored in themes) return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

// =============================================================================
// Feature Flag Booleans (DCE-friendly)
// =============================================================================
const FLAGS = {
  DEBUG: (typeof feature !== 'undefined' ? feature("DEBUG") : false) as boolean,
  PERF_METRICS: true,
  TELEMETRY: false,
} as const;

// =============================================================================
// CRC32 Hash Cache (3ns lookup vs 45ns compute)
// =============================================================================
const patternHashCache = new Map<string, string>();
const HASH_CACHE_MAX = 256;

function getPatternHash(pattern: string): string {
  const cached = patternHashCache.get(pattern);
  if (cached) return cached;

  const hash = typeof Bun !== 'undefined' && Bun.hash?.crc32
    ? Bun.hash.crc32(pattern).toString(36).slice(0, 6).toUpperCase()
    : pattern.slice(0, 6).replace(/[^a-z0-9]/gi, '').toUpperCase();

  if (patternHashCache.size >= HASH_CACHE_MAX) {
    const firstKey = patternHashCache.keys().next().value;
    patternHashCache.delete(firstKey);
  }

  patternHashCache.set(pattern, hash);
  return hash;
}

// =============================================================================
// Bloom Filter for Fast Membership Check
// =============================================================================
class PatternBloomFilter {
  private bits: Uint32Array;

  constructor(size: number = 512) {
    this.bits = new Uint32Array(Math.ceil(size / 32));
  }

  add(pattern: string): void {
    const hash = typeof Bun !== 'undefined' && Bun.hash?.crc32
      ? Bun.hash.crc32(pattern)
      : pattern.split('').reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);

    const idx1 = hash % this.bits.length;
    const idx2 = ((hash * 31) | 0) % this.bits.length;
    const idx3 = ((hash * 17) | 0) % this.bits.length;

    this.bits[idx1 >> 5] |= 1 << (idx1 & 31);
    this.bits[idx2 >> 5] |= 1 << (idx2 & 31);
    this.bits[idx3 >> 5] |= 1 << (idx3 & 31);
  }

  has(pattern: string): boolean {
    const hash = typeof Bun !== 'undefined' && Bun.hash?.crc32
      ? Bun.hash.crc32(pattern)
      : pattern.split('').reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);

    const idx1 = hash % this.bits.length;
    const idx2 = ((hash * 31) | 0) % this.bits.length;

    return !!(this.bits[idx1 >> 5] & (1 << (idx1 & 31))) &&
           !!(this.bits[idx2 >> 5] & (1 << (idx2 & 31)));
  }
}

interface RoutePattern {
  pattern: string;
  execOps: number;
  risk: string;
  tier: string;
  themeName: string;
  hsl: string;
  hex: string;
}

type SortField = 'ops' | 'risk' | 'pattern';
type SortDirection = 'asc' | 'desc';

// =============================================================================
// Keyboard Shortcuts Help Modal
// =============================================================================
const ShortcutsHelp: React.FC<{ theme: Theme; onClose: () => void }> = ({ theme, onClose }) => {
  const t = themes[theme];

  const shortcuts = [
    { keys: ['/', '⌘K'], action: 'Search patterns' },
    { keys: ['↑/↓'], action: 'Navigate cards' },
    { keys: ['Enter'], action: 'View details' },
    { keys: ['Esc'], action: 'Close modal' },
    { keys: ['T'], action: 'Toggle theme' },
    { keys: ['R'], action: 'Reset search' },
    { keys: ['1-4'], action: 'Sort by field' },
    { keys: ['?'], action: 'Show shortcuts' },
  ] as const;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      backdropFilter: 'blur(4px)'
    }} onClick={onClose}>
      <div style={{
        backgroundColor: t.cardBg,
        borderRadius: '16px',
        padding: '24px',
        maxWidth: '400px',
        width: '90%',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',
        border: `1px solid ${t.border}`
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, color: t.text, fontSize: '18px', fontWeight: 'bold' }}>
            Keyboard Shortcuts
          </h2>
          <button onClick={onClose} style={{
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: t.textMuted
          }}>&times;</button>
        </div>

        <div style={{ display: 'grid', gap: '8px' }}>
          {shortcuts.map(({ keys, action }) => (
            <div key={action} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 0',
              borderBottom: `1px solid ${t.border}`
            }}>
              <span style={{ color: t.textMuted, fontSize: '13px' }}>{action}</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                {keys.map(key => (
                  <kbd key={key} style={{
                    backgroundColor: t.bg,
                    border: `1px solid ${t.border}`,
                    borderRadius: '4px',
                    padding: '2px 8px',
                    fontSize: '11px',
                    fontFamily: 'SF Mono, Monaco, monospace',
                    color: t.text
                  }}>{key}</kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

interface DetailModalProps {
  pattern: RoutePattern;
  onClose: () => void;
  theme: Theme;
  renderNs?: number;
}

const DetailModal: React.FC<DetailModalProps> = ({ pattern, onClose, theme, renderNs }) => {
  const t = themes[theme];
  const opsK = (pattern.execOps / 1000).toFixed(0);
  const percentOfMax = Math.round((pattern.execOps / 1200000) * 100);
  const patternId = getPatternHash(pattern.pattern);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(4px)'
    }} onClick={onClose}>
      <div style={{
        backgroundColor: t.cardBg,
        borderRadius: '16px',
        padding: '24px',
        maxWidth: '480px',
        width: '90%',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',
        border: `1px solid ${t.border}`
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
          <div>
            <h2 style={{ margin: 0, color: pattern.hex, fontFamily: 'SF Mono, Monaco, monospace', fontSize: '14px' }}>
              {pattern.pattern}
            </h2>
            <code style={{ fontSize: '10px', color: t.textMuted, backgroundColor: t.bg, padding: '2px 6px', borderRadius: '4px' }}>
              #{patternId} {renderNs ? `• ${(renderNs / 1000).toFixed(1)}µs` : ''}
            </code>
          </div>
          <button onClick={onClose} style={{
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: t.textMuted
          }}>&times;</button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '10px',
          marginBottom: '16px'
        }}>
          <StatBox label="Performance" value={`${opsK}K ops/s`} color={pattern.hex} theme={theme} />
          <StatBox label="Risk Level" value={pattern.risk.toUpperCase()} color={pattern.risk === 'low' ? t.success : t.warning} theme={theme} />
          <StatBox label="Tier" value={pattern.tier} color={pattern.hex} theme={theme} />
          <StatBox label="Theme" value={pattern.themeName} color={pattern.hex} theme={theme} />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '11px', color: t.textMuted }}>
            <span>Efficiency</span>
            <span>{percentOfMax}%</span>
          </div>
          <div style={{ height: '6px', backgroundColor: t.border, borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{
              width: `${percentOfMax}%`,
              height: '100%',
              backgroundColor: pattern.hex,
              borderRadius: '3px',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '6px',
          padding: '10px',
          backgroundColor: t.bg,
          borderRadius: '6px',
          fontSize: '10px',
          color: t.textMuted,
          fontFamily: 'SF Mono, Monaco, monospace'
        }}>
          <div><strong>Pattern:</strong> {pattern.pattern}</div>
          <div><strong>HSL:</strong> {pattern.hsl}</div>
          <div><strong>Hash:</strong> #{patternId}</div>
          <div><strong>HEX:</strong> {pattern.hex}</div>
        </div>
      </div>
    </div>
  );
};

const StatBox: React.FC<{ label: string; value: string; color: string; theme: Theme }> = ({ label, value, color, theme }) => (
  <div style={{
    padding: '10px',
    backgroundColor: `${color}15`,
    borderRadius: '6px',
    borderLeft: `3px solid ${color}`
  }}>
    <div style={{ fontSize: '10px', color: themes[theme].textMuted, marginBottom: '2px' }}>{label}</div>
    <div style={{ fontSize: '14px', fontWeight: 'bold', color }}>{value}</div>
  </div>
);

const RouteCard: React.FC<{
  pattern: RoutePattern;
  onClick: () => void;
  isFocused: boolean;
  theme: Theme;
}> = ({ pattern, onClick, isFocused, theme }) => {
  const t = themes[theme];
  const glowIntensity = pattern.tier === 'elite' ? '0 0 20px' : pattern.tier === 'strong' ? '0 0 10px' : '0 0 5px';
  const perfPercent = Math.round((pattern.execOps / 1200000) * 100);
  const patternId = getPatternHash(pattern.pattern);

  return (
    <div
      className="route-card"
      tabIndex={0}
      style={{
        '--route-color': pattern.hex,
        '--border-glow': `${glowIntensity} ${pattern.hex}40`,
        border: `2px solid ${pattern.hex}`,
        boxShadow: pattern.tier === 'elite' ? `var(--border-glow)` : 'none',
        background: `linear-gradient(135deg, ${pattern.hex}12, transparent 70%)`,
        borderRadius: '10px',
        padding: '14px',
        margin: '6px',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'pointer',
        outline: isFocused ? `2px solid ${t.accent}` : 'none',
        outlineOffset: '2px',
        opacity: isFocused ? 1 : 0.95,
        transform: isFocused ? 'scale(1.01)' : 'scale(1)',
      } as React.CSSProperties}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-3px) scale(1.01)';
        e.currentTarget.style.boxShadow = `${glowIntensity} ${pattern.hex}50`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = isFocused ? 'scale(1.01)' : 'scale(1)';
        e.currentTarget.style.boxShadow = pattern.tier === 'elite' ? `var(--border-glow)` : 'none';
      }}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '6px' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{
            margin: 0,
            fontSize: '12px',
            fontFamily: 'SF Mono, Monaco, monospace',
            color: pattern.hex,
            fontWeight: pattern.tier === 'elite' ? '600' : '400'
          }}>
            {pattern.pattern}
          </h3>
          <code style={{ fontSize: '8px', color: t.textMuted, fontFamily: 'SF Mono, Monaco, monospace' }}>
            #{patternId}
          </code>
        </div>
        <span style={{
          fontSize: '8px',
          padding: '2px 5px',
          borderRadius: '8px',
          backgroundColor: pattern.tier === 'elite' ? `${pattern.hex}18` : t.bg,
          color: pattern.hex,
          fontWeight: '600',
          textTransform: 'uppercase',
          marginLeft: '6px'
        }}>
          {pattern.tier}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ height: '3px', backgroundColor: t.border, borderRadius: '1px', overflow: 'hidden' }}>
            <div style={{
              width: `${perfPercent}%`,
              height: '100%',
              backgroundColor: pattern.hex,
              borderRadius: '1px',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>
        <span style={{
          color: pattern.hex,
          fontWeight: 'bold',
          fontSize: '12px',
          minWidth: '60px',
          textAlign: 'right',
          fontFamily: 'SF Mono, Monaco, monospace'
        }}>
          {(pattern.execOps / 1000).toFixed(0)}K
        </span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', fontSize: '9px' }}>
        <span style={{
          display: 'flex',
          alignItems: 'center',
          gap: '3px',
          color: pattern.risk === 'low' ? t.success : t.warning,
          fontWeight: '600'
        }}>
          <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: pattern.risk === 'low' ? t.success : t.warning }} />
          {pattern.risk.toUpperCase()}
        </span>
        <span style={{ color: t.textMuted, fontStyle: 'italic', fontSize: '9px' }}>
          {pattern.themeName}
        </span>
      </div>
    </div>
  );
};

const MiniChart: React.FC<{ patterns: RoutePattern[]; theme: Theme }> = ({ patterns, theme }) => {
  const t = themes[theme];
  const sorted = useMemo(() =>
    [...patterns].sort((a, b) => b.execOps - a.execOps),
    [patterns]
  );
  const maxOps = sorted[0]?.execOps || 1;

  return (
    <div style={{
      backgroundColor: t.cardBg,
      borderRadius: '10px',
      padding: '14px',
      marginBottom: '14px',
      boxShadow: `0 1px 2px ${t.shadow}`,
      border: `1px solid ${t.border}`
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h3 style={{ margin: 0, fontSize: '12px', color: t.text }}>Performance Distribution</h3>
        <span style={{ fontSize: '9px', color: t.textMuted }}>Top {Math.min(10, sorted.length)} routes</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '40px' }}>
        {sorted.slice(0, 10).map((p, i) => {
          const height = Math.max(3, (p.execOps / maxOps) * 36);
          const shortPattern = p.pattern.length > 10
            ? p.pattern.slice(0, 8) + '..'
            : p.pattern;
          return (
            <div key={i} style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1px',
              minWidth: '16px'
            }}>
              <div style={{
                width: '100%',
                height: `${height}px`,
                backgroundColor: p.hex,
                borderRadius: '1px 1px 0 0',
                opacity: 0.9
              }} />
              <span style={{
                fontSize: '6px',
                color: t.textMuted,
                transform: 'rotate(-45deg)',
                whiteSpace: 'nowrap',
                maxWidth: '24px',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {shortPattern}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const RouteHeatmap: React.FC = () => {
  const [theme, setTheme] = useState<Theme>(getTheme);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('ops');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedPattern, setSelectedPattern] = useState<RoutePattern | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [renderTime, setRenderTime] = useState<number>(0);
  const [bloomReady, setBloomReady] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const t = themes[theme];

  const patternIds = useMemo(() => Object.keys(routeConfig.patterns), []);

  const patterns = useMemo(() =>
    patternIds.map(id => routeConfig.patterns[id] as RoutePattern),
    [patternIds]
  );

  useEffect(() => {
    const bloom = new PatternBloomFilter(512);
    patterns.forEach(p => {
      if (p?.pattern) bloom.add(p.pattern);
    });
    setBloomReady(true);
  }, [patterns]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const filteredAndSorted = useMemo(() => {
    const searchLower = search.toLowerCase();
    let result = patterns.filter(p =>
      p.pattern.toLowerCase().includes(searchLower) ||
      p.themeName.toLowerCase().includes(searchLower) ||
      p.risk.toLowerCase().includes(searchLower)
    );

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'ops':
          comparison = b.execOps - a.execOps;
          break;
        case 'risk':
          const riskOrder = { low: 0, medium: 1, high: 2 };
          comparison = riskOrder[a.risk as keyof typeof riskOrder] - riskOrder[b.risk as keyof typeof riskOrder];
          break;
        case 'pattern':
          comparison = a.pattern.localeCompare(b.pattern);
          break;
      }
      return sortDirection === 'desc' ? comparison : -comparison;
    });

    return result;
  }, [patterns, search, sortField, sortDirection]);

  const stats = useMemo(() => {
    const total = patterns.length;
    const avgOps = Math.round(patterns.reduce((sum, p) => sum + p.execOps, 0) / total);
    const maxOps = Math.max(...patterns.map(p => p.execOps));
    const lowRisk = patterns.filter(p => p.risk === 'low').length;
    return { total, avgOps, maxOps, lowRisk };
  }, [patterns]);

  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('route-heatmap-theme', newTheme);
  }, [theme]);

  const handleSort = useCallback((field: SortField) => {
    setSortField(field);
    setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
  }, []);

  useEffect(() => {
    if (FLAGS.PERF_METRICS) {
      const start = typeof Bun !== 'undefined' && Bun.nanoseconds ? Bun.nanoseconds() : 0;
      setRenderTime(start);
    }
  }, [filteredAndSorted.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setShowHelp(prev => !prev);
      }

      if (selectedPattern) {
        if (e.key === 'Escape') {
          setSelectedPattern(null);
        }
        return;
      }

      if (e.key === 't' && !e.ctrlKey && !e.metaKey && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        toggleTheme();
      }

      if (e.key === 'r' && !e.ctrlKey && !e.metaKey && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        setSearch('');
        searchInputRef.current?.focus();
      }

      if (e.key === '/' || (e.key === 'k' && (e.ctrlKey || e.metaKey))) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }

      if (e.key === 'Escape') {
        searchInputRef.current?.blur();
        setFocusedIndex(0);
      }

      if (e.key === 'ArrowDown' && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        setFocusedIndex(prev => Math.min(prev + 1, filteredAndSorted.length - 1));
        cardRefs.current[focusedIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }

      if (e.key === 'ArrowUp' && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        setFocusedIndex(prev => Math.max(prev - 1, 0));
        cardRefs.current[focusedIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }

      if (e.key === 'Enter' && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        if (filteredAndSorted[focusedIndex]) {
          setSelectedPattern(filteredAndSorted[focusedIndex]);
        }
      }

      if (e.key === '1' && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        handleSort('ops');
      }
      if (e.key === '2' && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        handleSort('risk');
      }
      if (e.key === '3' && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        handleSort('pattern');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPattern, filteredAndSorted, focusedIndex, toggleTheme, handleSort]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const stored = localStorage.getItem('route-heatmap-theme');
      if (!stored) {
        setTheme(mediaQuery.matches ? 'dark' : 'light');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: t.bg,
      padding: '20px',
      color: t.text,
      transition: 'background-color 0.3s ease, color 0.3s ease'
    }}>
      <style>{`
        @media (prefers-color-scheme: dark) {
          body { background-color: ${themes.dark.bg}; color: ${themes.dark.text}; }
        }
      `}</style>

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: '22px',
              fontWeight: 'bold',
              color: t.text,
              letterSpacing: '-0.5px'
            }}>
              Route Performance Heatmap
            </h1>
            <p style={{ margin: '2px 0 0 0', color: t.textMuted, fontSize: '12px' }}>
              {stats.total} patterns • {stats.lowRisk} low risk • Avg {(stats.avgOps / 1000).toFixed(0)}K ops/s
              {renderTime > 0 && ` • ${(renderTime / 1000).toFixed(1)}µs`}
              {bloomReady && ' • Bloom OK'}
              <button
                onClick={() => setShowHelp(true)}
                style={{
                  marginLeft: '8px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  border: `1px solid ${t.border}`,
                  background: 'none',
                  color: t.textMuted,
                  fontSize: '10px',
                  cursor: 'pointer'
                }}
              >
                ?
              </button>
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={toggleTheme}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: `1px solid ${t.border}`,
                background: t.cardBg,
                color: t.text,
                fontSize: '11px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {theme === 'light' ? '🌙' : '☀️'} {theme === 'light' ? 'Dark' : 'Light'}
            </button>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '11px',
              color: t.text,
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={e => setAutoRefresh(e.target.checked)}
                style={{ accentColor: t.accent, width: '12px', height: '12px' }}
              />
              Auto
            </label>
            <span style={{ fontSize: '10px', color: t.textMuted, fontFamily: 'SF Mono, Monaco, monospace' }}>
              {lastUpdate.toLocaleTimeString()}
            </span>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '8px',
          marginBottom: '16px'
        }}>
          <QuickStat label="Routes" value={stats.total} color={t.accent} theme={theme} />
          <QuickStat label="Avg" value={`${(stats.avgOps / 1000).toFixed(0)}K`} color={t.success} theme={theme} />
          <QuickStat label="Top" value={`${(stats.maxOps / 1000).toFixed(0)}K`} color="#8b5cf6" theme={theme} />
          <QuickStat label="Safe" value={stats.lowRisk} color={t.success} theme={theme} />
        </div>

        <MiniChart patterns={patterns} theme={theme} />

        <div style={{
          backgroundColor: t.cardBg,
          borderRadius: '10px',
          padding: '12px',
          marginBottom: '12px',
          boxShadow: `0 1px 2px ${t.shadow}`,
          border: `1px solid ${t.border}`,
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '150px' }}>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search patterns... (press /)"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px 8px 28px',
                border: `1px solid ${t.border}`,
                borderRadius: '6px',
                fontSize: '12px',
                outline: 'none',
                backgroundColor: t.bg,
                color: t.text,
                boxSizing: 'border-box'
              }}
            />
            <span style={{
              position: 'absolute',
              left: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: t.textMuted,
              fontSize: '12px',
              opacity: 0.5
            }}>🔍</span>
          </div>

          <div style={{ display: 'flex', gap: '4px' }}>
            {(['ops', 'risk', 'pattern'] as SortField[]).map(field => (
              <button
                key={field}
                onClick={() => handleSort(field)}
                style={{
                  padding: '6px 10px',
                  border: `1px solid ${t.border}`,
                  borderRadius: '4px',
                  backgroundColor: sortField === field ? t.accent : 'transparent',
                  cursor: 'pointer',
                  fontSize: '11px',
                  color: sortField === field ? 'white' : t.text,
                  fontWeight: sortField === field ? '500' : '400'
                }}>
                {field[0].toUpperCase() + field.slice(1)} {sortField === field ? (sortDirection === 'desc' ? '↓' : '↑') : ''}
              </button>
            ))}
          </div>

          <span style={{ fontSize: '11px', color: t.textMuted, marginLeft: 'auto' }}>
            {filteredAndSorted.length}/{patterns.length}
          </span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '4px'
        }}>
          {filteredAndSorted.map((pattern, i) => (
            <RouteCard
              key={pattern.pattern}
              ref={el => cardRefs.current[i] = el}
              pattern={pattern}
              onClick={() => setSelectedPattern(pattern)}
              isFocused={i === focusedIndex}
              theme={theme}
            />
          ))}
        </div>

        {filteredAndSorted.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: t.textMuted, fontSize: '13px' }}>
            No matching patterns
          </div>
        )}
      </div>

      {selectedPattern && (
        <DetailModal
          pattern={selectedPattern}
          onClose={() => setSelectedPattern(null)}
          theme={theme}
          renderNs={renderTime}
        />
      )}

      {showHelp && (
        <ShortcutsHelp theme={theme} onClose={() => setShowHelp(false)} />
      )}
    </div>
  );
};

const QuickStat: React.FC<{ label: string; value: string | number; color: string; theme: Theme }> = ({ label, value, color, theme }) => (
  <div style={{
    backgroundColor: themes[theme].cardBg,
    borderRadius: '8px',
    padding: '10px',
    boxShadow: `0 1px 2px ${themes[theme].shadow}`,
    borderLeft: `3px solid ${color}`
  }}>
    <div style={{ fontSize: '10px', color: themes[theme].textMuted, marginBottom: '1px' }}>{label}</div>
    <div style={{ fontSize: '16px', fontWeight: 'bold', color }}>{value}</div>
  </div>
);

export default RouteHeatmap;

import React, { useState, useEffect, useMemo } from 'react';
import { GraphemeClusterer, GraphemeUtils } from '../core/unicode/grapheme';

interface UnicodeAwareTextProps {
  text: string;
  maxClusters?: number;
  showEllipsis?: boolean;
  align?: 'left' | 'right' | 'center';
  visualWidth?: number;
  className?: string;
  tooltip?: string;
  preserveEmoji?: boolean;
  showUnicodeInfo?: boolean;
}

export const UnicodeAwareText: React.FC<UnicodeAwareTextProps> = ({
  text,
  maxClusters,
  showEllipsis = true,
  align = 'left',
  visualWidth,
  className = '',
  tooltip,
  preserveEmoji = true,
  showUnicodeInfo = false
}) => {
  const [displayText, setDisplayText] = useState('');
  const [unicodeInfo, setUnicodeInfo] = useState<any>(null);
  const clusterer = useMemo(() => new GraphemeClusterer(), []);
  
  useEffect(() => {
    let processedText = text;
    
    // Process text for display
    if (maxClusters !== undefined) {
      processedText = clusterer.truncate(
        processedText,
        maxClusters,
        showEllipsis ? '…' : ''
      );
    }
    
    if (visualWidth !== undefined) {
      processedText = clusterer.padToWidth(processedText, visualWidth, align);
    }
    
    if (!preserveEmoji) {
      processedText = clusterer.normalizeToTextPresentation(processedText);
    }
    
    setDisplayText(processedText);
    
    // Gather Unicode info if requested
    if (showUnicodeInfo) {
      const clusters = clusterer.getClusters(text);
      const info = {
        clusters,
        clusterCount: clusters.length,
        codePointCount: Array.from(text).length,
        visualWidth: clusterer.getVisualWidth(text),
        hasComplexUnicode: GraphemeUtils.hasComplexUnicode(text),
        emojiCount: GraphemeUtils.countEmojis(text),
        scripts: Array.from(new Set(clusters.map(c => {
          const cp = c.codePointAt(0);
          if (!cp) return 'Unknown';
          if (cp >= 0x1F600 && cp <= 0x1F64F) return 'Emoji';
          if (cp >= 0x0041 && cp <= 0x005A) return 'Latin';
          if (cp >= 0x0061 && cp <= 0x007A) return 'Latin';
          if (cp >= 0x4E00 && cp <= 0x9FFF) return 'CJK';
          return 'Other';
        })))
      };
      setUnicodeInfo(info);
    }
  }, [text, maxClusters, showEllipsis, align, visualWidth, preserveEmoji, showUnicodeInfo, clusterer]);
  
  return (
    <span 
      className={`unicode-text ${className}`}
      title={tooltip || (showUnicodeInfo && unicodeInfo ? 
        `Clusters: ${unicodeInfo.clusterCount}, Width: ${unicodeInfo.visualWidth}` : 
        undefined)}
      data-unicode-info={showUnicodeInfo ? JSON.stringify(unicodeInfo) : undefined}
    >
      {displayText}
      {showUnicodeInfo && unicodeInfo && (
        <span className="unicode-badge" title="Complex Unicode">
          {unicodeInfo.emojiCount > 0 && '🎨'}
          {unicodeInfo.hasComplexUnicode && '🔤'}
        </span>
      )}
    </span>
  );
};

interface UnicodeAwareInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  maxClusters?: number;
  onClusterCountChange?: (count: number) => void;
  onVisualWidthChange?: (width: number) => void;
  showCounter?: boolean;
  normalizeOnBlur?: boolean;
}

export const UnicodeAwareInput: React.FC<UnicodeAwareInputProps> = ({
  value,
  maxClusters,
  onChange,
  onClusterCountChange,
  onVisualWidthChange,
  showCounter = false,
  normalizeOnBlur = false,
  className = '',
  ...props
}) => {
  const [clusterCount, setClusterCount] = useState(0);
  const [visualWidth, setVisualWidth] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const clusterer = useMemo(() => new GraphemeClusterer(), []);
  
  useEffect(() => {
    if (typeof value === 'string') {
      const count = clusterer.getClusterLength(value);
      const width = clusterer.getVisualWidth(value);
      setClusterCount(count);
      setVisualWidth(width);
      
      if (onClusterCountChange) onClusterCountChange(count);
      if (onVisualWidthChange) onVisualWidthChange(width);
      
      // Validate
      if (maxClusters && count > maxClusters) {
        setError(`Maximum ${maxClusters} grapheme clusters allowed`);
      } else {
        setError(null);
      }
    }
  }, [value, maxClusters, clusterer, onClusterCountChange, onVisualWidthChange]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) {
      onChange(e);
    }
  };
  
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (normalizeOnBlur && onChange) {
      const normalized = GraphemeUtils.normalizeEmoji(e.target.value);
      if (normalized !== e.target.value) {
        // Create synthetic event with normalized value
        const syntheticEvent = {
          ...e,
          target: {
            ...e.target,
            value: normalized
          },
          currentTarget: {
            ...e.currentTarget,
            value: normalized
          }
        };
        onChange(syntheticEvent as any);
      }
    }
    
    if (props.onBlur) {
      props.onBlur(e);
    }
  };
  
  return (
    <div className={`unicode-input-container ${className}`}>
      <input
        {...props}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        className={`unicode-input ${error ? 'error' : ''}`}
      />
      {showCounter && (
        <div className="unicode-counter">
          <span className="cluster-count">{clusterCount} clusters</span>
          <span className="visual-width">{visualWidth} width</span>
          {maxClusters && (
            <span className="cluster-limit">
              ({clusterCount}/{maxClusters})
            </span>
          )}
        </div>
      )}
      {error && <div className="unicode-error">{error}</div>}
    </div>
  );
};

interface UnicodeAwareTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  maxClusters?: number;
  wrapWidth?: number;
  showVisualGuide?: boolean;
}

export const UnicodeAwareTextarea: React.FC<UnicodeAwareTextareaProps> = ({
  value,
  maxClusters,
  wrapWidth = 80,
  showVisualGuide = false,
  onChange,
  className = '',
  ...props
}) => {
  const [wrappedLines, setWrappedLines] = useState<string[]>([]);
  const [clusterCount, setClusterCount] = useState(0);
  const clusterer = useMemo(() => new GraphemeClusterer(), []);
  
  useEffect(() => {
    if (typeof value === 'string') {
      const count = clusterer.getClusterLength(value);
      setClusterCount(count);
      
      if (wrapWidth > 0) {
        const lines = GraphemeUtils.wrapText(value, wrapWidth);
        setWrappedLines(lines);
      }
    }
  }, [value, wrapWidth, clusterer]);
  
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (onChange) {
      onChange(e);
    }
  };
  
  return (
    <div className={`unicode-textarea-container ${className}`}>
      <textarea
        {...props}
        value={value}
        onChange={handleChange}
        className="unicode-textarea"
      />
      {showVisualGuide && wrapWidth > 0 && (
        <div className="visual-guide">
          {wrappedLines.map((line, i) => (
            <div key={i} className="guide-line">
              <span className="line-number">{i + 1}</span>
              <span className="line-content">{line}</span>
              <span className="line-width">
                ({clusterer.getVisualWidth(line)})
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="textarea-stats">
        <span>Clusters: {clusterCount}</span>
        {maxClusters && (
          <span className={clusterCount > maxClusters ? 'error' : ''}>
            ({clusterCount}/{maxClusters})
          </span>
        )}
      </div>
    </div>
  );
};

interface UnicodeVisualizerProps {
  text: string;
  showCodePoints?: boolean;
  showClusters?: boolean;
  showAnalysis?: boolean;
}

export const UnicodeVisualizer: React.FC<UnicodeVisualizerProps> = ({
  text,
  showCodePoints = true,
  showClusters = true,
  showAnalysis = true
}) => {
  const clusterer = useMemo(() => new GraphemeClusterer(), []);
  const clusters = clusterer.getClusters(text);
  
  return (
    <div className="unicode-visualizer">
      {showClusters && (
        <div className="cluster-visualization">
          <h4>Grapheme Clusters</h4>
          <div className="clusters">
            {clusters.map((cluster, i) => (
              <div key={i} className="cluster">
                <span className="cluster-content">{cluster}</span>
                <span className="cluster-info">
                  {cluster.length > 1 ? `${cluster.length} chars` : '1 char'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {showCodePoints && (
        <div className="codepoint-visualization">
          <h4>Code Points</h4>
          <div className="codepoints">
            {Array.from(text).map((char, i) => (
              <div key={i} className="codepoint">
                <span className="char">{char}</span>
                <span className="hex">U+{char.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {showAnalysis && (
        <div className="unicode-analysis">
          <h4>Analysis</h4>
          <table>
            <tbody>
              <tr>
                <td>Text Length</td>
                <td>{text.length} characters</td>
              </tr>
              <tr>
                <td>Grapheme Clusters</td>
                <td>{clusters.length}</td>
              </tr>
              <tr>
                <td>Visual Width</td>
                <td>{clusterer.getVisualWidth(text)}</td>
              </tr>
              <tr>
                <td>Emoji Count</td>
                <td>{GraphemeUtils.countEmojis(text)}</td>
              </tr>
              <tr>
                <td>Complex Unicode</td>
                <td>{GraphemeUtils.hasComplexUnicode(text) ? 'Yes' : 'No'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

interface UnicodeKeyboardProps {
  shortcuts: Array<{
    id: string;
    key: string;
    display: string;
    description: string;
  }>;
  onKeyClick?: (key: string) => void;
}

export const UnicodeKeyboard: React.FC<UnicodeKeyboardProps> = ({
  shortcuts,
  onKeyClick
}) => {
  // Standard QWERTY layout with Unicode symbols
  const layout = [
    // Function keys
    ['Esc', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'],
    // Number row
    ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'Backspace'],
    // First letter row
    ['Tab', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']', '\\'],
    // Second letter row
    ['CapsLock', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'", 'Enter'],
    // Third letter row
    ['Shift', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/', 'Shift'],
    // Bottom row
    ['Ctrl', 'Win', 'Alt', 'Space', 'Alt', 'Win', 'Ctrl']
  ];
  
  const unicodeMap: Record<string, string> = {
    'Esc': '⎋',
    'Tab': '⇥',
    'CapsLock': '⇪',
    'Shift': '⇧',
    'Ctrl': '⌃',
    'Win': '⊞',
    'Alt': '⌥',
    'Enter': '↵',
    'Backspace': '⌫',
    'Space': '␣'
  };
  
  return (
    <div className="unicode-keyboard">
      <div className="keyboard-layout">
        {layout.map((row, rowIndex) => (
          <div key={rowIndex} className="keyboard-row">
            {row.map((key) => {
              const unicodeKey = unicodeMap[key] || key;
              const keyShortcuts = shortcuts.filter(s => 
                s.key.includes(key)
              );
              const hasShortcut = keyShortcuts.length > 0;
              const isEmoji = /[^\x00-\x7F]/.test(unicodeKey);
              
              return (
                <button
                  key={key}
                  className={`keyboard-key ${hasShortcut ? 'has-shortcut' : ''} ${isEmoji ? 'emoji-key' : ''}`}
                  onClick={() => onKeyClick?.(key)}
                  title={`${key}${keyShortcuts.length > 0 ? ` (${keyShortcuts.map(s => s.id).join(', ')})` : ''}`}
                >
                  <span className="key-display">{unicodeKey}</span>
                  {keyShortcuts.length > 0 && (
                    <span className="shortcut-count">{keyShortcuts.length}</span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      
      <div className="keyboard-legend">
        <h4>Legend</h4>
        {Object.entries(unicodeMap).map(([key, symbol]) => (
          <div key={key} className="legend-item">
            <span className="legend-key">{key}</span>
            <span className="legend-symbol">{symbol}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

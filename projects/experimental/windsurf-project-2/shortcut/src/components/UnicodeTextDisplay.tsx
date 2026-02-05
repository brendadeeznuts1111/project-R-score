// src/components/UnicodeTextDisplay.tsx
import React, { useState, useMemo } from 'react';
import { 
  createGraphemeSegmenter, 
  getGraphemeCount, 
  truncateText, 
  type GraphemeCluster 
} from '../utils/graphemeCluster';

interface UnicodeTextDisplayProps {
  text: string;
  maxLength?: number;
  showClusters?: boolean;
  showAnalysis?: boolean;
  className?: string;
}

export function UnicodeTextDisplay({ 
  text, 
  maxLength, 
  showClusters = false, 
  showAnalysis = false,
  className = ''
}: UnicodeTextDisplayProps) {
  const [showFullText, setShowFullText] = useState(false);
  const segmenter = useMemo(() => createGraphemeSegmenter(), []);
  
  const clusters = useMemo(() => {
    return segmenter.segment(text);
  }, [segmenter, text]);
  
  const displayText = useMemo(() => {
    if (!maxLength || showFullText) {
      return text;
    }
    return truncateText(text, maxLength);
  }, [text, maxLength, showFullText]);
  
  const graphemeCount = useMemo(() => {
    return getGraphemeCount(text);
  }, [text]);
  
  const isTruncated = maxLength && graphemeCount > maxLength && !showFullText;
  
  return (
    <div className={`unicode-text-display ${className}`}>
      {/* Main text display */}
      <div className="text-content">
        <span className="text">{displayText}</span>
        {isTruncated && (
          <button 
            className="expand-button"
            onClick={() => setShowFullText(true)}
            aria-label="Show full text"
          >
            …
          </button>
        )}
        {showFullText && maxLength && graphemeCount > maxLength && (
          <button 
            className="collapse-button"
            onClick={() => setShowFullText(false)}
            aria-label="Collapse text"
          >
            ‹
          </button>
        )}
      </div>
      
      {/* Grapheme cluster visualization */}
      {showClusters && (
        <div className="cluster-visualization">
          <div className="cluster-header">
            <span className="cluster-count">Graphemes: {graphemeCount}</span>
            <span className="char-count">Chars: {text.length}</span>
          </div>
          <div className="cluster-list">
            {clusters.map((cluster, index) => (
              <div key={index} className="cluster-item">
                <span className="cluster-index">{index}</span>
                <span className="cluster-char">{cluster.cluster}</span>
                <span className="cluster-info">
                  {cluster.isEmoji && <span className="tag emoji">🎨</span>}
                  {cluster.isCombining && <span className="tag combining">◌</span>}
                  <span className="width">W{cluster.displayWidth}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Detailed analysis */}
      {showAnalysis && (
        <div className="text-analysis">
          <h4>Unicode Analysis</h4>
          <div className="analysis-grid">
            <div className="analysis-item">
              <span className="label">Grapheme Count:</span>
              <span className="value">{graphemeCount}</span>
            </div>
            <div className="analysis-item">
              <span className="label">Character Count:</span>
              <span className="value">{text.length}</span>
            </div>
            <div className="analysis-item">
              <span className="label">Display Width:</span>
              <span className="value">{clusters.reduce((sum, c) => sum + c.displayWidth, 0)}</span>
            </div>
            <div className="analysis-item">
              <span className="label">Emoji Count:</span>
              <span className="value">{clusters.filter(c => c.isEmoji).length}</span>
            </div>
            <div className="analysis-item">
              <span className="label">Combining Sequences:</span>
              <span className="value">{clusters.filter(c => c.isCombining).length}</span>
            </div>
          </div>
          
          <div className="code-points">
            <h5>Code Points</h5>
            <div className="code-point-list">
              {clusters.map((cluster, index) => (
                <div key={index} className="code-point-group">
                  <span className="cluster-char">{cluster.cluster}</span>
                  <div className="code-points">
                    {cluster.codePoints.map(cp => (
                      <span key={cp} className="code-point">
                        U+{cp.toString(16).toUpperCase().padStart(4, '0')}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Demo component showing various Unicode text examples
export function UnicodeTextDemo() {
  const [selectedExample, setSelectedExample] = useState(0);
  
  const examples = [
    {
      title: "Basic Text",
      text: "Hello, World!",
      description: "Simple ASCII text"
    },
    {
      title: "Emoji",
      text: "👍🏽🎉🚀💻",
      description: "Emoji with skin tone modifiers"
    },
    {
      title: "Combining Marks",
      text: "e\u0301 a\u0300 o\u0302",
      description: "Letters with combining diacritical marks"
    },
    {
      title: "Complex Unicode",
      text: "👨‍👩‍👧‍👦🇺🇸Café naïve résumé",
      description: "Family emoji, flag, accented characters"
    },
    {
      title: "Mathematical",
      text: "∑∏∫∆∇∂√∞≈≠≤≥",
      description: "Mathematical symbols"
    },
    {
      title: "Mixed Script",
      text: "Hello 你好 こんにちは 안녕하세요 مرحبا",
      description: "Multiple writing systems"
    },
    {
      title: "Zalgo Text",
      text: "H̴e̵l̴l̵o̴ ̵W̵o̴r̵l̴d̵",
      description: "Text with excessive combining marks"
    }
  ];
  
  const currentExample = examples[selectedExample];
  
  return (
    <div className="unicode-text-demo">
      <div className="demo-header">
        <h2>🌐 Unicode Text Display with Grapheme Clustering</h2>
        <p>Proper handling of complex Unicode text including emoji, combining marks, and multi-script content</p>
      </div>
      
      <div className="example-selector">
        <label>Select Example:</label>
        <div className="example-buttons">
          {examples.map((example, index) => (
            <button
              key={index}
              className={`example-btn ${selectedExample === index ? 'active' : ''}`}
              onClick={() => setSelectedExample(index)}
            >
              {example.title}
            </button>
          ))}
        </div>
      </div>
      
      <div className="current-example">
        <div className="example-info">
          <h3>{currentExample.title}</h3>
          <p>{currentExample.description}</p>
        </div>
        
        <div className="example-display">
          <div className="display-section">
            <h4>Truncated (10 graphemes)</h4>
            <UnicodeTextDisplay 
              text={currentExample.text} 
              maxLength={10}
              className="truncated-display"
            />
          </div>
          
          <div className="display-section">
            <h4>Full Text with Clusters</h4>
            <UnicodeTextDisplay 
              text={currentExample.text} 
              showClusters={true}
              className="full-display"
            />
          </div>
          
          <div className="display-section">
            <h4>Detailed Analysis</h4>
            <UnicodeTextDisplay 
              text={currentExample.text} 
              showAnalysis={true}
              className="analysis-display"
            />
          </div>
        </div>
      </div>
      
      <div className="demo-footer">
        <div className="feature-list">
          <div className="feature">
            <span className="feature-icon">🎯</span>
            <span>Accurate grapheme counting with Intl.Segmenter</span>
          </div>
          <div className="feature">
            <span className="feature-icon">🔄</span>
            <span>Fallback support for older environments</span>
          </div>
          <div className="feature">
            <span className="feature-icon">📏</span>
            <span>Proper text truncation by graphemes</span>
          </div>
          <div className="feature">
            <span className="feature-icon">🔍</span>
            <span>Detailed Unicode analysis and visualization</span>
          </div>
        </div>
      </div>
    </div>
  );
}

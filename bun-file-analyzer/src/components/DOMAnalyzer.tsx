import React, { useRef, useEffect, useState } from 'react';
import { useDOMAnalysis, getElementsByTagName, countElementsByTagName } from '../utils/dom-helpers';

export const DOMAnalyzer = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [domStats, setDomStats] = useState<any>(null);
  const { analyzeDOM } = useDOMAnalysis(containerRef);

  // Analyze DOM when component mounts or updates
  useEffect(() => {
    const stats = analyzeDOM();
    setDomStats(stats);
  }, []);

  // Function to demonstrate direct usage of parent.getElementsByTagName
  const handleDirectAnalysis = () => {
    if (!containerRef.current) return;
    
    const parent = containerRef.current;
    
    // Direct usage of parent.getElementsByTagName
    const allDivs = getElementsByTagName(parent, 'div');
    const allButtons = getElementsByTagName(parent, 'button');
    const allSpans = getElementsByTagName(parent, 'span');
    
    console.log('Direct getElementsByTagName results:');
    console.log('All divs:', allDivs);
    console.log('All buttons:', allButtons);
    console.log('All spans:', allSpans);
    console.log('Number of divs:', countElementsByTagName(parent, 'div'));
    
    // Convert HTMLCollection to array for easier manipulation
    const divArray = Array.from(allDivs);
    const buttonArray = Array.from(allButtons);
    
    alert(`Found ${divArray.length} divs and ${buttonArray.length} buttons!`);
  };

  return (
    <div ref={containerRef} style={{ padding: '2rem', border: '2px solid #3b82f6', borderRadius: '8px' }}>
      <h2 style={{ color: '#3b82f6', marginBottom: '1rem' }}>
        📋 DOM Analyzer with parent.getElementsByTagName
      </h2>
      
      <div style={{ marginBottom: '1rem' }}>
        <p>This component demonstrates using <code>parent.getElementsByTagName</code></p>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <button 
          onClick={handleDirectAnalysis}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Analyze DOM Elements
        </button>
        
        <button 
          onClick={() => setDomStats(analyzeDOM())}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#22c55e',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Refresh Stats
        </button>
      </div>

      {domStats && (
        <div style={{ 
          padding: '1rem', 
          backgroundColor: '#f3f4f6', 
          borderRadius: '4px',
          marginBottom: '1rem'
        }}>
          <h3 style={{ marginBottom: '0.5rem' }}>DOM Statistics:</h3>
          <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
            <li>Total divs: {domStats.totalDivs}</li>
            <li>Total buttons: {domStats.totalButtons}</li>
            <li>Total inputs: {domStats.totalInputs}</li>
          </ul>
        </div>
      )}

      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#fef3c7', borderRadius: '4px' }}>
        <h4 style={{ marginBottom: '0.5rem' }}>Example Elements for Analysis:</h4>
        <div>This is a div element</div>
        <span>This is a span element</span>
        <div>
          <input type="text" placeholder="Sample input" style={{ marginRight: '0.5rem' }} />
          <button>Sample Button</button>
        </div>
      </div>

      <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
        <strong>Code Example:</strong>
        <pre style={{ 
          backgroundColor: '#1f2937', 
          color: '#f3f4f6', 
          padding: '1rem', 
          borderRadius: '4px',
          overflowX: 'auto',
          marginTop: '0.5rem'
        }}>
{`// Direct usage of parent.getElementsByTagName
const parent = containerRef.current;
const allDivs = parent.getElementsByTagName('div');
const allButtons = parent.getElementsByTagName('button');

// Convert to array for manipulation
const divArray = Array.from(allDivs);
const buttonCount = allButtons.length;`}
        </pre>
      </div>
    </div>
  );
};

import React from 'react';

// This demonstrates the JSX syntax error fix
// The original error was: The character "}" is not valid inside a JSX element
// This happens when you have stray closing braces in JSX

const BAD_JSX = `
  <div>
    <h1>Title</h1>
    {/* This would cause the error - stray closing brace */}
    <p>Content</p>
    }  // <- This stray brace causes the error
  </div>
`;

const GOOD_JSX = `
  <div>
    <h1>Title</h1>
    {/* Correct JSX - no stray braces */}
    <p>Content</p>
  </div>
`;

interface JsxFixDemoProps {
  showMessage?: boolean;
}

export const JsxFixDemo: React.FC<JsxFixDemoProps> = ({ showMessage = true }) => {
  const items = ['Item 1', 'Item 2', 'Item 3'];
  
  return (
    <div className="jsx-fix-demo">
      <h2>JSX Syntax Fix Demo</h2>
      
      {showMessage && (
        <p>This demonstrates proper JSX syntax without stray braces.</p>
      )}
      
      <section>
        <h3>Correct JSX Mapping:</h3>
        {items.map((item, index) => (
          <div key={index} className="demo-item">
            {item}
          </div>
        ))}
      </section>
      
      <section>
        <h3>Conditional Rendering:</h3>
        {showMessage ? (
          <div>Message is shown</div>
        ) : (
          <div>Message is hidden</div>
        )}
      </section>
    </div>
  );
};

export default JsxFixDemo;

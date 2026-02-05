import React from 'react';
import { createRoot } from 'react-dom/client';
import ExampleComponent from './example-component';
import JsxFixDemo from './jsx-fix-demo';

// Main application entry point
const App: React.FC = () => {
  return (
    <div className="app">
      <header>
        <h1>Bun-Powered Dashboard</h1>
        <p>Successfully migrated from Vite to Bun!</p>
      </header>
      
      <main>
        <ExampleComponent 
          title="Example Component" 
          items={['Bun is fast', 'No Vite needed', 'JSX works perfectly']} 
        />
        
        <JsxFixDemo showMessage={true} />
      </main>
      
      <footer>
        <p>Built with Bun v1.3.5</p>
      </footer>
    </div>
  );
};

// Initialize the React app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
} else {
  console.error('Root element not found');
}

export default App;

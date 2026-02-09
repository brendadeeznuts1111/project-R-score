
import React, { useState } from 'react';

function App() {
  const [count, setCount] = useState(0);
  
  return (
    <div>
      <h1>Bun 1.3.8 Fast Refresh</h1>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}

export default App;
      
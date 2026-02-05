console.log("Running with --smol flag");
console.log("This reduces memory usage at the cost of performance");

// Demonstrate TypeScript/JSX functionality
const data = Array.from({ length: 1000 }, (_, i) => ({ id: i, name: `item-${i}` }));
console.log(`Processed ${data.length} items`);

// JSX-like object
const element = {
  type: 'div',
  props: { children: 'Hello from TSX with --smol' }
};
console.log('Element:', element);

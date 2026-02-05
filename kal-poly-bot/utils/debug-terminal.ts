console.log('Bun available:', typeof Bun !== 'undefined');
console.log('Bun.Terminal type:', typeof Bun?.Terminal);
console.log('Bun.Terminal exists:', 'Terminal' in Bun);
console.log('Bun.Terminal constructor:', Bun?.Terminal);
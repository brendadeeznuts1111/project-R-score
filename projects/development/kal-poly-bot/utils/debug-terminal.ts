console.info('Bun available:', typeof Bun !== 'undefined');
console.info('Bun.Terminal type:', typeof Bun?.Terminal);
console.info('Bun.Terminal exists:', 'Terminal' in Bun);
console.info('Bun.Terminal constructor:', Bun?.Terminal);
self.onmessage = () => {
  // Intentional test fixture: the caller must terminate a worker that never
  // yields or replies. This file is never imported by production code.
  while (true) {
    // Keep the worker isolate occupied until Worker.terminate() disposes it.
  }
};

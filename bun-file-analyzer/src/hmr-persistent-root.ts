import { createRoot, Root } from "react-dom/client";

let hmrRoot: Root | null = null;

export function getHMRPersistentRoot(container: Element | null): Root {
  if (!container) {
    throw new Error("Container element is required");
  }
  
  if (!hmrRoot) {
    hmrRoot = createRoot(container);
  }
  
  return hmrRoot;
}

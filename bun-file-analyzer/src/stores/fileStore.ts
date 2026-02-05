import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AnalyzedFile {
  id: string;
  name: string;
  signature: string;
  metadata: Record<string, unknown>;
  hash: string;
  size: number;
}

interface FileStore {
  files: AnalyzedFile[];
  currentFile: string | null;
  addFile: (file: AnalyzedFile) => void;
  setCurrentFile: (id: string) => void;
}

const hotData: Partial<{ fileStore: FileStore }> = (import.meta.hot?.data ?? {});

export const useFileStore = create<FileStore>()(
  persist(
    (set, get) => ({
      files: hotData.fileStore?.files ?? [],
      currentFile: hotData.fileStore?.currentFile ?? null,
      addFile: (file) => set((state) => ({ files: [...state.files, file] })),
      setCurrentFile: (id) => set({ currentFile: id }),
    }),
    {
      name: "file-analyzer-storage",
      onRehydrateStorage: () => (state) => {
        if (import.meta.hot) {
          import.meta.hot.data.fileStore = state;
        }
      },
    }
  )
);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    import.meta.hot.data.fileStore = useFileStore.getState();
  });
  import.meta.hot.accept(() => {
    console.log("[HMR] Store updated");
  });
}

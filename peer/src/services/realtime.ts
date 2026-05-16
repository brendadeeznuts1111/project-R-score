export type PollerHandle = {
  start(): void;
  stop(): void;
};

export function createPoller(
  task: () => Promise<void>,
  intervalMs: number,
): PollerHandle {
  let timer: number | null = null;

  const run = async (): Promise<void> => {
    await task();
  };

  return {
    start() {
      if (timer !== null) return;
      void run();
      timer = window.setInterval(() => {
        void run();
      }, intervalMs);
    },
    stop() {
      if (timer !== null) {
        window.clearInterval(timer);
        timer = null;
      }
    },
  };
}

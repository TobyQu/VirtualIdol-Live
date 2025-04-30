
interface ElectronAPI {
  getBackendStatus: () => Promise<{ ready: boolean }>;
  onBackendReady: (callback: () => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};

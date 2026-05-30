// ============================================================
// VS Code API Bridge — typed messaging helpers
// ============================================================

interface VsCodeApi {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}

// Declare the function VS Code injects into the webview
declare function acquireVsCodeApi(): VsCodeApi;

class VsCodeBridge {
  private api: VsCodeApi;

  constructor() {
    this.api = acquireVsCodeApi();
  }

  /** Post a typed message to the extension host. */
  postMessage(message: { type: string; payload?: unknown }): void {
    this.api.postMessage(message);
  }

  /** Save state that persists across webview visibility changes. */
  setState(state: unknown): void {
    this.api.setState(state);
  }

  /** Get previously saved state. */
  getState<T>(): T | undefined {
    return this.api.getState() as T | undefined;
  }
}

// Singleton instance
export const vscode = new VsCodeBridge();

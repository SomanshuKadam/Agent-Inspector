import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { AdapterManager } from "../adapters/AdapterManager";

export class SidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "aiContextInspector.sidebar";
  private _view?: vscode.WebviewView;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly adapterManager: AdapterManager
  ) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.extensionUri, "webview-ui", "dist"),
      ],
    };

    webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage((message: any) => {
      void this.handleMessage(message);
    });

    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        this.sendTraceEvents();
      }
    });
  }

  public refreshData(): void {
    if (this._view?.visible) {
      this.sendTraceEvents();
    }
  }

  private async handleMessage(message: any): Promise<void> {
    switch (message.type) {
      case "ready":
      case "getTraceEvents":
        this.sendTraceEvents();
        break;

      case "getSettings":
        this.sendSettings();
        break;

      case "updateSettings":
        await this.updateSettings(message.payload || {});
        break;
    }
  }

  private sendTraceEvents(): void {
    const events = this.adapterManager.getTraceEvents();
    this.postMessage({ type: "traceEventsData", payload: { events } });
  }

  private sendSettings(): void {
    const config = vscode.workspace.getConfiguration("aiContextInspector");
    this.postMessage({
      type: "settingsData",
      payload: {
        autoDetectionEnabled: config.get("autoDetectionEnabled", true),
        refreshIntervalMs: config.get("refreshIntervalMs", 2000),
      },
    });
  }

  private async updateSettings(partial: Record<string, unknown>): Promise<void> {
    const config = vscode.workspace.getConfiguration("aiContextInspector");

    if (typeof partial.autoDetectionEnabled === "boolean") {
      await config.update(
        "autoDetectionEnabled",
        partial.autoDetectionEnabled,
        vscode.ConfigurationTarget.Global
      );
    }

    if (typeof partial.refreshIntervalMs === "number") {
      const refreshIntervalMs = Math.min(
        10000,
        Math.max(500, Math.round(partial.refreshIntervalMs))
      );
      await config.update(
        "refreshIntervalMs",
        refreshIntervalMs,
        vscode.ConfigurationTarget.Global
      );
    }

    this.sendSettings();
  }

  private postMessage(message: unknown): void {
    this._view?.webview.postMessage(message);
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    const distPath = vscode.Uri.joinPath(this.extensionUri, "webview-ui", "dist");
    const indexPath = path.join(distPath.fsPath, "index.html");

    if (!fs.existsSync(indexPath)) {
      return this.getFallbackHtml();
    }

    let html = fs.readFileSync(indexPath, "utf-8");
    html = html.replace(/(href|src)="\/([^"]*)"/g, (_match, attr, filePath) => {
      const uri = webview.asWebviewUri(vscode.Uri.joinPath(distPath, filePath));
      return `${attr}="${uri}?t=${Date.now()}"`;
    });

    const nonce = getNonce();
    const csp = [
      `default-src 'none'`,
      `style-src ${webview.cspSource} 'unsafe-inline'`,
      `script-src 'nonce-${nonce}' ${webview.cspSource} 'unsafe-inline'`,
      `font-src ${webview.cspSource}`,
      `img-src ${webview.cspSource} data:`,
    ].join("; ");

    html = html.replace("<head>", `<head>\n<meta http-equiv="Content-Security-Policy" content="${csp}">`);
    html = html.replace(/<script /g, `<script nonce="${nonce}" `);
    html = html.replace(/ crossorigin/g, "");

    return html;
  }

  private getFallbackHtml(): string {
    return `<!DOCTYPE html>
    <html lang="en">
    <head><meta charset="UTF-8"></head>
    <body><h3>⚙️ Build Required</h3><p>Run <code>cd webview-ui && npm install && npm run build</code></p></body>
    </html>`;
  }
}

function getNonce(): string {
  let text = "";
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}

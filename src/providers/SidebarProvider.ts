// ============================================================
// SidebarProvider — WebviewViewProvider for the React UI
// ============================================================
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import {
  ContextData,
  AnalysisData,
  Settings,
  DEFAULT_SETTINGS,
  WebviewToExtensionMessage,
} from "../types";
import { FileTracker } from "../services/FileTracker";
import { TokenEstimator } from "../services/TokenEstimator";
import { InfluenceScorer } from "../services/InfluenceScorer";
import { TimelineService } from "../services/TimelineService";
import { RulesService } from "../services/RulesService";
import { StorageService } from "../services/StorageService";

export class SidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "aiContextInspector.sidebar";

  private _view?: vscode.WebviewView;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly fileTracker: FileTracker,
    private readonly tokenEstimator: TokenEstimator,
    private readonly influenceScorer: InfluenceScorer,
    private readonly timelineService: TimelineService,
    private readonly rulesService: RulesService,
    private readonly storageService: StorageService
  ) {}

  /** Called by VS Code when the sidebar view needs to be resolved. */
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
        vscode.Uri.joinPath(this.extensionUri, "media"),
      ],
    };

    webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

    // Handle messages from the React UI
    webviewView.webview.onDidReceiveMessage(
      (message: WebviewToExtensionMessage) => {
        this.handleMessage(message);
      }
    );

    // Retain context when hidden
    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        this.sendContextData();
      }
    });
  }

  /** Send updated data when files change. */
  public refreshData(): void {
    if (this._view?.visible) {
      this.sendContextData();
    }
  }

  /** Handle incoming messages from the webview. */
  private handleMessage(message: WebviewToExtensionMessage): void {
    switch (message.type) {
      case "ready":
        this.sendContextData();
        this.sendFilesData();
        this.sendTimelineData();
        this.sendAnalysisData();
        this.sendSettingsData();
        this.sendRulesData();
        break;

      case "getContext":
        this.sendContextData();
        break;

      case "getFiles":
        this.sendFilesData();
        break;

      case "getTimeline":
        this.sendTimelineData();
        break;

      case "getAnalysis":
        this.sendAnalysisData();
        break;

      case "getSettings":
        this.sendSettingsData();
        break;

      case "getRules":
        this.sendRulesData();
        break;

      case "addRule":
        this.rulesService.addRule(message.payload.text);
        this.sendRulesData();
        this.sendFilesData(); // Rules affect influence scores
        break;

      case "editRule":
        this.rulesService.editRule(
          message.payload.id,
          message.payload.text,
          message.payload.enabled
        );
        this.sendRulesData();
        this.sendFilesData();
        break;

      case "deleteRule":
        this.rulesService.deleteRule(message.payload.id);
        this.sendRulesData();
        this.sendFilesData();
        break;

      case "updateSettings":
        this.updateSettings(message.payload);
        break;
    }
  }

  /** Get current settings from VS Code configuration. */
  private getSettings(): Settings {
    const config = vscode.workspace.getConfiguration("aiContextInspector");
    return {
      tokenModel: config.get<string>("tokenModel", DEFAULT_SETTINGS.tokenModel),
      warningThreshold: config.get<number>(
        "warningThreshold",
        DEFAULT_SETTINGS.warningThreshold
      ),
      historyRetentionDays: config.get<number>(
        "historyRetentionDays",
        DEFAULT_SETTINGS.historyRetentionDays
      ),
      timelineRetentionDays: config.get<number>(
        "timelineRetentionDays",
        DEFAULT_SETTINGS.timelineRetentionDays
      ),
    };
  }

  /** Update VS Code configuration settings. */
  private async updateSettings(partial: Partial<Settings>): Promise<void> {
    const config = vscode.workspace.getConfiguration("aiContextInspector");

    if (partial.tokenModel !== undefined) {
      await config.update("tokenModel", partial.tokenModel, true);
    }
    if (partial.warningThreshold !== undefined) {
      await config.update("warningThreshold", partial.warningThreshold, true);
    }
    if (partial.historyRetentionDays !== undefined) {
      await config.update(
        "historyRetentionDays",
        partial.historyRetentionDays,
        true
      );
    }
    if (partial.timelineRetentionDays !== undefined) {
      await config.update(
        "timelineRetentionDays",
        partial.timelineRetentionDays,
        true
      );
      this.timelineService.setRetentionDays(partial.timelineRetentionDays);
    }

    this.sendSettingsData();
    this.sendContextData();
    this.sendAnalysisData();
  }

  // ---- Data senders ----

  private sendContextData(): void {
    const settings = this.getSettings();
    const openFiles = this.fileTracker.getOpenFiles();
    const recentFiles = this.fileTracker.getRecentFiles();
    const openTokens = this.fileTracker.getOpenFilesTokens();
    const recentTokens = this.fileTracker.getRecentFilesTokens();
    const metaTokens = this.fileTracker.getWorkspaceMetadataTokens();
    const totalTokens = openTokens + recentTokens + metaTokens;
    const modelLimit = this.tokenEstimator.getModelLimit(settings.tokenModel);

    const data: ContextData = {
      workspaceName:
        vscode.workspace.workspaceFolders?.[0]?.name ?? "No Workspace",
      openFiles,
      recentFiles,
      totalTokens,
      contextUtilization: this.tokenEstimator.getUtilization(
        totalTokens,
        settings.tokenModel
      ),
      modelLimit,
      modelName: this.tokenEstimator.getModelDisplayName(settings.tokenModel),
    };

    this.postMessage({ type: "contextData", payload: data });
  }

  private sendFilesData(): void {
    const allFiles = this.fileTracker.getAllTrackedFiles();
    const rules = this.rulesService.getRules();
    const influential = this.influenceScorer.scoreFiles(allFiles, rules);

    this.postMessage({ type: "filesData", payload: { influential } });
  }

  private sendTimelineData(): void {
    const events = this.timelineService.getTodayEvents();
    this.postMessage({ type: "timelineData", payload: { events } });
  }

  private sendAnalysisData(): void {
    const settings = this.getSettings();
    const openTokens = this.fileTracker.getOpenFilesTokens();
    const recentTokens = this.fileTracker.getRecentFilesTokens();
    const metaTokens = this.fileTracker.getWorkspaceMetadataTokens();
    const totalTokens = openTokens + recentTokens + metaTokens;
    const modelLimit = this.tokenEstimator.getModelLimit(settings.tokenModel);
    const utilization = this.tokenEstimator.getUtilization(
      totalTokens,
      settings.tokenModel
    );

    const warnings: string[] = [];
    if (utilization >= settings.warningThreshold) {
      warnings.push(
        `Context utilization (${utilization}%) exceeds warning threshold (${settings.warningThreshold}%)`
      );
    }
    if (utilization >= 90) {
      warnings.push("Context may exceed model limits — consider closing unused files");
    }

    const data: AnalysisData = {
      openFilesTokens: openTokens,
      recentFilesTokens: recentTokens,
      workspaceMetadataTokens: metaTokens,
      totalTokens,
      modelLimit,
      modelName: this.tokenEstimator.getModelDisplayName(settings.tokenModel),
      utilization,
      warningThreshold: settings.warningThreshold,
      warnings,
    };

    this.postMessage({ type: "analysisData", payload: data });
  }

  private sendSettingsData(): void {
    this.postMessage({ type: "settingsData", payload: this.getSettings() });
  }

  private sendRulesData(): void {
    this.postMessage({
      type: "rulesData",
      payload: { rules: this.rulesService.getRules() },
    });
  }

  /** Post a message to the webview. */
  private postMessage(message: unknown): void {
    this._view?.webview.postMessage(message);
  }

  // ---- HTML generation ----

  /** Generate the HTML content for the webview. */
  private getHtmlForWebview(webview: vscode.Webview): string {
    const distPath = vscode.Uri.joinPath(
      this.extensionUri,
      "webview-ui",
      "dist"
    );

    // Read the Vite-built index.html
    const indexPath = path.join(distPath.fsPath, "index.html");

    if (!fs.existsSync(indexPath)) {
      return this.getFallbackHtml();
    }

    let html = fs.readFileSync(indexPath, "utf-8");

    // Replace asset paths with webview URIs
    // Vite outputs assets with relative paths like /assets/index-xxx.js
    html = html.replace(
      /(href|src)="\/([^"]*)"/g,
      (_match, attr, filePath) => {
        const uri = webview.asWebviewUri(
          vscode.Uri.joinPath(distPath, filePath)
        );
        return `${attr}="${uri}"`;
      }
    );

    // Add CSP
    const nonce = getNonce();
    const csp = [
      `default-src 'none'`,
      `style-src ${webview.cspSource} 'unsafe-inline'`,
      `script-src 'nonce-${nonce}'`,
      `font-src ${webview.cspSource}`,
      `img-src ${webview.cspSource} data:`,
    ].join("; ");

    html = html.replace(
      "<head>",
      `<head>\n<meta http-equiv="Content-Security-Policy" content="${csp}">`
    );

    // Add nonce to script tags
    html = html.replace(/<script /g, `<script nonce="${nonce}" `);

    return html;
  }

  /** Fallback HTML when the React build isn't available. */
  private getFallbackHtml(): string {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: var(--vscode-font-family);
          color: var(--vscode-foreground);
          padding: 20px;
          text-align: center;
        }
        .message { margin-top: 40px; opacity: 0.7; }
        code { background: var(--vscode-textCodeBlock-background); padding: 2px 6px; border-radius: 3px; }
      </style>
    </head>
    <body>
      <div class="message">
        <h3>⚙️ Build Required</h3>
        <p>The webview UI hasn't been built yet.</p>
        <p>Run <code>cd webview-ui && npm install && npm run build</code></p>
      </div>
    </body>
    </html>`;
  }
}

/** Generate a random nonce for CSP. */
function getNonce(): string {
  let text = "";
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}

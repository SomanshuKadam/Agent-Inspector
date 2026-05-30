// ============================================================
// FileTracker — Monitors file open/edit/close events
// ============================================================
import * as vscode from "vscode";
import * as path from "path";
import { FileInfo } from "../types";
import { TokenEstimator } from "./TokenEstimator";

export class FileTracker implements vscode.Disposable {
  private openFiles: Map<string, FileInfo> = new Map();
  private recentFiles: Map<string, FileInfo> = new Map();
  private disposables: vscode.Disposable[] = [];
  private tokenEstimator: TokenEstimator;
  private onDidChangeCallback?: () => void;

  /** Maximum number of recent (closed) files to track. */
  private static readonly MAX_RECENT_FILES = 50;

  constructor(tokenEstimator: TokenEstimator) {
    this.tokenEstimator = tokenEstimator;
    this.registerListeners();
    this.initializeOpenEditors();
  }

  /** Set a callback that fires when file state changes. */
  onDidChange(callback: () => void): void {
    this.onDidChangeCallback = callback;
  }

  /** Initialize tracking for already-open editors. */
  private initializeOpenEditors(): void {
    for (const editor of vscode.window.visibleTextEditors) {
      this.trackFileOpen(editor.document);
    }
    // Also track tabs
    for (const group of vscode.window.tabGroups.all) {
      for (const tab of group.tabs) {
        if (tab.input && typeof tab.input === "object" && "uri" in tab.input) {
          const uri = (tab.input as { uri: vscode.Uri }).uri;
          if (uri.scheme === "file" && !this.openFiles.has(uri.fsPath)) {
            this.trackFileOpenByUri(uri);
          }
        }
      }
    }
  }

  /** Register VS Code event listeners. */
  private registerListeners(): void {
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor) {
          this.trackFileOpen(editor.document);
        }
      }),

      vscode.workspace.onDidOpenTextDocument((doc) => {
        if (doc.uri.scheme === "file") {
          this.trackFileOpen(doc);
        }
      }),

      vscode.workspace.onDidChangeTextDocument((event) => {
        if (event.document.uri.scheme === "file" && event.contentChanges.length > 0) {
          this.trackFileEdit(event.document);
        }
      }),

      vscode.workspace.onDidCloseTextDocument((doc) => {
        if (doc.uri.scheme === "file") {
          this.trackFileClose(doc);
        }
      })
    );
  }

  /** Track a file being opened. */
  private trackFileOpen(doc: vscode.TextDocument): void {
    const filePath = doc.uri.fsPath;
    const existing = this.openFiles.get(filePath);

    if (existing) {
      existing.openCount += 1;
      existing.tokenEstimate = this.tokenEstimator.estimateTokens(
        doc.getText(),
        path.extname(filePath)
      );
    } else {
      // Remove from recent files if it was there
      this.recentFiles.delete(filePath);

      const info: FileInfo = {
        path: filePath,
        name: path.basename(filePath),
        extension: path.extname(filePath),
        openedAt: Date.now(),
        editCount: 0,
        openCount: 1,
        tokenEstimate: this.tokenEstimator.estimateTokens(
          doc.getText(),
          path.extname(filePath)
        ),
        influenceScore: 0,
      };
      this.openFiles.set(filePath, info);
    }

    this.notifyChange();
  }

  /** Track a file open by URI (when document isn't loaded yet). */
  private async trackFileOpenByUri(uri: vscode.Uri): Promise<void> {
    const filePath = uri.fsPath;
    if (this.openFiles.has(filePath)) {return;}

    try {
      const stat = await vscode.workspace.fs.stat(uri);
      const info: FileInfo = {
        path: filePath,
        name: path.basename(filePath),
        extension: path.extname(filePath),
        openedAt: Date.now(),
        editCount: 0,
        openCount: 1,
        tokenEstimate: this.tokenEstimator.estimateTokensFromSize(
          stat.size,
          path.extname(filePath)
        ),
        influenceScore: 0,
      };
      this.openFiles.set(filePath, info);
    } catch {
      // File might not exist or be inaccessible, skip
    }
  }

  /** Track a file being edited. */
  private trackFileEdit(doc: vscode.TextDocument): void {
    const filePath = doc.uri.fsPath;
    const existing = this.openFiles.get(filePath);

    if (existing) {
      existing.lastEditedAt = Date.now();
      existing.editCount += 1;
      existing.tokenEstimate = this.tokenEstimator.estimateTokens(
        doc.getText(),
        path.extname(filePath)
      );
    } else {
      // File might not be tracked yet, add it
      this.trackFileOpen(doc);
    }

    this.notifyChange();
  }

  /** Track a file being closed. */
  private trackFileClose(doc: vscode.TextDocument): void {
    const filePath = doc.uri.fsPath;
    const info = this.openFiles.get(filePath);

    if (info) {
      info.closedAt = Date.now();
      this.openFiles.delete(filePath);

      // Add to recent files
      this.recentFiles.set(filePath, info);

      // Trim recent files if exceeding max
      if (this.recentFiles.size > FileTracker.MAX_RECENT_FILES) {
        const oldest = Array.from(this.recentFiles.entries())
          .sort((a, b) => (a[1].closedAt ?? 0) - (b[1].closedAt ?? 0));
        for (let i = 0; i < oldest.length - FileTracker.MAX_RECENT_FILES; i++) {
          this.recentFiles.delete(oldest[i][0]);
        }
      }

      this.notifyChange();
    }
  }

  /** Notify that file state has changed. */
  private notifyChange(): void {
    this.onDidChangeCallback?.();
  }

  /** Get currently open files. */
  getOpenFiles(): FileInfo[] {
    return Array.from(this.openFiles.values());
  }

  /** Get recently closed files. */
  getRecentFiles(): FileInfo[] {
    return Array.from(this.recentFiles.values())
      .sort((a, b) => (b.closedAt ?? 0) - (a.closedAt ?? 0));
  }

  /** Get all tracked files (open + recent). */
  getAllTrackedFiles(): FileInfo[] {
    return [...this.getOpenFiles(), ...this.getRecentFiles()];
  }

  /** Get total token estimate for open files. */
  getOpenFilesTokens(): number {
    return this.getOpenFiles().reduce((sum, f) => sum + f.tokenEstimate, 0);
  }

  /** Get total token estimate for recent files. */
  getRecentFilesTokens(): number {
    return this.getRecentFiles().reduce((sum, f) => sum + f.tokenEstimate, 0);
  }

  /** Estimate workspace metadata tokens (project structure info). */
  getWorkspaceMetadataTokens(): number {
    // Rough estimate: workspace name + folder count + file count info
    const wsFolder = vscode.workspace.workspaceFolders;
    if (!wsFolder) {return 0;}
    // Estimate ~50 tokens per workspace folder for metadata
    return wsFolder.length * 50 + this.openFiles.size * 10;
  }

  dispose(): void {
    for (const d of this.disposables) {
      d.dispose();
    }
    this.disposables = [];
  }
}

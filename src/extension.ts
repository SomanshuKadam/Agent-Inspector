// ============================================================
// AI Context Inspector — Extension Entry Point
// ============================================================
import * as vscode from "vscode";
import * as path from "path";
import { SidebarProvider } from "./providers/SidebarProvider";
import { FileTracker } from "./services/FileTracker";
import { TokenEstimator } from "./services/TokenEstimator";
import { InfluenceScorer } from "./services/InfluenceScorer";
import { TimelineService } from "./services/TimelineService";
import { RulesService } from "./services/RulesService";
import { StorageService } from "./services/StorageService";
import { DEFAULT_SETTINGS } from "./types";

let fileTracker: FileTracker;
let storageService: StorageService;

export function activate(context: vscode.ExtensionContext): void {
  console.log("[AI Context Inspector] Activating extension...");

  // Initialize services
  storageService = new StorageService(context);
  const tokenEstimator = new TokenEstimator();
  const influenceScorer = new InfluenceScorer();

  const config = vscode.workspace.getConfiguration("aiContextInspector");
  const timelineRetention = config.get<number>(
    "timelineRetentionDays",
    DEFAULT_SETTINGS.timelineRetentionDays
  );

  const timelineService = new TimelineService(storageService, timelineRetention);
  const rulesService = new RulesService(storageService);

  fileTracker = new FileTracker(tokenEstimator);
  context.subscriptions.push(fileTracker);

  // Create sidebar provider
  const sidebarProvider = new SidebarProvider(
    context.extensionUri,
    fileTracker,
    tokenEstimator,
    influenceScorer,
    timelineService,
    rulesService,
    storageService
  );

  // Register the webview view provider
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      SidebarProvider.viewType,
      sidebarProvider,
      { webviewOptions: { retainContextWhenHidden: true } }
    )
  );

  // Track file events for timeline
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor && editor.document.uri.scheme === "file") {
        const fileName = path.basename(editor.document.uri.fsPath);
        timelineService.recordEvent(
          "file_opened",
          fileName,
          editor.document.uri.fsPath,
          `Opened ${fileName}`
        );
        sidebarProvider.refreshData();
      }
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (
        event.document.uri.scheme === "file" &&
        event.contentChanges.length > 0
      ) {
        const fileName = path.basename(event.document.uri.fsPath);
        // Throttle edit events: only record if last edit was > 5s ago
        const recentEvents = timelineService.getEvents(Date.now() - 5000);
        const hasRecentEdit = recentEvents.some(
          (e) =>
            e.type === "file_edited" &&
            e.filePath === event.document.uri.fsPath
        );
        if (!hasRecentEdit) {
          timelineService.recordEvent(
            "file_edited",
            fileName,
            event.document.uri.fsPath,
            `Edited ${fileName}`
          );
        }
        sidebarProvider.refreshData();
      }
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((doc) => {
      if (doc.uri.scheme === "file") {
        const fileName = path.basename(doc.uri.fsPath);
        timelineService.recordEvent(
          "file_closed",
          fileName,
          doc.uri.fsPath,
          `Closed ${fileName}`
        );
        sidebarProvider.refreshData();
      }
    })
  );

  // Monitor terminal activity for AI interaction detection
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTerminal((_terminal) => {
      // When terminal becomes active, it may indicate AI CLI interaction
      // This is a lightweight heuristic for MVP
    })
  );

  // Watch for terminal data that suggests AI CLI usage
  context.subscriptions.push(
    vscode.window.onDidOpenTerminal((terminal) => {
      // Track terminal opens as potential AI interaction indicators
      const name = terminal.name.toLowerCase();
      if (
        name.includes("claude") ||
        name.includes("continue") ||
        name.includes("copilot") ||
        name.includes("ai")
      ) {
        timelineService.recordEvent(
          "ai_interaction",
          undefined,
          undefined,
          `AI terminal detected: ${terminal.name}`
        );
        sidebarProvider.refreshData();
      }
    })
  );

  console.log("[AI Context Inspector] Extension activated successfully.");
}

export function deactivate(): void {
  console.log("[AI Context Inspector] Deactivating extension...");
  if (storageService) {
    storageService.flushAll();
  }
}

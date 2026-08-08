// ============================================================
// AI Context Inspector — Shared Type Definitions
// ============================================================

/** A single timeline event recorded by the extension. */
export interface TimelineEvent {
  id: string;
  timestamp: number;
  type: "file_opened" | "file_closed" | "file_edited" | "ai_interaction";
  fileName?: string;
  filePath?: string;
  details?: string;
}

/** Metadata about a tracked file. */
export interface FileInfo {
  path: string;
  name: string;
  extension: string;
  openedAt: number;
  lastEditedAt?: number;
  closedAt?: number;
  editCount: number;
  openCount: number;
  tokenEstimate: number;
  influenceScore: number;
}

/** A project rule created by the user. */
export interface ProjectRule {
  id: string;
  text: string;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

/** Influence result for "Why Did It Say This?" */
export interface InfluenceResult {
  fileName: string;
  filePath: string;
  percentage: number;
  level: "high" | "medium" | "low";
  factors: string[];
}

/** Extension settings. */
export interface Settings {
  tokenModel: string;
  warningThreshold: number;
  historyRetentionDays: number;
  timelineRetentionDays: number;
}

/** Default settings values. */
export const DEFAULT_SETTINGS: Settings = {
  tokenModel: "claude-3",
  warningThreshold: 80,
  historyRetentionDays: 30,
  timelineRetentionDays: 30,
};

/** Context data sent to the webview. */
export interface ContextData {
  workspaceName: string;
  openFiles: FileInfo[];
  recentFiles: FileInfo[];
  totalTokens: number;
  contextUtilization: number;
  modelLimit: number;
  modelName: string;
}

/** Analysis data sent to the webview. */
export interface AnalysisData {
  openFilesTokens: number;
  recentFilesTokens: number;
  workspaceMetadataTokens: number;
  totalTokens: number;
  modelLimit: number;
  modelName: string;
  utilization: number;
  warningThreshold: number;
  warnings: string[];
}

/** Message types from webview to extension host. */
export type WebviewToExtensionMessage =
  | { type: "getContext" }
  | { type: "getFiles" }
  | { type: "getTimeline" }
  | { type: "getAnalysis" }
  | { type: "getSettings" }
  | { type: "getRules" }
  | { type: "addRule"; payload: { text: string } }
  | { type: "editRule"; payload: { id: string; text: string; enabled: boolean } }
  | { type: "deleteRule"; payload: { id: string } }
  | { type: "updateSettings"; payload: Partial<Settings> }
  | { type: "ready" };

/** Message types from extension host to webview. */
export type ExtensionToWebviewMessage =
  | { type: "contextData"; payload: ContextData }
  | { type: "filesData"; payload: { influential: InfluenceResult[] } }
  | { type: "timelineData"; payload: { events: TimelineEvent[] } }
  | { type: "analysisData"; payload: AnalysisData }
  | { type: "settingsData"; payload: Settings }
  | { type: "rulesData"; payload: { rules: ProjectRule[] } };

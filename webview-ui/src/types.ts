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

export interface InfluenceResult {
  fileName: string;
  filePath: string;
  percentage: number;
  level: "high" | "medium" | "low";
  factors: string[];
}

export interface ProjectRule {
  id: string;
  text: string;
  enabled: boolean;
  createdAt: number;
  updatedAt?: number;
}

export interface TimelineEvent {
  id: string;
  type: "file_opened" | "file_edited" | "file_closed" | "ai_interaction";
  fileName?: string;
  filePath?: string;
  description: string;
  details?: string;
  timestamp: number;
}

export interface ContextData {
  workspaceName: string;
  openFiles: FileInfo[];
  recentFiles: FileInfo[];
  totalTokens: number;
  contextUtilization: number;
  modelLimit: number;
  modelName: string;
}

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

export interface Settings {
  tokenModel: string;
  warningThreshold: number;
  historyRetentionDays: number;
  timelineRetentionDays: number;
}

export const DEFAULT_SETTINGS: Settings = {
  tokenModel: "claude-3",
  warningThreshold: 80,
  historyRetentionDays: 30,
  timelineRetentionDays: 30,
};

export type WebviewToExtensionMessage =
  | { type: "ready" }
  | { type: "getContext" }
  | { type: "getFiles" }
  | { type: "getTimeline" }
  | { type: "getAnalysis" }
  | { type: "getSettings" }
  | { type: "getRules" }
  | { type: "addRule"; payload: { text: string } }
  | { type: "editRule"; payload: { id: string; text: string; enabled: boolean } }
  | { type: "deleteRule"; payload: { id: string } }
  | { type: "updateSettings"; payload: Partial<Settings> };

export type ExtensionToWebviewMessage =
  | { type: "contextData"; payload: ContextData }
  | { type: "filesData"; payload: { influential: InfluenceResult[] } }
  | { type: "timelineData"; payload: { events: TimelineEvent[] } }
  | { type: "analysisData"; payload: AnalysisData }
  | { type: "settingsData"; payload: Settings }
  | { type: "rulesData"; payload: { rules: ProjectRule[] } };

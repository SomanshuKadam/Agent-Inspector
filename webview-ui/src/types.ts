export type ActionType =
  | "USER_REQUEST"
  | "MEMORY_LOADED"
  | "FILE_READ"
  | "TOOL_CALL"
  | "COMMAND_EXECUTED"
  | "FINAL_RESPONSE"
  | "UNKNOWN";

export interface TraceEvent {
  id: string;
  timestamp: string;
  platform: "Claude Code" | "Antigravity" | "GitHub Copilot";
  actionType: ActionType;
  entity?: string;
  summary: string;
  sourceRecord: string;
}

export interface Settings {
  autoDetectionEnabled: boolean;
  refreshIntervalMs: number;
}

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

export interface IAgentAdapter {
  platformName: string;

  /**
   * Starts watching the log directory for the specific platform.
   * @param onUpdate Callback fired when new trace events are detected.
   */
  startWatching(onUpdate: () => void, refreshIntervalMs?: number): Promise<void>;

  /**
   * Stops watching the log directory.
   */
  stopWatching(): void;

  /**
   * Retrieves all currently loaded trace events.
   */
  getTraceEvents(): TraceEvent[];
}

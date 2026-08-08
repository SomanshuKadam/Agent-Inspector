import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { IAgentAdapter, TraceEvent, ActionType } from "./types";

export class AntigravityAdapter implements IAgentAdapter {
  platformName = "Antigravity";
  private events: TraceEvent[] = [];
  private watchInterval?: NodeJS.Timeout;
  private logFilePath?: string;
  private lastReadSize = 0;
  private onUpdateCallback?: () => void;
  private isPolling = false;

  async startWatching(onUpdate: () => void, refreshIntervalMs = 2000): Promise<void> {
    this.onUpdateCallback = onUpdate;
    await this.pollForLogs();
    this.watchInterval = setInterval(
      () => this.pollForLogs(),
      Math.max(500, refreshIntervalMs)
    );
  }

  stopWatching(): void {
    if (this.watchInterval) {
      clearInterval(this.watchInterval);
    }
  }

  getTraceEvents(): TraceEvent[] {
    return this.events;
  }

  private async pollForLogs() {
    if (this.isPolling) return;
    this.isPolling = true;

    try {
      const brainDir = path.join(os.homedir(), ".gemini", "antigravity-ide", "brain");
      if (!fs.existsSync(brainDir)) return;

      const entries = await fs.promises.readdir(brainDir, { withFileTypes: true });
      const sessions = entries.filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);

      let newestLog: { file: string; mtime: number } | null = null;

      for (const session of sessions) {
        const transcriptPath = path.join(brainDir, session, ".system_generated", "logs", "transcript.jsonl");
        try {
          const stat = await fs.promises.stat(transcriptPath);
          if (!newestLog || stat.mtimeMs > newestLog.mtime) {
            newestLog = { file: transcriptPath, mtime: stat.mtimeMs };
          }
        } catch (e) {
          // File might not exist
        }
      }

      if (!newestLog) return;

      if (this.logFilePath !== newestLog.file) {
        this.logFilePath = newestLog.file;
        this.lastReadSize = 0;
        this.events = [];
      }

      const stat = await fs.promises.stat(this.logFilePath);
      if (stat.size > this.lastReadSize) {
        await this.readNewData(stat.size);
      }
    } catch (error) {
      console.error("Error polling Antigravity logs:", error);
    } finally {
      this.isPolling = false;
    }
  }

  private async readNewData(currentSize: number) {
    if (!this.logFilePath) return;

    try {
      // Only read the new bytes to avoid freezing the extension host on large logs
      const stream = fs.createReadStream(this.logFilePath, {
        encoding: "utf8",
        start: this.lastReadSize,
        end: currentSize - 1,
      });

      let newContent = "";
      for await (const chunk of stream) {
        newContent += chunk;
      }

      if (newContent.length === 0) return;

      const lines = newContent.split("\n").filter(l => l.trim().length > 0);
      let updated = false;

      for (const line of lines) {
        try {
          const record = JSON.parse(line);
          const event = this.mapRecordToEvent(record, line);
          if (event) {
            this.events.push(event);
            updated = true;
          }
        } catch (e) {
          // ignore incomplete lines or JSON errors
        }
      }

      this.lastReadSize = currentSize;

      if (updated && this.onUpdateCallback) {
        this.onUpdateCallback();
      }
    } catch (err) {
      console.error("Error reading Antigravity log:", err);
    }
  }

  private mapRecordToEvent(record: any, rawLine: string): TraceEvent | null {
    const actionType = this.inferActionType(record);
    if (actionType === "UNKNOWN") return null;

    let summary = "Antigravity Action";
    let entity = undefined;

    if (actionType === "USER_REQUEST") {
      summary = (record.content || "User Request").substring(0, 120);
    } else if (actionType === "FINAL_RESPONSE") {
      summary = (record.content || "Agent Response").substring(0, 120);
    } else if (record.tool_calls && record.tool_calls.length > 0) {
      const tool = record.tool_calls[0];
      entity = tool.function?.name || tool.name || "tool";
      let args: any = {};

      if (tool.function?.arguments) {
        try {
          args = typeof tool.function.arguments === 'string' ? JSON.parse(tool.function.arguments) : tool.function.arguments;
        } catch(e) {}
      } else if (tool.args) {
        args = typeof tool.args === 'string' ? JSON.parse(tool.args) : tool.args;
      }

      if (actionType === "FILE_READ") {
        const file = args.AbsolutePath || args.TargetFile || args.DirectoryPath || args.path || "file";
        // Remove quotes if present from Antigravity logs
        const cleanFile = file.replace(/^"|"$/g, '').split(/[\\/]/).pop();
        summary = `Read:\n${cleanFile}`;
      } else if (actionType === "COMMAND_EXECUTED") {
        const cmd = args.CommandLine || args.command || "command";
        const cleanCmd = cmd.replace(/^"|"$/g, '').substring(0, 60);
        summary = `Executed:\n${cleanCmd}`;
      } else if (actionType === "TOOL_CALL") {
        if (entity === "grep_search") {
          const query = (args.Query || "").replace(/^"|"$/g, '');
          summary = `Search:\n${query}`;
        } else {
          summary = `Tool:\n${entity}`;
        }
      } else {
        summary = `Tool:\n${entity}`;
      }
    } else if (actionType === "MEMORY_LOADED") {
      summary = `Loaded:\nKnowledge Artifact`;
    }

    return {
      id: record.id || Math.random().toString(36).substring(7),
      timestamp: record.created_at || record.timestamp || new Date().toISOString(),
      platform: "Antigravity",
      actionType,
      entity,
      summary,
      sourceRecord: rawLine,
    };
  }

  private inferActionType(record: any): ActionType {
    const type = record.type || "";

    if (type === "USER_INPUT") return "USER_REQUEST";
    if (record.tool_calls) {
      const toolName = record.tool_calls[0]?.function?.name || record.tool_calls[0]?.name || "";
      if (toolName === "view_file" || toolName === "read_file") return "FILE_READ";
      if (toolName === "run_command" || toolName.includes("exec")) return "COMMAND_EXECUTED";
      return "TOOL_CALL";
    }
    if (type === "MODEL_RESPONSE") return "FINAL_RESPONSE";
    if (type === "MEMORY_RETRIEVAL") return "MEMORY_LOADED";

    return "UNKNOWN";
  }
}

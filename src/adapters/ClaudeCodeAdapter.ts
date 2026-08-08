import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { IAgentAdapter, TraceEvent, ActionType } from "./types";

export class ClaudeCodeAdapter implements IAgentAdapter {
  platformName = "Claude Code";
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
      const claudeDir = path.join(os.homedir(), ".claude", "projects");
      if (!fs.existsSync(claudeDir)) return;

      const entries = await fs.promises.readdir(claudeDir, { withFileTypes: true });
      const jsonlFiles = entries.filter(f => f.isFile() && f.name.endsWith(".jsonl"));

      if (jsonlFiles.length === 0) return;

      let newestLog: { file: string; mtime: number } | null = null;

      for (const f of jsonlFiles) {
        const fullPath = path.join(claudeDir, f.name);
        try {
          const stat = await fs.promises.stat(fullPath);
          if (!newestLog || stat.mtimeMs > newestLog.mtime) {
            newestLog = { file: fullPath, mtime: stat.mtimeMs };
          }
        } catch (e) {}
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
      console.error("Error polling Claude logs:", error);
    } finally {
      this.isPolling = false;
    }
  }

  private async readNewData(currentSize: number) {
    if (!this.logFilePath) return;

    try {
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
        } catch (e) {}
      }

      this.lastReadSize = currentSize;

      if (updated && this.onUpdateCallback) {
        this.onUpdateCallback();
      }
    } catch (err) {
      console.error("Error reading Claude log:", err);
    }
  }

  private mapRecordToEvent(record: any, rawLine: string): TraceEvent | null {
    const actionType = this.inferActionType(record);
    if (actionType === "UNKNOWN") return null;

    let summary = record.summary || record.message || "Claude Code Action";
    const entity = record.entity || record.file || record.tool;

    if (actionType === "FILE_READ" && entity) {
      summary = `Read:\n${entity.split(/[\\/]/).pop()}`;
    } else if (actionType === "COMMAND_EXECUTED") {
      const cmd = record.command || record.cmd || entity || "command";
      summary = `Executed:\n${cmd.substring(0, 60)}`;
    } else if (actionType === "TOOL_CALL" && entity) {
      if (entity === "grep_search" || entity === "search") {
        summary = `Search:\n${record.query || "term"}`;
      } else {
        summary = `Tool:\n${entity}`;
      }
    } else if (actionType === "MEMORY_LOADED") {
      summary = `Loaded:\n${entity || "Knowledge Artifact"}`;
    }

    return {
      id: record.id || Math.random().toString(36).substring(7),
      timestamp: record.timestamp || new Date().toISOString(),
      platform: "Claude Code",
      actionType,
      entity,
      summary,
      sourceRecord: rawLine,
    };
  }

  private inferActionType(record: any): ActionType {
    const typeStr = (record.type || record.action || "").toUpperCase();
    const msg = (record.message || record.summary || "").toLowerCase();

    if (typeStr.includes("USER") || msg.includes("user query")) return "USER_REQUEST";
    if (typeStr.includes("READ") && typeStr.includes("FILE")) return "FILE_READ";
    if (typeStr.includes("MEMORY") || typeStr.includes("CONTEXT")) return "MEMORY_LOADED";
    if (typeStr.includes("TOOL") || record.tool) return "TOOL_CALL";
    if (typeStr.includes("COMMAND") || typeStr.includes("EXEC")) return "COMMAND_EXECUTED";
    if (typeStr.includes("FINAL") || typeStr.includes("RESPONSE") || msg.includes("completed")) return "FINAL_RESPONSE";

    return "UNKNOWN";
  }
}

import { IAgentAdapter, TraceEvent } from "./types";
import { ClaudeCodeAdapter } from "./ClaudeCodeAdapter";
import { AntigravityAdapter } from "./AntigravityAdapter";
import { CopilotAdapter } from "./CopilotAdapter";

export class AdapterManager {
  private adapters: IAgentAdapter[] = [];
  private onUpdateCallback?: () => void;

  constructor() {
    this.adapters.push(new ClaudeCodeAdapter());
    this.adapters.push(new AntigravityAdapter());
    this.adapters.push(new CopilotAdapter());
  }

  async start(onUpdate: () => void, refreshIntervalMs = 2000): Promise<void> {
    this.onUpdateCallback = onUpdate;
    for (const adapter of this.adapters) {
      await adapter.startWatching(() => this.handleUpdate(), refreshIntervalMs);
    }
  }

  stop(): void {
    for (const adapter of this.adapters) {
      adapter.stopWatching();
    }
  }

  getTraceEvents(): TraceEvent[] {
    const allEvents = this.adapters.flatMap(adapter => adapter.getTraceEvents());
    // Sort newest to oldest
    return allEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  private handleUpdate() {
    if (this.onUpdateCallback) {
      this.onUpdateCallback();
    }
  }
}

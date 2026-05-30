// ============================================================
// TimelineService — Records and queries timeline events
// ============================================================
import { TimelineEvent } from "../types";
import { StorageService } from "./StorageService";

export class TimelineService {
  private events: TimelineEvent[] = [];
  private storageService: StorageService;
  private retentionDays: number;

  private static readonly STORAGE_KEY = "timeline";
  private static readonly MAX_EVENTS = 5000;

  constructor(storageService: StorageService, retentionDays: number = 30) {
    this.storageService = storageService;
    this.retentionDays = retentionDays;
    this.load();
  }

  /** Load timeline events from storage. */
  private load(): void {
    this.events = this.storageService.read<TimelineEvent[]>(
      TimelineService.STORAGE_KEY,
      []
    );
    this.prune();
  }

  /** Save timeline events to storage. */
  private save(): void {
    this.storageService.write(TimelineService.STORAGE_KEY, this.events);
  }

  /** Generate a unique ID. */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /** Record a new timeline event. */
  recordEvent(
    type: TimelineEvent["type"],
    fileName?: string,
    filePath?: string,
    details?: string
  ): void {
    const event: TimelineEvent = {
      id: this.generateId(),
      timestamp: Date.now(),
      type,
      fileName,
      filePath,
      details,
    };

    this.events.push(event);

    // Trim if exceeding max events
    if (this.events.length > TimelineService.MAX_EVENTS) {
      this.events = this.events.slice(-TimelineService.MAX_EVENTS);
    }

    this.save();
  }

  /** Get all events, optionally filtered by time range. */
  getEvents(since?: number, until?: number): TimelineEvent[] {
    let filtered = this.events;

    if (since) {
      filtered = filtered.filter((e) => e.timestamp >= since);
    }
    if (until) {
      filtered = filtered.filter((e) => e.timestamp <= until);
    }

    // Return sorted newest first
    return [...filtered].sort((a, b) => b.timestamp - a.timestamp);
  }

  /** Get events for today. */
  getTodayEvents(): TimelineEvent[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.getEvents(today.getTime());
  }

  /** Prune events older than retention period. */
  prune(): void {
    const cutoff = Date.now() - this.retentionDays * 24 * 60 * 60 * 1000;
    const before = this.events.length;
    this.events = this.events.filter((e) => e.timestamp >= cutoff);
    if (this.events.length !== before) {
      this.save();
    }
  }

  /** Update retention days. */
  setRetentionDays(days: number): void {
    this.retentionDays = days;
    this.prune();
  }

  /** Get total event count. */
  getEventCount(): number {
    return this.events.length;
  }
}

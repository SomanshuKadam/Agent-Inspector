// ============================================================
// StorageService — JSON file persistence layer
// ============================================================
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

export class StorageService {
  private storagePath: string;
  private writeTimers: Map<string, NodeJS.Timeout> = new Map();
  private cache: Map<string, unknown> = new Map();

  constructor(private context: vscode.ExtensionContext) {
    // Use workspace storage folder if available, fallback to .vscode/ai-context-inspector
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      this.storagePath = path.join(
        workspaceFolders[0].uri.fsPath,
        ".vscode",
        "ai-context-inspector"
      );
    } else {
      // Fallback to global storage
      this.storagePath = path.join(
        context.globalStorageUri.fsPath,
        "ai-context-inspector"
      );
    }
    this.ensureDirectory();
  }

  /** Ensure the storage directory exists. */
  private ensureDirectory(): void {
    try {
      if (!fs.existsSync(this.storagePath)) {
        fs.mkdirSync(this.storagePath, { recursive: true });
      }
    } catch (err) {
      console.error("[AI Context Inspector] Failed to create storage directory:", err);
    }
  }

  /** Get the full path for a storage file. */
  private getFilePath(key: string): string {
    return path.join(this.storagePath, `${key}.json`);
  }

  /** Read data from a JSON file. */
  read<T>(key: string, defaultValue: T): T {
    // Check cache first
    if (this.cache.has(key)) {
      return this.cache.get(key) as T;
    }

    const filePath = this.getFilePath(key);
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf-8");
        const data = JSON.parse(raw) as T;
        this.cache.set(key, data);
        return data;
      }
    } catch (err) {
      console.error(`[AI Context Inspector] Failed to read ${key}:`, err);
    }
    return defaultValue;
  }

  /** Write data to a JSON file with debouncing. */
  write<T>(key: string, data: T): void {
    this.cache.set(key, data);

    // Debounce writes by 500ms
    const existing = this.writeTimers.get(key);
    if (existing) {
      clearTimeout(existing);
    }

    const timer = setTimeout(() => {
      this.writeTimers.delete(key);
      this.flushKey(key, data);
    }, 500);

    this.writeTimers.set(key, timer);
  }

  /** Immediately write data for a specific key. */
  private flushKey<T>(key: string, data: T): void {
    const filePath = this.getFilePath(key);
    try {
      this.ensureDirectory();
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
    } catch (err) {
      console.error(`[AI Context Inspector] Failed to write ${key}:`, err);
    }
  }

  /** Flush all pending writes immediately. */
  flushAll(): void {
    for (const [key, timer] of this.writeTimers.entries()) {
      clearTimeout(timer);
      const data = this.cache.get(key);
      if (data !== undefined) {
        this.flushKey(key, data);
      }
    }
    this.writeTimers.clear();
  }

  /** Dispose of all resources. */
  dispose(): void {
    this.flushAll();
  }
}

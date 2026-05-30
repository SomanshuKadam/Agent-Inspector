// ============================================================
// RulesService — CRUD operations for project rules
// ============================================================
import { ProjectRule } from "../types";
import { StorageService } from "./StorageService";

export class RulesService {
  private rules: ProjectRule[] = [];
  private storageService: StorageService;

  private static readonly STORAGE_KEY = "rules";

  constructor(storageService: StorageService) {
    this.storageService = storageService;
    this.load();
  }

  /** Load rules from storage. */
  private load(): void {
    this.rules = this.storageService.read<ProjectRule[]>(
      RulesService.STORAGE_KEY,
      []
    );
  }

  /** Save rules to storage. */
  private save(): void {
    this.storageService.write(RulesService.STORAGE_KEY, this.rules);
  }

  /** Generate a unique ID. */
  private generateId(): string {
    return `rule-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /** Get all rules. */
  getRules(): ProjectRule[] {
    return [...this.rules];
  }

  /** Add a new rule. */
  addRule(text: string): ProjectRule {
    const rule: ProjectRule = {
      id: this.generateId(),
      text,
      enabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.rules.push(rule);
    this.save();
    return rule;
  }

  /** Edit an existing rule. */
  editRule(id: string, text: string, enabled: boolean): ProjectRule | null {
    const rule = this.rules.find((r) => r.id === id);
    if (!rule) {return null;}

    rule.text = text;
    rule.enabled = enabled;
    rule.updatedAt = Date.now();
    this.save();
    return rule;
  }

  /** Delete a rule. */
  deleteRule(id: string): boolean {
    const index = this.rules.findIndex((r) => r.id === id);
    if (index === -1) {return false;}

    this.rules.splice(index, 1);
    this.save();
    return true;
  }

  /** Get enabled rules only. */
  getEnabledRules(): ProjectRule[] {
    return this.rules.filter((r) => r.enabled);
  }
}

// ============================================================
// Settings Panel — Feature 6 (Project Rules) + Settings
// ============================================================
import { useState } from "react";
import { vscode } from "../vscode";
import type { Settings, ProjectRule } from "../types";

interface Props {
  settings: Settings | null;
  rules: ProjectRule[];
}

export function SettingsPanel({ settings, rules }: Props) {
  const [newRuleText, setNewRuleText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  // Rule handlers
  const handleAddRule = () => {
    const text = newRuleText.trim();
    if (!text) return;
    vscode.postMessage({ type: "addRule", payload: { text } });
    setNewRuleText("");
  };

  const handleDeleteRule = (id: string) => {
    vscode.postMessage({ type: "deleteRule", payload: { id } });
  };

  const handleToggleRule = (rule: ProjectRule) => {
    vscode.postMessage({
      type: "editRule",
      payload: { id: rule.id, text: rule.text, enabled: !rule.enabled },
    });
  };

  const handleStartEdit = (rule: ProjectRule) => {
    setEditingId(rule.id);
    setEditText(rule.text);
  };

  const handleSaveEdit = (rule: ProjectRule) => {
    const text = editText.trim();
    if (!text) return;
    vscode.postMessage({
      type: "editRule",
      payload: { id: rule.id, text, enabled: rule.enabled },
    });
    setEditingId(null);
    setEditText("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  // Settings handlers
  const handleSettingChange = (key: string, value: string | number) => {
    vscode.postMessage({
      type: "updateSettings",
      payload: { [key]: value },
    });
  };

  return (
    <div>
      {/* Project Rules — Feature 6 */}
      <div className="section">
        <div className="section-header">
          <span className="section-header-icon">📜</span>
          Project Rules
        </div>
        <div className="text-small text-muted mb-8">
          Define project conventions that influence AI context scoring.
        </div>

        <div className="card">
          {rules.length === 0 ? (
            <div className="empty-state" style={{ padding: 12 }}>
              <div className="empty-state-text">
                No rules defined yet. Add rules below.
              </div>
            </div>
          ) : (
            rules.map((rule) => (
              <div key={rule.id} className="rule-item">
                <input
                  type="checkbox"
                  className="rule-checkbox"
                  checked={rule.enabled}
                  onChange={() => handleToggleRule(rule)}
                />
                {editingId === rule.id ? (
                  <>
                    <input
                      className="form-input"
                      style={{ flex: 1 }}
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveEdit(rule);
                        if (e.key === "Escape") handleCancelEdit();
                      }}
                      autoFocus
                    />
                    <button
                      className="btn-icon"
                      onClick={() => handleSaveEdit(rule)}
                      title="Save"
                    >
                      ✓
                    </button>
                    <button
                      className="btn-icon"
                      onClick={handleCancelEdit}
                      title="Cancel"
                    >
                      ✗
                    </button>
                  </>
                ) : (
                  <>
                    <span
                      className={`rule-text ${!rule.enabled ? "disabled" : ""}`}
                    >
                      {rule.text}
                    </span>
                    <div className="rule-actions">
                      <button
                        className="btn-icon"
                        onClick={() => handleStartEdit(rule)}
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        className="btn-icon"
                        onClick={() => handleDeleteRule(rule.id)}
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}

          {/* Add Rule Form */}
          <div className="add-form">
            <input
              className="form-input"
              placeholder="Add a project rule..."
              value={newRuleText}
              onChange={(e) => setNewRuleText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddRule();
              }}
            />
            <button className="btn btn-primary" onClick={handleAddRule}>
              Add
            </button>
          </div>
        </div>
      </div>

      <div className="separator" />

      {/* Settings */}
      <div className="section">
        <div className="section-header">
          <span className="section-header-icon">⚙️</span>
          Settings
        </div>

        {settings ? (
          <div className="card">
            {/* Token Model */}
            <div className="form-group">
              <label className="form-label">Token Estimation Model</label>
              <select
                className="form-select"
                value={settings.tokenModel}
                onChange={(e) =>
                  handleSettingChange("tokenModel", e.target.value)
                }
              >
                <option value="gpt-4">GPT-4 (128K)</option>
                <option value="gpt-4-turbo">GPT-4 Turbo (128K)</option>
                <option value="gpt-4o">GPT-4o (128K)</option>
                <option value="claude-3">Claude 3 (200K)</option>
                <option value="claude-3.5">Claude 3.5 (200K)</option>
                <option value="gemini-pro">Gemini Pro (1M)</option>
              </select>
              <div className="form-hint">
                Sets the context window size for utilization calculations.
              </div>
            </div>

            {/* Warning Threshold */}
            <div className="form-group">
              <label className="form-label">
                Warning Threshold: {settings.warningThreshold}%
              </label>
              <input
                type="range"
                className="form-input"
                min="10"
                max="100"
                step="5"
                value={settings.warningThreshold}
                onChange={(e) =>
                  handleSettingChange(
                    "warningThreshold",
                    parseInt(e.target.value)
                  )
                }
                style={{ padding: 0 }}
              />
              <div className="form-hint">
                Show warnings when context utilization exceeds this level.
              </div>
            </div>

            {/* History Retention */}
            <div className="form-group">
              <label className="form-label">
                History Retention: {settings.historyRetentionDays} days
              </label>
              <input
                type="range"
                className="form-input"
                min="1"
                max="365"
                step="1"
                value={settings.historyRetentionDays}
                onChange={(e) =>
                  handleSettingChange(
                    "historyRetentionDays",
                    parseInt(e.target.value)
                  )
                }
                style={{ padding: 0 }}
              />
              <div className="form-hint">
                Number of days to retain file history and influence data.
              </div>
            </div>

            {/* Timeline Retention */}
            <div className="form-group">
              <label className="form-label">
                Timeline Retention: {settings.timelineRetentionDays} days
              </label>
              <input
                type="range"
                className="form-input"
                min="1"
                max="365"
                step="1"
                value={settings.timelineRetentionDays}
                onChange={(e) =>
                  handleSettingChange(
                    "timelineRetentionDays",
                    parseInt(e.target.value)
                  )
                }
                style={{ padding: 0 }}
              />
              <div className="form-hint">
                Number of days to retain timeline events.
              </div>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-text">Loading settings...</div>
          </div>
        )}
      </div>
    </div>
  );
}

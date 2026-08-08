import React from "react";
import { Settings } from "../types";

interface SettingsPanelProps {
  settings: Settings | null;
  onUpdateSettings: (settings: Partial<Settings>) => void;
}

export function SettingsPanel({ settings, onUpdateSettings }: SettingsPanelProps) {
  if (!settings) return <div className="panel">Loading settings...</div>;

  return (
    <div className="panel settings">
      <h3>Settings</h3>

      <div className="settings-group">
        <label className="setting-item checkbox-label">
          <input
            type="checkbox"
            checked={settings.autoDetectionEnabled}
            onChange={(e) =>
              onUpdateSettings({ autoDetectionEnabled: e.target.checked })
            }
          />
          Enable Auto-Detection (Claude Code & Antigravity)
        </label>
      </div>

      <div className="settings-group">
        <label className="setting-item">
          <span>Refresh Interval (ms)</span>
          <input
            type="number"
            value={settings.refreshIntervalMs}
            min={500}
            max={10000}
            step={500}
            onChange={(e) =>
              onUpdateSettings({ refreshIntervalMs: parseInt(e.target.value, 10) })
            }
          />
        </label>
      </div>

      <div className="info-block">
        <p>
          <strong>Log Paths:</strong><br />
          Claude Code: <code>~/.claude/projects/</code><br />
          Antigravity: <code>~/.gemini/antigravity-ide/brain/</code>
        </p>
      </div>
    </div>
  );
}

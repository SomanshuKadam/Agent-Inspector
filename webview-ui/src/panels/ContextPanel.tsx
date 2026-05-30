// ============================================================
// Context Panel — Feature 1: Current context visibility
// ============================================================
import type { ContextData } from "../types";

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function getUtilizationColor(pct: number): string {
  if (pct >= 90) return "#ef4444";
  if (pct >= 70) return "#f59e0b";
  return "#6366f1";
}

interface Props {
  data: ContextData | null;
}

export function ContextPanel({ data }: Props) {
  if (!data) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📋</div>
        <div className="empty-state-text">Loading context data...</div>
      </div>
    );
  }

  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (data.contextUtilization / 100) * circumference;
  const color = getUtilizationColor(data.contextUtilization);

  return (
    <div className="section">
      {/* Workspace Name */}
      <div className="section-header">
        <span className="section-header-icon">🗂️</span>
        {data.workspaceName}
      </div>

      {/* Utilization Ring */}
      <div className="progress-ring-container">
        <div className="progress-ring">
          <svg width="100" height="100" viewBox="0 0 100 100">
            <circle className="progress-ring-bg" cx="50" cy="50" r="42" />
            <circle
              className="progress-ring-fill"
              cx="50"
              cy="50"
              r="42"
              stroke={color}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="progress-ring-text">
            <div className="progress-ring-value" style={{ color }}>
              {data.contextUtilization}%
            </div>
            <div className="progress-ring-label">Utilization</div>
          </div>
        </div>
      </div>

      {/* Model Info */}
      <div className="model-info">
        <span>Model</span>
        <span className="model-name">{data.modelName}</span>
      </div>

      {/* Stats */}
      <div className="stat-grid">
        <div className="stat-box">
          <div className="stat-value">{formatNumber(data.totalTokens)}</div>
          <div className="stat-label">Est. Tokens</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">{formatNumber(data.modelLimit)}</div>
          <div className="stat-label">Model Limit</div>
        </div>
      </div>

      {/* Open Files */}
      <div className="section mt-12">
        <div className="section-header">
          <span className="section-header-icon">📄</span>
          Files Open ({data.openFiles.length})
        </div>
        {data.openFiles.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-text">No files open</div>
          </div>
        ) : (
          <ul className="file-list">
            {data.openFiles.map((file) => (
              <li key={file.path} className="file-item">
                <span className="file-icon">📄</span>
                <span className="file-name" title={file.path}>
                  {file.name}
                </span>
                <span className="file-tokens">
                  {formatNumber(file.tokenEstimate)} tok
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Recent Files */}
      <div className="section mt-8">
        <div className="section-header">
          <span className="section-header-icon">🕓</span>
          Recent Files ({data.recentFiles.length})
        </div>
        {data.recentFiles.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-text">No recent files</div>
          </div>
        ) : (
          <ul className="file-list">
            {data.recentFiles.slice(0, 10).map((file) => (
              <li key={file.path} className="file-item">
                <span className="file-icon" style={{ opacity: 0.5 }}>📄</span>
                <span className="file-name" title={file.path} style={{ opacity: 0.7 }}>
                  {file.name}
                </span>
                <span className="file-tokens">
                  {formatNumber(file.tokenEstimate)} tok
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

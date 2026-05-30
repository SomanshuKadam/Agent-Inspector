// ============================================================
// Analysis Panel — Feature 4: Context Size Analyzer
// ============================================================
import type { AnalysisData } from "../types";

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function getUtilizationColor(pct: number): string {
  if (pct >= 90) return "#ef4444";
  if (pct >= 70) return "#f59e0b";
  return "#6366f1";
}

interface Props {
  data: AnalysisData | null;
}

export function AnalysisPanel({ data }: Props) {
  if (!data) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📊</div>
        <div className="empty-state-text">Loading analysis data...</div>
      </div>
    );
  }

  const total = data.openFilesTokens + data.recentFilesTokens + data.workspaceMetadataTokens;
  const openPct = total > 0 ? (data.openFilesTokens / total) * 100 : 0;
  const recentPct = total > 0 ? (data.recentFilesTokens / total) * 100 : 0;
  const metaPct = total > 0 ? (data.workspaceMetadataTokens / total) * 100 : 0;

  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (data.utilization / 100) * circumference;
  const color = getUtilizationColor(data.utilization);

  return (
    <div>
      {/* Token Utilization Ring */}
      <div className="section">
        <div className="section-header">
          <span className="section-header-icon">📊</span>
          Context Size Analysis
        </div>

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
                {data.utilization}%
              </div>
              <div className="progress-ring-label">Used</div>
            </div>
          </div>
        </div>

        <div className="model-info">
          <span>Model</span>
          <span className="model-name">{data.modelName}</span>
        </div>
      </div>

      {/* Token Breakdown */}
      <div className="section">
        <div className="section-header">
          <span className="section-header-icon">🔢</span>
          Token Breakdown
        </div>

        <div className="card">
          <div className="token-breakdown">
            <div className="token-bar">
              <div
                className="token-segment open-files"
                style={{ width: `${openPct}%` }}
              />
              <div
                className="token-segment recent-files"
                style={{ width: `${recentPct}%` }}
              />
              <div
                className="token-segment metadata"
                style={{ width: `${metaPct}%` }}
              />
            </div>

            <div className="token-legend">
              <div className="token-legend-item">
                <div className="token-legend-dot open-files" />
                Open Files
                <span className="token-legend-value">
                  {formatNumber(data.openFilesTokens)}
                </span>
              </div>
              <div className="token-legend-item">
                <div className="token-legend-dot recent-files" />
                Recent
                <span className="token-legend-value">
                  {formatNumber(data.recentFilesTokens)}
                </span>
              </div>
              <div className="token-legend-item">
                <div className="token-legend-dot metadata" />
                Metadata
                <span className="token-legend-value">
                  {formatNumber(data.workspaceMetadataTokens)}
                </span>
              </div>
            </div>
          </div>

          <div className="separator" />

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
            <span style={{ fontWeight: 600 }}>Total</span>
            <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
              {formatNumber(data.totalTokens)} tokens
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }} className="text-muted mt-4">
            <span>Model Limit</span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>
              {formatNumber(data.modelLimit)} tokens
            </span>
          </div>
        </div>
      </div>

      {/* Warnings */}
      {data.warnings.length > 0 && (
        <div className="section">
          <div className="section-header">
            <span className="section-header-icon">⚠️</span>
            Warnings
          </div>
          {data.warnings.map((warning, i) => (
            <div key={i} className="warning-box">
              <span className="warning-icon">⚠️</span>
              <span>{warning}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

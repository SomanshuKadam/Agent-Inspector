// ============================================================
// Files Panel — Feature 2 + Feature 5: File Influence + Explainability
// ============================================================
import type { InfluenceResult } from "../types";

interface Props {
  data: InfluenceResult[];
}

export function FilesPanel({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📁</div>
        <div className="empty-state-text">
          Open some files to see influence scores
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Influential Files */}
      <div className="section">
        <div className="section-header">
          <span className="section-header-icon">🎯</span>
          Likely Influential Files
        </div>
        <div className="card">
          <ul className="file-list">
            {data.map((file) => (
              <li key={file.filePath} className="file-item">
                <span className="file-icon">📄</span>
                <span className="file-name" title={file.filePath}>
                  {file.fileName}
                </span>
                <span className={`influence-badge ${file.level}`}>
                  {file.level}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Why Did It Say This? — Percentage Breakdown */}
      <div className="section">
        <div className="section-header">
          <span className="section-header-icon">🤔</span>
          Why Did It Say This?
        </div>
        <div className="card">
          {data.map((file) => (
            <div key={file.filePath} className="influence-row">
              <span className="influence-name" title={file.filePath}>
                {file.fileName}
              </span>
              <div className="influence-bar-container">
                <div
                  className="influence-bar"
                  style={{ width: `${file.percentage}%` }}
                />
              </div>
              <span className="influence-percent">{file.percentage}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Influence Factors */}
      <div className="section">
        <div className="section-header">
          <span className="section-header-icon">💡</span>
          Influence Factors
        </div>
        <div className="card">
          {data
            .filter((f) => f.factors.length > 0)
            .slice(0, 5)
            .map((file) => (
              <div key={file.filePath} style={{ marginBottom: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>
                  {file.fileName}
                </div>
                <div style={{ fontSize: 11 }} className="text-muted">
                  {file.factors.join(" · ")}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

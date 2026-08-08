import React from "react";
import { TraceEvent } from "../types";

interface DecisionTracePanelProps {
  events: TraceEvent[];
  onSelectEvent: (event: TraceEvent) => void;
  selectedEventId?: string;
}

export function DecisionTracePanel({ events, onSelectEvent, selectedEventId }: DecisionTracePanelProps) {
  if (!events || events.length === 0) {
    return (
      <div className="panel empty-state">
        <p>No trace events found.</p>
        <p>Start a session with Claude Code or Antigravity.</p>
      </div>
    );
  }

  return (
    <div className="panel decision-trace">
      <h3>Chronological Event Feed</h3>
      <div className="event-list">
        {events.map((evt) => {
          const date = new Date(evt.timestamp);
          const timeString = `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}:${date.getSeconds().toString().padStart(2, "0")}`;
          const isSelected = evt.id === selectedEventId;

          return (
            <div
              key={evt.id}
              className={`trace-card ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelectEvent(evt)}
              style={{ cursor: 'pointer', border: isSelected ? '1px solid var(--vscode-focusBorder)' : undefined }}
            >
              <div className="trace-meta">
                <span>{timeString}</span>
                <span>{evt.platform}</span>
              </div>
              <div className={`trace-type ${evt.actionType}`}>
                {evt.actionType}
              </div>
              <div className="trace-summary">
                {evt.summary}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
